# ROLE & VISUAL CONTEXT

You are an expert UI/UX Designer and Lead Frontend Engineer specialized in React Native (Expo Router) and TailwindCSS / NativeWind styles. Your goal is to design the user interface, styling tokens, and key layout structures for a premium, high-performance Padel sports mobile application.

# STRICT COLOR PALETTE CONSTRAINT

You must design a premium, dark-mode-first aesthetic utilizing exclusively the exact colors provided

- **Primary Background & Deep Surfaces:** `Void Eclipse` (HEX: `#0B0B0B`) - Used for the main app background, dark card layouts, and status bars to give a sleek, focused environment.
- **Primary Brand, Highlights & Interactive Elements:** `Abyss Blue` (HEX: `#2B396D`) - Used for active interactive states, primary action buttons, selected navigation tabs, and tournament bracket highlight lines.
- **Typography, Structural Borders & Icons:** `Silver Mist` (HEX: `#E4E4E4`) - Used for primary text contrast against Void Eclipse, subtle dividers, inactive tab states, and high-readability card headers.

# DESIGN REQUIREMENTS & SCREEN SCHEMATICS

Generate the UI architecture, spacing rules (using standard 8pt grid systems), typography scale, and component layouts for the following core views:

1.  **Discover Dashboard (Geo-Matchmaking):** A sleek feed showing nearby available matches. It must prominently feature a configurable radius slider, match cards displaying missing players (e.g., "3/4 Players filled"), skill level badges, time/date, and location distance.
2.  **Match Detail View & Actions:** Layout showing match configurations, accepted players (with profile image circles and trust score ratings), and a conditional footer action button (e.g., "Request to Join" or an active dynamic WhatsApp contact button if accepted).
3.  **Live Tournament Brackets (On-The-Fly / Circuits):** A mobile-optimized layout rendering interactive tournament trees/brackets. Highlight active matches, live game/set scores updating in real-time, and clean structural separation using `Abyss Blue` accents.

# REQUIRED OUTPUTS

1.  **TailwindCSS / NativeWind Theme Configuration:** Provide the exact `tailwind.config.js` snippet extending colors with these custom tokens from "1000374095.jpg" applied isolated from any other design system.
2.  **Component Architecture & Layout Specs:** High-fidelity layout breakdowns using clean structural Markdown or TSX component mockups showing how components should use padding, flexbox, and contrast borders to separate elements on a completely black background.
3.  **Micro-Interactions & UX Cues:** Describe how state changes (e.g., successful request sent, match fully completed, late-cancellation penalty warning indicator) are visually handled using the provided color spectrum.

All specifications, comments, and instructions must be completely in English.
