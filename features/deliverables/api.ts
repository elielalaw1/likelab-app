import { supabase } from '@/lib/supabase'
import { Deliverable, DeliverableSubmission, mapSubmissionRow } from '@/features/core/types'
import { getCurrentUserId, textValue } from '@/features/core/supabase-utils'

type Row = Record<string, unknown>

export async function getDeliverables() {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, campaign_id, status, platform, type, url, flag_reason, campaigns(name, brand_id)')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as Array<Row & { campaigns?: Row | Row[] }>).map((row) => {
    const campaignRel = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns

    return {
      id: String(row.id || ''),
      campaignId: String(row.campaign_id || ''),
      campaignTitle: textValue(campaignRel || {}, ['name']) || 'Campaign',
      status: (textValue(row, ['status']) || 'pending') as Deliverable['status'],
      platform: textValue(row, ['platform']) || 'tiktok',
      type: textValue(row, ['type']),
      url: textValue(row, ['url']),
      flagReason: textValue(row, ['flag_reason']),
      campaignBrandName: null,
    }
  })
}

export async function submitDeliverableUrl(params: { deliverableId: string; url: string }) {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('deliverables')
    .update({
      url: params.url,
      status: 'submitted',
      platform: 'tiktok',
    })
    .eq('id', params.deliverableId)
    .eq('creator_id', userId)

  if (error) throw new Error(error.message)
}

export async function submitLink(params: { deliverableId: string; url: string }): Promise<DeliverableSubmission> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverable_submissions')
    .insert({
      deliverable_id: params.deliverableId,
      creator_id: userId,
      submission_type: 'link',
      status: 'submitted',
      link_url: params.url,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { error: parentError } = await supabase
    .from('deliverables')
    .update({
      url: params.url,
      status: 'submitted',
      platform: 'tiktok',
    })
    .eq('id', params.deliverableId)
    .eq('creator_id', userId)

  if (parentError) throw new Error(parentError.message)

  return mapSubmissionRow((data || {}) as Row)
}

export async function uploadVideo(params: {
  deliverableId: string
  fileUri: string
  fileName: string
  fileSize: number
  mimeType?: string
}): Promise<DeliverableSubmission> {
  const userId = await getCurrentUserId()
  const mimeType = params.mimeType || 'video/mp4'
  const safeName = params.fileName.replace(/[^\w.-]+/g, '_')
  const storagePath = `${userId}/${Date.now()}_${params.deliverableId}_${safeName}`

  const response = await fetch(params.fileUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('deliverable-videos')
    .upload(storagePath, blob, { contentType: mimeType, upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('deliverable_submissions')
    .insert({
      deliverable_id: params.deliverableId,
      creator_id: userId,
      submission_type: 'video',
      status: 'uploading',
      video_storage_path: storagePath,
      video_filename: safeName,
      video_size_bytes: params.fileSize,
      video_mime_type: mimeType,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  supabase.functions
    .invoke('process-video-upload', { body: { submission_id: data.id } })
    .catch((invokeError: unknown) => console.warn('[uploadVideo] process-video-upload failed:', invokeError))

  return mapSubmissionRow((data || {}) as Row)
}

export async function getLatestSubmission(deliverableId: string): Promise<DeliverableSubmission | null> {
  const { data, error } = await supabase
    .from('deliverable_submissions')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data ? mapSubmissionRow(data as Row) : null
}

export async function getSubmissionById(
  id: string
): Promise<Pick<DeliverableSubmission, 'id' | 'status' | 'errorMessage' | 'externalAssetUrl'> | null> {
  const { data, error } = await supabase
    .from('deliverable_submissions')
    .select('id, status, error_message, external_asset_url')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  return {
    id: String(data.id),
    status: data.status as DeliverableSubmission['status'],
    errorMessage: (data.error_message as string) ?? null,
    externalAssetUrl: (data.external_asset_url as string) ?? null,
  }
}
