import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { authColors } from '@/features/auth/theme'

export function LogoMark() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 6, gap: 12 }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.78)',
          borderWidth: 1,
          borderColor: authColors.borderSoft,
        }}
      >
        <LinearGradient
          colors={['rgba(53,27,169,0.88)', 'rgba(46,227,241,0.72)', 'rgba(233,85,215,0.7)', 'rgba(255,213,0,0.5)']}
          start={{ x: 0.1, y: 0.15 }}
          end={{ x: 0.9, y: 0.95 }}
          style={{ position: 'absolute', inset: 6, borderRadius: 25 }}
        />
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: authColors.typography.fontFamily, letterSpacing: -0.3 }}>L</Text>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.56, color: authColors.text, fontFamily: authColors.typography.fontFamily }}>
        like
        <Text style={{ color: authColors.accentBright, fontStyle: 'italic' }}>lab</Text>
      </Text>
    </View>
  )
}
