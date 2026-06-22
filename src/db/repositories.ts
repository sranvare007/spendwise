import type { DB } from './database';
import { Expense, Recurring, Category } from '../data';

// ---- Row shapes returned by SQLite ----
interface ExpenseRow {
  id: string;
  amount: number;
  description: string;
  category_id: string;
  classification: 'NEED' | 'WANT';
  date: string;
}
interface RecurringRow {
  id: string;
  name: string;
  category_id: string;
  amount: number;
  frequency: string;
  due_in_days: number;
  is_paused: number;
}
interface CategoryRow {
  id: string;
  name: string;
  short: string;
  icon: string;
  color_hex: string;
  budget_amount: number | null;
}

// Full data for inserting an expense (PRD §6.1). Most fields are optional and defaulted.
export interface NewExpense {
  id: string;
  amount: number;
  desc: string;
  cat: string;
  wn: 'NEED' | 'WANT';
  date: string;
  currency?: string;
  notes?: string | null;
  isRecurring?: boolean;
  recurrenceRuleId?: string | null;
}

// ---------- Expenses ----------
export async function getExpenses(db: DB): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, amount, description, category_id, classification, date
       FROM expenses
      WHERE is_deleted = 0
      ORDER BY date DESC`,
  );
  return rows.map((r) => ({ id: r.id, amount: r.amount, desc: r.description, cat: r.category_id, wn: r.classification, date: r.date }));
}

export async function insertExpense(db: DB, e: NewExpense): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO expenses
       (id, amount, currency, description, category_id, classification, date, notes, is_recurring, recurrence_rule_id, is_deleted, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    e.id, e.amount, e.currency ?? 'INR', e.desc, e.cat, e.wn, e.date,
    e.notes ?? null, e.isRecurring ? 1 : 0, e.recurrenceRuleId ?? null, now, now,
  );
}

// Updates an existing expense's editable fields. The id is preserved; amount,
// description, category, classification and date all change.
export async function updateExpense(db: DB, e: NewExpense): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE expenses
        SET amount = ?, description = ?, category_id = ?, classification = ?, date = ?, updated_at = ?
      WHERE id = ?`,
    e.amount, e.desc, e.cat, e.wn, e.date, now, e.id,
  );
}

// Soft delete per PRD §F-03 (retained for potential undo).
export async function softDeleteExpense(db: DB, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE expenses SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function restoreExpense(db: DB, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE expenses SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?', now, id);
}

// Permanently removes every expense. Unlike softDeleteExpense this is not
// recoverable — used by the "clear data" action in Settings.
export async function clearAllExpenses(db: DB): Promise<void> {
  await db.runAsync('DELETE FROM expenses');
}

// ---------- Recurring subscriptions ----------
export async function getRecurring(db: DB): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    'SELECT id, name, category_id, amount, frequency, due_in_days, is_paused FROM recurring_expenses ORDER BY sort_order ASC',
  );
  return rows.map((r) => ({ id: r.id, name: r.name, cat: r.category_id, amount: r.amount, freq: r.frequency, due: r.due_in_days, paused: r.is_paused === 1 }));
}

export async function setRecurringPaused(db: DB, id: string, paused: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE recurring_expenses SET is_paused = ?, updated_at = ? WHERE id = ?', paused ? 1 : 0, now, id);
}

// Inserts a user-created recurring expense. New entries sort after all existing ones.
export async function insertRecurring(db: DB, r: Recurring): Promise<void> {
  const now = new Date().toISOString();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM recurring_expenses');
  const sortOrder = row?.n ?? 0;
  await db.runAsync(
    `INSERT INTO recurring_expenses
       (id, name, category_id, amount, frequency, due_in_days, is_paused, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.id, r.name, r.cat, r.amount, r.freq, r.due, r.paused ? 1 : 0, sortOrder, now, now,
  );
}

// ---------- Categories ----------
export async function getCategories(db: DB): Promise<(Category & { budget: number | null })[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT id, name, short, icon, color_hex, budget_amount FROM categories ORDER BY sort_order ASC',
  );
  return rows.map((r) => ({ id: r.id, name: r.name, short: r.short, icon: r.icon as Category['icon'], color: r.color_hex, budget: r.budget_amount }));
}

// Inserts a user-created category. New categories sort after all existing ones.
export async function insertCategory(db: DB, c: Category): Promise<void> {
  const now = new Date().toISOString();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories');
  const sortOrder = row?.n ?? 0;
  await db.runAsync(
    `INSERT INTO categories
       (id, name, short, icon, color_hex, is_system, budget_amount, budget_alert_threshold, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, 75, ?, ?, ?)`,
    c.id, c.name, c.short, c.icon, c.color, sortOrder, now, now,
  );
}

// ---------- Preferences (key/value JSON) ----------
export async function getAllPrefs(db: DB): Promise<Record<string, unknown>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM preferences');
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}

export async function setPref(db: DB, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, JSON.stringify(value),
  );
}
