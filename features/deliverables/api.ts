import { supabase } from '@/lib/supabase'
import { Deliverable } from '@/features/core/types'
import { getCurrentUserId, textValue } from '@/features/core/supabase-utils'

type Row = Record<string, unknown>

export async function getDeliverables() {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, campaign_id, status, platform, type, url, notes, campaigns(name, brand_id)')
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
      notes: textValue(row, ['notes']),
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
      status: 'uploaded',
      platform: 'tiktok',
    })
    .eq('id', params.deliverableId)
    .eq('creator_id', userId)

  if (error) throw new Error(error.message)
}
