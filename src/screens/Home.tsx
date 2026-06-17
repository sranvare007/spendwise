import React, { useMemo } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, hexA, tint } from '../theme';
import { Icon, IconName } from '../icons';
import { Press } from '../components/Press';
import { useStore, catById } from '../store';
import { monthKey, monthName, startOf, timeFmt, shortDate, pctW, RangeKey } from '../utils';

export function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, categories, filter, setFilter, theme, budget, openThemeSheet, editExpense } = useStore();

  const { monthExp, spent } = useMemo(() => {
    const tm = monthKey(new Date().toISOString());
    const me = expenses.filter((e) => monthKey(e.date) === tm);
    return { monthExp: me, spent: me.reduce((s, e) => s + e.amount, 0) };
  }, [expenses]);

  const left = Math.max(0, budget - spent);
  const pct = Math.min(1, spent / budget);
  const needs = monthExp.filter((e) => e.wn === 'NEED').reduce((s, e) => s + e.amount, 0);
  const wants = monthExp.filter((e) => e.wn === 'WANT').reduce((s, e) => s + e.amount, 0);
  const nw = needs + wants || 1;

  let toneColor = '#14B870';
  let toneLabel = 'On track';
  if (pct >= 0.95) { toneColor = '#F0453A'; toneLabel = 'Over budget'; }
  else if (pct >= 0.75) { toneColor = '#FF9F1C'; toneLabel = 'Watch out'; }

  // ---- filtered + grouped list ----
  const { groups, filteredCount } = useMemo(() => {
    const start = startOf(filter.range as RangeKey);
    const q = filter.q.trim().toLowerCase();
    const filtered = expenses.filter((e) => {
      if (new Date(e.date).getTime() < start) return false;
      if (filter.cat !== 'all' && e.cat !== filter.cat) return false;
      if (filter.wn !== 'all' && e.wn !== filter.wn) return false;
      if (q && !(e.desc.toLowerCase().includes(q) || catById(e.cat).name.toLowerCase().includes(q))) return false;
      return true;
    });
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const label = (iso: string) => {
      const d = new Date(iso); d.setHours(0, 0, 0, 0);
      const diff = Math.round((today0.getTime() - d.getTime()) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return shortDate(new Date(iso));
    };
    const order: string[] = [];
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((e) => { const l = label(e.date); if (!map[l]) { map[l] = []; order.push(l); } map[l].push(e); });
    const grp = order.map((l) => ({
      label: l,
      total: map[l].reduce((s, e) => s + e.amount, 0),
      items: map[l],
    }));
    return { groups: grp, filteredCount: filtered.length };
  }, [expenses, filter]);

  const wnBg = (wn: string) => (wn === 'NEED' ? hexA(t.accent, 0.14) : hexA(t.pop, 0.18));
  const wnFg = (wn: string) => (wn === 'NEED' ? t.accent : theme === 'midnight' ? '#FFE900' : '#9A6B00');

  const ranges: [RangeKey, string][] = [['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['all', 'All']];
  const wnChips: [string, string][] = [['all', 'All'], ['NEED', 'Needs'], ['WANT', 'Wants']];

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontWeight: '800', fontSize: 16, color: t.accent }}>AR</AppText>
          </View>
          <View>
            <AppText style={{ fontSize: 12, color: t.faint, fontWeight: '600' }}>Good evening</AppText>
            <AppText style={{ fontSize: 17, color: t.text, fontWeight: '700' }}>Aarav Sharma</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={openThemeSheet} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="palette" size={17} color={t.accent} />
          </Press>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: t.pop }}>
            <Icon name="flame" size={15} color="#7A3C00" />
            <AppText style={{ fontWeight: '800', fontSize: 13, color: '#7A3C00' }}>7</AppText>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 130 }}>
        {/* Hero */}
        <View style={{ borderRadius: 24, backgroundColor: t.hero, padding: 22, overflow: 'hidden', shadowColor: '#081420', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: t.heroGlow }} />
          <AppText style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: t.heroText }}>SPENT IN {monthName(new Date()).toUpperCase()}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 7 }}>
            <AppText style={{ fontSize: 21, fontWeight: '700', color: t.heroNum, opacity: 0.9, marginBottom: 4 }}>₹</AppText>
            <AppText style={{ fontSize: 42, fontWeight: '800', color: t.heroNum, lineHeight: 44 }}>{inr(spent)}</AppText>
          </View>
          <View style={{ marginTop: 16, height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.92)', width: pctW(pct * 100) }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
            <AppText style={{ fontSize: 13, color: t.heroText }}>
              <AppText style={{ color: t.heroNum, fontWeight: '700' }}>₹{inr(left)}</AppText> left of ₹{inr(budget)}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: toneColor }} />
              <AppText style={{ fontSize: 12, fontWeight: '700', color: toneColor }}>{toneLabel}</AppText>
            </View>
          </View>
        </View>

        {/* Needs vs Wants */}
        <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 15, paddingHorizontal: 17 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: t.text }}>Needs vs Wants</AppText>
            <AppText style={{ fontSize: 11.5, color: t.faint, fontWeight: '600' }}>{((needs / nw) * 100).toFixed(0)}% essential</AppText>
          </View>
          <View style={{ flexDirection: 'row', height: 9, borderRadius: 99, overflow: 'hidden', backgroundColor: t.card2 }}>
            <View style={{ width: pctW((needs / nw) * 100), backgroundColor: t.accent }} />
            <View style={{ width: pctW((wants / nw) * 100), backgroundColor: t.pop }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent, marginRight: 6 }} />
              <AppText style={{ fontSize: 12, color: t.sub }}>Needs ₹{inr(needs)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.pop, marginRight: 6 }} />
              <AppText style={{ fontSize: 12, color: t.sub }}>Wants ₹{inr(wants)}</AppText>
            </View>
          </View>
        </View>

        {/* Transactions heading */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, paddingHorizontal: 2 }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text }}>Transactions</AppText>
          <AppText style={{ fontSize: 12.5, color: t.faint, fontWeight: '600' }}>{filteredCount} {filteredCount === 1 ? 'expense' : 'expenses'}</AppText>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <Icon name="search" size={17} color={t.faint} strokeWidth={2} />
          <TextInput
            value={filter.q}
            onChangeText={(q) => setFilter({ q })}
            placeholder="Search expenses"
            placeholderTextColor={t.faint}
            style={{ flex: 1, fontSize: 14.5, color: t.text, padding: 0, fontFamily: 'Montserrat_400Regular' }}
          />
        </View>

        {/* Range segmented */}
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 12, padding: 4, borderRadius: 13, backgroundColor: t.card2 }}>
          {ranges.map(([k, label]) => {
            const active = filter.range === k;
            return (
              <Press key={k} onPress={() => setFilter({ range: k })} style={{ flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accent : 'transparent' }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.onAccent : t.sub }}>{label}</AppText>
              </Press>
            );
          })}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 2 }}>
          {[{ id: 'all', short: 'All', icon: null as IconName | null }, ...categories].map((c) => {
            const active = filter.cat === c.id;
            return (
              <Press key={c.id} onPress={() => setFilter({ cat: c.id })} style={{ flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 14, borderRadius: 99, backgroundColor: active ? t.accentSoft : t.card, borderWidth: 1.5, borderColor: active ? t.accent : t.line }}>
                {c.icon && <View style={{ marginRight: 6 }}><Icon name={c.icon} size={15} color={active ? t.accent : t.faint} /></View>}
                <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.sub }}>{c.short}</AppText>
              </Press>
            );
          })}
        </ScrollView>

        {/* Want/Need filter */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {wnChips.map(([k, label]) => {
            const active = filter.wn === k;
            return (
              <Press key={k} onPress={() => setFilter({ wn: k as 'all' | 'NEED' | 'WANT' })} style={{ flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accentSoft : t.card, borderWidth: 1.5, borderColor: active ? t.accent : t.line }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.sub }}>{label}</AppText>
              </Press>
            );
          })}
        </View>

        {/* List */}
        <View style={{ marginTop: 18 }}>
          {groups.map((g) => (
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
                            <AppText style={{ fontSize: 11, fontWeight: '700', color: wnFg(e.wn) }}>{e.wn === 'NEED' ? 'Need' : 'Want'}</AppText>
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

          {groups.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon name="search" size={28} color={t.faint} strokeWidth={1.8} />
              </View>
              <AppText style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Nothing here yet</AppText>
              <AppText style={{ fontSize: 13, color: t.faint, marginTop: 5, maxWidth: 220, textAlign: 'center' }}>No expenses match these filters. Try a different range or tap + to add one.</AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
