import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Campaign } from '@/features/core/types'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { palette, shadows, typography } from '@/features/core/theme'
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
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(234,236,239,0.75)',
            overflow: 'hidden',
            backgroundColor: '#fff',
            ...shadows.card,
          }}
        >
          {item.coverImageUrl ? (
            <Image source={{ uri: item.coverImageUrl }} style={{ width: '100%', height: 148 }} contentFit="cover" />
          ) : (
            <View style={{ height: 148, backgroundColor: 'rgba(74,18,160,0.08)' }} />
          )}

          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, color: palette.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
                {item.title}
              </Text>
              <StatusBadge status={item.creatorApplicationStatus || 'accepted'} />
            </View>
            <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 14 }} numberOfLines={1}>
              {item.brandName || 'Brand'}
            </Text>
          </View>
        </Pressable>
      ))}
    </SectionCard>
  )
}
