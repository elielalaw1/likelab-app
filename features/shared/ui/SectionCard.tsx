import { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { radii, shadows, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

type Props = {
  title?: string
  children: ReactNode
}

export function SectionCard({ title, children }: Props) {
  const { palette, colors } = useTheme()
  return (
    <View
      style={{
        backgroundColor: palette.cardBg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: palette.borderColor,
        padding: spacing.card,
        gap: spacing.md,
        ...shadows.card,
      }}
    >
      {title ? (
        <Text
          style={{
            color: palette.textMuted,
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
