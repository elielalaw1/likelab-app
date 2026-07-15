import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { authColors } from '@/features/auth/theme'
import { redesign } from '@/features/core/theme'

type Props = {
  currentStep: 1 | 2 | 3
}

function isDone(current: number, step: number) {
  return current > step
}

export function StepIndicator({ currentStep }: Props) {
  const renderNode = (step: 1 | 2 | 3) => {
    const done = isDone(currentStep, step)
    const active = currentStep === step

    return (
      <View
        key={step}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: active || done ? 'transparent' : 'rgba(255,255,255,0.72)',
          borderWidth: active || done ? 0 : 1,
          borderColor: authColors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {active || done ? (
          <View
            style={{ position: 'absolute', inset: 0, backgroundColor: redesign.color.purple }}
          />
        ) : null}
        {done ? (
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        ) : (
          <Text style={{ color: active ? '#fff' : authColors.muted, fontSize: 14, fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>{step}</Text>
        )}
      </View>
    )
  }

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {renderNode(1)}
        <View style={{ width: 36, height: 2, backgroundColor: currentStep > 1 ? authColors.accent : 'rgba(3,7,18,0.08)' }} />
        {renderNode(2)}
        <View style={{ width: 36, height: 2, backgroundColor: currentStep > 2 ? authColors.accent : 'rgba(3,7,18,0.08)' }} />
        {renderNode(3)}
      </View>
    </View>
  )
}
