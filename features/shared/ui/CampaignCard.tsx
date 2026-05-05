import { Image as ExpoImage } from 'expo-image'
import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Campaign } from '@/features/core/types'
import { formatCampaignGoal, formatDateRange } from '@/features/core/format'
import { radii, shadows, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'

type Props = {
  campaign: Campaign
  onPress?: () => void
  badge?: number
  compact?: boolean
}

function creatorStatus(campaign: Campaign) {
  if (campaign.creatorApplicationStatus === 'accepted') return 'accepted'
  return campaign.creatorApplicationStatus || campaign.invitationStatus || campaign.status
}

export function CampaignCard({ campaign, onPress, badge, compact }: Props) {
  const { colors, palette } = useTheme()
  const content = compact ? (
    <View
      style={{
        backgroundColor: palette.cardBg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <View style={{ height: 110, backgroundColor: palette.neutralBg }}>
        {campaign.coverImageUrl ? (
          <ExpoImage
            source={{ uri: campaign.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bullhorn-outline" size={26} color={palette.textMuted} />
          </View>
        )}
        <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {badge ? (
            <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: 'System' }}>{badge}</Text>
            </View>
          ) : null}
          <StatusBadge status={creatorStatus(campaign) || undefined} />
        </View>
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: palette.text, letterSpacing: -0.2 }} numberOfLines={2}>
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={14} />
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '500', flex: 1 }} numberOfLines={1}>
            {campaign.brandName || 'Brand'}
          </Text>
        </View>
        {campaign.rewardType ? (
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="wallet-giftcard" size={11} color={palette.textMuted} />
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '500' }}>
              {campaign.rewardType}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  ) : (
    <View
      style={{
        backgroundColor: palette.cardBg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <View style={{ height: 170, backgroundColor: palette.neutralBg }}>
        {campaign.coverImageUrl ? (
          <ExpoImage
            source={{ uri: campaign.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bullhorn-outline" size={36} color={palette.textMuted} />
          </View>
        )}
        <View style={{ position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {badge ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'System' }}>{badge}</Text>
            </View>
          ) : null}
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
            color: palette.text,
            letterSpacing: -0.32,
          }}
          numberOfLines={1}
        >
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={22} />
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
            {campaign.brandName || 'Brand'}
          </Text>
        </View>
        {campaign.campaignGoal ? (
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
            {formatCampaignGoal(campaign.campaignGoal)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="wallet-giftcard" size={14} color={palette.textMuted} />
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }}>
              {campaign.rewardType || 'Reward'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="calendar-month-outline" size={14} color={palette.textMuted} />
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }}>
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
