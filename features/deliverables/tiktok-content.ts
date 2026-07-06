import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Client layer for the new TikTok-API features. Every function here calls an edge
// function or table that is part of the in-progress backend rollout, so callers
// MUST gate on `tiktokApiFeaturesEnabled` (features/core/flags.ts). Until the
// backend is live these are simply never invoked.

// Turn a raw edge/TikTok error string into something a creator can act on. Auth
// failures are normalised so they match TikTokAuthGuard's patterns (which listens
// on the query cache) and auto-route to the reconnect screen.
function mapTikTokError(raw: string): string {
  const msg = (raw || '').trim() || 'Something went wrong with TikTok. Please try again.'
  if (/invalid_grant|revoked|token.*(invalid|expired)|(invalid|expired).*token|unauthorized/i.test(msg)) {
    return 'TikTok authorization expired (TIKTOK_AUTH_INVALID). Please reconnect your TikTok account.'
  }
  if (/scope|not authorized|permission|video\.(list|upload)/i.test(msg)) {
    return 'TikTok needs to be reconnected to grant the new permissions — tap Reconnect and approve every box.'
  }
  if (/spam|too many|rate.?limit|frequency/i.test(msg)) {
    return 'TikTok is limiting how often videos can be sent right now. Please wait a little and try again.'
  }
  if (/unaudited|not.*verified|url ownership|domain/i.test(msg)) {
    return 'This TikTok app is still in review, so posting is limited to approved test accounts.'
  }
  return msg
}

// True when an error message (already run through mapTikTokError) means the creator
// should reconnect TikTok — used by callers to offer a "Reconnect" action.
export function isReconnectError(message: string | null | undefined): boolean {
  return /reconnect|TIKTOK_AUTH_INVALID/i.test(message || '')
}

// Invoke an edge function and surface the REAL error. supabase.functions.invoke
// only exposes a generic "non-2xx" message on `error`; the actual detail lives in
// the response body (FunctionsHttpError.context), so we read it back. Also treats a
// 200 response carrying an `{ error }` field as a failure.
async function invokeTikTokFn<T = unknown>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) {
    let detail = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = await error.context.json()
        detail = parsed?.error || parsed?.message || detail
      } catch {
        // Body wasn't JSON / already consumed — keep the generic message.
      }
    }
    throw new Error(mapTikTokError(detail))
  }
  const d = data as (Record<string, unknown> & { error?: string }) | null
  if (d && typeof d === 'object' && typeof d.error === 'string' && d.error) {
    throw new Error(mapTikTokError(d.error))
  }
  return data as T
}

export type TikTokVideo = {
  videoId: string
  title: string | null
  coverImageUrl: string | null
  shareUrl: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
}

export type VideoStats = {
  videoId: string
  shareUrl: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  capturedAt: string
}

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// Pull the connected creator's published videos via the `fetch-tiktok-videos`
// edge function (which wraps TikTok's video.list). Returns newest-first.
export async function fetchTikTokVideos(): Promise<TikTokVideo[]> {
  const data = await invokeTikTokFn<{ videos?: Row[] }>('fetch-tiktok-videos', {})

  const rows = (data?.videos ?? []) as Row[]
  return rows.map((r) => ({
    videoId: String(r.id ?? r.video_id ?? ''),
    title: (r.title as string) ?? null,
    coverImageUrl: (r.cover_image_url as string) ?? null,
    shareUrl: (r.share_url as string) ?? null,
    viewCount: num(r.view_count),
    likeCount: num(r.like_count),
    commentCount: num(r.comment_count),
    shareCount: num(r.share_count),
  }))
}

// Link a chosen published video to a deliverable. Sets the deliverable's url to the
// TikTok share_url and records the video id so the cron poller can track its stats.
// Mirrors the existing submitLink shape so the rest of the lifecycle is unchanged.
export async function linkTikTokVideo(params: { deliverableId: string; video: TikTokVideo }): Promise<void> {
  await invokeTikTokFn('fetch-tiktok-videos', {
    action: 'link',
    deliverable_id: params.deliverableId,
    video_id: params.video.videoId,
    share_url: params.video.shareUrl,
  })
}

// Latest tracked metrics for a deliverable's linked video (newest snapshot).
export async function getDeliverableVideoStats(deliverableId: string): Promise<VideoStats | null> {
  const { data, error } = await supabase
    .from('tiktok_video_stats')
    .select('tiktok_video_id, share_url, view_count, like_count, comment_count, share_count, captured_at')
    .eq('deliverable_id', deliverableId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const r = data as Row
  return {
    videoId: String(r.tiktok_video_id ?? ''),
    shareUrl: (r.share_url as string) ?? null,
    viewCount: num(r.view_count),
    likeCount: num(r.like_count),
    commentCount: num(r.comment_count),
    shareCount: num(r.share_count),
    capturedAt: String(r.captured_at ?? ''),
  }
}

export type DraftResult = { status: 'queued' | 'done'; shareUrl?: string | null }

// Push an approved deliverable video to the creator's TikTok drafts via the
// `post-to-tiktok-draft` edge function (which runs the mandatory creator_info
// pre-check, then the Content Posting inbox/draft upload).
export async function postToTikTokDraft(deliverableId: string): Promise<DraftResult> {
  const result = await invokeTikTokFn<{ status?: string; share_url?: string }>('post-to-tiktok-draft', {
    deliverable_id: deliverableId,
  })
  return { status: result?.status === 'done' ? 'done' : 'queued', shareUrl: result?.share_url ?? null }
}
