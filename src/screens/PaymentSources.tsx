import React, { useState } from 'react';
import { View, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, tint } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore, PAYMENT_TYPES, paymentTypeMeta, CATEGORY_COLORS, PaymentType } from '../store';
import { RootStackParamList } from '../navigation';

// Settings → Payment sources. Lists the user's payment sources with delete. Adding a new
// source is done via the FAB, which opens the AddPaymentSource modal. Reached from the
// Settings "Payment sources" row.
export function PaymentSources() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accounts, deletePaymentSource } = useStore();
  const fabBottom = Math.max(insets.bottom, 16) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <AppText style={{ fontSize: 21, fontWeight: '800', color: t.text }}>Payment sources</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: fabBottom + 80 }}>
        <AppText style={{ fontSize: 13, color: t.sub, marginBottom: 14, lineHeight: 19.5 }}>The cards, accounts and wallets you pay through. Pick one when logging an expense.</AppText>

        {accounts.length === 0 ? (
          <View style={{ borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center' }}>
            <Icon name="card" size={26} color={t.faint} />
            <AppText style={{ fontSize: 13.5, fontWeight: '700', color: t.sub, marginTop: 10 }}>No payment sources yet</AppText>
            <AppText style={{ fontSize: 12.5, color: t.faint, marginTop: 4, textAlign: 'center' }}>Tap the + button to add one.</AppText>
          </View>
        ) : (
          <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
            {accounts.map((s, i) => {
              const meta = paymentTypeMeta(s.type);
              return (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: i === accounts.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(s.color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={meta.icon} size={20} color={s.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText style={{ fontSize: 14.5, fontWeight: '700', color: t.text }}>{s.name}</AppText>
                    <AppText style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{meta.label}</AppText>
                  </View>
                  <Press onPress={() => deletePaymentSource(s.id)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tint('#FF5C5C', t.dark), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={17} color="#FF5C5C" />
                  </Press>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB — opens the add-source modal */}
      <Press
        onPress={() => navigation.navigate('AddPaymentSource')}
        style={{ position: 'absolute', right: 20, bottom: fabBottom, width: 60, height: 60, borderRadius: 20, backgroundColor: t.fab, alignItems: 'center', justifyContent: 'center', shadowColor: t.fab, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
      >
        <Icon name="plus" size={28} color={t.fabIcon} strokeWidth={2.6} />
      </Press>
    </View>
  );
}

// Reusable add form (name + type + color). Used by the AddPaymentSource sheet.
export function PaymentForm({ onAdd }: { onAdd: (input: { name: string; type: PaymentType; color: string }) => void }) {
  const t = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentType>(PAYMENT_TYPES[0].type);
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);

  const canSave = name.trim().length > 0;
  const onSave = () => {
    if (!canSave) return;
    onAdd({ name, type, color });
    setName('');
    setType(PAYMENT_TYPES[0].type);
    setColor(CATEGORY_COLORS[0]);
  };

  const label = { fontSize: 12, fontWeight: '700', color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 9 } as const;

  return (
    <>
      {/* Preview + name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tint(color, t.dark), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={paymentTypeMeta(type).icon} size={24} color={color} />
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (e.g. HDFC Credit Card)"
          placeholderTextColor={t.faint}
          maxLength={28}
          style={{ flex: 1, height: 48, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2, fontSize: 15, color: t.text, fontFamily: 'Montserrat_600SemiBold' }}
        />
      </View>

      {/* Type */}
      <AppText style={label}>Type</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {PAYMENT_TYPES.map((p) => {
          const active = type === p.type;
          return (
            <Press key={p.type} onPress={() => setType(p.type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
              <Icon name={p.icon} size={16} color={active ? t.accent : t.sub} />
              <AppText style={{ fontSize: 12.5, fontWeight: '700', color: active ? t.accent : t.sub }}>{p.label}</AppText>
            </Press>
          );
        })}
      </View>

      {/* Color */}
      <AppText style={label}>Color</AppText>
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

      <Press
        onPress={onSave}
        disabled={!canSave}
        style={{ height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: canSave ? t.accent : t.card2, ...(canSave ? { shadowColor: t.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : null) }}
      >
        <Icon name="plus" size={19} color={canSave ? t.onAccent : t.faint} strokeWidth={2.4} />
        <AppText style={{ fontSize: 15.5, fontWeight: '800', color: canSave ? t.onAccent : t.faint }}>{canSave ? 'Add payment source' : 'Enter a name'}</AppText>
      </Press>
    </>
  );
}
