// Character art, drawn procedurally but aiming for realistic-ish anatomy: shaped skulls and jaws,
// colored irises, lids, lips, ears, hair strands, tapered/shaded limbs, hands and clothing folds.
// Also: salmon, cat, grizzly bear. All vector, no images.
import { TAU, shade, rand } from './util.js';
import { RAINBOW } from '../data/characters.js';

export const OUTLINE = '#1d1226';
const SOFT = 'rgba(32,18,24,0.78)';
const EYES = { annie: '#5d7fa3', timmy: '#5b8a3c', bobby: '#4a2e1a', jean: '#3b5f86', gary: '#3a6e8e', kacey: '#3a2416', tourist: '#4a3420', ryan: '#5f86a8', bt: '#3a2416', mike: '#4f6b5a', amy: '#5e4632', max: '#4c6f8e', andy: '#5b7a8c' };
// legacy characters picked their hair by id; newer ones say so in their data
const hairStyleOf = (ch) => ch.hairStyle || { annie: 'bun', timmy: 'kid', bobby: 'slick' }[ch.id] || 'side';
const LIP = (skin) => shade(skin, -0.28);

// Canadian border services officer (Kacey's biggest fan)
export const BORDER_AGENT = { id: 'tourist', kind: 'human', scale: 1.05, headScale: 1, hat: 'cap', extras: [], colors: { skin: '#e0b08a', hair: '#3a2a1a', shirt: '#1d2b4f', shirt2: '#1d2b4f', collar: '#c8a040', pants: '#1d2b4f', shoes: '#111', hat: '#1d2b4f', hatBand: '#c8a040', accent: '#c8a040' } };

export const GARY = {
  id: 'gary',
  name: 'Gary',
  kind: 'human',
  gore: 'blood',
  voice: 0.9,
  scale: 1.02,
  headScale: 1,
  colors: { skin: '#e3b089', hair: '#9a6a36', shirt: '#1fa894', shirt2: '#ff5a8a', collar: '#ffd23b', pants: '#d9c48e', shoes: '#6a4426', hat: '#000', hatBand: '#000', accent: '#ffd23b' },
  hat: 'none',
  extras: ['sunglasses', 'hawaiian', 'beard'],
};

// ---------------------------------------------------------------- helpers
const LIGHT = { x: -0.6, y: -0.8 };

export function taper(ctx, a, b, wa, wb, color, lw, opts = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L;
  const ny = dx / L;
  const ang = Math.atan2(dy, dx);
  const bulge = opts.bulge || 0;
  ctx.beginPath();
  ctx.moveTo(a.x + (nx * wa) / 2, a.y + (ny * wa) / 2);
  if (bulge) {
    const mx = (a.x + b.x) / 2 + nx * (Math.max(wa, wb) / 2 + bulge);
    const my = (a.y + b.y) / 2 + ny * (Math.max(wa, wb) / 2 + bulge);
    ctx.quadraticCurveTo(mx, my, b.x + (nx * wb) / 2, b.y + (ny * wb) / 2);
  } else ctx.lineTo(b.x + (nx * wb) / 2, b.y + (ny * wb) / 2);
  ctx.arc(b.x, b.y, wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
  if (bulge) {
    const mx = (a.x + b.x) / 2 - nx * (Math.max(wa, wb) / 2 + bulge * 0.5);
    const my = (a.y + b.y) / 2 - ny * (Math.max(wa, wb) / 2 + bulge * 0.5);
    ctx.quadraticCurveTo(mx, my, a.x - (nx * wa) / 2, a.y - (ny * wa) / 2);
  } else ctx.lineTo(a.x - (nx * wa) / 2, a.y - (ny * wa) / 2);
  ctx.arc(a.x, a.y, wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
  if (opts.flat) ctx.fillStyle = color;
  else {
    const lit = nx * LIGHT.x + ny * LIGHT.y > 0 ? 1 : -1;
    const w = Math.max(wa, wb) / 2;
    const g = ctx.createLinearGradient(a.x + nx * w * lit, a.y + ny * w * lit, a.x - nx * w * lit, a.y - ny * w * lit);
    g.addColorStop(0, shade(color, 0.2));
    g.addColorStop(0.4, color);
    g.addColorStop(1, shade(color, -0.32));
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (lw) {
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function vgrad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}
function hgrad(ctx, x0, x1, color) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, 0.16));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -0.3));
  return g;
}

// ---------------------------------------------------------------- heads
// r = half-width of the skull. view 'front' or 'side' (faces +x).
export function drawHead(ctx, ch, r, { expr = 'happy', t = 0, view = 'front', lw = 2 } = {}) {
  if (ch.kind === 'giraffe') return drawGiraffeHead(ctx, ch, r, { expr, t, view, lw });
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (view === 'side') drawHumanProfile(ctx, ch, r, expr, t, lw);
  else drawHumanFront(ctx, ch, r, expr, t, lw);
  return undefined;
}

function headPathFront(ctx, r, kid) {
  const h = r * (kid ? 1.12 : 1.27);
  const jaw = kid ? 0.62 : 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(r * 0.78, -h, r * 1.02, -h * 0.55, r * 1.0, -h * 0.08);
  ctx.bezierCurveTo(r * 0.99, h * 0.32, r * 0.86, h * 0.6, r * jaw, h * 0.86);
  ctx.quadraticCurveTo(r * 0.22, h * 1.02, 0, h * 1.02);
  ctx.quadraticCurveTo(-r * 0.22, h * 1.02, -r * jaw, h * 0.86);
  ctx.bezierCurveTo(-r * 0.86, h * 0.6, -r * 0.99, h * 0.32, -r * 1.0, -h * 0.08);
  ctx.bezierCurveTo(-r * 1.02, -h * 0.55, -r * 0.78, -h, 0, -h);
  ctx.closePath();
  return h;
}

function drawHumanFront(ctx, ch, r, expr, t, lw) {
  const c = ch.colors;
  const kid = ch.id === 'timmy';
  const female = ch.id === 'annie';
  const h = r * (kid ? 1.12 : 1.27);

  drawHairBack(ctx, ch, r, h, lw);

  // ears
  [-1, 1].forEach((s) => {
    ctx.save();
    ctx.translate(s * r * 0.97, h * 0.06);
    ctx.scale(s, 1);
    ctx.fillStyle = shade(c.skin, -0.06);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.2);
    ctx.bezierCurveTo(r * 0.3, -h * 0.28, r * 0.32, h * 0.18, r * 0.04, h * 0.22);
    ctx.lineTo(0, h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    ctx.strokeStyle = shade(c.skin, -0.3);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.06, -h * 0.12);
    ctx.quadraticCurveTo(r * 0.2, -h * 0.05, r * 0.06, h * 0.1);
    ctx.stroke();
    ctx.restore();
  });

  // skull + face with soft shading
  headPathFront(ctx, r, kid);
  const g = ctx.createRadialGradient(-r * 0.3, -h * 0.25, r * 0.15, 0, h * 0.1, r * 1.35);
  g.addColorStop(0, shade(c.skin, 0.14));
  g.addColorStop(0.6, c.skin);
  g.addColorStop(1, shade(c.skin, -0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.save();
  headPathFront(ctx, r, kid);
  ctx.clip();
  ctx.fillStyle = 'rgba(120,50,40,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, h * 1.02, r * 0.9, h * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,80,80,0.13)';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.5, h * 0.3, r * 0.22, h * 0.1, 0, 0, TAU);
    ctx.fill();
  });
  if (ch.extras.includes('beard') || ch.extras.includes('scruff') || ch.id === 'bobby') {
    ctx.fillStyle = 'rgba(60,40,30,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.72, r * 0.72, h * 0.35, 0, 0, Math.PI);
    ctx.fill();
  }
  ctx.restore();

  // eyes
  const eyeY = -h * 0.04;
  const ex = r * 0.4;
  const ew = r * (kid ? 0.3 : 0.27);
  const iris = EYES[ch.id] || EYES.tourist;
  if (expr === 'cool' || (ch.extras.includes('sunglasses') && expr !== 'ko')) {
    drawSunglasses(ctx, r, eyeY, ex, ew, lw, 'front');
  } else {
    [-1, 1].forEach((s) => drawEyeFront(ctx, s * ex, eyeY, ew, s, iris, expr, t, lw, female, c.skin));
  }
  drawBrows(ctx, ch, r, h, eyeY, ex, ew, expr);

  // nose
  ctx.strokeStyle = shade(c.skin, -0.32);
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.06, eyeY + h * 0.08);
  ctx.quadraticCurveTo(r * 0.13, h * 0.2, r * 0.1, h * 0.3);
  ctx.stroke();
  ctx.fillStyle = shade(c.skin, -0.38);
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.08, h * 0.33, r * 0.045, r * 0.028, s * 0.4, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = shade(c.skin, -0.25);
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.arc(0, h * 0.3, r * 0.14, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.02, h * 0.24, r * 0.04, r * 0.06, 0, 0, TAU);
  ctx.fill();

  if (female) {
    ctx.strokeStyle = 'rgba(110,60,50,0.35)';
    ctx.lineWidth = lw * 0.5;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.24, h * 0.36);
      ctx.quadraticCurveTo(s * r * 0.36, h * 0.5, s * r * 0.3, h * 0.62);
      ctx.stroke();
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(s * (ex + ew * 1.05), eyeY + k * r * 0.05);
        ctx.lineTo(s * (ex + ew * 1.35), eyeY - r * 0.03 + k * r * 0.08);
        ctx.stroke();
      }
    });
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -h * 0.5);
    ctx.quadraticCurveTo(0, -h * 0.54, r * 0.3, -h * 0.5);
    ctx.stroke();
  }

  drawMouthFront(ctx, ch, r, h, expr, t, lw);
  drawFacialHair(ctx, ch, r, h, lw, 'front');
  if (ch.extras.includes('glasses') && expr !== 'cool') {
    ctx.strokeStyle = ch.glasses || '#8a7650';
    ctx.lineWidth = lw * (ch.glasses ? 0.95 : 0.6);
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * ex, eyeY, ew * 1.25, ew * 0.95, 0, 0, TAU);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(-ex + ew * 1.2, eyeY);
    ctx.quadraticCurveTo(0, eyeY - ew * 0.3, ex - ew * 1.2, eyeY);
    ctx.stroke();
  }
  if (expr === 'scared' || expr === 'terrified' || expr === 'scream') {
    ctx.fillStyle = 'rgba(190,235,255,0.9)';
    ctx.strokeStyle = 'rgba(80,140,180,0.8)';
    ctx.lineWidth = lw * 0.5;
    const sy = -h * 0.45 + ((t * 0.9) % 1) * h * 0.5;
    const sx = r * 0.78;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.14);
    ctx.quadraticCurveTo(sx + r * 0.09, sy, sx, sy + r * 0.05);
    ctx.quadraticCurveTo(sx - r * 0.09, sy, sx, sy - r * 0.14);
    ctx.fill();
    ctx.stroke();
  }
  drawHairFront(ctx, ch, r, h, lw, t);
  drawHat(ctx, ch, r, h, lw, t, 'front');
}

