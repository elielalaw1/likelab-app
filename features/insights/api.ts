import { supabase } from '@/lib/supabase'
import { getApplications } from '@/features/applications/api'

export type CampaignInsight = {
  campaignId: string
  campaignTitle: string
  // When the creator was accepted onto the campaign — lets the dashboard order
  // campaigns chronologically (for the view trend) without a new query.
  createdAt: string
  rank: number | null
  totalCreators: number | null
  views: number
  likes: number
  topViews: number
}

export type InsightsSummary = {
  totalViews: number
  totalLikes: number
  bestRank: number | null
  campaignsTracked: number
  perCampaign: CampaignInsight[]
  // True when at least one (but not all) campaign's leaderboard RPC failed, so the
  // shown totals understate reality and the UI can say so.
  partial: boolean
}

// Aggregates per-campaign performance from the leaderboard RPC across every accepted
// campaign. This is real campaign-attributed performance (views/likes/rank), distinct
// from the lifetime TikTok-account snapshot shown on the profile.
//
// NOTE: there is no time-series here — the backend stores only the current position,
// not historical snapshots. True "trend over time" charts require the backend to
// persist periodic snapshots first.
export async function getInsights(): Promise<InsightsSummary> {
  const { applications } = await getApplications()
  const accepted = applications.filter((a) => a.status === 'accepted')

  let failedCount = 0
  const results = await Promise.all(
    accepted.map(async (app): Promise<CampaignInsight> => {
      const { data, error } = await supabase.rpc('get_campaign_leaderboard_position', { p_campaign_id: app.campaignId })
      if (error) {
        // Don't fail the whole insights screen for one campaign — log it and fall
        // back to a no-data row so the campaign still appears (rather than vanishing).
        failedCount++
        console.warn(`[insights] leaderboard RPC failed for campaign ${app.campaignId}:`, error.message)
      }
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null
      return {
        campaignId: app.campaignId,
        campaignTitle: app.campaignTitle,
        createdAt: app.createdAt ?? '',
        rank: row?.rank ?? null,
        totalCreators: row?.total_creators ?? null,
        views: Number(row?.my_views ?? 0),
        likes: Number(row?.my_likes ?? 0),
        topViews: Number(row?.top_views ?? 0),
      }
    })
  )

  // If there were accepted campaigns but EVERY leaderboard RPC failed, surface an
  // error rather than collapsing into a "No data yet" empty state that looks like a
  // genuinely empty account.
  if (accepted.length > 0 && failedCount === accepted.length) {
    throw new Error('Could not load campaign performance. Please try again.')
  }

  // Keep only campaigns that actually have a tracked position / engagement.
  const perCampaign = results
    .filter((r) => r.rank != null || r.views > 0 || r.likes > 0)
    .sort((a, b) => b.views - a.views)

  const totalViews = perCampaign.reduce((sum, r) => sum + r.views, 0)
  const totalLikes = perCampaign.reduce((sum, r) => sum + r.likes, 0)
  const ranks = perCampaign.map((r) => r.rank).filter((r): r is number => r != null)
  const bestRank = ranks.length ? Math.min(...ranks) : null

  return {
    totalViews,
    totalLikes,
    bestRank,
    campaignsTracked: perCampaign.length,
    perCampaign,
    partial: failedCount > 0,
  }
}
