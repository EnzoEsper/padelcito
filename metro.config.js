// @ts-check
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // inlineVariables breaks PlatformColor when using CSS variables
  inlineVariables: false,
  // className support is added manually via useCssElement wrappers
  globalClassNamePolyfill: false,
});
