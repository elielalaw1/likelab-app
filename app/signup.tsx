import { useEffect, useMemo, useState } from 'react'
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { signupCreator } from '@/features/auth/api'
import { setPendingAuth } from '@/lib/pending-auth'
import { peekPendingReferralCode, setPendingReferralCode } from '@/features/referral/redeem'
import { SafeAreaView } from 'react-native-safe-area-context'
import { designSignupWordmark } from '@/design/assets'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { CATEGORY_OPTIONS, GENDER_OPTIONS, SWEDISH_COUNTIES, SWEDISH_MUNICIPALITIES, formatCountyLabel } from '@/features/profile/location-data'
import { radii, redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'

type Step = 1 | 2 | 3 | 4

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const renderStep = (step: Step) => {
    const completed = step < currentStep
    const active = step === currentStep
    return (
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: completed || active ? redesign.color.ink : redesign.color.card, borderWidth: completed || active ? 0 : StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}>
        {completed ? (
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        ) : (
          <Text style={{ color: active ? '#fff' : redesign.color.faint, fontSize: 13, fontWeight: '800', fontFamily: typography.fontFamily }}>{step}</Text>
        )}
      </View>
    )
  }
  const line = (filled: boolean) => (
    <View style={{ width: 32, height: 2, borderRadius: 999, backgroundColor: filled ? redesign.color.ink : redesign.color.hairlineStrong, marginHorizontal: 6 }} />
  )
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      {renderStep(1)}{line(currentStep > 1)}
      {renderStep(2)}{line(currentStep > 2)}
      {renderStep(3)}{line(currentStep > 3)}
      {renderStep(4)}
    </View>
  )
}

const navButtons = (onBack: () => void, onNext: () => void, nextLabel = 'Next', disabled = false) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
    <Pressable onPress={() => { haptic.selection(); onBack() }} style={{ height: 50, minWidth: 88, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: redesign.color.card }}>
      <MaterialCommunityIcons name="arrow-left" size={16} color={redesign.color.muted} />
      <Text style={{ fontSize: 15, color: redesign.color.muted, fontWeight: '700', fontFamily: typography.fontFamily }}>Back</Text>
    </Pressable>
    <Pressable onPress={() => { haptic.medium(); onNext() }} disabled={disabled} style={{ height: 50, minWidth: 140, paddingHorizontal: 18, borderRadius: 999, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled ? 0.55 : 1 }}>
      <Text style={{ fontSize: 15, color: '#fff', fontWeight: '800', fontFamily: typography.fontFamily }}>{nextLabel}</Text>
      <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
    </Pressable>
  </View>
)

