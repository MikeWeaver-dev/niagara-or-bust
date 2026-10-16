import { useEffect, useRef } from 'react';
import { subscribe, fitCanvas } from './ticker.js';
import * as art from '../game/dropArt.js';
import { POOL_Y } from '../game/dropArt.js';
import { FX } from '../game/fx.js';
import { drawCraftSide } from '../game/vesselArt.js';
import { drawHead } from '../game/charArt.js';
import { CHARACTERS } from '../data/characters.js';
import { rand, pick } from '../game/util.js';

// Animated Horseshoe Falls scene behind the menus, with things going over the edge.
export default function MenuBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    const fx = new FX('side');
    const rocks = [art.makeRock(2, POOL_Y - 0.4, 1.6, 3), art.makeRock(5.5, POOL_Y - 0.2, 1.3, 9), art.makeRock(9, POOL_Y - 0.1, 1.1, 17)];
    let t = 0;
    let thing = null;
    let next = 1.2;
    const spawn = () => {
      thing = { kind: pick(['barrel', 'barrel', 'kayak', 'hamster', 'jetski', 'goose']), ch: pick(CHARACTERS), x: -6, y: -0.2, vx: rand(6, 10), vy: 0, rot: 0, vr: rand(-3, 3), tumbling: false };
    };
    const unsub = subscribe((_, dt) => {
      const { w, h, dpr } = fitCanvas(c, 1.5);
      t += dt;
      // scene camera: frame the whole drop
      const S = Math.min(h / 62, w / 26);
      const camX = w > h ? 10 : 6;
      const camY = POOL_Y * 0.52;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const view = { ctx, W: w, H: h, S: S * 2.2, camX, camY: camY * 0.6, t, disco: false };
      art.drawSky(view);
      art.drawSkyline(view);
      art.drawFarFalls(view);
      art.drawRainbow(view);
      const lw = 1.6 / S;
      const proj = (x, y) => ({ x: w / 2 + (x - camX) * S, y: h / 2 + (y - camY) * S, s: S });
      ctx.save();
      ctx.translate(w / 2 - camX * S, h / 2 - camY * S);
      ctx.scale(S, S);
      art.drawUpstream(ctx, t, lw, false);
      art.drawCliff(ctx, t, lw);
      art.drawSheet(ctx, t, lw, false);
      art.drawPoolBack(ctx, t, -20, 60);
      art.drawBoat(ctx, 24 + Math.sin(t * 0.15) * 3, t, lw, false);
      art.drawRocks(ctx, rocks, lw);
      // something going over
      next -= dt;
      if (!thing && next <= 0) spawn();
      if (thing) {
        const o = thing;
        if (o.x < 0) {
          o.x += o.vx * dt;
        } else {
          o.vy += 22 * dt;
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          o.rot += o.vr * dt;
        }
        ctx.save();
        ctx.translate(o.x, o.y - (o.kind === 'goose' ? 0.4 : 0.2));
        ctx.rotate(o.kind === 'goose' ? Math.sin(t * 3) * 0.1 : o.rot);
        const sc = 1.4;
        ctx.scale(sc, sc);
        if (o.kind === 'hamster') {
          ctx.fillStyle = 'rgba(190,235,255,0.35)';
          ctx.strokeStyle = 'rgba(30,70,100,0.9)';
          ctx.lineWidth = lw * 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 0.95, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          drawHead(ctx, o.ch, 0.3, { expr: 'scream', t, view: 'front', lw });
        } else {
          drawCraftSide(ctx, o.kind, lw, { t, flap: 1 });
          if (o.kind !== 'barrel') {
            ctx.save();
            ctx.translate(o.kind === 'goose' ? -0.1 : -0.2, o.kind === 'goose' ? -0.85 : -0.5);
            drawHead(ctx, o.ch, 0.24, { expr: o.kind === 'goose' ? 'cool' : 'scream', t, view: 'front', lw });
            ctx.restore();
          } else {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, 0.19, 0, Math.PI * 2);
            ctx.clip();
            ctx.rotate(-o.rot);
            drawHead(ctx, o.ch, 0.17, { expr: 'scream', t, view: 'front', lw });
            ctx.restore();
          }
        }
        ctx.restore();
        if (o.y > POOL_Y) {
          fx.splash(o.x, POOL_Y, 1.4);
          thing = null;
          next = rand(1.5, 3.5);
        }
      }
      ctx.restore();
      fx.update(dt);
      fx.render(ctx, proj);
      ctx.save();
      ctx.translate(w / 2 - camX * S, h / 2 - camY * S);
      ctx.scale(S, S);
      art.drawPoolFront(ctx, t, -20, 60, lw, false);
      art.drawMistPuffs(ctx, t, camX, camY, 0.9);
      ctx.restore();
    });
    return unsub;
  }, []);
  return (
    <>
      <canvas ref={ref} className="menu-bg" aria-hidden="true" />
      <div className="menu-scrim" />
    </>
  );
}
