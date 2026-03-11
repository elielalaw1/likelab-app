import { Text, View } from 'react-native'
import { authColors } from '@/features/auth/theme'

export function LogoMark() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 2 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.2, color: authColors.text }}>
        Like
        <Text style={{ color: '#b3bbff', fontStyle: 'italic' }}>lab</Text>
      </Text>
    </View>
  )
}
