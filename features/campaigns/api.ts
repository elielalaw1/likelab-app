import { supabase } from '@/lib/supabase'
import { ApplicationStatus, Campaign, CreatorInvitation, Deliverable } from '@/features/core/types'
import { getCurrentUserId, numberValue, textValue } from '@/features/core/supabase-utils'

type Row = Record<string, unknown>

function toPrizeDistribution(value: unknown): number[] | null {
  if (!value) return null

  if (Array.isArray(value)) {
    const direct = value.map((x) => Number(x)).filter((x) => !Number.isNaN(x))
    if (direct.length) return direct

    const objectBased = value
      .map((item) => (typeof item === 'object' && item ? Number((item as { amount?: unknown }).amount) : Number.NaN))
      .filter((x) => !Number.isNaN(x))
    if (objectBased.length) return objectBased
    return null
  }

  if (typeof value === 'object' && value) {
    const entries = Object.values(value as Record<string, unknown>)
      .map((x) => Number(x))
      .filter((x) => !Number.isNaN(x))
    return entries.length ? entries : null
  }

  return null
}

function toStringArray(value: unknown): string[] | null {
  if (!value) return null

  if (Array.isArray(value)) {
    const list = value.map((item) => String(item).trim()).filter(Boolean)
    return list.length ? list : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        const list = parsed.map((item) => String(item).trim()).filter(Boolean)
        return list.length ? list : null
      }
    } catch {}

    const list = trimmed
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    return list.length ? list : [trimmed]
  }

  return null
}

function mapCampaign(row: Row): Campaign {
  return {
    id: String(row.id || ''),
    title: textValue(row, ['name']) || 'Untitled campaign',
    description: textValue(row, ['description']),
    brandId: textValue(row, ['brand_id']),
    startDate: textValue(row, ['start_date']),
    endDate: textValue(row, ['end_date']),
    status: (textValue(row, ['status']) || 'draft') as Campaign['status'],
    requiredVideos: numberValue(row, ['required_videos']),
    rewardType: textValue(row, ['reward_type']),
    rewardValue: textValue(row, ['reward_value']),
    rewardAmount: numberValue(row, ['reward_value_sek']),
    rewardDescription: textValue(row, ['reward_description']),
    campaignGoal: textValue(row, ['campaign_goal']),
    videoRequirements: textValue(row, ['video_requirements']),
    briefGuidelines: textValue(row, ['brief_guidelines']),
    instructions: textValue(row, ['creator_instructions']),
    brandVoice: textValue(row, ['brand_voice']),
    brandTone: textValue(row, ['brand_tone']),
    targetAudience: textValue(row, ['target_audience']),
    platforms: toStringArray(row.platforms),
    exampleLinks: toStringArray(row.example_links),
    creationDays: numberValue(row, ['creation_days']),
    reviewDays: numberValue(row, ['review_days']),
    contentRightsDays: numberValue(row, ['content_rights_days']),
    creatorLimit: numberValue(row, ['creator_limit']),
    requiredDisclosure: textValue(row, ['required_disclosure']) || '#annons',
    thingsToAvoid: textValue(row, ['forbidden']),
    requiredHashtags: toStringArray(row.required_hashtags),
    keyMessages: toStringArray(row.key_messages),
    prizeDistribution: toPrizeDistribution(row.prize_distribution),
    level: textValue(row, ['campaign_level']),
  }
}

async function getCampaignAssets(campaignIds: string[]) {
  if (!campaignIds.length) return new Map<string, string>()

  const { data, error } = await supabase
    .from('campaign_assets')
    .select('*')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const imageMap = new Map<string, string>()

  for (const row of data || []) {
    const record = row as Row
    const campaignId = textValue(record, ['campaign_id'])
    if (!campaignId || imageMap.has(campaignId)) continue

    const url = textValue(record, ['url', 'asset_url', 'file_url', 'image_url', 'thumbnail_url'])
    if (url) imageMap.set(campaignId, url)
  }

  return imageMap
}

async function getBrandNames(brandIds: string[]) {
  if (!brandIds.length) return new Map<string, string>()

  const { data, error } = await supabase
    .from('brand_profiles')
    .select('user_id, company_name')
    .in('user_id', brandIds)

  if (error) throw new Error(error.message)

  const names = new Map<string, string>()
  for (const row of data || []) {
    if (row.user_id && row.company_name) {
      names.set(row.user_id, row.company_name)
    }
  }
  return names
}

export async function enrichCampaigns(campaigns: Campaign[]) {
  const campaignIds = campaigns.map((c) => c.id)
  const brandIds = campaigns.map((c) => c.brandId).filter((v): v is string => Boolean(v))

  const [assetMap, brandMap] = await Promise.all([getCampaignAssets(campaignIds), getBrandNames(brandIds)])

  return campaigns.map((campaign) => ({
    ...campaign,
    coverImageUrl: assetMap.get(campaign.id) || campaign.coverImageUrl || null,
    brandName: (campaign.brandId && brandMap.get(campaign.brandId)) || null,
  }))
}

