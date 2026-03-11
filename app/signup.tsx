import { useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { LogoMark } from '@/features/auth/components/LogoMark'
import { ReviewTable } from '@/features/auth/components/ReviewTable'
import { StepIndicator } from '@/features/auth/components/StepIndicator'
import { fetchTikTokStats, signupCreator, stripAtPrefix } from '@/features/auth/api'
import { authColors } from '@/features/auth/theme'

type Step = 1 | 2 | 3

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [statsVerified, setStatsVerified] = useState(false)
  const [followersFormatted, setFollowersFormatted] = useState<string | null>(null)
  const [likesFormatted, setLikesFormatted] = useState<string | null>(null)

  const subtitle =
    step === 1
      ? 'Enter your TikTok handle'
      : step === 2
        ? 'Account basics'
        : 'Review your info'

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

  const goNextFromStep1 = async () => {
    if (!stripAtPrefix(tiktokHandle)) {
      Alert.alert('TikTok required', 'Please enter your TikTok handle.')
      return
    }

    try {
      setStatsLoading(true)
      const stats = await fetchTikTokStats(tiktokHandle)
      setFollowersFormatted(stats.followersFormatted)
      setLikesFormatted(stats.likesFormatted)
      setStatsVerified(Boolean(stats.followersFormatted || stats.likesFormatted))
    } catch {
      setStatsVerified(false)
      setFollowersFormatted(null)
      setLikesFormatted(null)
      Alert.alert('Could not verify TikTok stats', 'You can continue without verification.')
    } finally {
      setStatsLoading(false)
      setStep(2)
    }
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

      Alert.alert('Account created', 'Check your email to confirm your account.', [
        { text: 'OK', onPress: () => router.replace('/check-email' as never) },
      ])
    } catch (error) {
      Alert.alert('Signup failed', error instanceof Error ? error.message : 'Could not create account')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <AuthLayout>
      <LogoMark />

      <Text style={{ textAlign: 'center', fontSize: 22, lineHeight: 30, fontWeight: '800', color: authColors.text }}>
        Create your creator account
      </Text>

      <StepIndicator currentStep={step} />
      <Text style={{ textAlign: 'center', color: authColors.muted, fontSize: 16 }}>{subtitle}</Text>

      {step === 1 ? (
        <AuthCard>
          <AuthInput
            label="TIKTOK HANDLE *"
            value={tiktokHandle}
            onChangeText={setTiktokHandle}
            placeholder="@yourtiktok"
          />

          <AuthInput
            label="INSTAGRAM HANDLE"
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            placeholder="@yourinstagram"
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              onPress={goNextFromStep1}
              disabled={statsLoading}
              style={{
                height: 50,
                minWidth: 112,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: authColors.accentSoft,
                backgroundColor: authColors.buttonBg,
                opacity: statsLoading ? 0.7 : 1,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: authColors.text }}>{statsLoading ? '...' : 'Next'}</Text>
              {!statsLoading ? <MaterialCommunityIcons name="arrow-right" size={18} color={authColors.text} /> : null}
            </Pressable>
          </View>
        </AuthCard>
      ) : null}

      {step === 2 ? (
        <AuthCard>
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

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
                backgroundColor: '#fff',
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
              <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600' }}>Back</Text>
            </Pressable>

            <Pressable
              onPress={goNextFromStep2}
              style={{
                height: 50,
                minWidth: 112,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: authColors.accentSoft,
                backgroundColor: authColors.buttonBg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 17, color: authColors.text, fontWeight: '700' }}>Next</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={authColors.text} />
            </Pressable>
          </View>
        </AuthCard>
      ) : null}

      {step === 3 ? (
        <AuthCard>
          <Text style={{ color: authColors.muted, fontSize: 17, lineHeight: 24 }}>
            Review your info. You can complete your profile after signing up.
          </Text>

          <ReviewTable rows={reviewRows} />

          <Text style={{ color: authColors.accent, fontSize: 15, fontWeight: '600' }}>
            {statsVerified ? '✓ TikTok stats verified' : 'TikTok stats not verified'}
          </Text>

          <View style={{ backgroundColor: '#f1f3f7', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: authColors.muted, fontSize: 14, lineHeight: 20 }}>
              💡 After signing up, complete your profile (photo, age, category) to unlock campaign applications and appear in brand searches.
            </Text>
          </View>

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
                backgroundColor: '#fff',
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
              <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600' }}>Back</Text>
            </Pressable>

            <Pressable
              onPress={handleCreateAccount}
              disabled={createLoading}
              style={{
                height: 50,
                minWidth: 162,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: '#3d5fda',
                backgroundColor: authColors.buttonBg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: createLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ fontSize: 17, color: authColors.text, fontWeight: '700' }}>
                {createLoading ? 'Creating...' : 'Create account'}
              </Text>
            </Pressable>
          </View>
        </AuthCard>
      ) : null}

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: authColors.muted, fontSize: 16 }}>Already have an account?</Text>
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={{ color: authColors.text, fontSize: 16, fontWeight: '700' }}>Sign in</Text>
        </Pressable>
      </View>
    </AuthLayout>
  )
}
