import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, tint } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { Toggle } from '../components/Toggle';
import { useStore, CATS, CAT_BUDGETS, catById } from '../store';
import { monthKey, numericDate, pctW } from '../utils';

export function SubScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { sub, setSub, expenses, budget, changeBudget, recurring, toggleRecur, exportCsv } = useStore();

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [sub, anim]);

  const { spent, left, monthExp } = useMemo(() => {
    const tm = monthKey(new Date().toISOString());
    const me = expenses.filter((e) => monthKey(e.date) === tm);
    const sp = me.reduce((s, e) => s + e.amount, 0);
    return { spent: sp, left: Math.max(0, budget - sp), monthExp: me };
  }, [expenses, budget]);

  const title = sub === 'budgets' ? 'Budgets' : sub === 'recurring' ? 'Recurring' : sub === 'export' ? 'Export data' : '';

  const catBudgets = useMemo(() =>
    Object.keys(CAT_BUDGETS).map((id) => {
      const c = catById(id);
      const cb = CAT_BUDGETS[id];
      const sp = monthExp.filter((e) => e.cat === id).reduce((s, e) => s + e.amount, 0);
      const r = sp / cb;
      const tc = r < 0.75 ? '#14B870' : r < 0.95 ? '#FF9F1C' : '#F0453A';
      return { id, name: c.name, color: c.color, icon: c.icon, spent: sp, budget: cb, pct: Math.min(100, r * 100), toneColor: tc };
    }), [monthExp]);

  const csvPreview = useMemo(() => {
    const head = 'Date,Description,Category,Amount,W/N';
    const rows = expenses.slice(0, 4).map((e) => {
      const d = new Date(e.date);
      return `${numericDate(d)},${e.desc.slice(0, 12)},${catById(e.cat).short},${e.amount},${e.wn === 'NEED' ? 'Need' : 'Want'}`;
    });
    const more = expenses.length > 4 ? `\n… +${expenses.length - 4} more rows` : '';
    return head + '\n' + rows.join('\n') + more;
  }, [expenses]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 36, backgroundColor: t.bg, opacity: anim, transform: [{ translateX }] }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => setSub(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <Text style={{ fontSize: 21, fontWeight: '800', color: t.text }}>{title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>
        {sub === 'budgets' && (
          <>
            <View style={{ borderRadius: 20, backgroundColor: t.hero, padding: 20, shadowColor: '#081420', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: t.heroText }}>MONTHLY BUDGET</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Press onPress={() => changeBudget(-500)} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="minus" size={20} color={t.heroNum} strokeWidth={2.6} />
                </Press>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: t.heroNum, marginBottom: 4 }}>₹</Text>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: t.heroNum }}>{inr(budget)}</Text>
                </View>
                <Press onPress={() => changeBudget(500)} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={20} color={t.heroNum} strokeWidth={2.6} />
                </Press>
              </View>
              <Text style={{ fontSize: 12.5, color: t.heroText, textAlign: 'center', marginTop: 10 }}>₹{inr(spent)} spent · ₹{inr(left)} remaining</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 10, marginLeft: 4 }}>By category</Text>
            <View style={{ gap: 12 }}>
              {catBudgets.map((cb) => (
                <View key={cb.id} style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 14, paddingHorizontal: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(cb.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={cb.icon} size={18} color={cb.color} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: t.text }}>{cb.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: cb.toneColor }}>₹{inr(cb.spent)}</Text>
                    <Text style={{ fontSize: 12, color: t.faint }}> / ₹{inr(cb.budget)}</Text>
                  </View>
                  <View style={{ height: 7, borderRadius: 99, backgroundColor: t.card2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 99, width: pctW(cb.pct), backgroundColor: cb.toneColor }} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {sub === 'recurring' && (
          <>
            <Text style={{ fontSize: 13, color: t.sub, marginBottom: 14, lineHeight: 19.5 }}>Bills and subscriptions that add themselves automatically on their due date.</Text>
            <View style={{ gap: 12 }}>
              {recurring.map((r) => {
                const c = catById(r.cat);
                return (
                  <View key={r.id} style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: r.paused ? 0.5 : 1 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={c.icon} size={21} color={c.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>{r.name}</Text>
                      <Text style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{r.freq} · Due in {r.due} {r.due === 1 ? 'day' : 'days'}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: t.text, marginRight: 4 }}>₹{inr(r.amount)}</Text>
                    <Toggle on={!r.paused} onToggle={() => toggleRecur(r.id)} />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {sub === 'export' && (
          <>
            <Text style={{ fontSize: 13, color: t.sub, marginBottom: 16, lineHeight: 19.5 }}>Export your expenses to a CSV file you can open in Excel or Google Sheets. Everything is generated on-device.</Text>
            <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Date range', value: 'This month', accent: true },
                { label: 'Categories', value: 'All', accent: true },
                { label: 'Records', value: expenses.length + ' expenses', accent: false },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: t.text }}>{row.label}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: row.accent ? t.accent : t.faint }}>{row.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ borderRadius: 14, backgroundColor: t.card2, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 18 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: t.sub, lineHeight: 18 }}>{csvPreview}</Text>
            </View>
            <Press onPress={exportCsv} style={{ height: 54, borderRadius: 16, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
              <Icon name="download" size={20} color={t.onAccent} strokeWidth={2.2} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: t.onAccent }}>Export CSV</Text>
            </Press>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}
