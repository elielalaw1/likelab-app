import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { useCreatorProfile } from '@/features/profile/hooks'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { colors, palette, radii, typography } from '@/features/core/theme'

const NOTICE_KEY_PREFIX = 'creator_approved_notice_seen_v1:'
const STATUS_KEY_PREFIX = 'creator_review_status_last_v1:'
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'unknown'

export function CreatorApprovalNotice() {
  const { data: profile, isFetched } = useCreatorProfile()
  const { session, loading: sessionLoading } = useAuthSession()
  const [open, setOpen] = useState(false)
  const shownInSessionRef = useRef(false)

  const noticeKey = useMemo(() => {
    const userId = session?.user?.id
    return userId ? `${NOTICE_KEY_PREFIX}${userId}` : null
  }, [session?.user?.id])
  const statusKey = useMemo(() => {
    const userId = session?.user?.id
    return userId ? `${STATUS_KEY_PREFIX}${userId}` : null
  }, [session?.user?.id])

  const cardEnter = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current
  const burst = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current

  const currentStatus: ReviewStatus = (() => {
    const value = (profile?.reviewStatus || '').toLowerCase().trim()
    if (value === 'approved' || value === 'pending' || value === 'rejected') return value
    return 'unknown'
  })()

  const persistSeen = useCallback(async () => {
    if (!noticeKey) return
    try {
      await SecureStore.setItemAsync(noticeKey, '1')
    } catch {
      // If persistence fails, keep session-level protection.
    }
  }, [noticeKey])

  const runEnterAnimation = useCallback(() => {
    cardEnter.setValue(0)
    burst.forEach((value) => value.setValue(0))

    Animated.spring(cardEnter, {
      toValue: 1,
      friction: 7,
      tension: 85,
      useNativeDriver: true,
    }).start()

    Animated.stagger(
      40,
      burst.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start()
  }, [burst, cardEnter])

  const tryOpen = useCallback(() => {
    if (shownInSessionRef.current) return
    shownInSessionRef.current = true
    void persistSeen()
    setOpen(true)
    runEnterAnimation()
  }, [persistSeen, runEnterAnimation])

  useEffect(() => {
    let mounted = true

    async function syncAndMaybeOpen() {
      if (sessionLoading || !isFetched || !statusKey) return
      if (currentStatus === 'unknown') return

      let previousStatus: ReviewStatus | null = null
      try {
        const value = await SecureStore.getItemAsync(statusKey)
        if (value === 'approved' || value === 'pending' || value === 'rejected') {
          previousStatus = value
        }
      } catch {
        previousStatus = null
      }

      if (!mounted) return

      // Show only on real transition into approved from pending/rejected.
      if (currentStatus === 'approved' && (previousStatus === 'pending' || previousStatus === 'rejected')) {
        tryOpen()
      }

      try {
        await SecureStore.setItemAsync(statusKey, currentStatus)
      } catch {
        // Non-blocking
      }

    }

    void syncAndMaybeOpen()

    return () => {
      mounted = false
    }
  }, [currentStatus, isFetched, sessionLoading, statusKey, tryOpen])

  useFocusEffect(
    useCallback(() => {
      // Keep focus callback as no-op placeholder to preserve current behavior
      // without retriggering popup on every app launch.
    }, [])
  )

  useEffect(() => {
    if (!open) return

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()

    return () => loop.stop()
  }, [open, pulse])

  const closeNotice = useCallback(() => {
    setOpen(false)
    void persistSeen()
  }, [persistSeen])

  const burstAngles = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeNotice}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.30)', justifyContent: 'center', padding: 20 }}>
        <Animated.View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: 'rgba(234,236,239,0.95)',
            backgroundColor: '#fff',
            padding: 18,
            alignItems: 'center',
            gap: 12,
            transform: [
              {
                scale: cardEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
              {
                translateY: cardEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
            opacity: cardEnter.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 102, height: 102 }}>
            {burst.map((value, index) => {
              const angle = (burstAngles[index] * Math.PI) / 180
              const travel = 52
              const x = Math.cos(angle) * travel
              const y = Math.sin(angle) * travel
              return (
                <Animated.View
                  key={`burst-${index}`}
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: index % 2 === 0 ? '#22D3EE' : '#D946EF',
                    transform: [
                      {
                        translateX: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, x],
                        }),
                      },
                      {
                        translateY: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, y],
                        }),
                      },
                      {
                        scale: value.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.8, 1, 0.2],
                        }),
                      },
                    ],
                    opacity: value.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0, 1, 0],
                    }),
                  }}
                />
              )
            })}

            <Animated.View
              style={{
                position: 'absolute',
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: colors.primary,
                transform: [{ scale: pulse }],
                opacity: 0.2,
              }}
            />
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: 'rgba(74,18,160,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="party-popper" size={32} color={colors.primary} />
            </View>
            <MaterialCommunityIcons name="star-four-points" size={18} color="#22D3EE" style={{ position: 'absolute', right: 4, top: 6 }} />
            <MaterialCommunityIcons name="star-four-points" size={15} color="#D946EF" style={{ position: 'absolute', left: 8, bottom: 9 }} />
          </View>

          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 21, fontWeight: '800', textAlign: 'center' }}>
            Congratulations!
          </Text>
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            You are now approved. Your creator account is fully unlocked.
          </Text>

          <View style={{ width: '100%', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(234,236,239,0.9)', padding: 10, gap: 6 }}>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>
              What you can do now
            </Text>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>• Apply to campaigns</Text>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>• Accept brand invitations</Text>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>• Submit deliverables for active campaigns</Text>
          </View>

          <Pressable
            onPress={closeNotice}
            style={{
              minHeight: 44,
              minWidth: 190,
              borderRadius: radii.button,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700' }}>
              Start Applying
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}
