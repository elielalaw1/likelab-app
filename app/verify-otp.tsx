import { useRef, useState } from 'react'
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { designBackground } from '@/design/assets'

const CODE_LENGTH = 6

export default function VerifyOtpPage() {
  const { email, password } = useLocalSearchParams<{ email: string; password: string }>()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(TextInput | null)[]>([])

  const code = digits.join('')

  const handleDigitChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ''
      setDigits(next)
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (code.length < CODE_LENGTH) {
      setError('Enter all 6 digits.')
      return
    }
    try {
      setVerifying(true)
      setError(null)
      const { data, error: fnError } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, code },
      })
      if (fnError || !data?.success) {
        setError(data?.error ?? 'Invalid or expired code.')
        return
      }
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email ?? '',
          password,
        })
        if (signInError) {
          router.replace('/login')
          return
        }
      }
      router.replace('/(tabs)/overview')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    try {
      setResending(true)
      setError(null)
      const { data, error: fnError } = await supabase.functions.invoke('resend-verification', {
        body: { email },
      })
      if (fnError || !data?.success) {
        setError(data?.error ?? 'Could not resend code.')
        return
      }
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
      Alert.alert('Code sent', 'A new code has been sent to your email.')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
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

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderWidth: 1,
              borderColor: '#D7DFEE',
              borderRadius: 18,
              paddingHorizontal: 18,
              paddingVertical: 28,
              gap: 20,
            }}
          >
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#060B1F', fontFamily: 'Montserrat', textAlign: 'center' }}>
                Verify your email
              </Text>
              <Text style={{ fontSize: 14, color: '#687C9E', fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 20 }}>
                {'We sent a 6-digit code to\n'}
                <Text style={{ color: '#101525', fontWeight: '600' }}>{email}</Text>
              </Text>
            </View>

            {/* OTP boxes */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              {Array(CODE_LENGTH).fill(null).map((_, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { inputRefs.current[i] = ref }}
                  value={digits[i]}
                  onChangeText={(v) => handleDigitChange(v, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={{
                    width: 44,
                    height: 54,
                    borderRadius: 12,
                    borderWidth: digits[i] ? 1.5 : 1,
                    borderColor: error ? '#E57373' : digits[i] ? '#C9D2FF' : '#D7DFEE',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: '700',
                    color: '#101525',
                    fontFamily: 'Montserrat',
                  }}
                />
              ))}
            </View>

            {error ? (
              <Text style={{ color: '#E57373', fontSize: 13, fontFamily: 'Montserrat', textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            {/* Verify button */}
            <Pressable
              onPress={handleVerify}
              disabled={verifying || resending}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#C9D2FF',
                overflow: 'hidden',
                opacity: verifying ? 0.72 : 1,
              }}
            >
              <LinearGradient
                colors={['rgba(240,236,255,0.92)', 'rgba(236,243,255,0.92)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 15 }}
              >
                <Text style={{ color: '#101525', fontSize: 15, fontWeight: '700', fontFamily: 'Montserrat' }}>
                  {verifying ? 'Verifying...' : 'Verify email'}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Resend */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              <Text style={{ color: '#6C7E9E', fontSize: 14, fontFamily: 'Montserrat' }}>
                Didn&apos;t receive it?
              </Text>
              <Pressable onPress={handleResend} disabled={resending || verifying}>
                <Text style={{ color: '#101525', fontSize: 14, fontWeight: '700', fontFamily: 'Montserrat', opacity: resending ? 0.5 : 1 }}>
                  {resending ? 'Sending...' : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
