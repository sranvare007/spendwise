import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from './AppText';
import { Press } from './Press';
import { Icon } from '../icons';
import { useTheme } from '../theme';
import { useStore } from '../store';

// Full-screen overlay shown whenever the app is locked. It owns the unlock UX:
// auto-prompts once on mount, then lets the user retry after any failure.
export function LockScreen() {
  const t = useTheme();
  const { requestUnlock } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  const attempt = useCallback(async () => {
    if (busy) return; // avoid stacking prompts
    setBusy(true);
    setMessage(null);
    const r = await requestUnlock();
    if (!mounted.current) return;
    if (!r.ok) setMessage(r.message ?? 'Try again.');
    setBusy(false);
  }, [busy, requestUnlock]);

  // Auto-prompt once when the lock screen appears (cold start / return to foreground).
  useEffect(() => {
    mounted.current = true;
    attempt();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: t.bg }]}>
      <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
        <Icon name="lock" size={44} color={t.accent} strokeWidth={1.9} />
      </View>
      <AppText style={{ fontSize: 22, fontWeight: '800', color: t.text, marginTop: 22 }}>SpendWise is locked</AppText>
      <AppText style={{ fontSize: 14, color: t.sub, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
        {message ?? 'Verify your identity to continue.'}
      </AppText>

      <Press
        onPress={attempt}
        disabled={busy}
        style={{
          marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 9,
          paddingVertical: 14, paddingHorizontal: 26, borderRadius: 16,
          backgroundColor: t.accent, opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color={t.onAccent} />
        ) : (
          <Icon name="lock" size={18} color={t.onAccent} strokeWidth={2.2} />
        )}
        <AppText style={{ fontSize: 15, fontWeight: '700', color: t.onAccent }}>
          {busy ? 'Verifying…' : 'Unlock'}
        </AppText>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  badge: { width: 92, height: 92, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
