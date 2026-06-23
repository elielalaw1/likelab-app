import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { redesign, typography } from '@/features/core/theme'

type Item = {
  id: 'avatar' | 'personal' | 'categories' | 'location' | 'account' | 'shipping'
  label: string
  done: boolean
}

type Props = {
  percentage: number
  items: readonly Item[]
  onPressItem: (id: Item['id']) => void
}

export function ProfileCompletionCard({ percentage, items, onPressItem }: Props) {
  const pct = Math.max(0, Math.min(100, percentage))
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        backgroundColor: redesign.color.card,
        padding: 16,
        gap: 12,
        ...redesign.shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text
          style={{ flex: 1, color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.2 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          Complete Your Profile
        </Text>
        <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 18, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{percentage}%</Text>
      </View>

      <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }} />
      </View>

      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <Pressable key={`${item.id}-${item.label}`} onPress={() => onPressItem(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons
              name={item.done ? 'check-circle' : 'checkbox-blank-circle-outline'}
              size={18}
              color={item.done ? redesign.color.successText : redesign.color.faint}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: item.done ? redesign.color.faint : redesign.color.ink,
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
