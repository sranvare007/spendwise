import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, ScrollView, Animated, Pressable, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, tint } from '../theme';
import { Icon } from '../icons';
import { Press } from './Press';
import { useStore, paymentTypeMeta, CLASSIFICATIONS } from '../store';
import { RootStackParamList } from '../navigation';
import { monthName, chipDate } from '../utils';

const SCREEN_H = Dimensions.get('window').height;

function fmtAmount(str: string): string {
  if (!str) return '0';
  const p = str.split('.');
  const intPart = p[0] === '' ? '0' : inr(Number(p[0]));
  return p.length > 1 ? intPart + '.' + p[1] : intPart;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SPLIT_MONTHS = 24;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const sameDay = (a: Date, b: Date) => startOfDay(a) === startOfDay(b);

// Calendar cells for a month, leading-padded so day 1 lands on its weekday.
function monthCells(view: Date): (Date | null)[] {
  const y = view.getFullYear(), m = view.getMonth();
  const pad = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array(pad).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
  return cells;
}

export function AddExpenseModal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { draft, setDraft, pressKey, delKey, saveExpense, resetExpenseEntry, categories, editingId, deleteExpense, accounts } = useStore();
  const isEditing = editingId !== null;

  const closeModal = () => navigation.goBack();
  const onSave = () => { if (saveExpense()) navigation.goBack(); };
  const onDelete = () => { if (editingId) deleteExpense(editingId); navigation.goBack(); };

  // Clear the draft + edit target when the modal leaves the stack.
  useEffect(() => resetExpenseEntry, [resetExpenseEntry]);

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });
  const amt = Number(draft.amount);
  const canSave = amt > 0 && !!draft.desc.trim() && !!draft.cat;

  // ---- date picker ----
  const today = new Date();
  const selDate = new Date(draft.date);
  const [showCal, setShowCal] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(selDate.getFullYear(), selDate.getMonth(), 1));
  const dateLabel = sameDay(selDate, today) ? 'Today' : chipDate(selDate);

  // Apply the chosen day while keeping the existing time-of-day; future days are blocked.
  const pickDay = (day: Date) => {
    if (startOfDay(day) > startOfDay(today)) return;
    const next = new Date(day);
    next.setHours(selDate.getHours(), selDate.getMinutes(), selDate.getSeconds(), selDate.getMilliseconds());
    setDraft({ date: next.toISOString() });
    setShowCal(false);
  };
  const shiftMonth = (delta: number) => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  // Don't let the user page into months that are entirely in the future.
  const atCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  // ---- split over months ----
  const months = draft.splitMonths;
  const splitOn = months > 1;
  const stepMonths = (delta: number) => setDraft({ splitMonths: Math.min(MAX_SPLIT_MONTHS, Math.max(1, months + delta)) });
  const endMonth = new Date(selDate.getFullYear(), selDate.getMonth() + months - 1, 1);
  const monthRange = `${monthName(selDate).slice(0, 3)} – ${monthName(endMonth).slice(0, 3)}${endMonth.getFullYear() !== selDate.getFullYear() ? ' ' + endMonth.getFullYear() : ''}`;
  const splitHint = !splitOn
    ? 'Spread the cost across coming months'
    : amt > 0 ? `₹${inr(amt / months)}/mo · ${monthRange}` : monthRange;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,16,24,0.5)', opacity: slide }}>
        <Pressable style={{ flex: 1 }} onPress={closeModal} />
      </Animated.View>

      {/* The sheet reaches the physical screen bottom, so the safe-area inset is reserved
          here rather than inside the ScrollView: padding on the scroll content only clears
          the system nav bar once scrolled to the very end, leaving the Save button jammed
          against the nav buttons at rest. */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', paddingBottom: insets.bottom, backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY }] }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
          <View style={{ width: 36 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 11, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: t.line }} />
          </View>
          <AppText style={{ fontSize: 17, fontWeight: '800', color: t.text }}>{isEditing ? 'Edit expense' : 'Add expense'}</AppText>
          <Press onPress={closeModal} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={17} color={t.sub} strokeWidth={2.2} />
          </Press>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {/* Amount */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <AppText style={{ fontSize: 26, fontWeight: '700', color: t.faint, marginBottom: 6 }}>₹</AppText>
              <AppText style={{ fontSize: 52, fontWeight: '800', color: amt > 0 ? t.text : t.faint, lineHeight: 56 }}>{fmtAmount(draft.amount)}</AppText>
            </View>
          </View>

          {/* Need / Want / Invest + date, sharing one row: the segment flexes into whatever
              the date chip leaves, and the chip keeps its label short so three segments still
              have room on narrow screens. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 18 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: t.card2 }}>
              {CLASSIFICATIONS.map((c) => {
                const active = draft.wn === c.key;
                return (
                  <Press key={c.key} onPress={() => setDraft({ wn: c.key })} style={{ flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accent : 'transparent' }}>
                    <AppText numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: active ? t.onAccent : t.sub }}>{c.label}</AppText>
                  </Press>
                );
              })}
            </View>
            <Press onPress={() => setShowCal((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: showCal ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: showCal ? t.accent : 'transparent' }}>
              <Icon name="cal" size={15} color={showCal ? t.accent : t.sub} />
              <AppText numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: showCal ? t.accent : t.sub }}>{dateLabel}</AppText>
            </Press>
          </View>

          {/* Calendar */}
          {showCal && (
            <View style={{ borderRadius: 16, backgroundColor: t.card2, padding: 12, marginBottom: 18 }}>
              {/* Month nav */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Press onPress={() => shiftMonth(-1)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="chevL" size={16} color={t.sub} strokeWidth={2.2} />
                </Press>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text }}>{monthName(viewMonth)} {viewMonth.getFullYear()}</AppText>
                <Press onPress={() => !atCurrentMonth && shiftMonth(1)} disabled={atCurrentMonth} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', opacity: atCurrentMonth ? 0.35 : 1 }}>
                  <Icon name="chevR" size={16} color={t.sub} strokeWidth={2.2} />
                </Press>
              </View>

              {/* Weekday header */}
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {WEEKDAY_LETTERS.map((w, i) => (
                  <View key={i} style={{ width: '14.285%', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: t.faint }}>{w}</AppText>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {monthCells(viewMonth).map((day, i) => {
                  if (!day) return <View key={i} style={{ width: '14.285%', height: 38 }} />;
                  const selected = sameDay(day, selDate);
                  const isToday = sameDay(day, today);
                  const future = startOfDay(day) > startOfDay(today);
                  return (
                    <View key={i} style={{ width: '14.285%', height: 38, alignItems: 'center', justifyContent: 'center' }}>
                      <Press onPress={() => pickDay(day)} disabled={future} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? t.accent : 'transparent' }}>
                        <AppText style={{ fontSize: 13.5, fontWeight: selected || isToday ? '800' : '600', color: future ? t.faint : selected ? t.onAccent : isToday ? t.accent : t.text }}>{day.getDate()}</AppText>
                      </Press>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Description */}
          <TextInput
            value={draft.desc}
            onChangeText={(desc) => setDraft({ desc })}
            placeholder="What was it for?"
            placeholderTextColor={t.faint}
            style={{ height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2, fontSize: 15, color: t.text, marginBottom: 16, fontFamily: 'Montserrat_600SemiBold' }}
          />

          {/* Category */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 }}>Category</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -20, marginBottom: 18 }} contentContainerStyle={{ gap: 9, paddingHorizontal: 20, paddingVertical: 2 }}>
            {categories.map((c) => {
              const active = draft.cat === c.id;
              return (
                <Press key={c.id} onPress={() => setDraft({ cat: c.id })} style={{ width: 66, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 16, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Icon name={c.icon} size={19} color={c.color} />
                  </View>
                  <AppText style={{ fontSize: 10.5, fontWeight: '700', color: active ? t.accent : t.sub }}>{c.short}</AppText>
                </Press>
              );
            })}
          </ScrollView>

          {/* Payment source (optional) */}
          <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 }}>Payment source · optional</AppText>
          {accounts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -20, marginBottom: 16 }} contentContainerStyle={{ gap: 9, paddingHorizontal: 20, paddingVertical: 2 }}>
              {accounts.map((s) => {
                const active = draft.account === s.id;
                const meta = paymentTypeMeta(s.type);
                return (
                  <Press key={s.id} onPress={() => setDraft({ account: active ? null : s.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: tint(s.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={meta.icon} size={15} color={s.color} />
                    </View>
                    <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.text, maxWidth: 140 }}>{s.name}</AppText>
                  </Press>
                );
              })}
              <Press onPress={() => navigation.navigate('AddPaymentSource')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 14, backgroundColor: t.card2, borderWidth: 1.5, borderColor: 'transparent' }}>
                <Icon name="plus" size={15} color={t.accent} strokeWidth={2.6} />
                <AppText style={{ fontSize: 13, fontWeight: '700', color: t.accent }}>New</AppText>
              </Press>
            </ScrollView>
          ) : (
            <Press onPress={() => navigation.navigate('AddPaymentSource')} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.card2, marginBottom: 16 }}>
              <Icon name="plus" size={16} color={t.accent} strokeWidth={2.6} />
              <AppText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: t.sub }}>Add a payment source</AppText>
              <Icon name="chevR" size={15} color={t.faint} strokeWidth={2.4} />
            </Press>
          )}

          {/* Split over months — new entries only; an existing installment is edited on its own. */}
          {!isEditing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingLeft: 14, paddingRight: 9, borderRadius: 14, marginBottom: 16, backgroundColor: splitOn ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: splitOn ? t.accent : 'transparent' }}>
              <Icon name="repeat" size={18} color={splitOn ? t.accent : t.sub} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13.5, fontWeight: '700', color: splitOn ? t.accent : t.text }}>Split over months</AppText>
                <AppText numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: t.faint, marginTop: 2 }}>{splitHint}</AppText>
              </View>
              <Press onPress={() => stepMonths(-1)} disabled={months <= 1} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', opacity: months <= 1 ? 0.35 : 1 }}>
                <Icon name="minus" size={15} color={t.sub} strokeWidth={2.4} />
              </Press>
              <AppText style={{ minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: '800', color: splitOn ? t.accent : t.text }}>{months}</AppText>
              <Press onPress={() => stepMonths(1)} disabled={months >= MAX_SPLIT_MONTHS} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', opacity: months >= MAX_SPLIT_MONTHS ? 0.35 : 1 }}>
                <Icon name="plus" size={15} color={t.accent} strokeWidth={2.4} />
              </Press>
            </View>
          )}

          {/* Keypad */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4.5 }}>
            {KEYS.map((k) => (
              <View key={k} style={{ width: '33.333%', paddingHorizontal: 4.5, marginBottom: 9 }}>
                <Press onPress={() => (k === 'del' ? delKey() : pressKey(k))} style={{ height: 54, borderRadius: 15, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
                  {k === 'del'
                    ? <Icon name="del" size={24} color={t.sub} />
                    : <AppText style={{ fontSize: 23, fontWeight: '700', color: t.text }}>{k}</AppText>}
                </Press>
              </View>
            ))}
          </View>

          {/* Save */}
          <Press
            onPress={onSave}
            disabled={!canSave}
            style={{ height: 54, marginTop: 9, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null) }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>
              {isEditing
                ? (canSave ? 'Save changes' : 'Enter amount & details')
                : (canSave ? (splitOn ? `Add ₹${fmtAmount(draft.amount)} over ${months} months` : 'Add ₹' + fmtAmount(draft.amount)) : 'Enter amount & details')}
            </AppText>
          </Press>

          {/* Delete (edit mode only) */}
          {isEditing && (
            <Press
              onPress={onDelete}
              style={{ height: 50, marginTop: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: tint('#FF5C5C', t.dark) }}
            >
              <Icon name="trash" size={18} color="#FF5C5C" />
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FF5C5C' }}>Delete expense</AppText>
            </Press>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
