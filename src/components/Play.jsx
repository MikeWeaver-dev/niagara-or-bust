import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuBackground from './MenuBackground.jsx';
import ItemCard from './ItemCard.jsx';
import ItemPreview from './ItemPreview.jsx';
import { TopBar, useToast, toggleFullscreen, canFullscreen } from './common.jsx';
import { CHARACTERS, getCharacter } from '../data/characters.js';
import { CRAFTS, getCraft } from '../data/crafts.js';
import { CHEATS } from '../data/cheats.js';
import { store, useSave, isOwned, lumenMultiplier, recordRun, priceOf, lockReason, setSetting } from '../store.js';
import { deathMessage, surviveMessage } from '../data/messages.js';
import { Game } from '../game/Game.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';

export default function Play() {
  const [stage, setStage] = useState('loadout'); // loadout | game
  const [runKey, setRunKey] = useState(0);
  const start = () => {
    audio.click();
    setRunKey((k) => k + 1);
    setStage('game');
  };
  if (stage === 'game') return <GameView key={runKey} onLoadout={() => setStage('loadout')} onAgain={() => setRunKey((k) => k + 1)} />;
  return <Loadout onStart={start} />;
}

function Loadout({ onStart }) {
  const save = useSave();
  const [toast, show] = useToast();
  useEffect(() => {
    music.play('title');
  }, []);
  const ch = getCharacter(save.selected.character);
  const cr = getCraft(save.selected.craft);
  const chOk = isOwned('character', ch.id, save) || save.cheats.tryAll;
  const crOk = isOwned('craft', cr.id, save) || save.cheats.tryAll || save.cheats.salmon;
  const active = CHEATS.filter((c) => save.cheats[c.id]);
  return (
    <>
      <MenuBackground />
      <div className="screen">
        <div className="wrap loadout">
          <TopBar title="CHOOSE YOUR DOOM" />
          <div>
            <div className="picker-title">WHO'S GOING OVER?</div>
            <div className="strip">
              {CHARACTERS.map((c) => (
                <ItemCard key={c.id} kind="character" item={c} compact onToast={show} />
              ))}
            </div>
          </div>
          <div>
            <div className="picker-title">IN WHAT?</div>
            {save.cheats.salmon ? (
              <div className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 160, flex: '0 0 auto' }} className="card">
                  <ItemPreview kind="craft" id="salmon" />
                </div>
                <div>
                  <h3>🐟 SALMON MODE IS ON</h3>
                  <b>You ARE the vessel. Swim against the current (▼ / drag down) and never go over the falls. A bear will eat you eventually. Turn it off in Cheats.</b>
                </div>
              </div>
            ) : (
              <div className="strip">
                {CRAFTS.map((c) => (
                  <ItemCard key={c.id} kind="craft" item={c} compact onToast={show} />
                ))}
              </div>
            )}
          </div>
          {active.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              {active.map((c) => (
                <span key={c.id} className="cheat-chip">
                  {c.icon} {c.name}
                </span>
              ))}
            </div>
          )}
          <div className="go-bar">
            <div className="summary">
              {ch.name}
              <br />
              <span style={{ color: '#ffd23b' }}>{save.cheats.salmon ? 'as a SALMON' : `in: ${cr.name}`}</span>
            </div>
            <button className="btn big" disabled={!chOk || !crOk} onClick={onStart}>
              GO! 🌊
            </button>
          </div>
          {(!chOk || !crOk) && <div className="why" style={{ color: '#ffb0c4' }}>Pick something you own (or turn on "Try Everything" in Cheats)</div>}
        </div>
      </div>
      {toast}
    </>
  );
}

