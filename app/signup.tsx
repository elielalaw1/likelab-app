import { useMemo, useRef, useState } from 'react'
import { Alert, Image, ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { ReviewTable } from '@/features/auth/components/ReviewTable'
import { fetchTikTokStats, signupCreator, stripAtPrefix } from '@/features/auth/api'
import { authColors } from '@/features/auth/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { designBackground, designSignupWordmark } from '@/design/assets'

type Step = 1 | 2 | 3
const stripHandleInput = (value: string) => value.replace(/^@+/, '')

function SimpleStepIndicator({ currentStep, totalSteps }: { currentStep: Step; totalSteps: number }) {
  const renderStep = (step: Step) => {
    const completed = step < currentStep
    const active = step === currentStep

    return (
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: completed || active ? '#11192F' : 'rgba(248,250,255,0.98)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {completed ? (
          <MaterialCommunityIcons name="check" size={22} color="#fff" />
        ) : (
          <Text
            style={{
              color: active ? '#fff' : '#64748B',
              fontSize: 16,
              fontWeight: '700',
              fontFamily: 'Montserrat',
            }}
          >
            {step}
          </Text>
        )}
      </View>
    )
  }

  const renderLine = (filled: boolean) => (
    <View
      style={{
        width: 44,
        height: 2,
        borderRadius: 999,
        backgroundColor: filled ? '#11192F' : 'rgba(255,255,255,0.92)',
        marginHorizontal: 10,
      }}
    />
  )

  if (totalSteps === 2) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 144, height: 48 }}>
        {renderStep(1)}
        {renderLine(currentStep > 1)}
        {renderStep(2)}
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 232, height: 48 }}>
      {renderStep(1)}
      {renderLine(currentStep > 1)}
      {renderStep(2)}
      {renderLine(currentStep > 2)}
      {renderStep(3)}
    </View>
  )
}

