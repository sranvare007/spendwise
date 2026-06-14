import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { AppText } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon, IconName } from '../icons';
import { useStore } from '../store';

const TONE: Record<string, { bg: string; icon: IconName }> = {
  good: { bg: '#14B870', icon: 'check' },
  warn: { bg: '#FF9F1C', icon: 'flame' },
  bad: { bg: '#F0453A', icon: 'close' },
};

export function Toast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { toast } = useStore();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [toast, anim]);

  if (!toast) return null;
  const tone = TONE[toast.tone] || TONE.good;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', bottom: insets.bottom + 96, zIndex: 60, opacity: anim, transform: [{ translateY }] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, backgroundColor: t.toastBg, maxWidth: 300, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tone.icon} size={14} color="#fff" strokeWidth={2.4} />
        </View>
        <AppText style={{ fontSize: 13.5, fontWeight: '600', color: t.toastText, flexShrink: 1 }}>{toast.msg}</AppText>
      </View>
    </Animated.View>
  );
}
