// screen-discover.jsx — Geo-matchmaking feed + radius slider

// ── List / Map segmented toggle ──────────────────────────────
function ViewToggle({ view, setView }) {
  const opts = [['list', Ico.list], ['map', Ico.map]];
  return (
    <div style={{ display: 'flex', gap: 2, background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(11), padding: 3 }}>
      {opts.map(([k, Ic]) => {
        const on = view === k;
        return (
          <Press key={k} onClick={() => setView(k)}>
            <div style={{ width: 38, height: 30, borderRadius: rad(8), display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? C.blue : 'transparent', transition: 'background .2s' }}>
              <Ic size={18} color={on ? C.mist : C.faint} sw={on ? 2 : 1.7} />
            </div>
          </Press>
        );
      })}
    </div>
  );
}

// ── Custom radius slider (drag thumb, blue glow track) ───────
function RadiusSlider({ value, onChange, min = 0.5, max = 10 }) {
  const ref = React.useRef(null);
  const dragging = React.useRef(false);
  const pct = (value - min) / (max - min);

  const setFromX = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    let p = (clientX - r.left) / r.width;
    p = Math.max(0, Math.min(1, p));
    const raw = min + p * (max - min);
    onChange(Math.round(raw * 2) / 2); // snap to 0.5
  };
  const down = (e) => { dragging.current = true; setFromX(e.clientX); e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (dragging.current) setFromX(e.clientX); };
  const up = () => { dragging.current = false; };

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Ico.pin size={15} color={C.blueHi} />
          <Mono size={11.5} color={C.faint} ls={2} weight={700}>SEARCH RADIUS</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.mist }}>{value.toFixed(1)}</span>
          <Mono size={11} color={C.dim} ls={1}>KM</Mono>
        </div>
      </div>
      <div ref={ref} className="pd-tap" onPointerDown={down} onPointerMove={move} onPointerUp={up}
        style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: C.s3 }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct * 100}%`, height: 4, borderRadius: 2,
          background: `linear-gradient(90deg, ${C.blue}, ${C.blueHi})`, boxShadow: `0 0 12px ${C.glow}` }} />
        <div style={{ position: 'absolute', left: `calc(${pct * 100}% - 11px)`, width: 22, height: 22, borderRadius: '50%',
          background: C.mist, boxShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 0 4px ${C.blueTint}`, transition: dragging.current ? 'none' : 'left .05s' }} />
      </div>
    </div>
  );
}

