import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type IconName =
  | 'food' | 'transport' | 'shopping' | 'ent' | 'health' | 'utilities'
  | 'housing' | 'education' | 'travel' | 'personal' | 'fuel' | 'other'
  | 'search' | 'plus' | 'close' | 'check' | 'flame' | 'home' | 'chart'
  | 'bulb' | 'gear' | 'del' | 'cal' | 'chevL' | 'chevR' | 'palette'
  | 'bell' | 'lock' | 'download' | 'repeat' | 'tag' | 'bookmark' | 'trash'
  | 'trophy' | 'target' | 'up' | 'down' | 'receipt' | 'minus'
  // Extended set selectable for custom categories.
  | 'coffee' | 'cart' | 'gift' | 'paw' | 'dumbbell' | 'book' | 'music'
  | 'film' | 'phone' | 'laptop' | 'wifi' | 'plug' | 'wrench' | 'camera'
  | 'leaf' | 'sun' | 'droplet' | 'bolt' | 'wallet' | 'card' | 'cash'
  | 'piggy' | 'coin' | 'pizza' | 'beer' | 'cake' | 'heart' | 'star'
  | 'baby' | 'scissors' | 'shirt' | 'key' | 'ticket' | 'plane' | 'bus'
  | 'bike' | 'umbrella' | 'pill' | 'football' | 'dice' | 'globe' | 'cloud';

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
    case 'trash':
      return [<Path key="0" {...common} d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13M10 11v6M14 11v6" />];
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
    case 'coffee':
      return [<Path key="0" {...common} d="M4 8h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V8z" />, <Path key="1" {...common} d="M17 9h2.5a2.5 2.5 0 010 5H17" />, <Path key="2" {...common} d="M8 2.5c-.6 1 .6 1.8 0 3M12 2.5c-.6 1 .6 1.8 0 3" />];
    case 'cart':
      return [<Path key="0" {...common} d="M3 4h2l2.2 11.2a1.5 1.5 0 001.5 1.2h7.6a1.5 1.5 0 001.5-1.2L20 7H6" />, <Circle key="1" {...common} cx={9} cy={20} r={1.2} />, <Circle key="2" {...common} cx={17} cy={20} r={1.2} />];
    case 'gift':
      return [<Rect key="0" {...common} x={4} y={9} width={16} height={11} rx={1.5} />, <Path key="1" {...common} d="M3 9h18M12 9v11" />, <Path key="2" {...common} d="M12 9C12 9 8 9 7 7.5 6.2 6.3 7 4.5 8.5 4.5S12 7 12 9zM12 9c0 0 4 0 5-1.5.8-1.2 0-3-1.5-3S12 7 12 9z" />];
    case 'paw':
      return [<Circle key="0" {...common} cx={7} cy={10} r={1.6} />, <Circle key="1" {...common} cx={12} cy={8} r={1.6} />, <Circle key="2" {...common} cx={17} cy={10} r={1.6} />, <Path key="3" {...common} d="M12 12c-2.5 0-4.5 2-4.5 4.2 0 1.6 1.3 2.3 2.5 1.8.9-.4 1.1-.4 2 0s2.5.5 2.5-1.1C16.5 14.5 14.5 12 12 12z" />];
    case 'dumbbell':
      return [<Path key="0" {...common} d="M6.5 9v6M4 10v4M9 12h6M17.5 9v6M20 10v4" />];
    case 'book':
      return [<Path key="0" {...common} d="M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />, <Path key="1" {...common} d="M5 17a3 3 0 013-3h9" />];
    case 'music':
      return [<Path key="0" {...common} d="M9 18V6l10-2v12" />, <Circle key="1" {...common} cx={6} cy={18} r={3} />, <Circle key="2" {...common} cx={16} cy={16} r={3} />];
    case 'film':
      return [<Rect key="0" {...common} x={3.5} y={5} width={17} height={14} rx={2} />, <Path key="1" {...common} d="M8 5v14M16 5v14M3.5 9.5h4.5M3.5 14.5h4.5M16 9.5h4.5M16 14.5h4.5" />];
    case 'phone':
      return [<Rect key="0" {...common} x={7} y={3} width={10} height={18} rx={2.5} />, <Path key="1" {...common} d="M11 18h2" />];
    case 'laptop':
      return [<Rect key="0" {...common} x={5} y={5} width={14} height={10} rx={1.5} />, <Path key="1" {...common} d="M3 19h18" />];
    case 'wifi':
      return [<Path key="0" {...common} d="M2.5 9a13 13 0 0119 0M5.5 12.5a8 8 0 0113 0M8.5 16a4 4 0 017 0" />, <Circle key="1" {...common} cx={12} cy={19.5} r={0.6} />];
    case 'plug':
      return [<Path key="0" {...common} d="M9 3v5M15 3v5" />, <Path key="1" {...common} d="M6.5 8h11v2a5.5 5.5 0 01-11 0V8z" />, <Path key="2" {...common} d="M12 15.5V21" />];
    case 'wrench':
      return [<Path key="0" {...common} d="M15.5 4a5 5 0 00-4.7 6.6L4 17.4 6.6 20l6.8-6.8A5 5 0 1015.5 4z" />];
    case 'camera':
      return [<Path key="0" {...common} d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />, <Circle key="1" {...common} cx={12} cy={13} r={3.2} />];
    case 'leaf':
      return [<Path key="0" {...common} d="M5 19c0-9 6-14 15-14 0 9-5 15-14 14M5 19c2.5-5 6-7.5 10-9" />];
    case 'sun':
      return [<Circle key="0" {...common} cx={12} cy={12} r={4} />, <Path key="1" {...common} d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />];
    case 'droplet':
      return [<Path key="0" {...common} d="M12 3.5C12 3.5 5.5 10 5.5 14.5a6.5 6.5 0 0013 0C18.5 10 12 3.5 12 3.5z" />];
    case 'bolt':
      return [<Path key="0" {...common} d="M13 2L5 13h6l-1 9 8-12h-6l1-8z" />];
    case 'wallet':
      return [<Rect key="0" {...common} x={3.5} y={6} width={17} height={13} rx={2.5} />, <Path key="1" {...common} d="M3.5 10h17M16 13.5h2" />];
    case 'card':
      return [<Rect key="0" {...common} x={3} y={5.5} width={18} height={13} rx={2.5} />, <Path key="1" {...common} d="M3 10h18M7 15h4" />];
    case 'cash':
      return [<Rect key="0" {...common} x={3} y={6} width={18} height={12} rx={2} />, <Circle key="1" {...common} cx={12} cy={12} r={2.6} />, <Path key="2" {...common} d="M6.5 9.5v0M17.5 14.5v0" />];
    case 'piggy':
      return [<Path key="0" {...common} d="M4 13a6 6 0 016-6h2c3 0 4.5 1 5.5 2.5L20 9v3l-1 .5c-.3 1.3-1.2 2.3-2.5 3v2h-2.5v-1.3H10v1.3H7.5V17A6 6 0 014 13z" />, <Path key="1" {...common} d="M5 12.5H3.5M14 7c0-1.5-1-2.5-2.5-2.5" />, <Circle key="2" {...common} cx={8} cy={12} r={0.6} />];
    case 'coin':
      return [<Circle key="0" {...common} cx={12} cy={12} r={8.5} />, <Path key="1" {...common} d="M12 7.5v9M9.5 9.5h3.5a1.6 1.6 0 010 3.2h-2.6a1.6 1.6 0 000 3.2H14" />];
    case 'pizza':
      return [<Path key="0" {...common} d="M12 3c4.5 0 8.5 2.5 9.5 6L12 21 2.5 9C3.5 5.5 7.5 3 12 3z" />, <Circle key="1" {...common} cx={10} cy={9} r={1} />, <Circle key="2" {...common} cx={14} cy={10} r={1} />, <Circle key="3" {...common} cx={12} cy={14} r={1} />];
    case 'beer':
      return [<Path key="0" {...common} d="M6 7h9v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7z" />, <Path key="1" {...common} d="M15 9h2.5a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5H15" />, <Path key="2" {...common} d="M6 7c-.5-2 1-3.5 3-3 .5-1.5 2.5-1.5 3.3-.3 1.6-.6 3 .6 2.7 2.3" />];
    case 'cake':
      return [<Path key="0" {...common} d="M4 21V13a3 3 0 013-3h10a3 3 0 013 3v8M4 16c1.5 0 1.5 1.5 3 1.5s1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5" />, <Path key="1" {...common} d="M12 6.5V10M9 7c0-1 1-1.5 0-3M15 7c0-1 1-1.5 0-3" />];
    case 'heart':
      return [<Path key="0" {...common} d="M12 20S4 14.2 4 8.8A3.6 3.6 0 0112 6.2a3.6 3.6 0 018 2.6C20 14.2 12 20 12 20z" />];
    case 'star':
      return [<Path key="0" {...common} d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.9 6.7 19.5l1.1-6L3.4 9.3l6-.8L12 3z" />];
    case 'baby':
      return [<Circle key="0" {...common} cx={12} cy={7} r={3.2} />, <Path key="1" {...common} d="M10.5 6.5v0M13.5 6.5v0M11 8.5c.6.5 1.4.5 2 0" />, <Path key="2" {...common} d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6" />];
    case 'scissors':
      return [<Circle key="0" {...common} cx={6} cy={6} r={2.5} />, <Circle key="1" {...common} cx={6} cy={18} r={2.5} />, <Path key="2" {...common} d="M8 7.5L20 18M8 16.5L20 6M11 12l3 2.2" />];
    case 'shirt':
      return [<Path key="0" {...common} d="M8 3L4 6l2 3 2-1v11h8V8l2 1 2-3-4-3-2 2h-4L8 3z" />];
    case 'key':
      return [<Circle key="0" {...common} cx={8} cy={8} r={4} />, <Path key="1" {...common} d="M10.8 10.8L20 20M17 17l2-2M15 15l2-2" />];
    case 'ticket':
      return [<Path key="0" {...common} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V7z" />, <Path key="1" {...common} d="M13 5v14" strokeDasharray="1.5 2.5" />];
    case 'plane':
      return [<Path key="0" {...common} d="M21 13.5L13 11V5a1.5 1.5 0 00-3 0v6L2 13.5v2l8-1.5v3l-2.5 1.5v1.5L11 19l3.5 1v-1.5L12 17v-3l9 1.5v-2z" />];
    case 'bus':
      return [<Rect key="0" {...common} x={4} y={4} width={16} height={13} rx={2.5} />, <Path key="1" {...common} d="M4 11h16M8 4v7M16 4v7M7 20v-3M17 20v-3" />, <Circle key="2" {...common} cx={8} cy={14} r={0.7} />, <Circle key="3" {...common} cx={16} cy={14} r={0.7} />];
    case 'bike':
      return [<Circle key="0" {...common} cx={6} cy={16} r={3.5} />, <Circle key="1" {...common} cx={18} cy={16} r={3.5} />, <Path key="2" {...common} d="M6 16l4-7h5M9 9l4.5 7M13 9h3l2 7" />];
    case 'umbrella':
      return [<Path key="0" {...common} d="M12 3a9 9 0 019 8H3a9 9 0 019-8z" />, <Path key="1" {...common} d="M12 3v0M12 11v7a2.5 2.5 0 01-5 0" />];
    case 'pill':
      return [<Rect key="0" {...common} x={3} y={8} width={18} height={8} rx={4} transform="rotate(-45 12 12)" />, <Path key="1" {...common} d="M9 9l6 6" />];
    case 'football':
      return [<Circle key="0" {...common} cx={12} cy={12} r={8.5} />, <Path key="1" {...common} d="M12 7l3.5 2.5-1.3 4.2h-4.4L8.5 9.5 12 7zM12 3.5v3.5M5.2 9.5l3.3 0M8.7 15.7l-2 2.8M15.3 15.7l2 2.8M18.8 9.5l-3.3 0" />];
    case 'dice':
      return [<Rect key="0" {...common} x={4} y={4} width={16} height={16} rx={3.5} />, <Circle key="1" {...common} cx={8.5} cy={8.5} r={0.8} />, <Circle key="2" {...common} cx={15.5} cy={8.5} r={0.8} />, <Circle key="3" {...common} cx={12} cy={12} r={0.8} />, <Circle key="4" {...common} cx={8.5} cy={15.5} r={0.8} />, <Circle key="5" {...common} cx={15.5} cy={15.5} r={0.8} />];
    case 'globe':
      return [<Circle key="0" {...common} cx={12} cy={12} r={8.5} />, <Path key="1" {...common} d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />];
    case 'cloud':
      return [<Path key="0" {...common} d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117.5 11 3.5 3.5 0 0117 18H7z" />];
    default:
      return [];
  }
}

// Curated set of icons a user can pick when creating a custom category (50).
export const CATEGORY_ICONS: IconName[] = [
  'food', 'coffee', 'pizza', 'beer', 'cake', 'cart', 'shopping', 'gift',
  'transport', 'fuel', 'bus', 'bike', 'plane', 'travel', 'housing', 'home',
  'utilities', 'bolt', 'plug', 'droplet', 'wifi', 'phone', 'laptop', 'camera',
  'film', 'music', 'ent', 'ticket', 'dice', 'football', 'dumbbell', 'health',
  'heart', 'pill', 'paw', 'baby', 'education', 'book', 'personal', 'star',
  'leaf', 'sun', 'umbrella', 'globe', 'cloud', 'wallet', 'card', 'cash',
  'coin', 'piggy',
];

export function Icon({ name, size = 22, color, strokeWidth = 1.9, fill = 'none' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths(name, color, strokeWidth, fill)}
    </Svg>
  );
}
