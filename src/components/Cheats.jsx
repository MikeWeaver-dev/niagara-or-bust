import { useEffect, useState } from 'react';
import MenuBackground from './MenuBackground.jsx';
import { TopBar, useToast } from './common.jsx';
import { CHEATS, CODES } from '../data/cheats.js';
import { useSave, setCheat, addLumens, unlockAll, resetProgress, store } from '../store.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';

const EXCLUSIVE = { god: 'alwaysDie', alwaysDie: 'god' };

export default function Cheats() {
  const cheats = useSave((s) => s.cheats);
  const [code, setCode] = useState('');
  const [toast, show] = useToast();
  useEffect(() => {
    music.play('shop');
  }, []);

  const toggle = (id) => {
    const on = !cheats[id];
    if (on && EXCLUSIVE[id]) setCheat(EXCLUSIVE[id], false);
    setCheat(id, on);
    on ? audio.pickup(1.2) : audio.click();
    if (id === 'salmon' && on) show('🐟 You are now a salmon. Beware of bears.');
  };

  const submit = (e) => {
    e.preventDefault();
    const c = CODES[code.trim().toUpperCase().replace(/\s+/g, '')];
    if (!c) {
      audio.denied();
      show('Nope. That is not a code.');
      return;
    }
    if (c.toggle) {
      if (EXCLUSIVE[c.toggle]) setCheat(EXCLUSIVE[c.toggle], false);
      setCheat(c.toggle, !store.get().cheats[c.toggle]);
    }
    if (c.lumens) addLumens(c.lumens);
    if (c.unlockAll) unlockAll();
    audio.buy();
    show(`✅ ${c.msg}`);
    setCode('');
  };

  return (
    <>
      <MenuBackground />
      <div className="screen">
        <div className="wrap">
          <TopBar title="CHEATS" />
          <div className="panel" style={{ marginBottom: 16 }}>
            <h3>QUICK CHEATS</h3>
            <div className="menu-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <button className="btn small teal" onClick={() => { addLumens(500); audio.buy(); show('+500 lumens!'); }}>
                💡 +500 LUMENS
              </button>
              <button className="btn small teal" onClick={() => { addLumens(5000); audio.buy(); show('+5000 lumens! Rich!'); }}>
                💰 +5000 LUMENS
              </button>
              <button className="btn small purple" onClick={() => { unlockAll(); audio.buy(); show('Everything unlocked, including the Golden Goose!'); }}>
                🔓 UNLOCK EVERYTHING
              </button>
              <button
                className="btn small pink"
                onClick={() => {
                  if (window.confirm('Reset ALL progress (lumens, unlocks, stats)?')) {
                    resetProgress();
                    audio.click();
                    show('Progress wiped. Back to Annie and nothing.');
                  }
                }}
              >
                🗑 RESET PROGRESS
              </button>
            </div>
            <form className="code-row" onSubmit={submit}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ENTER A CHEAT CODE" aria-label="Cheat code" autoCapitalize="characters" autoCorrect="off" spellCheck="false" />
              <button className="btn small" type="submit">
                ENTER
              </button>
            </form>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6a5a8a' }}>Psst: try SALMON, GOOSE, MONEY, IDDQD, BLOODBATH, KABOOM, BIGHEAD, DISCO, MOON, HONK...</div>
          </div>
          <div className="toggles">
            {CHEATS.map((c) => (
              <button key={c.id} className={`toggle ${cheats[c.id] ? 'on' : ''}`} onClick={() => toggle(c.id)}>
                <span className="emoji">{c.icon}</span>
                <span className="t">
                  <b>{c.name}</b>
                  <small>{c.desc}</small>
                </span>
                <span className="switch" />
              </button>
            ))}
          </div>
        </div>
      </div>
      {toast}
    </>
  );
}
