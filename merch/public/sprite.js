// CubSprite — a chibi "paper" sprite built from an OkayCub image: the NFT (masked, no square background)
// is the head + torso, legs and arms are drawn procedurally in colours sampled from the art.
// CubController — Mario-feel platformer physics (acceleration, friction, variable jump, coyote time, dash).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else Object.assign(root, factory());
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = { size: 96, radius: 0.28, legLen: 34, legW: 9, pawSize: 1, arms: false, armLen: 24, armW: 11, headScale: 1, bounce: 1, outline: 3, weapon: '🍯' };
  const PHYS = { accel: 2200, maxSpeed: 330, friction: 2600, airControl: 0.65, gravity: 2000, jumpVel: 640, jumpCut: 240,
                 coyote: 0.1, buffer: 0.12, dashSpeed: 640, dashTime: 0.14, dashCooldown: 0.55 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  function shade([r, g, b], amt) {           // amt < 0 darkens, > 0 lightens
    const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

  // Dominant colours of the art: torso/clothes region → body, upper region → accent. Background is excluded
  // by comparing with the corner colour. Falls back to warm browns when the canvas is tainted.
  function analyzeColors(img) {
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S).data;
    const px = (i, j) => { const k = (j * S + i) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
    const corners = [[1, 1], [S - 2, 1], [1, S - 2], [S - 2, S - 2]].map(([i, j]) => px(i, j));
    const bg = [0, 1, 2].map(k => corners.reduce((s, p) => s + p[k], 0) / 4);
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    function dominant(x0, x1, y0, y1) {
      const bins = new Map();
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
        const p = px(i, j);
        if (p[3] < 128 || dist(p, bg) < 48) continue;
        const key = `${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`;
        const mx = Math.max(p[0], p[1], p[2]), mn = Math.min(p[0], p[1], p[2]);
        const sat = mx ? (mx - mn) / mx : 0, lum = (p[0] * .3 + p[1] * .59 + p[2] * .11) / 255;
        // line art is dark and grey — weight towards the fur / clothes colours
        bins.set(key, (bins.get(key) || 0) + 0.15 + sat + lum * 0.8);
      }
      const best = [...bins.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!best) return null;
      return best[0].split(',').map(v => (v << 4) + 8);
    }
    const body   = dominant(16, 48, 38, 62) || dominant(0, S, 0, S) || [122, 88, 58];
    const accent = dominant(10, 54, 6, 30)  || body;
    return { body, accent, bg };
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  class CubSprite {
    constructor(opts) {
      this.o = Object.assign({}, DEFAULTS, opts);
      this.img = null; this.mask = null; this.ready = false;
      this.colors = { body: [122, 88, 58], accent: [90, 64, 40], bg: [0, 0, 0] };
      this.t = 0; this.runPhase = 0;
      this.squash = { x: 1, y: 1 };
      this.attackT = 0; this.hurtT = 0; this.cheerT = 0;
      this.facing = 1; this.lean = 0;
    }

    async load(src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((ok, err) => { img.onload = ok; img.onerror = () => err(new Error('image failed: ' + src)); img.src = src; });
      this.img = img;
      try { this.colors = analyzeColors(img); } catch (e) { /* cross-origin canvas: keep fallback colours */ }
      this.buildMask();
      this.ready = true;
      return this;
    }

    setOptions(opts) { Object.assign(this.o, opts); if (this.img) this.buildMask(); }

    // Removes a flat background by flood-filling from the image borders. Returns null when the
    // picture does not look like "subject on a flat colour" (tainted canvas, gradients, busy art).
    cutOut() {
      const S = 256, c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d', { willReadFrequently: true });
      const iw = this.img.naturalWidth, ih = this.img.naturalHeight, s = Math.max(S / iw, S / ih);
      x.drawImage(this.img, (S - iw * s) / 2, (S - ih * s) / 2, iw * s, ih * s);
      let id;
      try { id = x.getImageData(0, 0, S, S); } catch (e) { return null; }
      const d = id.data, seen = new Uint8Array(S * S), stack = [];
      const corners = [0, S - 1, (S - 1) * S, S * S - 1].map(i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
      const bg = [0, 1, 2].map(k => corners.reduce((a, p) => a + p[k], 0) / 4);
      const near = (i, tol) => Math.hypot(d[i * 4] - bg[0], d[i * 4 + 1] - bg[1], d[i * 4 + 2] - bg[2]) < tol;
      for (let i = 0; i < S; i++) stack.push(i, (S - 1) * S + i, i * S, i * S + S - 1);
      let removed = 0;
      while (stack.length) {
        const i = stack.pop();
        if (seen[i] || !near(i, 58)) continue;
        seen[i] = 1; removed++;
        const px = i % S, py = (i / S) | 0;
        if (px > 0) stack.push(i - 1); if (px < S - 1) stack.push(i + 1);
        if (py > 0) stack.push(i - S); if (py < S - 1) stack.push(i + S);
      }
      const frac = removed / (S * S);
      if (frac < 0.08 || frac > 0.9) return null;
      for (let i = 0; i < S * S; i++) if (seen[i]) d[i * 4 + 3] = 0;
      // soften the silhouette edge: pixels next to removed ones get partial alpha
      for (let i = 0; i < S * S; i++) {
        if (seen[i] || d[i * 4 + 3] === 0) continue;
        const px = i % S, py = (i / S) | 0;
        let n = 0;
        if (px > 0 && seen[i - 1]) n++; if (px < S - 1 && seen[i + 1]) n++;
        if (py > 0 && seen[i - S]) n++; if (py < S - 1 && seen[i + S]) n++;
        if (n) d[i * 4 + 3] = n >= 2 ? 110 : 180;
      }
      x.putImageData(id, 0, 0);
      // measure the subject's bounding box so the sprite can sit on its lowest opaque row
      let top = S, bottom = 0, left = S, right = 0;
      for (let i = 0; i < S * S; i++) if (d[i * 4 + 3] > 40) { const px = i % S, py = (i / S) | 0; if (py < top) top = py; if (py > bottom) bottom = py; if (px < left) left = px; if (px > right) right = px; }
      return { canvas: c, box: { top, bottom, left, right } };
    }

    buildMask() {
      const S = 256;
      const cut = this.cutOut();
      if (cut) {
        // outline: stamp the silhouette in 8 directions in a dark colour, then the art on top
        const o = document.createElement('canvas'); o.width = o.height = S;
        const ox = o.getContext('2d'), w = 3;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) ox.drawImage(cut.canvas, Math.cos(a) * w, Math.sin(a) * w);
        ox.globalCompositeOperation = 'source-in';
        ox.fillStyle = shade(this.colors.body, -0.65); ox.fillRect(0, 0, S, S);
        ox.globalCompositeOperation = 'source-over';
        ox.drawImage(cut.canvas, 0, 0);
        // crop to the silhouette so every cub gets the same presence regardless of how the art is framed
        const b = cut.box, m = w + 2;
        const cw = Math.min(S, b.right - b.left + 1 + m * 2), ch = Math.min(S, b.bottom - b.top + 1 + m * 2);
        const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
        cc.getContext('2d').drawImage(o, Math.max(0, b.left - m), Math.max(0, b.top - m), cw, ch, 0, 0, cw, ch);
        this.mask = cc; this.maskAspect = ch / cw; this.cutout = true;
        return;
      }
      this.cutout = false; this.maskAspect = 1;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      roundRectPath(x, 0, 0, S, S, S * this.o.radius);
      x.save(); x.clip();
      const iw = this.img.naturalWidth, ih = this.img.naturalHeight, s = Math.max(S / iw, S / ih);
      x.drawImage(this.img, (S - iw * s) / 2, (S - ih * s) / 2, iw * s, ih * s);
      // soft inner vignette so the cut-out reads as a paper piece
      const g = x.createRadialGradient(S / 2, S / 2, S * 0.45, S / 2, S / 2, S * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
      x.fillStyle = g; x.fillRect(0, 0, S, S);
      x.restore();
      this.mask = c;
    }

    attack() { if (this.attackT <= 0) { this.attackT = 0.34; return true; } return false; }
    hurt()   { this.hurtT = 0.5; }
    cheer()  { this.cheerT = 1.2; }

    // m: { vx, vy, grounded, justJumped, justLanded, dashing }
    update(dt, m) {
      this.t += dt;
      const o = this.o;
      if (m.justJumped) { this.squash.x = 1 - 0.18 * o.bounce; this.squash.y = 1 + 0.22 * o.bounce; }
      if (m.justLanded) { this.squash.x = 1 + 0.28 * o.bounce; this.squash.y = 1 - 0.3 * o.bounce; }
      const k = clamp(dt * 12, 0, 1);
      this.squash.x = lerp(this.squash.x, 1, k);
      this.squash.y = lerp(this.squash.y, 1, k);
      if (Math.abs(m.vx) > 1) this.facing = m.vx > 0 ? 1 : -1;
      const running = m.grounded && Math.abs(m.vx) > 20;
      if (running) this.runPhase += dt * (9 + Math.abs(m.vx) / 40);
      else this.runPhase = lerp(this.runPhase, Math.round(this.runPhase / Math.PI) * Math.PI, clamp(dt * 10, 0, 1));
      const targetLean = m.dashing ? 0.32 : (m.grounded ? (m.vx / PHYS.maxSpeed) * 0.16 : clamp(-m.vy / 2600, -0.12, 0.14));
      this.lean = lerp(this.lean, targetLean, clamp(dt * 10, 0, 1));
      this.attackT = Math.max(0, this.attackT - dt);
      this.hurtT   = Math.max(0, this.hurtT - dt);
      this.cheerT  = Math.max(0, this.cheerT - dt);
      this.motion = m;
    }

    capsule(ctx, x0, y0, x1, y1, w, color) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = shade(this.colors.body, -0.55); ctx.lineWidth = w + this.o.outline * 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // a flat paw at the end of a leg, pointing forward (the sprite faces +x before flipping)
    paw(ctx, x, y, color) {
      const o = this.o, w = o.legW * 2.1 * o.pawSize, h = o.legW * 1.15 * o.pawSize;
      ctx.beginPath(); ctx.ellipse(x + w * 0.22, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.lineWidth = o.outline * 2; ctx.strokeStyle = shade(this.colors.body, -0.55); ctx.stroke();
      ctx.fillStyle = color; ctx.fill();
    }

    // x, yGround: the point between the feet, in world/screen pixels
    draw(ctx, x, yGround, scale = 1, height = (this.motion && this.motion.height) || 0) {
      if (!this.ready) return;
      const o = this.o, m = this.motion || { vx: 0, vy: 0, grounded: true };
      const S = o.size * o.headScale, legLen = o.legLen, body = rgb(this.colors.body), dark = shade(this.colors.body, -0.3);
      const airborne = !m.grounded, hurt = this.hurtT > 0, cheer = this.cheerT > 0;

      // ground shadow shrinks and fades with height
      ctx.save();
      ctx.translate(x, yGround);
      const sh = clamp(1 - height / 260, 0.35, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * sh})`;
      ctx.beginPath(); ctx.ellipse(0, 4, S * 0.42 * sh, S * 0.11 * sh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, yGround - height);
      ctx.scale(this.facing * scale, scale);
      ctx.rotate(this.lean);
      ctx.scale(this.squash.x, this.squash.y);

      const torsoBottom = -legLen + 6;          // legs tuck a little under the torso
      // torso box: cut-outs are normalised by height so every cub stands the same size
      const th = this.cutout ? S * 1.15 : S, tw = this.cutout ? th / this.maskAspect : S;
      const breathe = Math.sin(this.t * 2.2) * 0.012;
      const hop = cheer ? -Math.abs(Math.sin(this.t * 12)) * 10 : 0;

      // leg + arm angles
      let legF, legB;
      if (airborne)       { legF = -0.55; legB = 0.5; }
      else                { const s = Math.sin(this.runPhase); legF = s * 0.95; legB = -s * 0.95; }
      let armF = -legF * 0.8, armB = -legB * 0.8;
      if (airborne) { armF = -1.6; armB = -1.3; }
      if (cheer)    { armF = -2.6 + Math.sin(this.t * 14) * 0.25; armB = -2.6 - Math.sin(this.t * 14) * 0.25; }
      let swing = null;
      if (this.attackT > 0) {
        const p = 1 - this.attackT / 0.34;             // 0 → 1
        armF = p < 0.35 ? lerp(-2.4, -2.9, p / 0.35) : lerp(-2.9, 0.9, (p - 0.35) / 0.65);
        swing = p;
      }

      const hipX = tw * 0.22, hipY = torsoBottom + 2;
      const shX = tw * 0.44, shY = torsoBottom - th * 0.3;

      // back limbs
      const bFootX = -hipX + Math.sin(legB) * legLen, bFootY = hipY + Math.cos(legB) * legLen;
      this.capsule(ctx, -hipX, hipY, bFootX, bFootY, o.legW, dark);
      this.paw(ctx, bFootX, bFootY, dark);
      if (o.arms) this.capsule(ctx, -shX, shY, -shX + Math.sin(armB) * o.armLen, shY + Math.cos(armB) * o.armLen, o.armW, dark);

      // torso: the NFT cut-out
      ctx.save();
      ctx.translate(0, torsoBottom + hop);
      ctx.scale(1 + breathe, 1 - breathe);
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.drawImage(this.mask, -tw / 2, -th + 3, tw, th);
      ctx.shadowColor = 'transparent';
      if (!this.cutout) {
        roundRectPath(ctx, -tw / 2, -th + 3, tw, th, tw * o.radius);
        ctx.lineWidth = o.outline; ctx.strokeStyle = shade(this.colors.body, -0.6); ctx.stroke();
      }
      if (hurt && Math.floor(this.hurtT * 20) % 2 === 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff';
        ctx.fillRect(-tw / 2, -th + 3, tw, th);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();

      // front limbs
      const fFootX = hipX + Math.sin(legF) * legLen, fFootY = hipY + Math.cos(legF) * legLen;
      this.capsule(ctx, hipX, hipY, fFootX, fFootY, o.legW, body);
      this.paw(ctx, fFootX, fFootY, body);
      let handX, handY, weaponAngle;
      if (o.arms) {
        handX = shX + Math.sin(armF) * o.armLen; handY = shY + Math.cos(armF) * o.armLen;
        this.capsule(ctx, shX, shY, handX, handY, o.armW, body);
        weaponAngle = armF + Math.PI / 2 + (swing != null ? 0.4 : -0.3);
      } else {
        // the art's own hand sits at the lower front of the bust; the tool swings from there
        handX = tw * 0.4; handY = torsoBottom - th * 0.1;
        // rest: tool points forward-down from the hand; attack: wind up behind the head, then sweep forward
        weaponAngle = swing == null ? 1.15 : (swing < 0.35 ? lerp(1.15, -1.9, swing / 0.35) : lerp(-1.9, 2.1, (swing - 0.35) / 0.65));
      }

      // weapon in the front hand: a honey ladle / tool, swung on attack
      if (o.weapon) {
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(weaponAngle);
        ctx.lineCap = 'round'; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -S * 0.3); ctx.stroke();
        ctx.font = `${Math.round(S * 0.26)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.weapon, 0, -S * 0.36);
        ctx.restore();
        if (swing != null && swing > 0.35) {
          const a = (swing - 0.35) / 0.65;
          ctx.save();
          ctx.globalAlpha = (1 - a) * 0.85;
          ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.shadowColor = '#ffd45e'; ctx.shadowBlur = 16;
          const cx = o.arms ? shX : handX, cy = o.arms ? shY : handY, cr = (o.arms ? o.armLen : 0) + S * 0.34;
          ctx.beginPath(); ctx.arc(cx, cy, cr, -2.2 + a * 1.2, -0.4 + a * 1.6); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  class CubController {
    constructor(phys) {
      this.p = Object.assign({}, PHYS, phys);
      this.x = 0; this.y = 0;                 // y = height above ground (positive up)
      this.vx = 0; this.vy = 0;               // vy positive up
      this.grounded = true; this.coyoteT = 0; this.bufferT = 0;
      this.dashT = 0; this.dashCd = 0; this.dashDir = 1; this.facing = 1;
      this.input = { left: false, right: false, jump: false, jumpHeld: false, dash: false };
      this.trail = [];
    }
    // groundAt(x) → height of the floor at x (0 for flat ground). Returns motion flags for the sprite.
    step(dt, groundAt = () => 0) {
      const p = this.p, i = this.input;
      let justJumped = false, justLanded = false;
      this.coyoteT = this.grounded ? p.coyote : Math.max(0, this.coyoteT - dt);
      if (i.jump) { this.bufferT = p.buffer; i.jump = false; }
      else this.bufferT = Math.max(0, this.bufferT - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      if (i.dash && this.dashCd <= 0 && this.dashT <= 0) {
        this.dashT = p.dashTime; this.dashCd = p.dashCooldown; this.dashDir = this.facing;
      }
      i.dash = false;

      const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (this.dashT > 0) {
        this.dashT -= dt;
        this.vx = this.dashDir * p.dashSpeed; this.vy = Math.max(this.vy, 0);
        this.trail.push({ x: this.x, y: this.y, t: 0.22 });
      } else {
        const ctl = this.grounded ? 1 : p.airControl;
        if (dir !== 0) {
          this.vx += dir * p.accel * ctl * dt;
          this.facing = dir;
        } else if (this.grounded) {
          const f = p.friction * dt;
          this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
        } else {
          this.vx *= 1 - 0.6 * dt;
        }
        this.vx = clamp(this.vx, -p.maxSpeed, p.maxSpeed);
      }

      if (this.bufferT > 0 && this.coyoteT > 0) {
        this.vy = p.jumpVel; this.grounded = false; this.coyoteT = 0; this.bufferT = 0; justJumped = true;
      }
      if (!i.jumpHeld && this.vy > p.jumpCut) this.vy = p.jumpCut;     // variable jump height

      if (!this.grounded) this.vy -= p.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const floor = groundAt(this.x);
      if (this.y <= floor && this.vy <= 0) {
        if (!this.grounded) justLanded = true;
        this.y = floor; this.vy = 0; this.grounded = true;
      } else if (this.y > floor + 0.5) {
        this.grounded = false;
      }
      this.trail = this.trail.filter(t => (t.t -= dt) > 0);
      return { vx: this.vx, vy: -this.vy, grounded: this.grounded, justJumped, justLanded, dashing: this.dashT > 0, height: this.y - floor };
    }
  }

  return { CubSprite, CubController, PHYS, SPRITE_DEFAULTS: DEFAULTS };
});
