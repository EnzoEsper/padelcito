// app.jsx — root: tab shell, routing, shared state, tweaks

const LS = 'padel_proto_v1';
function loadLS() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
function saveLS(p) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch {} }

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Dark",
  "blueIntensity": 70,
  "corner": "Rounded",
  "radiusDefault": 3
}/*EDITMODE-END*/;

const RAD_SCALE = { Sharp: 0.45, Rounded: 1, Soft: 1.55 };

function TabBar({ tab, setTab, onCreate }) {
  const tabs = [
    { k: 'discover', label: 'Discover', icon: Ico.compass },
    { k: 'tournaments', label: 'Circuits', icon: Ico.trophy },
    { k: '__create', label: '', icon: Ico.plus },
    { k: 'matches', label: 'Matches', icon: Ico.calendar },
    { k: 'profile', label: 'You', icon: Ico.user },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      paddingBottom: 26, paddingTop: 10,
      background: `linear-gradient(180deg, transparent, ${C.void} 30%)` }}>
      <div style={{ height: 1, background: C.hair2, marginBottom: 4 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', padding: '4px 14px 0' }}>
        {tabs.map(t => {
          if (t.k === '__create') {
            return (
              <Press key="c" onClick={onCreate} style={{ marginTop: -2 }}>
                <div style={{ width: 52, height: 52, borderRadius: rad(17), background: C.blue,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 18px ${C.glow}`, border: `1px solid ${C.blueHi}` }}>
                  <Ico.plus size={26} color={C.mist} />
                </div>
              </Press>
            );
          }
          const on = tab === t.k;
          const Icon = t.icon;
          return (
            <Press key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, maxWidth: 70 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 0' }}>
                <Icon size={24} color={on ? C.blueHi : C.faint} sw={on ? 2 : 1.7} />
                <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, color: on ? C.mist : C.faint, letterSpacing: 0.1 }}>{t.label}</span>
              </div>
            </Press>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const themeName = t.theme === 'Light' ? 'light' : 'dark';

  // apply live design tokens before children render
  window.__radScale = RAD_SCALE[t.corner] ?? 1;
  applyPalette(themeName, (t.blueIntensity ?? 70) / 100);

  const init = loadLS();
  const [tab, setTab] = React.useState(init.tab || 'discover');
  const [skillFilter, setSkillFilter] = React.useState('All');
  const [overlay, setOverlay] = React.useState(null);
  const [joinState, setJoinState] = React.useState({});
  const [matchesTab, setMatchesTab] = React.useState('upcoming');
  const [bracketSel, setBracketSel] = React.useState('q3');

  React.useEffect(() => { saveLS({ tab }); }, [tab]);

  const radius = t.radiusDefault;
  const setRadius = (v) => setTweak('radiusDefault', v);
  const toggleTheme = () => setTweak('theme', t.theme === 'Light' ? 'Dark' : 'Light');

  const openMatch = (m) => setOverlay({ type: 'detail', m });
  const openMatchById = (id) => { const m = MATCHES.find(x => x.id === id); if (m) openMatch(m); };

  let screen;
  if (tab === 'discover') screen = <ScreenDiscover radius={radius} setRadius={setRadius} skillFilter={skillFilter} setSkillFilter={setSkillFilter} onOpen={openMatch} theme={themeName} onToggleTheme={toggleTheme} />;
  else if (tab === 'tournaments') screen = <ScreenBrackets selected={bracketSel} setSelected={setBracketSel} />;
  else if (tab === 'matches') screen = <ScreenMatches tab={matchesTab} setTab={setMatchesTab} onOpenMatch={openMatchById} />;
  else if (tab === 'profile') screen = <ScreenProfile theme={themeName} onToggleTheme={toggleTheme} />;

  const fullHeightTab = tab === 'tournaments';

  return (
    <React.Fragment>
      <IOSDevice dark={themeName === 'dark'}>
        <div style={{ position: 'relative', height: '100%', background: C.void, overflow: 'hidden' }}>
          <div className="pd-scroll" key={tab + themeName}
            style={{ position: 'absolute', inset: 0, overflowY: fullHeightTab ? 'hidden' : 'auto',
              paddingBottom: fullHeightTab ? 96 : 104, animation: 'pd-fade-up .35s' }}>
            {fullHeightTab
              ? <div style={{ height: '100%', paddingBottom: 96, boxSizing: 'border-box' }}>{screen}</div>
              : screen}
          </div>

          <TabBar tab={tab} setTab={setTab} onCreate={() => setOverlay({ type: 'create' })} />

          {overlay?.type === 'detail' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 70, animation: 'pd-fade-up .28s' }}>
              <ScreenDetail m={overlay.m} onBack={() => setOverlay(null)} joinState={joinState} setJoinState={setJoinState} />
            </div>
          )}

          {overlay?.type === 'create' && <ScreenCreate onClose={() => setOverlay(null)} />}
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme} options={['Dark', 'Light']} onChange={(v) => setTweak('theme', v)} />
        <TweakSlider label="Blue intensity" value={t.blueIntensity} min={20} max={100} step={5} unit="%" onChange={(v) => setTweak('blueIntensity', v)} />
        <TweakRadio label="Corner radius" value={t.corner} options={['Sharp', 'Rounded', 'Soft']} onChange={(v) => setTweak('corner', v)} />
        <TweakSection label="Matchmaking" />
        <TweakSlider label="Default radius" value={t.radiusDefault} min={0.5} max={10} step={0.5} unit=" km" onChange={(v) => setTweak('radiusDefault', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
