import { Component, ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

// App-wide safety net. React only routes render/lifecycle errors to the nearest
// error boundary — without one, a single thrown error unmounts the whole tree and
// leaves a blank white screen with no way back. This catches it and offers a reset.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Surface in dev; in production this is where a crash reporter (Sentry etc.) hooks in.
    if (__DEV__) console.error('[ErrorBoundary]', error)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <View style={{ flex: 1, backgroundColor: redesign.color.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(124,63,242,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color={redesign.color.purple} />
        </View>

        <Text style={{ fontFamily: typography.fontFamily, fontSize: 20, fontWeight: '800', color: redesign.color.ink, textAlign: 'center', letterSpacing: -0.4 }}>
          Something went wrong
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 320 }}>
          The app hit an unexpected error. You can try again — your data is safe.
        </Text>

        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: redesign.color.ink, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 14 }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: '#fff' }}>Try again</Text>
        </Pressable>

        {__DEV__ ? (
          <ScrollView style={{ maxHeight: 160, marginTop: 24, alignSelf: 'stretch' }} contentContainerStyle={{ padding: 12 }}>
            <Text selectable style={{ fontFamily: typography.fontFamily, fontSize: 11, color: redesign.color.faint }}>
              {error.message}
              {'\n'}
              {error.stack}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    )
  }
}
