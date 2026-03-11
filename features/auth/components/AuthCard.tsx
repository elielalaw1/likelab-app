import { ReactNode } from 'react'
import { View } from 'react-native'
import { authColors } from '@/features/auth/theme'

type Props = {
  children: ReactNode
}

export function AuthCard({ children }: Props) {
  return (
    <View
      style={{
        backgroundColor: authColors.card,
        borderWidth: 1,
        borderColor: authColors.border,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      {children}
    </View>
  )
}
