import { ReactNode } from 'react'
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, palette, typography } from '@/features/core/theme'

type Tone = 'primary' | 'neutral' | 'success' | 'danger'

type Props = {
  label: string
  onPress?: () => void
  disabled?: boolean
  icon?: ReactNode
  tone?: Tone
  minHeight?: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

const toneText: Record<Tone, string> = {
  primary: '#FFFFFF',
  neutral: palette.textMuted,
  success: '#0F9F6E',
  danger: colors.destructive,
}

const toneBorder: Record<Tone, string> = {
  primary: 'transparent',
  neutral: 'rgba(255,255,255,0.38)',
  success: 'rgba(167,243,208,0.9)',
  danger: 'rgba(254,202,202,0.9)',
}

const toneFillTop: Record<Tone, string> = {
  primary: colors.foreground,
  neutral: 'rgba(255,255,255,0.24)',
  success: 'rgba(236,253,245,0.72)',
  danger: 'rgba(254,242,242,0.72)',
}

const toneFillBottom: Record<Tone, string> = {
  primary: colors.foreground,
  neutral: 'rgba(255,255,255,0.12)',
  success: 'rgba(220,252,231,0.42)',
  danger: 'rgba(254,226,226,0.42)',
}

const toneBottomShadow: Record<Tone, string> = {
  primary: 'rgba(15,23,42,0)',
  neutral: 'rgba(15,23,42,0.05)',
  success: 'rgba(15,159,110,0.08)',
  danger: 'rgba(239,68,68,0.08)',
}

const toneShadow: Record<Tone, string> = {
  primary: '#0F172A',
  neutral: '#0F172A',
  success: '#0F172A',
  danger: '#0F172A',
}

export function LiquidButton({
  label,
  onPress,
  disabled = false,
  icon,
  tone = 'primary',
  minHeight = 52,
  borderRadius = 20,
  style,
}: Props) {
  const effectiveRadius = tone === 'primary' ? 999 : borderRadius

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          minHeight,
          borderRadius: effectiveRadius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: toneBorder[tone],
          justifyContent: 'center',
          shadowColor: toneShadow[tone],
          shadowOpacity: tone === 'primary' ? 0 : 0.08,
          shadowRadius: tone === 'primary' ? 0 : 12,
          shadowOffset: { width: 0, height: tone === 'primary' ? 0 : 4 },
          elevation: tone === 'primary' ? 0 : 4,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {tone === 'primary' ? null : <BlurView tint="light" intensity={42} style={{ position: 'absolute', inset: 0 }} />}
      <LinearGradient
        colors={[toneFillTop[tone], toneFillBottom[tone]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      {tone === 'primary' ? null : (
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.75 }}
          style={{ position: 'absolute', inset: 0, borderRadius: effectiveRadius }}
        />
      )}
      {tone === 'primary' ? null : (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.55 }}
            style={{ position: 'absolute', left: 1, right: 1, top: 1, height: 14, borderTopLeftRadius: effectiveRadius, borderTopRightRadius: effectiveRadius }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(15,23,42,0)', toneBottomShadow[tone]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, borderBottomLeftRadius: effectiveRadius, borderBottomRightRadius: effectiveRadius }}
          />
        </>
      )}
      <View
        style={{
          minHeight,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {icon}
        <Text style={{ color: toneText[tone], fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
