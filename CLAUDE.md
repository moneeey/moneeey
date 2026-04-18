# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneeey is a personal budgeting app with E2E encryption. React+MobX+PouchDB frontend, Deno+Oak+CouchDB backend, Caddy reverse proxy. All orchestrated via podman-compose.

## Commands

### Local Development
```bash
podman-compose up                    # Start everything (frontend :4270, backend :4269, caddy :4280, couchdb :5984)
podman-compose down && podman-compose up  # Restart (required after yarn add/remove)
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
E2E tests need the full stack running (podman-compose or dev servers).

### Linting & Formatting (root)
```bash
yarn lint                            # Biome check + fix + frontend tsc
yarn fmt                             # Biome format
yarn ci                              # Biome CI (read-only check)
```

## Architecture

### Stack
- **Frontend**: React 18, MobX 6, PouchDB 9, Vite, TailwindCSS, TypeScript — PWA with service worker
- **Backend**: Deno, Oak framework, CouchDB 3.2, JWT auth (jose), passkey/WebAuthn auth (@simplewebauthn)
- **Proxy**: Caddy routes `/api/*` → backend, `/db/*` → couchdb, `/` → frontend

### Frontend Data Flow
- **MobX stores** in `frontend/src/shared/MoneeeyStore.ts` — central store composing: AccountStore, TransactionStore, CurrencyStore, BudgetStore, ConfigStore, NavigationStore, TagsStore, ManagementStore
- **MappedStore** (`shared/MappedStore.ts`) is the abstract base — manages `Map<UUID, Entity>` with observable collections
- **Persistence** (`shared/Persistence.ts`) wraps PouchDB — handles local IndexedDB storage, CouchDB remote sync with JWT auth, debounced commits, change monitoring
- **Entity types**: ACCOUNT, TRANSACTION, BUDGET, CURRENCY, CONFIG — all extend IBaseEntity with CouchDB `_id`/`_rev` fields
- **Routing**: HashRouter with custom route registry in `frontend/src/routes/`

### Backend Structure
- Entry: `backend/main.ts` → `src/server.ts` (Oak app + router)
- Auth: `src/auth.ts` — passkey/WebAuthn flow (@simplewebauthn) + CouchDB JWT auth
- Config: loads from `/run/secret/prod.env`, `/run/secret/dev.env`, `./env`, `./env.example`
- Endpoints: `GET /api` (info), `GET/POST /api/auth/*` (auth routes)

### Key Conventions
- Biome for linting/formatting (not ESLint/Prettier)
- Test files live next to source: `Foo.test.ts` alongside `Foo.ts`
- Frontend test env is Node (not jsdom) — mock `window` via `globalThis` when needed
- Jest tests must run with `TZ=America/Sao_Paulo`
- Monetary values are plain numbers (`type TMonetary = number`)
- Dates are ISO strings (`type TDate = string`, format `yyyy-MM-dd`)

## Commit Messages

Follow semantic commit format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Scope is optional. Subject in present tense. See `semantic-commit-messages.md` for details.

## Code Style

- Never add code comments
- Naming: `I`-prefixed interfaces (`IAccount`), `T`-prefixed type aliases (`TMonetary`, `TDate`), PascalCase enums (`AccountKind`, `EntityType`)
- Biome handles formatting and import ordering — run `yarn lint` before committing

## Frontend Patterns

- Wrap React components that read MobX observables with `observer` from mobx-react-lite
- Use `testId` prop on base components for E2E test targeting
- Style with TailwindCSS utility classes
- All user-facing strings must go through the i18n system in `frontend/src/utils/Messages.tsx` — add translations for all 5 languages (en, pt, es, hi, cn)
- Entity stores extend `MappedStore<T>` which manages `Map<UUID, Entity>` with observable CRUD
- Use `makeObservable()` with explicit observable/computed/action annotations

## Testing

Always write tests:
- **Unit tests** for small functions and store logic — co-located as `Foo.test.ts` next to `Foo.ts`
- **E2E Playwright tests** for features and behavior pinning — in `playwright/tests/`

Frontend unit tests run in Node (not jsdom). Mock `window` via `globalThis` when needed.

## Workflow

- Work on feature branches, PR into main
- CI runs: Biome lint, frontend tsc, Jest unit tests, Deno backend tests, Playwright E2E in Docker
- After installing/removing npm packages, restart podman-compose for the container to pick up changes
