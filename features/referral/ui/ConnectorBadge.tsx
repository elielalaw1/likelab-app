import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'

// Cosmetic reward emblem earned once 3 invited friends have joined. Holographic
// pill so it reads as special and distinct from the tier rings.
export function ConnectorBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={{ borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start' }}>
      <LinearGradient
        colors={redesign.gradient.holographic}
        locations={redesign.gradient.holographicLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: compact ? 9 : 11, paddingVertical: compact ? 4 : 5 }}
      >
        <MaterialCommunityIcons name="account-multiple-check" size={compact ? 11 : 13} color="#fff" />
        <Text style={{ fontFamily: typography.fontFamily, fontSize: compact ? 10.5 : 12, fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}>
          Connector
        </Text>
      </LinearGradient>
    </View>
  )
}
