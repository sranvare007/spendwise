import React from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeContext, THEMES } from './theme';
import { StoreProvider, useStore } from './store';
import { RootNavigator, useNavTheme } from './navigation';
import { Toast } from './components/Toast';
import { Confetti } from './components/Confetti';

function Root() {
  const { ready, theme } = useStore();
  const t = THEMES[theme];
  const navTheme = useNavTheme();

  return (
    <ThemeContext.Provider value={t}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {!ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        )}
        {/* Global overlays — not part of navigation, float above every screen. */}
        <Toast />
        <Confetti />
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
