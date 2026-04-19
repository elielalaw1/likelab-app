import { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useCreatorProfile, useUpdateCreatorProfile } from '@/features/profile/hooks'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { PhoneInput } from '@/features/profile/ui/PhoneInput'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { colors, palette, radii, typography } from '@/features/core/theme'
import {
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  SWEDISH_COUNTIES,
  SWEDISH_MUNICIPALITIES,
  findCountryByValue,
  formatCountyLabel,
} from '@/features/profile/location-data'

const STEP_TITLES = ['Profile Photo', 'Personal Info', 'Content Category', 'Location', 'Contact', 'Shipping']
const STEP_COUNT = STEP_TITLES.length

type Props = {
  visible: boolean
  onClose: () => void
  userId: string
}

export function ProfileWizardModal({ visible, onClose, userId }: Props) {
  const { data: profile } = useCreatorProfile()
  const updateMutation = useUpdateCreatorProfile()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [primaryCategory, setPrimaryCategory] = useState('')
  const [secondaryCategory, setSecondaryCategory] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [county, setCounty] = useState('')
  const [city, setCity] = useState('')
  const [phoneCode, setPhoneCode] = useState('+46')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')

  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])

  useEffect(() => {
    if (!profile) return
    setAvatarUrl(profile.avatarUrl || '')
    setAgeRange(profile.ageRange || '')
    setGender(profile.gender || '')
    setPrimaryCategory(profile.primaryCategory || '')
    setSecondaryCategory(profile.secondaryCategory || '')
    setCountry(profile.country || '')
    setCountryCode(findCountryByValue(profile.country)?.code || '')
    setCounty(profile.county || '')
    setCity(profile.city || '')
    const code = profile.phoneCountryCode || '+46'
    const raw = profile.phone || ''
    setPhoneCode(code)
    setPhoneDigits(raw.startsWith(code) ? raw.slice(code.length).replace(/[^\d]/g, '') : raw.replace(/[^\d]/g, ''))
    setAddress(profile.address || '')
    setPostalCode(profile.postalCode || '')
  }, [profile])

  const isSweden = countryCode === 'SE'
  const countyOptions = useMemo(() => SWEDISH_COUNTIES.map((c) => ({ label: formatCountyLabel(c), value: c })), [])
  const cityOptions = useMemo(
    () => (isSweden && county ? (SWEDISH_MUNICIPALITIES[county] || []).map((c) => ({ label: c, value: c })) : []),
    [isSweden, county]
  )
  const secondaryCategoryOptions = useMemo(
    () => [{ label: 'None', value: '__none' }, ...CATEGORY_OPTIONS.filter((item) => item.value !== primaryCategory)],
    [primaryCategory]
  )

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload your profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]?.uri) return
    const uri = result.assets[0].uri
    try {
      setAvatarUploading(true)
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/avatar.${ext}`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`)
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload photo')
    } finally {
      setAvatarUploading(false)
    }
  }

  const saveCurrentStep = async () => {
    setSaving(true)
    try {
      if (step === 0) await updateMutation.mutateAsync({ avatarUrl })
      else if (step === 1) await updateMutation.mutateAsync({ ageRange, gender })
      else if (step === 2) await updateMutation.mutateAsync({ primaryCategory, secondaryCategory: secondaryCategory === '__none' ? '' : secondaryCategory })
      else if (step === 3) await updateMutation.mutateAsync({ country, county, city })
      else if (step === 4) await updateMutation.mutateAsync({ phone: phoneDigits ? `${phoneCode}${phoneDigits}` : '', phoneCountryCode: phoneCode })
      else if (step === 5) await updateMutation.mutateAsync({ address, postalCode })
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save')
      setSaving(false)
      return
    }
    setSaving(false)
    if (step < STEP_COUNT - 1) setStep((s) => s + 1)
    else onClose()
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: 'rgba(234,236,239,0.8)',
    borderRadius: radii.input,
    height: 44,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.background,
  } as const

  const labelStyle = {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.88,
    textTransform: 'uppercase' as const,
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {/* Header */}
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(234,236,239,0.8)' }}>
          <View>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Step {step + 1} of {STEP_COUNT}
            </Text>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', marginTop: 2 }}>
              {STEP_TITLES[step]}
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingTop: 14 }}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? colors.primary : 'rgba(234,236,239,0.9)' }} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {step === 0 && (
            <View style={{ alignItems: 'center', gap: 16, paddingTop: 16 }}>
              <Pressable onPress={pickAvatar} style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: avatarUrl ? colors.primary : 'rgba(139,92,246,0.24)', borderStyle: 'dashed', overflow: 'hidden', backgroundColor: 'rgba(139,92,246,0.06)' }}>
                {avatarUrl
                  ? <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100 }} contentFit="cover" />
                  : <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />}
              </Pressable>
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>
                {avatarUploading ? 'Uploading…' : 'Tap to upload a profile photo'}
              </Text>
            </View>
          )}

          {step === 1 && (
            <View style={{ gap: 20 }}>
              <View style={{ gap: 8 }}>
                <Text style={labelStyle}>Age</Text>
                <TextInput value={ageRange} onChangeText={(v) => setAgeRange(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="e.g. 23" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
              </View>
              <SelectPopover label="Gender" value={gender} options={GENDER_OPTIONS} placeholder="Select gender" onSelect={setGender} />
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: 20 }}>
              <SelectPopover label="Primary Category" value={primaryCategory} options={CATEGORY_OPTIONS} placeholder="Select category" onSelect={setPrimaryCategory} />
              <SelectPopover label="Secondary Category (optional)" value={secondaryCategory} options={secondaryCategoryOptions} placeholder="None" onSelect={setSecondaryCategory} />
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: 20 }}>
              <CountrySelect value={country} onSelect={(name, code) => { setCountry(name); setCountryCode(code); setCounty(''); setCity('') }} />
              {isSweden && <SelectPopover label="County" value={county} options={countyOptions} placeholder="Select county" onSelect={(v) => { setCounty(v); setCity('') }} searchable />}
              {isSweden && county
                ? <SelectPopover label="City" value={city} options={cityOptions} placeholder="Select city" onSelect={setCity} />
                : !isSweden
                  ? <View style={{ gap: 8 }}><Text style={labelStyle}>City</Text><TextInput value={city} onChangeText={setCity} placeholder="Enter city" placeholderTextColor={colors.mutedForeground} style={inputStyle} /></View>
                  : null}
            </View>
          )}

          {step === 4 && (
            <PhoneInput code={phoneCode} digits={phoneDigits} onChangeCode={setPhoneCode} onChangeDigits={setPhoneDigits} />
          )}

          {step === 5 && (
            <View style={{ gap: 20 }}>
              <View style={{ gap: 8 }}>
                <Text style={labelStyle}>Address</Text>
                <TextInput value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={labelStyle}>Postal Code</Text>
                <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="e.g. 11234" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={inputStyle} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={{ padding: 20, paddingBottom: 34, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(234,236,239,0.8)' }}>
          <LiquidButton
            label={saving ? 'Saving…' : step < STEP_COUNT - 1 ? 'Next' : 'Done'}
            onPress={saveCurrentStep}
            disabled={saving || avatarUploading}
            minHeight={50}
            borderRadius={radii.button}
          />
          {step > 0 && (
            <Pressable onPress={() => setStep((s) => s - 1)} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 14 }}>Back</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  )
}
