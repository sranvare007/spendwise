import React from 'react';
import { View, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon, IconName } from '../icons';
import { Press } from './Press';
import { useStore } from '../store';

type TabMeta = { route: string; icon: IconName; label: string };
const LEFT: TabMeta[] = [
  { route: 'Home', icon: 'home', label: 'Home' },
  { route: 'Analytics', icon: 'chart', label: 'Stats' },
];
const RIGHT: TabMeta[] = [
  { route: 'Insights', icon: 'bulb', label: 'Insights' },
  { route: 'Settings', icon: 'gear', label: 'Settings' },
];

// Custom tab bar for the bottom-tab navigator. Preserves the pill tabs + floating
// center FAB; the FAB opens the Add-Expense modal (a parent-stack route).
export function BottomBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { beginNewExpense } = useStore();
  const bottomPad = Math.max(insets.bottom, 10);
  const activeRoute = state.routes[state.index]?.name;

  const onPressTab = (route: string) => {
    const event = navigation.emit({ type: 'tabPress', target: route, canPreventDefault: true });
    if (activeRoute !== route && !event.defaultPrevented) navigation.navigate(route);
  };

  const renderTab = (item: TabMeta) => {
    const active = activeRoute === item.route;
    const color = active ? t.accent : t.faint;
    return (
      <Pressable key={item.route} onPress={() => onPressTab(item.route)} style={{ width: 54, alignItems: 'center', gap: 4, paddingVertical: 6 }}>
        <Icon name={item.icon} size={23} color={color} />
        <AppText style={{ fontSize: 10.5, fontWeight: '700', color }}>{item.label}</AppText>
      </Pressable>
    );
  };

  const openAdd = () => {
    beginNewExpense();
    navigation.navigate('AddExpense');
  };

  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 11, paddingBottom: bottomPad, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: t.navBg, borderTopWidth: 1, borderTopColor: t.line, zIndex: 30 }}>
        {LEFT.map(renderTab)}
        <View style={{ width: 60 }} />
        {RIGHT.map(renderTab)}
      </View>
      <Press
        onPress={openAdd}
        style={{ position: 'absolute', alignSelf: 'center', bottom: bottomPad + 18, width: 62, height: 62, borderRadius: 21, backgroundColor: t.fab, borderWidth: 4, borderColor: t.navSolid, alignItems: 'center', justifyContent: 'center', zIndex: 31, shadowColor: t.fab, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
      >
        <Icon name="plus" size={28} color={t.fabIcon} strokeWidth={2.6} />
      </Press>
    </>
  );
}
