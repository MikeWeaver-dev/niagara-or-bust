// Ragdolls for the side-view drop: humans and Kacey the giraffe. Breakable for gore.
import { drawHead, OUTLINE } from './charArt.js';
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
const seg = (ctx, a, b, w, color, lw) => {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + lw * 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
};

function stump(ctx, p, other, w, style, lw) {
  // a bloody stump at p, pointing toward where `other` used to be
  const col = style === 'rainbow' ? RAINBOW[Math.floor((p.x * 7 + p.y * 3) * 10) % RAINBOW.length] : '#b3001b';
  ctx.fillStyle = col;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(p.x, p.y, w * 0.62, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const dx = other.x - p.x;
  const dy = other.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  ctx.fillStyle = '#fbf3e0';
  ctx.beginPath();
  ctx.arc(p.x + (dx / d) * w * 0.35, p.y + (dy / d) * w * 0.35, w * 0.22, 0, TAU);
  ctx.fill();
}

const live = (b) => b && !b.broken;

export function drawRagdoll(ctx, rag, lw, t) {
  if (rag.hidden) return;
  ctx.save();
  ctx.globalAlpha = rag.alpha;
  if (rag.kind === 'giraffe') drawGiraffeRag(ctx, rag, lw, t);
  else drawHumanRag(ctx, rag, lw, t);
  ctx.restore();
}

function drawHumanRag(ctx, rag, lw, t) {
  const { P, bones, ch, s } = rag;
  const c = ch.colors;
  const style = rag.goreStyle || 'blood';
  const far = (col) => shade(col, -0.22);
  const legW = (ch.id === 'bobby' ? 0.15 : 0.12) * s;
  const armW = (ch.extras.includes('muscles') ? 0.12 : 0.09) * s;
  const shin = ch.id === 'timmy' ? c.skin : ch.dress ? '#3a3040' : c.pants;
  const thigh = ch.dress ? c.shirt : c.pants;
  const sleeve = ch.id === 'bobby' ? c.skin : c.shirt;
  // far limbs
  if (live(bones.thighL)) seg(ctx, P.pelvis, P.kneeL, legW, far(thigh), lw);
  if (live(bones.shinL)) seg(ctx, P.kneeL, P.footL, legW * 0.9, far(shin), lw);
  shoe(ctx, P.kneeL, P.footL, far(c.shoes), lw, s, live(bones.shinL));
  if (live(bones.upperArmL)) seg(ctx, P.chest, P.elL, armW, far(sleeve), lw);
  if (live(bones.foreArmL)) seg(ctx, P.elL, P.handL, armW * 0.85, far(c.skin), lw);
  hand(ctx, P.handL, armW, far(c.skin), lw, live(bones.foreArmL) || true);
  // torso
  if (live(bones.spine)) {
    const tw = (ch.id === 'bobby' ? 0.36 : ch.id === 'timmy' ? 0.26 : 0.3) * s;
    seg(ctx, P.chest, P.pelvis, tw, c.shirt, lw);
    // stripes across torso
    if (ch.extras.includes('stripes') || ch.extras.includes('breton') || ch.extras.includes('hawaiian')) {
      const dx = P.pelvis.x - P.chest.x;
      const dy = P.pelvis.y - P.chest.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      ctx.strokeStyle = c.shirt2;
      ctx.lineWidth = tw * 0.16;
      for (let k = 0.15; k < 1; k += 0.25) {
        const cx = P.chest.x + dx * k;
        const cy = P.chest.y + dy * k;
        ctx.beginPath();
        ctx.moveTo(cx - nx * tw * 0.45, cy - ny * tw * 0.45);
        ctx.lineTo(cx + nx * tw * 0.45, cy + ny * tw * 0.45);
        ctx.stroke();
      }
    }
    if (rag.opts.lifejacket) seg(ctx, P.chest, { x: (P.chest.x * 2 + P.pelvis.x) / 3, y: (P.chest.y * 2 + P.pelvis.y) / 3 }, tw * 1.25, '#ff7a1a', lw);
    if (ch.dress) {
      // skirt flaring toward the knees
      ctx.fillStyle = c.shirt;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(P.pelvis.x, P.pelvis.y);
      const kx = (P.kneeL.x + P.kneeR.x) / 2;
      const ky = (P.kneeL.y + P.kneeR.y) / 2;
      const dx2 = kx - P.pelvis.x;
      const dy2 = ky - P.pelvis.y;
      const L2 = Math.hypot(dx2, dy2) || 1;
      const nx2 = -dy2 / L2;
      const ny2 = dx2 / L2;
      ctx.lineTo(P.pelvis.x + nx2 * 0.15 * s, P.pelvis.y + ny2 * 0.15 * s);
      ctx.lineTo(kx + nx2 * 0.26 * s + dx2 * 0.2, ky + ny2 * 0.26 * s + dy2 * 0.2);
      ctx.lineTo(kx - nx2 * 0.26 * s + dx2 * 0.2, ky - ny2 * 0.26 * s + dy2 * 0.2);
      ctx.lineTo(P.pelvis.x - nx2 * 0.15 * s, P.pelvis.y - ny2 * 0.15 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // torn in half
    const tw = 0.3 * s;
    const mid = { x: (P.chest.x + P.pelvis.x) / 2, y: (P.chest.y + P.pelvis.y) / 2 };
    seg(ctx, P.chest, { x: P.chest.x + (P.pelvis.x - P.chest.x) * 0.15, y: P.chest.y + (P.pelvis.y - P.chest.y) * 0.15 }, tw, c.shirt, lw);
    seg(ctx, P.pelvis, { x: P.pelvis.x + (P.chest.x - P.pelvis.x) * 0.15, y: P.pelvis.y + (P.chest.y - P.pelvis.y) * 0.15 }, tw, c.pants, lw);
    void mid;
  }
  // near limbs
  if (live(bones.thighR)) seg(ctx, P.pelvis, P.kneeR, legW, thigh, lw);
  if (live(bones.shinR)) seg(ctx, P.kneeR, P.footR, legW * 0.9, shin, lw);
  shoe(ctx, P.kneeR, P.footR, c.shoes, lw, s, true);
  if (live(bones.neckBase)) seg(ctx, P.chest, P.neck, 0.1 * s, c.skin, lw);
  if (live(bones.upperArmR)) seg(ctx, P.chest, P.elR, armW, sleeve, lw);
  if (live(bones.foreArmR)) seg(ctx, P.elR, P.handR, armW * 0.85, c.skin, lw);
  hand(ctx, P.handR, armW, c.skin, lw, true);
  // head
  const h = P.head;
  const ang = Math.atan2(h.y - P.neck.y, h.x - P.neck.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(rag.decapitated ? ang + t * 0 : ang);
  drawHead(ctx, ch, rag.headR, { expr: rag.expr, t, view: 'side', lw });
  ctx.restore();
  // stumps
  rag.stumps.forEach((b) => {
    stump(ctx, b.a, b.b, b.part && b.part.startsWith('thigh') ? legW : b.part === 'spine' ? 0.3 * s : b.part === 'neck' ? 0.1 * s : armW, style, lw);
    stump(ctx, b.b, b.a, b.part && b.part.startsWith('thigh') ? legW : b.part === 'spine' ? 0.3 * s : b.part === 'neck' ? 0.1 * s : armW, style, lw);
  });
}

function shoe(ctx, knee, foot, color, lw, s, ok) {
  if (!ok) return;
  const a = Math.atan2(foot.y - knee.y, foot.x - knee.x) - Math.PI / 2;
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0.05 * s, 0, 0.1 * s, 0.055 * s, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hand(ctx, p, armW, color, lw) {
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(p.x, p.y, armW * 0.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

function drawGiraffeRag(ctx, rag, lw, t) {
  const { P, bones, ch, s } = rag;
  const c = ch.colors;
  const style = rag.goreStyle || 'rainbow';
  const legW = 0.1 * s;
  const farC = shade(c.skin, -0.15);
  const leg = (b1, b2, a, k, f, col) => {
    if (live(bones[b1])) seg(ctx, P[a], P[k], legW, col, lw);
    if (live(bones[b2])) seg(ctx, P[k], P[f], legW * 0.85, col, lw);
    if (live(bones[b2])) {
      ctx.fillStyle = c.shoes;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(P[f].x, P[f].y, legW * 0.7, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  };
  leg('fr1', 'fr2', 'shoulders', 'frk', 'frf', farC);
  leg('br1', 'br2', 'hips', 'brk', 'brf', farC);
  if (live(bones.tail)) {
    seg(ctx, P.hips, P.tail, 0.04 * s, c.skin, lw);
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(P.tail.x, P.tail.y, 0.07 * s, 0, TAU);
    ctx.fill();
  }
  if (live(bones.body)) {
    seg(ctx, P.hips, P.shoulders, 0.55 * s, c.skin, lw);
    for (let i = 0; i < 6; i++) {
      const k = 0.1 + i * 0.16;
      ctx.fillStyle = RAINBOW[i];
      ctx.beginPath();
      ctx.arc(P.hips.x + (P.shoulders.x - P.hips.x) * k, P.hips.y + (P.shoulders.y - P.hips.y) * k + (i % 2 ? 0.08 : -0.08) * s, 0.08 * s, 0, TAU);
      ctx.fill();
    }
  }
  if (rag.opts.lifejacket) seg(ctx, P.shoulders, P.n1, 0.42 * s, '#ff7a1a', lw);
  // neck
  const neck = [['neck1', 'shoulders', 'n1', 0.3], ['neck2', 'n1', 'n2', 0.24], ['neck3', 'n2', 'head', 0.2]];
  neck.forEach(([b, a, z, w], i) => {
    if (!live(bones[b])) return;
    seg(ctx, P[a], P[z], w * s, c.skin, lw);
    ctx.fillStyle = RAINBOW[(i * 2 + 1) % RAINBOW.length];
    ctx.beginPath();
    ctx.arc((P[a].x + P[z].x) / 2, (P[a].y + P[z].y) / 2, 0.06 * s, 0, TAU);
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
  const h = P.head;
  const ang = Math.atan2(h.y - P.n2.y, h.x - P.n2.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(ang);
  drawHead(ctx, ch, rag.headR, { expr: rag.expr, t, view: 'side', lw });
  ctx.restore();
  rag.stumps.forEach((b) => {
    stump(ctx, b.a, b.b, b.part === 'body' ? 0.5 * s : b.part.startsWith('neck') ? 0.24 * s : legW, style, lw);
    stump(ctx, b.b, b.a, b.part === 'body' ? 0.5 * s : b.part.startsWith('neck') ? 0.24 * s : legW, style, lw);
  });
}

export const LIMB_BONES = {
  human: ['foreArmL', 'foreArmR', 'upperArmL', 'upperArmR', 'shinL', 'shinR', 'thighL', 'thighR'],
  giraffe: ['fl2', 'fr2', 'bl2', 'br2', 'fl1', 'br1', 'tail', 'fr1', 'bl1'],
};
export const HEAD_BONE = { human: 'neck', giraffe: 'neck3' };
export const SPINE_BONE = { human: 'spine', giraffe: 'body' };
