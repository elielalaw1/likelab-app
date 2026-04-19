import { Image, Text, View } from 'react-native'
import { typography } from '@/features/core/theme'

type Props = {
  logoUrl?: string | null
  brandName?: string | null
  size?: number
}

export function BrandAvatar({ logoUrl, brandName, size = 24 }: Props) {
  const initial = brandName?.trim()[0]?.toUpperCase() ?? '?'
  const fontSize = Math.round(size * 0.42)

  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.12)' }}
        resizeMode="cover"
      />
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(139,92,246,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#7C3AED', fontSize, fontWeight: '800', fontFamily: typography.fontFamily }}>
        {initial}
      </Text>
    </View>
  )
}
