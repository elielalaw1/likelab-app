import { File, Paths } from 'expo-file-system'

// Last-resort visibility into a fatal JS error without needing Xcode/device logs
// attached. Writes are synchronous so the report is flushed to disk before the
// process can be torn down by whatever handles the error next (Expo's native
// error-recovery watchdog aborts the app after a fatal JS error goes unhandled
// twice in a row).
const CRASH_LOG_PATH = 'likelab_last_crash.json'

function writeCrashReport(source: string, error: unknown, isFatal?: boolean) {
  try {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    const report = {
      source,
      isFatal: !!isFatal,
      message,
      stack,
      timestamp: new Date().toISOString(),
    }
    new File(Paths.document, CRASH_LOG_PATH).write(JSON.stringify(report, null, 2))
  } catch {
    // best-effort — never let the crash logger itself throw
  }
}

// Installs a global handler for uncaught JS errors (render-time throws that
// escape an ErrorBoundary, unhandled effect/callback errors) and calls through to
// whatever handler was previously registered so normal RN behavior is unchanged.
export function installGlobalErrorHandler() {
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): (e: unknown, isFatal?: boolean) => void; setGlobalHandler(h: (e: unknown, isFatal?: boolean) => void): void } }
  if (!g.ErrorUtils) return

  const previousHandler = g.ErrorUtils.getGlobalHandler()
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    writeCrashReport('global-error-handler', error, isFatal)
    previousHandler?.(error, isFatal)
  })
}

// expo-updates' own ErrorRecovery.swift writes the *original* fatal error/exception
// (name + reason, before its recovery pipeline relaunches/rethrows) to
// "expo-error.log" in the iOS Application Support directory the moment
// RCTFatalHandler/RCTFatalExceptionHandler fires — this fires for native-level
// fatal errors that never reach plain JS `ErrorUtils` (e.g. a fatal thrown before
// or outside the JS error boundary machinery), which is exactly the gap our own
// handler above can't cover. Application Support isn't exposed by expo-file-system's
// Paths, so it's derived from the sibling Documents path (stable iOS sandbox layout:
// both are direct children of the app container).
function readExpoUpdatesErrorLog(): string | null {
  try {
    const documentsUri = Paths.document.uri
    const appSupportUri = documentsUri.replace(/Documents\/?$/, 'Library/Application Support')
    if (appSupportUri === documentsUri) return null
    const file = new File(appSupportUri, 'expo-error.log')
    if (!file.exists) return null
    const content = file.textSync()
    file.delete()
    return content
  } catch {
    return null
  }
}

// Reads and clears any crash report left by the previous run, so it can be shown
// once on the next successful launch instead of accumulating forever.
export function readAndClearCrashLog(): string | null {
  const reports: string[] = []
  try {
    const file = new File(Paths.document, CRASH_LOG_PATH)
    if (file.exists) {
      reports.push(file.textSync())
      file.delete()
    }
  } catch {
    // ignore — fall through to the other source
  }

  const updatesLog = readExpoUpdatesErrorLog()
  if (updatesLog) reports.push(`[expo-updates error-recovery log]\n${updatesLog}`)

  return reports.length ? reports.join('\n\n---\n\n') : null
}

// Called from ErrorBoundary.componentDidCatch — the same report format/path as the
// global handler, so a caught render error is just as recoverable after restart.
export function logBoundaryError(error: unknown) {
  writeCrashReport('error-boundary', error, true)
}
