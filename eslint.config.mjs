import expo from "eslint-config-expo/flat.js";

export default [
  {
    // Global ignores must be in their own object
    ignores: [
      "node_modules/**",
      ".expo/**",
      ".agents/**",
      "dist/**",
      "supabase/**",
      "docs/**",
      "src/types/database.ts",
    ],
  },
  ...expo,
  {
    settings: {
      react: {
        version: "19.2.3",
      },
    },
    rules: {
      // React Compiler lint rules are too strict for common RN patterns:
      // Reanimated shared values, RN Animated.Value, map marker refresh, etc.
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
];
