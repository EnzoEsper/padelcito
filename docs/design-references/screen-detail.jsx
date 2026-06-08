// screen-detail.jsx — Match detail, players, conditional footer actions

function StatBox({ label, value, sub }) {
  return (
    <div style={{ flex: 1, background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(16), padding: '14px 14px' }}>
      <Mono size={10} color={C.faint} ls={1.5} style={{ display: 'block', marginBottom: 7 }}>{label}</Mono>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: C.mist, letterSpacing: -0.3 }}>{value}</span>
        {sub && <Mono size={11} color={C.dim}>{sub}</Mono>}
      </div>
    </div>
  );
}

function PlayerRow({ p, host }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0' }}>
      <Avatar name={p.name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 15.5, fontWeight: 600, color: C.mist }}>{p.name}{p.you ? ' (You)' : ''}</span>
          {host && <Mono size={9} color={C.blueHi} ls={1} weight={700} style={{ border: `1px solid ${C.blue}`, borderRadius: 5, padding: '2px 6px' }}>HOST</Mono>}
        </div>
        <Trust score={p.trust} size="sm" />
      </div>
      <SkillBadge level={p.skill} size="sm" />
    </div>
  );
}

function ScreenDetail({ m, onBack, joinState, setJoinState }) {
  const state = joinState[m.id] || (m.filled >= m.total ? 'full' : 'open');

  // auto-advance pending → accepted to demo the dynamic WhatsApp button
  React.useEffect(() => {
    if (state === 'pending') {
      const t = setTimeout(() => setJoinState(s => ({ ...s, [m.id]: 'accepted' })), 2300);
      return () => clearTimeout(t);
    }
  }, [state, m.id]);

  const accepted = state === 'accepted';
  const players = accepted ? [...m.players, PLAYERS.you] : m.players;
  const filledNow = accepted ? m.filled + 1 : m.filled;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.void }}>
      {/* scroll body */}
      <div className="pd-scroll" style={{ flex: 1, overflow: 'auto' }}>
        {/* hero */}
        <div style={{ position: 'relative', paddingBottom: 4 }}>
          {/* striped court placeholder */}
          <div style={{ height: 188, position: 'relative', overflow: 'hidden',
            background: `repeating-linear-gradient(135deg, ${C.blueDeep} 0 2px, ${C.s2} 2px 13px)` }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(11,11,11,0.1) 0%, ${C.void} 100%)` }} />
            <div style={{ position: 'absolute', left: '50%', top: 74, transform: 'translateX(-50%)', textAlign: 'center' }}>
              <Mono size={10.5} color="rgba(228,228,228,0.45)" ls={2}>COURT PHOTO · {m.surface.toUpperCase()}</Mono>
            </div>
            {/* back button */}
            <Press onClick={onBack} style={{ position: 'absolute', top: 56, left: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: rad(13), background: 'rgba(11,11,11,0.55)', backdropFilter: 'blur(10px)',
                border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico.chevL size={22} color={C.mist} />
              </div>
            </Press>
            <Press style={{ position: 'absolute', top: 56, right: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: rad(13), background: 'rgba(11,11,11,0.55)', backdropFilter: 'blur(10px)',
                border: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico.share size={19} color={C.mist} />
              </div>
            </Press>
          </div>

          <div style={{ padding: '4px 20px 0', marginTop: -8, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <SkillBadge level={m.skill} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.s3, borderRadius: 8, padding: '5px 9px' }}>
                <Ico.pin size={12} color={C.blueHi} /><Mono size={11} color={C.mist} ls={0.5} weight={700}>{m.dist.toFixed(1)}KM</Mono>
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 25, fontWeight: 800, color: C.mist, letterSpacing: -0.6 }}>{m.club}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.dim }}>
              <Ico.calendar size={15} color={C.faint} />
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{m.when}, {m.time}</span>
            </div>
          </div>
        </div>

        {/* stat boxes */}
        <div style={{ display: 'flex', gap: 10, padding: '18px 20px 4px' }}>
          <StatBox label="DURATION" value={m.dur} sub="MIN" />
          <StatBox label="SURFACE" value={m.surface.split(' ')[0]} />
          <StatBox label="PER PLAYER" value={`$${m.price}`} />
        </div>

        {/* players */}
        <div style={{ padding: '22px 20px 0' }}>
          <SectionLabel style={{ padding: '0 0 6px' }}
            right={<Mono size={11} color={filledNow >= m.total ? C.dim : C.blueHi} ls={1} weight={700}>{filledNow}/{m.total} FILLED</Mono>}>
            ROSTER
          </SectionLabel>
          <div style={{ background: C.s1, border: `1px solid ${C.hair}`, borderRadius: rad(18), padding: '2px 16px' }}>
            {players.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ height: 1, background: C.hair2 }} />}
                <PlayerRow p={p} host={p.name === m.host} />
              </React.Fragment>
            ))}
            {filledNow < m.total && (
              <>
                <div style={{ height: 1, background: C.hair2 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px dashed ${C.ghost}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico.plus size={18} color={C.faint} />
                  </div>
                  <span style={{ fontSize: 15, color: C.faint, fontWeight: 500 }}>
                    {m.total - filledNow} spot{m.total - filledNow > 1 ? 's' : ''} open
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* host note */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ background: C.blueTint, border: `1px solid ${C.blue}`, borderRadius: rad(16), padding: 16 }}>
            <Mono size={10} color={C.blueHi} ls={1.5} style={{ display: 'block', marginBottom: 7 }}>NOTE FROM {m.host.split(' ')[0].toUpperCase()}</Mono>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: '#C7CEE8', fontWeight: 400 }}>{m.note}</div>
          </div>
        </div>

        {/* penalty notice — only once accepted */}
        {accepted && (
          <div style={{ padding: '14px 20px 0', animation: 'pd-fade-up .4s both' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: rad(14),
              background: 'rgba(224,177,91,0.08)', border: '1px solid rgba(224,177,91,0.3)' }}>
              <Ico.bell size={16} color={C.warn} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#E0CBA0' }}>
                Cancelling within <b style={{ color: C.warn }}>12h</b> of start time affects your trust score and may incur a no-show penalty.
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 18 }} />
      </div>

      {/* sticky footer action */}
      <div style={{ padding: '14px 20px 30px', background: `linear-gradient(180deg, transparent, ${C.void} 22%)`,
        borderTop: `1px solid ${C.hair2}` }}>
        {state === 'open' && (
          <Press onClick={() => setJoinState(s => ({ ...s, [m.id]: 'pending' }))} scale={0.97}>
            <button style={{ width: '100%', border: 'none', cursor: 'pointer', height: 56, borderRadius: rad(16),
              background: C.blue, color: C.mist, fontFamily: FONT, fontSize: 16.5, fontWeight: 700, letterSpacing: 0.2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: `0 8px 24px ${C.glow}` }}>
              <Ico.bolt size={18} color={C.mist} /> Request to Join
            </button>
          </Press>
        )}
        {state === 'pending' && (
          <button disabled style={{ width: '100%', border: `1px solid ${C.hair}`, height: 56, borderRadius: rad(16),
            background: C.s1, color: C.dim, fontFamily: FONT, fontSize: 16, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: C.blueHi, animation: 'pd-pulse 1s infinite' }} />
            Request sent · awaiting host
          </button>
        )}
        {state === 'accepted' && (
          <div style={{ animation: 'pd-pop .35s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 11 }}>
              <Ico.check size={16} color={C.win} />
              <Mono size={11} color={C.win} ls={1} weight={700}>YOU'RE IN — ROSTER CONFIRMED</Mono>
            </div>
            <Press scale={0.97}>
              <button style={{ width: '100%', border: 'none', cursor: 'pointer', height: 56, borderRadius: rad(16),
                background: C.mist, color: C.void, fontFamily: FONT, fontSize: 16.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <Ico.chat size={19} color={C.void} /> Message group on WhatsApp
              </button>
            </Press>
          </div>
        )}
        {state === 'full' && (
          <button disabled style={{ width: '100%', border: `1px solid ${C.hair}`, height: 56, borderRadius: rad(16),
            background: C.s1, color: C.faint, fontFamily: FONT, fontSize: 16, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <Ico.users size={18} color={C.faint} /> Match is full · Join waitlist
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDetail });
