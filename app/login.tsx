import { useState } from 'react'
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { designBackground, designWordmark } from '@/design/assets'

export default function LoginPage() {
  const { session, loading: sessionLoading } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (!sessionLoading && session) {
    return <Redirect href="/(tabs)/overview" />
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) {
        Alert.alert('Sign in failed', error.message)
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <ImageBackground
        source={designBackground}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', paddingHorizontal: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Image
            source={designWordmark}
            style={{ width: 320, height: 48 }}
            resizeMode="contain"
          />
        </View>

        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderWidth: 1,
            borderColor: '#D7DFEE',
            borderRadius: 18,
            paddingHorizontal: 18,
            paddingVertical: 24,
            gap: 14,
          }}
        >
          <Text style={{ color: '#687C9E', fontSize: 14, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 20 }}>
            Sign in to your LikeLab creator account
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#9BABC7"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={{
              borderWidth: 1,
              borderColor: '#D7DFEE',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 15,
              fontFamily: 'Montserrat',
              color: '#101525',
              backgroundColor: '#FAFBFF',
            }}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#9BABC7"
            secureTextEntry
            autoComplete="password"
            style={{
              borderWidth: 1,
              borderColor: '#D7DFEE',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 15,
              fontFamily: 'Montserrat',
              color: '#101525',
              backgroundColor: '#FAFBFF',
            }}
          />

          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text style={{ color: '#687C9E', fontSize: 12, fontFamily: 'Montserrat', textAlign: 'right' }}>
              Forgot password?
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={{
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: '#C9D2FF',
              overflow: 'hidden',
              opacity: loading ? 0.72 : 1,
            }}
          >
            <LinearGradient
              colors={['rgba(240,236,255,0.92)', 'rgba(236,243,255,0.92)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 15 }}
            >
              <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={{ color: '#6C7E9E', fontSize: 11, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 17 }}>
            {'By continuing, you agree to our '}
            <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Terms of Service</Text>
            {' and '}
            <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Privacy Policy</Text>
            .
          </Text>
        </View>

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#6C7E9E', fontSize: 15, fontFamily: 'Montserrat' }}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>Sign up</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}
