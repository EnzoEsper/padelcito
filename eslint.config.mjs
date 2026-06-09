import expo from "eslint-config-expo/flat.js";

export default [
  {
    // Global ignores must be in their own object
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "supabase/**",
      "docs/**",
      "src/types/database.ts",
    ],
  },
  ...expo,
  {
    // Explicitly set the React version to bypass the ESLint v9 auto-detect crash
    settings: {
      react: {
        version: "18.3.1",
      },
    },
  },
];
