import { IconName } from './icons';

export interface Category {
  id: string;
  name: string;
  short: string;
  color: string;
  icon: IconName;
}

export interface Expense {
  id: string;
  amount: number;
  desc: string;
  cat: string;
  wn: 'NEED' | 'WANT';
  date: string;
}

export interface Recurring {
  id: string;
  name: string;
  cat: string;
  amount: number;
  freq: string;
  due: number;
  paused: boolean;
}

export interface Draft {
  amount: string;
  desc: string;
  cat: string | null;
  wn: 'NEED' | 'WANT';
}

export const CATS: Category[] = [
  { id: 'food', name: 'Food & Dining', short: 'Food', color: '#FF7A5C', icon: 'food' },
  { id: 'transport', name: 'Transport', short: 'Transport', color: '#4C9AFF', icon: 'transport' },
  { id: 'shopping', name: 'Shopping', short: 'Shopping', color: '#C77DFF', icon: 'shopping' },
  { id: 'entertainment', name: 'Entertainment', short: 'Fun', color: '#FF5C9D', icon: 'ent' },
  { id: 'health', name: 'Health', short: 'Health', color: '#2BD4A8', icon: 'health' },
  { id: 'utilities', name: 'Utilities', short: 'Bills', color: '#FFB23E', icon: 'utilities' },
  { id: 'housing', name: 'Housing', short: 'Home', color: '#5B8DEF', icon: 'housing' },
  { id: 'travel', name: 'Travel', short: 'Travel', color: '#21C0CE', icon: 'travel' },
  { id: 'personal', name: 'Personal Care', short: 'Personal', color: '#FF8FB1', icon: 'personal' },
  { id: 'education', name: 'Education', short: 'Education', color: '#8C7BFF', icon: 'education' },
  { id: 'other', name: 'Other', short: 'Other', color: '#9AA7B2', icon: 'other' },
];

// Per-category monthly budget limits (also seeded into categories.budget_amount).
export const CAT_BUDGETS: Record<string, number> = {
  food: 6000, transport: 2000, shopping: 2500, entertainment: 1500, utilities: 3000, health: 2000,
};

export const DEFAULT_RECURRING: Recurring[] = [
  { id: 'r1', name: 'Netflix', cat: 'entertainment', amount: 649, freq: 'Monthly', due: 3, paused: false },
  { id: 'r2', name: 'Spotify', cat: 'entertainment', amount: 119, freq: 'Monthly', due: 8, paused: false },
  { id: 'r3', name: 'Gym membership', cat: 'health', amount: 1500, freq: 'Monthly', due: 1, paused: false },
  { id: 'r4', name: 'House rent', cat: 'housing', amount: 18000, freq: 'Monthly', due: 5, paused: false },
  { id: 'r5', name: 'Broadband', cat: 'utilities', amount: 799, freq: 'Monthly', due: 12, paused: true },
];

export const DEFAULT_BUDGET = 15000;

export function catById(id: string): Category {
  return CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
}

// Sample expenses for first launch.
export function seedExpenses(): Expense[] {
  const now = new Date();
  const at = (off: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - off);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  let id = 0;
  const mk = (a: number, desc: string, c: string, wn: 'NEED' | 'WANT', date: string): Expense =>
    ({ id: 's' + id++, amount: a, desc, cat: c, wn, date });
  return [
    mk(180, 'Morning latte', 'food', 'WANT', at(0, 8, 20)),
    mk(85, 'Auto to office', 'transport', 'NEED', at(0, 9, 40)),
    mk(260, 'Team lunch', 'food', 'NEED', at(0, 13, 15)),
    mk(1240, 'Weekly groceries', 'food', 'NEED', at(1, 18, 30)),
    mk(600, 'Movie tickets', 'entertainment', 'WANT', at(1, 20, 5)),
    mk(499, 'Phone recharge', 'utilities', 'NEED', at(1, 11, 0)),
    mk(119, 'Spotify', 'entertainment', 'WANT', at(2, 7, 0)),
    mk(430, 'Dinner delivery', 'food', 'WANT', at(2, 21, 10)),
    mk(899, 'New running tee', 'shopping', 'WANT', at(3, 16, 45)),
    mk(1500, 'Gym membership', 'health', 'NEED', at(4, 7, 30)),
    mk(2100, 'Electricity bill', 'utilities', 'NEED', at(5, 10, 0)),
    mk(260, 'Uber home', 'transport', 'NEED', at(6, 22, 0)),
  ];
}
