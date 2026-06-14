import type { DB } from './database';
import { CATS, CAT_BUDGETS, DEFAULT_BUDGET } from '../data';

// Default preference values written on first launch.
export const DEFAULT_PREFS: Record<string, unknown> = {
  theme: 'mint',
  budget: DEFAULT_BUDGET,
  filter: { range: 'month', cat: 'all', wn: 'all', q: '' },
  settings: { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false },
  savedInsights: { i1: true },
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
