import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, hexA, tint } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore, catById, CLASSIFICATIONS, INVEST_COLOR, wnLabel } from '../store';
import type { Classification } from '../store';
import { RootStackParamList } from '../navigation';
import { monthName, shortDate, timeFmt, pctW } from '../utils';

// A month is addressed by a single index (year * 12 + month) so prev/next is plain arithmetic
// and bounds checks are trivial.
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const yearOf = (idx: number) => Math.floor(idx / 12);
const monthOf = (idx: number) => ((idx % 12) + 12) % 12;

// Settings/Home → History. Lets the user step back through previous months and see the full
// picture for each one: total spent, needs/wants/invest split, category breakdown, and the grouped
// transaction list. Tapping a transaction opens it for editing, same as the Home list.
export function MonthHistory() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { expenses, beginEditExpense } = useStore();

  const nowIdx = monthIndex(new Date());
  // Earliest month that has any data — the lower bound for navigation. Falls back to the
  // current month when there is nothing logged yet.
  const earliestIdx = useMemo(() => {
    if (expenses.length === 0) return nowIdx;
    return expenses.reduce((min, e) => Math.min(min, monthIndex(new Date(e.date))), nowIdx);
  }, [expenses, nowIdx]);

  // Start on the previous month — that is the whole point of this screen — but never below the
  // earliest month with data.
  const [idx, setIdx] = useState(() => Math.max(earliestIdx, nowIdx - 1));

  const canPrev = idx > earliestIdx;
  const canNext = idx < nowIdx;

  const v = useMemo(() => {
    const year = yearOf(idx);
    const month = monthOf(idx);
    const inMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getFullYear() === year && d.getMonth() === month;
    };
    const list = expenses.filter((e) => inMonth(e.date)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const spent = list.reduce((s, e) => s + e.amount, 0);
    const sumOf = (k: Classification) => list.filter((e) => e.wn === k).reduce((s, e) => s + e.amount, 0);
    const needs = sumOf('NEED');
    const split = CLASSIFICATIONS.map((c) => ({ key: c.key, label: c.group, amount: sumOf(c.key) }));
    const nw = split.reduce((s, x) => s + x.amount, 0) || 1;

    // Category breakdown, largest first.
    const byCat: Record<string, number> = {};
    list.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
    const cats = Object.keys(byCat)
      .map((id) => ({ id, amount: byCat[id], pct: Math.round((byCat[id] / (spent || 1)) * 100) }))
      .sort((a, b) => b.amount - a.amount);

    // Group the list by day for the transaction feed.
    const order: string[] = [];
    const map: Record<string, typeof list> = {};
    list.forEach((e) => {
      const l = shortDate(new Date(e.date));
      if (!map[l]) { map[l] = []; order.push(l); }
      map[l].push(e);
    });
    const groups = order.map((l) => ({ label: l, total: map[l].reduce((s, e) => s + e.amount, 0), items: map[l] }));

    const label = `${monthName(new Date(year, month, 1))} ${year}`;
    const highest = list.reduce((m, e) => Math.max(m, e.amount), 0);
    const stats = [
      { label: 'Transactions', value: String(list.length) },
      { label: 'Highest', value: '₹' + inr(highest) },
      { label: 'Avg / txn', value: '₹' + inr(list.length ? spent / list.length : 0) },
    ];

    return { label, spent, needs, split, nw, cats, groups, stats, count: list.length };
  }, [expenses, idx]);

  // Kept out of the memo so a theme switch recolors without recomputing the month.
  const splitColors: Record<Classification, string> = { NEED: t.accent, WANT: t.pop, INVEST: INVEST_COLOR };
  const wnBg = (wn: string) => (wn === 'NEED' ? hexA(t.accent, 0.14) : wn === 'INVEST' ? hexA(INVEST_COLOR, 0.16) : hexA(t.pop, 0.18));
  const wnFg = (wn: string) => (wn === 'NEED' ? t.accent : wn === 'INVEST' ? INVEST_COLOR : t.dark ? '#FFE900' : '#9A6B00');

  const editExpense = (id: string) => { beginEditExpense(id); navigation.navigate('AddExpense'); };

  const navBtn = (dir: 'prev' | 'next') => {
    const enabled = dir === 'prev' ? canPrev : canNext;
    return (
      <Press
        onPress={() => { if (enabled) setIdx((i) => i + (dir === 'prev' ? -1 : 1)); }}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.35 }}
      >
        <Icon name={dir === 'prev' ? 'chevL' : 'chevR'} size={18} color={t.text} strokeWidth={2.2} />
      </Press>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <AppText style={{ fontSize: 21, fontWeight: '800', color: t.text }}>History</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 130 }}>
        {/* Month selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {navBtn('prev')}
          <View style={{ alignItems: 'center' }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: t.faint, letterSpacing: 1 }}>VIEWING</AppText>
            <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text, marginTop: 2 }}>{v.label}</AppText>
          </View>
          {navBtn('next')}
        </View>

        {v.count === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="cal" size={28} color={t.faint} strokeWidth={1.8} />
            </View>
            <AppText style={{ fontSize: 15, fontWeight: '700', color: t.text }}>No expenses this month</AppText>
            <AppText style={{ fontSize: 13, color: t.faint, marginTop: 5, maxWidth: 230, textAlign: 'center' }}>Nothing was logged in {v.label}. Use the arrows to browse another month.</AppText>
          </View>
        ) : (
          <>
            {/* Summary hero */}
            <View style={{ borderRadius: 24, backgroundColor: t.hero, padding: 22, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: t.heroGlow }} />
              <AppText style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: t.heroText }}>SPENT IN {v.label.toUpperCase()}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 7 }}>
                <AppText style={{ fontSize: 21, fontWeight: '700', color: t.heroNum, opacity: 0.9, marginBottom: 4 }}>₹</AppText>
                <AppText style={{ fontSize: 42, fontWeight: '800', color: t.heroNum, lineHeight: 44 }}>{inr(v.spent)}</AppText>
              </View>
            </View>

            {/* Stat tiles */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {v.stats.map((s) => (
                <View key={s.label} style={{ flex: 1, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 12, paddingHorizontal: 12 }}>
                  <AppText style={{ fontSize: 11, fontWeight: '600', color: t.faint }}>{s.label}</AppText>
                  <AppText style={{ fontSize: 16, fontWeight: '800', color: t.text, marginTop: 4 }}>{s.value}</AppText>
                </View>
              ))}
            </View>

            {/* Needs / Wants / Invest split */}
            <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 15, paddingHorizontal: 17 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: t.text }}>Spend split</AppText>
                <AppText style={{ fontSize: 11.5, color: t.faint, fontWeight: '600' }}>{((v.needs / v.nw) * 100).toFixed(0)}% essential</AppText>
              </View>
              <View style={{ flexDirection: 'row', height: 9, borderRadius: 99, overflow: 'hidden', backgroundColor: t.card2 }}>
                {v.split.map((s) => (
                  <View key={s.key} style={{ width: pctW((s.amount / v.nw) * 100), backgroundColor: splitColors[s.key] }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                {v.split.map((s) => (
                  <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: splitColors[s.key], marginRight: 6 }} />
                    <AppText style={{ fontSize: 12, color: t.sub }}>{s.label} ₹{inr(s.amount)}</AppText>
                  </View>
                ))}
              </View>
            </View>

            {/* Category breakdown */}
            <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text, marginTop: 22, marginBottom: 12, marginLeft: 2 }}>By category</AppText>
            <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 6, paddingHorizontal: 16 }}>
              {v.cats.map((c, i) => {
                const cat = catById(c.id);
                return (
                  <View key={c.id} style={{ paddingVertical: 11, borderBottomWidth: i === v.cats.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: tint(cat.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={cat.icon} size={16} color={cat.color} />
                      </View>
                      <AppText style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: t.text }}>{cat.name}</AppText>
                      <AppText style={{ fontSize: 13.5, fontWeight: '800', color: t.text }}>₹{inr(c.amount)}</AppText>
                      <AppText style={{ fontSize: 11.5, fontWeight: '600', color: t.faint, width: 34, textAlign: 'right' }}>{c.pct}%</AppText>
                    </View>
                    <View style={{ height: 6, borderRadius: 99, overflow: 'hidden', backgroundColor: t.card2 }}>
                      <View style={{ height: '100%', borderRadius: 99, backgroundColor: cat.color, width: pctW(c.pct) }} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Transactions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, paddingHorizontal: 2 }}>
              <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text }}>Transactions</AppText>
              <AppText style={{ fontSize: 12.5, color: t.faint, fontWeight: '600' }}>{v.count} {v.count === 1 ? 'expense' : 'expenses'}</AppText>
            </View>

            {v.groups.map((g) => (
              <View key={g.label} style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 2, marginBottom: 9 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6 }}>{g.label}</AppText>
                  <AppText style={{ fontSize: 12, color: t.faint, fontWeight: '600' }}>₹{inr(g.total)}</AppText>
                </View>
                <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
                  {g.items.map((e, i) => {
                    const c = catById(e.cat);
                    return (
                      <Press key={e.id} onPress={() => editExpense(e.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 15, borderBottomWidth: i === g.items.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={c.icon} size={21} color={c.color} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700', color: t.text }}>{e.desc}</AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
                            <AppText style={{ fontSize: 12, color: t.faint }}>{c.name}</AppText>
                            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: t.faint }} />
                            <View style={{ paddingVertical: 1, paddingHorizontal: 7, borderRadius: 99, backgroundColor: wnBg(e.wn) }}>
                              <AppText style={{ fontSize: 11, fontWeight: '700', color: wnFg(e.wn) }}>{wnLabel(e.wn)}</AppText>
                            </View>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <AppText style={{ fontSize: 15, fontWeight: '800', color: t.text }}>-₹{inr(e.amount)}</AppText>
                          <AppText style={{ fontSize: 11, color: t.faint, marginTop: 2 }}>{timeFmt(new Date(e.date))}</AppText>
                        </View>
                      </Press>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
