// Side-view art for the big drop: sky, skyline, the horseshoe curtain, mist, rainbow,
// our cliff, the falling water sheet, the plunge pool, rocks and the tour boat.
import { TAU, hsl, rng, shade, clamp } from './util.js';
import { OUTLINE, drawUpright } from './charArt.js';
import { RAINBOW } from '../data/characters.js';

export const POOL_Y = 52;
export const LIP_DEPTH = 1.0; // river depth above the lip
export const cliffX = (y) => (y < LIP_DEPTH ? 0 : -0.14 * (y - LIP_DEPTH) - 0.25 * Math.sin(y * 0.4));
export const WATER_V = 6.5;

// Soft round puff sprite (cached) so mist looks like mist instead of flat circles
let puffSprite = null;
export function puff(ctx, x, y, r, alpha = 1) {
  if (!puffSprite) {
    puffSprite = document.createElement('canvas');
    puffSprite.width = puffSprite.height = 128;
    const c = puffSprite.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(puffSprite, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a;
}

// view: { ctx, W, H, S, camX, camY, t, disco }
const L = (v, f, lx, ly) => ({
  x: v.W / 2 + (lx - v.camX * f) * v.S * f,
  y: v.H / 2 + (ly - v.camY * f) * v.S * f,
});

export function drawSky(v) {
  const { ctx, W, H, t } = v;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (v.disco) {
    const h = (t * 40) % 360;
    g.addColorStop(0, hsl(h, 70, 30));
    g.addColorStop(1, hsl(h + 80, 80, 60));
  } else {
    const k = Math.min(1, Math.max(0, v.camY / POOL_Y));
    g.addColorStop(0, `rgb(${50 + k * 20},${130 + k * 20},${225})`);
    g.addColorStop(0.6, '#8fd3ff');
    g.addColorStop(1, '#e3f6ff');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun
  const sun = L(v, 0.04, 60, -120);
  const sg = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, v.S * 6);
  sg.addColorStop(0, 'rgba(255,250,210,1)');
  sg.addColorStop(0.2, 'rgba(255,240,170,0.9)');
  sg.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, v.S * 6, 0, TAU);
  ctx.fill();
  // clouds
  for (let i = 0; i < 7; i++) {
    const lx = ((i * 47 + t * 1.5) % 260) - 80;
    const p = L(v, 0.08, lx, -95 + (i % 3) * 18);
    cloud(ctx, p.x, p.y, v.S * 0.08 * (18 + (i % 3) * 6));
  }
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  [[0, 0, 1], [0.9, 0.15, 0.75], [-0.9, 0.2, 0.7], [0.4, -0.45, 0.7], [-0.4, -0.35, 0.65]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(200,225,245,0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.5, s * 1.6, s * 0.3, 0, 0, TAU);
  ctx.fill();
}

export function drawSkyline(v) {
  const { ctx, t } = v;
  const f = 0.16;
  const base = L(v, f, 0, -2).y;
  const sc = v.S * f;
  ctx.save();
  // distant hills
  ctx.fillStyle = '#7fa8c9';
  ctx.beginPath();
  const x0 = L(v, f, -200, 0).x;
  ctx.moveTo(x0, base + sc * 4);
  for (let i = 0; i <= 40; i++) {
    const lx = -200 + i * 12;
    const p = L(v, f, lx, -4 - Math.sin(i * 0.9) * 3 - Math.sin(i * 0.37) * 4);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(L(v, f, 300, 0).x, base + sc * 60);
  ctx.lineTo(x0, base + sc * 60);
  ctx.closePath();
  ctx.fill();
  // hotel towers
  const towers = [[38, 24, 7], [47, 32, 6], [55, 20, 8], [64, 36, 6], [72, 26, 7], [82, 30, 6], [92, 18, 9], [102, 28, 6]];
  towers.forEach(([lx, h, w], i) => {
    const p = L(v, f, lx, -h - 4);
    ctx.fillStyle = i % 2 ? '#6d8fb3' : '#5c7ea3';
    ctx.fillRect(p.x, p.y, w * sc, (h + 60) * sc);
    ctx.fillStyle = 'rgba(255,240,180,0.55)';
    for (let r = 0; r < h / 2.5; r++) {
      for (let c = 0; c < w / 2; c++) {
        if ((r * 7 + c * 3 + i) % 4 === 0) ctx.fillRect(p.x + (c * 2 + 0.6) * sc, p.y + (r * 2.5 + 1) * sc, sc * 0.9, sc * 1.1);
      }
    }
  });
  // Skylon-style observation tower
  const tw = L(v, f, 60, -70);
  ctx.fillStyle = '#e8eef5';
  ctx.strokeStyle = '#4a5a70';
  ctx.lineWidth = Math.max(1, sc * 0.4);
  ctx.fillRect(tw.x - sc * 1.2, tw.y, sc * 2.4, sc * 70);
  ctx.strokeRect(tw.x - sc * 1.2, tw.y, sc * 2.4, sc * 70);
  ctx.fillStyle = '#ffd23b';
  ctx.fillRect(tw.x - sc * 0.4, tw.y + sc * 4, sc * 0.8, sc * 60);
  ctx.fillStyle = '#d8e2ee';
  ctx.beginPath();
  ctx.ellipse(tw.x, tw.y, sc * 6, sc * 3.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5a7090';
  ctx.fillRect(tw.x - sc * 6, tw.y - sc * 0.6, sc * 12, sc * 1.2);
  ctx.fillStyle = '#ff3b5c';
  ctx.fillRect(tw.x - sc * 0.3, tw.y - sc * 8, sc * 0.6, sc * 5);
  // Ferris wheel
  const fw = L(v, f, 86, -22);
  const R = sc * 16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, sc * 0.5);
  ctx.beginPath();
  ctx.arc(fw.x, fw.y, R, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.08;
    ctx.beginPath();
    ctx.moveTo(fw.x, fw.y);
    ctx.lineTo(fw.x + Math.cos(a) * R, fw.y + Math.sin(a) * R);
    ctx.stroke();
    ctx.fillStyle = RAINBOW[i % RAINBOW.length];
    ctx.beginPath();
    ctx.arc(fw.x + Math.cos(a) * R, fw.y + Math.sin(a) * R, sc * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#d0d8e4';
  ctx.beginPath();
  ctx.moveTo(fw.x, fw.y);
  ctx.lineTo(fw.x - R * 0.6, fw.y + R * 1.6);
  ctx.moveTo(fw.x, fw.y);
  ctx.lineTo(fw.x + R * 0.6, fw.y + R * 1.6);
  ctx.stroke();
  ctx.restore();
}

// The far side of the horseshoe: a wide, curved curtain of water
export function drawFarFalls(v) {
  const { ctx, t } = v;
  const f = 0.42;
  const sc = v.S * f;
  // gorge walls on the far right
  const gw0 = L(v, f, 70, -2);
  ctx.fillStyle = '#8a6a48';
  ctx.beginPath();
  ctx.moveTo(gw0.x, gw0.y);
  ctx.lineTo(L(v, f, 200, -4).x, L(v, f, 200, -4).y);
  ctx.lineTo(L(v, f, 200, 70).x, L(v, f, 200, 70).y);
  ctx.lineTo(L(v, f, 75, 70).x, L(v, f, 75, 70).y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,20,0.35)';
  ctx.lineWidth = Math.max(1, sc * 0.6);
  for (let k = 0; k < 8; k++) {
    const a = L(v, f, 72, k * 7);
    const b = L(v, f, 200, k * 7 + 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // trees on top of the far gorge
  for (let i = 0; i < 14; i++) {
    const p = L(v, f, 72 + i * 9, -3);
    ctx.fillStyle = i % 2 ? '#2f7a3a' : '#3e9a4a';
    ctx.beginPath();
    ctx.arc(p.x, p.y - sc * 2, sc * 3.2, 0, TAU);
    ctx.fill();
  }
  // the far side of the horseshoe: a distant curtain of falling white water
  const top = L(v, f, -40, -1);
  const right = L(v, f, 72, 1);
  const bot = L(v, f, 0, POOL_Y);
  const crest = (k) => ({ x: top.x + (right.x - top.x) * k, y: top.y + (right.y - top.y) * k - Math.sin(k * Math.PI) * sc * 3 });
  const curtain = () => {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    for (let i = 1; i <= 24; i++) {
      const c = crest(i / 24);
      ctx.lineTo(c.x, c.y);
    }
    ctx.lineTo(right.x, bot.y);
    ctx.lineTo(top.x, bot.y);
    ctx.closePath();
  };
  curtain();
  const g = ctx.createLinearGradient(0, top.y, 0, bot.y);
  g.addColorStop(0, v.disco ? hsl((t * 60) % 360, 80, 75) : '#f4fdff');
  g.addColorStop(0.08, '#cfeff4');
  g.addColorStop(0.5, '#a9dbe5');
  g.addColorStop(0.85, '#d6f2f6');
  g.addColorStop(1, '#f4fdff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  curtain();
  ctx.clip();
  // darker channels give the sheet depth
  for (let i = 0; i < 14; i++) {
    const c = crest((i + 0.5) / 14);
    ctx.fillStyle = 'rgba(60,140,165,0.13)';
    ctx.fillRect(c.x - sc * 1.6, c.y, sc * (1.2 + (i % 3)), bot.y - c.y);
  }
  // fine streaks pouring down
  ctx.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const k = (i * 0.618) % 1;
    const c = crest(k);
    const speed = 0.45 + ((i * 37) % 10) / 30;
    const ph = (t * speed + i * 0.137) % 1;
    const y = c.y + ph * (bot.y - c.y);
    const len = sc * (5 + (i % 6) * 1.5);
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.18})`;
    ctx.lineWidth = Math.max(1, sc * (0.12 + (i % 3) * 0.06));
    ctx.beginPath();
    ctx.moveTo(c.x, y);
    ctx.lineTo(c.x, y + len);
    ctx.stroke();
  }
  ctx.restore();
  // bright foam where the river tips over the far crest
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(2, sc * 1.1);
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const c = crest(i / 24);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y + Math.sin(i * 1.9 + t * 3) * sc * 0.3);
  }
  ctx.stroke();
  // mist cloud at the base of the curtain
  for (let i = 0; i < 12; i++) {
    const ph = (t * 0.08 + i * 0.21) % 1;
    const p = L(v, f, -35 + i * 9.5, POOL_Y - 2 - ph * 14);
    puff(ctx, p.x, p.y, sc * (9 + (i % 3) * 3), 0.85 * Math.sin(ph * Math.PI));
  }
}

export function drawRainbow(v) {
  const { ctx } = v;
  const f = 0.5;
  const c = L(v, f, 26, POOL_Y + 4);
  const R = v.S * f * 34;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = Math.max(3, v.S * f * 1.4);
  RAINBOW.slice(0, 6).forEach((col, i) => {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R - i * ctx.lineWidth, Math.PI, TAU);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- near layer (world coords, ctx already transformed)
export function drawCliff(ctx, t, lw) {
  // rock mass: under the upstream river and down the cliff face
  ctx.fillStyle = '#4a3c30';
  ctx.beginPath();
  ctx.moveTo(-400, LIP_DEPTH);
  ctx.lineTo(0, LIP_DEPTH);
  for (let y = LIP_DEPTH; y <= POOL_Y + 16; y += 1) ctx.lineTo(cliffX(y), y);
  ctx.lineTo(-400, POOL_Y + 16);
  ctx.closePath();
  const g = ctx.createLinearGradient(-10, 0, 0, 0);
  g.addColorStop(0, '#3a2e24');
  g.addColorStop(1, '#6b5442');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
  // strata + wet sheen
  ctx.strokeStyle = 'rgba(20,12,6,0.45)';
  ctx.lineWidth = lw * 0.8;
  for (let y = 4; y < POOL_Y + 14; y += 3.2) {
    ctx.beginPath();
    ctx.moveTo(-40, y + Math.sin(y) * 0.4);
    ctx.lineTo(cliffX(y) - 0.05, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(80,140,70,0.6)';
  for (let y = 3; y < POOL_Y; y += 5.5) {
    ctx.beginPath();
    ctx.ellipse(cliffX(y) - 0.25, y, 0.3, 0.9, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(200,240,255,0.18)';
  ctx.fillRect(-1.5, LIP_DEPTH, 1.5, POOL_Y);
  return t;
}

export function drawUpstream(ctx, t, lw, disco) {
  // river surface left of the lip, speeding up and churning white as it nears the edge
  const g = ctx.createLinearGradient(0, -0.2, 0, LIP_DEPTH);
  g.addColorStop(0, disco ? hsl((t * 90) % 360, 80, 55) : '#33bfae');
  g.addColorStop(1, '#14706a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-400, 0);
  for (let x = -60; x <= 0; x += 0.25) ctx.lineTo(x, Math.sin(x * 1.3 + t * 7) * 0.05 * (1 + clamp((x + 6) / 6, 0, 1)) - (x > -3 ? (x + 3) * 0.025 : 0));
  ctx.lineTo(0.05, LIP_DEPTH);
  ctx.lineTo(-400, LIP_DEPTH);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 48; i++) {
    const x = -16 + ((i * 2.3 + t * WATER_V * 1.2) % 16);
    const k = clamp((x + 16) / 16, 0, 1);
    const y = 0.07 + ((i * 7) % 5) * 0.13;
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + k * 0.65})`;
    ctx.lineWidth = lw * (1 + k * 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.5 + k * 0.9, y + k * 0.03);
    ctx.stroke();
  }
  // whitecaps piling up right at the edge
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 12; i++) {
    const x = -3.4 + ((i * 0.61 + t * 3.2) % 3.4);
    const r = 0.1 + (i % 3) * 0.06 + clamp((x + 3.4) / 3.4, 0, 1) * 0.12;
    ctx.beginPath();
    ctx.arc(x, -0.03 + Math.sin(t * 9 + i) * 0.04 - (x > -3 ? (x + 3) * 0.025 : 0), r, 0, TAU);
    ctx.fill();
  }
}

// The thick sheet of water pouring over our lip
export function drawSheet(ctx, t, lw, disco) {
  const outer = (y) => WATER_V * Math.sqrt(Math.max(0, y) / 11);
  const inner = (y) => (WATER_V - 2.6) * Math.sqrt(Math.max(0, y - LIP_DEPTH) / 11) - 0.05;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(0, -0.05);
    for (let y = 0; y <= POOL_Y; y += 0.5) ctx.lineTo(outer(y) + Math.sin(y * 2.3 + t * 9) * 0.1 * Math.min(1, y / 6), y);
    for (let y = POOL_Y; y >= LIP_DEPTH; y -= 1) ctx.lineTo(inner(y), y);
    ctx.lineTo(0, LIP_DEPTH);
    ctx.closePath();
  };
  ctx.save();
  shape();
  const g = ctx.createLinearGradient(0, 0, 0, POOL_Y);
  g.addColorStop(0, disco ? hsl((t * 90) % 360, 80, 55) : '#2fb7a6');
  g.addColorStop(0.04, '#74dad2');
  g.addColorStop(0.12, '#cdf5f5');
  g.addColorStop(0.5, '#effcff');
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // depth: the inner side of the sheet is darker
  ctx.fillStyle = 'rgba(30,120,135,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, LIP_DEPTH);
  for (let y = LIP_DEPTH; y <= POOL_Y; y += 1) ctx.lineTo(inner(y) + 0.9, y);
  for (let y = POOL_Y; y >= LIP_DEPTH; y -= 1) ctx.lineTo(inner(y) - 0.2, y);
  ctx.fill();
  // streaks flowing along the falling trajectories
  ctx.lineCap = 'round';
  for (let i = 0; i < 150; i++) {
    const k = (i * 0.618) % 1;
    const v = WATER_V - 2.6 * k;
    const speed = 0.5 + ((i * 37) % 10) / 40;
    const tt = (t * speed + i * 0.173) % 2.25;
    const t2 = tt + 0.08 + ((i * 13) % 7) / 60;
    ctx.strokeStyle = i % 3 ? 'rgba(255,255,255,0.85)' : 'rgba(110,195,205,0.5)';
    ctx.lineWidth = lw * (0.7 + (i % 4) * 0.55);
    ctx.beginPath();
    ctx.moveTo(v * tt, 11 * tt * tt);
    ctx.lineTo(v * t2, 11 * t2 * t2);
    ctx.stroke();
  }
  // white clumps tumbling down the face
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 28; i++) {
    const tt = (t * 0.62 + i * 0.21) % 2.2;
    const v = WATER_V - 2.6 * ((i * 0.37) % 1);
    ctx.beginPath();
    ctx.arc(v * tt, 11 * tt * tt, 0.1 + (i % 3) * 0.09, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // a foamy crest rolling over the edge
  for (let i = 0; i < 16; i++) {
    const x = -1.9 + i * 0.2;
    const y = x < 0 ? -0.06 - (x > -1 ? (x + 1) * 0.03 : 0) : 11 * Math.pow(x / WATER_V, 2) - 0.05;
    const r = 0.16 + ((i * 7) % 4) * 0.05 + Math.sin(t * 11 + i) * 0.03;
    puff(ctx, x, y, r * 2.2, 0.95);
  }
  // spray peeling off the outer face of the falls
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.5 + i * 0.13) % 1;
    const y0 = 1.5 + ((i * 3.1) % 40);
    puff(ctx, outer(y0) + ph * 1.8, y0 + ph * 1.4, 0.45 + ph * 1.0, 0.55 * (1 - ph));
  }
}

function rockBody(ctx, r) {
  ctx.beginPath();
  if (r.type === 'spike') {
    const { x, baseY, tip } = r;
    const v = r.verts;
    ctx.moveTo(x - r.r, baseY);
    ctx.lineTo(x - r.r * 0.7 * v[0], baseY - r.h * 0.3);
    ctx.lineTo(x - r.r * 0.45 * v[1] + (tip.x - x) * 0.5, baseY - r.h * 0.55);
    ctx.lineTo(x - r.r * 0.2 * v[2] + (tip.x - x) * 0.8, baseY - r.h * 0.82);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(x + r.r * 0.22 * v[3] + (tip.x - x) * 0.8, baseY - r.h * 0.78);
    ctx.lineTo(x + r.r * 0.5 * v[4] + (tip.x - x) * 0.5, baseY - r.h * 0.5);
    ctx.lineTo(x + r.r * 0.75 * v[5], baseY - r.h * 0.25);
    ctx.lineTo(x + r.r, baseY);
  } else if (r.type === 'flat') {
    const { x, w, top } = r;
    ctx.moveTo(x - w, POOL_Y + 0.6);
    ctx.lineTo(x - w - 0.15, top + 0.25);
    ctx.quadraticCurveTo(x - w, top - 0.02, x - w + 0.3, top);
    for (let k = 1; k < 7; k++) ctx.lineTo(x - w + (k / 7) * w * 2, top - 0.03 + r.verts[k] * 0.06);
    ctx.lineTo(x + w - 0.3, top);
    ctx.quadraticCurveTo(x + w, top - 0.02, x + w + 0.15, top + 0.25);
    ctx.lineTo(x + w, POOL_Y + 0.6);
  } else {
    r.verts.forEach((k, i) => {
      const a = (i / r.verts.length) * TAU;
      ctx.lineTo(r.x + Math.cos(a) * r.r * k, r.y + Math.sin(a) * r.r * k * 0.85);
    });
  }
  ctx.closePath();
}

export function drawRocks(ctx, rocks, lw) {
  rocks.forEach((r) => {
    if (r.hidden) return;
    rockBody(ctx, r);
    const g = ctx.createLinearGradient(r.x - (r.w || r.r), 0, r.x + (r.w || r.r), 0);
    g.addColorStop(0, shade(r.color, 0.18));
    g.addColorStop(0.55, r.color);
    g.addColorStop(1, shade(r.color, -0.35));
    ctx.fillStyle = g;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.fill();
    ctx.stroke();
    if (r.type === 'spike') {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.moveTo(r.x - r.r * 0.55, r.baseY - r.h * 0.2);
      ctx.lineTo(r.tip.x - 0.05, r.tip.y + 0.25);
      ctx.stroke();
    } else if (r.type === 'flat') {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(r.x - r.w + 0.3, r.top + 0.02, r.w * 2 - 0.6, 0.12);
      ctx.fillStyle = 'rgba(70,130,60,0.5)';
      ctx.fillRect(r.x - r.w * 0.6, r.top + 0.14, r.w * 0.5, 0.08);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(r.x - r.r * 0.3, r.y - r.r * 0.45, r.r * 0.35, r.r * 0.14, -0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(70,130,60,0.55)';
      ctx.beginPath();
      ctx.ellipse(r.x + r.r * 0.2, r.y - r.r * 0.6, r.r * 0.3, r.r * 0.1, 0.2, 0, TAU);
      ctx.fill();
    }
    (r.decals || []).forEach((d) => {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.ellipse(r.x + d.x, r.y + d.y, d.r, d.r * 0.6, d.a, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r.x + d.x + Math.cos(d.a) * d.r * 1.4, r.y + d.y + Math.sin(d.a) * d.r * 1.1, d.r * 0.25, 0, TAU);
      ctx.fill();
      if (d.drip) {
        // gravity pulls a run of blood down the rock face
        ctx.beginPath();
        ctx.moveTo(r.x + d.x - d.r * 0.15, r.y + d.y);
        ctx.lineTo(r.x + d.x - d.r * 0.08, r.y + d.y + d.drip);
        ctx.arc(r.x + d.x, r.y + d.y + d.drip, d.r * 0.1, Math.PI, 0, true);
        ctx.lineTo(r.x + d.x + d.r * 0.15, r.y + d.y);
        ctx.fill();
      }
    });
  });
}

export function makeRock(x, y, r, seed, type = 'round') {
  const R = rng(seed);
  const color = shade(['#6e6a66', '#7a726a', '#5f6066', '#81776c'][Math.floor(R() * 4)], -0.1);
  if (type === 'spike') {
    // a jagged spire of rock sticking up out of the plunge pool
    const baseY = POOL_Y + 0.3;
    const h = r * (2.1 + R() * 0.7);
    const lean = (R() - 0.5) * r * 0.5;
    const tip = { x: x + lean, y: baseY - h };
    return {
      type, x, y: baseY - h * 0.4, r, h, baseY, tip, color, decals: [],
      verts: Array.from({ length: 6 }, () => 0.8 + R() * 0.4),
      circles: [
        { x, y: baseY - h * 0.15, r: r * 0.78 },
        { x: x + lean * 0.5, y: baseY - h * 0.5, r: r * 0.45 },
        { x: x + lean * 0.85, y: baseY - h * 0.84, r: r * 0.17 },
      ],
    };
  }
  if (type === 'flat') {
    // a wide flat slab, perfect for pancaking
    const top = POOL_Y - 0.55;
    const w = r * 1.6;
    const circles = [];
    for (let k = 0; k < 5; k++) circles.push({ x: x - w + 0.4 + (k / 4) * (w * 2 - 0.8), y: top + 0.42, r: 0.42 });
    return { type, x, y: top + 0.4, r, w, top, color: shade(color, 0.08), decals: [], verts: Array.from({ length: 8 }, () => R()), circles };
  }
  return { type: 'round', x, y, r, verts: Array.from({ length: 10 }, () => 0.75 + R() * 0.4), color, decals: [], circles: [{ x, y, r: r * 0.88 }] };
}

export function rockContains(r, x, y, pad = 1.1) {
  return r.circles.some((c) => Math.hypot(x - c.x, y - c.y) < c.r * pad) || (r.type === 'flat' && Math.abs(x - r.x) < r.w && y > r.top - 0.05 && y < POOL_Y + 0.6);
}

export function drawPoolBack(ctx, t, x0, x1) {
  // churn & foam on the surface, drawn behind objects
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 26; i++) {
    const x = 2 + ((i * 1.37 + t * 1.3) % 18);
    const r = 0.6 + ((i * 7) % 5) * 0.25;
    ctx.beginPath();
    ctx.arc(x, POOL_Y - 0.1 + Math.sin(t * 5 + i) * 0.12, r, 0, TAU);
    ctx.fill();
  }
  return x0 + x1;
}

export function drawPoolFront(ctx, t, x0, x1, lw, disco) {
  const g = ctx.createLinearGradient(0, POOL_Y, 0, POOL_Y + 16);
  g.addColorStop(0, disco ? hsl((t * 90 + 180) % 360, 70, 45, 0.4) : 'rgba(30,140,150,0.38)');
  g.addColorStop(0.18, 'rgba(20,110,130,0.6)');
  g.addColorStop(1, 'rgba(5,40,55,0.95)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, POOL_Y + 16);
  for (let x = x0; x <= x1; x += 0.5) ctx.lineTo(x, POOL_Y + Math.sin(x * 0.9 + t * 3) * 0.12 + Math.sin(x * 2.3 - t * 4) * 0.06);
  ctx.lineTo(x1, POOL_Y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = lw * 1.5;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 0.5) {
    const y = POOL_Y + Math.sin(x * 0.9 + t * 3) * 0.12 + Math.sin(x * 2.3 - t * 4) * 0.06;
    if (x === x0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawMistPuffs(ctx, t, camX, camY, amount = 1) {
  // soft spray clouds billowing up from the base of the falls
  for (let i = 0; i < 12; i++) {
    const ph = (t * 0.1 + i * 0.27) % 1;
    const x = -3 + ((i * 3.7) % 22) + Math.sin(t * 0.4 + i) * 1.5;
    const y = POOL_Y - 0.5 - ph * 12;
    puff(ctx, x, y, 2.4 + (i % 4) * 0.8 + ph * 2.2, 0.55 * Math.sin(ph * Math.PI) * amount);
  }
  return camX + camY;
}

const PONCHO = ['#ff3b5c', '#2bb6ff', '#ff3b5c', '#ffd23b', '#2bb6ff'];
export function drawBoat(ctx, x, t, lw, cheer = false) {
  const y = POOL_Y + Math.sin(t * 1.6) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  // tourists on deck
  for (let i = 0; i < 9; i++) {
    const tx = -4.2 + i * 1.05;
    ctx.save();
    ctx.translate(tx, -2.05);
    const fake = { id: 'tourist', kind: 'human', scale: 0.9, headScale: 1, hat: 'none', extras: [], colors: { skin: ['#f2c9a5', '#b87a4f', '#e0a37a', '#8a5634'][i % 4], hair: '#2a1a10', shirt: PONCHO[i % PONCHO.length], shirt2: '#fff', collar: '#fff', pants: '#333', shoes: '#222', hat: '#000', hatBand: '#000', accent: '#fff' } };
    drawUpright(ctx, fake, 1, { pose: cheer ? (i % 2 ? 'cheer' : 'wave') : 'stand', expr: cheer ? 'happy' : 'scared', t: t + i, cutY: -80, lw: lw * 100 });
    ctx.restore();
  }
  // hull
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-6, -1.4);
  ctx.lineTo(6.2, -1.4);
  ctx.quadraticCurveTo(6.4, -0.2, 5, 0.6);
  ctx.lineTo(-5.4, 0.6);
  ctx.quadraticCurveTo(-6.2, -0.2, -6, -1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2456b8';
  ctx.fillRect(-5.8, -0.5, 11.6, 0.35);
  ctx.save();
  ctx.scale(0.02, 0.02);
  ctx.fillStyle = '#1a1030';
  ctx.font = '28px "Luckiest Guy", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MISTY MAID', 0, -40);
  ctx.restore();
  // railing
  ctx.strokeStyle = '#2456b8';
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.moveTo(-5.6, -2.3);
  ctx.lineTo(5.8, -2.3);
  ctx.stroke();
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 1.1, -2.3);
    ctx.lineTo(i * 1.1, -1.4);
    ctx.stroke();
  }
  ctx.restore();
}
