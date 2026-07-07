import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { redesign, typography } from '@/features/core/theme'
import { Bone } from '@/features/shared/ui/SkeletonCard'
import { AnimatedCounter } from '@/features/shared/ui/AnimatedCounter'
import { formatCompactCount } from '@/features/auth/api'
import { useInsights } from '@/features/insights/hooks'
import { buildChart, computeTrend, type Trend } from '@/features/insights/logic'
import type { CampaignInsight } from '@/features/insights/api'

const AnimatedPath = Animated.createAnimatedComponent(Path)

// ─── Trend pill ("+34% vs last campaign") ────────────────────────────────────
function TrendBadge({ trend }: { trend: Trend }) {
  if (trend.percent == null || trend.direction === 'flat') return null
  const up = trend.direction === 'up'
  const tint = up ? redesign.color.successText : '#E5484D'
  const bg = up ? redesign.color.successBg : 'rgba(229,72,77,0.12)'
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(140)}
      style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11, marginTop: 12 }}
    >
      <MaterialCommunityIcons name={up ? 'trending-up' : 'trending-down'} size={15} color={tint} />
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '800', color: tint, fontVariant: ['tabular-nums'] }}>
        {up ? '+' : ''}{trend.percent}%
      </Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted }}>
        latest vs previous campaign
      </Text>
    </Animated.View>
  )
}

// ─── Summary cells ────────────────────────────────────────────────────────────
function SummaryCell({ label, value, delay }: { label: string; value: number; delay: number }) {
  const valueStyle = { fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800' as const, color: redesign.color.ink, letterSpacing: -0.8, fontVariant: ['tabular-nums' as const], minWidth: 30, textAlign: 'center' as const, padding: 0 }
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
      <AnimatedCounter value={value} delay={delay} style={valueStyle} />
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  )
}

// ─── Views trend chart ────────────────────────────────────────────────────────
// Per-campaign views in chronological order. NOTE: the backend stores only the
// current totals, not historical snapshots, so this is a trend
// across campaigns (each happened at a point in time) — not a day-by-day curve.
// A true time-series needs the backend to persist periodic snapshots first.
function ViewsChart({ values }: { values: number[] }) {
  const [width, setWidth] = useState(0)
  const HEIGHT = 150
  const geo = useMemo(() => buildChart(values, width, HEIGHT, 12), [values, width])
  const len = geo.length

  const draw = useSharedValue(0)
  useEffect(() => {
    if (width <= 0) return
    draw.value = 0
    draw.value = withDelay(280, withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.cubic) }))
  }, [width, values, draw])

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }))
  const areaProps = useAnimatedProps(() => ({ fillOpacity: interpolate(draw.value, [0, 0.4, 1], [0, 0.5, 1], Extrapolation.CLAMP) }))
  const dotStyle = useAnimatedStyle(() => ({ opacity: interpolate(draw.value, [0.7, 1], [0, 1], Extrapolation.CLAMP) }))
  const last = geo.points[geo.points.length - 1]

  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(120)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ backgroundColor: redesign.color.card, borderRadius: 22, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase' }}>
          Views per campaign
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', color: redesign.color.muted }}>
          oldest → newest
        </Text>
      </View>

      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <SvgGradient id="insightsArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={redesign.color.purple} stopOpacity={0.32} />
              <Stop offset="0.55" stopColor={redesign.color.magenta} stopOpacity={0.12} />
              <Stop offset="1" stopColor={redesign.color.cyan} stopOpacity={0} />
            </SvgGradient>
            <SvgGradient id="insightsLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={redesign.color.purple} />
              <Stop offset="0.5" stopColor={redesign.color.magenta} />
              <Stop offset="1" stopColor={redesign.color.cyan} />
            </SvgGradient>
          </Defs>
          <AnimatedPath animatedProps={areaProps} d={geo.areaPath} fill="url(#insightsArea)" />
          <AnimatedPath
            animatedProps={lineProps}
            d={geo.linePath}
            stroke="url(#insightsLine)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={len}
          />
          {geo.points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={i === geo.points.length - 1 ? 0 : 2.5} fill={redesign.color.card} stroke={redesign.color.magenta} strokeWidth={1.5} />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}

      {/* Latest point callout */}
      {width > 0 && last ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: Math.min(Math.max(last.x - 18, 12), width - 24), top: last.y + 16 }, dotStyle]}
        >
          <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: redesign.color.cyan, borderWidth: 2.5, borderColor: redesign.color.card, ...redesign.shadow.card }} />
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

