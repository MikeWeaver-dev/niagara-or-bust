import { useEffect, useRef } from 'react';
import { subscribe, fitCanvas } from './ticker.js';
import { drawUpright, drawSalmonTop, GARY } from '../game/charArt.js';
import { drawCraftTop, kayakPaddle, canoePaddle } from '../game/vesselArt.js';
import { instrumentReady } from '../game/instrumentArt.js';
import { getCharacter } from '../data/characters.js';
import { getCraft, isFavorite } from '../data/crafts.js';

const POSE = {
  nothing: { pose: 'swim', cutY: -112 },
  lifejacket: { pose: 'dog', cutY: -96, lifejacket: true },
  surfboard: { pose: 'arms-out' },
  barrel: { pose: 'stand', cutY: -128 },
  kayak: { pose: 'hold', cutY: -92, kayak: true },
  canoe: { pose: 'hold', cutY: -92, canoe: true },
  hamster: { pose: 'run' },
  jetski: { pose: 'hold', cutY: -82, armL: 0.7, armR: 0.7, bendL: 1.4, bendR: 1.4 },
  goose: { pose: 'hold', cutY: -86, expr: 'cool' },
  keyboard: { pose: 'arms-out' },
  guitar: { pose: 'hold', cutY: -92, armL: 1.15, bendL: 0.9, armR: 0.8, bendR: 1.2 },
  bass: { pose: 'hold', cutY: -92, armL: 1.15, bendL: 0.9, armR: 0.8, bendR: 1.2 },
  trumpet: { pose: 'hold', cutY: -82, armL: 0.7, armR: 0.7, bendL: 1.4, bendR: 1.4 },
  mic: { pose: 'hold', cutY: -82, armL: 0.7, armR: 0.7, bendL: 1.4, bendR: 1.4 },
  drums: { pose: 'hold', cutY: -100, bendL: 1.1, bendR: 1.1 },
};
const SCALE = { nothing: 1.7, lifejacket: 1.9, barrel: 2.3, surfboard: 3.3, hamster: 2.6, jetski: 3.2, canoe: 4.4, kayak: 3.8, goose: 3.6, keyboard: 3.4, guitar: 4.0, bass: 4.4, trumpet: 3.9, drums: 3.0, mic: 3.6 };
const LIFT = { goose: 0.66, nothing: 0.72, lifejacket: 0.72, barrel: 0.55, surfboard: 0.62, keyboard: 0.66, guitar: 0.52, bass: 0.52, trumpet: 0.56, drums: 0.5, mic: 0.52 };

// Little animated canvas showing a character, or a vessel with the selected character in it.
export default function ItemPreview({ kind, id, characterId = 'annie', active = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const seed = Math.random() * 10;
    let drawnOnce = false;
    return subscribe((now) => {
      if (!active && drawnOnce) return;
      // still cards draw once, but not until their instrument art has loaded
      drawnOnce = kind !== 'craft' || instrumentReady(id);
      const { w, h, dpr } = fitCanvas(c, 2);
      const t = now + seed;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (kind === 'character') {
        const ch = getCharacter(id);
        const S = ch.kind === 'giraffe' ? h / 3.5 : h / 2.25;
        ctx.save();
        ctx.translate(ch.kind === 'giraffe' ? w / 2 - S * 0.25 : w / 2, h * 0.93);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 0, S * 0.45, S * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        drawUpright(ctx, ch, S, { pose: Math.sin(t * 0.7) > 0.6 ? 'wave' : 'stand', expr: 'happy', t });
        ctx.restore();
      } else if (id === 'salmon') {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI / 2);
        drawSalmonTop(ctx, h / 1.8, t);
        ctx.restore();
      } else {
        const ch = getCharacter(characterId);
        const p = POSE[id] || { pose: 'stand' };
        const S = h / (SCALE[id] || 3);
        const occS = S * 0.95;
        const occupant = (cx) => {
          if (p.cutY) cx.translate(0, (-p.cutY * occS) / 100);
          const drum = id === 'drums' ? Math.sin(t * 14) * 0.4 : 0;
          const strum = id === 'guitar' || id === 'bass' ? Math.sin(t * 10) * 0.3 : 0;
          const fav = isFavorite(getCraft(id), ch);
          drawUpright(cx, ch, occS, { ...p, ...(drum ? { armL: 0.95 + drum, armR: 0.95 - drum } : {}), ...(strum ? { armR: 0.8 + strum } : {}), expr: p.expr || (fav ? 'happy' : 'determined'), t, holding: p.kayak ? kayakPaddle(t) : p.canoe ? canoePaddle(t, 1) : undefined });
        };
        const passenger = id === 'canoe' ? (cx) => {
          cx.translate(0, (92 * occS) / 100);
          drawUpright(cx, GARY, occS, { pose: 'hold', cutY: -92, expr: 'happy', t: t + 0.7, holding: canoePaddle(t + 0.7, -1) });
        } : null;
        ctx.save();
        ctx.translate(w / 2, h * (LIFT[id] || 0.6));
        drawCraftTop(ctx, id, S, { t, occupant, passenger });
        ctx.restore();
      }
    });
  }, [kind, id, characterId, active]);
  return <canvas ref={ref} className="preview" aria-hidden="true" />;
}
