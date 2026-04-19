import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { typography } from '@/features/core/theme'
import { FLOATING_TAB_BAR_HEIGHT, getFloatingTabBarBottomOffset } from '@/features/navigation/floatingTabBar.constants'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; type: ToastType; message: string }

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null

function emit(type: ToastType, message: string) {
  _setToasts?.((prev) => [...prev.slice(-2), { id: Date.now(), type, message }])
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
}

const CONFIG: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string; textColor: string }> = {
  success: { bg: '#F0FDF4', border: 'rgba(134,239,172,0.6)', icon: 'check-circle', iconColor: '#16A34A', textColor: '#15803D' },
  error: { bg: '#FFF1F2', border: 'rgba(252,165,165,0.6)', icon: 'alert-circle', iconColor: '#DC2626', textColor: '#B91C1C' },
  info: { bg: '#F5F3FF', border: 'rgba(196,181,253,0.6)', icon: 'information', iconColor: '#7C3AED', textColor: '#6D28D9' },
}

function ToastRow({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const c = CONFIG[item.type]
  useEffect(() => {
    const t = setTimeout(() => onDone(item.id), 3200)
    return () => clearTimeout(t)
  }, [item.id, onDone])

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(200)}
      exiting={FadeOutDown.duration(200)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 13,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <MaterialCommunityIcons name={c.icon as never} size={20} color={c.iconColor} />
      <Text style={{ flex: 1, color: c.textColor, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600', lineHeight: 19 }}>
        {item.message}
      </Text>
    </Animated.View>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const insets = useSafeAreaInsets()
  const bottom = getFloatingTabBarBottomOffset(insets.bottom) + FLOATING_TAB_BAR_HEIGHT + 12

  useEffect(() => {
    _setToasts = setToasts
    return () => { _setToasts = null }
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  if (!toasts.length) return null

  return (
    <View style={{ position: 'absolute', bottom, left: 16, right: 16, gap: 8 }} pointerEvents="none">
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} onDone={dismiss} />
      ))}
    </View>
  )
}
