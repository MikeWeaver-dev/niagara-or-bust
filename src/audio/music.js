// A tiny step sequencer + original songs, synthesized live with Web Audio.
import { audio, freqOf } from './audio.js';

// ---------- instruments ----------
const I = {
  kick(t, g = 0.9) {
    audio.tone({ type: 'sine', f: 150, f2: 42, t, dur: 0.22, gain: g, attack: 0.002, release: 0.18, dest: audio.music });
    audio.tone({ type: 'triangle', f: 600, f2: 100, t, dur: 0.03, gain: g * 0.25, dest: audio.music });
  },
  snare(t, g = 0.5) {
    audio.noise({ t, dur: 0.16, type: 'highpass', f: 1400, gain: g * 0.6, dest: audio.music });
    audio.tone({ type: 'triangle', f: 230, f2: 160, t, dur: 0.09, gain: g * 0.5, dest: audio.music });
  },
  clap(t, g = 0.45) {
    [0, 0.012, 0.024].forEach((d) => audio.noise({ t: t + d, dur: 0.09, type: 'bandpass', f: 1300, q: 1.2, gain: g * 0.5, dest: audio.music }));
  },
  hat(t, g = 0.18, open = false) {
    audio.noise({ t, dur: open ? 0.22 : 0.04, type: 'highpass', f: 7500, gain: g, dest: audio.music });
  },
  shaker(t, g = 0.1) {
    audio.noise({ t, dur: 0.06, type: 'bandpass', f: 6000, q: 1.5, gain: g, attack: 0.02, dest: audio.music });
  },
  tom(t, f = 110, g = 0.5) {
    audio.tone({ type: 'sine', f: f * 1.6, f2: f, t, dur: 0.25, gain: g, dest: audio.music });
  },
  timpani(t, n, g = 0.5) {
    const f = freqOf(n);
    audio.tone({ type: 'sine', f: f * 1.05, f2: f, t, dur: 0.9, gain: g, dest: audio.music });
    audio.noise({ t, dur: 0.15, type: 'lowpass', f: 400, gain: g * 0.3, dest: audio.music });
  },
  bass(t, n, d, g = 0.32, type = 'sawtooth') {
    audio.tone({ type, f: freqOf(n), t, dur: d, gain: g, attack: 0.005, release: d * 0.5, filter: { f: 520, q: 4 }, dest: audio.music });
    audio.tone({ type: 'sine', f: freqOf(n), t, dur: d, gain: g * 0.6, dest: audio.music });
  },
  tuba(t, n, d, g = 0.32) {
    audio.tone({ type: 'triangle', f: freqOf(n), t, dur: d, gain: g, attack: 0.02, release: d * 0.4, dest: audio.music });
    audio.tone({ type: 'sawtooth', f: freqOf(n), t, dur: d, gain: g * 0.25, filter: { f: 400 }, dest: audio.music });
  },
  lead(t, n, d, g = 0.1, type = 'square') {
    const o = audio.tone({ type, f: freqOf(n), t, dur: d, gain: g, attack: 0.01, release: Math.min(0.12, d * 0.5), vib: 4, vibRate: 5.5, filter: { f: 3200 }, dest: audio.music });
    if (o && audio.delay) {
      audio.tone({ type, f: freqOf(n), t, dur: d, gain: g * 0.5, attack: 0.01, release: Math.min(0.12, d * 0.5), filter: { f: 2200 }, dest: audio.delay });
    }
  },
  pluck(t, n, d = 0.15, g = 0.07) {
    audio.tone({ type: 'triangle', f: freqOf(n), t, dur: d, gain: g, attack: 0.002, release: d * 0.9, dest: audio.music });
  },
  bell(t, n, d = 0.8, g = 0.07) {
    const f = freqOf(n);
    audio.tone({ type: 'sine', f, t, dur: d, gain: g, attack: 0.002, release: d * 0.9, dest: audio.music });
    audio.tone({ type: 'sine', f: f * 2.76, t, dur: d * 0.4, gain: g * 0.4, attack: 0.002, release: d * 0.35, dest: audio.music });
    if (audio.delay) audio.tone({ type: 'sine', f, t, dur: d, gain: g * 0.4, dest: audio.delay });
  },
  pad(t, notes, d, g = 0.035, f = 1400) {
    notes.forEach((n) => {
      [-8, 8].forEach((det) =>
        audio.tone({ type: 'sawtooth', f: freqOf(n), t, dur: d, gain: g, attack: d * 0.25, release: d * 0.35, detune: det, filter: { f }, dest: audio.music })
      );
    });
  },
  choir(t, notes, d, g = 0.05) {
    notes.forEach((n) => audio.voice({ t, f: freqOf(n), dur: d, gain: g, formants: [750, 1150], vib: 3, vibRate: 5, dest: audio.music }));
  },
  stab(t, notes, d = 0.12, g = 0.05, type = 'square') {
    notes.forEach((n) => audio.tone({ type, f: freqOf(n), t, dur: d, gain: g, attack: 0.003, release: d * 0.6, filter: { f: 2400 }, dest: audio.music }));
  },
  rhodes(t, notes, d, g = 0.06) {
    notes.forEach((n) => {
      const f = freqOf(n);
      audio.tone({ type: 'sine', f, t, dur: d, gain: g, attack: 0.005, release: d * 0.8, vib: 2, vibRate: 4, dest: audio.music });
      audio.tone({ type: 'sine', f: f * 2, t, dur: d * 0.3, gain: g * 0.25, dest: audio.music });
    });
  },
};

