import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { useStore } from '../store';
import { Theme } from '../theme';
import { Home } from '../screens/Home';
import { Analytics } from '../screens/Analytics';
import { Insights } from '../screens/Insights';
import { Settings } from '../screens/Settings';
import { SubScreen } from '../screens/SubScreen';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ThemeSheet } from '../components/ThemeSheet';
import { LockScreen } from '../components/LockScreen';
import { Onboarding } from '../screens/Onboarding';
import { EditProfile } from '../screens/EditProfile';
import { PaymentSources } from '../screens/PaymentSources';
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
  Onboarding: undefined;
  Tabs: undefined;
  Budgets: undefined;
  Recurring: undefined;
  Categories: undefined;
  Export: undefined;
  EditProfile: undefined;
  PaymentSources: undefined;
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

// Root stack, gated with the auth-flow pattern. Priority: first-run onboarding, then the
// biometric lock, then the app. Flipping `onboarded`/`locked` swaps the tree automatically.
export function RootNavigator() {
  const { onboarded, locked } = useStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboarded ? (
        <Stack.Screen name="Onboarding" component={Onboarding} />
      ) : locked ? (
        <Stack.Screen name="Lock" component={LockScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabsNavigator} />
          <Stack.Screen name="Budgets" component={SubScreen} />
          <Stack.Screen name="Recurring" component={SubScreen} />
          <Stack.Screen name="Categories" component={SubScreen} />
          <Stack.Screen name="Export" component={SubScreen} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen name="PaymentSources" component={PaymentSources} />
          <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade' }}>
            <Stack.Screen name="AddExpense" component={AddExpenseModal} />
            <Stack.Screen name="ThemeSheet" component={ThemeSheet} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}

// Map the active app theme onto a React Navigation theme so screen backgrounds and
// transitions use the selected theme. Takes the theme explicitly (rather than reading
// ThemeContext) because the caller lives above the ThemeContext.Provider — reading the
// context there would always yield the default (mint) theme and desync screen backgrounds.
export function buildNavTheme(t: Theme): NavTheme {
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
