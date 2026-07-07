import { supabase } from '@/lib/supabase'
import { ApplicationStatus, Campaign, CampaignApplyForm, CreatorInvitation, Deliverable } from '@/features/core/types'
import { getCurrentUserId, numberValue, textValue } from '@/features/core/supabase-utils'
import { directDeliveryEnabled, tierPreview } from '@/features/core/flags'

type Row = Record<string, unknown>

// Gold/partner campaigns keep the pre-post brand review; standard campaigns deliver
// link + RAW in one step and go live directly. The tier column is backend-pending, so
// until it ships we fall back to the current review flow in prod, and to the new direct
// flow in a dev build (EXPO_PUBLIC_DIRECT_DELIVERY=on) so it can be exercised.
function resolveTier(row: Row): { tier: Campaign['campaignTier']; requiresReview: boolean } {
  // TEMP (#tier-preview): visual QA override for the tier card borders — see flags.ts.
  if (tierPreview) {
    const forced =
      tierPreview === 'mixed'
        ? ((String(row['id'] || '').charCodeAt(0) || 0) % 2 === 0 ? 'gold' : 'partner')
        : tierPreview
    return { tier: forced, requiresReview: true }
  }
  const raw = (textValue(row, ['campaign_tier', 'tier']) || '').toLowerCase()
  if (raw === 'gold' || raw === 'partner') return { tier: raw, requiresReview: true }
  if (raw === 'standard') return { tier: 'standard', requiresReview: false }
  const explicit = row['requires_review']
  if (explicit === true) return { tier: null, requiresReview: true }
  if (explicit === false) return { tier: 'standard', requiresReview: false }
  return { tier: null, requiresReview: !directDeliveryEnabled }
}

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

// Normalise the campaigns.apply_form jsonb (brand/admin-authored, so defensive)
// into a typed CampaignApplyForm. Returns null when there's nothing to collect.
function parseApplyForm(raw: unknown): CampaignApplyForm | null {
  // Brand/admin-authored jsonb — tolerate naming variants (select vs single-select,
  // collectSize vs collect_size, options vs choices, label vs question) defensively.
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const asText = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
  const rawQuestions = Array.isArray(o.questions) ? o.questions : Array.isArray(o.fields) ? o.fields : []
  const questions = rawQuestions
    .map((raw, i) => {
      if (!raw || typeof raw !== 'object') return null
      const q = raw as Record<string, unknown>
      const label = asText(q.label ?? q.question ?? q.title).trim()
      if (!label) return null
      const t = asText(q.type).toLowerCase()
      const type = t.includes('select') || t === 'choice' || t === 'radio' ? ('select' as const) : ('text' as const)
      const opts = Array.isArray(q.options) ? q.options : Array.isArray(q.choices) ? q.choices : []
      const options = opts.map(asText).map((s) => s.trim()).filter(Boolean)
      return {
        id: String(q.id ?? q.key ?? `q${i}`),
        label,
        type,
        options: options.length ? options : undefined,
        required: q.required === true || q.required === 'true',
      }
    })
    .filter((q): q is NonNullable<typeof q> => q !== null)
  const collectSize = o.collectSize === true || o.collect_size === true
  const msg = asText(o.message ?? o.intro ?? o.intro_message).trim()
  const message = msg ? msg : null
  if (!collectSize && questions.length === 0 && !message) return null
  return { message, collectSize, questions }
}

// video_requirements holds JSON ({ styles: string[], direction: string }) from the
// new wizard, but legacy campaigns stored plain text — parse defensively.
function parseVideoRequirements(raw: string | null): { adStyles: string[] | null; videoDirection: string | null } {
  if (!raw) return { adStyles: null, videoDirection: null }
  try {
    const parsed = JSON.parse(raw) as { styles?: unknown; direction?: unknown }
    const adStyles = Array.isArray(parsed.styles) ? parsed.styles.map(String).filter(Boolean) : null
    const videoDirection = typeof parsed.direction === 'string' && parsed.direction.trim() ? parsed.direction.trim() : null
    return { adStyles, videoDirection }
  } catch {
    // Legacy plain-text requirements read as direction so nothing is lost.
    return { adStyles: null, videoDirection: raw }
  }
}

const CAMPAIGN_LEVELS = new Set(['bronze', 'silver', 'gold', 'cpm', 'partner'])

