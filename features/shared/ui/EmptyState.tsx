import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

type Props = {
  title: string
  subtitle: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
}

export function EmptyState({ title, subtitle, icon = 'information-outline' }: Props) {
  const { colors, palette } = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.cardBg,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <MaterialCommunityIcons name={icon} size={30} color={palette.textMuted} />
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600', color: palette.text }}>{title}</Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: palette.textMuted, textAlign: 'center' }}>{subtitle}</Text>
    </View>
  )
}
