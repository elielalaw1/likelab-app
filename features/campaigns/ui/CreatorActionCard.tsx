import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import type { CreatorAction } from '@/features/campaigns/phase'

const ICONS: Record<CreatorAction['kind'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  await_selection: 'clock-outline',
  not_selected: 'close-circle-outline',
  await_product: 'package-variant-closed',
}

// The one "what to do now" card for every pre-deliverable state (see
// getCreatorAction in features/campaigns/phase.ts) — matches the icon-chip +
// text row already used for the deliverable instruction card in
// CampaignVideoGrid, so the two "next step" surfaces read as one system.
export function CreatorActionCard({ action }: { action: CreatorAction }) {
  const isNotSelected = action.kind === 'not_selected'
  const tone = isNotSelected
    ? { bg: 'rgba(11,11,15,0.05)', color: '#6B6B76' }
    : { bg: 'rgba(99,80,184,0.10)', color: redesign.color.purple }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: redesign.color.card,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        padding: 13,
      }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={ICONS[action.kind]} size={16} color={tone.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: redesign.color.ink, fontSize: 13.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{action.title}</Text>
        <Text style={{ color: redesign.color.muted, fontSize: 12.5, lineHeight: 18, fontWeight: '600', fontFamily: typography.fontFamily }}>{action.body}</Text>
        {isNotSelected ? (
          <Pressable
            onPress={() => { haptic.selection(); router.navigate('/(tabs)/overview') }}
            hitSlop={6}
            style={{ marginTop: 4, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: redesign.color.purple, fontSize: 12.5, fontWeight: '800', fontFamily: typography.fontFamily }}>Browse other campaigns →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
