import React, { useEffect, useRef } from 'react';
import { View, Animated, Pressable, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeKey, THEME_META } from '../theme';
import { Icon } from '../icons';
import { Press } from './Press';
import { useStore } from '../store';

const SCREEN_H = Dimensions.get('window').height;
const KEYS: ThemeKey[] = ['mint', 'midnight', 'sunburst'];

export function ThemeSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, setTheme } = useStore();

  const closeThemeSheet = () => navigation.goBack();
  const pickTheme = (k: ThemeKey) => { setTheme(k); navigation.goBack(); };

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 47 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,16,24,0.5)', opacity: slide }}>
        <Pressable style={{ flex: 1 }} onPress={closeThemeSheet} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 30, transform: [{ translateY }] }}>
        <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: t.line, alignSelf: 'center', marginBottom: 18 }} />
        <AppText style={{ fontSize: 17, fontWeight: '800', color: t.text, marginBottom: 4 }}>Choose a theme</AppText>
        <AppText style={{ fontSize: 13, color: t.faint, marginBottom: 18 }}>Applies across the whole app, instantly.</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {KEYS.map((k) => {
            const m = THEME_META[k];
            const active = theme === k;
            return (
              <Press key={k} onPress={() => pickTheme(k)} style={{ flex: 1, padding: 8, borderRadius: 15, backgroundColor: active ? t.accentSoft : t.card2, borderWidth: 1.5, borderColor: active ? t.accent : 'transparent' }}>
                <View style={{ height: 60, borderRadius: 13, backgroundColor: m.swatchBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 9 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: m.dotA }} />
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: m.dotB }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {active && <Icon name="check" size={14} color={t.accent} strokeWidth={2.6} />}
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: active ? t.accent : t.sub }}>{m.name}</AppText>
                </View>
              </Press>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
