import { ReactNode } from 'react'
import { View } from 'react-native'

export function WallpaperBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#EFEBF7' }}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
