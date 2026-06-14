import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

// Expo registers each Montserrat weight as its own font family, so a plain
// fontWeight won't switch glyphs. This wrapper maps the fontWeight used in
// styles to the matching Montserrat family. Any explicit fontFamily in the
// style (e.g. the monospace CSV preview) is respected.
const FAMILY: Record<string, string> = {
  '100': 'Montserrat_400Regular',
  '200': 'Montserrat_400Regular',
  '300': 'Montserrat_400Regular',
  '400': 'Montserrat_400Regular',
  '500': 'Montserrat_500Medium',
  '600': 'Montserrat_600SemiBold',
  '700': 'Montserrat_700Bold',
  '800': 'Montserrat_800ExtraBold',
  '900': 'Montserrat_800ExtraBold',
  normal: 'Montserrat_400Regular',
  bold: 'Montserrat_700Bold',
};

export function AppText({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) as { fontWeight?: string | number; fontFamily?: string } | undefined;
  const weight = flat?.fontWeight != null ? String(flat.fontWeight) : '400';
  const fontFamily = flat?.fontFamily ?? FAMILY[weight] ?? 'Montserrat_400Regular';
  // The weighted family already encodes weight; clear fontWeight to avoid faux-bold on Android.
  return <RNText {...rest} style={[style, { fontFamily, fontWeight: 'normal' }]} />;
}
