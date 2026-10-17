// Particle effects shared by the river (top-down, mode 'top') and drop (side view, mode 'side').
// Gore styles: 'blood' (realistic-ish), 'rainbow' (Kacey), 'poop' (explosive diarrhea), 'fish' (salmon), 'cartoon'.
import { rand, pick, TAU, hsl, bigText } from './util.js';
import { RAINBOW } from '../data/characters.js';

const MAX = 1100;

export const GORE = {
  blood: {
    drops: ['#6e0000', '#850808', '#9c0f12', '#560000', '#a8141a', '#7a0306'],
    bright: '#b8101e',
    meat: ['#8e1a1a', '#a52a26', '#741212', '#b8443c', '#962020'],
    fat: '#ecd2a6',
    cloud: 'rgba(100,0,8,0.5)',
    decal: ['rgba(105,0,6,0.93)', 'rgba(130,6,12,0.9)', 'rgba(78,0,2,0.94)'],
    organ: ['#5e1424', '#7a2232', '#4a0c1a', '#6a1a10'],
    gut: ['#cf8a86', '#bd7470', '#d89a92', '#b86a68'],
  },
  rainbow: {
    drops: RAINBOW,
    bright: '#ff5cd6',
    meat: RAINBOW,
    fat: '#ffffff',
    cloud: 'rgba(255,90,214,0.35)',
    decal: RAINBOW.map((c) => c),
    organ: RAINBOW,
    gut: ['#ff9ad6', '#ffc0e8', '#c9a0ff'],
  },
  poop: {
    drops: ['#5a3a12', '#6b4718', '#3e2a0e', '#7a5a20', '#4a3010', '#82602a'],
    bright: '#7a5418',
    meat: ['#5a3a12', '#6b4718', '#4a3010', '#7a5a20'],
    fat: '#a88a4a',
    cloud: 'rgba(90,60,18,0.55)',
    decal: ['rgba(80,52,14,0.94)', 'rgba(100,68,22,0.9)', 'rgba(60,38,10,0.95)'],
    organ: ['#4a3010', '#5a3a12'],
    gut: ['#6b4718', '#7a5a20'],
  },
  fish: {
    drops: ['#7a0000', '#9c0f12', '#b0141e', '#650000'],
    bright: '#c8102e',
    meat: ['#ff8a6a', '#f47c5c', '#ffa184', '#e86a4e', '#ff9c7c'],
    fat: '#ffe0d0',
    cloud: 'rgba(120,0,10,0.5)',
    decal: ['rgba(120,0,8,0.9)', 'rgba(150,10,20,0.85)'],
    organ: ['#6e1a2a', '#8a2a3a', '#5a2a1a'],
    gut: ['#d9a38c', '#c98a7a', '#e8b8a0'],
  },
};
GORE.vomit = {
  drops: ['#a8c040', '#c8d860', '#8aa02a', '#d8c858'],
  bright: '#c8d860',
  meat: ['#d8c858', '#e8a050', '#c86a3a'],
  fat: '#f0e090',
  cloud: 'rgba(160,180,60,0.45)',
  decal: ['rgba(150,170,50,0.9)'],
  organ: ['#8aa02a'],
  gut: ['#a8c040'],
};
export const goreOf = (style) => GORE[style] || GORE.blood;

const shapeVerts = (n, jitter) => Array.from({ length: n }, () => 1 - jitter + Math.random() * jitter * 2);

export class FX {
  constructor(mode = 'side') {
    this.mode = mode;
    this.p = [];
    this.texts = [];
    this.gravity = mode === 'side' ? 26 : 30;
    this.onLand = null; // (particle) => boolean keep
    this.time = 0;
  }

  add(o) {
    if (this.p.length >= MAX) this.p.shift();
    const p = {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      life: 1, max: 1, size: 0.1, color: '#fff', kind: 'dot',
      rot: rand(0, TAU), vr: rand(-8, 8), drag: 0.6, grav: 1, alpha: 1,
      ...o,
    };
    p.max = p.life;
    if (p.kind === 'meat' || p.kind === 'organ') p.shape = shapeVerts(7, 0.35);
    if (p.kind === 'gut') p.shape = Array.from({ length: 6 }, () => rand(-1.1, 1.1));
    this.p.push(p);
    return p;
  }

