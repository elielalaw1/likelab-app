import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'

type Props = {
  state: 'pending' | 'rejected'
}

const BOOKING_TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'] as const

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateLabel(iso: string) {
  const dt = new Date(`${iso}T12:00:00`)
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDateParts(iso: string) {
  const dt = new Date(`${iso}T12:00:00`)
  return {
    weekday: dt.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    dayMonth: dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }
}

function bookingDates() {
  const result: string[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 1) // minimum tomorrow

  while (result.length < 10) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      result.push(isoDate(d))
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

export function CreatorPendingGate({ state }: Props) {
  const { data: profile } = useCreatorProfile()
  const [expanded, setExpanded] = useState(false)
  const [appealOpen, setAppealOpen] = useState(false)
  const [appealStep, setAppealStep] = useState<1 | 2 | 3>(1)
  const [appealReason, setAppealReason] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const rejected = state === 'rejected'
  const title = rejected ? 'Application Not Approved' : 'Account Under Review'
  const subtitle = rejected ? 'Your application was not approved.' : 'Actions are disabled until approved.'
  const pillLabel = rejected ? 'Not Approved' : 'Pending Review'
  const iconColor = rejected ? '#B91C1C' : '#0891B2'
  const iconBg = rejected ? '#FEE2E2' : '#CFFAFE'
  const availableDates = useMemo(() => bookingDates(), [])
  const stepTitle = appealStep === 1 ? 'Reason' : appealStep === 2 ? 'Book a Meeting' : 'Confirmation'
  const canNext =
    appealStep === 1
      ? appealReason.trim().length >= 10
      : appealStep === 2
        ? Boolean(selectedDate && selectedTime && !bookingLoading)
        : true

  const bookMeeting = async () => {
    if (!profile?.id || !profile?.email) {
      Alert.alert('Missing profile data', 'Could not resolve your account details for booking.')
      return false
    }
    if (!selectedDate || !selectedTime) return false

    try {
      setBookingLoading(true)
      setBookingError('')

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/book-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: profile.id,
          brand_name: `Creator Appeal: ${profile.email}`,
          brand_email: profile.email,
          date: selectedDate,
          time: selectedTime,
          timezone: 'Europe/Stockholm',
          campaign_id: null,
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 409) {
          setBookingError('That slot was just booked. Please pick another time.')
          return false
        }
        throw new Error(body?.error || 'Could not book meeting')
      }

      return true
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not book meeting')
      return false
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.7)',
          backgroundColor: 'rgba(255,255,255,0.92)',
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: rejected ? 'flex-start' : 'center' }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={rejected ? 'close-circle-outline' : 'progress-clock'} size={14} color={iconColor} />
          </View>
          <View style={{ flex: rejected ? 1 : undefined, alignItems: rejected ? 'flex-start' : 'center' }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14, fontFamily: typography.fontFamily, textAlign: rejected ? 'left' : 'center' }}>{title}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily, textAlign: rejected ? 'left' : 'center' }}>{subtitle}</Text>
          </View>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </Pressable>

        {expanded ? (
          <View style={{ gap: 10, alignItems: rejected ? 'flex-start' : 'center' }}>
            <View style={{ width: '100%', alignItems: rejected ? 'flex-start' : 'center' }}>
              <View style={{ width: rejected ? '100%' : 240, flexDirection: 'row', alignItems: 'center' }}>
                {[
                  { key: 'Submitted', done: true, active: !rejected },
                  { key: 'Under Review', done: false, active: !rejected },
                  { key: 'Approved', done: false, active: false },
                ].map((step, idx) => (
                  <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', flex: idx < 2 ? 1 : 0 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: step.done ? '#16A34A' : step.active ? colors.primary : 'rgba(23,31,42,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {step.done ? (
                        <MaterialCommunityIcons name="check" size={12} color="#fff" />
                      ) : (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                      )}
                    </View>
                    {idx < 2 ? <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(23,31,42,0.12)' }} /> : null}
                  </View>
                ))}
              </View>
            </View>

            {!rejected ? (
              <View
                style={{
                  alignSelf: 'center',
                  backgroundColor: '#FEF3C7',
                  borderRadius: radii.full,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily, letterSpacing: 0.3 }}>
                  {pillLabel}
                </Text>
              </View>
            ) : null}

            {rejected ? (
              <Pressable
                onPress={() => {
                  setAppealStep(1)
                  setAppealOpen(true)
                  setBookingError('')
                }}
                style={{
                  minHeight: 40,
                  borderRadius: radii.button,
                  backgroundColor: colors.destructive,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                  width: '100%',
                  maxWidth: 280,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: typography.fontFamily }}>Appeal &amp; Book a Call</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal visible={appealOpen} animationType="fade" transparent onRequestClose={() => setAppealOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,15,30,0.3)', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28 }}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss()
              setAppealOpen(false)
            }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.8)',
              padding: 16,
              maxHeight: '88%',
              minHeight: 360,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {[1, 2, 3].map((step) => (
                <View key={step} style={{ flexDirection: 'row', alignItems: 'center', flex: step < 3 ? 1 : 0 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: appealStep >= step ? colors.primary : 'rgba(23,31,42,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: typography.fontFamily }}>{step}</Text>
                  </View>
                  {step < 3 ? <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(23,31,42,0.12)' }} /> : null}
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', fontFamily: typography.fontFamily }}>
                {`Step ${appealStep}: ${stepTitle}`}
              </Text>
              <Pressable onPress={() => setAppealOpen(false)} hitSlop={8}>
                <Text style={{ color: palette.textMuted, fontSize: 18, fontFamily: typography.fontFamily }}>×</Text>
              </Pressable>
            </View>

            {appealStep === 1 ? (
              <>
                <Text style={{ color: palette.textMuted, fontSize: 13, fontFamily: typography.fontFamily }}>
                  Explain why you want a second review.
                </Text>
                <TextInput
                  value={appealReason}
                  onChangeText={setAppealReason}
                  multiline
                  placeholder="Write your reason"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  placeholderTextColor={palette.textMuted}
                  style={{
                    minHeight: 110,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(234,236,239,0.9)',
                    padding: 12,
                    textAlignVertical: 'top',
                    color: palette.text,
                    fontFamily: typography.fontFamily,
                  }}
                />
                <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily }}>
                  Minimum 10 characters ({appealReason.trim().length}/10)
                </Text>
              </>
            ) : null}

            {appealStep === 2 ? (
              <>
                <Text style={{ color: palette.textMuted, fontSize: 13, fontFamily: typography.fontFamily }}>
                  Pick a date and time for your appeal call.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
                  {availableDates.map((date) => {
                    const selected = selectedDate === date
                    const { weekday, dayMonth } = formatDateParts(date)
                    return (
                      <Pressable
                        key={date}
                        onPress={() => setSelectedDate(date)}
                        style={{
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: selected ? 'rgba(74,18,160,0.48)' : 'rgba(234,236,239,0.9)',
                          backgroundColor: selected ? 'rgba(74,18,160,0.10)' : 'rgba(255,255,255,0.95)',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          minWidth: 92,
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOpacity: selected ? 0.08 : 0.04,
                          shadowRadius: selected ? 8 : 5,
                          shadowOffset: { width: 0, height: 2 },
                          elevation: selected ? 2 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? colors.primary : colors.mutedForeground,
                            fontSize: 10,
                            letterSpacing: 0.7,
                            fontWeight: '700',
                            fontFamily: typography.fontFamily,
                          }}
                        >
                          {weekday}
                        </Text>
                        <Text
                          style={{
                            marginTop: 2,
                            color: selected ? colors.primary : palette.text,
                            fontSize: 14,
                            fontWeight: '700',
                            fontFamily: typography.fontFamily,
                          }}
                        >
                          {dayMonth}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {BOOKING_TIME_SLOTS.map((slot) => {
                    const selected = selectedTime === slot
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setSelectedTime(slot)}
                        style={{
                          width: '31%',
                          minHeight: 38,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: selected ? colors.primary : 'rgba(234,236,239,0.9)',
                          backgroundColor: selected ? 'rgba(74,18,160,0.08)' : '#fff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: selected ? colors.primary : palette.text, fontSize: 13, fontWeight: '600', fontFamily: typography.fontFamily }}>{slot}</Text>
                      </Pressable>
                    )
                  })}
                </View>

                {bookingError ? (
                  <Text style={{ color: colors.destructive, fontSize: 12, fontFamily: typography.fontFamily }}>{bookingError}</Text>
                ) : null}
              </>
            ) : null}

            {appealStep === 3 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 20, fontFamily: typography.fontFamily }}>
                  Your appeal draft is ready. A meeting booking integration can submit this to the backend once wired.
                </Text>
                <View style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(234,236,239,0.9)', padding: 10, gap: 6 }}>
                  <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700', fontFamily: typography.fontFamily }}>Reason</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily }}>{appealReason || '—'}</Text>
                  <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700', fontFamily: typography.fontFamily }}>Booked Time</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily }}>
                    {selectedDate && selectedTime ? `${formatDateLabel(selectedDate)} at ${selectedTime}` : '—'}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Pressable
                onPress={() => {
                  if (appealStep === 1) {
                    setAppealOpen(false)
                    return
                  }
                  setAppealStep((prev) => (prev === 1 ? prev : ((prev - 1) as 1 | 2 | 3)))
                }}
                style={{ minHeight: 40, borderRadius: radii.input, borderWidth: 1, borderColor: 'rgba(234,236,239,0.9)', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600', fontFamily: typography.fontFamily }}>
                  {appealStep === 1 ? 'Close' : 'Back'}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (appealStep === 3) {
                    setAppealOpen(false)
                    return
                  }
                  if (appealStep === 2) {
                    const booked = await bookMeeting()
                    if (!booked) return
                  }
                  setAppealStep((prev) => (prev === 3 ? prev : ((prev + 1) as 1 | 2 | 3)))
                }}
                disabled={!canNext}
                style={{
                  minHeight: 40,
                  borderRadius: radii.button,
                  backgroundColor: canNext ? colors.primary : 'rgba(106,112,128,0.5)',
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {bookingLoading ? <ActivityIndicator color="#fff" /> : null}
                {!bookingLoading ? (
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: typography.fontFamily }}>
                    {appealStep === 2 ? 'Book Call' : appealStep === 3 ? 'Done' : 'Next'}
                  </Text>
                ) : null}
              </Pressable>
            </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  )
}
