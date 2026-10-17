// Unified keyboard + touch input. Touch: floating joystick on the left half,
// buttons (defined per-phase) on the right.
import { clamp } from './util.js';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'primary', Enter: 'primary', KeyE: 'primary', ShiftLeft: 'primary', ShiftRight: 'primary',
  Escape: 'pause', KeyP: 'pause',
  KeyF: 'shoot', KeyX: 'shoot',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressedSet = new Set();
    this.buttons = [];
    this.joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
    this.pointers = new Map();
    this.touchSeen = false;
    this.tapped = false; // any tap/click this frame (used for "tap to continue")
    this.anyKey = false;

    this.onKeyDown = (e) => {
      const a = KEYMAP[e.code];
      if (a) {
        if (!this.held.has(a)) this.pressedSet.add(a);
        this.held.add(a);
        e.preventDefault();
      }
      this.anyKey = true;
    };
    this.onKeyUp = (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    };
    this.onBlur = () => {
      this.held.clear();
      this.joy.active = false;
      this.buttons.forEach((b) => (b.down = false));
    };
    this.onDown = (e) => {
      if (e.pointerType === 'touch') this.touchSeen = true;
      const p = this.pos(e);
      this.tapped = true;
      // buttons first
      for (const b of this.buttons) {
        if (b.hidden) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.25) {
          b.down = true;
          b.pressed = true;
          b.pid = e.pointerId;
          this.pointers.set(e.pointerId, { kind: 'btn', id: b.id });
          if (b.action) this.pressedSet.add(b.action);
          try { this.canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
          e.preventDefault();
          return;
        }
      }
      const w = this.canvas.clientWidth;
      if (p.x < w * 0.55 && !this.joy.active && this.joyEnabled) {
        this.joy = { active: true, id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, dx: 0, dy: 0 };
        this.pointers.set(e.pointerId, { kind: 'joy' });
        try { this.canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
      } else {
        this.pointers.set(e.pointerId, { kind: 'tap' });
        // right-side tap counts as primary when there is no button there
        if (this.tapIsPrimary) this.pressedSet.add('primary');
      }
      e.preventDefault();
    };
    this.onMove = (e) => {
      const info = this.pointers.get(e.pointerId);
      if (!info) return;
      if (info.kind === 'joy' && this.joy.id === e.pointerId) {
        const p = this.pos(e);
        const R = 55;
        let dx = p.x - this.joy.ox;
        let dy = p.y - this.joy.oy;
        const m = Math.hypot(dx, dy);
        if (m > R) {
          // drag the origin along so direction changes feel instant
          this.joy.ox += (dx / m) * (m - R);
          this.joy.oy += (dy / m) * (m - R);
          dx = p.x - this.joy.ox;
          dy = p.y - this.joy.oy;
        }
        this.joy.x = p.x;
        this.joy.y = p.y;
        this.joy.dx = clamp(dx / R, -1, 1);
        this.joy.dy = clamp(dy / R, -1, 1);
      }
    };
    this.onUp = (e) => {
      const info = this.pointers.get(e.pointerId);
      if (info) {
        if (info.kind === 'joy') this.joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
        if (info.kind === 'btn') {
          const b = this.buttons.find((x) => x.id === info.id);
          if (b) b.down = false;
        }
        this.pointers.delete(e.pointerId);
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.joyEnabled = true;
    this.tapIsPrimary = false;
  }

  pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Phases call this every frame with their buttons: {id, x, y, r, label, action}
  setButtons(list) {
    const old = new Map(this.buttons.map((b) => [b.id, b]));
    this.buttons = list.map((b) => {
      const o = old.get(b.id);
      return { ...b, down: o ? o.down : false, pressed: o ? o.pressed : false, pid: o ? o.pid : null };
    });
  }

  isDown(a) {
    if (this.held.has(a)) return true;
    // in tap-anywhere phases, a thumb held down anywhere counts as holding the action
    if (a === 'primary' && this.tapIsPrimary) {
      for (const v of this.pointers.values()) if (v.kind === 'tap') return true;
    }
    return this.buttons.some((b) => b.down && b.action === a);
  }
  pressed(a) {
    return this.pressedSet.has(a);
  }
  axisX() {
    let x = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.joy.active) x += this.joy.dx;
    if (this.isDown('left') && !this.held.has('left')) x -= 1;
    if (this.isDown('right') && !this.held.has('right')) x += 1;
    return clamp(x, -1, 1);
  }
  axisY() {
    // -1 = up (toward the falls / faster), +1 = down (back-paddle)
    let y = 0;
    if (this.held.has('up')) y -= 1;
    if (this.held.has('down')) y += 1;
    if (this.joy.active) y += this.joy.dy;
    return clamp(y, -1, 1);
  }
  endFrame() {
    this.pressedSet.clear();
    this.tapped = false;
    this.anyKey = false;
    this.buttons.forEach((b) => (b.pressed = false));
  }
  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
  }
}
