// River phase scenery: water, banks, the brink, the mist beyond, obstacles and props.
// `v` (view) = { ctx, W, H, S, sx(x), sy(d,z), dMin, dMax, t, disco, salmon }
import { TAU, shade, hsl, rng, clamp, roundRect } from './util.js';
import { RW, brinkAt } from './odds.js';
import { OUTLINE, drawUpright, drawCat } from './charArt.js';
import { RAINBOW } from '../data/characters.js';
import { puff } from './dropArt.js';

const GRASS = '#5cb848';
const GRASS_D = '#4a9e3a';
const PATH = '#d8cfc0';

// ---------------------------------------------------------------- beyond the brink
export function drawBeyond(v) {
  const { ctx, W, sx, sy, t } = v;
  const bc = brinkAt(0);
  const yTop = 0;
  const yBrink = sy(bc);
  if (yBrink < -50) return; // not visible yet
  // deep gorge + plunge pool far below
  const g = ctx.createLinearGradient(0, yBrink, 0, yTop);
  g.addColorStop(0, '#e9f7ff');
  g.addColorStop(0.15, '#a9dbe8');
  g.addColorStop(0.5, '#2c7f86');
  g.addColorStop(1, '#0d4650');
  ctx.fillStyle = g;
  ctx.fillRect(0, yTop, W, yBrink - yTop + 40);
  // foam rings on plunge pool
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.15 + i / 6) % 1;
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.beginPath();
    ctx.ellipse(sx(0), sy(bc + 20), (2 + k * 14) * v.S, (1 + k * 6) * v.S, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // Maid of the Mist far below
  drawTinyBoat(ctx, sx(4 + Math.sin(t * 0.2) * 2), sy(bc + 26), v.S * 0.5, t);
  // gorge walls (follow the horseshoe)
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const x = s * (RW * 0.6 + (i / 12) * RW * 0.6);
      pts.push([sx(x * 1.4), sy(brinkAt(x) + 1)]);
    }
    ctx.moveTo(sx(s * 60), sy(bc - 2));
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(sx(s * RW * 1.9), sy(bc + 60));
    ctx.lineTo(sx(s * 60), sy(bc + 60));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.4)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(sx(s * RW * 1.2), sy(bc + k * 4));
      ctx.lineTo(sx(s * 60), sy(bc + k * 4 + 2));
      ctx.stroke();
    }
  });
  // rising mist puffs
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.12 + i * 0.37) % 1;
    const x = Math.sin(i * 12.9) * RW * 1.1 + Math.sin(t * 0.3 + i) * 1.5;
    const d = bc + 2 + ph * 22;
    const r = (3.5 + (i % 4)) * v.S * (0.6 + ph * 0.8);
    puff(ctx, sx(x), sy(d), r, 0.8 * Math.sin(ph * Math.PI));
  }
  ctx.restore();
  // rainbow arc over the mist
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = Math.max(4, v.S * 0.45);
  RAINBOW.slice(0, 6).forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.ellipse(sx(0), sy(bc + 6), (RW * 1.1 - i * 0.45) * v.S, (RW * 0.9 - i * 0.45) * v.S, 0, Math.PI, TAU);
    ctx.stroke();
  });
  ctx.restore();
}

