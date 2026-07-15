import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'
import { LogoRain } from '@/features/shared/ui/LogoRain'

type Props = {
  visible: boolean
  uri?: string | null
  onClose: () => void
}

// 500 was tried and made the device stutter (500 concurrently animated views is a
// lot for a phone GPU) — this is the densest that stayed smooth on-device.
const RAIN_DENSITY = 120

export function AvatarPreviewModal({ visible, uri, onClose }: Props) {
  const { palette } = useTheme()
  const avatarRef = useRef<View>(null)
  const [avoidCenter, setAvoidCenter] = useState<{ x: number; y: number; radius: number } | null>(null)

  useEffect(() => {
    if (!visible) {
      setAvoidCenter(null)
      return
    }
    // Small delay so the modal's fade-in has settled into its final layout before
    // measuring — measuring mid-transition would capture a stale/incorrect position.
    const timeout = setTimeout(() => {
      avatarRef.current?.measureInWindow((x, y, width, height) => {
        setAvoidCenter({ x: x + width / 2, y: y + height / 2, radius: width / 2 })
      })
    }, 80)
    return () => clearTimeout(timeout)
  }, [visible])

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,12,24,0.92)' }}>
        <View style={{ paddingTop: 52, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '700' }}>Profile photo</Text>
          <Pressable
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="close" size={18} color="#fff" />
          </Pressable>
        </View>

        <Pressable onPress={onClose} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View ref={avatarRef} collapsable={false}>
            {uri ? (
              <Image
                source={{ uri }}
                contentFit="cover"
                style={{ width: 280, height: 280, borderRadius: 140, backgroundColor: palette.text }}
              />
            ) : (
              <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="account-circle-outline" size={90} color="rgba(255,255,255,0.6)" />
              </View>
            )}
          </View>
        </Pressable>

        <LogoRain active={visible} density={RAIN_DENSITY} avoidCenter={avoidCenter} onTouch={haptic.heavy} />
      </View>
    </Modal>
  )
}
