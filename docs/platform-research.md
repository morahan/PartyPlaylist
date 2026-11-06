# Music platform research

Researched 2026-11-06. Platform terms change often, so re-check them before each
milestone. Quotes are from the official pages linked under each section.

## TL;DR

| Requirement | Spotify | Apple Music (MusicKit) |
|---|---|---|
| Collaborative queue + round-robin + veto | ✅ Our server owns the logic, Spotify only holds the result | ✅ Same |
| Charge money ($ purchase / subscription) | ❌ Banned for any app that plays or controls playback ("Streaming SDA"). Possibly allowed for a playlist-only app | ❌ Can't charge for or "indirectly monetize" access to Apple Music |
| More than 5 users | ❌ Development Mode caps an app at 5 users total. Lifting the cap needs a registered business with **≥250k MAU** | ✅ No user cap (Apple Developer Program) |
| Offline listening | ⚠️ Only inside the Spotify app (Premium download). We can't download audio ourselves | ⚠️ Only Apple Music library downloads. Downloading MusicKit content in-app is banned |
| Beat-accurate sync across phones | ❌ Not achievable: no low-level playback control, and the player API needs internet | ⚠️ SharePlay syncs playback over a network. No offline sync |
| Single-device house party | ✅ Host plays the playlist in Spotify (user-initiated) | ✅ |

**Bottom line: the product as specified (paid app + Spotify + offline beat-synced
playback) can't be built on Spotify within its terms.** The plan offers three
directions, each giving up something different. See `build-plan.md` → "Decision 1".

## Spotify details

Sources: [Developer Policy](https://developer.spotify.com/policy),
[Developer Terms](https://developer.spotify.com/terms),
[Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes),
[Feb 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide),
[July 2026 quota update](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates),
[TechCrunch, Feb 2026](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/).

### Monetization (biggest blocker)
- A **Streaming SDA** is any app that enables playback, "including using the Spotify
  Platform to control a background Spotify application" (Terms §II). Starting playback,
  queueing or skipping through `/me/player/*` all count.
- Policy §IV.2 bans "the sale … of a Streaming SDA" and "any e-commerce (e.g., in-app
  payment or monetization) initiated via a Streaming SDA", as well as ads on it.
- Policy §IV.3 lets **Non-Streaming SDAs** charge. A playlist-builder that never touches
  playback, where users press play in the Spotify app themselves, *appears* to qualify.
  Get written confirmation from Spotify before relying on this.
- Terms §V.5: "You will not sell any Spotify Content or other data obtained from Spotify."

### Access limits (second blocker)
- **Development Mode** (every app starts here): at most **5 authenticated users in total
  for the whole app**, not per party, each manually allowlisted. The app owner needs
  Premium.
- **Extended Quota Mode** (needed to launch publicly): since 15 May 2025 Spotify only
  accepts organizations, with a "legally registered business", a launched service,
  **at least 250k MAUs**, and presence in key markets. Approval is discretionary and
  takes up to 6 weeks.
- That's a chicken-and-egg problem: you can't reach 250k users with a 5-user app.

### Other rules that touch our features
- Policy §III.4: "you can't create an application which plays content from a single
  source to several simultaneous listeners." This is a risk for "one phone streams to
  everyone's headphones".
- Policy §III.10: personal, non-commercial use only. Business venues are not allowed.
  A house party is fine; a bar is not.
- Terms §IV.3.2: no caching of audio. Metadata and cover art may be cached, which is
  enough for our offline queue view.
- Policy §III.2: "Do not create a game". Voting is not a game, but keep the UI from
  looking like one.
- `audio-analysis` / `audio-features` (beat grids) were removed for new apps in Nov 2024,
  so we can't use Spotify's beat data for alignment.
- Playlist endpoints still available in Dev Mode: `POST /me/playlists`,
  `POST /playlists/{id}/items`, `GET /search` (now max 10 results per page).

### Competitor: Spotify Jam
Jam is built into Spotify: the host needs Premium, free users can join, up to ~32
people, invites by QR code or Bluetooth, and the host can remove songs and reorder.
It has **no fair rotation and no democratic veto**. Those two features, plus
offline/sync, are our differentiators, so the pitch has to lead with them.

## Apple Music (MusicKit) details

Sources: [Apple dev forum on MusicKit monetization](https://developer.apple.com/forums/thread/80241),
[MusicKit agreement clause](https://www.lawinsider.com/clause/musickit),
[SharePlay / GroupActivities](https://developer.apple.com/videos/play/wwdc2021/10225).

- No user cap, and full playback through `ApplicationMusicPlayer`, but the MusicKit
  agreement bans requiring payment for, or indirectly monetizing, access to Apple Music.
  Charging for *non-music* features (party management) is a gray area that Apple hasn't
  ruled on publicly.
- SharePlay (`AVPlaybackCoordinator`) gives synchronized group playback and can start
  over AirDrop, but it's iOS-only and needs connectivity.
- Android users would need a separate integration.

## Synchronized playback: physics, not just policy

Even with full control of the audio, "beat for beat" sync has hard limits:
- **Bluetooth latency** varies by headset (roughly 100–300 ms, e.g. AirPods vs cheap
  earbuds). Each device needs a one-time calibration offset or two listeners will hear an
  echo-like slip. iOS reports output latency (`AVAudioSession.outputLatency`) but it
  isn't always accurate for Bluetooth.
- **Clock sync** works offline: exchange timestamps over Bluetooth LE / local
  peer-to-peer while devices are near each other (NTP-style), agree on "start at T", and
  re-sync periodically. Phone clocks drift a few ppm, around 10–20 ms per hour, which is
  fine with periodic re-sync.
- Realistic target **with our own audio pipeline**: within ~20–40 ms after calibration,
  which is beat-aligned to the ear. **With Spotify**: each phone's Spotify app is a black
  box, so a manual "3-2-1 play" or player-API start lands within ~200–1000 ms, and the
  API needs internet.
- So true sync needs audio we're licensed to play and cache ourselves (a licensed music
  provider such as a B2B catalog service, or users' own files). Mainstream catalogs
  licensed this way cost far more than Spotify integration. This needs its own research
  before it's chosen.
