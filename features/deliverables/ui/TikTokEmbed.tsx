import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'

// Embeds a published TikTok video via the public oEmbed endpoint. No auth, no
// scopes, and — crucially — no stored file on our side: the video streams live
// from TikTok, so this keeps working after the original blob is archived per our
// video-retention strategy, and always shows the current view/like counts.
//
// oEmbed returns an HTML `blockquote` + TikTok's embed.js. We drop that into a
// minimal document and let WebView render it. Pure client-side — works without
// any backend.

const OEMBED = 'https://www.tiktok.com/oembed?url='

function wrap(html: string) {
  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      html,body{margin:0;padding:0;background:transparent;overflow:hidden;}
      blockquote.tiktok-embed{margin:0 !important;}
    </style>
  </head><body>${html}</body></html>`
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error' }

export function TikTokEmbed({ url, height = 580 }: { url: string; height?: number }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    fetch(`${OEMBED}${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`oembed ${r.status}`))))
      .then((data: { html?: string }) => {
        if (!active) return
        if (data.html) setState({ status: 'ready', html: wrap(data.html) })
        else setState({ status: 'error' })
      })
      .catch(() => active && setState({ status: 'error' }))
    return () => {
      active = false
    }
  }, [url])

  if (state.status === 'error') {
    return (
      <View style={[styles.fallback, { height: 160 }]}>
        <MaterialCommunityIcons name="television-off" size={24} color={redesign.color.faint} />
        <Text style={styles.fallbackText}>Couldn&apos;t load the TikTok preview.</Text>
      </View>
    )
  }

  return (
    <View style={{ height, borderRadius: 16, overflow: 'hidden', backgroundColor: redesign.color.bg }}>
      {state.status === 'loading' ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ActivityIndicator color={redesign.color.purple} />
        </View>
      ) : (
        <WebView
          source={{ html: state.html }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          // Embeds load TikTok's CDN — keep this view sandboxed to its content.
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: redesign.color.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: redesign.color.hairlineStrong,
  },
  fallbackText: { fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600', color: redesign.color.muted },
})
