import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuBackground from './MenuBackground.jsx';
import { Lumens, toggleFullscreen, canFullscreen } from './common.jsx';
import { useSave } from '../store.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';

export default function Title() {
  const nav = useNavigate();
  const stats = useSave((s) => s.stats);
  const cheats = useSave((s) => s.cheats);
  const activeCheats = Object.values(cheats).filter(Boolean).length;
  useEffect(() => {
    music.play('title');
  }, []);
  const go = (path) => () => {
    audio.click();
    nav(path);
  };
  return (
    <>
      <MenuBackground />
      <div className="screen center">
        {canFullscreen() && (
          <div className="corner-l">
            <button className="icon-btn" aria-label="Fullscreen" onClick={toggleFullscreen}>
              ⛶
            </button>
          </div>
        )}
        <div className="corner">
          <Lumens />
        </div>
        <h1 className="logo">
          <span className="l1">NIAGARA</span>
          <span className="or">or</span>
          <span className="l2">BUST!</span>
        </h1>
        <div className="tagline">Survive the Horseshoe Falls. (You won't.)</div>
        <div className="menu-buttons">
          <button className="btn big" onClick={go('/play')}>
            ▶ PLAY
          </button>
          <div className="menu-row">
            <button className="btn teal" onClick={go('/shop')}>
              🛒 SHOP
            </button>
            <button className="btn pink" onClick={go('/cheats')}>
              🐟 CHEATS{activeCheats ? ` (${activeCheats})` : ''}
            </button>
          </div>
          <div className="menu-row">
            <button className="btn blue" onClick={go('/how')}>
              ❓ HOW TO
            </button>
            <button className="btn gray" onClick={go('/settings')}>
              ⚙ SETTINGS
            </button>
          </div>
        </div>
        <div className="stat-line">
          RUNS {stats.runs} · SURVIVED {stats.survived} · DEATHS {stats.died} · BEST STREAK {stats.bestStreak} · LIMBS LOST {stats.limbs}
        </div>
        <div className="foot">Please do not actually go over Niagara Falls. It is illegal, and also Niagara Falls.</div>
      </div>
    </>
  );
}
