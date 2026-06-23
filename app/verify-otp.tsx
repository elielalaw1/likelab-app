import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/lib/supabase'
import { consumePendingAuth } from '@/lib/pending-auth'
import { updateCreatorProfile } from '@/features/profile/api'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export default function VerifyOtpPage() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const pendingRef = useRef(consumePendingAuth())
  const passwordRef = useRef(pendingRef.current?.password ?? null)
  const phoneRef = useRef(pendingRef.current?.phone ?? null)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [resendCooldown])

  const code = digits.join('')

  const handleDigitChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)

    if (digit && index < CODE_LENGTH - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0)
    }
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ''
      setDigits(next)
      setTimeout(() => inputRefs.current[index - 1]?.focus(), 0)
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
      if (passwordRef.current) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email ?? '',
          password: passwordRef.current,
        })
        if (signInError) {
          router.replace('/login')
          return
        }
        const pending = pendingRef.current
        const profileUpdate: Record<string, unknown> = {}
        if (pending?.phone) profileUpdate.phone = pending.phone
        if (pending?.gender) profileUpdate.gender = pending.gender
        if (pending?.age) profileUpdate.ageRange = pending.age
        if (pending?.country) profileUpdate.country = pending.country
        if (pending?.primaryCategory) profileUpdate.primaryCategory = pending.primaryCategory
        if (pending?.address) profileUpdate.address = pending.address
        if (pending?.postalCode) profileUpdate.postalCode = pending.postalCode
        if (pending?.county) profileUpdate.county = pending.county
        if (pending?.city) profileUpdate.city = pending.city
        if (Object.keys(profileUpdate).length > 0) {
          await updateCreatorProfile(profileUpdate as Parameters<typeof updateCreatorProfile>[0]).catch(() => null)
        }
      }
      router.replace('/connect-tiktok')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
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
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      Alert.alert('Code sent', 'A new code has been sent to your email.')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(124,63,242,0.10)', 'rgba(31,200,232,0.05)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, width: 360, height: 360 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}
        >
          <View
            style={{
              backgroundColor: redesign.color.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: redesign.color.hairlineStrong,
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 28,
              gap: 20,
              ...redesign.shadow.card,
            }}
          >
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                Verify your email
              </Text>
              <Text style={{ fontSize: 14, color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center', lineHeight: 20 }}>
                {'We sent a 6-digit code to\n'}
                <Text style={{ color: redesign.color.ink, fontWeight: '700' }}>{email}</Text>
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
                    borderRadius: 14,
                    borderWidth: digits[i] ? 1.5 : StyleSheet.hairlineWidth,
                    borderColor: error ? '#E11D48' : digits[i] ? redesign.color.purple : redesign.color.hairlineStrong,
                    backgroundColor: redesign.color.bg,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: '700',
                    color: redesign.color.ink,
                    fontFamily: typography.fontFamily,
                  }}
                />
              ))}
            </View>

            {error ? (
              <Text style={{ color: '#E11D48', fontSize: 13, fontFamily: typography.fontFamily, textAlign: 'center', fontWeight: '600' }}>
                {error}
              </Text>
            ) : null}

            {/* Verify button */}
            <LiquidButton
              label={verifying ? 'Verifying…' : 'Verify email'}
              onPress={verifying || resending ? undefined : handleVerify}
              disabled={verifying || resending}
              minHeight={52}
            />

            {/* Resend */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              <Text style={{ color: redesign.color.muted, fontSize: 14, fontFamily: typography.fontFamily }}>
                Didn&apos;t receive it?
              </Text>
              <Pressable onPress={handleResend} disabled={resending || verifying || resendCooldown > 0} hitSlop={6}>
                <Text style={{ color: redesign.color.purple, fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily, opacity: (resending || resendCooldown > 0) ? 0.5 : 1 }}>
                  {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
