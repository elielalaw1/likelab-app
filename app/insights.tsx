import { useCallback } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { redesign, typography } from '@/features/core/theme'
import { formatCompactCount } from '@/features/auth/api'
import { useInsights } from '@/features/insights/hooks'
import type { CampaignInsight } from '@/features/insights/api'

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: redesign.color.card,
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        ...redesign.shadow.card,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.4}
        style={{ fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.8, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  )
}

function CampaignRow({ item, index }: { item: CampaignInsight; index: number }) {
  const pct = item.topViews > 0 ? Math.max(4, (item.views / item.topViews) * 100) : 4
  return (
    <Animated.View
      entering={FadeInDown.delay(60 + index * 50).duration(360)}
      style={{ borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, backgroundColor: redesign.color.card, gap: 12, ...redesign.shadow.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily, fontWeight: '800', fontSize: 14.5, color: redesign.color.ink, letterSpacing: -0.2 }}>
            {item.campaignTitle}
          </Text>
          {item.rank != null ? (
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: redesign.color.muted, marginTop: 1 }}>
              #{item.rank}{item.totalCreators != null ? ` of ${item.totalCreators} creators` : ''}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push(`/leaderboard/${item.campaignId}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open leaderboard for ${item.campaignTitle}`}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {formatCompactCount(item.views)} views
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>
          {formatCompactCount(item.likes)} likes
        </Text>
      </View>

      <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }} />
      </View>
    </Animated.View>
  )
}

export default function InsightsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useInsights()

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['insights'] })
    await refetch()
  }, [queryClient, refetch])

  return (
    <Screen onRefresh={onRefresh} tabAware={false} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color={redesign.color.muted} />
          <Text style={{ color: redesign.color.muted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(250).delay(60)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Insights
        </Text>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Your performance across accepted campaigns.
        </Text>
      </Animated.View>

      {isLoading && !data ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={redesign.color.purple} />
        </View>
      ) : null}

      {error ? (
        <Text style={{ color: redesign.color.muted, fontSize: 12 }}>Could not load insights right now.</Text>
      ) : null}

      {data ? (
        data.campaignsTracked === 0 ? (
          <EmptyState
            title="No data yet"
            subtitle="Once your campaign videos go live, your views, likes and ranking will show up here."
            icon="chart-line"
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SummaryCell label="Total views" value={formatCompactCount(data.totalViews) || '0'} />
              <SummaryCell label="Total likes" value={formatCompactCount(data.totalLikes) || '0'} />
              <SummaryCell label="Best rank" value={data.bestRank != null ? `#${data.bestRank}` : '–'} />
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
              Per campaign · {data.campaignsTracked}
            </Text>

            <View style={{ gap: 12 }}>
              {data.perCampaign.map((item, index) => (
                <CampaignRow key={item.campaignId} item={item} index={index} />
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '500', color: redesign.color.faint, fontFamily: typography.fontFamily, lineHeight: 18, textAlign: 'center', marginTop: 4 }}>
              Figures reflect your current position. Trends over time are coming soon.
            </Text>
          </>
        )
      ) : null}
    </Screen>
  )
}
