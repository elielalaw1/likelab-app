import { ReactNode } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  intensity?: number
  strong?: boolean
  radius?: number
}

export function GlassCard({ children, style, intensity = 28, strong = false, radius = 18 }: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="light"
      style={[styles.blur, { borderRadius: radius }, strong ? styles.shadowStrong : styles.shadow, style]}
    >
      <View
        style={[
          styles.inner,
          { borderRadius: radius },
          strong ? styles.innerStrong : null,
        ]}
      >
        {children}
      </View>
    </BlurView>
  )
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,1)',
    borderWidth: 0.5,
    borderColor: 'rgba(28,28,30,0.06)',
  },
  innerStrong: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  shadow: {
    shadowColor: '#3A1F7A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 16,
  },
  shadowStrong: {
    shadowColor: '#2E1568',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 44,
    elevation: 22,
  },
})
