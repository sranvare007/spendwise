import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Home } from '../screens/Home';
import { Analytics } from '../screens/Analytics';
import { Insights } from '../screens/Insights';
import { Settings } from '../screens/Settings';
import { SubScreen } from '../screens/SubScreen';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ThemeSheet } from '../components/ThemeSheet';
import { LockScreen } from '../components/LockScreen';
import { BottomBar } from '../components/BottomBar';

// Which variant of the shared SubScreen to render. Derived from the route name so the
// one component backs all four nested stack screens with no params to pass.
export type SubKind = 'budgets' | 'recurring' | 'categories' | 'export';
export type SubRouteName = 'Budgets' | 'Recurring' | 'Categories' | 'Export';
export const SUB_KIND_BY_ROUTE: Record<SubRouteName, SubKind> = {
  Budgets: 'budgets',
  Recurring: 'recurring',
  Categories: 'categories',
  Export: 'export',
};

export type RootStackParamList = {
  Tabs: undefined;
  Budgets: undefined;
  Recurring: undefined;
  Categories: undefined;
  Export: undefined;
  AddExpense: undefined;
  ThemeSheet: undefined;
  Lock: undefined;
};

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomBar {...props} />}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Analytics" component={Analytics} />
      <Tab.Screen name="Insights" component={Insights} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}

// Root stack. `locked` gates the tree (auth-flow pattern): while locked only the Lock
// screen exists, so unlocking (locked -> false) swaps the stack back to the app.
export function RootNavigator() {
  const { locked } = useStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {locked ? (
        <Stack.Screen name="Lock" component={LockScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabsNavigator} />
          <Stack.Screen name="Budgets" component={SubScreen} />
          <Stack.Screen name="Recurring" component={SubScreen} />
          <Stack.Screen name="Categories" component={SubScreen} />
          <Stack.Screen name="Export" component={SubScreen} />
          <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade' }}>
            <Stack.Screen name="AddExpense" component={AddExpenseModal} />
            <Stack.Screen name="ThemeSheet" component={ThemeSheet} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}

// Map the active app theme onto a React Navigation theme so screen transitions use the
// app background instead of flashing white.
export function useNavTheme(): NavTheme {
  const t = useTheme();
  const base = t.dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: t.bg,
      card: t.card,
      text: t.text,
      border: t.line,
      primary: t.accent,
      notification: t.accent,
    },
  };
}
