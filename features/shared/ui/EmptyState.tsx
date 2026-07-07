import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'

// Empty states carry the brand: the LikeLab heart on a soft neutral coin instead
// of a generic glyph — quiet, but unmistakably ours.
const likelabLogo = require('@/assets/images/likelablogonew.png')

type Props = {
  title: string
  subtitle: string
  /** Kept for call-site compatibility — the visual is now the brand mark. */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  /** Optional primary action so an empty state is never a dead-end. */
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        backgroundColor: redesign.color.card,
        borderRadius: 22,
        paddingVertical: 30,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 10,
        ...redesign.shadow.card,
      }}
    >
      <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: 'rgba(11,11,15,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <Image source={likelabLogo} style={{ width: 34, height: 34, opacity: 0.92 }} resizeMode="contain" />
      </View>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.muted, textAlign: 'center', lineHeight: 19, maxWidth: 280 }}>
        {subtitle}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => { haptic.selection(); onAction() }}
          style={{ marginTop: 6, minHeight: 44, borderRadius: 13, paddingHorizontal: 20, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
