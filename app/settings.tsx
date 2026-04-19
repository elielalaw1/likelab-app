import { useLocalSearchParams } from 'expo-router'
import { SettingsForm } from '@/features/profile/ui/SettingsForm'

export default function SettingsPage() {
  const params = useLocalSearchParams<{ focusSection?: string; onboarding?: string }>()

  return <SettingsForm focusSection={params.focusSection} onboarding={params.onboarding} />
}
