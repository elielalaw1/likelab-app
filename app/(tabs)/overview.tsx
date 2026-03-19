import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { Screen } from '@/features/shared/ui/Screen'
import { useDashboardData } from '@/features/dashboard/hooks'
import { useDeliverables } from '@/features/deliverables/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { colors, palette, shadows, typography } from '@/features/core/theme'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'
import { CreatorApprovalNotice } from '@/features/onboarding/CreatorApprovalNotice'

export default function OverviewPage() {
  const { data, isLoading, error } = useDashboardData()
  const { data: deliverables } = useDeliverables()
  const queryClient = useQueryClient()

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
    }, [queryClient])
  )

  const nextUp = useMemo(() => {
    const revision = (deliverables || []).find((item) => item.status === 'revision_requested')
    if (revision) {
      return {
        title: revision.campaignTitle,
        status: 'revision_requested',
        label: 'Needs revision',
        helper: 'Brand feedback is waiting. Re-submit this deliverable next.',
        action: 'Open deliverable',
        href: '/(tabs)/deliverables' as const,
      }
    }

    const pending = (deliverables || []).find((item) => item.status === 'pending')
    if (pending) {
      return {
        title: pending.campaignTitle,
        status: 'pending',
        label: 'Submit next',
        helper: 'You have a pending deliverable ready for upload.',
        action: 'Go to deliverables',
        href: '/(tabs)/deliverables' as const,
      }
    }

    const recent = data?.recentApplications?.[0]
    if (recent) {
      return {
        title: recent.campaignTitle,
        status: recent.status,
        label: 'Latest application',
        helper: 'This is the latest movement across your campaign pipeline.',
        action: 'Open application',
        href: '/(tabs)/applications' as const,
      }
    }

    return null
  }, [data?.recentApplications, deliverables])

  const featuredCampaign = data?.activeCampaigns?.[0]
  const secondaryCampaigns = data?.activeCampaigns?.slice(1, 3) || []

  return (
    <Screen overlay={<CreatorOnboardingGate />} overlayPadding={136}>
      <CreatorApprovalNotice />
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8 }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 38, lineHeight: 42, fontWeight: '800', color: palette.text, letterSpacing: -1 }}>
          Welcome{data?.profile?.displayName ? `, ${data.profile.displayName}` : ''}
        </Text>
        <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 16 }}>
          Your creator dashboard, simplified around what matters now.
        </Text>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not refresh dashboard data.</Text> : null}

      {nextUp ? (
        <SectionCard>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                Next up
              </Text>
              <StatusBadge status={nextUp.status} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
                {nextUp.title}
              </Text>
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {nextUp.label}
              </Text>
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 14, lineHeight: 21 }}>
                {nextUp.helper}
              </Text>
            </View>
            <LiquidButton
              label={nextUp.action}
              onPress={() => router.push(nextUp.href)}
              minHeight={46}
              borderRadius={18}
              icon={<MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
            />
          </View>
        </SectionCard>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
          Active right now
        </Text>
        <Pressable onPress={() => router.push({ pathname: '/(tabs)/campaigns' })}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontFamily: typography.fontFamily, fontSize: 13 }}>
            Browse all
          </Text>
        </Pressable>
      </View>

      {featuredCampaign ? (
        <CampaignCard campaign={featuredCampaign} onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: featuredCampaign.id } } as never)} />
      ) : !isLoading ? (
        <EmptyState title="No Active Campaigns" subtitle="Accepted campaigns will show here." icon="bullhorn-outline" />
      ) : null}

      {secondaryCampaigns.length ? (
        <FlatList
          data={secondaryCampaigns}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <SectionCard>
              <Pressable onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.id } } as never)} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <StatusBadge status={item.creatorApplicationStatus || item.status} />
                </View>
                <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>
                  {item.brandName || 'Brand'}
                </Text>
              </Pressable>
            </SectionCard>
          )}
        />
      ) : null}
    </Screen>
  )
}
