# AGENTS.md

## Repo Shape
- Moneeey is split into independent root, `frontend/`, `backend/`, and `playwright/` toolchains; there is no package-manager workspace tying them together.
- Frontend: React 18 + MobX + raw IndexedDB, entrypoint `frontend/src/main.tsx`, app wiring in `frontend/src/App.tsx`, central store in `frontend/src/shared/MoneeeyStore.ts`.
- Backend: Deno + Oak, entrypoint `backend/main.ts -> src/server.ts`, SQLite storage through `src/db/engine.ts`, migrations in the single `MIGRATIONS` array in `src/db/migrations.ts`.
- Sync data plane is WebSocket-only at `/api/vault`; Caddy routes `/api/*` to backend and `/` to frontend.
- Local container DB is `docker/volume/backend_data/moneeey.sqlite`, bind-mounted as `/data/moneeey.sqlite`; use SQLite `.backup`, not `cp`, while the backend is running.

## Commands
- Full local stack: `podman-compose up` from repo root, then open `http://localhost:4280`.
- Restart the stack after adding/removing npm packages: `podman-compose down && podman-compose up`.
- Root read-only format/lint check: `yarn ci`.
- Root fix + typecheck: `yarn lint` runs `biome check --fix --unsafe .` and then frontend `tsc`, so it can edit files.
- Root format: `yarn fmt`.
- Frontend setup/build/test from `frontend/`: `yarn install --immutable`, `yarn build`, `yarn test`, `yarn lint`.
- Single frontend Jest test: `TZ=America/Sao_Paulo npx jest src/path/File.test.ts` from `frontend/`.
- Backend dev/test from `backend/`: `deno task dev`, `deno task test`, `deno task test:watch`, `deno task test:coverage`.
- Single backend test: `deno test --allow-read --allow-write --allow-env --allow-net --allow-ffi --allow-import src/path/file_test.ts` from `backend/`.
- Playwright from `playwright/`: `yarn test`, `yarn test-cr`, `yarn test-ff`, `yarn ui`, `yarn debug-cr`.

## Test Gotchas
- Frontend Jest is Node, not jsdom; mock browser globals on `globalThis` and keep `TZ=America/Sao_Paulo`.
- Frontend unit tests live under `frontend/src` next to source as `*.test.ts`.
- Backend tests are `*_test.ts` and use Deno permissions from `deno task test`.
- Playwright config starts the Vite frontend dev server, but not the backend; run `podman-compose up` or `deno task dev` when E2E coverage needs `/api`.
- Local Playwright `baseURL` is `http://localhost:4280`; CI uses `http://localhost:4270` and starts backend separately.
- Passkey/WebAuthn E2E helpers use Chromium CDP virtual authenticators; passkey tests must skip non-Chromium projects.

## Architecture Notes
- Frontend persistence flow is `MappedStore` changes -> `PersistenceStore.commit()` -> encryption codec -> `LocalStore` IndexedDB docs -> optional `SyncClient` WebSocket push.
- `LocalStore` has `documents` and `meta` object stores; `ENCRYPTION-META` is a reserved synced doc for wrapped encryption metadata.
- Sync reconciliation uses a manifest of document `id` and `updated_at`; there is no per-document revision chain.
- Backend config loads the first existing file from `/run/secret/prod.env`, `/run/secret/dev.env`, `env`, `env.example`; required values include `MONEEEY_SQLITE_PATH`, `MONEEEY_ENV`, and JWT keys.
- Backend `MONEEEY_ENV=dev` runs the stale test-user janitor once on server boot.

## Code Conventions
- Biome is the formatter/linter; do not introduce ESLint or Prettier config.
- Avoid adding code comments unless they explain non-obvious repo-specific behavior.
- Type names follow repo style: `I`-prefixed interfaces, `T`-prefixed type aliases, PascalCase enums.
- Monetary values are plain `number`; dates are ISO `yyyy-MM-dd` strings.
- MobX stores use explicit `makeObservable()` annotations; React components reading MobX observables need `observer`.
- User-facing frontend strings live in `frontend/src/utils/Language.ts` and need all five languages: `en`, `pt`, `es`, `hi`, `cn`.
- Prefer `testId` props on base components for E2E targeting.

## CI / Versions
- CI uses Node `22.14` and Deno `2.7`.
- CI jobs cover frontend Jest, backend Deno tests, Biome read-only check, root `yarn lint`, and Playwright sharded across Chromium/Firefox.
- Commit messages follow `semantic-commit-messages.md`: `<type>(<scope>): <subject>` with `feat`, `fix`, `docs`, `style`, `refactor`, `test`, or `chore`.