  // velocity helper for both modes: side uses (vx, vy); top throws upward via vz
  vel(sp, a, upMin = 2, upMax = 7) {
    if (this.mode === 'side') return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0 };
    return { vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp * 0.4, vz: rand(upMin, upMax) };
  }

  // ---------- emitters ----------
  splash(x, y, power = 1, color = null) {
    const n = Math.floor(14 + power * 26);
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(3, 10) * (0.6 + power * 0.6);
      if (this.mode === 'side') {
        this.add({ x: x + rand(-0.4, 0.4) * power, y, vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp, life: rand(0.5, 1.1), size: rand(0.06, 0.16) * (0.7 + power * 0.4), color: color || pick(['#ffffff', '#dff6ff', '#bfe9ff', '#8fd8ff']), kind: 'drop', drag: 0.4 });
      } else {
        const b = rand(0, TAU);
        this.add({ x, y, z: 0.2, vx: Math.cos(b) * sp * 0.35, vy: Math.sin(b) * sp * 0.35, vz: rand(3, 9) * (0.6 + power * 0.4), life: rand(0.4, 0.9), size: rand(0.06, 0.14) * (0.8 + power * 0.3), color: color || pick(['#ffffff', '#dff6ff', '#bfe9ff']), kind: 'drop', drag: 0.5 });
      }
    }
    for (let i = 0; i < 4 + power * 5; i++) {
      this.add({ x: x + rand(-0.6, 0.6) * power, y: y + (this.mode === 'side' ? rand(-0.25, 0.05) : rand(-0.5, 0.5)), vx: rand(-1, 1), vy: this.mode === 'side' ? rand(-1.5, -0.3) : rand(-0.5, 0.5), life: rand(0.5, 1.1), size: rand(0.2, 0.42) * (0.7 + Math.min(power, 1.2) * 0.35), color: '#ffffff', kind: 'foam', grav: 0, drag: 2 });
    }
  }

  blood(x, y, dirX = 0, dirY = -1, amount = 1, style = 'blood', z = 0) {
    if (style === 'cartoon') return this.stars(x, y, 4, z);
    const G = goreOf(style);
    const n = Math.floor(14 + amount * 34);
    const base = Math.atan2(dirY, dirX);
    for (let i = 0; i < n; i++) {
      const sp = rand(2, 11) * (0.5 + amount * 0.55);
      const a = base + rand(-0.85, 0.85);
      const v = this.vel(sp, a);
      this.add({ x, y, z: z + 0.4, ...v, life: rand(0.8, 1.8), size: rand(0.035, 0.11), color: Math.random() < 0.15 ? G.bright : pick(G.drops), kind: style === 'rainbow' ? 'glitter' : 'blood', drag: 0.22, style });
    }
    // a fine mist of blood
    for (let i = 0; i < 4 + amount * 4; i++) {
      this.add({ x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), z: z + 0.5, vx: rand(-1.5, 1.5) + dirX, vy: rand(-1.5, 1.5) + dirY, vz: 1, life: rand(0.5, 1), size: rand(0.18, 0.35) * (0.6 + amount * 0.3), color: G.cloud, kind: 'mist', grav: 0.05, drag: 2 });
    }
    if (style === 'rainbow') this.sparkles(x, y, 10, z);
    if (style === 'poop') this.stink(x, y, 4, z);
  }

  gibs(x, y, amount = 1, style = 'blood', z = 0) {
    if (style === 'cartoon') return;
    const G = goreOf(style);
    const n = Math.floor(5 + amount * 9);
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const v = this.vel(rand(4, 13), a, 3, 9);
      const r = Math.random();
      let kind;
      if (style === 'poop') kind = r < 0.6 ? 'turd' : 'meat';
      else if (style === 'fish') kind = r < 0.55 ? 'meat' : r < 0.7 ? 'fishbone' : r < 0.85 ? 'organ' : 'gut';
      else if (style === 'rainbow') kind = r < 0.5 ? 'meat' : r < 0.7 ? 'heart' : r < 0.85 ? 'organ' : 'bone';
      else kind = r < 0.5 ? 'meat' : r < 0.68 ? 'bone' : r < 0.84 ? 'organ' : 'gut';
      const color = kind === 'organ' ? pick(G.organ) : kind === 'gut' ? pick(G.gut) : kind === 'turd' ? pick(G.drops) : pick(G.meat);
      this.add({ x, y, z, ...v, life: rand(2.5, 4.5), size: kind === 'gut' ? rand(0.18, 0.3) : rand(0.08, 0.2), color, fat: G.fat, kind, drag: 0.2, vr: rand(-10, 10), style });
    }
    if (style === 'blood' && Math.random() < 0.6) {
      const v = this.vel(rand(4, 8), rand(-Math.PI * 0.8, -Math.PI * 0.2), 4, 8);
      this.add({ x, y, z, ...v, life: 4, size: 0.1, color: '#fff', kind: 'eye', drag: 0.2 });
    }
  }

  // ropey intestines spilling out
  guts(x, y, n = 3, style = 'blood', z = 0) {
    if (style === 'cartoon') return;
    const G = goreOf(style);
    for (let i = 0; i < n; i++) {
      const v = this.vel(rand(2, 7), rand(-Math.PI * 0.9, -Math.PI * 0.1), 2, 6);
      this.add({ x, y, z, ...v, life: rand(4, 6), size: rand(0.22, 0.38), color: pick(G.gut), kind: style === 'poop' ? 'turd' : 'gut', drag: 0.3, vr: rand(-4, 4) });
    }
  }

  roe(x, y, n = 20, z = 0) {
    for (let i = 0; i < n; i++) {
      const v = this.vel(rand(2, 10), rand(-Math.PI, 0), 2, 8);
      this.add({ x, y, z, ...v, life: rand(2, 3.5), size: rand(0.035, 0.06), color: pick(['#ff7a1a', '#ff9a2b', '#ff6a00', '#ffb04a']), kind: 'roe', drag: 0.3 });
    }
  }

  scales(x, y, n = 30, z = 0) {
    for (let i = 0; i < n; i++) {
      const v = this.vel(rand(2, 9), rand(-Math.PI, 0), 2, 7);
      this.add({ x, y, z, ...v, life: rand(1.5, 3), size: rand(0.03, 0.06), color: pick(['#d8e4ec', '#b8c8d4', '#eef4f8', '#9ab0c0']), kind: 'glitter', grav: 0.4, drag: 1.2 });
    }
  }

  vomit(x, y, dirX = 1, dirY = 0, n = 26, z = 0) {
    const base = Math.atan2(dirY, dirX);
    for (let i = 0; i < n; i++) {
      const v = this.vel(rand(3, 8), base + rand(-0.35, 0.35), 1, 4);
      this.add({ x, y, z, ...v, life: rand(0.8, 1.5), size: rand(0.04, 0.1), color: pick(['#a8c040', '#c8d860', '#8aa02a', '#d8c858', '#b0a040']), kind: Math.random() < 0.3 ? 'meat' : 'blood', drag: 0.25, style: 'vomit', fat: '#f0e090' });
    }
  }

  stink(x, y, n = 5, z = 0) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-0.5, 0.5), y: y + rand(-0.3, 0.3), z: z + 0.5, vx: rand(-0.4, 0.4), vy: this.mode === 'side' ? rand(-1.6, -0.8) : rand(-0.3, 0.3), vz: 1.2, life: rand(1.2, 2), size: rand(0.25, 0.4), color: pick(['#8a9a2a', '#6a8a1a', '#9aaa3a']), kind: 'stink', grav: 0, drag: 0.5 });
    }
  }

  stars(x, y, n = 5, z = 0) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.add({ x, y, z: z + 0.5, vx: Math.cos(a) * 3, vy: (this.mode === 'side' ? Math.sin(a) * 3 - 2 : Math.sin(a) * 1.5), vz: 3, life: 1, size: 0.22, color: pick(['#ffe14d', '#ffffff', '#ffd000']), kind: 'star', grav: 0.15, drag: 1.5 });
    }
  }

  sparkles(x, y, n = 8, z = 0, colors = null) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-0.6, 0.6), y: y + rand(-0.6, 0.6), z: z + rand(0, 1), vx: rand(-2, 2), vy: rand(-3, 1), vz: rand(0, 2), life: rand(0.4, 1), size: rand(0.08, 0.2), color: pick(colors || ['#fff7b0', '#ffffff', '#ffe14d', '#b8f3ff']), kind: 'spark', grav: 0.05, drag: 1.5 });
    }
  }

  confetti(x, y, n = 60) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
      const sp = rand(6, 16);
      this.add({ x, y, z: 1, vx: Math.cos(a) * sp, vy: this.mode === 'side' ? Math.sin(a) * sp : rand(-3, 3), vz: rand(6, 12), life: rand(1.5, 3), size: rand(0.08, 0.16), color: pick(RAINBOW), kind: 'confetti', grav: 0.25, drag: 1.4 });
    }
  }

  debris(x, y, color, n = 8, size = 0.25, z = 0, kind = 'plank') {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(3, 11);
      this.add({ x, y, z: z + 0.3, vx: Math.cos(a) * sp, vy: this.mode === 'side' ? Math.sin(a) * sp : rand(-3, 3), vz: rand(3, 8), life: rand(1.5, 3), size: rand(size * 0.6, size * 1.3), color, kind, drag: 0.3 });
    }
  }

  smoke(x, y, n = 10, dark = true) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5), z: 0.5, vx: rand(-1.5, 1.5), vy: this.mode === 'side' ? rand(-3, -0.5) : rand(-1, 1), vz: 1, life: rand(1, 2.2), size: rand(0.5, 1.2), color: dark ? pick(['#3a3a40', '#55555c', '#2a2a2e']) : '#ffffff', kind: 'smoke', grav: 0, drag: 1 });
    }
  }

  fire(x, y, n = 20) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(2, 12);
      this.add({ x, y, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(2, 6), life: rand(0.3, 0.8), size: rand(0.3, 0.8), color: pick(['#ffdf3b', '#ff8a1f', '#ff3d1f', '#fff3a0']), kind: 'fire', grav: -0.1, drag: 2.5 });
    }
  }

  bubbles(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + rand(-0.4, 0.4), y: y + rand(-0.2, 0.3), z: 0, vx: rand(-0.3, 0.3), vy: this.mode === 'side' ? rand(-2.5, -1) : rand(-0.3, 0.3), vz: 0.5, life: rand(0.6, 1.4), size: rand(0.05, 0.14), color: '#e8fbff', kind: 'bubble', grav: 0, drag: 0.5 });
    }
  }

  feathers(x, y, n = 6, colors = null, size = 1) {
    for (let i = 0; i < n; i++) {
      this.add({ x, y, z: 1, vx: rand(-3, 3), vy: rand(-3, 0), vz: rand(1, 3), life: rand(1.5, 3), size: rand(0.18, 0.3) * size, color: pick(colors || ['#ffd84d', '#ffe98a', '#f2b81c']), kind: 'feather', grav: 0.08, drag: 2 });
    }
  }

  cloud(x, y, color = 'rgba(100,0,8,0.5)', size = 1) {
    this.add({ x, y, z: 0, vx: rand(-0.4, 0.4), vy: 0, vz: 0, life: rand(2.5, 4), size: size * rand(0.25, 0.45), color, kind: 'cloud', grav: 0, drag: 0.3, grow: rand(0.12, 0.25) * size });
  }

  text(str, x, y, color = '#fff', size = 26, z = 0, life = 1.1) {
    this.texts.push({ str, x, y, z, color, size, life, max: life, vy: -1 });
  }

  // ---------- simulation ----------
  update(dt) {
    this.time += dt;
    const g = this.gravity;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.p.splice(i, 1);
        continue;
      }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr;
      p.vy *= dr;
      p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
      if (this.mode === 'side') {
        p.vy += g * p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (this.onLand && this.onLand(p, dt) === false) {
          this.p.splice(i, 1);
        }
      } else {
        p.vz -= g * p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.z < 0 && p.kind !== 'cloud' && p.kind !== 'foam' && p.kind !== 'smoke' && p.kind !== 'fire' && p.kind !== 'mist' && p.kind !== 'stink') {
          if (this.onLand && this.onLand(p, dt) === false) {
            this.p.splice(i, 1);
            continue;
          }
          p.z = 0;
          p.vz = -p.vz * 0.3;
          p.vx *= 0.5;
          p.vy *= 0.5;
          p.vr *= 0.5;
        }
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  // project(x, y, z) -> {x, y, s} screen coords + pixels-per-unit
  render(ctx, project, layer = 'all') {
    for (const p of this.p) {
      const isBack = p.kind === 'cloud' || p.kind === 'foam';
      if (layer === 'back' && !isBack) continue;
      if (layer === 'front' && isBack) continue;
      const q = project(p.x, p.y, p.z);
      if (!q) continue;
      const s = Math.max(1, p.size * q.s);
      const fade = Math.min(1, p.life / (p.max * 0.35));
      ctx.globalAlpha = fade * p.alpha;
      switch (p.kind) {
        case 'blood': {
          // streak along its motion so blood reads as flung liquid, not dots
          const lx = p.lx ?? q.x;
          const ly = p.ly ?? q.y;
          let dx = q.x - lx;
          let dy = q.y - ly;
          const d = Math.hypot(dx, dy);
          const maxLen = s * 7;
          if (d > maxLen) {
            dx *= maxLen / d;
            dy *= maxLen / d;
          }
          ctx.strokeStyle = p.color;
          ctx.fillStyle = p.color;
          if (d > s * 0.6) {
            ctx.lineCap = 'round';
            ctx.lineWidth = s * 1.6;
            ctx.beginPath();
            ctx.moveTo(q.x - dx, q.y - dy);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(q.x, q.y, s, 0, TAU);
            ctx.fill();
          }
          p.lx = q.x;
          p.ly = q.y;
          break;
        }
        case 'drop':
        case 'dot':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s, 0, TAU);
          ctx.fill();
          break;
        case 'roe':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,220,0.8)';
          ctx.beginPath();
          ctx.arc(q.x - s * 0.35, q.y - s * 0.35, s * 0.35, 0, TAU);
          ctx.fill();
          break;
        case 'mist':
          ctx.globalAlpha = fade * 0.55;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s * (1.4 - fade * 0.4), 0, TAU);
          ctx.fill();
          break;
        case 'glitter': {
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-s, -s * 0.5, s * 2, s);
          ctx.restore();
          if (Math.sin(this.time * 30 + p.rot * 10) > 0.6) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(q.x - s * 0.4, q.y - s * 0.4, s * 0.8, s * 0.8);
          }
          break;
        }
        case 'foam':
          ctx.globalAlpha = fade * 0.45;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s, 0, TAU);
          ctx.fill();
          break;
        case 'cloud':
          ctx.globalAlpha = fade * 0.55;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(q.x, q.y, s, s * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(q.x + s * 0.3, q.y - s * 0.1, s * 0.6, s * 0.35, 0, 0, TAU);
          ctx.fill();
          break;
        case 'smoke':
          ctx.globalAlpha = fade * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s * (1.6 - fade * 0.6), 0, TAU);
          ctx.fill();
          break;
        case 'stink': {
          ctx.globalAlpha = fade * 0.7;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.5, s * 0.15);
          ctx.beginPath();
          for (let k = 0; k <= 8; k++) {
            const yy = q.y + s - (k / 8) * s * 2;
            const xx = q.x + Math.sin(k * 1.2 + this.time * 6 + p.rot) * s * 0.35;
            if (k === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
          break;
        }
        case 'fire':
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s * fade, 0, TAU);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'spark':
        case 'star':
          drawStar(ctx, q.x, q.y, s * (p.kind === 'star' ? 1 : 1.2), p.rot, p.color);
          break;
        case 'confetti':
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-s, -s * 0.4 * Math.abs(Math.sin(p.rot * 2)), s * 2, s * 0.8 * Math.abs(Math.sin(p.rot * 2)) + 1);
          ctx.restore();
          break;
        case 'plank':
        case 'shard':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 1.5;
          if (p.kind === 'plank') {
            ctx.fillRect(-s * 1.6, -s * 0.4, s * 3.2, s * 0.8);
            ctx.strokeRect(-s * 1.6, -s * 0.4, s * 3.2, s * 0.8);
          } else {
            ctx.beginPath();
            ctx.moveTo(-s, -s * 0.6);
            ctx.lineTo(s, -s * 0.2);
            ctx.lineTo(-s * 0.2, s * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
          break;
        case 'meat':
        case 'chunk': {
          // torn chunk of muscle with a fatty edge
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          const v = p.shape || [1, 1, 1, 1, 1, 1, 1];
          ctx.beginPath();
          v.forEach((k, i) => {
            const a = (i / v.length) * TAU;
            ctx.lineTo(Math.cos(a) * s * 1.25 * k, Math.sin(a) * s * 0.85 * k);
          });
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(40,0,0,0.7)';
          ctx.lineWidth = Math.max(1, s * 0.12);
          ctx.stroke();
          ctx.strokeStyle = p.fat || '#ecd2a6';
          ctx.lineWidth = Math.max(1, s * 0.22);
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.9, -2.4, -1.2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,170,160,0.45)';
          ctx.lineWidth = Math.max(0.8, s * 0.08);
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(-s * 0.7, k * s * 0.25);
            ctx.lineTo(s * 0.6, k * s * 0.3 + s * 0.1);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.ellipse(-s * 0.35, -s * 0.3, s * 0.25, s * 0.12, -0.4, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'organ': {
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot * 0.4);
          const g = ctx.createRadialGradient(-s * 0.4, -s * 0.4, s * 0.1, 0, 0, s * 1.4);
          g.addColorStop(0, '#b0505a');
          g.addColorStop(1, p.color);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(-s * 1.2, 0);
          ctx.bezierCurveTo(-s * 1.3, -s * 1.1, s * 0.6, -s * 1.2, s * 1.2, -s * 0.2);
          ctx.bezierCurveTo(s * 1.4, s * 0.8, s * 0.2, s * 0.6, 0, s * 0.3);
          ctx.bezierCurveTo(-s * 0.4, s * 0.9, -s * 1.1, s * 0.8, -s * 1.2, 0);
          ctx.fill();
          ctx.strokeStyle = 'rgba(30,0,10,0.7)';
          ctx.lineWidth = Math.max(1, s * 0.1);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.ellipse(-s * 0.4, -s * 0.5, s * 0.35, s * 0.12, -0.3, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'gut': {
          // a slimy loop of intestine
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot * 0.5);
          const v = p.shape || [0, 0, 0, 0, 0, 0];
          const seg = s * 0.7;
          const pts = [[-seg * 2.5, 0]];
          let ang = 0;
          for (let i = 0; i < v.length; i++) {
            ang += v[i] * 0.9 + Math.sin(this.time * 2 + i) * 0.1;
            const [px, py] = pts[pts.length - 1];
            pts.push([px + Math.cos(ang) * seg, py + Math.sin(ang) * seg]);
          }
          const path = () => {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length - 1; i++) {
              const mx = (pts[i][0] + pts[i + 1][0]) / 2;
              const my = (pts[i][1] + pts[i + 1][1]) / 2;
              ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
            }
          };
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          path();
          ctx.strokeStyle = 'rgba(70,10,15,0.85)';
          ctx.lineWidth = s * 0.62;
          ctx.stroke();
          path();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = s * 0.48;
          ctx.stroke();
          path();
          ctx.strokeStyle = 'rgba(255,230,230,0.45)';
          ctx.lineWidth = s * 0.12;
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'turd': {
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot * 0.6);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(30,18,4,0.8)';
          ctx.lineWidth = Math.max(1, s * 0.12);
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.ellipse(k * s * 0.7, Math.abs(k) * s * 0.1, s * 0.55, s * 0.42, k * 0.3, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,240,200,0.3)';
          ctx.beginPath();
          ctx.ellipse(-s * 0.4, -s * 0.2, s * 0.25, s * 0.1, -0.3, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'heart':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot * 0.2);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.8);
          ctx.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.6, -s * 1.3, 0, -s * 0.4);
          ctx.bezierCurveTo(s * 0.6, -s * 1.3, s * 1.6, -s * 0.2, 0, s * 0.8);
          ctx.fill();
          ctx.restore();
          break;
        case 'bone':
          // splintered bone with marrow
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = '#eee4cf';
          ctx.strokeStyle = '#7a6a50';
          ctx.lineWidth = Math.max(1, s * 0.12);
          ctx.beginPath();
          ctx.moveTo(-s * 1.4, -s * 0.35);
          ctx.quadraticCurveTo(-s * 1.8, -s * 0.6, -s * 1.7, 0);
          ctx.quadraticCurveTo(-s * 1.8, s * 0.6, -s * 1.4, s * 0.35);
          ctx.lineTo(s * 0.9, s * 0.25);
          ctx.lineTo(s * 1.2, s * 0.5);
          ctx.lineTo(s * 1.0, s * 0.05);
          ctx.lineTo(s * 1.4, -s * 0.2);
          ctx.lineTo(s * 0.8, -s * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#8a1a1a';
          ctx.beginPath();
          ctx.ellipse(s * 0.95, 0, s * 0.12, s * 0.18, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        case 'eye':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle = '#a03030';
          ctx.lineWidth = Math.max(1.5, s * 0.35);
          ctx.beginPath();
          ctx.moveTo(-s * 1.2, 0);
          ctx.quadraticCurveTo(-s * 2.2, s * 0.7, -s * 3.2, s * 0.2);
          ctx.stroke();
          ctx.fillStyle = '#f4efe8';
          ctx.strokeStyle = '#6a5a5a';
          ctx.lineWidth = Math.max(1, s * 0.1);
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.3, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(190,20,30,0.7)';
          ctx.lineWidth = Math.max(0.6, s * 0.06);
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU + 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * s * 1.25, Math.sin(a) * s * 1.25);
            ctx.lineTo(Math.cos(a + 0.3) * s * 0.7, Math.sin(a + 0.3) * s * 0.7);
            ctx.stroke();
          }
          ctx.fillStyle = '#3a6a9a';
          ctx.beginPath();
          ctx.arc(s * 0.55, 0, s * 0.55, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(s * 0.7, 0, s * 0.25, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        case 'bubble':
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s, 0, TAU);
          ctx.stroke();
          break;
        case 'feather':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(Math.sin(p.rot) * 0.8);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.5, s * 0.45, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#b8860b';
          ctx.beginPath();
          ctx.moveTo(-s * 1.6, 0);
          ctx.lineTo(s * 1.5, 0);
          ctx.stroke();
          ctx.restore();
          break;
        case 'fishbone':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle = '#f4f0e6';
          ctx.lineWidth = Math.max(1.5, s * 0.25);
          ctx.beginPath();
          ctx.moveTo(-s * 2, 0);
          ctx.lineTo(s * 2, 0);
          for (let k = -1; k <= 1; k += 0.5) {
            ctx.moveTo(k * s, -s * 0.8);
            ctx.lineTo(k * s, s * 0.8);
          }
          ctx.stroke();
          ctx.restore();
          break;
        default:
          ctx.fillStyle = p.color;
          ctx.fillRect(q.x - s, q.y - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  renderTexts(ctx, project) {
    for (const t of this.texts) {
      const k = 1 - t.life / t.max;
      const q = project(t.x, t.y, t.z);
      if (!q) continue;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.3));
      bigText(ctx, t.str, q.x, q.y - k * 50, t.size * pop, t.color);
    }
    ctx.globalAlpha = 1;
  }
}

