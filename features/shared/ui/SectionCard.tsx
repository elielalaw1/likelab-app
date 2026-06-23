import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { redesign, typography } from '@/features/core/theme'

type Props = {
  title?: string
  children: ReactNode
}

export function SectionCard({ title, children }: Props) {
  return (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        padding: 14,
        gap: 10,
        ...redesign.shadow.card,
      }}
    >
      {title ? (
        <Text
          style={{
            color: redesign.color.faint,
            fontFamily: typography.fontFamily,
            fontWeight: '800',
            fontSize: 10,
            letterSpacing: 1.2,
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
