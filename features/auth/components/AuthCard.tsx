import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { redesign } from '@/features/core/theme'

type Props = {
  children: ReactNode
}

export function AuthCard({ children }: Props) {
  return (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: 22,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        paddingHorizontal: 16,
        paddingVertical: 18,
        gap: 12,
        ...redesign.shadow.card,
      }}
    >
      {children}
    </View>
  )
}
