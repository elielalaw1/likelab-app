import { useEffect, useRef, useState } from 'react'
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { assertCreatorRole, NON_CREATOR_MESSAGE } from '@/lib/assert-creator-role'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { designBackground, designWordmark } from '@/design/assets'
import { haptic } from '@/features/shared/haptics'
import { friendlyAuthError } from '@/features/auth/authErrors'
import { toast } from '@/features/shared/ui/Toast'

export default function LoginPage() {
  const { session, loading: sessionLoading } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [roleVerified, setRoleVerified] = useState(false)
  const [loginCooldown, setLoginCooldown] = useState(0)
  const failureCountRef = useRef(0)

  useEffect(() => {
    if (loginCooldown <= 0) return
    const id = setTimeout(() => setLoginCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [loginCooldown])

  // Hold back the redirect until the signed-in user is confirmed to be a creator.
  // Redirecting on `session` alone races the awaited assertCreatorRole() below and
  // would briefly land a non-creator (brand) account inside the creator-only tabs.
  if (!sessionLoading && session && roleVerified) {
    return <Redirect href="/(tabs)/overview" />
  }

  const handleLogin = async () => {
    if (loginCooldown > 0) return
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.')
      return
    }
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) {
        failureCountRef.current += 1
        // Only start throttling after a few failures, so an honest typo retries instantly.
        if (failureCountRef.current >= 3) {
          const delay = Math.min(3 * Math.pow(2, failureCountRef.current - 3), 30)
          setLoginCooldown(Math.round(delay))
        }
        toast.error(friendlyAuthError(error))
        return
      }
      failureCountRef.current = 0
      if (data.user) {
        const isCreator = await assertCreatorRole(data.user.id)
        if (!isCreator) {
          toast.error(NON_CREATOR_MESSAGE)
          return
        }
        // Only now allow the <Redirect> to fire — role is confirmed creator.
        setRoleVerified(true)
      }
    } catch (error) {
      toast.error(friendlyAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || loginCooldown > 0

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      {/* Signature backdrop image (shared with forgot/reset-password) + soft veil */}
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
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 }}>
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <Image source={designWordmark} style={{ width: 240, height: 40 }} resizeMode="contain" />
            </View>

            <View
              style={{
                backgroundColor: redesign.color.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: redesign.color.hairlineStrong,
                borderRadius: 24,
                paddingHorizontal: 18,
                paddingVertical: 22,
                gap: 14,
                ...redesign.shadow.card,
              }}
            >
              <View style={{ gap: 4, marginBottom: 2 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                  Welcome back
                </Text>
                <Text style={{ color: redesign.color.muted, fontSize: 13.5, fontWeight: '500', fontFamily: typography.fontFamily, textAlign: 'center' }}>
                  Sign in to your creator account
                </Text>
              </View>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={redesign.color.faint}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={{
                  height: 52,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: redesign.color.hairlineStrong,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  fontSize: 16,
                  fontFamily: typography.fontFamily,
                  color: redesign.color.ink,
                  backgroundColor: redesign.color.bg,
                }}
              />

              <View
                style={{
                  height: 52,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: redesign.color.hairlineStrong,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  backgroundColor: redesign.color.bg,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={redesign.color.faint}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  style={{ flex: 1, fontSize: 16, color: redesign.color.ink, fontFamily: showPassword ? typography.fontFamily : undefined }}
                />
                <Pressable onPress={() => { haptic.selection(); setShowPassword((v) => !v) }} hitSlop={8}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={redesign.color.muted} />
                </Pressable>
              </View>

              <Pressable onPress={() => { haptic.selection(); router.push('/forgot-password') }} hitSlop={6}>
                <Text style={{ color: redesign.color.purple, fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily, textAlign: 'right' }}>
                  Forgot password?
                </Text>
              </Pressable>

              <LiquidButton
                label={loading ? 'Signing in…' : loginCooldown > 0 ? `Try again in ${loginCooldown}s` : 'Sign in'}
                onPress={disabled ? undefined : handleLogin}
                disabled={disabled}
                minHeight={52}
              />

              <Text style={{ color: redesign.color.muted, fontSize: 11.5, fontFamily: typography.fontFamily, textAlign: 'center', lineHeight: 17 }}>
                {'By continuing, you agree to our '}
                <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: redesign.color.ink, fontWeight: '700' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: redesign.color.ink, fontWeight: '700' }}>Privacy Policy</Text>.
              </Text>
            </View>

            <View style={{ marginTop: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: redesign.color.muted, fontSize: 14.5, fontFamily: typography.fontFamily }}>Don&apos;t have an account?</Text>
              <Pressable onPress={() => { haptic.selection(); router.push('/welcome') }} hitSlop={6}>
                <Text style={{ color: redesign.color.ink, fontSize: 14.5, fontWeight: '800', fontFamily: typography.fontFamily }}>Sign up</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
