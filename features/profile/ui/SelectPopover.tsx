import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { Option } from '@/features/profile/location-data'

type Props = {
  label: string
  value: string
  options: Option[]
  placeholder?: string
  onSelect: (value: string) => void
  searchable?: boolean
  showLabel?: boolean
}

export function SelectPopover({ label, value, options, placeholder, onSelect, searchable = false, showLabel = true }: Props) {
  const { colors, palette } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((item) => item.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const currentLabel = options.find((option) => option.value === value)?.label || value

  return (
    <View style={{ gap: 8 }}>
      {showLabel ? (
        <Text
          style={{
            color: palette.textMuted,
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.formLabel,
            fontWeight: '600',
            letterSpacing: 0.88,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: palette.borderColor,
          borderRadius: radii.input,
          height: 40,
          backgroundColor: palette.inputBg,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 14, color: value ? palette.text : palette.textMuted, fontFamily: typography.fontFamily }} numberOfLines={1}>
          {value ? currentLabel : placeholder || 'Select'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={palette.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: palette.overlayBg, justifyContent: 'center', padding: 16 }}>
          <Pressable
            onPress={() => undefined}
            style={{
              borderRadius: 16,
              backgroundColor: palette.sectionBg,
              borderWidth: 1,
              borderColor: palette.borderColor,
              maxHeight: 420,
              overflow: 'hidden',
            }}
          >
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: palette.borderColor, gap: 8 }}>
              <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700' }}>{label}</Text>
              {searchable ? (
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor={palette.textMuted}
                  style={{
                    height: 38,
                    borderWidth: 1,
                    borderColor: palette.borderColor,
                    borderRadius: radii.input,
                    paddingHorizontal: 10,
                    fontFamily: typography.fontFamily,
                    color: palette.text,
                    backgroundColor: palette.inputBg,
                  }}
                />
              ) : null}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.value}-${item.label}`}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.borderSoft }} />}
              ListEmptyComponent={
                <View style={{ padding: 12 }}>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>No results.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value)
                    setOpen(false)
                    setQuery('')
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: item.value === value ? 'rgba(74,18,160,0.08)' : 'transparent' }}
                >
                  <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14 }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
