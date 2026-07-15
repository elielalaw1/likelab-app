import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDeliverableFeedback, getDeliverables, getLatestSubmission, getSubmissionById, getUnreadFeedbackCounts, isAwaitingLink, markFeedbackRead, submitLink, uploadVideo } from '@/features/deliverables/api'
import { VideoCompressionOptions } from '@/lib/video-compression'

const queryPerf = {
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
}

export function useDeliverables() {
  return useQuery({
    queryKey: ['deliverables'],
    queryFn: getDeliverables,
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

export function useDeliverablesBadgeCount() {
  const { data } = useDeliverables()
  return useMemo(
    () => (data || []).filter((d) => d.status === 'pending' || d.status === 'revision_requested' || isAwaitingLink(d)).length,
    [data]
  )
}

export function useDeliverableFeedback(deliverableId?: string) {
  return useQuery({
    queryKey: ['deliverable-feedback', deliverableId],
    queryFn: () => getDeliverableFeedback(deliverableId || ''),
    enabled: Boolean(deliverableId),
    staleTime: 15 * 1000,
    gcTime: 30 * 60 * 1000,
    // Realtime for `deliverable_feedback` isn't in the Live publication, so brand
    // feedback sent while the app is open never invalidates this query. Poll as the
    // fallback so a new thread/message surfaces without a manual pull-to-refresh,
    // and refetch when the screen/app regains focus.
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

// Unread feedback counts keyed by deliverableId — for the Projects-list badge.
export function useUnreadFeedbackCounts() {
  return useQuery({
    queryKey: ['feedback-unread'],
    queryFn: getUnreadFeedbackCounts,
    ...queryPerf,
    placeholderData: (previous) => previous,
    // Same realtime gap as the thread above — poll so the unread badge appears
    // even when no realtime event fires on Live.
    refetchInterval: 30 * 1000,
  })
}

export function useMarkFeedbackRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverable-feedback'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-unread'] })
    },
  })
}

export function useLatestSubmission(deliverableId?: string) {
  return useQuery({
    queryKey: ['latest-submission', deliverableId],
    queryFn: () => getLatestSubmission(deliverableId || ''),
    enabled: Boolean(deliverableId),
    // This drives VideoUploadRow's remount recovery, so it must reflect the true
    // current submission — not a stale snapshot. Without this it inherits the global
    // refetchOnMount:false and can re-offer the dropzone (duplicate upload) or adopt
    // a superseded row after the sheet is closed and reopened.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// refreshList (default true): invalidate the deliverables list so the UI re-buckets to
// the new 'live' stage — this is how LinkSubmitRow (review flow) surfaces success.
// The direct-delivery CombinedDeliveryRow passes false: it shows its OWN in-row "You're
// live" celebration and would be unmounted mid-animation if the list refresh flipped its
// parent's stage from 'deliver' to 'live'. It defers the refresh to closeSheet instead.
export function useSubmitLink(options?: { refreshList?: boolean }) {
  const queryClient = useQueryClient()
  const refreshList = options?.refreshList ?? true

  return useMutation({
    mutationFn: submitLink,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['latest-submission', variables.deliverableId] })
      if (refreshList) {
        queryClient.invalidateQueries({ queryKey: ['deliverables'] })
        queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
      }
    },
  })
}

export type VideoUploadStage = 'idle' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error'
export const SUBMISSION_TIMEOUT_MESSAGE = 'Processing is taking longer than expected. Please try uploading again.'

export function useUploadVideo() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<VideoUploadStage>('idle')
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (params: {
      deliverableId: string
      videoUri: string
      fileName?: string
      fileSize?: number
      mimeType?: string
      compressionOptions?: VideoCompressionOptions
    }) => {
      try {
        setStage('compressing')
        setCompressionProgress(0)
        setError(null)

        const { compressVideo } = await import('@/lib/video-compression')
        const compressed = await compressVideo(params.videoUri, params.compressionOptions, setCompressionProgress)

        setStage('uploading')
        const submission = await uploadVideo({
          deliverableId: params.deliverableId,
          fileUri: compressed.uri,
          // Use the compressor's reported mime/filename/size so the stored
          // Content-Type matches the actual bytes (mp4 when compressed, original
          // type on the passthrough/fallback path).
          fileName: compressed.fileName,
          fileSize: compressed.estimatedSize,
          // On the passthrough/fallback path the compressor can't sniff the type
          // and returns 'application/octet-stream' — prefer the picker's real
          // mime so Storage records a correct video Content-Type.
          mimeType:
            compressed.mime && compressed.mime !== 'application/octet-stream'
              ? compressed.mime
              : params.mimeType ?? compressed.mime,
        })

        setStage('processing')

        queryClient.invalidateQueries({ queryKey: ['deliverables'] })
        queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
        queryClient.invalidateQueries({ queryKey: ['latest-submission', params.deliverableId] })

        return submission
      } catch (uploadError: unknown) {
        setStage('error')
        setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
        throw uploadError
      }
    },
    [queryClient]
  )

  const markDone = useCallback(() => setStage('done'), [])
  const markFailed = useCallback((message?: string) => {
    setStage('error')
    setError(message || 'Upload failed')
  }, [])
  const reset = useCallback(() => {
    setStage('idle')
    setCompressionProgress(0)
    setError(null)
  }, [])

  return { upload, reset, markDone, markFailed, stage, compressionProgress, error }
}

export function useSubmissionStatus(submissionId?: string, options?: { pollInterval?: number; timeoutMs?: number }) {
  // Backstop: if the backend never moves the row off 'uploading'/'processing'
  // (e.g. the processor died silently), stop polling after timeoutMs instead of
  // spinning every few seconds forever and draining the battery.
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000
  const startRef = useRef(Date.now())
  const [isTimedOut, setIsTimedOut] = useState(false)
  useEffect(() => {
    startRef.current = Date.now()
    setIsTimedOut(false)
  }, [submissionId])

  const query = useQuery({
    queryKey: ['submission-status', submissionId],
    queryFn: () => getSubmissionById(submissionId || ''),
    enabled: Boolean(submissionId),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      if (status === 'submitted' || status === 'failed') return false
      if (Date.now() - startRef.current > timeoutMs) {
        // Poller is giving up while the row is still 'uploading'/'processing'
        // (processor likely died silently). Surface a terminal flag so the UI
        // can drop the infinite spinner and offer a retry.
        setIsTimedOut(true)
        return false
      }
      return options?.pollInterval ?? 3000
    },
  })

  // Mark as timed out if we stopped polling while still mid-processing — covers
  // the case where the query is idle (no further refetchInterval calls fire).
  const stillProcessing = query.data?.status !== 'submitted' && query.data?.status !== 'failed'
  const timedOut = isTimedOut && Boolean(submissionId) && stillProcessing

  return { ...query, isTimedOut: timedOut }
}
