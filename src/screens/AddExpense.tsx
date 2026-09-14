import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, ScrollView, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform, Alert, Image, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Press } from '../components/Press';
import { useTheme, inr, tint } from '../theme';
import { Icon } from '../icons';
import { useStore, paymentTypeMeta, CLASSIFICATIONS } from '../store';
import { RootStackParamList } from '../navigation';
import { monthName, chipDate } from '../utils';
import { pickReceipt, receiptUri } from '../receipts';

function fmtAmount(str: string): string {
  if (!str) return '0';
  const p = str.split('.');
  const intPart = p[0] === '' ? '0' : inr(Number(p[0]));
  return p.length > 1 ? intPart + '.' + p[1] : intPart;
}

// Normalises typed amount text to the draft format: digits with at most one decimal point,
// two decimal places and eight digits in total. The field displays Indian grouping, so commas
// are dropped — except a freshly typed trailing comma, which locales with a comma decimal
// separator send from the decimal keypad. Input that would break a limit is rejected.
function parseAmountInput(text: string, prev: string): string {
  let s = text;
  if (s.endsWith(',') && !prev.includes('.')) s = s.slice(0, -1) + '.';
  s = s.replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  let int = (dot === -1 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, '');
  const dec = dot === -1 ? null : s.slice(dot + 1).replace(/\./g, '');
  if (dec !== null && dec.length > 2) return prev;
  if (dec !== null && int === '') int = '0';
  if ((int + (dec ?? '')).length > 8) return prev;
  return dec === null ? int : int + '.' + dec;
}
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SPLIT_MONTHS = 24;
const DANGER = '#FF5C5C';

// iOS reports the keyboard before it animates in, Android only once it has settled.
const KB_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KB_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

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

