import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { LogoMark } from '@/features/auth/components/LogoMark'
import { authColors } from '@/features/auth/theme'

export default function CheckEmailPage() {
  return (
    <AuthLayout>
      <LogoMark />
      <Text style={{ textAlign: 'center', fontSize: 34, lineHeight: 38, fontWeight: '800', color: authColors.text }}>
        Check your email
      </Text>

      <AuthCard>
        <Text style={{ color: authColors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
          We sent a confirmation link to your inbox. Confirm your email, then sign in.
        </Text>

        <Pressable
          onPress={() => router.replace('/login')}
          style={{
            backgroundColor: authColors.buttonBg,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: authColors.accentSoft,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: authColors.text }}>Back to sign in</Text>
        </Pressable>
      </AuthCard>

      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: authColors.muted, fontSize: 14 }}>Did not receive email? Try again from signup.</Text>
      </View>
    </AuthLayout>
  )
}
