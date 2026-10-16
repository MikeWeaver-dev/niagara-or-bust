// Vessel art: top-down (river) and side profile (drop). Coordinates in centimetres for the
// top-down view (scaled by S/100), metres for the side view (caller sets transform).
import { TAU, shade } from './util.js';
import { OUTLINE } from './charArt.js';

const ol = (ctx, lw) => {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};

// ---------------------------------------------------------------- TOP-DOWN (river)
// Draws vessel centred at origin, bow pointing up (-y). `occupant(ctx)` draws the rider at the seat.
// Returns nothing. opts: { t, damage (0..1), active (ability on), occupant, passenger }
export function drawCraftTop(ctx, craftId, S, opts = {}) {
  const { t = 0, damage = 0, active = false, occupant, passenger, dry = false } = opts;
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = Math.max(3, 200 / S);
  ol(ctx, lw);
  ripple.dry = dry;
  const bob = dry ? 0 : Math.sin(t * 3) * 2;
  const seat = (fn, x = 0, y = 0) => {
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(100 / S, 100 / S); // occupant draws in pixels via its own S
    fn(ctx);
    ctx.restore();
  };
  switch (craftId) {
    case 'nothing':
    case 'lifejacket':
    case 'salmon': {
      ripple(ctx, 0, 0, 55, t, lw);
      seat(occupant, 0, bob);
      break;
    }
    case 'surfboard': {
      ripple(ctx, 0, 10, 70, t, lw);
      ctx.save();
      ctx.rotate(0);
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(0, -110);
      ctx.bezierCurveTo(32, -70, 30, 70, 0, 95);
      ctx.bezierCurveTo(-30, 70, -32, -70, 0, -110);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff4f7b';
      ctx.fillRect(-4, -100, 8, 190);
      ctx.fillStyle = '#2bb6ff';
      ctx.beginPath();
      ctx.moveTo(-24, -20);
      ctx.lineTo(24, -10);
      ctx.lineTo(24, 4);
      ctx.lineTo(-24, -6);
      ctx.fill();
      cracks(ctx, damage, 25, 90, lw);
      ctx.restore();
      seat(occupant, 0, 20 + bob);
      break;
    }
    case 'barrel': {
      ripple(ctx, 0, 20, 72, t, lw);
      // barrel standing upright in the water seen from above/behind
      const w = 62;
      const h = 70;
      const g = ctx.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, '#6b3a17');
      g.addColorStop(0.35, '#b8732f');
      g.addColorStop(0.7, '#9a5a24');
      g.addColorStop(1, '#5a2f12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w * 0.9, -h * 0.3);
      ctx.quadraticCurveTo(-w * 1.08, h * 0.25, -w * 0.9, h * 0.75);
      ctx.lineTo(w * 0.9, h * 0.75);
      ctx.quadraticCurveTo(w * 1.08, h * 0.25, w * 0.9, -h * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,5,0.5)';
      ctx.lineWidth = lw * 0.6;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * w * 0.27, -h * 0.25);
        ctx.quadraticCurveTo(i * w * 0.31, h * 0.25, i * w * 0.27, h * 0.72);
        ctx.stroke();
      }
      ol(ctx, lw);
      ctx.fillStyle = '#3d3d48';
      [0.0, 0.5].forEach((y) => {
        ctx.beginPath();
        ctx.ellipse(0, y * h, w * 1.02, 9, 0, 0, Math.PI);
        ctx.lineTo(-w * 1.02, y * h - 5);
        ctx.ellipse(0, y * h - 5, w * 1.02, 9, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      // top lid ellipse
      ctx.fillStyle = '#c98a45';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3, w * 0.9, 24, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a1408';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3, w * 0.5, 14, 0, 0, TAU);
      ctx.fill();
      cracks(ctx, damage, 50, 60, lw);
      if (active) shine(ctx, t, 70);
      // occupant pokes head out of the hatch
      ctx.save();
      ctx.beginPath();
      ctx.rect(-200, -400, 400, 400 - h * 0.3 + 6);
      ctx.clip();
      seat(occupant, 0, -h * 0.3 + 4);
      ctx.restore();
      ctx.fillStyle = '#c98a45';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3 + 6, w * 0.5, 10, 0, 0, Math.PI);
      ctx.fill();
      break;
    }
    case 'kayak': {
      ripple(ctx, 0, 0, 80, t, lw);
      hull(ctx, 34, 150, '#ff4f2b', '#ffd23b', lw);
      cracks(ctx, damage, 25, 120, lw);
      ctx.fillStyle = '#1d1d24';
      ctx.beginPath();
      ctx.ellipse(0, 20, 20, 30, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      seat(occupant, 0, 30 + bob * 0.5);
      ctx.fillStyle = '#ff4f2b';
      ctx.beginPath();
      ctx.ellipse(0, 46, 22, 10, 0, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'canoe': {
      ripple(ctx, 0, 0, 95, t, lw);
      hull(ctx, 46, 175, '#2e8b57', '#1f5e3a', lw);
      ctx.fillStyle = '#d9a25a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 150, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#a87436';
      ctx.lineWidth = lw * 0.8;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 9, -130);
        ctx.lineTo(i * 9, 130);
        ctx.stroke();
      }
      ol(ctx, lw);
      cracks(ctx, damage, 35, 140, lw);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-34, -70, 68, 10);
      ctx.fillRect(-34, 60, 68, 10);
      seat(passenger, 0, -55 + bob * 0.4);
      seat(occupant, 0, 75 + bob * 0.4);
      break;
    }
    case 'hamster': {
      ripple(ctx, 0, 30, 95, t, lw);
      const R = 85;
      ctx.fillStyle = 'rgba(180,235,255,0.25)';
      ctx.beginPath();
      ctx.arc(0, -10, R, 0, TAU);
      ctx.fill();
      // inner frame lines spinning
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = lw * 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -10, R * Math.abs(Math.cos(t * 3 + i)), R, 0, 0, TAU);
        ctx.stroke();
      }
      seat(occupant, 0, 50);
      ol(ctx, lw);
      ctx.strokeStyle = 'rgba(30,60,90,0.9)';
      ctx.beginPath();
      ctx.arc(0, -10, R, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-R * 0.45, -R * 0.55, R * 0.3, R * 0.14, -0.6, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(R * 0.5, R * 0.2, R * 0.07, 0, TAU);
      ctx.fill();
      cracks(ctx, damage, 70, 70, lw);
      break;
    }
    case 'jetski': {
      ripple(ctx, 0, 0, 90, t, lw);
      // spray plume behind
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < (dry ? 0 : 6); i++) {
        ctx.beginPath();
        ctx.arc(Math.sin(t * 20 + i) * 18, 110 + i * 14, 14 - i * 1.5 + (active ? 6 : 0), 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -130);
      ctx.bezierCurveTo(50, -80, 48, 60, 36, 95);
      ctx.lineTo(-36, 95);
      ctx.bezierCurveTo(-48, 60, -50, -80, 0, -130);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8203a';
      ctx.beginPath();
      ctx.moveTo(0, -125);
      ctx.bezierCurveTo(30, -90, 34, -40, 26, -20);
      ctx.lineTo(-26, -20);
      ctx.bezierCurveTo(-34, -40, -30, -90, 0, -125);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d1d24';
      ctx.beginPath();
      ctx.ellipse(0, 40, 20, 46, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath();
      ctx.moveTo(-40, -15);
      ctx.lineTo(40, -15);
      ctx.stroke();
      ol(ctx, lw);
      cracks(ctx, damage, 35, 100, lw);
      if (active) {
        ctx.fillStyle = 'rgba(80,200,255,0.8)';
        [-20, 20].forEach((x) => {
          ctx.beginPath();
          ctx.moveTo(x - 8, 98);
          ctx.lineTo(x, 150 + Math.random() * 30);
          ctx.lineTo(x + 8, 98);
          ctx.fill();
        });
      }
      seat(occupant, 0, 45 + bob * 0.3);
      break;
    }
    case 'goose': {
      ripple(ctx, 0, 20, 110, t, lw);
      drawGooseTop(ctx, t, lw, active);
      seat(occupant, 0, 30 + bob * 0.4);
      // goose neck & head in front of rider
      gooseNeckTop(ctx, t, lw);
      break;
    }
    default:
      seat(occupant, 0, 0);
  }
  ctx.restore();
}

