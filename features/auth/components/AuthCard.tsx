import { ReactNode } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { authColors } from '@/features/auth/theme'

type Props = {
  children: ReactNode
}

export function AuthCard({ children }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: authColors.border,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.84)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.72)' }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -30,
            right: -10,
            width: 120,
            height: 120,
            borderRadius: 999,
            backgroundColor: 'rgba(197,202,255,0.34)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -40,
            left: -8,
            width: 132,
            height: 132,
            borderRadius: 999,
            backgroundColor: 'rgba(233,85,215,0.08)',
          }}
        />
        <View style={{ gap: 10 }}>{children}</View>
      </View>
    </View>
  )
}
