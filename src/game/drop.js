// The big drop: side-view ragdoll physics over the Horseshoe Falls, per-vessel mini-games,
// the survival roll, and the (very) messy aftermath.
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { FX, Splatter, goreOf } from './fx.js';
import { Physics, makeBox, makeBall, attach } from './physics.js';
import { buildHuman, buildGiraffe, breakBone, drawRagdoll, corePoint, poseRagdoll, LIMB_BONES, HEAD_BONE, SPINE_BONE } from './ragdoll.js';
import { drawCraftSide, drawParachute, drawGooseSide } from './vesselArt.js';
import { drawHead, drawUpright, drawBear, GARY, OUTLINE, BORDER_AGENT } from './charArt.js';
import { lastWords, VOICE_PITCH } from '../data/messages.js';
import { clips } from '../audio/clips.js';
import * as art from './dropArt.js';
import { POOL_Y, LIP_DEPTH, cliffX, rockContains } from './dropArt.js';
import { clamp, lerp, rand, pick, approach, bigText, TAU, easeOutBack, roundRect } from './util.js';
import { computeOdds, oddsColor, LANE_NAME } from './odds.js';
import { drawButton, drawJoystick, pill, bar } from './hud.js';
import { RAINBOW } from '../data/characters.js';
import { isFavorite } from '../data/crafts.js';

const RING_LABEL = { pencil: 'POINT YOUR TOES!', boof: 'BOOF!', micdrop: 'MIC DROP!' };
// physics box (w, h) for the band's instruments; the rest keep their classic sizes
const INST_BOX = { keyboard: [1.9, 0.14], guitar: [2.0, 0.32], trumpet: [1.9, 0.36], bass: [2.3, 0.36], drums: [1.05, 0.8], mic: [1.7, 0.2] };
const INST_DEBRIS = { keyboard: '#d0202a', guitar: '#ff9a4a', trumpet: '#e8b84a', bass: '#3fd08e', drums: '#a8402e', mic: '#c8ccd4' };
const MINI_MODES = ['inflate', 'mash', 'rhythm', 'aim'];
const JOY_MODES = ['boof', 'surf', 'glide', 'aim'];
const RING_BONUS = { perfect: 0.18, good: 0.09, ok: 0.03, miss: -0.05 };
const DECIDE_Y = 33;
const CAVE_Y0 = 20;
const AGENT_X = -1.9; // Kacey's border agent, just upstream of the lip
const CAVE_Y1 = 26;

export class Drop {
  constructor(game, info) {
    this.g = game;
    this.info = info;
    const { character, craft, cheats, settings } = game.cfg;
    this.ch = character;
    this.craft = craft;
    this.cheats = cheats;
    this.settings = settings;
    this.craftId = info.wrecked ? 'nothing' : craft.id;
    // instruments borrow a classic vessel's physics ("mech"); art still goes by craftId
    this.mech = info.wrecked ? 'nothing' : craft.like || craft.id;
    this.fav = !info.wrecked && isFavorite(craft, character);
    this.dropText = (!info.wrecked && craft.dropText) || {};
    this.dropMode = info.wrecked ? 'pencil' : craft.drop;
    this.t = 0;
    this.stage = 'approach';
    this.stageT = 0;
    this.bonus = 0;
    this.bonusLabel = null;
    this.skillLumens = 0;
    this.emitters = [];
    this.breakQueue = [];
    this.flags = {};
    this.goreStyle = settings.gore === 'off' || character.gore === 'cartoon' ? 'cartoon' : character.gore;
    // every now and then (or always, with the cheat) the blood is... not blood
    this.poop = this.goreStyle !== 'cartoon' && !!game.cfg.poop;
    // died in the river (snipers, lightning, surprise bear)? Then this is a guaranteed messy landing.
    this.forced = info.dead ? info.deadCause || 'shot' : null;
    this.splat = new Splatter();

    const P = new Physics();
    P.gravity = cheats.moon ? 8 : 22;
    P.collider = (p, dt) => this.collide(p, dt);
    this.phys = P;
    this.fx = new FX('side');
    this.fx.gravity = P.gravity;
    this.fx.onLand = (p) => this.onParticle(p);

    this.rocks = this.makeRocks(info.lane);
    this.flowV = clamp(info.speed, 4, 13) * 0.95;
    this.setupBodies();
    if (info.charred) this.rider.charred = true;
    this.cam = { x: -4, y: -0.5, S: this.baseScale(9) };
    this.boatX = 46;

    music.play(craft.id === 'goose' && !info.wrecked ? 'goose' : 'drop');
    audio.stopLoop('river');
    audio.setLoop('falls', 0.45, 700);
    this.mini = { ring: null, ringDone: false, surf: null, chute: null, kayakZone: 0, kayakTotal: 0 };
    // the left-side joystick is only needed by drops you steer; elsewhere any tap is the action button
    game.input.joyEnabled = JOY_MODES.includes(this.dropMode);
  }

  baseScale(metres) {
    const { W, H } = this.g;
    return Math.min(H / metres, W / (metres * 0.55));
  }

  makeRocks(lane) {
    const rocks = [];
    const spots = lane === 'edge' ? [0.8, 2.8, 4.8, 7, 9.2, 11.5, 13.8, 16.2, 18.5] : lane === 'mid' ? [1, 3.4, 6, 8.6, 11.5, 14.5] : [1.2, 3.6, 18];
    spots.forEach((x, i) => {
      const r = lane === 'edge' ? rand(1.0, 1.7) : rand(0.85, 1.35);
      const roll = Math.random();
      const type = roll < 0.3 ? 'spike' : roll < 0.5 ? 'flat' : 'round';
      rocks.push(art.makeRock(x + rand(-0.4, 0.4), POOL_Y - r * 0.35 + rand(-0.2, 0.3), r, i * 31 + Math.floor(Math.random() * 1000), type));
    });
    return rocks;
  }

  // ------------------------------------------------------------ build vessel + rider
  makeRider(ch, x, y, pose, extra = {}) {
    const opts = { bigHead: this.cheats.bigHead, tiny: this.cheats.tiny, noodle: this.cheats.noodle, lifejacket: this.craftId === 'lifejacket', ...extra };
    const rag = ch.kind === 'giraffe' ? buildGiraffe(this.phys, ch, x, y, pose === 'sit' || pose === 'ride' || pose === 'crouch' ? 'sit' : 'stand', opts) : buildHuman(this.phys, ch, x, y, pose, opts);
    rag.goreStyle = ch.id === 'gary' ? (this.settings.gore === 'off' ? 'cartoon' : 'blood') : this.goreStyle;
    if (this.poop && rag.goreStyle !== 'cartoon') rag.goreStyle = 'poop';
    rag.expr = 'scared';
    return rag;
  }

  attachNearest(rag, body, names, stiff = 0.9) {
    const sticks = [];
    names.forEach((n) => {
      const p = rag.P[n];
      if (!p) return;
      const pts = [...body.pts].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      sticks.push(...attach(this.phys, p, pts[0], pts[1], { stiff }));
    });
    return sticks;
  }

  setupBodies() {
    const P = this.phys;
    const id = this.mech;
    const box = INST_BOX[this.craftId];
    const ch = this.ch;
    const x0 = -7;
    const giraffe = ch.kind === 'giraffe';
    this.body = null;
    this.ball = null;
    this.paddle = null;
    this.gary = null;
    this.attachSticks = [];
    this.hideRider = false;
    switch (id) {
      case 'nothing':
      case 'lifejacket': {
        this.rider = this.makeRider(ch, x0, 0.12, 'swim');
        if (giraffe) this.rider.pts.forEach((p) => (p.y += 0.2));
        break;
      }
      case 'surfboard': {
        this.body = makeBox(P, x0, 0, box ? box[0] : 2.0, box ? box[1] : 0.1, 3, { buoy: 2.4 });
        this.rider = this.makeRider(ch, x0, giraffe ? -0.8 : -0.05 - 0.74 * ch.scale, 'surf');
        if (giraffe) this.attachSticks = this.attachNearest(this.rider, this.body, ['blf', 'brf', 'flf', 'frf', 'hips', 'shoulders'], 0.8);
        else this.attachSticks = [...this.attachNearest(this.rider, this.body, ['footL', 'footR']), ...this.attachNearest(this.rider, this.body, ['pelvis', 'chest'], 0.12)];
        break;
      }
      case 'barrel': {
        this.body = makeBox(P, x0, -0.05, box ? box[0] : 0.95, box ? box[1] : 0.62, 6, { buoy: 2.2 });
        this.rider = this.makeRider(ch, x0 - 0.1, giraffe ? 0.1 : 0.05, 'crouch');
        // the rider rides inside, invisible and frozen, until the barrel breaks
        this.rider.pts.forEach((p) => {
          p.im0 = p.im;
          p.im = 0;
        });
        this.hideRider = true;
        break;
      }
      case 'kayak': {
        this.body = makeBox(P, x0, 0, box ? box[0] : 2.8, box ? box[1] : 0.3, 4, { buoy: 2.0 });
        this.rider = this.makeRider(ch, x0 - (box ? 0.45 : 0.15), giraffe ? -0.35 : -0.17 - (box ? 0.04 : 0), 'sit');
        this.attachSticks = this.attachNearest(this.rider, this.body, giraffe ? ['hips', 'shoulders', 'blk', 'flk'] : ['pelvis', 'kneeL', 'kneeR', 'footL', 'footR', ...(box ? ['handL', 'handR'] : [])]);
        if (!giraffe && !box) {
          const hL = this.rider.P.handL;
          const hR = this.rider.P.handR;
          const pa = P.point(hL.x - 0.9, hL.y - 0.05, { mass: 0.3, r: 0.05 });
          const pb = P.point(hR.x + 0.9, hR.y + 0.05, { mass: 0.3, r: 0.05 });
          P.stick(pa, pb);
          P.stick(hL, pa, { kind: 'attach' });
          P.stick(hL, pb, { kind: 'attach' });
          P.stick(hR, pa, { kind: 'attach' });
          P.stick(hR, pb, { kind: 'attach' });
          this.paddle = { a: pa, b: pb };
        }
        break;
      }
      case 'canoe': {
        this.body = makeBox(P, x0, 0, box ? box[0] : 3.2, box ? box[1] : 0.45, 5, { buoy: 2.0 });
        this.rider = this.makeRider(ch, x0 - (box ? 0.5 : 0.75), giraffe ? -0.4 : -0.2, 'sit');
        this.attachSticks = this.attachNearest(this.rider, this.body, giraffe ? ['hips', 'shoulders', 'blk'] : ['pelvis', 'footL', 'footR', ...(box ? ['handL', 'handR'] : [])]);
        if (this.craft.passenger) {
          this.gary = this.makeRider(GARY, x0 + 0.65, -0.2, 'sit');
          this.attachSticks.push(...this.attachNearest(this.gary, this.body, ['pelvis', 'footL', 'footR']));
        }
        break;
      }
      case 'hamster': {
        this.ball = makeBall(P, x0, -0.3, 0.95, 12, 3);
        this.rider = this.makeRider(ch, x0 - 0.1, giraffe ? -0.1 : -0.05, 'crouch');
        if (giraffe) {
          const c = { x: x0, y: -0.3 };
          this.rider.pts.forEach((p) => {
            p.x = p.px = c.x + (p.x - c.x) * 0.5;
            p.y = p.py = c.y + (p.y - c.y) * 0.5;
          });
        }
        const R = 0.95;
        this.containment = () => {
          if (this.ballPopped) return;
          const hub = this.ball.hub;
          this.rider.pts.forEach((p) => {
            const dx = p.x - hub.x;
            const dy = p.y - hub.y;
            const d = Math.hypot(dx, dy);
            const lim = R - p.r - 0.06;
            if (d > lim) {
              p.x = hub.x + (dx / d) * lim;
              p.y = hub.y + (dy / d) * lim;
            }
          });
        };
        P.constraints.push(this.containment);
        break;
      }
      case 'mic':
      case 'jetski': {
        this.body = makeBox(P, x0, 0, box ? box[0] : 2.1, box ? box[1] : 0.45, 6, { buoy: 2.0 });
        this.rider = this.makeRider(ch, x0 - 0.35, giraffe ? -0.55 : box ? -(box[1] / 2 + 0.3) : -0.5, 'ride');
        this.attachSticks = this.attachNearest(this.rider, this.body, giraffe ? ['hips', 'shoulders', 'flk', 'blk'] : ['pelvis', 'kneeL', 'kneeR', 'footL', 'footR', 'handL', 'handR']);
        break;
      }
      case 'goose': {
        this.body = makeBox(P, x0, -0.2, 1.9, 0.9, 5, { buoy: 2.4 });
        this.rider = this.makeRider(ch, x0 - 0.15, giraffe ? -1.0 : -0.95, 'ride');
        this.attachSticks = this.attachNearest(this.rider, this.body, giraffe ? ['hips', 'shoulders', 'flk', 'blk'] : ['pelvis', 'kneeL', 'kneeR', 'footL', 'footR', 'handL', 'handR']);
        break;
      }
      default:
        this.rider = this.makeRider(ch, x0, 0.12, 'swim');
    }
    this.rider.expr = this.info.ko ? 'ko' : 'scared';
    this.allPts = P.pts;
    this.bodyPts = this.body ? this.body.pts : this.ball ? [this.ball.hub, ...this.ball.rim] : [];
    this.riderSet = new Set(this.rider.pts);
  }

