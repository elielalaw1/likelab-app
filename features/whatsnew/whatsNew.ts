import * as SecureStore from 'expo-secure-store'

// Single source of truth for the in-app "What's new" announcement gating.
//   • enabled: false  → the corner CTA disappears and nothing auto-shows (one-line off-switch for next release).
//   • bump `version`  → the modal auto-shows once for everyone again (use for the next big update).
// The actual slides (animated mockups + copy) live in WhatsNewModal.tsx since they
// are visual components, not data.
export const WHATS_NEW = {
  enabled: true,
  version: 'v2',
  headline: 'The biggest LikeLab update yet',
}

const SEEN_KEY = 'likelab_whatsnew_seen_version'

// True once the user has dismissed the modal for the CURRENT version. Bumping
// WHATS_NEW.version makes this false again so the modal re-announces.
export async function hasSeenWhatsNew(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SEEN_KEY)) === WHATS_NEW.version
  } catch {
    return false
  }
}

export async function markWhatsNewSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SEEN_KEY, WHATS_NEW.version)
  } catch {
    // non-fatal
  }
}