function ripple(ctx, x, y, r, t, lw) {
  if (ripple.dry) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = lw * 1.2;
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.8 + i * 0.5) % 1;
    ctx.globalAlpha = 0.7 * (1 - k);
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.8 + k * 0.6), r * 0.35 * (0.8 + k * 0.6), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function hull(ctx, w, h, color, trim, lw) {
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, shade(color, -0.35));
  g.addColorStop(0.4, color);
  g.addColorStop(0.6, shade(color, 0.2));
  g.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 1.2, -h * 0.5, w * 1.2, h * 0.5, 0, h);
  ctx.bezierCurveTo(-w * 1.2, h * 0.5, -w * 1.2, -h * 0.5, 0, -h);
  ctx.fill();
  ol(ctx, lw);
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.95);
  ctx.lineTo(0, -h * 0.45);
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(0, h * 0.95);
  ctx.stroke();
  ol(ctx, lw);
}

function cracks(ctx, damage, w, h, lw) {
  if (damage < 0.25) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,10,5,0.85)';
  ctx.lineWidth = lw * 0.8;
  const n = Math.floor(damage * 6);
  for (let i = 0; i < n; i++) {
    const x = (((i * 47) % 100) / 100 - 0.5) * w * 1.2;
    const y = (((i * 73) % 100) / 100 - 0.5) * h * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y + 10);
    ctx.lineTo(x + 3, y + 18);
    ctx.lineTo(x + 12, y + 26);
    ctx.stroke();
  }
  ctx.restore();
}

