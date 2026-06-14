import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type IconName =
  | 'food' | 'transport' | 'shopping' | 'ent' | 'health' | 'utilities'
  | 'housing' | 'education' | 'travel' | 'personal' | 'fuel' | 'other'
  | 'search' | 'plus' | 'close' | 'check' | 'flame' | 'home' | 'chart'
  | 'bulb' | 'gear' | 'del' | 'cal' | 'chevL' | 'chevR' | 'palette'
  | 'bell' | 'lock' | 'download' | 'repeat' | 'tag' | 'bookmark'
  | 'trophy' | 'target' | 'up' | 'down' | 'receipt' | 'minus';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  fill?: string;
}

// Each entry returns the inner SVG primitives for a 24x24 viewBox.
function paths(name: IconName, s: string, sw: number, fill: string) {
  const common = { stroke: s, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (name) {
    case 'food':
      return [<Path key="0" {...common} d="M6 3v8M9 3v8M7.5 11v10" />, <Path key="1" {...common} d="M16 3c-1.4 1-2 3-2 5.5 0 1.6.6 2.5 2 2.5v10" />];
    case 'transport':
      return [
        <Path key="0" {...common} d="M5.5 11l1.4-4.2A2 2 0 018.8 5.4h6.4a2 2 0 011.9 1.4L18.5 11" />,
        <Path key="1" {...common} d="M4 11h16v5a1 1 0 01-1 1H5a1 1 0 01-1-1z" />,
        <Path key="2" {...common} d="M7.5 17v1.5M16.5 17v1.5" />,
        <Circle key="3" {...common} cx={7.5} cy={14} r={0.8} />,
        <Circle key="4" {...common} cx={16.5} cy={14} r={0.8} />,
      ];
    case 'shopping':
      return [<Path key="0" {...common} d="M6 8h12l-1 11.5H7L6 8z" />, <Path key="1" {...common} d="M9 8V6.5a3 3 0 016 0V8" />];
    case 'ent':
      return [<Rect key="0" {...common} x={4} y={5} width={16} height={14} rx={2} />, <Path key="1" {...common} d="M10 9.5l4.5 2.5L10 14.5z" />];
    case 'health':
      return [<Path key="0" {...common} d="M12 20S4 14.2 4 8.8A3.6 3.6 0 0112 6.2a3.6 3.6 0 018 2.6C20 14.2 12 20 12 20z" />];
    case 'utilities':
      return [<Path key="0" {...common} d="M13 3L5 13.5h5l-1 7.5 8-11h-5l1-7z" />];
    case 'housing':
      return [<Path key="0" {...common} d="M3.5 11L12 4l8.5 7" />, <Path key="1" {...common} d="M5.5 9.8V19h5v-5h3v5h5V9.8" />];
    case 'education':
      return [<Path key="0" {...common} d="M3 9l9-4 9 4-9 4-9-4z" />, <Path key="1" {...common} d="M7 11v4.5c0 1.2 2.4 2.5 5 2.5s5-1.3 5-2.5V11" />, <Path key="2" {...common} d="M21 9v5" />];
    case 'travel':
      return [<Path key="0" {...common} d="M21.5 3.5L10.5 14M21.5 3.5l-6.8 17-3.9-7.2-7.2-3.9 17.9-5.9z" />];
    case 'personal':
      return [<Path key="0" {...common} d="M12 3l1.7 5.1L19 9.8l-5.3 1.7L12 17l-1.7-5.5L5 9.8l5.3-1.7L12 3z" />];
    case 'fuel':
      return [
        <Path key="0" {...common} d="M5 20V6a2 2 0 012-2h4a2 2 0 012 2v14" />,
        <Path key="1" {...common} d="M3.5 20.5h11" />,
        <Rect key="2" {...common} x={7} y={7} width={4} height={3} rx={0.5} />,
        <Path key="3" {...common} d="M13 10h2.5A1.5 1.5 0 0117 11.5V16a1.5 1.5 0 003 0V9l-2.2-2.2" />,
      ];
    case 'other':
      return [<Circle key="0" {...common} cx={12} cy={12} r={8.5} />, <Path key="1" {...common} d="M8.2 12h7.6" />];
    case 'search':
      return [<Circle key="0" {...common} cx={10.5} cy={10.5} r={6.5} />, <Path key="1" {...common} d="M20.5 20.5l-5.2-5.2" />];
    case 'plus':
      return [<Path key="0" {...common} d="M12 5.5v13M5.5 12h13" />];
    case 'minus':
      return [<Path key="0" {...common} d="M5 12h14" />];
    case 'close':
      return [<Path key="0" {...common} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />];
    case 'check':
      return [<Path key="0" {...common} d="M5 12.5l4.5 4.5L19 7.5" />];
    case 'flame':
      return [<Path key="0" {...common} d="M12 2.5S6.5 7 6.5 12.8a5.5 5.5 0 0011 0c0-1.9-.9-3.6-2-4.8-.5 1.5-1.6 2-2.6 2 .6-2.9.6-5.6.1-7.5z" />];
    case 'home':
      return [<Path key="0" {...common} d="M3.5 11L12 4l8.5 7" />, <Path key="1" {...common} d="M5.5 9.8V19h13V9.8" />];
    case 'chart':
      return [<Path key="0" {...common} d="M5 20V11M12 20V5M19 20v-6" />];
    case 'bulb':
      return [<Path key="0" {...common} d="M9.2 18h5.6M10.3 21h3.4" />, <Path key="1" {...common} d="M12 3a6 6 0 00-3.8 10.6c.7.6 1.1 1.4 1.1 2.3V16h5.4v-.1c0-.9.4-1.7 1.1-2.3A6 6 0 0012 3z" />];
    case 'gear':
      return [<Circle key="0" {...common} cx={12} cy={12} r={3} />, <Path key="1" {...common} d="M19.4 13a7.6 7.6 0 000-2l2-1.5-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1l-.4-2.6h-4l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 000 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 001.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.4-2-1.5z" />];
    case 'del':
      return [<Path key="0" {...common} d="M9 6h11a1 1 0 011 1v10a1 1 0 01-1 1H9l-6-6 6-6z" />, <Path key="1" {...common} d="M13 9.5l4 4M17 9.5l-4 4" />];
    case 'cal':
      return [<Rect key="0" {...common} x={4} y={5} width={16} height={15} rx={2} />, <Path key="1" {...common} d="M4 9.5h16M8.5 3v4M15.5 3v4" />];
    case 'chevL':
      return [<Path key="0" {...common} d="M15 5l-7 7 7 7" />];
    case 'chevR':
      return [<Path key="0" {...common} d="M9 5l7 7-7 7" />];
    case 'palette':
      return [<Path key="0" {...common} d="M12 3a9 9 0 100 18c1.4 0 1.8-1 1.4-1.8-.5-1 .2-2.2 1.4-2.2H17a4 4 0 004-4c0-5-4-8-9-8z" />, <Circle key="1" {...common} cx={8} cy={11} r={1.1} />, <Circle key="2" {...common} cx={12} cy={8} r={1.1} />, <Circle key="3" {...common} cx={16} cy={11} r={1.1} />];
    case 'bell':
      return [<Path key="0" {...common} d="M6 9a6 6 0 1112 0c0 4 1.6 5.5 2 6H4c.4-.5 2-2 2-6zM9.5 20a2.5 2.5 0 005 0" />];
    case 'lock':
      return [<Rect key="0" {...common} x={5} y={11} width={14} height={9} rx={2} />, <Path key="1" {...common} d="M8 11V8a4 4 0 018 0v3" />];
    case 'download':
      return [<Path key="0" {...common} d="M12 4v11M7 11l5 5 5-5M5 20h14" />];
    case 'repeat':
      return [<Path key="0" {...common} d="M4 9l3-3 3 3M7 6v6a4 4 0 004 4h6M20 15l-3 3-3-3M17 18v-6a4 4 0 00-4-4H7" />];
    case 'tag':
      return [<Path key="0" {...common} d="M4 4h7l9 9-7 7-9-9V4z" />, <Circle key="1" {...common} cx={8.5} cy={8.5} r={1.1} />];
    case 'bookmark':
      return [<Path key="0" {...common} fill={fill} d="M7 4h10v16l-5-4-5 4z" />];
    case 'trophy':
      return [<Path key="0" {...common} d="M8 4h8v4a4 4 0 01-8 0V4zM6 4H4v1.5A3 3 0 007 8.5M18 4h2v1.5A3 3 0 0117 8.5M10 14h4v3.5h-4zM8 20h8" />];
    case 'target':
      return [<Circle key="0" {...common} cx={12} cy={12} r={8.5} />, <Circle key="1" {...common} cx={12} cy={12} r={4} />, <Circle key="2" {...common} cx={12} cy={12} r={0.6} />];
    case 'up':
      return [<Path key="0" {...common} d="M12 19V6M6 12l6-6 6 6" />];
    case 'down':
      return [<Path key="0" {...common} d="M12 5v13M6 12l6 6 6-6" />];
    case 'receipt':
      return [<Path key="0" {...common} d="M5 3l2 1.5L9 3l1.5 1.5L12 3l1.5 1.5L15 3l2 1.5L19 3v18l-2-1.5L15 21l-1.5-1.5L12 21l-1.5-1.5L9 21l-2-1.5L5 21V3z" />, <Path key="1" {...common} d="M8.5 9h7M8.5 13h5" />];
    default:
      return [];
  }
}

export function Icon({ name, size = 22, color, strokeWidth = 1.9, fill = 'none' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths(name, color, strokeWidth, fill)}
    </Svg>
  );
}
