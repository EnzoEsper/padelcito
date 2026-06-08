// screen-create.jsx — slide-up sheet to host a new match

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Mono size={10} color={C.faint} ls={1.5} style={{ display: 'block', marginBottom: 9 }}>{label}</Mono>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: C.s3, borderRadius: rad(12), padding: 4 }}>
      {options.map(o => (
        <Press key={o} onClick={() => onChange(o)} style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', padding: '10px 0', borderRadius: rad(9), fontWeight: 600, fontSize: 14,
            background: value === o ? C.blue : 'transparent', color: value === o ? C.mist : C.dim }}>{o}</div>
        </Press>
      ))}
    </div>
  );
}

function FakeInput({ value, mono }) {
  return (
    <div style={{ background: C.s3, borderRadius: rad(12), padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 15, color: C.mist, fontFamily: mono ? MONO : FONT, fontWeight: mono ? 700 : 500 }}>{value}</span>
      <Ico.chevR size={16} color={C.ghost} />
    </div>
  );
}

function ScreenCreate({ onClose }) {
  const [skill, setSkill] = React.useState('B');
  const [fmt, setFmt] = React.useState('90 min');
  const [published, setPublished] = React.useState(false);

  React.useEffect(() => {
    if (published) { const t = setTimeout(onClose, 1500); return () => clearTimeout(t); }
  }, [published]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80 }}>
      {/* scrim */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(3px)', animation: 'pd-blur-in .25s' }} />
      {/* sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%',
        background: C.s2, borderTopLeftRadius: rad(30), borderTopRightRadius: rad(30), border: `1px solid ${C.hair}`,
        borderBottom: 'none', animation: 'pd-slide-up .32s cubic-bezier(.2,.8,.2,1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: C.ghost }} />
        </div>

        {published ? (
          <div style={{ padding: '50px 30px 60px', textAlign: 'center', animation: 'pd-fade-up .3s' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.blue, margin: '0 auto 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pd-pop .4s', boxShadow: `0 0 30px ${C.glow}` }}>
              <Ico.check size={36} color={C.mist} />
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, color: C.mist, marginBottom: 8 }}>Match published</div>
            <div style={{ fontSize: 14.5, color: C.dim, lineHeight: 1.5 }}>Nearby players within range will see it on Discover now.</div>
          </div>
        ) : (
          <>
            <div className="pd-scroll" style={{ overflow: 'auto', padding: '14px 22px 4px' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 800, color: C.mist, letterSpacing: -0.5 }}>Host a match</h2>
              <Field label="CLUB & COURT"><FakeInput value="Club Norte · Cancha 3" /></Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="DATE"><FakeInput value="Today" /></Field></div>
                <div style={{ flex: 1 }}><Field label="TIME"><FakeInput value="19:30" mono /></Field></div>
              </div>
              <Field label="SKILL LEVEL"><Segmented options={['A', 'B', 'C', 'D']} value={skill} onChange={setSkill} /></Field>
              <Field label="FORMAT"><Segmented options={['60 min', '90 min', '120 min']} value={fmt} onChange={setFmt} /></Field>
              <Field label="OPEN SPOTS">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.s3, borderRadius: rad(12), padding: '12px 16px' }}>
                  <span style={{ fontSize: 15, color: C.mist, fontWeight: 500 }}>Looking for</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.mist }}>1</span>
                    <span style={{ fontSize: 14, color: C.dim }}>player</span>
                  </div>
                </div>
              </Field>
            </div>
            <div style={{ padding: '12px 22px 30px' }}>
              <Press onClick={() => setPublished(true)} scale={0.97}>
                <button style={{ width: '100%', border: 'none', cursor: 'pointer', height: 56, borderRadius: rad(16),
                  background: C.blue, color: C.mist, fontFamily: FONT, fontSize: 16.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: `0 8px 24px ${C.glow}` }}>
                  <Ico.bolt size={18} color={C.mist} /> Publish match
                </button>
              </Press>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenCreate });
