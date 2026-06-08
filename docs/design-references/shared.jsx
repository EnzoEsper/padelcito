// shared.jsx — design tokens, icons, and reusable primitives
// Locked palette: Void Eclipse #0B0B0B · Abyss Blue #2B396D · Silver Mist #E4E4E4
// (near-black elevation tones + one derived brighter blue are mixes of the locked set)

// ── Theme + tweak-driven palette ─────────────────────────────
// Semantic tokens: `void` = background, `mist` = primary fg, s1–s3 = surfaces,
// blue/blueHi/glow = accent. They swap wholesale between dark & light so every
// component stays theme-agnostic. blueInt (0..1) drives the derived highlight blue.
function clamp(n, a = 0, b = 1) { return Math.max(a, Math.min(b, n)); }
function hx(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function lerpHex(a, b, t) { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t)).toString(16).padStart(2, '0')).join(''); }
function rgba(hex, al) { const [r, g, b] = hx(hex); return `rgba(${r},${g},${b},${al})`; }

function buildPalette(theme = 'dark', blueInt = 0.7) {
  const i = clamp(blueInt);
  if (theme === 'light') {
    const blueHi = lerpHex('#5466A6', '#2B396D', i);
    return {
      theme: 'light',
      void: '#EFEFEC', s1: '#FFFFFF', s2: '#F8F8F6', s3: '#EAEAE6',
      blue: '#2B396D', blueDeep: '#1C2649', blueHi,
      blueTint: rgba('#2B396D', 0.05 + i * 0.07),
      glow: rgba(blueHi, 0.10 + i * 0.18),
      mist: '#0B0B0B', dim: 'rgba(11,11,11,0.56)', faint: 'rgba(11,11,11,0.40)',
      ghost: 'rgba(11,11,11,0.18)', hair: 'rgba(11,11,11,0.10)', hair2: 'rgba(11,11,11,0.06)',
      win: '#1F9D6B', warn: '#B07D1E',
      mapBg: '#E4E4DF', mapBlock: '#EDEDE9', mapRoad: '#FBFBF9',
      skill: {
        A: { bg: '#2B396D', fg: '#FFFFFF' },
        B: { bg: rgba('#2B396D', 0.10), fg: '#2B396D' },
        C: { bg: '#EAEAE6', fg: 'rgba(11,11,11,0.6)' },
        D: { bg: '#EAEAE6', fg: 'rgba(11,11,11,0.4)' },
      },
    };
  }
  const blueHi = lerpHex('#2B396D', '#7488D8', i);
  return {
    theme: 'dark',
    void: '#0B0B0B', s1: '#141417', s2: '#1B1C21', s3: '#232429',
    blue: '#2B396D', blueDeep: '#1C2649', blueHi,
    blueTint: rgba(blueHi, 0.10 + i * 0.10),
    glow: rgba(blueHi, 0.22 + i * 0.32),
    mist: '#E4E4E4', dim: 'rgba(228,228,228,0.60)', faint: 'rgba(228,228,228,0.38)',
    ghost: 'rgba(228,228,228,0.20)', hair: 'rgba(228,228,228,0.10)', hair2: 'rgba(228,228,228,0.055)',
    win: '#5BE0A6', warn: '#E0B15B',
    mapBg: '#0D0E11', mapBlock: '#15161A', mapRoad: '#22242B',
    skill: {
      A: { bg: '#2B396D', fg: '#E4E4E4' },
      B: { bg: 'rgba(68,88,166,0.18)', fg: '#A9B6E6' },
      C: { bg: '#232429', fg: 'rgba(228,228,228,0.60)' },
      D: { bg: '#232429', fg: 'rgba(228,228,228,0.38)' },
    },
  };
}

const C = {};
Object.assign(C, buildPalette('dark', 0.7));
function applyPalette(theme, blueInt) { Object.assign(C, buildPalette(theme, blueInt)); }

// corner-radius multiplier (tweakable). rad(22) → 22 * scale, rounded.
function rad(n) { const s = (typeof window !== 'undefined' && window.__radScale != null) ? window.__radScale : 1; return Math.max(2, Math.round(n * s)); }

const SKILL_LABEL = { A: 'A · Pro', B: 'B · Adv', C: 'C · Int', D: 'D · Beg' };

const FONT = "'Hanken Grotesk', system-ui, sans-serif";
const MONO = "'Space Mono', ui-monospace, monospace";

// Monospace data label — the recurring "spec sheet" detail from the palette card
function Mono({ children, size = 11, color = C.faint, ls = 1.5, weight = 400, style = {} }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: size, letterSpacing: ls, color, fontWeight: weight, textTransform: 'uppercase', ...style }}>
      {children}
    </span>
  );
}

