import { File } from 'expo-file-system'
import { supabase } from '@/lib/supabase'
import { Deliverable, DeliverableFeedback, DeliverableSubmission, mapFeedbackRow, mapSubmissionRow } from '@/features/core/types'
import { getCurrentUserId, textValue } from '@/features/core/supabase-utils'

type Row = Record<string, unknown>

export async function getDeliverables() {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, campaign_id, status, approval_status, ready_for_posting, platform, type, url, flag_reason, campaigns(name, brand_id, phase)')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as Array<Row & { campaigns?: Row | Row[] }>).map((row) => {
    const campaignRel = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns

    return {
      id: String(row.id || ''),
      campaignId: String(row.campaign_id || ''),
      campaignTitle: textValue(campaignRel || {}, ['name']) || 'Campaign',
      campaignPhase: (textValue(campaignRel || {}, ['phase']) || null) as Deliverable['campaignPhase'],
      status: (textValue(row, ['status']) || 'pending') as Deliverable['status'],
      approvalStatus: (textValue(row, ['approval_status']) || 'pending') as Deliverable['approvalStatus'],
      readyForPosting: row.ready_for_posting === true,
      platform: textValue(row, ['platform']) || 'tiktok',
      type: textValue(row, ['type']),
      url: textValue(row, ['url']),
      notes: textValue(row, ['notes']),
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

  // Read the real bytes via expo-file-system. fetch(uri).blob() on a local
  // file:// URI returns a 0-byte blob in React Native, which uploads an empty
  // file and makes the edge function reject it ("video file is empty").
  const fileUri = params.fileUri.startsWith('file://') ? params.fileUri : `file://${params.fileUri}`
  const bytes = await new File(fileUri).bytes()
  if (!bytes || bytes.byteLength === 0) {
    throw new Error('The selected video file is empty or unreadable. Please pick the video again.')
  }

  const { error: uploadError } = await supabase.storage
    .from('deliverable-videos')
    .upload(storagePath, bytes, { contentType: mimeType, upsert: true })

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

export type MyVideo = { id: string; deliverableId: string; url: string; tiktokUrl: string | null; thumbnailUrl: string | null; createdAt: string }

// Server thumbnails (if the backend generates them) live in `deliverable-thumbnails` at the
// same path as the video but with a .jpg extension.
function thumbPathFor(videoPath: string): string {
  return /\.[^/.]+$/.test(videoPath) ? videoPath.replace(/\.[^/.]+$/, '.jpg') : `${videoPath}.jpg`
}

// All of the creator's uploaded videos (newest first) with playable signed URLs — for the
// TikTok-style feed on the profile.
export async function getMyVideos(): Promise<MyVideo[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('deliverable_submissions')
    .select('id, deliverable_id, video_storage_path, created_at')
    .eq('creator_id', userId)
    .eq('submission_type', 'video')
    .not('video_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  const allRows = (data || []) as { id: string; deliverable_id: string; video_storage_path: string; created_at: string }[]
  // One tile per deliverable — keep only the newest video (rows are already newest-first),
  // so revision re-uploads don't surface superseded/rejected versions.
  const seenDeliverables = new Set<string>()
  const rows = allRows.filter((r) => {
    if (seenDeliverables.has(r.deliverable_id)) return false
    seenDeliverables.add(r.deliverable_id)
    return true
  })
  if (!rows.length) return []

  const { data: signed } = await supabase.storage
    .from('deliverable-videos')
    .createSignedUrls(rows.map((r) => r.video_storage_path), 6 * 3600)

  const byPath = new Map((signed || []).filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl as string]))

  // Server-generated thumbnails (fast). Safe whether or not the bucket exists yet — on any
  // failure the feed falls back to client-side thumbnail generation.
  const thumbByVideoPath = new Map<string, string>()
  try {
    const thumbPaths = rows.map((r) => thumbPathFor(r.video_storage_path))
    const { data: signedThumbs } = await supabase.storage
      .from('deliverable-thumbnails')
      .createSignedUrls(thumbPaths, 6 * 3600)
    ;(signedThumbs || []).forEach((s, i) => {
      if (s?.signedUrl) thumbByVideoPath.set(rows[i].video_storage_path, s.signedUrl)
    })
  } catch {
    // bucket not set up yet — client-side generation handles it
  }

  // The posted TikTok link lives on the parent deliverable (set when the creator submits it).
  const deliverableIds = Array.from(new Set(rows.map((r) => r.deliverable_id)))
  const { data: dels } = await supabase.from('deliverables').select('id, url').in('id', deliverableIds)
  const tiktokByDeliverable = new Map((dels || []).map((d) => [String(d.id), (textValue(d as Row, ['url']) || null)]))

  return rows
    .map((r) => ({
      id: String(r.id),
      deliverableId: String(r.deliverable_id),
      url: byPath.get(r.video_storage_path) || '',
      tiktokUrl: tiktokByDeliverable.get(r.deliverable_id) || null,
      thumbnailUrl: thumbByVideoPath.get(r.video_storage_path) || null,
      createdAt: String(r.created_at),
    }))
    .filter((v) => v.url)
}

// Signed URL to the creator's uploaded review video. Finds the latest VIDEO submission
// specifically (not just the newest row) — otherwise a later link submission would mask it.
export async function getDeliverableVideoSignedUrl(deliverableId: string): Promise<string | null> {
  const { data } = await supabase
    .from('deliverable_submissions')
    .select('video_storage_path')
    .eq('deliverable_id', deliverableId)
    .eq('submission_type', 'video')
    .not('video_storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const path = (data as { video_storage_path?: string } | null)?.video_storage_path
  if (!path) return null

  const { data: signed, error } = await supabase.storage
    .from('deliverable-videos')
    .createSignedUrl(path, 6 * 3600)
  if (error) throw new Error(error.message)
  return signed?.signedUrl ?? null
}

// Remove the uploaded video + submission and reset the deliverable to 'pending'.
// Runs server-side via the `delete-deliverable-video` edge function (service role +
// ownership check) so no broad delete RLS needs to be opened.
export async function deleteDeliverableVideo(deliverableId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-deliverable-video', {
    body: { deliverable_id: deliverableId },
  })
  if (error) throw new Error(error.message)
  const result = data as { error?: string } | null
  if (result?.error) throw new Error(result.error)
}

