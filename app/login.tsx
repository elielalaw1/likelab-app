import { useState } from 'react'
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

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
        Alert.alert('Sign in failed', error.message)
        return
      }

      router.replace('/(tabs)/overview')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong during sign in.'
      Alert.alert('Error', message)
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
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <ImageBackground
        source={require('../design/Design2/Screenshot 2026-03-18 at 21.40.46.png')}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        resizeMode="cover"
      />
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 52, paddingBottom: 40 }}>
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <Image
                source={require('../design/Design2/Screenshot_2026-03-18_at_21.49.51-removebg-preview.png')}
                style={{ width: 360, height: 56 }}
                resizeMode="contain"
              />
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderWidth: 1,
                borderColor: '#D7DFEE',
                borderRadius: 18,
                paddingHorizontal: 20,
                paddingVertical: 22,
              }}
            >
              <View style={{ gap: 26 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#687C9E', fontSize: 12, fontWeight: '700', letterSpacing: 1, fontFamily: 'Montserrat' }}>EMAIL</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#6C7E9E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      borderWidth: 1,
                      borderColor: '#D7DFEE',
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      color: '#6C7E9E',
                      fontSize: 18,
                      paddingHorizontal: 18,
                      paddingVertical: 16,
                      fontFamily: 'Montserrat',
                    }}
                  />
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#687C9E', fontSize: 12, fontWeight: '700', letterSpacing: 1, fontFamily: 'Montserrat' }}>PASSWORD</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    placeholderTextColor="#6C7E9E"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      borderWidth: 1,
                      borderColor: '#D7DFEE',
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      color: '#6C7E9E',
                      fontSize: 18,
                      paddingHorizontal: 18,
                      paddingVertical: 16,
                    }}
                  />
                </View>

                <Pressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                  <Text style={{ color: '#6C7E9E', fontSize: 15, fontFamily: 'Montserrat' }}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#C9D2FF',
                    overflow: 'hidden',
                    opacity: loading ? 0.72 : 1,
                    marginTop: 2,
                  }}
                >
                  <LinearGradient
                    colors={['rgba(240,236,255,0.92)', 'rgba(236,243,255,0.92)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }}
                  >
                    <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>{loading ? 'Signing in...' : 'Sign in'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#6C7E9E', fontSize: 17, fontFamily: 'Montserrat' }}>Don&apos;t have an account?</Text>
              <Pressable onPress={() => router.push('/signup')}>
                <Text style={{ color: '#101525', fontSize: 17, fontWeight: '700', fontFamily: 'Montserrat' }}>Sign up</Text>
              </Pressable>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