export default function SignupPage() {
  const statsRequestIdRef = useRef(0)
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fetchingStats, setFetchingStats] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [statsFetched, setStatsFetched] = useState(false)
  const [statsManual, setStatsManual] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [followersFormatted, setFollowersFormatted] = useState<string | null>(null)
  const [likesFormatted, setLikesFormatted] = useState<string | null>(null)

  const reviewRows = useMemo(
    () => [
      { label: 'NAME', value: displayName || '—' },
      { label: 'EMAIL', value: email || '—' },
      { label: 'TIKTOK', value: stripAtPrefix(tiktokHandle) || '—' },
      { label: 'TIKTOK FOLLOWERS', value: followersFormatted || '—', accent: Boolean(followersFormatted) },
      { label: 'TIKTOK LIKES', value: likesFormatted || '—', accent: Boolean(likesFormatted) },
    ],
    [displayName, email, tiktokHandle, followersFormatted, likesFormatted]
  )

  const canCreateAccount = (statsFetched || statsManual) && !fetchingStats && !createLoading
  const compactLayout = true
  const totalSteps = 3
  const displayStep: Step = step

  const resetStatsState = () => {
    statsRequestIdRef.current += 1
    setFetchingStats(false)
    setStatsFetched(false)
    setStatsManual(false)
    setStatsError(null)
    setFollowersFormatted(null)
    setLikesFormatted(null)
  }

  const handleTikTokHandleChange = (value: string) => {
    const sanitizedValue = stripHandleInput(value)
    if (stripAtPrefix(sanitizedValue) !== stripAtPrefix(tiktokHandle)) {
      resetStatsState()
    }
    setTiktokHandle(sanitizedValue)
  }

  const beginTikTokStatsFetch = async (force = false) => {
    if (!stripAtPrefix(tiktokHandle) || fetchingStats || (!force && (statsFetched || statsManual))) {
      return
    }

    const requestId = statsRequestIdRef.current + 1
    statsRequestIdRef.current = requestId

    try {
      setFetchingStats(true)
      setStatsError(null)
      const stats = await fetchTikTokStats(tiktokHandle)
      if (statsRequestIdRef.current !== requestId) return
      setFollowersFormatted(stats.followersFormatted)
      setLikesFormatted(stats.likesFormatted)
      setStatsFetched(Boolean(stats.followersFormatted || stats.likesFormatted))
      setStatsManual(false)
    } catch (error) {
      if (statsRequestIdRef.current !== requestId) return
      const message = error instanceof Error ? error.message : 'Could not verify TikTok stats'
      console.error('TikTok stats fetch failed', { handle: tiktokHandle, message })
      setStatsFetched(false)
      setStatsManual(true)
      setStatsError(message)
      setFollowersFormatted(null)
      setLikesFormatted(null)
    } finally {
      if (statsRequestIdRef.current !== requestId) return
      setFetchingStats(false)
    }
  }

  const goNextFromStep1 = () => {
    if (!stripAtPrefix(tiktokHandle)) {
      Alert.alert('TikTok required', 'Please enter your TikTok handle.')
      return
    }

    if (!statsFetched && !statsManual) {
      void beginTikTokStatsFetch()
    }

    setStep(2)
  }

  const goNextFromStep2 = () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Fill in all required fields.')
      return
    }

    if (password.length < 8) {
      Alert.alert('Invalid password', 'Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.')
      return
    }

    setStep(3)
  }

  const handleCreateAccount = async () => {
    if (fetchingStats) return

    if (!statsFetched && !statsManual) {
      Alert.alert('TikTok verification required', 'Your TikTok stats must be verified before you can create an account.')
      return
    }

    try {
      setCreateLoading(true)
      await signupCreator({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        tiktokHandle,
        instagramHandle: instagramHandle.trim() || null,
        followers: followersFormatted,
        likes: likesFormatted,
      })
      router.replace(`/verify-otp?email=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}` as never)
    } catch (error) {
      Alert.alert('Signup failed', error instanceof Error ? error.message : 'Could not create account')
    } finally {
      setCreateLoading(false)
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
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0} style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 }}>
            <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
              <View style={{ alignItems: 'center', marginBottom: compactLayout ? 14 : 30 }}>
                <Image
                  source={designSignupWordmark}
                  style={{ width: compactLayout ? 156 : 210, height: compactLayout ? 44 : 60, marginBottom: compactLayout ? 8 : 18 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: compactLayout ? 22 : 30,
                    lineHeight: compactLayout ? 26 : 34,
                    fontWeight: '800',
                    color: '#060B1F',
                    fontFamily: 'Montserrat',
                    letterSpacing: -0.6,
                    marginBottom: compactLayout ? 10 : 24,
                  }}
                >
                  Create your creator account
                </Text>
                <SimpleStepIndicator currentStep={displayStep} totalSteps={totalSteps} />
              </View>

              {step === 1 ? (
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#D7DFEE',
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 18,
                  }}
                >
                  <View style={{ gap: 20 }}>
                    <AuthInput
                      label="TIKTOK HANDLE *"
                      value={tiktokHandle}
                      onChangeText={handleTikTokHandleChange}
                      placeholder="yourtiktok"
                      prefixText="@"
                      sanitizeText={stripHandleInput}
                    />

                    <AuthInput
                      label="INSTAGRAM HANDLE"
                      value={instagramHandle}
                      onChangeText={(value) => setInstagramHandle(stripHandleInput(value))}
                      placeholder="yourinstagram"
                      prefixText="@"
                      sanitizeText={stripHandleInput}
                    />

                    <Text style={{ color: '#687C9E', fontSize: 11, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
                      {'By continuing, you agree to our '}
                      <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Terms of Service</Text>
                      {' and '}
                      <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Privacy Policy</Text>
                      .
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                      <Pressable
                        onPress={() => router.back()}
                        style={{
                          height: 50,
                          minWidth: 96,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: authColors.border,
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                      >
                        <MaterialCommunityIcons name="arrow-left" size={18} color={authColors.muted} />
                        <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600', fontFamily: authColors.typography.fontFamily }}>Back</Text>
                      </Pressable>

                      <Pressable
                        onPress={goNextFromStep1}
                        style={{
                          height: 50,
                          minWidth: 112,
                          paddingHorizontal: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: '#C9D2FF',
                          flexDirection: 'row',
                          gap: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <LinearGradient colors={['rgba(247,244,255,0.95)', 'rgba(236,244,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#101525', fontFamily: authColors.typography.fontFamily }}>Next</Text>
                        <MaterialCommunityIcons name="arrow-right" size={18} color="#101525" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {step === 2 ? (
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#D7DFEE',
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                  }}
                >
                  <View style={{ gap: 14 }}>
                    <AuthInput
                      label="NAME *"
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your name"
                      autoCapitalize="words"
                    />

                    <AuthInput
                      label="EMAIL *"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                    />

                    <AuthInput
                      label="PASSWORD *"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Min 8 characters"
                      secureTextEntry
                    />

                    <AuthInput
                      label="CONFIRM PASSWORD *"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat password"
                      secureTextEntry
                    />

                    <Text style={{ color: '#687C9E', fontSize: 11, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
                      {'By continuing, you agree to our '}
                      <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Terms of Service</Text>
                      {' and '}
                      <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Privacy Policy</Text>
                      .
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Pressable
                        onPress={() => setStep(1)}
                        style={{
                          height: 50,
                          minWidth: 82,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: authColors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          backgroundColor: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
                        <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600', fontFamily: authColors.typography.fontFamily }}>Back</Text>
                      </Pressable>

                      <Pressable
                        onPress={goNextFromStep2}
                        style={{
                          height: 50,
                          minWidth: 112,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: '#C9D2FF',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <LinearGradient colors={['rgba(247,244,255,0.95)', 'rgba(236,244,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
                        <Text style={{ fontSize: 15, color: '#101525', fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>Next</Text>
                        <MaterialCommunityIcons name="arrow-right" size={18} color="#101525" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {step === 3 ? (
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#D7DFEE',
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 18,
                  }}
                >
                  <Text
                    style={{
                      color: authColors.muted,
                      fontSize: 16,
                      lineHeight: 22,
                      fontFamily: authColors.typography.fontFamily,
                      marginBottom: 14,
                    }}
                  >
                    Review your info. You can complete your profile after signing up.
                  </Text>

                  <ReviewTable rows={reviewRows} />

                  <View style={{ marginTop: 16, marginBottom: 12 }}>
                    <Text style={{ color: '#060B1F', fontSize: 14, fontWeight: '500', fontFamily: authColors.typography.fontFamily }}>
                      {fetchingStats
                        ? 'Fetching TikTok stats...'
                        : statsFetched
                          ? '✓ TikTok stats verified'
                          : statsManual
                            ? '⚠ Could not verify stats — you can still continue'
                            : 'TikTok verification required'}
                    </Text>
                  </View>

                  {statsError ? (
                    <Text style={{ color: authColors.muted, fontSize: 12, lineHeight: 17, fontFamily: authColors.typography.fontFamily, marginBottom: 10 }}>{statsError}</Text>
                  ) : null}

                  <View
                    style={{
                      backgroundColor: 'rgba(248,250,255,0.92)',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(234,239,248,0.95)',
                      marginBottom: 18,
                    }}
                  >
                    <Text style={{ color: authColors.muted, fontSize: 13, lineHeight: 18, fontFamily: authColors.typography.fontFamily }}>
                      💡 After signing up, complete your profile (photo, age, category) to unlock campaign applications and appear in brand searches.
                    </Text>
                  </View>

                  <Text style={{ color: authColors.muted, fontSize: 11, lineHeight: 16, fontFamily: authColors.typography.fontFamily, textAlign: 'center', marginBottom: 10 }}>
                    {'By creating an account, you agree to our '}
                    <Text
                      onPress={() => Linking.openURL('https://likelab.io/terms-of-service')}
                      style={{ color: '#101525', textDecorationLine: 'underline' }}
                    >
                      Terms of Service
                    </Text>
                    {' and '}
                    <Text
                      onPress={() => Linking.openURL('https://likelab.io/privacy-policy')}
                      style={{ color: '#101525', textDecorationLine: 'underline' }}
                    >
                      Privacy Policy
                    </Text>
                    .
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Pressable
                      onPress={() => setStep(2)}
                      style={{
                        height: 50,
                        minWidth: 82,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: authColors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
                      <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600', fontFamily: authColors.typography.fontFamily }}>Back</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleCreateAccount}
                      disabled={!canCreateAccount}
                      style={{
                        height: 50,
                        minWidth: 170,
                        paddingHorizontal: 22,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: '#C9D2FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: canCreateAccount ? 1 : 0.7,
                        overflow: 'hidden',
                        flexDirection: 'row',
                      }}
                    >
                      <LinearGradient colors={['rgba(247,244,255,0.95)', 'rgba(236,244,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
                      <Text style={{ fontSize: 15, color: '#101525', fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>
                        {createLoading
                          ? 'Creating account...'
                          : fetchingStats
                            ? 'Fetching stats...'
                            : 'Create account'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