function drawTinyBoat(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3 * s, 0);
  ctx.lineTo(3 * s, 0);
  ctx.lineTo(2.4 * s, 1.2 * s);
  ctx.lineTo(-2.6 * s, 1.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2456b8';
  ctx.fillRect(-2 * s, -1 * s, 3.6 * s, 1 * s);
  ctx.fillStyle = '#ff3b5c';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(-1.8 * s + i * 0.65 * s, -1.2 * s, 0.25 * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- water
export function drawWater(v, opt) {
  const { ctx, sx, sy, t, dMin, dMax, S, disco } = v;
  const top = opt.salmon ? dMax : Math.min(dMax, brinkAt(RW) + 1);
  const bottom = opt.salmon ? dMin : Math.max(dMin, 0);
  if (top <= bottom) return;
  const xl = sx(-RW);
  const xr = sx(RW);
  // water polygon (top follows the horseshoe brink)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xl, sy(bottom));
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = -RW + (i / steps) * RW * 2;
    const d = opt.salmon ? top : Math.min(top, brinkAt(x));
    ctx.lineTo(sx(x), sy(d));
  }
  ctx.lineTo(xr, sy(bottom));
  ctx.closePath();
  const g = ctx.createLinearGradient(xl, 0, xr, 0);
  if (disco) {
    const h = (t * 90) % 360;
    g.addColorStop(0, hsl(h, 80, 45));
    g.addColorStop(0.5, hsl(h + 120, 85, 50));
    g.addColorStop(1, hsl(h + 240, 80, 45));
  } else {
    g.addColorStop(0, '#2563a8');
    g.addColorStop(0.2, '#2f86c9');
    g.addColorStop(0.42, '#1ba59b');
    g.addColorStop(0.5, '#16b39a');
    g.addColorStop(0.58, '#1ba59b');
    g.addColorStop(0.8, '#2f86c9');
    g.addColorStop(1, '#2563a8');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  // whitening toward the brink
  if (!opt.salmon) {
    const nb = sy(brinkAt(0) - 45);
    const wb = ctx.createLinearGradient(0, nb, 0, sy(brinkAt(0)));
    wb.addColorStop(0, 'rgba(255,255,255,0)');
    wb.addColorStop(1, 'rgba(230,250,255,0.45)');
    ctx.fillStyle = wb;
    ctx.fillRect(xl, sy(brinkAt(RW) + 2), xr - xl, nb - sy(brinkAt(RW) + 2));
  }

  // rapids zones: whitewater
  opt.rapids.forEach((z) => {
    if (z.d1 < dMin || z.d0 > dMax) return;
    const r = rng(z.seed);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(sx((z.x0 + z.x1) / 2), sy((z.d0 + z.d1) / 2), ((z.x1 - z.x0) / 2) * S, ((z.d1 - z.d0) / 2) * S, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 26; i++) {
      const x = z.x0 + r() * (z.x1 - z.x0);
      const d = z.d0 + ((r() * (z.d1 - z.d0) + t * 6) % (z.d1 - z.d0));
      const w = (0.3 + r() * 0.6) * S;
      ctx.beginPath();
      ctx.moveTo(sx(x) - w, sy(d));
      ctx.quadraticCurveTo(sx(x), sy(d) - w * 0.7, sx(x) + w, sy(d));
      ctx.quadraticCurveTo(sx(x), sy(d) - w * 0.3, sx(x) - w, sy(d));
      ctx.fill();
    }
  });

  // flow streaks (move downstream = up the screen)
  const cols = 16;
  ctx.lineCap = 'round';
  for (let i = 0; i < cols; i++) {
    const x0 = -RW + ((i + 0.5) / cols) * RW * 2;
    const spd = opt.flow(x0);
    const spacing = 3.2;
    const phase = (t * spd + i * 1.37) % spacing;
    const start = Math.floor(dMin / spacing) * spacing;
    for (let d = start; d < dMax; d += spacing) {
      const dd = d + phase;
      const near = opt.salmon ? 0 : clamp((dd - (brinkAt(0) - 60)) / 60, 0, 1);
      const len = (0.9 + near * 1.8) * S;
      const wob = Math.sin(dd * 0.7 + i) * 0.35;
      const x = x0 + wob + ((i * 7 + Math.floor(d)) % 5) * 0.12;
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + near * 0.25})`;
      ctx.lineWidth = Math.max(1.5, S * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx(x), sy(dd));
      ctx.quadraticCurveTo(sx(x + 0.15), sy(dd) - len * 0.5, sx(x), sy(dd) - len);
      ctx.stroke();
    }
  }
  // sparkles
  const r = rng(77);
  for (let i = 0; i < 40; i++) {
    const x = -RW + r() * RW * 2;
    const dd = dMin + ((r() * (dMax - dMin) + t * 2.5) % (dMax - dMin));
    const tw = Math.sin(t * 5 + i * 2.1);
    if (tw < 0.4) continue;
    ctx.fillStyle = `rgba(255,255,255,${(tw - 0.4) * 1.2})`;
    const s = S * 0.12;
    ctx.beginPath();
    ctx.moveTo(sx(x), sy(dd) - s);
    ctx.lineTo(sx(x) + s * 0.4, sy(dd));
    ctx.lineTo(sx(x), sy(dd) + s);
    ctx.lineTo(sx(x) - s * 0.4, sy(dd));
    ctx.fill();
  }
  ctx.restore();

  // edge foam along the walls
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(2, S * 0.18);
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    for (let d = bottom; d <= top; d += 1) {
      const lim = opt.salmon ? top : brinkAt(s * RW);
      if (d > lim) break;
      const x = s * (RW - 0.25 - Math.abs(Math.sin(d * 1.3 + t * 3)) * 0.2);
      if (d === bottom) ctx.moveTo(sx(x), sy(d));
      else ctx.lineTo(sx(x), sy(d));
    }
    ctx.stroke();
  });

  // brink lip: bright foam band + falling curtain
  if (!opt.salmon && sy(brinkAt(RW)) > -40) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i <= 40; i++) {
      const x = -RW + (i / 40) * RW * 2;
      const d = brinkAt(x);
      const y = sy(d);
      const wob = Math.sin(t * 9 + i * 1.7) * S * 0.12;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(sx(x), y + wob, S * 0.35, 0, TAU);
      ctx.fill();
      // curtain streaks falling away
      const len = (2 + Math.sin(i * 3.1) * 0.7) * S;
      const gg = ctx.createLinearGradient(0, y, 0, y - len);
      gg.addColorStop(0, 'rgba(240,255,255,0.9)');
      gg.addColorStop(1, 'rgba(140,210,220,0)');
      ctx.strokeStyle = gg;
      ctx.lineWidth = S * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx(x), y);
      ctx.lineTo(sx(x * 1.03), y - len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- banks & props
export function makeProps(chunk, salmon) {
  const r = rng(chunk * 7919 + 13);
  const props = [];
  const d0 = chunk * 16;
  [-1, 1].forEach((s) => {
    const nT = s < 0 ? 2 : 3;
    for (let i = 0; i < nT; i++) props.push({ type: 'tree', x: s * (RW + 5.6 + r() * 6), d: d0 + r() * 16, size: 0.8 + r() * 0.6, hue: r() });
    props.push({ type: 'lamp', x: s * (RW + 1.6), d: d0 + 8 });
    const nP = s < 0 ? Math.floor(r() * 3.2) : Math.floor(r() * 1.8);
    for (let i = 0; i < nP; i++) {
      props.push({ type: 'tourist', x: s * (RW + 2.6 + r() * 2.4), d: d0 + r() * 16, seed: Math.floor(r() * 1e6), camera: r() < 0.4 });
    }
    if (r() < 0.25) props.push({ type: 'bench', x: s * (RW + 5.2), d: d0 + r() * 16 });
    if (r() < 0.45) props.push({ type: 'flowers', x: s * (RW + 5.2 + r() * 2.5), d: d0 + r() * 16, hue: r() });
    if (r() < 0.22 && !salmon) props.push({ type: 'sign', x: s * (RW + 1.4), d: d0 + r() * 16, text: SIGNS[Math.floor(r() * SIGNS.length)] });
  });
  return props;
}
const SIGNS = ['NO SWIMMING', 'FALLS AHEAD!', 'SERIOUSLY. STOP.', 'TURN BACK', 'LAST CHANCE: HOT DOGS', 'YOU WILL DIE', 'GIFT SHOP →', 'NIAGARA PARKS'];

export function drawBankGround(v, salmon) {
  const { ctx, W, H, sx, sy, S, t } = v;
  const limit = salmon ? v.dMax + 10 : brinkAt(RW) + 1;
  const yLim = Math.max(0, sy(Math.min(limit, v.dMax + 2)));
  const xl = sx(-RW);
  const xr = sx(RW);
  // mowing stripes on the lawns outside the river
  ctx.fillStyle = GRASS_D;
  const sp = 3;
  const start = Math.floor(v.dMin / sp) * sp;
  for (let d = start; d < Math.min(v.dMax, limit); d += sp * 2) {
    const y0 = Math.max(yLim, sy(d + sp));
    const y1 = sy(d);
    if (y1 <= y0) continue;
    if (xl > 0) ctx.fillRect(0, y0, xl, y1 - y0);
    if (xr < W) ctx.fillRect(xr, y0, W - xr, y1 - y0);
  }
  // footpaths along each bank
  [-1, 1].forEach((s) => {
    const x0 = sx(s * (RW + 1.0));
    const x1 = sx(s * (RW + 4.3));
    ctx.fillStyle = PATH;
    ctx.fillRect(Math.min(x0, x1), yLim, Math.abs(x1 - x0), H - yLim);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let d = Math.floor(v.dMin); d < Math.min(v.dMax, limit); d += 1.5) ctx.fillRect(Math.min(x0, x1), sy(d), Math.abs(x1 - x0), 1.5);
  });
  // stone retaining walls + railing (only where there is river beside them)
  [-1, 1].forEach((s) => {
    const xa = sx(s * RW);
    const xb = sx(s * (RW + 0.9));
    const lim = salmon ? v.dMax : brinkAt(s * RW) + 0.5;
    const yTop = sy(Math.min(v.dMax, lim));
    const yBot = salmon ? H : Math.min(H, sy(0));
    if (yBot <= yTop) return;
    ctx.fillStyle = '#9a9488';
    ctx.fillRect(Math.min(xa, xb), yTop, Math.abs(xb - xa), yBot - yTop);
    ctx.strokeStyle = 'rgba(40,35,30,0.45)';
    ctx.lineWidth = 1.5;
    for (let d = Math.max(salmon ? -1e9 : 0, Math.floor(v.dMin)); d < Math.min(v.dMax, lim); d += 1) {
      const y = sy(d);
      ctx.beginPath();
      ctx.moveTo(Math.min(xa, xb), y);
      ctx.lineTo(Math.max(xa, xb), y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = Math.max(1.5, S * 0.07);
    const rx = sx(s * (RW + 0.85));
    ctx.beginPath();
    ctx.moveTo(rx, yTop);
    ctx.lineTo(rx, yBot);
    ctx.moveTo(rx - s * S * 0.25, yTop);
    ctx.lineTo(rx - s * S * 0.25, yBot);
    ctx.stroke();
    for (let d = Math.max(salmon ? -1e9 : 0, Math.floor(v.dMin)); d < Math.min(v.dMax, lim); d += 1.2) {
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(rx - s * S * 0.25 - 2, sy(d) - S * 0.3, 4 + S * 0.25, S * 0.12);
    }
  });
  if (!salmon) drawTableRock(v);
  return t;
}

function drawTableRock(v) {
  const { ctx, sx, sy, S } = v;
  const d = brinkAt(RW) - 6;
  if (sy(d) > v.H + 200 || sy(d + 20) < -300) return;
  // viewing terraces on each side of the falls
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#bdb3a0';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    roundRect(ctx, Math.min(sx(s * (RW + 0.9)), sx(s * (RW + 9))), sy(d + 14), Math.abs(sx(s * (RW + 9)) - sx(s * (RW + 0.9))), 14 * S, 6);
    ctx.fill();
    ctx.stroke();
  });
}

export function drawProp(v, p, playerD) {
  const { ctx, sx, sy, S, t } = v;
  const x = sx(p.x);
  const y = sy(p.d);
  switch (p.type) {
    case 'tree': {
      const s = S * p.size;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.4, y + s * 0.2, s * 1.6, s * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(x - s * 0.18, y - s * 1.2, s * 0.36, s * 1.2);
      const greens = p.hue < 0.33 ? ['#2f7a2f', '#3e9a3a', '#5cc24e'] : p.hue < 0.66 ? ['#2a6e3a', '#38915a', '#5ab872'] : ['#4a7a1f', '#6a9e2a', '#9acb3e'];
      const sway = Math.sin(t * 1.3 + p.x) * s * 0.05;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1.5, S * 0.05);
      [[0, -2.0, 1.2, 0], [-0.7, -1.6, 0.9, 1], [0.7, -1.6, 0.9, 1], [0.1, -2.6, 0.85, 2]].forEach(([ox, oy, r, ci]) => {
        ctx.fillStyle = greens[ci];
        ctx.beginPath();
        ctx.arc(x + ox * s + sway, y + oy * s, r * s, 0, TAU);
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(x - s * 0.3 + sway, y - s * 2.5, s * 0.4, 0, TAU);
      ctx.fill();
      break;
    }
    case 'lamp': {
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = Math.max(2, S * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - S * 2.2);
      ctx.stroke();
      ctx.fillStyle = '#fff3b0';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - S * 2.3, S * 0.25, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'bench': {
      ctx.fillStyle = '#8b5a2b';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - S * 0.9, y - S * 0.5, S * 1.8, S * 0.25);
      ctx.strokeRect(x - S * 0.9, y - S * 0.5, S * 1.8, S * 0.25);
      ctx.fillRect(x - S * 0.9, y - S * 0.9, S * 1.8, S * 0.2);
      ctx.strokeRect(x - S * 0.9, y - S * 0.9, S * 1.8, S * 0.2);
      break;
    }
    case 'flowers': {
      for (let i = 0; i < 9; i++) {
        const fx = x + Math.cos(i * 2.4) * S * 0.8;
        const fy = y + Math.sin(i * 2.4) * S * 0.35;
        ctx.fillStyle = RAINBOW[(i + Math.floor(p.hue * 7)) % 7];
        ctx.beginPath();
        ctx.arc(fx, fy, S * 0.16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff6b0';
        ctx.beginPath();
        ctx.arc(fx, fy, S * 0.06, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'sign': {
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(x - 2, y - S * 1.6, 4, S * 1.6);
      ctx.font = `${Math.max(9, S * 0.32)}px "Luckiest Guy", sans-serif`;
      const w = ctx.measureText(p.text).width + S * 0.4;
      ctx.fillStyle = '#ffd23b';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      roundRect(ctx, x - w / 2, y - S * 2.3, w, S * 0.75, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a1030';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, x, y - S * 1.92);
      break;
    }
    case 'tourist': {
      drawTourist(ctx, x, y, S * 0.75, t, p.seed, Math.abs(playerD - p.d) < 12, p.camera);
      break;
    }
    default:
      break;
  }
}

const TOURIST_SHIRTS = ['#ff4f7b', '#2bb6ff', '#ffd23b', '#46d66b', '#ff8a2b', '#8b5cff', '#ffffff', '#e8203a'];
const SKINS = ['#f2c9a5', '#e0a37a', '#b87a4f', '#8a5634', '#f5d6bd', '#6b3f22'];
const touristCache = new Map();
function touristChar(seed) {
  if (touristCache.has(seed)) return touristCache.get(seed);
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ch = {
    id: 'tourist',
    kind: 'human',
    scale: 0.85 + r() * 0.3,
    headScale: 1,
    hat: r() < 0.35 ? 'cap' : 'none',
    extras: r() < 0.3 ? ['sunglasses'] : [],
    colors: { skin: pick(SKINS), hair: pick(['#2a1a10', '#6b4423', '#d9b45a', '#9a9a9a', '#1a1a1a']), shirt: pick(TOURIST_SHIRTS), shirt2: '#fff', collar: '#fff', pants: pick(['#2b3a67', '#3a3a40', '#c8b48a', '#5a6a8a']), shoes: '#222', hat: pick(TOURIST_SHIRTS), hatBand: '#fff', accent: '#fff' },
    poncho: r() < 0.35,
  };
  touristCache.set(seed, ch);
  return ch;
}

export function drawTourist(ctx, x, y, S, t, seed, excited, camera) {
  const ch = touristChar(seed);
  ctx.save();
  ctx.translate(x, y);
  const pose = excited ? ((seed % 3) === 0 ? 'cheer' : 'wave') : 'stand';
  drawUpright(ctx, ch, S, { pose, expr: excited ? ((seed % 2) ? 'terrified' : 'happy') : 'happy', t: t + seed });
  if (camera && excited && Math.sin(t * 3 + seed) > 0.97) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, -S * 1.3, S * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- launch beach
export function drawBeach(v, opts) {
  const { ctx, W, sx, sy, S, t } = v;
  const y0 = sy(0);
  const y1 = sy(-1.3);
  if (y1 < -50) return;
  // pebbly shore
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#e8d7a8');
  g.addColorStop(1, '#d6c08a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sx(-RW - 1), y1);
  ctx.lineTo(sx(RW + 1), y1);
  ctx.lineTo(sx(RW + 1), y0);
  for (let i = 40; i >= 0; i--) {
    const x = -RW - 1 + (i / 40) * (RW * 2 + 2);
    ctx.lineTo(sx(x), y0 + Math.sin(x * 2 + t * 2) * S * 0.08);
  }
  ctx.closePath();
  ctx.fill();
  // pebbles
  const r = rng(5);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = ['#b8a27a', '#9a8a6a', '#cbb894', '#8a7a5a'][i % 4];
    ctx.beginPath();
    ctx.ellipse(sx(-RW + r() * RW * 2), sy(-r() * 1.2), S * 0.08, S * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // lapping waves at the shoreline
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(2, S * 0.1);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = -RW + (i / 40) * RW * 2;
    const yy = y0 - S * (0.15 + Math.sin(t * 2.2 + x * 1.5) * 0.08);
    if (i === 0) ctx.moveTo(sx(x), yy);
    else ctx.lineTo(sx(x), yy);
  }
  ctx.stroke();
  // big "LAUNCH" sign + hot dog cart
  drawHotDogCart(ctx, sx(-RW + 1.8), sy(-4.2), S, t);
  const sxp = sx(RW - 2.2);
  const syp = sy(-3.4);
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(sxp - S * 0.08, syp - S * 1.8, S * 0.16, S * 1.8);
  ctx.fillStyle = '#ffd23b';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  roundRect(ctx, sxp - S * 1.7, syp - S * 2.9, S * 3.4, S * 1.25, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c40020';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(9, S * 0.36)}px "Luckiest Guy", sans-serif`;
  ctx.fillText('⚠ DANGER ⚠', sxp, syp - S * 2.5);
  ctx.fillStyle = '#1a1030';
  ctx.font = `${Math.max(8, S * 0.26)}px "Luckiest Guy", sans-serif`;
  ctx.fillText('FALLS AHEAD. NO SWIMMING.', sxp, syp - S * 2.05);
  // the orange peel (Bobby beware)
  if (opts.peel && !opts.peel.used) {
    const px = sx(opts.peel.x);
    const py = sy(-2.7);
    ctx.fillStyle = '#ff9a1f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((i / 4) * TAU + 0.3);
      ctx.beginPath();
      ctx.ellipse(S * 0.18, 0, S * 0.2, S * 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  if (opts.cat) {
    ctx.save();
    ctx.translate(sx(opts.cat.x), sy(-0.9));
    drawCat(ctx, S * 0.9, t);
    ctx.restore();
  }
  return W;
}

function drawHotDogCart(ctx, x, y, S, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  // umbrella
  const cols = ['#ff3b5c', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % 2];
    ctx.beginPath();
    ctx.moveTo(0, -S * 2.6);
    ctx.arc(0, -S * 2.6, S * 1.3, Math.PI + (i / 8) * Math.PI, Math.PI + ((i + 1) / 8) * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ccc';
  ctx.fillRect(-S * 0.04, -S * 2.6, S * 0.08, S * 1.5);
  ctx.fillStyle = '#e8e8f0';
  roundRect(ctx, -S * 1.1, -S * 1.2, S * 2.2, S * 1.0, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3b5c';
  ctx.fillRect(-S * 1.1, -S * 0.75, S * 2.2, S * 0.18);
  ctx.font = `${Math.max(8, S * 0.28)}px "Luckiest Guy", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1030';
  ctx.fillText('HOT DOGS', 0, -S * 0.95);
  ctx.fillStyle = '#333';
  [-0.7, 0.7].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(wx * S, -S * 0.1, S * 0.22, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
  return t;
}

// ---------------------------------------------------------------- obstacles
export function drawRock(v, o) {
  const { ctx, sx, sy, S, t } = v;
  const x = sx(o.x);
  const y = sy(o.d);
  const r = o.r * S;
  const h = r * 0.55;
  // foam ring (upstream side = bottom of screen)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r * 1.25 + Math.sin(t * 6 + o.x) * 2, r * 0.75, 0, 0, TAU);
  ctx.fill();
  // wake behind (upward)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = Math.max(1.5, S * 0.08);
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(x + s * r * 0.8, y - r * 0.2);
    ctx.quadraticCurveTo(x + s * r * 1.2, y - r * 1.5, x + s * r * 0.6, y - r * 2.6);
    ctx.stroke();
  });
  // body
  const verts = o.verts;
  ctx.fillStyle = o.color || '#6e6a66';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, S * 0.06);
  ctx.beginPath();
  verts.forEach((k, i) => {
    const a = (i / verts.length) * TAU;
    ctx.lineTo(x + Math.cos(a) * r * k, y - h * 0.4 + Math.sin(a) * r * k * 0.75);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // top facet
  ctx.fillStyle = shade(o.color || '#6e6a66', 0.22);
  ctx.beginPath();
  verts.forEach((k, i) => {
    const a = (i / verts.length) * TAU;
    ctx.lineTo(x + Math.cos(a) * r * k * 0.7, y - h + Math.sin(a) * r * k * 0.5);
  });
  ctx.closePath();
  ctx.fill();
  // highlight + moss
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - h - r * 0.12, r * 0.25, r * 0.1, -0.3, 0, TAU);
  ctx.fill();
  if (o.moss) {
    ctx.fillStyle = 'rgba(80,160,60,0.75)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, y - h * 0.4 + r * 0.35, r * 0.35, r * 0.14, 0.2, 0, TAU);
    ctx.fill();
  }
  // blood decals from previous hits
  if (o.blood) {
    ctx.fillStyle = o.blood === 'rainbow' ? 'rgba(255,90,214,0.8)' : 'rgba(170,0,20,0.85)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.1, y - h * 0.8, r * 0.4, r * 0.2, 0.4, 0, TAU);
    ctx.fill();
  }
}

export function drawLog(v, o) {
  const { ctx, sx, sy, S } = v;
  const x = sx(o.x);
  const y = sy(o.d);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-o.a);
  const L = o.len * S;
  const R = o.r * S;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, R * 0.3, L * 0.6, R * 1.6, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, '#a0703c');
  g.addColorStop(0.5, '#7a5028');
  g.addColorStop(1, '#4a2e14');
  ctx.fillStyle = g;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, S * 0.06);
  roundRect(ctx, -L / 2, -R, L, R * 2, R);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,20,5,0.5)';
  ctx.lineWidth = Math.max(1, S * 0.04);
  for (let i = 0; i < 5; i++) {
    const xx = -L / 2 + R + (i / 5) * (L - 2 * R);
    ctx.beginPath();
    ctx.moveTo(xx, -R * 0.6);
    ctx.lineTo(xx + R * 0.8, -R * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#d9b07a';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, S * 0.05);
  ctx.beginPath();
  ctx.ellipse(L / 2 - R * 0.3, 0, R * 0.45, R * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,70,30,0.7)';
  ctx.beginPath();
  ctx.ellipse(L / 2 - R * 0.3, 0, R * 0.22, R * 0.45, 0, 0, TAU);
  ctx.stroke();
  // branch stub
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = R * 0.5;
  ctx.beginPath();
  ctx.moveTo(-L * 0.1, -R * 0.6);
  ctx.lineTo(-L * 0.18, -R * 1.6);
  ctx.stroke();
  ctx.strokeStyle = '#7a5028';
  ctx.lineWidth = R * 0.3;
  ctx.stroke();
  ctx.restore();
}

export function drawWhirl(v, o) {
  const { ctx, sx, sy, S, t } = v;
  const x = sx(o.x);
  const y = sy(o.d);
  const R = o.r * S;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.7);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, 'rgba(5,30,50,0.85)');
  g.addColorStop(0.6, 'rgba(20,80,120,0.35)');
  g.addColorStop(1, 'rgba(20,80,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(1.5, S * 0.08);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let a = 0; a < 5; a += 0.15) {
      const rr = R * (1 - a / 5.5);
      const ang = a * 1.4 + t * 4 + (k * TAU) / 4;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDebris(v, o) {
  const { ctx, sx, sy, S, t } = v;
  const x = sx(o.x);
  const y = sy(o.d) + Math.sin(t * 2 + o.x) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot || 0);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, S * 0.05);
  const s = S;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.75, s * 0.35, 0, 0, TAU);
  ctx.fill();
  switch (o.kind) {
    case 'tire':
      ctx.fillStyle = '#1d1d22';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a6fb5';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.22, s * 0.14, 0, 0, TAU);
      ctx.fill();
      break;
    case 'duck':
      ctx.fillStyle = '#ffd23b';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.25, -s * 0.35, s * 0.24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff8a1f';
      ctx.beginPath();
      ctx.ellipse(s * 0.5, -s * 0.32, s * 0.14, s * 0.06, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.4, s * 0.04, 0, TAU);
      ctx.fill();
      break;
    case 'cone':
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.1);
      ctx.lineTo(0, -s * 0.6);
      ctx.lineTo(s * 0.3, s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-s * 0.16, -s * 0.28, s * 0.32, s * 0.1);
      break;
    case 'cart':
      ctx.strokeStyle = '#9aa0a8';
      ctx.lineWidth = Math.max(1.5, S * 0.05);
      ctx.strokeRect(-s * 0.45, -s * 0.5, s * 0.9, s * 0.55);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.45 + i * s * 0.22, -s * 0.5);
        ctx.lineTo(-s * 0.45 + i * s * 0.22, s * 0.05);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(s * 0.45, -s * 0.5);
      ctx.lineTo(s * 0.65, -s * 0.7);
      ctx.stroke();
      break;
    case 'flamingo':
      ctx.fillStyle = '#ff6fb5';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.45, s * 0.25, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.1);
      ctx.quadraticCurveTo(s * 0.6, -s * 0.6, s * 0.35, -s * 0.8);
      ctx.stroke();
      ctx.strokeStyle = '#ff6fb5';
      ctx.lineWidth = s * 0.09;
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#b8823e';
      ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.6);
      ctx.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.6);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.4);
      ctx.lineTo(s * 0.4, s * 0.2);
      ctx.moveTo(s * 0.4, -s * 0.4);
      ctx.lineTo(-s * 0.4, s * 0.2);
      ctx.stroke();
  }
  ctx.restore();
}

export function drawOrb(v, o) {
  const { ctx, sx, sy, S, t } = v;
  const bob = Math.sin(t * 4 + o.x * 3) * 0.12 + 0.35;
  const x = sx(o.x);
  const y = sy(o.d, bob);
  const r = (o.gold ? 0.42 : 0.28) * S;
  ctx.fillStyle = 'rgba(255,240,150,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, sy(o.d), r * 1.1, r * 0.45, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, o.gold ? 'rgba(255,215,60,0.9)' : 'rgba(255,255,200,0.9)');
  g.addColorStop(1, 'rgba(255,230,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = o.gold ? '#ffd23b' : '#fffbe0';
  ctx.strokeStyle = o.gold ? '#a07000' : '#d8b440';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + t * 2;
    const rr = i % 2 ? r * 0.55 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawSeagull(ctx, x, y, s, t) {
  const f = Math.sin(t * 12);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  [-1, 1].forEach((sd) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * s * 0.6, -s * 0.5 * f, sd * s * 1.3, -s * 0.2 * f);
    ctx.quadraticCurveTo(sd * s * 0.6, s * 0.1, 0, s * 0.05);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = '#ffb000';
  ctx.beginPath();
  ctx.moveTo(s * 0.5, 0);
  ctx.lineTo(s * 0.75, s * 0.05);
  ctx.lineTo(s * 0.5, s * 0.1);
  ctx.fill();
  ctx.restore();
}

export function drawDiscoLights(ctx, W, H, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = W / 2 + Math.sin(t * (0.7 + i * 0.3) + i) * W * 0.4;
    const y = H / 2 + Math.cos(t * (0.9 + i * 0.2) + i * 2) * H * 0.4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.35);
    g.addColorStop(0, hsl((t * 120 + i * 90) % 360, 100, 60, 0.22));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
