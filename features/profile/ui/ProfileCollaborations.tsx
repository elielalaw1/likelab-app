import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Campaign } from '@/features/core/types'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { formatCurrencySek } from '@/features/core/format'
import { palette, radii, typography } from '@/features/core/theme'
import { EmptyState } from '@/features/shared/ui/EmptyState'

type Props = {
  items: Campaign[]
}

export function ProfileCollaborations({ items }: Props) {
  const router = useRouter()

  if (!items.length) {
    return (
      <SectionCard title="Latest Collaborations">
        <EmptyState title="No collaborations yet" subtitle="Accepted campaigns will appear here." icon="handshake-outline" />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Latest Collaborations">
      {items.slice(0, 3).map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.id } } as never)}
          style={{
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: 'rgba(234,236,239,0.75)',
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}
        >
          {item.coverImageUrl ? (
            <Image source={{ uri: item.coverImageUrl }} style={{ width: '100%', height: 112 }} contentFit="cover" />
          ) : (
            <View style={{ height: 112, backgroundColor: 'rgba(74,18,160,0.08)' }} />
          )}

          <View style={{ padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, color: palette.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                {item.title}
              </Text>
              <StatusBadge status={item.creatorApplicationStatus || 'accepted'} />
            </View>
            <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
              {item.brandName || 'Brand'}
            </Text>
            {item.rewardAmount ? (
              <Text style={{ fontFamily: typography.fontFamily, color: palette.text, fontSize: 13, fontWeight: '600' }}>{formatCurrencySek(item.rewardAmount)}</Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </SectionCard>
  )
}
