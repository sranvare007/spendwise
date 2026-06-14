import React, { useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, Animated, Pressable, Dimensions } from 'react-native';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, tint } from '../theme';
import { Icon } from '../icons';
import { Press } from './Press';
import { useStore, CATS } from '../store';

const SCREEN_H = Dimensions.get('window').height;

function fmtAmount(str: string): string {
  if (!str) return '0';
  const p = str.split('.');
  const intPart = p[0] === '' ? '0' : inr(Number(p[0]));
  return p.length > 1 ? intPart + '.' + p[1] : intPart;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export function AddExpenseModal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { draft, setDraft, pressKey, delKey, saveExpense, closeModal } = useStore();

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });
  const amt = Number(draft.amount);
  const canSave = amt > 0 && !!draft.desc.trim() && !!draft.cat;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,16,24,0.5)', opacity: slide }}>
        <Pressable style={{ flex: 1 }} onPress={closeModal} />
      </Animated.View>

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY }] }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
          <View style={{ width: 36 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 11, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: t.line }} />
          </View>
          <AppText style={{ fontSize: 17, fontWeight: '800', color: t.text }}>Add expense</AppText>
          <Press onPress={closeModal} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={17} color={t.sub} strokeWidth={2.2} />
          </Press>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {/* Amount */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <AppText style={{ fontSize: 26, fontWeight: '700', color: t.faint, marginBottom: 6 }}>₹</AppText>
              <AppText style={{ fontSize: 52, fontWeight: '800', color: amt > 0 ? t.text : t.faint, lineHeight: 56 }}>{fmtAmount(draft.amount)}</AppText>
            </View>
          </View>

          {/* Want/Need + Today */}
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 10, marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: t.card2 }}>
              {(['NEED', 'WANT'] as const).map((k) => {
                const active = draft.wn === k;
                return (
                  <Press key={k} onPress={() => setDraft({ wn: k })} style={{ minWidth: 62, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accent : 'transparent' }}>
                    <AppText style={{ fontSize: 12.5, fontWeight: '700', color: active ? t.onAccent : t.sub }}>{k === 'NEED' ? 'Need' : 'Want'}</AppText>
                  </Press>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 12, backgroundColor: t.card2 }}>
              <Icon name="cal" size={15} color={t.sub} />
              <AppText style={{ fontSize: 13, fontWeight: '700', color: t.sub }}>Today</AppText>
            </View>
          </View>

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
            {CATS.map((c) => {
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
            onPress={saveExpense}
            disabled={!canSave}
            style={{ height: 54, marginTop: 9, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null) }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>{canSave ? 'Add ₹' + fmtAmount(draft.amount) : 'Enter amount & details'}</AppText>
          </Press>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
