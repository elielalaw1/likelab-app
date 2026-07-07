import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { signOutCreator } from '@/features/shared/hooks/useAuthSession'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { ProfileField } from '@/features/shared/ui/ProfileField'
import { radii, redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useCreatorProfile, useUpdateCreatorProfile } from '@/features/profile/hooks'
import { CreatorProfile } from '@/features/core/types'
import { CountrySelect } from '@/features/profile/ui/CountrySelect'
import { PhoneInput } from '@/features/profile/ui/PhoneInput'
import { ProfileCompletionCard } from '@/features/profile/ui/ProfileCompletionCard'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'
import { CATEGORY_OPTIONS, COUNTRY_TO_PHONE_CODE, GENDER_OPTIONS, SWEDISH_COUNTIES, SWEDISH_MUNICIPALITIES, findCountryByValue, formatCountyLabel } from '@/features/profile/location-data'
import { ProfileCompletionSection, getProfileCompletion } from '@/features/profile/completion'
import { connectTikTokAccount, disconnectTikTokAccount } from '@/features/auth/tiktok'
import { replayTutorial } from '@/features/onboarding/tutorialControl'
import { haptic } from '@/features/shared/haptics'

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
    // Preserve a leading '+' when the country code couldn't be inferred, so saving
    // doesn't permanently drop it from the stored number.
    phoneHadPlus: !code && rawPhone.trim().startsWith('+'),
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

