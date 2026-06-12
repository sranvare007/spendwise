import React from 'react';

export type ThemeKey = 'mint' | 'midnight' | 'sunburst';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  card2: string;
  line: string;
  text: string;
  sub: string;
  faint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  pop: string;
  hero: string;
  heroGlow: string;
  heroText: string;
  heroNum: string;
  fab: string;
  fabIcon: string;
  fabShadow: string;
  navBg: string;
  navSolid: string;
  toastBg: string;
  toastText: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  mint: {
    dark: false, bg: '#EBF1EE', card: '#FFFFFF', card2: '#F1F5F3', line: 'rgba(12,26,21,0.08)',
    text: '#0C1A15', sub: '#536159', faint: '#93A29B', accent: '#07CB73', accentSoft: 'rgba(7,203,115,0.13)',
    onAccent: '#FFFFFF', pop: '#FFD60A', hero: '#07CB73', heroGlow: 'rgba(255,255,255,0.16)',
    heroText: 'rgba(255,255,255,0.82)', heroNum: '#FFFFFF', fab: '#07CB73', fabIcon: '#FFFFFF',
    fabShadow: 'rgba(7,203,115,0.4)', navBg: 'rgba(255,255,255,0.96)', navSolid: '#FFFFFF',
    toastBg: '#0C1A15', toastText: '#FFFFFF',
  },
  midnight: {
    dark: true, bg: '#0A0E13', card: '#141B23', card2: '#1C242E', line: 'rgba(255,255,255,0.08)',
    text: '#EAF0F0', sub: '#94A4AD', faint: '#5E6B73', accent: '#2BE08A', accentSoft: 'rgba(43,224,138,0.15)',
    onAccent: '#05140C', pop: '#FFE900', hero: '#161E27', heroGlow: 'rgba(43,224,138,0.12)',
    heroText: 'rgba(255,255,255,0.66)', heroNum: '#FFE900', fab: '#2BE08A', fabIcon: '#05140C',
    fabShadow: 'rgba(43,224,138,0.4)', navBg: 'rgba(13,18,24,0.96)', navSolid: '#0F151C',
    toastBg: '#1C242E', toastText: '#EAF0F0',
  },
  sunburst: {
    dark: false, bg: '#FFFBEA', card: '#FFFFFF', card2: '#FBF5DF', line: 'rgba(20,16,2,0.1)',
    text: '#15120A', sub: '#6B6450', faint: '#A89E80', accent: '#15120A', accentSoft: 'rgba(21,18,10,0.06)',
    onAccent: '#FFE900', pop: '#07CB73', hero: '#15120A', heroGlow: 'rgba(255,233,0,0.16)',
    heroText: 'rgba(255,255,255,0.68)', heroNum: '#FFE900', fab: '#FFE900', fabIcon: '#15120A',
    fabShadow: 'rgba(216,196,0,0.5)', navBg: 'rgba(255,251,234,0.96)', navSolid: '#FFFBEA',
    toastBg: '#15120A', toastText: '#FFFFFF',
  },
};

export const THEME_META: Record<ThemeKey, { name: string; swatchBg: string; dotA: string; dotB: string }> = {
  mint: { name: 'Mint', swatchBg: '#EBF1EE', dotA: '#07CB73', dotB: '#FFD60A' },
  midnight: { name: 'Midnight', swatchBg: '#0A0E13', dotA: '#2BE08A', dotB: '#FFE900' },
  sunburst: { name: 'Sunburst', swatchBg: '#FFFBEA', dotA: '#15120A', dotB: '#FFE900' },
};

export const ThemeContext = React.createContext<Theme>(THEMES.mint);
export const useTheme = () => React.useContext(ThemeContext);

// rgba from hex with alpha
export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// soft tint of a category color, depends on theme darkness
export function tint(hex: string, dark: boolean): string {
  return hexA(hex, dark ? 0.2 : 0.13);
}

// Indian-grouped integer formatting (avoids Intl reliance on Hermes)
export function inr(n: number): string {
  const num = Math.round(n);
  const neg = num < 0;
  const s = String(Math.abs(num));
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last3;
}
