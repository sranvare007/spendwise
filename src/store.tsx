import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Share, AppState } from 'react-native';
import { ThemeKey } from './theme';
import { getBiometricCapability, runAuth, AuthOutcome } from './biometric';
import { monthKey } from './utils';
import { Expense, Recurring, Draft, Category, DEFAULT_BUDGET, catById, CATS, setCategoryRegistry } from './data';
import { IconName } from './icons';
import { getDatabase } from './db/database';
import {
  getExpenses, insertExpense, updateExpense, softDeleteExpense, clearAllExpenses, getRecurring, setRecurringPaused,
  getAllPrefs, setPref, getCategories, insertCategory,
} from './db/repositories';

// Re-export shared data so existing screen imports keep working.
export { CATS, CAT_BUDGETS, CATEGORY_COLORS, catById, DEFAULT_BUDGET } from './data';
export type { Category, Expense, Recurring, Draft } from './data';

export interface NewCategoryInput { name: string; icon: IconName; color: string; }

export interface Settings {
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
  biometric: boolean;
}

export type RangeKey = 'today' | 'week' | 'month' | 'all';
export type Period = 'week' | 'month' | '6m';
export interface Filter { range: RangeKey; cat: string; wn: 'all' | 'NEED' | 'WANT'; q: string; }
export interface Toast { msg: string; tone: 'good' | 'warn' | 'bad'; }

// Fresh draft for a new entry — date defaults to "now" so an untouched draft logs today.
const freshDraft = (): Draft => ({ amount: '', desc: '', cat: null, wn: 'NEED', date: new Date().toISOString() });
const DEFAULT_SETTINGS: Settings = { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false };
const DEFAULT_FILTER: Filter = { range: 'month', cat: 'all', wn: 'all', q: '' };

// Fire-and-forget DB write; failures never block the UI.
function writeDb(fn: (db: Awaited<ReturnType<typeof getDatabase>>) => Promise<void>) {
  getDatabase().then(fn).catch(() => {});
}

interface StoreValue {
  ready: boolean;
  expenses: Expense[];
  categories: Category[];
  filter: Filter;
  theme: ThemeKey;
  budget: number;
  draft: Draft;
  editingId: string | null;
  analyticsPeriod: Period;
  donutCat: string | null;
  settings: Settings;
  savedInsights: Record<string, boolean>;
  recurring: Recurring[];
  toast: Toast | null;
  confettiKey: number;
  locked: boolean;
  setFilter: (patch: Partial<Filter>) => void;
  beginNewExpense: () => void;
  beginEditExpense: (id: string) => void;
  resetExpenseEntry: () => void;
  setTheme: (k: ThemeKey) => void;
  setDraft: (patch: Partial<Draft>) => void;
  pressKey: (d: string) => void;
  delKey: () => void;
  saveExpense: () => boolean;
  deleteExpense: (id: string) => void;
  clearExpenses: () => void;
  addCategory: (input: NewCategoryInput) => void;
  toggleSetting: (key: keyof Settings) => void;
  setBiometric: (enabled: boolean) => void;
  requestUnlock: () => Promise<AuthOutcome>;
  changeBudget: (delta: number) => void;
  toggleRecur: (id: string) => void;
  toggleInsight: (id: string) => void;
  setAnalyticsPeriod: (p: Period) => void;
  setDonutCat: (id: string | null) => void;
  exportCsv: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);
