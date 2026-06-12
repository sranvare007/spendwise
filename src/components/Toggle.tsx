import React from 'react';
import { View } from 'react-native';
import { Press } from './Press';
import { useTheme } from '../theme';

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <Press
      onPress={onToggle}
      style={{
        width: 46, height: 28, borderRadius: 99, padding: 3,
        justifyContent: 'center', alignItems: on ? 'flex-end' : 'flex-start',
        backgroundColor: on ? t.accent : t.card2,
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
    </Press>
  );
}
