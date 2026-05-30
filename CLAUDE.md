# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneeey is a personal budgeting app with E2E encryption. React+MobX+IndexedDB frontend, Deno+Oak backend with a pluggable storage engine (default: a single SQLite file at `/data/meta.sqlite` holding all users/vaults/invites/documents, keyed by `vault_id`; optionally PostgreSQL via `MONEEEY_DB_ENGINE=postgres`), Caddy reverse proxy. All orchestrated via podman-compose.

## Commands

### Local Development
```bash
podman-compose up                    # Start everything (frontend :4270, backend :4269, caddy :4280)
podman-compose down && podman-compose up  # Restart (required after yarn add/remove)
```
Access at http://localhost:4280. The SQLite database lives under `./docker/volume/backend_data/` on the host (bind-mounted to `/data` in the backend container). To inspect: `sqlite3 ./docker/volume/backend_data/meta.sqlite`. To back up: `sqlite3 meta.sqlite ".backup target.sqlite"` (do not `cp` while the backend is running). For the Postgres engine, data lives in the `postgres` compose service.

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
- **Frontend**: React 18, MobX 6, raw IndexedDB (no PouchDB), Vite, TailwindCSS, TypeScript — PWA with service worker
- **Backend**: Deno, Oak framework, JWT auth (jose), passkey/WebAuthn auth (@simplewebauthn). Pluggable storage via `StorageEngine` (`src/db/engine.ts`): default `sqlite` (`@db/sqlite` FFI, single file, all tables keyed by `vault_id`) or `postgres` (`deno-postgres`, pooled). Selected by `MONEEEY_DB_ENGINE`.
- **Proxy**: Caddy routes `/api/*` → backend, `/` → frontend. No direct database route — every read/write flows through the backend.

### Frontend Data Flow
- **MobX stores** in `frontend/src/shared/MoneeeyStore.ts` — central store composing: AccountStore, TransactionStore, CurrencyStore, BudgetStore, ConfigStore, NavigationStore, TagsStore, ManagementStore
- **MappedStore** (`shared/MappedStore.ts`) is the abstract base — manages `Map<UUID, Entity>` with observable collections
- **LocalStore** (`shared/storage/LocalStore.ts`) is the raw IndexedDB wrapper with three object stores: `documents` (vault docs, key `_id`), `meta` (head_seq, vault_id), `outbox` (pending pushes)
- **SyncClient** (`shared/sync/SyncClient.ts`) owns the `/api/vault` WebSocket — sends `hello` + JWT, runs pull-on-ready, debounced batched push, processes inbound `changes` frames, reconnects with exponential backoff
- **Persistence** (`shared/Persistence.ts`) wires MappedStore observers to encryption → outbox → SyncClient. Each MappedStore change triggers `commit(doc)` → encrypted via `encryption/codec.ts` → written to LocalStore + enqueued. Remote `changes` decrypt and feed watchers.
- **Encryption**: AES-GCM body encryption, data key wrapped by PBKDF2-derived KEK from the user's passphrase. The wrapped key lives in a reserved doc with `_id="ENCRYPTION-META"` that syncs like any other doc so a second device can join with the same passphrase.
- **Entity types**: ACCOUNT, TRANSACTION, BUDGET, CURRENCY, CONFIG — all extend IBaseEntity with `_id`/`updated` fields. The server-assigned monotonic `seq` per vault is the pull cursor + LWW tiebreak; there is no per-doc `_rev` chain anymore.
- **Routing**: HashRouter with custom route registry in `frontend/src/routes/`

### Backend Structure
- Entry: `backend/main.ts` → `src/server.ts` (Oak app + router; runs meta migrations on boot; in DEV mode also runs the test-user janitor once on boot)
- Storage seam: `src/db/storage.ts` (`withMeta` / `withVault(id, ...)`, LRU cap 100 open vault handles, no idle timer) + `src/db/migrations.ts` (inline `META_MIGRATIONS` and `VAULT_MIGRATIONS` arrays, applied lazily per file)
- Data layer: `src/data/{users,vaults,invites,documents}.ts` — pure SQL functions taking a `Storage`
- Auth: `src/auth_session.ts` (`/api/auth/session` returns `{vaultId, sessionToken}`) + `src/auth_passkey.ts` (WebAuthn ceremonies, calls SQL data layer)
- Sync: `src/sync/protocol.ts` (Hello → Ready → Closed handler-strategy chain) + `src/sync/hub.ts` (in-process `Map<vaultId, Set<WebSocket>>` for change broadcast) + `src/sync/vault.ts` (Oak WS endpoint at `/api/vault`)
- Janitor: `src/janitor.ts` — `purgeStaleTestUsers()` deletes `*@playwright.local` users older than 1 day and unlinks their owned vault files
- Config: loads from `/run/secret/prod.env`, `/run/secret/dev.env`, `./env`, `./env.example`. Required env: `MONEEEY_META_PATH`, `MONEEEY_VAULTS_DIR`, `MONEEEY_ENV` (`prod` or `dev`), plus the JWT keys.
- Endpoints: `GET /api` (info), `POST /api/auth/passkey/*` (WebAuthn), `POST /api/auth/session` (vaultId+sessionToken), `POST /api/auth/logout`, `GET /api/vault` (WebSocket upgrade — the entire data plane)

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