// melody helper: [step, note, lengthInSteps]
const mel = (arr) => arr;

// ---------- songs ----------
// Each song: bpm, bars (loop length), stepsPerBar = 16, play(step, bar, t, s) where s = seconds per step
export const SONGS = {
  title: {
    bpm: 128,
    bars: 8,
    chords: [
      ['D', ['D4', 'F#4', 'A4']],
      ['A', ['C#4', 'E4', 'A4']],
      ['B', ['D4', 'F#4', 'B4']],
      ['G', ['D4', 'G4', 'B4']],
      ['D', ['D4', 'F#4', 'A4']],
      ['A', ['C#4', 'E4', 'A4']],
      ['G', ['D4', 'G4', 'B4']],
      ['A', ['C#4', 'E4', 'A4']],
    ],
    melody: [
      mel([[0, 'F#5', 2], [2, 'A5', 2], [4, 'D6', 3], [7, 'C#6', 1], [8, 'B5', 2], [10, 'A5', 2], [12, 'F#5', 4]]),
      mel([[0, 'E5', 2], [2, 'F#5', 2], [4, 'A5', 3], [7, 'G5', 1], [8, 'F#5', 2], [10, 'E5', 2], [12, 'C#5', 4]]),
      mel([[0, 'D5', 2], [2, 'F#5', 2], [4, 'B5', 3], [7, 'A5', 1], [8, 'B5', 2], [10, 'C#6', 2], [12, 'D6', 4]]),
      mel([[0, 'B5', 2], [2, 'A5', 2], [4, 'G5', 2], [6, 'F#5', 2], [8, 'E5', 4], [12, 'A5', 4]]),
      mel([[0, 'F#5', 2], [2, 'A5', 2], [4, 'D6', 3], [7, 'C#6', 1], [8, 'B5', 2], [10, 'A5', 2], [12, 'F#5', 4]]),
      mel([[0, 'E5', 2], [2, 'F#5', 2], [4, 'A5', 3], [7, 'G5', 1], [8, 'F#5', 2], [10, 'E5', 2], [12, 'E5', 2], [14, 'A5', 2]]),
      mel([[0, 'B5', 2], [2, 'D6', 2], [4, 'G6', 3], [7, 'F#6', 1], [8, 'E6', 2], [10, 'D6', 2], [12, 'B5', 4]]),
      mel([[0, 'C#6', 2], [2, 'B5', 2], [4, 'A5', 2], [6, 'G5', 2], [8, 'E5', 2], [10, 'F#5', 2], [12, 'A5', 4]]),
    ],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      if (st === 0 || st === 6 || st === 8) I.kick(t);
      if (st === 4 || st === 12) I.snare(t);
      if (st % 2 === 0) I.hat(t, 0.12, st === 14);
      if (st % 2 === 0) {
        const oct = st % 4 === 2 ? 3 : 2;
        I.bass(t, `${root}${oct}`, s * 1.8);
      }
      if (st === 0) I.pad(t, chord, s * 16, 0.025);
      if (st % 2 === 1) I.pluck(t, chord[(st >> 1) % 3].replace('4', '5'), s * 1.5, 0.04);
      this.melody[bar].forEach(([ms, n, len]) => {
        if (ms === st) I.lead(t, n, s * len * 0.95, 0.075);
      });
    },
  },

  river: {
    bpm: 150,
    bars: 4,
    chords: [
      ['E', ['E4', 'G4', 'B4']],
      ['C', ['C4', 'E4', 'G4']],
      ['G', ['D4', 'G4', 'B4']],
      ['D', ['D4', 'F#4', 'A4']],
    ],
    melody: [
      mel([[0, 'E5', 3], [3, 'G5', 3], [6, 'B5', 2], [8, 'A5', 2], [10, 'G5', 2], [12, 'E5', 4]]),
      mel([[0, 'E5', 3], [3, 'G5', 3], [6, 'C6', 2], [8, 'B5', 2], [10, 'G5', 2], [12, 'E5', 2], [14, 'D5', 2]]),
      mel([[0, 'D5', 3], [3, 'G5', 3], [6, 'B5', 2], [8, 'D6', 2], [10, 'B5', 2], [12, 'G5', 4]]),
      mel([[0, 'F#5', 3], [3, 'A5', 3], [6, 'D6', 2], [8, 'C6', 2], [10, 'B5', 2], [12, 'A5', 2], [14, 'F#5', 2]]),
    ],
    play(st, bar, t, s, intensity) {
      const [root, chord] = this.chords[bar];
      if (st === 0 || st === 8 || st === 10) I.kick(t, 0.8);
      if (st === 4 || st === 12) I.snare(t, 0.45);
      if (intensity > 0.25 || st % 2 === 0) I.hat(t, st % 4 === 2 ? 0.12 : 0.07);
      if (st % 2 === 0) I.bass(t, `${root}2`, s * 1.6, 0.3);
      else if (intensity > 0.4) I.bass(t, `${root}3`, s * 0.8, 0.14);
      if (intensity > 0.12) I.pluck(t, chord[st % 3].replace('4', st % 6 < 3 ? '5' : '4'), s * 1.2, 0.035);
      if (st === 0) I.pad(t, chord, s * 16, 0.016 + intensity * 0.012, 900 + intensity * 1500);
      if (intensity > 0.45) {
        this.melody[bar].forEach(([ms, n, len]) => {
          if (ms === st) I.lead(t, n, s * len * 0.95, 0.055 + intensity * 0.03, 'sawtooth');
        });
      }
      if (intensity > 0.8 && bar === 3 && st >= 12) I.tom(t, 90 + (st - 12) * 20, 0.35);
    },
  },

  drop: {
    bpm: 100,
    bars: 4,
    chords: [
      ['D', ['D4', 'F4', 'A4']],
      ['A#', ['D4', 'F4', 'A#4']],
      ['G', ['D4', 'G4', 'A#4']],
      ['A', ['C#4', 'E4', 'A4']],
    ],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      if (st === 0) {
        I.timpani(t, `${root}2`, 0.55);
        I.choir(t, chord, s * 16, 0.045);
        I.pad(t, chord.map((n) => n.replace('4', '3')), s * 16, 0.03, 900);
      }
      I.tom(t, 70, 0.07 + (st / 16) * 0.15);
      if (st % 4 === 0) I.bass(t, `${root}1`, s * 3.5, 0.25);
      if (st === 8 || st === 12 || st === 14) I.timpani(t, `${root}2`, 0.3);
    },
  },

  salmon: {
    bpm: 168,
    bars: 8,
    chords: [
      ['F', ['A4', 'C5', 'F5']],
      ['C', ['G4', 'A#4', 'E5']],
      ['C', ['G4', 'A#4', 'E5']],
      ['F', ['A4', 'C5', 'F5']],
      ['F', ['A4', 'C5', 'F5']],
      ['A#', ['A#4', 'D5', 'F5']],
      ['C', ['G4', 'A#4', 'E5']],
      ['F', ['A4', 'C5', 'F5']],
    ],
    melody: [
      mel([[0, 'A5', 2], [2, 'C6', 2], [4, 'A5', 2], [6, 'F5', 2], [8, 'C5', 4], [12, 'F5', 4]]),
      mel([[0, 'G5', 2], [2, 'A#5', 2], [4, 'G5', 2], [6, 'E5', 2], [8, 'C5', 4], [12, 'E5', 4]]),
      mel([[0, 'G5', 2], [2, 'A5', 2], [4, 'A#5', 2], [6, 'C6', 2], [8, 'D6', 2], [10, 'C6', 2], [12, 'A#5', 2], [14, 'G5', 2]]),
      mel([[0, 'A5', 4], [4, 'F5', 4], [8, 'F5', 2], [10, 'G5', 2], [12, 'A5', 4]]),
      mel([[0, 'A5', 2], [2, 'C6', 2], [4, 'A5', 2], [6, 'F5', 2], [8, 'C5', 4], [12, 'F5', 4]]),
      mel([[0, 'D6', 2], [2, 'F6', 2], [4, 'D6', 2], [6, 'A#5', 2], [8, 'F5', 4], [12, 'A#5', 4]]),
      mel([[0, 'G5', 2], [2, 'A5', 2], [4, 'A#5', 2], [6, 'C6', 2], [8, 'D6', 2], [10, 'C6', 2], [12, 'A#5', 2], [14, 'G5', 2]]),
      mel([[0, 'F6', 4], [4, 'C6', 2], [6, 'A5', 2], [8, 'F5', 8]]),
    ],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      const fifth = { F: 'C', C: 'G', 'A#': 'F' }[root];
      if (st === 0) I.tuba(t, `${root}2`, s * 3);
      if (st === 8) I.tuba(t, `${fifth}2`, s * 3);
      if (st === 4 || st === 12) I.stab(t, chord, s * 1.4, 0.04);
      if (st === 0 || st === 8) I.kick(t, 0.5);
      if (st === 4 || st === 12) I.snare(t, 0.25);
      this.melody[bar].forEach(([ms, n, len]) => {
        if (ms === st) I.lead(t, n, s * len * 0.9, 0.06, 'square');
      });
    },
  },

  goose: {
    bpm: 76,
    bars: 4,
    chords: [
      ['C', ['C4', 'E4', 'G4', 'B4']],
      ['A', ['A3', 'C4', 'E4', 'G4']],
      ['F', ['F3', 'A3', 'C4', 'E4']],
      ['G', ['G3', 'B3', 'D4', 'E4']],
    ],
    bells: [['E6', 'G6'], ['C6', 'E6'], ['A5', 'C6'], ['B5', 'D6']],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      if (st === 0) {
        I.choir(t, chord.slice(0, 3), s * 16, 0.04);
        I.bass(t, `${root}2`, s * 15, 0.18, 'sine');
      }
      if (st % 2 === 0) I.pluck(t, chord[(st >> 1) % 4].replace(/(\d)/, (m) => String(+m + 1)), s * 3, 0.05);
      if (st === 0 || st === 8) I.bell(t, this.bells[bar][st === 0 ? 0 : 1], s * 6, 0.06);
    },
  },

  shop: {
    bpm: 104,
    bars: 4,
    chords: [
      ['C', ['E4', 'G4', 'B4', 'D5']],
      ['A', ['C#4', 'G4', 'B4', 'E5']],
      ['D', ['F4', 'A4', 'C5', 'E5']],
      ['G', ['F4', 'B4', 'D5', 'E5']],
    ],
    vibes: [
      mel([[0, 'G5', 3], [4, 'E5', 2], [6, 'D5', 2], [10, 'E5', 6]]),
      mel([[0, 'E5', 3], [4, 'C#5', 2], [6, 'B4', 2], [10, 'A4', 6]]),
      mel([[0, 'A5', 3], [4, 'F5', 2], [6, 'E5', 2], [10, 'D5', 6]]),
      mel([[0, 'D5', 2], [2, 'E5', 2], [4, 'F5', 2], [6, 'G5', 2], [8, 'B5', 8]]),
    ],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      const fifth = { C: 'G', A: 'E', D: 'A', G: 'D' }[root];
      if (st === 0 || st === 8) I.bass(t, `${root}2`, s * 2.5, 0.24, 'triangle');
      if (st === 6 || st === 14) I.bass(t, `${fifth}2`, s * 1.5, 0.2, 'triangle');
      if ([0, 3, 6, 10, 12].includes(st)) I.rhodes(t, chord, s * 2, 0.035);
      I.shaker(t, st % 2 ? 0.05 : 0.08);
      if (st === 3 || st === 10) audio.noise({ t, dur: 0.04, type: 'bandpass', f: 1800, q: 4, gain: 0.12, dest: audio.music });
      this.vibes[bar].forEach(([ms, n, len]) => {
        if (ms === st) I.bell(t, n, s * len, 0.05);
      });
    },
  },

  disco: {
    bpm: 122,
    bars: 4,
    chords: [
      ['A', ['A4', 'C5', 'E5', 'G5']],
      ['D', ['A4', 'C5', 'D5', 'F#5']],
      ['G', ['B4', 'D5', 'F#5']],
      ['C', ['C5', 'E5', 'G5', 'B5']],
    ],
    play(st, bar, t, s) {
      const [root, chord] = this.chords[bar];
      if (st % 4 === 0) I.kick(t, 0.85);
      if (st === 4 || st === 12) I.clap(t);
      if (st % 4 === 2) I.hat(t, 0.13, true);
      else I.hat(t, 0.05);
      if (st % 2 === 0) I.bass(t, `${root}${st % 4 === 0 ? 2 : 3}`, s * 1.4, 0.28);
      if (st === 2 || st === 7 || st === 10) I.stab(t, chord, s * 1.2, 0.035, 'sawtooth');
      if (st === 0) I.pad(t, chord, s * 16, 0.02, 2600);
    },
  },
};

