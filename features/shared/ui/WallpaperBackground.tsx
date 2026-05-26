import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const BASE = '#EFEBF7'
const TINT = 'rgba(58,31,122,0.10)'
const CLEAR = 'rgba(96,64,160,0)'

export function WallpaperBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: BASE }}>
      {/* Top-left vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={[TINT, CLEAR]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.55, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { width: '70%', height: '55%' }]}
      />
      {/* Top-right vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={[TINT, CLEAR]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.45, y: 0.55 }}
        style={{ position: 'absolute', top: 0, right: 0, width: '70%', height: '55%' }}
      />
      {/* Bottom-left vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={[TINT, CLEAR]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.55, y: 0.45 }}
        style={{ position: 'absolute', bottom: 0, left: 0, width: '70%', height: '55%' }}
      />
      {/* Bottom-right vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={[TINT, CLEAR]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.45, y: 0.45 }}
        style={{ position: 'absolute', bottom: 0, right: 0, width: '70%', height: '55%' }}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
