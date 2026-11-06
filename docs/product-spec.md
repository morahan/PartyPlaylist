# Product spec: Party Playlist

Status: **draft**. Items marked ❓ are open questions (see `build-plan.md`).

## Purpose
Let a group of friends build one live playlist together, fairly and democratically,
then listen to it together, even with no connectivity (e.g. on a chairlift).

## Roles
- **Host**: the only role that can start a party. Must hold a purchase or premium
  entitlement.
- **Guest**: free download. Joins by invite (QR code / link / nearby), adds songs,
  votes.

## Core rules (implemented in `core/partyQueue.js`)
1. **Fair rotation.** Songs play round-robin by member join order: A, B, C, A, B, C…
   A member with nothing queued is skipped. Rotation continues from whoever played
   last, so a late joiner gets a turn when the rotation reaches them.
2. **Democratic veto.** Any member can veto any pending song once. When vetoes reach
   **≥ 50% of current members**, the song is removed. The submitter's own song
   doesn't lose them a turn; their next song plays at their next turn.
   - ❓ Does the submitter count as a voter? Currently yes, so in a 2-person party a
     single veto removes the other person's song.
   - ❓ Can the currently-playing song be vetoed (skip)?
3. **Seats.**
   - Host purchase → up to **5** members.
   - Host premium subscription, *or* ≥ **2** purchasers in the party → up to **20**.

## Modes
- **House party (single source):** one device plays; everyone else adds and votes live.
- **Group listen (multi-source):** finalize the playlist, everyone downloads it, and
  playback is synchronized across phones/headphones, offline if needed.

## Offline behavior
- Queue view, metadata and cover art are cached on device.
- Adds and votes made offline are queued locally and synced when back online, or
  peer-to-peer when devices are near each other (❓ phase).
- Offline *audio* depends on the music provider (see `platform-research.md`).

## Pricing (❓ to confirm)
- App: free download.
- Host unlock (one-time): **$599 as written**, which may be a typo for **$5.99** ❓
- Premium: **$10.99 / month** → 20 seats.
- ⚠️ Spotify and Apple Music terms both restrict charging for apps that play their
  music. See `platform-research.md`.
