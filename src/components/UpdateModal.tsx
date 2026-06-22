import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { AppText } from './AppText';
import { useTheme } from '../theme';
import { Icon } from '../icons';

// On app start: if an EAS update is available, surface a blocking modal, download it
// while showing live progress, then automatically reload into the new version.
//
// NOTE: expo-updates is disabled in development (`Updates.isEnabled` is false and the
// check/fetch calls reject under __DEV__), so this is inert in the dev client and only
// runs in a release build (preview/production channel) with a published update.
export function UpdateModal() {
  const t = useTheme();
  const {
    isUpdateAvailable, isDownloading, isUpdatePending, isRestarting,
    downloadProgress, checkError, downloadError,
  } = useUpdates();

  const checkedRef = useRef(false);
  const fetchedRef = useRef(false);
  const reloadedRef = useRef(false);

  const active = Updates.isEnabled && !__DEV__;

  // Explicit check on mount (ON_LOAD also checks natively; this guarantees it).
  useEffect(() => {
    if (!active || checkedRef.current) return;
    checkedRef.current = true;
    Updates.checkForUpdateAsync().catch(() => {});
  }, [active]);

  // Begin downloading as soon as an update is found.
  useEffect(() => {
    if (!active) return;
    if (isUpdateAvailable && !isDownloading && !isUpdatePending && !fetchedRef.current) {
      fetchedRef.current = true;
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [active, isUpdateAvailable, isDownloading, isUpdatePending]);

  // Auto-apply once the download has finished.
  useEffect(() => {
    if (!active || !isUpdatePending || reloadedRef.current) return;
    reloadedRef.current = true;
    Updates.reloadAsync().catch(() => {});
  }, [active, isUpdatePending]);

  // Only surface the modal once there is genuinely an update in flight. On any error we
  // hide it and let the app continue on the current version.
  const failed = !!checkError || !!downloadError;
  const visible = active && !failed && (isUpdateAvailable || isDownloading || isUpdatePending || isRestarting);
  if (!visible) return null;

  const applying = isUpdatePending || isRestarting;
  const pct = Math.round(Math.min(1, Math.max(0, downloadProgress ?? 0)) * 100);
  const shownPct = applying ? 100 : pct;
  const title = applying ? 'Applying update…' : 'Updating SpendWise';
  const subtitle = applying
    ? 'Almost there — restarting with the latest version.'
    : 'A new version is available. Downloading the latest improvements…';

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.line }]}>
        <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
          <Icon name="download" size={32} color={t.accent} strokeWidth={2} />
        </View>
        <AppText style={{ fontSize: 18, fontWeight: '800', color: t.text, marginTop: 18 }}>{title}</AppText>
        <AppText style={{ fontSize: 13.5, color: t.sub, marginTop: 6, textAlign: 'center', lineHeight: 19.5 }}>{subtitle}</AppText>

        <View style={{ width: '100%', marginTop: 22 }}>
          <View style={{ height: 10, borderRadius: 99, backgroundColor: t.card2, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 99, width: `${shownPct}%`, backgroundColor: t.accent }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: t.faint }}>{applying ? 'Finalizing' : 'Downloading'}</AppText>
            <AppText style={{ fontSize: 12.5, fontWeight: '800', color: t.accent }}>{shownPct}%</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(8,16,24,0.55)', zIndex: 2000, elevation: 2000 },
  card: { width: '100%', maxWidth: 360, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center' },
  badge: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
