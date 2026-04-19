import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { ProfileField } from '@/features/shared/ui/ProfileField'
import { colors, palette, radii, spacing, typography } from '@/features/core/theme'
import { useCreatorProfile, useUpdateCreatorProfile } from '@/features/profile/hooks'
import { CreatorProfile } from '@/features/core/types'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { PhoneInput } from '@/features/profile/ui/PhoneInput'
import { ProfileCompletionCard } from '@/features/profile/ui/ProfileCompletionCard'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CATEGORY_OPTIONS, COUNTRY_TO_PHONE_CODE, GENDER_OPTIONS, SWEDISH_COUNTIES, SWEDISH_MUNICIPALITIES, findCountryByValue, formatCountyLabel } from '@/features/profile/location-data'
import { ProfileCompletionSection, getProfileCompletion } from '@/features/profile/completion'

type SectionId = 'avatar' | 'account' | 'social' | 'personal' | 'location' | 'categories' | 'shipping'
const stripHandleInput = (value: string) => value.replace(/^@+/, '')

function asForm(profile?: CreatorProfile | null) {
  const resolvedCountry = profile?.country || ''
  const resolvedCountryCode = findCountryByValue(resolvedCountry)?.code || ''
  const code = profile?.phoneCountryCode || ''
  const rawPhone = profile?.phone || ''
  const digits = rawPhone.startsWith(code) ? rawPhone.slice(code.length).replace(/[^\d]/g, '') : rawPhone.replace(/[^\d]/g, '')

  return {
    displayName: profile?.displayName || '',
    phoneCountryCode: code,
    phoneDigits: digits,
    tiktokHandle: profile?.tiktokHandle || '',
    instagramHandle: profile?.instagramHandle || '',
    gender: profile?.gender || '',
    ageRange: profile?.ageRange || '',
    country: resolvedCountry,
    countryCode: resolvedCountryCode,
    county: profile?.county || '',
    city: profile?.city || '',
    address: profile?.address || '',
    postalCode: profile?.postalCode || '',
    primaryCategory: profile?.primaryCategory || '',
    secondaryCategory: profile?.secondaryCategory || '',
    avatarUrl: profile?.avatarUrl || '',
  }
}

type Props = {
  focusSection?: string
  onboarding?: string
}