function drawEyeFront(ctx, x, y, w, side, iris, expr, t, lw, female, skin) {
  const wide = expr === 'terrified' || expr === 'scream' ? 1.35 : expr === 'scared' ? 1.15 : 1;
  const hh = w * 0.42 * wide;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(120,60,50,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, -hh * 0.2, w * 1.25, hh * 1.7, 0, 0, TAU);
  ctx.fill();
  if (expr === 'hurt') {
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, hh * 0.7, w, 0);
    ctx.stroke();
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(side * w * 1.05, -hh * 0.2);
    ctx.lineTo(side * w * 1.35, -hh * 0.5);
    ctx.moveTo(side * w * 1.05, hh * 0.3);
    ctx.lineTo(side * w * 1.35, hh * 0.6);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const almond = () => {
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.bezierCurveTo(-w * 0.5, -hh * 1.25, w * 0.5, -hh * 1.25, w, 0);
    ctx.bezierCurveTo(w * 0.5, hh * 1.05, -w * 0.5, hh * 1.05, -w, 0);
    ctx.closePath();
  };
  almond();
  ctx.fillStyle = '#f7f2ec';
  ctx.fill();
  ctx.save();
  almond();
  ctx.clip();
  let ix = 0;
  let iy = 0;
  let ir = w * 0.48;
  if (expr === 'terrified' || expr === 'scream') ir = w * 0.36;
  if (expr === 'scared') ix = Math.sin(t * 7) * w * 0.25;
  if (expr === 'dizzy') {
    ix = side * w * 0.35;
    iy = side * hh * 0.3;
  }
  if (expr === 'ko') iy = -hh * 1.0;
  const ig = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir);
  ig.addColorStop(0, shade(iris, 0.35));
  ig.addColorStop(0.7, iris);
  ig.addColorStop(1, shade(iris, -0.45));
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0e0a0a';
  ctx.beginPath();
  ctx.arc(ix, iy, ir * 0.45, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(ix - ir * 0.35, iy - ir * 0.35, ir * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,40,40,0.25)';
  ctx.fillRect(-w, -hh * 1.3, w * 2, hh * 0.55);
  const lid = expr === 'ko' ? 0.55 : expr === 'dizzy' ? 0.45 : expr === 'determined' ? 0.3 : expr === 'happy' ? 0.12 : 0;
  if (lid) {
    ctx.fillStyle = shade(skin || '#d9a688', -0.05);
    ctx.fillRect(-w * 1.1, -hh * 1.3, w * 2.2, hh * 2.3 * lid);
  }
  ctx.restore();
  ctx.strokeStyle = '#2a1414';
  ctx.lineWidth = lw * 1.15;
  ctx.beginPath();
  ctx.moveTo(-w * 1.05, hh * 0.05);
  ctx.bezierCurveTo(-w * 0.5, -hh * 1.3 + hh * 2.3 * lid, w * 0.5, -hh * 1.3 + hh * 2.3 * lid, w * 1.05, -hh * 0.05);
  ctx.stroke();
  if (female) {
    ctx.lineWidth = lw * 0.6;
    for (let k = 0; k < 3; k++) {
      const ax = side * w * (0.5 + k * 0.25);
      ctx.beginPath();
      ctx.moveTo(ax, -hh * 0.95);
      ctx.lineTo(ax + side * w * 0.18, -hh * 1.45);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(80,40,40,0.4)';
  ctx.lineWidth = lw * 0.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.85, hh * 0.35);
  ctx.quadraticCurveTo(0, hh * 1.1, w * 0.85, hh * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawBrows(ctx, ch, r, h, eyeY, ex, ew, expr) {
  const c = ch.colors;
  ctx.fillStyle = shade(c.hair, -0.25);
  [-1, 1].forEach((s) => {
    let inner = 0;
    if (expr === 'determined' || expr === 'hurt') inner = 0.12;
    if (expr === 'scared' || expr === 'terrified' || expr === 'scream') inner = -0.14;
    const lift = expr === 'terrified' || expr === 'scream' ? -h * 0.08 : 0;
    const y = eyeY - h * 0.2 + lift;
    const xi = s * (ex - ew * 0.95);
    const xo = s * (ex + ew * 1.15);
    ctx.beginPath();
    ctx.moveTo(xi, y + inner * h);
    ctx.quadraticCurveTo(s * ex, y - h * 0.07, xo, y + h * 0.03);
    ctx.quadraticCurveTo(s * ex, y - h * 0.02, xi, y + inner * h + h * 0.045);
    ctx.closePath();
    ctx.fill();
  });
}

function drawMouthFront(ctx, ch, r, h, expr, t, lw) {
  const c = ch.colors;
  const y = h * 0.56;
  const lip = LIP(c.skin);
  const wob = Math.sin(t * 40) * r * 0.02;
  ctx.lineWidth = lw * 0.8;
  if (expr === 'terrified' || expr === 'scream' || expr === 'ko') {
    const big = expr === 'scream' ? 1.25 : expr === 'ko' ? 0.6 : 1;
    const mw = r * 0.3 * big;
    const mh = r * 0.27 * big + wob;
    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.ellipse(0, y + mh * 0.2, mw * 1.12, mh * 1.12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a0608';
    ctx.beginPath();
    ctx.ellipse(0, y + mh * 0.2, mw, mh, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, y + mh * 0.2, mw, mh, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#f2ece0';
    ctx.fillRect(-mw, y + mh * 0.2 - mh, mw * 2, mh * 0.32);
    ctx.fillStyle = '#c75a66';
    ctx.beginPath();
    ctx.ellipse(expr === 'ko' ? mw * 0.2 : 0, y + mh * 0.95, mw * 0.7, mh * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (expr === 'hurt') {
    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, y);
    ctx.quadraticCurveTo(0, y - r * 0.12, r * 0.32, y);
    ctx.quadraticCurveTo(0, y + r * 0.16, -r * 0.32, y);
    ctx.fill();
    ctx.fillStyle = '#f2ece0';
    ctx.fillRect(-r * 0.26, y - r * 0.04, r * 0.52, r * 0.08);
    ctx.strokeStyle = 'rgba(80,40,40,0.6)';
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, y);
    ctx.lineTo(r * 0.26, y);
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(k * r * 0.1, y - r * 0.04);
      ctx.lineTo(k * r * 0.1, y + r * 0.04);
    }
    ctx.stroke();
    return;
  }
  if (expr === 'scared') {
    ctx.fillStyle = '#3a0a0e';
    ctx.beginPath();
    ctx.ellipse(0, y, r * 0.18, r * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = lip;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    if (ch.extras.includes('cigarette')) drawCigarette(ctx, r * 0.16, y + r * 0.02, 0.45, r, lw, t);
    return;
  }
  const smile = expr === 'happy' ? 1 : expr === 'cool' ? 0.5 : 0;
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, y - smile * r * 0.06);
  ctx.quadraticCurveTo(-r * 0.12, y - r * 0.09, 0, y - r * 0.05);
  ctx.quadraticCurveTo(r * 0.12, y - r * 0.09, r * 0.3, y - smile * r * 0.06 - (expr === 'cool' ? r * 0.04 : 0));
  ctx.quadraticCurveTo(0, y + r * (0.12 + smile * 0.1), -r * 0.3, y - smile * r * 0.06);
  ctx.closePath();
  ctx.fill();
  if (smile >= 1) {
    ctx.fillStyle = '#f4efe6';
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, y - r * 0.03);
    ctx.quadraticCurveTo(0, y + r * 0.02, r * 0.24, y - r * 0.03);
    ctx.quadraticCurveTo(0, y + r * 0.12, -r * 0.24, y - r * 0.03);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(60,20,20,0.75)';
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, y - smile * r * 0.06);
  ctx.quadraticCurveTo(0, y + r * 0.02 + smile * r * 0.02, r * 0.3, y - smile * r * 0.06);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, y + r * 0.07, r * 0.1, r * 0.025, 0, 0, TAU);
  ctx.fill();
  if (ch.extras.includes('cigarette')) drawCigarette(ctx, r * 0.2, y + r * 0.01, 0.4, r, lw, t);
}

// a cigarette hanging from the mouth, ember glowing, smoke curling up
function drawCigarette(ctx, x, y, ang, r, lw, t) {
  const len = r * 0.62;
  const w = r * 0.085;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = '#d99a52';
  ctx.fillRect(0, -w / 2, len * 0.3, w);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(len * 0.3, -w / 2, len * 0.62, w);
  ctx.strokeStyle = 'rgba(60,40,40,0.6)';
  ctx.lineWidth = lw * 0.4;
  ctx.strokeRect(0, -w / 2, len * 0.92, w);
  const glow = 0.75 + Math.sin(t * 5) * 0.25;
  ctx.fillStyle = `rgba(255,${Math.round(80 + glow * 60)},40,1)`;
  ctx.fillRect(len * 0.92, -w / 2, len * 0.08, w);
  ctx.restore();
  // smoke rises straight up, whatever angle the head is at
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.6 + k / 3) % 1;
    ctx.fillStyle = `rgba(230,230,235,${0.45 * (1 - u)})`;
    ctx.beginPath();
    ctx.arc(ex + Math.sin(u * 7 + k) * r * 0.12, ey - u * r * 1.1, r * (0.06 + u * 0.12), 0, TAU);
    ctx.fill();
  }
}

