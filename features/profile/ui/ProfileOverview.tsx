import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { Screen } from '@/features/shared/ui/Screen'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { useApplications } from '@/features/applications/hooks'
import { useDeliverables } from '@/features/deliverables/hooks'
import { supabase } from '@/lib/supabase'
import { ProfileHero } from '@/features/profile/ui/ProfileHero'
import { ProfileStats } from '@/features/profile/ui/ProfileStats'
import { ProfileCollaborations } from '@/features/profile/ui/ProfileCollaborations'
import { AvatarPreviewModal } from '@/features/profile/ui/AvatarPreviewModal'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

export function ProfileOverview() {
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

      <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8 }}>
        <Text style={{ fontSize: 38, lineHeight: 42, fontWeight: '800', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -1 }}>
          Creator Profile
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 16, fontFamily: typography.fontFamily }}>
          Your public creator overview.
        </Text>
      </Animated.View>

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
          <ProfileCollaborations items={acceptedCampaigns} />

          <LiquidButton
            label="Edit Profile"
            onPress={() => router.push('/settings')}
            minHeight={56}
            borderRadius={22}
            icon={<MaterialCommunityIcons name="account-edit-outline" size={19} color="#fff" />}
          />

          <LiquidButton
            label="Log Out"
            onPress={handleSignOut}
            minHeight={50}
            tone="neutral"
            icon={<MaterialCommunityIcons name="logout-variant" size={18} color={palette.textMuted} />}
          />

          <AvatarPreviewModal visible={avatarOpen} uri={profile.avatarUrl || undefined} onClose={() => setAvatarOpen(false)} />
        </>
      ) : null}
    </Screen>
  )
}
