import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCreatorProfile } from '@/features/profile/hooks'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { FLOATING_TAB_BAR_HEIGHT, getFloatingTabBarBottomOffset } from '@/features/navigation/floatingTabBar.constants'
import { getProfileCompletion } from '@/features/profile/completion'
import { ProfileWizardModal } from '@/features/profile/ui/ProfileWizardModal'

function useTypewriter(text: string, active: boolean, speed = 45, pauseAfter?: string, pauseMs = 800) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    setDisplayed(''); setDone(false)
    let i = 0
    let cancelled = false
    const pauseIndex = pauseAfter ? text.indexOf(pauseAfter) + pauseAfter.length : -1
    function tick() {
      if (cancelled) return
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { setDone(true); return }
      setTimeout(tick, pauseIndex > 0 && i === pauseIndex ? pauseMs : speed)
    }
    setTimeout(tick, speed)
    return () => { cancelled = true }
  }, [text, active, speed, pauseAfter, pauseMs])

  return { displayed, done }
}

type Props = { userId: string }

export function ProfileGate({ userId: _userId }: Props) {
  const { data: profile, isLoading, isFetched } = useCreatorProfile()
  const insets = useSafeAreaInsets()
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const glowOpacity = useSharedValue(0)

  useEffect(() => {
    glowOpacity.value = dismissed
      ? withTiming(0, { duration: 300 })
      : withRepeat(withSequence(withTiming(0.28, { duration: 900 }), withTiming(0.08, { duration: 900 })), -1, false)
  }, [dismissed, glowOpacity])

  useEffect(() => {
    if (!isLoading && isFetched && profile && !getProfileCompletion(profile).isComplete) {
      setDismissed(false)
    }
  }, [isFetched, isLoading, profile])

  const dismiss = () => setDismissed(true)

  const completion = getProfileCompletion(profile)
  const profileComplete = completion.isComplete
  const displayName = profile?.displayName || 'creator'
  const welcomeText = `Welcome to Likelab, ${displayName}! Please fill out the rest of your information`
  const { displayed, done } = useTypewriter(welcomeText, !dismissed, 45, `${displayName}!`, 800)

  const percentage = completion.percentage
  const items = useMemo(() => completion.checklist.map((item) => ({ label: item.label, done: item.done })), [completion])
  const openWizard = () => setShowWizard(true)

  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }))
  const tabBarBottom = getFloatingTabBarBottomOffset(insets.bottom) + FLOATING_TAB_BAR_HEIGHT + 10

  if (isLoading || !isFetched || !profile || profileComplete) return null

  return (
    <>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {!dismissed && (
          <Pressable onPress={dismiss} style={StyleSheet.absoluteFill} pointerEvents="auto">
            <BlurView tint="dark" intensity={28} style={[StyleSheet.absoluteFill, { justifyContent: 'center', padding: 24 }]}>
              <Pressable onPress={() => {}} style={{ borderRadius: radii.card, backgroundColor: 'rgba(255,255,255,0.97)', padding: 24, gap: 16 }}>
                <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 20, fontWeight: '800', lineHeight: 28 }}>
                  {displayed}
                  {!done ? <Text style={{ color: colors.primary }}>|</Text> : null}
                </Text>
                {done && (
                  <Animated.View entering={FadeIn.duration(400)}>
                    <LiquidButton label="Complete Profile" onPress={() => { dismiss(); openWizard() }} minHeight={48} borderRadius={radii.button} />
                  </Animated.View>
                )}
              </Pressable>
            </BlurView>
          </Pressable>
        )}

        <Animated.View
          pointerEvents="auto"
          style={[{
            position: 'absolute',
            bottom: tabBarBottom,
            left: 16,
            right: 16,
            borderRadius: radii.card,
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderWidth: 1,
            borderColor: 'rgba(234,236,239,0.85)',
            shadowColor: colors.primary,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }, glowStyle]}
        >
          <Pressable onPress={() => { if (!dismissed) dismiss(); setExpanded((v) => !v) }}>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(139,92,246,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700' }}>Complete Your Profile</Text>
                  <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>{percentage}%</Text>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(234,236,239,0.9)', overflow: 'hidden', width: '100%' }}>
                  <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, percentage))}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                </View>
              </View>
              <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={palette.textMuted} />
            </View>
          </Pressable>

          {expanded && (
            <Animated.View entering={FadeIn.duration(200)} style={{ borderTopWidth: 1, borderTopColor: 'rgba(234,236,239,0.8)', padding: 14, gap: 10 }}>
              {items.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name={item.done ? 'check-circle-outline' : 'checkbox-blank-circle-outline'} size={17} color={item.done ? '#10B981' : 'rgba(74,18,160,0.55)'} />
                  <Text style={{ fontSize: 13, color: item.done ? colors.mutedForeground : palette.text, fontFamily: typography.fontFamily, textDecorationLine: item.done ? 'line-through' : 'none' }}>
                    {item.label}
                  </Text>
                </View>
              ))}
              <LiquidButton label="Complete Profile" onPress={openWizard} minHeight={44} borderRadius={radii.button} style={{ marginTop: 4 }} />
            </Animated.View>
          )}
        </Animated.View>
      </View>
      <ProfileWizardModal visible={showWizard} onClose={() => setShowWizard(false)} userId={_userId} />
    </>
  )
}
