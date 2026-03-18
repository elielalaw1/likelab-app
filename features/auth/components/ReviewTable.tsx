import { Text, View } from 'react-native'
import { authColors } from '@/features/auth/theme'

type Row = {
  label: string
  value: string
  accent?: boolean
}

type Props = {
  rows: Row[]
}

export function ReviewTable({ rows }: Props) {
  return (
    <View style={{ borderWidth: 1, borderColor: authColors.border, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.88)' }}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderBottomWidth: index === rows.length - 1 ? 0 : 1,
            borderBottomColor: authColors.border,
            backgroundColor: 'rgba(255,255,255,0.94)',
          }}
        >
          <Text style={{ color: authColors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.88, fontFamily: authColors.typography.fontFamily }}>{row.label}</Text>
          <Text style={{ color: authColors.text, fontSize: 15, fontWeight: '700', fontFamily: authColors.typography.fontFamily }}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}
