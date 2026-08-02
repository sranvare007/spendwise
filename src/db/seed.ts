import type { DB } from './database';
import { CATS, CAT_BUDGETS, DEFAULT_BUDGET } from '../data';
import { EXPENSES_REBUILD_V3 } from './schema';

// Default preference values written on first launch.
export const DEFAULT_PREFS: Record<string, unknown> = {
  theme: 'mint',
  budget: DEFAULT_BUDGET,
  filter: { range: 'month', cat: 'all', wn: 'all', q: '' },
  settings: { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false, investInBudget: true },
  savedInsights: { i1: true },
  onboarded: false,
  profile: { name: '' },
};

// Populates default categories and preferences the first time the app runs
// (when no categories exist yet).
export async function seedIfEmpty(db: DB): Promise<void> {
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (count && count.n > 0) return;

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < CATS.length; i++) {
      const c = CATS[i];
      const budget = CAT_BUDGETS[c.id] ?? null;
      await db.runAsync(
        `INSERT INTO categories
          (id, name, short, icon, color_hex, is_system, budget_amount, budget_alert_threshold, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id, c.name, c.short, c.icon, c.color, 1, budget, 75, i, now, now,
      );
    }

    for (const key of Object.keys(DEFAULT_PREFS)) {
      await db.runAsync('INSERT INTO preferences (key, value) VALUES (?, ?)', key, JSON.stringify(DEFAULT_PREFS[key]));
    }
  });
}

// Inserts any default category (from CATS) that isn't already present.
// Runs on every launch so new default categories reach existing installs
// without a destructive reseed. Idempotent — skips ids that already exist and
// leaves user-created categories untouched.
export async function ensureDefaultCategories(db: DB): Promise<void> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM categories');
  const existing = new Set(rows.map((r) => r.id));
  const missing = CATS.filter((c) => !existing.has(c.id));
  if (missing.length === 0) return;

  const now = new Date().toISOString();
  const startRow = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories');
  let sort = startRow?.n ?? 0;

  await db.withTransactionAsync(async () => {
    for (const c of missing) {
      const budget = CAT_BUDGETS[c.id] ?? null;
      await db.runAsync(
        `INSERT INTO categories
          (id, name, short, icon, color_hex, is_system, budget_amount, budget_alert_threshold, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, 75, ?, ?, ?)`,
        c.id, c.name, c.short, c.icon, c.color, budget, sort++, now, now,
      );
    }
  });
}

// Idempotent safety net for the payment-source schema. Runs on every launch so the
// payment_accounts table and expenses.account_id column are guaranteed to exist even if
// the versioned migration didn't land (e.g. a partial/interrupted migration). Cheap —
// CREATE IF NOT EXISTS plus a single PRAGMA check.
export async function ensurePaymentSchema(db: DB): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS payment_accounts (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      color_hex  TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  );
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
  if (!cols.some((c) => c.name === 'account_id')) {
    await db.execAsync('ALTER TABLE expenses ADD COLUMN account_id TEXT;');
  }
}

// Idempotent safety net for the three-way spend classification. The original CHECK
// constraint only allowed WANT/NEED, so an install whose v3 migration didn't land would
// reject every investment expense at insert time. Cheap — one sqlite_master read.
// Must run after ensurePaymentSchema(), since the rebuild copies account_id across.
export async function ensureClassificationSchema(db: DB): Promise<void> {
  const row = await db.getFirstAsync<{ sql: string | null }>(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'expenses'`,
  );
  if (!row?.sql || row.sql.includes('INVEST')) return;

  await db.withTransactionAsync(async () => {
    for (const sql of EXPENSES_REBUILD_V3) await db.execAsync(sql);
  });
}
