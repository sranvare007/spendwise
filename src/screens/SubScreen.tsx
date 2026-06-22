import React, { useMemo, useState } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, tint } from '../theme';
import { Icon, IconName, CATEGORY_ICONS } from '../icons';
import { Press } from '../components/Press';
import { Toggle } from '../components/Toggle';
import { useStore, CAT_BUDGETS, CATEGORY_COLORS, catById } from '../store';
import { SUB_KIND_BY_ROUTE, SubRouteName } from '../navigation';
import { monthKey, numericDate, pctW } from '../utils';

export function SubScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // All four sub-screens share this component; the route name selects the variant.
  const route = useRoute();
  const sub = SUB_KIND_BY_ROUTE[route.name as SubRouteName];
  const { expenses, budget, changeBudget, recurring, toggleRecur, exportCsv } = useStore();

  const { spent, left, monthExp } = useMemo(() => {
    const tm = monthKey(new Date().toISOString());
    const me = expenses.filter((e) => monthKey(e.date) === tm);
    const sp = me.reduce((s, e) => s + e.amount, 0);
    return { spent: sp, left: Math.max(0, budget - sp), monthExp: me };
  }, [expenses, budget]);

  const title = sub === 'budgets' ? 'Budgets' : sub === 'recurring' ? 'Recurring' : sub === 'export' ? 'Export data' : sub === 'categories' ? 'Categories' : '';

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

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <AppText style={{ fontSize: 21, fontWeight: '800', color: t.text }}>{title}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>
        {sub === 'budgets' && (
          <>
            <View style={{ borderRadius: 20, backgroundColor: t.hero, padding: 20, shadowColor: '#081420', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
              <AppText style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: t.heroText }}>MONTHLY BUDGET</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Press onPress={() => changeBudget(-500)} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="minus" size={20} color={t.heroNum} strokeWidth={2.6} />
                </Press>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <AppText style={{ fontSize: 18, fontWeight: '700', color: t.heroNum, marginBottom: 4 }}>₹</AppText>
                  <AppText style={{ fontSize: 36, fontWeight: '800', color: t.heroNum }}>{inr(budget)}</AppText>
                </View>
                <Press onPress={() => changeBudget(500)} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={20} color={t.heroNum} strokeWidth={2.6} />
                </Press>
              </View>
              <AppText style={{ fontSize: 12.5, color: t.heroText, textAlign: 'center', marginTop: 10 }}>₹{inr(spent)} spent · ₹{inr(left)} remaining</AppText>
            </View>

            <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 10, marginLeft: 4 }}>By category</AppText>
            <View style={{ gap: 12 }}>
              {catBudgets.map((cb) => (
                <View key={cb.id} style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 14, paddingHorizontal: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(cb.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={cb.icon} size={18} color={cb.color} />
                    </View>
                    <AppText style={{ flex: 1, fontSize: 14, fontWeight: '700', color: t.text }}>{cb.name}</AppText>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: cb.toneColor }}>₹{inr(cb.spent)}</AppText>
                    <AppText style={{ fontSize: 12, color: t.faint }}> / ₹{inr(cb.budget)}</AppText>
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
            <AppText style={{ fontSize: 13, color: t.sub, marginBottom: 14, lineHeight: 19.5 }}>Bills and subscriptions that add themselves automatically on their due date.</AppText>
            {recurring.length === 0 ? (
              <View style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center' }}>
                <Icon name="repeat" size={26} color={t.faint} />
                <AppText style={{ fontSize: 13.5, fontWeight: '700', color: t.sub, marginTop: 10 }}>No recurring expenses yet</AppText>
                <AppText style={{ fontSize: 12.5, color: t.faint, marginTop: 4, textAlign: 'center' }}>Add one below to start tracking your bills.</AppText>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {recurring.map((r) => {
                  const c = catById(r.cat);
                  return (
                    <View key={r.id} style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: r.paused ? 0.5 : 1 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={c.icon} size={21} color={c.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText style={{ fontSize: 14.5, fontWeight: '800', color: t.text }}>{r.name}</AppText>
                        <AppText style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{r.freq} · Due in {r.due} {r.due === 1 ? 'day' : 'days'}</AppText>
                      </View>
                      <AppText style={{ fontSize: 15, fontWeight: '800', color: t.text, marginRight: 4 }}>₹{inr(r.amount)}</AppText>
                      <Toggle on={!r.paused} onToggle={() => toggleRecur(r.id)} />
                    </View>
                  );
                })}
              </View>
            )}
            <RecurringManager />
          </>
        )}

        {sub === 'export' && (
          <>
            <AppText style={{ fontSize: 13, color: t.sub, marginBottom: 16, lineHeight: 19.5 }}>Export your expenses to a CSV file you can open in Excel or Google Sheets. Everything is generated on-device.</AppText>
            <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Date range', value: 'This month', accent: true },
                { label: 'Categories', value: 'All', accent: true },
                { label: 'Records', value: expenses.length + ' expenses', accent: false },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                  <AppText style={{ fontSize: 14, fontWeight: '600', color: t.text }}>{row.label}</AppText>
                  <AppText style={{ fontSize: 13.5, fontWeight: '700', color: row.accent ? t.accent : t.faint }}>{row.value}</AppText>
                </View>
              ))}
            </View>
            <View style={{ borderRadius: 14, backgroundColor: t.card2, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 18 }}>
              <AppText style={{ fontFamily: 'monospace', fontSize: 11, color: t.sub, lineHeight: 18 }}>{csvPreview}</AppText>
            </View>
            <Press onPress={exportCsv} style={{ height: 54, borderRadius: 16, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
              <Icon name="download" size={20} color={t.onAccent} strokeWidth={2.2} />
              <AppText style={{ fontSize: 16, fontWeight: '800', color: t.onAccent }}>Export CSV</AppText>
            </Press>
          </>
        )}

        {sub === 'categories' && <CategoriesManager />}
      </ScrollView>
    </View>
  );
}

