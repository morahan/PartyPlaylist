**From:** FreioLabs@gmail.com
**To / channel:** see `README.md` in this folder
**Subject:** Non-Streaming SDA monetization and Extended Quota path: PartyPlaylist (Freio Labs, LLC)

Hello Spotify for Developers team,

Freio Labs, LLC is building PartyPlaylist, an iOS and Android app where a group of
friends builds one shared playlist together. Songs are ordered in fair rotation
between contributors, and the group can vote a song out. The app is free to
download; a one-time in-app purchase ($5.99) or subscription ($10.99/month) is
required only for the person who *starts* a party.

We have designed PartyPlaylist as a **Non-Streaming SDA**:

- It never plays, streams, queues, seeks or otherwise controls playback.
- Its only Spotify writes are creating a playlist in the user's own account
  (`POST /me/playlists`) and adding items (`POST /playlists/{id}/items`).
- Users press play in the Spotify app themselves.
- We cache metadata and cover art only, never audio.

We'd be grateful for your guidance on two questions:

1. Under Developer Policy §IV.3, may a Non-Streaming SDA like this charge for the
   party-hosting feature, as described above?
2. We understand Extended Quota Mode currently requires 250k MAU. Is there a
   partner or review path for an early-stage registered business whose Spotify
   integration is non-streaming? Until then, we plan to keep Spotify playlist
   export out of the paid app so we stay within Development Mode's non-commercial
   terms.

Happy to share a demo build or architecture details.

Thank you,
Michael Morahan
Freio Labs, LLC
FreioLabs@gmail.com
