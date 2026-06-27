// screen-matches.jsx — "My matches": upcoming + history

function StatePill({ state }) {
  const map = {
    confirmed: { t: 'CONFIRMED', c: C.win, bg: 'rgba(91,224,166,0.1)', bd: 'rgba(91,224,166,0.3)' },
    pending:   { t: 'PENDING',   c: C.warn, bg: 'rgba(224,177,91,0.1)', bd: 'rgba(224,177,91,0.3)' },
    finished: { t: 'FINISHED', c: C.dim,  bg: C.s3, bd: C.hair },
  }[state];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: map.bg,
      border: `1px solid ${map.bd}`, borderRadius: 8, padding: '4px 9px' }}>
      {state !== 'finished' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: map.c,
        animation: state === 'pending' ? 'pd-pulse 1.2s infinite' : 'none' }} />}
      <Mono size={9.5} color={map.c} ls={1} weight={700}>{map.t}</Mono>
    </span>
  );
}

function ScreenMatches({ tab, setTab, onOpenMatch }) {
  const upcoming = MY_MATCHES.filter(m => m.state !== 'finished');
  const history = MY_MATCHES.filter(m => m.state === 'finished');
  const list = tab === 'upcoming' ? upcoming : history;
  const linkMap = { my1: 'mx1', my2: 'mx3' };

  return (
    <div>
      <div style={{ padding: '58px 20px 16px' }}>
        <Mono size={10.5} color={C.faint} ls={1.5} style={{ display: 'block', marginBottom: 4 }}>YOUR CALENDAR</Mono>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: C.mist, letterSpacing: -0.8 }}>Matches</h1>
      </div>

      {/* segmented control */}
      <div style={{ display: 'flex', gap: 4, margin: '0 20px 20px', background: C.s1, border: `1px solid ${C.hair}`,
        borderRadius: rad(13), padding: 4 }}>
        {[['upcoming', `Upcoming · ${upcoming.length}`], ['history', `History · ${history.length}`]].map(([k, label]) => (
          <Press key={k} onClick={() => setTab(k)} style={{ flex: 1 }}>
            <div style={{ textAlign: 'center', padding: '10px 0', borderRadius: rad(9), fontWeight: 600, fontSize: 14,
              background: tab === k ? C.blue : 'transparent', color: tab === k ? C.mist : C.dim,
              transition: 'background .2s' }}>{label}</div>
          </Press>
        ))}
      </div>

      {list.map((m, i) => {
        const finished = m.state === 'finished';
        const tappable = linkMap[m.id];
        return (
          <Press key={m.id} onClick={() => tappable && onOpenMatch(tappable)} scale={tappable ? 0.985 : 1}
            style={{ animation: `pd-fade-up .4s ${i * 0.05}s both` }}>
            <div style={{ margin: '0 20px 12px', background: C.s1, border: `1px solid ${C.hair}`,
              borderRadius: rad(18), padding: 16, opacity: finished ? 0.92 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <StatePill state={m.state} />
                <SkillBadge level={m.skill} size="sm" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.mist, marginBottom: 6, letterSpacing: -0.2 }}>{m.club}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.dim }}>
                  <Ico.calendar size={13} color={C.faint} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.when} · {m.time}</span>
                </span>
                {finished ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mono size={12} color={C.dim} ls={0.5} weight={700}>{m.score}</Mono>
                    <span style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: MONO, fontSize: 12, fontWeight: 700,
                      background: m.result === 'W' ? C.blue : C.s3, color: m.result === 'W' ? C.mist : C.faint }}>{m.result}</span>
                  </div>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FillMeter filled={m.filled} total={m.total} size={7} gap={4} />
                    {tappable && <Ico.chevR size={16} color={C.ghost} />}
                  </span>
                )}
              </div>
            </div>
          </Press>
        );
      })}
      <div style={{ height: 12 }} />
    </div>
  );
}

Object.assign(window, { ScreenMatches });
