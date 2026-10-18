// River phase: start on the bank, pick a spot, jump in, paddle while the current drags you to the brink.
// Also hosts Salmon Mode (swim upstream until a bear eats you).
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { FX, Splatter, goreOf } from './fx.js';
import { clamp, lerp, rand, rng, pick, approach, segDist, bigText, TAU, easeOutBack, roundRect } from './util.js';
import { RW, RIVER_LEN, brinkAt, laneOf, LANE_NAME, LANE_BONUS, LANE_TIP, computeOdds, oddsColor } from './odds.js';
import * as art from './riverArt.js';
import { drawUpright, drawSalmonTop, drawBear, drawCat, GARY, BORDER_AGENT as AGENT } from './charArt.js';
import { drawCraftTop, kayakPaddle, canoePaddle } from './vesselArt.js';
import { drawButton, drawJoystick, pill, bar, lumenIcon } from './hud.js';
import { OUCH, SCREAMS, lastWords, VOICE_PITCH } from '../data/messages.js';
import { SALMON } from '../data/crafts.js';

const CHUNK = 16;
const DEATH_LABEL = { lightning: 'DIED FROM LIGHTNING', randombear: 'MAULED BY A BEAR', shot: 'SHOT DEAD' };
const SNIPERS = [
  { id: 'tourist', kind: 'human', scale: 1.05, headScale: 1, hat: 'cap', extras: ['sunglasses'], colors: { skin: '#e8b48e', hair: '#5a3a20', shirt: '#b8302a', shirt2: '#3a1010', collar: '#fff', pants: '#3a4a6a', shoes: '#2a2018', hat: '#ff7a1a', hatBand: '#fff', accent: '#fff' } },
  { id: 'tourist', kind: 'human', scale: 1.1, headScale: 1, hat: 'none', extras: ['beard'], colors: { skin: '#c8906a', hair: '#2a1a10', shirt: '#5a6a3a', shirt2: '#3a4a2a', collar: '#fff', pants: '#4a4030', shoes: '#2a2018', hat: '#000', hatBand: '#000', accent: '#fff' } },
  { id: 'tourist', kind: 'human', scale: 0.98, headScale: 1, hat: 'cap', extras: [], colors: { skin: '#8a5634', hair: '#1a1a1a', shirt: '#ffd23b', shirt2: '#fff', collar: '#fff', pants: '#2b3a67', shoes: '#fff', hat: '#2456b8', hatBand: '#fff', accent: '#fff' } },
];
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
    this.splat = new Splatter();
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
    this.hard = !!game.cfg.settings.hard && !this.salmon;
    this.shots = [];
    this.flash = 0;
    this.bolt = null;
    this.mauler = null;
    // 1% flukes: lightning, or a bear that just... gets you
    this.fluke = null;
    // (the Golden Goose, God Mode and Invincible Hull are immune: the cheats still make it happen, you just shrug it off)
    this.immune = !!(craft.alwaysSurvive || cheats.god || cheats.invincible);
    if (!this.salmon) {
      const roll = this.immune ? 1 : Math.random();
      const at = cheats.skipToEdge ? rand(0.6, 1.4) : rand(5, 14);
      if (cheats.lightning || roll < 0.01) this.fluke = { kind: 'lightning', at };
      else if (cheats.randomBear || roll < 0.02) this.fluke = { kind: 'bear', at };
    }
    // Kacey's admirer: a border agent on a rock right at the lip, placed on whichever side you'll pass
    this.agent = character.id === 'kacey' && !this.salmon ? { type: 'agent', x: -RW + 1, d: brinkAt(-RW + 1) - 1.4, verts: [1, 0.9, 1.05, 0.95, 1.1, 0.92, 1, 0.97] } : null;

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
    if (this.hard && d0 > 24 && d0 < RIVER_LEN - 30 && r() < 0.6) {
      const side = r() < 0.5 ? -1 : 1;
      this.props.push({ type: 'shooter', x: side * (RW + 1.4), d: d0 + r() * CHUNK, weapon: r() < 0.5 ? 'slingshot' : 'bb', cd: 1 + r() * 2, dead: false, seed: Math.floor(r() * 1e6), aim: 0 });
    }
    // a slingshot floats by every ~100 m until you grab one
    if (this.hard && c % 6 === 3 && !(this.p && this.p.slingshot)) add({ type: 'slingshot', x: (r() * 2 - 1) * RW * 0.5, d: d0 + 8 });
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
        this.fx.cloud(p.x, p.y, p.kind === 'glitter' && !p.style ? 'rgba(255,90,214,0.3)' : goreOf(p.style).cloud, 0.5);
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

    this.updateEffects(dt);
    this.updateAgent();
    this.fx.update(dt);
    this.splat.update(dt);
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
    p.ghost = Math.max(0, (p.ghost || 0) - dt);
    p.touchT = (p.touchT ?? 9) + dt; // time since you last bumped a rock, log, wall or whirlpool
    p.hitT = Math.max(0, p.hitT - dt);
    p.spin = Math.max(0, p.spin - dt * 0.6);
    p.pooped = Math.max(0, p.pooped - dt);
    // knocked out? you come to after 5 seconds
    if (p.ko) {
      p.koT = (p.koT || 0) + dt;
      if (p.koT >= 5) {
        p.ko = false;
        p.koT = 0;
        p.hp = p.maxHp * 0.35;
        p.invuln = 3;
        audio.whoa(this.voice());
        this.say('WOKE UP!', '#5dff8a', 28);
      }
    }

    if (p.dead) {
      // a limp corpse rides the current over the edge, sliding past every rock
      p.deadT = (p.deadT || 0) + dt;
      p.vx *= Math.exp(-1.5 * dt);
      if (Math.abs(p.x) > RW * 0.6) p.vx -= Math.sign(p.x) * 2 * dt;
      p.vd = approach(p.vd, this.currentAt(p.x, p.d) * 1.6 + 1, 2, dt);
      p.x = clamp(p.x + p.vx * dt, -RW + 0.6, RW - 0.6);
      p.d += p.vd * dt;
      p.rot += dt * 0.5;
      p.z = 0;
      if (this.goreStyle() !== 'cartoon' && Math.random() < 0.25) this.fx.cloud(p.x, p.d - 0.5, goreOf(this.goreStyle()).cloud, 0.6);
      this.updateShots(dt);
      if (p.d >= brinkAt(p.x) - 0.4) this.startBrink();
      return;
    }

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
      p.touchT = 0;
    }

    this.collide(dt, turbo);
    this.updateFluke(dt);
    if (this.hard) this.updateShooters(dt, inp);
    if (p.dead) return;

    // anti-stuck: no real progress for 1.2s (pinned on rocks, KO'd against the wall, idle in a whirlpool)?
    // the current washes you free: you slide past every obstacle for a moment, toward open water
    if (!this.salmon) {
      if (!p.prog) p.prog = { d: p.d, t: 0 };
      p.prog.t += dt;
      const snagged = p.touchT < 0.6 || p.ko;
      if (p.d - p.prog.d > 1.0 || !snagged) p.prog = { d: p.d, t: 0 };
      else if (p.prog.t > 1.2) {
        p.prog = { d: p.d, t: 0 };
        p.ghost = 1.4;
        p.invuln = Math.max(p.invuln, 1.6);
        p.vz = Math.max(p.vz, 3.5);
        p.vd = Math.max(p.vd, 6);
        if (Math.abs(p.x) > 1.5) p.vx = -Math.sign(p.x) * 4;
      }
    }

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
      if (o.type === 'slingshot') {
        if (Math.hypot(o.x - p.x, o.d - p.d) < rad + 0.8 && p.z < 2.2) {
          this.obs.splice(i, 1);
          p.slingshot = true;
          audio.bigPickup();
          this.fx.sparkles(o.x, o.d, 16);
          this.fx.text('GOT A SLINGSHOT!', p.x, p.d, '#ffd23b', 26, 1.5, 2);
          this.fx.text(this.g.showTouch ? 'TAP SHOOT TO FIRE BACK' : 'PRESS F TO FIRE BACK', p.x, p.d - 1.2, '#fff', 16, 1.2, 2.2);
        }
        continue;
      }
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
      // washing free of a snag: slide past everything for a moment
      if (p.ghost > 0) continue;
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
          p.touchT = 0;
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
    p.touchT = 0;
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
      // near a bank wall, always wash toward the middle so you can't get wedged against the wall
      const away = Math.abs(p.x) > RW - 2.8 ? -Math.sign(p.x) : Math.abs(nx) > 0.15 ? Math.sign(nx) : p.x > 0 ? -1 : 1;
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

  damage(amount, cause, lethal = false) {
    const p = this.p;
    if (p.dead || this.cheats.invincible || this.salmon || (this.craft.id === 'goose' && !p.wrecked)) return;
    if (this.cheats.god) lethal = false; // God Mode: shots can knock you out, never kill you
    if (p.ko && !lethal) return; // no kicking someone while they're down
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
    } else if (lethal) {
      this.die(cause);
    } else if (this.cheats.god) {
      // God Mode: shrug it off instead of getting knocked out over and over
      p.hp = p.maxHp * 0.5;
      p.invuln = 1.5;
      this.say('NOPE. GOD MODE.', '#ffd23b', 22);
    } else if (!p.ko) {
      p.ko = true;
      p.koT = 0;
      p.hp = 0;
      audio.bonk();
      audio.glub();
      this.fx.stars(p.x, p.d, 6, 0.8);
      this.fx.text('KNOCKED OUT!', p.x, p.d, '#ff5a5a', 28, 1.4, 2.4);
    }
  }

  // ------------------------------------------------------------ dying before the falls
  die(cause) {
    const p = this.p;
    if (p.dead || this.mode !== 'river') return;
    p.dead = true;
    p.deadCause = cause;
    p.ko = false;
    p.hp = 0;
    p.vx *= 0.3;
    let style = this.goreStyle();
    if (this.g.cfg.poop && style !== 'cartoon') {
      style = 'poop';
      audio.fart();
      this.fx.stink(p.x, p.d, 8, 0.6);
    }
    this.fx.blood(p.x, p.d, 0, 1, 2, style, 0.6);
    if (style !== 'cartoon') {
      this.fx.gibs(p.x, p.d, 0.8, style, 0.6);
      this.splat.add(3, style, 1);
    } else this.fx.stars(p.x, p.d, 7, 0.8);
    audio.splat(1);
    audio.say(lastWords(this.ch.id, style === 'poop'), VOICE_PITCH[this.ch.id] || 1);
    audio.stopEngine();
    this.g.shake(1.2);
    this.fx.text(DEATH_LABEL[cause] || 'YOU DIED.', p.x, p.d, '#ff3b3b', 34, 1.6, 2.6);
    this.fx.text("...BUT YOU'RE STILL GOING OVER", p.x, p.d - 1.4, '#fff', 18, 1.2, 2.6);
  }

  updateFluke(dt) {
    const F = this.fluke;
    const p = this.p;
    if (F && !F.done && !p.dead && this.modeT >= F.at) {
      F.done = true;
      if (F.kind === 'lightning') {
        this.bolt = { t: 0.55, x: p.x, d: p.d };
        this.flash = 1;
        audio.thunder();
        p.charred = true;
        this.fx.smoke(p.x, p.d, 12);
        this.fx.sparkles(p.x, p.d, 20, 1, ['#ffffff', '#bfe9ff', '#fff6a0']);
        if (this.immune) {
          this.say(this.craft.alwaysSurvive ? 'THE GOOSE ATE THE LIGHTNING' : 'ZAPPED... AND TOTALLY FINE?!', '#fff6a0', 26);
          audio.honk();
        } else this.die('lightning');
      } else {
        const side = p.x < 0 ? -1 : 1;
        this.mauler = { x: side * (RW + 3), d: p.d + 3, x0: side * (RW + 3), t: 0, hit: false, mouth: 0 };
        audio.roar();
        this.say('BEAR!!', '#ff5a5a', 34);
      }
    }
  }

  // timers for the lightning bolt, the white flash and the surprise bear: run every frame, dead or alive
  updateEffects(dt) {
    const p = this.p;
    const M = this.mauler;
    if (M) {
      M.t += dt;
      if (M.t < 0.7) {
        const k = M.t / 0.7;
        M.x = lerp(M.x0, p.x, k);
        M.d = lerp(p.d + 3, p.d + 0.6, k);
        M.z = Math.sin(k * Math.PI) * 2.5;
        M.mouth = k;
      } else if (!M.hit && this.immune) {
        // bounces right off
        M.hit = true;
        M.z = 0;
        M.t = Math.max(M.t, 1.6);
        audio.bonk();
        if (this.craft.alwaysSurvive) audio.honk();
        this.say(this.craft.alwaysSurvive ? 'THE GOOSE HONKED THE BEAR AWAY' : 'THE BEAR BOUNCED OFF!', '#ffd23b', 26);
      } else if (!M.hit) {
        M.hit = true;
        M.z = 0;
        audio.chomp();
        audio.roar();
        const style = this.goreStyle();
        this.fx.blood(p.x, p.d, 0, 1, 2.5, style, 0.8);
        this.fx.gibs(p.x, p.d, 1.2, style, 0.8);
        if (style !== 'cartoon') this.fx.guts(p.x, p.d, 2, style, 0.8);
        this.die('randombear');
      } else if (M.t < 1.6) {
        M.x = lerp(M.x, p.x, Math.min(1, dt * 6));
        M.d = lerp(M.d, p.d + 0.6, Math.min(1, dt * 6));
        M.mouth = Math.abs(Math.sin(M.t * 9)) * 0.6;
      } else {
        M.x = lerp(M.x, M.x0, Math.min(1, dt * 3));
        M.z = 0;
        M.mouth = 0;
        if (M.t > 3.2) this.mauler = null;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.bolt) {
      this.bolt.t -= dt;
      if (this.bolt.t <= 0) this.bolt = null;
    }
  }

  // ------------------------------------------------------------ hard mode: snipers on the banks
  updateShooters(dt, inp) {
    const p = this.p;
    p.shootCd = Math.max(0, (p.shootCd || 0) - dt);
    for (const sh of this.props) {
      if (sh.type !== 'shooter') continue;
      if (sh.dead) {
        sh.deadT = (sh.deadT || 0) + dt;
        continue;
      }
      sh.aim = Math.max(0, sh.aim - dt);
      if (Math.abs(sh.d - p.d) > 15 || p.dead) continue;
      sh.cd -= dt;
      if (sh.cd <= 0) {
        const bb = sh.weapon === 'bb';
        sh.cd = bb ? rand(0.9, 1.7) : rand(1.5, 2.8);
        sh.aim = 0.25;
        const tx = p.x + p.vx * 0.45 + rand(-0.8, 0.8);
        const td = p.d + p.vd * 0.45 + rand(-0.8, 0.8);
        const dx = tx - sh.x;
        const dd = td - sh.d;
        const L = Math.hypot(dx, dd) || 1;
        const sp = bb ? 26 : 19;
        this.shots.push({ x: sh.x, d: sh.d, z: 1.3, vx: (dx / L) * sp, vd: (dd / L) * sp, kind: sh.weapon, enemy: true, life: 1.4 });
        if (bb) audio.pew();
        else audio.thwip();
      }
    }
    // fire back with your own slingshot
    if (p.slingshot && !p.dead && inp.pressed('shoot') && p.shootCd <= 0) {
      let best = null;
      let bestD = 1e9;
      for (const sh of this.props) {
        if (sh.type !== 'shooter' || sh.dead) continue;
        const dd = sh.d - p.d;
        if (dd < -4 || dd > 20) continue;
        const dist = Math.hypot(sh.x - p.x, dd);
        if (dist < bestD) {
          bestD = dist;
          best = sh;
        }
      }
      p.shootCd = 0.45;
      audio.thwip();
      // shooters stand still on the bank, so aim straight at them (a little wobble keeps it sporting)
      const tx = best ? best.x + rand(-0.35, 0.35) : p.x + (p.x < 0 ? -12 : 12);
      const td = best ? best.d + rand(-0.35, 0.35) : p.d + 6;
      const dx = tx - p.x;
      const dd = td - p.d;
      const L = Math.hypot(dx, dd) || 1;
      this.shots.push({ x: p.x, d: p.d, z: 1.2, vx: (dx / L) * 30, vd: (dd / L) * 30, kind: 'slingshot', enemy: false, life: 1.2 });
    }
    this.updateShots(dt);
  }

  updateShots(dt) {
    const p = this.p;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const b = this.shots[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.d += b.vd * dt;
      b.z = Math.max(0.2, b.z - dt * 0.4);
      let hit = false;
      if (b.enemy) {
        const rolling = this.craft.ability.id === 'roll' && p.abil > 0 && !p.wrecked;
        if (!p.dead && !rolling && p.z < 1.6 && Math.hypot(b.x - p.x, b.d - p.d) < (this.craft.radius || 0.5) + 0.35) {
          hit = true;
          this.shotHit(b);
        }
      } else {
        for (const sh of this.props) {
          if (sh.type !== 'shooter' || sh.dead) continue;
          if (Math.hypot(b.x - sh.x, b.d - sh.d) < 0.9) {
            hit = true;
            this.killShooter(sh);
            break;
          }
        }
      }
      if (hit || b.life <= 0 || Math.abs(b.x) > RW + 14) {
        if (!hit && Math.abs(b.x) < RW) this.fx.splash(b.x, b.d, 0.15);
        this.shots.splice(i, 1);
      }
    }
  }

  shotHit(b) {
    const p = this.p;
    const bb = b.kind === 'bb';
    audio.thwack();
    if (this.isSwimmer) {
      this.fx.blood(p.x, p.d, b.vx, b.vd, 0.6, this.goreStyle(), 0.8);
      audio.oof(this.voice());
      this.fx.text(bb ? 'PING!' : 'THWACK!', p.x, p.d, '#ff5a5a', 22, 1, 0.9);
    } else {
      audio.ping();
      this.fx.debris(p.x, p.d, '#bbbbbb', 3, 0.1, 0.5, 'shard');
      this.fx.text(bb ? 'PING!' : 'DONK!', p.x, p.d, '#fff', 20, 1, 0.8);
    }
    this.damage(bb ? 9 : 13, 'shot', true);
  }

  killShooter(sh) {
    sh.dead = true;
    const gore = this.g.cfg.settings.gore;
    const style = gore === 'off' ? 'cartoon' : this.g.cfg.poop ? 'poop' : 'blood';
    const away = Math.sign(sh.x);
    this.fx.blood(sh.x, sh.d, away, 0.4, 2.2, style, 1.4);
    this.fx.blood(sh.x, sh.d, 0, -1, 1.2, style, 1.6);
    this.fx.gibs(sh.x, sh.d, gore === 'max' ? 1.3 : 0.8, style, 1.2);
    if (gore === 'max' && style !== 'cartoon') this.fx.guts(sh.x, sh.d, 2, style, 1.0);
    this.g.shake(0.25);
    audio.splat(1);
    audio.oof(0.9 + Math.random() * 0.4);
    this.run.lumens += 3;
    const msg = pick(['HEADSHOT! +3', "GOT 'EM! +3", 'TAKE THAT! +3', 'BULLSEYE! +3']);
    this.fx.text(msg, sh.x, sh.d, '#ffd23b', 22, 2, 1.4);
    // on narrow phones the banks are off screen, so call it out in the HUD too
    const v = this.view;
    if (v && (v.sx(sh.x) < 0 || v.sx(sh.x) > this.g.W)) this.say(msg, '#ffd23b', 26);
  }

  // narrow phones can't see the banks, so pin a marker to the screen edge for every shooter beside you
  drawShooterMarkers(ctx, v) {
    const { W, H, sx, sy, S, t } = v;
    for (const sh of this.props) {
      if (sh.type !== 'shooter' || sh.d < v.dMin || sh.d > v.dMax) continue;
      if (sh.dead && (sh.deadT || 0) > 1.8) continue;
      const x = sx(sh.x);
      if (x > S * 0.4 && x < W - S * 0.4) continue;
      const side = x < W / 2 ? -1 : 1;
      const my = clamp(sy(sh.d) - S * 0.6, 120, H - 70);
      const hot = !sh.dead && sh.aim > 0;
      ctx.save();
      ctx.translate(side < 0 ? 20 : W - 48, my); // (right side clears the falls progress bar)
      ctx.scale(hot ? 1.25 : 1, hot ? 1.25 : 1);
      ctx.fillStyle = sh.dead ? 'rgba(30,24,40,0.9)' : hot ? '#ff3b3b' : 'rgba(200,30,46,0.9)';
      ctx.strokeStyle = '#1a1030';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(side * 9, -9);
      ctx.lineTo(side * 21, 0);
      ctx.lineTo(side * 9, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = sh.dead ? Math.max(0, 1 - (sh.deadT || 0) / 1.8) : 1;
      ctx.fillText(sh.dead ? '💀' : sh.weapon === 'bb' ? '🔫' : '😈', 0, 1 + (hot ? Math.sin(t * 40) : 0));
      ctx.restore();
    }
  }

  drawShooter(ctx, v, sh) {
    const { sx, sy, S, t } = v;
    const ch = SNIPERS[sh.seed % SNIPERS.length];
    ctx.save();
    ctx.translate(sx(sh.x), sy(sh.d));
    if (sh.dead) {
      if (this.g.cfg.settings.gore !== 'off') {
        ctx.fillStyle = 'rgba(110,0,8,0.85)';
        ctx.beginPath();
        ctx.ellipse(0, -S * 0.1, S * 1.1, S * 0.4, 0, 0, TAU);
        ctx.fill();
      }
      ctx.rotate(Math.sign(sh.x) * 1.5);
      drawUpright(ctx, ch, S * 0.75, { pose: 'limp', expr: 'ko', t });
      ctx.restore();
      return;
    }
    const toRiver = -Math.sign(sh.x);
    const weapon = (c, sk, lw) => {
      const hx = (sk.handL.x + sk.handR.x) / 2;
      const hy = (sk.handL.y + sk.handR.y) / 2;
      c.lineCap = 'round';
      if (sh.weapon === 'bb') {
        c.strokeStyle = '#222';
        c.lineWidth = 5 * sk.s + lw;
        c.beginPath();
        c.moveTo(hx - toRiver * 18 * sk.s, hy + 4 * sk.s);
        c.lineTo(hx + toRiver * 42 * sk.s, hy - 4 * sk.s);
        c.stroke();
        c.strokeStyle = '#6a4426';
        c.lineWidth = 7 * sk.s;
        c.beginPath();
        c.moveTo(hx - toRiver * 20 * sk.s, hy + 6 * sk.s);
        c.lineTo(hx - toRiver * 4 * sk.s, hy + 2 * sk.s);
        c.stroke();
        if (sh.aim > 0.15) {
          c.fillStyle = '#fff3a0';
          c.beginPath();
          c.arc(hx + toRiver * 46 * sk.s, hy - 5 * sk.s, 5 * sk.s, 0, TAU);
          c.fill();
        }
      } else {
        const fx = hx + toRiver * 6 * sk.s;
        c.strokeStyle = '#6a4426';
        c.lineWidth = 4 * sk.s + lw;
        c.beginPath();
        c.moveTo(fx, hy + 10 * sk.s);
        c.lineTo(fx, hy - 4 * sk.s);
        c.moveTo(fx, hy - 4 * sk.s);
        c.lineTo(fx - 6 * sk.s, hy - 14 * sk.s);
        c.moveTo(fx, hy - 4 * sk.s);
        c.lineTo(fx + 6 * sk.s, hy - 14 * sk.s);
        c.stroke();
        c.strokeStyle = '#c84a3a';
        c.lineWidth = 1.5 * sk.s + 0.5;
        const pull = sh.aim > 0 ? 0 : 10 * sk.s;
        c.beginPath();
        c.moveTo(fx - 6 * sk.s, hy - 14 * sk.s);
        c.lineTo(fx - toRiver * pull, hy - 8 * sk.s);
        c.lineTo(fx + 6 * sk.s, hy - 14 * sk.s);
        c.stroke();
      }
    };
    drawUpright(ctx, ch, S * 0.75, { pose: 'hold', expr: 'determined', t: t + (sh.seed % 7), armL: 1.25, armR: 1.25, bendL: 0.9, bendR: 0.9, holding: weapon });
    ctx.restore();
  }

  // until the agent comes into view, keep sliding its rock to stay a few meters beside the player
  updateAgent() {
    const A = this.agent;
    const p = this.p;
    if (!A || A.frozen) return;
    // freeze just before it scrolls into view (so it never visibly slides)
    const v = this.view;
    if (v ? A.d < v.dMax : A.d - p.d < 24) {
      A.frozen = true;
      return;
    }
    // stand close beside your line (Canadian side by default) so it stays on even a narrow phone screen
    const side = p.x < -RW + 4 ? 1 : -1;
    A.x = clamp(p.x + side * 3.1, -RW + 0.6, RW - 0.6);
    A.d = brinkAt(A.x) - 1.4;
  }

  drawAgent(ctx, v) {
    const A = this.agent;
    const { sx, sy, S, t } = v;
    art.drawRock(v, { x: A.x, d: A.d + 0.15, r: 1.05, verts: A.verts, color: '#77706a' });
    ctx.save();
    ctx.translate(sx(A.x), sy(A.d));
    drawUpright(ctx, AGENT, S * 0.8, { pose: 'wave', expr: 'happy', t });
    // badge + maple leaf patch
    ctx.fillStyle = '#d8b040';
    ctx.beginPath();
    ctx.arc(-S * 0.08, -S * 0.98, S * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d6202a';
    ctx.beginPath();
    ctx.arc(S * 0.12, -S * 0.98, S * 0.05, 0, TAU);
    ctx.fill();
    // speech bubble
    const text = 'Let me pet you!';
    ctx.font = `${Math.max(14, S * 0.42)}px "Luckiest Guy", sans-serif`;
    const w = ctx.measureText(text).width + S * 0.5;
    const h = S * 0.75;
    // the bubble opens toward the river's middle so it stays on screen
    const left = A.x > 0;
    const bx = left ? -S * 0.3 - w : S * 0.3;
    const tail = left ? bx + w - S * 0.7 : bx + S * 0.35;
    const by = -S * 2.7 + Math.sin(t * 3) * S * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1a1030';
    ctx.lineWidth = 2.5;
    roundRect(ctx, bx, by, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tail, by + h - 1);
    ctx.lineTo(left ? tail + S * 0.6 : tail - S * 0.25, by + h + S * 0.35);
    ctx.lineTo(tail + S * 0.35, by + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tail - S * 0.05, by + h - 4, S * 0.42, 6);
    ctx.fillStyle = '#c8102e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + S * 0.25, by + h / 2 + 1);
    ctx.restore();
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
    this.bigBear = { x, d, rise: 0, mouth: 0, shake: 0, bites: 0, bloody: 0 };
    audio.roar();
    music.stop();
    this.g.shake(1.2);
    this.say('THE BEAR ALWAYS WINS', '#ff5a5a', 30);
  }

  // The most disgusting nature documentary ever made.
  updateBear(dt) {
    const p = this.p;
    const B = this.bigBear;
    const T = this.modeT;
    const cartoon = this.g.cfg.settings.gore === 'off';
    const style = cartoon ? 'cartoon' : 'fish';
    const mouthX = B.x;
    const mouthD = B.d - 0.9;
    B.rise = Math.min(1, B.rise + dt * 1.4);
    if (T < 1.2) {
      B.mouth = clamp((T - 0.4) * 1.6, 0, 1);
      if (T > 0.5) {
        p.x = approach(p.x, mouthX, 4, dt);
        p.d = approach(p.d, mouthD, 4, dt);
        p.z = approach(p.z, 1.6, 3, dt);
        p.rot += dt * 8;
      }
      return;
    }
    if (B.bites === 0) {
      // CHOMP: bitten clean in half
      B.bites = 1;
      B.bloody = 1;
      this.held = true;
      this.fishHalf = { x: p.x, d: p.d, z: 1.8, vx: rand(-5, 5), vd: rand(2, 5), vz: 9, rot: 0, vr: rand(-12, 12) };
      audio.chomp();
      audio.rip();
      audio.splat(1.4);
      audio.crack();
      this.g.shake(2);
      this.fx.text('RIIIIIP!', p.x, p.d + 1, '#ff3b3b', 44, 2.5, 1.6);
      if (!cartoon) {
        this.fx.blood(p.x, p.d, 0, 1, 3.4, style, 1.6);
        this.fx.blood(p.x, p.d, 1, 0, 2.0, style, 1.6);
        this.fx.gibs(p.x, p.d, 2.6, style, 1.6);
        this.fx.guts(p.x, p.d, 6, style, 1.6);
        this.fx.roe(p.x, p.d, 50, 1.6);
        this.fx.scales(p.x, p.d, 60, 1.6);
        this.splat.add(9, 'blood', 1.5);
      } else {
        this.fx.stars(p.x, p.d, 8, 1.6);
      }
    }
    // the tail half cartwheels away spraying everywhere
    const H = this.fishHalf;
    if (H) {
      H.vz -= 24 * dt;
      H.x += H.vx * dt;
      H.d += H.vd * dt;
      H.z = Math.max(0, H.z + H.vz * dt);
      H.rot += H.vr * dt;
      if (H.z <= 0 && !H.landed) {
        H.landed = true;
        this.fx.splash(H.x, H.d, 0.6);
        audio.splash(0.5);
      }
      if (!cartoon && !H.landed && Math.random() < 0.7) this.fx.blood(H.x, H.d, 0, 0, 0.25, style, H.z);
    }
    // chew, shake, chew
    if (T < 3.4) {
      B.mouth = 0.25 + Math.abs(Math.sin(T * 9)) * 0.55;
      B.shake = Math.sin(T * 17) * 0.22;
      this.chewT = (this.chewT || 0) - dt;
      if (this.chewT <= 0) {
        this.chewT = rand(0.22, 0.4);
        audio.squish();
        if (Math.random() < 0.5) audio.crack();
        this.g.shake(0.6);
        if (!cartoon) {
          this.fx.blood(mouthX + rand(-0.6, 0.6), mouthD, rand(-1, 1), -0.5, 1.1, style, 1.4);
          this.fx.gibs(mouthX, mouthD, 0.6, style, 1.4);
          if (Math.random() < 0.4) this.fx.guts(mouthX, mouthD, 1, style, 1.4);
          if (Math.random() < 0.5) this.fx.roe(mouthX, mouthD, 12, 1.4);
          if (Math.random() < 0.35) this.splat.add(1, 'blood', 1);
        }
      }
      // blood drools from the corners of its mouth
      if (!cartoon && Math.random() < 0.8) {
        this.fx.add({ x: mouthX + (Math.random() < 0.5 ? -0.55 : 0.55), y: mouthD - 0.1, z: 1.2, vx: rand(-0.3, 0.3), vy: rand(-0.5, 0.2), vz: -0.5, life: 1, size: rand(0.05, 0.09), color: pick(goreOf('blood').drops), kind: 'blood', drag: 0.4, style: 'blood' });
      }
    } else if (!this.flags.gulp) {
      this.flags.gulp = true;
      this.held = false;
      B.mouth = 0;
      B.shake = 0;
      audio.gulp();
      this.fx.text('GULP.', mouthX, mouthD + 1, '#fff', 30, 2.5, 1.2);
    }
    if (T > 3.9 && !this.flags.burp) {
      this.flags.burp = true;
      B.mouth = 0.6;
      audio.burp();
      this.fx.text('*BURP*', mouthX, mouthD + 1, '#ffd23b', 30, 2.5, 1.4);
      this.fx.add({ x: mouthX, y: mouthD, z: 1.5, vx: rand(-3, 3), vy: -2, vz: 7, life: 3, size: 0.12, color: '#fff', kind: 'eye', drag: 0.2 });
      for (let i = 0; i < 5; i++) this.fx.add({ x: mouthX, y: mouthD, z: 1.5, vx: rand(-4, 4), vy: rand(-3, 1), vz: rand(4, 8), life: 3, size: 0.16, color: '#fff', kind: 'fishbone', drag: 0.2 });
    }
    if (T > 4.1 && B.mouth > 0) B.mouth = Math.max(0, B.mouth - dt * 2);
    if (T > (cartoon ? 4.4 : 5.6) && !this.flags.finished) {
      this.flags.finished = true;
      const lumens = 3 + Math.floor(this.run.upstream / 8) + this.run.lumens;
      audio.sadTrombone();
      this.g.finish({
        survived: false,
        cause: 'bear',
        odds: 0,
        lumensBase: lumens + (cartoon ? 0 : 5),
        breakdown: [
          ['Swam upstream', Math.floor(this.run.upstream / 8)],
          ['Lumens collected', this.run.lumens - this.run.dodges * 3],
          ['Bear dodges', this.run.dodges * 3],
          ['Participation', 3],
          ...(cartoon ? [] : [['Disgusting bonus', 5]]),
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
      ko: p.ko || p.dead,
      dead: !!p.dead,
      deadCause: p.deadCause || null,
      charred: !!p.charred,
      lumens: this.run.lumens,
      run: { ...this.run },
      progress: 1,
    };
    audio.stopEngine();
    if (!p.dead) audio.scream(this.voice(), 1.4);
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
    this.cam.zoom = approach(this.cam.zoom, 1.18, 3, dt);
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
      const tail = this.salmon ? 0.6 : -0.6; // the salmon faces upstream, so its tail is the other way
      [-1, 1].forEach((sd) => {
        const spread = (1 - b.life) * 1.6 + 0.4;
        ctx.beginPath();
        ctx.moveTo(sx(a.x + sd * spread), sy(a.d + tail));
        ctx.lineTo(sx(b.x + sd * spread), sy(b.d + tail));
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
    if (this.agent) items.push(this.agent);
    if (this.mauler) items.push({ type: 'mauler', d: this.mauler.d });
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
        case 'shooter':
          this.drawShooter(ctx, v, it);
          break;
        case 'agent':
          this.drawAgent(ctx, v);
          break;
        case 'mauler': {
          const M = this.mauler;
          ctx.save();
          ctx.translate(sx(M.x), sy(M.d, M.z || 0));
          drawBear(ctx, S, this.t, { mouth: M.mouth, scale: 1.1, bloody: M.hit ? 1 : 0 });
          ctx.restore();
          break;
        }
        case 'slingshot': {
          const bob = Math.sin(this.t * 4) * 0.1;
          ctx.save();
          ctx.translate(sx(it.x), sy(it.d, 0.4 + bob));
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.9);
          g.addColorStop(0, 'rgba(255,230,120,0.8)');
          g.addColorStop(1, 'rgba(255,230,120,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, S * 0.9, 0, TAU);
          ctx.fill();
          ctx.rotate(Math.sin(this.t * 2) * 0.3);
          ctx.strokeStyle = '#6a4426';
          ctx.lineCap = 'round';
          ctx.lineWidth = S * 0.12;
          ctx.beginPath();
          ctx.moveTo(0, S * 0.35);
          ctx.lineTo(0, 0);
          ctx.lineTo(-S * 0.22, -S * 0.3);
          ctx.moveTo(0, 0);
          ctx.lineTo(S * 0.22, -S * 0.3);
          ctx.stroke();
          ctx.strokeStyle = '#c84a3a';
          ctx.lineWidth = S * 0.04;
          ctx.beginPath();
          ctx.moveTo(-S * 0.22, -S * 0.3);
          ctx.lineTo(0, -S * 0.12);
          ctx.lineTo(S * 0.22, -S * 0.3);
          ctx.stroke();
          ctx.restore();
          break;
        }
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
      ctx.rotate(B.shake || 0);
      drawBear(ctx, S, this.t, { mouth: B.mouth, scale: 2.4 * easeOutBack(B.rise), bloody: B.bloody });
      if (this.held) {
        // the front half of you, still in its jaws
        ctx.save();
        ctx.translate(0, -S * 2.0);
        ctx.rotate(Math.PI / 2 + Math.sin(this.t * 17) * 0.3);
        drawSalmonTop(ctx, S * 1.3, this.t, { half: 'front' });
        ctx.restore();
      }
      ctx.restore();
      if (this.mode === 'bear' && this.modeT > 0.6 && !B.bites) this.drawPlayer(ctx, v);
      if (this.fishHalf) {
        const H = this.fishHalf;
        ctx.save();
        ctx.translate(sx(H.x), sy(H.d, H.z));
        ctx.rotate(H.rot);
        drawSalmonTop(ctx, S * 1.1, this.t, { half: 'back' });
        ctx.restore();
      }
    }
    if (this.catJump) {
      const c = this.catJump;
      ctx.save();
      ctx.translate(sx(lerp(c.x0, c.x1, c.t)), sy(lerp(c.d0, c.d1, c.t), Math.sin(c.t * Math.PI) * 3));
      drawCat(ctx, S * 0.9, this.t);
      ctx.restore();
    }
    // projectiles
    this.shots.forEach((b) => {
      const bx = sx(b.x);
      ctx.fillStyle = 'rgba(0,30,50,0.25)';
      ctx.beginPath();
      ctx.ellipse(bx, sy(b.d), S * 0.12, S * 0.05, 0, 0, TAU);
      ctx.fill();
      const by = sy(b.d, b.z);
      if (b.kind === 'bb') {
        ctx.strokeStyle = 'rgba(255,220,150,0.6)';
        ctx.lineWidth = Math.max(1.5, S * 0.05);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - b.vx * S * 0.02, by + b.vd * S * 0.02);
        ctx.stroke();
        ctx.fillStyle = '#c8803a';
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(2, S * 0.06), 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = b.enemy ? '#7a7670' : '#ffd23b';
        ctx.strokeStyle = '#1a1030';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(3, S * 0.11), 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    });
    // gulls (high up)
    this.gulls.forEach((gl) => art.drawSeagull(ctx, sx(gl.x), sy(gl.d, 5), S * 0.6, this.t + gl.x));

    this.fx.render(ctx, (x, y, z) => ({ x: sx(x), y: sy(y, z), s: S }), 'front');
    this.fx.renderTexts(ctx, (x, y, z) => ({ x: sx(x), y: sy(y, z + 2), s: S }));
    if (this.p.ko && this.mode === 'river') {
      bigText(ctx, `KO! ${Math.max(1, Math.ceil(5 - (this.p.koT || 0)))}`, sx(this.p.x), sy(this.p.d, 2.8), 26, '#ff5a5a');
    }

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
    if (this.bolt) {
      // forked lightning straight down onto you
      const B = this.bolt;
      const tx = sx(B.x);
      const ty = sy(B.d, 0.6);
      [['rgba(150,200,255,0.45)', 16], ['#ffffff', 5]].forEach(([col, w]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        let x = tx + rand(-60, 60);
        ctx.moveTo(x, 0);
        const steps = 9;
        for (let i = 1; i <= steps; i++) {
          x = i === steps ? tx : x + rand(-40, 40);
          ctx.lineTo(x, (ty * i) / steps);
        }
        ctx.stroke();
      });
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(230,240,255,${this.flash * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.hard) this.drawShooterMarkers(ctx, v);
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
    const base = this.basePose();
    if (this.p.dead) return { ...base, pose: 'limp', expr: 'ko', holding: undefined };
    return base;
  }

  basePose() {
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
    if (p.charred) ctx.filter = 'brightness(0.32) contrast(1.2)';
    const tilt = this.mode === 'river' ? clamp(p.vx * 0.035, -0.25, 0.25) : 0;
    ctx.rotate(tilt + p.rot + (p.spin > 0 ? this.t * 9 * Math.min(1, p.spin) : 0));
    if (this.salmon) {
      // nose pointing upstream (down the screen), the way it's swimming
      drawSalmonTop(ctx, S * 1.1, t, { flip: true });
    } else if (this.mode === 'bank' || (this.mode === 'entering' && this.modeT < 0.5)) {
      // on the beach, every vessel gets hauled to the water its own way
      const id = this.craft.id;
      const side = p.x > RW - 3 ? -1 : 1;
      const walk = p.walking ? 1 : 0;
      const step = Math.sin(t * 9) * walk;
      const slipRot = p.slip > 0 ? -1.4 * Math.min(1, (1.3 - p.slip) * 4) : 0;
      const pose = p.walking ? 'walk' : p.slip > 0 ? 'flail' : 'wave';
      const expr = p.slip > 0 ? 'hurt' : 'happy';
      const me = (extra = {}) => drawUpright(ctx, ch, occS, { ...charOpts, pose, expr, lifejacket: id === 'lifejacket', ...extra });
      const vessel = (dx, dy, rot, scale = 0.75, extra = {}) => {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);
        drawCraftTop(ctx, id, S * scale, { t: 0, dry: true, occupant: null, ...extra });
        ctx.restore();
      };
      ctx.rotate(slipRot);
      switch (id) {
        case 'barrel':
          // rolled along beside you, tumbling as it goes
          vessel(side * S * 1.5, S * 0.15, p.x * 1.6);
          me();
          break;
        case 'hamster':
          // you are already inside, hamster-wheeling across the sand
          ctx.save();
          ctx.rotate(step * 0.08);
          drawCraftTop(ctx, 'hamster', S * 0.9, { t: t * walk, dry: true, occupant: (c) => drawUpright(c, ch, occS * 0.85, { ...charOpts, pose: p.walking ? 'run' : 'stand', expr }) });
          ctx.restore();
          break;
        case 'kayak':
        case 'surfboard':
          // hoisted overhead
          me({ pose: p.slip > 0 ? 'flail' : 'cheer' });
          vessel(0, -S * 1.95 + Math.abs(step) * S * 0.05, Math.PI / 2 + step * 0.04, id === 'surfboard' ? 0.85 : 0.6);
          break;
        case 'canoe':
          // you and Gary each carry an end
          vessel(side * S * 1.3, -S * 0.9, Math.PI / 2 + step * 0.03, 0.55);
          ctx.save();
          ctx.translate(side * S * 2.6, 0);
          drawUpright(ctx, GARY, occS, { pose: p.walking ? 'walk' : 'hold', expr: 'happy', t: t + 0.5 });
          ctx.restore();
          me({ pose: p.walking ? 'walk' : 'hold' });
          break;
        case 'jetski': {
          // towed behind you on a little trailer
          ctx.save();
          ctx.translate(side * S * 1.7, S * 0.25);
          ctx.fillStyle = '#3a3a44';
          ctx.fillRect(-S * 0.55, S * 0.55, S * 1.1, S * 0.12);
          [-1, 1].forEach((k) => {
            ctx.fillStyle = '#1a1a1e';
            ctx.beginPath();
            ctx.ellipse(k * S * 0.55, S * 0.62, S * 0.14, S * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.strokeStyle = '#3a3a44';
          ctx.lineWidth = Math.max(2, S * 0.06);
          ctx.beginPath();
          ctx.moveTo(0, -S * 0.2);
          ctx.lineTo(-side * S * 1.3, -S * 0.6);
          ctx.stroke();
          ctx.rotate(step * 0.03);
          drawCraftTop(ctx, id, S * 0.7, { t: 0, dry: true });
          ctx.restore();
          me({ pose: p.walking ? 'walk' : 'hold' });
          break;
        }
        case 'goose':
          // the goose waddles along with you, honking occasionally
          vessel(side * S * 1.7, S * 0.1 - Math.abs(step) * S * 0.08, step * 0.14, 0.7, { t, active: Math.sin(t * 2) > 0.95 });
          me();
          break;
        default:
          me();
      }
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
    this.splat.render(ctx, W, H);
    if (this.mode === 'bear' && this.bigBear && this.bigBear.bites && this.g.cfg.settings.gore !== 'off') {
      if (Math.sin(t * 8) > -0.3) bigText(ctx, 'VIEWER DISCRETION ADVISED', W / 2, 86, Math.min(26, W * 0.055), '#ff3b3b');
      bigText(ctx, 'NATURE IS METAL', W / 2, 116, Math.min(18, W * 0.04), '#fff');
    }
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
      bigText(ctx, p.dead ? 'DEAD' : `ODDS ${Math.round(odds * 100)}%`, W / 2, 27, 22, p.dead ? '#ff5a5a' : oddsColor(odds));
      if (this.hard) bigText(ctx, '😈 HARD MODE', 64, 84, 12, '#ff8a8a');
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
      // (kept below the lane readout under the odds pill, even on a short landscape screen)
      const my = Math.max(H * 0.17, 96);
      bigText(ctx, msg, W / 2, my, Math.min(26, W * 0.055), '#fff');
      if (!this.salmon) {
        bigText(ctx, LANE_TIP[lane], W / 2, my + 28, Math.min(17, W * 0.04), lane === 'center' ? '#5dff8a' : lane === 'edge' ? '#ff8a8a' : '#ffd23b');
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
      if (p.dead) {
        this.g.input.setButtons([]);
        // the cause pops up over the body first; once that fades it stays pinned at the top
        if ((p.deadT || 0) > 2.4) {
          bigText(ctx, DEATH_LABEL[p.deadCause] || 'DEAD', W / 2, 92, Math.min(24, W * 0.055), '#ff5a5a');
          bigText(ctx, '...STILL FLOATING TOWARD THE FALLS', W / 2, H - 36, Math.min(17, W * 0.04), '#ffb0b0');
        }
      } else if (touch) {
        btn.label = ab.name;
        const list = [btn];
        if (p.slingshot) list.push({ id: 'shoot', x: btn.x, y: btn.y - btnR * 2.3, r: btnR * 0.8, label: 'SHOOT', action: 'shoot' });
        this.g.input.setButtons(list);
        drawButton(ctx, btn, { color: '#ff4f7b', cd: p.cd > 0 ? p.cd / ab.cd : 0 });
        if (p.slingshot) drawButton(ctx, list[1], { color: '#8a5a2b', cd: p.shootCd > 0 ? p.shootCd / 0.45 : 0 });
      } else {
        if (p.slingshot) bigText(ctx, 'F: SHOOT BACK', W / 2, H - 84, 16, '#ffd23b');
        this.g.input.setButtons([]);
        const ready = p.cd <= 0;
        bigText(ctx, `SPACE: ${ab.name}${ready ? '' : ` (${p.cd.toFixed(1)})`}`, W / 2, H - 30, 18, ready ? '#ffd23b' : '#aaa');
        if (this.modeT < 6) bigText(ctx, '◀ ▶ STEER    ▲ FASTER    ▼ SLOWER', W / 2, H - 58, 16, '#fff');
      }
      if (touch && this.modeT < 5 && !p.dead) bigText(ctx, 'DRAG LEFT SIDE TO PADDLE', W * 0.3, H - 40, 15, '#fff');
    } else {
      this.g.input.setButtons([]);
    }
    if (touch) drawJoystick(ctx, this.g.input);
  }
}
