// Shared HUD widgets drawn on the canvas: touch joystick, buttons, pills, bars.
import { TAU, bigText, roundRect, clamp } from './util.js';

export function drawJoystick(ctx, input) {
  const j = input.joy;
  if (!j.active) return;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(10,20,40,0.5)';
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(j.ox, j.oy, 55, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(j.ox + j.dx * 55, j.oy + j.dy * 55, 26, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawJoyHint(ctx, x, y, t) {
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.8;
  bigText(ctx, 'DRAG', x, y, 16);
  ctx.restore();
}

// btn: {x,y,r,label,down}, cd: 0..1 cooldown remaining fraction
export function drawButton(ctx, btn, { color = '#ff4f7b', cd = 0, pulse = 0, sub = null } = {}) {
  const { x, y, r } = btn;
  ctx.save();
  const s = btn.down ? 0.92 : 1 + pulse * 0.06;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(0, 5, r, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, lighten(color));
  g.addColorStop(1, color);
  ctx.fillStyle = cd > 0 ? '#555a66' : g;
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (cd > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd));
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.45, r * 0.5, r * 0.22, -0.3, 0, TAU);
  ctx.fill();
  const size = clamp(r * 0.36 * (8 / Math.max(6, btn.label.length)), 11, r * 0.42);
  bigText(ctx, btn.label, 0, sub ? -4 : 0, size);
  if (sub) bigText(ctx, sub, 0, r * 0.38, size * 0.55, '#ffe14d');
  ctx.restore();
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 70);
  const g = Math.min(255, ((n >> 8) & 255) + 70);
  const b = Math.min(255, (n & 255) + 70);
  return `rgb(${r},${g},${b})`;
}

export function pill(ctx, x, y, w, h, fill = 'rgba(10,15,40,0.65)', stroke = 'rgba(255,255,255,0.25)') {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,15,40,0.7)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + 2, y + 2, Math.max(0, (w - 4) * clamp(frac, 0, 1)), h - 4, (h - 4) / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  if (label) bigText(ctx, label, x + w / 2, y + h / 2 + 1, h * 0.75, '#fff', '#1a1030', 'center', 3);
  ctx.restore();
}

export function lumenIcon(ctx, x, y, r, t = 0) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  g.addColorStop(0, 'rgba(255,250,200,0.9)');
  g.addColorStop(1, 'rgba(255,220,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6b0';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t;
    const rr = i % 2 ? r * 0.55 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
