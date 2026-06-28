# LikeLab App — Audit-checklista

> Generad av multi-agent-audit (59 verifierade buggar, 157 polish-punkter, 101 idéer). Bocka i `[x]` det du vill att jag implementerar.

**Buggar:** 0 HIGH · 11 MEDIUM · 48 LOW

---

## 🐛 Buggar (verifierade mot faktisk kod)

- [ ] **B01 · MED · campaigns** — Discover-list "Apply" shows a false "Applied!" success and swallows failures
  - **Var:** `app/(tabs)/overview.tsx:223-229, features/shared/ui/CampaignCard.tsx:86-95, features/campaigns/hooks.ts:101-110`
  - **Problem:** On the Discover feed onApply calls applyMutation.mutate(item.id) fire-and-forget and returns undefined. CampaignCard.handleApply treats any non-false return as success: it immediately fires haptic.success() and flips the pill to the green "Applied!" state. useApplyToCampaign.onError only rolls the optimistic cache back with NO toast, so a failed apply (already-applied, RLS denial, campaign closed server-side, offline) flashes "Applied!" then quietly reverts and the user believes they applied when they did not. The campaign-detail apply path handles this correctly (mutateAsync + try/catch + toast.error at [id].tsx:242-244), so the two entry points are inconsistent. Reported by 6 separate auditors; verified current.
  - **Fix:** Preferred: add an onError toast inside useApplyToCampaign (features/campaigns/hooks.ts) after the cache rollback, e.g. `toast.error(err instanceof Error ? err.message : 'Could not apply')`, so all callers surface failures without each having to handle it. This is more robust than only fixing overview.tsx because the CampaignCard already optimistically shows "Applied!" before resolution. Optionally also make overview.tsx await `applyMutation.mutateAsync(item.id)` in try/catch (mirroring [id].tsx:228-244) and have CampaignCard set applyState to 'applied' only after the promise resolves, so the green pill is never shown for an apply that ultimately fails.

- [ ] **B02 · MED · campaigns** — Discover quick-apply bypasses the profile-completeness gate enforced on the detail screen
  - **Var:** `app/(tabs)/overview.tsx:223-229, app/campaigns/[id].tsx:217-226`
  - **Problem:** The detail-screen handleApply gates on BOTH reviewStatus==='approved' AND isProfileComplete(profile). The Discover onApply only checks isApproved before calling applyMutation.mutate, so an approved-but-incomplete creator (e.g. missing shipping address used for product-sendout campaigns) can submit an application straight from the list, bypassing the completeness requirement enforced everywhere else in the UI. Verify whether the backend independently enforces completeness; if not this creates incomplete applications.
  - **Fix:** The proposed fix is essentially correct: mirror the detail-screen gate in overview's onApply. Import isProfileComplete from '@/features/profile/api', then before applyMutation.mutate add: `if (!profile || !isProfileComplete(profile)) { Alert.alert('Complete your profile', 'Finish your creator profile before applying.', [{ text: 'Not now', style: 'cancel' }, { text: 'Complete profile', onPress: () => router.push('/settings') }]); return false }`. Refinement over the original suggestion: do NOT rely solely on returning `false`, because CampaignCard's blocked state hardcodes the label 'Awaiting approval' (CampaignCard.tsx:312-316), which would mis-message a completeness block. Use an Alert (as the existing approval branch does) so the message is accurate, and optionally route to /settings.

- [ ] **B03 · MED · deliverables** — Approved deliverables awaiting a TikTok link get no call-to-action on the Projects tab (buried in History, not badged)
  - **Var:** `app/(tabs)/deliverables.tsx:28, app/(tabs)/deliverables.tsx:69-70, features/deliverables/hooks.ts:24-27, app/campaigns/[id].tsx:67-74`
  - **Problem:** deliverableStage() treats a deliverable as stage 'submit_link' (brand approved -> creator must post on TikTok and paste the link to go live/earn) whenever approvalStatus==='approved' OR readyForPosting, regardless of `status`. But the Projects tab surfaces actionable work via needsAction filtered on status==='revision_requested'||'pending', and HISTORY_STATUSES includes 'submitted'/'pending_review'/'uploaded'/'approved'. So an approved-awaiting-link deliverable lands ONLY in History labeled 'Approved' with a passive pill, no 'post & add link' CTA, and is not counted in useDeliverablesBadgeCount nor the overview 'My Active' badge. Creators can miss the most important, revenue-bearing step. Verify which `status` value a brand approval writes.
  - **Fix:** Add a third actionable category to needsAction (and both badge counts) computed with the same submit_link predicate used by deliverableStage — i.e. !url && status not in {pending,revision_requested,published} && (approvalStatus==='approved' || status==='approved' || readyForPosting). Render it as a distinct CTA card with copy like 'Approved — post on TikTok & paste the link' deep-linking to /campaigns/[id]?tab=videos, and include it in useDeliverablesBadgeCount (hooks.ts) and overview badgeCounts (overview.tsx). Keep the existing History entry but, while in submit_link stage, swap its passive pill for an explicit 'Add link' action affordance so the green 'Approved' pill doesn't read as 'done'.

- [ ] **B04 · MED · deliverables** — Entire video is read into a JS Uint8Array before upload — OOM risk for long clips
  - **Var:** `features/deliverables/api.ts:104, lib/video-picker.ts:23`
  - **Problem:** uploadVideo does `const bytes = await new File(fileUri).bytes()` and hands the whole buffer to supabase.storage.upload. The picker allows videoMaxDuration:300 (5 min). Even after 'medium' compression that is ~90 MB in a single contiguous JS Uint8Array; 'high' or a compression-fallback passthrough can be 150-200+ MB. On lower-end/older devices this can spike memory and crash the upload (or the app) right at the finish line.
  - **Fix:** Fix direction is correct (stream instead of materializing). Most concrete RN-native option: use expo-file-system's upload task (FileSystem.createUploadTask / uploadAsync, UploadType.BINARY_CONTENT or MULTIPART) to POST the `file://` URI directly to the Storage REST endpoint (`/storage/v1/object/deliverable-videos/<storagePath>`) with the user's access token (supabase.auth.getSession), which streams bytes from disk via the native layer without loading them into the JS heap. This also sidesteps the original reason they avoided fetch(uri).blob() (the 0-byte-blob bug noted at api.ts:100-103). Keep the empty-file guard by reading `new File(uri).size` (metadata) instead of `.bytes()`. Secondary mitigation: cap effective duration/size for the upload tier (e.g. lower videoMaxDuration, or reject when estimatedSize exceeds a threshold) so memory stays bounded even on the passthrough path. Note: passing FormData straight to supabase-js .upload() in RN has historically been flaky, so the direct REST upload-task path is the more reliable streaming route than the bare FormData suggestion.

