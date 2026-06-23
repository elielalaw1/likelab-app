import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated'
import type { ReactNode } from 'react'
import { Campaign } from '@/features/core/types'
import { formatCampaignGoal } from '@/features/core/format'
import { redesign, typography } from '@/features/core/theme'

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
  node: ReactNode
  danger?: boolean
}

function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, lineHeight: 23, color: redesign.color.ink }}>
      {children}
    </Text>
  )
}

export function CampaignBriefModal({ visible, onClose, campaign }: Props) {
  if (!campaign) return null

  const blocks: Block[] = []
  if (campaign.campaignGoal) blocks.push({ label: 'Campaign goal', icon: 'target', tint: 'rgba(124,63,242,0.12)', accent: '#7A3FF2', node: <Paragraph>{formatCampaignGoal(campaign.campaignGoal)}</Paragraph> })
  if (campaign.description) blocks.push({ label: 'Product description', icon: 'cube-outline', tint: 'rgba(31,200,232,0.14)', accent: '#0E92AD', node: <Paragraph>{campaign.description}</Paragraph> })
  if (campaign.preferredCreators) blocks.push({ label: 'Preferred creators', icon: 'account-star-outline', tint: 'rgba(242,92,193,0.14)', accent: '#C23F95', node: <Paragraph>{campaign.preferredCreators}</Paragraph> })
  if (campaign.instructions) blocks.push({ label: 'Your instructions', icon: 'pencil-outline', tint: 'rgba(16,159,110,0.12)', accent: '#0E9F6E', node: <Paragraph>{campaign.instructions}</Paragraph> })
  if (campaign.videoRequirements) blocks.push({ label: 'Video requirements', icon: 'video-outline', tint: 'rgba(242,92,193,0.12)', accent: '#C23F95', node: <Paragraph>{campaign.videoRequirements}</Paragraph> })
  if (campaign.briefGuidelines) blocks.push({ label: 'Brief & guidelines', icon: 'file-document-outline', tint: 'rgba(124,63,242,0.12)', accent: '#7A3FF2', node: <Paragraph>{campaign.briefGuidelines}</Paragraph> })
  if ((campaign.keyMessages || []).length > 0) {
    blocks.push({
      label: 'Key messages',
      icon: 'message-text-outline',
      tint: 'rgba(45,212,191,0.14)',
      accent: '#0E92AD',
      node: (
        <View style={{ gap: 10 }}>
          {campaign.keyMessages?.map((msg, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: redesign.color.purple, marginTop: 9 }} />
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 15, lineHeight: 22, color: redesign.color.ink }}>{msg}</Text>
            </View>
          ))}
        </View>
      ),
    })
  }
  if (campaign.brandVoice) blocks.push({ label: 'Brand voice', icon: 'account-voice', tint: 'rgba(45,212,191,0.14)', accent: '#0E92AD', node: <Paragraph>{campaign.brandVoice}</Paragraph> })
  if (campaign.brandTone) blocks.push({ label: 'Brand tone', icon: 'tune-variant', tint: 'rgba(242,92,193,0.12)', accent: '#C23F95', node: <Paragraph>{campaign.brandTone}</Paragraph> })
  if (campaign.targetAudience) blocks.push({ label: 'Target audience', icon: 'account-group-outline', tint: 'rgba(31,200,232,0.14)', accent: '#0E92AD', node: <Paragraph>{campaign.targetAudience}</Paragraph> })
  if (campaign.thingsToAvoid) blocks.push({ label: 'Things to avoid', icon: 'cancel', tint: 'rgba(239,68,68,0.12)', accent: '#DC2626', danger: true, node: <Paragraph>{campaign.thingsToAvoid}</Paragraph> })

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Grabber */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: 'rgba(11,11,15,0.14)' }} />
          </View>

          {/* Header */}
          {visible ? (
            <Animated.View
              entering={FadeIn.duration(260)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 }}
            >
              {/* Holographic logo tile — accent used sparingly */}
              <LinearGradient
                colors={redesign.gradient.holographic}
                locations={redesign.gradient.holographicLocations}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="file-document-outline" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Full brief
                </Text>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 21, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, marginTop: 1 }} numberOfLines={1}>
                  {campaign.title}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center', ...redesign.shadow.card }}
              >
                <MaterialCommunityIcons name="close" size={20} color={redesign.color.ink} />
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Thin holographic divider */}
          <LinearGradient
            colors={redesign.gradient.holographic}
            locations={redesign.gradient.holographicLocations}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 2, marginHorizontal: 20, borderRadius: 999, opacity: 0.85 }}
          />

          {visible ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
              {blocks.length ? (
                blocks.map((b, i) => (
                  <Animated.View
                    key={b.label}
                    entering={FadeInUp.springify().damping(15).mass(0.7).stiffness(140).delay(140 + i * 75)}
                    style={{
                      backgroundColor: redesign.color.card,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: b.danger ? 'rgba(239,68,68,0.16)' : redesign.color.hairlineStrong,
                      padding: 18,
                      gap: 12,
                      ...redesign.shadow.card,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: b.tint, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name={b.icon} size={16} color={b.accent} />
                      </View>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        {b.label}
                      </Text>
                    </View>
                    {b.node}
                  </Animated.View>
                ))
              ) : (
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, color: redesign.color.muted }}>
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
