// screen-brackets.jsx — Live tournament bracket with real-time scores

// scripted live-point sequence for the in-progress match (loops, stays realistic)
const LIVE_SEQ = [
  { sa: [6, 3], sb: [4, 4], game: '40–30' },
  { sa: [6, 3], sb: [4, 4], game: 'DEUCE' },
  { sa: [6, 3], sb: [4, 4], game: 'AD —' },
  { sa: [6, 4], sb: [4, 4], game: '0–0' },
  { sa: [6, 4], sb: [4, 4], game: '15–0' },
  { sa: [6, 4], sb: [4, 4], game: '30–15' },
  { sa: [6, 4], sb: [4, 4], game: '40–15' },
  { sa: [6, 5], sb: [4, 4], game: '0–0' },
  { sa: [6, 5], sb: [4, 4], game: '0–30' },
  { sa: [6, 5], sb: [4, 4], game: '30–40' },
  { sa: [6, 5], sb: [4, 5], game: '0–0' },
  { sa: [6, 5], sb: [4, 5], game: '40–0' },
];

function useLive() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI(p => (p + 1) % LIVE_SEQ.length), 2600);
    return () => clearInterval(t);
  }, []);
  return LIVE_SEQ[i];
}

const MH = 96, VG = 20, COLW = 170, COLG = 36;

function computeLayout(rounds) {
  const centers = [];
  rounds.forEach((r, ri) => {
    if (ri === 0) centers[ri] = r.matches.map((_, i) => i * (MH + VG) + MH / 2);
    else centers[ri] = r.matches.map((_, i) => (centers[ri - 1][2 * i] + centers[ri - 1][2 * i + 1]) / 2);
  });
  const last = centers[0];
  const totalH = last[last.length - 1] + MH / 2;
  return { centers, totalH };
}

function TeamRow({ t, sets, win, live, top }) {
  const dim = !win && (sets.length > 0 || win === false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: (MH - 4) / 2, padding: '0 11px',
      borderBottom: top ? `1px solid ${C.hair2}` : 'none' }}>
      {win && <div style={{ width: 3, height: 18, borderRadius: 2, background: C.blueHi, marginRight: 8, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0, marginLeft: win ? 0 : 11 }}>
        <div style={{ fontSize: 12.5, fontWeight: win ? 700 : 500, color: t.n === 'TBD' ? C.faint : (dim ? C.dim : C.mist),
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.n}</div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginLeft: 6, alignItems: 'center' }}>
        {sets.map((s, i) => (
          <span key={i} style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700,
            color: win ? C.mist : C.dim, minWidth: 9, textAlign: 'center' }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function BracketMatch({ m, live, selected, onSelect }) {
  const isLive = m.live;
  const sa = isLive ? live.sa : m.sa;
  const sb = isLive ? live.sb : m.sb;
  const border = selected ? C.blueHi : (isLive ? C.blue : C.hair);
  return (
    <Press onClick={() => onSelect(m.id)} scale={0.98}
      style={{ width: COLW, height: MH, position: 'relative' }}>
      <div style={{ width: '100%', height: '100%', background: C.s1, borderRadius: rad(14),
        border: `1.5px solid ${border}`, overflow: 'hidden',
        boxShadow: isLive ? `0 0 0 3px ${C.blueTint}, 0 0 20px ${C.glow}` : (selected ? `0 0 0 3px ${C.blueTint}` : 'none') }}>
        {/* status strip */}
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, zIndex: 2 }}>
          {isLive && <>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win, animation: 'pd-pulse 1.1s infinite' }} />
            <Mono size={9} color={C.win} ls={1} weight={700}>LIVE</Mono>
          </>}
          {m.done && <Ico.check size={13} color={C.blueHi} />}
          {m.next && !m.tbd && <Mono size={9} color={C.faint} ls={1}>{m.next}</Mono>}
        </div>
        <TeamRow t={m.a} sets={sa} win={m.done ? m.w === 'a' : false} live={isLive} top />
        <TeamRow t={m.b} sets={sb} win={m.done ? m.w === 'b' : false} live={isLive} />
      </div>
    </Press>
  );
}

