import { Image as ExpoImage } from 'expo-image'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { Campaign } from '@/features/core/types'
import { formatRewardType, getDaysLeft, isCampaignClosed } from '@/features/core/format'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'

// A small deadline descriptor + whether it's urgent (≤ 3 days), used to colour the
// closing chip so closing-soon campaigns stand out — real urgency, no faked numbers.
function deadline(campaign: Campaign): { label: string; urgent: boolean } | null {
  if (isCampaignClosed(campaign.endDate)) return { label: 'Closed', urgent: false }
  const days = getDaysLeft(campaign.endDate)
  if (days == null) return null
  if (days === 0) return { label: 'Last day', urgent: true }
  return { label: `${days}d left`, urgent: days <= 3 }
}

function Chip({ icon, label, color, bg }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string; bg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 6, backgroundColor: bg }}>
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '800', letterSpacing: -0.1 }}>{label}</Text>
    </View>
  )
}

// The editorial featured campaign — a big, image-led light card that gives Discover
// a focal point. Tapping opens the campaign (where Apply lives).
export function FeaturedCampaign({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const reward = formatRewardType(campaign)
  const dl = deadline(campaign)
  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Featured campaign: ${campaign.title}`}
        style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}
      >
        <View style={{ height: 184 }}>
          {campaign.coverImageUrl ? (
            <ExpoImage source={{ uri: campaign.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
          ) : (
            <LinearGradient colors={['rgba(124,63,242,0.35)', 'rgba(31,200,232,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          {/* readable scrim at the top for the FEATURED tag */}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70 }} />
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 9, paddingRight: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <MaterialCommunityIcons name="star-four-points" size={12} color={redesign.color.purple} />
            <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '900', letterSpacing: 1 }}>FEATURED</Text>
          </View>
          {dl?.urgent ? (
            <View style={{ position: 'absolute', top: 12, right: 12 }}>
              <Chip icon="clock-alert-outline" label={dl.label} color="#fff" bg="rgba(234,88,12,0.95)" />
            </View>
          ) : null}
        </View>

        <View style={{ padding: 16, gap: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={20} />
            <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>
              {campaign.brandName || 'Brand'}
            </Text>
          </View>
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 19, fontWeight: '800', letterSpacing: -0.5, lineHeight: 23 }} numberOfLines={2}>
            {campaign.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {reward ? <Chip icon="gift-outline" label={reward} color={redesign.color.purple} bg="rgba(124,63,242,0.10)" /> : null}
            {dl && !dl.urgent ? <Chip icon="calendar-blank-outline" label={dl.label} color={redesign.color.muted} bg={redesign.color.bg} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, paddingVertical: 13, backgroundColor: redesign.color.ink, marginTop: 2 }}>
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>View &amp; apply</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// Horizontal rail of the creator's in-progress campaigns, each showing the next
// step. This is what a returning creator cares about, so it sits up top and keeps
// the page alive even when no new campaigns are open.
export function ActiveCampaignRail({
  campaigns,
  badgeCounts,
  onPress,
}: {
  campaigns: Campaign[]
  badgeCounts: Record<string, number>
  onPress: (campaign: Campaign) => void
}) {
  if (!campaigns.length) return null
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        My active · {campaigns.length}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8, paddingBottom: 2 }} style={{ marginHorizontal: -2, paddingHorizontal: 2 }}>
        {campaigns.map((c) => {
          const todo = badgeCounts[c.id] || 0
          return (
            <Pressable
              key={c.id}
              onPress={() => onPress(c)}
              style={{ width: 168, borderRadius: 18, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: todo > 0 ? 'rgba(124,63,242,0.45)' : redesign.color.hairlineStrong, ...redesign.shadow.card }}
            >
              <View style={{ height: 92 }}>
                {c.coverImageUrl ? (
                  <ExpoImage source={{ uri: c.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                ) : (
                  <LinearGradient colors={['rgba(124,63,242,0.30)', 'rgba(31,200,232,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                )}
              </View>
              <View style={{ padding: 11, gap: 7 }}>
                <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>
                  {c.title}
                </Text>
                {todo > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(124,63,242,0.10)' }}>
                    <MaterialCommunityIcons name="arrow-right-circle" size={13} color={redesign.color.purple} />
                    <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>{`${todo} to do`}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(16,159,110,0.10)' }}>
                    <MaterialCommunityIcons name="check-circle-outline" size={13} color={redesign.color.successText} />
                    <Text style={{ color: redesign.color.successText, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>Up to date</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
