// SpendWise local database schema.
// Models the PRD §6 data objects (Expense, Category, Recurrence Rule) plus
// supporting tables for receipt images, recurring subscriptions and app preferences.
// Migrations are driven by PRAGMA user_version (see database.ts).

export const SCHEMA_VERSION = 3;

// v3 — widen the expenses.classification CHECK to allow 'INVEST'. SQLite cannot alter a
// CHECK constraint in place, so the table is rebuilt (create → copy → drop → rename) per
// the documented 12-step procedure. Exported so the seed safety net can replay it.
// Runs with foreign_keys OFF (see database.ts) — the DROP would otherwise cascade
// receipt_images away.
export const EXPENSES_REBUILD_V3: string[] = [
  `DROP TABLE IF EXISTS expenses_new;`,
  `CREATE TABLE expenses_new (
    id                 TEXT PRIMARY KEY NOT NULL,
    amount             REAL NOT NULL CHECK (amount >= 0),
    currency           TEXT NOT NULL DEFAULT 'INR',
    description        TEXT NOT NULL,
    category_id        TEXT NOT NULL REFERENCES categories(id),
    classification     TEXT NOT NULL CHECK (classification IN ('WANT','NEED','INVEST')),
    date               TEXT NOT NULL,
    notes              TEXT,
    is_recurring       INTEGER NOT NULL DEFAULT 0,
    recurrence_rule_id TEXT REFERENCES recurrence_rules(id),
    account_id         TEXT,
    is_deleted         INTEGER NOT NULL DEFAULT 0,
    deleted_at         TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  );`,
  `INSERT INTO expenses_new
     (id, amount, currency, description, category_id, classification, date, notes,
      is_recurring, recurrence_rule_id, account_id, is_deleted, deleted_at, created_at, updated_at)
   SELECT id, amount, currency, description, category_id, classification, date, notes,
          is_recurring, recurrence_rule_id, account_id, is_deleted, deleted_at, created_at, updated_at
     FROM expenses;`,
  `DROP TABLE expenses;`,
  `ALTER TABLE expenses_new RENAME TO expenses;`,
  // Indexes died with the old table — recreate them.
  `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses (is_deleted, date);`,
];

// Statements applied to move the DB from version 0 (fresh) to SCHEMA_VERSION.
// Each string is a full SQL statement run in order inside a transaction.
export const MIGRATIONS: Record<number, string[]> = {
  1: [
    // 6.2 Category
    `CREATE TABLE IF NOT EXISTS categories (
      id                     TEXT PRIMARY KEY NOT NULL,
      name                   TEXT NOT NULL,
      short                  TEXT NOT NULL,
      icon                   TEXT NOT NULL,
      color_hex              TEXT NOT NULL,
      is_system              INTEGER NOT NULL DEFAULT 0,
      budget_amount          REAL,
      budget_alert_threshold INTEGER NOT NULL DEFAULT 75,
      sort_order             INTEGER NOT NULL DEFAULT 0,
      created_at             TEXT NOT NULL,
      updated_at             TEXT NOT NULL
    );`,

    // 6.3 Recurrence Rule
    `CREATE TABLE IF NOT EXISTS recurrence_rules (
      id            TEXT PRIMARY KEY NOT NULL,
      frequency     TEXT NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','ANNUALLY')),
      start_date    TEXT NOT NULL,
      end_date      TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      next_due_date TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );`,

    // 6.1 Expense
    `CREATE TABLE IF NOT EXISTS expenses (
      id                 TEXT PRIMARY KEY NOT NULL,
      amount             REAL NOT NULL CHECK (amount >= 0),
      currency           TEXT NOT NULL DEFAULT 'INR',
      description        TEXT NOT NULL,
      category_id        TEXT NOT NULL REFERENCES categories(id),
      classification     TEXT NOT NULL CHECK (classification IN ('WANT','NEED')),
      date               TEXT NOT NULL,
      notes              TEXT,
      is_recurring       INTEGER NOT NULL DEFAULT 0,
      recurrence_rule_id TEXT REFERENCES recurrence_rules(id),
      is_deleted         INTEGER NOT NULL DEFAULT 0,
      deleted_at         TEXT,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );`,

    // 6.1 receipt_image_ids — one row per attached image
    `CREATE TABLE IF NOT EXISTS receipt_images (
      id         TEXT PRIMARY KEY NOT NULL,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      uri        TEXT NOT NULL,
      width      INTEGER,
      height     INTEGER,
      size_bytes INTEGER,
      created_at TEXT NOT NULL
    );`,

    // Recurring subscriptions/bills shown in Settings → Recurring.
    `CREATE TABLE IF NOT EXISTS recurring_expenses (
      id                 TEXT PRIMARY KEY NOT NULL,
      name               TEXT NOT NULL,
      category_id        TEXT NOT NULL REFERENCES categories(id),
      amount             REAL NOT NULL CHECK (amount >= 0),
      frequency          TEXT NOT NULL,
      due_in_days        INTEGER NOT NULL DEFAULT 0,
      is_paused          INTEGER NOT NULL DEFAULT 0,
      recurrence_rule_id TEXT REFERENCES recurrence_rules(id),
      sort_order         INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );`,

    // Key/value store for app preferences (theme, filters, global budget, toggles, saved insights).
    `CREATE TABLE IF NOT EXISTS preferences (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,

    // Indexes for the common list/summary queries.
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses (is_deleted, date);`,
    `CREATE INDEX IF NOT EXISTS idx_receipts_expense ON receipt_images (expense_id);`,
  ],

  // v2 — payment sources (credit cards, bank accounts, cash, etc.) and the link from
  // an expense to the source it was paid through.
  2: [
    `CREATE TABLE IF NOT EXISTS payment_accounts (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      color_hex  TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `ALTER TABLE expenses ADD COLUMN account_id TEXT;`,
  ],

  // v3 — allow the 'INVEST' classification alongside WANT/NEED.
  3: EXPENSES_REBUILD_V3,
};