// ── Brand feedback ──────────────────────────────────────────────────────────

// All feedback on a deliverable, newest first. RLS scopes this to the creator's own
// deliverables, so no creator_id filter is needed here.
export async function getDeliverableFeedback(deliverableId: string): Promise<DeliverableFeedback[]> {
  if (!deliverableId) return []

  // Deployed Live schema: id, deliverable_id, submission_id, creator_id, brand_id,
  // campaign_id, author_id, author_role, message, read_at, created_at. (No `kind`/`body`.)
  const { data, error } = await supabase
    .from('deliverable_feedback')
    .select('id, deliverable_id, submission_id, author_id, author_role, message, read_at, created_at')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as Row[]).map(mapFeedbackRow)
}

// Unread-feedback count per deliverable for the current creator — drives badges on the
// Projects list. System rows count too (a backfilled change request the creator hasn't seen).
export async function getUnreadFeedbackCounts(): Promise<Record<string, number>> {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  const { data, error } = await supabase
    .from('deliverable_feedback')
    .select('deliverable_id')
    .eq('creator_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const row of (data || []) as Row[]) {
    const id = String(row.deliverable_id ?? '')
    if (id) counts[id] = (counts[id] || 0) + 1
  }
  return counts
}

// Mark feedback rows as read. RLS only permits the creator to touch read_at on their own
// rows; the creator_id + is-null guards keep the update minimal and idempotent.
export async function markFeedbackRead(ids: string[]): Promise<void> {
  if (!ids.length) return
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('deliverable_feedback')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null)
    .eq('creator_id', userId)

  if (error) throw new Error(error.message)
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
