// River phase: start on the bank, pick a spot, jump in, paddle while the current drags you to the brink.
// Also hosts Salmon Mode (swim upstream until a bear eats you).
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { FX } from './fx.js';
import { clamp, lerp, rand, rng, pick, approach, segDist, bigText, TAU, easeOutBack } from './util.js';
import { RW, RIVER_LEN, brinkAt, laneOf, LANE_NAME, LANE_BONUS, LANE_TIP, computeOdds, oddsColor } from './odds.js';
import * as art from './riverArt.js';
import { drawUpright, drawSalmonTop, drawBear, drawCat, GARY } from './charArt.js';
import { drawCraftTop, kayakPaddle, canoePaddle } from './vesselArt.js';
import { drawButton, drawJoystick, pill, bar, lumenIcon } from './hud.js';
import { OUCH, SCREAMS } from '../data/messages.js';
import { SALMON } from '../data/crafts.js';

const CHUNK = 16;
const BODY_HP = 60;
const ENTER_HOP = { nothing: 0.6, lifejacket: 1.9, surfboard: 1.1, barrel: 0.9, kayak: 0.35, canoe: 0.35, hamster: 1.0, jetski: 1.7, goose: 1.3, salmon: 1.4 };
const DEBRIS_KINDS = ['tire', 'duck', 'cone', 'cart', 'flamingo', 'crate'];
const ROCK_COLORS = ['#6e6a66', '#7a726a', '#5f6066', '#81776c', '#6a645c'];

export class River {
  constructor(game) {
    this.g = game;
    const { craft, character, cheats } = game.cfg;
    this.cheats = cheats;
    this.salmon = !!cheats.salmon;
    this.craft = this.salmon ? SALMON : craft;
    this.ch = character;
    this.fx = new FX('top');
    this.fx.onLand = (p) => this.onParticleLand(p);
    this.obs = [];
    this.props = [];
    this.rapids = [];
    this.chunks = new Set();
    this.seed = Math.floor(Math.random() * 1e9);
    this.t = 0;
    this.modeT = 0;
    this.paddleT = 0;
    this.trail = [];
    this.gulls = [];
    this.gullT = rand(4, 8);
    this.flags = {};
    this.run = { lumens: 0, pickups: 0, tricks: 0, eggs: 0, hits: 0, dodges: 0, upstream: 0 };
    const hp = this.craft.hp;
    this.p = {
      x: 0, d: -2.8, vx: 0, vd: 0, z: 0, vz: 0,
      hp, maxHp: hp, wrecked: false, ko: false,
      invuln: 0, cd: 0, abil: 0, spin: 0, hitT: 0, slip: 0, walking: false, dunk: 0, inRapids: false, joltT: 0,
      eggT: 3, scale: 1, rot: 0, pooped: 0,
    };
    this.cam = { x: 0, d: 0, zoom: 1 };
    this.mode = 'bank';
    this.peel = !this.salmon ? { x: rand(-RW + 2, RW - 2), used: false } : null;
    this.cat = character.id === 'annie' && !this.salmon ? { x: -RW + 2.5, riding: craft.id === 'barrel' } : null;
    this.bear = null;
    this.swipes = [];
    this.salmonT = 0;

    if (this.salmon) {
      this.p.x = -RW - 2.2;
      this.p.d = 60;
    }
    if (cheats.skipToEdge && !this.salmon) {
      this.p.x = 0;
      this.p.d = RIVER_LEN - 28;
      this.p.vd = 6;
      this.setMode('river');
    }
    this.cam.x = this.p.x;
    this.cam.d = this.p.d + 3;

    music.play(cheats.disco ? 'disco' : this.salmon ? 'salmon' : craft.id === 'goose' ? 'goose' : 'river');
    music.setIntensity(0);
    audio.loop('river', { brown: false, type: 'bandpass', f: 1100, q: 0.6, gain: 0.035 });
    audio.loop('falls', { brown: true, type: 'lowpass', f: 380, gain: 0.04 });
  }

  setMode(m) {
    this.mode = m;
    this.modeT = 0;
    if (m === 'river' && this.craft.id === 'jetski') audio.startEngine();
  }

  // ------------------------------------------------------------ world gen
  currentAt(x, d) {
    if (this.mode === 'bank') return 0;
    const lane = 1.28 - 0.45 * Math.pow(Math.abs(x) / RW, 2);
    const prog = clamp(d / RIVER_LEN, 0, 1);
    const ramp = this.salmon ? 1.25 : 1 + 1.15 * Math.pow(prog, 1.6);
    let c = 4.1 * lane * ramp;
    if (this.cheats.lazy) c *= 0.5;
    return c;
  }

  ensureChunks(dMin, dMax) {
    const c0 = Math.floor(dMin / CHUNK) - 1;
    const c1 = Math.floor(dMax / CHUNK) + 1;
    for (let c = c0; c <= c1; c++) {
      if (!this.chunks.has(c)) {
        this.chunks.add(c);
        this.genChunk(c);
      }
    }
    // forget far-behind stuff
    if (this.obs.length > 400) {
      const pd = this.p.d;
      this.obs = this.obs.filter((o) => Math.abs(o.d - pd) < 120);
      this.props = this.props.filter((o) => Math.abs(o.d - pd) < 120);
    }
  }