// Full-screen add/edit expense. Amount and description use the system keyboard; Save stays
// pinned to the bottom (riding above the keyboard) so the primary action is always in reach.
// The draft lives in the store — callers prime it (beginNewExpense / beginEditExpense)
// before navigating.
export function AddExpense() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { draft, setDraft, saveExpense, resetExpenseEntry, categories, editingId, deleteExpense, accounts, runWithoutRelock } = useStore();
  const isEditing = editingId !== null;
  const amountRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  // Clear the draft + edit target when the screen leaves the stack (back button, swipe,
  // hardware back, or the lock screen swapping the tree out).
  useEffect(() => resetExpenseEntry, [resetExpenseEntry]);

  // Once the entry is committed or deleted the screen is on its way out; ignore further
  // taps so a quick double-tap cannot log the same expense twice.
  const leaving = useRef(false);
  const onSave = () => {
    if (leaving.current) return;
    if (saveExpense()) { leaving.current = true; navigation.goBack(); }
  };
  const onDelete = () => {
    const id = editingId;
    if (!id) return;
    Alert.alert('Delete expense?', 'It will be removed from your history and totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          if (leaving.current) return;
          leaving.current = true;
          deleteExpense(id);
          navigation.goBack();
        },
      },
    ]);
  };

  // Tracks the system keyboard: it drives the header's Done button, and the bottom bar drops
  // its home-indicator inset while the keyboard already covers that area.
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(KB_SHOW, () => setKbOpen(true));
    const hide = Keyboard.addListener(KB_HIDE, () => setKbOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const amt = Number(draft.amount);
  const canSave = amt > 0 && !!draft.desc.trim() && !!draft.cat;

  // ---- date picker ----
  const today = new Date();
  const selDate = new Date(draft.date);
  const [showCal, setShowCal] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(selDate.getFullYear(), selDate.getMonth(), 1));
  const dateLabel = sameDay(selDate, today) ? 'Today' : chipDate(selDate);

  const openCal = () => {
    Keyboard.dismiss();
    setViewMonth(new Date(selDate.getFullYear(), selDate.getMonth(), 1));
    setShowCal(true);
  };
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

  // A source created from here is selected straight away (see AddPaymentSource).
  const newSource = () => { Keyboard.dismiss(); navigation.navigate('AddPaymentSource', { selectForExpense: true }); };

  // ---- receipt photo ----
  // Picked images stay in the draft as cache URIs; the store copies them into app storage on save.
  const [showReceipt, setShowReceipt] = useState(false);
  const attachReceipt = async (source: 'camera' | 'library') => {
    try {
      const res = await runWithoutRelock(() => pickReceipt(source));
      if ('uri' in res) setDraft({ receipt: res.uri });
      else if ('denied' in res) {
        Alert.alert('Camera access needed', 'Allow SpendWise to use the camera in Settings to photograph receipts.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { Linking.openSettings().catch(() => {}); } },
        ]);
      }
    } catch {
      Alert.alert('Could not open ' + (source === 'camera' ? 'the camera' : 'your photos'), 'Please try again.');
    }
  };
  const chooseReceipt = () => {
    Keyboard.dismiss();
    Alert.alert(draft.receipt ? 'Replace receipt' : 'Add receipt', undefined, [
      { text: 'Take photo', onPress: () => attachReceipt('camera') },
      { text: 'Choose from library', onPress: () => attachReceipt('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const viewReceipt = () => { Keyboard.dismiss(); setShowReceipt(true); };

  const label = { fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 7 } as const;
  const stepBtn = (disabled: boolean) => ({ width: 32, height: 32, borderRadius: 10, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 } as const);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
          </Press>
          <AppText style={{ flex: 1, fontSize: 21, fontWeight: '800', color: t.text }}>{isEditing ? 'Edit expense' : 'Add expense'}</AppText>
          {/* The iOS decimal pad has no return key, so give every keyboard a way out. */}
          {kbOpen && (
            <Press onPress={Keyboard.dismiss} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ fontSize: 13.5, fontWeight: '800', color: t.accent }}>Done</AppText>
            </Press>
          )}
          {isEditing && (
            <Press onPress={onDelete} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tint(DANGER, t.dark), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash" size={18} color={DANGER} />
            </Press>
          )}
        </View>

        {/* Form */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          {/* Amount — the whole row focuses the field, not just the digits. New entries open
              with it focused, since the amount is the one thing every expense needs. */}
          <Pressable onPress={() => amountRef.current?.focus()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingBottom: 12 }}>
            <AppText style={{ fontSize: 24, fontWeight: '700', color: t.faint, marginRight: 2 }}>₹</AppText>
            <TextInput
              ref={amountRef}
              value={draft.amount ? fmtAmount(draft.amount) : ''}
              onChangeText={(text) => setDraft({ amount: parseAmountInput(text, draft.amount) })}
              placeholder="0"
              placeholderTextColor={t.faint}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
              autoFocus={!isEditing}
              selectionColor={t.accent}
              style={{ minWidth: 40, maxWidth: '85%', paddingVertical: 0, fontSize: 44, color: t.text, fontFamily: 'Montserrat_800ExtraBold', textAlign: 'center' }}
            />
          </Pressable>

          {/* Description */}
          <TextInput
            ref={descRef}
            value={draft.desc}
            onChangeText={(desc) => setDraft({ desc })}
            placeholder="What was it for?"
            placeholderTextColor={t.faint}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            style={{ height: 48, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, fontSize: 15, color: t.text, marginBottom: 12, fontFamily: 'Montserrat_600SemiBold' }}
          />

          {/* Need / Want / Invest + date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
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
            <Press onPress={openCal} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.card2 }}>
              <Icon name="cal" size={15} color={t.sub} />
              <AppText numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: t.sub }}>{dateLabel}</AppText>
            </Press>
          </View>

          {/* Category */}
          <AppText style={label}>Category</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -20, marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 2 }}>
            {categories.map((c) => {
              const active = draft.cat === c.id;
              return (
                <Press key={c.id} onPress={() => setDraft({ cat: c.id })} style={{ width: 64, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 15, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: tint(c.color, t.dark), alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                    <Icon name={c.icon} size={18} color={c.color} />
                  </View>
                  <AppText numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: active ? t.accent : t.sub }}>{c.short}</AppText>
                </Press>
              );
            })}
          </ScrollView>

          {/* Payment source (optional) */}
          <AppText style={label}>Payment source · optional</AppText>
          {accounts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -20, marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 2 }}>
              {accounts.map((s) => {
                const active = draft.account === s.id;
                const meta = paymentTypeMeta(s.type);
                return (
                  <Press key={s.id} onPress={() => setDraft({ account: active ? null : s.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: tint(s.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={meta.icon} size={14} color={s.color} />
                    </View>
                    <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.text, maxWidth: 140 }}>{s.name}</AppText>
                  </Press>
                );
              })}
              <Press onPress={newSource} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 14, backgroundColor: t.card2, borderWidth: 1.5, borderColor: 'transparent' }}>
                <Icon name="plus" size={15} color={t.accent} strokeWidth={2.6} />
                <AppText style={{ fontSize: 13, fontWeight: '700', color: t.accent }}>New</AppText>
              </Press>
            </ScrollView>
          ) : (
            <Press onPress={newSource} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.card2, marginBottom: 14 }}>
              <Icon name="plus" size={16} color={t.accent} strokeWidth={2.6} />
              <AppText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: t.sub }}>Add a payment source</AppText>
              <Icon name="chevR" size={15} color={t.faint} strokeWidth={2.4} />
            </Press>
          )}

          {/* Receipt photo (optional) — stored on this device only. */}
          <AppText style={label}>Receipt · optional</AppText>
          {draft.receipt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 8, borderRadius: 14, backgroundColor: t.card2, marginBottom: 14 }}>
              <Pressable onPress={viewReceipt} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image source={{ uri: receiptUri(draft.receipt) }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: t.card }} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 13.5, fontWeight: '700', color: t.text }}>Receipt attached</AppText>
                  <AppText numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: t.faint, marginTop: 2 }}>Tap to view · saved on this device</AppText>
                </View>
              </Pressable>
              <Press onPress={chooseReceipt} style={stepBtn(false)}>
                <Icon name="camera" size={15} color={t.sub} />
              </Press>
              <Press onPress={() => setDraft({ receipt: null })} style={stepBtn(false)}>
                <Icon name="trash" size={15} color={DANGER} />
              </Press>
            </View>
          ) : (
            <Press onPress={chooseReceipt} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.card2, marginBottom: 14 }}>
              <Icon name="camera" size={16} color={t.accent} />
              <AppText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: t.sub }}>Attach a photo of the receipt</AppText>
              <Icon name="chevR" size={15} color={t.faint} strokeWidth={2.4} />
            </Press>
          )}

          {/* Split over months — new entries only; an existing installment is edited on its own. */}
          {!isEditing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 14, backgroundColor: splitOn ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: splitOn ? t.accent : 'transparent' }}>
              <Icon name="repeat" size={18} color={splitOn ? t.accent : t.sub} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13.5, fontWeight: '700', color: splitOn ? t.accent : t.text }}>Split over months</AppText>
                <AppText numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: t.faint, marginTop: 2 }}>{splitHint}</AppText>
              </View>
              <Press onPress={() => stepMonths(-1)} disabled={months <= 1} style={stepBtn(months <= 1)}>
                <Icon name="minus" size={15} color={t.sub} strokeWidth={2.4} />
              </Press>
              <AppText style={{ minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: '800', color: splitOn ? t.accent : t.text }}>{months}</AppText>
              <Press onPress={() => stepMonths(1)} disabled={months >= MAX_SPLIT_MONTHS} style={stepBtn(months >= MAX_SPLIT_MONTHS)}>
                <Icon name="plus" size={15} color={t.accent} strokeWidth={2.4} />
              </Press>
            </View>
          )}
        </ScrollView>

        {/* Save, pinned. It always clears the system nav bar / home indicator with a gap of
            its own on top. Only on iOS, where the keyboard covers the home indicator, is the
            inset dropped while the keyboard is up; Android keeps it so Save never lands on
            the navigation buttons. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'ios' && kbOpen ? 10 : insets.bottom + 12, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line }}>
          <Press
            onPress={onSave}
            disabled={!canSave}
            style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null) }}
          >
            <AppText numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>
              {!canSave
                ? 'Enter amount & details'
                : isEditing
                  ? 'Save changes'
                  : splitOn ? `Add ₹${fmtAmount(draft.amount)} over ${months} months` : 'Add ₹' + fmtAmount(draft.amount)}
            </AppText>
          </Press>
        </View>
      </KeyboardAvoidingView>

      {/* Date picker — a floating card, so opening it never reflows the form. */}
      <Modal visible={showCal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowCal(false)}>
        <Pressable onPress={() => setShowCal(false)} style={{ flex: 1, backgroundColor: 'rgba(8,16,24,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}>
          {/* Inner Pressable claims touches so taps on the card don't close it. */}
          <Pressable onPress={() => {}} style={{ borderRadius: 22, backgroundColor: t.card, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Press onPress={() => shiftMonth(-1)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chevL" size={16} color={t.sub} strokeWidth={2.2} />
              </Press>
              <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text }}>{monthName(viewMonth)} {viewMonth.getFullYear()}</AppText>
              <Press onPress={() => !atCurrentMonth && shiftMonth(1)} disabled={atCurrentMonth} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center', opacity: atCurrentMonth ? 0.35 : 1 }}>
                <Icon name="chevR" size={16} color={t.sub} strokeWidth={2.2} />
              </Press>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {WEEKDAY_LETTERS.map((w, i) => (
                <View key={i} style={{ width: '14.285%', alignItems: 'center' }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: t.faint }}>{w}</AppText>
                </View>
              ))}
            </View>

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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Receipt viewer */}
      <Modal visible={showReceipt && !!draft.receipt} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowReceipt(false)}>
        <Pressable onPress={() => setShowReceipt(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
          {draft.receipt && (
            <Image source={{ uri: receiptUri(draft.receipt) }} resizeMode="contain" style={{ flex: 1, marginTop: insets.top + 60, marginBottom: insets.bottom + 20, marginHorizontal: 12 }} />
          )}
          <Press onPress={() => setShowReceipt(false)} style={{ position: 'absolute', top: insets.top + 8, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color="#fff" strokeWidth={2.2} />
          </Press>
        </Pressable>
      </Modal>
    </View>
  );
}
