import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Share, AppState } from 'react-native';
import { ThemeKey } from './theme';
import { getBiometricCapability, runAuth, AuthOutcome } from './biometric';
import { monthKey } from './utils';
import { Expense, Recurring, Draft, DEFAULT_BUDGET, catById, CATS } from './data';
import { getDatabase } from './db/database';
import {
  getExpenses, insertExpense, softDeleteExpense, getRecurring, setRecurringPaused, getAllPrefs, setPref,
} from './db/repositories';

// Re-export shared data so existing screen imports keep working.
export { CATS, CAT_BUDGETS, catById, DEFAULT_BUDGET } from './data';
export type { Category, Expense, Recurring, Draft } from './data';

export interface Settings {
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
  biometric: boolean;
}

export type Tab = 'home' | 'analytics' | 'insights' | 'settings';
export type Sub = 'budgets' | 'recurring' | 'export' | null;
export type RangeKey = 'today' | 'week' | 'month' | 'all';
export type Period = 'week' | 'month' | '6m';
export interface Filter { range: RangeKey; cat: string; wn: 'all' | 'NEED' | 'WANT'; q: string; }
export interface Toast { msg: string; tone: 'good' | 'warn' | 'bad'; }

const EMPTY_DRAFT: Draft = { amount: '', desc: '', cat: null, wn: 'NEED' };
const DEFAULT_SETTINGS: Settings = { budgetAlerts: true, weeklySummary: true, recurringReminders: true, biometric: false };
const DEFAULT_FILTER: Filter = { range: 'month', cat: 'all', wn: 'all', q: '' };

// Fire-and-forget DB write; failures never block the UI.
function writeDb(fn: (db: Awaited<ReturnType<typeof getDatabase>>) => Promise<void>) {
  getDatabase().then(fn).catch(() => {});
}

interface StoreValue {
  ready: boolean;
  expenses: Expense[];
  filter: Filter;
  tab: Tab;
  sub: Sub;
  modalOpen: boolean;
  themeSheetOpen: boolean;
  theme: ThemeKey;
  budget: number;
  draft: Draft;
  analyticsPeriod: Period;
  donutCat: string | null;
  settings: Settings;
  savedInsights: Record<string, boolean>;
  recurring: Recurring[];
  toast: Toast | null;
  confettiKey: number;
  locked: boolean;
  setFilter: (patch: Partial<Filter>) => void;
  setTab: (t: Tab) => void;
  setSub: (s: Sub) => void;
  openModal: () => void;
  closeModal: () => void;
  openThemeSheet: () => void;
  closeThemeSheet: () => void;
  setTheme: (k: ThemeKey) => void;
  setDraft: (patch: Partial<Draft>) => void;
  pressKey: (d: string) => void;
  delKey: () => void;
  saveExpense: () => void;
  deleteExpense: (id: string) => void;
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
  const [filter, setFilterState] = useState<Filter>(DEFAULT_FILTER);
  const [tab, setTabState] = useState<Tab>('home');
  const [sub, setSubState] = useState<Sub>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeKey>('mint');
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [draft, setDraftState] = useState<Draft>(EMPTY_DRAFT);
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
        const [exp, rec, prefs] = await Promise.all([getExpenses(db), getRecurring(db), getAllPrefs(db)]);
        setExpenses(exp);
        setRecurring(rec);
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
    setThemeState(k); setThemeSheetOpen(false); writeDb((db) => setPref(db, 'theme', k));
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

  const saveExpense = useCallback(() => {
    const amt = Number(draft.amount);
    if (!amt || amt <= 0 || !draft.desc.trim() || !draft.cat) return;
    const exp: Expense = {
      id: 'u' + Date.now(), amount: amt, desc: draft.desc.trim(), cat: draft.cat, wn: draft.wn, date: new Date().toISOString(),
    };
    const next = [exp, ...expenses];
    setExpenses(next);
    setModalOpen(false);
    setDraftState(EMPTY_DRAFT);
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
  }, [draft, expenses, budget, showToast]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((arr) => arr.filter((e) => e.id !== id));
    writeDb((db) => softDeleteExpense(db, id));
    showToast('Expense deleted.', 'warn');
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
    ready, expenses, filter, tab, sub, modalOpen, themeSheetOpen, theme, budget, draft,
    analyticsPeriod, donutCat, settings, savedInsights, recurring, toast, confettiKey, locked,
    setFilter,
    setTab: (t) => { setTabState(t); setSubState(null); },
    setSub: setSubState,
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    openThemeSheet: () => setThemeSheetOpen(true),
    closeThemeSheet: () => setThemeSheetOpen(false),
    setTheme, setDraft, pressKey, delKey, saveExpense, deleteExpense, toggleSetting,
    setBiometric, requestUnlock, changeBudget,
    toggleRecur, toggleInsight, setAnalyticsPeriod, setDonutCat, exportCsv,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
