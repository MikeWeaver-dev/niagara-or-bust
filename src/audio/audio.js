// Procedural audio engine: every sound effect is synthesized with the Web Audio API.
// Nothing is loaded from files, so there are no licensing headaches and nothing to download.

const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function midi(name) {
  if (typeof name === 'number') return name;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) return 60;
  return NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}
export const freqOf = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.55;
    this.sfxVol = 0.85;
    this.loops = {};
    this._unlockBound = () => this.unlock();
    if (typeof window !== 'undefined') {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        window.addEventListener(ev, this._unlockBound, { passive: true })
      );
    }
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.knee.value = 12;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.2;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.comp.connect(this.master).connect(c.destination);
      this.music = c.createGain();
      this.music.gain.value = this.musicVol * 0.5;
      this.music.connect(this.comp);
      this.sfx = c.createGain();
      this.sfx.gain.value = this.sfxVol;
      this.sfx.connect(this.comp);
      // shared echo send for music leads
      this.delay = c.createDelay(1);
      this.delay.delayTime.value = 0.27;
      this.delayFb = c.createGain();
      this.delayFb.gain.value = 0.28;
      this.delayWet = c.createGain();
      this.delayWet.gain.value = 0.35;
      this.delay.connect(this.delayFb).connect(this.delay);
      this.delay.connect(this.delayWet).connect(this.music);
      // white noise buffer reused everywhere
      const len = c.sampleRate * 2;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // brown noise for the falls roar
      this.brownBuf = c.createBuffer(1, len, c.sampleRate);
      const b = this.brownBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
      this.distCurve = makeDistortion(40);
      if (this.onReady) this.onReady();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }
  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(music * 0.5, this.now, 0.05);
    this.sfx.gain.setTargetAtTime(sfx, this.now, 0.05);
  }

  // ---------- primitives ----------
  env(g, t, peak, attack, hold, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  tone({ type = 'sine', f = 440, f2 = null, t = this.now, dur = 0.2, gain = 0.3, attack = 0.005, release = null, dest = this.sfx, detune = 0, vib = 0, vibRate = 6, filter = null, q = 1, glide = 'exp' }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== null) {
      if (glide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
      else o.frequency.linearRampToValueAtTime(f2, t + dur);
    }
    o.detune.value = detune;
    const g = c.createGain();
    const rel = release ?? dur * 0.6;
    this.env(g, t, gain, attack, Math.max(0, dur - attack - rel), rel);
    let node = o;
    if (vib) {
      const l = c.createOscillator();
      const lg = c.createGain();
      l.frequency.value = vibRate;
      lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    if (filter) {
      const fl = c.createBiquadFilter();
      fl.type = filter.type || 'lowpass';
      fl.frequency.setValueAtTime(filter.f, t);
      if (filter.f2) fl.frequency.exponentialRampToValueAtTime(filter.f2, t + dur);
      fl.Q.value = filter.q ?? q;
      node.connect(fl);
      node = fl;
    }
    node.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  noise({ t = this.now, dur = 0.3, gain = 0.3, type = 'lowpass', f = 1200, f2 = null, q = 1, attack = 0.005, release = null, dest = this.sfx, brown = false, rate = 1 }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = brown ? this.brownBuf : this.noiseBuf;
    s.loop = true;
    s.playbackRate.value = rate;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = q;
    const g = c.createGain();
    const rel = release ?? dur * 0.7;
    this.env(g, t, gain, attack, Math.max(0, dur - attack - rel), rel);
    s.connect(fl).connect(g).connect(dest);
    const off = Math.random() * 1.5;
    s.start(t, off);
    s.stop(t + dur + 0.05);
  }

  // A vowel-ish voice: sawtooth through formant filters. Used for screams, oofs, crowds.
  voice({ t = this.now, f = 300, f2 = null, dur = 0.5, gain = 0.25, formants = [800, 1200], vib = 12, vibRate = 7, dest = this.sfx, type = 'sawtooth' }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = vibRate;
    lg.gain.value = vib;
    l.connect(lg).connect(o.frequency);
    const out = c.createGain();
    this.env(out, t, gain, 0.02, dur * 0.6, dur * 0.4);
    formants.forEach((ff, i) => {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = 6;
      const fg = c.createGain();
      fg.gain.value = i === 0 ? 1.4 : 0.9;
      o.connect(bp).connect(fg).connect(out);
    });
    out.connect(dest);
    o.start(t);
    l.start(t);
    o.stop(t + dur + 0.05);
    l.stop(t + dur + 0.05);
  }

  // ---------- looping beds (falls roar, river, engine) ----------
  loop(name, { brown = true, type = 'lowpass', f = 500, q = 0.7, gain = 0.2 } = {}) {
    if (!this.ctx) return null;
    if (this.loops[name]) return this.loops[name];
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = brown ? this.brownBuf : this.noiseBuf;
    s.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.value = 0.0001;
    s.connect(fl).connect(g).connect(this.sfx);
    s.start();
    const L = { src: s, filter: fl, gain: g, target: gain };
    g.gain.setTargetAtTime(gain, this.now, 0.3);
    this.loops[name] = L;
    return L;
  }
  setLoop(name, gain, freq) {
    const L = this.loops[name];
    if (!L || !this.ctx) return;
    L.gain.gain.setTargetAtTime(Math.max(0.0001, gain), this.now, 0.15);
    if (freq) L.filter.frequency.setTargetAtTime(freq, this.now, 0.15);
  }
  stopLoop(name, fade = 0.4) {
    const L = this.loops[name];
    if (!L || !this.ctx) return;
    L.gain.gain.setTargetAtTime(0.0001, this.now, fade / 3);
    L.src.stop(this.now + fade + 0.1);
    delete this.loops[name];
  }
  stopAllLoops() {
    Object.keys(this.loops).forEach((k) => this.stopLoop(k, 0.2));
    this.stopEngine();
  }

  startEngine() {
    if (!this.ctx || this.engine) return;
    const c = this.ctx;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o1.frequency.value = 60;
    o2.frequency.value = 121;
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 22;
    lg.gain.value = 8;
    lfo.connect(lg);
    lg.connect(o1.frequency);
    lg.connect(o2.frequency);
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 700;
    const g = c.createGain();
    g.gain.value = 0.0001;
    o1.connect(fl);
    o2.connect(fl);
    fl.connect(g).connect(this.sfx);
    o1.start();
    o2.start();
    lfo.start();
    g.gain.setTargetAtTime(0.07, this.now, 0.2);
    this.engine = { o1, o2, lfo, fl, g };
  }
  setEngine(throttle) {
    if (!this.engine) return;
    const e = this.engine;
    const f = 55 + throttle * 75;
    e.o1.frequency.setTargetAtTime(f, this.now, 0.08);
    e.o2.frequency.setTargetAtTime(f * 2.01, this.now, 0.08);
    e.fl.frequency.setTargetAtTime(600 + throttle * 1400, this.now, 0.08);
    e.g.gain.setTargetAtTime(0.05 + throttle * 0.06, this.now, 0.1);
  }
  stopEngine() {
    if (!this.engine) return;
    const e = this.engine;
    e.g.gain.setTargetAtTime(0.0001, this.now, 0.1);
    [e.o1, e.o2, e.lfo].forEach((o) => o.stop(this.now + 0.5));
    this.engine = null;
  }

  // ---------- sound effects ----------
  click() {
    this.tone({ type: 'square', f: 900, f2: 1400, dur: 0.06, gain: 0.08 });
  }
  hover() {
    this.tone({ type: 'sine', f: 1300, dur: 0.04, gain: 0.04 });
  }
  buy() {
    const t = this.now;
    this.tone({ type: 'square', f: 1046, t, dur: 0.08, gain: 0.1 });
    this.tone({ type: 'square', f: 1568, t: t + 0.08, dur: 0.25, gain: 0.1 });
    this.noise({ t: t + 0.05, dur: 0.4, type: 'highpass', f: 6000, gain: 0.08 });
    this.tone({ type: 'triangle', f: 2093, t: t + 0.16, dur: 0.4, gain: 0.08 });
  }
  denied() {
    this.tone({ type: 'square', f: 180, f2: 120, dur: 0.25, gain: 0.1 });
  }
  pickup(pitch = 1) {
    const t = this.now;
    this.tone({ type: 'sine', f: 880 * pitch, t, dur: 0.08, gain: 0.12 });
    this.tone({ type: 'sine', f: 1318 * pitch, t: t + 0.05, dur: 0.14, gain: 0.12 });
    this.tone({ type: 'triangle', f: 2637 * pitch, t: t + 0.05, dur: 0.12, gain: 0.04 });
  }
  bigPickup() {
    const t = this.now;
    [0, 4, 7, 12, 16].forEach((s, i) =>
      this.tone({ type: 'square', f: 523 * Math.pow(2, s / 12), t: t + i * 0.05, dur: 0.15, gain: 0.07 })
    );
  }
  paddle() {
    this.noise({ dur: 0.14, type: 'bandpass', f: 700 + Math.random() * 500, q: 1.5, gain: 0.07 });
  }
  splash(size = 1) {
    const t = this.now;
    const d = 0.25 + size * 0.5;
    this.noise({ t, dur: d, type: 'lowpass', f: 3500, f2: 300, gain: 0.18 + size * 0.15 });
    this.noise({ t: t + 0.02, dur: d * 0.8, type: 'bandpass', f: 1800, f2: 600, q: 0.8, gain: 0.1 * size });
    if (size > 0.8) this.tone({ type: 'sine', f: 110, f2: 40, t, dur: 0.4, gain: 0.25 });
  }
  bonk() {
    this.tone({ type: 'sine', f: 520, f2: 90, dur: 0.18, gain: 0.3 });
    this.tone({ type: 'triangle', f: 1400, f2: 300, dur: 0.05, gain: 0.1 });
  }
  boing() {
    this.tone({ type: 'sine', f: 180, f2: 520, dur: 0.12, gain: 0.25, glide: 'lin' });
    this.tone({ type: 'sine', f: 520, f2: 140, t: this.now + 0.12, dur: 0.3, gain: 0.22, vib: 30, vibRate: 18 });
  }
  thunk() {
    this.tone({ type: 'triangle', f: 160, f2: 55, dur: 0.22, gain: 0.35 });
    this.noise({ dur: 0.12, type: 'lowpass', f: 700, gain: 0.2 });
  }
  crack() {
    const t = this.now;
    for (let i = 0; i < 3; i++) this.noise({ t: t + i * 0.03, dur: 0.05, type: 'highpass', f: 2000, gain: 0.2 });
    this.tone({ type: 'square', f: 90, f2: 50, t, dur: 0.15, gain: 0.12 });
  }
  snap() {
    const t = this.now;
    this.noise({ t, dur: 0.04, type: 'highpass', f: 3000, gain: 0.35 });
    this.tone({ type: 'square', f: 1800, f2: 400, t, dur: 0.03, gain: 0.12 });
    this.noise({ t: t + 0.03, dur: 0.08, type: 'bandpass', f: 900, gain: 0.15 });
  }
  splat(big = 1) {
    const t = this.now;
    this.noise({ t, dur: 0.25 * big, type: 'lowpass', f: 1100, f2: 200, gain: 0.35 });
    this.tone({ type: 'sine', f: 140, f2: 35, t, dur: 0.3, gain: 0.4 });
    this.noise({ t: t + 0.04, dur: 0.22, type: 'bandpass', f: 400, f2: 1800, q: 3, gain: 0.18 });
  }
  squish() {
    this.noise({ dur: 0.2, type: 'bandpass', f: 300, f2: 1400, q: 4, gain: 0.2 });
  }
  boom(size = 1) {
    const t = this.now;
    this.noise({ t, dur: 1.4 * size, type: 'lowpass', f: 900, f2: 60, gain: 0.55, brown: false });
    this.tone({ type: 'sine', f: 70, f2: 28, t, dur: 1.0, gain: 0.5 });
    for (let i = 0; i < 6; i++) this.noise({ t: t + 0.1 + Math.random() * 0.8, dur: 0.05, type: 'highpass', f: 2500, gain: 0.08 });
  }
  whoosh(dur = 0.6) {
    const t = this.now;
    this.noise({ t, dur, type: 'bandpass', f: 300, f2: 2400, q: 1.2, gain: 0.18, attack: dur * 0.4, release: dur * 0.5 });
  }
  slideUp() {
    this.tone({ type: 'sine', f: 400, f2: 1300, dur: 0.28, gain: 0.12, glide: 'lin' });
  }
  slideDown() {
    this.tone({ type: 'sine', f: 1300, f2: 250, dur: 0.5, gain: 0.14, glide: 'lin' });
  }
  pop() {
    const t = this.now;
    this.noise({ t, dur: 0.08, type: 'highpass', f: 1500, gain: 0.4 });
    this.tone({ type: 'sine', f: 700, f2: 90, t, dur: 0.12, gain: 0.35 });
    for (let i = 0; i < 5; i++) this.tone({ type: 'triangle', f: 2000 + Math.random() * 3000, t: t + 0.03 + i * 0.03, dur: 0.05, gain: 0.04 });
  }
  shatter() {
    const t = this.now;
    for (let i = 0; i < 10; i++) this.tone({ type: 'triangle', f: 2500 + Math.random() * 4000, t: t + Math.random() * 0.3, dur: 0.08, gain: 0.05 });
    this.noise({ t, dur: 0.4, type: 'highpass', f: 4000, gain: 0.2 });
  }
  woodBreak() {
    const t = this.now;
    for (let i = 0; i < 6; i++) this.noise({ t: t + i * 0.035 + Math.random() * 0.02, dur: 0.06, type: 'bandpass', f: 800 + Math.random() * 1200, q: 2, gain: 0.25 });
    this.tone({ type: 'triangle', f: 120, f2: 50, t, dur: 0.3, gain: 0.3 });
  }
  bubbles(n = 6) {
    const t = this.now;
    for (let i = 0; i < n; i++) this.tone({ type: 'sine', f: 300 + Math.random() * 300, f2: 900 + Math.random() * 600, t: t + i * 0.09 + Math.random() * 0.05, dur: 0.06, gain: 0.06 });
  }
  scream(voice = 1, dur = 1.1) {
    const f = 330 * voice;
    this.voice({ f, f2: f * 1.25, dur, gain: 0.22, formants: [850 * Math.min(1.3, voice), 1250 * Math.min(1.3, voice)], vib: 18 * voice, vibRate: 8 });
    this.noise({ dur: dur * 0.9, type: 'bandpass', f: 2600, q: 2, gain: 0.04 });
  }
  oof(voice = 1) {
    this.voice({ f: 200 * voice, f2: 120 * voice, dur: 0.22, gain: 0.25, formants: [500, 900], vib: 4 });
  }
  yay(voice = 1) {
    this.voice({ f: 280 * voice, f2: 420 * voice, dur: 0.45, gain: 0.2, formants: [700, 1800], vib: 10 });
  }
  whoa(voice = 1) {
    this.voice({ f: 300 * voice, f2: 180 * voice, dur: 0.5, gain: 0.2, formants: [600, 1000], vib: 14 });
  }
  glub() {
    const t = this.now;
    [0, 0.25, 0.5].forEach((d, i) => this.voice({ t: t + d, f: 160 - i * 20, f2: 90, dur: 0.18, gain: 0.15, formants: [400, 800], vib: 3 }));
    this.bubbles(10);
  }
  honk() {
    const t = this.now;
    [0, 0.22].forEach((d) => {
      this.voice({ t: t + d, f: 420, f2: 330, dur: 0.18, gain: 0.3, formants: [1000, 2200], vib: 0, type: 'sawtooth' });
      this.tone({ type: 'square', f: 400, f2: 320, t: t + d, dur: 0.16, gain: 0.05 });
    });
  }
  meow() {
    this.voice({ f: 600, f2: 900, dur: 0.18, gain: 0.12, formants: [900, 2400], vib: 6 });
    this.voice({ t: this.now + 0.18, f: 900, f2: 480, dur: 0.35, gain: 0.12, formants: [700, 2000], vib: 8 });
  }
  caw() {
    this.voice({ f: 1100, f2: 800, dur: 0.15, gain: 0.07, formants: [1500, 3000], vib: 20 });
  }
  cheer(dur = 2.5) {
    const t = this.now;
    for (let i = 0; i < 7; i++) {
      this.noise({ t: t + i * 0.05, dur, type: 'bandpass', f: 900 + i * 260, q: 3, gain: 0.05, attack: 0.25, release: dur * 0.6 });
    }
    for (let i = 0; i < 22; i++) this.noise({ t: t + 0.2 + Math.random() * dur, dur: 0.03, type: 'highpass', f: 1800, gain: 0.07 });
    for (let i = 0; i < 4; i++) this.voice({ t: t + Math.random() * 0.6, f: 300 + Math.random() * 250, f2: 450 + Math.random() * 200, dur: 0.6, gain: 0.05, formants: [700, 1800] });
  }
  gasp() {
    for (let i = 0; i < 5; i++) this.voice({ t: this.now + i * 0.02, f: 200 + i * 40, f2: 150 + i * 30, dur: 0.8, gain: 0.04, formants: [500, 900], vib: 6 });
  }
  roar() {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = this.now;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.3);
    o.frequency.linearRampToValueAtTime(60, t + 1.6);
    const ws = c.createWaveShaper();
    ws.curve = this.distCurve;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 1.5;
    const g = c.createGain();
    this.env(g, t, 0.45, 0.08, 1.0, 0.6);
    o.connect(ws).connect(bp).connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 1.8);
    this.noise({ t, dur: 1.6, type: 'lowpass', f: 700, gain: 0.25 });
  }
  chomp() {
    const t = this.now;
    this.tone({ type: 'sine', f: 160, f2: 40, t, dur: 0.15, gain: 0.5 });
    this.noise({ t, dur: 0.1, type: 'lowpass', f: 1500, gain: 0.3 });
    this.crack();
    this.tone({ type: 'sine', f: 140, f2: 40, t: t + 0.25, dur: 0.15, gain: 0.4 });
  }
  harp() {
    const t = this.now;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 28];
    scale.forEach((s, i) => this.tone({ type: 'triangle', f: 392 * Math.pow(2, s / 12), t: t + i * 0.06, dur: 0.6, gain: 0.07 }));
  }
  chute() {
    const t = this.now;
    this.whoosh(0.4);
    this.tone({ type: 'sine', f: 120, f2: 60, t: t + 0.3, dur: 0.3, gain: 0.4 });
    for (let i = 0; i < 8; i++) this.noise({ t: t + 0.3 + i * 0.07, dur: 0.05, type: 'bandpass', f: 500, gain: 0.08 });
  }
  revUp() {
    this.tone({ type: 'sawtooth', f: 70, f2: 220, dur: 0.7, gain: 0.12, filter: { f: 600, f2: 2400 } });
  }
  fanfare() {
    const t = this.now + 0.05;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone({ type: 'square', f, t: t + i * 0.12, dur: i === 3 ? 0.9 : 0.12, gain: 0.08, filter: { f: 3000 }, dest: this.sfx }));
    notes.forEach((f, i) => this.tone({ type: 'sawtooth', f: f / 2, t: t + i * 0.12, dur: i === 3 ? 0.9 : 0.12, gain: 0.05, filter: { f: 1800 } }));
    this.noise({ t: t + 0.36, dur: 1.2, type: 'highpass', f: 5000, gain: 0.12 });
  }
  sadTrombone() {
    const t = this.now + 0.1;
    const notes = [233.08, 220, 207.65, 196];
    notes.forEach((f, i) => {
      const last = i === 3;
      this.tone({ type: 'sawtooth', f, f2: last ? f * 0.97 : f, t: t + i * 0.45, dur: last ? 1.4 : 0.42, gain: 0.12, vib: last ? 8 : 2, vibRate: 5, filter: { f: 900, q: 2 } });
    });
  }
  slip() {
    this.slideDown();
    this.tone({ type: 'sine', f: 120, f2: 40, t: this.now + 0.45, dur: 0.25, gain: 0.4 });
  }
  impact() {
    const t = this.now;
    this.tone({ type: 'sine', f: 90, f2: 30, t, dur: 0.5, gain: 0.55 });
    this.noise({ t, dur: 0.5, type: 'lowpass', f: 2000, f2: 200, gain: 0.4 });
  }
  fart(len = 1.6) {
    // the brownest note
    if (!this.ctx) return;
    const t = this.now;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    const steps = 14;
    for (let i = 1; i <= steps; i++) o.frequency.linearRampToValueAtTime(70 + Math.random() * 60, t + (i / steps) * len);
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 28;
    lg.gain.value = 30;
    lfo.connect(lg).connect(o.frequency);
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 520;
    fl.Q.value = 6;
    const g = c.createGain();
    this.env(g, t, 0.45, 0.02, len * 0.7, len * 0.3);
    o.connect(fl).connect(g).connect(this.sfx);
    o.start(t);
    lfo.start(t);
    o.stop(t + len + 0.1);
    lfo.stop(t + len + 0.1);
    for (let i = 0; i < 10; i++) this.noise({ t: t + Math.random() * len, dur: 0.08, type: 'bandpass', f: 300 + Math.random() * 300, q: 3, gain: 0.25 });
    this.splat(1.2);
  }
  barf(voice = 1) {
    const t = this.now;
    this.voice({ t, f: 180 * voice, f2: 120 * voice, dur: 0.35, gain: 0.25, formants: [600, 1000], vib: 20, vibRate: 11 });
    this.voice({ t: t + 0.32, f: 150 * voice, f2: 90 * voice, dur: 0.9, gain: 0.3, formants: [500, 900], vib: 35, vibRate: 14 });
    this.noise({ t: t + 0.35, dur: 0.9, type: 'bandpass', f: 700, f2: 300, q: 1.5, gain: 0.35 });
    for (let i = 0; i < 6; i++) this.noise({ t: t + 0.5 + i * 0.12, dur: 0.06, type: 'lowpass', f: 600, gain: 0.25 });
  }
  burp() {
    this.voice({ f: 90, f2: 70, dur: 0.7, gain: 0.35, formants: [400, 750], vib: 18, vibRate: 22 });
  }
  gulp() {
    this.tone({ type: 'sine', f: 260, f2: 90, dur: 0.25, gain: 0.35 });
    this.noise({ t: this.now + 0.05, dur: 0.15, type: 'lowpass', f: 400, gain: 0.25 });
  }
  rip() {
    const t = this.now;
    for (let i = 0; i < 8; i++) this.noise({ t: t + i * 0.025, dur: 0.05, type: 'bandpass', f: 1200 + Math.random() * 1500, q: 2, gain: 0.25 });
    this.squish();
  }
  thunder() {
    const t = this.now;
    this.noise({ t, dur: 0.12, type: 'highpass', f: 2000, gain: 0.6 });
    this.noise({ t: t + 0.05, dur: 2.4, type: 'lowpass', f: 600, f2: 80, gain: 0.7, brown: true });
    this.tone({ type: 'sine', f: 55, f2: 30, t, dur: 1.6, gain: 0.5 });
    for (let i = 0; i < 8; i++) this.noise({ t: t + Math.random() * 0.4, dur: 0.05, type: 'highpass', f: 3000, gain: 0.25 });
  }
  thwip() {
    this.noise({ dur: 0.12, type: 'bandpass', f: 900, f2: 2600, q: 2, gain: 0.25 });
    this.tone({ type: 'triangle', f: 500, f2: 900, dur: 0.08, gain: 0.08 });
  }
  pew() {
    this.tone({ type: 'square', f: 1600, f2: 300, dur: 0.12, gain: 0.1 });
    this.noise({ dur: 0.05, type: 'highpass', f: 3000, gain: 0.2 });
  }
  thwack() {
    this.tone({ type: 'sine', f: 380, f2: 120, dur: 0.1, gain: 0.3 });
    this.noise({ dur: 0.06, type: 'bandpass', f: 1500, gain: 0.3 });
  }
  ping() {
    this.tone({ type: 'sine', f: 2400, f2: 1800, dur: 0.15, gain: 0.12 });
  }
  // Funny spoken last words via the browser's built-in speech synthesizer (Chrome desktop + Android)
  say(text, pitch = 1, rate = 1.05) {
    try {
      const S = window.speechSynthesis;
      if (!S || this.sfxVol <= 0) return;
      S.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = Math.max(0, Math.min(2, pitch));
      u.rate = rate;
      u.volume = Math.min(1, this.sfxVol * 1.1);
      S.speak(u);
    } catch {
      /* no speech on this device: the synth screams still play */
    }
  }
  thud() {
    this.tone({ type: 'sine', f: 120, f2: 45, dur: 0.18, gain: 0.35 });
  }
}

function makeDistortion(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export const audio = new AudioEngine();