function SectionHeader({ children, tint }: { children: string; tint?: string }) {
  return (
    <Text
      style={{
        marginLeft: 4,
        color: tint || redesign.color.faint,
        fontFamily: typography.fontFamily,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  )
}

export function SettingsForm({ focusSection, onboarding }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { data, isLoading, error } = useCreatorProfile()
  const updateMutation = useUpdateCreatorProfile()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(asForm())
  const [connectingTikTok, setConnectingTikTok] = useState(false)
  const [disconnectingTikTok, setDisconnectingTikTok] = useState(false)
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
        // Names aren't editable on this screen, so read them from the loaded
        // profile — otherwise the checklist's first/last-name items stay unchecked
        // and the completion card is permanently stuck at ≤80%.
        firstName: data?.firstName,
        lastName: data?.lastName,
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

  // Avatar lives inside the Account card now — scroll there for the avatar item.
  const SECTION_ALIAS: Record<SectionId, SectionId> = {
    avatar: 'account', account: 'account', social: 'social',
    personal: 'personal', categories: 'personal',
    location: 'location', shipping: 'location',
  }
  const scrollToSection = (id: SectionId) => {
    const y = Math.max(0, (sectionYRef.current[SECTION_ALIAS[id]] || 0) - 8)
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

      const asset = result.assets[0]
      const uri = asset.uri
      const extFromMime = asset.mimeType?.split('/')[1]
      const ext = (extFromMime || uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
      const contentType = asset.mimeType || `image/${ext}`
      const path = `${data.id}/avatar.${ext}`

      setAvatarUploading(true)
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()
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
    // Guard against saving the empty initial form before the profile has loaded
    // (or after a load error) — that would upsert blank values over every field.
    if (!data) return
    const age = Number(form.ageRange)
    if (form.ageRange.trim() && (!Number.isFinite(age) || age < 15)) {
      Alert.alert('Invalid age', 'Age must be at least 15.')
      return
    }

    const phoneCombined = form.phoneDigits.trim()
      ? `${form.phoneCountryCode || (form.phoneHadPlus ? '+' : '')}${form.phoneDigits}`
      : ''

    try {
      await updateMutation.mutateAsync({
        displayName: form.displayName,
        phoneCountryCode: form.phoneCountryCode,
        phone: phoneCombined || null,
        // tiktokHandle is server-managed via connect/disconnect (no editable input
        // here) — never include it in the save snapshot or it nulls the synced
        // handle whenever the user saves any other field.
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

  const handleConnectTikTok = useCallback(async () => {
    setConnectingTikTok(true)
    try {
      const result = await connectTikTokAccount()
      if (result) {
        await queryClient.refetchQueries({ queryKey: ['creator-profile'] })
        setShowToast('TikTok connected')
      }
    } catch (connectError) {
      Alert.alert(
        'Connection failed',
        connectError instanceof Error ? connectError.message : 'Could not connect your TikTok account. Please try again.'
      )
    } finally {
      setConnectingTikTok(false)
    }
  }, [queryClient])

  const handleDisconnectTikTok = useCallback(() => {
    Alert.alert(
      'Disconnect TikTok?',
      'You will need to reconnect TikTok before you can use campaigns and deliverables again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setDisconnectingTikTok(true)
            try {
              await disconnectTikTokAccount()
              await queryClient.refetchQueries({ queryKey: ['creator-profile'] })
            } catch (disconnectError) {
              Alert.alert(
                'Disconnect failed',
                disconnectError instanceof Error ? disconnectError.message : 'Could not disconnect your TikTok account. Please try again.'
              )
            } finally {
              setDisconnectingTikTok(false)
            }
          },
        },
      ],
    )
  }, [queryClient])

  const handleSignOut = async () => {
    await signOutCreator()
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

  const stickySave = (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: -insets.bottom }}>
      <View
        style={{
          backgroundColor: redesign.color.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: redesign.color.hairlineStrong,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          ...redesign.shadow.stickyUp,
        }}
      >
        <LiquidButton
          label={updateMutation.isPending ? 'Saving…' : 'Save changes'}
          onPress={handleSave}
          disabled={updateMutation.isPending || !data}
          minHeight={52}
        />
      </View>
    </View>
  )

  return (
    <Screen scrollRef={scrollRef} bgColor={redesign.color.bg} overlay={stickySave} overlayPadding={96} contentGap={16}>
      <AppHeader />

      <Pressable
        onPress={() => router.push('/(tabs)/profile')}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
        hitSlop={8}
      >
        <MaterialCommunityIcons name="chevron-left" size={18} color={redesign.color.muted} />
        <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600' }}>
          Profile
        </Text>
      </Pressable>

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Settings
        </Text>
        <Text style={{ color: redesign.color.muted, fontSize: 14.5, fontWeight: '500', fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Manage your creator account and profile details
        </Text>
      </Animated.View>

      {showToast ? (
        <Pressable
          onPress={() => setShowToast('')}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: redesign.color.hairlineStrong,
            backgroundColor: redesign.color.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }}>{showToast}</Text>
          <MaterialCommunityIcons name="close" size={18} color={redesign.color.muted} />
        </Pressable>
      ) : null}

      {isLoading ? <ActivityIndicator color={redesign.color.purple} /> : null}
      {error ? <Text style={{ color: redesign.color.muted, fontSize: 12 }}>Could not load your profile right now.</Text> : null}

      {onboarding === '1' ? (
        <SectionCard>
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '700' }}>
            Complete your profile
          </Text>
          <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 14, lineHeight: 20 }}>
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

      <View onLayout={markSectionY('account')} style={{ gap: 8 }}>
        <SectionHeader>Account</SectionHeader>
        <SectionCard>
          <Pressable onPress={() => { haptic.selection(); handlePickAvatar() }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: redesign.color.hairlineStrong, backgroundColor: 'rgba(99,80,184,0.08)' }}>
              {form.avatarUrl ? (
                <Image source={{ uri: form.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : null}
              <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10,15,30,0.24)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="camera-outline" size={18} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2, fontFamily: typography.fontFamily }}>Profile photo</Text>
              <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500' }}>
                {avatarUploading ? 'Uploading…' : 'Tap to change'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
          </Pressable>
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

      <View onLayout={markSectionY('social')} style={{ gap: 8 }}>
        <SectionHeader>Social</SectionHeader>
        <SectionCard>
          <ProfileField
            label="Instagram Handle"
            value={form.instagramHandle}
            placeholder="yourinstagram"
            prefixText="@"
            sanitizeText={stripHandleInput}
            onChangeText={(value) => setForm((prev) => ({ ...prev, instagramHandle: stripHandleInput(value) }))}
          />
          <Pressable
            onPress={() => { haptic.medium(); handleConnectTikTok() }}
            disabled={connectingTikTok || disconnectingTikTok}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: radii.button,
              backgroundColor: '#000',
              opacity: connectingTikTok || disconnectingTikTok ? 0.6 : 1,
            }}
          >
            {connectingTikTok ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesome5 name="tiktok" size={16} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: typography.sizes.button, fontWeight: '700' }}>
              {connectingTikTok ? 'Connecting...' : data?.tiktokConnected ? 'Reconnect TikTok' : 'Connect TikTok'}
            </Text>
          </Pressable>
          {data?.tiktokConnected ? (
            <Pressable
              onPress={() => { haptic.warning(); handleDisconnectTikTok() }}
              disabled={connectingTikTok || disconnectingTikTok}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: radii.button,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#DC2626',
                opacity: connectingTikTok || disconnectingTikTok ? 0.6 : 1,
              }}
            >
              {disconnectingTikTok ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : null}
              <Text style={{ color: '#DC2626', fontFamily: typography.fontFamily, fontSize: typography.sizes.button, fontWeight: '700' }}>
                {disconnectingTikTok ? 'Disconnecting...' : 'Disconnect TikTok'}
              </Text>
            </Pressable>
          ) : null}
        </SectionCard>
      </View>

      <View onLayout={markSectionY('personal')} style={{ gap: 8 }}>
        <SectionHeader>About you</SectionHeader>
        <SectionCard>
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
            <View style={{ flex: 1 }}>
              <ProfileField
                label="Age"
                value={form.ageRange}
                placeholder="Your age"
                keyboardType="numeric"
                onChangeText={(value) => setForm((prev) => ({ ...prev, ageRange: value.replace(/[^\d]/g, '') }))}
              />
            </View>
          </View>
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

      <View onLayout={markSectionY('location')} style={{ gap: 8 }}>
        <SectionHeader>Location &amp; shipping</SectionHeader>
        <SectionCard>
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

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: redesign.color.hairlineStrong, marginVertical: 2 }} />

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

      <View style={{ gap: 8 }}>
        <SectionHeader tint={colors.destructive}>Danger zone</SectionHeader>
        <SectionCard>
        <Text style={{ color: redesign.color.muted, fontSize: 13.5, fontFamily: typography.fontFamily, lineHeight: 20 }}>
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
      </View>

      <View style={{ gap: 8 }}>
        <SectionHeader>Legal</SectionHeader>
        <SectionCard>
        <Pressable
          onPress={() => Linking.openURL('https://likelab.io/privacy-policy')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
        >
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500' }}>Privacy Policy</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={redesign.color.muted} />
        </Pressable>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: redesign.color.hairlineStrong }} />
        <Pressable
          onPress={() => Linking.openURL('https://likelab.io/terms-of-service')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
        >
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500' }}>Terms of Service</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={redesign.color.muted} />
        </Pressable>
        </SectionCard>
      </View>

      <View style={{ gap: 8 }}>
        <SectionHeader>Help</SectionHeader>
        <SectionCard>
          <Pressable
            onPress={() => { haptic.selection(); router.push('/(tabs)/profile'); setTimeout(() => replayTutorial(), 300) }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={redesign.color.purple} />
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500' }}>Replay tutorial</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={redesign.color.muted} />
          </Pressable>
        </SectionCard>
      </View>


      <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
        <Pressable onPress={() => setDeleteModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.3)', justifyContent: 'center', padding: 16 }}>
          <Pressable
            onPress={() => undefined}
            style={{
              borderRadius: 16,
              backgroundColor: redesign.color.card,
              borderWidth: 1,
              borderColor: redesign.color.hairlineStrong,
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 16, color: redesign.color.ink }}>
              Confirm account deletion
            </Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.muted }}>
              Enter your current password to permanently delete your account.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={redesign.color.muted}
              style={{
                height: 44,
                borderWidth: 1,
                borderColor: redesign.color.hairlineStrong,
                borderRadius: radii.input,
                paddingHorizontal: 12,
                color: redesign.color.ink,
                backgroundColor: redesign.color.card,
                fontFamily: typography.fontFamily,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => setDeleteModalOpen(false)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.input, borderWidth: 1, borderColor: redesign.color.hairlineStrong }}
              >
                <Text style={{ fontFamily: typography.fontFamily, color: redesign.color.ink }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { haptic.warning(); handleDeleteAccount() }}
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
