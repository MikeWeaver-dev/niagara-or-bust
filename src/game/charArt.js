// Character drawing: heads/faces with expressions, upright bodies (river + menus),
// salmon, Gary the canoe passenger, Annie's cat. All procedural vector art.
import { TAU, shade, rand } from './util.js';
import { RAINBOW } from '../data/characters.js';

export const OUTLINE = '#1d1226';

export const GARY = {
  id: 'gary',
  name: 'Gary',
  kind: 'human',
  gore: 'blood',
  voice: 0.9,
  scale: 1.02,
  headScale: 1,
  colors: { skin: '#e8b48a', hair: '#8a5a2b', shirt: '#22b8a6', shirt2: '#ff5a8a', collar: '#ffd23b', pants: '#e8d6a0', shoes: '#5a3a20', hat: '#000', hatBand: '#000', accent: '#ffd23b' },
  hat: 'none',
  extras: ['sunglasses', 'hawaiian', 'beard'],
};

// ---------------------------------------------------------------- heads
// Draws a head of radius r centred at the origin (caller translates/rotates).
// view: 'front' | 'side' (side faces +x). expr: happy|determined|scared|terrified|hurt|ko|dizzy|scream|cool
export function drawHead(ctx, ch, r, { expr = 'happy', t = 0, view = 'front', lw = 2, flip = false } = {}) {
  if (ch.kind === 'giraffe') return drawGiraffeHead(ctx, ch, r, { expr, t, view, lw });
  const c = ch.colors;
  const side = view === 'side';
  const fx = side ? r * 0.28 : 0; // face shift toward facing direction
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hair behind head
  ctx.fillStyle = c.hair;
  if (ch.id === 'annie') {
    ctx.beginPath();
    ctx.arc(side ? -r * 0.55 : 0, -r * 0.55, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  if (ch.extras.includes('beard') || ch.id === 'jean' || ch.id === 'bobby' || ch.id === 'gary') {
    ctx.beginPath();
    ctx.ellipse(side ? -r * 0.15 : 0, -r * 0.15, r * 1.04, r * 1.0, 0, Math.PI, TAU);
    ctx.fill();
  }

  // ears
  ctx.fillStyle = c.skin;
  if (!side) {
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.97, r * 0.05, r * 0.18, r * 0.24, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
  } else {
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, r * 0.05, r * 0.17, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // face
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // subtle shading
  ctx.fillStyle = 'rgba(120,40,40,0.10)';
  ctx.beginPath();
  ctx.arc(r * 0.18, r * 0.2, r * 0.82, 0, TAU);
  ctx.fill();

  // side hair / tufts
  ctx.fillStyle = c.hair;
  if (ch.id === 'annie') {
    [-1, 1].forEach((s) => {
      if (side && s < 0) return;
      ctx.beginPath();
      ctx.ellipse((side ? -r * 0.6 : s * r * 0.72), -r * 0.45, r * 0.42, r * 0.3, s * 0.4, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
  } else if (ch.id === 'timmy') {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.3 - r * 0.15 + fx, -r * 0.62);
      ctx.lineTo(i * r * 0.3 + fx, -r * 0.35);
      ctx.lineTo(i * r * 0.3 + r * 0.15 + fx, -r * 0.62);
      ctx.fill();
    }
  } else if (ch.id === 'bobby' || ch.id === 'jean' || ch.id === 'gary') {
    ctx.beginPath();
    ctx.ellipse(fx * 0.3, -r * 0.62, r * 0.9, r * 0.38, 0, Math.PI, TAU);
    ctx.fill();
    if (!side) {
      [-1, 1].forEach((s) => {
        ctx.fillRect(s * r * 0.92 - (s > 0 ? r * 0.16 : 0), -r * 0.55, r * 0.16, r * 0.55);
      });
    }
  }

  // ---- face features
  const ex = r * 0.36;
  const ey = -r * 0.08;
  const eyeR = r * (ch.id === 'timmy' ? 0.26 : 0.22);
  const eyes = side ? [fx + r * 0.05, fx + r * 0.5] : [-ex, ex];
  const eyeScale = side ? [0.75, 1] : [1, 1];
  const wob = Math.sin(t * 40) * r * 0.03;

  const drawEyeWhite = (x, k, big = 1) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, ey, eyeR * k * big, eyeR * 1.1 * big, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
  };

  ctx.lineWidth = lw * 0.9;
  if (expr === 'ko') {
    eyes.forEach((x, i) => {
      const k = eyeR * 0.8 * eyeScale[i];
      ctx.beginPath();
      ctx.moveTo(x - k, ey - k);
      ctx.lineTo(x + k, ey + k);
      ctx.moveTo(x + k, ey - k);
      ctx.lineTo(x - k, ey + k);
      ctx.stroke();
    });
  } else if (expr === 'dizzy') {
    eyes.forEach((x, i) => {
      drawEyeWhite(x, eyeScale[i]);
      ctx.beginPath();
      for (let a = 0; a < 10; a += 0.4) {
        const rr = (a / 10) * eyeR * 0.9;
        ctx.lineTo(x + Math.cos(a + t * 12) * rr, ey + Math.sin(a + t * 12) * rr);
      }
      ctx.stroke();
    });
  } else if (expr === 'hurt') {
    eyes.forEach((x, i) => {
      const k = eyeR * 0.8;
      const s = i === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - k * s, ey - k * 0.7);
      ctx.lineTo(x + k * s * 0.6, ey);
      ctx.lineTo(x - k * s, ey + k * 0.7);
      ctx.stroke();
    });
  } else if (expr === 'cool') {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85 + fx, ey - eyeR);
    ctx.lineTo(r * 0.85 + fx, ey - eyeR);
    ctx.lineTo(r * 0.7 + fx, ey + eyeR * 1.1);
    ctx.lineTo(r * 0.1 + fx, ey + eyeR * 0.9);
    ctx.lineTo(fx, ey);
    ctx.lineTo(-r * 0.1 + fx, ey + eyeR * 0.9);
    ctx.lineTo(-r * 0.7 + fx, ey + eyeR * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-r * 0.6 + fx, ey - eyeR * 0.6, r * 0.18, eyeR * 0.4);
  } else {
    const big = expr === 'terrified' || expr === 'scream' ? 1.3 : expr === 'scared' ? 1.12 : 1;
    const pupil = expr === 'terrified' || expr === 'scream' ? 0.3 : expr === 'scared' ? 0.42 : 0.55;
    eyes.forEach((x, i) => {
      drawEyeWhite(x + (expr === 'scream' ? wob : 0), eyeScale[i], big);
      ctx.fillStyle = '#1a1a2a';
      const px = x + (side ? eyeR * 0.3 : 0) + (expr === 'scared' ? Math.sin(t * 9) * eyeR * 0.2 : 0);
      ctx.beginPath();
      ctx.arc(px, ey + (expr === 'determined' ? eyeR * 0.15 : 0), eyeR * pupil * eyeScale[i], 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px - eyeR * 0.15, ey - eyeR * 0.2, eyeR * pupil * 0.35, 0, TAU);
      ctx.fill();
    });
  }

  // eyebrows
  ctx.strokeStyle = shade(c.hair, -0.4);
  ctx.lineWidth = lw * 1.1;
  const browY = ey - eyeR * 1.5;
  eyes.forEach((x, i) => {
    const s = side ? 1 : i === 0 ? -1 : 1; // outer side
    let inner = 0;
    if (expr === 'determined' || expr === 'hurt') inner = 0.35;
    if (expr === 'scared' || expr === 'terrified' || expr === 'scream') inner = -0.45;
    const lift = expr === 'terrified' || expr === 'scream' ? -eyeR * 0.5 : 0;
    const k = eyeR * 0.9;
    ctx.beginPath();
    ctx.moveTo(x - s * k, browY + lift + (side ? 0 : 0));
    ctx.lineTo(x + s * k * 0.9, browY + lift + inner * eyeR * (side ? 0 : 1) * -1);
    if (!side) {
      ctx.moveTo(x - s * k, browY + lift);
      ctx.lineTo(x + s * k * 0.9, browY + lift - inner * eyeR);
    }
    ctx.stroke();
  });
  ctx.strokeStyle = OUTLINE;

  // nose
  ctx.fillStyle = shade(c.skin, -0.12);
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  if (side) ctx.ellipse(r * 0.95, r * 0.12, r * 0.18, r * 0.14, 0, 0, TAU);
  else ctx.ellipse(fx, r * 0.18, r * 0.12, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // cheeks
  ctx.fillStyle = 'rgba(255,80,110,0.25)';
  (side ? [fx + r * 0.45] : [-r * 0.58, r * 0.58]).forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, r * 0.3, r * 0.17, r * 0.1, 0, 0, TAU);
    ctx.fill();
  });

  // extras
  if (ch.extras.includes('freckles')) {
    ctx.fillStyle = '#c47a4a';
    (side ? [0.4, 0.55, 0.7] : [-0.62, -0.5, -0.56, 0.5, 0.62, 0.56]).forEach((xx, i) => {
      ctx.beginPath();
      ctx.arc(xx * r + (side ? fx * 0.2 : 0), r * (0.22 + (i % 3) * 0.07), r * 0.035, 0, TAU);
      ctx.fill();
    });
  }
  if (ch.extras.includes('glasses') && expr !== 'cool') {
    ctx.strokeStyle = '#7a6a4a';
    ctx.lineWidth = lw * 0.6;
    eyes.forEach((x, i) => {
      ctx.beginPath();
      ctx.arc(x, ey, eyeR * 1.25 * eyeScale[i], 0, TAU);
      ctx.stroke();
    });
    if (!side) {
      ctx.beginPath();
      ctx.moveTo(-ex + eyeR * 1.2, ey);
      ctx.lineTo(ex - eyeR * 1.2, ey);
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
  }

  // mouth
  const my = r * 0.5;
  const mx = side ? r * 0.55 : fx;
  ctx.lineWidth = lw * 0.9;
  ctx.strokeStyle = OUTLINE;
  if (expr === 'terrified' || expr === 'scream') {
    const mw = r * (expr === 'scream' ? 0.36 : 0.28);
    const mh = r * (expr === 'scream' ? 0.36 : 0.28) + wob;
    ctx.fillStyle = '#3a0a14';
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.04, mw, mh, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff6a8a';
    ctx.beginPath();
    ctx.ellipse(mx, my + mh * 0.55, mw * 0.6, mh * 0.35, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - mw * 0.6, my + r * 0.04 - mh * 0.9, mw * 1.2, mh * 0.3);
  } else if (expr === 'scared') {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = mx - r * 0.25 + (i / 6) * r * 0.5;
      ctx.lineTo(x, my + (i % 2 ? r * 0.05 : -r * 0.03));
    }
    ctx.stroke();
  } else if (expr === 'hurt') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.rect(mx - r * 0.3, my - r * 0.08, r * 0.6, r * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(mx - r * 0.3 + i * r * 0.15, my - r * 0.08);
      ctx.lineTo(mx - r * 0.3 + i * r * 0.15, my + r * 0.1);
    }
    ctx.stroke();
  } else if (expr === 'ko' || expr === 'dizzy') {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.25, my);
    ctx.quadraticCurveTo(mx, my - r * 0.12, mx + r * 0.25, my);
    ctx.stroke();
    ctx.fillStyle = '#ff6a8a';
    ctx.beginPath();
    ctx.ellipse(mx + r * 0.08, my + r * 0.12, r * 0.1, r * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'determined') {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.25, my + r * 0.02);
    ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.08, mx + r * 0.28, my - r * 0.06);
    ctx.stroke();
  } else {
    // happy / cool: big grin
    ctx.fillStyle = '#5a1020';
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.34, my - r * 0.06);
    ctx.quadraticCurveTo(mx, my + r * 0.4, mx + r * 0.34, my - r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.28, my - r * 0.03);
    ctx.lineTo(mx + r * 0.28, my - r * 0.03);
    ctx.lineTo(mx + r * 0.22, my + r * 0.07);
    ctx.lineTo(mx - r * 0.22, my + r * 0.07);
    ctx.fill();
    if (ch.id === 'timmy') {
      ctx.fillStyle = '#5a1020';
      ctx.fillRect(mx + r * 0.02, my - r * 0.04, r * 0.09, r * 0.1);
    }
  }

  // mustaches / beard
  if (ch.extras.includes('mustache')) {
    ctx.fillStyle = c.hair;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    const y = my - r * 0.16;
    ctx.moveTo(mx, y);
    ctx.bezierCurveTo(mx - r * 0.3, y - r * 0.15, mx - r * 0.55, y + r * 0.05, mx - r * 0.62, y - r * 0.18);
    ctx.bezierCurveTo(mx - r * 0.6, y + r * 0.2, mx - r * 0.25, y + r * 0.14, mx, y + r * 0.06);
    ctx.bezierCurveTo(mx + r * 0.25, y + r * 0.14, mx + r * 0.6, y + r * 0.2, mx + r * 0.62, y - r * 0.18);
    ctx.bezierCurveTo(mx + r * 0.55, y + r * 0.05, mx + r * 0.3, y - r * 0.15, mx, y);
    ctx.fill();
    ctx.stroke();
  }
  if (ch.extras.includes('thinMustache')) {
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.3, my - r * 0.1);
    ctx.quadraticCurveTo(mx, my - r * 0.2, mx + r * 0.3, my - r * 0.1);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
  }
  if (ch.extras.includes('beard')) {
    ctx.fillStyle = shade(c.hair, -0.1);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.25, r * 0.5, r * 0.28, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (ch.extras.includes('sunglasses') && expr !== 'ko') {
    ctx.fillStyle = '#111';
    eyes.forEach((x, i) => {
      ctx.beginPath();
      ctx.ellipse(x, ey, eyeR * 1.35 * eyeScale[i], eyeR * 1.05, 0, 0, TAU);
      ctx.fill();
    });
    ctx.strokeStyle = '#111';
    ctx.lineWidth = lw;
    if (!side) {
      ctx.beginPath();
      ctx.moveTo(-ex, ey);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    eyes.forEach((x) => ctx.fillRect(x - eyeR * 0.8, ey - eyeR * 0.6, eyeR * 0.5, eyeR * 0.3));
    ctx.strokeStyle = OUTLINE;
  }

  // sweat when scared
  if (expr === 'scared' || expr === 'terrified' || expr === 'scream') {
    ctx.fillStyle = '#9fe3ff';
    ctx.lineWidth = lw * 0.6;
    const sx = (side ? -r * 0.2 : r * 0.85) + Math.sin(t * 3) * r * 0.02;
    const sy = -r * 0.45 + ((t * 0.8) % 1) * r * 0.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.18);
    ctx.quadraticCurveTo(sx + r * 0.12, sy, sx, sy + r * 0.06);
    ctx.quadraticCurveTo(sx - r * 0.12, sy, sx, sy - r * 0.18);
    ctx.fill();
    ctx.stroke();
  }

  drawHat(ctx, ch, r, { view, lw, t });
}

