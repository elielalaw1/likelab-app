# Video-feedback från brand → kreatör — Backend-kontrakt & plan

**Status:** Backend live på **Test + Live**. Mobil-spåret (läs-/badge-UI) **byggt** — typecheckar rent, väntar verifiering mot riktig brand-feedback.
**Omfattning v1:** Enkelriktad, strukturerad feedback. Brand lämnar en eller flera kommentarer på en uppladdad video. Kreatören läser feedbacken i mobilappen och laddar upp en ny version. Ingen chatt/svar tillbaka i v1.
**Granularitet:** Feedback kopplas till en specifik **submission** (video-version), inte bara till deliverable. Gammal feedback stannar kvar på den gamla videon.

---

## 1. Rollfördelning

| Del | Var den byggs | Ansvar |
|---|---|---|
| Brand skriver feedback (UI) | Webb-SPA (likelab.io) | **Lovable** |
| DB-schema, RLS, trigger | Supabase (Test → Live) | **Lovable / SQL** |
| Notis vid ny feedback | Edge Function / DB-trigger | **Lovable** |
| Kreatör läser feedback (UI) | Expo-appen (detta repo) | **Mobil-teamet** |

> Mobilsidan kan börja byggas mot kontraktet nedan så fort tabell + RLS finns på **Test**. Verifiera alltid att schema + funktioner är **published till Live** innan release.

---

## 2. Datamodell (NY tabell — som levererad på Test)

```sql
create table public.deliverable_feedback (
  id              uuid primary key default gen_random_uuid(),
  deliverable_id  uuid not null references public.deliverables(id) on delete cascade,
  submission_id   uuid references public.deliverable_submissions(id) on delete cascade,  -- NULLABLE
  author_id       uuid references auth.users(id),               -- null för system-rader
  author_role     text not null,                                -- 'brand' | 'system' | 'admin' (bekräfta enum)
  kind            text not null default 'comment'
                    check (kind in ('comment','revision_request','approval_note')),
  body            text not null,
  read_at         timestamptz,                                   -- sätts av kreatören vid läsning
  -- denormaliserat för realtime-filter (auto-fyllt av guard-trigger):
  campaign_id     uuid not null,
  creator_id      uuid not null,
  brand_id        uuid not null,
  created_at      timestamptz not null default now()
);
```

**Designval (levererat):**
- `submission_id` är **nullable** → feedback kan vara versionskopplad (följer en specifik video) *eller* deliverable-bred. Mobilen måste hantera båda: filtrera per `submission_id` när satt, annars visa som allmän deliverable-feedback.
- `author_role` skiljer brand-feedback från `'system'` (backfillade legacy-rader) och `'admin'`. UI:t döljer avsändar-namn på system-rader.
- Denorm `campaign_id` / `creator_id` / `brand_id` fylls av guard-trigger → realtime-filter på `creator_id` precis som `useDeliverableRealtime.ts`.
- `read_at` per rad → olästa-badge + markera-läst.

**Triggers (levererat):**
- **Guard-trigger:** (a) auto-fyller denorm-fälten från deliverable/campaign, (b) verifierar att `submission_id` tillhör samma deliverable, (c) hindrar kreatörer från att mutera annat än `read_at`.
- **INSERT-trigger:** skapar `notifications`-rad (`type='feedback_added'`) + push via `send-push-notification`. **Hoppar över `author_role='system'`-rader** (ingen retro-spam).

**Migrering av `flag_reason` (levererat):**
Varje deliverable med `flag_reason` har fått en feedback-rad med `author_role='system'`, kopplad till senaste submission om sådan finns. `deliverables.flag_reason`-kolumnen lämnas kvar (icke-destruktivt) — kan droppas i senare migrationssteg när all kod migrerats bort från den.

---

## 3. RLS-policies

```sql
alter table public.deliverable_feedback enable row level security;

-- Kreatör får läsa feedback på sina egna deliverables
create policy "creator reads own feedback"
on public.deliverable_feedback for select
using (
  exists (
    select 1 from public.deliverables d
    where d.id = deliverable_feedback.deliverable_id
      and d.creator_id = auth.uid()
  )
);

-- Kreatör får uppdatera read_at (men inget annat) på sin egen feedback
create policy "creator marks feedback read"
on public.deliverable_feedback for update
using ( /* samma creator-check som ovan */ )
with check ( /* samma */ );

-- Brand (kopplad till kampanjen) får skapa + läsa feedback
create policy "brand writes feedback"
on public.deliverable_feedback for insert
with check ( /* author_id = auth.uid() AND brand äger kampanjen som deliverablen tillhör */ );
```

> Exakt brand↔kampanj-ägarskap följer samma mönster som befintliga RLS på `deliverables`. Lovable matchar mot hur det redan görs där.
>
> **Viktigt:** Kreatörens UPDATE-policy får bara tillåta ändring av `read_at` — inte `body`/`kind`. Lås detta med en kolumn-grdad trigger eller `with check`.

---

## 4. Realtime

Aktivera realtime-publicering på `deliverable_feedback` (samma sätt som `deliverables` och `notifications` redan är aktiverade på Live).

Mobilen prenumererar på:
```
postgres_changes  event=INSERT  table=deliverable_feedback
filter: deliverable_id in (kreatörens deliverables)
```
RLS filtrerar redan bort andras rader, men en explicit filter-strategi behövs eftersom `creator_id` inte finns direkt på feedback-raden. **Två alternativ — välj ett:**
- **A (rekommenderas):** Lägg till en denormaliserad `creator_id uuid` på `deliverable_feedback` (sätts av trigger vid insert från deliverablen). Då kan mobilen filtrera `creator_id=eq.<uid>` precis som `useDeliverableRealtime` gör idag.
- **B:** Prenumerera brett och förlita sig på RLS + cache-invalidering. Enklare men mer "noisy".

