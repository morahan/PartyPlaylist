# Music platform research

Researched 2026-11-06. Platform terms change often (Spotify changed its developer rules
twice in 2026), so re-check before each milestone. Items marked *(unverified)* came
from secondary sources; confirm them with the provider.

## Does going platform-agnostic get around Spotify's restrictions?

**Partly.** It solves one of Spotify's two blockers, not both:

1. ✅ **The "can't charge for a streaming app" rule.** If our app only coordinates the
   queue and writes playlists, and never plays or controls playback, it's a
   *Non-Streaming SDA*, which Policy §IV.3 allows to charge. Our sync design keeps
   this property, because corrections are people pausing their own player.
2. ❌ **The Development Mode wall.** Every Spotify app starts in Development Mode, which
   since Feb 2026 is limited to "**non-commercial** learning, experimentation, and
   personal projects", to **5 users total**, and to one owner with Premium. Leaving it
   (Extended Quota) requires a registered business, which Freio Labs, LLC is, **and
   ≥ 250k monthly active users**.

So in the paid app at launch, **we can't write playlists into Spotify accounts.**
Spotify users can still join, add songs (picked through our neutral search), vote, and
listen from the host's device or through a service we can export to. Spotify export
comes once we qualify for Extended Quota.

## Service by service

| Service | Search / match | Write playlist to user | Charge for host feature? | Notes |
|---|---|---|---|---|
| **Spotify** | Search API (Dev Mode: 10 results/call); ISRC in `external_ids` | Only after Extended Quota | Non-streaming OK under Policy §IV.3, but Dev Mode is non-commercial | 5-user cap |
| **Apple Music** | Catalog search, `filter[isrc]` | `POST /v1/me/library/playlists` | **Gray area.** Guideline 4.5.2(i): can't "require payment or indirectly monetize access to the Apple Music service". Ask App Review in writing | Android sign-in goes through the Apple Music app and has been fragile; no maintained cross-platform RN library, so we write small native modules |
| **YouTube Music** | YouTube Data API | `playlists.insert` (YouTube playlist, shows in YT Music) | ✅ Selling the app is allowed | Default quota ≈ 199 song-adds/day *for the whole app*; more needs a compliance audit |
| **TIDAL** | Catalog, ISRC filter | `playlists.write` scope | ❌ Developer terms: non-commercial only, without an agreement *(terms page partly unverified)* | Contact TIDAL partnerships |
| **Deezer** | `api.deezer.com/track/isrc:…` works without a key | — | ❌ Non-commercial only | Not issuing new API access to individuals |
| **Suno** | No public API; partner program announced July 2026 | — | — | Pro/Premier users own their songs; Free/Basic is personal non-commercial only. Accept **suno.com share links** that open in Suno. Hosting uploaded files makes us a music host (copyright and takedown liability), so not at launch |

### Matching songs across services
- **ISRC** (the recording's international ID) is the join key: Spotify, Apple, TIDAL
  and Deezer all expose it.
- **Odesli / song.link** maps a link from one service to all the others, but its
  public API now requires a key *(no published commercial terms; ask them)*.
- **MusicBrainz** has open data with ISRC lookup, a candidate neutral catalog for
  search *(rate limits and commercial terms unverified)*.
- Spotify's public **oEmbed** endpoint resolves a pasted link without login, but
  returns only the song title and artwork, so it can't be used for matching.

## Recommended launch set
1. **Neutral search** (MusicBrainz or a licensed metadata provider) plus **link
   pasting** from any service. Every guest can add a song with no account linking.
2. **Apple Music + YouTube Music export.** These are the only commercially workable
   write targets today, after getting App Review's written view on Apple.
3. **Spotify / TIDAL** as "listen on host device" until partnership or quota is
   granted. Apply early.
4. **Suno** via links.

## Outreach checklist (Freio Labs, LLC)
- [ ] Spotify: confirm a Non-Streaming SDA may charge for hosting; ask about the
      Extended Quota path below 250k MAU.
- [ ] Apple: App Review pre-submission question on Guideline 4.5.2(i) for paid hosting.
- [ ] TIDAL partnerships: commercial agreement.
- [ ] Odesli: API key and commercial terms.
- [ ] Be ready to show App Review that each service permits our use (Guideline 5.2.2).

## Sync: what's physically achievable
- **Clock sync** between phones: a few ms on a good network, ~10–30 ms over Bluetooth.
  Phone clocks drift ~10–20 ms/hour, so re-sync periodically.
- **Starting another company's player** has variable delay (100–500 ms+, worse when
  streaming than when playing a download), so the automatic count-in typically lands
  within a few hundred ms.
- **Bluetooth headphones** add 100–300 ms that differs by model. Tap alignment
  measures what's heard, so it cancels this out.
- **Tap alignment** with ~8 taps lands within ~20–40 ms in tests; real-world
  anticipatory tapping adds ~20–50 ms of human error. **< 100 ms is realistic** after
  an optional correction.

## Sources
- Spotify: [Developer Policy](https://developer.spotify.com/policy),
  [Terms](https://developer.spotify.com/terms),
  [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes),
  [Feb 2026 developer access update](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security),
  [Feb 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide),
  [Mar 2026 changelog](https://developer.spotify.com/documentation/web-api/references/changes/march-2026),
  [Jul 2026 quota update](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates)
- Apple: [App Review Guidelines: Apple Music](https://developer.apple.com/app-store/review/guidelines/#apple-music),
  [MusicKit user authentication](https://developer.apple.com/tutorials/data/documentation/applemusicapi/user-authentication-for-musickit.md),
  [MusicKit for Android](https://developer.apple.com/musickit/android/),
  [forum: paid host features](https://developer.apple.com/forums/thread/838157)
- YouTube: [quota costs](https://developers.google.com/youtube/v3/determine_quota_cost),
  [developer policies](https://developers.google.com/youtube/terms/developer-policies)
- TIDAL: [developer terms](https://developer.tidal.com/documentation/guidelines-developer-terms-1_0)
- Deezer: [terms of use](https://developers.deezer.com/termsofuse),
  [community: API access](https://en.deezercommunity.com/features-feedback-44/api-auth-impossible-80857)
- Suno: [terms](https://suno.com/terms),
  [API partner program](https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/)
- Competitor: [Spotify Jam](https://techcrunch.com/2023/09/26/spotify-launches-jam-a-real-time-collaborative-playlist-controlled-by-up-to-32-people)