// Screen-space splatter "on the lens": blood (or worse) that hits the camera and drips down.
export class Splatter {
  constructor() {
    this.s = [];
    this.vomitT = 0;
  }
  add(n = 5, style = 'blood', big = 1) {
    if (style === 'cartoon') return;
    const G = goreOf(style);
    for (let i = 0; i < n; i++) {
      const r = rand(0.03, 0.09) * big;
      this.s.push({
        x: rand(0.05, 0.95),
        y: rand(0.05, 0.8),
        r,
        color: pick(G.decal),
        verts: shapeVerts(12, 0.3),
        sats: Array.from({ length: 6 }, () => ({ a: rand(0, TAU), d: rand(1.2, 2.4), r: rand(0.08, 0.25) })),
        drips: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({ dx: rand(-0.6, 0.6), len: 0, speed: rand(0.02, 0.07), w: rand(0.12, 0.3) })),
        life: rand(4, 6),
        max: 6,
      });
    }
  }
  vomit() {
    this.vomitT = 0.0001;
  }
  update(dt) {
    for (let i = this.s.length - 1; i >= 0; i--) {
      const s = this.s[i];
      s.life -= dt;
      s.drips.forEach((d) => (d.len = Math.min(0.5, d.len + d.speed * dt)));
      if (s.life <= 0) this.s.splice(i, 1);
    }
    if (this.vomitT > 0) this.vomitT += dt;
    if (this.vomitT > 6) this.vomitT = 0;
  }
  render(ctx, W, H) {
    const m = Math.min(W, H);
    for (const s of this.s) {
      ctx.globalAlpha = Math.min(1, s.life / 1.5) * 0.92;
      const x = s.x * W;
      const y = s.y * H;
      const r = s.r * m;
      ctx.fillStyle = s.color;
      // blob, satellite droplets and drips are ONE path filled once (all wound clockwise), so overlaps
      // don't stack into darker spots that read as cartoon eyes
      const pts = s.verts.map((k, i) => {
        const a = (i / s.verts.length) * TAU;
        return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k];
      });
      ctx.beginPath();
      const n = pts.length;
      ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      for (let i = 1; i <= n; i++) {
        const p0 = pts[i % n];
        const p1 = pts[(i + 1) % n];
        ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
      }
      ctx.closePath();
      s.sats.forEach((t) => {
        const cx = x + Math.cos(t.a) * r * t.d;
        const cy = y + Math.sin(t.a) * r * t.d;
        ctx.moveTo(cx + r * t.r, cy);
        ctx.arc(cx, cy, r * t.r, 0, TAU);
        ctx.closePath();
      });
      s.drips.forEach((d) => {
        const dx = x + d.dx * r;
        const len = d.len * H;
        const w = r * d.w;
        ctx.moveTo(dx + w, y);
        ctx.lineTo(dx + w * 0.6, y + len);
        ctx.arc(dx, y + len, w * 0.75, 0, Math.PI, false);
        ctx.lineTo(dx - w, y);
        ctx.closePath();
      });
      ctx.fill('nonzero');
    }
    ctx.globalAlpha = 1;
    if (this.vomitT > 0) drawVomitScreen(ctx, W, H, this.vomitT);
  }
}

