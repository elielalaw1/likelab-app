import { ReactNode } from 'react'
import { View } from 'react-native'
import { GlassCard } from '@/features/shared/ui/GlassCard'

type Props = {
  children: ReactNode
}

export function AuthCard({ children }: Props) {
  return (
    <GlassCard radius={20}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}>
        {children}
      </View>
    </GlassCard>
  )
}
