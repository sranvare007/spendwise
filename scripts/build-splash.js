// Generates assets/splash-icon.png from an inline SVG.
// Matches the app icon palette (pink piggy bank + gold $ coin on soft pink)
// and uses the brand Montserrat font for the wordmark.
// Run: node scripts/build-splash.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const FONT_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo-google-fonts',
  'montserrat',
);
const fontFiles = [
  path.join(FONT_DIR, '800ExtraBold', 'Montserrat_800ExtraBold.ttf'),
  path.join(FONT_DIR, '700Bold', 'Montserrat_700Bold.ttf'),
  path.join(FONT_DIR, '600SemiBold', 'Montserrat_600SemiBold.ttf'),
  path.join(FONT_DIR, '500Medium', 'Montserrat_500Medium.ttf'),
];

// Palette sampled from assets/icon.png
const PINK_BG = '#FFE4EF';
const PIG = '#ED7BB3';
const PIG_DARK = '#E0609F';
const PIG_SNOUT = '#F49ECB';
const PIG_LINE = '#7A2B55';
const SLOT = '#6E2E55';
const COIN = '#F2B736';
const COIN_RIM = '#D9982B';
const COIN_HI = '#F8CD55';
const TEXT = '#B83A77';
const TEXT_SUB = '#D98BB4';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1200" fill="${PINK_BG}"/>

  <!-- soft decorative blobs -->
  <circle cx="180" cy="200" r="120" fill="#ffffff" opacity="0.35"/>
  <circle cx="1040" cy="980" r="160" fill="#ffffff" opacity="0.28"/>

  <g transform="translate(600 470)">
    <!-- curly tail -->
    <path d="M300 30 q60 -10 55 35 q-4 38 -42 30 q-30 -7 -16 -34"
          fill="none" stroke="${PIG_DARK}" stroke-width="20" stroke-linecap="round"/>

    <!-- ear (tip pokes above the body) -->
    <path d="M-165 -120 L-110 -225 L-50 -120 Z" fill="${PIG_DARK}"/>

    <!-- back legs (behind body) -->
    <rect x="120" y="150" width="58" height="120" rx="22" fill="${PIG_DARK}"/>
    <rect x="-150" y="150" width="58" height="120" rx="22" fill="${PIG_DARK}"/>

    <!-- front legs -->
    <rect x="40" y="160" width="60" height="120" rx="24" fill="${PIG}"/>
    <rect x="-70" y="160" width="60" height="120" rx="24" fill="${PIG}"/>

    <!-- body -->
    <ellipse cx="20" cy="40" rx="300" ry="230" fill="${PIG}"/>
    <!-- belly highlight -->
    <ellipse cx="40" cy="95" rx="225" ry="150" fill="#ffffff" opacity="0.10"/>

    <!-- snout -->
    <ellipse cx="-235" cy="55" rx="78" ry="95" fill="${PIG_SNOUT}"/>
    <ellipse cx="-250" cy="35" rx="20" ry="26" fill="${PIG_LINE}"/>
    <ellipse cx="-250" cy="90" rx="20" ry="26" fill="${PIG_LINE}"/>

    <!-- eye -->
    <circle cx="-120" cy="-30" r="22" fill="${PIG_LINE}"/>
    <circle cx="-128" cy="-38" r="7" fill="#ffffff"/>

    <!-- coin slot -->
    <ellipse cx="35" cy="-175" rx="95" ry="20" fill="${SLOT}"/>

    <!-- coin -->
    <g transform="translate(80 -300)">
      <circle cx="0" cy="0" r="105" fill="${COIN_RIM}"/>
      <circle cx="0" cy="0" r="92" fill="${COIN}"/>
      <circle cx="0" cy="0" r="70" fill="none" stroke="${COIN_HI}" stroke-width="8"/>
      <text x="0" y="38" font-family="Montserrat" font-weight="800"
            font-size="120" fill="${COIN_RIM}" text-anchor="middle">$</text>
    </g>
  </g>

  <!-- wordmark -->
  <text x="600" y="1000" font-family="Montserrat" font-weight="800"
        font-size="120" fill="${TEXT}" text-anchor="middle" letter-spacing="-2">SpendWise</text>
  <text x="600" y="1075" font-family="Montserrat" font-weight="600"
        font-size="44" fill="${TEXT_SUB}" text-anchor="middle" letter-spacing="6">SPEND SMART · SAVE MORE</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Montserrat' },
});
const png = resvg.render().asPng();
const out = path.join(__dirname, '..', 'assets', 'splash-icon.png');
fs.writeFileSync(out, png);
console.log('Wrote', out, png.length, 'bytes');