function shine(ctx, t, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,180,0.8)';
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.3;
  ctx.beginPath();
  ctx.arc(0, 10, r + 10, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawGooseTop(ctx, t, lw, flapping) {
  const flap = flapping ? Math.sin(t * 22) : Math.sin(t * 2) * 0.15;
  // wings
  [-1, 1].forEach((s) => {
    ctx.save();
    ctx.translate(s * 40, 10);
    ctx.rotate(s * (0.2 + flap * 0.7));
    const g = ctx.createLinearGradient(0, -40, s * 90, 40);
    g.addColorStop(0, '#ffe36b');
    g.addColorStop(1, '#d4a017');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(s * (90 + flap * 30), -20, s * (110 + flap * 40), 40);
    ctx.quadraticCurveTo(s * 50, 20, 0, 40);
    ctx.closePath();
    ctx.fill();
    ol(ctx, lw);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,110,10,0.6)';
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(s * k * 20, 0);
      ctx.lineTo(s * (k * 25 + 20), 35);
      ctx.stroke();
    }
    ctx.restore();
  });
  // body
  const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, 100);
  g.addColorStop(0, '#fff6b0');
  g.addColorStop(0.5, '#ffd23b');
  g.addColorStop(1, '#c48a00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 10, 62, 95, 0, 0, TAU);
  ctx.fill();
  ol(ctx, lw);
  ctx.stroke();
  // tail
  ctx.fillStyle = '#e8b400';
  ctx.beginPath();
  ctx.moveTo(-20, 95);
  ctx.lineTo(0, 130);
  ctx.lineTo(20, 95);
  ctx.fill();
  ctx.stroke();
  // sparkle
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const k = (t * 1.5) % 1;
  ctx.beginPath();
  ctx.arc(-30 + k * 60, -20 + k * 40, 4, 0, TAU);
  ctx.fill();
}

