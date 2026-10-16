// Minimal Verlet physics: points + distance sticks (breakable). Used for ragdolls & vessels.

export class Physics {
  constructor() {
    this.pts = [];
    this.sticks = [];
    this.gravity = 22;
    this.iterations = 10;
    this.collider = null; // (p, dt) => void
    this.constraints = []; // extra custom constraint fns
    this.onBreak = null;
  }

  point(x, y, o = {}) {
    const p = {
      x, y, px: x, py: y,
      im: o.mass === 0 ? 0 : 1 / (o.mass ?? 1),
      r: o.r ?? 0.07,
      fric: o.fric ?? 0.4,
      drag: o.drag ?? 0.01,
      buoy: o.buoy ?? 1,
      tag: o.tag ?? null,
      ax: 0, ay: 0,
      wet: false,
      hidden: false,
    };
    this.pts.push(p);
    return p;
  }

  stick(a, b, o = {}) {
    const len = o.len ?? Math.hypot(b.x - a.x, b.y - a.y);
    const s = {
      a, b, len,
      stiff: o.stiff ?? 1,
      broken: false,
      breakAt: o.breakAt ?? null,
      min: !!o.min,
      kind: o.kind || 'bone',
      part: o.part || null,
      width: o.width || 0,
    };
    this.sticks.push(s);
    return s;
  }

  setVel(p, vx, vy, dt) {
    p.px = p.x - vx * dt;
    p.py = p.y - vy * dt;
  }
  vel(p, dt) {
    return { x: (p.x - p.px) / dt, y: (p.y - p.py) / dt };
  }
  impulse(p, vx, vy, dt) {
    p.px -= vx * dt;
    p.py -= vy * dt;
  }

  step(dt) {
    const g = this.gravity;
    for (const p of this.pts) {
      if (p.im === 0) continue;
      const damp = 1 - p.drag;
      const vx = (p.x - p.px) * damp;
      const vy = (p.y - p.py) * damp;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + p.ax * dt * dt;
      p.y += vy + (g + p.ay) * dt * dt;
      p.ax = 0;
      p.ay = 0;
    }
    for (let it = 0; it < this.iterations; it++) {
      for (const s of this.sticks) {
        if (s.broken) continue;
        const a = s.a;
        const b = s.b;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        if (s.min && d >= s.len) continue;
        if (s.breakAt && d > s.len * s.breakAt) {
          s.broken = true;
          if (this.onBreak) this.onBreak(s);
          continue;
        }
        const w = a.im + b.im;
        if (w === 0) continue;
        const diff = ((d - s.len) / d) * s.stiff;
        const ox = dx * diff;
        const oy = dy * diff;
        a.x += ox * (a.im / w);
        a.y += oy * (a.im / w);
        b.x -= ox * (b.im / w);
        b.y -= oy * (b.im / w);
      }
      for (const c of this.constraints) c();
    }
    if (this.collider) for (const p of this.pts) if (p.im !== 0) this.collider(p, dt);
  }
}

// Rigid-ish box made of 4 points with diagonals
export function makeBox(phys, cx, cy, w, h, mass = 4, o = {}) {
  const m = mass / 4;
  const pts = [
    phys.point(cx - w / 2, cy - h / 2, { mass: m, r: o.r ?? 0.06, fric: o.fric ?? 0.3, buoy: o.buoy ?? 1.6, drag: o.drag ?? 0.008 }),
    phys.point(cx + w / 2, cy - h / 2, { mass: m, r: o.r ?? 0.06, fric: o.fric ?? 0.3, buoy: o.buoy ?? 1.6, drag: o.drag ?? 0.008 }),
    phys.point(cx + w / 2, cy + h / 2, { mass: m, r: o.r ?? 0.06, fric: o.fric ?? 0.3, buoy: o.buoy ?? 1.6, drag: o.drag ?? 0.008 }),
    phys.point(cx - w / 2, cy + h / 2, { mass: m, r: o.r ?? 0.06, fric: o.fric ?? 0.3, buoy: o.buoy ?? 1.6, drag: o.drag ?? 0.008 }),
  ];
  const sticks = [];
  for (let i = 0; i < 4; i++) sticks.push(phys.stick(pts[i], pts[(i + 1) % 4], { kind: 'frame' }));
  sticks.push(phys.stick(pts[0], pts[2], { kind: 'frame' }));
  sticks.push(phys.stick(pts[1], pts[3], { kind: 'frame' }));
  return {
    pts, sticks, w, h,
    get cx() { return (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4; },
    get cy() { return (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4; },
    get angle() { return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x); },
    // world position of a local point
    local(lx, ly) {
      const a = this.angle;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return { x: this.cx + lx * c - ly * s, y: this.cy + lx * s + ly * c };
    },
  };
}

// Soft ring (hamster ball): N rim points + hub with spokes
export function makeBall(phys, cx, cy, R, n = 12, mass = 3) {
  const hub = phys.point(cx, cy, { mass: mass * 0.3, r: 0.05, buoy: 2 });
  const rim = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    rim.push(phys.point(cx + Math.cos(a) * R, cy + Math.sin(a) * R, { mass: (mass * 0.7) / n, r: 0.08, fric: 0.15, buoy: 2.2, drag: 0.006 }));
  }
  const sticks = [];
  for (let i = 0; i < n; i++) {
    sticks.push(phys.stick(rim[i], rim[(i + 1) % n], { kind: 'frame' }));
    sticks.push(phys.stick(rim[i], rim[(i + 2) % n], { kind: 'frame', stiff: 0.6 }));
    sticks.push(phys.stick(hub, rim[i], { kind: 'frame', stiff: 0.35 }));
  }
  return {
    hub, rim, R, sticks,
    get cx() { return hub.x; },
    get cy() { return hub.y; },
    get angle() { return Math.atan2(rim[0].y - hub.y, rim[0].x - hub.x); },
  };
}

// Pin a ragdoll point to a body via a triangle of two sticks (relative placement locked)
export function attach(phys, p, a, b, o = {}) {
  return [phys.stick(p, a, { kind: 'attach', stiff: o.stiff ?? 0.9 }), phys.stick(p, b, { kind: 'attach', stiff: o.stiff ?? 0.9 })];
}
