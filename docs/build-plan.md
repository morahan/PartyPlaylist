# Build plan

Read `product-spec.md` for *what* and `platform-research.md` for *why* first.

## Decisions so far (2026-11-06)
- React Native (Expo SDK 58, TypeScript), iOS + Android.
- Free app; $5.99 host unlock; $10.99/mo Premium. Freio Labs, LLC is the seller.
- Platform-agnostic songs (canonical track + ISRC). We never play or control
  licensed audio, so we stay a "non-streaming" app.
- Sync: automatic shared clock + count-in by default; optional tap alignment
  (≤ 10 s) only when > 2 s off or on request; pause-only corrections.
- Launch export targets: **Apple Music + YouTube Music**. Spotify users listen via
  the host device until Spotify approves us.
- Backend: **Supabase**, project named **PartyPlaylist** (`supabase/`).

## Target architecture

```
 Expo app (dev build)                       Backend (source of truth)
 ├─ src/core/partyQueue.ts  ◄── shared ──►  ├─ same core rules
 ├─ src/core/sync.ts                        ├─ Postgres: parties, members, songs, votes
 ├─ SQLite cache + offline op log           ├─ realtime party channel (WebSocket)
 ├─ realtime client  ◄────────────────────► ├─ time endpoint (clock sync)
 ├─ BLE peer link (offline ops + clock)     ├─ catalog: neutral search + ISRC matching
 ├─ provider adapters (export, link parse)  ├─ provider adapters (tokens server-side)
 └─ RevenueCat SDK (IAP)                    └─ RevenueCat webhook → entitlements
```

- **Backend:** Supabase (Postgres + auth + realtime). The schema in
  `supabase/migrations/` enforces seats, veto quorum, go-live and finalize in the
  database, with row-level security so only members see a party. Its tests run in
  PGlite (Postgres in WebAssembly), so no Docker is needed.
- **Payments:** Apple and Google require their own in-app purchase for digital
  unlocks. RevenueCat maps purchases → `purchased` / `premium`, which `seatLimit()`
  reads.
- **Offline-first:** every action is an op applied locally with `src/core`, then
  replayed to the server; the server's order wins on conflict.

## Phases

**0. Reset ✅**
Expo SDK 58 + TypeScript scaffold, core rules and sync math with tests,
lint/typecheck/test hooks and CI.

**1. Accounts, backend, navigation (≈1 week)**
Expo Router, sign-in, party create/join via QR code or link, seat limit enforced
server-side.

**2. Live party (≈1–2 weeks)**
Neutral search + paste-a-link from any service; live queue in round-robin order;
veto and finalize votes with live counts; "live at 3 songs".

**3. Payments (≈1 week)**
RevenueCat products for the host unlock and Premium; entitlement → `seatLimit()`.

**4. Provider export (≈1–2 weeks, per provider)**
Apple Music and YouTube first (see the research doc for why), then Spotify / TIDAL
once agreements or quota allow. House-party mode keeps the host's playlist in sync
with `playOrder()`.

**5. Offline (≈2 weeks)**
SQLite cache, op log, reconnect replay; Bluetooth LE peer sync for ops and clock
(cross-platform; Apple's Multipeer is iOS-only).

**6. Synchronized playback (≈2–3 weeks)**
Clock sync (server + BLE), count-in screen with haptics, "Sounds off?" → 5–10 s tap
alignment, pause-only correction cues, automatic drift detection where the platform
exposes playback position.

## Testing
- `just t`: lint + tests related to uncommitted changes (pre-commit runs this on
  staged files).
- `just ta`: lint everything, typecheck, all tests (pre-push and CI run this).
- `just setup`: install deps and enable the git hooks.

## Supabase project
- **Project:** PartyPlaylist (`uqlxzstbllzyosggbpca`), org **Freio Labs**
  (freiolabs@gmail.com), region `us-east-1`, Free plan.
- **Dashboard:** https://supabase.com/dashboard/project/uqlxzstbllzyosggbpca
- **API URL:** https://uqlxzstbllzyosggbpca.supabase.co. The app reads it plus the
  publishable key from `.env.local` (see `.env.example`).
- **Apply new migrations:** `just db-push` (needs `npx supabase login` as
  freiolabs@gmail.com, or `SUPABASE_ACCESS_TOKEN`).
- Free projects pause after 7 days without activity; upgrade to Pro before launch.

## Open questions
1. Send the outreach drafts in `docs/outreach/` (needs the Gmail connector
   authorized for FreioLabs@gmail.com).
