import ItemPreview from './ItemPreview.jsx';
import { Pips } from './common.jsx';
import { useSave, priceOf, isOwned, lockReason, buy, select } from '../store.js';
import { audio } from '../audio/audio.js';

// A character or vessel card with preview, stats, and buy / select buttons.
export default function ItemCard({ kind, item, compact = false, onToast, onPick }) {
  const save = useSave();
  const owned = isOwned(kind, item.id, save);
  const selected = save.selected[kind] === item.id;
  const reason = lockReason(kind, item.id, save);
  const price = priceOf(item, save);
  const canAfford = save.lumens >= price;
  const tryAll = save.cheats.tryAll;
  const usable = owned || tryAll;

  const doBuy = (e) => {
    e.stopPropagation();
    if (buy(kind, item.id)) {
      audio.buy();
      onToast && onToast(`Unlocked ${item.name}!`);
    } else {
      audio.denied();
      onToast && onToast(reason || `Need ${price - save.lumens} more lumens`);
    }
  };
  const doSelect = (e) => {
    if (e) e.stopPropagation();
    if (select(kind, item.id)) {
      audio.click();
      onPick && onPick();
    } else {
      audio.denied();
      onToast && onToast(reason || `Locked: ${price} lumens`);
    }
  };

  const chance = kind === 'craft' ? Math.round(item.base * 100) : null;
  return (
    <div className={`card ${selected ? 'selected' : ''} ${!owned ? 'locked' : ''}`} onClick={compact ? () => (usable ? doSelect() : null) : undefined} role={compact ? 'button' : undefined}>
      <ItemPreview kind={kind} id={item.id} characterId={save.selected.character} active={!compact || selected} />
      {selected ? <span className="badge sel">SELECTED</span> : owned ? <span className="badge">OWNED</span> : <span className="badge lock">🔒 {price}</span>}
      <div className="name">{item.name}</div>
      {kind === 'character' ? <div className="sub">{item.title}</div> : null}
      {!compact && <div className="desc">{kind === 'character' ? item.bio : item.desc}</div>}
      {kind === 'craft' && (
        <>
          <div className="chance">
            <span>BASE SURVIVAL</span>
            <b style={{ color: chance >= 100 ? '#d4a000' : chance >= 35 ? '#22a35e' : chance >= 22 ? '#c98a00' : '#d83a3a' }}>{chance}%</b>
          </div>
          {!compact && (
            <>
              <div className="stats">
                <span>Speed</span>
                <Pips n={item.stats.speed} />
                <span>Steering</span>
                <Pips n={item.stats.steer} />
                <span>Toughness</span>
                <Pips n={item.stats.tough} />
              </div>
              <div className="ability">
                <strong>{item.ability.name}:</strong> {item.ability.desc}
              </div>
              <div className="ability" style={{ background: '#e6fff3', borderColor: '#19c3a8' }}>
                <strong style={{ color: '#0e8f7b' }}>THE DROP:</strong> {item.dropTip}
              </div>
            </>
          )}
        </>
      )}
      {!owned && reason && <div className="why">{reason}</div>}
      <div className="actions">
        {!owned && (
          <button className="btn small teal" disabled={!!reason || !canAfford} onClick={doBuy}>
            BUY {price}
          </button>
        )}
        {usable && !selected && (
          <button className="btn small" onClick={doSelect}>
            {owned ? 'SELECT' : 'TRY (CHEAT)'}
          </button>
        )}
        {selected && (
          <button className="btn small gray" disabled>
            ✓ READY
          </button>
        )}
      </div>
    </div>
  );
}
