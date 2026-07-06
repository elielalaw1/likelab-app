// Runtime feature flags, driven by EXPO_PUBLIC_* env vars so a dev/test build can
// turn things on while production stays untouched. Flags default to OFF — a missing
// or unset env var must never enable an in-progress feature for live users.

function isOn(value: string | undefined): boolean {
  return value === 'on' || value === 'true' || value === '1'
}

// Gates the TikTok-API surfaces (video.list picker, Send-to-TikTok draft,
// performance tracking). The TikTok app is approved and live, so this is ON in
// production via the EAS environment variable EXPO_PUBLIC_TIKTOK_API_FEATURES.
// Kept as a flag so a build can still disable the surfaces without a code change
// if a backend issue is found. Requires the prod TikTok client key + Live edge
// functions to be configured.
export const tiktokApiFeaturesEnabled = isOn(process.env.EXPO_PUBLIC_TIKTOK_API_FEATURES)

// Gates the tiered delivery flow. Standard campaigns deliver the live link + RAW file
// in one step and go live immediately (no pre-post review); gold/partner campaigns keep
// the current brand-review flow. OFF in prod until the campaign-tier column ships. In a
// dev build (EXPO_PUBLIC_DIRECT_DELIVERY=on) untagged campaigns default to standard so
// the new combined-delivery flow is exercisable end-to-end.
export const directDeliveryEnabled = isOn(process.env.EXPO_PUBLIC_DIRECT_DELIVERY)
