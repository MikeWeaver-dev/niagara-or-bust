// One shared requestAnimationFrame loop for all the little animated menu canvases.
const subs = new Set();
let raf = null;
let last = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  subs.forEach((fn) => {
    try {
      fn(now / 1000, dt);
    } catch (e) {
      /* keep other canvases alive */
    }
  });
}

export function subscribe(fn) {
  subs.add(fn);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return () => {
    subs.delete(fn);
    if (subs.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };
}

// Size a canvas to its CSS box at device resolution; returns {w,h,dpr}
export function fitCanvas(c, maxDpr = 2) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.floor(r.width));
  const h = Math.max(1, Math.floor(r.height));
  if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
  }
  return { w, h, dpr };
}