function Connectors({ layout, rounds }) {
  const { centers, totalH } = layout;
  const W = rounds.length * COLW + (rounds.length - 1) * COLG;
  const x = ri => ri * (COLW + COLG);
  const paths = [];
  for (let ri = 1; ri < rounds.length; ri++) {
    rounds[ri].matches.forEach((pm, i) => {
      const px = x(ri), parentY = centers[ri][i];
      const childRX = x(ri - 1) + COLW;
      const midx = childRX + COLG / 2;
      [2 * i, 2 * i + 1].forEach(c => {
        const childY = centers[ri - 1][c];
        const decided = rounds[ri - 1].matches[c]?.done;
        paths.push(
          <path key={`${ri}-${i}-${c}`}
            d={`M ${childRX} ${childY} H ${midx} V ${parentY} H ${px}`}
            fill="none" stroke={decided ? C.blueHi : C.hair}
            strokeWidth={decided ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"
            opacity={decided ? 0.9 : 1} />
        );
      });
    });
  }
  return (
    <svg width={W} height={totalH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{paths}</svg>
  );
}

function ScreenBrackets({ selected, setSelected }) {
  const live = useLive();
  const rounds = TOURNEY.rounds;
  const layout = computeLayout(rounds);
  const x = ri => ri * (COLW + COLG);

  // resolve selected match object
  let selM = null;
  rounds.forEach(r => r.matches.forEach(m => { if (m.id === selected) selM = m; }));
  if (!selM) selM = rounds[0].matches.find(m => m.live);

  const selSa = selM.live ? live.sa : selM.sa;
  const selSb = selM.live ? live.sb : selM.sb;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '58px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Ico.trophy size={14} color={C.blueHi} />
          <Mono size={10.5} color={C.faint} ls={1.5}>{TOURNEY.venue.toUpperCase()} · {TOURNEY.date.toUpperCase()}</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, color: C.mist, letterSpacing: -0.6 }}>{TOURNEY.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(91,224,166,0.1)',
            border: '1px solid rgba(91,224,166,0.35)', borderRadius: rad(9), padding: '5px 10px', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win, animation: 'pd-pulse 1.1s infinite' }} />
            <Mono size={10} color={C.win} ls={1} weight={700}>LIVE</Mono>
          </div>
        </div>
      </div>

      {/* round legend */}
      <div style={{ display: 'flex', gap: 0, padding: '0 20px 10px' }}>
        {rounds.map((r, i) => (
          <div key={i} style={{ width: COLW, marginRight: i < rounds.length - 1 ? COLG : 0, flexShrink: 0 }}>
            <Mono size={10} color={C.faint} ls={1.5} weight={700}>{r.name.toUpperCase()}</Mono>
          </div>
        ))}
      </div>

      {/* bracket — horizontal scroll */}
      <div className="pd-scroll" style={{ overflowX: 'auto', overflowY: 'hidden', padding: '4px 20px 8px' }}>
        <div style={{ position: 'relative', width: rounds.length * COLW + (rounds.length - 1) * COLG, height: layout.totalH }}>
          <Connectors layout={layout} rounds={rounds} />
          {rounds.map((r, ri) =>
            r.matches.map((m, i) => (
              <div key={m.id} style={{ position: 'absolute', left: x(ri), top: layout.centers[ri][i] - MH / 2 }}>
                <BracketMatch m={m} live={live} selected={selM.id === m.id} onSelect={setSelected} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* spotlight — selected / live match detail */}
      <div style={{ flex: 1 }} />
      <div style={{ margin: '0 20px 16px', background: C.s2, border: `1px solid ${selM.live ? C.blue : C.hair}`,
        borderRadius: rad(20), padding: 18, boxShadow: selM.live ? `0 0 24px ${C.glow}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Mono size={10.5} color={C.faint} ls={1.5} weight={700}>
            {rounds.find(r => r.matches.some(mm => mm.id === selM.id)).name.toUpperCase()}
          </Mono>
          {selM.live
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win, animation: 'pd-pulse 1.1s infinite' }} />
                <Mono size={10} color={C.win} ls={1} weight={700}>SET {selM.set} · IN PLAY</Mono>
              </div>
            : selM.done ? <Mono size={10} color={C.blueHi} ls={1} weight={700}>FINAL</Mono>
            : <Mono size={10} color={C.dim} ls={1} weight={700}>STARTS {selM.next}</Mono>}
        </div>

        {[{ t: selM.a, s: selSa, w: selM.w === 'a' }, { t: selM.b, s: selSb, w: selM.w === 'b' }].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', padding: '9px 0',
            borderTop: ri ? `1px solid ${C.hair2}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              {selM.done && row.w && <div style={{ width: 3, height: 20, borderRadius: 2, background: C.blueHi }} />}
              <span style={{ fontSize: 16, fontWeight: row.w && selM.done ? 700 : 500,
                color: row.t.n === 'TBD' ? C.faint : C.mist, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginLeft: selM.done && row.w ? 0 : (selM.done ? 11 : 0) }}>{row.t.n}</span>
              {row.t.s && <SkillBadge level={row.t.s} size="sm" />}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {row.s.map((s, i) => (
                <span key={i} style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700,
                  color: row.w || !selM.done ? C.mist : C.dim, minWidth: 12, textAlign: 'center' }}>{s}</span>
              ))}
              {selM.live && ri === 0 && (
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.void, background: C.blueHi,
                  borderRadius: 7, padding: '4px 8px', minWidth: 46, textAlign: 'center',
                  animation: 'pd-score-flip .3s' }} key={live.game}>{live.game}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenBrackets });
