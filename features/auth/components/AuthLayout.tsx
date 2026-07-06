import { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { redesign } from '@/features/core/theme'

type Props = {
  children: ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: redesign.color.bg }}>
      {/* Single restrained holographic glow, top-right — accent only */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(99,80,184,0.08)', 'rgba(99,80,184,0.02)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, width: 360, height: 360 }}
      />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: 36,
            paddingBottom: 36,
          }}
        >
          <View style={{ gap: 20 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