> Gå med **A** för symmetri med befintlig `useDeliverableRealtime.ts`.

---

## 5. Notiser

Vid ny feedback-rad (`kind in ('comment','revision_request')`) ska en rad skapas i `notifications`:

```json
{
  "user_id":  "<kreatörens user_id>",
  "type":     "feedback_added",
  "title":    "New feedback on your video",
  "message":  "<brand-namn> left feedback on <kampanjnamn>",
  "link":     "likelab://campaigns/<deliverable.campaign_id>?tab=videos&deliverable=<deliverable_id>",
  "read":     false
}
```

Implementeras som **DB-trigger** på `deliverable_feedback` (eller i Edge Function om brand-skrivning går via en sådan). `type='feedback_added'` är en ny typ — mobilen mappar den till rätt deep link.

---

## 6. API-kontrakt mot mobilen (läsning)

Mobilen behöver kunna:

1. **Hämta feedback för en deliverable** (alla versioner, nyast först):
   `select * from deliverable_feedback where deliverable_id = :id order by created_at desc`
2. **Hämta antal olästa** per deliverable (för badge):
   `count(*) where deliverable_id = :id and read_at is null`
3. **Markera som läst**:
   `update deliverable_feedback set read_at = now() where id = :id` (RLS tillåter bara read_at)

Inga nya Edge Functions krävs för kreatörens läs-flöde — direkta Supabase-queries räcker.

---

## 7. Mobil-arbete (detta repo) — BYGGT ✅

| # | Fil | Ändring | Status |
|---|---|---|---|
| 1 | `features/core/types.ts` | `DeliverableFeedback` + `FeedbackKind`/`FeedbackAuthorRole` + `mapFeedbackRow`. | ✅ |
| 2 | `features/deliverables/api.ts` | `getDeliverableFeedback`, `getUnreadFeedbackCounts`, `markFeedbackRead`. | ✅ |
| 3 | `features/deliverables/hooks.ts` | `useDeliverableFeedback`, `useUnreadFeedbackCounts`, `useMarkFeedbackRead`. | ✅ |
| 4 | `features/shared/hooks/useDeliverableRealtime.ts` | Subscription på `deliverable_feedback` (filter `creator_id`). | ✅ |
| 5 | `features/deliverables/ui/FeedbackThread.tsx` | **Ny komponent** — feedback-lista per deliverable, auto-mark-read, `fallbackReason` för legacy. | ✅ |
| 6 | `app/campaigns/[id].tsx` | Renderar `<FeedbackThread>` i alla stages; gamla `flagReason`-boxen borttagen. | ✅ |
| 7 | `app/(tabs)/deliverables.tsx` | "N new feedback"-badge på action-korten. | ✅ |
| 8 | `app/_layout.tsx` | `feedback_added` → routing till video-tabben + cache-invalidering (foreground + tap). | ✅ |

**Designval i mobilen:**
- `FeedbackThread` visas i *alla* stages (inte bara revision) så att `comment`/`approval_note` också syns.
- Auto-mark-read när tråden är på skärmen; `markedRef` hindrar dubbel-mutation.
- `author_role='system'` renderas utan avsändarnamn (legacy-rader).
- Badge i Projects-listan täcker **needs-action**-kampanjer (revision_request hamnar där). Feedback på redan godkända/inskickade videos syns i tråden när man öppnar kampanjen, men får ingen list-badge i v1.

---

## 8. Leveransordning

1. **Lovable:** tabell + RLS + realtime + trigger/notis på **Test**. Backfill `flagReason`.
2. **Mobil:** bygg läs-/badge-UI mot Test. Behåll `flagReason`-fallback tills backfill är verifierad.
3. **Lovable:** brand-UI för att skriva feedback på webben.
4. **Verifiera på Test → publish till Live.** Bekräfta att SQL/trigger körts mot **Live** (xaugfjhocfchhixkfguq), inte bara Test.
5. Release mobil.

---

## 9. Öppna frågor — BESVARADE

- **Brand↔kampanj-ägarskap:** direkt 1:1 via `campaigns.brand_id = auth.uid()`. Inga team/org-tabeller. `deliverable_feedback` följer samma EXISTS-join. **Mobilens realtime-filter använder denorm `creator_id` (för kreatören); per-kampanj/brand-frågor matchar `campaigns.brand_id`.**
- **Synlighet:** RLS låter brand se feedback för *alla* submissions i kampanjen; filtrering per `submission_id` görs i UI. Tabellen har både `deliverable_id` + nullable `submission_id` → mobilen kan fråga per-version eller per-deliverable.
- **Legacy `flag_reason`:** backfillat som `author_role='system'`-rader (se §2). Notistriggern hoppar över system-rader. Kolumnen behålls icke-destruktivt.

## 10. Kvarstående att bekräfta

- Exakt enum-värden för `author_role` (minst `'brand'`, `'system'` — finns `'admin'`/`'creator'`?).
- Ska `approvalStatus='rejected'` sättas atomiskt med en `kind='revision_request'`-rad när brand begär ändring? (Påverkar om mobilen kan lita på `kind` ensamt eller måste korsläsa `approvalStatus`.)
