import { useApplications } from '@/features/applications/hooks'
import { radii, screenGradients, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables } from '@/features/deliverables/hooks'
import { useCreatorProfile } from '@/features/profile/hooks'
import { AvatarPreviewModal } from '@/features/profile/ui/AvatarPreviewModal'
import { ProfileCollaborations } from '@/features/profile/ui/ProfileCollaborations'
import { ProfileHero } from '@/features/profile/ui/ProfileHero'
import { ProfileStats } from '@/features/profile/ui/ProfileStats'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { Screen } from '@/features/shared/ui/Screen'
import { supabase } from '@/lib/supabase'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'

export function ProfileOverview() {
  const { colors, palette } = useTheme()
  const { data: profile, isLoading: profileLoading, error: profileError } = useCreatorProfile()
  const { data: applicationsData } = useApplications()
  const { data: deliverables } = useDeliverables()
  const queryClient = useQueryClient()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const acceptedCampaigns = useMemo(() => {
    const acceptedApplications = (applicationsData?.applications || []).filter((item) => item.status === 'accepted')
    const byCampaign = new Map<string, (typeof acceptedApplications)[number]>()
    for (const item of acceptedApplications) {
      if (!byCampaign.has(item.campaignId)) byCampaign.set(item.campaignId, item)
    }
    return Array.from(byCampaign.values()).map((item) => ({
      id: item.campaignId,
      title: item.campaignTitle,
      brandName: item.campaignBrandName || null,
      coverImageUrl: item.campaignImageUrl || null,
      rewardAmount: item.rewardAmount || null,
      rewardType: item.rewardType || null,
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      creatorApplicationStatus: item.status,
    }))
  }, [applicationsData?.applications])

  const stats = useMemo(() => {
    const applications = applicationsData?.applications || []
    return {
      activeCampaignsCount: applications.filter((item) => item.status === 'accepted').length,
      applicationsCount: applications.length,
      deliverablesCount: (deliverables || []).length,
    }
  }, [applicationsData?.applications, deliverables])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    router.replace('/login')
  }

  return (
    <Screen gradient={screenGradients.profile}>
      <AppHeader />

      {profileLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {profileError ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load creator profile.</Text> : null}

      {profile ? (
        <>
          <ProfileHero profile={profile} onAvatarPress={() => setAvatarOpen(true)} />

          <ProfileStats
            activeCampaignsCount={stats.activeCampaignsCount}
            applicationsCount={stats.applicationsCount}
            deliverablesCount={stats.deliverablesCount}
            onPressActive={() => router.push({ pathname: '/(tabs)/applications', params: { filter: 'accepted' } })}
            onPressApplications={() => router.push('/(tabs)/applications')}
            onPressDeliverables={() => router.push('/(tabs)/deliverables')}
          />

          {acceptedCampaigns.length > 0 ? (
            <ProfileCollaborations items={acceptedCampaigns} />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 2 }}>
              <LiquidButton
                label="Edit Profile"
                onPress={() => router.push('/settings')}
                minHeight={50}
                borderRadius={18}
                icon={<MaterialCommunityIcons name="account-edit-outline" size={18} color="#fff" />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <LiquidButton
                label="Log Out"
                onPress={handleSignOut}
                minHeight={50}
                borderRadius={18}
                tone="neutral"
                icon={<MaterialCommunityIcons name="logout-variant" size={17} color={palette.textMuted} />}
              />
            </View>
          </View>

          <AvatarPreviewModal visible={avatarOpen} uri={profile.avatarUrl || undefined} onClose={() => setAvatarOpen(false)} />
        </>
      ) : null}

      <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: palette.borderSoft, overflow: 'hidden', marginTop: 8 }}>
        <Pressable
          onPress={() => setContactOpen((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700' }}>
            Contact Us
          </Text>
          <MaterialCommunityIcons name={contactOpen ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textMuted} />
        </Pressable>
        {contactOpen ? (
          <>
            {[
              { icon: 'email-outline', label: 'Email', sub: 'info@likelab.io', url: 'mailto:info@likelab.io' },
              { icon: 'phone-outline', label: 'Phone', sub: '040-614 31 60', url: 'tel:+46406143160' },
              { icon: 'instagram', label: 'Instagram', sub: '@likelab', url: 'https://instagram.com/likelab' },
              { icon: 'linkedin', label: 'LinkedIn', sub: 'likelab-io', url: 'https://www.linkedin.com/company/likelab-io' },
            ].map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => Linking.openURL(item.url)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderTopWidth: 1,
                  borderColor: palette.borderSoft,
                }}
              >
                <MaterialCommunityIcons name={item.icon as any} size={20} color={palette.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>{item.sub}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  )
}
