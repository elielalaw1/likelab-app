import { useState } from 'react'
import { Pressable, Text, View, Alert } from 'react-native'
import { Redirect, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { LogoMark } from '@/features/auth/components/LogoMark'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { authColors } from '@/features/auth/theme'

export default function LoginPage() {
  const { session, loading: sessionLoading } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (!sessionLoading && session) {
    return <Redirect href="/(tabs)/overview" />
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        Alert.alert('Sign in failed', 'Check your credentials and try again.')
        return
      }

      router.replace('/(tabs)/overview')
    } catch {
      Alert.alert('Error', 'Something went wrong during sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Type your email first to reset password.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'likelabapp://reset-password',
    })

    if (error) {
      Alert.alert('Could not send reset email', error.message)
      return
    }

    Alert.alert('Reset email sent', 'Check your inbox for password reset instructions.')
  }

  return (
    <AuthLayout>
      <LogoMark />

      <Text style={{ textAlign: 'center', fontSize: 22, lineHeight: 30, fontWeight: '800', color: authColors.text }}>
        Sign in to Likelab
      </Text>

      <AuthCard>
        <AuthInput
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />

        <AuthInput
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        <Pressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end' }}>
          <Text style={{ color: authColors.muted, fontSize: 14, fontWeight: '500' }}>Forgot password?</Text>
        </Pressable>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: authColors.buttonBg,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: authColors.accentSoft,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
            marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: authColors.text }}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>
      </AuthCard>

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: authColors.muted, fontSize: 16 }}>{"Don't have an account?"}</Text>
        <Pressable onPress={() => router.push('/signup')}>
          <Text style={{ color: authColors.text, fontSize: 16, fontWeight: '700' }}>Sign up</Text>
        </Pressable>
      </View>
    </AuthLayout>
  )
}
