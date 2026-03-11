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
    <View style={{ borderWidth: 1, borderColor: authColors.border, borderRadius: 14, overflow: 'hidden' }}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderBottomWidth: index === rows.length - 1 ? 0 : 1,
            borderBottomColor: authColors.border,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ color: authColors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>{row.label}</Text>
          <Text style={{ color: row.accent ? authColors.accent : authColors.text, fontSize: 15, fontWeight: '600' }}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}
