import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon, IconName } from '../icons';
import { Press } from './Press';
import { useStore, Tab } from '../store';

const LEFT: { key: Tab; icon: IconName; label: string }[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'analytics', icon: 'chart', label: 'Stats' },
];
const RIGHT: { key: Tab; icon: IconName; label: string }[] = [
  { key: 'insights', icon: 'bulb', label: 'Insights' },
  { key: 'settings', icon: 'gear', label: 'Settings' },
];

export function BottomBar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tab, sub, setTab, openModal } = useStore();
  const bottomPad = Math.max(insets.bottom, 10);

  const renderTab = (item: { key: Tab; icon: IconName; label: string }) => {
    const active = tab === item.key && !sub;
    const color = active ? t.accent : t.faint;
    return (
      <Pressable key={item.key} onPress={() => setTab(item.key)} style={{ width: 54, alignItems: 'center', gap: 4, paddingVertical: 6 }}>
        <Icon name={item.icon} size={23} color={color} />
        <Text style={{ fontSize: 10.5, fontWeight: '700', color }}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 11, paddingBottom: bottomPad, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: t.navBg, borderTopWidth: 1, borderTopColor: t.line, zIndex: 30 }}>
        {LEFT.map(renderTab)}
        <View style={{ width: 60 }} />
        {RIGHT.map(renderTab)}
      </View>
      <Press
        onPress={openModal}
        style={{ position: 'absolute', alignSelf: 'center', bottom: bottomPad + 18, width: 62, height: 62, borderRadius: 21, backgroundColor: t.fab, borderWidth: 4, borderColor: t.navSolid, alignItems: 'center', justifyContent: 'center', zIndex: 31, shadowColor: t.fab, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
      >
        <Icon name="plus" size={28} color={t.fabIcon} strokeWidth={2.6} />
      </Press>
    </>
  );
}
