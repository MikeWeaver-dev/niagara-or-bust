// Ragdolls for the side-view drop: humans and Kacey the giraffe. Breakable for gore.
import { drawHead, taper, reticulate } from './charArt.js';
import { shade, TAU } from './util.js';
import { RAINBOW } from '../data/characters.js';

const HUMAN_BONES = [
  ['neck', 'neck', 'head'],
  ['neckBase', 'chest', 'neck'],
  ['spine', 'chest', 'pelvis'],
  ['upperArmL', 'chest', 'elL'],
  ['foreArmL', 'elL', 'handL'],
  ['upperArmR', 'chest', 'elR'],
  ['foreArmR', 'elR', 'handR'],
  ['thighL', 'pelvis', 'kneeL'],
  ['shinL', 'kneeL', 'footL'],
  ['thighR', 'pelvis', 'kneeR'],
  ['shinR', 'kneeR', 'footR'],
];
const HUMAN_LEN = { neck: 0.17, neckBase: 0.13, spine: 0.37, upperArmL: 0.28, foreArmL: 0.27, upperArmR: 0.28, foreArmR: 0.27, thighL: 0.4, shinL: 0.4, thighR: 0.4, shinR: 0.4 };

const POSES = {
  stand: { chest: [0, -0.37], neck: [0, -0.5], head: [0.01, -0.67], elL: [0.04, -0.1], handL: [0.08, 0.16], elR: [0.06, -0.1], handR: [0.1, 0.16], kneeL: [0.02, 0.4], footL: [0, 0.8], kneeR: [0.04, 0.4], footR: [0.02, 0.8] },
  sit: { chest: [-0.03, -0.37], neck: [-0.03, -0.5], head: [-0.01, -0.67], elL: [0.16, -0.18], handL: [0.42, -0.24], elR: [0.18, -0.18], handR: [0.44, -0.24], kneeL: [0.38, -0.1], footL: [0.74, 0.12], kneeR: [0.4, -0.1], footR: [0.76, 0.12] },
  ride: { chest: [0.02, -0.37], neck: [0.04, -0.5], head: [0.07, -0.66], elL: [0.22, -0.2], handL: [0.46, -0.3], elR: [0.24, -0.2], handR: [0.48, -0.3], kneeL: [0.32, 0.14], footL: [0.3, 0.52], kneeR: [0.34, 0.14], footR: [0.32, 0.52] },
  crouch: { chest: [0.12, -0.33], neck: [0.18, -0.44], head: [0.24, -0.58], elL: [0.3, -0.12], handL: [0.4, 0.12], elR: [0.32, -0.12], handR: [0.42, 0.12], kneeL: [0.34, -0.22], footL: [0.12, 0.12], kneeR: [0.36, -0.22], footR: [0.14, 0.12] },
  swim: { chest: [0.37, -0.02], neck: [0.5, -0.05], head: [0.66, -0.1], elL: [0.55, 0.12], handL: [0.8, 0.08], elR: [0.58, 0.1], handR: [0.84, 0.04], kneeL: [-0.4, 0.04], footL: [-0.8, 0.08], kneeR: [-0.4, 0.0], footR: [-0.8, 0.02] },
  surf: { chest: [0.05, -0.36], neck: [0.07, -0.49], head: [0.1, -0.65], elL: [-0.24, -0.3], handL: [-0.5, -0.34], elR: [0.3, -0.3], handR: [0.56, -0.34], kneeL: [-0.22, 0.36], footL: [-0.32, 0.74], kneeR: [0.26, 0.36], footR: [0.32, 0.74] },
};