// ─── "Your top performer" highlight ──────────────────────────────────────────
function TopPerformerCard({ item }: { item: CampaignInsight }) {
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(80)}>
      <LinearGradient
        colors={redesign.gradient.holographic}
        locations={redesign.gradient.holographicLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 1.4, ...redesign.shadow.card }}
      >
        <View style={{ borderRadius: 22.6, backgroundColor: redesign.color.darkScreen, padding: 18, gap: 16, overflow: 'hidden' }}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(99,80,184,0.4)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 0.9 }}
            style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: 80 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="trophy" size={15} color={redesign.color.gold} />
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Your top performer
            </Text>
          </View>

          <View>
            <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily, fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
              {item.campaignTitle}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 22 }}>
            <View style={{ gap: 3 }}>
              <AnimatedCounter
                value={item.views}
                delay={260}
                style={{ fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.8, fontVariant: ['tabular-nums'], padding: 0, minWidth: 40 }}
              />
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Views</Text>
            </View>
            <View style={{ gap: 3 }}>
              <AnimatedCounter
                value={item.likes}
                delay={340}
                style={{ fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.8, fontVariant: ['tabular-nums'], padding: 0, minWidth: 40 }}
              />
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Likes</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  )
}

function CampaignRow({ item, index }: { item: CampaignInsight; index: number }) {
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
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {formatCompactCount(item.views)} views
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>
          {formatCompactCount(item.likes)} likes
        </Text>
      </View>
    </Animated.View>
  )
}

export default function InsightsPage() {
  const { data, isLoading, error, refetch } = useInsights()

  const onRefresh = useCallback(async () => {
    // refetch() force-refetches the visible query regardless of staleTime — no need
    // to also invalidate (that double-fetched the whole aggregation).
    await refetch()
  }, [refetch])

  // Chronological view of the campaigns (oldest → newest) for the trend chart
  // and the "vs last campaign" comparison. perCampaign itself is views-desc.
  const chronological = useMemo(
    () => (data ? [...data.perCampaign].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) : []),
    [data],
  )
  const chartValues = useMemo(() => chronological.map((c) => c.views), [chronological])
  const trend = useMemo<Trend | null>(() => {
    if (chronological.length < 2) return null
    const latest = chronological[chronological.length - 1]
    const previous = chronological[chronological.length - 2]
    // Only compare two campaigns that BOTH have meaningful view counts — otherwise
    // a freshly-launched campaign (few/0 views) yields a misleading large negative.
    // This is a campaign-vs-campaign comparison of lifetime views, not a time trend.
    const FLOOR = 100
    if (latest.views < FLOOR || previous.views < FLOOR) return null
    return computeTrend(latest.views, previous.views)
  }, [chronological])

  const topPerformer = data?.perCampaign[0]

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
        {trend ? <TrendBadge trend={trend} /> : null}
      </Animated.View>

      {isLoading && !data ? (
        <View style={{ gap: 14, marginTop: 4 }}>
          {/* Summary cells */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Bone width="48.5%" height={86} borderRadius={18} />
            <Bone width="48.5%" height={86} borderRadius={18} />
          </View>
          {/* Top performer + chart cards */}
          <Bone width="100%" height={170} borderRadius={24} />
          <Bone width="100%" height={196} borderRadius={22} />
          {/* Per-campaign rows */}
          <Bone width="100%" height={96} borderRadius={20} />
          <Bone width="100%" height={96} borderRadius={20} />
        </View>
      ) : null}

      {error ? (
        <Text style={{ color: redesign.color.muted, fontSize: 12 }}>Could not load insights right now.</Text>
      ) : null}

      {data ? (
        data.campaignsTracked === 0 ? (
          <EmptyState
            title="No data yet"
            subtitle="Once your campaign videos go live, your views and likes will show up here."
            icon="chart-line"
          />
        ) : (
          <>
            {data.partial ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={redesign.color.faint} />
                <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: redesign.color.faint, lineHeight: 17 }}>
                  Some campaigns couldn&apos;t be loaded — totals may be incomplete.
                </Text>
              </View>
            ) : null}
            <Animated.View entering={FadeInDown.duration(300)} style={{ flexDirection: 'row', gap: 10 }}>
              <SummaryCell label="Total views" value={data.totalViews} delay={120} />
              <SummaryCell label="Total likes" value={data.totalLikes} delay={200} />
            </Animated.View>

            {topPerformer ? <TopPerformerCard item={topPerformer} /> : null}

            {chartValues.length >= 2 ? <ViewsChart values={chartValues} /> : null}

            <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
              Per campaign · {data.campaignsTracked}
            </Text>

            <View style={{ gap: 12 }}>
              {data.perCampaign.map((item, index) => (
                <CampaignRow key={item.campaignId} item={item} index={index} />
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '500', color: redesign.color.faint, fontFamily: typography.fontFamily, lineHeight: 18, textAlign: 'center', marginTop: 4 }}>
              Figures reflect your current campaign totals. Day-by-day trends arrive once campaign history is tracked.
            </Text>
          </>
        )
      ) : null}
    </Screen>
  )
}
