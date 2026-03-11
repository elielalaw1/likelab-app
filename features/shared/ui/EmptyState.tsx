import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, typography } from '@/features/core/theme'

type Props = {
  title: string
  subtitle: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
}

export function EmptyState({ title, subtitle, icon = 'information-outline' }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.6)',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <MaterialCommunityIcons name={icon} size={30} color={colors.mutedForeground} />
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600', color: colors.foreground }}>{title}</Text>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>{subtitle}</Text>
    </View>
  )
}
