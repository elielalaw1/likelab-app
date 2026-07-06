import { useState } from 'react'
import { LayoutAnimation, Modal, Platform, Pressable, ScrollView, Text, UIManager, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { ReactNode } from 'react'
import { Campaign } from '@/features/core/types'
import { formatCampaignGoal } from '@/features/core/format'
import { redesign, typography } from '@/features/core/theme'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const FONT = typography.fontFamily

type Props = {
  visible: boolean
  onClose: () => void
  campaign: Campaign | null
}

type Block = {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  tint: string
  accent: string
  preview: string
  node: ReactNode
  danger?: boolean
}

function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: FONT, fontSize: 15, lineHeight: 23, color: redesign.color.ink }}>{children}</Text>
}

export function CampaignBriefModal({ visible, onClose, campaign }: Props) {
  // Accordion — one section open at a time so the sheet is a scannable list of
  // headers (each with a one-line teaser), never a wall of text.
  const [open, setOpen] = useState<string | null>(null)

  if (!campaign) return null

  // One accent — purple — across every section (design principle: purple as the
  // single sparse accent, no rainbow). Red is reserved for the one danger block.
  const ACCENT = redesign.color.purple
  const TINT = 'rgba(99,80,184,0.12)'
  const DANGER = '#DC2626'
  const DANGER_TINT = 'rgba(239,68,68,0.12)'

  const blocks: Block[] = []
  const push = (label: string, icon: Block['icon'], text?: string | null, danger?: boolean) => {
    const t = (text || '').trim()
    if (!t) return
    blocks.push({
      label,
      icon,
      accent: danger ? DANGER : ACCENT,
      tint: danger ? DANGER_TINT : TINT,
      preview: t,
      node: <Paragraph>{t}</Paragraph>,
      danger,
    })
  }

  push('The product', 'package-variant-closed', campaign.productDescription)
  push('Campaign goal', 'target', campaign.campaignGoal ? formatCampaignGoal(campaign.campaignGoal) : null)
  push('Sales pitch', 'bullhorn-outline', campaign.description)
  push('Your instructions', 'pencil-outline', campaign.instructions)
  push('Video requirements', 'video-outline', campaign.videoRequirements)
  push('Brief & guidelines', 'file-document-outline', campaign.briefGuidelines)
  if ((campaign.keyMessages || []).length > 0) {
    const msgs = campaign.keyMessages || []
    blocks.push({
      label: 'Key messages',
      icon: 'message-text-outline',
      accent: ACCENT,
      tint: TINT,
      preview: `${msgs.length} point${msgs.length === 1 ? '' : 's'} to hit`,
      node: (
        <View style={{ gap: 10 }}>
          {msgs.map((msg, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: redesign.color.purple, marginTop: 9 }} />
              <Text style={{ flex: 1, fontFamily: FONT, fontSize: 15, lineHeight: 22, color: redesign.color.ink }}>{msg}</Text>
            </View>
          ))}
        </View>
      ),
    })
  }
  push('Preferred creators', 'account-star-outline', campaign.preferredCreators)
  push('Brand voice', 'account-voice', campaign.brandVoice)
  push('Brand tone', 'tune-variant', campaign.brandTone)
  push('Target audience', 'account-group-outline', campaign.targetAudience)
  push('Things to avoid', 'cancel', campaign.thingsToAvoid, true)

  const toggle = (label: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
    setOpen((cur) => (cur === label ? null : label))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: 'rgba(11,11,15,0.14)' }} />
          </View>

          {/* Header — solid purple accent (no holographic gradient) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: redesign.color.purple, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>Full brief</Text>
              <Text style={{ fontFamily: FONT, fontSize: 21, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, marginTop: 1 }} numberOfLines={1}>
                {campaign.title}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="close" size={20} color={redesign.color.ink} />
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: redesign.color.hairlineStrong, marginHorizontal: 20 }} />

          {visible ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
              {blocks.length ? (
                blocks.map((b) => {
                  const isOpen = open === b.label
                  return (
                    <View
                      key={b.label}
                      style={{
                        backgroundColor: redesign.color.card,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: isOpen ? (b.danger ? 'rgba(239,68,68,0.22)' : redesign.color.purple) : redesign.color.hairlineStrong,
                        overflow: 'hidden',
                      }}
                    >
                      <Pressable onPress={() => toggle(b.label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: b.tint, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialCommunityIcons name={b.icon} size={17} color={b.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>{b.label}</Text>
                          {!isOpen ? (
                            <Text numberOfLines={1} style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted, marginTop: 1 }}>
                              {b.preview}
                            </Text>
                          ) : null}
                        </View>
                        <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={redesign.color.faint} />
                      </Pressable>
                      {isOpen ? (
                        <Animated.View entering={FadeIn.duration(160)} style={{ paddingHorizontal: 14, paddingBottom: 16, paddingTop: 2 }}>
                          {b.node}
                        </Animated.View>
                      ) : null}
                    </View>
                  )
                })
              ) : (
                <Text style={{ fontFamily: FONT, fontSize: 14, color: redesign.color.muted, padding: 8 }}>
                  No additional brief details have been added for this campaign yet.
                </Text>
              )}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  )
}
