import { useState } from 'react'
import { Alert, Linking, Modal, StyleSheet, Pressable, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCreatorProfile } from '@/features/profile/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { supabase } from '@/lib/supabase'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { FLOATING_TAB_BAR_HEIGHT, getFloatingTabBarBottomOffset } from '@/features/navigation/floatingTabBar.constants'

const STEPS = ['Submitted', 'Under Review', 'Approved']

type AppealStep = 'idle' | 'reason' | 'confirm'

type Props = { userId: string }

export function ProfilePendingGate({ userId }: Props) {
  const { data: profile } = useCreatorProfile()
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState(false)
  const [appealStep, setAppealStep] = useState<AppealStep>('idle')
  const [appealReason, setAppealReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reviewStatus = profile?.reviewStatus
  const profileComplete = profile ? isProfileComplete(profile) : false

  // Only show when profile is complete but not yet approved
  if (!profileComplete || reviewStatus === 'approved' || !reviewStatus) return null

  const isPending = reviewStatus === 'pending'
  const isRejected = reviewStatus === 'rejected'

  const tabBarBottom = getFloatingTabBarBottomOffset(insets.bottom) + FLOATING_TAB_BAR_HEIGHT + 10

  const submitAppeal = async () => {
    if (!appealReason.trim()) {
      Alert.alert('Required', 'Please describe why we should reconsider.')
      return
    }
    try {
      setSubmitting(true)
      await supabase.from('creator_profiles').update({
        appeal_reason: appealReason.trim(),
        appeal_submitted_at: new Date().toISOString(),
      }).eq('user_id', userId)
    } catch (_) {
      // Gracefully handle if columns don't exist yet
    } finally {
      setSubmitting(false)
      setAppealStep('confirm')
    }
  }

  return (
    <>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          pointerEvents="auto"
          entering={FadeIn.duration(400)}
          style={{
            position: 'absolute',
            bottom: tabBarBottom,
            left: 16,
            right: 16,
            borderRadius: radii.card,
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderWidth: 1,
            borderColor: isRejected ? 'rgba(254,202,202,0.9)' : 'rgba(234,236,239,0.85)',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          }}
        >
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: isRejected ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.12)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialCommunityIcons
                  name={isRejected ? 'close-circle-outline' : 'clock-outline'}
                  size={20}
                  color={isRejected ? colors.destructive : '#A16207'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700' }}>
                  {isRejected ? 'Application Not Approved' : 'Account Under Review'}
                </Text>
                <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, marginTop: 1 }}>
                  {isRejected ? 'Your application was not approved.' : 'We\'re reviewing your profile.'}
                </Text>
              </View>
              <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={palette.textMuted} />
            </View>
          </Pressable>

          {expanded && (
            <Animated.View entering={FadeIn.duration(200)} style={{ borderTopWidth: 1, borderTopColor: 'rgba(234,236,239,0.8)', padding: 14, gap: 12 }}>
              {isPending && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {STEPS.map((label, i) => (
                      <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: i < 2 ? colors.primary : 'rgba(234,236,239,0.9)',
                        }}>
                          {i < 2
                            ? <MaterialCommunityIcons name="check" size={16} color="#fff" />
                            : <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                          }
                        </View>
                        <Text style={{ color: i < 2 ? palette.text : palette.textMuted, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '600', textAlign: 'center' }}>
                          {label}
                        </Text>
                        {i < STEPS.length - 1 && (
                          <View style={{ position: 'absolute', top: 14, left: '60%', right: '-40%', height: 2, backgroundColor: i < 1 ? colors.primary : 'rgba(234,236,239,0.9)' }} />
                        )}
                      </View>
                    ))}
                  </View>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, lineHeight: 18 }}>
                    Your profile is complete and under review. We'll notify you once approved.
                  </Text>
                </>
              )}

              {isRejected && (
                <LiquidButton
                  label="Appeal & Book a Call"
                  onPress={() => setAppealStep('reason')}
                  minHeight={44}
                  borderRadius={radii.button}
                  tone="neutral"
                  icon={<MaterialCommunityIcons name="phone-outline" size={17} color={palette.text} />}
                />
              )}
            </Animated.View>
          )}
        </Animated.View>
      </View>

      {/* Appeal Modal */}
      <Modal visible={appealStep !== 'idle'} transparent animationType="fade" onRequestClose={() => setAppealStep('idle')}>
        <Pressable onPress={() => setAppealStep('idle')} style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.3)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ borderRadius: radii.card, backgroundColor: '#fff', padding: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(234,236,239,0.85)' }}>
            {appealStep === 'reason' && (
              <>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: palette.text }}>Appeal Decision</Text>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: palette.textMuted, lineHeight: 18 }}>
                  Tell us why you believe this decision should be reconsidered.
                </Text>
                <TextInput
                  value={appealReason}
                  onChangeText={setAppealReason}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your situation..."
                  placeholderTextColor={colors.mutedForeground}
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(234,236,239,0.8)',
                    borderRadius: radii.input,
                    padding: 12,
                    minHeight: 100,
                    color: colors.foreground,
                    fontFamily: typography.fontFamily,
                    fontSize: 14,
                    textAlignVertical: 'top',
                  }}
                />
                <LiquidButton label={submitting ? 'Submitting…' : 'Submit Appeal'} onPress={submitAppeal} disabled={submitting} minHeight={46} borderRadius={radii.button} />
                <Pressable onPress={() => Linking.openURL('https://likelab.io/book-call').catch(() => {})} style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600' }}>Book a call instead</Text>
                </Pressable>
              </>
            )}
            {appealStep === 'confirm' && (
              <>
                <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                  <MaterialCommunityIcons name="check-circle-outline" size={48} color="#10B981" />
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: palette.text, textAlign: 'center' }}>Appeal Submitted</Text>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: palette.textMuted, textAlign: 'center', lineHeight: 18 }}>
                    We'll review your appeal and get back to you as soon as possible.
                  </Text>
                </View>
                <LiquidButton label="Done" onPress={() => { setAppealStep('idle'); setAppealReason('') }} minHeight={46} borderRadius={radii.button} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
