import { useEffect, useMemo, useState } from 'react'
import { FlatList, Image, Linking, Modal, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radii, spacing, typography } from '@/features/core/theme'
import { useNotifications } from '@/features/notifications/hooks'
import { useCreatorProfile } from '@/features/profile/hooks'

export function AppHeader() {
  const { unreadCount, notifications, markAllAsRead } = useNotifications()
  const { data: profile } = useCreatorProfile()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      markAllAsRead().catch(() => undefined)
    }
  }, [open, markAllAsRead])

  const list = useMemo(() => notifications.slice(0, 20), [notifications])

  const normalizeNotificationLink = (link?: string | null, type?: string | null) => {
    if (type === 'revision_requested') return '/(tabs)/deliverables'
    if (!link) return null
    if (link === '/dashboard/deliverables') return '/(tabs)/deliverables'
    return link
  }

  const openLink = async (link?: string | null, type?: string | null) => {
    const resolvedLink = normalizeNotificationLink(link, type)
    if (!resolvedLink) return
    setOpen(false)

    if (resolvedLink.startsWith('/')) {
      router.push(resolvedLink as never)
      return
    }

    const can = await Linking.canOpenURL(resolvedLink)
    if (can) await Linking.openURL(resolvedLink)
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radii.sidebarNav,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.likelabLavender,
          }}
        >
          <MaterialCommunityIcons name="star-four-points" size={16} color={colors.likelabIndigo} />
        </View>
        <Text
          style={{
            fontFamily: typography.fontFamily,
            fontWeight: '700',
            fontSize: 22,
            color: colors.foreground,
            letterSpacing: -0.2,
          }}
        >
          Likelab
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={() => setOpen(true)} hitSlop={8}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.mutedForeground} />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  right: -5,
                  top: -4,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: colors.destructive,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', fontFamily: typography.fontFamily }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.25)' }}>
          <Pressable
            onPress={() => undefined}
            style={{
              marginTop: 80,
              marginHorizontal: 16,
              borderRadius: 16,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.7)',
              maxHeight: 360,
              overflow: 'hidden',
            }}
          >
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(234,236,239,0.8)' }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                Notifications
              </Text>
            </View>

            <FlatList
              data={list}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(234,236,239,0.8)' }} />}
              ListEmptyComponent={
                <View style={{ padding: 14 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: colors.mutedForeground }}>
                    No notifications yet.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => openLink(item.link, item.type)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                    {item.title || 'Notification'}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: colors.mutedForeground }} numberOfLines={2}>
                    {item.message || ''}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