// ── Match card ───────────────────────────────────────────────
function MatchCard({ m, onOpen, index = 0 }) {
  const full = m.filled >= m.total;
  return (
    <Press onClick={() => onOpen(m)} scale={0.985}
      style={{ animation: `pd-fade-up .5s ${index * 0.06}s both` }}>
      <div style={{
        margin: '0 20px 14px', background: C.s1, borderRadius: rad(22),
        border: `1px solid ${C.hair}`, padding: 18, position: 'relative', overflow: 'hidden',
      }}>
        {/* skill accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderRadius: 3,
          background: m.skill === 'A' ? C.blueHi : m.skill === 'B' ? C.blue : C.s3 }} />

        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ paddingLeft: 4 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: C.mist, letterSpacing: -0.2, marginBottom: 5 }}>{m.club}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ico.calendar size={13} color={C.faint} />
                <span style={{ fontSize: 13, color: C.dim, fontWeight: 500 }}>{m.when} · {m.time}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ico.clock size={13} color={C.faint} />
                <Mono size={11} color={C.dim} ls={0.5}>{m.dur}M</Mono>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.s3, borderRadius: 8, padding: '5px 9px', flexShrink: 0 }}>
            <Ico.pin size={12} color={C.blueHi} />
            <Mono size={11} color={C.mist} ls={0.5} weight={700}>{m.dist.toFixed(1)}KM</Mono>
          </div>
        </div>

        {/* divider */}
        <div style={{ height: 1, background: C.hair2, margin: '0 0 14px' }} />

        {/* footer: players + skill + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {m.players.slice(0, 3).map((p, i) => (
                <div key={i} style={{ marginLeft: i ? -10 : 0 }}>
                  <Avatar name={p.name} size={30} style={{ boxShadow: `0 0 0 2px ${C.s1}` }} />
                </div>
              ))}
              {Array.from({ length: m.total - m.filled }).map((_, i) => (
                <div key={`e${i}`} style={{ marginLeft: -10, width: 30, height: 30, borderRadius: '50%',
                  border: `1.5px dashed ${C.ghost}`, background: C.s1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico.plus size={13} color={C.faint} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: full ? C.dim : C.mist }}>
                {m.filled}<span style={{ color: C.faint }}>/{m.total}</span>
              </div>
              <Mono size={9.5} color={C.faint} ls={1}>{full ? 'FULL' : 'PLAYERS'}</Mono>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SkillBadge level={m.skill} />
            <Ico.chevR size={18} color={C.ghost} />
          </div>
        </div>
      </div>
    </Press>
  );
}

function ScreenDiscover({ radius, setRadius, skillFilter, setSkillFilter, onOpen, theme, onToggleTheme }) {
  const [view, setView] = React.useState('list');
  const [sel, setSel] = React.useState(null);
  const bySkill = MATCHES.filter(m => skillFilter === 'All' || m.skill === skillFilter);
  const filtered = bySkill.filter(m => m.dist <= radius);

  const chips = ['All', 'A', 'B', 'C'];

  return (
    <div>
      {/* header */}
      <div style={{ padding: '58px 20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Ico.pin size={13} color={C.blueHi} />
              <Mono size={10.5} color={C.faint} ls={1.5}>PALERMO · BUENOS AIRES</Mono>
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: C.mist, letterSpacing: -0.8 }}>Discover</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Press onClick={onToggleTheme}>
              <div style={{ width: 44, height: 44, borderRadius: rad(14), background: C.s1, border: `1px solid ${C.hair}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {theme === 'light' ? <Ico.moon size={19} color={C.mist} /> : <Ico.sun size={20} color={C.mist} />}
              </div>
            </Press>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: rad(14), background: C.s1, border: `1px solid ${C.hair}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico.bell size={20} color={C.mist} />
              </div>
              <div style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%',
                background: C.blueHi, boxShadow: `0 0 0 2px ${C.void}, 0 0 6px ${C.glow}` }} />
            </div>
          </div>
        </div>
      </div>

      {/* radius slider card */}
      <div style={{ margin: '0 20px 20px', background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(20), padding: '18px 0' }}>
        <RadiusSlider value={radius} onChange={setRadius} />
      </div>

      {/* skill filter chips */}
      <div className="pd-scroll" style={{ display: 'flex', gap: 8, padding: '0 20px 18px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.s1, border: `1px solid ${C.hair}`,
          borderRadius: rad(11), padding: '9px 12px', flexShrink: 0 }}>
          <Ico.sliders size={16} color={C.dim} />
        </div>
        {chips.map(c => {
          const on = skillFilter === c;
          return (
            <Press key={c} onClick={() => setSkillFilter(c)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: rad(11), padding: '9px 15px', flexShrink: 0,
                background: on ? C.blue : C.s1, border: `1px solid ${on ? C.blue : C.hair}`,
                color: on ? C.mist : C.dim, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
                {c === 'All' ? 'All levels' : `Level ${c}`}
              </div>
            </Press>
          );
        })}
      </div>

      <SectionLabel right={<ViewToggle view={view} setView={setView} />}>
        {filtered.length} OPEN NEARBY
      </SectionLabel>

      {view === 'map' ? (
        <MapView matches={bySkill} radius={radius} selected={sel} onSelect={setSel} onOpen={onOpen} />
      ) : filtered.length === 0 ? (
        <div style={{ margin: '0 20px', padding: '38px 20px', textAlign: 'center', background: C.s1, borderRadius: rad(20), border: `1px dashed ${C.hair}` }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}><Ico.search size={26} color={C.faint} /></div>
          <div style={{ color: C.dim, fontSize: 14.5, fontWeight: 500, marginBottom: 4 }}>No matches in range</div>
          <Mono size={11} color={C.faint} ls={0.5}>WIDEN YOUR RADIUS TO SEE MORE</Mono>
        </div>
      ) : filtered.map((m, i) => <MatchCard key={m.id} m={m} index={i} onOpen={onOpen} />)}

      <div style={{ height: 12 }} />
    </div>
  );
}

Object.assign(window, { ScreenDiscover, MatchCard, RadiusSlider, ViewToggle });