  // ------------------------------------------------------------ physics world
  collide(p, dt) {
    const g = this.phys.gravity;
    // upstream river: buoyancy + flow toward the lip
    if (p.x < 0.15 && p.y > -0.15 && p.y < LIP_DEPTH + 0.5) {
      const sub = clamp((p.y + 0.12) / 0.35, 0, 1);
      if (sub > 0) {
        p.ay -= g * 1.5 * sub * p.buoy;
        const vx = (p.x - p.px) / dt;
        const vy = (p.y - p.py) / dt;
        const nvx = vx + (this.flowV - vx) * Math.min(1, 5 * dt);
        const nvy = vy * (1 - Math.min(0.9, 5 * dt * sub));
        p.px = p.x - nvx * dt;
        p.py = p.y - nvy * dt;
      }
    }
    // rock mass (riverbed + cliff face)
    if (p.y > LIP_DEPTH - p.r) {
      const cx = cliffX(Math.max(p.y, LIP_DEPTH));
      if (p.x < cx + p.r) {
        const penX = cx + p.r - p.x;
        const penY = p.y - (LIP_DEPTH - p.r);
        if (p.x < -0.6 && penY < penX) {
          p.y = LIP_DEPTH - p.r;
          p.px = p.x - (p.x - p.px) * 0.8;
        } else {
          p.x = cx + p.r;
          p.py = p.y - (p.y - p.py) * 0.7;
          const vx = (p.x - p.px) / dt;
          if (vx < 0) p.px = p.x + vx * 0.3 * dt;
        }
      }
    }
    // plunge pool
    if (p.y > POOL_Y) {
      const vy = (p.y - p.py) / dt;
      if (!p.wet) {
        p.wet = true;
        this.onWaterEntry(p, vy);
      }
      const sub = clamp((p.y - POOL_Y) / 0.5, 0, 1.6);
      const isBody = this.riderSet.has(p) || (this.gary && this.gary.pts.includes(p));
      p.ay -= g * 1.25 * sub * (isBody ? Math.max(2.0, p.buoy) : p.buoy) * (this.sinkT > 0 && isBody ? 0.35 : 1);
      const k = Math.min(0.95, 6 * dt * sub);
      const vx = (p.x - p.px) / dt;
      const nvx = vx * (1 - k) + 0.9 * k * 0.5;
      const nvy = vy * (1 - k);
      p.px = p.x - nvx * dt;
      p.py = p.y - nvy * dt;
    } else if (p.y < POOL_Y - 0.4) {
      p.wet = false;
    }
    if (p.y > POOL_Y + 14) {
      p.y = POOL_Y + 14;
      p.py = p.y;
    }
    // rocks (each is a few collision circles: round boulders, spikes, slabs)
    for (const r of this.rocks) {
      if (r.hidden) continue;
      for (const cc of r.circles) {
        const dx = p.x - cc.x;
        const dy = p.y - cc.y;
        const d = Math.hypot(dx, dy);
        const min = cc.r + p.r;
        if (d < min && d > 0) {
          const nx = dx / d;
          const ny = dy / d;
          const vx = (p.x - p.px) / dt;
          const vy = (p.y - p.py) / dt;
          const vn = vx * nx + vy * ny;
          p.x = cc.x + nx * min;
          p.y = cc.y + ny * min;
          if (vn < 0) {
            const tx = vx - vn * nx;
            const ty = vy - vn * ny;
            const nvx = tx * 0.6 - vn * nx * 0.25;
            const nvy = ty * 0.6 - vn * ny * 0.25;
            p.px = p.x - nvx * dt;
            p.py = p.y - nvy * dt;
            if (-vn > 7) this.onRockHit(p, -vn, r);
          }
        }
      }
    }
  }

  isTracked(p) {
    if (this.hideRider) return this.bodyPts.includes(p);
    return p === corePoint(this.rider) || p === this.rider.P.head || (this.ball && p === this.ball.hub);
  }

  onWaterEntry(p, vy) {
    if (vy > 5) {
      const power = clamp(vy / 18, 0.3, 1.6);
      if (Math.random() < 0.5 || this.isTracked(p)) this.fx.splash(p.x, POOL_Y, power * (this.isTracked(p) ? 1.4 : 0.5));
    }
    if (this.isTracked(p) && this.stage !== 'after') this.onImpact('water', p, vy);
  }

  onRockHit(p, speed, rock) {
    if (this.stage === 'approach') return;
    if (this.isTracked(p) || this.riderSet.has(p) || this.bodyPts.includes(p)) {
      if (this.stage !== 'after' && (this.isTracked(p) || speed > 12)) this.onImpact('rock', p, speed, rock);
      else if (this.stage === 'after' && this.outcome && !this.outcome.survived && this.riderSet.has(p) && speed > 9) {
        this.fx.blood(p.x, p.y, -(p.x - rock.x), -(p.y - rock.y), 0.4, this.rider.goreStyle);
        audio.thud();
      }
    }
  }

  onParticle(p) {
    const blood = p.kind === 'blood' || p.kind === 'glitter';
    if (p.y > POOL_Y) {
      if (blood) {
        if (Math.random() < 0.35) this.fx.cloud(p.x, POOL_Y + rand(0.2, 1.2), goreOf(p.style).cloud, 1.2);
        return false;
      }
      if (p.kind === 'drop' || p.kind === 'confetti' || p.kind === 'spark' || p.kind === 'note') return false;
      if (p.kind !== 'cloud' && p.kind !== 'bubble' && p.kind !== 'smoke' && p.kind !== 'fire' && p.kind !== 'foam' && p.kind !== 'mist' && p.kind !== 'stink') {
        // floating junk
        p.y = POOL_Y - 0.05;
        p.vy = 0;
        p.grav = 0;
        p.vx *= 0.96;
        p.life = Math.max(p.life, 1.5);
      }
    }
    if (blood) {
      for (const r of this.rocks) {
        if (r.hidden) continue;
        if (rockContains(r, p.x, p.y, 1.15)) {
          if (r.decals.length < 40) r.decals.push({ x: p.x - r.x, y: p.y - r.y, r: rand(0.06, 0.22), a: rand(0, TAU), c: p.kind === 'glitter' ? pick(RAINBOW) : pick(goreOf(p.style).decal), drip: Math.random() < 0.4 ? rand(0.2, 0.7) : 0 });
          return false;
        }
      }
      if (p.y > LIP_DEPTH && p.x < cliffX(p.y) + 0.05) return false;
    }
    return true;
  }

  // ------------------------------------------------------------ odds / decision
  finalOdds() {
    if (this.forced) return 0;
    const info = this.info;
    return computeOdds({
      craft: this.craft,
      hpRatio: info.hpRatio,
      wrecked: info.wrecked,
      ko: info.ko,
      lane: info.lane,
      speed: info.speed,
      bonus: this.bonus,
      cheats: this.cheats,
      fav: this.fav,
    });
  }

  predictLanding() {
    const p = this.hideRider ? { x: this.body.cx, y: this.body.cy, px: this.body.cx, py: this.body.cy } : corePoint(this.rider);
    const dt = 1 / 120;
    const vx = this.hideRider ? (this.body.pts[0].x - this.body.pts[0].px) / dt : (p.x - p.px) / dt;
    const vy = this.hideRider ? (this.body.pts[0].y - this.body.pts[0].py) / dt : (p.y - p.py) / dt;
    const g = this.phys.gravity;
    const dy = POOL_Y - p.y;
    const tt = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * dy))) / g;
    return { x: p.x + vx * tt * 0.97, t: tt };
  }

  decide() {
    if (this.outcome) return;
    const odds = this.finalOdds();
    const roll = Math.random();
    const survived = roll < odds;
    const land = this.predictLanding();
    const near = (r) => Math.abs(r.x - land.x) < r.r + 1.2;
    let cause = null;
    if (survived) {
      this.rocks.forEach((r) => {
        if (Math.abs(r.x - land.x) < r.r + 3) r.hidden = true;
      });
    } else {
      const lane = this.info.lane;
      const rockChance = lane === 'edge' ? 0.75 : lane === 'mid' ? 0.45 : 0.18;
      if (this.cheats.explosive) cause = 'explode';
      else if (this.mini.chute && this.mini.chute.deployed) cause = 'chute';
      else if (this.info.ko && !this.forced) cause = 'unconscious';
      else if (Math.random() < Math.max(rockChance, this.forced ? 0.6 : 0)) cause = 'rocks';
      else cause = Math.random() < 0.85 || this.cheats.goreGalore || this.poop || this.forced ? 'water' : 'drown';
      if (import.meta.env.DEV && window.__nobForceCause) cause = window.__nobForceCause; // QA hook (dev server only)
      if (cause === 'rocks') {
        // which rock gets you: a spike (impaled), a slab (pancaked) or a plain old boulder
        const v = Math.random();
        cause = v < 0.36 ? 'impaled' : v < 0.68 ? 'pancake' : 'rocks';
        if (import.meta.env.DEV && window.__nobForceRock) cause = window.__nobForceRock;
      }
      if (['rocks', 'impaled', 'pancake'].includes(cause) || (cause === 'unconscious' && Math.random() < 0.5) || (cause === 'explode' && Math.random() < 0.5)) {
        const want = cause === 'impaled' ? 'spike' : cause === 'pancake' ? 'flat' : null;
        this.rocks.forEach((r) => {
          if (Math.abs(r.x - land.x) < (r.w || r.r) + 2.5) r.hidden = true;
        });
        const rock = art.makeRock(land.x, POOL_Y - 0.9, want === 'flat' ? 1.5 : 1.6, Math.floor(Math.random() * 9999), want || 'round');
        this.rocks.push(rock);
        this.killRock = rock;
      } else {
        this.rocks.forEach((r) => {
          if (near(r)) r.hidden = true;
        });
      }
    }
    if (this.cheats.explosive) cause = cause || 'explode';
    this.outcome = { survived, odds, roll, cause };
    if (!survived && cause === 'chute' && this.mini.chute) {
      this.mini.chute.torn = true;
      this.fx.text('THE CHUTE HAS A HOLE!', corePoint(this.rider).x, corePoint(this.rider).y - 2, '#ff5a5a', 26, 0, 2);
      audio.whoosh(0.6);
    }
  }

  // ------------------------------------------------------------ impact & gore
  onImpact(kind, p, speed) {
    if (this.stage === 'after') return;
    if (!this.outcome) this.decide();
    this.stage = 'after';
    this.stageT = 0;
    this.impact = { x: p.x, y: Math.min(p.y, POOL_Y), kind };
    const O = this.outcome;
    this.g.setTimeScale(0.3, 1.1);
    this.g.shake(1.6);
    audio.impact();
    if (kind === 'water' || O.survived) this.fx.splash(p.x, POOL_Y, 1.6);
    this.mini.ring = null;
    if (O.survived) {
      audio.splash(1.4);
      this.surviveSequence();
    } else {
      this.deathSequence(kind);
    }
  }

  surviveSequence() {
    const id = this.craftId;
    if (this.cheats.explosive) {
      audio.boom(1);
      this.fx.fire(this.impact.x, POOL_Y - 0.5, 40);
      this.fx.smoke(this.impact.x, POOL_Y - 0.5, 20);
      this.fx.text('SURVIVED THE EXPLOSION?!', this.impact.x, POOL_Y - 4, '#ffd23b', 30, 0, 2.5);
      this.charred = true;
    }
    if (id !== 'goose') {
      this.submerged = true;
      this.sinkT = 1.2;
    }
    this.flags.survived = true;
  }

  deathSequence(kind) {
    const O = this.outcome;
    const cause = O.cause;
    const rag = this.rider;
    const style = this.goreStyle;
    const gore = this.cheats.goreGalore || this.forced === 'banana' ? 'galore' : this.settings.gore;
    // death noise (a recorded clip; the synth voice only if no clip loaded). A corpse already made theirs in the river.
    let said = 0;
    if (!this.info.dead) {
      said = clips.play('death', { delay: 0.15 });
      if (!said) setTimeout(() => audio.say(lastWords(this.ch.id, this.poop), VOICE_PITCH[this.ch.id] || 1), 180);
    }
    if (this.gary) setTimeout(() => audio.say(lastWords('gary'), VOICE_PITCH.gary), Math.max(1700, (said + 0.3) * 1000));
    if (cause === 'impaled' && style !== 'cartoon') this.impale();
    if (cause === 'pancake' && style !== 'cartoon') this.pancake();
    rag.expr = 'ko';
    rag.dead = true;
    if (this.gary) {
      this.gary.expr = 'ko';
      this.gary.dead = true;
    }
    // vessel separates / smashes
    this.attachSticks.forEach((s) => (s.broken = true));
    if (this.hideRider) this.revealRider();
    this.smashVessel();
    audio.splat(1.4);
    audio.crack();
    if (cause === 'explode') {
      audio.boom(1.3);
      this.fx.fire(this.impact.x, this.impact.y - 0.3, 50);
      this.fx.smoke(this.impact.x, this.impact.y - 0.3, 24);
      this.allPts.forEach((pt) => this.phys.impulse(pt, rand(-14, 14), rand(-20, -6), 1 / 120));
    }
    if (style === 'cartoon') {
      this.fx.stars(rag.P.head.x, rag.P.head.y, 7);
      audio.bonk();
      this.ghost = { t: 0 };
      setTimeout(() => audio.harp(), 900);
      if (cause === 'drown') this.sinkT = 2;
      return;
    }
    const gStyle = rag.goreStyle;
    const core = corePoint(rag);
    if (cause === 'drown') {
      // drowned, but the falls still did a number on you
      this.sinkT = 2.5;
      audio.glub();
      this.fx.bubbles(this.impact.x, POOL_Y + 0.5, 14);
      this.fx.blood(core.x, core.y, 0, -1, 0.8, gStyle);
      this.breakQueue.push({ rag, name: pick(LIMB_BONES[rag.kind]), at: 0.1 });
      return;
    }
    if (this.poop) {
      audio.fart();
      this.fx.text('EXPLOSIVE DIARRHEA', core.x, core.y - 2.5, '#c8a050', 34, 0, 2.6);
      this.fx.stink(core.x, core.y, 10);
    }
    // GORE: decide which bones go
    const kindKey = rag.kind;
    const limbs = [...LIMB_BONES[kindKey]].sort(() => Math.random() - 0.5);
    let nLimbs;
    let headChance;
    let spineChance;
    if (gore === 'galore' || cause === 'explode') {
      nLimbs = limbs.length;
      headChance = 1;
      spineChance = 0.85;
    } else if (gore === 'max') {
      nLimbs = Math.floor(rand(4, 7));
      headChance = 0.7;
      spineChance = 0.35;
    } else {
      nLimbs = Math.floor(rand(2, 4));
      headChance = 0.35;
      spineChance = 0.08;
    }
    if (kind === 'water' && cause !== 'explode') nLimbs = Math.max(2, Math.floor(nLimbs * 0.75));
    const queue = limbs.slice(0, nLimbs);
    if (Math.random() < headChance) queue.splice(Math.floor(Math.random() * 2), 0, HEAD_BONE[kindKey]);
    const spine = Math.random() < spineChance;
    if (spine) queue.push(SPINE_BONE[kindKey]);
    queue.forEach((name, i) => this.breakQueue.push({ rag, name, at: i * 0.07 + rand(0, 0.05) }));
    if (this.gary) {
      [...LIMB_BONES.human].sort(() => Math.random() - 0.5).slice(0, Math.max(2, Math.floor(nLimbs * 0.7))).forEach((name, i) => this.breakQueue.push({ rag: this.gary, name, at: 0.1 + i * 0.08 }));
      if (Math.random() < headChance) this.breakQueue.push({ rag: this.gary, name: 'neck', at: 0.05 });
    }
    this.fx.blood(core.x, core.y, 0, -1, 2.6, gStyle);
    this.fx.blood(core.x, core.y, 1, -0.4, 1.4, gStyle);
    this.fx.gibs(core.x, core.y, gore === 'on' ? 0.7 : 1.5, gStyle);
    if (spine || gore === 'galore' || (gore === 'max' && Math.random() < 0.5)) {
      this.fx.guts(core.x, core.y, gore === 'galore' ? 6 : 3, gStyle);
      this.gutsSpilled = true;
    }
    if (gore !== 'on') this.splat.add(gore === 'galore' ? 10 : 4 + Math.floor(Math.random() * 4), gStyle, 1.2);
    else this.splat.add(2, gStyle, 0.8);
    if (gore === 'galore') this.bloodRain = 3.5;
  }

  // ---- the secret cave behind the falls (Golden Goose only)
  enterCave() {
    this.flags.cave = true;
    this.stage = 'cave';
    this.stageT = 0;
    this.cave = { t: 0, exit: false, exitT: 0, bonus: false };
    this.g.setTimeScale(1, 0);
    this.g.input.setButtons([]);
    audio.harp();
    audio.honk();
    music.play('goose');
  }

  updateCave(dt, inp) {
    const Cv = this.cave;
    Cv.t += dt;
    if (!Cv.bonus && Cv.t > 0.8) {
      Cv.bonus = true;
      audio.bigPickup();
    }
    if (!Cv.exit && (Cv.t > 4.8 || (Cv.t > 2 && (inp.pressed('primary') || inp.tapped)))) {
      Cv.exit = true;
      Cv.exitT = 0;
    }
    if (!Cv.exit) return;
    Cv.exitT += dt;
    if (Cv.exitT > 1.0 && !Cv.slipped) {
      Cv.slipped = true;
      audio.slip();
      audio.whoa(this.ch.voice || 1);
      setTimeout(() => audio.honk(), 250);
    }
    if (Cv.exitT > 1.85) this.leaveCave();
  }

  leaveCave() {
    const y = (CAVE_Y0 + CAVE_Y1) / 2;
    const x = cliffX(y) + 1.3;
    this.attachSticks.forEach((st) => (st.broken = true));
    poseRagdoll(this.rider, this.rider.kind === 'giraffe' ? 'stand' : 'stand', x, y - 0.2);
    this.rider.pts.forEach((pt) => this.phys.setVel(pt, rand(3, 5), rand(-4, -2), 1 / 120));
    // the goose flaps off, honking in alarm
    this.body.pts.forEach((pt) => {
      pt.x += 3;
      pt.y -= 2.5;
      pt.px = pt.x;
      pt.py = pt.y + 0.04;
    });
    this.forced = 'banana';
    this.poop = true;
    if (this.rider.goreStyle !== 'cartoon') this.rider.goreStyle = 'poop';
    this.outcome = { survived: false, odds: 0, roll: 1, cause: 'water' };
    this.stage = 'fall';
    this.stageT = 0;
    this.rider.expr = 'scream';
    music.play('drop');
    audio.scream(this.ch.voice || 1, 1.6);
    this.fx.text('BANANA PEEL?!', x + 1, y - 2, '#ffd23b', 32, 0, 1.8);
  }

  // Kacey's admirer from Canadian border services, standing on a rock right at the lip
  drawAgentSide(ctx, lw) {
    const x = AGENT_X;
    ctx.save();
    ctx.fillStyle = '#6e6862';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - 0.75, 0.25);
    ctx.quadraticCurveTo(x - 0.7, -0.32, x - 0.2, -0.38);
    ctx.quadraticCurveTo(x + 0.45, -0.42, x + 0.7, 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x - 0.7 + Math.sin(this.t * 6) * 0.04, 0.05, 0.25, 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.translate(x, -0.36);
    drawUpright(ctx, BORDER_AGENT, 1, { pose: 'wave', expr: 'happy', t: this.t, lw: lw * 100 });
    ctx.restore();
  }

  drawAgentBubble(ctx, proj) {
    if (this.stage === 'cave' || this.stage === 'after') return;
    const head = proj(AGENT_X, -2.5);
    const { W, H } = this.g;
    if (head.y < -40 || head.y > H + 40 || head.x < -200 || head.x > W + 200) return;
    if (head.y < 30) return;
    const text = 'Let me pet you!';
    const fs = Math.max(14, Math.min(24, head.s * 0.42));
    ctx.save();
    ctx.font = `${fs}px "Luckiest Guy", sans-serif`;
    const w = ctx.measureText(text).width + fs * 1.2;
    const h = fs * 1.8;
    // above the head while there's room; once the head nears the top (under the HUD), hang it beside the head
    let bx = clamp(head.x - w * 0.25, 8, W - w - 8);
    let by = head.y - h - fs * 0.6 + Math.sin(this.t * 3) * 2;
    const beside = by < 70;
    if (beside) {
      bx = clamp(head.x + fs * 1.2, 8, W - w - 8);
      by = Math.max(70, head.y - h * 0.2);
    }
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1a1030';
    ctx.lineWidth = 2.5;
    roundRect(ctx, bx, by, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    // the tail points back at the agent's head
    ctx.beginPath();
    if (beside) {
      ctx.moveTo(bx + 2, by + h * 0.35);
      ctx.lineTo(head.x + 6, head.y);
      ctx.lineTo(bx + 2, by + h * 0.7);
    } else {
      const tx = clamp(head.x, bx + 14, bx + w - 30);
      ctx.moveTo(tx, by + h - 1);
      ctx.lineTo(head.x - 4, head.y - 4);
      ctx.lineTo(tx + 16, by + h - 1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (beside) ctx.fillRect(bx - 1, by + h * 0.35 + 1, 6, h * 0.35 - 2);
    else ctx.fillRect(clamp(head.x, bx + 14, bx + w - 30) + 1, by + h - 4, 14, 6);
    ctx.fillStyle = '#c8102e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + fs * 0.6, by + h / 2 + 1);
    ctx.restore();
  }

  drawCaveMouth(ctx, lw) {
    const y0 = CAVE_Y0;
    const y1 = CAVE_Y1;
    const ym = (y0 + y1) / 2;
    const cx0 = cliffX(ym);
    ctx.save();
    ctx.fillStyle = '#100a06';
    ctx.strokeStyle = 'rgba(70,45,25,0.95)';
    ctx.lineWidth = lw * 2;
    ctx.beginPath();
    ctx.moveTo(cliffX(y1) + 0.05, y1);
    ctx.quadraticCurveTo(cx0 - 2.3, y1 + 0.3, cx0 - 2.5, ym);
    ctx.quadraticCurveTo(cx0 - 2.1, y0 - 0.5, cliffX(y0) + 0.05, y0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // a faint warm glow deep inside (someone left a lantern)
    const g = ctx.createRadialGradient(cx0 - 1.6, ym, 0.05, cx0 - 1.6, ym, 1.2);
    g.addColorStop(0, 'rgba(255,200,110,0.35)');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx0 - 1.6, ym, 1.2, 0, TAU);
    ctx.fill();
    // vines hanging over the mouth hide it a little
    ctx.strokeStyle = 'rgba(70,125,50,0.85)';
    ctx.lineWidth = lw * 1.6;
    for (let k = 0; k < 7; k++) {
      const xx = cliffX(y0) - 0.15 - k * 0.32;
      const len = 1.2 + (k % 3) * 0.7;
      ctx.beginPath();
      ctx.moveTo(xx, y0 - 0.1);
      ctx.quadraticCurveTo(xx + 0.12, y0 + len * 0.5, xx - 0.05 + Math.sin(this.t * 2 + k) * 0.08, y0 + len);
      ctx.stroke();
    }
    if (this.cheats.gooseCave && this.craftId === 'goose' && !this.flags.cave) {
      const pulse = 0.6 + Math.sin(this.t * 6) * 0.4;
      ctx.strokeStyle = `rgba(255,230,90,${pulse})`;
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.ellipse(cx0 - 0.9, ym, 1.8, 3.4, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCaveScene(ctx) {
    const { W, H } = this.g;
    const t = this.t;
    const Cv = this.cave;
    const S = Math.min(H * 0.13, W * 0.14);
    const ground = H * 0.8;
    // cave interior, lit warmly from the waterfall opening
    const g = ctx.createRadialGradient(W * 0.85, H * 0.5, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    g.addColorStop(0, '#6a5438');
    g.addColorStop(0.45, '#2e2216');
    g.addColorStop(1, '#0a0705');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the falls seen through the mouth
    const mx = W * 0.9;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, H * 0.48, W * 0.16, H * 0.36, 0, 0, TAU);
    ctx.clip();
    const wg = ctx.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, '#f0fcff');
    wg.addColorStop(1, '#b8e6f2');
    ctx.fillStyle = wg;
    ctx.fillRect(mx - W * 0.2, 0, W * 0.4, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 36; i++) {
      const x = mx - W * 0.16 + (i / 36) * W * 0.32;
      const y = ((t * 700 + i * 97) % (H + 90)) - 90;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 70);
      ctx.stroke();
    }
    ctx.restore();
    // stalactites + ground
    ctx.fillStyle = '#1a120b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= 18; i++) {
      const x = (i / 18) * W;
      ctx.lineTo(x, i % 2 ? H * (0.1 + ((i * 37) % 9) / 60) : H * 0.03);
    }
    ctx.lineTo(W, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, ground);
    for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W * 0.86, ground + Math.sin(i * 1.7) * 6);
    ctx.lineTo(W * 0.86, H);
    ctx.fill();
    // glowing crystals
    for (let i = 0; i < 9; i++) {
      const x = W * (0.05 + i * 0.09);
      const y = ground - 4 - (i % 3) * 3;
      ctx.fillStyle = ['rgba(120,255,220,0.8)', 'rgba(255,140,240,0.8)', 'rgba(140,180,255,0.8)'][i % 3];
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x, y - 16 - (i % 4) * 5);
      ctx.lineTo(x + 5, y);
      ctx.fill();
    }
    // Annie's sign
    // (on a tall phone the sign hangs high and wide so the goose doesn't cover it)
    const portrait = H > W * 1.15;
    const sx = portrait ? W * 0.5 : W * 0.42;
    const bw = portrait ? W * 0.84 : Math.min(W * 0.4, 380);
    const bh = portrait ? Math.min(H * 0.19, bw * 0.48) : Math.min(H * 0.24, 170);
    const by = portrait ? H * 0.2 + 30 : ground - bh - S * 0.9;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(sx - 7, by + bh - 4, 14, ground - by - bh + 4);
    ctx.fillStyle = '#c99a5a';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 4;
    roundRect(ctx, sx - bw / 2, by, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,55,25,0.4)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(sx - bw / 2 + 8, by + (k * bh) / 4);
      ctx.lineTo(sx + bw / 2 - 8, by + (k * bh) / 4 + 2);
      ctx.stroke();
    }
    const fs = Math.min(bw / 12, bh / 4.6);
    bigText(ctx, 'Well done', sx, by + bh * 0.24, fs, '#3a1e08', 'rgba(255,240,210,0.6)', 'center', 3);
    bigText(ctx, 'young grasshopper!', sx, by + bh * 0.5, fs, '#3a1e08', 'rgba(255,240,210,0.6)', 'center', 3);
    bigText(ctx, '- Annie', sx + bw * 0.18, by + bh * 0.78, fs * 0.9, '#6a1e2e', 'rgba(255,240,210,0.6)', 'center', 3);
    // the goose and rider
    const gx0 = Math.max(W * 0.16, S * 1.9);
    let gx = gx0;
    if (Cv.exit) gx = gx0 + Math.min(1, Cv.exitT / 1.0) * (W * 0.66 - gx0);
    ctx.save();
    ctx.translate(gx, ground - S * 0.55);
    ctx.scale(S, S);
    drawGooseSide(ctx, 2.2 / S, t, Cv.slipped ? 1 : 0);
    ctx.restore();
    const lwPx = Math.max(1.6, 150 / S);
    if (!Cv.slipped) {
      ctx.save();
      ctx.translate(gx - S * 0.1, ground - S * 0.95 + (Cv.exit ? Math.abs(Math.sin(Cv.exitT * 12)) * -4 : 0));
      ctx.translate(0, (80 * S * 0.9) / 100);
      drawUpright(ctx, this.ch, S * 0.9, { pose: Cv.exit ? 'hold' : 'cheer', expr: 'happy', t, cutY: -80, lw: lwPx });
      ctx.restore();
    } else {
      const k = Math.min(1, (Cv.exitT - 1.0) / 0.85);
      ctx.save();
      ctx.translate(lerp(W * 0.66, W * 0.98, k), ground - S * 1.2 - Math.sin(k * Math.PI) * S * 1.6);
      ctx.rotate(k * 7);
      drawUpright(ctx, this.ch, S * 0.9, { pose: 'flail', expr: 'scream', t, lw: lwPx });
      ctx.restore();
    }
    // the banana peel, right at the exit. Of course.
    if (!Cv.slipped) {
      const px = W * 0.7;
      ctx.fillStyle = '#ffd84d';
      ctx.strokeStyle = '#6a5010';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(px, ground - 4);
        ctx.rotate(-0.9 + i * 0.9);
        ctx.beginPath();
        ctx.ellipse(10, 0, 13, 5, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    bigText(ctx, 'SECRET CAVE FOUND!', W / 2, H * 0.12, Math.min(40, W * 0.08), '#ffd23b');
    if (Cv.bonus) bigText(ctx, '+25 LUMENS', W / 2, H * 0.12 + 40, Math.min(24, W * 0.05), '#fff6b0');
    if (Cv.slipped) bigText(ctx, 'WHOOPS.', W / 2, H > W * 1.15 ? H * 0.6 : H * 0.35, Math.min(60, W * 0.12), '#ff5a5a');
    else if (Cv.t > 2 && !Cv.exit) bigText(ctx, this.g.showTouch ? 'tap to leave the cave' : 'press space to leave the cave', W / 2, H - 30, 16, `rgba(255,255,255,${0.5 + Math.sin(t * 4) * 0.3})`);
  }

  // skewer the body on the spike's tip
  impale() {
    const rock = this.killRock;
    if (!rock || rock.type !== 'spike') return;
    const rag = this.rider;
    const core = rag.kind === 'giraffe' ? rag.P.shoulders : rag.P.chest;
    const pin = this.phys.point(rock.tip.x, rock.tip.y + 0.15, { mass: 0 });
    const pin2 = this.phys.point(rock.tip.x, rock.tip.y + 0.7, { mass: 0 });
    core.x = core.px = pin.x;
    core.y = core.py = pin.y;
    this.phys.stick(core, pin, { len: 0.01, kind: 'pin' });
    this.phys.stick(corePoint(rag), pin2, { len: 0.25, stiff: 0.6, kind: 'pin' });
    for (let k = 0; k < 14; k++) rock.decals.push({ x: rock.tip.x - rock.x + rand(-0.15, 0.15), y: rock.tip.y - rock.y + rand(0.2, 1.8), r: rand(0.08, 0.2), a: rand(0, TAU), c: pick(goreOf(rag.goreStyle).decal), drip: rand(0.4, 1.4) });
    this.emitters.push({ p: core, from: { x: core.x, y: core.y - 1 }, t: 4, style: rag.goreStyle, phase: 0 });
    this.fx.text('IMPALED!', rock.tip.x, rock.tip.y - 1.5, '#ff3b3b', 40, 0, 2);
    audio.crack();
    audio.squish();
  }

  // flatten the body onto the slab
  pancake() {
    const rock = this.killRock;
    if (!rock || rock.type !== 'flat') return;
    const rag = this.rider;
    const cx = corePoint(rag).x;
    rag.pts.forEach((pt) => {
      pt.x = cx + (pt.x - cx) * 1.6;
      pt.y = rock.top - pt.r - 0.02;
      pt.px = pt.x;
      pt.py = pt.y;
    });
    for (let k = 0; k < 22; k++) rock.decals.push({ x: cx - rock.x + rand(-1.6, 1.6), y: rock.top - rock.y + rand(0.02, 0.12), r: rand(0.12, 0.32), a: rand(-0.2, 0.2), c: pick(goreOf(rag.goreStyle).decal), drip: Math.random() < 0.5 ? rand(0.2, 0.9) : 0 });
    this.fx.text('PANCAKED!', cx, rock.top - 2, '#ff3b3b', 40, 0, 2);
    audio.splat(2);
    audio.crack();
    setTimeout(() => audio.crack(), 120);
  }

  revealRider() {
    if (!this.hideRider) return;
    this.hideRider = false;
    const b = this.body;
    const dt = 1 / 120;
    const vx = (b.pts[0].x - b.pts[0].px) / dt;
    const vy = (b.pts[0].y - b.pts[0].py) / dt;
    poseRagdoll(this.rider, this.rider.kind === 'giraffe' ? 'sit' : 'crouch', b.cx - 0.2, b.cy - 0.1);
    this.rider.pts.forEach((p) => {
      p.im = p.im0 ?? 1;
      this.phys.setVel(p, vx * 0.6 + rand(-2, 2), vy * 0.3 - rand(2, 5), dt);
    });
  }

  smashVessel() {
    const id = this.craftId;
    if (this.ball && !this.ballPopped) {
      this.ballPopped = true;
      this.ball.sticks.forEach((s) => (s.broken = true));
      audio.pop();
      audio.shatter();
      this.fx.debris(this.ball.cx, this.ball.cy, '#cfefff', 16, 0.3, 0, 'shard');
      this.fx.text('POP!', this.ball.cx, this.ball.cy - 1.5, '#ffffff', 34, 0, 1.2);
      return;
    }
    if (!this.body || this.vesselBroken) return;
    if (id === 'goose') return;
    this.vesselBroken = true;
    const col = INST_DEBRIS[id] || { barrel: '#8a5a2b', kayak: '#ff4f2b', canoe: '#2e8b57', surfboard: '#ffe14d', jetski: '#e8203a' }[id] || '#888';
    this.fx.debris(this.body.cx, this.body.cy, col, 18, id === 'barrel' || id === 'drums' ? 0.35 : 0.28);
    if (this.craft.band) {
      // instruments die musically
      audio.instrument(id, 'hit');
      audio.shatter();
      this.fx.debris(this.body.cx, this.body.cy, id === 'drums' ? '#d8dde4' : '#1d1d24', 6, 0.2, 0, 'shard');
      this.fx.notes(this.body.cx, this.body.cy, 6);
    } else if (id === 'barrel') {
      audio.woodBreak();
      this.fx.debris(this.body.cx, this.body.cy, '#3d3d48', 4, 0.4);
    } else if (id === 'jetski') {
      audio.boom(0.8);
      this.fx.fire(this.body.cx, this.body.cy, 25);
      this.fx.smoke(this.body.cx, this.body.cy, 12);
    } else audio.woodBreak();
    this.body.sticks.forEach((s) => (s.broken = true));
  }

  processBreaks(dt) {
    for (let i = this.breakQueue.length - 1; i >= 0; i--) {
      const b = this.breakQueue[i];
      b.at -= dt;
      if (b.at > 0) continue;
      this.breakQueue.splice(i, 1);
      const s = breakBone(b.rag, b.name);
      if (!s) continue;
      audio.snap();
      if (Math.random() < 0.5) audio.squish();
      const style = b.rag.goreStyle;
      // fling the severed end
      const away = { x: s.b.x - s.a.x, y: s.b.y - s.a.y };
      const d = Math.hypot(away.x, away.y) || 1;
      this.phys.impulse(s.b, (away.x / d) * rand(4, 9) + rand(-3, 3), (away.y / d) * rand(3, 8) - rand(4, 9), 1 / 120);
      this.fx.blood(s.a.x, s.a.y, away.x, away.y, 0.9, style);
      this.emitters.push({ p: s.a, from: s.b, t: rand(2, 3.5), style, phase: rand(0, TAU) });
      this.emitters.push({ p: s.b, from: s.a, t: rand(1.5, 2.6), style, phase: rand(0, TAU) });
      if (b.name === HEAD_BONE[b.rag.kind]) this.fx.text(b.rag === this.gary ? 'GARY, NO!' : 'HEADS UP!', s.b.x, s.b.y - 1, '#ff5a5a', 26, 0, 1.4);
    }
  }

  updateEmitters(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.t -= dt;
      if (e.t <= 0) {
        this.emitters.splice(i, 1);
        continue;
      }
      // arterial spurts pulse with the (rapidly fading) heartbeat
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 9 + (e.phase || 0));
      const n = Math.random() < Math.min(1, e.t) * pulse ? 3 : pulse > 0.6 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const dx = e.p.x - e.from.x;
        const dy = e.p.y - e.from.y;
        const d = Math.hypot(dx, dy) || 1;
        const vx = (e.p.x - e.p.px) * 120;
        const vy = (e.p.y - e.p.py) * 120;
        if (e.p.y > POOL_Y) {
          if (Math.random() < 0.15) this.fx.cloud(e.p.x, e.p.y, goreOf(e.style).cloud, 0.8);
        } else {
          const sp = rand(3, 9) * Math.min(1, e.t) * (0.6 + pulse * 0.8);
          this.fx.add({ x: e.p.x, y: e.p.y, vx: vx * 0.5 + (dx / d) * sp + rand(-1, 1), vy: vy * 0.5 + (dy / d) * sp - rand(0, 2), life: rand(0.6, 1.2), size: rand(0.035, 0.08), color: pick(goreOf(e.style).drops), kind: e.style === 'rainbow' ? 'glitter' : 'blood', drag: 0.2, style: e.style });
        }
      }
    }
  }

  // ------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    this.stageT += dt;
    const inp = this.g.input;
    if (this.stage === 'cave') {
      this.updateCave(dt, inp);
      this.fx.update(dt);
      return;
    }
    const steps = Math.max(1, Math.round(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.preStep(h, inp);
      this.phys.step(h);
    }
    this.processBreaks(dt);
    this.updateEmitters(dt);
    this.updateStage(dt, inp);
    this.updateFavNotes(dt);
    if (this.sinkT > 0) this.sinkT -= dt;
    if (this.bloodRain > 0) {
      this.bloodRain -= dt;
      for (let i = 0; i < 4; i++) this.fx.add({ x: this.cam.x + rand(-8, 8), y: this.cam.y - 9, vx: rand(-1, 1), vy: rand(4, 8), life: 2, size: rand(0.05, 0.12), color: pick(goreOf(this.rider.goreStyle).drops), kind: 'blood', drag: 0.1, style: this.rider.goreStyle });
    }
    this.fx.update(dt);
    this.splat.update(dt);
    if (this.bonusLabel) this.bonusLabel.t -= dt;
    if (this.cheats.slowmo && this.stage === 'fall' && this.g.timeScale === 1) this.g.setTimeScale(0.4, 99);
    this.updateCamera(dt);
  }

  core() {
    if (this.hideRider && this.body) return { x: this.body.cx, y: this.body.cy };
    return corePoint(this.rider);
  }

  // a band member on their own instrument keeps playing all the way down
  updateFavNotes(dt) {
    if (!this.fav || this.vesselBroken || this.info.dead || this.info.ko || !this.body) return;
    if (this.stage !== 'approach' && this.stage !== 'fall') return;
    this.noteT = (this.noteT || 0) - dt;
    if (this.noteT > 0) return;
    this.noteT = rand(0.16, 0.3);
    this.fx.notes(this.body.cx, this.body.cy - 0.4, 1);
    if (Math.random() < 0.35) audio.instrument(this.craftId);
  }

  preStep(h, inp) {
    const c = this.core();
    const falling = this.stage === 'fall';
    // flailing limbs while airborne
    if ((falling || (this.stage === 'approach' && c.x > -1)) && !this.hideRider) {
      const flail = (this.cheats.noodle ? 3 : 1) * (this.info.ko ? 0.2 : 1);
      const R = this.rider.P;
      const limbs = this.rider.kind === 'giraffe' ? ['flf', 'frf', 'blf', 'brf', 'head'] : ['handL', 'handR', 'footL', 'footR'];
      if (Math.random() < 0.25) {
        const name = pick(limbs);
        if (R[name]) this.phys.impulse(R[name], rand(-5, 5) * flail, rand(-6, 4) * flail, h);
      }
      if (this.gary && Math.random() < 0.15) this.phys.impulse(this.gary.P[pick(['handL', 'handR', 'footL', 'footR'])], rand(-6, 6), rand(-7, 3), h);
    }
    // kayak tilt control
    if (this.dropMode === 'boof' && falling && this.body && !this.outcome) {
      const ax = inp.axisX();
      const torque = (ax * 26 + Math.sin(this.t * 2.3) * 7) * h * h;
      const a = this.body.angle;
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      // bow = pts 1,2 ; stern = pts 0,3
      [1, 2].forEach((i) => {
        this.body.pts[i].x += nx * torque;
        this.body.pts[i].y += ny * torque;
      });
      [0, 3].forEach((i) => {
        this.body.pts[i].x -= nx * torque;
        this.body.pts[i].y -= ny * torque;
      });
    }
    // hamster ball: rock your weight to roll toward the deep water
    if (this.dropMode === 'aim' && falling && this.ball && !this.mini.done && !this.ballPopped) {
      const ax = inp.axisX();
      [this.ball.hub, ...this.ball.rim, ...this.rider.pts].forEach((p) => (p.ax += ax * 13));
    }
    // surfing the face of the falls (kinematic board)
    const S = this.mini.surf;
    if (S && S.riding && this.body) {
      S.tau += h;
      const tau = S.tau;
      const x = art.WATER_V * tau + 0.15;
      const y = 11 * tau * tau - 0.15;
      const ang = Math.atan2(22 * tau, art.WATER_V);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const hw = this.body.w / 2;
      const hh = this.body.h / 2;
      const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      this.body.pts.forEach((p, i) => {
        const [lx, ly] = corners[i];
        const nx = x + lx * ca - ly * sa;
        const ny = y + lx * sa + ly * ca;
        p.px = p.x;
        p.py = p.y;
        p.x = nx;
        p.y = ny;
      });
      // lean the surfer with the balance needle
      const R = this.rider.P;
      const chest = R.chest || R.shoulders;
      if (chest) this.phys.impulse(chest, S.b * 3, 0, h);
      if (y > POOL_Y - 0.6) this.endSurf(false);
    }
    // parachute drag
    const C = this.mini.chute;
    if (C && C.deployed && C.canopy) {
      C.open = Math.min(1, C.open + h * 2.2);
      const p = C.canopy;
      const vx = (p.x - p.px) / h;
      const vy = (p.y - p.py) / h;
      const sp = Math.hypot(vx, vy);
      const k = (C.torn ? 0.05 : C.snagged ? 0.08 : 1) * C.open * 0.9;
      if (sp > 0.01) {
        const drag = Math.min(sp, k * sp * sp * 0.06) / sp;
        p.ax -= vx * drag * 60;
        p.ay -= vy * drag * 60;
      }
      p.ay -= this.phys.gravity * 0.5 * C.open * (C.torn ? 0.1 : 1);
    }
    // golden goose glides (and always stays upright, it is a professional)
    if (this.craftId === 'goose' && this.body) {
      if (this.forced === 'banana') {
        // the goose bails: flaps up and away, honking, while you fall
        this.body.pts.forEach((p) => {
          p.ay -= this.phys.gravity * 1.25;
          p.ax += 9;
        });
        this.gooseFlap = true;
      } else if (falling || this.stage === 'after') {
        const by = this.body.cy;
        const bx = this.body.cx;
        let ax = inp.axisX();
        const flap = inp.isDown('primary') || inp.axisY() < -0.3;
        const dive = inp.axisY() > 0.3;
        // the goose gets tired after a while, so every flight comes down eventually
        this.gooseTired = this.stage === 'fall' && this.stageT > 8;
        let lift = this.stage === 'after' ? 0 : flap ? 1.0 : dive ? 0.25 : 0.55;
        let maxVy = flap ? 3 : dive ? 14 : 7.5;
        if (this.gooseTired) {
          lift = Math.min(lift, 0.45);
          maxVy = Math.max(maxVy, 9);
        }
        // no flying back up over the lip and upstream
        if (by < 4) lift = Math.min(lift, lerp(0.2, lift, clamp((by - 1.5) / 2.5, 0, 1)));
        if (by < 3 && bx < 1.5) ax = Math.max(ax, 0.6);
        const pts = [...this.body.pts, ...this.rider.pts];
        pts.forEach((p) => {
          p.ay -= this.phys.gravity * lift;
          p.ax += ax * 10 + (this.stage === 'fall' ? 1.2 : 0);
          const vy = (p.y - p.py) / h;
          if (vy > maxVy) p.py = p.y - maxVy * h;
          if (by < 3 && vy < 0) p.py = p.y - vy * 0.9 * h; // damp any climb near the top
        });
        this.gooseFlap = flap && !this.gooseTired;
        if (flap && Math.random() < 0.02) audio.whoosh(0.25);
      }
      this.stabilize(this.body, 0.05, 6, h);
    } else if (this.body && this.stage === 'approach' && !this.vesselBroken) {
      // keep top-heavy boats from capsizing on the run-up to the lip
      this.stabilize(this.body, 0, 5, h);
    }
  }

  // rotate a box body toward a target angle (kills tumbling)
  stabilize(body, target, k, h) {
    let da = target - body.angle;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const rot = da * Math.min(1, k * h);
    const cx = body.cx;
    const cy = body.cy;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    body.pts.forEach((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const pdx = p.px - cx;
      const pdy = p.py - cy;
      p.x = cx + dx * c - dy * sn;
      p.y = cy + dx * sn + dy * c;
      p.px = cx + pdx * c - pdy * sn;
      p.py = cy + pdx * sn + pdy * c;
    });
  }

  updateStage(dt, inp) {
    const c = this.core();
    const mode = this.dropMode;
    if (this.stage === 'approach') {
      this.rider.expr = this.info.ko ? 'ko' : 'terrified';
      if (this.stageT > 6) this.flowV += dt * 6; // never get stuck before the lip
      if (c.x > 0.2) {
        // a rider who is out cold (or already dead) can't play the mini-game, and corpses don't scream
        const limp = this.info.ko || this.info.dead;
        this.stage = 'fall';
        this.stageT = 0;
        this.rider.expr = limp ? 'ko' : 'scream';
        if (!this.info.dead) audio.scream(this.ch.voice || 1, 1.8);
        audio.whoosh(1.5);
        if (this.gary) setTimeout(() => audio.scream(0.9, 1.4), 200);
        if (this.cheats.slowmo) this.g.setTimeScale(0.4, 99);
        if (mode === 'surf' && this.body && !limp) {
          this.mini.surf = { riding: true, tau: 0.05, b: 0, vb: 0, inZone: 0, total: 0, wiped: false };
          this.body.pts.forEach((p) => (p.im = 0));
          this.g.setTimeScale(0.6, 2.4);
        }
        if (mode === 'chute' && !limp) this.mini.chute = { deployed: false, open: 0, canopy: null, torn: false, snagged: false, zone: null };

      }
      return;
    }
    if (this.stage === 'fall') {
      // ring mini-games
      const ringMode = RING_LABEL[mode] ? mode : null;
      if (ringMode && !this.mini.ringDone && !this.info.ko) {
        const startY = mode === 'boof' ? 14 : 7;
        if (!this.mini.ring && c.y > startY) {
          const g = this.phys.gravity;
          const tNow = Math.sqrt((2 * Math.max(0, c.y)) / g);
          const tTarget = Math.sqrt((2 * (mode === 'boof' ? 38 : 30)) / g);
          this.mini.ring = { t: 0, dur: clamp(tTarget - tNow, 0.55, 1.0), label: this.dropText.ring || RING_LABEL[mode] };
          this.g.setTimeScale(0.45, 6);
        }
        const R = this.mini.ring;
        if (R) {
          R.t += dt;
          if (inp.pressed('primary')) this.resolveRing(R.t / R.dur);
          else if (R.t > R.dur * 1.3) this.resolveRing(9);
        }
      }
      if (MINI_MODES.includes(mode) && !this.info.ko && !this.outcome) this.updateMinis(dt, inp, c, mode);
      if (this.craftId === 'goose' && this.body && !this.flags.cave && !this.forced && !this.info.ko) {
        const bx = this.body.cx;
        const by = this.body.cy;
        if (by > CAVE_Y0 - 0.6 && by < CAVE_Y1 + 0.4 && bx < cliffX(by) + 1.7) this.enterCave();
      }
      if (mode === 'boof' && this.body && !this.outcome) {
        let a = this.body.angle;
        if (a > Math.PI) a -= TAU;
        const deg = (a * 180) / Math.PI;
        this.mini.kayakTotal += dt;
        if (deg > 20 && deg < 65) this.mini.kayakZone += dt;
        this.mini.kayakDeg = deg;
      }
      // surf balance
      const S = this.mini.surf;
      if (S && S.riding) {
        const ax = inp.axisX();
        const chaos = 1.2 + S.tau * 2.4;
        S.vb += (Math.sin(this.t * 3.7) * 0.8 + Math.sin(this.t * 7.1 + 1) * 0.6 + (Math.random() - 0.5) * 2) * chaos * dt;
        S.vb += S.b * 1.5 * dt; // unstable equilibrium
        S.vb += ax * 3.6 * dt;
        S.vb *= Math.exp(-1.2 * dt);
        S.b += S.vb * dt;
        S.total += dt;
        if (Math.abs(S.b) < 0.33) S.inZone += dt;
        if (Math.abs(S.b) > 1) this.endSurf(true);
      }
      // parachute deploy
      const C = this.mini.chute;
      if (C && !C.deployed && !this.info.ko && inp.pressed('primary')) this.deployChute();
      // decision
      let ready = false;
      if (mode === 'glide') ready = true;
      else if (mode === 'surf') ready = (S && !S.riding && this.stageT > 0.3) || c.y > 40;
      else if (mode === 'chute') ready = (C && C.deployed && C.decideAt !== undefined && this.t > C.decideAt) || c.y > 38;
      else if (ringMode || MINI_MODES.includes(mode)) ready = ((this.mini.ringDone || this.mini.done) && c.y > DECIDE_Y - 6) || c.y > DECIDE_Y + 4 || this.info.ko;
      else ready = c.y > DECIDE_Y;
      if (ready && !this.outcome) {
        if (mode === 'boof' && !this.info.dead && !this.info.ko) {
          const frac = this.mini.kayakTotal > 0 ? this.mini.kayakZone / this.mini.kayakTotal : 0;
          this.addBonus(frac * 0.15, frac > 0.6 ? 'NICE LINE' : 'SKETCHY LINE', Math.round(frac * 5));
        }
        if (mode === 'chute' && C && !C.deployed) this.addBonus(-0.1, 'NO CHUTE?!', 0);
        if (mode === 'pencil' && this.info.ko) this.bonusLabel = { text: 'UNCONSCIOUS', color: '#ff5a5a', t: 2 };
        this.decide();
      }
      if (this.mini.chute && this.mini.chute.deployed && this.core().y > POOL_Y + 2) this.onImpact('water', this.core(), 10);
      // safety: if something weird happens, force impact
      if (c.y > POOL_Y + 3 && this.stage === 'fall') this.onImpact('water', c, 10);
      if (this.stageT > 14) this.onImpact('water', { x: Math.max(c.x, cliffX(POOL_Y) + 2), y: POOL_Y }, 10);
      return;
    }
    if (this.stage === 'after') {
      const O = this.outcome;
      if (O.survived && this.submerged && this.stageT > 1.15 && !this.survivor) {
        this.survivor = { x: this.impact.x + 0.5, t: 0 };
        this.rider.hidden = true;
        if (this.gary) this.gary.hidden = true;
        if ((this.body || this.ball) && this.craftId !== 'goose') this.vesselFloat = { id: this.craftId, x: this.impact.x + 2.2 };
        audio.splash(0.6);
        if (!clips.play('survive')) audio.yay(this.ch.voice || 1);
        audio.fanfare();
        if (this.craft.band && !this.info.wrecked) {
          audio.instrument(this.craftId, 'riff');
          this.fx.notes(this.impact.x, POOL_Y - 1.5, this.fav ? 14 : 5);
        }
        audio.cheer(3);
        this.fx.confetti(this.impact.x, POOL_Y - 2, 80);
        this.boatTarget = this.impact.x + 10;
      }
      if (O.survived && this.craftId === 'goose' && !this.flags.gooseCheer && this.stageT > 0.4) {
        this.flags.gooseCheer = true;
        audio.honk();
        clips.play('survive', { delay: 0.5 });
        audio.fanfare();
        audio.cheer(3);
        this.fx.confetti(this.impact.x, POOL_Y - 2, 80);
        this.fx.feathers(this.impact.x, POOL_Y - 1, 10);
        this.rider.expr = 'cool';
        this.boatTarget = this.impact.x + 10;
      }
      if (this.submerged && !this.survivor) {
        this.rider.alpha = Math.max(0, 1 - this.stageT * 1.5);
        if (this.body) this.bodyAlpha = this.rider.alpha;
      }
      if (this.survivor) this.survivor.t += dt;
      if (this.ghost) this.ghost.t += dt;
      if (!O.survived && !this.flags.sad && this.stageT > 0.9) {
        this.flags.sad = true;
        audio.sadTrombone();
        if (O.cause !== 'drown') audio.gasp();
      }
      if (this.boatTarget !== undefined) this.boatX = approach(this.boatX, this.boatTarget, 0.8, dt);
      if (this.forced === 'banana' && !this.sideBear && this.stageT > 1.4) {
        this.sideBear = { x: corePoint(this.rider).x + 0.3, rise: 0, mouth: 0, t: 0, ate: false };
        audio.roar();

      }
      if (this.sideBear) {
        const B = this.sideBear;
        B.t += dt;
        B.rise = Math.min(1, B.t / 0.8);
        B.mouth = B.t < 0.85 ? B.t / 0.85 : B.ate ? Math.abs(Math.sin(B.t * 9)) * 0.5 : 1;
        if (B.t > 0.9 && !B.ate) {
          B.ate = true;
          audio.chomp();
          audio.squish();
          this.g.shake(1.4);
          const st = this.rider.goreStyle;
          this.fx.blood(B.x, POOL_Y - 2.5, 0, -1, 2.4, st);
          this.fx.gibs(B.x, POOL_Y - 2.5, 1.3, st);
          this.fx.guts(B.x, POOL_Y - 2.5, 3, st);
          this.splat.add(5, st, 1.2);
          this.rider.hidden = true;
          this.emitters = [];
          this.fx.text('CHOMP.', B.x, POOL_Y - 6, '#ffffff', 38, 0, 1.6);
        }
        if (B.t > 2.6 && !B.burp) {
          B.burp = true;
          audio.burp();
          this.fx.text('*BURP*', B.x, POOL_Y - 5.5, '#ffd23b', 28, 0, 1.4);
        }
      }
      const doneAt = O.survived ? 4.2 : this.forced === 'banana' ? 6.4 : 3.6;
      // (the banana-cave bear gets to finish its meal before you can skip)
      const skip = this.stageT > (this.forced === 'banana' ? 3.1 : 1.6) && (inp.pressed('primary') || inp.tapped);
      if ((this.stageT > doneAt || skip) && !this.flags.finished) {
        this.flags.finished = true;
        this.finish();
      }
    }
  }

  // ---- per-vessel drop mini-games
  updateMinis(dt, inp, c, mode) {
    const M = this.mini;
    if (M.done) return;
    if (mode === 'inflate') {
      // Life jacket: hold to inflate, let go in the green, don't pop it
      if (!M.inf) {
        if (this.stageT < 0.25) return;
        M.inf = { m: 0, started: false };
        this.g.setTimeScale(0.5, 6);
      }
      const I = M.inf;
      const T = this.dropText;
      const horn = this.craftId === 'trumpet';
      if (inp.isDown('primary')) {
        I.started = true;
        I.m += dt * 0.62;
        if (horn) {
          if (Math.random() < 0.18) audio.tone({ type: 'sawtooth', f: 330 + I.m * 660, dur: 0.12, gain: 0.05, filter: { f: 1400 + I.m * 1600 } });
          if (Math.random() < 0.25) this.fx.notes(this.body ? this.body.cx - 0.9 : c.x, this.body ? this.body.cy : c.y, 1);
        } else if (Math.random() < 0.35) audio.tone({ type: 'sine', f: 260 + I.m * 520, dur: 0.05, gain: 0.05 });
      }
      if (!horn) this.rider.opts.inflate = I.m;
      if (I.m > 1.0) {
        if (horn) audio.instrument('trumpet', 'hit');
        else {
          audio.pop();
          this.fx.debris(c.x, c.y, '#ff7a1a', 10, 0.15, 0, 'shard');
          this.rider.opts.inflate = 0;
          this.rider.opts.lifejacket = false;
        }
        this.finishMini(-0.08, T.pop || 'POPPED IT!', 0);
      } else if (I.started && (!inp.isDown('primary') || c.y > DECIDE_Y - 2)) {
        audio.whoosh(0.3);
        if (I.m >= 0.65 && I.m <= 0.9) this.finishMini(0.18, T.perfect || 'PERFECTLY PUFFED!', 5);
        else if (I.m >= 0.45) this.finishMini(0.09, T.good || 'PUFFY ENOUGH', 3);
        else this.finishMini(0.02, T.weak || 'BARELY INFLATED', 1);
      } else if (c.y > DECIDE_Y - 2) this.finishMini(-0.05, T.none || 'FORGOT TO INFLATE', 0);
    } else if (mode === 'mash') {
      // Barrel: mash to stuff it full of pillows before impact
      if (!M.mash) {
        if (this.stageT < 0.25) return;
        M.mash = { n: 0, t: 0, dur: 1.5 };
        this.g.setTimeScale(0.5, 6);
      }
      const B = M.mash;
      const T = this.dropText;
      const kit = this.craftId === 'drums';
      B.t += dt;
      if (inp.pressed('primary')) {
        B.n++;
        if (kit) {
          audio.instrument('drums');
          this.fx.notes(c.x, c.y, 1);
        } else {
          audio.squish();
          this.fx.feathers(c.x, c.y, 3, ['#ffffff', '#f2f2f8', '#e8e8f0'], 0.45);
        }
        if (B.n % 4 === 0) this.fx.text((T.words || ['FLUFF!', 'PILLOW!', 'CUSHION!', 'DUVET!'])[(B.n / 4) % 4], c.x + rand(-1, 1), c.y - 1, '#fff', 18, 0, 0.7);
      }
      if (B.t >= B.dur || c.y > DECIDE_Y - 2) {
        if (kit && B.n >= 8) audio.instrument('drums', 'riff');
        this.finishMini(Math.min(0.2, B.n * 0.0125), B.n >= 16 ? T.perfect || 'FULLY PADDED!' : B.n >= 8 ? T.good || 'SOME PILLOWS' : T.weak || 'ONE SAD PILLOW', Math.min(5, Math.floor(B.n / 3)));
      }
    } else if (mode === 'rhythm') {
      // Canoe: air-paddle left / right in time with Gary
      if (!M.rh) {
        if (this.stageT < 0.25) return;
        M.rh = { t: 0, beats: [0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.45 + i * 0.32, dir: i % 2 ? 'right' : 'left', res: null })), i: 0, hits: 0 };
        this.g.setTimeScale(0.5, 6);
      }
      const R = M.rh;
      R.t += dt;
      const b = R.beats[R.i];
      if (b) {
        const pl = inp.pressed('left');
        const pr = inp.pressed('right');
        if (pl || pr) {
          const dir = pl ? 'left' : 'right';
          if (dir === b.dir && Math.abs(R.t - b.at) < 0.22) {
            b.res = 'hit';
            R.hits++;
            if (this.craftId === 'bass') {
              audio.instrument('bass');
              this.fx.notes(c.x + (dir === 'left' ? -0.8 : 0.8), c.y, 2);
            } else {
              audio.paddle();
              this.fx.splash(c.x + (dir === 'left' ? -1.2 : 1.2), c.y, 0.25);
            }
          } else {
            b.res = 'miss';
            audio.denied();
            if (this.gary) this.fx.text('GARY: "OTHER SIDE!"', c.x + 1, c.y - 1.5, '#9ef', 16, 0, 1);
          }
          R.i++;
        } else if (R.t > b.at + 0.22) {
          b.res = 'miss';
          R.i++;
        }
      }
      if (R.i >= R.beats.length || c.y > DECIDE_Y - 2) {
        const frac = R.hits / R.beats.length;
        const T = this.dropText;
        this.finishMini(frac * 0.2 - (frac < 0.3 ? 0.05 : 0), frac > 0.8 ? T.perfect || 'IN SYNC WITH GARY!' : frac > 0.4 ? T.good || 'GARY IS CONFUSED' : T.weak || 'TOTAL CHAOS', Math.round(frac * 5));
      }
    } else if (mode === 'aim') {
      // Hamster ball: roll your landing into the deep-water zone
      if (!M.aim) {
        if (this.stageT < 0.15) return;
        const land = this.predictLanding().x;
        M.aim = { zx: land + (Math.random() < 0.5 ? -1 : 1) * rand(3, 6), w: 3.2, land };
      }
      M.aim.land = this.predictLanding().x;
      if (c.y > DECIDE_Y - 1) {
        const d = Math.abs(M.aim.land - M.aim.zx);
        if (d < M.aim.w / 2) this.finishMini(0.18, 'BULLSEYE! DEEP WATER', 5);
        else if (d < M.aim.w / 2 + 2) this.finishMini(0.08, 'CLOSE ENOUGH', 2);
        else this.finishMini(-0.05, 'MISSED THE DEEP END', 0);
      }
    }
  }

  finishMini(b, label, lumens) {
    this.mini.done = true;
    this.mini.ringDone = true;
    this.addBonus(b, label, lumens);
    this.g.setTimeScale(1, 0);
    if (b > 0.08) audio.pickup(1.4);
    else if (b < 0) audio.denied();
  }

  resolveRing(k) {
    const R = this.mini.ring;
    if (!R || this.mini.ringDone) return;
    const off = Math.abs(1 - k);
    const res = off < 0.08 ? 'perfect' : off < 0.17 ? 'good' : off < 0.3 ? 'ok' : 'miss';
    this.mini.ringDone = true;
    this.mini.ringResult = res;
    this.mini.ring = null;
    this.g.setTimeScale(1, 0);
    if (this.cheats.slowmo) this.g.setTimeScale(0.4, 99);
    const labels = { perfect: 'PERFECT!', good: 'GOOD!', ok: 'OK...', miss: k > 1 ? 'TOO LATE!' : 'TOO EARLY!' };
    const lum = { perfect: 5, good: 3, ok: 1, miss: 0 }[res];
    this.addBonus(RING_BONUS[res], labels[res], lum);
    if (res === 'perfect' || res === 'good') {
      audio.pickup(res === 'perfect' ? 1.5 : 1.2);
      if (this.dropMode === 'micdrop') {
        this.attachSticks.forEach((s) => (s.broken = true));
        audio.instrument('mic', 'riff');
        const c = this.core();
        this.fx.text('*MIC DROP*', c.x, c.y - 1.6, '#ffd23b', 30, 0, 1.6);
        if (this.body) this.fx.notes(this.body.cx, this.body.cy, 6);
      }
      this.applyPose();
      if (this.dropMode === 'boof') audio.slideUp();
    } else audio.denied();
  }

  addBonus(b, label, lumens = 0) {
    this.bonus += b;
    this.skillLumens += lumens;
    const pct = Math.round(b * 100);
    this.bonusLabel = { text: `${label} ${pct >= 0 ? '+' : ''}${pct}%`, color: b > 0 ? '#5dff8a' : b < 0 ? '#ff5a5a' : '#fff', t: 2.2 };
  }

  applyPose() {
    const R = this.rider;
    if (R.kind !== 'human' || this.hideRider) return;
    const P = R.P;
    const s = R.s;
    const mode = this.dropMode;
    const ph = this.phys;
    if (mode === 'pencil' || mode === 'micdrop') {
      ph.stick(P.footL, P.footR, { len: 0.12 * s, stiff: 0.5, kind: 'pose' });
      ph.stick(P.footL, P.head, { len: 1.5 * s, stiff: 0.3, kind: 'pose' });
      ph.stick(P.handL, P.pelvis, { len: 0.2 * s, stiff: 0.4, kind: 'pose' });
      ph.stick(P.handR, P.pelvis, { len: 0.2 * s, stiff: 0.4, kind: 'pose' });
    }
  }

  endSurf(wipeout) {
    const S = this.mini.surf;
    if (!S || !S.riding) return;
    S.riding = false;
    this.body.pts.forEach((p) => (p.im = 1 / 0.75));
    const frac = S.total > 0 ? S.inZone / S.total : 0;
    if (wipeout) {
      S.wiped = true;
      this.attachSticks.forEach((s) => (s.broken = true));
      this.addBonus(Math.min(0, frac * 0.3 - 0.1) - 0.05, 'WIPEOUT!', 0);
      audio.whoa(this.ch.voice || 1);
      this.fx.text('WIPEOUT!', this.core().x, this.core().y - 1.5, '#ff5a5a', 30, 0, 1.4);
    } else {
      this.addBonus(frac * 0.3, frac > 0.6 ? 'RODE THE FALLS!' : 'SURFED (SORTA)', Math.round(frac * 8));
      audio.slideUp();
    }
    this.g.setTimeScale(1, 0);
  }

  deployChute() {
    const C = this.mini.chute;
    const R = this.rider;
    const c = corePoint(R);
    C.deployed = true;
    C.deployY = c.y;
    audio.chute();
    this.attachSticks.forEach((s) => (s.broken = true));
    const handA = R.P.handL || R.P.head;
    const handB = R.P.handR || R.P.n2 || R.P.head;
    const top = R.P.head;
    const canopy = this.phys.point(top.x, top.y - 2.3, { mass: 0.6, r: 0.1, drag: 0.02 });
    this.phys.setVel(canopy, (c.x - c.px) * 120, (c.y - c.py) * 120, 1 / 120);
    this.phys.stick(canopy, handA, { len: 2.2, stiff: 0.8, kind: 'line' });
    this.phys.stick(canopy, handB, { len: 2.2, stiff: 0.8, kind: 'line' });
    C.canopy = canopy;
    const y = c.y;
    if (y < 3) {
      C.snagged = true;
      C.torn = true;
      this.addBonus(-0.15, 'SNAGGED BY THE FALLS!', 0);
      audio.whoosh(0.8);
    } else if (y >= 8 && y < 16) this.addBonus(0.35, 'PERFECT DEPLOY!', 6);
    else if (y < 28) this.addBonus(0.15, 'GOOD DEPLOY', 3);
    else this.addBonus(0.03, 'BARELY OPENED', 1);
    C.decideAt = this.t + 0.6;
    this.rider.expr = C.snagged ? 'terrified' : 'happy';
  }

  finish() {
    const O = this.outcome;
    const info = this.info;
    const limbs = this.rider.broken + (this.gary ? this.gary.broken : 0);
    const gore = O.survived ? 0 : Math.min(30, limbs * 2 + (this.rider.decapitated ? 3 : 0));
    const breakdown = [
      ['Brave attempt', 3],
      ['River lumens', info.lumens],
      ['Made it to the edge', 8],
    ];
    if (this.skillLumens) breakdown.push(['Skill bonus', this.skillLumens]);
    if (O.survived) breakdown.push(['SURVIVAL BONUS', 10 + 4 * this.craft.tier]);
    if (gore) breakdown.push(['Gore bonus', gore]);
    if (this.flags.cave) breakdown.push(['SECRET CAVE BONUS', 25]);
    if (this.fav) breakdown.push(['Played your favorite instrument', 5]);
    const total = breakdown.reduce((a, [, n]) => a + n, 0);
    this.g.finish({
      survived: O.survived,
      cause: this.forced || O.cause,
      odds: O.odds,
      roll: this.forced ? undefined : O.roll, // no dice were rolled for a corpse or a banana
      lane: info.lane,
      lumensBase: total,
      breakdown,
      limbs,
      decapitated: this.rider.decapitated,
      wrecked: info.wrecked,
      poop: (this.poop || this.forced === 'banana') && !O.survived && this.goreStyle !== 'cartoon',
    });
  }

  // ------------------------------------------------------------ camera
  updateCamera(dt) {
    const c = this.core();
    let tx = c.x + 1.5;
    let ty = c.y + 0.5;
    let metres = 7;
    if (this.stage === 'fall') {
      tx = c.x + 0.6;
      ty = c.y + 1.8;
      metres = 8.5;
      if (this.mini.chute && this.mini.chute.deployed) metres = 10;
    } else if (this.stage === 'after') {
      tx = this.impact.x + (this.survivor ? 1.6 : 0.4);
      ty = POOL_Y - 1.4;
      metres = 7.5;
      if (this.sideBear) {
        // frame the whole bear, even on a narrow phone
        tx = this.sideBear.x;
        ty = POOL_Y - 2.4;
        metres = 9;
      }
    }
    const S = this.baseScale(metres);
    this.cam.x = approach(this.cam.x, tx, this.sideBear ? 7 : this.stage === 'after' ? 3 : 6, dt);
    this.cam.y = approach(this.cam.y, ty, this.stage === 'after' ? 3 : 7, dt);
    this.cam.S = approach(this.cam.S, S, 2.5, dt);
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const { W, H } = this.g;
    const S = this.cam.S;
    const view = { ctx, W, H, S, camX: this.cam.x, camY: this.cam.y, t: this.t, disco: this.cheats.disco };
    art.drawSky(view);
    art.drawSkyline(view);
    art.drawFarFalls(view);
    art.drawRainbow(view);

    const lw = Math.max(1.6, S * 0.03) / S;
    const proj = (x, y) => ({ x: W / 2 + (x - this.cam.x) * S, y: H / 2 + (y - this.cam.y) * S, s: S });
    const world = () => {
      ctx.save();
      ctx.translate(W / 2 - this.cam.x * S, H / 2 - this.cam.y * S);
      ctx.scale(S, S);
    };
    world();
    const x0 = this.cam.x - W / S / 2 - 2;
    const x1 = this.cam.x + W / S / 2 + 2;
    art.drawUpstream(ctx, this.t, lw, this.cheats.disco);
    art.drawCliff(ctx, this.t, lw);
    this.drawCaveMouth(ctx, lw);
    art.drawSheet(ctx, this.t, lw, this.cheats.disco);
    art.drawPoolBack(ctx, this.t, x0, x1);
    art.drawBoat(ctx, this.boatX, this.t, lw, this.flags.survived || this.flags.gooseCheer);
    art.drawMistPuffs(ctx, this.t, this.cam.x, this.cam.y, this.stage === 'after' ? 0.9 : 0.6);
    art.drawRocks(ctx, this.rocks, lw);
    if (this.ch.id === 'kacey') this.drawAgentSide(ctx, lw);
    if (this.mini.aim && !this.outcome) {
      const A = this.mini.aim;
      ctx.fillStyle = 'rgba(40,230,120,0.32)';
      ctx.fillRect(A.zx - A.w / 2, POOL_Y - 0.25, A.w, 0.5);
      ctx.strokeStyle = '#2bff88';
      ctx.lineWidth = lw * 2;
      ctx.strokeRect(A.zx - A.w / 2, POOL_Y - 0.25, A.w, 0.5);
      ctx.fillStyle = '#ff3b5c';
      ctx.fillRect(A.zx - 0.04, POOL_Y - 1.4, 0.08, 1.2);
      ctx.beginPath();
      ctx.moveTo(A.zx + 0.04, POOL_Y - 1.4);
      ctx.lineTo(A.zx + 0.6, POOL_Y - 1.2);
      ctx.lineTo(A.zx + 0.04, POOL_Y - 1.0);
      ctx.fill();
    }
    ctx.restore();
    this.fx.render(ctx, proj, 'back');
    world();
    this.drawBodies(ctx, lw);
    ctx.restore();
    this.fx.render(ctx, proj, 'front');
    world();
    art.drawPoolFront(ctx, this.t, x0, x1, lw, this.cheats.disco);
    this.drawSurvivor(ctx, lw);
    ctx.restore();

    this.fx.renderTexts(ctx, proj);
    if (this.stage === 'cave') {
      this.drawCaveScene(ctx);
      return;
    }
    this.splat.render(ctx, W, H);
    if (this.ch.id === 'kacey') this.drawAgentBubble(ctx, proj);
    this.drawOverlay(ctx, proj);
  }

  drawBodies(ctx, lw) {
    const t = this.t;
    const id = this.craftId;
    // parachute behind the rider
    const C = this.mini.chute;
    if (C && C.canopy) {
      const cp = C.canopy;
      const R = this.rider.P;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = lw * 0.8;
      [R.handL || R.head, R.handR || R.head].forEach((hnd) => {
        ctx.beginPath();
        ctx.moveTo(cp.x - 1.1 * C.open, cp.y);
        ctx.lineTo(hnd.x, hnd.y);
        ctx.moveTo(cp.x + 1.1 * C.open, cp.y);
        ctx.lineTo(hnd.x, hnd.y);
        ctx.stroke();
      });
      drawParachute(ctx, cp.x, cp.y, lw, C.open * (C.snagged ? 0.5 : 1), t, C.torn);
    }
    // paddle
    if (this.paddle) {
      const { a, b } = this.paddle;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.08;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.05;
      ctx.stroke();
      [a, b].forEach((p) => {
        ctx.fillStyle = '#ffd23b';
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 0.18, 0.08, Math.atan2(b.y - a.y, b.x - a.x), 0, TAU);
        ctx.fill();
        ctx.stroke();
      });
    }
    const drawVessel = () => {
      if (!this.body || this.vesselBroken) return;
      if (this.submerged && this.bodyAlpha !== undefined && this.bodyAlpha <= 0) return;
      ctx.save();
      if (this.bodyAlpha !== undefined) ctx.globalAlpha = Math.max(0, this.bodyAlpha);
      ctx.translate(this.body.cx, this.body.cy);
      ctx.rotate(this.body.angle);
      drawCraftSide(ctx, id, lw, { t, flap: this.stage === 'fall' && id === 'goose' && this.gooseFlap ? 1 : 0 });
      if (this.mech === 'barrel' && this.hideRider) {
        // porthole with the rider's terrified face
        ctx.fillStyle = '#bfe9ff';
        ctx.strokeStyle = '#3d3d48';
        ctx.lineWidth = lw * 3;
        ctx.beginPath();
        ctx.arc(0, 0, 0.2, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, 0.19, 0, TAU);
        ctx.clip();
        ctx.rotate(-this.body.angle);
        drawHead(ctx, this.ch, 0.17, { expr: this.stage === 'approach' ? 'terrified' : 'scream', t, view: 'front', lw });
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(-0.07, -0.08, 0.06, 0.03, -0.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };
    const behind = ['kayak', 'canoe', 'jetski', 'goose', 'mic'].includes(this.mech);
    if (!behind) drawVessel();
    if (this.gary) drawRagdoll(ctx, this.gary, lw, t);
    if (!this.hideRider) drawRagdoll(ctx, this.rider, lw, t);
    if (behind) drawVessel();
    // hamster ball shell over the rider
    if (this.ball && !this.ballPopped && !this.survivor) {
      const B = this.ball;
      ctx.fillStyle = 'rgba(190,235,255,0.25)';
      ctx.strokeStyle = 'rgba(30,70,100,0.9)';
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      const n = B.rim.length;
      for (let i = 0; i <= n; i++) {
        const a = B.rim[i % n];
        const b = B.rim[(i + 1) % n];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.quadraticCurveTo(a.x, a.y, mx, my);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(B.cx - 0.35, B.cy - 0.45, 0.25, 0.1, -0.6, 0, TAU);
      ctx.fill();
    }
    // the bear that eats your remains
    if (this.sideBear) {
      const B = this.sideBear;
      ctx.save();
      ctx.translate(B.x, POOL_Y + 0.8 + (1 - B.rise) * 3.5);
      drawBear(ctx, 1, this.t, { mouth: B.mouth, scale: 2.3, bloody: B.ate ? 1 : 0, lw: (lw * 100) / 2.3, gore: this.rider.goreStyle === 'poop' ? 'poop' : 'blood' });
      ctx.restore();
    }
    // cartoon ghost
    if (this.ghost && this.ghost.t > 0.8) {
      const k = this.ghost.t - 0.8;
      const c = corePoint(this.rider);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.75 - k * 0.15);
      ctx.translate(c.x + Math.sin(k * 3) * 0.3, Math.min(c.y, POOL_Y) - 1 - k * 1.6);
      drawUpright(ctx, this.ch, 1, { pose: 'cheer', expr: 'happy', t: this.t, lw: lw * 100 });
      ctx.strokeStyle = '#ffd23b';
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.ellipse(0, (this.ch.kind === 'giraffe' ? -2.9 : -1.95) * (this.ch.scale || 1), 0.25, 0.08, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSurvivor(ctx, lw) {
    if (!this.survivor) return;
    const s = this.survivor;
    const pop = easeOutBack(Math.min(1, s.t * 2.2));
    const bob = Math.sin(this.t * 2.5) * 0.08;
    if (this.vesselFloat) {
      const v = this.vesselFloat;
      ctx.save();
      ctx.translate(v.x, POOL_Y - 0.1 + bob * 0.6);
      ctx.rotate(Math.sin(this.t * 1.7) * 0.08);
      if (v.id === 'hamster' && !this.ballPopped) {
        ctx.fillStyle = 'rgba(190,235,255,0.35)';
        ctx.strokeStyle = 'rgba(30,70,100,0.9)';
        ctx.lineWidth = lw * 1.5;
        ctx.beginPath();
        ctx.arc(0, -0.5, 0.95, 0, TAU);
        ctx.fill();
        ctx.stroke();
      } else if (v.id !== 'nothing' && v.id !== 'lifejacket') drawCraftSide(ctx, v.id, lw, { t: this.t });
      ctx.restore();
    }
    ctx.save();
    ctx.translate(s.x, POOL_Y + 0.9 * (1 - pop) + bob);
    if (this.charred) ctx.filter = 'brightness(0.45)';
    const cut = this.ch.kind === 'giraffe' ? -130 : -95;
    ctx.translate(0, (-cut / 100) * (this.ch.scale || 1));
    drawUpright(ctx, this.ch, 1, { pose: 'cheer', expr: this.charred ? 'dizzy' : 'happy', t: this.t, cutY: cut, lw: lw * 100, lifejacket: this.craftId === 'lifejacket' && this.rider.opts.lifejacket !== false, bigHead: this.cheats.bigHead });
    ctx.restore();
    if (this.gary) {
      ctx.save();
      ctx.translate(s.x + 1.4, POOL_Y + 0.9 * (1 - pop) + bob + 0.6);
      drawUpright(ctx, GARY, 1, { pose: 'wave', expr: 'happy', t: this.t + 1, cutY: -95, lw: lw * 100 });
      ctx.restore();
    }
  }

  drawMiniUI(ctx, cp, touch, btnR) {
    const { W, H } = this.g;
    const t = this.t;
    const M = this.mini;
    const mode = this.dropMode;
    const head = Math.min(30, W * 0.06);
    const sub = Math.min(17, W * 0.038);
    const btns = [];
    if (mode === 'inflate') {
      const m = M.inf ? M.inf.m : 0;
      bigText(ctx, this.dropText.title || 'INFLATE THE VEST!', W / 2, H * 0.2, head, '#ff9a3b');
      bigText(ctx, touch ? 'HOLD THE BUTTON, LET GO IN THE GREEN' : 'HOLD SPACE, LET GO IN THE GREEN', W / 2, H * 0.2 + 30, sub, '#fff');
      const gh = Math.min(180, H * 0.4);
      const gx = touch ? W - btnR * 2 - 52 : W - 70;
      const gy0 = Math.max(H * 0.2 + 56, H - btnR * 2 - 90 - gh);
      const y = (v) => gy0 + gh - v * gh;
      ctx.fillStyle = 'rgba(10,15,40,0.7)';
      roundRect(ctx, gx - 14, gy0 - 4, 28, gh + 8, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(93,255,138,0.85)';
      ctx.fillRect(gx - 10, y(0.9), 20, y(0.65) - y(0.9));
      ctx.fillStyle = 'rgba(255,90,90,0.85)';
      ctx.fillRect(gx - 10, y(1.0), 20, y(0.95) - y(1.0) + 2);
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(gx - 6, y(Math.min(1, m)), 12, y(0) - y(Math.min(1, m)));
      bigText(ctx, this.dropText.unit || 'PSI', gx, gy0 - 16, 13);
      if (touch) btns.push({ id: 'inflate', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: this.dropText.btn || 'INFLATE', action: 'primary' });
    } else if (mode === 'mash') {
      const B = M.mash || { n: 0, t: 0, dur: 1.5 };
      bigText(ctx, this.dropText.title || 'PAD THE BARREL! MASH!', W / 2, H * 0.2, head, '#ffd23b');
      bigText(ctx, touch ? 'TAP TAP TAP TAP TAP' : 'MASH SPACE AS FAST AS YOU CAN', W / 2, H * 0.2 + 30, sub, '#fff');
      const bw = Math.min(W * 0.6, 320);
      bar(ctx, W / 2 - bw / 2, H * 0.74, bw, 22, Math.min(1, B.n / 16), '#ffd23b', `${this.dropText.unit || 'PILLOWS'}: ${B.n}`);
      bar(ctx, W / 2 - bw / 2, H * 0.74 + 30, bw, 10, 1 - B.t / B.dur, '#ff5a5a');
      if (touch) btns.push({ id: 'mash', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: this.dropText.btn || 'MASH!', action: 'primary' });
    } else if (mode === 'rhythm') {
      const Rh = M.rh;
      bigText(ctx, this.dropText.title || 'AIR PADDLE WITH GARY!', W / 2, H * 0.2, head, '#5dffd0');
      bigText(ctx, touch ? 'HIT ◀ / ▶ WHEN THEY LIGHT UP' : 'PRESS ◀ / ▶ WHEN THEY LIGHT UP', W / 2, H * 0.2 + 30, sub, '#fff');
      if (Rh) {
        const n = Rh.beats.length;
        const gap = Math.min(64, (W - 40) / n);
        Rh.beats.forEach((b, i) => {
          const x = W / 2 + (i - (n - 1) / 2) * gap;
          const yy = H * 0.72;
          const current = i === Rh.i;
          const near = current && Math.abs(Rh.t - b.at) < 0.22;
          ctx.fillStyle = b.res === 'hit' ? '#2bd673' : b.res === 'miss' ? '#ff5a5a' : near ? '#ffffff' : current ? '#ffd23b' : 'rgba(10,15,40,0.7)';
          ctx.strokeStyle = '#1a1030';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, yy, gap * 0.38, 0, TAU);
          ctx.fill();
          ctx.stroke();
          bigText(ctx, b.dir === 'left' ? '◀' : '▶', x, yy + 1, gap * 0.4, b.res || near ? '#1a1030' : '#fff');
        });
      }
      if (touch) {
        btns.push({ id: 'pl', x: btnR + 18, y: H - btnR - 70, r: btnR, label: '◀', action: 'left' });
        btns.push({ id: 'pr', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: '▶', action: 'right' });
      }
    } else if (mode === 'aim') {
      const A = M.aim;
      bigText(ctx, 'ROLL INTO THE DEEP WATER!', W / 2, H * 0.2, head, '#5dff8a');
      bigText(ctx, touch ? 'DRAG ◀ ▶ TO STEER YOUR LANDING' : '◀ ▶ TO STEER YOUR LANDING', W / 2, H * 0.2 + 30, sub, '#fff');
      if (A) {
        const bw = Math.min(W * 0.75, 380);
        const bx = W / 2 - bw / 2;
        const by = H * 0.76;
        const span = 20;
        const px = (x) => bx + clamp((x - (A.zx - span / 2)) / span, 0, 1) * bw;
        ctx.fillStyle = 'rgba(10,15,40,0.7)';
        roundRect(ctx, bx, by, bw, 22, 11);
        ctx.fill();
        ctx.fillStyle = 'rgba(93,255,138,0.85)';
        ctx.fillRect(px(A.zx - A.w / 2), by + 3, px(A.zx + A.w / 2) - px(A.zx - A.w / 2), 16);
        const lx = px(A.land);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#1a1030';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx, by + 11, 10, 0, TAU);
        ctx.fill();
        ctx.stroke();
        bigText(ctx, 'YOU', lx, by - 14, 12);
        bigText(ctx, 'DEEP', px(A.zx), by + 38, 12, '#5dff8a');
      }
    }
    this.g.input.setButtons(btns);
    btns.forEach((b) => drawButton(ctx, b, { color: b.action === 'primary' ? '#ff8a1f' : '#2bb6ff', pulse: Math.sin(t * 8) }));
  }

  drawOverlay(ctx, proj) {
    const { W, H } = this.g;
    const t = this.t;
    // cinematic bars while falling
    if (this.stage === 'fall') {
      const bh = Math.min(50, H * 0.06);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, bh);
      ctx.fillRect(0, H - bh, W, bh);
    }
    // odds pill
    const odds = this.outcome ? this.outcome.odds : this.finalOdds();
    pill(ctx, W / 2, 26, 160, 38);
    bigText(ctx, `ODDS ${Math.round(odds * 100)}%`, W / 2, 27, 22, oddsColor(odds));
    if (!this.outcome || this.stage !== 'after') bigText(ctx, `${LANE_NAME[this.info.lane]}${this.info.wrecked ? ' · NO VESSEL' : ''}`, W / 2, 55, 13, '#cfefff');
    if (this.bonusLabel && this.bonusLabel.t > 0) {
      bigText(ctx, this.bonusLabel.text, W / 2, 84, 22, this.bonusLabel.color);
    }
    const c = this.core();
    const cp = proj(c.x, c.y);
    const touch = this.g.showTouch;
    const mode = this.dropMode;
    const btnR = clamp(Math.min(W, H) * 0.11, 38, 56);
    // ring mini-game
    const R = this.mini.ring;
    if (R) {
      const k = R.t / R.dur;
      const target = 46;
      const r = target + Math.max(0, 1 - k) * 150;
      ctx.save();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(93,255,138,0.9)';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, target, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 5;
      const near = Math.abs(1 - k) < 0.17;
      ctx.strokeStyle = near ? '#ffffff' : '#ffd23b';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, TAU);
      ctx.stroke();
      ctx.restore();
      bigText(ctx, R.label, W / 2, H * 0.2, Math.min(40, W * 0.08), '#ffd23b');
      bigText(ctx, touch ? 'TAP WHEN THE RINGS MEET!' : 'PRESS SPACE WHEN THE RINGS MEET!', W / 2, H * 0.2 + 34, Math.min(18, W * 0.04), '#fff');
    }
    // kayak tilt gauge
    if (mode === 'boof' && this.stage === 'fall' && !this.outcome && this.body) {
      const gx = touch ? W - 70 : 70;
      const gy = touch ? Math.max(120, Math.min(H * 0.5, H - btnR * 2 - 70 - 80)) : H * 0.5;
      ctx.save();
      // dark backing plate so the gauge reads against the white falls
      ctx.fillStyle = 'rgba(20,14,40,0.62)';
      ctx.strokeStyle = '#1a1030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, gy, 66, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(gx, gy, 46, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(93,255,138,0.95)';
      ctx.beginPath();
      ctx.arc(gx, gy, 46, (20 * Math.PI) / 180, (65 * Math.PI) / 180);
      ctx.stroke();
      const deg = this.mini.kayakDeg || 0;
      const a = (deg * Math.PI) / 180;
      ctx.strokeStyle = deg > 20 && deg < 65 ? '#5dff8a' : '#ffd23b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(a) * 58, gy + Math.sin(a) * 58);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, TAU);
      ctx.fill();
      ctx.restore();
      bigText(ctx, 'NOSE ANGLE', gx, gy - 78, 14);
      if (!R) bigText(ctx, touch ? '◀ ▶ DRAG TO TILT THE NOSE INTO THE GREEN' : '◀ ▶ TILT THE NOSE INTO THE GREEN', W / 2, H * 0.2, Math.min(22, W * 0.045), '#fff');
    }
    // surf balance meter
    const S = this.mini.surf;
    if (S && S.riding) {
      const bw = Math.min(W * 0.7, 360);
      const bx = W / 2 - bw / 2;
      const by = H * 0.78;
      ctx.fillStyle = 'rgba(10,15,40,0.7)';
      roundRect(ctx, bx, by, bw, 26, 13);
      ctx.fill();
      ctx.fillStyle = 'rgba(93,255,138,0.8)';
      ctx.fillRect(W / 2 - bw * 0.165, by + 3, bw * 0.33, 20);
      ctx.fillStyle = 'rgba(255,90,90,0.8)';
      ctx.fillRect(bx + 3, by + 3, bw * 0.08, 20);
      ctx.fillRect(bx + bw * 0.92 - 3, by + 3, bw * 0.08, 20);
      const nx = W / 2 + clamp(S.b, -1, 1) * bw * 0.48;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1a1030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx, by - 8);
      ctx.lineTo(nx - 9, by - 22);
      ctx.lineTo(nx + 9, by - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(nx - 2, by - 4, 4, 34);
      bigText(ctx, 'BALANCE!', W / 2, by - 40, 26, '#ffd23b');
      bigText(ctx, touch ? 'DRAG ◀ ▶ TO STAY IN THE GREEN' : '◀ ▶ TO STAY IN THE GREEN', W / 2, by + 48, 16, '#fff');
    }
    // parachute
    const C = this.mini.chute;
    if (C && this.stage === 'fall') {
      const top = H * 0.2;
      const bot = H * 0.75;
      const bx = 34;
      const z = (y) => top + ((bot - top) * y) / POOL_Y;
      [[0, 3, 'rgba(255,90,90,0.85)'], [3, 8, 'rgba(255,210,59,0.85)'], [8, 16, 'rgba(93,255,138,0.9)'], [16, 28, 'rgba(255,210,59,0.85)'], [28, POOL_Y, 'rgba(255,90,90,0.85)']].forEach(([a0, a1, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(bx, z(a0), 16, z(a1) - z(a0));
      });
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#1a1030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx + 8, z(clamp(c.y, 0, POOL_Y)), 9, 0, TAU);
      ctx.fill();
      ctx.stroke();
      bigText(ctx, 'ALT', bx + 8, top - 14, 13);
      if (!C.deployed) {
        bigText(ctx, touch ? 'TAP TO DEPLOY THE CHUTE!' : 'SPACE: DEPLOY THE CHUTE!', W / 2, H * 0.2, Math.min(26, W * 0.055), '#ffd23b');
        bigText(ctx, 'GREEN ZONE = BEST', W / 2, H * 0.2 + 28, 15, '#5dff8a');
        if (touch) {
          const btn = { id: 'chute', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: 'DEPLOY!', action: 'primary' };
          this.g.input.setButtons([btn]);
          drawButton(ctx, btn, { color: '#ff8a1f', pulse: Math.sin(t * 8) });
        }
      } else this.g.input.setButtons([]);
    } else if (R && touch) {
      const btn = { id: 'ring', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: 'TAP!', action: 'primary' };
      this.g.input.setButtons([btn]);
      drawButton(ctx, btn, { color: '#2bb673', pulse: Math.sin(t * 8) });
    } else if (MINI_MODES.includes(mode) && this.stage === 'fall' && !this.mini.done && !this.info.ko) {
      this.drawMiniUI(ctx, cp, touch, btnR);
    } else if (mode === 'glide' && this.stage === 'fall' && !this.forced) {
      bigText(ctx, touch ? 'HOLD FLAP TO FLOAT · DRAG TO STEER' : 'SPACE / ▲ FLAP · ◀ ▶ STEER', W / 2, H * 0.2, Math.min(20, W * 0.042), '#ffd23b');
      bigText(ctx, this.gooseTired ? 'THE GOOSE IS GETTING TIRED...' : 'THE GOOSE HAS YOU. RELAX.', W / 2, H * 0.2 + 26, 15, this.gooseTired ? '#ffb0b0' : '#fff');
      if (touch) {
        const btn = { id: 'flap', x: W - btnR - 18, y: H - btnR - 70, r: btnR, label: 'FLAP!', action: 'primary' };
        this.g.input.setButtons([btn]);
        drawButton(ctx, btn, { color: '#ffb000' });
      }
    } else {
      this.g.input.setButtons([]);
    }
    if (touch && this.g.input.joyEnabled && this.stage === 'fall') drawJoystick(ctx, this.g.input);
    if (this.stage === 'approach') bigText(ctx, this.forced ? 'DEAD ON ARRIVAL...' : this.info.ko ? 'OUT COLD...' : 'HERE IT COMES...', W / 2, H * 0.22, Math.min(34, W * 0.07), '#fff');
    if (this.stage === 'after') {
      const O = this.outcome;
      const k = Math.min(1, this.stageT * 2);
      if (O.survived && this.stageT > 1.1) bigText(ctx, 'SURVIVED!', W / 2, H * 0.24, Math.min(64, W * 0.13) * easeOutBack(Math.min(1, (this.stageT - 1.1) * 2.5)), '#5dff8a');
      if (this.sideBear && this.sideBear.t < 3) bigText(ctx, '...AND THEN A BEAR', W / 2, H - 82, Math.min(26, W * 0.06), '#ff3b3b');
      if (!O.survived && this.stageT > 0.5) bigText(ctx, this.goreStyle === 'cartoon' ? 'BONK.' : 'SPLAT.', W / 2, H * 0.24, Math.min(64, W * 0.13) * easeOutBack(Math.min(1, (this.stageT - 0.5) * 2.5)), '#ff5a5a');
      if (this.stageT > (this.forced === 'banana' ? 3.1 : 1.6)) bigText(ctx, touch ? 'tap to continue' : 'press space to continue', W / 2, H - 40, 16, `rgba(255,255,255,${0.5 + Math.sin(t * 4) * 0.3})`);
      void k;
    }
    // slow-mo flash on impact
    if (this.stage === 'after' && this.stageT < 0.2) {
      ctx.fillStyle = `rgba(255,255,255,${(0.2 - this.stageT) * 2.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
