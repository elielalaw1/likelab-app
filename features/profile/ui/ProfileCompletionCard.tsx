import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radii, typography } from '@/features/core/theme'

type Item = {
  id: 'avatar' | 'personal' | 'categories' | 'location' | 'account'
  label: string
  done: boolean
}

type Props = {
  percentage: number
  items: readonly Item[]
  onPressItem: (id: Item['id']) => void
}

export function ProfileCompletionCard({ percentage, items, onPressItem }: Props) {
  return (
    <View
      style={{
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: 'rgba(74,18,160,0.22)',
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.foreground, fontFamily: typography.fontFamily, fontSize: 28, fontWeight: '700' }}>Complete Your Profile</Text>
        <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '700' }}>{percentage}%</Text>
      </View>

      <View style={{ height: 8, borderRadius: radii.full, backgroundColor: 'rgba(23,31,42,0.12)', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, percentage))}%`, backgroundColor: colors.primary }} />
      </View>

      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <Pressable key={`${item.id}-${item.label}`} onPress={() => onPressItem(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons
              name={item.done ? 'check-circle-outline' : 'checkbox-blank-circle-outline'}
              size={18}
              color={item.done ? '#10B981' : 'rgba(74,18,160,0.55)'}
            />
            <Text
              style={{
                fontSize: 14,
                color: item.done ? colors.mutedForeground : colors.foreground,
                fontFamily: typography.fontFamily,
                textDecorationLine: item.done ? 'line-through' : 'none',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
