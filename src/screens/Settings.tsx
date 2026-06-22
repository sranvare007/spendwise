import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, tint, inr, ThemeKey, THEME_META } from '../theme';
import { Icon, IconName } from '../icons';
import { Press } from '../components/Press';
import { Toggle } from '../components/Toggle';
import { useStore, Settings as SettingsType } from '../store';
import { RootStackParamList } from '../navigation';
import { initials } from '../utils';
import { getBiometricCapability, BioCapability } from '../biometric';

type SubRoute = 'Budgets' | 'Recurring' | 'Categories' | 'Export';

export function Settings() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, setTheme, budget, recurring, settings, toggleSetting, setBiometric, expenses, categories, clearExpenses, profileName } = useStore();
  const displayName = profileName.trim() || 'there';

  const confirmClear = () => {
    if (expenses.length === 0) { clearExpenses(); return; }
    Alert.alert(
      'Clear expense data?',
      `This permanently deletes all ${expenses.length} expenses. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: clearExpenses },
      ],
    );
  };

  const [bioCap, setBioCap] = useState<BioCapability | null>(null);
  useEffect(() => {
    let alive = true;
    getBiometricCapability().then((c) => { if (alive) setBioCap(c); });
    return () => { alive = false; };
  }, []);

  const bioLabel = bioCap?.label ?? 'Biometric';
  const bioOn = settings.biometric;
  // Allow turning the lock off even if hardware is gone; only block turning it on.
  const bioInteractive = bioOn || (bioCap?.available ?? false);
  const bioDetail = bioOn
    ? `Unlock with ${bioLabel}`
    : bioCap && !bioCap.available
      ? (bioCap.reason ?? 'Unavailable on this device')
      : `Require ${bioLabel} to open the app`;

  const manageRows: { icon: IconName; color: string; label: string; detail: string; route: SubRoute }[] = [
    { icon: 'target', color: '#07CB73', label: 'Budgets', detail: '₹' + inr(budget), route: 'Budgets' },
    { icon: 'repeat', color: '#5B8DEF', label: 'Recurring expenses', detail: recurring.filter((r) => !r.paused).length + ' active', route: 'Recurring' },
    { icon: 'tag', color: '#C77DFF', label: 'Categories', detail: String(categories.length), route: 'Categories' },
    { icon: 'download', color: '#FFB23E', label: 'Export data', detail: 'CSV', route: 'Export' },
  ];

  const toggleRows: { icon: IconName; color: string; label: string; key: keyof SettingsType }[] = [
    { icon: 'bell', color: '#FF7A5C', label: 'Budget alerts', key: 'budgetAlerts' },
    { icon: 'cal', color: '#4C9AFF', label: 'Weekly summary', key: 'weeklySummary' },
    { icon: 'repeat', color: '#2BD4A8', label: 'Recurring reminders', key: 'recurringReminders' },
  ];

  const themeKeys: ThemeKey[] = ['mint', 'midnight', 'sunburst'];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <AppText style={{ fontSize: 28, fontWeight: '800', color: t.text }}>Settings</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 }}>
        {/* Profile */}
        <Press onPress={() => navigation.navigate('EditProfile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 16 }}>
          <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontWeight: '800', fontSize: 18, color: t.accent }}>{initials(displayName)}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: t.text }}>{displayName}</AppText>
            <AppText style={{ fontSize: 13, color: t.faint }}>Free plan · Tap to manage</AppText>
          </View>
          <Icon name="chevR" size={16} color={t.faint} strokeWidth={2.4} />
        </Press>

        {/* Appearance */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 }}>Appearance</AppText>
        <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, padding: 16 }}>
          <AppText style={{ fontSize: 13.5, fontWeight: '700', color: t.text, marginBottom: 12 }}>App theme</AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {themeKeys.map((k) => {
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
        </View>

        {/* Budget & data */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 }}>Budget & data</AppText>
        <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
          {manageRows.map((m, i) => (
            <Press key={m.label + i} onPress={() => navigation.navigate(m.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i === manageRows.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(m.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={18} color={m.color} />
              </View>
              <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: t.text }}>{m.label}</AppText>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: t.faint }}>{m.detail}</AppText>
              <Icon name="chevR" size={14} color={t.faint} strokeWidth={2.4} />
            </Press>
          ))}
          <Press onPress={confirmClear} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: t.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint('#FF5C5C', t.dark), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash" size={18} color="#FF5C5C" />
            </View>
            <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: '#FF5C5C' }}>Clear expense data</AppText>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: t.faint }}>{expenses.length}</AppText>
          </Press>
        </View>

        {/* Notifications */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 }}>Notifications</AppText>
        <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
          {toggleRows.map((r, i) => (
            <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i === toggleRows.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(r.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={r.icon} size={18} color={r.color} />
              </View>
              <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: t.text }}>{r.label}</AppText>
              <Toggle on={settings[r.key]} onToggle={() => toggleSetting(r.key)} />
            </View>
          ))}
        </View>

        {/* Security */}
        <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 }}>Security</AppText>
        <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16, opacity: bioInteractive ? 1 : 0.55 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint('#8C7BFF', t.dark), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={18} color="#8C7BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 14.5, fontWeight: '600', color: t.text }}>{bioLabel} lock</AppText>
              <AppText style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{bioDetail}</AppText>
            </View>
            <Toggle on={bioOn} onToggle={() => { if (bioInteractive) setBiometric(!bioOn); }} />
          </View>
        </View>

        <AppText style={{ textAlign: 'center', fontSize: 12, color: t.faint, marginTop: 26 }}>SpendWise v1.0 · Made with the GoTo palette</AppText>
      </ScrollView>
    </View>
  );
}
