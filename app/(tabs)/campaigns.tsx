import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { colors, palette, typography } from '@/features/core/theme'
import { useCampaigns } from '@/features/campaigns/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { campaignRouteParams } from '@/features/campaigns/navigation'

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns()
  const visibleCampaigns = (data || []).filter((item) => item.creatorApplicationStatus !== 'accepted')

  return (
    <Screen>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          Browse Campaigns
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Discover and apply to brand campaigns
        </Text>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load campaigns right now.</Text> : null}

      <FlatList
        data={visibleCampaigns}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={!isLoading ? <EmptyState title="No Campaigns" subtitle="No new campaigns available right now." icon="bullhorn-outline" /> : null}
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onPress={() => router.push(campaignRouteParams(item) as never)}
          />
        )}
      />
    </Screen>
  )
}
