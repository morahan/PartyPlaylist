# Party Playlist

Build one live playlist with friends: songs play in fair rotation (A, B, C, A, B, C…),
anyone can veto a song, and ≥ 50% of the party removes it. Listen together from one
speaker, or (goal) in sync across everyone's headphones, offline.

**Status:** early prototype being reset. Read the docs before writing code:

- [`docs/product-spec.md`](docs/product-spec.md): what we're building
- [`docs/platform-research.md`](docs/platform-research.md): Spotify / Apple Music constraints
- [`docs/build-plan.md`](docs/build-plan.md): architecture, phases, open questions

## Layout

| Path | What |
|---|---|
| `core/` | Provider-independent party rules: rotation, veto, seat limits, with tests |
| `App.js`, `components/`, `styles/` | Legacy Expo SDK 37 UI (login screen); to be re-scaffolded in Phase 0 |
| `assets/` | App icon, splash, logo |

## Running

```sh
cd core && npm test   # party rules (Node 20+)
```

The Expo app targets SDK 37, which current Expo Go can't open. It's re-scaffolded in
Phase 0 of the build plan.

## Secrets
`config.js` (gitignored) holds Spotify credentials locally. Never commit credentials.
The client secret that was in this repo's history must be rotated in the Spotify
developer dashboard.