export async function getCampaigns() {
  const userId = await getCurrentUserId()

  const [{ data: campaignRows, error: campaignError }, { data: appRows, error: appError }, { data: invitationRows, error: invitationError }] =
    await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('applications').select('campaign_id, status, created_at').eq('creator_id', userId).order('created_at', { ascending: false }),
      supabase.from('campaign_invitations').select('campaign_id, status, created_at').eq('creator_id', userId).order('created_at', { ascending: false }),
    ])

  if (campaignError) throw new Error(campaignError.message)
  if (appError) throw new Error(appError.message)
  if (invitationError) throw new Error(invitationError.message)

  const appMap = new Map<string, ApplicationStatus>()
  for (const row of appRows || []) {
    if (row.campaign_id && row.status && !appMap.has(row.campaign_id)) {
      appMap.set(row.campaign_id, row.status as ApplicationStatus)
    }
  }

  const inviteMap = new Map<string, string>()
  for (const row of invitationRows || []) {
    if (row.campaign_id && row.status && !inviteMap.has(row.campaign_id)) {
      inviteMap.set(row.campaign_id, row.status)
    }
  }

  const campaigns = (campaignRows || []).map((row) => {
    const mapped = mapCampaign(row as Row)
    return {
      ...mapped,
      creatorApplicationStatus: appMap.get(mapped.id) || null,
      invitationStatus: inviteMap.get(mapped.id) || null,
    }
  })

  return enrichCampaigns(campaigns)
}

export async function getCampaignById(campaignId: string) {
  const userId = await getCurrentUserId()

  const [{ data: campaignRow, error: campaignError }, { data: appRows, error: appError }, { data: invitationRows, error: invitationError }] =
    await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).single(),
      supabase
        .from('applications')
        .select('campaign_id, status, created_at')
        .eq('creator_id', userId)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('campaign_invitations')
        .select('campaign_id, status, created_at')
        .eq('creator_id', userId)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

  if (campaignError) throw new Error(campaignError.message)
  if (appError) throw new Error(appError.message)
  if (invitationError) throw new Error(invitationError.message)

  const campaign = mapCampaign(campaignRow as Row)
  const [enriched] = await enrichCampaigns([
    {
      ...campaign,
      creatorApplicationStatus: (appRows?.[0]?.status as ApplicationStatus | undefined) || null,
      invitationStatus: invitationRows?.[0]?.status || null,
    },
  ])

  return enriched
}

export async function applyToCampaign(campaignId: string) {
  const userId = await getCurrentUserId()

  const { data: existing, error: existingError } = await supabase
    .from('applications')
    .select('id, status')
    .eq('creator_id', userId)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingError) throw new Error(existingError.message)
  if (existing && existing.length > 0) {
    const current = existing[0]
    if (current.status === 'applied' || current.status === 'accepted') {
      throw new Error('You already have an active application for this campaign')
    }

    if (current.status === 'rejected' || current.status === 'withdrawn') {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'applied' })
        .eq('id', current.id)
      if (updateError) throw new Error(updateError.message)
      return
    }

    throw new Error(`Cannot apply while application status is "${current.status}"`)
  }

  const { error } = await supabase.from('applications').insert({
    campaign_id: campaignId,
    creator_id: userId,
    status: 'applied',
  })

  if (error) throw new Error(error.message)
}

export async function getCampaignDeliverables(campaignId: string): Promise<Deliverable[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, campaign_id, status, platform, type, url, notes, campaigns(name, brand_id)')
    .eq('creator_id', userId)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data || []) as Array<Row & { campaigns?: Row | Row[] }>
  const mapped = rows.map((row) => {
    const campaignRel = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns
    return {
      id: String(row.id || ''),
      campaignId: String(row.campaign_id || campaignId),
      campaignTitle: textValue(campaignRel || {}, ['name']) || 'Campaign',
      status: (textValue(row, ['status']) || 'pending') as Deliverable['status'],
      platform: textValue(row, ['platform']) || 'tiktok',
      type: textValue(row, ['type']),
      url: textValue(row, ['url']),
      notes: textValue(row, ['notes']),
      campaignBrandName: null,
    } satisfies Deliverable
  })

  return mapped
}

export async function getCreatorInvitations(): Promise<CreatorInvitation[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('campaign_invitations')
    .select('id, campaign_id, status, created_at, campaigns(*)')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const campaignRows = (data || [])
    .map((row) => {
      const rel = row.campaigns as Row | Row[] | null
      return Array.isArray(rel) ? rel[0] : rel
    })
    .filter((v): v is Row => Boolean(v))

  const enrichedCampaigns = await enrichCampaigns(campaignRows.map(mapCampaign))
  const byId = new Map(enrichedCampaigns.map((c) => [c.id, c]))

  return (data || []).map((row) => {
    const campaign = byId.get(String(row.campaign_id || ''))
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
}
