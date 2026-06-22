import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, tint, ThemeKey, THEME_META } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore } from '../store';
import { initials } from '../utils';

const THEME_KEYS: ThemeKey[] = ['mint', 'midnight', 'sunburst'];
const TOTAL_STEPS = 5; // welcome, name, budget, theme, done

// First-run onboarding. Collects name + monthly budget + theme across paged steps and
// commits them via completeOnboarding(), which swaps the navigator into the app.
export function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { theme: storeTheme, budget: storeBudget, completeOnboarding } = useStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(storeBudget);
  const [theme, setTheme] = useState<ThemeKey>(storeTheme);

  // Per-step fade/slide, mirroring the old SubScreen transition.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [step, anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const canAdvance = step === 1 ? name.trim().length > 0 : step === 2 ? budget > 0 : true;
  const isLast = step === TOTAL_STEPS - 1;

  const next = () => {
    if (!canAdvance) return;
    if (isLast) { completeOnboarding({ name, budget, theme }); return; }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const nextLabel = step === 0 ? 'Get started' : isLast ? 'Finish' : 'Next';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 24 }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 7, justifyContent: 'center', marginBottom: 8 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={{ height: 7, borderRadius: 99, width: i === step ? 22 : 7, backgroundColor: i === step ? t.accent : t.line }} />
          ))}
        </View>

        {/* Step content */}
        <Animated.View style={{ flex: 1, justifyContent: 'center', opacity: anim, transform: [{ translateY }] }}>
          {step === 0 && (
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="piggy" size={46} color={t.accent} strokeWidth={1.9} />
              </View>
              <AppText style={{ fontSize: 26, fontWeight: '800', color: t.text, marginTop: 24, textAlign: 'center' }}>Welcome to SpendWise</AppText>
              <AppText style={{ fontSize: 14.5, color: t.sub, marginTop: 10, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 }}>Track spending, stick to a budget, and see where your money goes. Let's set up a few things first.</AppText>
            </View>
          )}

          {step === 1 && (
            <View>
              <AppText style={{ fontSize: 23, fontWeight: '800', color: t.text }}>What's your name?</AppText>
              <AppText style={{ fontSize: 14, color: t.sub, marginTop: 8, lineHeight: 20 }}>We'll use it to personalize your dashboard.</AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={t.faint}
                autoFocus
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={next}
                style={{ height: 54, marginTop: 22, paddingHorizontal: 16, borderRadius: 15, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, fontSize: 16, color: t.text, fontFamily: 'Montserrat_600SemiBold' }}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <AppText style={{ fontSize: 23, fontWeight: '800', color: t.text }}>Set a monthly budget</AppText>
              <AppText style={{ fontSize: 14, color: t.sub, marginTop: 8, lineHeight: 20 }}>You can fine-tune this anytime later.</AppText>
              <View style={{ borderRadius: 22, backgroundColor: t.hero, padding: 24, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Press onPress={() => setBudget((b) => Math.max(1000, b - 500))} style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="minus" size={22} color={t.heroNum} strokeWidth={2.6} />
                </Press>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <AppText style={{ fontSize: 20, fontWeight: '700', color: t.heroNum, marginBottom: 5 }}>₹</AppText>
                  <AppText style={{ fontSize: 40, fontWeight: '800', color: t.heroNum }}>{inr(budget)}</AppText>
                </View>
                <Press onPress={() => setBudget((b) => b + 500)} style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={22} color={t.heroNum} strokeWidth={2.6} />
                </Press>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <AppText style={{ fontSize: 23, fontWeight: '800', color: t.text }}>Pick a theme</AppText>
              <AppText style={{ fontSize: 14, color: t.sub, marginTop: 8, lineHeight: 20 }}>Choose the look that suits you — change it whenever.</AppText>
              <View style={{ flexDirection: 'row', gap: 11, marginTop: 24 }}>
                {THEME_KEYS.map((k) => {
                  const m = THEME_META[k];
                  const active = theme === k;
                  return (
                    <Press key={k} onPress={() => setTheme(k)} style={{ flex: 1, padding: 9, borderRadius: 17, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                      <View style={{ height: 66, borderRadius: 14, backgroundColor: m.swatchBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 9 }}>
                        <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: m.dotA }} />
                        <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: m.dotB }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {active && <Icon name="check" size={14} color={t.accent} strokeWidth={2.6} />}
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.sub }}>{m.name}</AppText>
                      </View>
                    </Press>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 30, fontWeight: '800', color: t.accent }}>{initials(name)}</AppText>
              </View>
              <AppText style={{ fontSize: 24, fontWeight: '800', color: t.text, marginTop: 20 }}>You're all set{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}!</AppText>
              <View style={{ width: '100%', borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, marginTop: 22, overflow: 'hidden' }}>
                {[
                  { label: 'Monthly budget', value: '₹' + inr(budget) },
                  { label: 'Theme', value: THEME_META[theme].name },
                ].map((row, i, arr) => (
                  <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                    <AppText style={{ fontSize: 14, fontWeight: '600', color: t.sub }}>{row.label}</AppText>
                    <AppText style={{ fontSize: 14, fontWeight: '800', color: t.text }}>{row.value}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Footer buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {step > 0 && (
            <Press onPress={back} style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevL" size={20} color={t.text} strokeWidth={2.2} />
            </Press>
          )}
          <Press
            onPress={next}
            disabled={!canAdvance}
            style={{ flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: canAdvance ? t.accent : t.card2, ...(canAdvance ? { shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null) }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '800', color: canAdvance ? t.onAccent : t.faint }}>{nextLabel}</AppText>
            {!isLast && <Icon name="chevR" size={19} color={canAdvance ? t.onAccent : t.faint} strokeWidth={2.4} />}
          </Press>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