export function buildHuman(phys, ch, x, y, pose = 'stand', opts = {}) {
  const s = (ch.scale || 1) * (opts.tiny ? 0.65 : 1);
  const headR = 0.13 * s * (ch.headScale || 1) * (opts.bigHead ? 1.9 : 1);
  const P = {};
  const mk = (name, mass, r) => (P[name] = phys.point(x, y, { mass, r, fric: 0.5, buoy: opts.lifejacket && (name === 'chest' || name === 'pelvis') ? 3.2 : 1.1, drag: 0.012 }));
  mk('pelvis', 2, 0.09);
  mk('chest', 2, 0.1);
  mk('neck', 0.5, 0.06);
  mk('head', 1.2, headR);
  ['L', 'R'].forEach((sd) => {
    mk('el' + sd, 0.6, 0.06);
    mk('hand' + sd, 0.4, 0.06);
    mk('knee' + sd, 0.8, 0.07);
    mk('foot' + sd, 0.6, 0.07);
  });
  const bones = {};
  HUMAN_BONES.forEach(([name, a, b]) => {
    bones[name] = phys.stick(P[a], P[b], { len: HUMAN_LEN[name] * s * (name === 'neck' && opts.bigHead ? 1.5 : 1), part: name, kind: 'bone' });
  });
  const noodle = opts.noodle ? 0.15 : 1;
  const struct = {
    headChest: phys.stick(P.head, P.chest, { len: (0.3 + (opts.bigHead ? 0.09 : 0)) * s, stiff: 0.5 * noodle, kind: 'struct' }),
    neckPelvis: phys.stick(P.neck, P.pelvis, { len: 0.5 * s, stiff: 0.4 * noodle, kind: 'struct' }),
    kneeLChest: phys.stick(P.kneeL, P.chest, { len: 0.42 * s, min: true, kind: 'struct' }),
    kneeRChest: phys.stick(P.kneeR, P.chest, { len: 0.42 * s, min: true, kind: 'struct' }),
    footLPelvis: phys.stick(P.footL, P.pelvis, { len: 0.3 * s, min: true, kind: 'struct' }),
    footRPelvis: phys.stick(P.footR, P.pelvis, { len: 0.3 * s, min: true, kind: 'struct' }),
    handLChest: phys.stick(P.handL, P.chest, { len: 0.18 * s, min: true, kind: 'struct' }),
    handRChest: phys.stick(P.handR, P.chest, { len: 0.18 * s, min: true, kind: 'struct' }),
  };
  const rag = { kind: 'human', ch, P, bones, struct, headR, s, pts: Object.values(P), stumps: [], hidden: false, alpha: 1, expr: 'scared', dead: false, broken: 0, decapitated: false, opts };
  poseRagdoll(rag, pose, x, y);
  return rag;
}

export function poseRagdoll(rag, pose, x, y) {
  if (rag.kind === 'giraffe') return poseGiraffe(rag, pose, x, y);
  const P = rag.P;
  const s = rag.s;
  const po = POSES[pose] || POSES.stand;
  P.pelvis.x = P.pelvis.px = x;
  P.pelvis.y = P.pelvis.py = y;
  Object.entries(po).forEach(([k, [dx, dy]]) => {
    const extra = k === 'head' && rag.opts.bigHead ? -0.08 : 0;
    P[k].x = P[k].px = x + dx * s;
    P[k].y = P[k].py = y + (dy + extra) * s;
  });
}

const GIRAFFE_BONES = [
  ['body', 'hips', 'shoulders'],
  ['neck1', 'shoulders', 'n1'],
  ['neck2', 'n1', 'n2'],
  ['neck3', 'n2', 'head'],
  ['fl1', 'shoulders', 'flk'],
  ['fl2', 'flk', 'flf'],
  ['fr1', 'shoulders', 'frk'],
  ['fr2', 'frk', 'frf'],
  ['bl1', 'hips', 'blk'],
  ['bl2', 'blk', 'blf'],
  ['br1', 'hips', 'brk'],
  ['br2', 'brk', 'brf'],
  ['tail', 'hips', 'tail'],
];
const G_POSES = {
  stand: { hips: [0, 0], shoulders: [0.95, -0.05], n1: [1.15, -0.55], n2: [1.3, -1.05], head: [1.42, -1.42], flk: [0.95, 0.55], flf: [0.95, 1.1], frk: [0.88, 0.55], frf: [0.86, 1.1], blk: [0.05, 0.55], blf: [0, 1.1], brk: [0.12, 0.55], brf: [0.1, 1.1], tail: [-0.3, 0.35] },
  sit: { hips: [0, 0], shoulders: [0.95, -0.08], n1: [1.12, -0.58], n2: [1.25, -1.08], head: [1.36, -1.46], flk: [1.4, 0.15], flf: [1.85, 0.25], frk: [1.35, 0.18], frf: [1.8, 0.3], blk: [0.5, 0.2], blf: [0.95, 0.3], brk: [0.55, 0.22], brf: [1.0, 0.32], tail: [-0.35, 0.2] },
};

export function buildGiraffe(phys, ch, x, y, pose = 'stand', opts = {}) {
  const s = 0.82 * (ch.scale || 1) * (opts.tiny ? 0.65 : 1);
  const P = {};
  const mk = (name, mass, r) => (P[name] = phys.point(x, y, { mass, r, fric: 0.5, buoy: 1.2, drag: 0.012 }));
  mk('hips', 3, 0.14);
  mk('shoulders', 3, 0.14);
  mk('n1', 0.8, 0.09);
  mk('n2', 0.6, 0.08);
  mk('head', 1, 0.2 * s * (opts.bigHead ? 1.9 : 1));
  ['flk', 'frk', 'blk', 'brk'].forEach((k) => mk(k, 0.6, 0.06));
  ['flf', 'frf', 'blf', 'brf'].forEach((k) => mk(k, 0.5, 0.06));
  mk('tail', 0.2, 0.05);
  const bones = {};
  const pose0 = G_POSES.stand;
  GIRAFFE_BONES.forEach(([name, a, b]) => {
    const len = Math.hypot(pose0[b][0] - pose0[a][0], pose0[b][1] - pose0[a][1]) * s;
    bones[name] = phys.stick(P[a], P[b], { len, part: name, kind: 'bone' });
  });
  const noodle = opts.noodle ? 0.15 : 1;
  const struct = {
    hipsN1: phys.stick(P.hips, P.n1, { len: Math.hypot(1.15, 0.55) * s, stiff: 0.45 * noodle, kind: 'struct' }),
    shN2: phys.stick(P.shoulders, P.n2, { len: Math.hypot(0.35, 1.0) * s, stiff: 0.35 * noodle, kind: 'struct' }),
    n1Head: phys.stick(P.n1, P.head, { len: Math.hypot(0.27, 0.87) * s, stiff: 0.25 * noodle, kind: 'struct' }),
  };
  const rag = { kind: 'giraffe', ch, P, bones, struct, headR: 0.2 * s * (opts.bigHead ? 1.9 : 1), s, pts: Object.values(P), stumps: [], hidden: false, alpha: 1, expr: 'scared', dead: false, broken: 0, decapitated: false, opts };
  poseGiraffe(rag, pose, x, y);
  return rag;
}

function poseGiraffe(rag, pose, x, y) {
  const po = G_POSES[pose] || G_POSES.stand;
  Object.entries(po).forEach(([k, [dx, dy]]) => {
    const p = rag.P[k];
    p.x = p.px = x + dx * rag.s;
    p.y = p.py = y + dy * rag.s;
  });
}

// Which struct sticks to break along with a bone
const STRUCT_FOR = {
  neck: ['headChest'],
  thighL: ['kneeLChest', 'footLPelvis'],
  thighR: ['kneeRChest', 'footRPelvis'],
  shinL: ['footLPelvis'],
  shinR: ['footRPelvis'],
  upperArmL: ['handLChest'],
  upperArmR: ['handRChest'],
  spine: ['neckPelvis', 'kneeLChest', 'kneeRChest', 'footLPelvis', 'footRPelvis'],
  neck3: ['n1Head'],
  neck2: ['shN2', 'n1Head'],
  neck1: ['hipsN1', 'shN2'],
};

export function breakBone(rag, name) {
  const b = rag.bones[name];
  if (!b || b.broken) return false;
  b.broken = true;
  (STRUCT_FOR[name] || []).forEach((k) => rag.struct[k] && (rag.struct[k].broken = true));
  rag.broken++;
  if (name === 'neck' || name === 'neck3') rag.decapitated = true;
  rag.stumps.push(b);
  return b;
}

export function headPoint(rag) {
  return rag.P.head;
}
export function corePoint(rag) {
  return rag.kind === 'giraffe' ? rag.P.hips : rag.P.pelvis;
}

// ---------------------------------------------------------------- rendering
const SOFT = 'rgba(32,18,24,0.78)';
const live = (b) => b && !b.broken;

function goreColors(style) {
  if (style === 'rainbow') return { flesh: '#ff5cd6', muscle: '#ff9ae6', dark: '#8b5cff', stain: 'rgba(255,90,214,0.55)' };
  if (style === 'poop') return { flesh: '#5a3a12', muscle: '#7a5a20', dark: '#3e2a0e', stain: 'rgba(90,60,18,0.6)' };
  return { flesh: '#7a0a0e', muscle: '#b8343a', dark: '#4a0004', stain: 'rgba(110,0,8,0.55)' };
}

// torn stump: ragged flesh, muscle, bone with marrow, dangling sinew
function stump(ctx, p, other, w, style, lw, seed, t) {
  const G = goreColors(style);
  const dx = other.x - p.x;
  const dy = other.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const r = w * 0.62;
  ctx.fillStyle = G.flesh;
  ctx.strokeStyle = G.dark;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU;
    const k = 0.75 + (((seed * 31 + i * 17) % 10) / 10) * 0.5;
    ctx.lineTo(p.x + Math.cos(a) * r * k + ux * r * 0.3, p.y + Math.sin(a) * r * k + uy * r * 0.3);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = G.muscle;
  ctx.beginPath();
  ctx.ellipse(p.x + ux * r * 0.35, p.y + uy * r * 0.35, r * 0.6, r * 0.45, Math.atan2(uy, ux), 0, TAU);
  ctx.fill();
  if (style !== 'poop') {
    ctx.fillStyle = '#efe6d2';
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.arc(p.x + ux * r * 0.55, p.y + uy * r * 0.55, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9a2a1a';
    ctx.beginPath();
    ctx.arc(p.x + ux * r * 0.55, p.y + uy * r * 0.55, r * 0.12, 0, TAU);
    ctx.fill();
  }
  // sinew strands swinging
  ctx.strokeStyle = G.muscle;
  ctx.lineWidth = Math.max(lw, w * 0.1);
  for (let k = -1; k <= 1; k += 2) {
    const sw = Math.sin(t * 6 + seed + k) * 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x + ux * r * 0.4 + uy * k * r * 0.3, p.y + uy * r * 0.4 - ux * k * r * 0.3);
    ctx.quadraticCurveTo(p.x + ux * r * 1.4 + sw * r, p.y + uy * r * 1.4 + r * 0.6, p.x + ux * r * 1.6 + sw * r * 1.5, p.y + uy * r * 1.6 + r * 1.1);
    ctx.stroke();
  }
}

function stain(ctx, p, w, style) {
  ctx.fillStyle = goreColors(style).stain;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + w * 0.3, w * 1.1, w * 1.5, 0, 0, TAU);
  ctx.fill();
}

export function drawRagdoll(ctx, rag, lw, t) {
  if (rag.hidden) return;
  ctx.save();
  ctx.globalAlpha = rag.alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (rag.kind === 'giraffe') drawGiraffeRag(ctx, rag, lw, t);
  else drawHumanRag(ctx, rag, lw, t);
  ctx.restore();
}

function shoeSide(ctx, knee, foot, color, lw, s, sneaker) {
  const a = Math.atan2(foot.y - knee.y, foot.x - knee.x) - Math.PI / 2;
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, -0.06 * s, 0, 0.06 * s);
  g.addColorStop(0, shade(color, 0.2));
  g.addColorStop(1, shade(color, -0.25));
  ctx.fillStyle = g;
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-0.05 * s, -0.06 * s);
  ctx.quadraticCurveTo(0.06 * s, -0.07 * s, 0.17 * s, -0.01 * s);
  ctx.quadraticCurveTo(0.19 * s, 0.04 * s, 0.14 * s, 0.05 * s);
  ctx.lineTo(-0.06 * s, 0.05 * s);
  ctx.quadraticCurveTo(-0.08 * s, 0, -0.05 * s, -0.06 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sneaker ? '#f2f2f2' : shade(color, -0.5);
  ctx.fillRect(-0.06 * s, 0.03 * s, 0.21 * s, 0.025 * s);
  ctx.restore();
}

