# Moneeey Testing Guide — UI/UX Overhaul & Stability Updates

This document covers all changes implemented today and commands/steps to verify each change locally.

---

## 1. Silenced Dev Server Offline Proxy Errors (`ECONNREFUSED`)
- **What Changed**: Modified [`frontend/vite.config.ts`](./frontend/vite.config.ts) with a custom logger and Vite proxy error handler that intercepts offline `/api` WebSocket and HTTP requests and returns a clean 502 status instead of crashing or spewing raw connection errors to stderr.
- **How to Test**:
  1. Ensure the backend container is stopped.
  2. Launch the Vite dev server:
     ```bash
     cd frontend && yarn dev
     ```
  3. Open `http://localhost:4270/` in a browser.
  4. Verify the terminal output is clean with zero `ECONNREFUSED` stack traces.

---

## 2. Persistence Flush on Restore Completion
- **What Changed**: Modified [`frontend/src/shared/Persistence.ts`](./frontend/src/shared/Persistence.ts) so `restoreAll` calls `await this.flush()` before returning, ensuring all restored documents are flushed from the queue into IndexedDB before page reloads.
- **How to Test**:
  ```bash
  CI=1 yarn --cwd playwright test-cr tests/backup-restore.spec.ts
  ```

---

## 3. New Safety Playwright Test Suites
Three new Playwright specs were created to expand end-to-end regression protection:
- **Currencies**: [`playwright/tests/currencies.spec.ts`](./playwright/tests/currencies.spec.ts) (table rendering, in-place edit, virtual-scroll custom currency addition, modal selection).
- **Payees**: [`playwright/tests/payees.spec.ts`](./playwright/tests/payees.spec.ts) (payee table, renaming, transaction reflection, archiving).
- **Backup & Restore**: [`playwright/tests/backup-restore.spec.ts`](./playwright/tests/backup-restore.spec.ts) (export JSON, payload mutation, import restore, reload + unlock, transaction verification).
- **How to Test**:
  ```bash
  CI=1 yarn --cwd playwright test-cr tests/currencies.spec.ts tests/payees.spec.ts tests/backup-restore.spec.ts
  ```

---

## 4. Self-Hosted Inter Typography
- **What Changed**: Self-hosted the Inter font family (`Regular`, `Medium`, `SemiBold`, `Bold`) locally in [`frontend/src/fonts/`](./frontend/src/fonts/). Configured `@font-face` in [`frontend/src/main.css`](./frontend/src/main.css) and updated `fontFamily.sans` in [`frontend/tailwind.config.js`](./frontend/tailwind.config.js). Added `.woff2` to Vite PWA precache.
- **How to Test**:
  1. Build the production assets:
     ```bash
     yarn --cwd frontend build
     ```
  2. Check that `dist/assets/Inter-*.woff2` files are generated.
  3. Open the app in browser, inspect the Network tab filtered by `Font`, and confirm 0 external font requests (e.g. Google Fonts / CDN) are made.

---

## 5. Design System Primitives & Centralized Controls
- **New Components**:
  - [`frontend/src/components/base/Badge.tsx`](./frontend/src/components/base/Badge.tsx): Semantic status pills (`neutral`, `positive`, `negative`, `warning`, `info`, `primary`).
  - [`frontend/src/components/base/SegmentedControl.tsx`](./frontend/src/components/base/SegmentedControl.tsx): Accessible radio-group pill switcher with active focus ring.
  - [`frontend/src/components/base/ActionList.tsx`](./frontend/src/components/base/ActionList.tsx): List container and items (`ActionListItem`) with title, subtitle, badge, and action buttons.
  - [`frontend/src/components/base/Card.tsx`](./frontend/src/components/base/Card.tsx), [`Modal.tsx`](./frontend/src/components/base/Modal.tsx), [`Drawer.tsx`](./frontend/src/components/base/Drawer.tsx): Elevated cards, non-blocking floating tour cards, and drawer panels.
- **Migrated Components**:
  - `ThemeSwitcher.tsx`: Uses `SegmentedControl`.
  - `TableDensitySwitcher.tsx`: Uses `SegmentedControl` with active `ring-4`.
  - `LanguageSelector.tsx`: Uses `SegmentedControl` with flag icons.
  - `MembersSection.tsx`: Uses `ActionList`, `ActionListItem`, and `Badge`.
  - `VaultSwitcherSection.tsx`: Uses `ActionList`, `ActionListItem`, `Badge`, and `Card`.
- **How to Test**:
  ```bash
  CI=1 yarn --cwd playwright test-cr tests/profile.spec.ts tests/compact-density.spec.ts tests/encryption.spec.ts
  ```

---

## 6. Elevated Dashboard (KPIs, Quick Actions, Card Layout)
- **What Changed**:
  - [`frontend/src/pages/Dashboard.tsx`](./frontend/src/pages/Dashboard.tsx): Added `QuickActionBar` (New Transaction, Accounts, Import, Reports buttons), `DashboardKpis` (Total Accounts, Total Transactions, Active Currencies), and wrapped `RecentTransactions` in a styled `Card` with a "View all →" shortcut.
  - [`frontend/src/pages/report/KpiCard.tsx`](./frontend/src/pages/report/KpiCard.tsx): Upgraded styling with rounded borders and clear typographic hierarchy.
  - [`frontend/src/utils/Language.ts`](./frontend/src/utils/Language.ts): Added 5-language translations (`en`, `pt`, `es`, `hi`, `cn`) for all dashboard elements.
- **How to Test**:
  ```bash
  CI=1 yarn --cwd playwright test-cr tests/dashboard.spec.ts
  ```

---

## 7. Full Test Suite & Lint Verification
To run the entire suite of checks across the repo:

1. **Biome Lint and Format Check**:
   ```bash
   yarn ci
   ```
2. **TypeScript Compilation Check**:
   ```bash
   yarn --cwd frontend build
   # Or root:
   yarn lint
   ```
3. **Full Playwright Chromium Test Suite**:
   ```bash
   CI=1 yarn --cwd playwright test-cr
   ```
   *Expected result: 34 passed, 12 skipped (sync tests that require the live backend container).*
