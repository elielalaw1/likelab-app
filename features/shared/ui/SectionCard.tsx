import { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors, glass, radii, shadows, spacing, typography } from '@/features/core/theme'

type Props = {
  title?: string
  children: ReactNode
}

export function SectionCard({ title, children }: Props) {
  return (
    <View
      style={{
        backgroundColor: glass.surface,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: glass.borderSoft,
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
