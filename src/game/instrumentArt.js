// The band's instruments: hand-drawn SVGs (src/assets/instruments), rasterized once per size and cached,
// plus a microphone drawn from scratch. Images load on first use, so the menus never pay for them.
import keyboardUrl from '../assets/instruments/keyboard.svg?url';
import guitarUrl from '../assets/instruments/guitar.svg?url';
import trumpetUrl from '../assets/instruments/trumpet.svg?url';
import bassUrl from '../assets/instruments/bass.svg?url';
import drumsUrl from '../assets/instruments/drums.svg?url';
import { TAU } from './util.js';

const DEG = Math.PI / 180;
// w/h: SVG viewBox size. axis: angle of the neck/length in the drawing (0 = pointing right).
// span: length along that axis per unit of image width. color: stand-in until the image loads.
export const INSTRUMENTS = {
  keyboard: { url: keyboardUrl, w: 203.54, h: 53.55, axis: 0, span: 1, color: '#d0202a' },
  guitar: { url: guitarUrl, w: 187.83, h: 86.33, axis: -21 * DEG, span: 1.02, color: '#ff9a4a' },
  trumpet: { url: trumpetUrl, w: 80.48, h: 224.23, axis: -90 * DEG, span: 2.79, color: '#e8b84a' },
  bass: { url: bassUrl, w: 149.57, h: 100.48, axis: -31 * DEG, span: 1.09, color: '#3fd08e' },
  drums: { url: drumsUrl, w: 202.64, h: 165.78, axis: 0, span: 1, color: '#a8402e' },
};

const cache = {};

function entry(id) {
  let e = cache[id];
  if (!e) {
    const def = INSTRUMENTS[id];
    if (!def || typeof Image === 'undefined') return null;
    e = cache[id] = { img: new Image(), ok: false, sizes: {} };
    e.img.onload = () => (e.ok = true);
    e.img.src = def.url;
  }
  return e;
}

export function preloadInstrument(id) {
  if (INSTRUMENTS[id]) entry(id);
}

// true once the art for `id` can be drawn (anything that isn't an SVG instrument is always ready)
export function instrumentReady(id) {
  if (!INSTRUMENTS[id]) return true;
  const e = entry(id);
  return !!(e && e.ok);
}

// cached bitmap at least `px` wide (power-of-two buckets, so resizing the window doesn't thrash)
function bitmap(id, px) {
  const e = entry(id);
  if (!e || !e.ok) return null;
  const def = INSTRUMENTS[id];
  const w = Math.min(2048, Math.pow(2, Math.ceil(Math.log2(Math.max(64, px)))));
  if (!e.sizes[w]) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.max(1, Math.round((w * def.h) / def.w));
    c.getContext('2d').drawImage(e.img, 0, 0, c.width, c.height);
    e.sizes[w] = c;
  }
  return e.sizes[w];
}

// Draw instrument `id` centred on the origin, `width` units wide (in the current transform).
export function drawInstrument(ctx, id, width, { alpha = 1 } = {}) {
  const def = INSTRUMENTS[id];
  if (!def) return;
  const height = (width * def.h) / def.w;
  const m = ctx.getTransform();
  const px = width * Math.hypot(m.a, m.b);
  const bmp = bitmap(id, px);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  if (bmp) ctx.drawImage(bmp, -width / 2, -height / 2, width, height);
  else {
    // still loading: a quick silhouette in the right colour
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.42, height * 0.32, def.axis, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Same, but rotated so the instrument's length runs along +x and is `len` long.
export function drawInstrumentAlong(ctx, id, len, opts) {
  const def = INSTRUMENTS[id];
  if (!def) return;
  ctx.save();
  ctx.rotate(-def.axis);
  drawInstrument(ctx, id, len / def.span, opts);
  ctx.restore();
}

// ---------------------------------------------------------------- the microphone (from scratch)
// Giant handheld mic lying along +x: grille ball at the front, black handle, cable trailing back.
// Units are whatever the caller uses; `len` is the mic's length, `t` wiggles the cable.
export function drawMic(ctx, len, lw, t = 0, { cable = true } = {}) {
  const r = len * 0.16; // grille radius
  const hx = len * 0.5 - r; // grille centre
  const back = -len * 0.5;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (cable) {
    ctx.strokeStyle = '#141418';
    ctx.lineWidth = len * 0.035;
    ctx.beginPath();
    ctx.moveTo(back, 0);
    for (let i = 1; i <= 12; i++) {
      const u = i / 12;
      ctx.lineTo(back - u * len * 0.5, Math.sin(u * 9 - t * 5) * len * 0.05 * u);
    }
    ctx.stroke();
  }
  // handle: tapered black body
  const hg = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
  hg.addColorStop(0, '#5a5a66');
  hg.addColorStop(0.35, '#26262e');
  hg.addColorStop(1, '#0c0c10');
  ctx.fillStyle = hg;
  ctx.strokeStyle = '#1d1226';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(back, -r * 0.32);
  ctx.lineTo(hx - r * 0.7, -r * 0.62);
  ctx.lineTo(hx - r * 0.7, r * 0.62);
  ctx.lineTo(back, r * 0.32);
  ctx.quadraticCurveTo(back - r * 0.18, 0, back, -r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // band + on/off switch
  ctx.fillStyle = '#b8bcc6';
  ctx.fillRect(hx - r * 1.02, -r * 0.66, r * 0.3, r * 1.32);
  ctx.strokeRect(hx - r * 1.02, -r * 0.66, r * 0.3, r * 1.32);
  ctx.fillStyle = '#e8203a';
  ctx.fillRect(-len * 0.05, -r * 0.5, r * 0.32, r * 0.2);
  // grille
  const gg = ctx.createRadialGradient(hx - r * 0.35, -r * 0.35, r * 0.1, hx, 0, r);
  gg.addColorStop(0, '#ffffff');
  gg.addColorStop(0.45, '#c8ccd4');
  gg.addColorStop(1, '#6a6e78');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(hx, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, 0, r * 0.94, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,44,54,0.55)';
  ctx.lineWidth = Math.max(lw * 0.5, r * 0.05);
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(hx + k * r * 0.24 - r, -r);
    ctx.lineTo(hx + k * r * 0.24 + r, r);
    ctx.moveTo(hx + k * r * 0.24 + r, -r);
    ctx.lineTo(hx + k * r * 0.24 - r, r);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#3a3e48';
  ctx.lineWidth = lw * 1.2;
  ctx.beginPath();
  ctx.ellipse(hx, 0, r * 0.28, r * 0.98, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}
