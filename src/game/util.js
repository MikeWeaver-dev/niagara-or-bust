export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));

// Deterministic RNG (mulberry32) so river chunks regenerate identically.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// distance from point to segment, returns {d, t, cx, cy}
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-6;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), t, cx, cy };
}

export function shade(hex, amt) {
  // amt -1..1 darken/lighten
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt < 0) {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Chunky outlined cartoon text
export function bigText(ctx, text, x, y, size, fill = '#fff', stroke = '#1a1030', align = 'center', lw = null) {
  ctx.save();
  ctx.font = `${size}px "Luckiest Guy", "Impact", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw ?? Math.max(3, size * 0.18);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
