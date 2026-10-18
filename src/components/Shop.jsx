import { useEffect, useState } from 'react';
import MenuBackground from './MenuBackground.jsx';
import ItemCard from './ItemCard.jsx';
import { TopBar, useToast, GoButton } from './common.jsx';
import { CHARACTERS } from '../data/characters.js';
import { CRAFTS } from '../data/crafts.js';
import { useSave, lumenMultiplier } from '../store.js';
import { music } from '../audio/music.js';
import { audio } from '../audio/audio.js';

export default function Shop() {
  const [tab, setTab] = useState('craft');
  const [toast, show] = useToast();
  const owned = useSave((s) => s.owned);
  const economy = useSave((s) => s.settings.economy);
  useEffect(() => {
    music.play('shop');
  }, []);
  const mult = lumenMultiplier({ owned });
  return (
    <>
      <MenuBackground />
      <div className="screen">
        <div className="wrap">
          <TopBar title="GIFT SHOP" />
          <div className="tabs">
            <button className={`tab ${tab === 'craft' ? 'on' : ''}`} onClick={() => { audio.click(); setTab('craft'); }}>
              VESSELS
            </button>
            <button className={`tab ${tab === 'character' ? 'on' : ''}`} onClick={() => { audio.click(); setTab('character'); }}>
              CHARACTERS
            </button>
          </div>
          <div className="panel" style={{ marginBottom: 16, textAlign: 'center', padding: 12 }}>
            <b>Every unlock boosts your lumen earnings by +15%</b> (now x{mult.toFixed(2)}). Classic vessels unlock in order; band instruments can be bought any time. A Kids Table member riding their own instrument gets <b>+15% survival</b>. The Golden Goose needs everything else first.
            {economy === 'test' && <div style={{ fontSize: 12, marginTop: 4, color: '#6b2fd6' }}>ECONOMY PRICES: everything is super cheap (change in Settings)</div>}
          </div>
          {[false, true].map((band) => (
            <div key={band ? 'band' : 'classic'}>
              {band && <div className="picker-title shop-section">🎸 {tab === 'craft' ? 'KIDS TABLE INSTRUMENTS' : 'KIDS TABLE (THE BAND)'}</div>}
              <div className="grid">
                {(tab === 'craft' ? CRAFTS : CHARACTERS)
                  .filter((item) => !!item.band === band)
                  .map((item) => (
                    <ItemCard key={item.id} kind={tab} item={item} onToast={show} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="go-float">
        <GoButton />
      </div>
      {toast}
    </>
  );
}
