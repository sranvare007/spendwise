import { DimensionValue } from 'react-native';

// Typed percentage width/height value (avoids TS template-literal DimensionValue friction).
export function pctW(n: number): DimensionValue {
  return `${Math.round(n)}%` as DimensionValue;
}

// Avatar initials from a display name: first letters of the first two words,
// uppercased. Falls back to the first two characters, then '?' when empty.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Date / time formatting helpers (manual to avoid Hermes Intl gaps)

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName(d: Date): string {
  return MONTHS_FULL[d.getMonth()];
}

export function weekdayNarrow(d: Date): string {
  return WEEKDAYS_NARROW[d.getDay()];
}

// e.g. "Mon, 9 Jun"
export function shortDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// e.g. "09/06/2026"
export function numericDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// e.g. "8:20 AM"
export function timeFmt(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export function monthKey(iso: string): string {
  const x = new Date(iso);
  return `${x.getFullYear()}-${x.getMonth()}`;
}

export type RangeKey = 'today' | 'week' | 'month' | 'all';

export function startOf(range: RangeKey | 'week' | 'month' | 'today'): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === 'today') return d.getTime();
  if (range === 'week') {
    const wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return d.getTime();
  }
  if (range === 'month') {
    d.setDate(1);
    return d.getTime();
  }
  return 0;
}

export function dayKey(iso: string): number {
  const x = new Date(iso);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
