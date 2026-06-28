import * as ImagePicker from 'expo-image-picker'

export type PickedVideo = {
  uri: string
  fileName: string
  fileSize?: number
  duration?: number
  width?: number
  height?: number
  mimeType: string
}

// Thrown when the user has not granted photo-library access. Carries canAskAgain
// so the caller can route a permanently-denied user to Settings instead of
// showing a dead-end "Upload failed".
export class MediaPermissionError extends Error {
  canAskAgain: boolean
  constructor(canAskAgain: boolean) {
    super('Media library permission is required to select videos.')
    this.name = 'MediaPermissionError'
    this.canAskAgain = canAskAgain
  }
}

export async function pickVideoFromLibrary(): Promise<PickedVideo | null> {
  const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    throw new MediaPermissionError(canAskAgain)
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    quality: 1,
    videoMaxDuration: 300,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets?.[0]) return null

  const asset = result.assets[0]
  return {
    uri: asset.uri,
    fileName: asset.fileName || `video_${Date.now()}.mp4`,
    fileSize: asset.fileSize ?? undefined,
    duration: asset.duration ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    mimeType: asset.mimeType || 'video/mp4',
  }
}