function GameView({ onLoadout, onAgain }) {
  const nav = useNavigate();
  const holder = useRef(null);
  const canvas = useRef(null);
  const game = useRef(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const musicTimer = useRef(null);
  const settings = useSave((s) => s.settings);

  const togglePause = useCallback(() => {
    const g = game.current;
    if (!g || g.done) return;
    const p = !g.paused;
    g.setPaused(p);
    setPaused(p);
  }, []);

  useEffect(() => {
    const s = store.get();
    const cfg = {
      character: getCharacter(s.selected.character),
      craft: getCraft(s.selected.craft),
      cheats: { ...s.cheats },
      settings: { ...s.settings },
    };
    const g = new Game(canvas.current, {
      cfg,
      onPause: () => togglePause(),
      onFinish: (r) => {
        const st = store.get();
        const mult = lumenMultiplier(st);
        const lumens = Math.max(1, Math.round(r.lumensBase * mult));
        const [headline, sub] = r.survived
          ? surviveMessage({ character: cfg.character.id, craft: cfg.craft.id })
          : deathMessage({ cause: r.cause, character: cfg.character.id, craft: r.salmon ? 'salmon' : cfg.craft.id, wrecked: r.wrecked });
        recordRun({ ...r, lumens });
        // what can we afford now?
        const after = store.get();
        const all = [...CRAFTS.map((c) => ['craft', c]), ...CHARACTERS.map((c) => ['character', c])];
        const affordable = all.filter(([k, it]) => !isOwned(k, it.id, after) && !lockReason(k, it.id, after) && after.lumens >= priceOf(it, after)).map(([, it]) => it.name);
        setResult({ ...r, lumens, mult, headline, sub, affordable });
        musicTimer.current = setTimeout(() => music.play('shop'), 1800);
      },
    });
    game.current = g;
    const onVis = () => {
      if (document.hidden && !g.done && !g.paused) {
        g.setPaused(true);
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(musicTimer.current);
      document.removeEventListener('visibilitychange', onVis);
      g.destroy();
      game.current = null;
    };
  }, [togglePause]);

  useEffect(() => {
    if (game.current) game.current.cfg.settings = { ...game.current.cfg.settings, ...settings };
    audio.setVolumes(settings.music, settings.sfx);
  }, [settings]);

  const quit = () => {
    audio.click();
    nav('/');
  };

  return (
    <div className="game-view" ref={holder}>
      <canvas ref={canvas} />
      {!result && (
        <div className="game-hud">
          <button className="icon-btn" aria-label="Pause" onClick={togglePause}>
            ❚❚
          </button>
        </div>
      )}
      {paused && !result && (
        <div className="overlay">
          <div className="panel pause-box">
            <h3 style={{ fontSize: 34 }}>PAUSED</h3>
            <button className="btn big" onClick={togglePause}>
              RESUME
            </button>
            <button className="btn teal" onClick={() => { audio.click(); onAgain(); }}>
              RESTART RUN
            </button>
            <button className="btn blue" onClick={() => { audio.click(); onLoadout(); }}>
              CHANGE LOADOUT
            </button>
            <div className="menu-row">
              <button className="btn small gray" onClick={() => setSetting('music', settings.music > 0 ? 0 : 0.55)}>
                {settings.music > 0 ? '🎵 MUSIC ON' : '🔇 MUSIC OFF'}
              </button>
              <button className="btn small gray" onClick={() => setSetting('sfx', settings.sfx > 0 ? 0 : 0.85)}>
                {settings.sfx > 0 ? '🔊 SFX ON' : '🔈 SFX OFF'}
              </button>
            </div>
            {canFullscreen() && (
              <button className="btn small gray" onClick={toggleFullscreen}>
                ⛶ FULLSCREEN
              </button>
            )}
            <button className="btn pink" onClick={quit}>
              QUIT TO MENU
            </button>
          </div>
        </div>
      )}
      {result && <Results r={result} onAgain={onAgain} onLoadout={onLoadout} onShop={() => nav('/shop')} onMenu={quit} />}
    </div>
  );
}

function Results({ r, onAgain, onLoadout, onShop, onMenu }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onAgain();
      }
    };
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onAgain]);
  const pct = Math.round((r.odds || 0) * 100);
  return (
    <div className="overlay">
      <div className="panel results">
        <div style={{ fontFamily: 'var(--head)', fontSize: 15, color: '#6a5a8a' }}>{r.survived ? 'YOU SURVIVED THE HORSESHOE FALLS' : r.salmon ? 'SALMON MODE' : 'CAUSE OF DEATH'}</div>
        <div className={`headline ${r.survived ? 'alive' : 'dead'}`}>{r.headline}</div>
        <div className="subline">{r.sub}</div>
        {!r.salmon && (
          <div className="roll">
            <span>ODDS: {pct}%</span>
            {r.roll !== undefined && <span>ROLLED: {Math.round(r.roll * 100)}</span>}
            {r.limbs > 0 && <span>LIMBS LOST: {r.limbs}</span>}
            {r.decapitated && <span>HEAD: MISSING</span>}
          </div>
        )}
        <div className="breakdown">
          {r.breakdown.map(([label, n]) => (
            <div key={label}>
              <span>{label}</span>
              <span>+{n}</span>
            </div>
          ))}
          {r.mult > 1 && (
            <div style={{ color: '#22a35e' }}>
              <span>Unlock boost</span>
              <span>x{r.mult.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="total">+{r.lumens} LUMENS</div>
        {r.affordable.length > 0 && <div className="afford">🛒 You can afford: {r.affordable.slice(0, 3).join(', ')}!</div>}
        <div className="result-buttons">
          <button className="btn big wide" onClick={() => { audio.click(); onAgain(); }}>
            AGAIN!
          </button>
          <button className="btn blue small" onClick={() => { audio.click(); onLoadout(); }}>
            LOADOUT
          </button>
          <button className="btn teal small" onClick={() => { audio.click(); onShop(); }}>
            SHOP
          </button>
          <button className="btn gray small wide" onClick={onMenu}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
