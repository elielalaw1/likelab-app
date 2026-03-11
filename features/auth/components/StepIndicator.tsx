import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { authColors } from '@/features/auth/theme'

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
          backgroundColor: done || active ? authColors.accent : '#eceef2',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        ) : (
          <Text style={{ color: active ? '#fff' : '#6f7788', fontSize: 14, fontWeight: '700' }}>{step}</Text>
        )}
      </View>
    )
  }

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {renderNode(1)}
        <View style={{ width: 32, height: 2, backgroundColor: currentStep > 1 ? authColors.accent : '#e6e8ef' }} />
        {renderNode(2)}
        <View style={{ width: 32, height: 2, backgroundColor: currentStep > 2 ? authColors.accent : '#e6e8ef' }} />
        {renderNode(3)}
      </View>
    </View>
  )
}
