# Kodgranskningsrapport — likelab-app

**Hälsoläge:** 2 HIGH (1 security, 1 data-loss) · 5 MEDIUM · 14 LOW. Inga rena blockers, men TikTok-CSRF och tappad appeal bör fixas före release.

---

## HIGH — fixa först

### 1. TikTok-deep-link saknar CSRF state-validering (account injection)
`features/auth/tiktok.ts:92-120` + `app/auth/tiktok/callback.tsx`
- **Impact:** `exchangeTikTokCode()` tar bara `{code, redirectUri}` och POSTar koden med den inloggade användarens session-token. `state` valideras enbart inuti `authorizeTikTok()`, aldrig på deep-link-vägen. En inloggad offer som öppnar `likelabapp:///auth/tiktok/callback?code=<attacker_code>` binder angriparens TikTok-konto (open_id, tokens, handle, stats) till offrets `creator_profiles`. Vägen körs även som normal fallback när native-sessionen avbryts.
- **Fix:** Generera `state`, persistera i SecureStore innan auth-sessionen öppnas, läs `state`-param i `callback.tsx` och skicka in den; avvisa exchange (klient eller edge function) om `state` inte matchar.

### 2. Appeal tappas tyst men visas som inskickad vid DB-fel
`features/profile/ui/ProfilePendingGate.tsx:45-57`
- **Impact:** `submitAppeal()` kollar inte `error` från Supabase-`update` (RLS-deny / saknad kolumn / 0 rader returneras som `{error}`, inte throw), och `finally` kör alltid `setAppealStep('confirm')`. Avvisad creator ser "Appeal Submitted" trots att inget sparats — deras enda väg tillbaka tappas tyst. Om kolumnerna/RLS saknas på Live failar *varje* appeal.
- **Fix:** `const { error } = await supabase...`; vid error/exception: stanna på `'reason'`, rensa `submitting`, visa Alert. Flytta `setAppealStep('confirm')` ut ur `finally` till success-vägen.

---

## MEDIUM

### 3. Icke-creator hamnar kort i creator-flikarna före utloggning
`app/login.tsx:42-44, 54-71`
- **Impact:** Render-guarden redirectar in i `(tabs)` så snart `session` blir truthy, *innan* `assertCreatorRole()` hinner logga ut ett brand-konto. Användaren landar på creator-skärmar (som triggar creator-queries) tills DB-koll bouncar tillbaka; "Access denied"-alert kommer efter navigeringen.
- **Fix:** Håll `loading=true` tills rollen verifierats, eller spåra `roleVerified`-state och håll tillbaka `<Redirect>` tills creator-roll bekräftats.

### 4. Push-tap på terminerad app deep-linkar aldrig
`app/_layout.tsx:165-191`
- **Impact:** Tap-hantering sker enbart via `addNotificationResponseReceivedListener`, som inte får cold-start-tappet. Ingen `getLastNotificationResponseAsync()`/`useLastNotificationResponse()` finns någonstans (grep-verifierat). Tap på `application_accepted`/`deliverable_assigned`/`feedback_added` från dödad app öppnar default-fliken — `resolveNotificationRoute()` + cache-invalidering körs aldrig.
- **Fix:** Läs `getLastNotificationResponseAsync()` vid mount, kör samma resolve/invalidate/push när `userId` finns. Dedupa mot live-listener via response-id.

### 5. Utgångna kampanjer visar "1d left" och behåller Apply-knapp
`features/shared/ui/CampaignCard.tsx:31-36, 38-40, 161, 246`
- **Impact:** `daysRemaining()` klampar förfluten `endDate` till 0, och båda render-sites visar `0 → 1`, så stängd kampanj visar "1d left". `canApply()` ignorerar `endDate`, så grön OPEN-pill + "Apply now" visas på stängd kampanj.
- **Fix:** Returnera sentinel (−1/'closed') för förflutna datum, rendera "Closed", och exkludera utgångna från `canApply()`/Apply-CTA.

### 6. "Preferred creators"-blocket i briefen är permanent dött
`features/campaigns/api.ts:61-95`
- **Impact:** `mapCampaign()` läser aldrig in `preferredCreators` från någon DB-kolumn, så `CampaignBriefModal.tsx:40`-gaten är alltid falsk. Creators ser aldrig den sektionen även när brandet fyllt i den på webben.
- **Fix:** Lägg `preferredCreators: textValue(row, ['preferred_creators'])` i `mapCampaign` (verifiera kolumnnamnet på Live).

### 7. FloatingTabBar göms vid första scroll på återbesökt flik
`features/navigation/FloatingTabBarVisibility.tsx:35-44, 56-63`
- **Impact:** `resetScrollTracking()` sätter `lastYRef=0` vid varje focus, men `MaterialTopTabs` (`lazy:false`) bevarar scroll-offset. Återbesök på flik scrollad till y=500 ger första delta ≈ +500 → baren göms (och riktning inverteras: uppåt-scroll göms när den borde visas).
- **Fix:** Seeda `lastYRef` med live `contentOffset.y` vid reset, eller prima/skippa första `reportScroll` efter reset.

---

## LOW — grupperat per område

