import { Image, Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Campaign } from '@/features/core/types'
import { formatCampaignGoal, formatDateRange } from '@/features/core/format'
import { colors, radii, shadows, spacing, typography } from '@/features/core/theme'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'

type Props = {
  campaign: Campaign
  onPress?: () => void
}

function creatorStatus(campaign: Campaign) {
  if (campaign.creatorApplicationStatus === 'accepted') return 'accepted'
  return campaign.creatorApplicationStatus || campaign.invitationStatus || campaign.status
}

export function CampaignCard({ campaign, onPress }: Props) {
  const content = (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.5)',
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <View style={{ height: 170, backgroundColor: colors.muted }}>
        {campaign.coverImageUrl ? (
          <Image source={{ uri: campaign.coverImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bullhorn-outline" size={36} color={colors.mutedForeground} />
          </View>
        )}
        <View style={{ position: 'absolute', right: 10, top: 10 }}>
          <StatusBadge status={creatorStatus(campaign) || undefined} />
        </View>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text
          style={{
            fontFamily: typography.fontFamily,
            fontSize: 22,
            lineHeight: 25,
            fontWeight: '700',
            color: colors.foreground,
            letterSpacing: -0.32,
          }}
          numberOfLines={1}
        >
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <MaterialCommunityIcons name="storefront-outline" size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
            {campaign.brandName || 'Brand'}
          </Text>
        </View>
        {campaign.campaignGoal ? (
          <Text style={{ color: colors.foreground, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
            {formatCampaignGoal(campaign.campaignGoal)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="wallet-giftcard" size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }}>
              {campaign.rewardType || 'Reward'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="calendar-month-outline" size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }}>
              {formatDateRange(campaign.startDate, campaign.endDate)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )

  if (!onPress) return content
  return <Pressable onPress={onPress}>{content}</Pressable>
}
