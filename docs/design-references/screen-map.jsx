// screen-map.jsx — stylized geo map with radius circle + match pins

// stable bearing per match index so pins don't jump between renders
const BEARING = [205, 318, 60, 145, 25, 255, 100, 175];

function StreetMap() {
  // abstract CSS map: block grid + a couple of avenues + a "river"
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.mapBg, overflow: 'hidden' }}>
      {/* block grid */}
      <div style={{ position: 'absolute', inset: -20,
        backgroundImage: `linear-gradient(${C.mapRoad} 0 0), linear-gradient(${C.mapRoad} 0 0)`,
        background: `
          repeating-linear-gradient(0deg, transparent 0 46px, ${C.mapRoad} 46px 50px),
          repeating-linear-gradient(90deg, transparent 0 54px, ${C.mapRoad} 54px 58px),
          ${C.mapBlock}` }} />
      {/* diagonal avenue */}
      <div style={{ position: 'absolute', top: '-20%', left: '30%', width: 14, height: '140%',
        background: C.mapRoad, transform: 'rotate(28deg)', transformOrigin: 'top' }} />
      <div style={{ position: 'absolute', top: '40%', left: '-20%', width: '140%', height: 12,
        background: C.mapRoad, transform: 'rotate(-12deg)' }} />
      {/* river band */}
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '70%', height: 64,
        background: C.theme === 'light' ? '#D7DEE6' : '#10141F', transform: 'rotate(-24deg)', opacity: 0.9, borderRadius: rad(40) }} />
      {/* subtle vignette */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 45%, transparent 40%, ${C.void}55 100%)` }} />
    </div>
  );
}

function Pin({ m, cx, cy, pixR, radius, selected, onSelect }) {
  const ang = (BEARING[parseInt(m.id.slice(2)) % BEARING.length] || 0) * Math.PI / 180;
  const inRange = m.dist <= radius;
  const ratio = clamp(m.dist / radius, 0, 1.22);
  const rr = Math.max(ratio * pixR, 44);
  const x = cx + Math.cos(ang) * rr;
  const y = cy + Math.sin(ang) * rr;
  const col = m.skill === 'A' ? C.blueHi : m.skill === 'B' ? C.blue : C.s3;
  const open = m.filled < m.total;
  return (
    <div onClick={(e) => { e.stopPropagation(); if (inRange) onSelect(m.id); }}
      style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-100%)', zIndex: selected ? 6 : (inRange ? 4 : 2),
        transition: 'left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1)',
        opacity: inRange ? 1 : 0.32, cursor: inRange ? 'pointer' : 'default', pointerEvents: 'auto' }}>
      {selected && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: C.mist, color: C.void, borderRadius: rad(9), padding: '6px 9px', whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(0,0,0,0.35)', animation: 'pd-pop .25s' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{m.dist.toFixed(1)} KM · {m.filled}/{m.total}</div>
        </div>
      )}
      {/* teardrop */}
      <div style={{ width: selected ? 34 : 26, height: selected ? 34 : 26, borderRadius: '50% 50% 50% 0',
        transform: 'rotate(45deg)', background: col, border: `2px solid ${selected ? C.mist : C.void}`,
        boxShadow: selected ? `0 0 0 4px ${C.blueTint}, 0 4px 14px ${C.glow}` : '0 3px 8px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
        <span style={{ transform: 'rotate(-45deg)', fontFamily: MONO, fontWeight: 700, fontSize: selected ? 13 : 11,
          color: m.skill === 'C' ? C.dim : C.mist }}>{m.skill}</span>
      </div>
      {open && !selected && (
        <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%',
          background: C.win, border: `1.5px solid ${C.void}` }} />
      )}
    </div>
  );
}

function MapView({ matches, radius, selected, onSelect, onOpen }) {
  const H = 392;
  const ref = React.useRef(null);
  const [W, setW] = React.useState(360);
  React.useEffect(() => { if (ref.current) setW(ref.current.offsetWidth); }, []);
  const cx = W / 2, cy = H / 2;
  const maxPix = Math.min(W, H) / 2 - 30;
  // keep the radius ring a comfortable size at any zoom; pins spread to its edge
  const pixR = (0.34 + 0.58 * clamp((radius - 0.5) / 9.5)) * maxPix;
  const sel = matches.find(m => m.id === selected);

  return (
    <div style={{ padding: '0 20px' }}>
      <div ref={ref} onClick={() => onSelect(null)}
        style={{ position: 'relative', height: H, borderRadius: rad(24), overflow: 'hidden', border: `1px solid ${C.hair}` }}>
        <StreetMap />

        {/* radius circle */}
        <div style={{ position: 'absolute', left: cx, top: cy, width: pixR * 2, height: pixR * 2,
          transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1.5px dashed ${C.blueHi}`,
          background: C.blueTint, transition: 'all .35s cubic-bezier(.2,.8,.2,1)', zIndex: 3 }} />
        {/* expanding sonar rings */}
        {[0, 1].map(k => (
          <div key={k} style={{ position: 'absolute', left: cx, top: cy, width: 40, height: 40,
            transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1.5px solid ${C.blueHi}`,
            animation: `pd-sonar 3s ${k * 1.5}s infinite`, zIndex: 3 }} />
        ))}

        {/* you marker */}
        <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', zIndex: 5 }}>
          <Avatar name="Tomás Ríos" size={36} tone={0} style={{ boxShadow: `0 0 0 3px ${C.void}, 0 0 16px ${C.glow}` }} />
        </div>

        {/* pins */}
        {matches.map(m => (
          <Pin key={m.id} m={m} cx={cx} cy={cy} pixR={pixR} radius={radius}
            selected={selected === m.id} onSelect={onSelect} />
        ))}

        {/* overlay chrome */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: `${C.void}cc`, backdropFilter: 'blur(8px)', border: `1px solid ${C.hair}`, borderRadius: rad(9), padding: '6px 10px', zIndex: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.blueHi }} />
          <Mono size={10} color={C.dim} ls={1} weight={700}>{radius.toFixed(1)} KM RADIUS</Mono>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 7 }}>
          {[Ico.plus, Ico.target].map((Ic, k) => (
            <div key={k} style={{ width: 38, height: 38, borderRadius: rad(11), background: `${C.s1}ee`, backdropFilter: 'blur(8px)',
              border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic size={18} color={C.mist} />
            </div>
          ))}
        </div>
      </div>

      {/* selected peek card */}
      <div style={{ marginTop: 14 }}>
        {sel ? (
          <Press onClick={() => onOpen(sel)} scale={0.98} style={{ animation: 'pd-fade-up .3s' }}>
            <div style={{ background: C.s1, border: `1px solid ${C.blue}`, borderRadius: rad(20), padding: 16,
              boxShadow: `0 0 22px ${C.glow}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.mist, marginBottom: 6, letterSpacing: -0.2 }}>{sel.club}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Ico.calendar size={13} color={C.faint} /><span style={{ fontSize: 13, color: C.dim, fontWeight: 500 }}>{sel.when} · {sel.time}</span>
                  </span>
                  <SkillBadge level={sel.skill} size="sm" />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.mist }}>{sel.filled}<span style={{ color: C.faint }}>/{sel.total}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, justifyContent: 'flex-end' }}>
                  <Mono size={10} color={C.blueHi} ls={1} weight={700}>VIEW</Mono>
                  <Ico.chevR size={15} color={C.blueHi} />
                </div>
              </div>
            </div>
          </Press>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <Mono size={11} color={C.faint} ls={1}>TAP A PIN TO PREVIEW A MATCH</Mono>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MapView });