function drawSunglasses(ctx, r, eyeY, ex, ew, lw, view) {
  ctx.fillStyle = '#121214';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw * 0.8;
  const lens = (x, k = 1) => {
    ctx.beginPath();
    ctx.moveTo(x - ew * 1.3 * k, eyeY - ew * 0.5);
    ctx.lineTo(x + ew * 1.3 * k, eyeY - ew * 0.55);
    ctx.quadraticCurveTo(x + ew * 1.25 * k, eyeY + ew * 0.95, x, eyeY + ew * 0.9);
    ctx.quadraticCurveTo(x - ew * 1.25 * k, eyeY + ew * 0.95, x - ew * 1.3 * k, eyeY - ew * 0.5);
    ctx.fill();
    ctx.stroke();
    const g = ctx.createLinearGradient(x - ew, eyeY - ew * 0.5, x + ew, eyeY + ew * 0.8);
    g.addColorStop(0, 'rgba(120,180,255,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,120,200,0.3)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#121214';
  };
  if (view === 'side') lens(ex, 0.9);
  else {
    lens(-ex);
    lens(ex);
    ctx.beginPath();
    ctx.moveTo(-ex + ew * 1.2, eyeY - ew * 0.4);
    ctx.lineTo(ex - ew * 1.2, eyeY - ew * 0.4);
    ctx.stroke();
  }
  return r;
}

function drawFacialHair(ctx, ch, r, h, lw, view) {
  const c = ch.colors;
  const side = view === 'side';
  if (ch.extras.includes('mustache')) {
    const y = h * 0.47;
    const x0 = side ? r * 0.82 : 0;
    ctx.fillStyle = shade(c.hair, -0.1);
    ctx.strokeStyle = shade(c.hair, -0.5);
    ctx.lineWidth = lw * 0.5;
    const half = (s) => {
      ctx.beginPath();
      ctx.moveTo(x0, y - r * 0.05);
      ctx.bezierCurveTo(x0 + s * r * 0.25, y - r * 0.12, x0 + s * r * 0.45, y + r * 0.04, x0 + s * r * 0.58, y - r * 0.12);
      ctx.bezierCurveTo(x0 + s * r * 0.66, y - r * 0.2, x0 + s * r * 0.6, y - r * 0.26, x0 + s * r * 0.54, y - r * 0.2);
      ctx.bezierCurveTo(x0 + s * r * 0.5, y + r * 0.12, x0 + s * r * 0.2, y + r * 0.08, x0, y + r * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    if (side) half(1);
    else {
      half(-1);
      half(1);
    }
  }
  if (ch.extras.includes('thinMustache')) {
    ctx.strokeStyle = shade(c.hair, -0.1);
    ctx.lineWidth = lw * 1.1;
    const x0 = side ? r * 0.85 : 0;
    ctx.beginPath();
    if (side) {
      ctx.moveTo(x0 - r * 0.15, h * 0.47);
      ctx.lineTo(x0 + r * 0.08, h * 0.46);
    } else {
      ctx.moveTo(-r * 0.26, h * 0.49);
      ctx.quadraticCurveTo(-r * 0.1, h * 0.45, 0, h * 0.47);
      ctx.quadraticCurveTo(r * 0.1, h * 0.45, r * 0.26, h * 0.49);
    }
    ctx.stroke();
  }
  if (ch.extras.includes('scruff')) {
    ctx.fillStyle = shade(c.hair, -0.12);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    if (side) {
      ctx.moveTo(r * 0.72, h * 0.48);
      ctx.quadraticCurveTo(r * 0.86, h * 0.42, r * 0.99, h * 0.46);
      ctx.lineTo(r * 0.95, h * 0.51);
      ctx.quadraticCurveTo(r * 0.84, h * 0.49, r * 0.72, h * 0.53);
      ctx.closePath();
      ctx.moveTo(r * 0.62, h * 0.74);
      ctx.quadraticCurveTo(r * 0.84, h * 0.7, r * 0.9, h * 0.74);
      ctx.quadraticCurveTo(r * 0.86, h * 0.95, r * 0.62, h * 0.94);
      ctx.closePath();
    } else {
      ctx.moveTo(-r * 0.33, h * 0.53);
      ctx.quadraticCurveTo(-r * 0.2, h * 0.41, 0, h * 0.44);
      ctx.quadraticCurveTo(r * 0.2, h * 0.41, r * 0.33, h * 0.53);
      ctx.quadraticCurveTo(r * 0.18, h * 0.49, 0, h * 0.5);
      ctx.quadraticCurveTo(-r * 0.18, h * 0.49, -r * 0.33, h * 0.53);
      ctx.closePath();
      ctx.moveTo(-r * 0.22, h * 0.73);
      ctx.quadraticCurveTo(0, h * 0.68, r * 0.22, h * 0.73);
      ctx.quadraticCurveTo(r * 0.17, h * 0.99, 0, h * 1.01);
      ctx.quadraticCurveTo(-r * 0.17, h * 0.99, -r * 0.22, h * 0.73);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (ch.extras.includes('beard')) {
    ctx.fillStyle = shade(c.hair, -0.05);
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    if (side) {
      ctx.moveTo(r * 0.2, h * 0.3);
      ctx.quadraticCurveTo(r * 0.3, h * 1.1, r * 0.85, h * 0.95);
      ctx.quadraticCurveTo(r * 0.95, h * 0.75, r * 0.8, h * 0.62);
      ctx.quadraticCurveTo(r * 0.5, h * 0.7, r * 0.2, h * 0.3);
    } else {
      ctx.moveTo(-r * 0.92, h * 0.1);
      ctx.quadraticCurveTo(-r * 0.9, h * 0.8, -r * 0.3, h * 1.05);
      ctx.quadraticCurveTo(0, h * 1.18, r * 0.3, h * 1.05);
      ctx.quadraticCurveTo(r * 0.9, h * 0.8, r * 0.92, h * 0.1);
      ctx.quadraticCurveTo(r * 0.7, h * 0.6, r * 0.32, h * 0.66);
      ctx.quadraticCurveTo(0, h * 0.74, -r * 0.32, h * 0.66);
      ctx.quadraticCurveTo(-r * 0.7, h * 0.6, -r * 0.92, h * 0.1);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = shade(c.hair, -0.35);
    ctx.lineWidth = lw * 0.4;
    for (let k = 0; k < 9; k++) {
      const x = side ? r * (0.3 + k * 0.06) : -r * 0.7 + k * r * 0.17;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.75);
      ctx.lineTo(x + r * 0.02, h * 0.92);
      ctx.stroke();
    }
  }
}

function drawHairBack(ctx, ch, r, h, lw) {
  const c = ch.colors;
  ctx.fillStyle = shade(c.hair, -0.1);
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw * 0.8;
  const style = hairStyleOf(ch);
  if (style === 'bun') {
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.25, r * 1.18, h * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else if (style === 'long') {
    // long straight hair falling past the shoulders
    ctx.fillStyle = vgrad(ctx, -h, h * 2, shade(c.hair, -0.05), shade(c.hair, -0.22));
    ctx.beginPath();
    ctx.moveTo(0, -h * 1.08);
    ctx.bezierCurveTo(r * 1.25, -h * 1.05, r * 1.32, -h * 0.2, r * 1.28, h * 0.8);
    ctx.quadraticCurveTo(r * 1.36, h * 1.6, r * 1.08, h * 2.05);
    ctx.lineTo(-r * 1.08, h * 2.05);
    ctx.quadraticCurveTo(-r * 1.36, h * 1.6, -r * 1.28, h * 0.8);
    ctx.bezierCurveTo(-r * 1.32, -h * 0.2, -r * 1.25, -h * 1.05, 0, -h * 1.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (style === 'side') {
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.32, r * 1.06, h * 0.75, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }
}

function drawHairFront(ctx, ch, r, h, lw, t) {
  const c = ch.colors;
  const hair = c.hair;
  const strands = (pts, color = shade(hair, -0.3)) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw * 0.45;
    pts.forEach(([x0, y0, x1, y1, cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    });
  };
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw * 0.7;
  const style = hairStyleOf(ch);
  if (style === 'messy') {
    // tousled: a mop with tufts on top and choppy bangs
    ctx.fillStyle = vgrad(ctx, -h * 1.2, -h * 0.3, shade(hair, 0.16), shade(hair, -0.12));
    ctx.beginPath();
    ctx.moveTo(-r * 1.02, -h * 0.08);
    ctx.bezierCurveTo(-r * 1.2, -h * 0.82, -r * 0.55, -h * 1.16, -r * 0.05, -h * 1.1);
    ctx.quadraticCurveTo(r * 0.12, -h * 1.3, r * 0.3, -h * 1.1);
    ctx.quadraticCurveTo(r * 0.58, -h * 1.24, r * 0.66, -h * 1.0);
    ctx.bezierCurveTo(r * 1.08, -h * 0.9, r * 1.12, -h * 0.42, r * 1.0, -h * 0.08);
    ctx.quadraticCurveTo(r * 0.93, -h * 0.42, r * 0.72, -h * 0.5);
    ctx.quadraticCurveTo(r * 0.6, -h * 0.34, r * 0.4, -h * 0.5);
    ctx.quadraticCurveTo(r * 0.2, -h * 0.38, 0, -h * 0.55);
    ctx.quadraticCurveTo(-r * 0.22, -h * 0.4, -r * 0.42, -h * 0.56);
    ctx.quadraticCurveTo(-r * 0.66, -h * 0.42, -r * 0.82, -h * 0.5);
    ctx.quadraticCurveTo(-r * 0.97, -h * 0.4, -r * 1.02, -h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    strands([
      [-r * 0.7, -h * 0.75, r * 0.1, -h * 0.95, -r * 0.35, -h * 1.0],
      [-r * 0.2, -h * 0.7, r * 0.6, -h * 0.8, r * 0.25, -h * 0.98],
      [r * 0.5, -h * 0.62, r * 0.85, -h * 0.35, r * 0.85, -h * 0.65],
      [-r * 0.85, -h * 0.6, -r * 0.6, -h * 0.85, -r * 0.92, -h * 0.85],
    ]);
    return;
  }
  if (style === 'short') {
    // close crop that hugs the skull
    ctx.fillStyle = vgrad(ctx, -h * 1.1, -h * 0.4, shade(hair, 0.18), shade(hair, -0.05));
    ctx.beginPath();
    ctx.moveTo(-r * 0.99, -h * 0.18);
    ctx.bezierCurveTo(-r * 1.12, -h * 1.33, r * 1.12, -h * 1.36, r * 0.99, -h * 0.18);
    ctx.quadraticCurveTo(r * 0.92, -h * 0.44, r * 0.6, -h * 0.58);
    ctx.quadraticCurveTo(r * 0.2, -h * 0.68, -r * 0.1, -h * 0.64);
    ctx.quadraticCurveTo(-r * 0.62, -h * 0.6, -r * 0.88, -h * 0.44);
    ctx.quadraticCurveTo(-r * 0.97, -h * 0.34, -r * 0.99, -h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    strands([
      [-r * 0.5, -h * 0.78, r * 0.3, -h * 0.84, -r * 0.1, -h * 0.94],
      [r * 0.05, -h * 0.72, r * 0.7, -h * 0.6, r * 0.45, -h * 0.82],
    ], shade(hair, 0.25));
    return;
  }
  if (style === 'long') {
    // centre part, curtains framing the face and covering the ears
    ctx.fillStyle = vgrad(ctx, -h * 1.1, h * 1.2, shade(hair, 0.14), shade(hair, -0.12));
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.04, -h * 1.05);
      ctx.bezierCurveTo(s * r * 0.72, -h * 1.08, s * r * 1.14, -h * 0.7, s * r * 1.13, -h * 0.05);
      ctx.quadraticCurveTo(s * r * 1.18, h * 0.6, s * r * 1.02, h * 1.3);
      ctx.quadraticCurveTo(s * r * 0.9, h * 0.5, s * r * 0.86, -h * 0.05);
      ctx.quadraticCurveTo(s * r * 0.78, -h * 0.5, s * r * 0.36, -h * 0.68);
      ctx.quadraticCurveTo(s * r * 0.14, -h * 0.8, s * r * 0.04, -h * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      strands([
        [s * r * 0.15, -h * 0.98, s * r * 1.0, -h * 0.1, s * r * 0.85, -h * 0.85],
        [s * r * 1.0, h * 0.0, s * r * 0.98, h * 1.0, s * r * 1.08, h * 0.5],
      ]);
    });
    return;
  }
  if (style === 'bun') {
    ctx.fillStyle = vgrad(ctx, -h, -h * 0.1, shade(hair, 0.15), shade(hair, -0.1));
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.98);
      ctx.bezierCurveTo(s * r * 0.6, -h * 1.02, s * r * 1.15, -h * 0.65, s * r * 1.08, -h * 0.05);
      ctx.quadraticCurveTo(s * r * 0.95, -h * 0.35, s * r * 0.55, -h * 0.52);
      ctx.quadraticCurveTo(s * r * 0.25, -h * 0.62, 0, -h * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      strands([
        [s * r * 0.05, -h * 0.9, s * r * 0.9, -h * 0.25, s * r * 0.7, -h * 0.85],
        [s * r * 0.1, -h * 0.75, s * r * 0.75, -h * 0.4, s * r * 0.55, -h * 0.75],
      ]);
    });
    return;
  }
  if (style === 'kid') {
    ctx.fillStyle = hair;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.26 - r * 0.15, -h * 0.55);
      ctx.quadraticCurveTo(i * r * 0.26 + Math.sin(i + t) * r * 0.05, -h * 0.25, i * r * 0.26 + r * 0.14, -h * 0.55);
      ctx.fill();
    }
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.86, -h * 0.5);
      ctx.quadraticCurveTo(s * r * 1.08, -h * 0.2, s * r * 0.9, h * 0.0);
      ctx.lineTo(s * r * 0.8, -h * 0.35);
      ctx.fill();
    });
    return;
  }
  if (style === 'slick') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-r * 0.98, -h * 0.05);
    ctx.quadraticCurveTo(-r * 1.0, -h * 0.75, -r * 0.2, -h * 0.82);
    ctx.quadraticCurveTo(r * 0.8, -h * 0.85, r * 0.98, -h * 0.1);
    ctx.quadraticCurveTo(r * 0.8, -h * 0.52, r * 0.3, -h * 0.58);
    ctx.quadraticCurveTo(-r * 0.4, -h * 0.66, -r * 0.8, -h * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(hair, 0.25);
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -h * 0.7, r * 0.35, h * 0.05, -0.2, 0, TAU);
    ctx.fill();
    [-1, 1].forEach((s) => {
      ctx.fillStyle = hair;
      ctx.fillRect(s * r * 0.96 - (s > 0 ? r * 0.12 : 0), -h * 0.2, r * 0.12, h * 0.4);
    });
    return;
  }
  ctx.fillStyle = vgrad(ctx, -h, -h * 0.3, shade(hair, 0.12), shade(hair, -0.15));
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, -h * 0.05);
  ctx.bezierCurveTo(-r * 1.15, -h * 0.9, r * 0.2, -h * 1.15, r * 1.0, -h * 0.55);
  ctx.quadraticCurveTo(r * 1.05, -h * 0.3, r * 0.98, -h * 0.05);
  ctx.quadraticCurveTo(r * 0.85, -h * 0.5, r * 0.45, -h * 0.55);
  for (let i = 0; i < 5; i++) {
    const x = r * 0.45 - i * r * 0.32;
    ctx.quadraticCurveTo(x - r * 0.08, -h * (0.42 + (i % 2) * 0.1), x - r * 0.32, -h * 0.58);
  }
  ctx.quadraticCurveTo(-r * 0.95, -h * 0.5, -r * 1.0, -h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  strands([
    [-r * 0.6, -h * 0.85, r * 0.4, -h * 0.75, -r * 0.1, -h * 1.0],
    [-r * 0.8, -h * 0.55, -r * 0.2, -h * 0.85, -r * 0.6, -h * 0.85],
  ]);
}

function drawHat(ctx, ch, r, h, lw, t, view) {
  const c = ch.colors;
  const side = view === 'side';
  ctx.lineWidth = lw;
  ctx.strokeStyle = SOFT;
  switch (ch.hat) {
    case 'victorian': {
      const by = -h * 0.66;
      ctx.fillStyle = vgrad(ctx, by - h * 0.2, by + h * 0.2, shade(c.hat, 0.2), c.hat);
      ctx.beginPath();
      ctx.ellipse(side ? -r * 0.1 : 0, by, r * 1.6, h * 0.2, side ? -0.12 : 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = hgrad(ctx, -r * 0.8, r * 0.8, c.hat);
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, by - h * 0.04);
      ctx.bezierCurveTo(-r * 0.86, by - h * 0.75, r * 0.86, by - h * 0.75, r * 0.78, by - h * 0.04);
      ctx.quadraticCurveTo(0, by + h * 0.08, -r * 0.78, by - h * 0.04);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.hatBand;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, by - h * 0.1);
      ctx.quadraticCurveTo(0, by - h * 0.02, r * 0.8, by - h * 0.1);
      ctx.lineTo(r * 0.8, by - h * 0.24);
      ctx.quadraticCurveTo(0, by - h * 0.16, -r * 0.8, by - h * 0.24);
      ctx.fill();
      ctx.strokeStyle = '#efe4f5';
      ctx.lineWidth = lw * 0.6;
      const fx = r * 0.45;
      const fy = by - h * 0.2;
      const tipx = r * 1.6 + Math.sin(t * 3) * r * 0.08;
      const tipy = by - h * 0.95;
      for (let k = 0; k < 14; k++) {
        const u = k / 14;
        const px = fx + (tipx - fx) * u;
        const py = fy + (tipy - fy) * u - Math.sin(u * Math.PI) * h * 0.25;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + r * 0.18, py + h * 0.1);
        ctx.moveTo(px, py);
        ctx.lineTo(px - r * 0.1, py - h * 0.12);
        ctx.stroke();
      }
      [[-0.5, '#c2185b'], [-0.18, '#8e44ad'], [0.15, '#e8a020']].forEach(([x, col]) => {
        const g = ctx.createRadialGradient(x * r, by - h * 0.18, 0, x * r, by - h * 0.18, r * 0.16);
        g.addColorStop(0, shade(col, 0.3));
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x * r, by - h * 0.18, r * 0.15, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = shade(col, -0.4);
        ctx.lineWidth = lw * 0.4;
        ctx.beginPath();
        ctx.arc(x * r, by - h * 0.18, r * 0.08, 0, Math.PI * 1.5);
        ctx.stroke();
      });
      break;
    }
    case 'cap': {
      ctx.fillStyle = hgrad(ctx, -r, r, c.hat);
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -h * 0.4);
      ctx.bezierCurveTo(-r * 1.0, -h * 1.15, r * 1.0, -h * 1.15, r * 1.0, -h * 0.4);
      ctx.quadraticCurveTo(0, -h * 0.5, -r * 1.0, -h * 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shade(c.hat, -0.3);
      ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -h * 1.0);
      ctx.lineTo(0, -h * 0.46);
      ctx.moveTo(-r * 0.55, -h * 0.88);
      ctx.quadraticCurveTo(-r * 0.6, -h * 0.6, -r * 0.62, -h * 0.44);
      ctx.moveTo(r * 0.55, -h * 0.88);
      ctx.quadraticCurveTo(r * 0.6, -h * 0.6, r * 0.62, -h * 0.44);
      ctx.stroke();
      ctx.fillStyle = shade(c.hat, -0.25);
      ctx.beginPath();
      if (side) ctx.ellipse(-r * 1.05, -h * 0.5, r * 0.55, h * 0.1, 0.25, 0, TAU);
      else ctx.ellipse(0, -h * 1.0, r * 0.62, h * 0.14, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = c.hatBand;
      ctx.beginPath();
      ctx.arc(0, -h * 1.05, r * 0.08, 0, TAU);
      ctx.fill();
      break;
    }
    case 'bowler': {
      ctx.fillStyle = vgrad(ctx, -h * 0.7, -h * 0.55, shade(c.hat, 0.2), c.hat);
      ctx.beginPath();
      ctx.moveTo(-r * 1.18, -h * 0.5);
      ctx.quadraticCurveTo(0, -h * 0.72, r * 1.18, -h * 0.5);
      ctx.quadraticCurveTo(r * 1.25, -h * 0.62, r * 1.05, -h * 0.66);
      ctx.quadraticCurveTo(0, -h * 0.8, -r * 1.05, -h * 0.66);
      ctx.quadraticCurveTo(-r * 1.25, -h * 0.62, -r * 1.18, -h * 0.5);
      ctx.fill();
      ctx.stroke();
      const g = ctx.createRadialGradient(-r * 0.3, -h * 1.15, r * 0.1, 0, -h * 0.85, r * 1.0);
      g.addColorStop(0, shade(c.hat, 0.35));
      g.addColorStop(1, c.hat);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -h * 0.68);
      ctx.bezierCurveTo(-r * 0.85, -h * 1.35, r * 0.85, -h * 1.35, r * 0.8, -h * 0.68);
      ctx.quadraticCurveTo(0, -h * 0.75, -r * 0.8, -h * 0.68);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.hatBand;
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -h * 0.72);
      ctx.quadraticCurveTo(0, -h * 0.8, r * 0.82, -h * 0.72);
      ctx.lineTo(r * 0.83, -h * 0.82);
      ctx.quadraticCurveTo(0, -h * 0.9, -r * 0.83, -h * 0.82);
      ctx.fill();
      break;
    }
    case 'beanie': {
      // knit beanie pulled low, folded cuff with a little label
      const ox = side ? -r * 0.08 : 0;
      const top = -h * 1.17;
      const cuffTop = -h * 0.66;
      const cuffBot = -h * 0.38;
      ctx.fillStyle = hgrad(ctx, -r + ox, r + ox, c.hat);
      ctx.beginPath();
      ctx.moveTo(ox - r * 1.04, cuffTop + h * 0.04);
      ctx.bezierCurveTo(ox - r * 1.1, top, ox + r * 1.1, top, ox + r * 1.04, cuffTop + h * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = shade(c.hat, -0.28);
      ctx.lineWidth = lw * 0.45;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(ox + k * r * 0.27, cuffTop);
        ctx.quadraticCurveTo(ox + k * r * 0.24, -h * 0.95, ox + k * r * 0.1, -h * 1.12);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = vgrad(ctx, cuffTop, cuffBot, shade(c.hatBand, 0.12), c.hatBand);
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(ox - r * 1.1, cuffTop);
      ctx.quadraticCurveTo(ox, cuffTop - h * 0.1, ox + r * 1.1, cuffTop);
      ctx.lineTo(ox + r * 1.08, cuffBot);
      ctx.quadraticCurveTo(ox, cuffBot - h * 0.08, ox - r * 1.08, cuffBot);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shade(c.hatBand, -0.3);
      ctx.lineWidth = lw * 0.4;
      for (let k = -9; k <= 9; k++) {
        ctx.beginPath();
        ctx.moveTo(ox + k * r * 0.11, cuffTop - h * 0.02 - (1 - Math.abs(k / 9)) * h * 0.07);
        ctx.lineTo(ox + k * r * 0.11, cuffBot - h * 0.01 - (1 - Math.abs(k / 9)) * h * 0.06);
        ctx.stroke();
      }
      ctx.fillStyle = '#d9dde4';
      ctx.strokeStyle = 'rgba(30,30,40,0.6)';
      const lx = side ? ox + r * 0.35 : -r * 0.5;
      ctx.fillRect(lx, (cuffTop + cuffBot) / 2 - h * 0.1, r * 0.42, h * 0.08);
      ctx.strokeRect(lx, (cuffTop + cuffBot) / 2 - h * 0.1, r * 0.42, h * 0.08);
      break;
    }
    case 'beret': {
      const g = ctx.createRadialGradient(-r * 0.2, -h * 0.95, r * 0.1, 0, -h * 0.8, r * 1.2);
      g.addColorStop(0, shade(c.hat, 0.25));
      g.addColorStop(1, c.hat);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -h * 0.55);
      ctx.bezierCurveTo(-r * 1.25, -h * 1.0, r * 0.8, -h * 1.25, r * 1.25, -h * 0.75);
      ctx.quadraticCurveTo(r * 1.1, -h * 0.55, r * 0.85, -h * 0.58);
      ctx.quadraticCurveTo(0, -h * 0.68, -r * 0.95, -h * 0.55);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -h * 1.0);
      ctx.lineTo(r * 0.14, -h * 1.12);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function drawHumanProfile(ctx, ch, r, expr, t, lw) {
  const c = ch.colors;
  const kid = ch.id === 'timmy';
  const h = r * (kid ? 1.12 : 1.27);
  const hs = hairStyleOf(ch);
  ctx.fillStyle = shade(c.hair, -0.1);
  if (hs === 'bun') {
    ctx.beginPath();
    ctx.arc(-r * 0.7, -h * 0.45, r * 0.42, 0, TAU);
    ctx.fill();
  }
  if (hs === 'long') {
    // hair hanging down the back to the shoulders
    ctx.fillStyle = vgrad(ctx, -h, h * 2, shade(c.hair, -0.05), shade(c.hair, -0.25));
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -h * 1.02);
    ctx.bezierCurveTo(-r * 1.3, -h * 1.0, -r * 1.45, h * 0.6, -r * 1.25, h * 1.9);
    ctx.lineTo(-r * 0.25, h * 1.95);
    ctx.quadraticCurveTo(-r * 0.4, h * 0.9, -r * 0.2, h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, h * 0.85);
  ctx.bezierCurveTo(-r * 1.15, h * 0.7, -r * 1.2, -h * 0.9, -r * 0.1, -h * 1.0);
  ctx.bezierCurveTo(r * 0.6, -h * 1.02, r * 0.95, -h * 0.55, r * 0.95, -h * 0.25);
  ctx.lineTo(r * 0.9, -h * 0.08);
  ctx.quadraticCurveTo(r * 1.12, h * 0.18, r * 1.15, h * 0.3);
  ctx.lineTo(r * 0.95, h * 0.36);
  ctx.quadraticCurveTo(r * 1.0, h * 0.44, r * 0.97, h * 0.5);
  ctx.lineTo(r * 0.92, h * 0.56);
  ctx.quadraticCurveTo(r * 0.98, h * 0.62, r * 0.92, h * 0.7);
  ctx.quadraticCurveTo(r * 0.95, h * 0.92, r * 0.62, h * 0.96);
  ctx.quadraticCurveTo(r * 0.3, h * 0.98, -r * 0.15, h * 0.85);
  ctx.closePath();
  const g = ctx.createRadialGradient(r * 0.3, -h * 0.2, r * 0.1, 0, 0, r * 1.4);
  g.addColorStop(0, shade(c.skin, 0.12));
  g.addColorStop(0.65, c.skin);
  g.addColorStop(1, shade(c.skin, -0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = shade(c.skin, -0.06);
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, h * 0.08, r * 0.17, h * 0.2, 0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(c.skin, -0.32);
  ctx.lineWidth = lw * 0.5;
  ctx.beginPath();
  ctx.arc(-r * 0.1, h * 0.08, r * 0.09, -1.2, 1.6);
  ctx.stroke();
  const ey = -h * 0.05;
  const iris = EYES[ch.id] || EYES.tourist;
  if (expr === 'cool' || (ch.extras.includes('sunglasses') && expr !== 'ko')) drawSunglasses(ctx, r, ey, r * 0.62, r * 0.22, lw, 'side');
  else {
    ctx.save();
    ctx.translate(r * 0.62, ey);
    const wide = expr === 'terrified' || expr === 'scream' ? 1.35 : 1;
    const ew = r * 0.17;
    const eh = r * 0.09 * wide;
    if (expr === 'hurt') {
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-ew, 0);
      ctx.lineTo(ew, eh * 0.3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f7f2ec';
      ctx.beginPath();
      ctx.moveTo(-ew, 0);
      ctx.quadraticCurveTo(0, -eh * 1.6, ew, -eh * 0.2);
      ctx.quadraticCurveTo(0, eh * 1.3, -ew, 0);
      ctx.fill();
      const iy = expr === 'ko' ? -eh : 0;
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(ew * 0.35, iy, eh * (wide > 1 ? 0.75 : 0.95), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0e0a0a';
      ctx.beginPath();
      ctx.arc(ew * 0.45, iy, eh * 0.45, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2a1414';
      ctx.lineWidth = lw * 1.05;
      ctx.beginPath();
      ctx.moveTo(-ew, 0);
      ctx.quadraticCurveTo(0, -eh * 1.7 + (expr === 'ko' ? eh * 1.2 : 0), ew * 1.05, -eh * 0.25);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = shade(c.hair, -0.25);
    const lift = expr === 'terrified' || expr === 'scream' ? -h * 0.07 : 0;
    ctx.beginPath();
    ctx.moveTo(r * 0.42, ey - h * 0.18 + lift);
    ctx.quadraticCurveTo(r * 0.65, ey - h * 0.27 + lift, r * 0.86, ey - h * 0.18 + lift + (expr === 'determined' ? h * 0.05 : 0));
    ctx.lineTo(r * 0.84, ey - h * 0.14 + lift);
    ctx.quadraticCurveTo(r * 0.65, ey - h * 0.21 + lift, r * 0.44, ey - h * 0.14 + lift);
    ctx.closePath();
    ctx.fill();
  }
  if (ch.extras.includes('glasses') && expr !== 'cool') {
    ctx.strokeStyle = ch.glasses || '#8a7650';
    ctx.lineWidth = lw * (ch.glasses ? 0.9 : 0.6);
    ctx.beginPath();
    ctx.ellipse(r * 0.66, ey, r * 0.2, r * 0.17, 0, 0, TAU);
    ctx.moveTo(r * 0.46, ey - r * 0.02);
    ctx.lineTo(-r * 0.08, ey + h * 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = shade(c.skin, -0.4);
  ctx.beginPath();
  ctx.ellipse(r * 0.98, h * 0.31, r * 0.05, r * 0.025, 0.3, 0, TAU);
  ctx.fill();
  if (expr === 'terrified' || expr === 'scream' || expr === 'ko') {
    const open = expr === 'scream' ? 1.3 : expr === 'ko' ? 0.7 : 1;
    ctx.fillStyle = '#2a0608';
    ctx.beginPath();
    ctx.moveTo(r * 0.98, h * 0.44);
    ctx.quadraticCurveTo(r * 0.7, h * (0.52 + 0.08 * open), r * 0.96, h * (0.62 + 0.14 * open));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2ece0';
    ctx.fillRect(r * 0.86, h * 0.44, r * 0.1, h * 0.04);
  } else {
    ctx.strokeStyle = LIP(c.skin);
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(r * 0.97, h * 0.53);
    ctx.lineTo(r * 0.8, h * (expr === 'happy' ? 0.5 : 0.55));
    ctx.stroke();
    if (ch.extras.includes('cigarette') && expr !== 'hurt') drawCigarette(ctx, r * 0.94, h * 0.54, 0.25, r, lw, t);
  }
  if (ch.id === 'annie') {
    ctx.strokeStyle = 'rgba(110,60,50,0.35)';
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.82, h * 0.35);
    ctx.quadraticCurveTo(r * 0.7, h * 0.45, r * 0.74, h * 0.58);
    ctx.stroke();
  }
  drawFacialHair(ctx, ch, r, h, lw, 'side');
  ctx.fillStyle = vgrad(ctx, -h, 0, shade(c.hair, 0.12), shade(c.hair, -0.12));
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  if (kid) {
    ctx.moveTo(-r * 0.9, h * 0.1);
    ctx.bezierCurveTo(-r * 1.2, -h * 0.9, r * 0.4, -h * 1.15, r * 0.85, -h * 0.5);
    ctx.lineTo(r * 0.5, -h * 0.45);
    ctx.lineTo(r * 0.35, -h * 0.3);
    ctx.lineTo(r * 0.1, -h * 0.45);
    ctx.quadraticCurveTo(-r * 0.4, -h * 0.4, -r * 0.5, h * 0.05);
  } else if (hs === 'messy') {
    ctx.moveTo(-r * 0.98, h * 0.15);
    ctx.bezierCurveTo(-r * 1.32, -h * 0.7, -r * 0.7, -h * 1.12, -r * 0.2, -h * 1.1);
    ctx.quadraticCurveTo(-r * 0.05, -h * 1.3, r * 0.15, -h * 1.08);
    ctx.quadraticCurveTo(r * 0.45, -h * 1.22, r * 0.5, -h * 1.0);
    ctx.quadraticCurveTo(r * 0.95, -h * 0.95, r * 0.98, -h * 0.42);
    ctx.quadraticCurveTo(r * 0.75, -h * 0.4, r * 0.62, -h * 0.55);
    ctx.quadraticCurveTo(r * 0.45, -h * 0.42, r * 0.25, -h * 0.55);
    ctx.quadraticCurveTo(-r * 0.25, -h * 0.5, -r * 0.35, -h * 0.05);
    ctx.quadraticCurveTo(-r * 0.4, h * 0.2, -r * 0.6, h * 0.28);
  } else if (hs === 'short') {
    ctx.moveTo(-r * 0.92, h * 0.05);
    ctx.bezierCurveTo(-r * 1.28, -h * 1.18, r * 0.45, -h * 1.34, r * 0.86, -h * 0.5);
    ctx.quadraticCurveTo(r * 0.5, -h * 0.6, r * 0.2, -h * 0.58);
    ctx.quadraticCurveTo(-r * 0.2, -h * 0.52, -r * 0.3, -h * 0.1);
    ctx.quadraticCurveTo(-r * 0.4, h * 0.1, -r * 0.55, h * 0.12);
  } else if (hs === 'long') {
    ctx.moveTo(-r * 0.95, h * 0.5);
    ctx.bezierCurveTo(-r * 1.3, -h * 0.95, r * 0.5, -h * 1.18, r * 0.9, -h * 0.4);
    ctx.quadraticCurveTo(r * 0.55, -h * 0.65, r * 0.15, -h * 0.55);
    ctx.quadraticCurveTo(-r * 0.15, -h * 0.4, -r * 0.2, h * 0.1);
    ctx.quadraticCurveTo(-r * 0.3, h * 0.45, -r * 0.6, h * 0.55);
  } else {
    ctx.moveTo(-r * 0.95, h * (hs === 'bun' ? 0.3 : 0.2));
    ctx.bezierCurveTo(-r * 1.25, -h * 0.95, r * 0.5, -h * 1.15, r * 0.88, -h * 0.45);
    ctx.quadraticCurveTo(r * 0.5, -h * 0.62, r * 0.2, -h * 0.55);
    ctx.quadraticCurveTo(-r * 0.25, -h * 0.5, -r * 0.35, -h * 0.05);
    ctx.quadraticCurveTo(-r * 0.4, h * 0.2, -r * 0.6, h * 0.25);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawHat(ctx, ch, r, h, lw, t, 'side');
}

// ---------------------------------------------------------------- giraffe head
function drawGiraffeHead(ctx, ch, r, { expr, t, view, lw }) {
  const c = ch.colors;
  const side = view === 'side';
  ctx.lineWidth = lw;
  ctx.strokeStyle = SOFT;
  ctx.lineJoin = 'round';
  [-1, 1].forEach((s) => {
    if (side && s > 0) return;
    const x = side ? -r * 0.15 : s * r * 0.32;
    taper(ctx, { x, y: -r * 0.55 }, { x: x + (side ? -r * 0.1 : s * r * 0.08), y: -r * 1.25 }, r * 0.2, r * 0.14, c.skin, lw);
    ctx.fillStyle = '#3a2416';
    ctx.beginPath();
    ctx.ellipse(x + (side ? -r * 0.1 : s * r * 0.08), -r * 1.3, r * 0.12, r * 0.09, 0, 0, TAU);
    ctx.fill();
  });
  [-1, 1].forEach((s) => {
    if (side && s > 0) return;
    const d = side ? -1 : s;
    ctx.save();
    ctx.translate(side ? -r * 0.55 : s * r * 0.85, -r * 0.42);
    ctx.rotate(side ? -0.6 : s * 0.45);
    ctx.fillStyle = c.skin;
    ctx.strokeStyle = SOFT;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.25 * d, -r * 0.22, r * 0.55 * d, 0);
    ctx.quadraticCurveTo(r * 0.25 * d, r * 0.16, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0b8c8';
    ctx.beginPath();
    ctx.ellipse(r * 0.26 * d, 0, r * 0.16, r * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  });
  const skull = () => {
    ctx.beginPath();
    if (side) {
      ctx.moveTo(-r * 0.75, -r * 0.2);
      ctx.bezierCurveTo(-r * 0.7, -r * 0.85, r * 0.3, -r * 0.8, r * 0.55, -r * 0.4);
      ctx.bezierCurveTo(r * 0.9, -r * 0.2, r * 1.45, -r * 0.05, r * 1.55, r * 0.3);
      ctx.bezierCurveTo(r * 1.6, r * 0.65, r * 1.1, r * 0.75, r * 0.7, r * 0.62);
      ctx.bezierCurveTo(r * 0.2, r * 0.55, -r * 0.6, r * 0.55, -r * 0.75, -r * 0.2);
    } else {
      ctx.moveTo(0, -r * 0.8);
      ctx.bezierCurveTo(r * 0.75, -r * 0.8, r * 0.85, -r * 0.1, r * 0.55, r * 0.55);
      ctx.bezierCurveTo(r * 0.45, r * 1.1, -r * 0.45, r * 1.1, -r * 0.55, r * 0.55);
      ctx.bezierCurveTo(-r * 0.85, -r * 0.1, -r * 0.75, -r * 0.8, 0, -r * 0.8);
    }
    ctx.closePath();
  };
  skull();
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.5);
  g.addColorStop(0, shade(c.skin, 0.2));
  g.addColorStop(1, shade(c.skin, -0.15));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.stroke();
  ctx.save();
  skull();
  ctx.clip();
  RAINBOW.slice(0, 5).forEach((col, i) => {
    ctx.fillStyle = col;
    const px = side ? -r * 0.4 + i * r * 0.22 : -r * 0.42 + (i % 3) * r * 0.4;
    const py = side ? -r * 0.45 + (i % 2) * r * 0.25 : -r * 0.55 + Math.floor(i / 3) * r * 0.3;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + i;
      ctx.lineTo(px + Math.cos(a) * r * 0.12, py + Math.sin(a) * r * 0.1);
    }
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  ctx.fillStyle = '#4a2a1a';
  if (side) {
    ctx.beginPath();
    ctx.ellipse(r * 1.42, r * 0.16, r * 0.07, r * 0.04, 0.4, 0, TAU);
    ctx.fill();
  } else {
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.2, r * 0.78, r * 0.06, r * 0.09, s * 0.3, 0, TAU);
      ctx.fill();
    });
  }
  ctx.strokeStyle = '#4a2a1a';
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  if (expr === 'terrified' || expr === 'scream' || expr === 'ko') {
    ctx.fillStyle = '#3a0a10';
    if (side) {
      ctx.moveTo(r * 1.5, r * 0.48);
      ctx.quadraticCurveTo(r * 1.0, r * 0.8, r * 0.8, r * 0.56);
      ctx.closePath();
    } else ctx.ellipse(0, r * 0.95, r * 0.22, r * 0.12 + Math.sin(t * 40) * r * 0.02, 0, 0, TAU);
    ctx.fill();
  } else if (side) {
    ctx.moveTo(r * 1.5, r * 0.5);
    ctx.quadraticCurveTo(r * 1.1, r * (expr === 'happy' ? 0.45 : 0.55), r * 0.9, r * 0.5);
    ctx.stroke();
  } else {
    ctx.moveTo(-r * 0.22, r * 0.95);
    ctx.quadraticCurveTo(0, r * (expr === 'happy' ? 1.05 : 0.97), r * 0.22, r * 0.95);
    ctx.stroke();
  }
  const eyes = side ? [r * 0.2] : [-r * 0.42, r * 0.42];
  eyes.forEach((x) => {
    const ey = side ? -r * 0.2 : -r * 0.18;
    const big = expr === 'terrified' || expr === 'scream' ? 1.25 : 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, ey, r * 0.17 * big, r * 0.14 * big, 0, 0, TAU);
    ctx.fill();
    if (expr === 'ko') {
      ctx.fillStyle = shade(c.skin, -0.1);
      ctx.fillRect(x - r * 0.2, ey - r * 0.16, r * 0.4, r * 0.15);
    } else {
      ctx.fillStyle = '#2a160c';
      ctx.beginPath();
      ctx.arc(x + (side ? r * 0.05 : 0), ey + r * 0.01, r * 0.11 * (big > 1 ? 0.6 : 1), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - r * 0.03, ey - r * 0.04, r * 0.035, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#1a0a06';
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.ellipse(x, ey, r * 0.17 * big, r * 0.14 * big, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.lineWidth = lw * 0.6;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.06, ey - r * 0.13 * big);
      ctx.lineTo(x + k * r * 0.09, ey - r * 0.26 * big);
      ctx.stroke();
    }
  });
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(side ? -r * 0.5 : 0, -r * 0.78, r * 0.22, r * 0.12, side ? -0.4 : 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------- upright bodies
function skeleton(ch, pose, t, o) {
  const s = ch.scale * (o.tiny ? 0.65 : 1);
  const P = (x, y) => ({ x: x * s, y: y * s });
  const hs = ch.headScale * (o.bigHead ? 1.9 : 1);
  const sk = {
    footL: P(-9, 0), footR: P(9, 0),
    kneeL: P(-9.5, -47), kneeR: P(9.5, -47),
    hipL: P(-10, -90), hipR: P(10, -90),
    pelvis: P(0, -92),
    shL: P(-19, -141), shR: P(19, -141),
    neck: P(0, -146),
    head: P(0, -146 - 13.5 * hs),
    headR: 9.8 * s * hs,
    s,
  };
  const bob = Math.sin(t * 2.2) * 1.2 * s;
  let aL = 0.18;
  let aR = 0.18;
  let bL = 0.12;
  let bR = 0.12;
  let legPhase = 0;
  let legAmt = 0;
  switch (pose) {
    case 'walk':
    case 'run': {
      const sp = pose === 'run' ? 14 : 9;
      legPhase = t * sp;
      legAmt = pose === 'run' ? 1 : 0.6;
      aL = 0.2 + Math.sin(legPhase) * 0.45 * legAmt;
      aR = 0.2 - Math.sin(legPhase) * 0.45 * legAmt;
      bL = bR = 0.55;
      break;
    }
    case 'cheer':
      aL = aR = 2.7 + Math.sin(t * 10) * 0.2;
      bL = bR = 0.2;
      break;
    case 'flail':
      aL = 1.6 + Math.sin(t * 19) * 1.1;
      aR = 1.6 + Math.sin(t * 17 + 2) * 1.1;
      bL = Math.sin(t * 23) * 0.9;
      bR = Math.sin(t * 21 + 1) * 0.9;
      legPhase = t * 20;
      legAmt = 0.8;
      break;
    case 'wave':
      aL = 0.25;
      aR = 2.5;
      bR = 0.4 + Math.sin(t * 12) * 0.5;
      break;
    case 'swim':
      aL = (t * 7) % TAU;
      aR = (t * 7 + Math.PI) % TAU;
      bL = bR = 0.3;
      break;
    case 'dog':
      aL = 1.4 + Math.sin(t * 9) * 0.5;
      aR = 1.4 + Math.sin(t * 9 + Math.PI) * 0.5;
      bL = bR = 1.2;
      break;
    case 'arms-out':
      aL = aR = 1.45 + Math.sin(t * 3) * 0.15;
      bL = bR = 0.1;
      break;
    case 'hold':
      aL = aR = 0.9;
      bL = bR = 1.3;
      break;
    case 'limp':
      aL = aR = 0.5;
      bL = bR = 0.3;
      break;
    default:
      break;
  }
  if (o.armL !== undefined) aL = o.armL;
  if (o.armR !== undefined) aR = o.armR;
  if (o.bendL !== undefined) bL = o.bendL;
  if (o.bendR !== undefined) bR = o.bendR;
  const up = 29 * s;
  const lo = 25 * s;
  const arm = (sh, a, b, side) => {
    const el = { x: sh.x + side * Math.sin(a) * up, y: sh.y + Math.cos(a) * up };
    const a2 = a + b;
    const hand = { x: el.x + side * Math.sin(a2) * lo, y: el.y + Math.cos(a2) * lo };
    return { el, hand };
  };
  const L = arm(sk.shL, aL, bL, -1);
  const R = arm(sk.shR, aR, bR, 1);
  sk.elL = L.el;
  sk.handL = L.hand;
  sk.elR = R.el;
  sk.handR = R.hand;
  if (legAmt) {
    const lift = (ph) => Math.max(0, Math.sin(ph)) * 10 * s * legAmt;
    sk.footL = { x: sk.footL.x, y: -lift(legPhase) };
    sk.footR = { x: sk.footR.x, y: -lift(legPhase + Math.PI) };
    sk.kneeL = { x: sk.kneeL.x - lift(legPhase) * 0.3, y: sk.kneeL.y - lift(legPhase) * 0.6 };
    sk.kneeR = { x: sk.kneeR.x + lift(legPhase + Math.PI) * 0.3, y: sk.kneeR.y - lift(legPhase + Math.PI) * 0.6 };
  }
  ['kneeL', 'kneeR', 'hipL', 'hipR', 'pelvis', 'shL', 'shR', 'neck', 'head', 'elL', 'elR', 'handL', 'handR'].forEach((k) => {
    sk[k] = { x: sk[k].x, y: sk[k].y + (k.startsWith('knee') ? bob * 0.3 : bob) };
  });
  return sk;
}

function drawHand(ctx, el, hd, w, skin, lw) {
  const ang = Math.atan2(hd.y - el.y, hd.x - el.x);
  ctx.save();
  ctx.translate(hd.x, hd.y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, shade(skin, 0.12));
  g.addColorStop(1, shade(skin, -0.25));
  ctx.fillStyle = g;
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.ellipse(w * 0.55, 0, w * 0.82, w * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(w * 0.4, -w * 0.55, w * 0.38, w * 0.2, -0.7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(skin, -0.35);
  ctx.lineWidth = lw * 0.4;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.9, k * w * 0.22);
    ctx.lineTo(w * 1.3, k * w * 0.24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShoe(ctx, f, side, color, lw, s, sneaker) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(side, 1);
  ctx.fillStyle = vgrad(ctx, -6 * s, 2 * s, shade(color, 0.25), shade(color, -0.2));
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-5 * s, -6 * s);
  ctx.quadraticCurveTo(-7 * s, 1 * s, -3 * s, 1.5 * s);
  ctx.lineTo(9 * s, 1.5 * s);
  ctx.quadraticCurveTo(12 * s, 0, 10 * s, -3 * s);
  ctx.quadraticCurveTo(6 * s, -5 * s, 4 * s, -7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sneaker ? '#f4f4f4' : shade(color, -0.5);
  ctx.fillRect(-5 * s, 0, 15 * s, 1.8 * s);
  if (sneaker) {
    ctx.strokeStyle = '#d02a2a';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-2 * s, -3 * s);
    ctx.lineTo(6 * s, -2 * s);
    ctx.stroke();
  }
  ctx.restore();
}

// Draws a character standing at the current origin. S = pixels per metre.
// opts: { pose, expr, t, cutY (cm, hide below), bigHead, tiny, lifejacket, armL/armR..., holding, lw }
export function drawUpright(ctx, ch, S, opts = {}) {
  const { pose = 'stand', expr = 'happy', t = 0 } = opts;
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = opts.lw ?? Math.max(1.6, 150 / S);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (ch.kind === 'giraffe') {
    drawGiraffeUpright(ctx, ch, lw, opts);
    ctx.restore();
    return undefined;
  }
  const sk = skeleton(ch, pose, t, opts);
  const c = ch.colors;
  const s = sk.s;
  if (opts.cutY !== undefined) {
    ctx.beginPath();
    ctx.rect(-400, -600, 800, 600 + opts.cutY);
    ctx.clip();
  }
  const kid = ch.id === 'timmy';
  const strong = ch.extras.includes('muscles');

  // ---- legs
  const thighW = (strong ? 17 : kid ? 11 : 14.5) * s;
  const calfW = (strong ? 12 : kid ? 8.5 : 10.5) * s;
  const ankle = 6.2 * s;
  if (!ch.dress) {
    const pants = c.pants;
    const shortsLeg = kid || ch.extras.includes('hawaiian');
    [[sk.hipL, sk.kneeL, sk.footL, -1], [sk.hipR, sk.kneeR, sk.footR, 1]].forEach(([hip, knee, foot, side]) => {
      const ankleP = { x: foot.x, y: foot.y - 6 * s };
      if (shortsLeg) {
        const mid = { x: (hip.x + knee.x) / 2, y: (hip.y + knee.y) / 2 + 6 * s };
        taper(ctx, mid, knee, thighW * 0.8, calfW, c.skin, lw);
        taper(ctx, knee, ankleP, calfW, ankle, c.skin, lw, { bulge: 1.5 * s });
        taper(ctx, hip, { x: mid.x, y: mid.y + 2 * s }, thighW * 1.15, thighW * 1.05, pants, lw);
      } else {
        taper(ctx, hip, knee, thighW, calfW * 1.05, pants, lw, { bulge: 1 * s });
        taper(ctx, knee, ankleP, calfW * 1.02, ankle * 1.2, pants, lw, { bulge: 1.5 * s });
        ctx.strokeStyle = shade(pants, -0.35);
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        ctx.moveTo(knee.x - side * 2 * s, knee.y - 3 * s);
        ctx.quadraticCurveTo(knee.x, knee.y + 1 * s, knee.x + side * 3 * s, knee.y - 2 * s);
        ctx.stroke();
      }
      drawShoe(ctx, foot, side, c.shoes, lw, s, kid);
    });
  } else {
    [[sk.footL, -1], [sk.footR, 1]].forEach(([f, side]) => drawShoe(ctx, f, side, c.shoes, lw, s, false));
  }

  // ---- torso
  const tw = (strong ? 48 : kid ? 34 : 40) * s;
  const top = sk.shL.y - 4 * s;
  const waist = (strong ? 17 : kid ? 14 : 15) * s;
  const hipW = (ch.dress ? 15 : kid ? 14 : 15.5) * s;
  const wy = sk.pelvis.y - 12 * s;
  const by = sk.pelvis.y + 5 * s;
  if (ch.dress) {
    const hem = -4 * s;
    const skW = 44 * s;
    ctx.fillStyle = hgrad(ctx, -skW, skW, c.shirt);
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-waist, wy);
    ctx.bezierCurveTo(-waist * 1.6, wy + 30 * s, -skW, hem - 30 * s, -skW, hem);
    for (let i = 0; i < 8; i++) {
      const x0 = -skW + (i * skW) / 4;
      ctx.quadraticCurveTo(x0 + skW / 8, hem + (i % 2 ? 4 : -1) * s, x0 + skW / 4, hem);
    }
    ctx.bezierCurveTo(skW, hem - 30 * s, waist * 1.6, wy + 30 * s, waist, wy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,20,0.28)';
    ctx.lineWidth = lw * 0.9;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * waist * 0.25, wy + 6 * s);
      ctx.quadraticCurveTo(i * skW * 0.2, wy + 40 * s, i * skW * 0.3, hem - 2 * s);
      ctx.stroke();
    }
    ctx.fillStyle = c.accent;
    ctx.fillRect(-skW * 0.98, hem - 9 * s, skW * 1.96, 3.5 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-skW * 0.98, hem - 5 * s, skW * 1.96, 1.5 * s);
  }
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(-tw * 0.18, top - 1 * s);
    ctx.quadraticCurveTo(-tw * 0.46, top - 1 * s, -tw * 0.53, top + 7 * s);
    ctx.quadraticCurveTo(-tw * 0.52, top + 22 * s, -waist, wy);
    ctx.quadraticCurveTo(-hipW * 1.05, wy + 8 * s, -hipW, by);
    ctx.lineTo(hipW, by);
    ctx.quadraticCurveTo(hipW * 1.05, wy + 8 * s, waist, wy);
    ctx.quadraticCurveTo(tw * 0.52, top + 22 * s, tw * 0.53, top + 7 * s);
    ctx.quadraticCurveTo(tw * 0.46, top - 1 * s, tw * 0.18, top - 1 * s);
    ctx.quadraticCurveTo(0, top + 5 * s, -tw * 0.18, top - 1 * s);
    ctx.closePath();
  };
  taper(ctx, { x: 0, y: sk.neck.y + 8 * s }, { x: 0, y: sk.neck.y - 4 * s }, 11 * s * (kid ? 0.95 : 1), 10 * s, c.skin, lw);
  torsoPath();
  ctx.fillStyle = hgrad(ctx, -tw * 0.55, tw * 0.55, c.shirt);
  ctx.fill();
  ctx.save();
  torsoPath();
  ctx.clip();
  if (ch.extras.includes('stripes') || ch.extras.includes('breton')) {
    ctx.fillStyle = c.shirt2;
    const step = ch.extras.includes('breton') ? 5.5 * s : 7.5 * s;
    for (let y = top + step * 0.6; y < by; y += step * 2) {
      ctx.beginPath();
      ctx.moveTo(-tw, y);
      ctx.quadraticCurveTo(0, y + 2 * s, tw, y);
      ctx.lineTo(tw, y + step);
      ctx.quadraticCurveTo(0, y + step + 2 * s, -tw, y + step);
      ctx.fill();
    }
  }
  if (ch.extras.includes('hawaiian')) {
    for (let i = 0; i < 10; i++) {
      const fx = (((i * 37) % 44) - 22) * s;
      const fy = top + ((i * 23) % 44) * s;
      ctx.fillStyle = i % 2 ? c.shirt2 : c.collar;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 2.6 * s, fy + Math.sin(a) * 2.6 * s, 2.2 * s, 1.4 * s, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath();
      ctx.arc(fx, fy, 1 * s, 0, TAU);
      ctx.fill();
    }
  }
  if (ch.dress) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = lw * 0.6;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3.2 * s, top + 8 * s);
      ctx.lineTo(i * 2.4 * s, wy);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(-waist * 0.9, wy - 6 * s);
  ctx.quadraticCurveTo(-waist * 0.3, wy - 2 * s, -waist * 0.1, wy - 8 * s);
  ctx.moveTo(tw * 0.3, top + 14 * s);
  ctx.quadraticCurveTo(tw * 0.2, top + 22 * s, tw * 0.32, top + 28 * s);
  ctx.stroke();
  ctx.restore();
  torsoPath();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.stroke();

  if (ch.dress) {
    ctx.fillStyle = c.collar;
    ctx.strokeStyle = 'rgba(80,80,90,0.6)';
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(-7 * s, sk.neck.y + 6 * s);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-7 * s + i * 1.75 * s, sk.neck.y + (i % 2 ? 1 : 3) * s - 4 * s);
    ctx.lineTo(7 * s, sk.neck.y + 6 * s);
    ctx.quadraticCurveTo(0, sk.neck.y + 11 * s, -7 * s, sk.neck.y + 6 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8d8b0';
    ctx.strokeStyle = '#a08040';
    ctx.beginPath();
    ctx.ellipse(0, sk.neck.y + 11 * s, 2.6 * s, 3.2 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8c48a';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, top + 16 * s + i * 7 * s, 1.3 * s, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = shade(c.shirt, -0.35);
    ctx.fillRect(-waist, wy - 3 * s, waist * 2, 4 * s);
  } else if (ch.extras.includes('hawaiian')) {
    ctx.fillStyle = shade(c.shirt, -0.1);
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.7;
    [-1, 1].forEach((sd) => {
      ctx.beginPath();
      ctx.moveTo(sd * 2 * s, top + 1 * s);
      ctx.lineTo(sd * 11 * s, top + 1 * s);
      ctx.lineTo(sd * 4 * s, top + 14 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else if (!kid) {
    ctx.fillStyle = shade(c.skin, -0.05);
    ctx.beginPath();
    ctx.moveTo(-5 * s, top);
    ctx.quadraticCurveTo(0, top + 7 * s, 5 * s, top);
    ctx.fill();
  }
  drawClothingDetails(ctx, ch, s, lw, { top, wy, by, tw, waist });
  if (ch.extras.includes('scarf')) {
    ctx.fillStyle = hgrad(ctx, -9 * s, 9 * s, c.collar);
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.ellipse(0, top + 1 * s, 10 * s, 4 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4 * s, top + 3 * s);
    ctx.quadraticCurveTo(10 * s + Math.sin(t * 6) * 2 * s, top + 12 * s, 9 * s + Math.sin(t * 6) * 3 * s, top + 22 * s);
    ctx.lineTo(4 * s + Math.sin(t * 6) * 3 * s, top + 21 * s);
    ctx.quadraticCurveTo(5 * s, top + 10 * s, 1 * s, top + 4 * s);
    ctx.fill();
    ctx.stroke();
  }
  if (ch.id === 'bobby') {
    ctx.fillStyle = '#2a1d16';
    ctx.fillRect(-waist * 1.05, wy - 2 * s, waist * 2.1, 6 * s);
    ctx.fillStyle = '#e8c04a';
    ctx.strokeStyle = '#8a6a1a';
    ctx.lineWidth = lw * 0.6;
    ctx.fillRect(-4 * s, wy - 2.5 * s, 8 * s, 7 * s);
    ctx.strokeRect(-4 * s, wy - 2.5 * s, 8 * s, 7 * s);
  }
  if (opts.lifejacket) {
    [-1, 1].forEach((sd) => {
      ctx.fillStyle = hgrad(ctx, sd * 2 * s, sd * tw * 0.55, '#ff7a1a');
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(sd * 3 * s, top - 1 * s);
      ctx.quadraticCurveTo(sd * tw * 0.5, top, sd * tw * 0.56, top + 8 * s);
      ctx.lineTo(sd * tw * 0.5, wy + 2 * s);
      ctx.lineTo(sd * 4 * s, wy + 2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(sd * tw * 0.25, top + 6 * s);
      ctx.lineTo(sd * tw * 0.25, wy);
      ctx.stroke();
    });
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-tw * 0.52, top + 22 * s, tw * 1.04, 3.5 * s);
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(-2.5 * s, top + 4 * s, 5 * s, 26 * s);
  }

  // ---- arms
  const upW = (strong ? 14 : kid ? 8.5 : 10.5) * s;
  const foreW = (strong ? 11.5 : kid ? 7 : 8.5) * s;
  const wrist = (strong ? 7.5 : 5.2) * s;
  const sleeves = sleevesOf(ch);
  const sleeveLo = sleeves === 'long' ? c.shirt : c.skin;
  [[sk.shL, sk.elL, sk.handL], [sk.shR, sk.elR, sk.handR]].forEach(([sh, el, hd]) => {
    if (ch.dress) {
      taper(ctx, sh, el, upW * 1.6, upW * 0.85, c.shirt, lw, { bulge: 3 * s });
    } else if (sleeves === 'short') {
      const mid = { x: sh.x + (el.x - sh.x) * 0.55, y: sh.y + (el.y - sh.y) * 0.55 };
      taper(ctx, mid, el, upW * 0.85, foreW * 1.05, c.skin, lw);
      taper(ctx, sh, mid, upW * 1.25, upW * 1.15, c.shirt, lw);
    } else if (sleeves === 'none') {
      taper(ctx, sh, el, upW, foreW * 1.02, c.skin, lw, { bulge: 2.5 * s });
    } else {
      taper(ctx, sh, el, upW, foreW * 1.02, c.shirt, lw, { bulge: 0.8 * s });
    }
    taper(ctx, el, hd, foreW, wrist, sleeveLo, lw, { bulge: strong ? 2 * s : 0.6 * s });
    if (ch.dress) {
      ctx.fillStyle = c.collar;
      ctx.beginPath();
      ctx.arc(hd.x, hd.y, wrist * 0.75, 0, TAU);
      ctx.fill();
    }
    drawHand(ctx, el, hd, wrist * 1.05, c.skin, lw);
  });
  if (kid && pose !== 'swim' && pose !== 'flail') {
    ctx.fillStyle = '#5ad16b';
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.7;
    ctx.fillRect(sk.handR.x - 3.5 * s, sk.handR.y - 11 * s, 7 * s, 10 * s);
    ctx.strokeRect(sk.handR.x - 3.5 * s, sk.handR.y - 11 * s, 7 * s, 10 * s);
    ctx.fillStyle = '#ffd23b';
    ctx.fillRect(sk.handR.x - 2.5 * s, sk.handR.y - 8 * s, 5 * s, 3 * s);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(sk.handR.x + 1.5 * s, sk.handR.y - 11 * s);
    ctx.lineTo(sk.handR.x + 3 * s, sk.handR.y - 17 * s);
    ctx.stroke();
  }
  if (opts.holding) opts.holding(ctx, sk, lw);

  ctx.save();
  ctx.translate(sk.head.x, sk.head.y);
  ctx.rotate(Math.sin(t * 1.7) * 0.04 + (pose === 'flail' ? Math.sin(t * 13) * 0.18 : 0));
  drawHead(ctx, ch, sk.headR, { expr, t, view: 'front', lw });
  ctx.restore();
  if (ch.extras.includes('stink')) drawStink(ctx, 0, (sk.neck.y + sk.pelvis.y) / 2, 34 * s, 70 * s, t, lw);
  ctx.restore();
  return sk;
}

export const sleevesOf = (ch) => ch.sleeves || (ch.id === 'bobby' ? 'none' : ch.id === 'timmy' || ch.extras.includes('hawaiian') ? 'short' : 'long');

// Necklines and trims for the band's everyday clothes (front view)
function drawClothingDetails(ctx, ch, s, lw, { top, wy, by, tw, waist }) {
  const c = ch.colors;
  const ex = ch.extras;
  ctx.lineJoin = 'round';
  if (ex.includes('tee') || ex.includes('sweater')) {
    // crew neck
    ctx.strokeStyle = shade(c.shirt, -0.28);
    ctx.lineWidth = (ex.includes('sweater') ? 3.4 : 2.2) * s;
    ctx.beginPath();
    ctx.moveTo(-6.5 * s, top + 0.5 * s);
    ctx.quadraticCurveTo(0, top + 8.5 * s, 6.5 * s, top + 0.5 * s);
    ctx.stroke();
  }
  if (ex.includes('sweater')) {
    // ribbed hem
    ctx.fillStyle = shade(c.shirt, -0.12);
    ctx.fillRect(-waist * 1.02, by - 6 * s, waist * 2.04, 5 * s);
    ctx.strokeStyle = shade(c.shirt, -0.35);
    ctx.lineWidth = lw * 0.4;
    for (let x = -waist; x <= waist; x += 2.6 * s) {
      ctx.beginPath();
      ctx.moveTo(x, by - 6 * s);
      ctx.lineTo(x, by - 1 * s);
      ctx.stroke();
    }
  }
  if (ex.includes('buttonup')) {
    // collar points, placket and buttons
    ctx.fillStyle = shade(c.shirt, 0.12);
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.7;
    [-1, 1].forEach((sd) => {
      ctx.beginPath();
      ctx.moveTo(sd * 1 * s, top + 4 * s);
      ctx.lineTo(sd * 8.5 * s, top - 1 * s);
      ctx.lineTo(sd * 6 * s, top + 8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.strokeStyle = shade(c.shirt, -0.3);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(1.2 * s, top + 5 * s);
    ctx.lineTo(1.2 * s, by - 1 * s);
    ctx.stroke();
    ctx.fillStyle = '#f4f8fb';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(3 * s, top + 12 * s + k * 9 * s, 1.1 * s, 0, TAU);
      ctx.fill();
    }
  }
  if (ex.includes('hoodie')) {
    // hood bunched around the neck, drawstrings, front pocket
    ctx.fillStyle = shade(c.shirt, 0.08);
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-12 * s, top + 1 * s);
    ctx.quadraticCurveTo(-11 * s, top - 6 * s, 0, top - 6.5 * s);
    ctx.quadraticCurveTo(11 * s, top - 6 * s, 12 * s, top + 1 * s);
    ctx.quadraticCurveTo(6 * s, top + 9 * s, 0, top + 9 * s);
    ctx.quadraticCurveTo(-6 * s, top + 9 * s, -12 * s, top + 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(c.skin, -0.05);
    ctx.beginPath();
    ctx.ellipse(0, top + 1.5 * s, 6 * s, 3.4 * s, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d8d2c8';
    ctx.lineWidth = 1.1 * s;
    [-1, 1].forEach((sd) => {
      ctx.beginPath();
      ctx.moveTo(sd * 3.5 * s, top + 7 * s);
      ctx.lineTo(sd * 4.5 * s, top + 20 * s);
      ctx.stroke();
    });
    ctx.strokeStyle = shade(c.shirt, -0.4);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-waist * 0.85, wy + 2 * s);
    ctx.lineTo(-waist * 0.62, wy - 13 * s);
    ctx.lineTo(waist * 0.62, wy - 13 * s);
    ctx.lineTo(waist * 0.85, wy + 2 * s);
    ctx.stroke();
  }
  return tw;
}

// Green stink lines rising off someone (and a fly or two)
export function drawStink(ctx, cx, cy, w, hgt, t, lw) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    // two wisps off the shoulders, one above the head: never across the face
    const x0 = cx + [-1.35, 1.35, 0.35][k] * w;
    const y0 = k === 2 ? cy - hgt * 0.95 : cy;
    const ph = (t * 0.7 + k * 0.37) % 1;
    ctx.strokeStyle = `rgba(150,205,70,${0.75 * Math.sin(ph * Math.PI)})`;
    ctx.lineWidth = Math.max(lw * 1.2, w * 0.07);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const y = y0 - ph * hgt * 0.5 - u * hgt * 0.7;
      const x = x0 + Math.sin(u * 9 + t * 4 + k) * w * 0.14;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#1a1a1a';
  for (let k = 0; k < 2; k++) {
    const a = t * (3 + k) + k * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * w * 1.1, cy - hgt * 0.55 + Math.sin(a * 1.7) * w * 0.4, Math.max(lw * 0.8, w * 0.035), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Kacey, drawn as a real(ish) giraffe in three-quarter view, rainbow reticulated coat
function drawGiraffeUpright(ctx, ch, lw, opts) {
  const { pose = 'stand', expr = 'happy', t = 0 } = opts;
  const s = ch.scale * (opts.tiny ? 0.65 : 1);
  const c = ch.colors;
  const walk = pose === 'walk' || pose === 'run';
  const ph = t * (pose === 'run' ? 14 : 8);
  const bob = Math.sin(t * 2) * 1.5 * s;
  if (opts.cutY !== undefined) {
    ctx.beginPath();
    ctx.rect(-400, -700, 800, 700 + opts.cutY);
    ctx.clip();
  }
  const shoulderY = -128 * s + bob;
  const hipY = -112 * s + bob;
  const legs = [
    [-34, 0.0, true, hipY], [32, Math.PI, true, shoulderY], [-26, Math.PI, false, hipY], [40, 0, false, shoulderY],
  ];
  legs.forEach(([x, off, back, topY]) => {
    const lift = walk ? Math.max(0, Math.sin(ph + off)) * 12 * s : pose === 'flail' ? Math.sin(t * 20 + off) * 10 * s : 0;
    const col = back ? shade(c.skin, -0.14) : c.skin;
    const knee = { x: x * s + (walk ? Math.sin(ph + off) * 6 * s : 0), y: -52 * s - lift * 0.5 };
    const hoof = { x: x * s, y: -5 * s - lift };
    taper(ctx, { x: x * s, y: topY + 12 * s }, knee, 12 * s, 8 * s, col, lw);
    taper(ctx, knee, hoof, 8.5 * s, 6 * s, col, lw);
    ctx.fillStyle = shade(col, -0.1);
    ctx.beginPath();
    ctx.ellipse(knee.x, knee.y, 5 * s, 4 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2416';
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(hoof.x - 4.5 * s, hoof.y);
    ctx.lineTo(hoof.x + 4.5 * s, hoof.y);
    ctx.lineTo(hoof.x + 5 * s, hoof.y + 6 * s);
    ctx.lineTo(hoof.x - 5 * s, hoof.y + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.strokeStyle = shade(c.skin, -0.2);
  ctx.lineWidth = lw * 2;
  ctx.beginPath();
  ctx.moveTo(-52 * s, hipY - 4 * s);
  ctx.quadraticCurveTo(-64 * s, hipY + 12 * s, -60 * s + Math.sin(t * 5) * 5 * s, hipY + 38 * s);
  ctx.stroke();
  ctx.fillStyle = '#3a2416';
  ctx.beginPath();
  ctx.ellipse(-60 * s + Math.sin(t * 5) * 5 * s, hipY + 42 * s, 4 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(-55 * s, hipY - 6 * s);
    ctx.bezierCurveTo(-40 * s, hipY - 26 * s, 30 * s, shoulderY - 30 * s, 52 * s, shoulderY - 14 * s);
    ctx.bezierCurveTo(64 * s, shoulderY, 58 * s, shoulderY + 34 * s, 40 * s, shoulderY + 36 * s);
    ctx.bezierCurveTo(10 * s, hipY + 34 * s, -40 * s, hipY + 30 * s, -52 * s, hipY + 18 * s);
    ctx.quadraticCurveTo(-60 * s, hipY + 4 * s, -55 * s, hipY - 6 * s);
    ctx.closePath();
  };
  bodyPath();
  const bg = ctx.createLinearGradient(0, shoulderY - 30 * s, 0, hipY + 34 * s);
  bg.addColorStop(0, shade(c.skin, 0.25));
  bg.addColorStop(1, shade(c.skin, -0.18));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  bodyPath();
  ctx.clip();
  reticulate(ctx, -60 * s, shoulderY - 40 * s, 125 * s, 90 * s, 13 * s, 7);
  ctx.restore();
  bodyPath();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.stroke();
  const sway = Math.sin(t * 1.8) * 6 * s + (pose === 'flail' ? Math.sin(t * 15) * 18 * s : 0);
  const n0 = { x: 42 * s, y: shoulderY - 10 * s };
  const n1 = { x: 54 * s + sway * 0.4, y: shoulderY - 70 * s };
  const n2 = { x: 60 * s + sway, y: shoulderY - 128 * s * (opts.bigHead ? 0.9 : 1) };
  const neckPath = () => {
    ctx.beginPath();
    ctx.moveTo(n0.x - 18 * s, n0.y);
    ctx.quadraticCurveTo(n1.x - 12 * s, n1.y, n2.x - 7 * s, n2.y);
    ctx.lineTo(n2.x + 8 * s, n2.y + 4 * s);
    ctx.quadraticCurveTo(n1.x + 13 * s, n1.y, n0.x + 22 * s, n0.y + 14 * s);
    ctx.closePath();
  };
  neckPath();
  ctx.fillStyle = hgrad(ctx, n1.x - 14 * s, n1.x + 14 * s, c.skin);
  ctx.fill();
  ctx.save();
  neckPath();
  ctx.clip();
  reticulate(ctx, n0.x - 30 * s, n2.y - 10 * s, 60 * s, n0.y - n2.y + 30 * s, 9 * s, 3);
  ctx.restore();
  neckPath();
  ctx.strokeStyle = SOFT;
  ctx.stroke();
  ctx.strokeStyle = c.hair;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(n0.x - 18 * s, n0.y);
  ctx.quadraticCurveTo(n1.x - 12 * s, n1.y, n2.x - 7 * s, n2.y);
  ctx.stroke();
  ctx.strokeStyle = shade(c.hair, -0.3);
  ctx.lineWidth = lw * 0.6;
  for (let k = 0; k < 10; k++) {
    const u = k / 10;
    const x = n0.x - 18 * s + (n2.x - 7 * s - (n0.x - 18 * s)) * u;
    const y = n0.y + (n2.y - n0.y) * u;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4 * s, y - 3 * s);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(n2.x + 3 * s, n2.y - 9 * s);
  ctx.rotate(Math.sin(t * 1.6) * 0.06);
  drawGiraffeHead(ctx, ch, 21 * s * (opts.bigHead ? 1.9 : 1), { expr, t, view: 'front', lw });
  ctx.restore();
  if (opts.lifejacket) {
    ctx.fillStyle = hgrad(ctx, n1.x - 22 * s, n1.x + 22 * s, '#ff7a1a');
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(n1.x - 4 * s, n1.y + 42 * s, 22 * s, 14 * s, 0.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

// Giraffe coat: rainbow polygons separated by cream lines
export function reticulate(ctx, x, y, w, h, cell, seed) {
  ctx.fillStyle = 'rgba(255,248,225,0.6)';
  ctx.fillRect(x, y, w, h);
  let k = seed;
  for (let yy = y; yy < y + h; yy += cell) {
    for (let xx = x + ((Math.floor((yy - y) / cell) % 2) * cell) / 2; xx < x + w; xx += cell) {
      k++;
      ctx.fillStyle = RAINBOW[k % RAINBOW.length];
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + k * 0.7;
        const rr = cell * (0.38 + ((k * 13 + i * 7) % 10) / 70);
        ctx.lineTo(xx + Math.cos(a) * rr, yy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- critters
// Spawning sockeye salmon (red body, green head, hooked jaw), top-down, nose up. half: 'front'|'back'
export function drawSalmonTop(ctx, S, t, { flip = false, half = null } = {}) {
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = Math.max(1.6, 150 / S);
  const wig = half ? 0 : Math.sin(t * 14) * 0.25;
  ctx.rotate(-Math.PI / 2);
  if (flip) ctx.scale(-1, 1);
  if (half) {
    ctx.beginPath();
    if (half === 'front') ctx.rect(-2, -60, 100, 120);
    else ctx.rect(-100, -60, 102, 120);
    ctx.clip();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = SOFT;
  ctx.save();
  ctx.translate(-50, 0);
  ctx.rotate(wig * 1.6);
  ctx.fillStyle = '#7a2a20';
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(-16, -6, -32, -22);
  ctx.quadraticCurveTo(-24, 0, -32, 22);
  ctx.quadraticCurveTo(-16, 6, 4, 0);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-28, k * 8);
    ctx.stroke();
  }
  ctx.restore();
  ctx.rotate(wig * 0.3);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.bezierCurveTo(-40, -18, 10, -22, 34, -14);
    ctx.bezierCurveTo(48, -9, 58, -4, 60, 2);
    ctx.bezierCurveTo(56, 8, 44, 12, 30, 14);
    ctx.bezierCurveTo(10, 20, -40, 17, -52, 0);
    ctx.closePath();
  };
  body();
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, '#8a1a14');
  g.addColorStop(0.5, '#d8322a');
  g.addColorStop(1, '#e8705a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  const hg = ctx.createLinearGradient(30, 0, 62, 0);
  hg.addColorStop(0, '#d8322a');
  hg.addColorStop(0.25, '#4a6a2a');
  hg.addColorStop(1, '#2e4a1a');
  ctx.fillStyle = hg;
  ctx.fillRect(28, -24, 40, 48);
  ctx.strokeStyle = 'rgba(255,220,200,0.18)';
  ctx.lineWidth = 1;
  for (let x = -44; x < 30; x += 5) {
    for (let y = -16; y < 16; y += 5) {
      ctx.beginPath();
      ctx.arc(x + (y % 10 ? 2.5 : 0), y, 2.4, -1, 1);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(30,10,10,0.35)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(-40 + i * 6, -10 + ((i * 7) % 6), 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  body();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = '#9a2a20';
  [[-6, -17, -1], [-6, 17, 1]].forEach(([x, y, sd]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 16, y + sd * 12 + Math.sin(t * 16) * 4);
    ctx.lineTo(x + 8, y);
    ctx.fill();
    ctx.stroke();
  });
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(52, 6);
  ctx.quadraticCurveTo(62, 8, 60, 2);
  ctx.stroke();
  ctx.fillStyle = '#f2e8a0';
  ctx.beginPath();
  ctx.arc(42, -7, 4.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(43, -7, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(42, -8, 0.9, 0, TAU);
  ctx.fill();
  if (half) {
    // raw torn edge: pink flesh, spine, blood
    ctx.fillStyle = '#ff8a6a';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    for (let k = -18; k <= 18; k += 3) ctx.lineTo(k % 6 ? 3 : -2, k);
    ctx.lineTo(0, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a0006';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCat(ctx, S, t) {
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = Math.max(1.6, 150 / S);
  const fur = '#e8913a';
  ctx.lineWidth = lw * 3;
  ctx.beginPath();
  ctx.moveTo(10, -6);
  ctx.quadraticCurveTo(24, -10, 20 + Math.sin(t * 4) * 6, -28);
  ctx.strokeStyle = SOFT;
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = lw * 1.8;
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.strokeStyle = SOFT;
  ctx.fillStyle = hgrad(ctx, -12, 12, fur);
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -26, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#b8601a';
  ctx.lineWidth = lw * 0.8;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 4 - 2, -33);
    ctx.lineTo(k * 4, -29);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -14 + k * 4);
    ctx.lineTo(-6, -13 + k * 4);
    ctx.stroke();
  }
  ctx.strokeStyle = SOFT;
  ctx.fillStyle = fur;
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 3, -33);
    ctx.lineTo(s * 8, -40);
    ctx.lineTo(s * 9, -29);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = '#c8e060';
  [-3.5, 3.5].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, -27, 2, 2.4, 0, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = '#111';
  [-3.5, 3.5].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, -27, 0.7, 2.2, 0, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = '#f08aa0';
  ctx.beginPath();
  ctx.arc(0, -23.5, 1.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Big grizzly (3/4 front), rising out of the water. bloody: 0..1
export function drawBear(ctx, S, t, { mouth = 0, scale = 1, bloody = 0, lw: lwOverride, gore = 'blood' } = {}) {
  // what's dripping off the bear: blood, or (after a diarrhea death) something worse
  const goo = gore === 'poop' ? ['rgba(82,52,14,0.88)', 'rgba(96,62,18,0.9)', '#5a3a12'] : ['rgba(110,0,8,0.85)', 'rgba(120,0,8,0.88)', '#8a1a1a'];
  ctx.save();
  ctx.scale((S / 100) * scale, (S / 100) * scale);
  const lw = lwOverride ?? Math.max(1.6, 180 / (S * scale));
  ctx.lineWidth = lw;
  ctx.strokeStyle = SOFT;
  ctx.lineJoin = 'round';
  const fur = '#6e4424';
  const furD = '#4a2c16';
  const furL = '#9a6a3c';
  const furTex = (x, y, w, h, n) => {
    ctx.strokeStyle = 'rgba(30,15,5,0.35)';
    ctx.lineWidth = lw * 0.6;
    for (let i = 0; i < n; i++) {
      const px = x + (((i * 37) % 100) / 100) * w - w / 2;
      const py = y + (((i * 61) % 100) / 100) * h - h / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 2, py + 6);
      ctx.stroke();
    }
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
  };
  [-1, 1].forEach((s) => {
    ctx.save();
    ctx.translate(s * 50, -55);
    ctx.rotate(s * (0.5 + mouth * 0.5));
    ctx.fillStyle = hgrad(ctx, -20, 20, furD);
    ctx.beginPath();
    ctx.ellipse(s * 8, -18, 20, 40, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.ellipse(s * 10, -52, 16, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    for (let k = -2; k <= 2; k++) {
      ctx.fillStyle = bloody ? goo[2] : '#e8e0c8';
      ctx.beginPath();
      ctx.moveTo(s * 10 + k * 6 - 2, -60);
      ctx.quadraticCurveTo(s * 10 + k * 6, -74, s * 10 + k * 7 + 3, -76);
      ctx.lineTo(s * 10 + k * 6 + 2, -60);
      ctx.fill();
    }
    ctx.restore();
  });
  ctx.fillStyle = hgrad(ctx, -65, 65, fur);
  ctx.beginPath();
  ctx.moveTo(-62, 10);
  ctx.bezierCurveTo(-70, -60, -30, -95, 0, -92);
  ctx.bezierCurveTo(30, -95, 70, -60, 62, 10);
  ctx.quadraticCurveTo(0, 30, -62, 10);
  ctx.fill();
  ctx.stroke();
  furTex(0, -40, 110, 90, 60);
  ctx.fillStyle = 'rgba(160,110,60,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, -25, 34, 32, 0, 0, TAU);
  ctx.fill();
  if (bloody) {
    ctx.fillStyle = goo[0];
    ctx.beginPath();
    ctx.moveTo(-22, -70);
    ctx.quadraticCurveTo(-30, -20, -14, 8);
    ctx.lineTo(-6, -30);
    ctx.lineTo(4, 10);
    ctx.lineTo(10, -40);
    ctx.lineTo(22, 4);
    ctx.quadraticCurveTo(28, -40, 20, -70);
    ctx.closePath();
    ctx.fill();
  }
  const hy = -112 - mouth * 6;
  ctx.fillStyle = furD;
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.arc(s * 30, hy - 30, 12, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b07a4a';
    ctx.beginPath();
    ctx.arc(s * 30, hy - 30, 5.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = furD;
  });
  const hg = ctx.createRadialGradient(-10, hy - 15, 5, 0, hy, 48);
  hg.addColorStop(0, furL);
  hg.addColorStop(1, fur);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-42, hy - 5);
  ctx.bezierCurveTo(-46, hy - 42, 46, hy - 42, 42, hy - 5);
  ctx.bezierCurveTo(40, hy + 25, -40, hy + 25, -42, hy - 5);
  ctx.fill();
  ctx.stroke();
  furTex(0, hy - 10, 70, 40, 30);
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#1a0a04';
    ctx.beginPath();
    ctx.ellipse(s * 15, hy - 12, 4.5, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.8)';
    ctx.beginPath();
    ctx.arc(s * 14, hy - 13, 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = furD;
    ctx.lineWidth = lw * 2;
    ctx.beginPath();
    ctx.moveTo(s * 26, hy - 22);
    ctx.lineTo(s * 7, hy - 17);
    ctx.stroke();
    ctx.lineWidth = lw;
    ctx.strokeStyle = SOFT;
  });
  const jaw = 4 + mouth * 24;
  ctx.fillStyle = '#b8844e';
  ctx.beginPath();
  ctx.ellipse(0, hy + 8, 21, 15 + mouth * 10, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#140804';
  ctx.beginPath();
  ctx.ellipse(0, hy - 1, 8, 5.5, 0, 0, TAU);
  ctx.fill();
  if (mouth > 0.05) {
    ctx.fillStyle = '#3a0408';
    ctx.beginPath();
    ctx.ellipse(0, hy + 16, 17, jaw * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bloody ? '#e8c8b8' : '#f2ead8';
    for (let k = -2; k <= 2; k++) {
      const big = Math.abs(k) === 2 ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(k * 6 - 2.5 * big, hy + 16 - jaw * 0.75);
      ctx.lineTo(k * 6, hy + 16 - jaw * 0.75 + 7 * big);
      ctx.lineTo(k * 6 + 2.5 * big, hy + 16 - jaw * 0.75);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(k * 6 - 2.5 * big, hy + 16 + jaw * 0.75);
      ctx.lineTo(k * 6, hy + 16 + jaw * 0.75 - 7 * big);
      ctx.lineTo(k * 6 + 2.5 * big, hy + 16 + jaw * 0.75);
      ctx.fill();
    }
    ctx.fillStyle = '#c84a5a';
    ctx.beginPath();
    ctx.ellipse(0, hy + 18 + mouth * 8, 9, 5, 0, 0, TAU);
    ctx.fill();
  }
  if (bloody) {
    ctx.fillStyle = goo[1];
    ctx.beginPath();
    ctx.ellipse(-8, hy + 14, 16, 8 + mouth * 6, 0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, hy + 20, 12, 6 + mouth * 5, -0.3, 0, TAU);
    ctx.fill();
    for (let k = -3; k <= 3; k++) {
      const len = 8 + ((k * 13 + 70) % 9) + Math.sin(t * 3 + k) * 3;
      ctx.beginPath();
      ctx.moveTo(k * 5 - 1.5, hy + 22 + mouth * 10);
      ctx.lineTo(k * 5 - 0.8, hy + 22 + mouth * 10 + len);
      ctx.arc(k * 5, hy + 22 + mouth * 10 + len, 1.6, Math.PI, 0, true);
      ctx.lineTo(k * 5 + 1.5, hy + 22 + mouth * 10);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const randomExpr = () => (Math.random() < 0.5 ? 'scared' : 'terrified');
export { rand };
