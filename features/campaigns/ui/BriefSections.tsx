import { ReactNode, useEffect, useState } from 'react'
import { LayoutAnimation, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { BlurView } from 'expo-blur'
import { HeartBurst } from '@/features/shared/ui/HeartBurst'
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated'
import type { Campaign } from '@/features/core/types'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// Creator-facing presentation of the campaign brief, built for lazy readers:
// one glanceable summary card answers "what do I get / do / when" in five seconds,
// and everything else lives in a flat accordion — collapsed rows with a one-line
// teaser, hairline dividers instead of boxes, + / - toggles. Nobody has to read
// anything they didn't ask for.
// HARD RULE: no money is EVER shown to creators — no prize pools, no SEK values,
// no CPM rates. Creators see what they do and what they receive, never amounts.


// Brands paste product links without a scheme ("mystore.com/x") — openURL
// rejects those outright. Normalize, and let callers await success.
export function openExternalUrl(raw: string): Promise<void> {
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`
  return Linking.openURL(url)
}

const BODY_TEXT = { fontSize: 14.5, color: redesign.color.ink, lineHeight: 22, fontWeight: '500' as const, fontFamily: typography.fontFamily }
const MICRO_LABEL = { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800' as const, color: redesign.color.faint, letterSpacing: 1.1, textTransform: 'uppercase' as const }

// Long brand-authored text collapses to four lines with a Read more toggle, so
// the brief stays scannable without hiding anything.
export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 180
  return (
    <View style={{ gap: 4 }}>
      <Text style={BODY_TEXT} numberOfLines={expanded || !long ? undefined : 4}>
        {text}
      </Text>
      {long ? (
        <Pressable onPress={() => { haptic.selection(); setExpanded((v) => !v) }} hitSlop={6}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', color: redesign.color.purple }}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
            <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={redesign.color.purple} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── How to film — ad styles + direction + script ─────────────────────────────
export const AD_STYLES: Record<string, { label: string; desc: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  pov: { label: 'POV', desc: 'First-person perspective — feels like the viewer is there', icon: 'eye-outline' },
  unboxing: { label: 'Unboxing', desc: 'Reveal the product for the first time on camera', icon: 'package-variant' },
  vlog: { label: 'Vlog style', desc: 'Day-in-the-life, product woven into real moments', icon: 'movie-open-outline' },
  talking_head: { label: 'In front of camera', desc: 'Speak directly to your audience', icon: 'account-voice' },
  demo: { label: 'Product demo', desc: 'Show the product in action — features & benefits', icon: 'play-box-outline' },
  storytime: { label: 'Storytime', desc: 'A short story or hook that ties into the product', icon: 'book-open-outline' },
}

export function HowToFilmBody({ campaign }: { campaign: Campaign }) {
  const styles = (campaign.adStyles || []).filter((s) => AD_STYLES[s])
  const direction = campaign.videoDirection
  const script = campaign.instructions
  return (
    <View style={{ gap: 14 }}>
      {styles.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={MICRO_LABEL}>Style</Text>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: redesign.color.ink, letterSpacing: -0.2 }}>
            {styles.map((key) => AD_STYLES[key].label).join('  ·  ')}
          </Text>
        </View>
      ) : null}
      {direction ? (
        <View style={{ gap: 4 }}>
          <Text style={MICRO_LABEL}>Direction</Text>
          <ExpandableText text={direction} />
        </View>
      ) : null}
      {script ? (
        <View style={{ gap: 4 }}>
          <Text style={MICRO_LABEL}>Script & instructions</Text>
          <ExpandableText text={script} />
        </View>
      ) : null}
    </View>
  )
}

export function DosDontsBody({ campaign }: { campaign: Campaign }) {
  const dos = campaign.keyMessages || []
  const dont = campaign.thingsToAvoid
  return (
    <View style={{ gap: 8 }}>
      {dos.map((msg, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <MaterialCommunityIcons name="check" size={16} color={redesign.color.successText} style={{ marginTop: 3 }} />
          <Text style={{ ...BODY_TEXT, flex: 1 }}>{msg}</Text>
        </View>
      ))}
      {dont ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MaterialCommunityIcons name="close" size={16} color="#E5484D" style={{ marginTop: 3 }} />
          <Text style={{ ...BODY_TEXT, flex: 1 }}>{dont}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function ProductBody({ campaign }: { campaign: Campaign }) {
  const { productDescription, productUrl, productAmount } = campaign
  // V2 partner campaigns describe the product in bonus_rewards_description;
  // product_description is only written by the legacy wizard.
  const text = productDescription || (campaign.campaignLevel === 'partner' ? campaign.bonusRewardsDescription : null)
  return (
    <View style={{ gap: 12 }}>
      {text ? <ExpandableText text={text} /> : null}
      {productAmount ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: redesign.color.bg }}>
          <MaterialCommunityIcons name="cube-outline" size={13} color={redesign.color.muted} />
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '700', color: redesign.color.ink }}>
            {`You'll receive ${productAmount} ${productAmount === 1 ? 'unit' : 'units'}`}
          </Text>
        </View>
      ) : null}
      {productUrl ? (
        <Pressable
          onPress={() => { haptic.selection(); openExternalUrl(productUrl).catch(() => undefined) }}
          accessibilityRole="button"
          accessibilityLabel="View product"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, borderRadius: 999, backgroundColor: redesign.color.ink }}
        >
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>View product</Text>
          <MaterialCommunityIcons name="open-in-new" size={15} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── The five-second summary — what do I get, what do I do, when ──────────────
