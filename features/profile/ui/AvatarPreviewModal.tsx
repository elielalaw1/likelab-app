import { Modal, Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, typography } from '@/features/core/theme'

type Props = {
  visible: boolean
  uri?: string | null
  onClose: () => void
}

export function AvatarPreviewModal({ visible, uri, onClose }: Props) {
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
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="contain"
              style={{ width: '100%', height: '78%', borderRadius: 18, backgroundColor: colors.foreground }}
            />
          ) : (
            <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="account-circle-outline" size={90} color="rgba(255,255,255,0.6)" />
            </View>
          )}
        </Pressable>
      </View>
    </Modal>
  )
}
