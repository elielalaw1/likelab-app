import { useEffect, useState } from 'react'
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
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { designBackground, designWordmark } from '@/design/assets'

function parseHashParams(url: string): Record<string, string> {
  const hash = url.includes('#') ? url.split('#')[1] : ''
  const params: Record<string, string> = {}
  for (const part of hash.split('&')) {
    const [key, value] = part.split('=')
    if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return params
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    async function initSession(url: string) {
      const params = parseHashParams(url)
      if (params.type !== 'recovery' || !params.access_token || !params.refresh_token) {
        setInvalid(true)
        return
      }
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      })
      if (error) {
        setInvalid(true)
      } else {
        setReady(true)
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) initSession(url)
      else setInvalid(true)
    })

    const sub = Linking.addEventListener('url', ({ url }) => initSession(url))
    return () => sub.remove()
  }, [])

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('No match', 'Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        Alert.alert('Error', error.message)
        return
      }
      await supabase.auth.signOut({ scope: 'local' })
      router.replace('/login')
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
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 }} keyboardShouldPersistTaps="handled">
            <View style={{ flex: 1, justifyContent: 'center', paddingTop: 52, paddingBottom: 40 }}>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Image
                  source={designWordmark}
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
                {invalid ? (
                  <View style={{ gap: 20 }}>
                    <Text style={{ color: '#101525', fontSize: 17, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 24 }}>
                      This reset link has expired or is invalid. Request a new one from the login screen.
                    </Text>
                    <Pressable
                      onPress={() => router.replace('/login')}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: '#C9D2FF',
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={['rgba(240,236,255,0.92)', 'rgba(236,243,255,0.92)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }}
                      >
                        <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>Back to sign in</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 26 }}>
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: '#687C9E', fontSize: 12, fontWeight: '700', letterSpacing: 1, fontFamily: 'Montserrat' }}>NEW PASSWORD</Text>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Min. 8 characters"
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

                    <View style={{ gap: 10 }}>
                      <Text style={{ color: '#687C9E', fontSize: 12, fontWeight: '700', letterSpacing: 1, fontFamily: 'Montserrat' }}>CONFIRM PASSWORD</Text>
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat password"
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

                    <Pressable
                      onPress={handleSubmit}
                      disabled={loading || !ready}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: '#C9D2FF',
                        overflow: 'hidden',
                        opacity: loading || !ready ? 0.72 : 1,
                      }}
                    >
                      <LinearGradient
                        colors={['rgba(240,236,255,0.92)', 'rgba(236,243,255,0.92)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }}
                      >
                        <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>{loading ? 'Saving...' : 'Set new password'}</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
