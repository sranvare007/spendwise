import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Share, AppState } from 'react-native';
import { ThemeKey } from './theme';
import { getBiometricCapability, runAuth, AuthOutcome } from './biometric';
import { monthKey, dayKey, splitInstallments } from './utils';
import { Expense, Recurring, Draft, Category, Classification, PaymentSource, PaymentType, DEFAULT_BUDGET, catById, CATS, setCategoryRegistry, wnLabel, budgetSpend } from './data';
import { IconName } from './icons';
import { getDatabase } from './db/database';
import {
  getExpenses, insertExpense, updateExpense, softDeleteExpense, clearAllExpenses, getRecurring, setRecurringPaused,
  insertRecurring, getAllPrefs, setPref, getCategories, insertCategory,
  getPaymentAccounts, insertPaymentAccount, deletePaymentAccount,
} from './db/repositories';

// Re-export shared data so existing screen imports keep working.
export { CATS, CAT_BUDGETS, CATEGORY_COLORS, catById, DEFAULT_BUDGET, PAYMENT_TYPES, paymentTypeMeta, CLASSIFICATIONS, INVEST_COLOR, wnLabel, budgetSpend } from './data';
export type { Category, Expense, Recurring, Draft, Classification, PaymentSource, PaymentType } from './data';

export interface NewCategoryInput { name: string; icon: IconName; color: string; }
export interface NewRecurringInput { name: string; cat: string; amount: number; freq: string; due: number; }
export interface NewPaymentInput { name: string; type: PaymentType; color: string; }
export interface ProfileInput { name: string; budget: number; theme: ThemeKey; }

export interface Settings {
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
  biometric: boolean;
  // Whether INVEST expenses count against the monthly budget, or are tracked beside it.
  investInBudget: boolean;
}

export type RangeKey = 'today' | 'week' | 'month' | 'all';
export type Period = 'week' | 'month' | '6m';
export interface Filter { range: RangeKey; cat: string; wn: 'all' | Classification; q: string; }
export interface Toast { msg: string; tone: 'good' | 'warn' | 'bad'; }

// Fresh draft for a new entry — date defaults to "now" so an untouched draft logs today.
const freshDraft = (): Draft => ({ amount: '', desc: '', cat: null, wn: 'NEED', date: new Date().toISOString(), account: null, splitMonths: 1 });
const DEFAULT_SETTINGS: Settings = { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false, investInBudget: true };
const DEFAULT_FILTER: Filter = { range: 'month', cat: 'all', wn: 'all', q: '' };

// Fire-and-forget DB write; failures never block the UI.
function writeDb(fn: (db: Awaited<ReturnType<typeof getDatabase>>) => Promise<void>) {
  getDatabase().then(fn).catch(() => {});
}

interface StoreValue {
  ready: boolean;
  expenses: Expense[];
  categories: Category[];
  accounts: PaymentSource[];
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
  onboarded: boolean;
  profileName: string;
  setFilter: (patch: Partial<Filter>) => void;
  saveProfile: (input: ProfileInput) => void;
  completeOnboarding: (input: ProfileInput) => void;
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
  addRecurring: (input: NewRecurringInput) => void;
  addPaymentSource: (input: NewPaymentInput) => PaymentSource;
  deletePaymentSource: (id: string) => void;
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
  const [allExpenses, setExpenses] = useState<Expense[]>([]);
  // Split installments are stored up front with future dates; screens only see rows dated
  // today or earlier, so each installment shows up when its month arrives. The cutoff is
  // refreshed on foreground so an app left open across midnight picks up new ones.
  const [todayKey, setTodayKey] = useState(() => dayKey(new Date().toISOString()));
  const expenses = useMemo(() => allExpenses.filter((e) => dayKey(e.date) <= todayKey), [allExpenses, todayKey]);
  const [categories, setCategories] = useState<Category[]>(CATS);
  const [accounts, setAccounts] = useState<PaymentSource[]>([]);
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
  const [onboarded, setOnboarded] = useState(false);
  const [profileName, setProfileName] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors settings.biometric for the AppState listener (avoids stale closures).
  const biometricRef = useRef(false);

