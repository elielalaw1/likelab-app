import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { Screen } from '@/features/shared/ui/Screen'
import { useDashboardData } from '@/features/dashboard/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { formatCurrencySek } from '@/features/core/format'
import { colors, palette, typography } from '@/features/core/theme'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'
import { CreatorApprovalNotice } from '@/features/onboarding/CreatorApprovalNotice'

export default function OverviewPage() {
  const { data, isLoading, error } = useDashboardData()
  const queryClient = useQueryClient()

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
    }, [queryClient])
  )

  return (
    <Screen overlay={<CreatorOnboardingGate />} overlayPadding={136}>
      <CreatorApprovalNotice />
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text
          style={{
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.pageTitle,
            fontWeight: '700',
            color: palette.text,
            letterSpacing: -0.32,
          }}
        >
          Welcome{data?.profile?.displayName ? `, ${data.profile.displayName}` : ''}
        </Text>
        <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle }}>
          Your creator dashboard
        </Text>
      </Animated.View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
          YOUR ACTIVE CAMPAIGNS
        </Text>
        <Text
          style={{ color: palette.textMuted, fontWeight: '500', fontFamily: typography.fontFamily, fontSize: 13 }}
          onPress={() => router.push({ pathname: '/(tabs)/campaigns' })}
        >
          Browse all
        </Text>
      </View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not refresh dashboard data.</Text> : null}

      <FlatList
        data={data?.activeCampaigns || []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={!isLoading ? <EmptyState title="No Active Campaigns" subtitle="Accepted campaigns will show here." icon="bullhorn-outline" /> : null}
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.id } } as never)}
          />
        )}
      />

      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        Recent Applications
      </Text>

      <FlatList
        data={data?.recentApplications || []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={!isLoading ? <EmptyState title="No Applications" subtitle="Apply to a campaign to see activity here." icon="file-document-outline" /> : null}
        renderItem={({ item }) => (
          <SectionCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: palette.text, fontFamily: typography.fontFamily }}>
                {item.campaignTitle}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>
              {formatCurrencySek(item.rewardAmount)}
            </Text>
          </SectionCard>
        )}
      />
    </Screen>
  )
}