class MusicPlayer {
  constructor() {
    this.song = null;
    this.name = null;
    this.step = 0;
    this.bar = 0;
    this.next = 0;
    this.intensity = 0;
    this.timer = null;
    this.pending = null;
  }
  play(name) {
    if (this.name === name) return;
    this.name = name;
    if (!audio.ctx) {
      this.pending = name;
      audio.onReady = () => {
        const n = this.pending;
        this.pending = null;
        this.name = null;
        if (n) this.play(n);
      };
      return;
    }
    this.song = SONGS[name] || null;
    this.step = 0;
    this.bar = 0;
    this.next = audio.now + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }
  stop() {
    this.song = null;
    this.name = null;
    this.pending = null;
  }
  setIntensity(x) {
    this.intensity = Math.max(0, Math.min(1, x));
  }
  tick() {
    if (!this.song || !audio.ctx) return;
    if (audio.ctx.state !== 'running') {
      this.next = audio.now + 0.05;
      return;
    }
    const s = 60 / this.song.bpm / 4;
    // if we fell far behind (tab hidden), resync instead of machine-gunning notes
    if (this.next < audio.now - 0.2) this.next = audio.now + 0.02;
    while (this.next < audio.now + 0.12) {
      try {
        this.song.play(this.step, this.bar, this.next, s, this.intensity);
      } catch (e) {
        // never let a bad note crash the game, but say so once
        if (!this.warned) {
          this.warned = true;
          console.warn('music error', this.name, e);
        }
      }
      this.next += s;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar = (this.bar + 1) % this.song.bars;
      }
    }
  }
}

export const music = new MusicPlayer();