function drawHat(ctx, ch, r, { view, lw, t }) {
  const c = ch.colors;
  const side = view === 'side';
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  switch (ch.hat) {
    case 'victorian': {
      // wide brim + crown + purple band + flowers + feather
      ctx.fillStyle = c.hat;
      ctx.beginPath();
      ctx.ellipse(side ? -r * 0.1 : 0, -r * 0.72, r * 1.45, r * 0.32, side ? -0.15 : 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.78);
      ctx.bezierCurveTo(-r * 0.8, -r * 1.55, r * 0.8, -r * 1.55, r * 0.75, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.hatBand;
      ctx.fillRect(-r * 0.76, -r * 1.0, r * 1.52, r * 0.18);
      // feather
      ctx.strokeStyle = '#f5e6ff';
      ctx.lineWidth = lw * 2.2;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 1.0);
      ctx.quadraticCurveTo(r * 1.2 + Math.sin(t * 4) * r * 0.1, -r * 1.7, r * 1.6, -r * 1.3);
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      // flowers
      [[-0.45, '#ff6fb5'], [-0.15, '#c86bff'], [0.18, '#ffd23b']].forEach(([x, col]) => {
        ctx.fillStyle = col;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          ctx.beginPath();
          ctx.arc(x * r + Math.cos(a) * r * 0.09, -r * 0.92 + Math.sin(a) * r * 0.09, r * 0.08, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x * r, -r * 0.92, r * 0.05, 0, TAU);
        ctx.fill();
      });
      break;
    }
    case 'cap': {
      ctx.fillStyle = c.hat;
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, r * 0.98, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // backwards brim peeking out behind
      ctx.fillStyle = shade(c.hat, -0.25);
      ctx.beginPath();
      if (side) ctx.ellipse(-r * 1.05, -r * 0.42, r * 0.5, r * 0.14, 0.2, 0, TAU);
      else ctx.ellipse(r * 0.0, -r * 1.05, r * 0.55, r * 0.16, 0, Math.PI, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.hatBand;
      ctx.beginPath();
      ctx.arc(0, -r * 1.27, r * 0.1, 0, TAU);
      ctx.fill();
      // strap opening
      ctx.fillStyle = c.hatBand;
      ctx.fillRect(-r * 0.25, -r * 0.48, r * 0.5, r * 0.12);
      break;
    }
    case 'bowler': {
      ctx.fillStyle = c.hat;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.68, r * 1.12, r * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.72, r * 0.78, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.hatBand;
      ctx.fillRect(-r * 0.78, -r * 0.86, r * 1.56, r * 0.14);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 1.12, r * 0.25, r * 0.12, -0.4, 0, TAU);
      ctx.fill();
      break;
    }
    case 'beret': {
      ctx.fillStyle = c.hat;
      ctx.beginPath();
      ctx.ellipse(side ? r * 0.1 : r * 0.15, -r * 0.82, r * 1.05, r * 0.34, side ? 0.25 : 0.18, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 1.12);
      ctx.lineTo(r * 0.2, -r * 1.3);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function drawGiraffeHead(ctx, ch, r, { expr, t, view, lw }) {
  const c = ch.colors;
  const side = view === 'side';
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  // ossicones
  [-1, 1].forEach((s) => {
    const x = side ? -r * 0.25 + s * r * 0.22 : s * r * 0.35;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw * 2.6;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.6);
    ctx.lineTo(x + s * r * 0.08, -r * 1.25);
    ctx.stroke();
    ctx.strokeStyle = c.skin;
    ctx.lineWidth = lw * 1.4;
    ctx.stroke();
    ctx.fillStyle = c.hair;
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(x + s * r * 0.08, -r * 1.3, r * 0.17, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  // ears
  [-1, 1].forEach((s) => {
    if (side && s > 0) return;
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.ellipse(side ? -r * 0.75 : s * r * 0.95, -r * 0.35, r * 0.42, r * 0.17, side ? -0.5 : s * 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb3d1';
    ctx.beginPath();
    ctx.ellipse(side ? -r * 0.75 : s * r * 0.95, -r * 0.35, r * 0.25, r * 0.08, side ? -0.5 : s * 0.5, 0, TAU);
    ctx.fill();
  });
  // head + muzzle
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  if (side) {
    ctx.ellipse(0, 0, r * 0.85, r * 0.8, 0, 0, TAU);
  } else {
    ctx.ellipse(0, 0, r * 0.85, r * 0.85, 0, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  // rainbow spots on head
  RAINBOW.slice(0, 4).forEach((col, i) => {
    ctx.fillStyle = col;
    const a = i * 1.6 + 0.6;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.45 - (side ? r * 0.2 : 0), Math.sin(a) * r * 0.4 - r * 0.3, r * 0.14, r * 0.11, a, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = shade(c.skin, 0.25);
  ctx.beginPath();
  if (side) ctx.ellipse(r * 0.75, r * 0.3, r * 0.65, r * 0.45, 0.1, 0, TAU);
  else ctx.ellipse(0, r * 0.55, r * 0.6, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // nostrils
  ctx.fillStyle = OUTLINE;
  (side ? [r * 1.15] : [-r * 0.2, r * 0.2]).forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, side ? r * 0.18 : r * 0.48, r * 0.06, r * 0.09, 0, 0, TAU);
    ctx.fill();
  });
  // eyes with lashes
  const eyes = side ? [r * 0.25] : [-r * 0.36, r * 0.36];
  const ey = -r * 0.15;
  eyes.forEach((x) => {
    if (expr === 'ko') {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.15, ey - r * 0.15);
      ctx.lineTo(x + r * 0.15, ey + r * 0.15);
      ctx.moveTo(x + r * 0.15, ey - r * 0.15);
      ctx.lineTo(x - r * 0.15, ey + r * 0.15);
      ctx.stroke();
      return;
    }
    const big = expr === 'terrified' || expr === 'scream' ? 1.3 : 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, ey, r * 0.2 * big, r * 0.24 * big, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    ctx.fillStyle = '#2a1840';
    ctx.beginPath();
    ctx.arc(x + (side ? r * 0.06 : 0), ey + r * 0.03, r * (big > 1 ? 0.07 : 0.12), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.03, ey - r * 0.04, r * 0.04, 0, TAU);
    ctx.fill();
    // lashes
    ctx.lineWidth = lw * 0.8;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.1, ey - r * 0.22 * big);
      ctx.lineTo(x + k * r * 0.16, ey - r * 0.38 * big);
      ctx.stroke();
    }
  });
  // mouth
  ctx.lineWidth = lw * 0.9;
  const mx = side ? r * 0.9 : 0;
  const my = side ? r * 0.55 : r * 0.78;
  if (expr === 'terrified' || expr === 'scream') {
    ctx.fillStyle = '#3a0a14';
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 0.22, r * 0.18 + Math.sin(t * 40) * r * 0.03, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.25, my - r * 0.05);
    ctx.quadraticCurveTo(mx, my + r * 0.12, mx + r * 0.25, my - r * 0.05);
    ctx.stroke();
  }
  // mane tuft
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(side ? -r * 0.4 : 0, -r * 0.8, r * 0.25, r * 0.15, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------- upright bodies
// Skeleton in centimetres, origin at the feet (or seat), y negative = up.
function skeleton(ch, pose, t, o) {
  const s = ch.scale * (o.tiny ? 0.65 : 1);
  const P = (x, y) => ({ x: x * s, y: y * s });
  const sk = {
    footL: P(-9, 0), footR: P(9, 0),
    kneeL: P(-9, -44), kneeR: P(9, -44),
    hipL: P(-10, -86), hipR: P(10, -86),
    pelvis: P(0, -88),
    shL: P(-19, -134), shR: P(19, -134),
    neck: P(0, -140),
    head: P(0, -140 - 17 * ch.headScale * (o.bigHead ? 1.8 : 1)),
    headR: 15 * s * ch.headScale * (o.bigHead ? 1.9 : 1),
    s,
  };
  if (ch.id === 'timmy') sk.headR *= 1.0;
  const bob = Math.sin(t * 2.2) * 1.2 * s;
  let aL = 0.22;
  let aR = 0.22;
  let bL = 0.15;
  let bR = 0.15;
  let legPhase = 0;
  let legAmt = 0;
  switch (pose) {
    case 'walk':
    case 'run': {
      const sp = pose === 'run' ? 14 : 9;
      legPhase = t * sp;
      legAmt = pose === 'run' ? 1 : 0.6;
      aL = 0.25 + Math.sin(legPhase) * 0.5 * legAmt;
      aR = 0.25 - Math.sin(legPhase) * 0.5 * legAmt;
      bL = bR = 0.6;
      break;
    }
    case 'cheer':
      aL = aR = 2.7 + Math.sin(t * 10) * 0.2;
      bL = bR = 0.2;
      break;
    case 'flail':
      aL = 1.6 + Math.sin(t * 19) * 1.1;
      aR = 1.6 + Math.sin(t * 17 + 2) * 1.1;
      bL = Math.sin(t * 23) * 0.9;
      bR = Math.sin(t * 21 + 1) * 0.9;
      legPhase = t * 20;
      legAmt = 0.8;
      break;
    case 'wave':
      aL = 0.3;
      aR = 2.5;
      bR = 0.4 + Math.sin(t * 12) * 0.5;
      break;
    case 'swim':
      aL = (t * 7) % TAU;
      aR = (t * 7 + Math.PI) % TAU;
      bL = bR = 0.3;
      break;
    case 'dog':
      aL = 1.4 + Math.sin(t * 9) * 0.5;
      aR = 1.4 + Math.sin(t * 9 + Math.PI) * 0.5;
      bL = bR = 1.2;
      break;
    case 'arms-out':
      aL = aR = 1.45 + Math.sin(t * 3) * 0.15;
      bL = bR = 0.1;
      break;
    case 'hold':
      aL = aR = 0.9;
      bL = bR = 1.3;
      break;
    case 'limp':
      aL = aR = 0.5;
      bL = bR = 0.3;
      break;
    default:
      break;
  }
  if (o.armL !== undefined) aL = o.armL;
  if (o.armR !== undefined) aR = o.armR;
  if (o.bendL !== undefined) bL = o.bendL;
  if (o.bendR !== undefined) bR = o.bendR;
  const up = 26 * s;
  const lo = 24 * s;
  // a = upper-arm angle from straight down (rotating outward), b = extra elbow bend
  const arm = (sh, a, b, side) => {
    const el = { x: sh.x + side * Math.sin(a) * up, y: sh.y + Math.cos(a) * up };
    const a2 = a + b;
    const hand = { x: el.x + side * Math.sin(a2) * lo, y: el.y + Math.cos(a2) * lo };
    return { el, hand };
  };
  const L = arm(sk.shL, aL, bL, -1);
  const R = arm(sk.shR, aR, bR, 1);
  sk.elL = L.el;
  sk.handL = L.hand;
  sk.elR = R.el;
  sk.handR = R.hand;
  if (legAmt) {
    const lift = (ph) => Math.max(0, Math.sin(ph)) * 10 * s * legAmt;
    sk.footL = { x: sk.footL.x, y: -lift(legPhase) };
    sk.footR = { x: sk.footR.x, y: -lift(legPhase + Math.PI) };
    sk.kneeL = { x: sk.kneeL.x - lift(legPhase) * 0.3, y: sk.kneeL.y - lift(legPhase) * 0.6 };
    sk.kneeR = { x: sk.kneeR.x + lift(legPhase + Math.PI) * 0.3, y: sk.kneeR.y - lift(legPhase + Math.PI) * 0.6 };
  }
  // body bob (everything above the feet)
  ['kneeL', 'kneeR', 'hipL', 'hipR', 'pelvis', 'shL', 'shR', 'neck', 'head', 'elL', 'elR', 'handL', 'handR'].forEach((k) => {
    sk[k] = { x: sk[k].x, y: sk[k].y + (k.startsWith('knee') ? bob * 0.3 : bob) };
  });
  return sk;
}

const limb = (ctx, a, b, w, color, lw) => {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + lw * 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
};

// Draws a character standing at the current origin. S = pixels per metre.
// opts: { pose, expr, t, cutY (cm, hide below), bigHead, tiny, lifejacket, armL/armR..., holding }
export function drawUpright(ctx, ch, S, opts = {}) {
  const { pose = 'stand', expr = 'happy', t = 0 } = opts;
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = opts.lw ?? Math.max(3, 200 / S);
  if (ch.kind === 'giraffe') {
    drawGiraffeUpright(ctx, ch, lw, opts);
    ctx.restore();
    return;
  }
  const sk = skeleton(ch, pose, t, opts);
  const c = ch.colors;
  const s = sk.s;
  if (opts.cutY !== undefined) {
    ctx.beginPath();
    ctx.rect(-400, -600, 800, 600 + opts.cutY);
    ctx.clip();
  }
  // legs
  const legW = (ch.id === 'bobby' ? 14 : 11) * s;
  if (!ch.dress) {
    limb(ctx, sk.hipL, sk.kneeL, legW, c.pants, lw);
    limb(ctx, sk.kneeL, sk.footL, legW * 0.9, ch.id === 'timmy' ? c.skin : c.pants, lw);
    limb(ctx, sk.hipR, sk.kneeR, legW, c.pants, lw);
    limb(ctx, sk.kneeR, sk.footR, legW * 0.9, ch.id === 'timmy' ? c.skin : c.pants, lw);
  } else {
    limb(ctx, sk.kneeL, sk.footL, 8 * s, '#3a3040', lw);
    limb(ctx, sk.kneeR, sk.footR, 8 * s, '#3a3040', lw);
  }
  // shoes
  ctx.fillStyle = c.shoes;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  [sk.footL, sk.footR].forEach((f, i) => {
    ctx.beginPath();
    ctx.ellipse(f.x + (i ? 3 : -3) * s, f.y - 2 * s, 9 * s, 5.5 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });

  // torso
  const tw = (ch.id === 'bobby' ? 46 : ch.id === 'timmy' ? 34 : 38) * s;
  const top = sk.shL.y - 4 * s;
  const bot = sk.pelvis.y + 6 * s;
  if (ch.dress) {
    // long Victorian skirt
    ctx.fillStyle = c.shirt;
    ctx.beginPath();
    ctx.moveTo(-tw * 0.45, sk.pelvis.y - 8 * s);
    ctx.lineTo(tw * 0.45, sk.pelvis.y - 8 * s);
    ctx.quadraticCurveTo(tw * 0.85, -30 * s, tw * 0.95, -14 * s);
    ctx.lineTo(-tw * 0.95, -14 * s);
    ctx.quadraticCurveTo(-tw * 0.85, -30 * s, -tw * 0.45, sk.pelvis.y - 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.shirt2;
    ctx.lineWidth = lw * 0.8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tw * 0.12, sk.pelvis.y);
      ctx.lineTo(i * tw * 0.3, -16 * s);
      ctx.stroke();
    }
    ctx.fillStyle = c.accent;
    ctx.fillRect(-tw * 0.95, -22 * s, tw * 1.9, 5 * s);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
  }
  ctx.fillStyle = c.shirt;
  ctx.beginPath();
  ctx.moveTo(-tw / 2, top + 6 * s);
  ctx.quadraticCurveTo(-tw / 2, top, -tw / 2 + 8 * s, top);
  ctx.lineTo(tw / 2 - 8 * s, top);
  ctx.quadraticCurveTo(tw / 2, top, tw / 2, top + 6 * s);
  ctx.lineTo(tw / 2 - 3 * s, bot);
  ctx.lineTo(-tw / 2 + 3 * s, bot);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (ch.extras.includes('stripes') || ch.extras.includes('breton')) {
    ctx.fillStyle = c.shirt2;
    const step = ch.extras.includes('breton') ? 7 * s : 9 * s;
    for (let y = top + step * 0.5; y < bot; y += step * 2) ctx.fillRect(-tw, y, tw * 2, step);
  }
  if (ch.extras.includes('hawaiian')) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? c.shirt2 : c.collar;
      const fx = ((i * 37) % 40) - 20;
      const fy = top + ((i * 23) % 40);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ctx.beginPath();
        ctx.arc((fx + Math.cos(a) * 3) * s, fy * 1 + Math.sin(a) * 3 * s, 2.4 * s, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(tw * 0.15, top, tw, bot - top);
  ctx.restore();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
  if (ch.dress) {
    // lace collar + buttons
    ctx.fillStyle = c.collar;
    ctx.beginPath();
    ctx.ellipse(0, top + 3 * s, 12 * s, 6 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8d27a';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, top + 13 * s + i * 8 * s, 1.8 * s, 0, TAU);
      ctx.fill();
    }
  }
  if (ch.extras.includes('scarf')) {
    ctx.fillStyle = c.collar;
    ctx.beginPath();
    ctx.ellipse(0, top + 2 * s, 13 * s, 5 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 * s, top + 4 * s);
    ctx.lineTo(14 * s + Math.sin(t * 6) * 3 * s, top + 22 * s);
    ctx.lineTo(8 * s, top + 22 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (ch.id === 'bobby') {
    ctx.fillStyle = '#2a1d16';
    ctx.fillRect(-tw / 2 + 3 * s, bot - 9 * s, tw - 6 * s, 6 * s);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(-4 * s, bot - 9 * s, 8 * s, 6 * s);
  }
  if (opts.lifejacket) {
    ctx.fillStyle = '#ff7a1a';
    [-1, 1].forEach((sd) => {
      ctx.beginPath();
      ctx.moveTo(sd * 3 * s, top - 2 * s);
      ctx.lineTo(sd * tw * 0.58, top + 2 * s);
      ctx.lineTo(sd * tw * 0.55, bot - 4 * s);
      ctx.lineTo(sd * 4 * s, bot - 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-tw * 0.55, top + 22 * s, tw * 1.1, 4 * s);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(-3 * s, top + 8 * s, 6 * s, 26 * s);
  }

  // arms
  const armW = (ch.extras.includes('muscles') ? 13 : 9) * s;
  const sleeve = ch.dress ? c.shirt : ch.id === 'bobby' ? c.skin : c.shirt;
  [[sk.shL, sk.elL, sk.handL], [sk.shR, sk.elR, sk.handR]].forEach(([sh, el, hd]) => {
    limb(ctx, sh, el, armW, sleeve, lw);
    limb(ctx, el, hd, armW * 0.85, ch.dress || ch.id === 'jean' ? c.skin : c.skin, lw);
    ctx.fillStyle = c.skin;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(hd.x, hd.y, armW * 0.62, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  if (ch.id === 'timmy' && pose !== 'swim' && pose !== 'flail') {
    // juice box
    ctx.fillStyle = '#5ad16b';
    ctx.fillRect(sk.handR.x - 4 * s, sk.handR.y - 12 * s, 8 * s, 11 * s);
    ctx.strokeRect(sk.handR.x - 4 * s, sk.handR.y - 12 * s, 8 * s, 11 * s);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(sk.handR.x + 2 * s, sk.handR.y - 12 * s);
    ctx.lineTo(sk.handR.x + 4 * s, sk.handR.y - 18 * s);
    ctx.stroke();
  }
  if (opts.holding) opts.holding(ctx, sk, lw);

  // neck + head
  limb(ctx, { x: 0, y: sk.neck.y + 6 * s }, sk.neck, 10 * s, c.skin, lw);
  ctx.save();
  ctx.translate(sk.head.x, sk.head.y);
  ctx.rotate(Math.sin(t * 1.7) * 0.05 + (pose === 'flail' ? Math.sin(t * 13) * 0.2 : 0));
  drawHead(ctx, ch, sk.headR, { expr, t, view: 'front', lw });
  ctx.restore();
  ctx.restore();
  return sk;
}

function drawGiraffeUpright(ctx, ch, lw, opts) {
  const { pose = 'stand', expr = 'happy', t = 0 } = opts;
  const s = ch.scale * (opts.tiny ? 0.65 : 1);
  const c = ch.colors;
  const walk = pose === 'walk' || pose === 'run';
  const ph = t * (pose === 'run' ? 14 : 8);
  const seated = opts.cutY !== undefined;
  const bob = Math.sin(t * 2) * 1.5 * s;
  if (seated) {
    ctx.beginPath();
    ctx.rect(-400, -700, 800, 700 + opts.cutY);
    ctx.clip();
  }
  const bodyY = -110 * s + bob;
  // legs (4)
  const legs = [
    [-30, 0.0, true], [30, Math.PI, true], [-22, Math.PI, false], [38, 0, false],
  ];
  legs.forEach(([x, off, back]) => {
    const lift = walk ? Math.max(0, Math.sin(ph + off)) * 12 * s : pose === 'flail' ? Math.sin(t * 20 + off) * 10 * s : 0;
    const col = back ? shade(c.skin, -0.12) : c.skin;
    limb(ctx, { x: x * s, y: bodyY + 10 * s }, { x: x * s + (walk ? Math.sin(ph + off) * 6 * s : 0), y: -48 * s - lift * 0.5 }, 11 * s, col, lw);
    limb(ctx, { x: x * s + (walk ? Math.sin(ph + off) * 6 * s : 0), y: -48 * s - lift * 0.5 }, { x: x * s, y: -4 * s - lift }, 9 * s, col, lw);
    ctx.fillStyle = c.shoes;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(x * s, -3 * s - lift, 7 * s, 5 * s, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  // tail
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw * 1.5;
  ctx.beginPath();
  ctx.moveTo(-50 * s, bodyY - 5 * s);
  ctx.quadraticCurveTo(-68 * s, bodyY + 10 * s, -62 * s + Math.sin(t * 5) * 5 * s, bodyY + 35 * s);
  ctx.stroke();
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(-62 * s + Math.sin(t * 5) * 5 * s, bodyY + 38 * s, 5 * s, 9 * s, 0, 0, TAU);
  ctx.fill();
  // body
  ctx.fillStyle = c.skin;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 58 * s, 30 * s, -0.08, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  RAINBOW.forEach((col, i) => {
    ctx.fillStyle = col;
    const x = -45 + i * 15;
    ctx.beginPath();
    ctx.ellipse(x * s, bodyY + ((i % 2) * 14 - 7) * s, 8 * s, 7 * s, i, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
  // neck
  const sway = Math.sin(t * 1.8) * 6 * s + (pose === 'flail' ? Math.sin(t * 15) * 18 * s : 0);
  const n0 = { x: 40 * s, y: bodyY - 12 * s };
  const n1 = { x: 52 * s + sway * 0.4, y: bodyY - 70 * s };
  const n2 = { x: 58 * s + sway, y: bodyY - 125 * s * (opts.bigHead ? 0.9 : 1) };
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.moveTo(n0.x - 16 * s, n0.y);
  ctx.quadraticCurveTo(n1.x - 12 * s, n1.y, n2.x - 8 * s, n2.y);
  ctx.lineTo(n2.x + 8 * s, n2.y);
  ctx.quadraticCurveTo(n1.x + 12 * s, n1.y, n0.x + 20 * s, n0.y + 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // mane
  ctx.strokeStyle = c.hair;
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(n0.x - 16 * s, n0.y);
  ctx.quadraticCurveTo(n1.x - 12 * s, n1.y, n2.x - 8 * s, n2.y);
  ctx.stroke();
  // neck spots
  RAINBOW.forEach((col, i) => {
    const k = (i + 0.5) / RAINBOW.length;
    const x = n0.x + (n2.x - n0.x) * k + Math.sin(k * 5) * 3 * s;
    const y = n0.y + (n2.y - n0.y) * k;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 * s, 4 * s, i, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = OUTLINE;
  // head
  ctx.save();
  ctx.translate(n2.x + 4 * s, n2.y - 10 * s);
  ctx.rotate(Math.sin(t * 1.6) * 0.06);
  drawGiraffeHead(ctx, ch, 22 * s * (opts.bigHead ? 1.9 : 1), { expr, t, view: 'front', lw });
  ctx.restore();
  if (opts.lifejacket) {
    ctx.fillStyle = '#ff7a1a';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(n1.x - 4 * s, n1.y + 40 * s, 22 * s, 14 * s, 0.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- critters
export function drawSalmonTop(ctx, S, t, { flip = false, chomped = false } = {}) {
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = Math.max(3, 200 / S);
  const wig = Math.sin(t * 14) * 0.25;
  ctx.rotate(-Math.PI / 2); // nose points up the screen (downstream)
  if (flip) ctx.scale(-1, 1);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  // tail
  ctx.save();
  ctx.translate(-48, 0);
  ctx.rotate(wig * 1.6);
  ctx.fillStyle = '#e8637a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-30, -20);
  ctx.quadraticCurveTo(-22, 0, -30, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.rotate(wig * 0.3);
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, '#5a7a8a');
  g.addColorStop(0.45, '#ff8fa0');
  g.addColorStop(1, '#f5f0ea');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 55, 19, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // fins
  ctx.fillStyle = '#e8637a';
  [[-5, -18, -1], [-5, 18, 1]].forEach(([x, y, sd]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 18, y + sd * 14 + Math.sin(t * 16) * 4);
    ctx.lineTo(x + 10, y);
    ctx.fill();
    ctx.stroke();
  });
  // spots
  ctx.fillStyle = '#2a3a44';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(-30 + i * 8, -8 + ((i * 7) % 9) - 4, 2, 0, TAU);
    ctx.fill();
  }
  // eye & mouth
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(36, -7, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(38, -7, 3.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(50, 6);
  ctx.quadraticCurveTo(44, 10, 40, 6);
  ctx.stroke();
  ctx.restore();
}

export function drawCat(ctx, S, t, { sitting = true } = {}) {
  ctx.save();
  ctx.scale(S / 100, S / 100);
  const lw = Math.max(3, 200 / S);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#f29a3a';
  // tail
  ctx.lineWidth = lw * 3;
  ctx.beginPath();
  ctx.moveTo(10, -6);
  ctx.quadraticCurveTo(24, -10, 20 + Math.sin(t * 4) * 6, -28);
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.strokeStyle = '#f29a3a';
  ctx.lineWidth = lw * 1.6;
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -26, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s * 3, -33);
    ctx.lineTo(s * 8, -40);
    ctx.lineTo(s * 9, -29);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = '#111';
  [-3.5, 3.5].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, -27, 1.4, 2.4, 0, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = '#ff8fb0';
  ctx.beginPath();
  ctx.arc(0, -23.5, 1.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Big cartoon grizzly (top-down 3/4) used in salmon mode
export function drawBear(ctx, S, t, { mouth = 0, scale = 1 } = {}) {
  ctx.save();
  ctx.scale((S / 100) * scale, (S / 100) * scale);
  const lw = Math.max(3, 250 / (S * scale));
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  const fur = '#7a4a26';
  const furD = '#5a341a';
  // arms
  [-1, 1].forEach((s) => {
    ctx.fillStyle = furD;
    ctx.beginPath();
    ctx.ellipse(s * 62, -40 - mouth * 20, 22, 40, s * (0.6 + mouth * 0.6), 0, TAU);
    ctx.fill();
    ctx.stroke();
    // claws
    ctx.fillStyle = '#f2ead8';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(s * (80 + mouth * 10) + k * 6, -70 - mouth * 40);
      ctx.lineTo(s * (84 + mouth * 10) + k * 6, -86 - mouth * 40);
      ctx.lineTo(s * (88 + mouth * 10) + k * 6, -70 - mouth * 40);
      ctx.fill();
    }
  });
  // body
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -30, 60, 55, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a8703c';
  ctx.beginPath();
  ctx.ellipse(0, -18, 34, 32, 0, 0, TAU);
  ctx.fill();
  // head
  const hy = -95 - mouth * 6;
  ctx.fillStyle = fur;
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.arc(s * 30, hy - 30, 13, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c48a5a';
    ctx.beginPath();
    ctx.arc(s * 30, hy - 30, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = fur;
  });
  ctx.beginPath();
  ctx.ellipse(0, hy, 42, 38, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // angry eyes
  [-1, 1].forEach((s) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(s * 16, hy - 12, 8, 7, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c40000';
    ctx.beginPath();
    ctx.arc(s * 15, hy - 11, 3.5, 0, TAU);
    ctx.fill();
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.moveTo(s * 28, hy - 26);
    ctx.lineTo(s * 6, hy - 18);
    ctx.stroke();
    ctx.lineWidth = lw;
  });
  // snout & mouth
  ctx.fillStyle = '#c48a5a';
  ctx.beginPath();
  ctx.ellipse(0, hy + 12, 20, 15 + mouth * 14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a0a0a';
  ctx.beginPath();
  ctx.ellipse(0, hy + 2, 7, 5, 0, 0, TAU);
  ctx.fill();
  if (mouth > 0.05) {
    ctx.fillStyle = '#5a0010';
    ctx.beginPath();
    ctx.ellipse(0, hy + 20, 16, 4 + mouth * 22, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 6 - 3, hy + 20 - (4 + mouth * 22) * 0.8);
      ctx.lineTo(k * 6, hy + 20 - (4 + mouth * 22) * 0.4);
      ctx.lineTo(k * 6 + 3, hy + 20 - (4 + mouth * 22) * 0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(k * 6 - 3, hy + 20 + (4 + mouth * 22) * 0.8);
      ctx.lineTo(k * 6, hy + 20 + (4 + mouth * 22) * 0.4);
      ctx.lineTo(k * 6 + 3, hy + 20 + (4 + mouth * 22) * 0.8);
      ctx.fill();
    }
    ctx.fillStyle = '#ff5a7a';
    ctx.beginPath();
    ctx.ellipse(0, hy + 20 + mouth * 12, 9, 5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export const randomExpr = () => (Math.random() < 0.5 ? 'scared' : 'terrified');
export { rand };
