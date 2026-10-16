import { useEffect } from 'react';
import MenuBackground from './MenuBackground.jsx';
import { TopBar, useToast, toggleFullscreen, canFullscreen } from './common.jsx';
import { useSave, setSetting, resetProgress } from '../store.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';

function Seg({ value, options, onChange }) {
  return (
    <span className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => { audio.click(); onChange(v); }}>
          {label}
        </button>
      ))}
    </span>
  );
}

export default function Settings() {
  const s = useSave((st) => st.settings);
  const [toast, show] = useToast();
  useEffect(() => {
    music.play('shop');
  }, []);
  useEffect(() => {
    audio.setVolumes(s.music, s.sfx);
  }, [s.music, s.sfx]);
  return (
    <>
      <MenuBackground />
      <div className="screen">
        <div className="wrap" style={{ maxWidth: 640 }}>
          <TopBar title="SETTINGS" />
          <div className="panel">
            <div className="setting">
              <label>
                🎵 Music
                <small>Original soundtrack, generated live</small>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={s.music} onChange={(e) => setSetting('music', +e.target.value)} />
            </div>
            <div className="setting">
              <label>
                🔊 Sound effects
                <small>Splashes, screams, crunches, honks</small>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={s.sfx} onChange={(e) => { setSetting('sfx', +e.target.value); audio.pickup(); }} />
            </div>
            <div className="setting">
              <label>
                🩸 Gore
                <small>OFF = cartoon bonks & ghosts (kid friendly)</small>
              </label>
              <Seg value={s.gore} options={[['off', 'OFF'], ['on', 'ON'], ['max', 'MAX']]} onChange={(v) => setSetting('gore', v)} />
            </div>
            <div className="setting">
              <label>
                💡 Economy
                <small>TEST = dirt-cheap unlocks for testing. NORMAL = 6x prices</small>
              </label>
              <Seg value={s.economy} options={[['test', 'TEST'], ['normal', 'NORMAL']]} onChange={(v) => setSetting('economy', v)} />
            </div>
            <div className="setting">
              <label>
                📳 Screen shake
                <small>Big impacts rattle the screen</small>
              </label>
              <Seg value={s.shake ? 'on' : 'off'} options={[['on', 'ON'], ['off', 'OFF']]} onChange={(v) => setSetting('shake', v === 'on')} />
            </div>
            <div className="setting">
              <label>
                📱 Touch controls
                <small>AUTO shows them on phones & tablets</small>
              </label>
              <Seg value={s.touch} options={[['auto', 'AUTO'], ['on', 'ON'], ['off', 'OFF']]} onChange={(v) => setSetting('touch', v)} />
            </div>
            {canFullscreen() && (
              <div className="setting">
                <label>
                  ⛶ Fullscreen
                  <small>Recommended on phones</small>
                </label>
                <button className="btn small" onClick={toggleFullscreen}>
                  TOGGLE
                </button>
              </div>
            )}
            <div className="setting" style={{ borderBottom: 0 }}>
              <label>
                🗑 Reset progress
                <small>Lumens, unlocks and stats (keeps settings)</small>
              </label>
              <button
                className="btn small pink"
                onClick={() => {
                  if (window.confirm('Reset ALL progress?')) {
                    resetProgress();
                    show('Progress reset.');
                  }
                }}
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast}
    </>
  );
}
