import React, { useMemo, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore } from '../store';
import { discardRestore, PendingRestore } from '../backup';
import { chipDate } from '../utils';

const fullDate = (iso: string) => { const d = new Date(iso); return `${chipDate(d)} ${d.getFullYear()}`; };
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// Settings → Backup & restore. A backup is one compressed file with every table and receipt
// photo; restoring verifies the whole file before replacing anything.
export function Backup() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { expenses, categories, accounts, recurring, lastBackupAt, backupData, prepareRestore, restoreBackup } = useStore();
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const receiptCount = useMemo(() => new Set(expenses.map((e) => e.receipt).filter(Boolean)).size, [expenses]);

  const onBackup = async () => {
    if (busy) return;
    setBusy('backup');
    try { await backupData(); } finally { setBusy(null); }
  };

  const confirmRestore = (p: PendingRestore) => new Promise<boolean>((resolve) => {
    const c = p.manifest.counts;
    const photos = c.receipts ? `, ${plural(c.receipts, 'receipt photo')}` : '';
    Alert.alert(
      'Restore this backup?',
      `Backup from ${fullDate(p.manifest.createdAt)}: ${plural(c.expenses, 'expense')}${photos}, ${plural(c.categories, 'category', 'categories')}.\n\n`
        + `Everything currently on this device (${plural(expenses.length, 'expense')}) will be replaced. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Restore', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const pending = await prepareRestore();
      if (!pending) return;
      if (await confirmRestore(pending)) await restoreBackup(pending);
      else discardRestore(pending);
    } finally {
      setBusy(null);
    }
  };

  const rows = [
    { label: 'Expenses', value: String(expenses.length) },
    { label: 'Receipt photos', value: String(receiptCount) },
    { label: 'Categories · payment sources', value: `${categories.length} · ${accounts.length}` },
    { label: 'Recurring expenses', value: String(recurring.length) },
    { label: 'Last backup', value: lastBackupAt ? fullDate(lastBackupAt) : 'Never', accent: !lastBackupAt },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={18} color={t.text} strokeWidth={2.2} />
        </Press>
        <AppText style={{ fontSize: 21, fontWeight: '800', color: t.text }}>Backup & restore</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 30 }}>
        <AppText style={{ fontSize: 13, color: t.sub, marginBottom: 16, lineHeight: 19.5 }}>
          Save a complete copy of your data (expenses, receipt photos, categories, payment sources, recurring expenses and settings) as one compressed file. Restore it on this or a new phone.
        </AppText>

        <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, overflow: 'hidden', marginBottom: 16 }}>
          {rows.map((row, i) => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
              <AppText style={{ fontSize: 14, fontWeight: '600', color: t.text }}>{row.label}</AppText>
              <AppText style={{ fontSize: 13.5, fontWeight: '700', color: row.accent ? '#FF9F1C' : t.faint }}>{row.value}</AppText>
            </View>
          ))}
        </View>

        <Press onPress={onBackup} disabled={!!busy} style={{ height: 54, borderRadius: 16, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: busy && busy !== 'backup' ? 0.6 : 1, shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
          {busy === 'backup' ? <ActivityIndicator color={t.onAccent} /> : <Icon name="download" size={20} color={t.onAccent} strokeWidth={2.2} />}
          <AppText style={{ fontSize: 16, fontWeight: '800', color: t.onAccent }}>{busy === 'backup' ? 'Creating backup…' : 'Create backup'}</AppText>
        </Press>

        <Press onPress={onRestore} disabled={!!busy} style={{ height: 50, marginTop: 10, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy && busy !== 'restore' ? 0.6 : 1 }}>
          {busy === 'restore' ? <ActivityIndicator color={t.accent} /> : <Icon name="repeat" size={17} color={t.accent} />}
          <AppText style={{ fontSize: 15, fontWeight: '700', color: t.accent }}>{busy === 'restore' ? 'Checking backup…' : 'Restore from backup'}</AppText>
        </Press>

        <View style={{ flexDirection: 'row', gap: 10, borderRadius: 14, backgroundColor: t.card2, paddingVertical: 13, paddingHorizontal: 14, marginTop: 18 }}>
          <Icon name="lock" size={16} color={t.sub} />
          <AppText style={{ flex: 1, fontSize: 12.5, color: t.sub, lineHeight: 18.5 }}>
            Keep the file somewhere safe, like Google Drive, iCloud Drive or Files. Every backup carries checksums, so a damaged file is caught before anything on your phone is replaced. Restoring overwrites all current data.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
