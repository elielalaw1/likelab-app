import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { getDeliverables, getLatestSubmission, getSubmissionById, submitDeliverableUrl, submitLink, uploadVideo } from '@/features/deliverables/api'
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

export function useSubmitDeliverable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitDeliverableUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
    },
  })
}

export function useLatestSubmission(deliverableId?: string) {
  return useQuery({
    queryKey: ['latest-submission', deliverableId],
    queryFn: () => getLatestSubmission(deliverableId || ''),
    enabled: Boolean(deliverableId),
    staleTime: 2 * 60 * 1000,
  })
}

export function useSubmitLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitLink,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
      queryClient.invalidateQueries({ queryKey: ['latest-submission', variables.deliverableId] })
    },
  })
}

export type VideoUploadStage = 'idle' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error'

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
          fileName: params.fileName || compressed.fileName,
          fileSize: params.fileSize ?? compressed.estimatedSize,
          mimeType: params.mimeType || 'video/mp4',
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

export function useSubmissionStatus(submissionId?: string, options?: { pollInterval?: number }) {
  return useQuery({
    queryKey: ['submission-status', submissionId],
    queryFn: () => getSubmissionById(submissionId || ''),
    enabled: Boolean(submissionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'submitted' || status === 'failed') return false
      return options?.pollInterval ?? 3000
    },
  })
}
