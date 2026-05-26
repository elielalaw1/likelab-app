import { useState } from 'react'
import { Alert, Image, ImageBackground, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { signupCreator } from '@/features/auth/api'
import { setPendingAuth } from '@/lib/pending-auth'
import { authColors } from '@/features/auth/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { designBackground, designSignupWordmark } from '@/design/assets'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { CATEGORY_OPTIONS, GENDER_OPTIONS, COUNTRY_TO_PHONE_CODE, SWEDISH_COUNTIES, SWEDISH_MUNICIPALITIES, findCountryByValue, formatCountyLabel } from '@/features/profile/location-data'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { updateCreatorProfile } from '@/features/profile/api'
import { useMemo } from 'react'

type Step = 1 | 2 | 3 | 4

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const renderStep = (step: Step) => {
    const completed = step < currentStep
    const active = step === currentStep
    return (
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: completed || active ? '#11192F' : 'rgba(248,250,255,0.98)', alignItems: 'center', justifyContent: 'center' }}>
        {completed ? (
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        ) : (
          <Text style={{ color: active ? '#fff' : '#64748B', fontSize: 13, fontWeight: '700', fontFamily: 'Montserrat' }}>{step}</Text>
        )}
      </View>
    )
  }
  const line = (filled: boolean) => (
    <View style={{ width: 32, height: 2, borderRadius: 999, backgroundColor: filled ? '#11192F' : 'rgba(255,255,255,0.92)', marginHorizontal: 6 }} />
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
    <Pressable onPress={onBack} style={{ height: 50, minWidth: 82, borderRadius: 14, borderWidth: 1, borderColor: authColors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.9)' }}>
      <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
      <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600', fontFamily: authColors.typography.fontFamily }}>Back</Text>
    </Pressable>
    <Pressable onPress={onNext} disabled={disabled} style={{ height: 50, minWidth: 130, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#C9D2FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, overflow: 'hidden', opacity: disabled ? 0.7 : 1 }}>
      <LinearGradient colors={['rgba(247,244,255,0.95)', 'rgba(236,244,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
      <Text style={{ fontSize: 15, color: '#101525', fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>{nextLabel}</Text>
      <MaterialCommunityIcons name="arrow-right" size={18} color="#101525" />
    </Pressable>
  </View>
)

export default function SignupPage() {
  const { palette } = useTheme()
  const [step, setStep] = useState<Step>(1)

  // Step 1 — account
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
    setStep(2)
  }

  const goNextFromStep2 = () => {
    if (!gender || !age || !country || !primaryCategory) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    setStep(3)
  }

  const goNextFromStep3 = () => {
    if (!address.trim() || !postalCode.trim()) {
      Alert.alert('Missing fields', 'Please enter your shipping address.')
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

  const cardStyle = { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D7DFEE', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, gap: 14 } as const

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <ImageBackground source={designBackground} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} resizeMode="cover" />
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 10, paddingHorizontal: 18 }}>
          <Image source={designSignupWordmark} style={{ width: 156, height: 44, marginBottom: 8 }} resizeMode="contain" />
          <Text style={{ textAlign: 'center', fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#060B1F', fontFamily: 'Montserrat', letterSpacing: -0.6, marginBottom: 10 }}>
            Create your creator account
          </Text>
          <StepIndicator currentStep={step} />
        </View>

        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Step 1 — Account */}
          {step === 1 ? (
            <View style={cardStyle}>
              <AuthInput label="NAME *" value={displayName} onChangeText={setDisplayName} placeholder="Your name" autoCapitalize="words" />
              <AuthInput label="EMAIL *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              <AuthInput label="PHONE NUMBER" value={phone} onChangeText={setPhone} placeholder="+46 70 123 45 67" keyboardType="phone-pad" />
              <AuthInput label="INSTAGRAM HANDLE" value={instagramHandle} onChangeText={(v) => setInstagramHandle(v.replace(/^@+/, ''))} placeholder="yourinstagram" prefixText="@" sanitizeText={(v) => v.replace(/^@+/, '')} />
              <AuthInput label="PASSWORD *" value={password} onChangeText={setPassword} placeholder="Min 8 characters" secureTextEntry showToggle />
              <AuthInput label="CONFIRM PASSWORD *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry showToggle />
              <Text style={{ color: '#687C9E', fontSize: 11, fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
                {'By continuing, you agree to our '}
                <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Privacy Policy</Text>.
              </Text>
              {navButtons(() => router.back(), goNextFromStep1)}
            </View>
          ) : null}

          {/* Step 2 — Personal info */}
          {step === 2 ? (
            <View style={cardStyle}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#060B1F', fontFamily: 'Montserrat', marginBottom: 2 }}>About you</Text>
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
              <CountrySelect
                value={country}
                onSelect={(name, code) => {
                  setCountry(name)
                  setCountryCode(code)
                  setCounty('')
                  setCity('')
                }}
              />
              {isSweden ? (
                <SelectPopover label="County" value={county} placeholder="Select county" options={countyOptions} onSelect={(v) => { setCounty(v); setCity('') }} />
              ) : null}
              {isSweden && county ? (
                <SelectPopover label="City" value={city} placeholder="Select city" options={cityOptions} onSelect={setCity} />
              ) : !isSweden ? (
                <AuthInput label="CITY" value={city} onChangeText={setCity} placeholder="Your city" autoCapitalize="words" />
              ) : null}
              <SelectPopover label="Primary Category *" value={primaryCategory} placeholder="Select category" options={CATEGORY_OPTIONS} onSelect={setPrimaryCategory} />
              {navButtons(() => setStep(1), goNextFromStep2)}
            </View>
          ) : null}

          {/* Step 3 — Shipping address */}
          {step === 3 ? (
            <View style={cardStyle}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#060B1F', fontFamily: 'Montserrat', marginBottom: 2 }}>Shipping address</Text>
              <Text style={{ color: '#687C9E', fontSize: 13, fontFamily: 'Montserrat', lineHeight: 18, marginBottom: 4 }}>
                Used to send physical products from campaign brands.
              </Text>
              <AuthInput label="STREET ADDRESS *" value={address} onChangeText={setAddress} placeholder="123 Main Street" autoCapitalize="words" />
              <AuthInput label="POSTAL CODE *" value={postalCode} onChangeText={setPostalCode} placeholder="12345" keyboardType="number-pad" />
              {navButtons(() => setStep(2), goNextFromStep3)}
            </View>
          ) : null}

          {/* Step 4 — Review */}
          {step === 4 ? (
            <View style={cardStyle}>
              <View style={{ backgroundColor: 'rgba(248,250,255,0.92)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(234,239,248,0.95)', gap: 4 }}>
                <Text style={{ color: '#101525', fontSize: 14, fontWeight: '700', fontFamily: 'Montserrat', marginBottom: 4 }}>Your account</Text>
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
                  <Text key={label} style={{ color: '#687C9E', fontSize: 13, fontFamily: 'Montserrat', lineHeight: 20 }}>
                    <Text style={{ color: '#101525', fontWeight: '600' }}>{label}: </Text>{value}
                  </Text>
                ))}
              </View>

              <View style={{ backgroundColor: 'rgba(248,250,255,0.92)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(234,239,248,0.95)' }}>
                <Text style={{ color: '#687C9E', fontSize: 13, lineHeight: 18, fontFamily: 'Montserrat' }}>
                  After creating your account you will connect your TikTok to automatically import your profile picture and stats.
                </Text>
              </View>

              <Text style={{ color: authColors.muted, fontSize: 11, lineHeight: 16, fontFamily: authColors.typography.fontFamily, textAlign: 'center' }}>
                {'By creating an account, you agree to our '}
                <Text onPress={() => Linking.openURL('https://likelab.io/terms-of-service')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => Linking.openURL('https://likelab.io/privacy-policy')} style={{ color: '#101525', textDecorationLine: 'underline' }}>Privacy Policy</Text>.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setStep(3)} style={{ height: 50, minWidth: 82, borderRadius: 14, borderWidth: 1, borderColor: authColors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={authColors.muted} />
                  <Text style={{ fontSize: 15, color: authColors.muted, fontWeight: '600', fontFamily: authColors.typography.fontFamily }}>Back</Text>
                </Pressable>
                <Pressable onPress={handleCreateAccount} disabled={createLoading} style={{ height: 50, minWidth: 170, paddingHorizontal: 22, borderRadius: 20, borderWidth: 1.5, borderColor: '#C9D2FF', alignItems: 'center', justifyContent: 'center', opacity: createLoading ? 0.7 : 1, overflow: 'hidden', flexDirection: 'row' }}>
                  <LinearGradient colors={['rgba(247,244,255,0.95)', 'rgba(236,244,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
                  <Text style={{ fontSize: 15, color: '#101525', fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>
                    {createLoading ? 'Creating account...' : 'Create account'}
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