// List of all categories plus an inline form to create a custom one.
function CategoriesManager() {
  const t = useTheme();
  const { categories, addCategory } = useStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName | null>(null);
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);

  const canSave = name.trim().length > 0 && icon !== null;

  const onSave = () => {
    if (!canSave || icon === null) return;
    addCategory({ name, icon, color });
    setName('');
    setIcon(null);
    setColor(CATEGORY_COLORS[0]);
  };

  return (
    <>
      {/* Existing categories */}
      <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4 }}>Your categories</AppText>
      <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden', marginBottom: 24 }}>
        {categories.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: i === categories.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={19} color={c.color} />
            </View>
            <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: t.text }}>{c.name}</AppText>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.color }} />
          </View>
        ))}
      </View>

      {/* Create new */}
      <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4 }}>Create new</AppText>
      <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 16 }}>
        {/* Preview + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tint(color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon ?? 'tag'} size={24} color={color} />
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={t.faint}
            maxLength={24}
            style={{ flex: 1, height: 48, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2, fontSize: 15, color: t.text, fontFamily: 'Montserrat_600SemiBold' }}
          />
        </View>

        {/* Color picker */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 }}>Color</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {CATEGORY_COLORS.map((c) => {
            const active = color === c;
            return (
              <Press key={c} onPress={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: active ? 3 : 0, borderColor: t.bg }}>
                {active && <Icon name="check" size={15} color="#fff" strokeWidth={2.8} />}
              </Press>
            );
          })}
        </View>

        {/* Icon picker */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 }}>Icon</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CATEGORY_ICONS.map((ic) => {
            const active = icon === ic;
            return (
              <Press key={ic} onPress={() => setIcon(ic)} style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? tint(color, t.dark) : t.card2, borderWidth: 1.5, borderColor: active ? color : 'transparent' }}>
                <Icon name={ic} size={21} color={active ? color : t.sub} />
              </Press>
            );
          })}
        </View>

        <Press
          onPress={onSave}
          disabled={!canSave}
          style={{ height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : null) }}
        >
          <Icon name="plus" size={19} color={canSave ? t.onAccent : t.faint} strokeWidth={2.4} />
          <AppText style={{ fontSize: 15.5, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>{canSave ? 'Add category' : 'Name & pick an icon'}</AppText>
        </Press>
      </View>
    </>
  );
}

const FREQ_OPTIONS = ['Weekly', 'Monthly', 'Yearly'];

// Inline form to create a recurring expense (bill/subscription).
function RecurringManager() {
  const t = useTheme();
  const { categories, addRecurring } = useStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [freq, setFreq] = useState('Monthly');
  const [due, setDue] = useState('30');

  const amt = Number(amount);
  const canSave = name.trim().length > 0 && cat !== null && amt > 0;

  const onSave = () => {
    if (!canSave || cat === null) return;
    addRecurring({ name, cat, amount: amt, freq, due: Number(due) || 0 });
    setName(''); setAmount(''); setCat(null); setFreq('Monthly'); setDue('30');
  };

  const inputStyle = { height: 48, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2, fontSize: 15, color: t.text, fontFamily: 'Montserrat_600SemiBold' } as const;
  const labelStyle = { fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 } as const;

  return (
    <>
      <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 }}>Add recurring</AppText>
      <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 16 }}>
        {/* Name */}
        <TextInput value={name} onChangeText={setName} placeholder="Name (e.g. Netflix)" placeholderTextColor={t.faint} maxLength={32} style={{ ...inputStyle, marginBottom: 12 }} />

        {/* Amount + due */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <AppText style={labelStyle}>Amount (₹)</AppText>
            <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={t.faint} keyboardType="decimal-pad" style={inputStyle} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={labelStyle}>Due in (days)</AppText>
            <TextInput value={due} onChangeText={(v) => setDue(v.replace(/[^0-9]/g, ''))} placeholder="30" placeholderTextColor={t.faint} keyboardType="number-pad" maxLength={4} style={inputStyle} />
          </View>
        </View>

        {/* Frequency */}
        <AppText style={labelStyle}>Frequency</AppText>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {FREQ_OPTIONS.map((f) => {
            const active = freq === f;
            return (
              <Press key={f} onPress={() => setFreq(f)} style={{ flex: 1, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.sub }}>{f}</AppText>
              </Press>
            );
          })}
        </View>

        {/* Category */}
        <AppText style={labelStyle}>Category</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {categories.map((c) => {
            const active = cat === c.id;
            return (
              <Press key={c.id} onPress={() => setCat(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12, backgroundColor: active ? tint(c.color, t.dark) : t.card2, borderWidth: 1.5, borderColor: active ? c.color : 'transparent' }}>
                <Icon name={c.icon} size={16} color={active ? c.color : t.sub} />
                <AppText style={{ fontSize: 12.5, fontWeight: '700', color: active ? c.color : t.sub }}>{c.short}</AppText>
              </Press>
            );
          })}
        </View>

        <Press
          onPress={onSave}
          disabled={!canSave}
          style={{ height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : null) }}
        >
          <Icon name="plus" size={19} color={canSave ? t.onAccent : t.faint} strokeWidth={2.4} />
          <AppText style={{ fontSize: 15.5, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>{canSave ? 'Add recurring' : 'Name, amount & category'}</AppText>
        </Press>
      </View>
    </>
  );
}