export default function SignupPage() {
  const { palette } = useTheme()
  // verify-otp's "Wrong email? Go back" hands the typed email back so step 1 isn't blank.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>()
  const [step, setStep] = useState<Step>(1)

  // Step 1 — account
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(typeof emailParam === 'string' ? emailParam : '')
  const [phone, setPhone] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  // Full name shown across the app + on shipping labels. We collect first + last
  // separately so surnames are reliably captured for creator mapping / sendouts,
  // then concatenate into the existing display_name field (no backend change).
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()

  // Pre-fill the invite code from the deep link / clipboard code captured at app boot
  // by ReferralLinkHandler. We deliberately do NOT read the clipboard directly here —
  // that would trip the iOS paste-permission prompt on every visit to signup (the boot
  // capture is guarded by hasStringAsync + a once-per-install marker).
  useEffect(() => {
    const pending = peekPendingReferralCode()
    if (pending) setInviteCode(pending)
  }, [])

  // Step 2 — personal
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('')

  const isSweden = countryCode === 'SE' || country.trim().toLowerCase() === 'sweden'
  const countyOptions = useMemo(() => SWEDISH_COUNTIES.map((c) => ({ label: formatCountyLabel(c), value: c })), [])
  const cityOptions = useMemo(() => (isSweden && county ? (SWEDISH_MUNICIPALITIES[county] || []).map((c) => ({ label: c, value: c })) : []), [isSweden, county])

  // Step 3 — shipping
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')

  const [createLoading, setCreateLoading] = useState(false)

  const goNextFromStep1 = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
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
    setStep(2)
  }

  const goNextFromStep2 = () => {
    if (!gender || !age || !primaryCategory) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    setStep(3)
  }

  const goNextFromStep3 = () => {
    // City is required for every country — without it we can't ship products to
    // the creator (the whole point of the sendout phase / creator mapping).
    if (!country || !address.trim() || !postalCode.trim() || !city.trim()) {
      Alert.alert('Missing fields', 'Please complete your shipping address — country, street, postal code and city.')
      return
    }
    setStep(4)
  }

  const handleCreateAccount = async () => {
    try {
      setCreateLoading(true)
      await signupCreator({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        tiktokHandle: '',
        instagramHandle: instagramHandle.trim() || null,
        followers: null,
        likes: null,
      })
      // Stash the referral code (if any) for redemption once authenticated.
      setPendingReferralCode(inviteCode)
      setPendingAuth({
        email: email.trim(),
        password,
        phone: phone.trim() || null,
        gender,
        age,
        country,
        primaryCategory,
        address: address.trim(),
        postalCode: postalCode.trim(),
        county: county || null,
        city: city || null,
      })
      router.replace(`/verify-otp?email=${encodeURIComponent(email.trim())}` as never)
    } catch (error) {
      Alert.alert('Signup failed', error instanceof Error ? error.message : 'Could not create account')
    } finally {
      setCreateLoading(false)
    }
  }

  const cardStyle = { backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 18, gap: 14, ...redesign.shadow.card } as const

  return (
    <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(99,80,184,0.08)', 'rgba(99,80,184,0.02)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, width: 360, height: 360 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 10, paddingHorizontal: 18 }}>
          <Image source={designSignupWordmark} style={{ width: 156, height: 44, marginBottom: 8 }} resizeMode="contain" />
          <Text style={{ textAlign: 'center', fontSize: 22, lineHeight: 26, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.6, marginBottom: 10 }}>
            Create your creator account
          </Text>
          <StepIndicator currentStep={step} />
        </View>

        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Step 1 — Account */}
          {step === 1 ? (
            <View style={cardStyle}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="FIRST NAME *" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput label="LAST NAME *" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
                </View>
              </View>
              <AuthInput label="EMAIL *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              <AuthInput label="PHONE NUMBER" value={phone} onChangeText={setPhone} placeholder="+46 70 123 45 67" keyboardType="phone-pad" />
              <AuthInput label="INSTAGRAM HANDLE" value={instagramHandle} onChangeText={(v) => setInstagramHandle(v.replace(/^@+/, ''))} placeholder="yourinstagram" prefixText="@" sanitizeText={(v) => v.replace(/^@+/, '')} />
              <AuthInput label="PASSWORD *" value={password} onChangeText={setPassword} placeholder="Min 8 characters" secureTextEntry showToggle />
              <AuthInput label="CONFIRM PASSWORD *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry showToggle />
              <AuthInput label="INVITE CODE (OPTIONAL)" value={inviteCode} onChangeText={(v) => setInviteCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC234" autoCapitalize="characters" />
              <Text style={{ color: redesign.color.muted, fontSize: 11, fontFamily: typography.fontFamily, textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
                {'By continuing, you agree to our '}
                <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: redesign.color.ink, textDecorationLine: 'underline' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: redesign.color.ink, textDecorationLine: 'underline' }}>Privacy Policy</Text>.
              </Text>
              {navButtons(() => (router.canGoBack() ? router.back() : router.replace('/welcome')), goNextFromStep1)}
            </View>
          ) : null}

          {/* Step 2 — Personal info */}
          {step === 2 ? (
            <View style={cardStyle}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#060B1F', fontFamily: typography.fontFamily, marginBottom: 2 }}>About you</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <SelectPopover label="Gender *" value={gender} placeholder="Select" options={GENDER_OPTIONS} onSelect={setGender} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.formLabel, fontWeight: '600', letterSpacing: 0.88, textTransform: 'uppercase', marginBottom: 6 }}>
                    AGE *
                  </Text>
                  <TextInput
                    value={age}
                    onChangeText={(v) => setAge(v.replace(/[^\d]/g, ''))}
                    keyboardType="numeric"
                    placeholder="Your age"
                    placeholderTextColor={palette.textMuted}
                    style={{ borderWidth: 1, borderColor: palette.borderColor, borderRadius: radii.input, height: 40, backgroundColor: palette.inputBg, paddingHorizontal: 12, fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}
                  />
                </View>
              </View>
              <SelectPopover label="Primary Category *" value={primaryCategory} placeholder="Select category" options={CATEGORY_OPTIONS} onSelect={setPrimaryCategory} />
              {navButtons(() => setStep(1), goNextFromStep2)}
            </View>
          ) : null}

          {/* Step 3 — Shipping address (country + city consolidated here so the whole
              deliverable address lives in one block and every creator is shippable) */}
          {step === 3 ? (
            <View style={cardStyle}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#060B1F', fontFamily: typography.fontFamily, marginBottom: 2 }}>Shipping address</Text>
              <Text style={{ color: redesign.color.muted, fontSize: 13, fontFamily: typography.fontFamily, lineHeight: 18, marginBottom: 4 }}>
                Used to send physical products from campaign brands.
              </Text>
              {/* Recipient — reuses first + last name from Step 1 so this reads as a real label. */}
              {displayName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: redesign.color.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <MaterialCommunityIcons name="package-variant-closed" size={18} color={redesign.color.muted} />
                  <Text style={{ color: redesign.color.muted, fontSize: 13, fontFamily: typography.fontFamily }}>
                    <Text style={{ color: redesign.color.ink, fontWeight: '700' }}>Ships to: </Text>{displayName}
                  </Text>
                </View>
              ) : null}
              <CountrySelect
                value={country}
                onSelect={(name, code) => {
                  setCountry(name)
                  setCountryCode(code)
                  setCounty('')
                  setCity('')
                }}
              />
              <AuthInput label="STREET ADDRESS *" value={address} onChangeText={setAddress} placeholder="123 Main Street" autoCapitalize="words" />
              {isSweden ? (
                <SelectPopover label="County *" value={county} placeholder="Select county" options={countyOptions} onSelect={(v) => { setCounty(v); setCity('') }} />
              ) : null}
              {isSweden ? (
                <SelectPopover label="City *" value={city} placeholder={county ? 'Select city' : 'Select county first'} options={cityOptions} onSelect={setCity} />
              ) : (
                <AuthInput label="CITY *" value={city} onChangeText={setCity} placeholder="Your city" autoCapitalize="words" />
              )}
              <AuthInput label="POSTAL CODE *" value={postalCode} onChangeText={setPostalCode} placeholder="12345" keyboardType="number-pad" />
              {navButtons(() => setStep(2), goNextFromStep3)}
            </View>
          ) : null}

          {/* Step 4 — Review */}
          {step === 4 ? (
            <View style={cardStyle}>
              <View style={{ backgroundColor: redesign.color.bg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: redesign.color.hairlineStrong, gap: 4 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 14, fontWeight: '700', fontFamily: typography.fontFamily, marginBottom: 4 }}>Your account</Text>
                {([
                  ['Name', displayName],
                  ['Email', email],
                  phone ? ['Phone', phone] : null,
                  instagramHandle ? ['Instagram', '@' + instagramHandle] : null,
                  ['Gender', gender],
                  ['Age', age],
                  ['Country', country],
                  ['Category', primaryCategory],
                  county ? ['County', county] : null,
                  city ? ['City', city] : null,
                  ['Address', address],
                  ['Postal code', postalCode],
                ] as ([string, string] | null)[]).filter((row): row is [string, string] => row !== null).map(([label, value]) => (
                  <Text key={label} style={{ color: redesign.color.muted, fontSize: 13, fontFamily: typography.fontFamily, lineHeight: 20 }}>
                    <Text style={{ color: redesign.color.ink, fontWeight: '600' }}>{label}: </Text>{value}
                  </Text>
                ))}
              </View>

              <View style={{ backgroundColor: redesign.color.bg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: redesign.color.hairlineStrong }}>
                <Text style={{ color: redesign.color.muted, fontSize: 13, lineHeight: 18, fontFamily: typography.fontFamily }}>
                  After creating your account you will connect your TikTok to automatically import your profile picture and stats.
                </Text>
              </View>

              <Text style={{ color: redesign.color.muted, fontSize: 11, lineHeight: 16, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                {'By creating an account, you agree to our '}
                <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: redesign.color.ink, textDecorationLine: 'underline' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: redesign.color.ink, textDecorationLine: 'underline' }}>Privacy Policy</Text>.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => { haptic.selection(); setStep(3) }} style={{ height: 50, minWidth: 88, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: redesign.color.card }}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={redesign.color.muted} />
                  <Text style={{ fontSize: 15, color: redesign.color.muted, fontWeight: '700', fontFamily: typography.fontFamily }}>Back</Text>
                </Pressable>
                <Pressable onPress={() => { haptic.medium(); handleCreateAccount() }} disabled={createLoading} style={{ height: 50, minWidth: 180, paddingHorizontal: 22, borderRadius: 999, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', opacity: createLoading ? 0.55 : 1, flexDirection: 'row' }}>
                  <Text style={{ fontSize: 15, color: '#fff', fontWeight: '800', fontFamily: typography.fontFamily }}>
                    {createLoading ? 'Creating account…' : 'Create account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
