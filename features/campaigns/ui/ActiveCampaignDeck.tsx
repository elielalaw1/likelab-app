import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import type { Campaign } from '@/features/core/types'

// Cover art (or a branded gradient placeholder) filling its parent.
function Cover({ url, radius = 16 }: { url?: string | null; radius?: number }) {
  return url ? (
    <ExpoImage source={{ uri: url }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} contentFit="cover" transition={150} />
  ) : (
    <LinearGradient colors={['rgba(99,80,184,0.32)', 'rgba(99,80,184,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
  )
}

// A status chip that reads over a dark cover image — solid purple when there's work to do,
// frosted white when the campaign is all caught up.
function OverlayStatus({ todo }: { todo: number }) {
  if (todo > 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: redesign.color.purple }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '900' }}>{`${todo} to do`}</Text>
      </View>
    )
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.18)' }}>
      <MaterialCommunityIcons name="check" size={13} color="#fff" />
      <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>Up to date</Text>
    </View>
  )
}

// Collapsed: a fanned stack of just the active campaigns' cover art. Tapping it springs up
// a full flow of every active campaign; tap one to jump straight into it.
export function ActiveCampaignDeck({
  campaigns,
  badgeCounts,
  onPress,
}: {
  campaigns: Campaign[]
  badgeCounts: Record<string, number>
  onPress: (campaign: Campaign) => void
}) {
  // All hooks first — before any early return — so the hook order stays stable.
  const [open, setOpen] = useState(false)
  const [bgIdx, setBgIdx] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const { width, height } = useWindowDimensions()
  const coverUrls = campaigns.map((c) => c.coverImageUrl).filter((u): u is string => !!u)

  // Slowly cross-fade through the active campaigns' covers behind the CTA — the imagery
  // gives it life; expo-image handles the fade when the source swaps.
  useEffect(() => {
    if (coverUrls.length < 2) return
    const id = setInterval(() => setBgIdx((i) => (i + 1) % coverUrls.length), 3500)
    return () => clearInterval(id)
  }, [coverUrls.length])

  if (!campaigns.length) return null

  const totalTodo = campaigns.reduce((n, c) => n + (badgeCounts[c.id] || 0), 0)
  const modalW = Math.min(width - 36, 400)
  const cardH = Math.min(316, Math.round(height * 0.42))
  // Card is narrower than the panel so the NEXT card peeks at the right edge — an
  // unmistakable "there's more, swipe" affordance.
  const cardGap = 12
  const cardW = modalW - 52
  const activeCover = campaigns[Math.min(pageIndex, campaigns.length - 1)]?.coverImageUrl

  const openDeck = () => {
    haptic.light()
    setPageIndex(0)
    setOpen(true)
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Hero CTA — the active campaigns' covers cross-fade behind bold type; tap to browse. */}
      <Pressable onPress={openDeck} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        <View style={{ height: 134, borderRadius: 22, overflow: 'hidden', backgroundColor: redesign.color.ink, ...redesign.shadow.card }}>
          {coverUrls.length ? (
            <ExpoImage source={{ uri: coverUrls[bgIdx % coverUrls.length] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={700} />
          ) : (
            <LinearGradient colors={['#2A2540', '#0B0B0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(11,11,15,0.20)', 'rgba(11,11,15,0.55)', 'rgba(11,11,15,0.88)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

          <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>My active</Text>
              {totalTodo > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: redesign.color.purple }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '900' }}>{`${totalTodo} to do`}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 38, fontWeight: '900', letterSpacing: -1.4 }}>{campaigns.length}</Text>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 5 }}>{campaigns.length === 1 ? 'active campaign' : 'active campaigns'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800' }}>Browse</Text>
                <MaterialCommunityIcons name="chevron-right" size={17} color="#fff" />
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          {/* Frosted-glass backdrop — the app behind the popup blurs so the panel floats. */}
          <BlurView tint="dark" intensity={38} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,15,0.32)' }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <Animated.View
            entering={ZoomIn.springify().damping(16).mass(0.8)}
            style={{ width: modalW, borderRadius: 30, overflow: 'hidden', backgroundColor: redesign.color.ink, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', ...redesign.shadow.cta }}
          >
            {/* Ambient colour bed: the current campaign's cover, blurred, tinting the whole
                box — cross-fades as you swipe so the panel breathes colour. A rich gradient
                stands in when a campaign has no cover. */}
            {activeCover ? (
              <ExpoImage source={{ uri: activeCover }} blurRadius={45} style={StyleSheet.absoluteFill} contentFit="cover" transition={450} />
            ) : (
              <LinearGradient colors={['#3A2E63', '#191627', '#0B0B0F']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,11,15,0.48)' }]} pointerEvents="none" />
            {/* soft top sheen — frames the panel and adds depth */}
            <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.45 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>My active</Text>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 }}>{`${campaigns.length} campaigns`}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={cardW + cardGap}
              snapToAlignment="start"
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingTop: 4 }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (cardW + cardGap))
                if (idx !== pageIndex) haptic.selection()
                setPageIndex(idx)
              }}
              style={{ width: modalW, height: cardH + 8 }}
            >
              {campaigns.map((c, i) => {
                const todo = badgeCounts[c.id] || 0
                return (
                  <View key={c.id} style={{ width: cardW, marginRight: i === campaigns.length - 1 ? 0 : cardGap, paddingTop: 4 }}>
                    <Pressable
                      onPress={() => {
                        haptic.selection()
                        setOpen(false)
                        onPress(c)
                      }}
                      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                    >
                      <View style={{ height: cardH, borderRadius: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' }}>
                        <Cover url={c.coverImageUrl} radius={0} />
                        <LinearGradient colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.90)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

                        <View style={{ position: 'absolute', top: 14, right: 14 }}>
                          <OverlayStatus todo={todo} />
                        </View>

                        <View style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
                          {c.brandName ? (
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 3 }} numberOfLines={1}>{c.brandName.toUpperCase()}</Text>
                          ) : null}
                          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, lineHeight: 30 }} numberOfLines={2}>{c.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 15, paddingRight: 12, paddingVertical: 10, backgroundColor: '#fff' }}>
                            <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '900', letterSpacing: -0.2 }}>Open campaign</Text>
                            <MaterialCommunityIcons name="arrow-right" size={17} color={redesign.color.ink} />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                )
              })}
            </ScrollView>

            {campaigns.length > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 }}>
                {campaigns.map((c, i) => (
                  <View
                    key={c.id}
                    style={{ height: 6, borderRadius: 3, width: i === pageIndex ? 20 : 6, backgroundColor: i === pageIndex ? '#fff' : 'rgba(255,255,255,0.35)' }}
                  />
                ))}
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}
