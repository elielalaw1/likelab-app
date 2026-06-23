import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'

type Props = {
  title: string
  subtitle: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
}

export function EmptyState({ title, subtitle, icon = 'information-outline' }: Props) {
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
      <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: 'rgba(124,63,242,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <MaterialCommunityIcons name={icon} size={26} color={redesign.color.purple} />
      </View>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.muted, textAlign: 'center', lineHeight: 19, maxWidth: 280 }}>
        {subtitle}
      </Text>
    </View>
  )
}
