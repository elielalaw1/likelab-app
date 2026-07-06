import { Image as ExpoImage } from 'expo-image'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

const loadingMark = require('@/assets/likelabloading.webp')
const VIDEO_SIZE = 54

// The open height reserves the video plus a little breathing room below it before the
// page content begins.
export const REFRESH_OPEN_HEIGHT = VIDEO_SIZE + 16

// A collapsible pull-to-refresh header. It lives at the very top of the scroll content
// (just under the navbar): pulling to refresh expands it — the branded loading video
// appears ~10px under the navbar and pushes the page down — and it collapses back to zero
// height the moment loading completes. `progress` is 0 (closed) → 1 (fully open).
export function RefreshHeader({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    height: progress.value * REFRESH_OPEN_HEIGHT,
    opacity: progress.value,
  }))
  return (
    <Animated.View pointerEvents="none" style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start' }, style]}>
      <ExpoImage source={loadingMark} style={{ width: VIDEO_SIZE, height: VIDEO_SIZE }} contentFit="contain" />
    </Animated.View>
  )
}
