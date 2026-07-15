import { ReactNode } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ElectricBorder } from '@/features/shared/ui/ElectricBorder'
import { TiltShimmer } from '@/features/shared/ui/TiltShimmer'
import type { Campaign } from '@/features/core/types'

// Tier framing for campaign cards. Gold campaigns get a metallic gold ring; partner
// campaigns get a live electric border (see ElectricBorder — a jittering noise-driven
// line dancing around the frame). Both carry a seal on the top-right corner (crown /
// LikeLab mark) signaling the tier. Standard campaigns render their children
// untouched — no wrapper, no animation cost.

const BORDER = 3.5

// Metallic gold — light catches at the corners, deepens along the edges.
const GOLD = ['#F7E7A9', '#E3B94D', '#B8860B', '#F1D585', '#C79A2E'] as const

// The rings deliberately cast NO colored glow — a tinted shadow reads as a dirty
// background on the app's light pages. The seal alone gets a soft neutral drop.
const SEAL_SHADOW = { shadowColor: '#0B0B0F', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }

const PARTNER_COLOR = '#7C5CFF'

// The real LikeLab mark — a partner campaign is OUR partnership, so the seal
// carries the brand logo rather than a generic icon.
const likelabLogo = require('@/assets/images/likelablogonew.png')

// The frame signals the campaign's PRESTIGE (its level: gold/partner), not its
// review flow. In V2 a Gold-level campaign may run the direct 'standard' tier —
// it still gets the gold frame. Falls back to campaign_tier for legacy rows
// (and the TEMP tier-preview flag) where level is null.
export function campaignVisualTier(c: Pick<Campaign, 'campaignLevel' | 'campaignTier'>): 'gold' | 'partner' | null {
  if (c.campaignLevel === 'partner') return 'partner'
  if (c.campaignLevel === 'gold') return 'gold'
  if (c.campaignLevel) return null // bronze/silver/cpm — never framed
  if (c.campaignTier === 'partner') return 'partner'
  if (c.campaignTier === 'gold') return 'gold'
  return null
}

export function TierBorder({
  tier,
  radius,
  children,
}: {
  tier: 'gold' | 'partner' | null | undefined
  /** Corner radius of the wrapped card — the ring hugs it at radius + border width. */
  radius: number
  children: ReactNode
}) {
  if (tier === 'gold') return <GoldRing radius={radius}>{children}</GoldRing>
  if (tier === 'partner') {
    return (
      <ElectricBorder radius={radius} color={PARTNER_COLOR}>
        {children}
        <TierSeal tier="partner" />
      </ElectricBorder>
    )
  }
  return <>{children}</>
}

// The seal coin itself — gold gradient + crown, or white + the LikeLab heart.
// Exported so compact surfaces (grid cards) can show the tier without the ring.
export function TierCoin({ tier, size = 30 }: { tier: 'gold' | 'partner'; size?: number }) {
  const gold = tier === 'gold'
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: size >= 28 ? 2 : 1.5,
        borderColor: 'rgba(255,255,255,0.9)',
        ...SEAL_SHADOW,
      }}
    >
      {gold ? (
        <>
          <LinearGradient
            colors={['#F1D585', '#D4A537', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <MaterialCommunityIcons name="crown" size={Math.round(size * 0.53)} color="#5C430A" />
        </>
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
          <Image source={likelabLogo} style={{ width: Math.round(size * 0.9), height: Math.round(size * 0.9) }} resizeMode="contain" />
        </>
      )}
    </View>
  )
}

// Emblem pinned on the frame's top-right corner, signaling the tier. Lives on a
// non-clipping view so it can straddle the frame edge. Purely decorative — no
// tap-to-explain popup (it was unnecessary noise on gold/partner campaign cards).
function TierSeal({ tier }: { tier: 'gold' | 'partner' }) {
  return (
    <View style={{ position: 'absolute', top: -13, right: 14, zIndex: 20 }}>
      <TierCoin tier={tier} size={30} />
    </View>
  )
}

function GoldRing({ radius, children }: { radius: number; children: ReactNode }) {
  return (
    // Seal lives on a non-clipping outer view so it can straddle the frame edge.
    <View style={{ borderRadius: radius + BORDER }}>
      <View style={{ borderRadius: radius + BORDER, padding: BORDER, overflow: 'hidden' }}>
        <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* Tilt glint on the gold — children mask the center, so only the frame flashes */}
        <TiltShimmer intensity={0.5} />
        <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
      </View>
      <TierSeal tier="gold" />
    </View>
  )
}
