import { forwardRef, useCallback, useMemo } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { typography } from '@/features/core/theme'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { haptic } from '@/features/shared/haptics'

export type BrandSheetData = {
  brandName?: string | null
  brandLogoUrl?: string | null
  brandInstagram?: string | null
  brandTiktok?: string | null
}

function openSocial(handle: string, platform: 'instagram' | 'tiktok') {
  const clean = handle.replace(/^@/, '')
  const url = platform === 'instagram' ? `https://instagram.com/${clean}` : `https://tiktok.com/@${clean}`
  Linking.openURL(url).catch(() => {})
}

export const BrandSheet = forwardRef<BottomSheetModal, { data: BrandSheetData | null }>(({ data }, ref) => {
  const snapPoints = useMemo(() => ['38%'], [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />
    ),
    [],
  )

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: 'rgba(28,28,30,0.25)', width: 38 }}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      enableDynamicSizing={false}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BrandAvatar logoUrl={data?.brandLogoUrl} brandName={data?.brandName} size={44} />
          <Text style={{ color: '#0d0d1a', fontSize: 20, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.4 }}>
            {data?.brandName || 'Brand'}
          </Text>
        </View>
        {data?.brandInstagram ? (
          <Pressable
            onPress={() => { haptic.light(); openSocial(data.brandInstagram!, 'instagram') }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(225,48,108,0.08)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: 'rgba(225,48,108,0.18)' }}
          >
            <MaterialCommunityIcons name="instagram" size={22} color="#E1306C" />
            <Text style={{ color: '#0d0d1a', fontSize: 15, fontWeight: '600', fontFamily: typography.fontFamily, flex: 1 }}>
              {data.brandInstagram}
            </Text>
            <MaterialCommunityIcons name="arrow-top-right" size={16} color="rgba(28,28,30,0.4)" />
          </Pressable>
        ) : null}
        {data?.brandTiktok ? (
          <Pressable
            onPress={() => { haptic.light(); openSocial(data.brandTiktok!, 'tiktok') }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(8,8,12,0.06)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: 'rgba(8,8,12,0.10)' }}
          >
            <FontAwesome5 name="tiktok" size={20} color="#0d0d1a" />
            <Text style={{ color: '#0d0d1a', fontSize: 15, fontWeight: '600', fontFamily: typography.fontFamily, flex: 1 }}>
              {data.brandTiktok}
            </Text>
            <MaterialCommunityIcons name="arrow-top-right" size={16} color="rgba(28,28,30,0.4)" />
          </Pressable>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  )
})
BrandSheet.displayName = 'BrandSheet'
