import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { ProfileField } from '@/features/shared/ui/ProfileField'
import { colors, palette, radii, spacing, typography } from '@/features/core/theme'
import { useCreatorProfile, useUpdateCreatorProfile } from '@/features/profile/hooks'
import { CreatorProfile } from '@/features/core/types'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { PhoneInput } from '@/features/profile/ui/PhoneInput'
import { ProfileCompletionCard } from '@/features/profile/ui/ProfileCompletionCard'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CATEGORY_OPTIONS, GENDER_OPTIONS, SWEDISH_COUNTIES, SWEDISH_MUNICIPALITIES } from '@/features/profile/location-data'

type SectionId = 'avatar' | 'account' | 'social' | 'personal' | 'location' | 'categories'
const stripHandleInput = (value: string) => value.replace(/^@+/, '')

function asForm(profile?: CreatorProfile | null) {
  const code = profile?.phoneCountryCode || '+46'
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
    country: profile?.country || '',
    countryCode: profile?.country?.toLowerCase() === 'sweden' ? 'SE' : '',
    county: profile?.county || '',
    city: profile?.city || '',
    primaryCategory: profile?.primaryCategory || '',
    secondaryCategory: profile?.secondaryCategory || '',
    avatarUrl: profile?.avatarUrl || '',
  }
}

function calcCompletion(form: ReturnType<typeof asForm>) {
  const checks = [
    { id: 'avatar', label: 'Upload profile photo', done: Boolean(form.avatarUrl.trim()) },
    { id: 'personal', label: 'Add your age', done: Boolean(form.ageRange.trim()) },
    { id: 'categories', label: 'Choose a primary category', done: Boolean(form.primaryCategory.trim()) },
    { id: 'personal', label: 'Select your gender', done: Boolean(form.gender.trim()) },
    { id: 'location', label: 'Add your country', done: Boolean(form.country.trim()) },
    { id: 'account', label: 'Add phone number', done: Boolean(form.phoneDigits.trim()) },
  ] as const

  const completed = checks.filter((item) => item.done).length
  return {
    percentage: Math.round((completed / checks.length) * 100),
    items: checks,
  }
}

export function SettingsForm() {
  const { data, isLoading, error } = useCreatorProfile()
  const updateMutation = useUpdateCreatorProfile()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(asForm())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showToast, setShowToast] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const sectionYRef = useRef<Record<SectionId, number>>({
    avatar: 0,
    account: 0,
    social: 0,
    personal: 0,
    location: 0,
    categories: 0,
  })

  useEffect(() => {
    if (data) setForm(asForm(data))
  }, [data])

  const completion = useMemo(() => calcCompletion(form), [form])
  const isSweden = form.countryCode === 'SE' || form.country.trim().toLowerCase() === 'sweden'
  const countyOptions = useMemo(() => SWEDISH_COUNTIES.map((county) => ({ label: county, value: county })), [])
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

      {!isLoading && data && completion.percentage < 100 ? (
        <ProfileCompletionCard
          percentage={completion.percentage}
          items={completion.items}
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
            savedPhone={data?.phone}
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
                  county: countryChanged ? '' : prev.county,
                  city: countryChanged ? '' : prev.city,
                }
              })
            }
          />

          {isSweden ? (
            <SelectPopover
              label="County (Län)"
              value={form.county}
              placeholder="Select county"
              options={countyOptions}
              onSelect={(county) => setForm((prev) => ({ ...prev, county, city: '' }))}
            />
          ) : null}

          {isSweden && form.county ? (
            <SelectPopover
              label="City"
              value={form.city}
              placeholder="Select city"
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

      <Pressable
        onPress={handleSave}
        disabled={updateMutation.isPending}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.button,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          marginTop: spacing.xs,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: typography.fontFamily }}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Text>
      </Pressable>

      <SectionCard>
        <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 20, fontFamily: typography.fontFamily }}>Danger Zone</Text>
        <Text style={{ color: palette.textMuted, fontSize: 14, fontFamily: typography.fontFamily, lineHeight: 20 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setDeleteModalOpen(true)}
            style={{
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
              borderRadius: radii.input,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.destructive, fontWeight: '600', fontSize: 14, fontFamily: typography.fontFamily }}>Delete Account</Text>
          </Pressable>
          <Pressable
            onPress={handleSignOut}
            style={{
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.8)',
              borderRadius: radii.input,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14, fontFamily: typography.fontFamily }}>Log Out</Text>
          </Pressable>
        </View>
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
