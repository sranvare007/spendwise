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
  { id: 'groceries', name: 'Groceries', short: 'Grocery', color: '#34B36B', icon: 'cart' },
  { id: 'transport', name: 'Transport', short: 'Transport', color: '#4C9AFF', icon: 'transport' },
  { id: 'shopping', name: 'Shopping', short: 'Shopping', color: '#C77DFF', icon: 'shopping' },
  { id: 'entertainment', name: 'Entertainment', short: 'Fun', color: '#FF5C9D', icon: 'ent' },
  { id: 'health', name: 'Health', short: 'Health', color: '#2BD4A8', icon: 'health' },
  { id: 'utilities', name: 'Utilities', short: 'Bills', color: '#FFB23E', icon: 'utilities' },
  { id: 'housing', name: 'Housing', short: 'Home', color: '#5B8DEF', icon: 'housing' },
  { id: 'travel', name: 'Travel', short: 'Travel', color: '#21C0CE', icon: 'travel' },
  { id: 'personal', name: 'Personal Care', short: 'Personal', color: '#FF8FB1', icon: 'personal' },
  { id: 'education', name: 'Education', short: 'Education', color: '#8C7BFF', icon: 'education' },
  { id: 'fuel', name: 'Fuel', short: 'Fuel', color: '#5BC47C', icon: 'fuel' },
  { id: 'other', name: 'Other', short: 'Other', color: '#9AA7B2', icon: 'other' },
];

// Per-category monthly budget limits (also seeded into categories.budget_amount).
export const CAT_BUDGETS: Record<string, number> = {
  food: 6000, transport: 2000, shopping: 2500, entertainment: 1500, utilities: 3000, health: 2000,
};

export const DEFAULT_BUDGET = 15000;

// Accent colors offered when creating a custom category.
export const CATEGORY_COLORS: string[] = [
  // Reds / pinks
  '#FF5A5A', '#FF7A5C', '#FF6B9D', '#FF5C9D', '#FF8FB1', '#E0457B',
  // Purples / violets
  '#C77DFF', '#A66BFF', '#8C7BFF', '#7C5CFF', '#6C63FF',
  // Blues
  '#5B8DEF', '#4C9AFF', '#3B82F6', '#2D6CDF', '#21C0CE',
  // Teals / greens
  '#17C3B2', '#2BD4A8', '#07CB73', '#2EB872', '#5BC47C', '#9BD45B',
  // Yellows / oranges / browns
  '#F4C20D', '#FFB23E', '#FF9F1C', '#F2784B', '#B5784F', '#9AA7B2',
];

// Live registry of all categories (system + custom). The store replaces this
// once categories are loaded from SQLite so synchronous catById() lookups in
// render paths resolve custom categories too — without prop-drilling everywhere.
let REGISTRY: Category[] = [...CATS];

export function setCategoryRegistry(cats: Category[]): void {
  if (cats.length) REGISTRY = cats;
}

export function catById(id: string): Category {
  return REGISTRY.find((c) => c.id === id)
    || REGISTRY.find((c) => c.id === 'other')
    || REGISTRY[REGISTRY.length - 1];
}
