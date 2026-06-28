import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { supabase } from '@/lib/supabase'
import { useCampaign } from '@/features/campaigns/hooks'
import { getDaysLeft, isCampaignClosed, formatRewardType } from '@/features/core/format'
import { redesign, typography } from '@/features/core/theme'

type Position = { rank: number; total_creators: number; my_views: number; my_likes: number; top_views: number }

function fmtViews(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const INK_CARD = '#141420'
const FAINT = 'rgba(255,255,255,0.45)'

function MicroLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: FAINT, letterSpacing: 1.1, textTransform: 'uppercase' }}>
      {children}
    </Text>
  )
}

export default function LeaderboardPage() {
  const params = useLocalSearchParams<{ id: string }>()
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id
  const { data: campaign, isLoading } = useCampaign(campaignId)
  const [position, setPosition] = useState<Position | null>(null)

  useEffect(() => {
    if (!campaignId) return
    let active = true
    void Promise.resolve(
      supabase
        .rpc('get_campaign_leaderboard_position', { p_campaign_id: campaignId })
        .then(({ data }) => {
          if (active && data && data.length > 0) setPosition(data[0])
        })
    ).catch(() => {})
    return () => { active = false }
  }, [campaignId])

  const tiers = (campaign?.prizeDistribution || []).filter((n) => typeof n === 'number' && n > 0)
  const payoutCount = tiers.length
  const rewardLabel = formatRewardType(campaign || {}) || 'Reward'
  const endsIn = getDaysLeft(campaign?.endDate)
  const total = position?.total_creators ?? 0
  const myRank = position?.rank ?? 0
  const inPayoutZone = myRank > 0 && myRank <= payoutCount
  const progress = position && position.top_views > 0
    ? Math.max(4, Math.min(100, (position.my_views / position.top_views) * 100))
    : 4
  const platform = campaign?.platforms?.[0]
    ? campaign.platforms[0].replace(/\b\w/g, (c) => c.toUpperCase())
    : 'TikTok'

  return (
    <View style={{ flex: 1, backgroundColor: redesign.color.darkScreen }}>
      <StatusBar style="light" />
      {/* Holographic radial glow, top-right */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(124,63,242,0.35)', 'rgba(31,200,232,0.10)', 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.55 }}
        style={{ position: 'absolute', top: 0, right: 0, width: 360, height: 360 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }} numberOfLines={1}>
              {campaign?.title || 'Leaderboard'}
            </Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '500', color: FAINT, marginTop: 1 }}>
              {platform} · {total} creator{total === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {isLoading && !campaign ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* Prize pool banner — holographic gradient border */}
            <Animated.View entering={FadeInDown.duration(280)}>
              <LinearGradient
                colors={redesign.gradient.holographic}
                locations={redesign.gradient.holographicLocations}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 1.4 }}
              >
                <View style={{ borderRadius: 20.6, backgroundColor: INK_CARD, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 6 }}>
                    <MicroLabel>Reward</MicroLabel>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 }} numberOfLines={1}>
                      {rewardLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <MicroLabel>Ends in</MicroLabel>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
                      {endsIn == null ? 'Open' : isCampaignClosed(campaign?.endDate) ? 'Closed' : endsIn === 0 ? 'Last day' : `${endsIn}d`}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Your position card — only when the creator has a real rank.
                An unranked creator (rank 0/null) would otherwise show "#0 / 0th of N". */}
            {position && myRank > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(280).delay(60)}
                style={{ borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 18, gap: 16 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {/* Rank badge */}
                  <LinearGradient
                    colors={redesign.gradient.avatarRing}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ width: 60, height: 60, borderRadius: 18, padding: 1.5, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 16.5, backgroundColor: INK_CARD, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>#{myRank}</Text>
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, gap: 3 }}>
                    <MicroLabel>Your position</MicroLabel>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>
                      {ordinal(myRank)} of {total} creators
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: FAINT }}>
                      {inPayoutZone ? "You're in the reward zone 🎉" : `Climb to top ${payoutCount || 5} to earn a reward`}
                    </Text>
                  </View>
                </View>

                {/* Views vs leader */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] }}>
                      {fmtViews(position.my_views)} <Text style={{ color: FAINT, fontWeight: '500' }}>your views</Text>
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: FAINT, fontVariant: ['tabular-nums'] }}>
                      Leader {fmtViews(position.top_views)}
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                    <LinearGradient
                      colors={redesign.gradient.accent}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: '100%', width: `${progress}%`, borderRadius: 999 }}
                    />
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {/* Payout positions ladder (anonymized: rank → reward) */}
            {tiers.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(280).delay(120)} style={{ gap: 10 }}>
                <MicroLabel>Reward positions</MicroLabel>
                {tiers.map((_amount, i) => {
                  const rank = i + 1
                  const isYou = myRank === rank
                  const isGold = rank === 1
                  return (
                    <View
                      key={rank}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: isYou ? 'rgba(124,63,242,0.7)' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      {isYou ? (
                        <LinearGradient
                          colors={['rgba(124,63,242,0.28)', 'rgba(31,200,232,0.18)']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ position: 'absolute', inset: 0 }}
                        />
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: isYou ? 'transparent' : 'rgba(255,255,255,0.04)' }}>
                        <View style={{ width: 30, alignItems: 'center' }}>
                          {MEDALS[rank] ? (
                            <Text style={{ fontSize: 20 }}>{MEDALS[rank]}</Text>
                          ) : (
                            <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: FAINT }}>{rank}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>
                            {isYou ? 'You' : `Position ${rank}`}
                          </Text>
                          {isYou ? (
                            <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: FAINT, fontVariant: ['tabular-nums'] }}>
                              {fmtViews(position?.my_views ?? 0)} views
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: isGold ? 'rgba(255,214,107,0.16)' : 'rgba(59,214,138,0.14)' }}>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', color: isGold ? redesign.color.gold : redesign.color.payoutGreen, letterSpacing: 0.6 }}>
                            REWARD
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                })}

                {/* Your row when below the payout cutoff */}
                {myRank > payoutCount ? (
                  <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124,63,242,0.7)' }}>
                    <LinearGradient
                      colors={['rgba(124,63,242,0.28)', 'rgba(31,200,232,0.18)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
                      <View style={{ width: 30, alignItems: 'center' }}>
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: '#fff' }}>{myRank}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: '#fff', letterSpacing: -0.2 }}>You</Text>
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: FAINT, fontVariant: ['tabular-nums'] }}>
                          {fmtViews(position?.my_views ?? 0)} views
                        </Text>
                      </View>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: FAINT }}>Locked</Text>
                    </View>
                  </View>
                ) : null}
              </Animated.View>
            ) : null}

            {/* Reward-structure note */}
            {payoutCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingVertical: 13, paddingHorizontal: 16 }}>
                <MaterialCommunityIcons name="trophy-outline" size={18} color={redesign.color.gold} />
                <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>
                  Top <Text style={{ fontWeight: '800', color: '#fff' }}>{payoutCount}</Text> creator{payoutCount === 1 ? '' : 's'} earn a reward
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  )
}