function gooseNeckTop(ctx, t, lw) {
  const sw = Math.sin(t * 2.5) * 6;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 30 + lw * 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.quadraticCurveTo(sw, -110, sw * 1.5, -150);
  ctx.stroke();
  ctx.strokeStyle = '#ffd23b';
  ctx.lineWidth = 30;
  ctx.stroke();
  ctx.fillStyle = '#ffdc4d';
  ol(ctx, lw);
  ctx.beginPath();
  ctx.arc(sw * 1.5, -160, 26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.moveTo(sw * 1.5 - 12, -178);
  ctx.lineTo(sw * 1.5, -205);
  ctx.lineTo(sw * 1.5 + 12, -178);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  [-11, 11].forEach((x) => {
    ctx.beginPath();
    ctx.arc(sw * 1.5 + x, -165, 4, 0, TAU);
    ctx.fill();
  });
  // tiny crown
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath();
  ctx.moveTo(sw * 1.5 - 14, -180);
  ctx.lineTo(sw * 1.5 - 14, -196);
  ctx.lineTo(sw * 1.5 - 6, -186);
  ctx.lineTo(sw * 1.5, -200);
  ctx.lineTo(sw * 1.5 + 6, -186);
  ctx.lineTo(sw * 1.5 + 14, -196);
  ctx.lineTo(sw * 1.5 + 14, -180);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Paddle helpers drawn inside an upright occupant (pixel space via `holding`)
export function kayakPaddle(t) {
  return (ctx, sk, lw) => {
    const a = Math.sin(t * 6) * 0.5;
    const cx = (sk.handL.x + sk.handR.x) / 2;
    const cy = (sk.handL.y + sk.handR.y) / 2;
    const L = 95 * sk.s;
    const dx = Math.cos(a) * L;
    const dy = Math.sin(a) * L;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6 * sk.s + lw * 2;
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6 * sk.s;
    ctx.stroke();
    [[-1, '#ffd23b'], [1, '#ffd23b']].forEach(([s, col]) => {
      ctx.save();
      ctx.translate(cx + s * dx, cy + s * dy);
      ctx.rotate(a);
      ctx.fillStyle = col;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 * sk.s, 9 * sk.s, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  };
}

export function canoePaddle(t, side = 1) {
  return (ctx, sk, lw) => {
    const ph = Math.sin(t * 5);
    const hx = side * (28 + ph * 6) * sk.s;
    const top = { x: hx - side * 4 * sk.s, y: -150 * sk.s + ph * 10 * sk.s };
    const bot = { x: hx + side * 16 * sk.s, y: -60 * sk.s + ph * 25 * sk.s };
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5 * sk.s + lw * 2;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bot.x, bot.y);
    ctx.stroke();
    ctx.strokeStyle = '#a0662a';
    ctx.lineWidth = 5 * sk.s;
    ctx.stroke();
    ctx.fillStyle = '#c98a45';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y + 8 * sk.s, 8 * sk.s, 16 * sk.s, -side * 0.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
  };
}

// ---------------------------------------------------------------- SIDE VIEW (drop)
// Drawn in metres, origin at body centre, +x = forward. lw in metres.
export function drawCraftSide(ctx, craftId, lw, opts = {}) {
  const { t = 0, broken = false, chute = 0, flap = 0 } = opts;
  ol(ctx, lw);
  switch (craftId) {
    case 'barrel': {
      const w = 0.62;
      const h = 0.95;
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, '#c98a45');
      g.addColorStop(0.5, '#a0612b');
      g.addColorStop(1, '#5a2f12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-h / 2, -w * 0.42);
      ctx.quadraticCurveTo(0, -w * 0.62, h / 2, -w * 0.42);
      ctx.lineTo(h / 2, w * 0.42);
      ctx.quadraticCurveTo(0, w * 0.62, -h / 2, w * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,5,0.55)';
      ctx.lineWidth = lw * 0.6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-h / 2, i * w * 0.17);
        ctx.quadraticCurveTo(0, i * w * 0.2, h / 2, i * w * 0.17);
        ctx.stroke();
      }
      ol(ctx, lw);
      ctx.fillStyle = '#3d3d48';
      [-0.3, 0.3].forEach((x) => {
        ctx.beginPath();
        ctx.rect(x * h - 0.035, -w * 0.56, 0.07, w * 1.12);
        ctx.fill();
        ctx.stroke();
      });
      break;
    }
    case 'kayak': {
      ctx.fillStyle = '#ff4f2b';
      ctx.beginPath();
      ctx.moveTo(-1.4, -0.02);
      ctx.quadraticCurveTo(-0.6, -0.2, 0, -0.18);
      ctx.quadraticCurveTo(0.6, -0.2, 1.45, -0.04);
      ctx.quadraticCurveTo(0.7, 0.22, 0, 0.2);
      ctx.quadraticCurveTo(-0.7, 0.22, -1.4, -0.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd23b';
      ctx.fillRect(-1.2, -0.04, 2.5, 0.06);
      ctx.fillStyle = '#1d1d24';
      ctx.beginPath();
      ctx.ellipse(-0.05, -0.18, 0.3, 0.06, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'canoe': {
      ctx.fillStyle = '#2e8b57';
      ctx.beginPath();
      ctx.moveTo(-1.65, -0.35);
      ctx.quadraticCurveTo(-1.5, 0.25, 0, 0.25);
      ctx.quadraticCurveTo(1.5, 0.25, 1.65, -0.35);
      ctx.quadraticCurveTo(0, -0.12, -1.65, -0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d9a25a';
      ctx.fillRect(-1.45, -0.2, 2.9, 0.05);
      break;
    }
    case 'jetski': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-1.0, 0.0);
      ctx.lineTo(-1.05, 0.22);
      ctx.lineTo(0.7, 0.22);
      ctx.quadraticCurveTo(1.15, 0.15, 1.2, -0.05);
      ctx.lineTo(0.4, -0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8203a';
      ctx.beginPath();
      ctx.moveTo(0.2, -0.1);
      ctx.lineTo(1.2, -0.05);
      ctx.quadraticCurveTo(0.9, -0.3, 0.35, -0.32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d1d24';
      ctx.beginPath();
      ctx.ellipse(-0.35, -0.06, 0.45, 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.moveTo(0.35, -0.3);
      ctx.lineTo(0.2, -0.6);
      ctx.lineTo(0.05, -0.6);
      ctx.stroke();
      ol(ctx, lw);
      break;
    }
    case 'surfboard': {
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(-1.0, 0);
      ctx.quadraticCurveTo(-0.9, -0.07, 0, -0.07);
      ctx.quadraticCurveTo(0.95, -0.07, 1.1, -0.01);
      ctx.quadraticCurveTo(0.9, 0.06, 0, 0.06);
      ctx.quadraticCurveTo(-0.9, 0.06, -1.0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff4f7b';
      ctx.fillRect(-0.9, -0.015, 1.9, 0.03);
      ctx.fillStyle = '#2bb6ff';
      ctx.beginPath();
      ctx.moveTo(-0.8, 0.05);
      ctx.lineTo(-0.9, 0.22);
      ctx.lineTo(-0.65, 0.06);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'goose': {
      drawGooseSide(ctx, lw, t, flap);
      break;
    }
    default:
      break;
  }
  if (broken) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-0.1, -0.2);
    ctx.lineTo(0.05, 0);
    ctx.lineTo(-0.05, 0.2);
    ctx.stroke();
  }
  return chute;
}

export function drawGooseSide(ctx, lw, t, flap = 0) {
  const f = Math.sin(t * (flap ? 18 : 3)) * (flap ? 1 : 0.15);
  ol(ctx, lw);
  // far wing
  ctx.save();
  ctx.translate(-0.1, -0.25);
  ctx.rotate(-0.3 - f * 0.9);
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.5, -0.9, -1.3, -1.1);
  ctx.quadraticCurveTo(-0.9, -0.3, -0.8, 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // body
  const g = ctx.createLinearGradient(0, -0.5, 0, 0.5);
  g.addColorStop(0, '#fff3a0');
  g.addColorStop(0.5, '#ffd23b');
  g.addColorStop(1, '#c48a00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.95, 0.5, 0.05, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.fillStyle = '#e8b400';
  ctx.beginPath();
  ctx.moveTo(-0.85, -0.1);
  ctx.lineTo(-1.3, -0.35);
  ctx.lineTo(-0.9, 0.1);
  ctx.fill();
  ctx.stroke();
  // neck + head
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.3 + lw * 2;
  ctx.beginPath();
  ctx.moveTo(0.65, -0.2);
  ctx.quadraticCurveTo(1.15, -0.5, 1.05, -1.0);
  ctx.stroke();
  ctx.strokeStyle = '#ffd23b';
  ctx.lineWidth = 0.3;
  ctx.stroke();
  ol(ctx, lw);
  ctx.fillStyle = '#ffdc4d';
  ctx.beginPath();
  ctx.arc(1.08, -1.1, 0.22, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.moveTo(1.25, -1.16);
  ctx.lineTo(1.6, -1.06);
  ctx.lineTo(1.25, -1.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(1.14, -1.16, 0.04, 0, TAU);
  ctx.fill();
  // crown
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath();
  ctx.moveTo(0.95, -1.28);
  ctx.lineTo(0.95, -1.46);
  ctx.lineTo(1.03, -1.36);
  ctx.lineTo(1.1, -1.5);
  ctx.lineTo(1.17, -1.36);
  ctx.lineTo(1.24, -1.46);
  ctx.lineTo(1.24, -1.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // near wing
  ctx.save();
  ctx.translate(0.1, -0.2);
  ctx.rotate(-0.2 - f * 1.1);
  const wg = ctx.createLinearGradient(0, 0, -1.4, -1);
  wg.addColorStop(0, '#ffe36b');
  wg.addColorStop(1, '#e8b400');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.5, -1.0, -1.45, -1.2);
  ctx.quadraticCurveTo(-1.0, -0.3, -0.9, 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,110,10,0.7)';
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.25, -k * 0.15);
    ctx.lineTo(-k * 0.3 - 0.2, -k * 0.3 - 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParachute(ctx, x, y, lw, open, t, torn = false) {
  // canopy centred at (x,y) in metres, opening factor 0..1
  const w = 2.6 * open;
  const h = 1.3 * open;
  if (open <= 0.02) return;
  ol(ctx, lw);
  const cols = ['#ff3b5c', '#ffffff', '#2bb6ff', '#ffffff', '#ffd23b', '#ffffff'];
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, w / 2, h, 0, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h, 0, Math.PI, TAU);
  ctx.stroke();
  // scalloped bottom edge
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x - w / 2, y - 0.05, w, 0.05);
  if (torn) {
    ctx.fillStyle = '#7ec8ff';
    ctx.beginPath();
    ctx.arc(x + w * 0.15, y - h * 0.5, h * 0.25, 0, TAU);
    ctx.arc(x - w * 0.2, y - h * 0.4, h * 0.18, 0, TAU);
    ctx.fill();
  }
  return t;
}
