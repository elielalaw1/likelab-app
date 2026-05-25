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
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.13,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          { borderRadius: radius },
          strong ? styles.innerStrong : styles.innerDefault,
        ]}
      >
        {children}
      </View>
    </BlurView>
  )
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,1)',
  },
  innerDefault: { backgroundColor: 'rgba(255,255,255,0.82)' },
  innerStrong: { backgroundColor: 'rgba(255,255,255,0.90)' },
})
