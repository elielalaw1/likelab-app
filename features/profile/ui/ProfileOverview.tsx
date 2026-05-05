import { useApplications } from '@/features/applications/hooks'
import { typography } from '@/features/core/theme'
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
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

export function ProfileOverview() {
  const { colors, palette } = useTheme()
  const { data: profile, isLoading: profileLoading, error: profileError } = useCreatorProfile()
  const { data: applicationsData } = useApplications()
  const { data: deliverables } = useDeliverables()
  const queryClient = useQueryClient()
  const [avatarOpen, setAvatarOpen] = useState(false)

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
    <Screen>
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
    </Screen>
  )
}