  genChunk(c) {
    const r = rng(this.seed + c * 1013);
    const d0 = c * CHUNK;
    const salmon = this.salmon;
    if (!salmon && d0 > brinkAt(RW) + 4) return;
    if (salmon || d0 >= -CHUNK) this.props.push(...art.makeProps(c, salmon).filter((p) => salmon || p.d < brinkAt(Math.sign(p.x) * RW) - 2));
    if (!salmon && d0 < 0) return;
    const prog = salmon ? 0.55 + Math.min(0.4, Math.abs(d0 - 60) / 500) : clamp(d0 / RIVER_LEN, 0, 1);
    const density = 0.55 + prog * 1.35;
    const safeStart = salmon ? Math.abs(d0 + 8 - 60) < 14 : d0 < 10;
    const nearBrink = (x, d) => !salmon && d > brinkAt(x) - 6;
    const add = (o) => {
      if (nearBrink(o.x, o.d)) return;
      this.obs.push(o);
    };
    if (!safeStart) {
      const nRocks = Math.round((2.4 + r() * 2.6) * density * (this.cheats.rockParty ? 3 : 1));
      for (let i = 0; i < nRocks; i++) {
        const edge = r() < 0.62;
        const sgn = r() < 0.5 ? -1 : 1;
        const x = clamp(edge ? sgn * RW * (0.42 + 0.5 * Math.sqrt(r())) : (r() * 2 - 1) * RW * 0.85, -RW + 1.3, RW - 1.3);
        const verts = Array.from({ length: 9 }, () => 0.78 + r() * 0.36);
        add({ type: 'rock', x, d: d0 + r() * CHUNK, r: 0.45 + r() * 0.8, verts, moss: r() < 0.4, color: ROCK_COLORS[Math.floor(r() * ROCK_COLORS.length)] });
      }
      if (r() < 0.25 + prog * 0.45) {
        add({ type: 'log', x: (r() * 2 - 1) * RW * 0.72, d: d0 + r() * CHUNK, len: 2.4 + r() * 2.2, a: r() * Math.PI, r: 0.32, vr: (r() - 0.5) * 0.7, drift: 0.55 + r() * 0.25, vx: 0 });
      }
      if (d0 > 50 && r() < 0.28) add({ type: 'whirl', x: (r() * 2 - 1) * RW * 0.55, d: d0 + r() * CHUNK, r: 1.5 + r() * 0.8 });
      const nDeb = r() < 0.45 ? 2 : 1;
      for (let i = 0; i < nDeb; i++) {
        add({ type: 'debris', kind: DEBRIS_KINDS[Math.floor(r() * DEBRIS_KINDS.length)], x: (r() * 2 - 1) * RW * 0.85, d: d0 + r() * CHUNK, r: 0.42, vx: 0, vd: 0, rot: r() * TAU });
      }
      if (d0 > 30 && r() < 0.2 + prog * 0.3) {
        const x0 = -RW + r() * RW * 1.2;
        this.rapids.push({ d0: d0 + r() * 6, d1: d0 + 10 + r() * 6, x0, x1: Math.min(RW - 0.3, x0 + 4 + r() * 7), seed: Math.floor(r() * 1e6) });
      }
    }
    // lumens to collect
    const patterns = this.cheats.lumenRain ? 4 : r() < 0.85 ? 1 : 2;
    for (let k = 0; k < patterns; k++) {
      const kind = r();
      const bx = (r() * 2 - 1) * RW * 0.75;
      const bd = d0 + r() * (CHUNK - 4);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = kind < 0.5 ? bx : bx + Math.sin((i / n) * Math.PI) * 2.2;
        const d = kind < 0.5 ? bd + i * 1.1 : bd + i * 1.0;
        add({ type: 'orb', x: clamp(x, -RW + 0.6, RW - 0.6), d, gold: r() < 0.07 });
      }
    }
  }

  // ------------------------------------------------------------ helpers
  get effCraftId() {
    if (this.salmon) return 'salmon';
    if (this.p.wrecked) return 'nothing';
    return this.craft.id;
  }
  get isSwimmer() {
    return this.p.wrecked || this.craft.swimmer;
  }
  voice() {
    return this.ch.voice || 1;
  }
  goreStyle() {
    const gore = this.g.cfg.settings.gore;
    if (gore === 'off') return 'cartoon';
    return this.ch.gore;
  }
  currentOdds() {
    const p = this.p;
    return computeOdds({
      craft: this.craft,
      hpRatio: p.hp / p.maxHp,
      wrecked: p.wrecked,
      ko: p.ko,
      lane: laneOf(p.x),
      speed: p.vd,
      cheats: this.cheats,
    });
  }
  say(str, color = '#fff', size = 24) {
    this.fx.text(str, this.p.x, this.p.d, color, size, 1.2, 1.7);
  }
  onParticleLand(p) {
    if (p.kind === 'blood' || p.kind === 'glitter') {
      if (Math.abs(p.x) < RW && Math.random() < 0.3) {
        this.fx.cloud(p.x, p.y, p.kind === 'glitter' ? 'rgba(255,90,214,0.3)' : 'rgba(180,0,25,0.32)', 0.5);
      }
      return false;
    }
    if (p.kind === 'drop' || p.kind === 'confetti') return false;
    return true;
  }

  // ------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    this.modeT += dt;
    const p = this.p;
    const inp = this.g.input;
    const cheats = this.cheats;

    // camera + world
    const S = this.scale();
    const viewUp = (this.g.H * 0.7) / S + 6;
    const viewDown = (this.g.H * 0.3) / S + 6;
    this.ensureChunks(this.cam.d - viewDown - 10, this.cam.d + viewUp + 30);

    switch (this.mode) {
      case 'bank':
        this.updateBank(dt, inp);
        break;
      case 'entering':
        this.updateEntering(dt);
        break;
      case 'river':
        this.updateRiver(dt, inp);
        break;
      case 'brink':
        this.updateBrink(dt);
        break;
      case 'bear':
        this.updateBear(dt);
        break;
      default:
        break;
    }

    // moving obstacles
    for (const o of this.obs) {
      if (Math.abs(o.d - p.d) > 60) continue;
      if (o.type === 'log') {
        o.d += this.currentAt(o.x, o.d) * o.drift * dt;
        o.a += o.vr * dt;
        o.x += o.vx * dt;
        o.vx *= Math.exp(-1.5 * dt);
        o.x = clamp(o.x, -RW + 1, RW - 1);
      } else if (o.type === 'debris') {
        o.d += (this.currentAt(o.x, o.d) * 0.7 + o.vd) * dt;
        o.x += o.vx * dt;
        o.vx *= Math.exp(-1.2 * dt);
        o.vd *= Math.exp(-1.2 * dt);
        o.rot += dt * 0.4;
        o.x = clamp(o.x, -RW + 0.5, RW - 0.5);
      }
    }
    if (!this.salmon) this.obs = this.obs.filter((o) => !(o.type !== 'orb' && o.type !== 'rock' && o.d > brinkAt(o.x) - 1));

    // gulls
    this.gullT -= dt;
    if (this.gullT <= 0 && this.mode === 'river') {
      this.gullT = rand(5, 10);
      const s = Math.random() < 0.5 ? -1 : 1;
      this.gulls.push({ x: s * (RW + 10), d: p.d + rand(4, 10), vx: -s * rand(5, 7), vd: p.vd * 0.9 + rand(-0.5, 0.5), poop: Math.random() < 0.3 && !this.flags.pooped });
      if (Math.random() < 0.6) audio.caw();
    }
    this.gulls.forEach((gl) => {
      gl.x += gl.vx * dt;
      gl.d += gl.vd * dt;
      if (gl.poop && Math.abs(gl.x - p.x) < 0.4 && Math.abs(gl.d - p.d) < 2.5) {
        gl.poop = false;
        this.flags.pooped = true;
        p.pooped = 6;
        audio.splat(0.3);
        audio.caw();
        this.fx.text('SEAGULL POOP!', p.x, p.d, '#ffffff', 24, 1.2, 1.8);
        this.fx.text('-100 DIGNITY', p.x, p.d - 1.2, '#ffd23b', 18, 0.8, 1.8);
      }
    });
    this.gulls = this.gulls.filter((gl) => Math.abs(gl.x) < RW + 14);

    // trail
    if (this.mode === 'river' || this.mode === 'brink') {
      this.trail.push({ x: p.x, d: p.d, life: 1 });
      if (this.trail.length > 40) this.trail.shift();
    }
    this.trail.forEach((tr) => (tr.life -= dt * 1.4));

    this.fx.update(dt);
    this.updateCamera(dt);
    this.updateAudio();
  }

  updateBank(dt, inp) {
    const p = this.p;
    if (this.salmon) {
      // salmon flops on the bank
      p.z = Math.abs(Math.sin(this.t * 6)) * 0.4;
      if (Math.abs(Math.sin(this.t * 6)) < 0.08 && this.modeT > 0.2 && Math.random() < 0.3) audio.squish();
      if (inp.pressed('primary') || inp.pressed('up') || inp.axisY() < -0.5 || inp.axisX() > 0.5) {
        this.setMode('entering');
        this.enterFrom = { x: p.x, d: p.d };
        audio.slideUp();
      }
      return;
    }
    if (p.slip > 0) {
      p.slip -= dt;
      p.walking = false;
      return;
    }
    const ax = inp.axisX();
    p.vx = ax * 4.8;
    p.x = clamp(p.x + p.vx * dt, -RW + 1.2, RW - 1.2);
    p.walking = Math.abs(ax) > 0.1;
    if (p.walking && Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) audio.tone({ type: 'triangle', f: 160 + Math.random() * 40, dur: 0.04, gain: 0.04 });
    // banana-- er, orange peel
    if (this.peel && !this.peel.used && p.walking && Math.abs(p.x - this.peel.x) < 0.5) {
      this.peel.used = true;
      p.slip = 1.3;
      audio.slip();
      audio.whoa(this.voice());
      if (this.ch.id === 'bobby') {
        this.say('NOT AGAIN!!!', '#ffd23b', 30);
        this.fx.text('HISTORY REPEATS +3', p.x, p.d - 1.3, '#fff6b0', 18, 0.5, 2);
        this.run.lumens += 3;
      } else {
        this.say('WHOOPS!', '#ffd23b', 28);
        this.run.lumens += 1;
      }
      this.fx.stars(p.x, p.d, 5);
    }
    if (this.cat && Math.abs(p.x - this.cat.x) < 1 && !this.flags.meow) {
      this.flags.meow = true;
      audio.meow();
      this.fx.text('meow', this.cat.x, -1, '#fff', 16, 1, 1);
    }
    if ((inp.pressed('primary') || inp.pressed('up') || inp.axisY() < -0.75) && this.modeT > 0.25) {
      this.setMode('entering');
      this.enterFrom = { x: p.x, d: p.d };
      const id = this.craft.id;
      if (id === 'jetski') audio.revUp();
      else if (id === 'goose') audio.honk();
      else if (id === 'hamster') audio.boing();
      else if (id === 'barrel') audio.thunk();
      else audio.whoa(this.voice());
    }
  }

  updateEntering(dt) {
    const p = this.p;
    const T = this.modeT;
    if (this.salmon) {
      const k = clamp(T / 0.8, 0, 1);
      p.x = lerp(this.enterFrom.x, -RW + 1.6, k);
      p.z = Math.sin(k * Math.PI) * 1.6;
      if (k >= 1 && !this.flags.splashed) {
        this.flags.splashed = true;
        this.fx.splash(p.x, p.d, 0.8);
        audio.splash(0.7);
        this.say('SALMON MODE!', '#ff8fa0', 30);
        this.setMode('river');
      }
      return;
    }
    if (T < 0.5) {
      p.d = lerp(this.enterFrom.d, -0.2, T / 0.5);
      p.walking = true;
      p.z = 0;
    } else if (T < 1.1) {
      const k = (T - 0.5) / 0.6;
      p.walking = false;
      p.d = lerp(-0.2, 1.4, k);
      p.z = Math.sin(k * Math.PI) * (ENTER_HOP[this.craft.id] || 1);
      if (this.craft.id === 'nothing') p.rot = k * 1.4; // faceplant
    } else {
      if (!this.flags.splashed) {
        this.flags.splashed = true;
        p.z = 0;
        p.rot = 0;
        const big = { lifejacket: 1.3, jetski: 1.2, barrel: 1.0, hamster: 0.9, goose: 0.8 }[this.craft.id] || 0.7;
        this.fx.splash(p.x, p.d, big);
        audio.splash(big);
        if (this.craft.id === 'lifejacket') this.say('CANNONBALL!', '#fff', 26);
        else if (this.craft.id === 'nothing') this.say('FACEPLANT!', '#fff', 26);
        else if (this.craft.id === 'goose') this.say('HONK!', '#ffd23b', 30);
        else this.say('HERE WE GO!', '#fff', 24);
        p.vd = 2;
      }
      p.d += p.vd * dt;
      if (T > 1.4) this.setMode('river');
    }
  }

  updateRiver(dt, inp) {
    const p = this.p;
    const C = this.craft;
    const cheats = this.cheats;
    const abilityId = C.ability.id;
    const active = p.abil > 0;
    p.cd = Math.max(0, p.cd - dt);
    p.abil = Math.max(0, p.abil - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hitT = Math.max(0, p.hitT - dt);
    p.spin = Math.max(0, p.spin - dt * 0.6);
    p.pooped = Math.max(0, p.pooped - dt);

    // ability
    if (inp.pressed('primary') && p.cd <= 0 && !p.ko && !(p.wrecked && abilityId !== 'panic')) this.activate(abilityId, inp);
    const wreckedPanic = p.wrecked && inp.pressed('primary') && p.cd <= 0 && !p.ko;
    if (wreckedPanic) this.activate('panic', inp);

    const panic = active && (abilityId === 'panic' || p.wrecked);
    const turbo = active && abilityId === 'turbo' && !p.wrecked;
    const powerMul = (cheats.superPaddle ? 2 : 1) * (panic ? 2.1 : 1) * (p.wrecked ? 0.7 : 1);
    const ax = p.ko ? 0 : inp.axisX();
    const ay = p.ko ? 0 : inp.axisY();
    const latAccel = (p.wrecked ? 12 : C.latAccel) * powerMul;
    const latMax = (p.wrecked ? 4.2 : C.latMax) * (cheats.superPaddle ? 1.5 : 1) * (turbo ? 1.7 : 1) * (panic ? 1.5 : 1);
    p.vx += ax * latAccel * dt;
    const drag = C.id === 'hamster' ? 0.9 : Math.abs(ax) < 0.1 ? 3.2 : 1.1;
    p.vx *= Math.exp(-drag * dt);
    p.vx = clamp(p.vx, -latMax, latMax);

    const cur = this.currentAt(p.x, p.d) * (p.inRapids ? 1.35 : 1);
    let target = cur;
    const fwd = p.wrecked ? 2 : C.fwdPower;
    const back = p.wrecked ? 2 : C.backPower;
    if (ay < 0) target += -ay * fwd * powerMul;
    if (ay > 0) target -= ay * back * powerMul;
    if (!this.salmon) target = Math.max(target, Math.max(1.3, cur * 0.42));
    if (turbo) target += 6;
    if (p.ko) target = cur * 1.5;
    p.vd = approach(p.vd, target, 2.4, dt);

    // paddle sounds
    this.paddleT -= dt;
    if ((Math.abs(ax) > 0.3 || Math.abs(ay) > 0.3) && this.paddleT <= 0 && !p.ko) {
      this.paddleT = 0.32;
      if (C.id !== 'jetski' && C.id !== 'goose') audio.paddle();
      if (Math.random() < 0.35) this.fx.splash(p.x + (ax >= 0 ? -0.7 : 0.7), p.d - 0.2, 0.15);
    }

    // jumping
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 24 * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        if (p.vz < -4) {
          this.fx.splash(p.x, p.d, 0.6);
          audio.splash(0.5);
          if (C.id === 'surfboard' && p.inRapids) {
            this.trick('SICK LANDING!', 2);
          }
        }
        p.vz = 0;
      }
    }

    // rapids
    p.inRapids = this.rapids.some((z) => p.x > z.x0 && p.x < z.x1 && p.d > z.d0 && p.d < z.d1);
    if (p.inRapids) {
      p.joltT -= dt;
      if (p.joltT <= 0) {
        p.joltT = rand(0.22, 0.45);
        if (p.z <= 0) {
          p.vx += rand(-3.2, 3.2) * (C.id === 'barrel' ? 0.5 : 1);
          this.fx.splash(p.x, p.d, 0.25);
          this.g.shake(0.25);
          if (C.id === 'surfboard' && !p.wrecked) this.trick('SHRED!', 1);
          if (C.id === 'hamster') p.vz = 3;
        }
      }
    }

    // golden goose lays golden eggs
    if (C.id === 'goose' && !this.salmon) {
      p.eggT -= dt;
      if (p.eggT <= 0) {
        p.eggT = rand(2.5, 4);
        this.run.eggs++;
        this.run.lumens += 3;
        audio.bigPickup();
        this.fx.text('+3 GOLDEN EGG!', p.x, p.d, '#ffd23b', 20, 1, 1.6);
        this.fx.sparkles(p.x, p.d - 0.8, 10);
      }
    }

    p.x += p.vx * dt;
    p.d += p.vd * dt;

    // walls
    const lim = RW - this.craft.radius * 0.9;
    if (Math.abs(p.x) > lim) {
      const s = Math.sign(p.x);
      p.x = s * lim;
      if (Math.abs(p.vx) > 3 && p.invuln <= 0) {
        this.fx.splash(p.x, p.d, 0.4);
        audio.thud();
        if (Math.abs(p.vx) > 5) this.damage(Math.abs(p.vx) * 1.2, 'wall');
      }
      p.vx = -p.vx * 0.5;
    }

    this.collide(dt, turbo);

    if (this.salmon) this.updateSalmon(dt);
    else if (p.d >= brinkAt(p.x) - 0.4) this.startBrink();
  }

  activate(id, inp) {
    const p = this.p;
    const C = this.craft;
    p.cd = id === 'panic' && p.wrecked ? 4.5 : C.ability.cd;
    p.abil = id === 'panic' && p.wrecked ? 1.3 : C.ability.dur;
    switch (id) {
      case 'panic':
        audio.scream(this.voice(), 0.9);
        this.say(pick(SCREAMS), '#ffd23b', 22);
        break;
      case 'bob':
        p.vz = 7;
        audio.boing();
        break;
      case 'ollie':
        p.vz = 8.5;
        audio.slideUp();
        this.fx.splash(p.x, p.d, 0.3);
        break;
      case 'bounce':
        p.vz = 10;
        audio.boing();
        break;
      case 'flap':
        p.vz = 9;
        audio.honk();
        this.fx.feathers(p.x, p.d, 5);
        break;
      case 'leap':
        p.vz = 9.5;
        audio.slideUp();
        this.fx.splash(p.x, p.d, 0.4);
        break;
      case 'brace':
        audio.thunk();
        this.say('BRACED!', '#ffd23b', 22);
        break;
      case 'roll':
        audio.splash(0.6);
        this.fx.bubbles(p.x, p.d, 8);
        break;
      case 'power': {
        const dir = Math.abs(inp.axisX()) > 0.2 ? Math.sign(inp.axisX()) : p.vx >= 0 ? 1 : -1;
        p.vx += dir * 11;
        const ay = inp.axisY();
        if (ay > 0.3) p.vd -= 4;
        else if (ay < -0.3) p.vd += 4;
        audio.paddle();
        setTimeout(() => audio.paddle(), 90);
        this.say('STROKE!', '#fff', 20);
        if (Math.random() < 0.5) this.fx.text('GARY: "WHY?!"', p.x, p.d + 1.5, '#9ef', 16, 1, 1.4);
        break;
      }
      case 'turbo':
        audio.revUp();
        this.say('TURBO!', '#2bb6ff', 26);
        break;
      default:
        break;
    }
  }

  trick(label, lumens) {
    this.run.tricks++;
    this.run.lumens += lumens;
    this.fx.text(`${label} +${lumens}`, this.p.x, this.p.d, '#7fffd4', 20, 1, 1.2);
    audio.pickup(1.3);
  }

  collide(dt, turbo) {
    const p = this.p;
    const C = this.craft;
    const rad = this.salmon ? 0.5 : p.wrecked ? 0.5 : C.radius;
    const airborne = p.z > 0.4;
    const rolling = C.ability.id === 'roll' && p.abil > 0 && !p.wrecked;
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      if (Math.abs(o.d - p.d) > 6) continue;
      if (o.type === 'orb') {
        if (Math.hypot(o.x - p.x, o.d - p.d) < rad + 0.55 && p.z < 2.2) {
          this.obs.splice(i, 1);
          const v = o.gold ? 5 : 1;
          this.run.lumens += v;
          this.run.pickups++;
          o.gold ? audio.bigPickup() : audio.pickup(1 + Math.random() * 0.1);
          this.fx.sparkles(o.x, o.d, o.gold ? 14 : 6);
          this.fx.text(`+${v}`, o.x, o.d, o.gold ? '#ffd23b' : '#fff6b0', o.gold ? 26 : 18, 0.6, 0.8);
        }
        continue;
      }
      if (o.type === 'whirl') {
        const dx = p.x - o.x;
        const dd = p.d - o.d;
        const dist = Math.hypot(dx, dd);
        if (dist < o.r && !airborne) {
          const k = 1 - dist / o.r;
          p.vx += (-dd / (dist + 0.01)) * 9 * k * dt * 3;
          p.vx -= (dx / (dist + 0.01)) * 4 * k * dt * 3;
          p.vd = approach(p.vd, p.vd * 0.4, 3 * k, dt);
          p.spin = Math.min(1.5, p.spin + dt * 2.2);
          if (!o.announced) {
            o.announced = true;
            this.say('WHIRLPOOL!', '#9ef', 22);
            audio.whoosh(0.8);
          }
          if (k > 0.7 && this.isSwimmer) {
            p.dunk += dt;
            if (p.dunk > 1) {
              p.dunk = 0;
              this.damage(8, 'dunk');
              audio.glub();
              this.fx.bubbles(p.x, p.d, 8);
            }
          }
        }
        continue;
      }
      if (airborne || rolling) continue;
      if (o.type === 'rock') {
        const dx = p.x - o.x;
        const dd = p.d - o.d;
        const dist = Math.hypot(dx, dd);
        const minD = o.r + rad * 0.85;
        if (dist < minD) this.hit(o, dx / (dist || 1), dd / (dist || 1), minD - dist);
      } else if (o.type === 'log') {
        const hx = (Math.cos(o.a) * o.len) / 2;
        const hd = (Math.sin(o.a) * o.len) / 2;
        const sd = segDist(p.x, p.d, o.x - hx, o.d - hd, o.x + hx, o.d + hd);
        const minD = o.r + rad * 0.85;
        if (sd.d < minD) {
          if (turbo || C.id === 'goose') {
            this.obs.splice(i, 1);
            this.fx.debris(o.x, o.d, '#8a5a2b', 12, 0.3);
            audio.woodBreak();
            this.run.lumens += 2;
            this.fx.text(C.id === 'goose' ? 'HONKED IT! +2' : 'SMASH! +2', o.x, o.d, '#ffd23b', 22, 0.6, 1);
            if (C.id === 'goose') audio.honk();
            continue;
          }
          const nx = (p.x - sd.cx) / (sd.d || 1);
          const nd = (p.d - sd.cy) / (sd.d || 1);
          this.hit(o, nx, nd, minD - sd.d);
          o.vx -= nx * 1.5;
        }
      } else if (o.type === 'debris') {
        const dx = p.x - o.x;
        const dd = p.d - o.d;
        const dist = Math.hypot(dx, dd);
        const minD = o.r + rad * 0.85;
        if (dist < minD) {
          const nx = dx / (dist || 1);
          const nd = dd / (dist || 1);
          o.vx -= nx * 5;
          o.vd -= nd * 3;
          p.x += nx * (minD - dist);
          p.d += nd * (minD - dist) * 0.5;
          if (p.invuln <= 0) {
            p.invuln = 0.4;
            this.damage(5, 'debris');
            audio.bonk();
            if (o.kind === 'duck') this.fx.text('SQUEAK!', o.x, o.d, '#ffd23b', 18, 0.5, 0.8);
          }
        }
      }
    }
  }

  hit(o, nx, nd, overlap) {
    const p = this.p;
    const C = this.craft;
    p.x += nx * overlap;
    p.d += nd * overlap;
    const relV = p.vx * nx + p.vd * nd;
    const bounce = this.salmon ? 0.8 : p.wrecked ? 0.5 : C.bounce;
    if (relV < 0) {
      p.vx -= (1 + bounce) * relV * nx;
      p.vd -= (1 + bounce) * relV * nd;
      if (!this.salmon) p.vd = Math.max(p.vd, -2.5);
    }
    // the current washes you around obstacles instead of pinning you behind them
    if (o.type === 'rock') {
      const away = Math.abs(nx) > 0.15 ? Math.sign(nx) : p.x > 0 ? -1 : 1;
      p.vx += away * 2.2;
    }
    if (p.invuln > 0) return;
    const speed = Math.max(0, -relV);
    if (speed < 0.6) return;
    p.invuln = 0.45;
    this.run.hits++;
    if (C.id === 'goose' && !p.wrecked) {
      audio.honk();
      this.fx.text('HONK!', p.x, p.d, '#ffd23b', 22, 0.6, 0.8);
      this.fx.feathers(p.x, p.d, 3);
      return;
    }
    if (this.salmon) {
      audio.squish();
      return;
    }
    const brace = C.ability.id === 'brace' && p.abil > 0 && !p.wrecked;
    const dmg = (4 + speed * 4.4) * (p.wrecked ? 1.2 : C.damageMult) * (brace ? 0.25 : 1);
    this.fx.splash(p.x - nx * 0.5, p.d - nd * 0.5, 0.5);
    this.g.shake(Math.min(1, 0.25 + speed * 0.07));
    if (this.isSwimmer) {
      const style = this.goreStyle();
      this.fx.blood(p.x - nx * 0.4, p.d - nd * 0.4, -nx, -nd, 0.5 + speed * 0.06, style, 0.3);
      if (style !== 'cartoon' && o.type === 'rock') o.blood = style === 'rainbow' ? 'rainbow' : 'red';
      audio.splat(0.6);
      audio.oof(this.voice());
      this.fx.text(pick(OUCH), p.x, p.d, '#ff5a5a', 22, 1, 1);
    } else {
      switch (C.id) {
        case 'barrel':
          audio.thunk();
          break;
        case 'hamster':
          audio.boing();
          break;
        case 'jetski':
          audio.crack();
          audio.bonk();
          break;
        default:
          audio.thunk();
          audio.crack();
      }
      if (speed > 3) audio.oof(this.voice());
      this.fx.debris(p.x - nx * 0.5, p.d - nd * 0.5, C.id === 'hamster' ? '#bfeaff' : C.id === 'jetski' ? '#e8203a' : '#8a5a2b', 3, 0.15, 0.3, C.id === 'hamster' ? 'shard' : 'plank');
    }
    this.damage(dmg, o.type);
  }

  damage(amount, cause) {
    const p = this.p;
    if (this.cheats.invincible || this.salmon || (this.craft.id === 'goose' && !p.wrecked)) return;
    p.hp -= amount;
    p.hitT = 0.5;
    if (p.hp > 0) return;
    if (!p.wrecked && !this.craft.swimmer) {
      // vessel destroyed, now you're swimming
      p.wrecked = true;
      p.hp = p.maxHp = BODY_HP;
      p.invuln = 1;
      const C = this.craft;
      const col = { barrel: '#8a5a2b', kayak: '#ff4f2b', canoe: '#2e8b57', surfboard: '#ffe14d', hamster: '#bfeaff', jetski: '#e8203a' }[C.id] || '#888';
      this.fx.debris(p.x, p.d, col, 18, 0.35, 0.3, C.id === 'hamster' ? 'shard' : 'plank');
      if (C.id === 'jetski') {
        audio.boom(0.6);
        this.fx.fire(p.x, p.d, 20);
        this.fx.smoke(p.x, p.d, 10);
      } else if (C.id === 'hamster') {
        audio.pop();
        audio.shatter();
      } else audio.woodBreak();
      this.g.shake(1);
      this.fx.text(`${C.short.toUpperCase()} DESTROYED!`, p.x, p.d, '#ff5a5a', 26, 1.5, 2.2);
      if (C.id === 'canoe') this.fx.text('GARY SWIMS AWAY', p.x + 2, p.d + 1.5, '#9ef', 16, 1, 2);
    } else if (!p.ko) {
      p.ko = true;
      p.hp = 0;
      audio.bonk();
      audio.glub();
      this.fx.stars(p.x, p.d, 6, 0.8);
      this.fx.text('KNOCKED OUT!', p.x, p.d, '#ff5a5a', 28, 1.4, 2.4);
    }
  }

  // ------------------------------------------------------------ salmon mode
  updateSalmon(dt) {
    const p = this.p;
    this.salmonT += dt;
    this.run.upstream = Math.max(this.run.upstream, 60 - p.d);
    // salmon refuse to go over the falls
    if (p.d > brinkAt(p.x) - 5) {
      p.vd = -11;
      p.vz = 8;
      p.d = brinkAt(p.x) - 5;
      if (!this.flags.nopeT || this.t - this.flags.nopeT > 2) {
        this.flags.nopeT = this.t;
        this.say('NOPE! SALMON SWIM UP!', '#ff8fa0', 24);
        audio.slideUp();
      }
    }
    if (this.salmonT > 14 && !this.bear) {
      this.bear = { x: -RW - 3, d: p.d + 8, mouth: 0 };
      audio.roar();
      this.g.shake(0.8);
      this.say('A BEAR!!!', '#ff5a5a', 34);
    }
    if (this.bear) {
      this.bear.d = approach(this.bear.d, p.d + 6, 1.5, dt);
      this.bear.x = p.x < 0 ? -RW - 3 : RW + 3;
      if (!this.swipeT) this.swipeT = 3;
      this.swipeT -= dt;
      const dodges = this.run.dodges;
      if (this.swipeT <= 0 && this.swipes.length === 0) {
        if (dodges >= 4 || this.salmonT > 52) {
          this.startBearFinale(p.x, p.d + 5);
          return;
        }
        this.swipeT = rand(2.4, 3.6);
        this.swipes.push({ x: clamp(p.x + p.vx * 0.7, -RW + 1.5, RW - 1.5), d: p.d + p.vd * 0.7 + 0.5, r: 1.8, t: 1.15 });
        audio.roar();
      }
      for (let i = this.swipes.length - 1; i >= 0; i--) {
        const s = this.swipes[i];
        s.t -= dt;
        if (s.t <= 0) {
          this.swipes.splice(i, 1);
          this.fx.splash(s.x, s.d, 1);
          audio.splash(1);
          this.g.shake(0.7);
          if (Math.hypot(p.x - s.x, p.d - s.d) < s.r && p.z < 1) {
            this.startBearFinale(s.x, s.d + 2);
            return;
          }
          this.run.dodges++;
          this.run.lumens += 3;
          this.fx.text('DODGED! +3', p.x, p.d, '#7fffd4', 24, 1, 1.2);
          audio.pickup(1.2);
        }
      }
    }
  }

  startBearFinale(x, d) {
    this.setMode('bear');
    this.swipes = [];
    this.bigBear = { x, d, rise: 0, mouth: 0, chomped: false };
    audio.roar();
    music.stop();
    this.g.shake(1.2);
    this.say('THE BEAR ALWAYS WINS', '#ff5a5a', 30);
  }

  updateBear(dt) {
    const p = this.p;
    const B = this.bigBear;
    B.rise = Math.min(1, B.rise + dt * 1.4);
    B.mouth = clamp((this.modeT - 0.5) * 1.5, 0, 1);
    if (this.modeT > 0.6 && !B.chomped) {
      p.x = approach(p.x, B.x, 4, dt);
      p.d = approach(p.d, B.d - 0.6, 4, dt);
      p.z = approach(p.z, 1.6, 3, dt);
      p.rot += dt * 8;
    }
    if (this.modeT > 1.5 && !B.chomped) {
      B.chomped = true;
      B.mouth = 0;
      audio.chomp();
      this.g.shake(1.4);
      const style = this.g.cfg.settings.gore === 'off' ? 'cartoon' : 'blood';
      this.fx.blood(p.x, p.d, 0, 1, 1.6, style, 1.5);
      this.fx.gibs(p.x, p.d, 0.5, style, 1.5);
      for (let i = 0; i < 4; i++) this.fx.add({ x: p.x, y: p.d, z: 1.5, vx: rand(-4, 4), vy: rand(-2, 2), vz: rand(4, 9), life: 3, size: 0.18, color: '#fff', kind: 'fishbone', drag: 0.2 });
      this.fx.text('CHOMP!', p.x, p.d + 2, '#ff5a5a', 40, 2, 2);
    }
    if (B.chomped) B.mouth = Math.max(0, Math.sin((this.modeT - 1.5) * 10) * 0.4);
    if (this.modeT > 3.4 && !this.flags.finished) {
      this.flags.finished = true;
      const lumens = 3 + Math.floor(this.run.upstream / 8) + this.run.lumens;
      audio.sadTrombone();
      this.g.finish({
        survived: false,
        cause: 'bear',
        odds: 0,
        lumensBase: lumens,
        breakdown: [
          ['Swam upstream', Math.floor(this.run.upstream / 8)],
          ['Lumens collected', this.run.lumens - this.run.dodges * 3],
          ['Bear dodges', this.run.dodges * 3],
          ['Participation', 3],
        ],
        limbs: 0,
        salmon: true,
      });
    }
  }

  // ------------------------------------------------------------ brink
  startBrink() {
    const p = this.p;
    this.setMode('brink');
    this.brinkInfo = {
      x: p.x,
      lane: laneOf(p.x),
      speed: Math.max(4, p.vd),
      hpRatio: p.hp / p.maxHp,
      wrecked: p.wrecked,
      ko: p.ko,
      lumens: this.run.lumens,
      run: { ...this.run },
      progress: 1,
    };
    audio.stopEngine();
    audio.scream(this.voice(), 1.4);
    audio.whoosh(1.2);
    music.play('drop');
    this.g.shake(0.6);
    if (this.cat && this.cat.riding) {
      this.catJump = { t: 0, x0: p.x, d0: p.d, x1: p.x < 0 ? -RW - 2 : RW + 2, d1: p.d - 4 };
      this.fx.text('THE CAT BAILED. SMART CAT.', p.x, p.d - 2, '#ffd23b', 18, 1, 2);
      audio.meow();
    }
  }

  updateBrink(dt) {
    const p = this.p;
    p.d += p.vd * dt * 0.6;
    p.scale = Math.max(0.2, 1 - this.modeT * 0.55);
    p.rot = this.modeT * 1.2;
    this.cam.zoom = approach(this.cam.zoom, 1.45, 3, dt);
    if (this.catJump) this.catJump.t = Math.min(1, this.catJump.t + dt * 1.2);
    if (Math.random() < 0.6) this.fx.splash(p.x + rand(-1, 1), p.d + rand(0, 1), 0.3);
    if (this.modeT > 1.35 && !this.flags.toDrop) {
      this.flags.toDrop = true;
      this.g.toDrop(this.brinkInfo);
    }
  }

  // ------------------------------------------------------------ camera / audio
  scale() {
    const { W, H } = this.g;
    return clamp(Math.min(W / 11, H / 14), 24, 66) * this.cam.zoom;
  }
  updateCamera(dt) {
    const p = this.p;
    const S = this.scale();
    const halfView = this.g.W / 2 / S;
    let tx = p.x;
    const span = RW + 5;
    if (halfView >= span) tx = 0;
    else tx = clamp(tx, -span + halfView, span - halfView);
    this.cam.x = approach(this.cam.x, tx, 4, dt);
    // keep the player around 70-75% down the screen, leaning the view ahead a little when fast
    const H = this.g.H;
    const lead = this.mode === 'river' ? clamp(p.vd * 0.3, -2, 3) : 0;
    const td = this.mode === 'bank' && !this.salmon ? p.d + 2.5 : p.d + clamp(0.5 + lead, -1, (0.04 * H) / S);
    this.cam.d = approach(this.cam.d, td, 5, dt);
  }
  updateAudio() {
    const p = this.p;
    const prog = this.salmon ? 0.3 : clamp(p.d / RIVER_LEN, 0, 1);
    music.setIntensity(Math.pow(prog, 0.8));
    audio.setLoop('falls', 0.03 + Math.pow(prog, 2.2) * 0.42, 260 + prog * 500);
    audio.setLoop('river', this.mode === 'bank' ? 0.02 : 0.045);
    if (this.craft.id === 'jetski' && this.mode === 'river') {
      const ay = this.g.input.axisY();
      audio.setEngine(clamp(0.35 - ay * 0.5 + (p.abil > 0 ? 0.6 : 0), 0, 1));
    }
    if (!this.salmon && p.d > RIVER_LEN - 30 && !this.flags.gasp) {
      this.flags.gasp = true;
      audio.gasp();
    }
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const { W, H } = this.g;
    const S = this.scale();
    const camX = this.cam.x;
    const camD = this.cam.d;
    const anchorY = H * (this.mode === 'bank' && !this.salmon ? 0.62 : 0.72);
    const sx = (x) => W / 2 + (x - camX) * S;
    const sy = (d, z = 0) => anchorY - (d - camD) * S - z * S * 0.9;
    const dMin = camD - (H - anchorY) / S - 2;
    const dMax = camD + anchorY / S + 4;
    const v = { ctx, W, H, S, sx, sy, dMin, dMax, t: this.t, disco: this.cheats.disco, salmon: this.salmon };
    this.view = v;

    // ground
    const brinkVisible = !this.salmon && sy(brinkAt(0)) > -10;
    if (brinkVisible) art.drawBeyond(v);
    ctx.fillStyle = '#5cb848';
    if (brinkVisible) {
      const yb = sy(brinkAt(0));
      ctx.fillRect(0, yb, W, H - yb);
      const ylim = sy(brinkAt(RW) + 1);
      ctx.fillRect(0, ylim, sx(-RW), yb - ylim);
      ctx.fillRect(sx(RW), ylim, W - sx(RW), yb - ylim);
    } else {
      ctx.fillRect(0, 0, W, H);
    }
    art.drawBankGround(v, this.salmon);
    art.drawWater(v, { salmon: this.salmon, rapids: this.rapids, flow: (x) => this.currentAt(x, camD) || 1.5 });
    if (!this.salmon) art.drawBeach(v, { peel: this.peel, cat: this.cat && (!this.cat.riding || this.mode === 'bank') ? this.cat : null });

    // wake trail
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      if (b.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, b.life) * 0.6;
      ctx.lineWidth = S * 0.12;
      [-1, 1].forEach((sd) => {
        const spread = (1 - b.life) * 1.6 + 0.4;
        ctx.beginPath();
        ctx.moveTo(sx(a.x + sd * spread), sy(a.d - 0.6));
        ctx.lineTo(sx(b.x + sd * spread), sy(b.d - 0.6));
        ctx.stroke();
      });
    }
    ctx.restore();

    this.fx.render(ctx, (x, y, z) => ({ x: sx(x), y: sy(y, z), s: S }), 'back');

    // flat things first
    for (const o of this.obs) if (o.type === 'whirl' && o.d > dMin - 3 && o.d < dMax + 3) art.drawWhirl(v, o);
    // bear swipe telegraphs
    this.swipes.forEach((s) => {
      const k = 1 - s.t / 1.15;
      ctx.save();
      ctx.strokeStyle = `rgba(255,40,40,${0.5 + k * 0.5})`;
      ctx.fillStyle = `rgba(80,30,10,${0.15 + k * 0.35})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.ellipse(sx(s.x), sy(s.d), s.r * S, s.r * S * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      bigText(ctx, '!', sx(s.x), sy(s.d), 30 + k * 20, '#ff3b3b');
      ctx.restore();
    });

    // depth-sorted sprites
    const items = [];
    for (const o of this.obs) if (o.type !== 'whirl' && o.d > dMin - 4 && o.d < dMax + 4) items.push(o);
    for (const pr of this.props) if (pr.d > dMin - 4 && pr.d < dMax + 6) items.push(pr);
    items.push({ type: 'player', d: this.p.d - 0.01 });
    if (this.bear) items.push({ type: 'bankbear', d: this.bear.d, x: this.bear.x });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) {
      switch (it.type) {
        case 'rock':
          art.drawRock(v, it);
          break;
        case 'log':
          art.drawLog(v, it);
          break;
        case 'debris':
          art.drawDebris(v, it);
          break;
        case 'orb':
          art.drawOrb(v, it);
          break;
        case 'player':
          this.drawPlayer(ctx, v);
          break;
        case 'bankbear':
          ctx.save();
          ctx.translate(sx(it.x), sy(it.d));
          drawBear(ctx, S, this.t, { mouth: Math.abs(Math.sin(this.t * 3)) * 0.4, scale: 0.9 });
          ctx.restore();
          break;
        default:
          art.drawProp(v, it, this.p.d);
      }
    }
    // the giant finale bear
    if (this.bigBear) {
      const B = this.bigBear;
      ctx.save();
      ctx.translate(sx(B.x), sy(B.d) + (1 - B.rise) * S * 4);
      drawBear(ctx, S, this.t, { mouth: B.mouth, scale: 2.4 * easeOutBack(B.rise) });
      ctx.restore();
      if (this.mode === 'bear' && this.modeT > 0.6 && !B.chomped) this.drawPlayer(ctx, v);
    }
    if (this.catJump) {
      const c = this.catJump;
      ctx.save();
      ctx.translate(sx(lerp(c.x0, c.x1, c.t)), sy(lerp(c.d0, c.d1, c.t), Math.sin(c.t * Math.PI) * 3));
      drawCat(ctx, S * 0.9, this.t);
      ctx.restore();
    }
    // gulls (high up)
    this.gulls.forEach((gl) => art.drawSeagull(ctx, sx(gl.x), sy(gl.d, 5), S * 0.6, this.t + gl.x));

    this.fx.render(ctx, (x, y, z) => ({ x: sx(x), y: sy(y, z), s: S }), 'front');
    this.fx.renderTexts(ctx, (x, y, z) => ({ x: sx(x), y: sy(y, z + 2), s: S }));

    // mist + vignette near the brink
    if (!this.salmon) {
      const prox = clamp((this.p.d - (RIVER_LEN - 70)) / 70, 0, 1);
      if (prox > 0) {
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
        g.addColorStop(0, `rgba(240,250,255,${0.55 * prox})`);
        g.addColorStop(1, 'rgba(240,250,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.6);
      }
    }
    if (this.cheats.disco) art.drawDiscoLights(ctx, W, H, this.t);
    if (this.mode === 'brink') {
      const k = clamp(this.modeT / 1.35, 0, 1);
      ctx.fillStyle = `rgba(255,255,255,${k * k * 0.9})`;
      ctx.fillRect(0, 0, W, H);
      bigText(ctx, 'OVER THE EDGE!!!', W / 2, H * 0.35, Math.min(W * 0.11, 64) * (0.8 + easeOutBack(Math.min(1, k * 2)) * 0.3), '#ffd23b');
    }
    this.drawHud(ctx);
  }

  playerPose() {
    const p = this.p;
    const id = this.effCraftId;
    if (p.ko) return { pose: 'limp', expr: 'ko', cutY: -110 };
    const prog = clamp(p.d / RIVER_LEN, 0, 1);
    let expr = prog < 0.35 ? 'determined' : prog < 0.75 ? 'scared' : 'terrified';
    if (this.ch.id === 'timmy' && prog < 0.6) expr = 'happy';
    if (this.mode === 'brink') expr = 'scream';
    if (p.hitT > 0) expr = 'hurt';
    if (p.spin > 0.3) expr = 'dizzy';
    if (this.craft.ability.id === 'panic' && p.abil > 0) expr = 'scream';
    if (this.craft.id === 'goose' && !p.wrecked) expr = 'cool';
    const t = this.t;
    switch (id) {
      case 'nothing':
        return { pose: 'swim', expr, cutY: -112 };
      case 'lifejacket':
        return { pose: 'dog', expr, cutY: -96, lifejacket: true };
      case 'surfboard':
        return { pose: 'arms-out', expr };
      case 'barrel':
        return { pose: 'stand', expr, cutY: -128 };
      case 'kayak':
        return { pose: 'hold', expr, cutY: -92, holding: kayakPaddle(t) };
      case 'canoe':
        return { pose: 'hold', expr, cutY: -92, holding: canoePaddle(t, 1) };
      case 'hamster':
        return { pose: 'run', expr };
      case 'jetski':
        return { pose: 'hold', expr, cutY: -82, armL: 0.7, armR: 0.7, bendL: 1.4, bendR: 1.4 };
      case 'goose':
        return { pose: p.abil > 0 ? 'cheer' : 'hold', expr, cutY: -86 };
      default:
        return { pose: 'stand', expr };
    }
  }

  drawPlayer(ctx, v) {
    const p = this.p;
    const { S, sx, sy, t } = v;
    const cheats = this.cheats;
    const x = sx(p.x);
    const ySurf = sy(p.d);
    const y = sy(p.d, p.z);
    // shadow while airborne
    if (p.z > 0.05) {
      ctx.fillStyle = 'rgba(0,30,50,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, ySurf, S * 0.7, S * 0.3, 0, 0, TAU);
      ctx.fill();
    }
    const ch = this.ch;
    const charOpts = { t, bigHead: cheats.bigHead, tiny: cheats.tiny };
    const occS = S * (cheats.tiny ? 0.8 : 0.95);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.scale, p.scale);
    const tilt = this.mode === 'river' ? clamp(p.vx * 0.035, -0.25, 0.25) : 0;
    ctx.rotate(tilt + p.rot + (p.spin > 0 ? this.t * 9 * Math.min(1, p.spin) : 0));
    if (this.salmon) {
      drawSalmonTop(ctx, S * 1.1, t);
    } else if (this.mode === 'bank' || (this.mode === 'entering' && this.modeT < 0.5)) {
      // walking on the beach with the vessel beside you
      const id = this.craft.id;
      const side = p.x > RW - 3 ? -1 : 1;
      if (id !== 'nothing' && id !== 'lifejacket') {
        ctx.save();
        ctx.translate(side * S * 1.6, S * 0.2);
        drawCraftTop(ctx, id, S * 0.75, { t: 0, dry: true, occupant: null, passenger: id === 'canoe' ? (c) => drawUpright(c, GARY, occS * 0.75, { pose: 'wave', expr: 'happy', t: t + 1 }) : null });
        ctx.restore();
      }
      if (p.slip > 0) ctx.rotate(-1.4 * Math.min(1, (1.3 - p.slip) * 4));
      drawUpright(ctx, ch, occS, { ...charOpts, pose: p.walking ? 'walk' : p.slip > 0 ? 'flail' : 'wave', expr: p.slip > 0 ? 'hurt' : 'happy', lifejacket: this.craft.id === 'lifejacket' });
    } else {
      const pose = this.playerPose();
      // per-vessel jump-in animation
      const entering = this.mode === 'entering';
      const ek = entering ? clamp((this.modeT - 0.5) / 0.6, 0, 1) : 1;
      if (entering && ek < 1) {
        const id = this.craft.id;
        if (id === 'barrel') ctx.scale(1, Math.cos(ek * TAU) * 0.6 + 0.4); // tumbling roll
        if (id === 'lifejacket') Object.assign(pose, { pose: 'cheer', expr: 'happy' });
        if (id === 'surfboard') Object.assign(pose, { pose: 'flail', expr: 'scream' });
        if (id === 'hamster') ctx.rotate(Math.sin(ek * TAU * 2) * 0.3);
        if (id === 'kayak' || id === 'canoe') ctx.translate(0, -Math.sin(ek * Math.PI) * S * 0.2);
      }
      // occupants hidden below the waist are shifted down so the cut line sits at the seat
      const occupant = (c) => {
        if (pose.cutY) c.translate(0, (-pose.cutY * occS) / 100);
        drawUpright(c, ch, occS, { ...charOpts, ...pose });
      };
      const passenger = this.effCraftId === 'canoe' ? (c) => {
        c.translate(0, (92 * occS) / 100);
        drawUpright(c, GARY, occS, { t: t + 0.7, pose: 'hold', expr: pose.expr === 'cool' ? 'happy' : pose.expr, cutY: -92, holding: canoePaddle(t + 0.7, -1) });
      } : null;
      const rolling = this.craft.ability.id === 'roll' && p.abil > 0 && !p.wrecked;
      if (rolling) {
        ctx.scale(1, -0.8);
        drawCraftTop(ctx, 'kayak', S, { t, damage: 1 - p.hp / p.maxHp });
      } else {
        drawCraftTop(ctx, this.effCraftId, S, {
          t,
          damage: p.wrecked ? 0 : 1 - p.hp / p.maxHp,
          active: p.abil > 0 || (entering && (this.craft.id === 'goose' || this.craft.id === 'jetski')),
          occupant,
          passenger,
        });
      }
      if (this.cat && this.cat.riding && this.mode === 'river' && !p.wrecked) {
        ctx.save();
        ctx.translate(S * 0.45, -S * 0.15);
        drawCat(ctx, S * 0.7, t);
        ctx.restore();
      }
      if (p.pooped > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#bbb';
        ctx.beginPath();
        ctx.ellipse(S * 0.05, -S * 1.55, S * 0.18, S * 0.1, 0.3, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawHud(ctx) {
    const { W, H } = this.g;
    const p = this.p;
    const t = this.t;
    const touch = this.g.showTouch;
    const btnR = clamp(Math.min(W, H) * 0.11, 38, 56);
    const btn = { id: 'main', x: W - btnR - 18, y: H - btnR - 24, r: btnR, action: 'primary' };

    // lumens (top-left)
    pill(ctx, 64, 26, 108, 34);
    lumenIcon(ctx, 26, 26, 9, t);
    bigText(ctx, `${Math.floor(this.run.lumens)}`, 74, 27, 20, '#fff6b0');

    if (this.salmon) {
      pill(ctx, W / 2, 26, 200, 36);
      bigText(ctx, `UPSTREAM ${Math.floor(this.run.upstream)}m`, W / 2, 27, 20, '#ff8fa0');
      if (this.bear) bigText(ctx, `BEAR DODGES: ${this.run.dodges}`, W / 2, 56, 15, '#fff');
    } else {
      const odds = this.currentOdds();
      const lane = laneOf(this.mode === 'bank' ? p.x : p.x);
      pill(ctx, W / 2, 26, 156, 38);
      bigText(ctx, `ODDS ${Math.round(odds * 100)}%`, W / 2, 27, 22, oddsColor(odds));
      const lb = LANE_BONUS[lane];
      if (!(this.craft.alwaysSurvive && !p.wrecked) && !this.cheats.god && !this.cheats.alwaysDie) {
        bigText(ctx, `${LANE_NAME[lane]} ${lb >= 0 ? '+' : ''}${Math.round(lb * 100)}%`, W / 2, 55, 14, lb > 0 ? '#5dff8a' : lb < 0 ? '#ff8a8a' : '#fff');
      } else {
        bigText(ctx, this.cheats.alwaysDie ? 'ALWAYS DIE (CHEAT)' : 'CANNOT DIE', W / 2, 55, 14, '#ffd23b');
      }
      // hull / body bar
      if (this.mode !== 'bank' && !(this.craft.id === 'goose' && !p.wrecked)) {
        const label = this.isSwimmer ? (p.ko ? 'KO' : 'BODY') : 'HULL';
        const frac = p.hp / p.maxHp;
        bar(ctx, 12, 48, 104, 15, frac, frac > 0.5 ? '#5dff8a' : frac > 0.25 ? '#ffd23b' : '#ff5a5a', label);
      }
      // distance meter (right edge)
      if (this.mode !== 'bank') {
        const top = 92;
        const bot = Math.min(H * 0.55, H - btnR * 2 - 70);
        const k = clamp(p.d / RIVER_LEN, 0, 1);
        ctx.fillStyle = 'rgba(10,15,40,0.55)';
        ctx.fillRect(W - 22, top, 10, bot - top);
        const g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, '#ff5a5a');
        g.addColorStop(0.5, '#ffd23b');
        g.addColorStop(1, '#5dff8a');
        ctx.fillStyle = g;
        ctx.fillRect(W - 20, top + 2, 6, bot - top - 4);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#1a1030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W - 17, bot - (bot - top) * k, 7, 0, TAU);
        ctx.fill();
        ctx.stroke();
        bigText(ctx, 'FALLS', W - 17, top - 12, 11, '#9ef');
        bigText(ctx, `${Math.max(0, Math.floor(brinkAt(p.x) - p.d))}m`, W - 17, bot + 14, 12);
      }
    }

    // controls
    if (this.mode === 'bank') {
      const lane = laneOf(p.x);
      const msg = this.salmon ? 'TAP TO FLOP INTO THE RIVER' : `PICK YOUR SPOT: ${LANE_NAME[lane]}`;
      bigText(ctx, msg, W / 2, H * 0.17, Math.min(26, W * 0.055), '#fff');
      if (!this.salmon) {
        bigText(ctx, LANE_TIP[lane], W / 2, H * 0.17 + 28, Math.min(17, W * 0.04), lane === 'center' ? '#5dff8a' : lane === 'edge' ? '#ff8a8a' : '#ffd23b');
        // path arrow showing where you'd enter
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -t * 30;
        ctx.lineWidth = 4;
        const v = this.view;
        ctx.beginPath();
        ctx.moveTo(v.sx(p.x), v.sy(0));
        ctx.lineTo(v.sx(p.x), v.sy(14));
        ctx.stroke();
        ctx.restore();
      }
      if (touch) {
        btn.label = this.salmon ? 'FLOP!' : 'JUMP IN!';
        this.g.input.setButtons([btn]);
        drawButton(ctx, btn, { color: '#2bb673', pulse: Math.sin(t * 6) });
        bigText(ctx, this.salmon ? '' : '◀ DRAG TO WALK ▶', W * 0.3, H - 40, 16, '#fff');
      } else {
        this.g.input.setButtons([]);
        bigText(ctx, this.salmon ? 'SPACE / ▲ TO FLOP IN' : '◀ ▶ WALK    ▲ / SPACE: JUMP IN', W / 2, H - 34, 20, '#fff');
      }
    } else if (this.mode === 'river') {
      const ab = p.wrecked ? { name: 'PANIC!', cd: 4.5 } : this.craft.ability;
      if (touch) {
        btn.label = ab.name;
        this.g.input.setButtons([btn]);
        drawButton(ctx, btn, { color: '#ff4f7b', cd: p.cd > 0 ? p.cd / ab.cd : 0 });
      } else {
        this.g.input.setButtons([]);
        const ready = p.cd <= 0;
        bigText(ctx, `SPACE: ${ab.name}${ready ? '' : ` (${p.cd.toFixed(1)})`}`, W / 2, H - 30, 18, ready ? '#ffd23b' : '#aaa');
        if (this.modeT < 6) bigText(ctx, '◀ ▶ STEER    ▲ FASTER    ▼ SLOWER', W / 2, H - 58, 16, '#fff');
      }
      if (touch && this.modeT < 5) bigText(ctx, 'DRAG LEFT SIDE TO PADDLE', W * 0.3, H - 40, 15, '#fff');
    } else {
      this.g.input.setButtons([]);
    }
    if (touch) drawJoystick(ctx, this.g.input);
  }
}
