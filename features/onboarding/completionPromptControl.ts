// Tracks whether the profile-completion flow was dismissed ("Later") this session.
// Module-level so it survives navigation but resets on a cold start — exactly the
// desired cadence: auto-prompt again on each app open until the profile hits 100%.
let dismissed = false

export function isCompletionPromptDismissed() {
  return dismissed
}

export function dismissCompletionPrompt() {
  dismissed = true
}
