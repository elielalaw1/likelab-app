import { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors, palette, radii, shadows, spacing, typography } from '@/features/core/theme'

type Props = {
  title?: string
  children: ReactNode
}

export function SectionCard({ title, children }: Props) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.5)',
        padding: spacing.card,
        gap: spacing.md,
        ...shadows.card,
      }}
    >
      {title ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: typography.fontFamily,
            fontWeight: '600',
            fontSize: typography.sizes.sectionHeader,
            letterSpacing: 0.88,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}
