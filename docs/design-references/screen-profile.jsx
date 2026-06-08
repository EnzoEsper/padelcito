// screen-profile.jsx — player profile, trust score, stats

function Ring({ value, max = 5, size = 92 }) {
  const r = (size - 12) / 2, circ = 2 * Math.PI * r;
  const pct = value / max;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.s3} strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.blueHi} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.mist, lineHeight: 1 }}>{value.toFixed(1)}</span>
        <Mono size={8.5} color={C.faint} ls={1} style={{ marginTop: 3 }}>TRUST</Mono>
      </div>
    </div>
  );
}

function ScreenProfile({ theme, onToggleTheme }) {
  const me = PLAYERS.you;
  const stats = [
    { label: 'PLAYED', value: '47' },
    { label: 'WIN RATE', value: '64', sub: '%' },
    { label: 'STREAK', value: '3', icon: true },
  ];
  const rows = [
    ['Preferred position', 'Right side'],
    ['Home club', 'Club Norte'],
    ['Availability', 'Eves · Weekends'],
    ['Notifications', 'On'],
  ];
  return (
    <div>
      <div style={{ padding: '58px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Mono size={10.5} color={C.faint} ls={1.5} style={{ display: 'block', marginBottom: 4 }}>PROFILE</Mono>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: C.mist, letterSpacing: -0.8 }}>You</h1>
        </div>
        <Press onClick={onToggleTheme}>
          <div style={{ width: 44, height: 44, borderRadius: rad(14), background: C.s1, border: `1px solid ${C.hair}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'light' ? <Ico.moon size={19} color={C.mist} /> : <Ico.sun size={20} color={C.mist} />}
          </div>
        </Press>
      </div>

      {/* identity card */}
      <div style={{ margin: '0 20px 16px', background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(22), padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={me.name} size={64} tone={0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.mist, marginBottom: 6 }}>{me.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SkillBadge level={me.skill} size="sm" />
              <Mono size={11} color={C.faint} ls={0.5}>@tomasrios</Mono>
            </div>
          </div>
          <Ring value={me.trust} />
        </div>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 18px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ flex: 1, background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(16), padding: '15px 14px' }}>
            <Mono size={9.5} color={C.faint} ls={1.5} style={{ display: 'block', marginBottom: 8 }}>{s.label}</Mono>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.mist, letterSpacing: -0.5 }}>{s.value}</span>
              {s.sub && <Mono size={12} color={C.dim}>{s.sub}</Mono>}
              {s.icon && <Ico.flame size={17} color={C.blueHi} style={{ marginLeft: 1 }} />}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>PREFERENCES</SectionLabel>
      <div style={{ margin: '0 20px 16px', background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(18), padding: '4px 16px' }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0',
            borderTop: i ? `1px solid ${C.hair2}` : 'none' }}>
            <span style={{ fontSize: 15, color: C.mist, fontWeight: 500 }}>{k}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14, color: C.dim }}>{v}</span>
              <Ico.chevR size={16} color={C.ghost} />
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 12 }} />
    </div>
  );
}

Object.assign(window, { ScreenProfile });
