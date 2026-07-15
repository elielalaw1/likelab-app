import { Modal, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  visible: boolean
  onClose: () => void
  /** Human-readable current phase label, once the backend returns structured
   *  { current_phase, allowed_phases } instead of a bare "phase_locked" string
   *  (see the Lovable prompt) — falls back to generic copy until then. */
  currentPhaseLabel?: string
}

// Shown when the backend rejects a video upload with a `phase_locked` error — the
// campaign isn't in its filming window right now, so process-video-upload refuses
// the submission. Replaces the raw "phase_locked" text with an explanation the
// creator can actually act on.
export function UploadBlockedModal({ visible, onClose, currentPhaseLabel }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,12,24,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: redesign.color.card, borderRadius: 20, padding: 24, gap: 14, maxWidth: 340, width: '100%', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(99,80,184,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="lock-clock" size={28} color={redesign.color.purple} />
          </View>
          <Text style={{ color: redesign.color.ink, fontSize: 18, fontWeight: '800', fontFamily: typography.fontFamily, textAlign: 'center' }}>
            Uploads aren&apos;t open right now
          </Text>
          <Text style={{ color: redesign.color.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '500', fontFamily: typography.fontFamily, textAlign: 'center' }}>
            {currentPhaseLabel
              ? `This campaign is currently in "${currentPhaseLabel}" — video uploads open once it moves into the filming phase.`
              : "This campaign isn't in its filming window right now, so video uploads aren't accepted yet. Check the campaign for its current stage, and try again once it's in the filming phase."}
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
            <LiquidButton label="Got it" onPress={onClose} minHeight={46} borderRadius={999} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
