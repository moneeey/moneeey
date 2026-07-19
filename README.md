# Moneeey

[![CI](https://github.com/moneeey/moneeey/actions/workflows/CI.yaml/badge.svg)](https://github.com/moneeey/moneeey/actions/workflows/CI.yaml)

Moneeey is a local-first personal finance app for budgets, accounts,
transactions, imports, and reports. Financial data is encrypted in the browser
before it is written to IndexedDB or synced to the optional backend vault.

The current app supports offline use, passphrase-protected local vaults,
optional passkey sign-in for sync and sharing, CSV/OFX imports, multi-currency
accounts, payees, tags, budget envelopes, dashboards, detailed reports, and
trash/restore flows.

## Run Locally

The documented local stack uses Podman Compose from the repository root:

```bash
podman-compose up
```

Open the app at <http://localhost:4280>.

The Caddy container listens on `4280`, proxies `/api/*` to the Deno backend, and
proxies everything else to the Vite frontend dev server. The backend reads
`backend/env.example` through `/run/secret/dev.env` in the compose stack and uses
`docker/volume/backend_data/moneeey.sqlite` for local SQLite data.

If the backend is running and you need a copy of the local SQLite database, use
SQLite `.backup` instead of copying the database files directly.

## Toolchains

This repository is not a package-manager workspace. Install and run commands in
the root, `frontend/`, `backend/`, and `playwright/` toolchains separately.

Root formatting and type checks:

```bash
yarn install --immutable
yarn ci
yarn lint
```

Frontend commands:

```bash
cd frontend
yarn install --immutable
yarn dev
yarn build
yarn test
yarn lint
```

Backend commands:

```bash
cd backend
deno task dev
deno task test
deno task test:watch
deno task test:coverage
```

Playwright commands:

```bash
cd playwright
yarn install --immutable
yarn test
yarn test-cr
yarn test-ff
```

Playwright starts the Vite frontend dev server. Start the backend separately,
for example with `podman-compose up` or `deno task dev`, when tests need `/api`.

## Architecture

- `frontend/`: React 18, Vite, MobX, Tailwind CSS, WebCrypto, and raw
  IndexedDB. `frontend/src/main.tsx` boots the app, `frontend/src/App.tsx` wires
  routing and unlock flow, and `frontend/src/shared/MoneeeyStore.ts` owns the
  central MobX stores.
- `backend/`: Deno 2.7 and Oak. `backend/main.ts` starts
  `backend/src/server.ts`, SQLite access lives under `backend/src/db/`, and
  migrations are declared in `backend/src/db/migrations.ts`.
- `docker/`: Caddy exposes the local app on port `4280` and routes `/api/*` to
  the backend service.
- `playwright/`: End-to-end tests for the browser app, including sync and
  passkey flows.

The frontend persistence path is:

```text
MobX stores -> PersistenceStore -> encryption codec -> LocalStore IndexedDB
```

When sync is enabled, `SyncClient` connects to `ws(s)://<host>/api/vault` and
pushes encrypted document records to the backend. Sync reconciliation exchanges a
manifest of document IDs and `updated_at` timestamps; there is no per-document
revision chain.

The backend stores vault metadata, users, passkeys, memberships, invites, and
encrypted document records in SQLite. The backend does not need plaintext
financial entities to reconcile vault documents.

## Product Surface

- Account, payee, currency, transaction, tag, and settings management.
- CSV and OFX import with duplicate detection and account suggestions from
  existing transactions.
- Budget envelopes by month, with archived-budget visibility controls.
- Reports for net worth, account balances, payees, tags, income versus expenses,
  budget versus actuals, recurring activity, cash flow, and wealth growth.
- Passphrase-based encryption, passkey account registration/login, multiple
  vaults, member management, ownership transfer, and invite links.
- Offline-capable PWA shell with IndexedDB persistence and optional sync.

## Demos

Guided tour:
[Tour.webm](https://github.com/user-attachments/assets/e6fd3ee7-e9b6-47f2-82a6-c44a4fc5c56b)

CSV and OFX import:
[Import.webm](https://github.com/user-attachments/assets/d361ddad-1068-4157-99ee-6e6d56e89ff8)
