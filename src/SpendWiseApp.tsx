import React from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import { ThemeContext, THEMES } from './theme';
import { StoreProvider, useStore } from './store';
import { Home } from './screens/Home';
import { Analytics } from './screens/Analytics';
import { Insights } from './screens/Insights';
import { Settings } from './screens/Settings';
import { SubScreen } from './screens/SubScreen';
import { BottomBar } from './components/BottomBar';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ThemeSheet } from './components/ThemeSheet';
import { Toast } from './components/Toast';
import { Confetti } from './components/Confetti';

function Root() {
  const { ready, theme, tab, sub, modalOpen, themeSheetOpen } = useStore();
  const t = THEMES[theme];

  return (
    <ThemeContext.Provider value={t}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {!ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <>
            {tab === 'home' && <Home />}
            {tab === 'analytics' && <Analytics />}
            {tab === 'insights' && <Insights />}
            {tab === 'settings' && <Settings />}

            {sub && <SubScreen />}
            <BottomBar />
            {modalOpen && <AddExpenseModal />}
            {themeSheetOpen && <ThemeSheet />}
            <Toast />
            <Confetti />
          </>
        )}
      </View>
    </ThemeContext.Provider>
  );
}

export function SpendWiseApp() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
