// Recorded voice clips (the band's own death and survival noises), one picked at random per run.
// Only the two clips a run might need are downloaded, when the run starts, so nothing slows the menus.
import { audio } from './audio.js';

const URLS = {
  death: Object.values(import.meta.glob('../assets/sounds/death/*.m4a', { eager: true, query: '?url', import: 'default' })),
  survive: Object.values(import.meta.glob('../assets/sounds/survive/*.m4a', { eager: true, query: '?url', import: 'default' })),
};
const last = { death: -1, survive: -1 };
const ready = { death: null, survive: null }; // { url, bytes, buffer }

function pickIndex(kind) {
  const n = URLS[kind].length;
  if (n < 2) return 0;
  let i = Math.floor(Math.random() * n);
  if (i === last[kind]) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n; // never the same clip twice in a row
  last[kind] = i;
  return i;
}

async function load(kind) {
  const url = URLS[kind][pickIndex(kind)];
  const slot = { url, bytes: null, buffer: null };
  ready[kind] = slot;
  try {
    const res = await fetch(url);
    slot.bytes = await res.arrayBuffer();
    decode(slot);
  } catch {
    /* offline or blocked: play() falls back to an <audio> element */
  }
}

function decode(slot) {
  if (!slot.bytes || slot.buffer || slot.decoding || !audio.ctx) return;
  slot.decoding = true;
  audio.ctx.decodeAudioData(slot.bytes.slice(0), (b) => (slot.buffer = b), () => {});
}

export const clips = {
  // call when a run starts: fetch one random death clip and one random survival clip
  prepare() {
    if (!URLS.death.length && !URLS.survive.length) return;
    load('death');
    load('survive');
  },
  // play the prepared clip for 'death' or 'survive'. Returns its length in seconds (0 if nothing played).
  play(kind, { gain = 1, delay = 0 } = {}) {
    const slot = ready[kind];
    if (!slot || audio.sfxVol <= 0) return 0;
    ready[kind] = null; // one shot per run
    audio.unlock();
    decode(slot);
    if (slot.buffer && audio.ctx) {
      const c = audio.ctx;
      const src = c.createBufferSource();
      src.buffer = slot.buffer;
      const g = c.createGain();
      g.gain.value = 1.6 * gain; // voice memos are quiet next to the synth effects
      src.connect(g).connect(audio.sfx);
      src.start(c.currentTime + delay);
      return slot.buffer.duration + delay;
    }
    // not decoded yet (or no Web Audio): a plain audio element still works
    try {
      const el = new Audio(slot.url);
      el.volume = Math.min(1, audio.sfxVol * gain);
      setTimeout(() => el.play().catch(() => {}), delay * 1000);
    } catch {
      return 0;
    }
    return 2.5 + delay;
  },
};