export function SettingsForm({ focusSection, onboarding }: Props) {
  const { data, isLoading, error } = useCreatorProfile()
  const updateMutation = useUpdateCreatorProfile()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(asForm())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showToast, setShowToast] = useState('')
  const hasLoadedRef = useRef(false)
  const hasFocusedRef = useRef(false)
  const scrollRef = useRef<ScrollView>(null)
  const sectionYRef = useRef<Record<SectionId, number>>({
    avatar: 0,
    account: 0,
    social: 0,
    personal: 0,
    location: 0,
    categories: 0,
    shipping: 0,
  })

  useEffect(() => {
    if (data && !hasLoadedRef.current) {
      setForm(asForm(data))
      hasLoadedRef.current = true
    }
  }, [data])

  const completion = useMemo(
    () =>
      getProfileCompletion({
        id: data?.id || '',
        completionPercentage: 0,
        approved: false,
        email: data?.email,
        displayName: form.displayName,
        phoneCountryCode: form.phoneCountryCode,
        phone: form.phoneDigits.trim() ? `${form.phoneCountryCode}${form.phoneDigits}` : '',
        tiktokHandle: form.tiktokHandle,
        instagramHandle: form.instagramHandle,
        gender: form.gender,
        ageRange: form.ageRange,
        country: form.country,
        county: form.county,
        city: form.city,
        address: form.address,
        postalCode: form.postalCode,
        primaryCategory: form.primaryCategory,
        secondaryCategory: form.secondaryCategory,
        avatarUrl: form.avatarUrl,
        reviewStatus: data?.reviewStatus,
      }),
    [data?.email, data?.id, data?.reviewStatus, form]
  )
  const isSweden = form.countryCode === 'SE' || form.country.trim().toLowerCase() === 'sweden'
  const countyOptions = useMemo(() => SWEDISH_COUNTIES.map((county) => ({ label: formatCountyLabel(county), value: county })), [])
  const cityOptions = useMemo(
    () => (isSweden && form.county ? (SWEDISH_MUNICIPALITIES[form.county] || []).map((city) => ({ label: city, value: city })) : []),
    [isSweden, form.county]
  )
  const secondaryCategoryOptions = useMemo(
    () => [{ label: 'None', value: '__none' }, ...CATEGORY_OPTIONS.filter((item) => item.value !== form.primaryCategory)],
    [form.primaryCategory]
  )

  const markSectionY = (id: SectionId) => (event: LayoutChangeEvent) => {
    sectionYRef.current[id] = event.nativeEvent.layout.y
  }

  const scrollToSection = (id: SectionId) => {
    const y = Math.max(0, (sectionYRef.current[id] || 0) - 8)
    scrollRef.current?.scrollTo({ y, animated: true })
  }

  useEffect(() => {
    if (hasFocusedRef.current || !focusSection) return
    const section = focusSection as ProfileCompletionSection
    const validSections: SectionId[] = ['avatar', 'account', 'social', 'personal', 'location', 'categories', 'shipping']
    if (!validSections.includes(section)) return

    const timer = setTimeout(() => {
      scrollToSection(section)
      hasFocusedRef.current = true
    }, 350)

    return () => clearTimeout(timer)
  }, [focusSection])

  const handlePickAvatar = async () => {
    if (!data?.id) {
      Alert.alert('Unavailable', 'Could not resolve user id for avatar upload.')
      return
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo library access to upload profile photo.')
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
      const extFromMime = result.assets[0].mimeType?.split('/')[1]
      const ext = (extFromMime || uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
      const path = `${data.id}/avatar.${ext}`
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()
      const contentType = result.assets[0].mimeType || `image/${ext}`

      setAvatarUploading(true)
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
        upsert: true,
        contentType,
      })
      if (uploadError) throw uploadError

      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const cacheBusted = `${publicUrl}?t=${Date.now()}`

      setForm((prev) => ({ ...prev, avatarUrl: cacheBusted }))
      await updateMutation.mutateAsync({ avatarUrl: cacheBusted })
      setShowToast('Avatar updated')
    } catch (uploadError) {
      Alert.alert('Upload failed', uploadError instanceof Error ? uploadError.message : 'Could not upload profile photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    const age = Number(form.ageRange)
    if (form.ageRange.trim() && (!Number.isFinite(age) || age < 15)) {
      Alert.alert('Invalid age', 'Age must be at least 15.')
      return
    }

    const phoneCombined = form.phoneDigits.trim() ? `${form.phoneCountryCode}${form.phoneDigits}` : ''

    try {
      await updateMutation.mutateAsync({
        displayName: form.displayName,
        phoneCountryCode: form.phoneCountryCode,
        phone: phoneCombined || null,
        tiktokHandle: form.tiktokHandle.replace(/^@+/, ''),
        instagramHandle: form.instagramHandle.replace(/^@+/, ''),
        gender: form.gender,
        ageRange: form.ageRange,
        country: form.country,
        county: form.county || null,
        city: form.city,
        primaryCategory: form.primaryCategory,
        secondaryCategory: form.secondaryCategory || null,
        avatarUrl: form.avatarUrl,
        address: form.address || null,
        postalCode: form.postalCode || null,
      })
      setShowToast('Profile updated')
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
    } catch (saveError) {
      Alert.alert('Save failed', saveError instanceof Error ? saveError.message : 'Could not save profile changes. Try again.')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    router.replace('/login')
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password required', 'Enter your current password to delete your account.')
      return
    }

    try {
      setDeleting(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error('No active session')

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Delete account failed')

      await supabase.auth.signOut()
      queryClient.clear()
      setDeleteModalOpen(false)
      setDeletePassword('')
      Alert.alert('Account deleted', 'Your account has been deleted.')
      router.replace('/login')
    } catch (deleteError) {
      Alert.alert('Delete failed', deleteError instanceof Error ? deleteError.message : 'Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Screen scrollRef={scrollRef}>
      <AppHeader />

      <Pressable
        onPress={() => router.push('/(tabs)/profile')}
        style={{
          alignSelf: 'flex-start',
          minHeight: 36,
          paddingHorizontal: 10,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.8)',
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <MaterialCommunityIcons name="arrow-left" size={16} color={palette.text} />
        <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600' }}>
          Back to Profile
        </Text>
      </Pressable>

      <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 2 }}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          Settings
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Manage your creator account and profile details
        </Text>
      </Animated.View>

      {showToast ? (
        <Pressable
          onPress={() => setShowToast('')}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(234,236,239,0.9)',
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }}>{showToast}</Text>
          <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
        </Pressable>
      ) : null}

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load your profile right now.</Text> : null}

      {onboarding === '1' ? (
        <SectionCard>
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '700' }}>
            Complete Your Profile
          </Text>
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 14, lineHeight: 20 }}>
            This is now the main onboarding flow. Fill in the missing sections below and save your changes to unlock the app.
          </Text>
        </SectionCard>
      ) : null}

      {!isLoading && data && completion.percentage < 100 ? (
        <ProfileCompletionCard
          percentage={completion.percentage}
          items={completion.checklist.map((item) => ({ id: item.section, label: item.label, done: item.done }))}
          onPressItem={(id) => scrollToSection(id)}
        />
      ) : null}

      <View onLayout={markSectionY('avatar')}>
        <SectionCard>
          <Pressable onPress={handlePickAvatar} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(234,236,239,0.9)' }}>
              <Image
                source={{
                  uri:
                    form.avatarUrl ||
                    'https://images.unsplash.com/photo-1542204625-de293a7b7c13?auto=format&fit=crop&w=200&q=80',
                }}
                style={{ width: '100%', height: '100%' }}
              />
              <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10,15,30,0.24)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="camera-outline" size={20} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: palette.text, fontFamily: typography.fontFamily }}>Profile Photo</Text>
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>
                {avatarUploading ? 'Uploading...' : 'Click to change'}
              </Text>
            </View>
          </Pressable>
        </SectionCard>
      </View>

      <View onLayout={markSectionY('account')}>
        <SectionCard title="Account">
          <ProfileField label="Email" value={data?.email || ''} editable={false} keyboardType="email-address" />
          <ProfileField
            label="Display Name"
            value={form.displayName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, displayName: value }))}
          />
          <PhoneInput
            code={form.phoneCountryCode}
            digits={form.phoneDigits}
            onChangeCode={(value) => setForm((prev) => ({ ...prev, phoneCountryCode: value }))}
            onChangeDigits={(value) => setForm((prev) => ({ ...prev, phoneDigits: value }))}
          />
        </SectionCard>
      </View>

      <View onLayout={markSectionY('social')}>
        <SectionCard title="Social">
          <ProfileField
            label="TikTok Handle"
            value={form.tiktokHandle}
            placeholder="yourtiktok"
            prefixText="@"
            sanitizeText={stripHandleInput}
            onChangeText={(value) => setForm((prev) => ({ ...prev, tiktokHandle: stripHandleInput(value) }))}
          />
          <ProfileField
            label="Instagram Handle"
            value={form.instagramHandle}
            placeholder="yourinstagram"
            prefixText="@"
            sanitizeText={stripHandleInput}
            onChangeText={(value) => setForm((prev) => ({ ...prev, instagramHandle: stripHandleInput(value) }))}
          />
        </SectionCard>
      </View>

      <View onLayout={markSectionY('personal')}>
        <SectionCard title="Personal">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <SelectPopover
                label="Gender"
                value={form.gender}
                placeholder="Select"
                options={GENDER_OPTIONS}
                onSelect={(value) => setForm((prev) => ({ ...prev, gender: value }))}
              />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.formLabel,
                  fontWeight: '600',
                  letterSpacing: 0.88,
                  textTransform: 'uppercase',
                }}
              >
                Age
              </Text>
              <TextInput
                value={form.ageRange}
                onChangeText={(value) => setForm((prev) => ({ ...prev, ageRange: value.replace(/[^\d]/g, '') }))}
                keyboardType="numeric"
                placeholder="Your age"
                placeholderTextColor={colors.mutedForeground}
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(234,236,239,0.8)',
                  borderRadius: radii.input,
                  height: 40,
                  backgroundColor: colors.background,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  color: colors.foreground,
                  fontFamily: typography.fontFamily,
                }}
              />
            </View>
          </View>
        </SectionCard>
      </View>

      <View onLayout={markSectionY('location')}>
        <SectionCard title="Location">
          <CountrySelect
            value={form.country}
            onSelect={(countryName, countryCode) =>
              setForm((prev) => {
                const countryChanged = prev.country !== countryName
                return {
                  ...prev,
                  country: countryName,
                  countryCode,
                  phoneCountryCode: prev.phoneCountryCode || COUNTRY_TO_PHONE_CODE[countryCode] || '',
                  county: countryChanged ? '' : prev.county,
                  city: countryChanged ? '' : prev.city,
                }
              })
            }
          />

          {isSweden ? (
            <SelectPopover
              label="County"
              value={form.county}
              placeholder="Select county"
              options={countyOptions}
              onSelect={(county) => setForm((prev) => ({ ...prev, county, city: '' }))}
            />
          ) : null}

          {isSweden ? (
            <SelectPopover
              label="City"
              value={form.city}
              placeholder={form.county ? 'Select city' : 'Select county first'}
              searchable
              options={cityOptions}
              onSelect={(city) => setForm((prev) => ({ ...prev, city }))}
            />
          ) : (
            <ProfileField
              label="City"
              value={form.city}
              placeholder="Your city"
              onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
            />
          )}
        </SectionCard>
      </View>

      <View onLayout={markSectionY('categories')}>
        <SectionCard title="Categories">
          <SelectPopover
            label="Primary Category"
            value={form.primaryCategory}
            placeholder="Select category"
            options={CATEGORY_OPTIONS}
            onSelect={(primaryCategory) =>
              setForm((prev) => ({
                ...prev,
                primaryCategory,
                secondaryCategory: prev.secondaryCategory === primaryCategory ? '' : prev.secondaryCategory,
              }))
            }
          />
          <SelectPopover
            label="Secondary Category"
            value={form.secondaryCategory || '__none'}
            options={secondaryCategoryOptions}
            onSelect={(value) => setForm((prev) => ({ ...prev, secondaryCategory: value === '__none' ? '' : value }))}
          />
        </SectionCard>
      </View>

      <View onLayout={markSectionY('shipping')}>
        <SectionCard title="Shipping Address">
          <ProfileField
            label="Street Address"
            value={form.address}
            placeholder="Street address"
            onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
          />
          <ProfileField
            label="Postal Code"
            value={form.postalCode}
            placeholder="e.g. 11234"
            keyboardType="numeric"
            onChangeText={(value) => setForm((prev) => ({ ...prev, postalCode: value.replace(/[^\d]/g, '') }))}
          />
        </SectionCard>
      </View>

      <LiquidButton
        label={updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        onPress={handleSave}
        disabled={updateMutation.isPending}
        minHeight={44}
        borderRadius={radii.button}
        style={{ marginTop: spacing.xs }}
      />

      <SectionCard>
        <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 20, fontFamily: typography.fontFamily }}>Danger Zone</Text>
        <Text style={{ color: palette.textMuted, fontSize: 14, fontFamily: typography.fontFamily, lineHeight: 20 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <LiquidButton
            label="Delete Account"
            onPress={() => setDeleteModalOpen(true)}
            tone="danger"
            minHeight={44}
            borderRadius={radii.input}
            style={{ flex: 1 }}
          />
          <LiquidButton
            label="Log Out"
            onPress={handleSignOut}
            tone="neutral"
            minHeight={44}
            borderRadius={radii.input}
            style={{ flex: 1 }}
          />
        </View>
      </SectionCard>

      <SectionCard title="Legal">
        <Pressable
          onPress={() => Linking.openURL('https://likelab.io/privacy-policy')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14 }}>Privacy Policy</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={palette.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL('https://likelab.io/terms-of-service')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14 }}>Terms of Service</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={palette.textMuted} />
        </Pressable>
      </SectionCard>

      <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
        <Pressable onPress={() => setDeleteModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.3)', justifyContent: 'center', padding: 16 }}>
          <Pressable
            onPress={() => undefined}
            style={{
              borderRadius: 16,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.8)',
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 16, color: palette.text }}>
              Confirm Account Deletion
            </Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: palette.textMuted }}>
              Enter your current password to permanently delete your account.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={palette.textMuted}
              style={{
                height: 44,
                borderWidth: 1,
                borderColor: 'rgba(234,236,239,0.8)',
                borderRadius: radii.input,
                paddingHorizontal: 12,
                color: palette.text,
                fontFamily: typography.fontFamily,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => setDeleteModalOpen(false)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.input, borderWidth: 1, borderColor: 'rgba(234,236,239,0.8)' }}
              >
                <Text style={{ fontFamily: typography.fontFamily, color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radii.input,
                  backgroundColor: colors.destructive,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Text style={{ fontFamily: typography.fontFamily, color: '#fff', fontWeight: '600' }}>{deleting ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}
