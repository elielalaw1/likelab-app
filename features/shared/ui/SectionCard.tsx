import { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { spacing, typography } from '@/features/core/theme'
import { GlassCard } from '@/features/shared/ui/GlassCard'

type Props = {
  title?: string
  children: ReactNode
}

export function SectionCard({ title, children }: Props) {
  return (
    <GlassCard>
      <View style={{ padding: spacing.card, gap: spacing.md }}>
        {title ? (
          <Text
            style={{
              color: 'rgba(28,28,30,0.35)',
              fontFamily: typography.fontFamily,
              fontWeight: '700',
              fontSize: 9,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </GlassCard>
  )
}
