import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Campaign } from '@/features/core/types'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { shadows, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { campaignRouteParams } from '@/features/campaigns/navigation'

type Props = {
  items: Campaign[]
}

export function ProfileCollaborations({ items }: Props) {
  const { palette } = useTheme()
  const router = useRouter()

  if (!items.length) {
    return (
      <SectionCard title="Latest Collaborations">
        <EmptyState title="No collaborations yet" subtitle="Accepted campaigns will appear here." icon="handshake-outline" />
      </SectionCard>
    )
  }

  const cardWidth = Dimensions.get('window').width * 0.62

  return (
    <SectionCard title="Latest Collaborations">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 4 }}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(campaignRouteParams(item) as never)}
            style={{
              width: cardWidth,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: palette.borderColor,
              overflow: 'hidden',
              backgroundColor: palette.card,
              ...shadows.card,
            }}
          >
            {item.coverImageUrl ? (
              <Image source={{ uri: item.coverImageUrl }} style={{ width: '100%', height: 110 }} contentFit="cover" />
            ) : (
              <View style={{ height: 110, backgroundColor: 'rgba(74,18,160,0.08)' }} />
            )}

            <View style={{ padding: 12, gap: 4 }}>
              <Text style={{ fontFamily: typography.fontFamily, color: palette.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {item.brandName || 'Brand'}
                </Text>
                <StatusBadge status={item.creatorApplicationStatus || 'accepted'} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SectionCard>
  )
}