export type GlanceRow = {
  label: string
  value: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  /** Renders the value in alarm red — deadlines about to close. */
  urgent?: boolean
}

export function CampaignGlance({ rows }: { rows: GlanceRow[] }) {
  if (!rows.length) return null
  return (
    <View style={{ backgroundColor: redesign.color.card, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 18 }}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: redesign.color.hairlineStrong }}
        >
          {row.icon ? <MaterialCommunityIcons name={row.icon} size={16} color={row.urgent ? '#E5484D' : redesign.color.faint} /> : null}
          <Text style={[MICRO_LABEL, { flex: 1 }]}>{row.label}</Text>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: row.urgent ? '#E5484D' : redesign.color.ink, letterSpacing: -0.3 }}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ─── Flat brief document — everything visible, nothing to operate ─────────────
// No accordion, no toggles: one quiet sheet where sections are separated by
// hairlines and whisper-quiet uppercase labels. Long text folds via Read more.
export type BriefDocSection = {
  key: string
  label: string
  content: ReactNode
}

export function BriefDocument({ sections }: { sections: BriefDocSection[] }) {
  if (!sections.length) return null
  return (
    <View style={{ backgroundColor: redesign.color.card, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 18 }}>
      {sections.map((section, i) => (
        <View
          key={section.key}
          style={{ paddingVertical: 20, gap: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: redesign.color.hairlineStrong }}
        >
          <Text style={MICRO_LABEL}>{section.label}</Text>
          {section.content}
        </View>
      ))}
    </View>
  )
}

// ─── Brief walkthrough — a floating card that celebrates the acceptance ───────
// Plays once when a creator first opens a campaign they've been accepted to:
// dark blur backdrop, confetti, a centered card that springs in, and one step
// per view with a staggered cascade (coin → title → content). After that the
// same steps live in the quiet accordion for reference.
export type BriefStep = {
  key: string
  title: string
  content: ReactNode
}

export function BriefWalkthrough({ visible, onClose, steps, campaignTitle }: { visible: boolean; onClose: () => void; steps: BriefStep[]; campaignTitle?: string | null }) {
  const { width, height } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (visible) setIndex(0)
  }, [visible])

  if (!steps.length) return null
  const step = steps[Math.min(index, steps.length - 1)]
  const isLast = index === steps.length - 1

  const next = () => {
    haptic.light()
    if (isLast) { haptic.success(); onClose(); return }
    setIndex((i) => i + 1)
  }
  const back = () => {
    haptic.selection()
    setIndex((i) => Math.max(0, i - 1))
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {/* Dim + blur backdrop — tap outside to dismiss */}
        <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close walkthrough" onPress={onClose} />

        {/* The floating card */}
        <Animated.View
          entering={ZoomIn.duration(240)}
          layout={LinearTransition.duration(240)}
          style={{
            width: Math.min(width - 40, 400),
            maxHeight: height * 0.74,
            borderRadius: 28,
            backgroundColor: redesign.color.card,
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 18,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={MICRO_LABEL}>{"You're in — here's the brief"}</Text>
              {campaignTitle ? (
                <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4, marginTop: 2 }}>
                  {campaignTitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: redesign.color.bg, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="close" size={17} color={redesign.color.muted} />
            </Pressable>
          </View>

          {/* Step content — remounts per step so the cascade replays */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <Animated.View key={step.key} style={{ gap: 12 }}>
              <Animated.View entering={ZoomIn.duration(200).delay(60)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.duration(280).delay(120)}>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 23, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.7, lineHeight: 28 }}>
                  {step.title}
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.duration(300).delay(190)} style={{ gap: 12 }}>
                {step.content}
              </Animated.View>
            </Animated.View>
          </ScrollView>

          {/* Dots + actions */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {steps.map((_, i) => (
                <Animated.View
                  key={i}
                  layout={LinearTransition.duration(200)}
                  style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 999, backgroundColor: i === index ? redesign.color.ink : redesign.color.hairlineStrong }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {index > 0 ? (
                <Pressable onPress={back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700', color: redesign.color.muted }}>Back</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <LiquidButton label={isLast ? "Got it — let's go" : 'Next'} onPress={next} minHeight={50} hapticFeedback={false} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Celebration — the walkthrough IS the acceptance peak moment */}
        {visible ? (
          <Animated.View pointerEvents="none" entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
            <HeartBurst count={24} origin={{ x: width / 2, y: height * 0.3 }} />
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  )
}

// ─── Quiet accordion — the same steps as reference, collapsed by default ──────
export function BriefAccordion({ items }: { items: BriefStep[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (!items.length) return null
  const toggle = (key: string) => {
    haptic.selection()
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'))
    setOpen((cur) => (cur === key ? null : key))
  }
  return (
    <View style={{ backgroundColor: redesign.color.card, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 18 }}>
      {items.map((item, i) => {
        const isOpen = open === item.key
        return (
          <View key={item.key} style={{ borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: redesign.color.hairlineStrong }}>
            <Pressable
              onPress={() => toggle(item.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17 }}
            >
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>{item.title}</Text>
              <MaterialCommunityIcons name={isOpen ? 'minus' : 'plus'} size={18} color={redesign.color.faint} />
            </Pressable>
            {isOpen ? <View style={{ paddingBottom: 18 }}>{item.content}</View> : null}
          </View>
        )
      })}
    </View>
  )
}