function mapCampaign(row: Row): Campaign {
  return {
    id: String(row.id || ''),
    title: textValue(row, ['name']) || 'Untitled campaign',
    description: textValue(row, ['description']),
    productDescription: textValue(row, ['product_description']),
    applyFormEnabled: row.apply_form_enabled === true,
    applyForm: parseApplyForm(row.apply_form),
    brandId: textValue(row, ['brand_id']),
    startDate: textValue(row, ['start_date']),
    endDate: textValue(row, ['end_date']),
    status: (textValue(row, ['status']) || 'draft') as Campaign['status'],
    phase: (textValue(row, ['phase']) || null) as Campaign['phase'],
    requiredVideos: numberValue(row, ['required_videos']),
    ...(() => { const t = resolveTier(row); return { requiresReview: t.requiresReview, campaignTier: t.tier } })(),
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
    preferredCreators: textValue(row, ['preferred_creators']),
    prizeDistribution: toPrizeDistribution(row.prize_distribution),
    ...(() => {
      const raw = (textValue(row, ['campaign_level']) || '').toLowerCase()
      return { campaignLevel: (CAMPAIGN_LEVELS.has(raw) ? raw : null) as Campaign['campaignLevel'] }
    })(),
    cpmRate: numberValue(row, ['cpm_rate']),
    winnerCount: numberValue(row, ['winner_count']),
    bonusRewardsEnabled: row.bonus_rewards_enabled === true,
    bonusRewardsDescription: textValue(row, ['bonus_rewards_description']),
    productUrl: textValue(row, ['product_url']),
    productValueSek: numberValue(row, ['product_value_sek']),
    productAmount: numberValue(row, ['product_amount']),
    targetRegions: toStringArray(row.target_regions),
    targetCategories: toStringArray(row.target_categories),
    ...parseVideoRequirements(textValue(row, ['video_requirements'])),
  }
}

