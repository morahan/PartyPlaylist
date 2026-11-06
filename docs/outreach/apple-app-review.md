**From:** FreioLabs@gmail.com (Apple Developer account holder)
**To / channel:** see `README.md` in this folder
**Subject:** Pre-submission question on Guideline 4.5.2(i): paid party hosting with MusicKit playlist export

Hello App Review team,

Freio Labs, LLC is preparing PartyPlaylist, an app where a group of friends builds
one shared playlist with fair rotation between contributors and group voting to
remove songs. Before submitting, we'd like to confirm our monetization fits
Guideline 4.5.2(i).

**How the app works:**
- Free to download. Joining a party, adding songs and voting are free for everyone.
- A one-time in-app purchase ($5.99) or subscription ($10.99/month) is required only
  to *start* a party. That unlocks the party-coordination features: invitations,
  seat limits, rotation and voting.
- With MusicKit, we search the Apple Music catalog and, at the user's request, save
  the finished playlist to *their own* library
  (`POST /v1/me/library/playlists`). Playback happens in the Music app. Our app
  doesn't play Apple Music content or require any payment for Apple Music
  features.
- The same playlist can be exported to other services, so Apple Music is one of
  several optional destinations.

**Our question:** does charging for party hosting, while every Apple Music
interaction stays free, comply with Guideline 4.5.2(i)'s rule against requiring
payment for, or indirectly monetizing, access to Apple Music? If not, what changes
would you recommend?

Thank you,
Michael Morahan
Freio Labs, LLC
FreioLabs@gmail.com
