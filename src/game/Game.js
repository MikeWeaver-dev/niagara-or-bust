// Game shell: canvas sizing (DPR aware), main loop, slow-mo, screen shake, phase switching.
import { Input } from './input.js';
import { River } from './river.js';
import { Drop } from './drop.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { rand } from './util.js';

export class Game {
  constructor(canvas, { cfg, onFinish, onPause }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.onFinish = onFinish;
    this.onPause = onPause;
    this.input = new Input(canvas);
    this.timeScale = 1;
    this.tsTimer = 0;
    this.shakeAmt = 0;
    this.paused = false;
    this.done = false;
    this.last = performance.now();
    this.coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
    audio.setVolumes(cfg.settings.music, cfg.settings.sfx);
    this.phase = new River(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  get showTouch() {
    const t = this.cfg.settings.touch;
    return t === 'on' || (t === 'auto' && (this.coarse || this.input.touchSeen));
  }

  resize() {
    const c = this.canvas;
    const r = c.parentElement ? c.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    this.W = Math.max(200, Math.floor(r.width));
    this.H = Math.max(200, Math.floor(r.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, this.W * this.H > 1400000 ? 1.5 : 2);
    c.width = Math.floor(this.W * this.dpr);
    c.height = Math.floor(this.H * this.dpr);
    c.style.width = `${this.W}px`;
    c.style.height = `${this.H}px`;
  }

  setTimeScale(s, dur) {
    this.timeScale = s;
    this.tsTimer = dur;
  }

  shake(a) {
    if (!this.cfg.settings.shake) return;
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }

  setPaused(p) {
    this.paused = p;
    this.last = performance.now();
    if (audio.ctx) {
      if (p) audio.ctx.suspend();
      else audio.ctx.resume();
    }
  }

  toDrop(info) {
    this.input.tapIsPrimary = true;
    this.input.joyEnabled = true;
    this.timeScale = 1;
    this.phase = new Drop(this, info);
  }

  finish(result) {
    if (this.done) return;
    this.done = true;
    audio.stopAllLoops();
    this.input.setButtons([]);
    setTimeout(() => this.onFinish && this.onFinish(result), 250);
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.input.pressed('pause') && this.onPause) this.onPause();
    if (!this.paused && !document.hidden) {
      if (this.tsTimer > 0) {
        this.tsTimer -= dt;
        if (this.tsTimer <= 0) this.timeScale = 1;
      }
      try {
        this.phase.update(dt * this.timeScale);
      } catch (e) {
        console.error(e);
      }
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.5);
    }
    this.render();
    this.input.endFrame();
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    if (this.shakeAmt > 0) {
      const a = this.shakeAmt * this.shakeAmt * 14;
      ctx.translate(rand(-a, a), rand(-a, a));
    }
    try {
      this.phase.render(ctx);
    } catch (e) {
      console.error(e);
    }
    ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
    this.input.destroy();
    audio.stopAllLoops();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    music.setIntensity(0);
  }
}
