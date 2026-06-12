import type { DB } from './database';
import { CATS, CAT_BUDGETS, DEFAULT_RECURRING, DEFAULT_BUDGET, seedExpenses } from '../data';

// Default preference values written on first launch.
export const DEFAULT_PREFS: Record<string, unknown> = {
  theme: 'mint',
  budget: DEFAULT_BUDGET,
  filter: { range: 'month', cat: 'all', wn: 'all', q: '' },
  settings: { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false },
  savedInsights: { i1: true },
};

// Populates default categories, sample expenses, recurring subscriptions and
// preferences the first time the app runs (when no categories exist yet).
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

    for (let i = 0; i < DEFAULT_RECURRING.length; i++) {
      const r = DEFAULT_RECURRING[i];
      await db.runAsync(
        `INSERT INTO recurring_expenses
          (id, name, category_id, amount, frequency, due_in_days, is_paused, recurrence_rule_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id, r.name, r.cat, r.amount, r.freq, r.due, r.paused ? 1 : 0, null, i, now, now,
      );
    }

    for (const e of seedExpenses()) {
      await db.runAsync(
        `INSERT INTO expenses
          (id, amount, currency, description, category_id, classification, date, notes, is_recurring, recurrence_rule_id, is_deleted, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id, e.amount, 'INR', e.desc, e.cat, e.wn, e.date, null, 0, null, 0, null, e.date, e.date,
      );
    }

    for (const key of Object.keys(DEFAULT_PREFS)) {
      await db.runAsync('INSERT INTO preferences (key, value) VALUES (?, ?)', key, JSON.stringify(DEFAULT_PREFS[key]));
    }
  });
}
