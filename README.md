# SpendWise

A mobile-first personal expense tracker built with Expo (SDK 55) + React Native, implementing the SpendWise v1.0 designs and PRD.

## Features

- **Home** — month budget hero, needs/wants split, day-grouped transaction list, search + range/category/type filters. Logging while on budget fires confetti.
- **Analytics** — tappable donut breakdown, stat tiles, a 7-day bar chart, and a spending-trend line. Switch period (Week / Month / All).
- **Insights** — savings-potential ring plus data-driven, bookmarkable tip cards.
- **Settings** — theme switch, notification & security toggles, plus sub-screens: editable **Budgets**, pausable **Recurring**, and a working **CSV export**.
- **Quick Add** — center-FAB bottom sheet with a numeric keypad, want/need toggle, and category picker.
- **Three themes** — Mint (default), Midnight, Sunburst — switchable from the Home palette button or Settings, applied app-wide and persisted.
- Data persists locally in **SQLite** (`expo-sqlite`) and seeds default categories, sample expenses and recurring subscriptions on first launch.

## Data layer (SQLite)

The on-device database (`spendwise.db`) implements the PRD §6 data model and §7.2 offline requirement.

```
src/db/
  schema.ts        Table DDL + migrations (versioned via PRAGMA user_version)
  database.ts      Opens the DB, runs migrations, seeds on first launch (singleton)
  seed.ts          Default categories, sample expenses, recurring, preferences
  repositories.ts  Typed CRUD: expenses (incl. soft-delete), recurring, categories, preferences
```

Tables: `categories`, `recurrence_rules`, `expenses` (with soft-delete + receipt link),
`receipt_images`, `recurring_expenses`, and a `preferences` key/value store for app
settings (theme, filters, global budget, notification toggles, saved insights). The store
(`src/store.tsx`) loads from and writes through these repositories.

> Note: PRD §7.3 also calls for AES-256 encryption at rest (e.g. SQLCipher) — not yet wired up.

## Structure

```
src/
  theme.ts                 Theme palettes, ThemeContext, color/format helpers
  utils.ts                 Date/time + percentage helpers
  icons.tsx                react-native-svg icon set
  store.tsx                App state, actions, persistence (StoreProvider/useStore)
  SpendWiseApp.tsx         Root composition (theme + screens + overlays)
  screens/                 Home, Analytics, Insights, Settings, SubScreen
  components/              BottomBar, AddExpenseModal, ThemeSheet, Toast, Confetti, Press, Toggle
```

## Running the app

```sh
npm install
npm start        # then press i (iOS), a (Android), or w (web)
# or
npm run ios
npm run android
```

This project uses an Expo [development build](https://docs.expo.dev/develop/development-builds/introduction/) (it includes `expo-dev-client`), so it cannot run in Expo Go as-is.