const SUPABASE_STORAGE_PUBLIC_PREFIX = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`
const CAMPAIGN_ASSETS_BUCKET = 'campaign-assets'

/** Extracts the object path within the campaign-assets bucket from whatever is stored in the DB.
 *  Handles three formats:
 *  1. Raw path:           "campaigns/uuid/cover.jpg"
 *  2. With bucket prefix: "campaign-assets/campaigns/uuid/cover.jpg"
 *  3. Full public URL:    "https://xxx.supabase.co/storage/v1/object/public/campaign-assets/..."
 *  Returns null for external URLs that aren't Supabase storage paths. */
function extractStoragePath(raw: string): string | null {
  if (raw.startsWith(SUPABASE_STORAGE_PUBLIC_PREFIX)) {
    const afterPrefix = raw.slice(SUPABASE_STORAGE_PUBLIC_PREFIX.length)
    const bucketEnd = afterPrefix.indexOf('/')
    if (bucketEnd === -1) return null
    return afterPrefix.slice(bucketEnd + 1)
  }
  if (raw.startsWith('http')) return null
  const bucketPrefix = `${CAMPAIGN_ASSETS_BUCKET}/`
  return raw.startsWith(bucketPrefix) ? raw.slice(bucketPrefix.length) : raw
}

// Returns an ORDERED list of image URLs per campaign (a campaign can have many
// assets in campaign_assets — first = cover, the rest power the gallery carousel).
async function getCampaignAssets(campaignIds: string[]) {
  if (!campaignIds.length) return new Map<string, string[]>()

  const { data, error } = await supabase
    .from('campaign_assets')
    .select('*')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // A slot is either a direct URL or a storage path to sign. Slots are ordered
  // cover → product (reward_image) → other: the wizard uploads product photos
  // (step 4) BEFORE the cover (step 6), so raw created_at order would put a
  // product shot as the hero frame.
  type Slot = { direct?: string; path?: string; rank: number }
  const TYPE_RANK: Record<string, number> = { cover: 0, reward_image: 1 }
  const slotsByCampaign = new Map<string, Slot[]>()
  const toSign: string[] = []

  for (const row of data || []) {
    const record = row as Row
    const campaignId = textValue(record, ['campaign_id'])
    if (!campaignId) continue

    const raw = textValue(record, ['url', 'asset_url', 'file_url', 'image_url', 'thumbnail_url'])
    if (!raw) continue

    const type = (textValue(record, ['type', 'asset_type']) || '').toLowerCase()
    const rank = TYPE_RANK[type] ?? 2
    const storagePath = extractStoragePath(raw)
    const slots = slotsByCampaign.get(campaignId) || []
    if (storagePath) {
      slots.push({ path: storagePath, rank })
      toSign.push(storagePath)
    } else if (raw.startsWith('http')) {
      slots.push({ direct: raw, rank })
    }
    slotsByCampaign.set(campaignId, slots)
  }

  // Stable sort: created_at order within each type group is preserved.
  for (const slots of slotsByCampaign.values()) slots.sort((a, b) => a.rank - b.rank)

  const signedByPath = new Map<string, string>()
  if (toSign.length) {
    // Single batch call instead of one request per image — 7-day TTL
    const { data: signedData } = await supabase.storage
      .from(CAMPAIGN_ASSETS_BUCKET)
      .createSignedUrls(toSign, 7 * 24 * 3600)

    for (const r of signedData || []) {
      if (r.signedUrl && r.path) signedByPath.set(r.path, r.signedUrl)
    }
  }

  const imageMap = new Map<string, string[]>()
  for (const [campaignId, slots] of slotsByCampaign) {
    const urls: string[] = []
    for (const slot of slots) {
      if (slot.direct) urls.push(slot.direct)
      else if (slot.path) {
        const signed = signedByPath.get(slot.path)
        if (signed) urls.push(signed)
      }
    }
    if (urls.length) imageMap.set(campaignId, urls)
  }

  return imageMap
}

async function getBrandProfiles(brandIds: string[]) {
  if (!brandIds.length) return new Map<string, { name: string; logoUrl: string | null; instagram: string | null; tiktok: string | null }>()

  const { data, error } = await supabase
    .from('brand_profiles_public')
    .select('user_id, company_name, logo_url, social_links')
    .in('user_id', brandIds)

  if (error) throw new Error(error.message)

  const map = new Map<string, { name: string; logoUrl: string | null; instagram: string | null; tiktok: string | null }>()
  for (const row of data || []) {
    if (row.user_id) {
      const social = (row.social_links as Record<string, string> | null) ?? {}
      map.set(row.user_id, {
        name: row.company_name || '',
        logoUrl: (row.logo_url as string | null) ?? null,
        instagram: social.instagram ?? null,
        tiktok: social.tiktok ?? null,
      })
    }
  }
  return map
}

export async function enrichCampaigns(campaigns: Campaign[]) {
  const campaignIds = campaigns.map((c) => c.id)
  const brandIds = campaigns.map((c) => c.brandId).filter((v): v is string => Boolean(v))

  const [assetMap, brandMap] = await Promise.all([getCampaignAssets(campaignIds), getBrandProfiles(brandIds)])

  return campaigns.map((campaign) => {
    const brand = campaign.brandId ? brandMap.get(campaign.brandId) : undefined
    const assetUrls = assetMap.get(campaign.id) || []
    const imageUrls = assetUrls.length ? assetUrls : (campaign.coverImageUrl ? [campaign.coverImageUrl] : [])
    return {
      ...campaign,
      imageUrls,
      coverImageUrl: imageUrls[0] || campaign.coverImageUrl || null,
      brandName: brand?.name || null,
      brandLogoUrl: brand?.logoUrl || null,
      brandInstagram: brand?.instagram || null,
      brandTiktok: brand?.tiktok || null,
    }
  })
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

export async function applyToCampaign(campaignId: string): Promise<{ applicationId: string }> {
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
      return { applicationId: String(current.id) }
    }

    throw new Error(`Cannot apply while application status is "${current.status}"`)
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({ campaign_id: campaignId, creator_id: userId, status: 'applied' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { applicationId: String(data.id) }
}

// Saves the creator's answers to the campaign's after-apply form onto their own
// application row. Best-effort: a failure here must never undo the application.
export async function saveApplyFormResponse(applicationId: string, response: Record<string, unknown>) {
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('applications')
    .update({ apply_form_response: response })
    .eq('id', applicationId)
    .eq('creator_id', userId)
  if (error) throw new Error(error.message)
}

export async function getCampaignDeliverables(campaignId: string): Promise<Deliverable[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('deliverables')
    .select('id, campaign_id, status, approval_status, ready_for_posting, platform, type, url, flag_reason, campaigns(name, brand_id, phase)')
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
      campaignPhase: (textValue(campaignRel || {}, ['phase']) || null) as Deliverable['campaignPhase'],
      status: (textValue(row, ['status']) || 'pending') as Deliverable['status'],
      approvalStatus: (textValue(row, ['approval_status']) || 'pending') as Deliverable['approvalStatus'],
      readyForPosting: row.ready_for_posting === true,
      platform: textValue(row, ['platform']) || 'tiktok',
      type: textValue(row, ['type']),
      url: textValue(row, ['url']),
      flagReason: textValue(row, ['flag_reason']),
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
