import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Image as ExpoImage } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { designBackground, designWordmark } from '@/design/assets'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import {
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  SWEDISH_COUNTIES,
  SWEDISH_MUNICIPALITIES,
  findCountryByValue,
  formatCountyLabel,
} from '@/features/profile/location-data'
import { useCreatorProfile, useUpdateCreatorProfile } from '@/features/profile/hooks'
import { getProfileCompletion } from '@/features/profile/completion'
import { uploadAvatarFromLibrary } from '@/features/profile/api'
import { dismissCompletionPrompt } from '@/features/onboarding/completionPromptControl'
import type { CreatorProfile } from '@/features/core/types'
import { haptic } from '@/features/shared/haptics'
import { toast } from '@/features/shared/ui/Toast'

export default function CompleteProfilePage() {
  const { width } = useWindowDimensions()
  const { data: profile, isLoading } = useCreatorProfile()
  const updateMutation = useUpdateCreatorProfile()

  const completion = useMemo(() => getProfileCompletion(profile), [profile])
  const missing = useMemo(
    () => new Set(completion.checklist.filter((i) => !i.done).map((i) => i.key)),
    [completion],
  )

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  // Live completion: merge the locally-typed fields over the server profile so the
  // progress bar moves as the creator fills the form instead of sitting still.
  const liveCompletion = useMemo(
    () => getProfileCompletion({
      ...(profile ?? {}),
      avatarUrl: avatarUrl || profile?.avatarUrl,
      firstName: firstName || profile?.firstName,
      lastName: lastName || profile?.lastName,
      ageRange: age || profile?.ageRange,
      primaryCategory: primaryCategory || profile?.primaryCategory,
      gender: gender || profile?.gender,
      country: country || profile?.country,
      city: city || profile?.city,
      address: address || profile?.address,
      postalCode: postalCode || profile?.postalCode,
    } as CreatorProfile),
    [profile, avatarUrl, firstName, lastName, age, primaryCategory, gender, country, city, address, postalCode],
  )

  // Seed the form from the profile the first time it resolves (react-query usually
  // has it cached before we navigate here, but guard for the cold path too).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !profile) return
    seeded.current = true
    // Prefill first/last from the real columns, falling back to splitting the legacy
    // display_name so older users just confirm/correct instead of retyping.
    const parts = (profile.displayName ?? '').trim().split(/\s+/).filter(Boolean)
    setFirstName(profile.firstName ?? parts[0] ?? '')
    setLastName(profile.lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''))
    setGender(profile.gender ?? '')
    setAge(profile.ageRange ?? '')
    setPrimaryCategory(profile.primaryCategory ?? '')
    setCountry(profile.country ?? '')
    setCountryCode(findCountryByValue(profile.country)?.code ?? '')
    setCounty(profile.county ?? '')
    setCity(profile.city ?? '')
    setAddress(profile.address ?? '')
    setPostalCode(profile.postalCode ?? '')
    setAvatarUrl(profile.avatarUrl ?? '')
  }, [profile])

  const isSweden = countryCode === 'SE' || country.trim().toLowerCase() === 'sweden'
  const countyOptions = useMemo(() => SWEDISH_COUNTIES.map((c) => ({ label: formatCountyLabel(c), value: c })), [])
  const cityOptions = useMemo(
    () => (isSweden && county ? (SWEDISH_MUNICIPALITIES[county] || []).map((c) => ({ label: c, value: c })) : []),
    [isSweden, county],
  )

  const needsCountry = missing.has('country')
  const needsLocation = needsCountry || missing.has('city')

  const onPickAvatar = async () => {
    if (!profile?.id) return
    try {
      setAvatarBusy(true)
      const url = await uploadAvatarFromLibrary(profile.id)
      if (url) {
        setAvatarUrl(url)
        haptic.success()
      }
    } catch (e) {
      haptic.warning()
      toast.error(e instanceof Error ? e.message : 'Could not upload photo.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const finish = () => {
    dismissCompletionPrompt()
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/overview')
  }

  const onLater = () => {
    dismissCompletionPrompt()
    finish()
  }

  const handleSave = async () => {
    // Every field we render is required — the whole point is to reach 100%.
    const ok =
      (!missing.has('avatar_url') || !!avatarUrl) &&
      (!missing.has('first_name') || !!firstName.trim()) &&
      (!missing.has('last_name') || !!lastName.trim()) &&
      (!missing.has('gender') || !!gender) &&
      (!missing.has('age_range') || !!age.trim()) &&
      (!missing.has('primary_category') || !!primaryCategory) &&
      (!needsCountry || !!country) &&
      (!needsLocation || !!city.trim()) &&
      (!missing.has('address') || !!address.trim()) &&
      (!missing.has('postal_code') || !!postalCode.trim())
    if (!ok) {
      toast.error('Please fill in all the fields to finish your profile.')
      return
    }

    const payload: Partial<CreatorProfile> = {}
    if (missing.has('avatar_url')) payload.avatarUrl = avatarUrl
    if (missing.has('first_name')) payload.firstName = firstName.trim()
    if (missing.has('last_name')) payload.lastName = lastName.trim()
    if (missing.has('gender')) payload.gender = gender
    if (missing.has('age_range')) payload.ageRange = age.trim()
    if (missing.has('primary_category')) payload.primaryCategory = primaryCategory
    if (needsCountry) payload.country = country
    if (needsLocation) {
      payload.city = city.trim()
      if (county) payload.county = county
    }
    if (missing.has('address')) payload.address = address.trim()
    if (missing.has('postal_code')) payload.postalCode = postalCode.trim()

    try {
      await updateMutation.mutateAsync(payload)
      haptic.success()
      setCelebrate(true)
    } catch (e) {
      haptic.warning()
      toast.error(e instanceof Error ? e.message : 'Please try again.')
    }
  }

  const remaining = missing.size

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <ImageBackground source={designBackground} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} resizeMode="cover" />
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      {celebrate ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <ConfettiCannon count={140} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={430} fallSpeed={3000} />
        </View>
      ) : null}

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {celebrate ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 18 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: redesign.color.successBg, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="check-decagram" size={48} color={redesign.color.successText} />
            </View>
            <View style={{ gap: 8, alignItems: 'center' }}>
              <Text style={{ color: redesign.color.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                Profile complete
              </Text>
              <Text style={{ color: redesign.color.muted, fontSize: 15, lineHeight: 22, fontWeight: '500', fontFamily: typography.fontFamily, textAlign: 'center', maxWidth: 300 }}>
                You&apos;re all set — brands can now match you with the right campaigns.
              </Text>
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <LiquidButton label="Continue" onPress={finish} minHeight={54} />
            </View>
          </View>
        ) : isLoading && !profile ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={redesign.color.purple} />
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <Image source={designWordmark} style={{ width: 180, height: 30 }} resizeMode="contain" />
              </View>

              <View style={{ gap: 6, marginBottom: 16 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.7, fontFamily: typography.fontFamily }}>
                  Finish your profile
                </Text>
                <Text style={{ color: redesign.color.muted, fontSize: 14.5, lineHeight: 21, fontWeight: '500', fontFamily: typography.fontFamily }}>
                  {`Just ${remaining} quick ${remaining === 1 ? 'detail' : 'details'} we now need to match you with campaigns.`}
                </Text>
                {/* Live-ish progress from the server profile */}
                <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden', marginTop: 8 }}>
                  <View style={{ height: '100%', width: `${Math.max(liveCompletion.percentage, 4)}%`, borderRadius: 999, backgroundColor: redesign.color.purple }} />
                </View>
                <Text style={{ color: redesign.color.faint, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: typography.fontFamily, marginTop: 2 }}>
                  {`${liveCompletion.percentage}% complete`}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: redesign.color.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: redesign.color.hairlineStrong,
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  paddingVertical: 18,
                  gap: 14,
                  ...redesign.shadow.card,
                }}
              >
                {missing.has('avatar_url') ? (
                  <View style={{ alignItems: 'center', gap: 10, paddingBottom: 4 }}>
                    <Pressable onPress={avatarBusy ? undefined : onPickAvatar} style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: redesign.color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {avatarBusy ? (
                        <ActivityIndicator color={redesign.color.purple} />
                      ) : avatarUrl ? (
                        <ExpoImage source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <MaterialCommunityIcons name="camera-plus-outline" size={28} color={redesign.color.faint} />
                      )}
                    </Pressable>
                    <Pressable onPress={avatarBusy ? undefined : onPickAvatar}>
                      <Text style={{ color: redesign.color.purple, fontSize: 13, fontWeight: '800', fontFamily: typography.fontFamily }}>
                        {avatarUrl ? 'Change photo' : 'Add profile photo'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {missing.has('first_name') ? (
                  <AuthInput label="FIRST NAME *" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
                ) : null}

                {missing.has('last_name') ? (
                  <AuthInput label="LAST NAME *" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
                ) : null}

                {missing.has('gender') ? (
                  <SelectPopover label="Gender *" value={gender} placeholder="Select" options={GENDER_OPTIONS} onSelect={setGender} />
                ) : null}

                {missing.has('age_range') ? (
                  <AuthInput label="AGE *" value={age} onChangeText={(v) => setAge(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Your age" />
                ) : null}

                {missing.has('primary_category') ? (
                  <SelectPopover label="Primary Category *" value={primaryCategory} placeholder="Select category" options={CATEGORY_OPTIONS} onSelect={setPrimaryCategory} />
                ) : null}

                {needsLocation ? (
                  <>
                    {needsCountry ? (
                      <CountrySelect
                        value={country}
                        onSelect={(name, code) => {
                          setCountry(name)
                          setCountryCode(code)
                          setCounty('')
                          setCity('')
                        }}
                      />
                    ) : null}
                    {isSweden ? (
                      <SelectPopover label="County *" value={county} placeholder="Select county" options={countyOptions} onSelect={(v) => { setCounty(v); setCity('') }} />
                    ) : null}
                    {isSweden ? (
                      <SelectPopover label="City *" value={city} placeholder={county ? 'Select city' : 'Select county first'} options={cityOptions} onSelect={setCity} />
                    ) : (
                      <AuthInput label="CITY *" value={city} onChangeText={setCity} placeholder="Your city" autoCapitalize="words" />
                    )}
                  </>
                ) : null}

                {missing.has('address') ? (
                  <AuthInput label="STREET ADDRESS *" value={address} onChangeText={setAddress} placeholder="123 Main Street" autoCapitalize="words" />
                ) : null}

                {missing.has('postal_code') ? (
                  <AuthInput label="POSTAL CODE *" value={postalCode} onChangeText={setPostalCode} placeholder="12345" keyboardType="number-pad" />
                ) : null}

                <LiquidButton
                  label={updateMutation.isPending ? 'Saving…' : 'Save & finish'}
                  onPress={updateMutation.isPending ? undefined : handleSave}
                  disabled={updateMutation.isPending}
                  minHeight={52}
                />
              </View>

              <Pressable onPress={onLater} hitSlop={8} style={{ alignSelf: 'center', marginTop: 18 }}>
                <Text style={{ color: redesign.color.muted, fontSize: 14.5, fontWeight: '700', fontFamily: typography.fontFamily }}>
                  Later
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  )
}
