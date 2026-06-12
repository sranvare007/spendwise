// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend (wa-sqlite) imports a .wasm asset, so Metro must
// treat .wasm as a bundleable asset. Native builds use the native module and
// are unaffected by this.
config.resolver.assetExts.push('wasm');

module.exports = config;