function handSide(ctx, el, hd, w, skin, lw) {
  const ang = Math.atan2(hd.y - el.y, hd.x - el.x);
  ctx.save();
  ctx.translate(hd.x, hd.y);
  ctx.rotate(ang);
  ctx.fillStyle = skin;
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 0, w * 0.85, w * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(w * 0.3, -w * 0.5, w * 0.35, w * 0.18, -0.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHumanRag(ctx, rag, lw, t) {
  const { P, bones, ch, s } = rag;
  const c = ch.colors;
  const style = rag.goreStyle || 'blood';
  const far = (col) => shade(col, -0.25);
  const strong = ch.extras.includes('muscles');
  const kid = ch.id === 'timmy';
  const thighW = (strong ? 0.18 : kid ? 0.12 : 0.155) * s;
  const calfW = (strong ? 0.13 : kid ? 0.09 : 0.11) * s;
  const upW = (strong ? 0.14 : kid ? 0.085 : 0.1) * s;
  const foreW = (strong ? 0.115 : kid ? 0.07 : 0.085) * s;
  const shorts = kid || ch.extras.includes('hawaiian');
  const shinCol = shorts ? c.skin : ch.dress ? '#3a3040' : c.pants;
  const thighCol = ch.dress ? c.shirt : c.pants;
  const upCol = ch.id === 'bobby' ? c.skin : shorts ? c.shirt : c.shirt;
  const loCol = ch.id === 'bobby' || shorts ? c.skin : c.shirt;
  const ankle = (k, f) => ({ x: f.x + (k.x - f.x) * 0.12, y: f.y + (k.y - f.y) * 0.12 });

  const leg = (thigh, shin, knee, foot, dark) => {
    const col = (x) => (dark ? far(x) : x);
    if (live(bones[thigh])) taper(ctx, P.pelvis, P[knee], thighW, calfW * 1.05, col(thighCol), lw, { bulge: 0.012 * s });
    if (live(bones[shin])) {
      taper(ctx, P[knee], ankle(P[knee], P[foot]), calfW, 0.06 * s, col(shinCol), lw, { bulge: 0.018 * s });
      shoeSide(ctx, P[knee], P[foot], col(c.shoes), lw, s, kid);
    }
  };
  const arm = (up, fore, el, hand, dark) => {
    const col = (x) => (dark ? far(x) : x);
    if (live(bones[up])) taper(ctx, P.chest, P[el], ch.dress ? upW * 1.5 : upW, foreW, col(ch.dress ? c.shirt : upCol), lw, { bulge: ch.dress ? 0.03 * s : strong ? 0.025 * s : 0.008 * s });
    if (live(bones[fore])) {
      taper(ctx, P[el], P[hand], foreW, 0.055 * s, col(loCol), lw, { bulge: strong ? 0.015 * s : 0.005 * s });
      handSide(ctx, P[el], P[hand], 0.055 * s, col(c.skin), lw);
    }
  };
  leg('thighL', 'shinL', 'kneeL', 'footL', true);
  arm('upperArmL', 'foreArmL', 'elL', 'handL', true);

  // torso
  const torso = () => {
    const ax = P.chest.x - P.pelvis.x;
    const ay = P.chest.y - P.pelvis.y;
    const L = Math.hypot(ax, ay) || 1;
    const ux = ax / L;
    const uy = ay / L;
    const nx = -uy;
    const ny = ux;
    const sh = (strong ? 0.21 : kid ? 0.14 : 0.17) * s;
    const wa = (strong ? 0.15 : kid ? 0.12 : 0.13) * s;
    const hp = (ch.dress ? 0.15 : 0.15) * s;
    const top = { x: P.chest.x + ux * 0.05 * s, y: P.chest.y + uy * 0.05 * s };
    const mid = { x: P.pelvis.x + ax * 0.45, y: P.pelvis.y + ay * 0.45 };
    const bot = { x: P.pelvis.x - ux * 0.04 * s, y: P.pelvis.y - uy * 0.04 * s };
    ctx.beginPath();
    ctx.moveTo(top.x + nx * sh * 0.7, top.y + ny * sh * 0.7);
    ctx.quadraticCurveTo(P.chest.x + nx * sh, P.chest.y + ny * sh, mid.x + nx * wa, mid.y + ny * wa);
    ctx.quadraticCurveTo(bot.x + nx * hp * 1.05, bot.y + ny * hp * 1.05, bot.x + nx * hp * 0.6, bot.y + ny * hp * 0.6);
    ctx.lineTo(bot.x - nx * hp * 0.6, bot.y - ny * hp * 0.6);
    ctx.quadraticCurveTo(bot.x - nx * hp * 1.05, bot.y - ny * hp * 1.05, mid.x - nx * wa, mid.y - ny * wa);
    ctx.quadraticCurveTo(P.chest.x - nx * sh, P.chest.y - ny * sh, top.x - nx * sh * 0.7, top.y - ny * sh * 0.7);
    ctx.quadraticCurveTo(top.x + ux * 0.03 * s, top.y + uy * 0.03 * s, top.x + nx * sh * 0.7, top.y + ny * sh * 0.7);
    ctx.closePath();
    return { ux, uy, nx, ny, sh, top, bot };
  };
  if (live(bones.spine)) {
    const T = torso();
    const lit = T.nx * -0.6 + T.ny * -0.8 > 0 ? 1 : -1;
    const g = ctx.createLinearGradient(P.chest.x + T.nx * T.sh * lit, P.chest.y + T.ny * T.sh * lit, P.chest.x - T.nx * T.sh * lit, P.chest.y - T.ny * T.sh * lit);
    g.addColorStop(0, shade(c.shirt, 0.18));
    g.addColorStop(0.45, c.shirt);
    g.addColorStop(1, shade(c.shirt, -0.32));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    torso();
    ctx.clip();
    if (ch.extras.includes('stripes') || ch.extras.includes('breton')) {
      ctx.strokeStyle = c.shirt2;
      ctx.lineWidth = 0.035 * s;
      for (let k = 0.1; k < 1.05; k += 0.18) {
        const cx = P.pelvis.x + (P.chest.x - P.pelvis.x) * k;
        const cy = P.pelvis.y + (P.chest.y - P.pelvis.y) * k;
        ctx.beginPath();
        ctx.moveTo(cx - T.nx * 0.3 * s, cy - T.ny * 0.3 * s);
        ctx.lineTo(cx + T.nx * 0.3 * s, cy + T.ny * 0.3 * s);
        ctx.stroke();
      }
    }
    if (ch.extras.includes('hawaiian')) {
      for (let k = 0; k < 6; k++) {
        const u = (k + 0.5) / 6;
        const cx = P.pelvis.x + (P.chest.x - P.pelvis.x) * u + T.nx * ((k % 2) - 0.5) * 0.12 * s;
        const cy = P.pelvis.y + (P.chest.y - P.pelvis.y) * u + T.ny * ((k % 2) - 0.5) * 0.12 * s;
        ctx.fillStyle = k % 2 ? c.shirt2 : c.collar;
        ctx.beginPath();
        ctx.arc(cx, cy, 0.035 * s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    const mx = P.pelvis.x + (P.chest.x - P.pelvis.x) * 0.4;
    const my = P.pelvis.y + (P.chest.y - P.pelvis.y) * 0.4;
    ctx.moveTo(mx - T.nx * 0.08 * s, my - T.ny * 0.08 * s);
    ctx.quadraticCurveTo(mx + T.ux * 0.04 * s, my + T.uy * 0.04 * s, mx + T.nx * 0.06 * s, my + T.ny * 0.06 * s);
    ctx.stroke();
    if (rag.opts.lifejacket) {
      ctx.fillStyle = '#ff7a1a';
      ctx.globalAlpha *= 0.95;
      ctx.fillRect(P.chest.x - 0.3 * s, P.chest.y - 0.3 * s, 0.6 * s, 0.6 * s);
      ctx.globalAlpha = rag.alpha;
    }
    ctx.restore();
    torso();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = lw;
    ctx.stroke();
    const inflate = rag.opts.lifejacket ? rag.opts.inflate || 0 : 0;
    if (inflate > 0.02) {
      const r = (0.16 + inflate * 0.22) * s;
      const g = ctx.createRadialGradient(P.chest.x - r * 0.3, P.chest.y - r * 0.3, r * 0.1, P.chest.x, P.chest.y, r);
      g.addColorStop(0, '#ffb070');
      g.addColorStop(1, '#ff6a00');
      ctx.fillStyle = g;
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(P.chest.x, P.chest.y + 0.05 * s, r, r * 1.1, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(P.chest.x - r * 0.35, P.chest.y - r * 0.3, r * 0.3, r * 0.15, -0.5, 0, TAU);
      ctx.fill();
    }
    if (ch.id === 'bobby') {
      ctx.strokeStyle = '#2a1d16';
      ctx.lineWidth = 0.05 * s;
      ctx.beginPath();
      ctx.moveTo(T.bot.x - T.nx * 0.15 * s + T.ux * 0.06 * s, T.bot.y - T.ny * 0.15 * s + T.uy * 0.06 * s);
      ctx.lineTo(T.bot.x + T.nx * 0.15 * s + T.ux * 0.06 * s, T.bot.y + T.ny * 0.15 * s + T.uy * 0.06 * s);
      ctx.stroke();
    }
    if (ch.dress) {
      // skirt flaring toward the knees
      const kx = (P.kneeL.x + P.kneeR.x) / 2;
      const ky = (P.kneeL.y + P.kneeR.y) / 2;
      const dx2 = kx - P.pelvis.x;
      const dy2 = ky - P.pelvis.y;
      const L2 = Math.hypot(dx2, dy2) || 1;
      const nx2 = -dy2 / L2;
      const ny2 = dx2 / L2;
      ctx.fillStyle = c.shirt;
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(P.pelvis.x + nx2 * 0.14 * s, P.pelvis.y + ny2 * 0.14 * s);
      ctx.quadraticCurveTo(kx + nx2 * 0.3 * s, ky + ny2 * 0.3 * s, kx + nx2 * 0.32 * s + dx2 * 0.35, ky + ny2 * 0.32 * s + dy2 * 0.35);
      for (let i = 1; i <= 4; i++) {
        const u = i / 4;
        ctx.lineTo(kx + nx2 * (0.32 - u * 0.64) * s + dx2 * (0.35 + (i % 2) * 0.05), ky + ny2 * (0.32 - u * 0.64) * s + dy2 * (0.35 + (i % 2) * 0.05));
      }
      ctx.quadraticCurveTo(kx - nx2 * 0.3 * s, ky - ny2 * 0.3 * s, P.pelvis.x - nx2 * 0.14 * s, P.pelvis.y - ny2 * 0.14 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,20,0.3)';
      ctx.lineWidth = lw * 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(P.pelvis.x + nx2 * i * 0.06 * s, P.pelvis.y + ny2 * i * 0.06 * s);
        ctx.lineTo(kx + nx2 * i * 0.22 * s + dx2 * 0.3, ky + ny2 * i * 0.22 * s + dy2 * 0.3);
        ctx.stroke();
      }
    }
  } else {
    // torn in half: two ragged halves of the torso
    const tw = 0.3 * s;
    taper(ctx, P.chest, { x: P.chest.x + (P.pelvis.x - P.chest.x) * 0.3, y: P.chest.y + (P.pelvis.y - P.chest.y) * 0.3 }, tw, tw * 0.9, c.shirt, lw);
    taper(ctx, P.pelvis, { x: P.pelvis.x + (P.chest.x - P.pelvis.x) * 0.3, y: P.pelvis.y + (P.chest.y - P.pelvis.y) * 0.3 }, tw, tw * 0.9, c.pants, lw);
  }
  leg('thighR', 'shinR', 'kneeR', 'footR', false);
  if (live(bones.neckBase)) taper(ctx, P.chest, P.neck, 0.1 * s, 0.085 * s, c.skin, lw);
  arm('upperArmR', 'foreArmR', 'elR', 'handR', false);
  // blood soaking into the clothes around each wound
  if (style !== 'cartoon') rag.stumps.forEach((b) => [b.a, b.b].forEach((p) => stain(ctx, p, 0.09 * s, style)));
  // head
  const h = P.head;
  const ang = Math.atan2(h.y - P.neck.y, h.x - P.neck.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(ang);
  drawHead(ctx, ch, rag.headR, { expr: rag.expr, t, view: 'side', lw });
  ctx.restore();
  rag.stumps.forEach((b, i) => {
    const w = b.part && b.part.startsWith('thigh') ? thighW : b.part && b.part.startsWith('shin') ? calfW : b.part === 'spine' ? 0.3 * s : b.part === 'neck' || b.part === 'neckBase' ? 0.11 * s : upW;
    stump(ctx, b.a, b.b, w, style, lw, i + 3, t);
    stump(ctx, b.b, b.a, w, style, lw, i + 7, t);
  });
}

function drawGiraffeRag(ctx, rag, lw, t) {
  const { P, bones, ch, s } = rag;
  const c = ch.colors;
  const style = rag.goreStyle || 'rainbow';
  const legW = 0.11 * s;
  const farC = shade(c.skin, -0.18);
  const leg = (b1, b2, a, k, f, col) => {
    if (live(bones[b1])) taper(ctx, P[a], P[k], legW * 1.2, legW * 0.8, col, lw);
    if (live(bones[b2])) {
      taper(ctx, P[k], P[f], legW * 0.85, legW * 0.6, col, lw);
      ctx.fillStyle = shade(col, -0.1);
      ctx.beginPath();
      ctx.arc(P[k].x, P[k].y, legW * 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3a2416';
      ctx.strokeStyle = SOFT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(P[f].x, P[f].y, legW * 0.55, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  };
  leg('fr1', 'fr2', 'shoulders', 'frk', 'frf', farC);
  leg('br1', 'br2', 'hips', 'brk', 'brf', farC);
  if (live(bones.tail)) {
    taper(ctx, P.hips, P.tail, 0.05 * s, 0.03 * s, shade(c.skin, -0.2), lw);
    ctx.fillStyle = '#3a2416';
    ctx.beginPath();
    ctx.ellipse(P.tail.x, P.tail.y, 0.05 * s, 0.09 * s, 0, 0, TAU);
    ctx.fill();
  }
  if (live(bones.body)) {
    taper(ctx, P.hips, P.shoulders, 0.52 * s, 0.6 * s, c.skin, lw, { bulge: 0.04 * s });
    ctx.save();
    ctx.beginPath();
    const ax = P.shoulders.x - P.hips.x;
    const ay = P.shoulders.y - P.hips.y;
    const L = Math.hypot(ax, ay) || 1;
    ctx.translate(P.hips.x, P.hips.y);
    ctx.rotate(Math.atan2(ay, ax));
    ctx.ellipse(L / 2, 0, L / 2 + 0.2 * s, 0.27 * s, 0, 0, TAU);
    ctx.clip();
    reticulate(ctx, -0.3 * s, -0.4 * s, L + 0.6 * s, 0.8 * s, 0.14 * s, 5);
    ctx.restore();
  }
  if (rag.opts.lifejacket) taper(ctx, P.shoulders, P.n1, 0.42 * s, 0.36 * s, '#ff7a1a', lw);
  const neck = [['neck1', 'shoulders', 'n1', 0.32, 0.26], ['neck2', 'n1', 'n2', 0.26, 0.21], ['neck3', 'n2', 'head', 0.21, 0.17]];
  neck.forEach(([b, a, z, w0, w1], i) => {
    if (!live(bones[b])) return;
    taper(ctx, P[a], P[z], w0 * s, w1 * s, c.skin, lw);
    ctx.fillStyle = RAINBOW[(i * 2 + 1) % RAINBOW.length];
    ctx.beginPath();
    ctx.ellipse((P[a].x + P[z].x) / 2, (P[a].y + P[z].y) / 2, 0.07 * s, 0.05 * s, i, 0, TAU);
    ctx.fill();
    ctx.fillStyle = RAINBOW[(i * 2 + 4) % RAINBOW.length];
    ctx.beginPath();
    ctx.ellipse(P[a].x * 0.75 + P[z].x * 0.25 + 0.04 * s, P[a].y * 0.75 + P[z].y * 0.25, 0.05 * s, 0.04 * s, i, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = 0.05 * s;
    ctx.beginPath();
    ctx.moveTo(P[a].x - 0.1 * s, P[a].y);
    ctx.lineTo(P[z].x - 0.08 * s, P[z].y);
    ctx.stroke();
  });
  leg('fl1', 'fl2', 'shoulders', 'flk', 'flf', c.skin);
  leg('bl1', 'bl2', 'hips', 'blk', 'blf', c.skin);
  if (style !== 'cartoon') rag.stumps.forEach((b) => [b.a, b.b].forEach((p) => stain(ctx, p, 0.1 * s, style)));
  const h = P.head;
  const ang = Math.atan2(h.y - P.n2.y, h.x - P.n2.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(ang);
  drawHead(ctx, ch, rag.headR, { expr: rag.expr, t, view: 'side', lw });
  ctx.restore();
  rag.stumps.forEach((b, i) => {
    const w = b.part === 'body' ? 0.5 * s : b.part.startsWith('neck') ? 0.24 * s : legW;
    stump(ctx, b.a, b.b, w, style, lw, i + 3, t);
    stump(ctx, b.b, b.a, w, style, lw, i + 9, t);
  });
}

export const LIMB_BONES = {
  human: ['foreArmL', 'foreArmR', 'upperArmL', 'upperArmR', 'shinL', 'shinR', 'thighL', 'thighR'],
  giraffe: ['fl2', 'fr2', 'bl2', 'br2', 'fl1', 'br1', 'tail', 'fr1', 'bl1'],
};
export const HEAD_BONE = { human: 'neck', giraffe: 'neck3' };
export const SPINE_BONE = { human: 'spine', giraffe: 'body' };
