# Product spec: Party Playlist

Status: **draft**, updated 2026-11-06 with the owner's answers. Freio Labs, LLC.

## Purpose
Let a group of friends build one live playlist together, fairly and democratically,
from whatever music service each person uses, then listen together, even with no
connectivity (e.g. on a chairlift).

## Roles and pricing
- **App:** free download (iOS + Android, React Native / Expo).
- **Host:** the only role that can start a party. Needs the **$5.99 one-time unlock**
  or **Premium at $10.99/month**.
- **Guest:** free. Joins a party that's already running (QR code / link / nearby),
  adds songs, votes.

## Core rules (implemented in `src/core/partyQueue.ts`)
1. **Fair rotation.** Songs play round-robin by join order: A, B, C, A, B, C…
   A member with nothing queued is skipped. Rotation continues from whoever played
   last; a late joiner gets a turn when the rotation reaches them.
2. **Democratic veto.** Each member can veto a pending song once. At **≥ 50% of
   current members** (the submitter counts as a member) the song is removed. The
   submitter's next song still plays at their next turn.
3. **Seats.**
   - Host unlock → up to **5** members.
   - Any Premium member, *or* **2+ purchasers** in the party → up to **20**.
4. **Going live.** The party goes live once **3 songs** are queued, and stays live.
5. **Finalizing.** Once live, members vote to finalize. At ≥ 50% the playlist locks
   (no more adds or vetoes) and becomes downloadable.

## Platform-agnostic contributions
Each person adds songs from their own service: Spotify, Apple Music, TIDAL, YouTube
Music or Suno. A song is stored as a **canonical track** (ISRC + title, artist,
duration) and matched to each listener's service. Songs that don't exist on a
listener's service (e.g. Suno originals) open in their source app instead. What each
service actually allows is in `platform-research.md`; it isn't uniform.

## Modes
- **House party (single source):** one device plays from the host's service, and
  everyone else adds and votes live.
- **Group listen (multi-source):** finalize, everyone gets the playlist on their own
  service and downloads it there for offline, then playback is synchronized across
  phones.

## Synchronized playback (implemented math in `src/core/sync.ts`)
Goal **< 100 ms** apart. Anything up to a couple of seconds still beats no sync.
Sync must never get in the way of the fun.

1. **Automatic (always on, no effort).** Phones agree on a shared clock: against our
   server when online, phone-to-phone over Bluetooth when offline. Each person
   presses play on a **rhythmic count-in** ("3 · 2 · 1 · ▶"). Pressing on an
   anticipated beat is much more precise than reacting to a beep. Expected: a few
   hundred ms, depending on how fast each music app starts.
2. **Optional tap alignment (5–10 s max, never required).** Offered only when the
   estimated error is **> 2 s**, or when someone taps "Sounds off?". Everyone taps
   along to the beat they hear for a few seconds, and the app computes who's ahead.
   Taps measure what each person actually *hears*, so they automatically account for
   Bluetooth headphone delay and for different services' versions of a track starting
   at slightly different points.
3. **Pause-only corrections.** Whoever is ahead pauses for the difference and
   resumes on a count-in. We never seek or control another company's player, which
   keeps us a non-streaming app under Spotify's terms.

How we detect "> 2 s off" automatically depends on the platform: Android can read
other apps' playback position (with notification-access permission), and iOS can
only read Apple Music's. Otherwise we rely on the "Sounds off?" button.

## Offline behavior
- Queue, metadata and cover art are cached on device. Adds and votes made offline are
  queued and replayed when back online, or synced phone-to-phone over Bluetooth.
- Offline *audio* is each service's own download feature (e.g. Spotify Premium,
  Apple Music library downloads). We never download licensed audio ourselves.
