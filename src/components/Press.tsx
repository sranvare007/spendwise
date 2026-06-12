import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';

interface PressProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children?: React.ReactNode;
}

// Pressable that scales down slightly while pressed, mirroring the prototype's .sw-press.
export function Press({ style, scale = 0.97, children, ...rest }: PressProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && { transform: [{ scale }] }]}
    >
      {children}
    </Pressable>
  );
}
