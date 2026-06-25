import { supabase } from '@/lib/supabase'
import { CreatorApplication, CreatorInvitation } from '@/features/core/types'
import { getCurrentUserId, numberValue, textValue } from '@/features/core/supabase-utils'
import { enrichCampaigns } from '@/features/campaigns/api'

type Row = Record<string, unknown>

const statusPriority: Record<string, number> = {
  accepted: 4,
  applied: 3,
  rejected: 2,
  withdrawn: 1,
}

function mapCampaignFromJoin(campaign: Row) {
  return {
    id: String(campaign.id || ''),
    title: textValue(campaign, ['name']) || 'Campaign',
    brandId: textValue(campaign, ['brand_id']),
    rewardAmount: numberValue(campaign, ['reward_value_sek']),
    rewardType: textValue(campaign, ['reward_type']),
    startDate: textValue(campaign, ['start_date']),
    endDate: textValue(campaign, ['end_date']),
  }
}

export async function getApplications(): Promise<{ applications: CreatorApplication[]; invitations: CreatorInvitation[] }> {
  const userId = await getCurrentUserId()

  const [applicationsRes, invitationsRes] = await Promise.all([
    supabase
      .from('applications')
      .select('id, campaign_id, status, created_at, campaigns(*)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_invitations')
      .select('id, campaign_id, status, created_at, campaigns(*)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (applicationsRes.error) throw new Error(applicationsRes.error.message)
  if (invitationsRes.error) throw new Error(invitationsRes.error.message)

  const appCampaigns = (applicationsRes.data || [])
    .map((row) => {
      const rel = row.campaigns as Row | Row[] | null
      return Array.isArray(rel) ? rel[0] : rel
    })
    .filter((v): v is Row => Boolean(v))

  const inviteCampaigns = (invitationsRes.data || [])
    .map((row) => {
      const rel = row.campaigns as Row | Row[] | null
      return Array.isArray(rel) ? rel[0] : rel
    })
    .filter((v): v is Row => Boolean(v))

  const enrichedCampaigns = await enrichCampaigns([...appCampaigns, ...inviteCampaigns].map(mapCampaignFromJoin))
  const campaignMap = new Map(enrichedCampaigns.map((campaign) => [campaign.id, campaign]))

  const mappedApplications: CreatorApplication[] = (applicationsRes.data || []).map((row) => {
    const campaign = campaignMap.get(String(row.campaign_id || ''))

    return {
      id: String(row.id || ''),
      campaignId: String(row.campaign_id || ''),
      campaignTitle: campaign?.title || 'Campaign',
      campaignImageUrl: campaign?.coverImageUrl || null,
      campaignBrandName: campaign?.brandName || null,
      status: String(row.status || 'applied') as CreatorApplication['status'],
      rewardAmount: campaign?.rewardAmount || null,
      rewardType: campaign?.rewardType || null,
      startDate: campaign?.startDate || null,
      endDate: campaign?.endDate || null,
      createdAt: String(row.created_at || ''),
    }
  })

  const dedupedApplications = new Map<string, CreatorApplication>()
  for (const application of mappedApplications) {
    const existing = dedupedApplications.get(application.campaignId)
    if (!existing) {
      dedupedApplications.set(application.campaignId, application)
      continue
    }

    const currentPriority = statusPriority[application.status] || 0
    const existingPriority = statusPriority[existing.status] || 0
    const currentCreatedAt = new Date(application.createdAt || 0).getTime()
    const existingCreatedAt = new Date(existing.createdAt || 0).getTime()

    if (currentPriority > existingPriority || (currentPriority === existingPriority && currentCreatedAt > existingCreatedAt)) {
      dedupedApplications.set(application.campaignId, application)
    }
  }

  const invitations: CreatorInvitation[] = (invitationsRes.data || []).map((row) => {
    const campaign = campaignMap.get(String(row.campaign_id || ''))

    return {
      id: String(row.id || ''),
      campaignId: String(row.campaign_id || ''),
      status: String(row.status || 'pending'),
      createdAt: String(row.created_at || ''),
      campaignTitle: campaign?.title || 'Campaign',
      campaignImageUrl: campaign?.coverImageUrl || null,
      campaignBrandName: campaign?.brandName || null,
      rewardAmount: campaign?.rewardAmount || null,
      rewardType: campaign?.rewardType || null,
      startDate: campaign?.startDate || null,
      endDate: campaign?.endDate || null,
    }
  })

  return {
    applications: Array.from(dedupedApplications.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    invitations,
  }
}

export async function getRecentApplications(limit = 3): Promise<CreatorApplication[]> {
  const result = await getApplications()
  return result.applications.slice(0, limit)
}

export async function getAcceptedApplicationCampaigns(limit = 3) {
  const userId = await getCurrentUserId()
  const result = await getApplications()
  const accepted = result.applications.filter((item) => item.status === 'accepted')

  const { data: deliverableRows, error: deliverableError } = await supabase
    .from('deliverables')
    .select('campaign_id, approval_status, ready_for_posting')
    .eq('creator_id', userId)

  if (deliverableError) throw new Error(deliverableError.message)

  const deliverableCampaignIds = new Set(
    (deliverableRows || []).map((row) => String(row.campaign_id || '')).filter(Boolean)
  )

  const actionableAccepted = accepted.filter((item) => deliverableCampaignIds.has(item.campaignId)).slice(0, limit)

  return actionableAccepted.map((item) => ({
    id: item.campaignId,
    title: item.campaignTitle,
    brandName: item.campaignBrandName,
    coverImageUrl: item.campaignImageUrl,
    rewardAmount: item.rewardAmount,
    rewardType: item.rewardType,
    startDate: item.startDate,
    endDate: item.endDate,
    status: 'published' as const,
    creatorApplicationStatus: item.status,
  }))
}

// Accept/decline run as a single SECURITY DEFINER transaction on the backend
// (status check + application upsert + invitation update), so concurrent
// double-taps/retries can't produce inconsistent state. The RPC returns true
// only when it actually changed a pending row; false means it was already
// handled / not found / not owned.
export async function acceptInvitation(invitationId: string) {
  const { data, error } = await supabase.rpc('accept_campaign_invitation', { p_invitation_id: invitationId })
  if (error) throw new Error(error.message)
  if (data === false) throw new Error('This invitation was already handled.')
}

export async function declineInvitation(invitationId: string) {
  const { data, error } = await supabase.rpc('decline_campaign_invitation', { p_invitation_id: invitationId })
  if (error) throw new Error(error.message)
  if (data === false) throw new Error('This invitation was already handled.')
}
