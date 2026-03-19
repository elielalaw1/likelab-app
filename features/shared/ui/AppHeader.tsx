import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, radii, spacing, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'

export function AppHeader() {
  const { data: profile } = useCreatorProfile()
  const router = useRouter()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs }}>
      <View style={{ width: 50, height: 50, borderRadius: radii.sidebarNav, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image source={require('../../../design/Design2/LOGGAN.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
        {profile?.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
        ) : (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(23,31,42,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.9)',
            }}
          >
            <Text style={{ color: colors.mutedForeground, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
              {profile?.displayName?.trim()?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}
