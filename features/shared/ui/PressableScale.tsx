import { ReactNode } from 'react'
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { haptic as hapticUtil } from '@/features/shared/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  scaleTo?: number
  /** which haptic to fire on press, or false to disable */
  haptic?: keyof typeof hapticUtil | false
}

/**
 * Pressable with a subtle scale-down + spring-back on press (Apple/Revolut feel).
 * Use for any tappable card/button that should feel responsive.
 */
export function PressableScale({ children, style, scaleTo = 0.97, haptic = 'selection', onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { if (!disabled) scale.value = withTiming(scaleTo, { duration: 90 }); onPressIn?.(e) }}
      onPressOut={(e) => { scale.value = withTiming(1, { duration: 150 }); onPressOut?.(e) }}
      onPress={(e) => { if (!disabled && haptic) hapticUtil[haptic](); onPress?.(e) }}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  )
}
