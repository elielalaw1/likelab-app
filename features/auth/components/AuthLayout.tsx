import { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { authColors } from '@/features/auth/theme'

type Props = {
  children: ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: authColors.bg }}>
      <View style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#FFFFFF', '#F7F8FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            top: -72,
            left: -80,
            borderRadius: 999,
            backgroundColor: 'rgba(233,85,215,0.12)',
            shadowColor: '#E955D7',
            shadowOpacity: 0.24,
            shadowRadius: 42,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 340,
            height: 340,
            top: 60,
            right: -120,
            borderRadius: 999,
            backgroundColor: 'rgba(46,227,241,0.12)',
            shadowColor: '#2EE3F1',
            shadowOpacity: 0.26,
            shadowRadius: 52,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            bottom: -90,
            left: 20,
            borderRadius: 999,
            backgroundColor: 'rgba(53,27,169,0.12)',
            shadowColor: '#351BA9',
            shadowOpacity: 0.22,
            shadowRadius: 58,
          }}
        />
      </View>
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
