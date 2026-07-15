import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { radii, redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'
import { saveApplyFormResponse } from '@/features/campaigns/api'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { toast } from '@/features/shared/ui/Toast'
import type { CampaignApplyForm } from '@/features/core/types'

const FONT = typography.fontFamily

type Props = {
  visible: boolean
  form: CampaignApplyForm | null
  applicationId: string | null
  brandName?: string | null
  onClose: () => void
}

// Appears right after "Apply to campaign" when the brand enabled an after-apply
// form (e.g. to collect a clothing size before shipping the product). Built
// dynamically from campaign.applyForm; saves onto the creator's application.
export function ApplyInfoSheet({ visible, form, applicationId, brandName, onClose }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const [size, setSize] = useState('')
  const [shoeSize, setShoeSize] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const questions = form?.questions ?? []
  const collectSize = !!form?.collectSize

  // Submit is gated on required fields: the clothing size (when collected) plus
  // any question flagged required. Optional fields never block.
  const canSubmit = useMemo(() => {
    if (collectSize && !size.trim()) return false
    for (const q of questions) {
      if (q.required && !(answers[q.id] ?? '').trim()) return false
    }
    return true
  }, [collectSize, size, questions, answers])

  const inputStyle = {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: palette.borderColor,
    backgroundColor: palette.inputBg,
    color: palette.text,
    fontSize: 15,
    fontFamily: FONT,
  }

  const submit = async () => {
    if (!applicationId || !canSubmit) return
    haptic.medium()
    setSubmitting(true)
    try {
      const response: Record<string, unknown> = { answers }
      if (collectSize) {
        response.size = size.trim()
        if (shoeSize.trim()) response.shoeSize = shoeSize.trim()
      }
      await saveApplyFormResponse(applicationId, response)
      haptic.success()
      onClose()
    } catch (e) {
      haptic.warning()
      toast.error(e instanceof Error ? e.message : 'Could not save your details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ maxHeight: '92%', backgroundColor: redesign.color.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, ...redesign.shadow.card }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: redesign.color.hairlineStrong, marginBottom: 4 }} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: insets.bottom + 24, gap: 16 }}
          >
            {/* Celebratory header — the application is already in */}
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: redesign.color.successBg, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="party-popper" size={30} color={redesign.color.successText} />
              </Animated.View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, fontFamily: FONT, textAlign: 'center' }}>
                  {brandName ? `Application sent to ${brandName}` : 'Application sent'}
                </Text>
                <Text style={{ color: redesign.color.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '500', fontFamily: FONT, textAlign: 'center', maxWidth: 280 }}>
                  {form?.message || 'Just a few quick details so the brand can prep your package.'}
                </Text>
              </View>
            </View>

            {/* Size collection */}
            {collectSize ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>Your size</Text>
                <TextInput value={size} onChangeText={setSize} placeholder="Clothing size (e.g. M / EU 40)" placeholderTextColor={palette.textMuted} editable={!submitting} style={inputStyle} />
                <TextInput value={shoeSize} onChangeText={setShoeSize} placeholder="Shoe size (optional)" placeholderTextColor={palette.textMuted} keyboardType="numbers-and-punctuation" editable={!submitting} style={inputStyle} />
              </View>
            ) : null}

            {/* Custom questions */}
            {questions.map((q) => (
              <View key={q.id} style={{ gap: 8 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>
                  {q.label}{q.required ? <Text style={{ color: redesign.color.purple }}> *</Text> : null}
                </Text>
                {q.type === 'select' && q.options?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {q.options.map((opt) => {
                      const active = answers[q.id] === opt
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => { haptic.selection(); setAnswers((a) => ({ ...a, [q.id]: opt })) }}
                          style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: active ? redesign.color.purple : redesign.color.hairlineStrong, backgroundColor: active ? 'rgba(99,80,184,0.10)' : redesign.color.card }}
                        >
                          <Text style={{ color: active ? redesign.color.purple : redesign.color.ink, fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>{opt}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                ) : (
                  <TextInput
                    value={answers[q.id] ?? ''}
                    onChangeText={(t) => setAnswers((a) => ({ ...a, [q.id]: t }))}
                    placeholder="Type your answer"
                    placeholderTextColor={palette.textMuted}
                    editable={!submitting}
                    multiline
                    style={[inputStyle, { minHeight: 48 }]}
                  />
                )}
              </View>
            ))}

            <View style={{ gap: 8, marginTop: 2 }}>
              <LiquidButton
                label={submitting ? 'Saving…' : 'Send details'}
                onPress={submit}
                disabled={!canSubmit || submitting}
                minHeight={50}
                borderRadius={radii.button}
                icon={<MaterialCommunityIcons name="send-outline" size={17} color="#fff" />}
              />
              <Pressable onPress={onClose} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: redesign.color.muted, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>I’ll add this later</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
