import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { useStore } from '../store';

const COLORS = ['#07CB73', '#FFE900', '#4C9AFF', '#FF5C9D', '#FFB23E', '#2BE08A'];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Piece {
  id: number; left: number; size: number; color: string; round: boolean;
  tx: number; rot: number; topStart: number;
}

export function Confetti() {
  const { confettiKey } = useStore();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (confettiKey === 0) return;
    const arr: Piece[] = [];
    for (let i = 0; i < 26; i++) {
      arr.push({
        id: i,
        left: (15 + Math.random() * 70) / 100 * SCREEN_W,
        size: 7 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.5,
        tx: Math.random() * 220 - 110,
        rot: Math.random() * 720 - 360,
        topStart: SCREEN_H * 0.32,
      });
    }
    setPieces(arr);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1700, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPieces([]), 1800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [confettiKey, progress]);

  if (pieces.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 55 }}>
      {pieces.map((p) => {
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 520] });
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
        const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute', top: p.topStart, left: p.left, width: p.size, height: p.size,
              backgroundColor: p.color, borderRadius: p.round ? p.size / 2 : 2,
              opacity, transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
