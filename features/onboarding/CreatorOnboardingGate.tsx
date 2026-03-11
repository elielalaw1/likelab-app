import { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useCreatorProfile } from '@/features/profile/hooks'
import { getProfileCompletion } from '@/features/onboarding/useProfileCompletion'
import { getCreatorReviewStatus } from '@/features/onboarding/useCreatorReviewStatus'
import { CreatorProfileGate } from '@/features/onboarding/CreatorProfileGate'
import { CreatorPendingGate } from '@/features/onboarding/CreatorPendingGate'
import { FLOATING_TAB_BAR_HEIGHT, getFloatingTabBarBottomOffset } from '@/features/navigation/floatingTabBar.constants'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { useEffect } from 'react'

export function CreatorOnboardingGate() {
  const insets = useSafeAreaInsets()
  const { visible } = useFloatingTabBarVisibility()
  const { data: profile, isFetched, isLoading } = useCreatorProfile()
  const completion = getProfileCompletion(profile)
  const reviewStatus = getCreatorReviewStatus(profile)
  const translateDown = useSharedValue(0)

  let gate: ReactNode = null

  // Precedence:
  // 1) Profile incomplete => show profile gate only
  // 2) Profile complete + pending/rejected review => show review gate
  // 3) Approved => no gate
  if (!isLoading && isFetched && profile && !completion.isComplete) {
    gate = (
      <CreatorProfileGate
        percentage={completion.percentage}
        checklist={completion.checklist}
        onCompleteProfile={() => router.push('/settings')}
      />
    )
  } else if (!isLoading && isFetched && profile && (reviewStatus === 'pending' || reviewStatus === 'rejected')) {
    gate = <CreatorPendingGate state={reviewStatus} />
  }

  useEffect(() => {
    // When tab bar hides on downward scroll, move gate down to replace that area.
    translateDown.value = withTiming(visible ? 0 : FLOATING_TAB_BAR_HEIGHT - 8, { duration: 220 })
  }, [visible, translateDown])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateDown.value }],
  }))

  if (!gate) return null

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: getFloatingTabBarBottomOffset(insets.bottom) + FLOATING_TAB_BAR_HEIGHT + 8,
          zIndex: 50,
        },
        animatedStyle,
      ]}
    >
      {gate}
    </Animated.View>
  )
}
