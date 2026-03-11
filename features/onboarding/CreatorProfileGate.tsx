import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, palette, radii, typography } from '@/features/core/theme'

type ChecklistItem = {
  key: string
  label: string
  done: boolean
}

type Props = {
  percentage: number
  checklist: ChecklistItem[]
  onCompleteProfile: () => void
}

export function CreatorProfileGate({ percentage, checklist, onCompleteProfile }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.7)',
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
        gap: 10,
      }}
    >
      <Pressable onPress={() => setExpanded((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FEF3C7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#B45309" />
        </View>
        <Text style={{ flex: 1, color: palette.text, fontWeight: '700', fontSize: 14, fontFamily: typography.fontFamily }}>
          Complete Your Profile
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>{percentage}%</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </Pressable>

      <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(23,31,42,0.12)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(0, Math.min(100, percentage))}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>

      {expanded ? (
        <View style={{ gap: 6 }}>
          {checklist.map((item) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons
                name={item.done ? 'check-circle-outline' : 'checkbox-blank-circle-outline'}
                size={18}
                color={item.done ? '#16A34A' : '#A5ACBA'}
              />
              <Text
                style={{
                  color: item.done ? colors.mutedForeground : palette.text,
                  fontSize: 14,
                  fontFamily: typography.fontFamily,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}

          <Pressable
            onPress={onCompleteProfile}
            style={{
              marginTop: 4,
              minHeight: 40,
              borderRadius: radii.button,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: typography.fontFamily }}>Complete Profile</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

