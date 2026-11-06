# Party Playlist

Build one live playlist with friends from whatever music service each person uses.
Songs play in fair rotation (A, B, C, A, B, C…), anyone can veto a song, and ≥ 50% of
the party removes it. Listen from one speaker, or in sync across everyone's
headphones, even offline.

By Freio Labs, LLC.

- [`docs/product-spec.md`](docs/product-spec.md): what we're building
- [`docs/platform-research.md`](docs/platform-research.md): Spotify / Apple Music / TIDAL / YouTube / Suno constraints
- [`docs/build-plan.md`](docs/build-plan.md): architecture, phases, open questions

## Getting started

Requires Node 22+ and [`just`](https://github.com/casey/just).

```sh
just setup    # npm install + enable git hooks
npm start     # Expo dev server
```

## Testing

| Command | Runs | Also runs on |
|---|---|---|
| `just test` / `just t` | Lint + tests related to changed files | every commit (staged files) |
| `just test-all` / `just ta` | Lint, typecheck, all tests | every push, and CI |

## Layout

| Path | What |
|---|---|
| `src/core/` | Provider-independent rules (rotation, veto, seats, go-live, finalize) and sync math |
| `src/screens/` | App screens |
| `scripts/`, `.githooks/` | Test runners and git hooks |
| `assets/` | Icons and logo, generated from `assets/source/logo.jpg` by `just icons` (Inkscape) |

## Secrets
`config.js` and `.env` are gitignored. Never commit credentials. The Spotify client
secret that's in this repo's history must be rotated in the Spotify developer
dashboard.
