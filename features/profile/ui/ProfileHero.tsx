import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { CreatorProfile } from '@/features/core/types'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { colors, palette, radii, typography } from '@/features/core/theme'

type Props = {
  profile: CreatorProfile
  onAvatarPress: () => void
}

function summaryLocation(profile: CreatorProfile) {
  const chunks = [profile.city, profile.county, profile.country].filter((v) => typeof v === 'string' && v.trim())
  if (!chunks.length) return null
  return chunks.join(', ')
}

export function ProfileHero({ profile, onAvatarPress }: Props) {
  const location = summaryLocation(profile)

  return (
    <SectionCard>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onAvatarPress} style={{ alignItems: 'center', justifyContent: 'center' }}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: 104, height: 104, borderRadius: 52 }} />
          ) : (
            <View style={{ width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,18,160,0.08)' }}>
              <MaterialCommunityIcons name="account" size={56} color={colors.primary} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="fullscreen" size={16} color="#fff" />
          </View>
        </Pressable>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: typography.fontFamily, color: palette.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.32 }}>
            {profile.displayName || 'Creator'}
          </Text>

          {profile.tiktokHandle ? (
            <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 14 }}>@{profile.tiktokHandle.replace(/^@+/, '')}</Text>
          ) : null}
          {profile.instagramHandle ? (
            <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 14 }}>
              Instagram: @{profile.instagramHandle.replace(/^@+/, '')}
            </Text>
          ) : null}

          {profile.primaryCategory ? (
            <View style={{ marginTop: 4, flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <View style={{ borderRadius: radii.full, backgroundColor: 'rgba(74,18,160,0.08)', paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontFamily: typography.fontFamily, color: colors.primary, fontSize: 12, fontWeight: '600' }}>{profile.primaryCategory}</Text>
              </View>
              {profile.secondaryCategory ? (
                <View style={{ borderRadius: radii.full, backgroundColor: 'rgba(29,211,214,0.12)', paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontFamily: typography.fontFamily, color: '#0E7490', fontSize: 12, fontWeight: '600' }}>{profile.secondaryCategory}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {location ? (
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={palette.textMuted} />
              <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 13 }}>{location}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {profile.reviewStatus ? <StatusBadge status={profile.reviewStatus} /> : null}
            {profile.completionPercentage < 100 ? (
              <View style={{ borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(234,179,8,0.14)' }}>
                <Text style={{ fontFamily: typography.fontFamily, color: '#A16207', fontSize: 12, fontWeight: '700' }}>
                  PROFILE {profile.completionPercentage}%
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </SectionCard>
  )
}
