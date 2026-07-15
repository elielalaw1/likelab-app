import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { radii, redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

const FONT = typography.fontFamily
const TERMS_URL = 'https://likelab.io/terms-of-service'
const PRIVACY_URL = 'https://likelab.io/privacy-policy'

type Props = {
  visible: boolean
  onAccept: () => void
  onClose: () => void
}

// Lightweight Terms gate shown before an application is created. Links out to the
// hosted Terms of Service / Privacy Policy; accepting proceeds with the apply. No
// backend — this is a UX acknowledgment (ToS is also accepted at signup).
export function TermsSheet({ visible, onAccept, onClose }: Props) {
  const insets = useSafeAreaInsets()

  const open = (url: string) => { haptic.light(); WebBrowser.openBrowserAsync(url).catch(() => {}) }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: redesign.color.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 18, ...redesign.shadow.card }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: redesign.color.hairlineStrong, marginBottom: 14 }} />

          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="text-box-check-outline" size={28} color={redesign.color.purple} />
            </View>
            <View style={{ alignItems: 'center', gap: 5 }}>
              <Text style={{ color: redesign.color.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, fontFamily: FONT, textAlign: 'center' }}>
                Before you apply
              </Text>
              <Text style={{ color: redesign.color.muted, fontSize: 13.5, lineHeight: 20, fontWeight: '500', fontFamily: FONT, textAlign: 'center', maxWidth: 300 }}>
                By applying you agree to LikeLab&apos;s Terms of Service and Privacy Policy.
              </Text>
            </View>
          </View>

          {/* Links */}
          <View style={{ gap: 10, marginTop: 18 }}>
            {[
              { label: 'Terms of Service', icon: 'file-document-outline' as const, url: TERMS_URL },
              { label: 'Privacy Policy', icon: 'lock-outline' as const, url: PRIVACY_URL },
            ].map((l) => (
              <Pressable
                key={l.url}
                onPress={() => open(l.url)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, paddingVertical: 13 }}
              >
                <MaterialCommunityIcons name={l.icon} size={19} color={redesign.color.purple} />
                <Text style={{ flex: 1, color: redesign.color.ink, fontSize: 14.5, fontWeight: '700', fontFamily: FONT }}>{l.label}</Text>
                <MaterialCommunityIcons name="arrow-top-right" size={17} color={redesign.color.faint} />
              </Pressable>
            ))}
          </View>

          {/* Actions */}
          <View style={{ gap: 8, marginTop: 18 }}>
            <LiquidButton
              label="I agree & apply"
              onPress={() => { haptic.success(); onAccept() }}
              minHeight={52}
              borderRadius={radii.button}
              icon={<MaterialCommunityIcons name="check" size={18} color="#fff" />}
            />
            <Pressable onPress={onClose} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: redesign.color.muted, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
