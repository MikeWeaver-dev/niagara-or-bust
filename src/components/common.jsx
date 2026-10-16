import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSave, lumenMultiplier, isOwned } from '../store.js';
import { audio } from '../audio/audio.js';

export function Lumens() {
  const lumens = useSave((s) => s.lumens);
  const owned = useSave((s) => s.owned);
  const mult = lumenMultiplier({ owned });
  return (
    <span className="lumens" title="Lumens: earn them by attempting the falls">
      <span className="orb" />
      {lumens.toLocaleString()}
      {mult > 1 && <span className="mult">x{mult.toFixed(2)}</span>}
    </span>
  );
}

export function TopBar({ title, back = '/' }) {
  const nav = useNavigate();
  return (
    <div className="topbar">
      <button
        className="icon-btn"
        aria-label="Back"
        onClick={() => {
          audio.click();
          nav(back);
        }}
      >
        ◀
      </button>
      <h2>{title}</h2>
      <Lumens />
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = msg ? <div className="toast">{msg}</div> : null;
  return [node, show];
}

export function canFullscreen() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen);
}

export function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => {});
      }
    } else {
      const ex = d.exitFullscreen || d.webkitExitFullscreen;
      if (ex) {
        const p = ex.call(d);
        if (p && p.catch) p.catch(() => {});
      }
    }
  } catch {
    /* not supported (e.g. iPhone) */
  }
}

export function Pips({ n }) {
  return (
    <span className="pips">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`pip ${i <= n ? 'on' : ''}`} />
      ))}
    </span>
  );
}

// Jump straight into a run with the current loadout
export function GoButton({ className = '' }) {
  const nav = useNavigate();
  const save = useSave();
  const ok = (isOwned('character', save.selected.character, save) || save.cheats.tryAll) && (isOwned('craft', save.selected.craft, save) || save.cheats.tryAll || save.cheats.salmon);
  return (
    <button
      className={`btn go-btn ${className}`}
      disabled={!ok}
      title={ok ? 'Play now with your current character and vessel' : 'Select something you own first'}
      onClick={() => {
        audio.click();
        nav('/play', { state: { autostart: true } });
      }}
    >
      GO! 🌊
    </button>
  );
}
