// Particle effects shared by the river (top-down, mode 'top') and drop (side view, mode 'side').
import { rand, pick, TAU, hsl, bigText } from './util.js';
import { RAINBOW } from '../data/characters.js';

const MAX = 900;

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
    this.p.push(p);
    return p;
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
    const n = Math.floor(10 + amount * 26);
    for (let i = 0; i < n; i++) {
      const sp = rand(2, 9) * (0.5 + amount * 0.6);
      const a = Math.atan2(dirY, dirX) + rand(-0.9, 0.9);
      const color = style === 'rainbow' ? pick(RAINBOW) : pick(['#c4001d', '#e0062a', '#9e0016', '#ff1f3d', '#7d0010']);
      if (this.mode === 'side') {
        this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.8, 1.8), size: rand(0.05, 0.13), color, kind: style === 'rainbow' ? 'glitter' : 'blood', drag: 0.25 });
      } else {
        this.add({ x, y, z: z + 0.4, vx: Math.cos(a) * sp * 0.4, vy: Math.sin(a) * sp * 0.4, vz: rand(2, 7), life: rand(0.5, 1.1), size: rand(0.05, 0.12), color, kind: style === 'rainbow' ? 'glitter' : 'blood', drag: 0.3 });
      }
    }
    if (style === 'rainbow') this.sparkles(x, y, 10, z);
  }

  gibs(x, y, amount = 1, style = 'blood', z = 0) {
    if (style === 'cartoon') return;
    const n = Math.floor(4 + amount * 8);
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(4, 12);
      const kind = pick(['chunk', 'chunk', 'chunk', 'bone', style === 'rainbow' ? 'heart' : 'chunk']);
      const color = style === 'rainbow' ? pick(RAINBOW) : pick(['#b3001b', '#d6334b', '#8c0a1e', '#e8667a']);
      this.add({ x, y, z, vx: Math.cos(a) * sp, vy: this.mode === 'side' ? Math.sin(a) * sp : rand(-2, 2), vz: this.mode === 'top' ? rand(3, 8) : 0, life: rand(2, 3.5), size: rand(0.1, 0.22), color, kind, drag: 0.2 });
    }
    if (Math.random() < 0.7 && style !== 'rainbow') {
      this.add({ x, y, z, vx: rand(-5, 5), vy: rand(-12, -6), vz: 4, life: 4, size: 0.12, color: '#fff', kind: 'eye', drag: 0.2 });
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

  feathers(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.add({ x, y, z: 1, vx: rand(-3, 3), vy: rand(-3, 0), vz: rand(1, 3), life: rand(1.5, 3), size: rand(0.18, 0.3), color: pick(['#ffd84d', '#ffe98a', '#f2b81c']), kind: 'feather', grav: 0.08, drag: 2 });
    }
  }

  cloud(x, y, color = 'rgba(200,0,30,0.35)', size = 1) {
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
        if (p.z < 0 && p.kind !== 'cloud' && p.kind !== 'foam' && p.kind !== 'smoke' && p.kind !== 'fire') {
          if (this.onLand && this.onLand(p, dt) === false) {
            this.p.splice(i, 1);
            continue;
          }
          p.z = 0;
          p.vz = -p.vz * 0.3;
          p.vx *= 0.5;
          p.vy *= 0.5;
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
        case 'drop':
        case 'blood':
        case 'dot':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s, 0, TAU);
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
          ctx.globalAlpha = fade * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(q.x, q.y, s, s * 0.55, 0, 0, TAU);
          ctx.fill();
          break;
        case 'smoke':
          ctx.globalAlpha = fade * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, s * (1.6 - fade * 0.6), 0, TAU);
          ctx.fill();
          break;
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
        case 'chunk':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = '#4a0008';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.2, s * 0.8, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.arc(-s * 0.3, -s * 0.3, s * 0.3, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
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
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = '#fbf3e0';
          ctx.strokeStyle = '#6b5a40';
          ctx.lineWidth = 1.2;
          ctx.fillRect(-s * 1.2, -s * 0.25, s * 2.4, s * 0.5);
          [-1, 1].forEach((sx) =>
            [-1, 1].forEach((sy) => {
              ctx.beginPath();
              ctx.arc(sx * s * 1.2, sy * s * 0.3, s * 0.35, 0, TAU);
              ctx.fill();
              ctx.stroke();
            })
          );
          ctx.restore();
          break;
        case 'eye':
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, s * 1.4, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#3a7bd5';
          ctx.beginPath();
          ctx.arc(s * 0.5, 0, s * 0.7, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(s * 0.7, 0, s * 0.35, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#c4001d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-s * 1.4, 0);
          ctx.quadraticCurveTo(-s * 2.4, s * 0.6, -s * 3, 0);
          ctx.stroke();
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
