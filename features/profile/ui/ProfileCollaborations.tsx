import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Campaign } from '@/features/core/types'
import { PressableScale } from '@/features/shared/ui/PressableScale'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { redesign, typography } from '@/features/core/theme'
import { campaignRouteParams } from '@/features/campaigns/navigation'

type Props = {
  items: Campaign[]
}

const HEADER = {
  marginLeft: 4,
  fontFamily: typography.fontFamily,
  fontSize: 11,
  fontWeight: '800' as const,
  color: redesign.color.faint,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
}

export function ProfileCollaborations({ items }: Props) {
  const router = useRouter()
  const { width } = useWindowDimensions()
  // Screen content padding is 16 each side; 10px gutter between two columns.
  const tileW = (width - 32 - 10) / 2
  const tileH = Math.round(tileW * 0.84)

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={HEADER}>Work</Text>
        {items.length > 0 ? (
          <Text style={{ marginRight: 4, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, fontVariant: ['tabular-nums'] }}>
            {items.length}
          </Text>
        ) : null}
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="Your work starts here"
          subtitle="Campaigns you join show up here as a portfolio of your collaborations."
          icon="image-multiple-outline"
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.duration(280).delay(i * 60)}>
              <PressableScale
                onPress={() => router.push(campaignRouteParams(item) as never)}
                haptic={false}
                style={{
                  width: tileW,
                  borderRadius: 18,
                  overflow: 'hidden',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: redesign.color.hairlineStrong,
                  backgroundColor: redesign.color.card,
                  ...redesign.shadow.card,
                }}
              >
                <View style={{ width: tileW, height: tileH, backgroundColor: '#1A0F2E' }}>
                  {item.coverImageUrl ? (
                    <ExpoImage source={{ uri: item.coverImageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                  ) : (
                    <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, opacity: 0.55 }} />
                  )}
                  {/* scrim */}
                  <LinearGradient
                    colors={['transparent', 'rgba(8,4,18,0.82)']}
                    start={{ x: 0.5, y: 0.4 }} end={{ x: 0.5, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  {/* brand chip */}
                  <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 3, paddingRight: 8, paddingVertical: 3 }}>
                    <BrandAvatar logoUrl={item.brandLogoUrl} brandName={item.brandName} size={14} />
                    <Text style={{ color: redesign.color.ink, fontSize: 10, fontWeight: '700', fontFamily: typography.fontFamily, maxWidth: tileW - 70 }} numberOfLines={1}>
                      {item.brandName || 'Brand'}
                    </Text>
                  </View>
                  {/* title */}
                  <Text
                    style={{ position: 'absolute', left: 10, right: 10, bottom: 10, color: '#fff', fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  )
}
