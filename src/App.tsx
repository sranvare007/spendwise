import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SpendWiseApp } from './SpendWiseApp';

SplashScreen.preventAutoHideAsync();

export function App() {
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SpendWiseApp />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
