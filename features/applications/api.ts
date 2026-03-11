import { supabase } from '@/lib/supabase'
import { CreatorApplication, CreatorInvitation } from '@/features/core/types'
import { getCurrentUserId, numberValue, textValue } from '@/features/core/supabase-utils'
import { enrichCampaigns } from '@/features/campaigns/api'

type Row = Record<string, unknown>

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

  const applications: CreatorApplication[] = (applicationsRes.data || []).map((row) => {
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

  return { applications, invitations }
}

export async function getRecentApplications(limit = 3): Promise<CreatorApplication[]> {
  const result = await getApplications()
  return result.applications.slice(0, limit)
}

export async function getAcceptedApplicationCampaigns(limit = 3) {
  const result = await getApplications()
  const accepted = result.applications.filter((item) => item.status === 'accepted').slice(0, limit)

  return accepted.map((item) => ({
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

export async function acceptInvitation(invitationId: string) {
  const userId = await getCurrentUserId()

  const { data: invitation, error: invitationError } = await supabase
    .from('campaign_invitations')
    .select('id, campaign_id, status')
    .eq('id', invitationId)
    .eq('creator_id', userId)
    .maybeSingle()

  if (invitationError) throw new Error(invitationError.message)
  if (!invitation) throw new Error('Invitation not found')
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation cannot be accepted from status "${invitation.status}"`)
  }

  // Order matters: we only mark invitation accepted after ensuring an accepted
  // application row exists. This avoids ending up with accepted invitation but
  // missing application if insert fails client-side.
  // TODO: move this flow into a single RPC/Edge transaction for true atomicity.

  const { data: existingApp, error: existingAppError } = await supabase
    .from('applications')
    .select('id, status')
    .eq('creator_id', userId)
    .eq('campaign_id', invitation.campaign_id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingAppError) throw new Error(existingAppError.message)
  if (existingApp && existingApp.length > 0) {
    const current = existingApp[0]
    if (current.status !== 'accepted') {
      const { error: promoteError } = await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', current.id)
      if (promoteError) throw new Error(promoteError.message)
    }
  } else {
    const { error: insertError } = await supabase.from('applications').insert({
      campaign_id: invitation.campaign_id,
      creator_id: userId,
      status: 'accepted',
    })
    if (insertError) throw new Error(insertError.message)
  }

  const { error: updateError } = await supabase
    .from('campaign_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
    .eq('creator_id', userId)
    .eq('status', 'pending')
  if (updateError) throw new Error(updateError.message)
}

export async function declineInvitation(invitationId: string) {
  const userId = await getCurrentUserId()

  const { data: invitation, error: invitationError } = await supabase
    .from('campaign_invitations')
    .select('id, status')
    .eq('id', invitationId)
    .eq('creator_id', userId)
    .maybeSingle()

  if (invitationError) throw new Error(invitationError.message)
  if (!invitation) throw new Error('Invitation not found')
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation cannot be declined from status "${invitation.status}"`)
  }

  const { error } = await supabase
    .from('campaign_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('creator_id', userId)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}
