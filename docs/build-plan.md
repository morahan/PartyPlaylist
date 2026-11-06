# Build plan

Read `product-spec.md` for *what* and `platform-research.md` for *why* before this.

## Decision 1: music provider and business model (blocks Phases 3–6)

Spotify's terms rule out the combination "paid app + controls Spotify playback", and
Development Mode caps the whole app at 5 users until we're a registered business with
250k MAU. Pick one direction:

| | A. Spotify playlist-builder | B. Licensed own-audio | C. Apple Music first |
|---|---|---|---|
| How it works | We run the party; the result is written to the host's Spotify playlist; people press play in Spotify | We stream/cache licensed tracks in our own player | MusicKit playback in-app |
| Charging | Possibly allowed (non-streaming). Confirm with Spotify in writing | Allowed (per license) | Gray area: only non-music features |
| Users | 5 total until 250k MAU + business | Unlimited | Unlimited (iOS first) |
| Offline audio | Via Spotify's own downloads | ✅ we control it | Apple Music library downloads |
| Beat-sync across phones | ❌ best-effort countdown only | ✅ ~20–40 ms achievable | ⚠️ online SharePlay only |
| Catalog | Full Spotify | Limited / costly | Full Apple Music |
| Cost / risk | Low build cost, high platform risk | High licensing cost | Medium; Android gap |

**Recommendation:** Build the provider-independent parts first (Phases 0–2 + 5).
They're needed in every direction. Run a **private beta on Spotify (A)** with ≤5 people
while you (a) email Spotify's partner team to confirm a playlist-only app can charge and
(b) price out a licensed catalog for (B). Decide before Phase 4.

## Target architecture

```
 Expo app (iOS/Android, dev build)        Backend (source of truth)
 ├─ core/partyQueue.js  ◄── shared ──►    ├─ core/partyQueue.js
 ├─ local SQLite cache + offline op log   ├─ Postgres: parties, members, songs, vetoes
 ├─ realtime client (WebSocket)  ◄──────► ├─ realtime party channel
 ├─ BLE / nearby peer sync (Phase 5)      ├─ music-provider adapter (Spotify first)
 └─ RevenueCat SDK (IAP)                  └─ entitlement webhook (RevenueCat)
```

- **App:** current Expo SDK with a development build. Expo Go isn't enough because
  BLE and low-level audio need native modules. TypeScript for the rewrite.
- **Backend:** Supabase (Postgres + auth + realtime) is the fastest route. A small
  Node/Fastify service is the alternative if you want full control. Provider tokens stay
  server-side, encrypted, never in URLs.
- **Payments:** Apple and Google require their own IAP for digital unlocks.
  RevenueCat maps purchases → `purchased` / `premium` flags that `seatLimit()` reads.
- **Offline-first:** every action (add, veto, join) is an op appended locally,
  applied optimistically with `core/`, then replayed to the server. The server's order
  wins on conflict.

## Phases

**0. Reset (≈1 day)**
- Rotate the Spotify client secret. The old one is in this public repo's history.
- Re-scaffold on the current Expo SDK (SDK 37 from 2020 won't run in today's Expo Go).
  Move `core/` in. Drop server deps (`express`, `cors`, `cookie-parser`, `nodemon`)
  from the app's `package.json`.
- CI runs `core` tests on every push.

**1. Accounts and backend (≈1 week)**
- Sign-in, with Spotify OAuth (Authorization Code + PKCE) for hosts.
- Party create / join via QR code or link; seat limit enforced server-side.

**2. Live party (≈1–2 weeks)**
- Search, add, live queue with round-robin order, veto with live vote counts.
- House-party mode: host device shows "now playing / up next".

**3. Provider output (≈1 week, depends on Decision 1)**
- Direction A: mirror `playOrder()` into the host's Spotify playlist on every change,
  plus an "Open in Spotify" deep link. Guests save/download it in Spotify for offline.

**4. Payments (≈1 week, depends on Decision 1)**
- RevenueCat products: host unlock (one-time), premium (monthly). Entitlement →
  `seatLimit()`.

**5. Offline (≈2 weeks)**
- SQLite cache, op log, reconnect replay. Peer-to-peer op sync over BLE when no
  internet (cross-platform BLE; Apple Multipeer is iOS-only).

**6. Synchronized playback (spike first, ≈2–4 weeks, only meaningful for direction B)**
- NTP-style clock sync over BLE, scheduled start, periodic drift correction,
  per-headset latency calibration screen ("tap when you hear the click").

## Open questions for you

1. **Price:** is the host unlock **$599** or **$5.99**?
2. **Two purchasers → 20 seats:** if two *non-premium* purchasers are in one party,
   should they get 20 seats, or 10 (5 each)? Do both have to be present, or only own the
   app?
3. **Veto voters:** should the submitter count toward the 50%? (In a 2-person party
   that decides whether one person can veto the other's song alone.) Can the playing
   song be vetoed?
4. **Who decides "finalize"?** Host only, or a vote?
5. **Direction (Decision 1):** A, B or C? In particular, is a paid model a must-have,
   or would you launch free and add payments later?
6. **Platforms:** iOS + Android at launch, or iOS first?
7. **Do you have a registered business entity?** It's needed for Spotify Extended Quota
   and makes App Store payouts and licensing simpler.
8. **Should the Spotify Jam overlap concern you?** Our edge is fair rotation, veto,
   and offline/sync. Is that the pitch?
