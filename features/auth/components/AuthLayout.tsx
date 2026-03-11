import { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authColors } from '@/features/auth/theme'

type Props = {
  children: ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: authColors.bg }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 28,
          }}
        >
          <View style={{ gap: 20 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
