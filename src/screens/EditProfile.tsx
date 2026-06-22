import React, { useState } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, inr, ThemeKey, THEME_META } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore } from '../store';

const THEME_KEYS: ThemeKey[] = ['mint', 'midnight', 'sunburst'];

// Edit the details captured during onboarding (name + monthly budget + theme).
// Reached from the Settings profile row.
export function EditProfile() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profileName, budget: storeBudget, theme: storeTheme, saveProfile } = useStore();

  const [name, setName] = useState(profileName);
  const [budget, setBudget] = useState(storeBudget);
  const [theme, setTheme] = useState<ThemeKey>(storeTheme);

  const canSave = name.trim().length > 0 && budget > 0;
  const onSave = () => {
    if (!canSave) return;
    saveProfile({ name, budget, theme });
    navigation.goBack();
  };

  const label = { fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <AppText style={{ fontSize: 21, fontWeight: '800', color: t.text }}>Edit profile</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>
        {/* Name */}
        <AppText style={label}>Name</AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={t.faint}
          maxLength={32}
          style={{ height: 54, paddingHorizontal: 16, borderRadius: 15, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, fontSize: 16, color: t.text, fontFamily: 'Montserrat_600SemiBold' }}
        />

        {/* Budget */}
        <AppText style={[label, { marginTop: 24 }]}>Monthly budget</AppText>
        <View style={{ borderRadius: 20, backgroundColor: t.hero, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Press onPress={() => setBudget((b) => Math.max(1000, b - 500))} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="minus" size={20} color={t.heroNum} strokeWidth={2.6} />
          </Press>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <AppText style={{ fontSize: 18, fontWeight: '700', color: t.heroNum, marginBottom: 4 }}>₹</AppText>
            <AppText style={{ fontSize: 36, fontWeight: '800', color: t.heroNum }}>{inr(budget)}</AppText>
          </View>
          <Press onPress={() => setBudget((b) => b + 500)} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={20} color={t.heroNum} strokeWidth={2.6} />
          </Press>
        </View>

        {/* Theme */}
        <AppText style={[label, { marginTop: 24 }]}>Theme</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {THEME_KEYS.map((k) => {
            const m = THEME_META[k];
            const active = theme === k;
            return (
              <Press key={k} onPress={() => setTheme(k)} style={{ flex: 1, padding: 8, borderRadius: 15, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                <View style={{ height: 46, borderRadius: 11, backgroundColor: m.swatchBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 8 }}>
                  <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: m.dotA }} />
                  <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: m.dotB }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {active && <Icon name="check" size={13} color={t.accent} strokeWidth={2.6} />}
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: active ? t.accent : t.sub }}>{m.name}</AppText>
                </View>
              </Press>
            );
          })}
        </View>

        {/* Save */}
        <Press
          onPress={onSave}
          disabled={!canSave}
          style={{ height: 54, marginTop: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null) }}
        >
          <Icon name="check" size={19} color={canSave ? t.onAccent : t.faint} strokeWidth={2.6} />
          <AppText style={{ fontSize: 16, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>Save changes</AppText>
        </Press>
      </ScrollView>
    </View>
  );
}
