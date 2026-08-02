import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Animated, Pressable, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { Press } from '../components/Press';
import { useStore } from '../store';
import { PaymentForm } from './PaymentSources';

const SCREEN_H = Dimensions.get('window').height;

// Bottom-sheet modal for creating a payment source. Opened from the FAB on the Payment
// sources screen and the "New" action in the Add-Expense modal.
export function AddPaymentSource() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addPaymentSource } = useStore();

  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });
  const close = () => navigation.goBack();

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,16,24,0.5)', opacity: slide }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY }] }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
          <View style={{ width: 36 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 11, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: t.line }} />
          </View>
          <AppText style={{ fontSize: 17, fontWeight: '800', color: t.text }}>Add payment source</AppText>
          <Press onPress={close} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={17} color={t.sub} strokeWidth={2.2} />
          </Press>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }}>
          <PaymentForm onAdd={(input) => { addPaymentSource(input); close(); }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
