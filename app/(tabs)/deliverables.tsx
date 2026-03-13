import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { DeliverableInputRow } from '@/features/shared/ui/DeliverableInputRow'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { colors, palette, radii, shadows, typography } from '@/features/core/theme'
import { looksLikeTikTokUrl } from '@/features/core/format'
import { useDeliverables, useSubmitDeliverable } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'

export default function DeliverablesPage() {
  const { data, isLoading, error } = useDeliverables()
  const submitMutation = useSubmitDeliverable()
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const byCampaign = new Map<
      string,
      {
        campaignId: string
        campaignTitle: string
        items: NonNullable<typeof data>[number][]
      }
    >()

    for (const item of data || []) {
      if (!byCampaign.has(item.campaignId)) {
        byCampaign.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignTitle: item.campaignTitle,
          items: [],
        })
      }
      byCampaign.get(item.campaignId)?.items.push(item)
    }

    return Array.from(byCampaign.values())
  }, [data])

  const canSubmitUrl = (status: string) => status === 'pending' || status === 'revision_requested'

  const openUrl = async (url?: string | null) => {
    if (!url) return
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      Alert.alert('Invalid URL', 'Could not open this deliverable URL.')
      return
    }
    await Linking.openURL(url)
  }

  const onSubmit = async (deliverableId: string) => {
    const value = (inputs[deliverableId] || '').trim()

    if (!value) {
      Alert.alert('Missing URL', 'Please paste a TikTok URL first.')
      return
    }

    if (!looksLikeTikTokUrl(value)) {
      Alert.alert('Invalid URL', 'Deliverables only accept TikTok URLs.')
      return
    }

    try {
      await submitMutation.mutateAsync({ deliverableId, url: value })
      Alert.alert('Success', 'Deliverable submitted.')
      setInputs((prev) => ({ ...prev, [deliverableId]: '' }))
    } catch (submitError) {
      Alert.alert('Submission failed', submitError instanceof Error ? submitError.message : 'Could not submit deliverable')
    }
  }

  return (
    <Screen overlay={<CreatorOnboardingGate />} overlayPadding={136}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          My Deliverables
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Submit and track your content deliverables
        </Text>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load deliverables right now.</Text> : null}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.campaignId}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={!isLoading ? <EmptyState title="No Deliverables" subtitle="Deliverables assigned by brands will appear here." icon="package-variant-closed" /> : null}
        renderItem={({ item: group }) => (
          <SectionCard title={group.campaignTitle}>
            {group.items.map((item) => (
              <View key={item.id} style={{ gap: 10 }}>
                <Pressable
                  onPress={() => setExpandedRows((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: radii.tabButton,
                        backgroundColor: 'rgba(23,31,42,0.03)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.mutedForeground} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: palette.text, fontFamily: typography.fontFamily }}>
                      {`${item.platform || 'tiktok'} - ${item.type || 'video'}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={item.status} />
                    <MaterialCommunityIcons
                      name={expandedRows[item.id] ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>
                </Pressable>

                {expandedRows[item.id] ? (
                  <View style={shadows.deliverable}>
                    <View style={{ gap: 12 }}>
                      {item.status === 'revision_requested' && item.flagReason ? (
                        <View
                          style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#FDBA74',
                            backgroundColor: '#FFF7ED',
                            padding: 12,
                            gap: 6,
                          }}
                        >
                          <Text style={{ color: '#C2410C', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>REVISION REQUESTED</Text>
                          <Text style={{ color: '#9A3412', fontSize: 14, lineHeight: 20, fontFamily: typography.fontFamily }}>
                            {item.flagReason}
                          </Text>
                        </View>
                      ) : null}

                      {canSubmitUrl(item.status) ? (
                        <DeliverableInputRow
                          value={inputs[item.id] ?? item.url ?? ''}
                          onChangeText={(text) => setInputs((prev) => ({ ...prev, [item.id]: text }))}
                          onSubmit={() => onSubmit(item.id)}
                          loading={submitMutation.isPending}
                          submitLabel={item.status === 'revision_requested' ? 'Re-submit' : 'Submit'}
                        />
                      ) : item.url ? (
                        <Pressable
                          onPress={() => openUrl(item.url)}
                          style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(234,236,239,0.9)',
                            backgroundColor: '#fff',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            gap: 4,
                          }}
                        >
                          <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.7 }}>SUBMITTED URL</Text>
                          <Text numberOfLines={2} style={{ color: colors.primary, fontSize: 14, fontFamily: typography.fontFamily }}>
                            {item.url}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: palette.textMuted, fontSize: 13 }}>No URL submitted yet.</Text>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </SectionCard>
        )}
      />
    </Screen>
  )
}
