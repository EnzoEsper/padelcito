# AI Agents Global Instructions

## 🏆 The Prime Directive

The immutable baseline for this project is `ai-architecture-context.md`. **You must read and internalize `ai-architecture-context.md` before generating or modifying any code.** Deviations from those rules are regressions.

## 🚨 Expo SDK 56 (CRITICAL)

**Expo HAS CHANGED.** You must read the exact versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing any frontend code. Do not hallucinate deprecated React Native or Expo Router APIs.

## 🛑 Guardrails & Limitations

1. **No Autonomous Destructive Commands:** Do not autonomously execute `pnpm install`, `supabase db reset`, or `git reset`. Provide the exact commands in markdown blocks for the human developer to run.
2. **Package Manager:** `pnpm` is the ONLY acceptable package manager. Do not generate `npm install` or `yarn add` commands.
3. **No Custom Backends:** Do not generate Express, NestJS, or any custom Node.js backend code. All backend logic is handled natively in PostgreSQL via Supabase (RPCs, Triggers, RLS).

## 🏗️ Architectural Reminders

- **Data Fetching:** Use TanStack Query.
- **Security:** RLS is mandatory on every table. Cross-table checks go through `SECURITY DEFINER` helper functions.
- **TypeScript:** Strict mode is on. No `any`. No non-null assertions (`!`).
