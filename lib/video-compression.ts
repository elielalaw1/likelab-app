export type VideoCompressionOptions = {
  quality?: 'low' | 'medium' | 'high'
}

export type CompressionResult = {
  uri: string
  fileName: string
  estimatedSize: number
}

async function estimateFileSize(uri: string) {
  try {
    const response = await fetch(uri, { method: 'HEAD' })
    const length = response.headers.get('content-length')
    return length ? parseInt(length, 10) : 0
  } catch {
    return 0
  }
}

export async function compressVideo(
  sourceUri: string,
  _options: VideoCompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  onProgress?.(0.2)
  const estimatedSize = await estimateFileSize(sourceUri)
  onProgress?.(1)

  return {
    uri: sourceUri,
    fileName: sourceUri.split('/').pop() || `video_${Date.now()}.mp4`,
    estimatedSize,
  }
}
