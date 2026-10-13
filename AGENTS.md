# Project agent memory

This file is the project's committed base for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Layout: Angular frontend in `src/`, Node/TS catalog API in `server/`, shared types in `shared/catalog-contract.ts` (the frontend↔API contract; `src/app/models.ts` only re-exports it). README covers commands, env vars, API routes and fallback rules.
- `npm start` runs API + `ng serve` together (`scripts/dev.mjs`); `/api` reaches the API through `proxy.conf.js`. `ng serve` alone shows error states, not data.
- `npm test` = `test:api` (tsc → `node --test` via `scripts/test-api.mjs`) + `test:web` (Karma `ChromeHeadlessCI`, no sandbox). In containers set `CHROME_BIN` (e.g. the Playwright Chromium under `~/.cache/ms-playwright`).
- TMDB credentials live only in the API env (`TMDB_API_KEY` / `TMDB_READ_ACCESS_TOKEN`); never add them to Angular code. Without them the API serves the demo catalog. TMDB titles must keep `availabilityStatus: 'unavailable'`: do not invent streaming availability.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