- [ ] **B05 · MED · auth** — reset-password latches an 'invalid/expired' state that a valid recovery deep link never clears (warm-resume)
  - **Var:** `app/reset-password.tsx:45-70`
  - **Problem:** In the effect, Linking.getInitialURL().then(url => url ? initSession(url) : setInvalid(true)) runs first, and the warm-resume path (app already running when the user taps the email link) commonly yields null or a stale launch URL -> setInvalid(true). The real recovery URL then arrives via addEventListener('url') and initSession() calls setSession()+setReady(true) — but never setInvalid(false). Because the JSX gates on `invalid` first, the user is shown 'This reset link has expired or is invalid' even though the session was established and they could set a password. Password reset is a critical recovery path and warm-app is the likely case.
  - **Fix:** In `initSession`, call `setInvalid(false)` as soon as a valid recovery URL is parsed (before/at `setSession`) and on the success branch alongside `setReady(true)`, so any later valid link clears a prior invalid state. Do NOT eagerly `setInvalid(true)` from the `getInitialURL()===null` branch; instead track whether a valid session was established and only mark `invalid` after a short grace timeout (~1.5s) if neither `getInitialURL()` nor the `url` listener produced a recovery session. Keep the `url` listener as the authority for warm links. (The claim's proposed fix is essentially correct.)

- [ ] **B06 · MED · auth** — Deep-link auth callback injects a Supabase session with zero validation (session-fixation surface); dead/unwired OAuth scaffolding can't parse warm-start hash tokens
  - **Var:** `app/auth/callback.tsx:7-41, lib/auth-browser.ts, features/shared/hooks/useAuthSession.ts:77-82, features/shared/hooks/useAuthSession.ts:123-125, app/(tabs)/_layout.tsx:61`
  - **Problem:** app/auth/callback.tsx reads access_token/refresh_token straight from a deep-link URL (from both hash and query string) and calls supabase.auth.setSession() with no state/nonce/CSRF and no type check. The route is reachable as likelabapp://auth/callback?access_token=...&refresh_token=... yet nothing uses it (openAuthInBrowser is never called; native Google/Apple SDKs are not wired). So it is an orphaned route that is purely an attack surface: an attacker can mint tokens for their own account and lure a victim into tapping a link, silently switching the victim into the attacker's session (login/session fixation). Worse, assertCreatorRole only runs at cold boot and the manual login button — onAuthStateChange deliberately skips it (useAuthSession.ts:123-125) and (tabs)/_layout.tsx:61 gates on `session` only — so a session established this way enters the creator tabs unchecked and the victim could connect their real TikTok / enter shipping PII into the attacker's account (RLS bounds the damage). It also can't handle warm-start hash tokens (no addEventListener('url'); params fallback misses the hash fragment).
  - **Fix:** Proposed fix is correct. Preferred action: delete the unused app/auth/callback.tsx and lib/auth-browser.ts (no legitimate caller — login uses signInWithPassword and TikTok has its own CSRF-protected callback). If a web-OAuth fallback is ever needed, implement Supabase PKCE (exchangeCodeForSession) bound to a SecureStore nonce mirroring the TikTok flow, never accept tokens from the query string, and add a Linking 'url' listener. Secondary hardening (independent of this route): run assertCreatorRole on SIGNED_IN in onAuthStateChange or gate tabs on a verified-creator flag rather than session presence alone.

- [ ] **B07 · MED · onboarding** — WelcomePendingOverlay shows a reassuring 'under review / you'll be approved' modal to REJECTED creators
  - **Var:** `features/onboarding/WelcomePendingOverlay.tsx:43`
  - **Problem:** Line 43 gates the overlay on status !== 'approved' && tiktokConnected, which is true for 'rejected' (and 'unknown'), not just 'pending'. A rejected creator who already connected TikTok reaches the tabs (TikTokGuard only redirects when TikTok is NOT connected), so on the next cold launch they get a full-screen modal reading 'Your account is being reviewed... As soon as you're approved, we'll start working together' — directly contradicting their rejected state and the CreatorPendingGate rejection card behind it. CreatorOnboardingGate correctly distinguishes pending vs rejected; this overlay does not.
  - **Fix:** Change WelcomePendingOverlay.tsx:43 to gate on genuinely-pending status only, e.g. `const awaiting = !!profile && status === 'pending' && !!profile.tiktokConnected`. This excludes 'rejected' and empty/'unknown' statuses while keeping the existing approved-re-arm logic at line 55 (`if (status === 'approved') shownUserIds.delete(userId)`) intact. Using `getCreatorReviewStatus(profile) === 'pending'` is equivalent.

- [ ] **B08 · MED · onboarding** — Pending-welcome full-screen modal re-fires on every app cold start (in-memory only, no persistence)
  - **Var:** `features/onboarding/WelcomePendingOverlay.tsx:16`
  - **Problem:** shownUserIds is a module-level in-memory Set with no SecureStore backing. The comment claims 'shows once per awaiting episode,' but the Set is wiped on every process restart, so a creator who stays pending for hours/days gets the full-screen 'Thanks for choosing LikeLab' modal on EVERY cold launch. This is inconsistent with TutorialOverlay, which persists its seen-flag via SecureStore. Heavy, repeated interruption in a common path (waiting for approval).
  - **Fix:** Persist the seen-while-pending flag per user via SecureStore (mirror TutorialOverlay's SEEN_PREFIX pattern), and clear it when the account is observed as approved, so the welcome shows once per real pending episode rather than once per process.

- [ ] **B09 · MED · applications** — Optimistic accept makes the invitation card disappear entirely until the refetch lands
  - **Var:** `features/applications/hooks.ts:37-42, app/applications.tsx:101-102`
  - **Problem:** onMutate for accept flips the invitation's status to 'accepted' in the cache. The Applications screen only renders invitations whose status is 'pending' or 'declined', and the corresponding accepted application row only exists server-side (created by the RPC), so it is NOT in the cache yet. Between the tap and the onSettled refetch completing, the campaign vanishes from every filter (the whole card, not just the buttons). On a slow connection this looks like the accept failed / the campaign was lost. Decline doesn't have this problem because 'declined' is still a rendered status.
  - **Fix:** In the accept onMutate, in addition to flipping the invitation status, optimistically push an accepted CreatorApplication built from the invitation into previous.applications so an "Accepted campaign" card replaces it immediately. Important: this should be done ONLY for the accept path (the mutation factory is shared by decline via nextStatus), e.g. guard on nextStatus==='accepted'. Give the placeholder a deterministic id (e.g. `optimistic-${invitationId}`) so the FlatList key (item.key=item.id) doesn't collide with the real server row that arrives on refetch, and so onError rollback (which restores context.previous) cleanly removes it. Alternatively, add a render branch that displays an 'accepted'-status invitation as an accepted-campaign placeholder until reconciliation. Either approach removes the vanish window.

- [ ] **B10 · MED · profile** — Settings form saves a stale full snapshot — connecting TikTok then saving reverts server-synced fields
  - **Var:** `features/profile/ui/SettingsForm.tsx:95, features/profile/ui/SettingsForm.tsx:108-113, features/profile/ui/SettingsForm.tsx:242-258, features/profile/ui/SettingsForm.tsx:266, features/auth/tiktok.ts:185`
  - **Problem:** The form is initialized from server data exactly once (hasLoadedRef) and never reconciled. handleSave then writes EVERY profile field unconditionally — a full last-write-wins snapshot, not a diff. So any field updated on the server after the form first loaded is reverted on Save. Clearest trigger: handleConnectTikTok connects TikTok and refetches the profile, but the form is not refreshed, so the editable 'TikTok Handle' field still holds its pre-connect value (often empty); pressing 'Save changes' after connecting overwrites the freshly-synced tiktok_handle with the stale value (disconnectTikTokAccount nulls tiktok_handle, confirming the connect flow writes that column). Same risk for any field the web app/backend updates concurrently.
  - **Fix:** Two-part fix. (1) Since there is no editable TikTok-handle input in the current UI, the handle is entirely server-managed via connect/disconnect — so simply drop tiktokHandle from the handleSave payload (remove SettingsForm.tsx:246). This stops Save from ever clobbering the server-synced tiktok_handle. (2) For the broader concurrent-edit class, either re-seed the form from fresh data after handleConnectTikTok/handleDisconnectTikTok complete (call setForm(asForm(latestData)) after the refetch resolves), or better, track dirty fields and send only user-changed keys in handleSave so unedited fields are never written. The originally proposed fix is directionally correct; the minimal/safest concrete change is removing tiktokHandle from the save payload.

- [ ] **B11 · MED · notifications** — Push token is never cleared on logout (UPDATE runs after the session is already gone)
  - **Var:** `features/shared/hooks/useAuthSession.ts:106, features/notifications/push.ts:49, features/profile/ui/SettingsForm.tsx:312`
  - **Problem:** deletePushToken() is wired ONLY inside onAuthStateChange's SIGNED_OUT branch (useAuthSession.ts:109). By the time that fires, handleSignOut() / the local signOut have already cleared the session, so UPDATE creator_profiles SET push_token=NULL WHERE user_id=... runs with no auth header. With normal RLS (auth.uid()=user_id) it matches zero rows, the error is swallowed by console.warn, and the row keeps the stale token. Result: a logged-out device's Expo push token stays live in the DB, so the user keeps receiving pushes after logout until reinstall — a real privacy/correctness defect. Verify exact RLS, but the post-signout ordering is unambiguous in client code.
  - **Fix:** Clear the token while still authenticated, before signOut. In each logout handler (SettingsForm.handleSignOut, ProfileOverview.handleSignOut) do `if (userId) await deletePushToken(userId)` then `await supabase.auth.signOut()`. In SettingsForm the auth user id is `data?.id` (mapProfile sets id:userId, features/profile/api.ts:64), so `await deletePushToken(data.id)` is correct; in ProfileOverview pass the same user id from its profile/session. Keep the existing post-SIGNED_OUT call at useAuthSession.ts:109 only as a best-effort fallback. For handleDeleteAccount the account/profile row is deleted server-side so token clearing is moot there, but optionally have the delete-account edge function null the token too. Note: don't rely on `scope:'local'` to change this — the session is removed before SIGNED_OUT regardless of scope.

- [ ] **B12 · LOW · campaigns** — Campaign detail page lets you apply to an expired campaign; the card correctly blocks it
  - **Var:** `app/campaigns/[id].tsx:257-300, features/shared/ui/CampaignCard.tsx:40-46, features/core/format.ts:50-64`
  - **Problem:** CampaignCard hides Apply for expired campaigns via canApply()->isExpired(). But the detail page's ctaState (261-294) has NO expiry gate (verified: states are application-sent / approval-required / complete-profile / applying / apply, none check endDate). Because getDaysLeft clamps negatives to 0, a still-'published' campaign whose endDate passed shows 'Closes in 0 days' with a fully enabled 'Apply to campaign' button. Tapping a 'Closed' card still navigates to detail where the user can apply to a dead campaign. '0 days' also can't distinguish 'ends today' from 'already ended'.
  - **Fix:** Fix is essentially correct: add an explicit expiry check to ctaState mirroring CampaignCard.canApply, disabling the CTA with a 'Campaign closed' label/tone when the end date has passed. Important refinement: do NOT derive expiry from getDaysLeft, since it clamps negatives to 0 and cannot distinguish 'ends today' from 'already ended'. Use a dedicated check (e.g. campaign.endDate && new Date(campaign.endDate).getTime() < Date.now(), or reuse the daysRemaining()===-1 helper from CampaignCard). Also fix the sticky-bar label to render 'Closed'/'Last day' rather than '0 days'. And confirm on the backend that the applications insert/RLS rejects applications to ended campaigns, since the client gate is cosmetic only.

- [ ] **B13 · LOW · deliverables** — Revision reason (flag_reason) never shown on the campaign-detail Videos tab
  - **Var:** `features/campaigns/api.ts:353, app/campaigns/[id].tsx:857, features/deliverables/api.ts:13, features/deliverables/ui/FeedbackChat.tsx:132-163`
  - **Problem:** getCampaignDeliverables (the PRIMARY source for visibleDeliverables on the detail page) does NOT select flag_reason and never maps flagReason (verified: select at api.ts:353 omits it), so item.flagReason is always undefined and fallbackReason at [id].tsx:857 is always null. For a revision request that exists only as a legacy flag_reason (no deliverable_feedback row), FeedbackButton renders nothing, so the creator sees the generic 'The brand asked for changes — upload a new version' caption but never the actual requested changes. Asymmetry: getDeliverables (Projects list) DOES select+map flag_reason, so the reason shows on the Projects card but vanishes on the detail screen. Verify on backend whether revision requests always create a feedback row; if not, creators are blocked from seeing what to fix.
  - **Fix:** Proposed fix is correct: add flag_reason to the getCampaignDeliverables select at features/campaigns/api.ts:353 and add flagReason: textValue(row, ['flag_reason']) to the mapped object (lines 363-376), matching getDeliverables. This re-activates the legacy fallback bubble on the detail Videos tab.

- [ ] **B14 · LOW · deliverables** — getDeliverables maps `notes` but never selects the column, so brand notes silently vanish on the fallback path
  - **Var:** `features/deliverables/api.ts:13, app/campaigns/[id].tsx:847`
  - **Problem:** getDeliverables' select (api.ts:13) omits `notes`, yet the mapper reads notes: textValue(row, ['notes']) at line 33 so it is always null (verified). When the campaign-detail Videos tab falls back to allDeliverables (visibleDeliverables, [id].tsx:252-255 when the campaign-scoped query is empty), the per-deliverable note caption ([id].tsx:847) silently disappears. getCampaignDeliverables DOES select notes, so notes show in the normal path but vanish on the fallback path — the mirror image of the flag_reason bug.
  - **Fix:** Add `notes` to the getDeliverables select at features/deliverables/api.ts:13 (e.g. `...url, notes, flag_reason, campaigns(...)`) so the field is populated consistently across both deliverable queries. Optionally, to fully eliminate the mirror divergence, also add `flag_reason` to the getCampaignDeliverables select at features/campaigns/api.ts:353 and map flagReason there.

- [ ] **B15 · LOW · deliverables** — Video upload never updates the parent deliverable client-side; navigating away during processing re-shows the Upload button (duplicate-upload risk)
  - **Var:** `features/deliverables/api.ts:88-147, features/shared/ui/VideoUploadRow.tsx:20`
  - **Problem:** Unlike submitLink, uploadVideo only inserts a deliverable_submissions row and fires the edge function — it never touches the deliverables table. The upload/processing state lives entirely in VideoUploadRow local state + polling. If the creator backgrounds the app or navigates off the screen while processing, the component unmounts, the poll dies, and on return getCampaignDeliverables refetches the deliverable still at 'pending'. deliverableStage then returns 'upload', so the Upload button reappears and the user can upload a SECOND video for the same deliverable. Also while isDone is true the surrounding 'Upload your video' caption can still render above the green 'Video submitted' (contradictory state). Verify how fast process-video-upload moves the deliverable off 'pending'.
  - **Fix:** Recover in-flight upload state on mount instead of optimistically writing the deliverables table. Have VideoUploadRow read getLatestSubmission(deliverableId) on mount (the already-defined-but-unused useLatestSubmission hook) and, if the latest submission is 'uploading'/'processing', adopt its id, resume polling, and suppress the Upload button — so a remounted screen reflects the in-progress upload rather than re-offering Upload. Avoid the proposed 'optimistically set the deliverable to a non-pending status': uploadVideo deliberately never writes the deliverables table and creator RLS likely forbids the creator from setting processing statuses (verify on backend). Also clear the transient contradictory caption by deriving the campaign-detail caption from the same in-flight submission state rather than only from deliverable.status.

- [ ] **B16 · LOW · deliverables** — Replace-video flow dead-ends on success — stays in 'replacing' showing 'Video submitted' + only a Cancel link
  - **Var:** `features/deliverables/ui/VideoReviewActions.tsx:146, features/deliverables/ui/VideoReviewActions.tsx:182, features/deliverables/ui/VideoReviewActions.tsx:197`
  - **Problem:** Tapping 'Replace' sets replacing=true and renders an inner VideoUploadRow. After a successful re-upload the inner row flips to isDone ('Video submitted'), but because uploadVideo doesn't change the deliverable status, deliverableStage stays 'under_review', VideoReviewActions stays mounted, and `replacing` is never reset. The creator is left at a static 'Video submitted' with only a 'Cancel' affordance and must tap Cancel to get back to View/Replace/Delete — a confusing dead-end after a successful action.
  - **Fix:** Add an `onDone` (or `onComplete`) callback prop to VideoUploadRow that fires from the existing success effect when `serverStatus === 'submitted'`, and have VideoReviewActions pass a handler that resets `replacing=false` (optionally after a ~1s delay so the "Video submitted" confirmation is briefly visible). Watching the submission directly from VideoReviewActions is not feasible because `submissionId` is internal to VideoUploadRow, so the onDone-prop approach is correct. A lighter alternative is to relabel the "Cancel" link to "Done" once the inner row reports completion.

- [ ] **B17 · LOW · deliverables** — Media-library permission denial is surfaced as a generic 'Upload failed' with no path to fix it
  - **Var:** `features/shared/ui/VideoUploadRow.tsx:64-70, lib/video-picker.ts:14-17`
  - **Problem:** pickVideoFromLibrary throws 'Media library permission is required to select videos.' when permission is not granted. VideoUploadRow's catch routes every thrown error — including this permission case — into an Alert titled 'Upload failed'. The user gets a misleading title and no way to open Settings to grant access, so they can be permanently blocked from uploading after one denial.
  - **Fix:** Prefer not to string-match the thrown message. Have pickVideoFromLibrary return/throw a typed permission-denied signal (e.g. read { status, canAskAgain } and throw a tagged error or return a discriminated result). In VideoUploadRow.handlePick, detect that case and show a dedicated alert titled e.g. 'Allow photo access' with two buttons: Cancel and 'Open Settings' wired to Linking.openSettings(). Keep the generic 'Upload failed' alert only for real upload/processing errors.

- [ ] **B18 · LOW · deliverables** — Dead/divergent link-submit path: submitDeliverableUrl + useSubmitDeliverable + DeliverableInput are unused and skip the submission insert
  - **Var:** `features/deliverables/api.ts:40, features/deliverables/hooks.ts:62, features/shared/ui/DeliverableInput.tsx:13`
  - **Problem:** DeliverableInput, useSubmitDeliverable and submitDeliverableUrl are referenced nowhere outside their own files — the live link flow uses LinkSubmitRow -> useSubmitLink -> submitLink (which also inserts a deliverable_submissions row). The orphaned submitDeliverableUrl only updates the deliverable and skips the submission insert. A maintenance trap: a future edit could wire up the wrong path, producing links with no submission row (breaking getLatestSubmission / feedback ties). Not a runtime defect today.
  - **Fix:** Delete DeliverableInput.tsx, useSubmitDeliverable (hooks.ts:62-72), and submitDeliverableUrl (api.ts:40-54), plus drop submitDeliverableUrl from the hooks.ts import on line 3. Keep the single source of truth on the submitLink/useSubmitLink/LinkSubmitRow path.

- [ ] **B19 · LOW · deliverables** — Compression-fallback (passthrough) can upload with a non-video Content-Type, ignoring the picker's real mimeType
  - **Var:** `lib/video-compression.ts:15-25, features/deliverables/hooks.ts:122-131`
  - **Problem:** On the passthrough path (Expo Go, pre-rebuild, or when the native compressor throws), compressVideo derives mime via mimeFromUri, which returns 'application/octet-stream' for any extension other than .mov/.mp4. useUploadVideo then uploads with mimeType: compressed.mime, discarding the accurate picked.mimeType the picker provided. A stored Content-Type of application/octet-stream can cause process-video-upload to reject the file. Dev/fallback-only, so low severity.
  - **Fix:** Stop discarding the picker's mime on the passthrough path. Concretely, in useUploadVideo (hooks.ts:122-131) detect passthrough by `compressed.uri === params.videoUri` and use `params.mimeType ?? compressed.mime`; OR thread `params.mimeType` into compressVideo so passthrough() prefers it over mimeFromUri(); OR minimally, in uploadVideo pick `compressed.mime === 'application/octet-stream' ? (params.mimeType ?? compressed.mime) : compressed.mime`. Any of these keeps the correct video Content-Type when the native compressor is unavailable.

- [ ] **B20 · LOW · deliverables** — My Videos feed renders fetch errors as a false "No videos yet" empty state
  - **Var:** `features/deliverables/ui/MyVideosFeed.tsx:158, features/deliverables/ui/MyVideosFeed.tsx:182-191`
  - **Problem:** The useQuery(['my-videos'], getMyVideos) has no error handling. getMyVideos throws on any Supabase error (e.g. the deliverables join). On failure data is undefined so videos.length===0 and the UI shows the 'No videos yet / upload to campaigns' empty card — a creator who actually has videos is told they have none, with no retry. A transient error is indistinguishable from genuinely-empty.
  - **Fix:** Destructure `error` (or `isError`) and `refetch` from useQuery and add an error branch before the `videos.length === 0` check that shows a distinct "Couldn't load your videos" message with a Retry button calling `refetch()`. Optionally add `placeholderData: (prev) => prev` (React Query v5) so a background refetch failure keeps the last successful list instead of collapsing to empty.

- [ ] **B21 · LOW · deliverables** — Deliverable link submission accepts any https URL; the dedicated TikTok validator is dead code (and its regex has gaps)
  - **Var:** `features/shared/ui/LinkSubmitRow.tsx:15-22, lib/validate-tiktok-url.ts:1, features/deliverables/api.ts:73-79`
  - **Problem:** LinkSubmitRow only checks that the pasted value is http(s); it accepts any URL even though the screen says 'Submit TikTok link' and api.ts hard-codes platform:'tiktok' on the deliverable. A creator can submit an Instagram/YouTube/arbitrary link and it is stored as a TikTok deliverable (data-integrity drift, broken stats scraping). lib/validate-tiktok-url.ts (isValidTikTokUrl) exists and is unit-tested but is imported by nothing — dead code. If/when wired up, its regex also misses the vt.tiktok.com short-link host and requires a trailing slash (rejects https://www.tiktok.com with no path).
  - **Fix:** Proposed fix is sound: import isValidTikTokUrl into LinkSubmitRow, gate canSubmit/handleSubmit on it (keep the http(s) check as a secondary guard), show an inline error, and broaden the regex to `/^https?:\\/\\/(www\\.|m\\.|vm\\.|vt\\.)?tiktok\\.com(\\/|$)/i` (adds vt. host, allows no-path domain). Two refinements: (1) DeliverableInput.tsx is itself unused dead code (no importers), so wiring it is optional, not required. (2) The downstream 'broken stats scraping' impact depends on the unseen fetch-tiktok-stats edge function / DB constraints — verify on backend whether non-TikTok URLs are rejected there; the client-side validation gap and dead-code validator are the provable, in-repo defects.

- [ ] **B22 · LOW · auth** — Signup profile data (gender/age/country/shipping address) silently lost if profile save fails after OTP
  - **Var:** `app/verify-otp.tsx:100-102`
  - **Problem:** After the post-verification sign-in succeeds, the personal + shipping fields collected across signup steps 2-3 are written via updateCreatorProfile(...).catch(() => null). Any failure (network blip right after sign-in, an RLS/edge hiccup) is swallowed with no error, no retry, no logging — the user is sent straight to /connect-tiktok believing everything saved. The shipping address is required for brands to send physical products, so a creator can end up with an account missing all the data they just typed, and no signal anything went wrong.
  - **Fix:** Keep the await but stop swallowing: at minimum `console.warn`/log the error (drop `.catch(() => null)`), and surface a non-blocking toast like "We couldn't save part of your profile — finish it in Settings." Better: on failure, retry once and/or re-stash the pending profile (re-call setPendingAuth) so a later screen can re-attempt, which is the only thing that protects the fields NOT covered by the completion card (phone, county, city). Routing onward is fine; the gap is the lack of any error signal/log, not the navigation.

- [ ] **B23 · LOW · auth** — verify-otp shows 'Invalid or expired code' for network/transport failures and drops the server's real error message
  - **Var:** `app/verify-otp.tsx:73-78, app/verify-otp.tsx:122-127`
  - **Problem:** On a failed functions.invoke (offline, timeout, 5xx) supabase returns { data:null, error:FunctionsHttpError }. The code reads data?.error for the message but data is null, so a user with a perfectly correct code is told the code is wrong and the structured error body (rate-limited / too many attempts / locked) is never parsed — they keep re-typing a valid code and may burn resend attempts with no indication the real problem is connectivity. Same in handleResend.
  - **Fix:** Distinguish the failure modes instead of collapsing them into 'Invalid or expired code.': when `fnError` is set, do not claim the code is invalid. Branch on the error: for a FunctionsFetchError (and timeout/AbortError) show a connectivity message like 'Connection problem — check your network and try again.'; for a FunctionsHttpError (4xx/5xx) attempt to surface the real reason by parsing the response body, e.g. `let msg; try { msg = (await (fnError as any).context?.json?.())?.error } catch {}` and show `msg ?? 'Something went wrong, try again.'`. Only show 'Invalid or expired code.' when the function actually returned 2xx with `data.success === false` (i.e. `!fnError && !data?.success`). Note: whether the edge function emits invalid-code / rate-limit reasons as a JSON body on non-2xx vs a 200 with `{ success:false, error }` is backend behavior to verify; but the client should still avoid asserting 'Invalid or expired code.' on transport errors regardless.

- [ ] **B24 · LOW · auth** — First-launch session clear is self-defeating — its guard key lives in the same persistent keychain as the session
  - **Var:** `features/shared/hooks/useAuthSession.ts:15-25`
  - **Problem:** clearSessionOnFirstLaunch clears the persisted Supabase session only when FIRST_LAUNCH_KEY is absent, but that key is stored in SecureStore (iOS Keychain), which persists across app delete/reinstall exactly like the supabase auth token. On a true first install there is no session to clear; on a reinstall (the case this is meant to handle) the key is already '1' so the clear is skipped and a previous install's session is carried over. The intended 'fresh install = no leftover session' behavior never triggers.
  - **Fix:** Proposed fix is correct: store the first-launch sentinel in storage that is wiped on uninstall (AsyncStorage, which lives in the iOS app sandbox / Library, or a sandbox marker file) instead of SecureStore/Keychain. Then on reinstall the sentinel is absent and clearPersistedSupabaseSession() actually fires to wipe the keychain-resident session, while a normal app launch (sentinel present) leaves the session intact. Confirm intent first — if persisting login across reinstall is desired, the function should simply be removed. Note this is effectively a no-op on Android (SecureStore there maps to app-private storage wiped on uninstall, so both key and session disappear together); the defect is iOS-specific.

- [ ] **B25 · LOW · auth** — TikTok reconnect guard is a silent no-op unless the backend flips tiktok_connected=false
  - **Var:** `features/auth/TikTokAuthGuard.tsx:84-88`
  - **Problem:** On a TikTok auth error the guard invalidates creator-profile then reads profile?.tiktokConnected===false before showing the reconnect toast / redirecting. If the backend, on token revocation/expiry, returns a TIKTOK_AUTH_INVALID-style error but does NOT write tiktok_connected=false to creator_profiles, the refetched profile still has tiktokConnected===true, so the ===false branch never runs: the user is never told to reconnect and stats silently stay broken. The whole prompt hinges on a backend side-effect the client can't see.
  - **Fix:** The reviewer's direction is correct but incomplete. Decouple the reconnect prompt from the persisted column: on a matched hard TikTok auth error (the TIKTOK_INVALID_PATTERNS already filter to invalid/expired/revoked/invalid_grant, and the guard already requires an active session, in-app segment, and a 5s cooldown — enough to avoid spurious redirects), show the toast and route to /connect-tiktok directly after invalidation rather than gating on `tiktokConnected === false`. Additionally — and this is the part the original fix misses — even flipping tiktok_connected=false on the backend is NOT sufficient, because profile/api.ts:87 ORs in `Boolean(tiktok_open_id)`; the gate would still read true unless open_id is also cleared. Best option: have the stats/exchange error itself carry an explicit `needsReconnect` signal and act on that, independent of the derived field. Confirm with backend what fetch-tiktok-stats writes to creator_profiles (tiktok_connected and/or tiktok_open_id) on token revocation/expiry.

- [ ] **B26 · LOW · auth** — TikTok auth guard can push /connect-tiktok while the user is already on it (stack duplication)
  - **Var:** `features/auth/TikTokAuthGuard.tsx:74-75`
  - **Problem:** inAuthedApp is computed by exclusion: 'connect-tiktok' is not in AUTH_ROUTE_SEGMENTS so it counts as authed app. If a matching TikTok error fires while the user sits on /connect-tiktok and the cached profile has tiktokConnected===false, it calls router.push('/connect-tiktok') (push, not replace), stacking a duplicate connect screen on itself. Low likelihood but a real navigation defect.
  - **Fix:** Early-return when already on the connect-tiktok screen, and use replace for the reconnect redirect. E.g. after computing currentSegments, add `if (currentSegments[0] === 'connect-tiktok') return` (also consider adding 'connect-tiktok' and the 'auth' callback segment to the excluded set so inAuthedApp is false there), and change line 87 to `router.replace('/connect-tiktok')`. The proposed fix in the claim is essentially correct; the key element is the skip-when-already-there guard, since replace alone still re-mounts the screen unnecessarily.

- [ ] **B27 · LOW · auth** — ReconnectAutoRoute is mounted globally with no authed-route guard and can yank the user mid-task
  - **Var:** `features/auth/ReconnectAutoRoute.tsx, app/_layout.tsx:294`
  - **Problem:** Unlike TikTokAuthGuard, ReconnectAutoRoute (mounted at root) has no check that the user is inside the authed tab area. For a legacy-scope connection it will router.push('/connect-tiktok') from whatever screen the user is on (campaign detail, settings sub-flow, etc.) on first profile load after the 24h cooldown, abruptly interrupting an unrelated task. (It is correctly inert when logged out because getCreatorProfile throws -> profile undefined.)
  - **Fix:** Proposed fix is reasonable. Cheapest correct option: add `useSegments()` and only push when `segments[0] === '(tabs)'` (i.e. on a tab screen), mirroring TikTokAuthGuard, so the redirect never lands over a deep/sub-flow screen. Better still, since ProfileHero.tsx:111-112 already surfaces a non-blocking in-place banner for the identical condition, consider dropping the forced router.push entirely (or replacing it with a one-tap toast/banner) rather than yanking navigation at all.

- [ ] **B28 · LOW · onboarding** — Appeal step-3 'Confirmation' copy says the booking is NOT wired even though it was already submitted
  - **Var:** `features/onboarding/CreatorPendingGate.tsx:394-396, features/onboarding/CreatorPendingGate.tsx:430-434`
  - **Problem:** Step 3 is only reached after bookMeeting() POSTs to the book-meeting edge function and returns success. Yet the confirmation paragraph still reads 'Your appeal draft is ready. A meeting booking integration can submit this to the backend once wired.' (verified current at 394-396). This stale copy tells the user nothing was actually submitted, undermining a real success state — a creator may assume their appeal call was never booked and give up or double-book.
  - **Fix:** Replace the stale paragraph at lines 394-396 with a genuine confirmation that does not over-promise unverifiable backend behavior, e.g.: "Your appeal call is booked for {formatDateLabel(selectedDate)} at {selectedTime}. Our team will review your appeal and follow up." Avoid asserting "we'll email you a calendar invite" unless the book-meeting edge function is verified to actually send one.

- [ ] **B29 · LOW · onboarding** — ProfileCoachmarks can soft-lock on a dim, tap-swallowing screen if element measurement never resolves
  - **Var:** `features/onboarding/ProfileCoachmarks.tsx:105-119, features/onboarding/ProfileCoachmarks.tsx:236-239`
  - **Problem:** While rect is null the overlay renders only a full-screen DIM Pressable that swallows all taps and has no Skip/close button. place() retries measurement up to 30x150ms then silently gives up without ever setting rect if the target node stays null or measures width 0. The coachmark steps for tier/videos/insights/invite live inside ProfileOverview's {profile ? ... : null} block, so if the profile is unloaded/errored when a tour step targets them, that step never measures and the user is stuck on a dimmed screen with no escape but force-quit.
  - **Fix:** The proposed fix direction is correct. Cleanest options: (a) always render a Skip/close affordance even while rect===null (e.g. a small Skip button in the measuring branch at lines 236-240 wired to skip()), guaranteeing an escape regardless of measurement; and/or (b) in place(), when retries are exhausted (the `waits++ < 30` else case at lines 106 and 118), call a bail-out that either auto-advances to the next step or auto-dismisses the tour (setActive(false)/setRect(null)) instead of returning silently. Option (a) is the more robust minimal change since it covers any future failure mode, not just measurement timeouts.

- [ ] **B30 · LOW · onboarding** — Appeal modal never resets reason/date/time after a successful booking or close -> stale re-booking
  - **Var:** `features/onboarding/CreatorPendingGate.tsx:201-204`
  - **Problem:** Tapping 'Appeal & Book a Call' only resets appealStep and bookingError; it leaves appealReason, selectedDate, selectedTime intact. After a successful booking and closing the modal, reopening it shows step 1 with the previous reason pre-filled and the already-booked date/time still selected, letting the user submit a duplicate booking with stale data (relies on the backend to dedupe via 409).
  - **Fix:** Proposed fix is correct. Cleanest: in the open handler (l.201-204) also reset `setAppealReason('')`, `setSelectedDate('')`, `setSelectedTime('')`, `setBookingLoading(false)` so each appeal starts fresh; alternatively clear them after the confirmed booking on the step-3 "Done" close (l.427).

- [ ] **B31 · LOW · applications** — No realtime subscription for campaign_invitations — new invites don't appear and the screen won't refetch on mount
  - **Var:** `features/shared/hooks/useApplicationRealtime.ts:12-16, features/applications/hooks.ts:8-9`
  - **Problem:** useApplicationRealtime only subscribes to the 'applications' table. New brand invitations (INSERT into campaign_invitations) and brand-side invitation status changes produce no realtime event. Combined with the applications query's staleTime 2min + refetchOnMount:false + refetchOnWindowFocus:false, a creator who opens the Applications screen with cached data <2min old will NOT see a freshly arrived invitation until they pull-to-refresh; a push deep-link into the screen also hits the stale cache. Verify on backend that campaign_invitations is in the realtime publication before adding the listener.
  - **Fix:** Two-part fix. (1) Reliable, backend-independent path: in app/_layout.tsx, when a notification of type 'campaign_invitation' arrives (both the foreground addNotificationReceivedListener and handleNotificationResponse), call queryClient.invalidateQueries({ queryKey: ['applications'] }) and ['campaigns'] — mirroring the existing DELIVERABLE_NOTIF_TYPES handling, which the code comments explicitly note works 'even if the Supabase realtime publication doesn't include the table.' (2) Optional realtime path: add a postgres_changes listener (INSERT + UPDATE) on table 'campaign_invitations' filtered by creator_id in useApplicationRealtime that invalidates ['applications'] (+ optional toast on a new pending invite) — but this only works if campaign_invitations is in the Live realtime publication, which must be verified on the backend; if it is not published, the listener silently does nothing, so the push-driven invalidation in (1) is the dependable fix. Cheaper alternative if realtime/push wiring is undesirable: set refetchOnMount: true (or add a useFocusEffect invalidate) on the applications screen so navigating to it picks up new invites.

- [ ] **B32 · LOW · applications** — Duplicate success toast when accepting an invitation that upserts an existing applied row
  - **Var:** `app/applications.tsx:245, features/shared/hooks/useApplicationRealtime.ts:26-28`
  - **Problem:** onAccept shows toast.success('Invitation accepted!'). If the creator had also previously applied to that campaign, the accept RPC upserts the existing application row applied->accepted (a postgres UPDATE), so the realtime listener ALSO fires toast.success('Your application was accepted! 🎉'). The user sees two different success toasts for one action. Depends on backend upsert behavior — only happens when the RPC UPDATEs an existing application (the channel only listens to UPDATE events); a fresh INSERT would not double-fire. Verify on backend.
  - **Fix:** Prefer a single source of truth. Cleanest: remove the local `toast.success('Invitation accepted!')` from onAccept and let realtime own the accepted toast — but that regresses the no-prior-application INSERT case (no UPDATE event = no toast). So instead keep the local toast and have the realtime listener suppress its accepted-toast when a local accept just ran: track recently-accepted campaignIds/invitationIds (e.g. a module-level Set or a ref updated in useAcceptInvitation.onSuccess with a short TTL), and in useApplicationRealtime skip the toast.success at lines 26-28 if the incoming row's campaign_id is in that recently-accepted set (still invalidate the deliverables/applications queries). This keeps the brand-initiated accept toast while preventing the duplicate on creator-initiated invitation accepts.

- [ ] **B33 · LOW · applications** — Application 'rejected' realtime toast can silently never fire (depends on REPLICA IDENTITY FULL)
  - **Var:** `features/shared/hooks/useApplicationRealtime.ts:18, features/shared/hooks/useApplicationRealtime.ts:29`
  - **Problem:** The rejected branch requires oldStatus==='applied'. For postgres UPDATE realtime events, payload.old only contains the previous status if the applications table has REPLICA IDENTITY FULL; otherwise payload.old.status is undefined and the rejected toast never shows. RLS/table config is not visible from client code — verify on backend.
  - **Fix:** Mirror the accepted branch's defensive style so the rejected toast does not depend on the old value being present. Replace line 29 with `else if (newStatus === 'rejected' && oldStatus !== 'rejected')`. This fires correctly regardless of REPLICA IDENTITY because it relies only on payload.new.status (always present) while still de-duping repeat events. The proposed alternative of relying on REPLICA IDENTITY FULL on the backend also works but is unnecessary and unverifiable from the client.

- [ ] **B34 · LOW · campaigns** — Duplicate realtime channel topic when campaign detail + leaderboard are both mounted
  - **Var:** `features/campaigns/hooks.ts:38-57, app/leaderboard/[id].tsx:44`
  - **Problem:** useCampaign(campaignId) opens supabase.channel(`campaign-${campaignId}`). Both the detail screen and the leaderboard screen call useCampaign with the same id. Navigating detail -> leaderboard leaves the detail screen mounted underneath, so two channels share the identical topic on one client. Subscribing two channels to the same topic can trigger CHANNEL_ERROR warnings, and the leaderboard's removeChannel on unmount may tear down the shared topic, silently killing the detail screen's live phase updates.
  - **Fix:** The proposed fix is directionally valid. Given the 2.99.1 dedup behavior, the cleanest fix is to make the channel topic unique per hook instance so each consumer owns its own channel and its removeChannel only tears down its own subscription, e.g. const instanceId = useId() and `.channel(`campaign-${campaignId}-${instanceId}`)` (with the filter still keyed on id=eq.${campaignId}). Alternatively, reference-count a single shared channel per campaignId and only removeChannel when the last consumer unmounts. The 'hoist a single shared subscription' option also works. Do NOT rely on simply not double-subscribing — the harm comes from removeChannel tearing down the shared instance, not from double subscription.

- [ ] **B35 · LOW · profile** — Phone country-code prefix can be permanently dropped on save
  - **Var:** `features/profile/ui/SettingsForm.tsx:36, features/profile/ui/SettingsForm.tsx:239, features/profile/api.ts:33-43`
  - **Problem:** asForm derives digits by stripping all non-digits; when the stored phone's country code is not in PHONE_CODE_OPTIONS, inferPhoneCountryCode returns null so phoneCountryCode becomes '' and digits keep the raw leading country digits without '+'. handleSave then writes phoneCombined = '' + digits, i.e. a number with no '+'. On the next load it still won't match, so the '+' is lost permanently and the number is gradually corrupted across edits.
  - **Fix:** The proposed fix (normalize to E.164 / preserve the raw phone when the code can't be inferred) is correct in spirit. Most targeted change: in handleSave, if `form.phoneCountryCode` is empty but the loaded `data.phone` (or the digits) represented a '+'-prefixed number, prepend '+' when reconstructing — e.g. derive a `hadPlus` flag in asForm and emit `+${digits}` when code is empty but the original started with '+'. Alternatively, in asForm keep the '+' in the digits/code split for unrecognized codes instead of discarding it. Do NOT just persist phoneCountryCode separately as a column unless the backend actually has that column (unverified — verify on backend); the in-client reconstruction fix is sufficient.

- [ ] **B36 · LOW · profile** — Connector confetti + success haptic re-fire on every visit to the invite page (no persistence)
  - **Var:** `app/invite.tsx:94, app/invite.tsx:102-110`
  - **Problem:** reachedRef is a useRef(false) that resets on every mount. The 'celebrate once' effect only guards against re-firing within a single mount, so any creator who has already reached joinedCount >= 3 gets a full-screen confetti cannon plus a success haptic EVERY time they open Invite friends. The comment says 'celebrate once when the Connector milestone is first reached' but nothing is persisted, so the intended once-ever behavior is not achieved. This is the most common path for a successful referrer and quickly becomes annoying.
  - **Fix:** Persist a per-user "connector_celebrated" flag (AsyncStorage keyed by user id from the session). On mount, read the flag and initialize reachedRef to its value; in the effect, only call setCelebrate/Haptics when `reached && !reachedRef.current`, and on firing also write the flag to storage. This makes the celebration genuinely once-ever per user instead of once-per-mount.

- [ ] **B37 · LOW · profile** — Invite page has no pull-to-refresh and never invalidates ['referral'] after signup/redeem, stranding new users on the non-shareable fallback code
  - **Var:** `app/invite.tsx:134, app/invite.tsx:164, app/invite.tsx:186-192, features/referral/hooks.ts:11-13, features/referral/redeem.ts`
  - **Problem:** For a freshly signed-up creator the backend referral_code is created asynchronously. Until getReferralStats sees it, hasBackendCode is false, so Copy/Share are disabled and the UI shows 'Setting up your invite code…'. The Screen is rendered WITHOUT an onRefresh handler, useReferral uses staleTime 30_000 + refetchOnMount only, and nothing invalidates ['referral'] after redeemPendingReferral succeeds. So the only way to pick up the new code is to leave the screen and return after the 30s stale window — a user who sits on the invite page sees a permanently disabled Share with no recovery affordance.
  - **Fix:** Core fix: expose refetch from useReferral and pass onRefresh={() => queryClient.invalidateQueries({queryKey:['referral']})} for pull-to-refresh, AND add a bounded refetchInterval (e.g. ~3-5s, capped) while data?.hasBackendCode === false so the pending state auto-clears. The proposed 'invalidate ['referral'] after redeemPendingReferral succeeds' is mostly orthogonal to the headline problem: redeemPendingReferral is the invitee redeeming someone else's code (only runs for users who signed up WITH a code) and does not create the current user's own referral_code (a separate signup trigger). That invalidation only helps keep counts fresh — it does not address the disabled-Share case for a creator whose own code is still committing.

- [ ] **B38 · LOW · profile** — Concurrent redeemPendingReferral calls can both pass the guard and double-POST the redeem endpoint
  - **Var:** `features/referral/redeem.ts:96, features/referral/redeem.ts:100, features/referral/ReferralLinkHandler.tsx:18-34`
  - **Problem:** The de-dupe guard reads _settledFor at redeem.ts:96 but only assigns _settledFor = userId at line 100, with an awaited hydratePendingReferralCode() in between. ReferralLinkHandler fires tryRedeem from up to four sources on launch (getInitialURL().then, the direct tryRedeem(), the url listener, onAuthStateChange), so two near-simultaneous invocations can both pass the guard before either sets it, then both call redeemReferral, producing duplicate POSTs. The header comment claims the backend is idempotent — verify on backend that redeem-referral is truly idempotent per (code, referred_id).
  - **Fix:** The race is real, but the first half of the proposed fix ("set the guard synchronously before any await") is unsafe: setting `_settledFor = userId` before peeking the code would mark a user as settled even when there is no pending code yet (line 99 currently returns WITHOUT settling, on purpose), permanently blocking the legitimate "deep link / code arrives AFTER auth" flow that the url listener at ReferralLinkHandler.tsx:26-29 supports. Use a separate in-flight lock instead of conflating it with `_settledFor`, e.g. `const _inflight = new Set<string>()`; bail at the top if `_settledFor === userId || _inflight.has(userId)`; after confirming a code exists, `_inflight.add(userId)` and wrap the redeem/retry loop in try/finally with `_inflight.delete(userId)`. Equivalently, cache an in-flight Promise per userId and return it to concurrent callers so only one POST is issued. Note the existing header comment already claims the backend is idempotent, so impact is bounded (a wasted duplicate request) and severity stays low — confirm redeem-referral is idempotent per (code, referred_id) on the backend.

- [ ] **B39 · LOW · notifications** — App-icon badge is split-brained (server push badge fights the deliverables count) and is never reset to 0 on logout
  - **Var:** `app/_layout.tsx:81, app/(tabs)/_layout.tsx:33-39`
  - **Problem:** The notification handler sets shouldSetBadge:true, so received/OS-delivered pushes set the icon badge from the push payload. Separately BadgeSync calls setBadgeCountAsync(count) where count = pending/revision deliverables, with an effect that only re-runs on [count]. So a push that does NOT change the deliverable count (feedback_added, deadline reminder, application_rejected) sets the badge and BadgeSync never re-asserts it — the icon shows a wrong/stale number until the deliverable count happens to change. The client badge model also never includes unread feedback/notifications. Additionally BadgeSync lives inside the (tabs) subtree, so on sign-out the tabs unmount without ever setting the badge to 0 — the previous session's pending count persists on the login screen and into the next user's session.
  - **Fix:** The proposed fix is directionally correct. Most concrete and verifiable change: call Notifications.setBadgeCountAsync(0) in the SIGNED_OUT branch of useAuthSession.ts (alongside deletePushToken) and/or add a cleanup to BadgeSync's effect that zeroes the badge on unmount. For the reconcile half, before adding the AppState 'active' re-assert (or flipping shouldSetBadge:false and owning a single unified badge = pending deliverables + unread feedback + unread notifications), first confirm the backend actually puts a `badge` field in push payloads — if it does not, the reconcile is unnecessary and only the logout reset matters.

- [ ] **B40 · LOW · notifications** — Single push_token column means last-device-wins and one logout kills push for all the user's devices
  - **Var:** `features/notifications/push.ts:38, features/notifications/push.ts:49`
  - **Problem:** savePushToken writes a single creator_profiles.push_token column and deletePushToken nulls that same single column. A creator using two devices (phone + tablet) has each device overwrite the other's token, so only the most-recently-opened device receives pushes; and logging out on one device removes the token the other registered. This is a backend schema constraint visible from the client — verify whether the DB stores a single token or a token set/table.
  - **Fix:** Backend-coordinated: add a `device_tokens(user_id, token, platform, updated_at)` table; have savePushToken upsert per token and deletePushToken delete only the current device's token; update the push-sender edge function to iterate all of a user's tokens. If keeping the single column short-term, at minimum make deletePushToken conditional on the stored token equaling this device's token so logging out on one device doesn't clear another device's registration, and document the single-device limitation.

- [ ] **B41 · LOW · notifications** — Foreground push shows BOTH the native OS banner and an in-app toast (duplicate notification)
  - **Var:** `app/_layout.tsx:81-89, app/_layout.tsx:183-201, features/shared/ui/Toast.tsx`
  - **Problem:** setNotificationHandler returns shouldShowBanner:true (and shouldShowAlert:true), so on iOS a notification arriving while foregrounded is presented as a native heads-up banner. The addNotificationReceivedListener then ALSO calls toast.info(`${title}\n${body}`) for the same notification. The user sees the identical message twice — native banner at the top and in-app toast at the bottom — on essentially every foreground push (all types except creator_approved). Looks unpolished on a common path.
  - **Fix:** The proposed fix is correct: pick a single foreground surface. Cleanest option given the app already maintains a custom Toast system and routes taps via the separate addNotificationResponseReceivedListener: set shouldShowBanner:false (and shouldShowAlert:false) in setNotificationHandler so the in-app toast is the only foreground surface. Keep shouldShowList/shouldShowBadge/shouldPlaySound as desired (those affect the notification center/badge/sound, not the foreground duplicate). Background/closed delivery is unaffected because the handler only governs foreground presentation.

- [ ] **B42 · LOW · notifications** — In-app notification center is fully built but never mounted — notification history is unreachable (and a latent crash)
  - **Var:** `features/notifications/hooks.ts:25-119, app/_layout.tsx`
  - **Problem:** NotificationsProvider + useNotifications load the notifications table with realtime updates, unread counts and markAllAsRead — a complete inbox backend. But the provider is never wrapped around the app and useNotifications is never called anywhere (verified by grep). There is no bell, badge, or inbox screen. So push notifications fire and a transient toast shows when foregrounded, but a creator who misses/dismisses a push has no way to see what happened (accepted, assigned, feedback, approved). The provider is also a latent crash — any future useNotifications call without mounting the provider throws.
  - **Fix:** Mount NotificationsProvider in _layout.tsx and add a bell icon with an unread badge in AppHeader opening a notifications inbox screen (route each row through the existing resolveNotificationRoute logic). If an inbox is not wanted, delete the dead provider.

- [ ] **B43 · LOW · insights** — Per-campaign leaderboard RPC failures are swallowed and render as a benign 'No data yet' empty state (and silently understate totals)
  - **Var:** `features/insights/api.ts:36-56, features/insights/api.ts:60, features/insights/api.ts:63-66, app/insights.tsx:392`
  - **Problem:** In getInsights each accepted campaign calls supabase.rpc('get_campaign_leaderboard_position'). On error the code only console.warn's and returns a no-data row (rank null, views 0, likes 0). The filter then drops every failed row. Consequence: (a) if ALL RPC calls fail (renamed/permission/outage), perCampaign is empty -> campaignsTracked===0 -> insights.tsx:392 shows EmptyState 'No data yet', presenting a backend outage as a normal empty account with no error/retry; (b) a single transient per-campaign failure silently excludes that campaign from totalViews/totalLikes/bestRank, so the headline numbers are wrong with zero user indication. useInsights surfaces no error because the function still resolves successfully.
  - **Fix:** Track per-campaign RPC errors. If every campaign failed, throw so useQuery enters the error state instead of resolving to an empty summary; if some failed, expose a partial/degraded flag the UI can show ('Some campaigns couldn't be loaded'). Don't let swallowed RPC errors collapse into the same code path as a genuinely empty account.

- [ ] **B44 · LOW · insights** — Headline trend badge labels a cross-campaign lifetime-views comparison as a temporal '% vs last campaign' and can show a large misleading negative
  - **Var:** `app/insights.tsx:346-351, features/insights/logic.ts`
  - **Problem:** insights.tsx computes the trend as computeTrend(latest.views, previous.views) where latest/previous are the two most-recently-accepted campaigns ordered by acceptance date — two unrelated campaigns' CURRENT lifetime view counts, not a time movement — yet the badge renders prominently under the title as '+/-X% views vs last campaign'. Concrete failure: the newest accepted campaign with a tracked position but few/zero views yet (video just went live) yields computeTrend(low, high) -> a big negative like '-100% views', making the headline imply the creator is collapsing when they simply joined a new campaign.
  - **Fix:** The proposed fix is sound; refine it. The cleanest option, consistent with the page's own footer disclaimer (app/insights.tsx:420-422) and api.ts comments stating there is no historical time-series, is to drop the headline TrendBadge entirely until snapshot-based trends exist. If the badge is kept, do BOTH: (1) reframe the copy so it cannot read as a temporal trend (e.g. "latest vs previous campaign (lifetime views)"), and (2) gate it to only render when both campaigns are comparable — `previous.views > floor && latest.views > floor` — which at minimum eliminates the -100% case from a 0-view newly-launched campaign. Note that a floor alone does NOT fully fix the age-artifact bias (a younger campaign with genuinely fewer views still shows a large negative), so dropping/redesigning the badge is preferable to gating.

- [ ] **B45 · LOW · insights** — Pull-to-refresh double-fetches the whole aggregation (invalidate + refetch chained)
  - **Var:** `app/insights.tsx:334-337, app/applications.tsx:82-85`
  - **Problem:** onRefresh awaits queryClient.invalidateQueries({ queryKey: ['insights'] }) and THEN awaits refetch(). invalidateQueries with the default refetchType:'active' already refetches the mounted observer and its promise resolves only after that refetch completes; the subsequent refetch() runs the entire getInsights pipeline a SECOND time. Because getInsights fans out one RPC per accepted campaign, each manual refresh costs 2x the leaderboard RPC calls and holds the spinner for two sequential round-trips. The same chained pattern exists in app/applications.tsx:82-85.
  - **Fix:** Fix is correct: do one, not both. Simplest is `await refetch()` alone in both onRefresh callbacks (refetch on the observer force-refetches regardless of staleTime and is the most direct for a pull-to-refresh of the visible screen); queryClient/useQueryClient import can then be dropped if unused. Alternatively keep `await queryClient.invalidateQueries(...)` alone (also valid, and additionally refetches any other active observers of the same key). Either eliminates the double fetch.

- [ ] **B46 · LOW · insights** — Chart draw-on animation uses chord-sum length for strokeDasharray on a smooth bezier, so the line tip stops short of the newest point
  - **Var:** `features/insights/logic.ts:76, app/insights.tsx:139`
  - **Problem:** buildChart computes length as the sum of straight-line chord distances between points (Math.hypot). The rendered path is a Catmull-Rom -> cubic bezier curve whose true on-screen length is longer than the chord sum. insights.tsx feeds that under-estimated length into strokeDasharray={len} and strokeDashoffset=len*(1-draw). Since dash length < actual path length, the final segment of the curve near the newest data point falls into the dash gap and never renders fully drawn -> the gradient line visibly falls short of the last point after the animation completes. Purely visual but it makes the marquee chart look unfinished.
  - **Fix:** Over-estimate the dash length so it always covers the full curve (over-estimating is harmless because a path cannot stroke past its own end). The proposed ~1.1x multiplier is the right idea but may be too tight for high-variance series where Catmull-Rom overshoot makes the arc noticeably longer; prefer a more generous factor (~1.2-1.3x) or add a constant pad, e.g. return `length: chordSum * 1.25 + 8`. The most robust option is to compute a real arc-length estimate by sampling each cubic segment at fine t-steps (e.g. 12-16 sub-steps, summing Math.hypot of successive sampled points) instead of using endpoint chords. Keep using the same `len` value for both strokeDasharray and the strokeDashoffset interpolation.

- [ ] **B47 · LOW · infra** — ErrorBoundary 'Try again' cannot escape a persistent render error — the user is trapped
  - **Var:** `features/shared/ui/ErrorBoundary.tsx:24, app/_layout.tsx:296-315`
  - **Problem:** The ErrorBoundary wraps the ENTIRE Stack. reset() only clears error state (setState({ error: null })) and re-renders the same children at the same route. If the underlying cause is deterministic (corrupt cached query data, a screen that always throws on bad params), tapping 'Try again' immediately re-throws and returns to the error screen. Because the boundary covers the whole navigator, the user has no way to navigate to a safe screen — they are stuck with an unusable app until force-quit.
  - **Fix:** The proposed direction is sound. To make "Try again" a real recovery path from a class component: import `router` from expo-router and in reset do `router.replace('/(tabs)/overview')` (a known-good root) BEFORE/with `setState({ error: null })`, and optionally `queryClient.clear()` (or invalidate) to drop any poisoned cached data. Additionally consider giving the inner navigator a remount key that changes on reset so the navigator subtree is fully rebuilt rather than re-rendered in place. Navigating alone is the minimum; clearing/remounting hardens against state-derived render throws.

- [ ] **B48 · LOW · infra** — Orphaned Expo-template route /modal (and its template components) ship in production
  - **Var:** `app/modal.tsx:1, components/themed-text.tsx, components/themed-view.tsx`
  - **Problem:** app/modal.tsx is leftover default Expo template code ('This is a modal' + ThemedText/ThemedView). No navigator references /modal (grep confirms zero call sites), yet expo-router auto-registers it as a live route reachable via deep link likelabapp://modal, showing a screen that looks nothing like the rest of the app. It is also the ONLY consumer of the template files in components/ (themed-text, themed-view, hello-wave, parallax-scroll-view, external-link, haptic-tab), so all that dead code is shipped.
  - **Fix:** Delete app/modal.tsx. Since themed-text/themed-view are also imported by the (likewise dead) components/ui/collapsible.tsx and components/parallax-scroll-view.tsx, delete those two as well, then remove the now-fully-orphaned template files: components/themed-text.tsx, themed-view.tsx, hello-wave.tsx, parallax-scroll-view.tsx, external-link.tsx, and haptic-tab.tsx. Verify the tabs _layout does not reference haptic-tab before removal (grep confirms it does not). If a modal route is wanted later, recreate it with the app's own UI primitives and register it in the Stack with presentation:'modal'.

- [ ] **B49 · LOW · infra** — Font-load failure leaves the app stuck on the splash screen forever (no fallback/timeout)
  - **Var:** `app/_layout.tsx:232, app/_layout.tsx:273`
  - **Problem:** const [fontsLoaded] = useFonts({...}) ignores the error element. Boot is gated on `if (!fontsLoaded || killswitch === null) return null` with SplashScreen.preventAutoHideAsync active. The killswitch path has a 5s timeout failsafe, but font loading has none — if useFonts errors (Montserrat fails to load), fontsLoaded stays false permanently, the guard never resolves, SplashScreen.hideAsync() never runs, and the app is permanently stuck on the splash. Rare for bundled @expo-google-fonts but there is no recovery.
  - **Fix:** Destructure the error and treat font failure as "ready" in BOTH places that depend on fontsLoaded, not just one. (1) Line 232: `const [fontsLoaded, fontError] = useFonts({...})`. (2) Effect at lines 267-271: `if ((fontsLoaded || fontError) && killswitch !== null) SplashScreen.hideAsync()`. (3) Guard at line 273: `if ((!fontsLoaded && !fontError) || killswitch === null) return null`. This boots the app with system fonts instead of hanging. Optionally add a font-load timeout for extra safety, but capturing fontError already breaks the deadlock since useFonts guarantees either loaded=true or error!=null.

- [ ] **B50 · LOW · infra** — StatusBadge mislabels approved/published deliverables as 'ACTIVE'
  - **Var:** `features/shared/ui/StatusBadge.tsx:15-21, app/campaigns/[id].tsx:844`
  - **Problem:** StatusBadge's map is campaign-centric: it maps approved, published, open, creating, reviewing all to the label 'ACTIVE'. The same component renders deliverable.status in the campaign-detail deliverable list ([id].tsx:844). A DeliverableStatus of 'approved' or 'published' (both valid per features/core/types.ts) therefore shows the badge 'ACTIVE' instead of 'APPROVED'/'POSTED', which is wrong/confusing for a creator looking at their own video status.
  - **Fix:** The proposed context-prop approach is the correct one; the alternative "give the statuses their own labels globally" would be WRONG. 'published' is a shared string also valid as a CampaignStatus (types.ts:4), where 'ACTIVE' is the intended label. So you cannot simply relabel `published` -> 'POSTED' in the shared map without breaking campaign badges. Add a `context?: 'deliverable' | 'campaign'` (or `labelOverride`) prop to StatusBadge; when context is 'deliverable', resolve approved -> 'APPROVED' and published -> 'POSTED'/'LIVE', and pass context="deliverable" at [id].tsx:844. Leave the default campaign-centric map untouched.

- [ ] **B51 · LOW · profile** — CountUp re-animates from 0 on every value change, flickering live stats to zero on refresh
  - **Var:** `features/motion/springs.tsx:47-50, features/profile/ui/ProfileHero.tsx:195-208`
  - **Problem:** CountUp resets shared.value=0 then animates to the new value on every prop change. It is used for TikTok Followers/Following/Likes. Any data update — pull-to-refresh, a fetch-tiktok-stats refresh, navigating back — makes the displayed counts visibly drop to 0 and count back up, reading as a glitch rather than a deliberate entrance animation. Separately value={Number(stat.value) || 0} silently renders 0 if the backend ever returns a non-numeric/formatted string (e.g. '1.2M') — verify the stored format.
  - **Fix:** The proposed fix is sound: capture the previous displayed value in a ref and animate `withTiming` from prevValue -> value, only starting from 0 on the very first mount. Concretely, in CountUp use `const prev = useSharedValue(0)` plus a `const mounted = useRef(false)`; on first effect run set `shared.value = withTiming(value)` from 0 (mounted=false), and on subsequent runs skip the `shared.value = 0` reset entirely so withTiming interpolates from the current value to the new one. This yields a smooth delta animation instead of a full re-count. The parse-guard suggestion (`Number(stat.value) || 0` falling back to the raw string) is only worth applying if backend verification shows the stat is ever stored as a non-numeric/formatted string; otherwise leave the numeric coercion as-is.

- [ ] **B52 · LOW · infra** — Inconsistent 'days left' across card vs detail (two algorithms) plus three different date locales
  - **Var:** `features/shared/ui/CampaignCard.tsx:33-38, features/core/format.ts:42, features/core/format.ts:50-64, features/onboarding/CreatorPendingGate.tsx:24, features/deliverables/ui/FeedbackChat.tsx:31`
  - **Problem:** CampaignCard.daysRemaining counts rolling 24h windows with Math.ceil (so an end date a few hours away shows '1d'), while format.getDaysLeft counts whole UTC calendar days with Math.max(0,...) and can return 0 for the same instant — the same campaign can read '1d left' on the card but '0 days'/'Open now' on the detail sticky bar. Separately, dates are formatted with three different locales: format.formatDateRange uses 'en-US', CreatorPendingGate uses 'en-GB', FeedbackChat.timeAgo uses the device default toLocaleDateString() — while money uses 'sv-SE'. So month-order/number style is inconsistent between screens and not tied to a single app locale.
  - **Fix:** Consolidate on the UTC calendar-day getDaysLeft (it already carries the documented off-by-one timezone fix and has unit tests in features/core/__tests__/format.test.ts), not the rolling-24h daysRemaining. Extend getDaysLeft to also signal the closed state (e.g. return -1 / a sentinel when the end instant has passed) and replace CampaignCard.daysRemaining (both compact line 171 and full line 256) with it so card, detail (campaigns/[id].tsx:328) and leaderboard ([id].tsx:128) all read identically. Separately, define one app date formatter (a single Intl/toLocaleDateString locale — pick 'sv-SE' to match the money formatting, or device locale, but choose one) and route formatDateRange, CreatorPendingGate and FeedbackChat.timeAgo through it instead of the per-file en-US/en-GB/default mix.

- [ ] **B53 · LOW · navigation** — AppHeader logo tap uses push (stacks duplicate routes) and has a stale tap-count comment
  - **Var:** `features/shared/ui/AppHeader.tsx:50, features/shared/ui/AppHeader.tsx:57`
  - **Problem:** Every logo tap calls router.push('/(tabs)/overview'), including when the header is already on the overview tab, so push (rather than navigate/replace) can stack duplicate entries and grow the back stack on repeated taps (the easter egg requires 15 rapid taps, each pushing). The inline comments '7 taps — confetti' / '15 taps — cat' are also stale: EASTER_EGG_TAPS is 15 and confetti+cat both fire from the same threshold.
  - **Fix:** Replace `router.push('/(tabs)/overview')` at line 50 with `router.navigate('/(tabs)/overview')` so the action de-dupes to the existing tabs entry (pops back rather than stacking a new one). Update the stale comments: line 57 `{/* 7 taps — confetti */}` should reflect that confetti fires at EASTER_EGG_TAPS (15), and line 66's cat is the same 15-tap threshold (delayed), not a separate count — e.g. `{/* 15 taps — confetti */}` and `{/* 15 taps (delayed) — cat */}`.

- [ ] **B54 · LOW · infra** — CampaignCard runs an infinite shimmer animation on every mounted card and opts out of React Compiler memoization
  - **Var:** `features/shared/ui/CampaignCard.tsx:53, features/shared/ui/CampaignCard.tsx:65-71`
  - **Problem:** CampaignCard starts an unconditional withRepeat(withTiming(...), -1) on a shared value for the card's lifetime — even when the Apply pill (the only shimmer consumer) is never rendered (showApply false). The card also declares 'use no memo', opting it out of the project's React Compiler (app.json reactCompiler:true), so every parent re-render (refetch, optimistic apply, profile poll) re-renders the whole card. Because the discover/applications/accepted lists use FlatList with scrollEnabled={false} inside a ScrollView (no virtualization — all rows mount), this becomes N perpetual UI-thread timing loops plus N un-memoized cards. Drains battery and adds jank as the list grows.
  - **Fix:** Proposed fix is correct in direction. Tighten it: gate the shimmer effect so it only animates when the pill is actually visible — start withRepeat inside the effect only when showApply (and ideally applyState==='idle', since the Animated.View only renders in the idle state), and return a cleanup that calls cancelAnimation(shimmer) and resets shimmer.value = 0 when hidden/unmounted. Add showApply (and applyState) to the effect deps. Separately, audit whether 'use no memo' is still required by the current React Compiler version; if it was added to dodge a specific compiler diagnostic, retest without it or scope the opt-out to the minimal offending expression rather than the whole component, so cards re-memoize across parent re-renders.

- [ ] **B55 · LOW · accessibility** — Looping animations override the OS 'Reduce Motion' accessibility setting
  - **Var:** `features/shared/ui/CampaignCard.tsx:67`
  - **Problem:** CampaignCard sets reduceMotion: ReduceMotion.Never on the looping apply-button shimmer, forcing the continuous animation to run even when the user has enabled OS Reduce Motion (the safe default is ReduceMotion.System). More broadly, nothing in the app reads AccessibilityInfo.isReduceMotionEnabled, so the many infinite loops (pulsing avatar/feedback halo, tab-bar bounce dot, card shimmer, count-ups) all ignore the user's reduce-motion preference — a problem for motion-sensitive/vestibular users.
  - **Fix:** Remove the `reduceMotion: ReduceMotion.Never` override on CampaignCard.tsx:67 (drop it entirely, or set `reduceMotion: ReduceMotion.System`) so the shimmer honors the OS setting. NOTE the bug's "more broadly" claim is overstated/incorrect: the other infinite loops (FloatingTabBar.tsx:27, SkeletonCard.tsx:10, FeedbackChat.tsx:149, ProfileCoachmarks.tsx:26, WelcomePendingOverlay.tsx:22/63, TutorialOverlay.tsx:191, welcome.tsx) do NOT pass `reduceMotion`, so they default to `ReduceMotion.System` and already respect the OS Reduce Motion preference via reanimated. There is no need to read `AccessibilityInfo.isReduceMotionEnabled` or gate them manually — line 67 is the only place that breaks reduce-motion.

- [ ] **B56 · LOW · infra** — Creator-profile query polls every 5s even when logged out / on the login screen
  - **Var:** `features/profile/hooks.ts:22-25, app/_layout.tsx:294-295, features/auth/ReconnectAutoRoute.tsx`
  - **Problem:** useCreatorProfile sets refetchInterval to 5000ms whenever reviewStatus !== 'approved'. When logged out, data is undefined so reviewStatus is '' -> 5s polling. ReconnectAutoRoute and ReferralLinkHandler are mounted unconditionally at the app root (outside the auth gate), and ReconnectAutoRoute subscribes to useCreatorProfile, so the query stays active on login/signup screens. getCreatorProfile -> getCurrentUserId calls supabase.auth.getUser() which throws when unauthenticated; with retry:1 this fires repeatedly every 5 seconds, causing needless work/re-renders while the user is not signed in.
  - **Fix:** Proposed fix is sound. Cleanest: gate the query with `enabled` so it never polls/fetches while signed out. Since useCreatorProfile is a standalone hook used in ~14 places, have it read the session via useAuthSession() (features/shared/hooks/useAuthSession.ts) and pass `enabled: Boolean(session)` to useQuery. When logged in this preserves current behavior; when logged out the observer goes idle and the 5s interval stops. A more localized alternative that avoids touching the hook's signature: make refetchInterval return false when there is no data, e.g. `const status = ...; if (!query.state.data) return false; return status === 'approved' ? 60_000 : 5_000` — this stops logged-out churn (data undefined) while still polling once a creator is loaded, with the minor caveat that a transient post-login network error (no data) would also pause polling until refetchOnReconnect/manual refetch.

- [ ] **B57 · LOW · infra** — applications.tsx recomputes its filter arrays every render, defeating the filteredBlocks useMemo
  - **Var:** `app/applications.tsx:101-110, app/applications.tsx:112`
  - **Problem:** pendingInvitations/declinedInvitations/acceptedApplications/closedApplications/appliedApplications are produced by .filter()/.sort() on every render with no memoization, then filteredBlocks lists them as useMemo deps. Because those arrays are fresh references each render, the useMemo never hits its cache and rebuilds the entire block list (with nested object spreads) on every render — including every scroll-driven tab-bar visibility toggle and every realtime refetch.
  - **Fix:** Wrap the five derived arrays in their own useMemo (pendingInvitations/declinedInvitations keyed on [data?.invitations]; acceptedApplications/closedApplications/appliedApplications keyed on [data?.applications]) so their references stay stable across renders, allowing the filteredBlocks useMemo to actually hit its cache. Equivalently, inline the filtering into the filteredBlocks useMemo callback and reduce its deps to [activeFilter, data?.applications, data?.invitations].

- [ ] **B58 · LOW · infra** — Swedish strings hardcoded in an otherwise all-English UI
  - **Var:** `features/deliverables/ui/FeedbackChat.tsx:182, features/profile/ui/ProfileHero.tsx:94-96, app/_layout.tsx:252`
  - **Problem:** The entire app UI is English, but three user-facing strings are Swedish: FeedbackChat renders the unread-feedback callout as 'Du har fått feedback från {brandName}' (the button beside it is English 'View feedback'/'X new'); ProfileHero shows the verified-creator Alert with title 'Verifierad creator' and body 'Ditt konto är granskat och godkänt av LikeLab, och din profil är 100% komplett.'; _layout falls back to 'Tillfälligt otillgänglig.' for the killswitch screen. To an English-speaking creator this reads as a half-translated/broken app. There is no i18n layer, so these are raw literals.
  - **Fix:** Translate the three strings to English to match the rest of the UI. Suggested: FeedbackChat.tsx:182 → `You've got feedback from {brandName || 'the brand'}`; ProfileHero.tsx:94-96 → title `Verified creator`, body `Your account has been reviewed and approved by LikeLab, and your profile is 100% complete.`; _layout.tsx:252 fallback → `Temporarily unavailable.`. (Optional longer-term: route copy through a single locale resource.)

- [ ] **B59 · LOW · accessibility** — Toast feedback is silent to screen-reader users (no live region / announcement)
  - **Var:** `features/shared/ui/Toast.tsx:88`
  - **Problem:** Toasts are the app's primary success/error feedback channel ('Application sent!', 'Could not apply', 'TikTok connected', 'Invitation accepted/declined', profile-save errors). ToastContainer renders with pointerEvents='none' and the rows have no accessibilityLiveRegion, no accessibilityRole='alert', and emit() never calls AccessibilityInfo.announceForAccessibility. VoiceOver/TalkBack users therefore receive only a haptic and never hear what happened — they cannot tell whether an action succeeded or failed.
  - **Fix:** In emit() call AccessibilityInfo.announceForAccessibility(message) — this works on both iOS and Android and is the single reliable lever (import AccessibilityInfo from 'react-native'). As a complement, add accessibilityLiveRegion='polite' (Android-only) to the ToastRow Animated.View. accessibilityRole='alert' alone is not reliable for dynamically inserted, auto-dismissed views on iOS, so don't rely on it by itself.

---

## ✨ Polish & professionalism

### Loading, skeleton & empty states

- [ ] **P01** — Replace bare spinners with content-shaped skeletons on primary screens _(effort M · pri high)_
  - Insights, Campaign detail, Profile (ProfileOverview), Settings and Leaderboard show a centered ActivityIndicator while list tabs already use SkeletonCampaignCard/SkeletonDeliverableCard. Add matching skeletons (summary cells, top-performer card, campaign rows, position card) so primary destinations load with structure. Merges 5 near-identical reports.
- [ ] **P02** — Add an explicit loading shimmer to the invite code & stat cells _(effort S · pri med)_
  - While useReferral loads, the '······' dotted code and 0 stats are indistinguishable from the disabled/empty fallback, and Copy/Share sit at 0.4 opacity. Render a distinct loading shimmer so first paint reads as 'loading', not 'empty'.
- [ ] **P03** — Tailor empty states with next-step CTAs _(effort S · pri med)_
  - Applications 'Nothing here' and Discover 'No campaigns' are passive and identical regardless of reason. Add a 'Browse campaigns' CTA on Applications, and differentiate Discover copy for unapproved vs applied-to-everything vs truly-empty. Add a 'You're not ranked yet — post a video to enter' state on Leaderboard.
- [ ] **P04** — Group mixed Applications list under section headers _(effort M · pri low)_
  - In the 'all' filter every card stamps its own uppercase label ('Accepted campaign', 'Closed application'…) so identical labels stack. Use one section header per category for a cleaner finished list (applications.tsx:387-414).

### Error, retry & resilience

- [ ] **P05** — Add styled error cards with a Retry button across lists/detail _(effort M · pri high)_
  - Load failures render one tiny muted line with no retry: overview.tsx:153, deliverables.tsx:142, applications.tsx:293, campaigns/[id].tsx:454, insights.tsx:387, and MyVideosFeed (failure looks like empty). Replace with an icon + message + 'Try again' calling refetch. Merges ~6 reports.
- [ ] **P06** — Give the Discover Apply button real success/failure feedback _(effort S · pri high)_
  - overview Apply flashes optimistic green 'Applied!' and shows nothing on failure. Add success and error toasts (as campaign detail already does) so the core action communicates its outcome.
- [ ] **P07** — Add a Retry button to the deliverable video player error state _(effort S · pri med)_
  - When getDeliverableVideoSignedUrl fails/returns null, VideoReviewActions VideoPlayerModal shows only static error text (VideoReviewActions.tsx:46-47). Add a 'Try again' that re-runs the signed-URL fetch. Merges 2 reports.
- [ ] **P08** — Surface the swallowed Leaderboard RPC error & gate the climb hint _(effort M · pri med)_
  - leaderboard/[id].tsx:56 swallows the RPC error with no error UI; the header shows '0 creators' on failure and the position card shows 'Climb to top 5 to earn a reward' even when payoutCount is 0. Add a real error state and only show the climb hint when prize tiers exist.

### Toast & in-app feedback consistency

- [ ] **P09** — Make toasts tappable / swipe-to-dismiss _(effort M · pri high)_
  - ToastContainer wraps rows in pointerEvents='none' (Toast.tsx:88, verified), so a 3.2s error just sits with no way to dismiss or act, and the [...prev.slice(-2)] cap silently drops bursts. Make individual rows interactive (swipe-to-dismiss, optional 'View' action, '+N more') while keeping the container non-blocking. Merges 3 reports.
- [ ] **P10** — Route Settings save/avatar/connect feedback through the global Toast _(effort S · pri high)_
  - SettingsForm uses a bespoke showToast banner (lines 404-422, verified) that never auto-dismisses and fires no haptic for 'Profile updated'/'Avatar updated'/'TikTok connected'. Route through the app Toast (auto-dismiss + success haptic) for consistency, or add a ~2.5s timer + unmount cleanup. Merges 4 reports.
- [ ] **P11** — Confirm link/video submission with an inline success state + clear the field _(effort S · pri med)_
  - LinkSubmitRow only fires haptic.success on submit (LinkSubmitRow.tsx:40); the URL + re-enabled button linger until the parent refetch unmounts the row, inviting a confusing second tap. Add a momentary 'Submitted!' state (like VideoUploadRow's isDone) + brief toast and clear the input. Merges 2 reports.
- [ ] **P12** — Add a 'TikTok disconnected' confirmation toast _(effort S · pri low)_
  - handleConnectTikTok shows 'TikTok connected' (SettingsForm.tsx:272) but handleDisconnectTikTok only refetches with no confirmation. Add a symmetric 'TikTok disconnected' toast.

### Haptics & tactile feedback

- [ ] **P13** — Add haptics to auth outcomes _(effort S · pri med)_
  - welcome uses Haptics but login (fail/success), verify-otp (success/error) and account creation give none. Fire Haptics.notificationAsync(Error) on failed sign-in/wrong OTP and Success on verification/account-created.
- [ ] **P14** — Add haptic on accept/decline invitation outcome _(effort S · pri med)_
  - CampaignCard Apply fires haptic.success/warning, but accepting/declining an invitation (applications.tsx:242-258) only shows a toast. Add haptic.success on accept and haptic.light/selection on decline.
- [ ] **P15** — Add haptics to onboarding, Insights and Projects taps _(effort S · pri low)_
  - welcome goNext fires impactAsync but Skip/Sign-in/LiquidButton don't; Insights leaderboard chevron, top-performer arrow and Back fire none; the Projects action/history cards fire none. Add light/selection haptics for parity. Merges 4 reports.
- [ ] **P16** — Use haptic.success on TikTok connect instead of Alert with no haptic _(effort S · pri low)_
  - connect-tiktok handleConnect uses Alert.alert for errors (lines 29-32) and gives no haptic on success, unlike the rest of the app. Fire haptic.success on connected and prefer the toast system.

### Accessibility — labels, roles & touch targets

- [ ] **P17** — Label app-wide header controls _(effort S · pri high)_
  - AppHeader logo (→Home) and avatar (→Open profile) Pressables (AppHeader.tsx:77,81) have no accessibilityRole/Label, and they appear on every screen, so VoiceOver announces nothing. Add roles + labels. Merges 3 reports.
- [ ] **P18** — Add roles/labels to tab-bar buttons and fold notification dots into the label _(effort S · pri high)_
  - FloatingTabBar reads tabBarAccessibilityLabel but Screen options only set title, so icon-only tabs announce as generic 'button' (FloatingTabBar.tsx:293). Pass explicit labels ('Discover tab') and express ProfileIncompleteDot/DeliverablesPendingDot via accessibilityLabel/Value ('Deliverables, 3 pending', 'Profile, incomplete'). Merges 2 reports.
- [ ] **P19** — Expose selected state on segmented tabs & chips _(effort S · pri med)_
  - Selection is color/weight-only with no accessibilityState on Applications FilterTab (applications.tsx:34), campaign Brief/Videos tabs (campaigns/[id].tsx:584) and Discover category chips. Add accessibilityRole='tab'/'button' + accessibilityState={{selected}}.
- [ ] **P20** — Label remaining icon-only Pressables across screens _(effort M · pri med)_
  - Discover grid/list toggle (overview.tsx:158), back chevrons (campaigns/[id].tsx:443, leaderboard/[id].tsx:87), login password eye (login.tsx:172), brand chips, FeedbackChat close (line 69) and hashtag-copy tags lack roles/labels (add accessibilityHint='Copies the hashtag' there). Merges several reports.
- [ ] **P21** — Add roles/labels to onboarding, profile and connect taps _(effort M · pri med)_
  - welcome Skip/Sign-in + page dots, coachmark Next/Skip, appeal modal close '×' (CreatorPendingGate.tsx:271), profile avatar/social pills/Contact rows/completion checklist, and connect/continue buttons (connect-tiktok.tsx:77-85,102-115) are unlabeled. Mirror ProfileOverview's Insights/Invite cards, which do it correctly.
- [ ] **P22** — Fix sub-44pt hit targets and announce disabled state _(effort S · pri med)_
  - Applications FilterTab is 36px tall with no hitSlop; several icon rows are small. Bump to >=44pt. Also PressableScale sets role='button' but never accessibilityState={{disabled}} (unlike LiquidButton), so disabled cards read as actionable.

### Accessibility — motion, dynamic type & animated values

- [ ] **P23** — Make animated stat counters screen-reader readable _(effort M · pri med)_
  - CountUp (springs.tsx:25) and Insights AnimatedCounter (insights.tsx:67) render numbers into an editable=false TextInput with no accessibilityLabel, so headline metrics (views/likes/best rank, followers, invite counts) announce as bare/editable. Add accessibilityLabel with the final value (e.g. 'Total views 12.3K') and accessibilityElementsHidden on the inner input. Merges 3 reports.
- [ ] **P24** — Honor Reduce Motion on always-on & entrance animations _(effort M · pri med)_
  - No file reads AccessibilityInfo/useReducedMotion; the shimmer even passes ReduceMotion.Never which forces motion. Skip the Insights counter spin + chart draw-on, CampaignCard shimmer, FloatingTabBar bounce dot and FeedbackChat pulse halo when Reduce Motion is on. Merges 2 reports.
- [ ] **P25** — Constrain Dynamic Type on fixed-height containers _(effort M · pri med)_
  - Only LiquidButton (1.3) and one Insights cell (1.4) set maxFontSizeMultiplier. Large OS text scales 34px headers, 26px stat numbers and pill labels inside fixed-height tab bars/stat cells/CTAs, clipping them. Audit fixed-height text and add sensible maxFontSizeMultiplier or let containers grow.
- [ ] **P26** — Label the Insights ViewsChart SVG with a trend summary _(effort S · pri low)_
  - The chart SVG (insights.tsx:169-196) is invisible to screen readers. Wrap with an accessibilityLabel summarizing the trend (e.g. 'Views per campaign, trending up').

### Forms, keyboard & validation

- [ ] **P27** — Add returnKeyType/onSubmitEditing focus-chaining _(effort M · pri med)_
  - AuthInput and ProfileField don't expose returnKeyType/onSubmitEditing/blurOnSubmit; login email/password (lines 130-171) set neither, so Return never advances or submits (only LinkSubmitRow wires it). Add 'next'/'done' focus-chaining across login, signup and settings.
- [ ] **P28** — Replace blocking Alerts with inline field validation + scroll-to-error _(effort M · pri med)_
  - login ('Missing fields'), signup step validation, and Settings age (SettingsForm.tsx:233-237) use generic Alerts that don't indicate which field and dismiss the keyboard. Add inline per-field errors and scroll-to-first-error. Merges several reports.
- [ ] **P29** — Add client-side validation in signup + remove dead import _(effort S · pri med)_
  - updateCreatorProfile is imported (signup.tsx:19) but unused; email is only checked non-empty (malformed fails server-side with a generic error) and age has no bounds. Add an email-format check and age range before advancing.
- [ ] **P30** — Make ProfileField autoCapitalize a prop _(effort S · pri low)_
  - ProfileField.tsx:63 hardcodes autoCapitalize='none' for all fields incl. Display Name/City/Street, so the same data signup capitalizes ('words') is entered lowercase in Settings. Make it a prop and use 'words' for name/address/city.
- [ ] **P31** — Wrap the delete-account modal in KeyboardAvoidingView _(effort S · pri med)_
  - The vertically-centered delete modal (SettingsForm.tsx:724-783) has no KeyboardAvoidingView, so on small devices the keyboard covers the password field and buttons. Wrap it like the appeal modal does.
- [ ] **P32** — Gate the signup clipboard read behind an explicit affordance _(effort S · pri med)_
  - signup reads Clipboard.getStringAsync() unconditionally on mount to auto-fill the invite code (signup.tsx:85-90), triggering the iOS 'pasted from…' banner every open. Gate behind a 'Paste code' tap or read only on field focus.

### Auth forms & verification polish

- [ ] **P33** — Enable iOS password & one-time-code autofill _(effort S · pri high)_
  - No auth screen sets textContentType. Add textContentType='password'/'newPassword' + autoComplete on login/signup/reset for Keychain autofill and strong-password suggestions, and textContentType='oneTimeCode' on the verify-otp boxes for SMS/email autofill. Merges 2 reports.
- [ ] **P34** — Support full-code paste + auto-submit + labels on the OTP screen _(effort M · pri high)_
  - handleDigitChange does value.slice(-1) (verify-otp.tsx:45, verified), so pasting a 6-digit code only fills the last box. Detect multi-char paste and distribute digits, auto-verify when the 6th digit lands, and add per-box accessibilityLabel ('digit 1 of 6'). Merges 3 reports.
- [ ] **P35** — Surface real OTP errors and explain post-verify bounce _(effort S · pri med)_
  - verify-otp falls back to 'Invalid or expired code.' (read the FunctionsHttpError body for rate-limit/locked/expired), and on a sign-in failure after a successful OTP it silently router.replace('/login') (lines 85-88) with no 'Email verified — please sign in' message. Merges 2 reports.
- [ ] **P36** — Fix low-contrast typed text & off-brand tokens on forgot/reset-password _(effort S · pri med)_
  - Typed text renders in muted gray (#6C7E9E — forgot-password.tsx:132, reset-password.tsx:179/200) so it looks disabled, and both hardcode hex + fontFamily 'Montserrat' instead of the shared tokens login/signup use. Use ink for entered text and shared theme tokens. Merges 2 reports.
- [ ] **P37** — Add eye toggle + 'Verifying link…' state to reset-password _(effort S · pri med)_
  - reset-password's two password fields have no eye toggle (login/signup do), and while ready=false the CTA is only dimmed with no spinner/copy during the setSession round-trip, so the form looks frozen on open. Merges 2 reports.
- [ ] **P38** — Surface login errors inline instead of only via Alert _(effort S · pri med)_
  - login shows sign-in failures via Alert.alert and keeps the password populated. An inline error row (matching verify-otp's error styling) plus focusing the password is more polished and less interruptive.
- [ ] **P39** — Prefetch core queries on SIGNED_IN _(effort M · pri med)_
  - useAuthSession prefetches campaigns/applications/deliverables/profile only on the boot path (useAuthSession.ts:84-87). After a fresh email/password login the SIGNED_IN handler doesn't prefetch, so the first tab shows loading/empty. Trigger the same prefetch on SIGNED_IN.
- [ ] **P40** — Update or remove the orphaned check-email screen _(effort S · pri low)_
  - Nothing routes to /check-email (the live flow is verify-otp); it's only in TikTokAuthGuard's allowlist, still uses the old auth design and has a dead-end 'Try again from signup.' line. Remove it or bring it in line.

### OAuth & TikTok connection polish

- [ ] **P41** — Brand the bare auth/TikTok callback screens _(effort S · pri med)_
  - app/auth/callback.tsx and app/auth/tiktok/callback.tsx render only a centered ActivityIndicator (tiktok callback.tsx:81, verified). Add a logo + 'Connecting your TikTok/account…' copy so the OAuth round-trip feels deliberate, not a blank flash. Merges 2 reports.
- [ ] **P42** — Explain TikTok callback failures instead of silent redirect _(effort S · pri med)_
  - On auth error (callback.tsx:33-35), state mismatch (line 60) or exchange failure (lines 70-73) the screen just router.replace('/connect-tiktok') with no toast, so the user lands back with no idea it failed. Surface a toast.error explaining the attempt didn't complete.
- [ ] **P43** — Give feedback when the user cancels TikTok OAuth _(effort S · pri low)_
  - When the auth sheet is dismissed connectTikTokAccount returns null and handleConnect returns silently (connect-tiktok.tsx:22-24). Show a subtle 'Connection canceled' toast (and the CTA already re-enables). Merges 2 reports.
- [ ] **P44** — Explain the auto-reconnect redirect _(effort S · pri low)_
  - ReconnectAutoRoute pushes /connect-tiktok (line 36) with no toast/banner, so the jump feels like a glitch. Pair it with a one-line 'Reconnect TikTok to refresh your stats'.

### Microcopy, i18n & number formatting

- [ ] **P45** — Translate the Swedish FeedbackChat copy to English _(effort S · pri med)_
  - FeedbackChat.tsx:182 (verified) renders 'Du har fått feedback från {brand}' beside an otherwise-English UI ('Under review', 'View feedback'). Standardize to English. Merges 2 reports.
- [ ] **P46** — Align the killswitch default message to English _(effort S · pri low)_
  - The fallback block message is Swedish 'Tillfälligt otillgängligt.' (_layout.tsx:252) while every other shell string is English. Default to English (the gist can still override per-locale).
- [ ] **P47** — Locale-aware, consistent number formatting _(effort M · pri med)_
  - Compact counts use hand-rolled '1.2K'/'1.2M' with '.' decimals (insights.tsx, campaigns/[id].tsx) while currency uses sv-SE grouping, and CountUp prints Math.round(value) with no thousands separator (springs.tsx:52). Standardize on Intl.NumberFormat / toLocaleString('sv-SE'). Merges 2 reports.
- [ ] **P48** — Disambiguate 'Closes in 0 days' _(effort S · pri med)_
  - getDaysLeft clamps negatives to 0, so the detail sticky bar shows 'Closes in 0 days' for both ending-today and already-closed. Show 'Last day' for 0 and 'Closed' for past, matching CampaignCard.
- [ ] **P49** — Clarify referral milestone & Connector badge copy _(effort S · pri low)_
  - The invite card says 'Invite 3 friends' but progress is joinedCount, so 3 invited / 0 joined reads 0/3 (invite.tsx:69-76) — change to 'Get 3 friends to join'. Also the Connector badge is cosmetic but framed as a reward; add microcopy on what it unlocks. Merges 2 reports.
- [ ] **P50** — Fix Insights 'Best rank' counting through #0 + trend framing _(effort S · pri low)_
  - For mode='rank' AnimatedCounter interpolates 0→rank, briefly showing the nonexistent #0 and counting the wrong direction (insights.tsx:53-56). Use a fade-in (or count down from totalCreators). Also '+34% views vs last campaign' reads as a time trend but compares your two most recent campaigns — tighten to 'vs your previous campaign'. Merges 2 reports.
- [ ] **P51** — Fix contradictory tier ladder requirement copy _(effort S · pri low)_
  - LadderRow always renders 'Apply to N campaigns' (tiers.tsx:18-21) even next to a green check / 'YOU'RE HERE' badge. Show 'Achieved' for met tiers and 'Current level' for the current one.
- [ ] **P52** — Confirm an entered invite code was applied/credited _(effort M · pri low)_
  - redeemPendingReferral is fire-and-forget; the invitee gets no signal. Show an 'Invite code applied' chip on the signup review step and a one-time 'You joined via a friend's invite' toast after redemption.

### Performance perception & re-render hygiene

- [ ] **P53** — Share one BrandSheet + gate CampaignCard shimmer offscreen _(effort M · pri med)_
  - Every CampaignCard mounts its own BrandSheet BottomSheetModal (CampaignCard.tsx:329-347) and starts an infinite withRepeat shimmer on mount (lines 65-71) even when no Apply button shows — N portals + N UI-thread loops in a long feed. Hoist a single shared BrandSheet to the list and run the shimmer only when showApply and on-screen. Merges 2 reports.
- [ ] **P54** — Cap the FadeInDown stagger delay _(effort S · pri low)_
  - entering=FadeInDown.delay(index*80) (CampaignCard.tsx:342) means the 20th card animates ~1.6s after mount, so lower cards appear to stall. Cap with Math.min(index,6)*60.
- [ ] **P55** — Don't re-spin Insights counters/chart on quiet refreshes _(effort M · pri med)_
  - AnimatedCounter depends on value and ViewsChart on values; with placeholderData a pull-to-refresh returning slightly different numbers restarts every counter from 0 and redraws the chart, reading as a glitch. Animate on first mount/focus only. Also memoize Applications source arrays so filteredBlocks actually skips work. Merges 2 reports.
- [ ] **P56** — Bound the thumbnail cache and generate grid thumbnails lazily _(effort M · pri med)_
  - thumbCache (MyVideosFeed.tsx:16) is a module-scoped Map that only grows; cap/evict it. GridCell calls VideoThumbnails.getThumbnailAsync on remote signed URLs for every cell with no windowing (lines 36-47,194-196), firing many simultaneous remote frame extractions. Prefer server thumbnails and throttle/lazy-generate via onViewableItemsChanged. Merges 2 reports.
- [ ] **P57** — Back off the 5s foreground polling for non-approved profiles _(effort S · pri med)_
  - useCreatorProfile refetchInterval polls every 5s for any non-approved status (hooks.ts:22-25) on top of realtime + AppState refresh; 'pending' can last days, draining battery/data. Back off (e.g. 5s for the first 60s, then 30s).
- [ ] **P58** — Use expo-image for the header avatar _(effort S · pri med)_
  - AppHeader.tsx:83 uses RN <Image> (no cache) while everything else uses expo-image with cachePolicy='memory-disk'; on a header rendered every tab this re-fetches/flickers. Switch to ExpoImage with memory-disk + a small transition.
- [ ] **P59** — Avoid the double round-trip in Applications pull-to-refresh _(effort S · pri low)_
  - onRefresh awaits invalidateQueries(['applications']) (which already refetches) then awaits refetch(), doubling the request and the spinner (applications.tsx:82-85). Drop one.
- [ ] **P60** — Reconsider refetchOnMount:false for freshness _(effort M · pri low)_
  - With refetchOnMount:false + refetchOnWindowFocus:false and gcTime 30m (query-client.ts:16-21), revisiting a screen never refetches past the 2m staleTime. Consider refetchOnMount:'always' on a few high-signal screens (deliverables/overview) or an 'updated Xm ago / pull to refresh' hint.

### Visual & design-token consistency

- [ ] **P61** — Consolidate the overlapping design-token layers _(effort L · pri med)_
  - theme.ts ships four partly-overlapping systems (colors/palette/glass/redesign) with duplicated semantics at different values (palette.successBg hsl(145 50% 92%) vs redesign.color.successBg rgba(16,185,129,.12); blurIntensityCard 55 vs blurCard 28); 25 files use palette.* and 38 use redesign.*. Collapse to one semantic source of truth.
- [ ] **P62** — Unify the status-color vocabulary _(effort M · pri med)_
  - deliverables.tsx STATUS_CONFIG hardcodes raw hex (#6366F1/#16A34A/#0EA5E9/#DC2626), StatusBadge uses palette.* tokens, and campaign chips use approvalChip — three vocabularies for one concept. Migrate to one token set.
- [ ] **P63** — Replace the stock-Unsplash default avatar in Settings _(effort S · pri med)_
  - With no photo the Account card shows a hardcoded Unsplash portrait of a stranger (SettingsForm.tsx:454-455), implying a photo is set and breaking offline. Use the initials/gradient fallback ProfileOverview already uses.
- [ ] **P64** — Inset & debounce the OfflineBanner _(effort S · pri med)_
  - OfflineBanner is absolutely positioned top:0 with an opaque background and pointerEvents='none' (OfflineBanner.tsx:25-52), covering the status bar / header logo, and flashes on cold start while NetInfo resolves null. Inset it below the safe-area header and debounce ~400ms before showing offline. Merges 2 reports.
- [ ] **P65** — Unify connect-tiktok button radii & fontFamily _(effort S · pri low)_
  - The connect CTA uses borderRadius 20 (line 105) while 'Continue' uses 999 (line 80); both hardcode fontFamily 'Montserrat' (lines 82,112) instead of the shared typography.fontFamily used elsewhere in the same file. Unify.
- [ ] **P66** — Anchor the Insights latest-point callout dot to the line tip _(effort S · pri low)_
  - The cyan callout dot uses top: last.y + 16 (insights.tsx:205), offsetting it 16px below the line endpoint so it can detach from the curve. Align to last.y minus half the dot size.

### Notifications (push & in-app)

- [ ] **P67** — Make foreground notification toasts actionable + richer _(effort M · pri high)_
  - A foreground notification shows toast.info(`${title}\n${body}`) (_layout.tsx:200), but ToastContainer is pointerEvents='none' so it can't be tapped/deep-linked, and the raw \n join has no title styling or per-type icon. Route through resolveNotificationRoute and use a richer in-app banner with title weight + type accent. Merges 2 reports.
- [ ] **P68** — Wire an in-app notification center to the dead infra _(effort M · pri med)_
  - NotificationsProvider/useNotifications/markAllAsRead/unreadCount (features/notifications/hooks.ts) are fully implemented with a realtime subscription but have zero consumers (verified). Mount a bell/inbox screen so creators get notification history — high value, low effort since the data layer exists. Merges 2 reports.
- [ ] **P69** — Split the single MAX-importance Android channel _(effort S · pri med)_
  - registerForPushNotificationsAsync creates one 'default' channel at AndroidImportance.MAX for everything (push.ts:11-18), so marketing buzzes like approvals and can't be tuned. Split into per-category channels (collabs/feedback/marketing).
- [ ] **P70** — Drop the deprecated shouldShowAlert in the notification handler _(effort S · pri low)_
  - setNotificationHandler sets shouldShowAlert:true alongside shouldShowBanner/shouldShowList (_layout.tsx:81-89); shouldShowAlert is deprecated in expo-notifications 0.32 — dead config that will warn on upgrade. Remove it.

### Video deliverable pipeline UX

- [ ] **P71** — Show real upload progress instead of indeterminate 'Uploading…' _(effort M · pri med)_
  - VideoUploadRow shows a live % only during 'compressing' (lines 85-90); 'uploading' and 'processing' are static, so a large clip sits on a frozen-looking spinner. Add a byte-level determinate progress bar (or at least a 'larger videos take a moment' sub-label).
- [ ] **P72** — Differentiate processing copy & set expectations _(effort S · pri low)_
  - 'Processing…' (VideoUploadRow.tsx:90) gives no sense of duration despite a 5-minute poll timeout. Add 'We're preparing your video — usually under a minute' and a subtle elapsed indicator before the timeout.
- [ ] **P73** — Fix reversed history video numbering _(effort S · pri med)_
  - historyVideoNo numbers in list order (deliverables.tsx:115-124) but the list is created_at DESC, so the newest video is labeled 'Video 1' and the oldest 'Video 3'. Number ascending by creation.
- [ ] **P74** — Validate the submitted link as a TikTok URL _(effort S · pri med)_
  - LinkSubmitRow.tsx:15-22 accepts any http(s) URL even though the field is TikTok-specific and a tested lib/validate-tiktok-url.ts exists. Use it to reject typos inline with a specific message and a tiktok.com example.
- [ ] **P75** — Give 'Approved (awaiting link)' history rows a distinct, tappable affordance _(effort M · pri med)_
  - History rows (deliverables.tsx:256-316) render 'Approved'/'Live'/'In review' as passive pills with no pressed state, role, label or haptic. Make the awaiting-link state visually distinct with an explicit 'Post & add link' button, add accessibilityRole/label ('Open <campaign>, N videos left') and a light haptic. Merges 2 reports.

### App shell, routing, refresh & observability

- [ ] **P76** — Wire crash reporting in ErrorBoundary _(effort M · pri high)_
  - componentDidCatch only console.errors in __DEV__ (ErrorBoundary.tsx:19-22); in release, render errors that hit the boundary are invisible. Wire a real crash reporter at the marked Sentry hook point.
- [ ] **P77** — Don't block first paint up to 5s on the killswitch gist fetch _(effort M · pri high)_
  - RootLayout renders null (splash) until killswitch !== null, which only resolves after the GitHub gist fetch or its 5s AbortController timeout (_layout.tsx:240-275). Cache the last-known killswitch in SecureStore and render immediately while revalidating in the background. Merges 2 reports.
- [ ] **P78** — Add a branded +not-found screen _(effort S · pri med)_
  - There is no app/+not-found.tsx, so an unknown deep-link/notification path falls through to Expo Router's default (or blank in release). Add a branded screen with a 'Go home' (router.replace('/')) matching the ErrorBoundary visual language.
- [ ] **P79** — Scroll-to-top/refresh on re-tapping any active tab _(effort S · pri med)_
  - Only re-tapping focused Overview scrolls to top + refreshes (FloatingTabBar.tsx:266-273); re-tapping active Deliverables or Profile is a no-op. Wire the same scrollEvents pattern for all three.
- [ ] **P80** — Add pull-to-refresh / focus refetch to the screens missing it _(effort S · pri med)_
  - ProfileOverview, app/invite and app/tiers render <Screen> with no onRefresh, and leaderboard/[id] fetches position once on mount (lines 47-58) with no RefreshControl, so a creator who climbs sees a stale rank. Add onRefresh (invalidating the relevant queries) and a leaderboard focus refetch. Merges 3 reports.
- [ ] **P81** — Add an auth/role guard to standalone deep-linkable screens _(effort M · pri med)_
  - insights, applications, settings, tiers, leaderboard/[id], campaigns/[id] and invite are top-level Stack screens with zero useAuthSession imports (confirmed), reachable via notification routes/deep links; with no session they show empty/error states instead of redirecting. Add a shared useRequireCreatorSession() guard.
- [ ] **P82** — Use router.back()/replace for Settings back & Replay _(effort S · pri low)_
  - Settings back (SettingsForm.tsx:384-385) and Replay tutorial (line 711) use router.push('/(tabs)/profile'), stacking duplicate Profile screens. Prefer router.back() when there's history.
- [ ] **P83** — Fix AppHeader easter-egg comments & confetti Modal back handling _(effort S · pri low)_
  - Comments say '7 taps / 15 taps' (AppHeader.tsx:57,66) but EASTER_EGG_TAPS is 15 and both fire off it; the confetti Modal (line 58) has no onRequestClose so Android hardware-back is a no-op/warns. Correct both.

### Onboarding, appeal & celebratory moments

- [ ] **P84** — Fix the stale appeal Step-3 confirmation copy _(effort S · pri high)_
  - Step 3 reads 'A meeting booking integration can submit this to the backend once wired' (CreatorPendingGate.tsx:395, verified) even though bookMeeting actually POSTs the reason+slot to the book-meeting function in step 2 (line 89). Replace with a real success confirmation ('Your appeal and call request were sent — we'll email you to confirm'). Merges 2 reports.
- [ ] **P85** — Show timezone context on the appeal slot grid _(effort S · pri med)_
  - Slots are fixed strings and the request hardcodes timezone:'Europe/Stockholm' (line 100) but the UI never says CET, so a creator abroad books hours off. Show 'times in CET (Stockholm)' near the slot grid (lines 362-384).
- [ ] **P86** — Add step transitions + a success checkmark to the appeal modal _(effort M · pri low)_
  - The multi-step modal jumps between steps with no animation and step 2's date/time grid has only a single red error line. Add a slide/fade between steps and a success checkmark on step 3 so booking feels finished.
- [ ] **P87** — Celebrate 100% profile completion _(effort S · pri low)_
  - At 100% the completion card simply unmounts (SettingsForm condition near line 438) with no acknowledgement. Add a brief 'Profile complete' success state + haptic before it disappears.
- [ ] **P88** — Tighten welcome carousel confetti/CTA timing _(effort S · pri low)_
  - index (driving isLast, confetti, button label) updates only onMomentumScrollEnd (welcome.tsx:478) while dots track scrollX live, so on a slow drag the confetti/label lag a half-beat. Derive isLast from scrollX (or update index onScroll like TutorialOverlay).
- [ ] **P89** — Reset the invite confetti overlay after the burst _(effort S · pri low)_
  - celebrate is only incremented, never reset (invite.tsx:93,137-141), so the ConfettiCannon overlay View stays mounted for the screen's lifetime. Reset to 0 on animation end so it unmounts.
- [ ] **P90** — Add an independent 'seen' guard to the coachmark tour _(effort S · pri low)_
  - The profile tour relies entirely on the tutorial's seen-flag (ProfileCoachmarks.tsx); any future caller of startProfileTour() re-runs the full 5-step spotlight unconditionally. Add a lightweight per-user seen marker.

### Trust, safety & external links

- [ ] **P91** — Validate scheme + confirm host before opening brand links _(effort S · pri med)_
  - campaign exampleLinks are opened with Linking.openURL with no scheme check (campaigns/[id].tsx:735), unlike the deliverable 'live' link (:917) which guards /^https?:/. Validate the scheme and optionally show the destination host in a small confirm sheet.
- [ ] **P92** — Toast on link-open failures _(effort S · pri med)_
  - Many Linking.openURL(...).catch(()=>{}) calls silently no-op (ProfileOverview.tsx:223/230/375, campaigns/[id].tsx:735/917, MyVideosFeed tiktok buttons, BrandSheet.tsx:19) when the URL can't open. A 'Couldn't open this link' toast prevents a dead-feeling tap.
- [ ] **P93** — Preview the data/scopes imported on TikTok connect _(effort S · pri low)_
  - The connect copy promises 'profile picture, handle, and stats' (connect-tiktok.tsx:97-99) but shows nothing tangible. A small bulleted list of exact scopes (followers, likes, video count, avatar) builds trust and OAuth opt-in conversion.

### Dead code & route cleanup

- [ ] **P94** — Delete leftover Expo-template files and the boilerplate /modal route _(effort S · pri low)_
  - components/parallax-scroll-view, hello-wave, external-link, haptic-tab, ui/collapsible, ui/icon-symbol(.ios), themed-text/themed-view and app/modal.tsx (still renders 'This is a modal' and reachable as /modal) are unreferenced except by each other (ripgrep-verified). Remove to shrink the bundle and clean the route surface. Merges 2 reports.
- [ ] **P95** — Remove dead profile components _(effort S · pri low)_
  - ProfileHero.tsx, ProfileStats.tsx and ProfilePendingGate.tsx are no longer imported (live gate is CreatorPendingGate). ProfileHero also carries Swedish-only Alert copy and an uncleared Animated.loop. Remove them.
- [ ] **P96** — Remove unreachable onboarding code _(effort S · pri low)_
  - CreatorOnboardingGate computes getProfileCompletion into `completion` (lines 7,19) but never uses it (hardcodes percentage={0}); the TikTok-not-connected branch (lines 29-36) is unreachable because TikTokGuard redirects before the gate renders. Remove the unused var and dead branch or document the fallback.
- [ ] **P97** — Remove the dead Discover category-filter chips _(effort S · pri low)_
  - overview.tsx:74-145 derives chips from a non-existent campaign.category field, so categories.length is always 1 and the chips never render. Wire a real field or delete the inert code.
- [ ] **P98** — Extract a shared needsTikTokReconnect() helper _(effort S · pri low)_
  - The non-trivial legacy-scope predicate (tiktokConnected && !tiktokUsername && (!tiktokHandle || /^https?:\/\//.test(tiktokHandle))) is hand-written in ReconnectAutoRoute.tsx:21-24 and ProfileHero.tsx:112 and will drift. Extract one helper.

---

## 💡 Feature-idéer

### Sign-in & signup friction

- [ ] **I01** — Native Apple & Google sign-in _(effort L · pri high)_
  - Wire the existing dead OAuth scaffolding into real native Sign in with Apple + Google to replace the 4-step email/password flow and lift signup conversion.
- [ ] **I02** — Persist & resume an in-progress signup _(effort M · pri high)_
  - pending-auth is module-level in-memory (verified: `let _pending`), so a cold start mid-signup wipes every field; persist the multi-step draft to SecureStore and restore on relaunch.
- [ ] **I03** — Passwordless email-OTP / magic-link login for returning users _(effort M · pri med)_
  - Reuse the existing OTP pipeline to offer one-tap code login on the login screen, removing the forgotten-password dead-end.
- [ ] **I04** — Inline email typo correction + deliverability hint at signup _(effort S · pri med)_
  - Real-time validate the email and suggest fixes ('did you mean gmail.com?') before calling signup-creator, plus a 'a code is coming' note to cut stuck signups.

### Onboarding, review-gate & profile completion

- [ ] **I05** — Live review-status timeline with ETA for pending creators _(effort M · pri high)_
  - Replace the static 'Under Review' card with a Submitted -> Under Review -> Decision timeline + expected-by estimate, animating to Approved in place via the existing realtime sync and pushing on status flip.
- [ ] **I06** — Personalized, gamified onboarding checklist _(effort M · pri high)_
  - Surface the already-built getProfileCompletion data as a 'Get started' checklist (photo, categories, connect TikTok, first apply, first post) with progress ring, haptics and a completion reward, shown on Discover until done.
- [ ] **I07** — Auto-fill profile from connected TikTok _(effort M · pri high)_
  - On TikTok connect, pre-populate display name, bio, avatar and suggested categories from the profile (user confirms), cutting the completion friction that blocks approval.
- [ ] **I08** — 'What to do while you wait' for pending/rejected creators _(effort M · pri med)_
  - Let pending creators browse/save campaigns and finish their media kit, and show rejected creators exactly which criteria they missed before appealing, keeping blocked users engaged.
- [ ] **I09** — Guided 'Finish in 2 minutes' completion wizard _(effort M · pri med)_
  - Replace scattered scroll-to-section jumps with an optional single guided flow that walks only missing fields with progress, then drops the user back at 100%.
- [ ] **I10** — Interactive product tour with real taps _(effort L · pri med)_
  - Upgrade ProfileCoachmarks from tap-blocking spotlights to a true interactive tour where the highlighted element is tappable and advances on action, with graceful skip.
- [ ] **I11** — Address autocomplete & postal validation for shipping _(effort M · pri med)_
  - Add address autocomplete + postal-code validation to the Location & shipping section so product-sendout campaigns ship reliably instead of failing on free-text errors.

### TikTok connection & stats trust

- [ ] **I12** — Silent background token refresh _(effort L · pri high)_
  - Use the stored refresh token via an edge function to re-mint access tokens before expiry so the app rarely force-routes creators to /connect-tiktok (verify refresh-token storage on backend).
- [ ] **I13** — Token-health surface with last-synced time + manual refresh _(effort M · pri med)_
  - Show 'connected • last synced 2h ago' with a 'Refresh stats' button and a proactive pre-expiry warning banner using tiktok_token_expires_at.
- [ ] **I14** — Imported-stats preview on the connect success screen _(effort M · pri med)_
  - After exchange succeeds, refetch and show the freshly imported avatar, handle and follower/like/video counts inline before Continue so the link feels real and verifiable.
- [ ] **I15** — Scope/permission explainer before launching OAuth _(effort S · pri med)_
  - Add a 'why we need this' section on the connect screen explaining each scope and that LikeLab never posts on the creator's behalf, raising approval rate.
- [ ] **I16** — Open-in-TikTok deep link for the verified profile _(effort S · pri low)_
  - Expose the imported tiktok_profile_url as an 'Open my TikTok' affordance (and on brand-facing views) to close the loop between connected identity and the real profile.

### Campaign discovery & marketplace

- [ ] **I17** — Real Discover search, working filters & best-match sort _(effort M · pri high)_
  - Merge of several ideas: replace inert category chips with title/brand search, sort (closing soon / newest / reward type) and real filters, plus a 'best match for you' rank by primaryCategory and follower tier; persist last-used sort.
- [ ] **I18** — Saved / bookmarked campaigns with a Saved shelf _(effort M · pri high)_
  - Add a bookmark toggle on the card and detail header backed by a per-creator saved list, with a Saved filter in Applications, recovering apps lost when creators hesitate.
- [ ] **I19** — 'Closing soon' urgency nudge + scheduled close reminders _(effort M · pri med)_
  - Show a 'closes in Xd' urgency state using existing endDate/daysRemaining and schedule a push N hours before a saved campaign closes.
- [ ] **I20** — Delightful 'Application submitted' confirmation with next-steps timeline _(effort S · pri med)_
  - Replace the brief 'Applied!' pill with an animated sheet explaining brand review -> acceptance -> deliverables and offering Browse more / View application.
- [ ] **I21** — Shared-element transition from card to detail hero _(effort M · pri low)_
  - Animate the warm-cached CampaignCard cover into the detail hero instead of FadeInDown for a native, premium feel on the most common navigation.

### Applications & invitations

- [ ] **I22** — Invitation expiry countdown with urgency states _(effort M · pri high)_
  - Surface a 'Respond by' countdown with color escalation on pending invitation cards and auto-move to Closed on expiry (verify/add expires_at on backend).
- [ ] **I23** — Brand 'why you were picked' note on invitations _(effort M · pri med)_
  - Let brands attach a short personalized message shown on the invitation card to lift accept rate and differentiate from generic mass invites.
- [ ] **I24** — Application status timeline per campaign _(effort M · pri med)_
  - Replace the single status pill with an Applied -> Under review -> Accepted/Closed stepper with timestamps to cut 'did they see it?' anxiety.
- [ ] **I25** — Live new-invitation badge + tappable toast via realtime _(effort M · pri med)_
  - Once campaign_invitations realtime is wired, show a live badge on the Applications entry and a deep-linking toast when a new invite arrives in-app.
- [ ] **I26** — Swipe-to-accept / swipe-to-decline on invitation cards _(effort M · pri med)_
  - Add swipe actions with confirm + haptic on pending invitation rows for one-gesture triage of multiple invites.
- [ ] **I27** — Withdraw a pending application from the card _(effort S · pri med)_
  - Add the missing client affordance to set the already-modeled 'withdrawn' status directly from the Applications card.

### Deliverables & video upload pipeline

- [ ] **I28** — Background / resumable video uploads with persisted queue _(effort L · pri high)_
  - Merge of 5 ideas: move compress->upload->poll off the VideoUploadRow component into a persisted queue keyed by deliverableId/submissionId with a sticky progress banner and auto-resume on reconnect, so backgrounding or flaky networks no longer lose or duplicate a 100-300MB upload.
- [ ] **I29** — Pre-submit brief/compliance checklist gating the Submit CTA _(effort M · pri high)_
  - Merge of 2: turn required hashtags, disclosure, key messages and things-to-avoid into a tappable checklist the creator must confirm before 'Submit TikTok link' unlocks, cutting brand revision cycles.
- [ ] **I30** — Two-way deliverable chat _(effort L · pri high)_
  - FeedbackChat is brand->creator read-only today (verified left-aligned bubbles); let the creator reply/ask on a specific submission so revision loops happen in-thread instead of going dark.
- [ ] **I31** — In-app trim + cover-frame / thumbnail picker before upload _(effort L · pri med)_
  - Merge of 2: let creators trim and scrub-pick a cover frame (expo-video-trim + existing expo-video-thumbnails) before upload, shrinking files and giving creative control over the feed/grid poster.
- [ ] **I32** — Smart TikTok-link paste assist _(effort M · pri med)_
  - In LinkSubmitRow, detect a TikTok URL on the clipboard with a one-tap paste chip and validate it matches the connected handle and isn't a duplicate before submitting.
- [ ] **I33** — One-tap 'Post to TikTok' share with prefilled caption/hashtags _(effort M · pri med)_
  - Extend copy-to-clipboard hashtags into a native share intent that opens TikTok with required hashtags/disclosure prefilled from the brief.
- [ ] **I34** — Per-deliverable status timeline / thread _(effort M · pri med)_
  - Combine submission events (uploaded, under review, approved, posted) with brand feedback into one chronological timeline per deliverable so the creator always sees what's next.
- [ ] **I35** — Go-live celebration + one-tap share _(effort S · pri med)_
  - When a submitted link is verified live, fire confetti and a share sheet prefilled with campaign hashtags plus a 'reward zone' status from the leaderboard RPC.

### Insights, leaderboard & performance

- [ ] **I36** — Persisted leaderboard & stats snapshots for true time-series _(effort L · pri high)_
  - Add a backend job snapshotting each creator's views/likes/rank per campaign on a cadence to power a real day-by-day chart and honest 'vs last week' trend instead of the current cross-campaign proxy (the code repeatedly notes no history exists).
- [ ] **I37** — Live per-video performance tracking _(effort M · pri high)_
  - After a link is submitted, periodically fetch and show views/likes/comments per deliverable inline in the Videos tab and profile grid (fetch-tiktok-stats already exists), with a sparkline and 'you passed the leader' nudge.
- [ ] **I38** — Drill-down to per-deliverable analytics _(effort M · pri med)_
  - Let a creator tap a campaign row to see each posted video's views, likes and engagement rate, so they learn which content actually works.
- [ ] **I39** — Engagement-rate + benchmark context _(effort M · pri med)_
  - Show likes/views as an engagement rate and contextualize each campaign against the median and the RPC's top_views ('your 4.1% is above the median').
- [ ] **I40** — Leaderboard rank deltas + overtake/milestone pushes _(effort M · pri med)_
  - Merge: show movement since last view and projected reward-zone status, and (with snapshots) push 'you moved up to #2' / 'overtaken' moments to re-engage creators.
- [ ] **I41** — Shareable rank / insight cards _(effort M · pri med)_
  - Merge: generate a branded image (rank, views, campaign) for one-tap share to TikTok/IG Stories on milestones like #1 or a view threshold.
- [ ] **I42** — Tie performance to reward-tier progress _(effort M · pri med)_
  - Link insights to tiers.tsx so views/rank visibly advance toward the next reward tier ('600 more views unlocks the next tier'), making analytics money-relevant.

### Notifications, inbox & reminders

- [ ] **I43** — In-app notification inbox / center _(effort M · pri high)_
  - Merge of 6 duplicates: mount the already-written NotificationsProvider/useNotifications (verified defined but never consumed) behind a bell in AppHeader with unread state, swipe-to-mark-read and tap-to-route via resolveNotificationRoute — mostly UI, biggest 'feels finished' win.
- [ ] **I44** — Per-category notification preferences synced to backend _(effort M · pri high)_
  - Merge of 2: a Settings panel with toggles (new campaigns, application updates, assignments/approvals, feedback, deadline reminders) persisted to a prefs table the edge functions respect, reducing blanket opt-outs.
- [ ] **I45** — Local deadline reminders + 'My week' deadline agenda _(effort M · pri high)_
  - Merge of 3: schedule offline-safe local notifications (24h/2h before) for filming/posting deadlines, cancel on submission, and aggregate all active collabs into one agenda card on Deliverables.
- [ ] **I46** — Notification actions / quick-reply via categories _(effort L · pri med)_
  - Register iOS/Android notification categories so a feedback push offers inline Reply and an assignment push offers 'View brief' from the lock screen.
- [ ] **I47** — Unified, self-healing app-icon badge _(effort M · pri med)_
  - Replace deliverables-only BadgeSync with badge = pending deliverables + unread feedback + unread inbox, recomputed on every AppState 'active' with shouldSetBadge:false so the server can't desync it.

### Referral & viral growth

- [ ] **I48** — Two-sided, visible incentive on the invite landing _(effort M · pri high)_
  - Surface what both sides get and show 'Invited by <name>' with avatar on signup when a pending code exists, materially lifting invite-to-signup conversion.
- [ ] **I49** — Push to the inviter when a friend joins _(effort M · pri med)_
  - When redeem-referral records a 'joined' transition, push the referrer ('your friend just joined via your code'), giving the silent referral system a visible payoff.
- [ ] **I50** — Tiered referral rewards beyond the single Connector badge _(effort M · pri med)_
  - Replace the one 3-friend milestone with a 3/10/25 ladder unlocking concrete perks, showing next tier + progress on the invite page.
- [ ] **I51** — Referral activity timeline (invited -> signed up -> joined) _(effort M · pri med)_
  - Show who was invited and where they are in the funnel with timestamps so creators can nudge friends who started but didn't finish.
- [ ] **I52** — Shareable invite story card / QR code _(effort L · pri med)_
  - Generate a branded image (handle + code + QR) for one-tap Share to Story plus an in-person QR, matching how this audience actually shares.
- [ ] **I53** — Approval moment as a shareable celebration _(effort S · pri med)_
  - Extend the approval confetti into a shareable 'I just joined LikeLab' card with a one-tap hook into the referral system, turning the highest-emotion moment into acquisition.
- [ ] **I54** — Per-channel attribution for share links _(effort M · pri low)_
  - Append a channel hint (whatsapp/imessage/instagram) to the referral link so the backend can attribute joins and the app can recommend the best channel.

### Creator value — profile, tiers & earnings

- [ ] **I55** — Shareable public media-kit / 'View as brand' preview _(effort L · pri high)_
  - Merge of 2: generate a link/QR-shareable creator media kit (avatar, tier, niches, TikTok stats, Work grid) plus an in-app 'preview as a brand sees you' mode, turning the profile into a marketing asset.
- [ ] **I56** — Make tiers grant real perks, not just cosmetics _(effort L · pri high)_
  - Wire the existing tier ladder to concrete unlocks (early campaign access, application priority, higher reward bands) with 'Unlocks at LVL X' messaging and backend gating.
- [ ] **I57** — Earnings & rewards dashboard with payout history _(effort M · pri high)_
  - Add a dedicated earnings view: per-campaign reward, status (pending/paid), lifetime totals and export — reward clarity is the top creator trust factor.
- [ ] **I58** — Creator-currency localization for rewards _(effort M · pri med)_
  - Format SEK-only rewards/payouts in the creator's currency (or an FX-aware secondary line) via Intl.NumberFormat keyed off their profile country as the brand expands across the Nordics/EU.

### Security, privacy & account control

- [ ] **I59** — Biometric app-lock (Face ID / Touch ID) _(effort M · pri med)_
  - Merge of 2: optional expo-local-authentication gate on app launch and/or Settings (which exposes shipping address + TikTok link), protecting the long-lived SecureStore session on an unlocked device.
- [ ] **I60** — Active sessions & device management with remote sign-out _(effort M · pri med)_
  - List active Supabase sessions/devices and let the user revoke any ('sign out everywhere'), giving a recovery path for lost/hijacked devices.
- [ ] **I61** — Recent account-activity log with new-device push alerts _(effort M · pri med)_
  - Record security events (sign-in, new device, TikTok reconnect, password change, deletion request) in-app with an optional push on new-device sign-in.
- [ ] **I62** — Privacy & connected-accounts dashboard with export/delete _(effort L · pri med)_
  - A screen showing granted TikTok scopes, last sync, one-tap disconnect (already exists) plus GDPR data export and clearer delete — strong for the EU/Swedish base.
- [ ] **I63** — PKCE-everywhere + nonce-bound deep links as the single auth pattern _(effort M · pri med)_
  - Standardize all web/OAuth entry on Supabase PKCE with a SecureStore nonce per deep link (mirroring the solid TikTok CSRF design) and retire implicit-token-in-URL handling. Verify backend supports the code-exchange flow.

### Reliability, offline & error handling

- [ ] **I64** — Offline mutation queue with auto-flush on reconnect _(effort L · pri high)_
  - Merge of several: persist failed write mutations (apply, submit-link, accept invite, mark-read) and resume them on reconnect with a 'pending sync' chip — today mutations still fire and silently fail offline while only queries pause.
- [ ] **I65** — Offline-first cached reads via a persisted React Query cache _(effort M · pri high)_
  - Add a React Query persister (AsyncStorage/MMKV) so last-known campaigns, deliverables and profile render instantly on cold start and offline, with a 'last updated' indicator, instead of blank states.
- [ ] **I66** — Crash & error telemetry wired into ErrorBoundary _(effort M · pri high)_
  - Merge of 2: ErrorBoundary.componentDidCatch is __DEV__ console-only (verified); add Sentry plus a global ErrorUtils + unhandled-rejection handler tagged with the Supabase user id, and a 'reset to home' boundary option.
- [ ] **I67** — Centralized error toast via QueryCache/MutationCache onError _(effort S · pri med)_
  - Wire onError in lib/query-client.ts to one consistent toast, replacing scattered one-off try/catch blocks with a uniform failure story.
- [ ] **I68** — Offline-aware inline action controls _(effort S · pri med)_
  - Beyond the top banner, disable Apply/Submit/Upload inline with a 'you're offline' helper when NetInfo reports no connection so taps don't silently fail.
- [ ] **I69** — Honest pending-state apply micro-interaction _(effort S · pri med)_
  - Replace the instant optimistic 'Applied!' on cards with spinner -> confirmed/failed driven by the real mutation result, with haptics per outcome.
- [ ] **I70** — In-app 'last updated' / freshness layer _(effort M · pri med)_
  - Add a last-updated timestamp + 'new since you left' badges driven by existing realtime + notification invalidation, removing the staleness ambiguity from refetchOnMount:false.

### Theming, accessibility & internationalization

- [ ] **I71** — True dark mode wired to the system scheme _(effort L · pri high)_
  - constants/theme.ts already defines a full dark palette but useColorScheme is unused app-wide (verified); add a ThemeProvider that swaps token sets by scheme + manual override and migrate components off hard-coded white/ink literals.
- [ ] **I72** — Adopt a real i18n layer (sv/en) with locale-aware formatting _(effort L · pri high)_
  - Introduce i18next with sv/en bundles, device-locale detection and an in-app switch, replacing ad-hoc toLocaleString/Date calls and fixing the current half-Swedish strings and date drift.
- [ ] **I73** — Universal-link share routes for campaigns & deliverables _(effort M · pri med)_
  - Extend app-link handling beyond /invite to /campaigns/[id] and deliverable/leaderboard routes so shared likelab.io links open in-app, backed by the branded not-found screen.
- [ ] **I74** — Dynamic Type & VoiceOver pass + in-app accessibility settings _(effort L · pri med)_
  - Audit screens for large-text reflow, label animated metrics, add a live-region toast, and add a settings panel for text size / reduce motion / high contrast the app actually honors.
- [ ] **I75** — Respect Reduce Motion globally with static fallbacks _(effort M · pri med)_
  - Gate the infinite loops (pulse, halo, shimmer, count-ups) behind reduce-motion with tasteful static equivalents and remove CampaignCard's ReduceMotion.Never override.
- [ ] **I76** — Localized, screen-reader-friendly relative time & dates _(effort S · pri med)_
  - Replace hand-rolled timeAgo/date helpers with Intl.RelativeTimeFormat/DateTimeFormat and pair short visible labels with full spoken accessibilityLabel dates.
- [ ] **I77** — App-icon quick actions / home-screen shortcuts _(effort S · pri low)_
  - Add long-press shortcuts (Upload a video, Discover campaigns, Invite a friend) routed through the existing allowlisted navigation resolver.
- [ ] **I78** — Haptic + motion design-system hook _(effort M · pri low)_
  - Centralize haptics.ts, springs.tsx and PressableScale into a small documented kit with per-surface feedback tokens so every tappable element feels identically crafted.