  // ---- load from SQLite ----
  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const [exp, rec, prefs, cats, accts] = await Promise.all([getExpenses(db), getRecurring(db), getAllPrefs(db), getCategories(db), getPaymentAccounts(db)]);
        setExpenses(exp);
        setRecurring(rec);
        setAccounts(accts);
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
        if (prefs.onboarded === true) setOnboarded(true);
        const savedName = (prefs.profile as { name?: string } | undefined)?.name;
        if (typeof savedName === 'string') setProfileName(savedName);
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
      if (next === 'active') setTodayKey(dayKey(new Date().toISOString()));
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
      const orig = allExpenses.find((e) => e.id === editingId);
      if (!orig) return true;
      const updated: Expense = { ...orig, amount: amt, desc: draft.desc.trim(), cat: draft.cat, wn: draft.wn, date: draft.date, account: draft.account };
      setExpenses((arr) => arr.map((e) => (e.id === editingId ? updated : e)));
      writeDb((db) => updateExpense(db, { ...updated, currency: 'INR' }));
      showToast('Expense updated.', 'good');
      return true;
    }

    // New entry: one row per month. A split writes independent installments tagged "(i/N)",
    // so each can later be edited or deleted on its own.
    const desc = draft.desc.trim();
    const cat = draft.cat;
    const months = Math.max(1, Math.floor(draft.splitMonths));
    const stamp = Date.now();
    const created: Expense[] = splitInstallments(amt, months, draft.date).map((p, i) => ({
      id: months > 1 ? `u${stamp}-${i + 1}` : 'u' + stamp,
      amount: p.amount,
      desc: months > 1 ? `${desc} (${i + 1}/${months})` : desc,
      cat, wn: draft.wn, date: p.date, account: draft.account,
    }));
    const next = [...created, ...allExpenses];
    setExpenses(next);
    writeDb(async (db) => { for (const e of created) await insertExpense(db, { ...e, currency: 'INR' }); });

    const tm = monthKey(new Date().toISOString());
    const spent = budgetSpend(next.filter((e) => monthKey(e.date) === tm), settings.investInBudget);
    const pct = spent / budget;
    const lead = months > 1 ? `Split over ${months} months` : 'Logged';
    if (pct < 0.75) {
      setConfettiKey((k) => k + 1);
      showToast(lead + '! Still on track — nice work.', 'good');
    } else if (pct < 0.95) {
      showToast(lead + '. Heads up — ' + Math.round(pct * 100) + '% of budget used.', 'warn');
    } else {
      showToast(lead + '. You are over your monthly budget.', 'bad');
    }
    return true;
  }, [draft, allExpenses, budget, showToast, editingId, settings.investInBudget]);

  // Prime the draft for a brand-new entry; the caller then navigates to the modal.
  const beginNewExpense = useCallback(() => {
    setDraftState(freshDraft());
    setEditingId(null);
  }, []);

  // Prime the draft from an existing expense for editing; the caller then navigates.
  const beginEditExpense = useCallback((id: string) => {
    const e = allExpenses.find((x) => x.id === id);
    if (!e) return;
    setDraftState({ amount: String(e.amount), desc: e.desc, cat: e.cat, wn: e.wn, date: e.date, account: e.account ?? null, splitMonths: 1 });
    setEditingId(id);
  }, [allExpenses]);

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

  // Shared write path for the profile details captured in onboarding and the editor.
  const persistProfile = useCallback((input: ProfileInput) => {
    const name = input.name.trim();
    const budget = Math.max(1000, Math.round(input.budget) || DEFAULT_BUDGET);
    setProfileName(name);
    setBudget(budget);
    setThemeState(input.theme);
    writeDb((db) => setPref(db, 'profile', { name }));
    writeDb((db) => setPref(db, 'budget', budget));
    writeDb((db) => setPref(db, 'theme', input.theme));
  }, []);

  // Edit path — persists and confirms with a toast (no onboarding side effects).
  const saveProfile = useCallback((input: ProfileInput) => {
    persistProfile(input);
    showToast('Profile updated.', 'good');
  }, [persistProfile, showToast]);

  // First-run path — persists the same details and marks onboarding complete, which
  // swaps the navigator from the onboarding flow into the app.
  const completeOnboarding = useCallback((input: ProfileInput) => {
    persistProfile(input);
    setOnboarded(true);
    writeDb((db) => setPref(db, 'onboarded', true));
  }, [persistProfile]);

  const toggleRecur = useCallback((id: string) => {
    setRecurring((r) => {
      const next = r.map((x) => (x.id === id ? { ...x, paused: !x.paused } : x));
      const target = next.find((x) => x.id === id);
      if (target) writeDb((db) => setRecurringPaused(db, id, target.paused));
      return next;
    });
  }, []);

  const addRecurring = useCallback((input: NewRecurringInput) => {
    const name = input.name.trim();
    if (!name || !input.cat || !(input.amount > 0)) return;
    const r: Recurring = {
      id: 'r' + Date.now(), name, cat: input.cat, amount: input.amount,
      freq: input.freq, due: Math.max(0, Math.round(input.due) || 0), paused: false,
    };
    setRecurring((arr) => [...arr, r]);
    writeDb((db) => insertRecurring(db, r));
    showToast('Recurring "' + name + '" added.', 'good');
  }, [showToast]);

  // Creates a payment source and returns it so callers (e.g. the Add-Expense modal)
  // can immediately select the new source. Name is required.
  const addPaymentSource = useCallback((input: NewPaymentInput): PaymentSource => {
    const s: PaymentSource = { id: 'p' + Date.now(), name: input.name.trim(), type: input.type, color: input.color };
    setAccounts((arr) => [...arr, s]);
    writeDb((db) => insertPaymentAccount(db, s));
    showToast('Payment source "' + s.name + '" added.', 'good');
    return s;
  }, [showToast]);

  const deletePaymentSource = useCallback((id: string) => {
    setAccounts((arr) => arr.filter((s) => s.id !== id));
    writeDb((db) => deletePaymentAccount(db, id));
    showToast('Payment source removed.', 'warn');
  }, [showToast]);

  const toggleInsight = useCallback((id: string) => {
    setSavedInsights((s) => { const next = { ...s, [id]: !s[id] }; writeDb((db) => setPref(db, 'savedInsights', next)); return next; });
  }, []);

  const exportCsv = useCallback(() => {
    const rows = [['Date', 'Time', 'Description', 'Category', 'Amount', 'Currency', 'Classification', 'Recurring']];
    expenses.forEach((e) => {
      const d = new Date(e.date);
      rows.push([
        d.toLocaleDateString(), d.toLocaleTimeString(), '"' + e.desc.replace(/"/g, '""') + '"',
        catById(e.cat).name, String(e.amount), 'INR', wnLabel(e.wn), 'N',
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    Share.share({ message: csv, title: 'SpendWise export' }).catch(() => {});
    showToast('Exported ' + expenses.length + ' records to CSV.', 'good');
  }, [expenses, showToast]);

  const value: StoreValue = {
    ready, expenses, categories, accounts, filter, theme, budget, draft, editingId,
    analyticsPeriod, donutCat, settings, savedInsights, recurring, toast, confettiKey, locked,
    onboarded, profileName,
    setFilter,
    saveProfile, completeOnboarding,
    beginNewExpense, beginEditExpense, resetExpenseEntry,
    addPaymentSource, deletePaymentSource,
    setTheme, setDraft, pressKey, delKey, saveExpense, deleteExpense, clearExpenses, addCategory, addRecurring, toggleSetting,
    setBiometric, requestUnlock, changeBudget,
    toggleRecur, toggleInsight, setAnalyticsPeriod, setDonutCat, exportCsv,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
