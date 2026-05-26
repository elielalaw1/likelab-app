import { Alert, Animated, Easing, Linking, Pressable, Text, View } from 'react-native'
import { useEffect, useRef } from 'react'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { CreatorProfile } from '@/features/core/types'
import { countryFlag } from '@/features/core/format'
import { formatCountyLabel } from '@/features/profile/location-data'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { CountUp } from '@/features/motion/springs'
import { GlassCard } from '@/features/shared/ui/GlassCard'

type Props = {
  profile: CreatorProfile
  onAvatarPress: () => void
}

function summaryLocation(profile: CreatorProfile) {
  const flag = countryFlag(profile.country)
  const chunks = [profile.city, formatCountyLabel(profile.county), profile.country].filter((v) => typeof v === 'string' && v.trim())
  if (!chunks.length) return null
  return [flag, chunks.join(', ')].filter(Boolean).join(' ')
}

export function ProfileHero({ profile, onAvatarPress }: Props) {
  const { colors, palette } = useTheme()
  const location = summaryLocation(profile)
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <SectionCard>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Pressable onPress={onAvatarPress} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <LinearGradient
            colors={['#4A12A0', '#1DD3D6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 114, height: 114, borderRadius: 57, padding: 3, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: '#fff', padding: 2 }}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 52 }} />
              ) : (
                <View style={{ flex: 1, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,18,160,0.08)' }}>
                  <MaterialCommunityIcons name="account" size={56} color={colors.primary} />
                </View>
              )}
            </View>
          </LinearGradient>
          </Animated.View>
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

        <View style={{ alignItems: 'center', gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: typography.fontFamily, color: palette.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.32 }}>
              {profile.displayName || 'Creator'}
            </Text>
            {profile.reviewStatus === 'approved' && profile.completionPercentage >= 100 ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Verifierad creator',
                    'Ditt konto är granskat och godkänt av LikeLab, och din profil är 100% komplett.'
                  )
                }
                hitSlop={8}
              >
                <MaterialCommunityIcons name="shield-check" size={20} color="#1DA1F2" />
              </Pressable>
            ) : null}
          </View>

          {profile.tiktokBio ? (
            <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 2 }}>
              {profile.tiktokBio}
            </Text>
          ) : null}

          <View style={{ gap: 6, alignItems: 'center', marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {profile.instagramHandle ? (
              <Pressable
                onPress={() => Linking.openURL(`https://instagram.com/${profile.instagramHandle!.replace(/^@+/, '')}`).catch(() => {})}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E1306C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              >
                <MaterialCommunityIcons name="instagram" size={13} color="#fff" />
                <Text style={{ fontFamily: typography.fontFamily, color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  @{profile.instagramHandle.replace(/^@+/, '')}
                </Text>
              </Pressable>
            ) : null}
            {(profile.tiktokHandle || profile.tiktokUsername || profile.tiktokConnected) ? (() => {
              const cleanUsername = profile.tiktokUsername?.replace(/^@+/, '') ?? ''
              const rawHandle = profile.tiktokHandle?.replace(/^@+/, '') ?? ''
              const handleIsUrl = /^https?:\/\//i.test(rawHandle)
              const effectiveHandle = cleanUsername || (handleIsUrl ? '' : rawHandle)
              const profileUrlIsClean = profile.tiktokProfileUrl && !/vm\.tiktok\.com/i.test(profile.tiktokProfileUrl)
              const targetUrl = profileUrlIsClean
                ? profile.tiktokProfileUrl
                : effectiveHandle
                  ? `https://tiktok.com/@${effectiveHandle}`
                  : (handleIsUrl ? rawHandle : profile.tiktokProfileUrl ?? undefined)
              const label = effectiveHandle ? `@${effectiveHandle}` : 'View on TikTok'
              return (
                <Pressable
                  onPress={() => targetUrl ? Linking.openURL(targetUrl).catch(() => {}) : undefined}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                >
                  <FontAwesome5 name="tiktok" size={12} color="#fff" />
                  <Text style={{ fontFamily: typography.fontFamily, color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {label}
                  </Text>
                  {profile.tiktokVerified ? (
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#20D5EC" />
                  ) : null}
                </Pressable>
              )
            })() : null}
          </View>

          {profile.tiktokConnected && (profile.tiktokFollowers != null || profile.tiktokFollowing != null || profile.tiktokLikes != null || profile.tiktokVideoCount != null) ? (
            <GlassCard style={{ marginTop: 8, width: '100%' }} intensity={24} radius={16} strong>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0, paddingVertical: 12, width: '100%', justifyContent: 'center' }}>
              {[
                { label: 'Followers', value: profile.tiktokFollowers },
                { label: 'Following', value: profile.tiktokFollowing },
                { label: 'Likes', value: profile.tiktokLikes },
                { label: 'Videos', value: profile.tiktokVideoCount },
              ].filter((s) => s.value != null).map((stat, i, arr) => (
                <View key={stat.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 16 }}>
                    <CountUp
                      value={Number(stat.value) || 0}
                      duration={600}
                      style={{
                        fontFamily: typography.fontFamily,
                        fontSize: 20,
                        fontWeight: '800',
                        color: palette.text,
                        letterSpacing: -0.6,
                        padding: 0,
                        textAlign: 'center',
                        minWidth: 22,
                      }}
                    />
                    <Text style={{ fontFamily: typography.fontFamilyLight, fontSize: 8, fontWeight: '300', color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 1.3 }}>
                      {stat.label}
                    </Text>
                  </View>
                  {i < arr.length - 1 ? <View style={{ width: 0.5, height: 36, backgroundColor: 'rgba(255,255,255,0.7)' }} /> : null}
                </View>
              ))}
            </View>
            </GlassCard>
          ) : null}
          {profile.primaryCategory ? (
            <View style={{ marginTop: 2, flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
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
            <View style={{ marginTop: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={palette.textMuted} />
              <Text style={{ fontFamily: typography.fontFamily, color: palette.textMuted, fontSize: 13 }}>{location}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
