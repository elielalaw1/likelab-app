// Friendly copy for process-video-upload's error codes, used as a fallback when
// the edge function doesn't send its own `message` (older deployments). Update
// this alongside any new code the backend starts returning.
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  phase_locked: 'This campaign isn’t accepting video uploads right now.',
  too_large: 'That file is too large — the max is 150 MB. Try a shorter clip or compress it first.',
  file_not_found: 'The upload didn’t finish transferring. Please try again.',
  not_a_video_submission: 'Something went wrong identifying this submission. Please try again.',
  missing_video_storage_path: 'Something went wrong identifying this submission. Please try again.',
  forbidden: 'You don’t have permission to upload for this deliverable.',
  unauthorized: 'Your session expired — sign in again and retry.',
  invalid_token: 'Your session expired — sign in again and retry.',
}

export function mapUploadErrorCode(code: string | null | undefined, fallback: string): string {
  if (code && UPLOAD_ERROR_MESSAGES[code]) return UPLOAD_ERROR_MESSAGES[code]
  return fallback
}

// api.ts stores a failed submission's error as "[code] friendly text" so the code
// survives round-tripping through the single `error_message` text column —
// VideoUploadRow needs the code (e.g. to show the phase-locked explainer modal
// instead of the generic retry banner) without ever leaking the bracket to the UI.
const CODE_PREFIX = /^\[([a-z_]+)\]\s*(.*)$/

export function parseStoredUploadError(errorMessage: string | null | undefined): { code: string | null; text: string } {
  if (!errorMessage) return { code: null, text: '' }
  const match = errorMessage.match(CODE_PREFIX)
  if (!match) return { code: null, text: errorMessage }
  return { code: match[1], text: match[2] }
}