// ── Icons (clean line set) ───────────────────────────────────
const Ico = {
  compass: (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" strokeLinejoin="round"/></Svg>,
  trophy: (p) => <Svg {...p}><path d="M7 4h10v3a5 5 0 01-10 0V4z"/><path d="M7 5H4v1a3 3 0 003 3M17 5h3v1a3 3 0 01-3 3M9.5 12.5L9 17h6l-.5-4.5M8 20h8M10 17v3M14 17v3" strokeLinecap="round"/></Svg>,
  calendar: (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round"/></Svg>,
  user: (p) => <Svg {...p}><circle cx="12" cy="8.5" r="3.8"/><path d="M5 20a7 7 0 0114 0" strokeLinecap="round"/></Svg>,
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" strokeLinecap="round"/></Svg>,
  pin: (p) => <Svg {...p}><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" strokeLinecap="round"/></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4" strokeLinecap="round"/></Svg>,
  sliders: (p) => <Svg {...p}><path d="M5 7h9M18 7h1M5 17h1M10 17h9" strokeLinecap="round"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></Svg>,
  chevR: (p) => <Svg {...p}><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></Svg>,
  chevL: (p) => <Svg {...p}><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/></Svg>,
  check: (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round"/></Svg>,
  x: (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></Svg>,
  bell: (p) => <Svg {...p}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2.5 2.5 0 004 0" strokeLinecap="round"/></Svg>,
  shield: (p) => <Svg {...p}><path d="M12 3l7 2.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V5.5L12 3z" strokeLinejoin="round"/><path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>,
  star: (p) => <Svg {...p} fill="currentColor" stroke="none"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5z"/></Svg>,
  chat: (p) => <Svg {...p}><path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9A1.5 1.5 0 0118.5 16H9l-4 4v-4H5.5A1.5 1.5 0 014 14.5v-9z" strokeLinejoin="round"/></Svg>,
  bolt: (p) => <Svg {...p} fill="currentColor" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></Svg>,
  users: (p) => <Svg {...p}><circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0111 0M16 7a3 3 0 010 6M21 19a5.5 5.5 0 00-4-5.3" strokeLinecap="round"/></Svg>,
  share: (p) => <Svg {...p}><path d="M12 15V4M8.5 7.5L12 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 12v6.5A1.5 1.5 0 007.5 20h9a1.5 1.5 0 001.5-1.5V12" strokeLinecap="round"/></Svg>,
  ball: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M5 8c3 1 8 1 14-1M5 16c3-1 8-1 14 1" /></Svg>,
  flame: (p) => <Svg {...p}><path d="M12 3s5 3.5 5 9a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c0-3 2-5 2-8z" strokeLinejoin="round"/></Svg>,
  whistle: (p) => <Svg {...p}><path d="M14 9H5a3 3 0 100 6h4l3 3 1-3a4 4 0 100-6z"/><circle cx="9.5" cy="12" r="1.4" fill="currentColor" stroke="none"/></Svg>,
  map: (p) => <Svg {...p}><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" strokeLinejoin="round"/><path d="M9 4v14M15 6v14"/></Svg>,
  list: (p) => <Svg {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round"/></Svg>,
  sun: (p) => <Svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" strokeLinecap="round"/></Svg>,
  moon: (p) => <Svg {...p}><path d="M20 13.5A8 8 0 1110.5 4a6.5 6.5 0 009.5 9.5z" strokeLinejoin="round"/></Svg>,
  target: (p) => <Svg {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" strokeLinecap="round"/></Svg>,
};

function Svg({ size = 22, color = 'currentColor', sw = 1.7, fill = 'none', stroke, children, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={stroke || (fill === 'none' ? color : 'none')} strokeWidth={sw}
      style={{ display: 'block', color, ...style }}>
      {children}
    </svg>
  );
}

// ── Avatar (initials on a tinted disc) ───────────────────────
const AV_TONES = [
  ['#2B396D', '#E4E4E4'], ['#3A4A86', '#E4E4E4'], ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'], ['#2A2B30', '#E4E4E4'], ['#1C2649', '#E4E4E4'],
];
function Avatar({ name = '', size = 40, ring, tone, style = {} }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const t = AV_TONES[tone != null ? tone : (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AV_TONES.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: t[0], color: t[1],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, fontWeight: 700, fontSize: size * 0.36, letterSpacing: 0.3,
      boxShadow: ring ? `0 0 0 2px ${C.void}, 0 0 0 ${2 + (ring === true ? 2 : ring)}px ${C.blueHi}` : 'none',
      ...style,
    }}>{initials}</div>
  );
}

// ── Skill badge (colors pulled live from theme palette) ──────
function SkillBadge({ level = 'B', size = 'md' }) {
  const s = C.skill[level] || C.skill.B;
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: s.bg, color: s.fg,
      borderRadius: rad(7), padding: pad, fontFamily: MONO, fontSize: fs, fontWeight: 700,
      letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{SKILL_LABEL[level] || SKILL_LABEL.B}</span>
  );
}

// ── Trust score chip ─────────────────────────────────────────
function Trust({ score = 4.8, size = 'md' }) {
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.dim }}>
      <Ico.shield size={fs + 3} color={C.blueHi} />
      <span style={{ fontFamily: MONO, fontSize: fs, fontWeight: 700, color: C.mist }}>{score.toFixed(1)}</span>
    </span>
  );
}

// ── Section label ────────────────────────────────────────────
function SectionLabel({ children, right, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px 12px', ...style }}>
      <Mono size={11.5} color={C.faint} ls={2} weight={700}>{children}</Mono>
      {right}
    </div>
  );
}

// ── Player-fill meter (e.g. 3/4) ─────────────────────────────
function FillMeter({ filled, total = 4, size = 9, gap = 5 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < filled ? C.blueHi : 'transparent',
          border: i < filled ? 'none' : `1.5px solid ${C.ghost}`,
          boxShadow: i < filled ? `0 0 8px ${C.glow}` : 'none',
        }} />
      ))}
    </div>
  );
}

// ── Pressable wrapper (scale feedback) ───────────────────────
function Press({ children, onClick, style = {}, scale = 0.97 }) {
  const [d, setD] = React.useState(false);
  return (
    <div className="pd-tap" onClick={onClick}
      onPointerDown={() => setD(true)}
      onPointerUp={() => setD(false)}
      onPointerLeave={() => setD(false)}
      style={{ transform: d ? `scale(${scale})` : 'scale(1)', transition: 'transform .12s ease', cursor: 'pointer', ...style }}>
      {children}
    </div>
  );
}

Object.assign(window, { C, FONT, MONO, Mono, Ico, Svg, Avatar, SkillBadge, Trust, SectionLabel, FillMeter, Press, buildPalette, applyPalette, rad, lerpHex, rgba, clamp });
