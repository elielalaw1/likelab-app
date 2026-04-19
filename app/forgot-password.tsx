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
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { designBackground, designWordmark } from '@/design/assets'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Please enter your email address.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://likelab.io/reset-password',
      })

      if (error) {
        Alert.alert('Error', error.message)
        return
      }

      setSent(true)
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
                {sent ? (
                  <View style={{ gap: 20 }}>
                    <Text style={{ color: '#101525', fontSize: 17, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 24 }}>
                      We sent a reset link to {email}. Open it on this phone to set a new password.
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

                    <Pressable
                      onPress={handleSend}
                      disabled={loading}
                      style={{
                        borderRadius: 20,
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
                        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 18 }}
                      >
                        <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>{loading ? 'Sending...' : 'Send reset link'}</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Pressable onPress={() => router.back()}>
                  <Text style={{ color: '#6C7E9E', fontSize: 15, fontFamily: 'Montserrat' }}>Back to sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
