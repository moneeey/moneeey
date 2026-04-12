# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneeey is a personal budgeting app with E2E encryption. React+MobX+PouchDB frontend, Deno+Oak+CouchDB backend, Caddy reverse proxy. All orchestrated via docker-compose.

## Commands

### Local Development
```bash
docker-compose up                    # Start everything (frontend :4270, backend :4269, caddy :4280, couchdb :5984)
```
Access at http://localhost:4280 — CouchDB admin: dev/dev at /db/_utils/#login

### Frontend (working directory: frontend/)
```bash
yarn install --immutable
yarn dev                             # Vite dev server on :4270
yarn build                           # Production build
yarn test                            # Jest unit tests (TZ=America/Sao_Paulo)
TZ=America/Sao_Paulo npx jest path/to/file.test.ts  # Single test file
TZ=America/Sao_Paulo npx jest --coverage             # Coverage report
yarn lint                            # TypeScript type check (tsc)
```

### Backend (working directory: backend/, requires Deno)
```bash
deno task dev                        # Dev server with watch on :4269
deno task test                       # Unit tests
deno task test:watch                 # Watch mode
deno task test:coverage              # Coverage report
```

### Playwright E2E (working directory: playwright/)
```bash
yarn test                            # Run all E2E tests
yarn test-cr                         # Chromium only
yarn test-ff                         # Firefox only
yarn debug-cr                        # Headed debug (Chromium, no timeout)
yarn ui                              # Interactive UI mode
yarn godocker                        # Run in Playwright docker container
```
E2E tests need the full stack running (docker-compose or dev servers).

### Linting & Formatting (root)
```bash
yarn lint                            # Biome check + fix + frontend tsc
yarn fmt                             # Biome format
yarn ci                              # Biome CI (read-only check)
```

## Architecture

### Stack
- **Frontend**: React 18, MobX 6, PouchDB 9, Vite, TailwindCSS, TypeScript — PWA with service worker
- **Backend**: Deno, Oak framework, CouchDB 3.2, JWT auth (jose), magic link auth (SendGrid)
- **Proxy**: Caddy routes `/api/*` → backend, `/db/*` → couchdb, `/` → frontend

### Frontend Data Flow
- **MobX stores** in `frontend/src/shared/MoneeeyStore.ts` — central store composing: AccountStore, TransactionStore, CurrencyStore, BudgetStore, ConfigStore, NavigationStore, TagsStore, ManagementStore
- **MappedStore** (`shared/MappedStore.ts`) is the abstract base — manages `Map<UUID, Entity>` with observable collections
- **Persistence** (`shared/Persistence.ts`) wraps PouchDB — handles local IndexedDB storage, CouchDB remote sync with JWT auth, debounced commits, change monitoring
- **Entity types**: ACCOUNT, TRANSACTION, BUDGET, CURRENCY, CONFIG — all extend IBaseEntity with CouchDB `_id`/`_rev` fields
- **Routing**: HashRouter with custom route registry in `frontend/src/routes/`

### Backend Structure
- Entry: `backend/main.ts` → `src/server.ts` (Oak app + router)
- Auth: `src/auth.ts` — magic link flow (SendGrid) + CouchDB JWT auth
- Config: loads from `/run/secret/prod.env`, `/run/secret/dev.env`, `./env`, `./env.example`
- Endpoints: `GET /api` (info), `GET/POST /api/auth/*` (auth routes)

### Key Conventions
- Biome for linting/formatting (not ESLint/Prettier)
- Test files live next to source: `Foo.test.ts` alongside `Foo.ts`
- Frontend test env is Node (not jsdom) — mock `window` via `globalThis` when needed
- Jest tests must run with `TZ=America/Sao_Paulo`
- Monetary values are plain numbers (`type TMonetary = number`)
- Dates are ISO strings (`type TDate = string`, format `yyyy-MM-dd`)
