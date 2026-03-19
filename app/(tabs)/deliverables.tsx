import { useMemo } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { colors, palette, shadows, typography } from '@/features/core/theme'
import { useDeliverables } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'

export default function DeliverablesPage() {
  const { data, isLoading, error } = useDeliverables()

  const needsAction = useMemo(() => {
    const actionable = (data || []).filter((item) => item.status === 'revision_requested' || item.status === 'pending')
    const grouped = new Map<
      string,
      {
        campaignId: string
        campaignTitle: string
        status: 'revision_requested' | 'pending'
        platform: string
        count: number
        flagReason?: string | null
      }
    >()

    for (const item of actionable) {
      const actionableStatus = item.status === 'revision_requested' ? 'revision_requested' : 'pending'
      const existing = grouped.get(item.campaignId)
      if (!existing) {
        grouped.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignTitle: item.campaignTitle,
          status: actionableStatus,
          platform: item.platform || 'tiktok',
          count: 1,
          flagReason: item.flagReason,
        })
        continue
      }

      existing.count += 1
      if (existing.status !== 'revision_requested' && actionableStatus === 'revision_requested') {
        existing.status = 'revision_requested'
      }
      if (!existing.flagReason && item.flagReason) {
        existing.flagReason = item.flagReason
      }
    }

    return Array.from(grouped.values())
  }, [data])

  const openCampaignVideos = (campaignId: string) =>
    router.push({
      pathname: '/campaigns/[id]',
      params: { id: campaignId, tab: 'videos' },
    })

  return (
    <Screen overlay={<CreatorOnboardingGate />} overlayPadding={136}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          My Deliverables
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Submit and track your content deliverables
        </Text>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load deliverables right now.</Text> : null}

      <FlatList
        data={needsAction}
        keyExtractor={(item) => item.campaignId}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="Nothing Needs Action"
              subtitle="When a deliverable needs submission or revision, it will appear here."
              icon="package-variant-closed"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openCampaignVideos(item.campaignId)}
            style={{
              borderRadius: 22,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: item.status === 'revision_requested' ? 'rgba(251,191,36,0.45)' : 'rgba(191,219,254,0.8)',
              padding: 16,
              gap: 10,
              ...shadows.card,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1, color: palette.text, fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '700' }}>
                {item.campaignTitle}
              </Text>
              <StatusBadge status={item.status} />
            </View>

            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>
              {`${item.platform || 'tiktok'} - ${item.count} video${item.count === 1 ? '' : 's'}`}
            </Text>

            {item.flagReason ? (
              <Text style={{ color: '#9A3412', fontFamily: typography.fontFamily, fontSize: 13, lineHeight: 19 }}>
                {item.flagReason}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>
                Open in Your Videos
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  )
}
