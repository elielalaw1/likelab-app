import Constants from 'expo-constants'

export type VideoCompressionOptions = {
  quality?: 'low' | 'medium' | 'high'
}

export type CompressionResult = {
  uri: string
  fileName: string
  estimatedSize: number
  mime: string
}

/** Best-effort mime from a file URI's extension (used on the passthrough path). */
function mimeFromUri(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'mov':
      return 'video/quicktime'
    case 'mp4':
      return 'video/mp4'
    default:
      return 'application/octet-stream'
  }
}

type VideoCompressor = {
  compress: (
    uri: string,
    options: Record<string, unknown>,
    onProgress?: (progress: number) => void
  ) => Promise<string>
}

// react-native-compressor is a native module — it is absent in Expo Go and
// until the dev client is rebuilt (`npx expo run:ios`). Resolve it lazily and
// defensively so a missing native link degrades to an uncompressed upload
// instead of crashing the whole upload flow at import time.
function getVideoCompressor(): VideoCompressor | null {
  // Expo Go ('storeClient') can't load native modules — don't even require it
  // there, or RN/Metro surfaces a red "not linked" error despite the try/catch.
  if (Constants.executionEnvironment === 'storeClient') return null

  try {
    return require('react-native-compressor').Video as VideoCompressor
  } catch {
    return null
  }
}

// Maps a quality tier to a longest-edge cap + target bitrate. 'medium' = ~720p,
// which keeps uploads light without visibly hurting short-form vertical video.
const QUALITY_PRESETS: Record<NonNullable<VideoCompressionOptions['quality']>, { maxSize: number; bitrate: number }> = {
  low: { maxSize: 640, bitrate: 1_200_000 },
  medium: { maxSize: 1280, bitrate: 2_500_000 },
  high: { maxSize: 1920, bitrate: 5_000_000 },
}

async function estimateFileSize(uri: string) {
  try {
    if (uri.startsWith('file://')) {
      // SDK 54 File API — accurate local size (HEAD on file:// has no content-length).
      const { File } = await import('expo-file-system')
      return new File(uri).size ?? 0
    }
    const res = await fetch(uri, { method: 'HEAD' })
    return parseInt(res.headers.get('content-length') ?? '0', 10)
  } catch {
    return 0
  }
}

function passthrough(sourceUri: string, onProgress?: (progress: number) => void) {
  onProgress?.(1)
  return estimateFileSize(sourceUri).then((estimatedSize) => ({
    uri: sourceUri,
    fileName: sourceUri.split('/').pop() || `video_${Date.now()}.mp4`,
    estimatedSize,
    mime: mimeFromUri(sourceUri),
  }))
}

/**
 * Transcodes/downscales a picked video before upload so it doesn't bloat
 * storage. Reports 0..1 progress via onProgress. Falls back to the original
 * file if the native compressor is unavailable or throws — an upload beats a
 * hard failure.
 */
export async function compressVideo(
  sourceUri: string,
  options: VideoCompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const Video = getVideoCompressor()
  if (!Video) {
    // Native module not linked (Expo Go / pre-rebuild) — upload as-is.
    return passthrough(sourceUri, onProgress)
  }

  const preset = QUALITY_PRESETS[options.quality ?? 'medium']

  try {
    const compressedUri = await Video.compress(
      sourceUri,
      {
        compressionMethod: 'manual',
        maxSize: preset.maxSize,
        bitrate: preset.bitrate,
      },
      (progress) => onProgress?.(progress)
    )

    onProgress?.(1)
    return {
      uri: compressedUri,
      fileName: compressedUri.split('/').pop() || `video_${Date.now()}.mp4`,
      estimatedSize: await estimateFileSize(compressedUri),
      mime: 'video/mp4',
    }
  } catch {
    return passthrough(sourceUri, onProgress)
  }
}
