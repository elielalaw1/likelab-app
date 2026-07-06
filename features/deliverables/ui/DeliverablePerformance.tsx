import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { getDeliverableVideoStats } from '@/features/deliverables/tiktok-content'

const FONT = typography.fontFamily

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return `${n}`
}

function Metric({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: redesign.color.bg, borderRadius: 12, padding: 11, gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <MaterialCommunityIcons name={icon} size={13} color={redesign.color.muted} />
        <Text style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: '700', color: redesign.color.muted }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: FONT, fontSize: 19, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  )
}

// Live performance for a published deliverable: the embedded TikTok (oEmbed, no
// stored file) plus the tracked view/like/comment/share metrics. Gated by the
// caller behind tiktokApiFeaturesEnabled. `url` is the deliverable's TikTok link.
export function DeliverablePerformance({ deliverableId, url }: { deliverableId: string; url?: string | null }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['deliverable-video-stats', deliverableId],
    queryFn: () => getDeliverableVideoStats(deliverableId),
    staleTime: 60 * 1000,
  })

  return (
    <View style={{ gap: 10 }}>
      <View style={{ backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="chart-line" size={15} color={redesign.color.purple} />
          <Text style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: '800', color: redesign.color.ink }}>Live performance</Text>
          {data?.capturedAt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="sync" size={12} color={redesign.color.successText} />
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '700', color: redesign.color.successText }}>Auto-synced</Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator color={redesign.color.purple} />
          </View>
        ) : data ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Metric icon="play" label="Views" value={compact(data.viewCount)} />
              <Metric icon="heart" label="Likes" value={compact(data.likeCount)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Metric icon="comment" label="Comments" value={compact(data.commentCount)} />
              <Metric icon="share" label="Shares" value={compact(data.shareCount)} />
            </View>
          </View>
        ) : isError ? (
          <Pressable onPress={() => refetch()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
            <MaterialCommunityIcons name="refresh" size={15} color={redesign.color.muted} />
            <Text style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted, lineHeight: 18 }}>Couldn&apos;t load stats — tap to retry</Text>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted, lineHeight: 18 }}>
            Metrics start tracking within a few hours of linking your post. Check back soon.
          </Text>
        )}
      </View>

      {url && /^https?:\/\//i.test(url) ? (
        <Pressable
          onPress={() => Linking.openURL(url).catch(() => undefined)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 38 }}
        >
          <FontAwesome5 name="tiktok" size={12} color={redesign.color.muted} />
          <Text style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '700', color: redesign.color.muted }}>View post on TikTok</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