export const useStore = () => {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATS);
  const [filter, setFilterState] = useState<Filter>(DEFAULT_FILTER);
  const [theme, setThemeState] = useState<ThemeKey>('mint');
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [draft, setDraftState] = useState<Draft>(freshDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<Period>('month');
  const [donutCat, setDonutCat] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedInsights, setSavedInsights] = useState<Record<string, boolean>>({ i1: true });
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [locked, setLocked] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors settings.biometric for the AppState listener (avoids stale closures).
  const biometricRef = useRef(false);

  // ---- load from SQLite ----
  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const [exp, rec, prefs, cats] = await Promise.all([getExpenses(db), getRecurring(db), getAllPrefs(db), getCategories(db)]);
        setExpenses(exp);
        setRecurring(rec);
        if (cats.length) { setCategories(cats); setCategoryRegistry(cats); }
        if (prefs.theme) setThemeState(prefs.theme as ThemeKey);
        if (typeof prefs.budget === 'number') setBudget(prefs.budget);
        if (prefs.filter) setFilterState({ ...DEFAULT_FILTER, ...(prefs.filter as Filter) });
        const loadedSettings = prefs.settings ? { ...DEFAULT_SETTINGS, ...(prefs.settings as Settings) } : DEFAULT_SETTINGS;
        setSettings(loadedSettings);
        biometricRef.current = loadedSettings.biometric;
        // Lock on cold start when the biometric lock is enabled.
        if (loadedSettings.biometric) setLocked(true);
        if (prefs.savedInsights) setSavedInsights(prefs.savedInsights as Record<string, boolean>);
      } catch {
        // leave defaults; UI still functions
      }
      setReady(true);
    })();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  // ---- re-lock when the app is sent to the background ----
  // Only 'background' (not 'inactive') so the system biometric prompt — which
  // briefly makes the app inactive — does not itself trigger a re-lock.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && biometricRef.current) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  const setFilter = useCallback((patch: Partial<Filter>) => {
    setFilterState((f) => { const next = { ...f, ...patch }; writeDb((db) => setPref(db, 'filter', next)); return next; });
  }, []);

  const showToast = useCallback((msg: string, tone: Toast['tone']) => {
    setToast({ msg, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const setTheme = useCallback((k: ThemeKey) => {
    setThemeState(k); writeDb((db) => setPref(db, 'theme', k));
  }, []);

  const setDraft = useCallback((patch: Partial<Draft>) => {
    setDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const pressKey = useCallback((d: string) => {
    setDraftState((s) => {
      let a = s.amount;
      if (d === '.') {
        if (a.includes('.')) return s;
        if (a === '') a = '0';
        a = a + '.';
      } else {
        const p = a.split('.');
        if (p[1] && p[1].length >= 2) return s;
        if (a.replace('.', '').length >= 8) return s;
        a = a + d;
      }
      return { ...s, amount: a };
    });
  }, []);

  const delKey = useCallback(() => {
    setDraftState((s) => ({ ...s, amount: s.amount.slice(0, -1) }));
  }, []);

  // Returns true when the entry was committed (or the edit target vanished) so the
  // caller can dismiss the modal; returns false on validation failure so it stays open.
  const saveExpense = useCallback((): boolean => {
    const amt = Number(draft.amount);
    if (!amt || amt <= 0 || !draft.desc.trim() || !draft.cat) return false;

    // Edit path: keep id and original date, update the rest in place.
    if (editingId) {
      const orig = expenses.find((e) => e.id === editingId);
      if (!orig) return true;
      const updated: Expense = { ...orig, amount: amt, desc: draft.desc.trim(), cat: draft.cat, wn: draft.wn, date: draft.date };
      setExpenses((arr) => arr.map((e) => (e.id === editingId ? updated : e)));
      writeDb((db) => updateExpense(db, { ...updated, currency: 'INR' }));
      showToast('Expense updated.', 'good');
      return true;
    }

    const exp: Expense = {
      id: 'u' + Date.now(), amount: amt, desc: draft.desc.trim(), cat: draft.cat, wn: draft.wn, date: draft.date,
    };
    const next = [exp, ...expenses];
    setExpenses(next);
    writeDb((db) => insertExpense(db, { ...exp, currency: 'INR' }));

    const tm = monthKey(new Date().toISOString());
    const spent = next.filter((e) => monthKey(e.date) === tm).reduce((s, e) => s + e.amount, 0);
    const pct = spent / budget;
    if (pct < 0.75) {
      setConfettiKey((k) => k + 1);
      showToast('Logged! Still on track — nice work.', 'good');
    } else if (pct < 0.95) {
      showToast('Logged. Heads up — ' + Math.round(pct * 100) + '% of budget used.', 'warn');
    } else {
      showToast('Logged. You are over your monthly budget.', 'bad');
    }
    return true;
  }, [draft, expenses, budget, showToast, editingId]);

  // Prime the draft for a brand-new entry; the caller then navigates to the modal.
  const beginNewExpense = useCallback(() => {
    setDraftState(freshDraft());
    setEditingId(null);
  }, []);

  // Prime the draft from an existing expense for editing; the caller then navigates.
  const beginEditExpense = useCallback((id: string) => {
    const e = expenses.find((x) => x.id === id);
    if (!e) return;
    setDraftState({ amount: String(e.amount), desc: e.desc, cat: e.cat, wn: e.wn, date: e.date });
    setEditingId(id);
  }, [expenses]);

  // Clear draft + edit target when the modal screen unmounts.
  const resetExpenseEntry = useCallback(() => {
    setEditingId(null);
    setDraftState(freshDraft());
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((arr) => arr.filter((e) => e.id !== id));
    writeDb((db) => softDeleteExpense(db, id));
    showToast('Expense deleted.', 'warn');
  }, [showToast]);

  const clearExpenses = useCallback(() => {
    setExpenses((arr) => {
      if (arr.length === 0) {
        showToast('No expenses to clear.', 'warn');
        return arr;
      }
      writeDb((db) => clearAllExpenses(db));
      showToast('Cleared ' + arr.length + ' expenses.', 'warn');
      return [];
    });
  }, [showToast]);

  const addCategory = useCallback((input: NewCategoryInput) => {
    const name = input.name.trim();
    if (!name) return;
    const short = (name.split(/\s+/)[0] || name).slice(0, 12);
    const cat: Category = { id: 'c' + Date.now(), name, short, color: input.color, icon: input.icon };
    setCategories((arr) => { const next = [...arr, cat]; setCategoryRegistry(next); return next; });
    writeDb((db) => insertCategory(db, cat));
    showToast('Category "' + name + '" added.', 'good');
  }, [showToast]);

  const toggleSetting = useCallback((key: keyof Settings) => {
    setSettings((s) => { const next = { ...s, [key]: !s[key] }; writeDb((db) => setPref(db, 'settings', next)); return next; });
  }, []);

  const persistBiometric = useCallback((on: boolean) => {
    biometricRef.current = on;
    setSettings((s) => { const next = { ...s, biometric: on }; writeDb((db) => setPref(db, 'settings', next)); return next; });
  }, []);

  // Toggle the biometric lock. Enabling requires a successful auth so we never
  // lock the user out behind a sensor they cannot pass.
  const setBiometric = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      persistBiometric(false);
      setLocked(false);
      showToast('Biometric lock disabled.', 'warn');
      return;
    }
    const cap = await getBiometricCapability();
    if (!cap.available) {
      showToast(cap.reason ?? 'Biometric lock is unavailable on this device.', 'bad');
      return;
    }
    const auth = await runAuth(`Enable ${cap.label} lock`);
    if (!auth.ok) {
      showToast(auth.message ?? 'Could not enable biometric lock.', 'warn');
      return;
    }
    persistBiometric(true);
    showToast(`${cap.label} lock enabled.`, 'good');
  }, [persistBiometric, showToast]);

  // Called from the lock screen. If biometrics were removed in OS settings after
  // the lock was enabled we fail OPEN (unlock + disable) so local data is never
  // permanently trapped — there is no remote secret to protect here.
  const requestUnlock = useCallback(async (): Promise<AuthOutcome> => {
    const cap = await getBiometricCapability();
    if (!cap.available) {
      persistBiometric(false);
      setLocked(false);
      showToast(cap.reason ?? 'Biometrics unavailable — lock turned off.', 'warn');
      return { ok: true };
    }
    const auth = await runAuth('Unlock SpendWise');
    if (auth.ok) setLocked(false);
    return auth;
  }, [persistBiometric, showToast]);

  const changeBudget = useCallback((delta: number) => {
    setBudget((b) => { const next = Math.max(1000, b + delta); writeDb((db) => setPref(db, 'budget', next)); return next; });
  }, []);

  const toggleRecur = useCallback((id: string) => {
    setRecurring((r) => {
      const next = r.map((x) => (x.id === id ? { ...x, paused: !x.paused } : x));
      const target = next.find((x) => x.id === id);
      if (target) writeDb((db) => setRecurringPaused(db, id, target.paused));
      return next;
    });
  }, []);

  const toggleInsight = useCallback((id: string) => {
    setSavedInsights((s) => { const next = { ...s, [id]: !s[id] }; writeDb((db) => setPref(db, 'savedInsights', next)); return next; });
  }, []);

  const exportCsv = useCallback(() => {
    const rows = [['Date', 'Time', 'Description', 'Category', 'Amount', 'Currency', 'Want/Need', 'Recurring']];
    expenses.forEach((e) => {
      const d = new Date(e.date);
      rows.push([
        d.toLocaleDateString(), d.toLocaleTimeString(), '"' + e.desc.replace(/"/g, '""') + '"',
        catById(e.cat).name, String(e.amount), 'INR', e.wn === 'NEED' ? 'Need' : 'Want', 'N',
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    Share.share({ message: csv, title: 'SpendWise export' }).catch(() => {});
    showToast('Exported ' + expenses.length + ' records to CSV.', 'good');
  }, [expenses, showToast]);

  const value: StoreValue = {
    ready, expenses, categories, filter, theme, budget, draft, editingId,
    analyticsPeriod, donutCat, settings, savedInsights, recurring, toast, confettiKey, locked,
    setFilter,
    beginNewExpense, beginEditExpense, resetExpenseEntry,
    setTheme, setDraft, pressKey, delKey, saveExpense, deleteExpense, clearExpenses, addCategory, toggleSetting,
    setBiometric, requestUnlock, changeBudget,
    toggleRecur, toggleInsight, setAnalyticsPeriod, setDonutCat, exportCsv,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