**Tysta fel / oäkta success-states**
- `app/forgot-password.tsx:32-47` (+ `reset-password.tsx:82-94`): try/finally utan catch — transport-fel re-aktiverar knappen utan feedback. Lägg `catch` med Alert.
- `app/campaigns/[id].tsx:352-358`: leaderboard hämtas en gång (useEffect på enbart `campaignId`), `{data}` ignorerar `error`, `.catch(()=>{})` sväljer. Refetcha i `useFocusEffect`/`useQuery` och hantera error.
- `features/profile/ui/ProfileOverview.tsx:375`: `Linking.openURL(item.url)` utan `.catch()` → unhandled rejection på `tel:`/`mailto:` utan app. Lägg `.catch(()=>undefined)`.

**Video-pipeline: oändlig "Processing…" (samma rotorsak, två filer)**
- `features/deliverables/hooks.ts:177-183` + `features/shared/ui/VideoUploadRow.tsx:37-43, 82-109`: poll stannar efter `timeoutMs` medan status fortf. `processing`; `isBusy` fastnar true → evig spinner utan retry när backend-processorn dör tyst. Exponera `isTimedOut`-flagga och låt `VideoUploadRow` falla till failed/"Try again".
- `features/deliverables/api.ts:349-355`: `getSubmissionById` använder `.single()` → kastar om raden raderas mid-poll; react-query behåller `processing` och återhämtar sig aldrig. Byt till `.maybeSingle()` → null (matchar `getLatestSubmission`).

**Toast id-kollision (dubbel rapport, en rotorsak)**
- `features/shared/ui/Toast.tsx:19, 79`: `id: Date.now()` → två toasts samma ms får samma id, `dismiss()` tar bort båda + dubbla React-keys. Byt till monoton räknare (`++nextId`).

**Onboarding/coachmark-UX**
- `features/onboarding/ProfileCoachmarks.tsx:71-127`: omemoiserad `coachSteps` i effect-deps → spotlight blinkar/re-scrollar vid varje profil-re-render. `useMemo` på `coachSteps` eller läs via ref och ta bort `steps` ur deps.
- `features/onboarding/WelcomePendingOverlay.tsx:13, 45-54`: modul-level `sessionShown` läcker mellan konton — pending B i samma process ser aldrig overlay. Nyckla per `userId` som `TutorialOverlay`.
- `features/onboarding/CreatorPendingGate.tsx:92-100`: creator-appeal postar `profile.id` som `brand_id` och e-post i `brand_name` till `book-meeting` (brand-endpoint). Verifiera att ingen brand-FK finns, annars dedikerad endpoint/fält.

**Profil-completion-inkonsistens**
- `features/profile/api.ts:45-53`: `completionPercentage()` (8 nycklar inkl. `phone`) krockar med `getProfileCompletion()` (7 nycklar, utan `phone`). Färdig creator utan telefon fastnar på 88% och får aldrig "Verifierad creator"-badge (`ProfileHero.tsx:90, 241-244`). Härled procenten från samma källa; bestäm en gång om `phone` krävs.

**Profil-inställningar**
- `features/profile/ui/SelectPopover.tsx:68-69, 115-119`: `query` rensas bara vid val, inte vid dismiss → popover öppnar förfiltrerad. `useEffect(() => { if (!open) setQuery('') }, [open])`.
- `features/profile/location-data.ts:221-222`: dubbla `'+1'` (US/CA) → Kanada-val visar US-flagga. Slå ihop eller ge unika värden.

**Auth-edge / navigation**
- `features/auth/TikTokAuthGuard.tsx:38-61`: monterad utanför auth-gate → kan pusha utloggad användare till `/connect-tiktok` vid stale TikTok-error-query. Gate på session/route.

**UI-detaljer**
- `app/campaigns/[id].tsx:572, 808`: Videos-badge räknas från `campaignDeliverables` men listan renderar `visibleDeliverables` → "0/N" medan kort visas. Räkna badge från `visibleDeliverables.length`.
- `app/leaderboard/[id].tsx:64-66, 136-160`: orankad creator (rank 0/null) renderar "#0 / 0th of N". Gate kortet på `position && myRank > 0`.
- `app/applications.tsx:377`: delad `isPending`-flagga avaktiverar Accept/Decline på *alla* invitations under en mutation. Scope:a på `mutation.variables`-id.
- `app/insights.tsx:341-351`: osäkrad `new Date(createdAt)` (kan vara `''`) → NaN-sortering → fel trend-badge. Guarda som `new Date(s || 0)`.
- `app/signup.tsx:282, 304`: `'redesign.color.bg'`/`'redesign.color.hairlineStrong'` som strängliteraler → transparent panel + svart border på review-skärmen. Ta bort citationstecknen.
- `features/shared/ui/AppHeader.tsx:23, 28-37`: easter-egg-timers (1s + 5.5s) rensas aldrig på unmount. Lägg `useEffect`-cleanup (ej crash i React 18, bara läckage).

**Double-submit**
- `features/shared/ui/CampaignCard.tsx:73-86, 270-313`: `handleApply()` saknar guard, `showApply` härleds bara från props → snabb dubbeltapp kan fyra `onApply()` två gånger (duplikat-application beroende av om backend har UNIQUE-constraint). Lägg `disabled={applyState !== 'idle'}` + early-return.

---

**Notering:** Flera MEDIUM/HIGH är beroende av Live-backend (RLS/kolumner på `creator_profiles`, UNIQUE på `applications`, `preferred_creators`-kolumnnamn, `book-meeting`-kontrakt, `exchange-tiktok-code` state-validering). Verifiera dessa mot Live innan/parallellt med klientfixarna.