// "The viewer threw up": a chunky green wave rising over the bottom of the screen
function drawVomitScreen(ctx, W, H, t) {
  const rise = Math.min(1, t * 2.2);
  const fade = t > 4.5 ? Math.max(0, 1 - (t - 4.5) / 1.5) : 1;
  ctx.save();
  ctx.globalAlpha = 0.92 * fade;
  const top = H * (1 - 0.55 * rise);
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#b8c84a');
  g.addColorStop(0.5, '#9aaa30');
  g.addColorStop(1, '#7a8a20');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * W;
    const y = top + Math.sin(i * 1.7 + t * 3) * H * 0.03 + Math.sin(i * 0.6) * H * 0.04;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // chunks
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97.3) % 1) * W + ((i * 53) % W);
    const y = top + ((i * 37) % 100) / 100 * (H - top) + Math.sin(t * 2 + i) * 4;
    ctx.fillStyle = ['#d8c858', '#e8a050', '#c86a3a', '#f0e090', '#8a6a2a'][i % 5];
    ctx.beginPath();
    ctx.ellipse(x % W, y, 6 + (i % 4) * 4, 4 + (i % 3) * 3, i, 0, TAU);
    ctx.fill();
  }
  // drips running down from the top edge like it splashed the screen
  for (let i = 0; i < 9; i++) {
    const x = ((i * 0.137 + 0.05) % 1) * W;
    const len = Math.min(H * 0.35, t * 140 * (0.5 + (i % 3) * 0.3));
    ctx.fillStyle = '#a8b83a';
    ctx.beginPath();
    ctx.moveTo(x - 9, 0);
    ctx.lineTo(x - 5, len);
    ctx.arc(x, len, 6, Math.PI, 0, true);
    ctx.lineTo(x + 9, 0);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = fade;
  bigText(ctx, 'THE VIEWER THREW UP', W / 2, H * 0.62, Math.min(48, W * 0.08), '#e8ff8a', '#2a3a0a');
  ctx.globalAlpha = 1;
}

export function drawStar(ctx, x, y, r, rot = 0, color = '#ffe14d') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * TAU - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const rainbowColor = (t) => hsl((t * 120) % 360, 90, 60);
