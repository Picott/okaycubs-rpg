// Honey Road — side-scrolling platformer levels between eras. Canvas 2D, no dependencies beyond sprite.js.
(function (root) {
  'use strict';
  const PHYS = root.PHYS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const VIEW_H = 600, GROUND_Y = 480, FLOOR_H = 160;
  const PLAYER_W = 34, PLAYER_H = 74;

  // ---------- level data ----------
  // x grows to the right, y grows down; the floor top is GROUND_Y. Gaps in `ground` are lava.
  const LEVELS = {
    hadean: {
      title: 'Magma Road', honeyName: 'Magma Honey', next: 'archean', length: 3600,
      palette: { skyTop: '#140612', skyBottom: '#4a1208', far: '#2a0a12', mid: '#1b0909', rock: '#241412', rockTop: '#5a3a2c', lava: '#ff6a1a', ember: ['#ff6b35', '#f1c40f', '#ff3b1f'] },
      ground: [[0, 900], [1020, 1500], [1700, 2320], [2440, 3600]],
      platforms: [
        { x: 640, y: 372, w: 150 }, { x: 1180, y: 352, w: 120 }, { x: 1330, y: 268, w: 110 },
        { x: 2080, y: 330, w: 130 }, { x: 2650, y: 360, w: 140 }, { x: 2860, y: 280, w: 120 }, { x: 3050, y: 360, w: 130 },
      ],
      crumble: [{ x: 1545, y: 392, w: 110 }, { x: 1880, y: 372, w: 130 }, { x: 2340, y: 400, w: 90 }],
      enemies: [
        { type: 'ember', x: 520, range: [400, 760] }, { type: 'ember', x: 1150, range: [1040, 1450] },
        { type: 'golem', x: 1850, range: [1720, 2050] }, { type: 'ember', x: 2560, range: [2460, 2780] },
        { type: 'ember', x: 2950, range: [2820, 3150] }, { type: 'golem', x: 3250, range: [3180, 3420] },
      ],
      honey: [
        [220, 430], [300, 400], [380, 430], [680, 320], [730, 300], [780, 320], [960, 300], [1100, 430], [1230, 300], [1380, 215],
        [1430, 215], [1600, 330], [1760, 430], [1930, 320], [2140, 280], [2200, 430], [2380, 340], [2520, 430], [2700, 310], [2750, 310],
        [2900, 230], [2950, 230], [3100, 310], [3200, 430], [3300, 400], [3360, 430],
      ],
      checkpoints: [1080, 2480],
      portal: 3500,
    },
  };

  const ENEMY_TYPES = {
    ember: { emoji: '🔥', hp: 1, speed: 95, w: 44, h: 52, stompable: true, name: 'Ember Sentinel' },
    golem: { emoji: '🗿', hp: 2, speed: 42, w: 56, h: 66, stompable: false, name: 'Cinder Golem' },
  };

  // ---------- game ----------
  class HoneyRoad {
    constructor(canvas, sprite, era, hooks) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.sprite = sprite; this.era = era; this.L = LEVELS[era] || LEVELS.hadean; this.hooks = hooks || {};
      this.input = { left: false, right: false, jump: false, jumpHeld: false, attack: false, dash: false };
      this.reset();
      this.embers = Array.from({ length: 60 }, () => this.mkEmber(true));
      this.last = performance.now(); this.running = false; this.paused = false;
      this.resize();
      addEventListener('resize', () => this.resize());
    }

    reset() {
      const L = this.L;
      this.p = { x: 80, y: GROUND_Y, vx: 0, vy: 0, grounded: true, facing: 1, coyote: 0, buffer: 0, dashT: 0, dashCd: 0, dashDir: 1,
                 hp: 3, inv: 0, honey: 0, checkpoint: 80, dead: 0, attackT: 0, stunned: 0,
                 jumpsLeft: 1, burst: 1, burstFx: 0, tDash: -9, tAtk: -9 };
      this.solids = L.ground.map(([a, b]) => ({ x: a, y: GROUND_Y, w: b - a, h: FLOOR_H, type: 'ground' }));
      this.platforms = L.platforms.map(p => ({ ...p, h: 18, type: 'platform' }));
      this.crumbles = L.crumble.map(p => ({ ...p, h: 18, type: 'crumble', timer: 0, fall: 0, gone: false }));
      this.enemies = L.enemies.map(e => ({ ...ENEMY_TYPES[e.type], type: e.type, x: e.x, y: GROUND_Y, range: e.range, dir: 1, hpLeft: ENEMY_TYPES[e.type].hp, dead: 0, hit: 0, bob: Math.random() * 6 }));
      this.honey = L.honey.map(([x, y]) => ({ x, y, taken: false, t: Math.random() * 6 }));
      this.checkpoints = L.checkpoints.map(x => ({ x, lit: false }));
      this.particles = []; this.floats = []; this.trail = []; this.rings = [];
      this.time = 0; this.finished = false; this.started = false;
      this.cam = { x: 0, y: 0 };
      this.shake = 0;
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.cv.clientWidth, h = this.cv.clientHeight;
      this.cv.width = w * dpr; this.cv.height = h * dpr;
      // fit the height on wide screens; on narrow (portrait) screens keep at least ~820 world px visible
      this.scale = Math.min(h / VIEW_H, w / 820) * dpr;
      this.viewW = w * dpr / this.scale; this.viewH = h * dpr / this.scale;
    }

    start() { this.running = true; this.started = true; this.last = performance.now(); requestAnimationFrame(t => this.frame(t)); }

    mkEmber(fresh) {
      return { x: Math.random() * 2000, y: fresh ? Math.random() * VIEW_H : VIEW_H + 10, r: 1 + Math.random() * 2.5, v: 20 + Math.random() * 50, c: this.L.palette.ember[Math.floor(Math.random() * 3)], ph: Math.random() * 6, a: .3 + Math.random() * .5 };
    }
    burst(x, y, colors, n = 20, power = 160) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = power * (.4 + Math.random()); this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, r: 2 + Math.random() * 3, c: colors[i % colors.length], t: .7 + Math.random() * .4 }); }
    }
    float(x, y, text, color) { this.floats.push({ x, y, text, color, t: 1 }); }

    // ---------- physics ----------
    rects() { return [...this.solids, ...this.platforms, ...this.crumbles.filter(c => !c.gone).map(c => ({ ...c, y: c.y + c.fall }))]; }

    stepPlayer(dt) {
      const p = this.p, i = this.input, P = PHYS;
      if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) this.respawn(); return { vx: 0, vy: 0, grounded: false, justJumped: false, justLanded: false, dashing: false, height: 0 }; }
      p.inv = Math.max(0, p.inv - dt); p.attackT = Math.max(0, p.attackT - dt); p.stunned = Math.max(0, p.stunned - dt);
      p.coyote = p.grounded ? P.coyote : Math.max(0, p.coyote - dt);
      if (i.jump) { p.buffer = P.buffer; i.jump = false; } else p.buffer = Math.max(0, p.buffer - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.burstFx = Math.max(0, p.burstFx - dt);
      // dash + hit pressed together (within 0.18s) → Honey Burst, if a charge is ready
      if (i.dash) p.tDash = this.time;
      if (i.attack) p.tAtk = this.time;
      if ((i.dash || i.attack) && Math.abs(p.tDash - p.tAtk) < 0.18 && p.burst >= 1 && p.stunned <= 0) {
        i.dash = false; i.attack = false; p.tDash = p.tAtk = -9;
        this.honeyBurst();
      }
      if (i.dash && p.dashCd <= 0 && p.dashT <= 0 && p.stunned <= 0) { p.dashT = P.dashTime; p.dashCd = P.dashCooldown; p.dashDir = p.facing; }
      i.dash = false;
      if (i.attack) { i.attack = false; if (p.attackT <= 0 && p.stunned <= 0 && this.sprite.attack()) p.attackT = 0.34; }

      const dir = p.stunned > 0 ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
      let justJumped = false, justLanded = false;
      if (p.dashT > 0) {
        p.dashT -= dt; p.vx = p.dashDir * P.dashSpeed; if (p.vy > 0) p.vy = 0;
        this.trail.push({ x: p.x, y: p.y, t: .22 });
      } else {
        const ctl = p.grounded ? 1 : P.airControl;
        if (dir !== 0) { p.vx += dir * P.accel * ctl * dt; p.facing = dir; }
        else if (p.grounded) { const f = P.friction * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
        else p.vx *= 1 - 0.6 * dt;
        p.vx = clamp(p.vx, -P.maxSpeed, P.maxSpeed);
      }
      if (p.grounded) p.jumpsLeft = 1;
      if (p.buffer > 0 && p.coyote > 0 && p.stunned <= 0) { p.vy = -P.jumpVel; p.grounded = false; p.coyote = 0; p.buffer = 0; justJumped = true; }
      else if (p.buffer > 0 && !p.grounded && p.coyote <= 0 && p.jumpsLeft > 0 && p.stunned <= 0) {
        // double jump: a little shorter, with a honey ring under the paws
        p.vy = -P.jumpVel * 0.88; p.jumpsLeft--; p.buffer = 0; justJumped = true;
        this.rings.push({ x: p.x, y: p.y, t: 0.35 });
        this.burst(p.x, p.y, ['#f5e06e', '#fff2b0'], 8, 90);
      }
      if (!i.jumpHeld && p.vy < -P.jumpCut) p.vy = -P.jumpCut;
      p.vy += P.gravity * dt;
      p.vy = Math.min(p.vy, 1400);

      // horizontal move + solid walls (one-way platforms never block sideways)
      p.x += p.vx * dt;
      for (const r of this.solids) if (this.overlaps(p, r)) {
        if (p.vx > 0) p.x = r.x - PLAYER_W / 2; else if (p.vx < 0) p.x = r.x + r.w + PLAYER_W / 2;
        p.vx = 0;
      }
      p.x = clamp(p.x, PLAYER_W / 2, this.L.length - PLAYER_W / 2);

      // vertical move
      const prevFeet = p.y;
      p.y += p.vy * dt;
      let landed = false;
      for (const r of this.rects()) {
        const oneWay = r.type !== 'ground';
        if (!this.overlaps(p, r)) continue;
        if (p.vy >= 0 && prevFeet <= r.y + 1) {                 // landing from above
          p.y = r.y; p.vy = 0; landed = true;
          if (r.type === 'crumble') { const c = this.crumbles.find(c => c.x === r.x); if (c && c.timer === 0) c.timer = 0.001; }
        } else if (!oneWay && p.vy < 0) {                        // bumping a ceiling
          p.y = r.y + r.h + PLAYER_H; p.vy = 0;
        }
      }
      if (landed && !p.grounded) justLanded = true;
      p.grounded = landed;

      // lava / falling off the world
      if (p.y > GROUND_Y + 60 && p.dead <= 0) this.die('lava');

      return { vx: p.vx, vy: p.vy, grounded: p.grounded, justJumped, justLanded, dashing: p.dashT > 0, height: 0 };
    }

    overlaps(p, r) {
      return p.x + PLAYER_W / 2 > r.x && p.x - PLAYER_W / 2 < r.x + r.w && p.y > r.y && p.y - PLAYER_H < r.y + r.h;
    }

    die(cause) {
      const p = this.p;
      p.dead = 1.1; p.hp = 0; p.vx = 0; p.vy = 0;
      this.sprite.hurt(); this.shake = 0.5;
      this.burst(p.x, p.y - 30, cause === 'lava' ? ['#ff6a1a', '#ffb347', '#ff3b1f'] : ['#fff', '#ff8a7a'], 26, 220);
      this.hooks.onDeath?.(cause);
    }
    respawn() {
      const p = this.p;
      p.x = p.checkpoint; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.hp = 3; p.inv = 1.5; p.grounded = true;
      this.crumbles.forEach(c => { c.gone = false; c.fall = 0; c.timer = 0; });
      this.hooks.onRespawn?.();
    }
    damage(from) {
      const p = this.p;
      if (p.inv > 0 || p.dead > 0) return;
      p.hp -= 1; p.inv = 1.2; p.stunned = 0.3;
      p.vx = (p.x < from.x ? -1 : 1) * 260; p.vy = -380; p.grounded = false;
      this.sprite.hurt(); this.shake = 0.35;
      this.hooks.onHurt?.(p.hp);
      if (p.hp <= 0) this.die('enemy');
    }

    stepWorld(dt) {
      const p = this.p;
      for (const c of this.crumbles) {
        if (c.gone) continue;
        if (c.timer > 0) { c.timer += dt; if (c.timer > 0.7) { c.fall += 600 * dt * (c.timer - 0.7) * 3; if (c.fall > 500) c.gone = true; } }
      }
      for (const e of this.enemies) {
        if (e.dead > 0) { e.dead -= dt; continue; }
        if (e.hpLeft <= 0) continue;
        e.hit = Math.max(0, e.hit - dt);
        e.x += e.dir * e.speed * dt;
        if (e.x < e.range[0]) { e.x = e.range[0]; e.dir = 1; } if (e.x > e.range[1]) { e.x = e.range[1]; e.dir = -1; }
        if (p.dead > 0) continue;
        const hitX = Math.abs(e.x - p.x) < (e.w + PLAYER_W) / 2, hitY = p.y > e.y - e.h && p.y - PLAYER_H < e.y;
        // player attack hitbox in front of the cub during the swing
        if (p.attackT > 0 && p.attackT < 0.26) {
          const hx = p.x + p.facing * 48, hy = p.y - 34;
          if (Math.abs(hx - e.x) < (e.w / 2 + 36) && Math.abs(hy - (e.y - e.h / 2)) < 56 && e.hit <= 0) this.hitEnemy(e, p.facing);
        }
        if (!hitX || !hitY) continue;
        if (e.stompable && p.vy > 0 && p.y - PLAYER_H < e.y - e.h * 0.55) {   // stomp
          this.hitEnemy(e, 0, true); p.vy = -480; p.grounded = false; continue;
        }
        this.damage(e);
      }
      for (const h of this.honey) {
        if (h.taken || p.dead > 0) continue;
        if (Math.abs(h.x - p.x) < 30 && Math.abs(h.y - (p.y - 36)) < 48) {
          h.taken = true; p.honey++; p.burst = Math.min(2, p.burst + 0.2); this.burst(h.x, h.y, ['#f5e06e', '#d4af37', '#fff2b0'], 10, 90);
          this.float(h.x, h.y - 20, '+1 🍯', '#ffe27a'); this.hooks.onHoney?.(p.honey);
        }
      }
      for (const c of this.checkpoints) if (!c.lit && p.x > c.x) { c.lit = true; p.checkpoint = c.x; this.float(c.x, GROUND_Y - 120, 'Checkpoint', '#7cf29e'); this.hooks.onCheckpoint?.(); }
      if (!this.finished && p.x > this.L.portal - 10 && p.dead <= 0) this.finish();
    }
    honeyBurst() {
      const p = this.p;
      p.burst -= 1; p.burstFx = 0.7; p.inv = Math.max(p.inv, 1.1); p.dashT = 0;
      p.vy = Math.min(p.vy, -200); p.grounded = false;
      this.sprite.cheerT = 0.6; this.shake = 0.6;
      this.rings.push({ x: p.x, y: p.y - 30, t: 0.7, big: true });
      this.burst(p.x, p.y - 30, ['#f5e06e', '#d4af37', '#fff2b0', '#ffb347'], 70, 320);
      this.float(p.x, p.y - 110, '✦ HONEY BURST ✦', '#ffe27a');
      for (const e of this.enemies) {
        if (e.hpLeft <= 0) continue;
        if (Math.hypot(e.x - p.x, (e.y - e.h / 2) - (p.y - 30)) < 230) { e.hit = 0; this.hitEnemy(e, Math.sign(e.x - p.x) || 1); if (e.hpLeft > 0) { e.hit = 0; this.hitEnemy(e, Math.sign(e.x - p.x) || 1); } }
      }
      this.hooks.onBurst?.(p.burst);
    }
    hitEnemy(e, dir, stomp) {
      e.hpLeft -= 1; e.hit = 0.4;
      this.burst(e.x, e.y - e.h / 2, ['#fff', '#ffb347', '#ff6b35'], stomp ? 14 : 18, 180);
      this.shake = Math.max(this.shake, 0.2);
      if (e.hpLeft <= 0) { e.dead = 0.6; this.float(e.x, e.y - e.h, e.name + ' down!', '#ff8a7a'); this.hooks.onKill?.(e); }
      else { e.x += (dir || 0) * 30; this.float(e.x, e.y - e.h, 'hit', '#fff'); }
    }
    finish() {
      this.finished = true; this.sprite.cheer();
      this.burst(this.p.x, this.p.y - 40, ['#f5e06e', '#d4af37', '#fff2b0', '#7fdbff'], 60, 260);
      this.hooks.onFinish?.({ timeMs: Math.round(this.time * 1000), honey: this.p.honey });
    }

    // ---------- loop ----------
    frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.033, (now - this.last) / 1000); this.last = now;
      if (!this.paused && !this.finished && this.started) {
        this.time += dt;
        const m = this.stepPlayer(dt);
        this.stepWorld(dt);
        this.sprite.update(dt, m);
      } else {
        this.sprite.update(dt, { vx: 0, vy: 0, grounded: true, height: 0 });
      }
      this.stepFx(dt);
      this.updateCamera(dt);
      this.draw();
      requestAnimationFrame(t => this.frame(t));
    }
    stepFx(dt) {
      this.shake = Math.max(0, this.shake - dt);
      for (const q of this.particles) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; }
      this.particles = this.particles.filter(q => q.t > 0);
      for (const f of this.floats) { f.t -= dt * 0.9; f.y -= 40 * dt; }
      this.floats = this.floats.filter(f => f.t > 0);
      this.trail = this.trail.filter(t => (t.t -= dt) > 0);
      this.rings = this.rings.filter(r => (r.t -= dt) > 0);
      for (const e of this.embers) { e.y -= e.v * dt; e.x += Math.sin(performance.now() / 900 + e.ph) * 12 * dt; if (e.y < -10) Object.assign(e, this.mkEmber(false)); }
    }
    updateCamera(dt) {
      const p = this.p, target = p.x + p.facing * 90 - this.viewW * 0.42;
      this.cam.x = lerp(this.cam.x, clamp(target, 0, this.L.length - this.viewW), clamp(dt * 5, 0, 1));
      // tall (portrait) views keep the road centred; wide views follow the cub a little
      const ty = this.viewH > 760 ? 400 - this.viewH / 2 + Math.min(0, p.y - GROUND_Y) * 0.3 : clamp(p.y - this.viewH * 0.68, -120, 40);
      this.cam.y = lerp(this.cam.y, ty, clamp(dt * 4, 0, 1));
    }

    // ---------- drawing ----------
    draw() {
      const ctx = this.ctx, L = this.L, pal = L.palette, W = this.viewW, H = this.viewH;
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // far volcanoes (parallax)
      ctx.fillStyle = pal.far;
      for (let i = -1; i < 8; i++) { const bx = i * 520 - (this.cam.x * 0.2) % 520; ctx.beginPath(); ctx.moveTo(bx, 430); ctx.lineTo(bx + 180, 170 + (i % 3) * 40); ctx.lineTo(bx + 230, 200); ctx.lineTo(bx + 400, 430); ctx.closePath(); ctx.fill(); }
      const glow = ctx.createRadialGradient(W * 0.5, 460, 20, W * 0.5, 460, 520); glow.addColorStop(0, 'rgba(255,90,30,.25)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      // mid spires
      ctx.fillStyle = pal.mid;
      for (let i = -1; i < 12; i++) { const bx = i * 300 - (this.cam.x * 0.5) % 300; ctx.beginPath(); ctx.moveTo(bx, 500); ctx.lineTo(bx + 40, 300 + (i % 4) * 30); ctx.lineTo(bx + 70, 290); ctx.lineTo(bx + 130, 500); ctx.closePath(); ctx.fill(); }
      // embers
      for (const e of this.embers) { ctx.globalAlpha = e.a; ctx.fillStyle = e.c; ctx.shadowBlur = 8; ctx.shadowColor = e.c; ctx.beginPath(); ctx.arc((e.x - this.cam.x * 0.7 + 4000) % (W + 40) - 20, e.y, e.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;

      // world space
      ctx.save();
      const sx = this.shake > 0 ? (Math.random() - .5) * 14 * this.shake : 0, sy = this.shake > 0 ? (Math.random() - .5) * 10 * this.shake : 0;
      ctx.translate(-this.cam.x + sx, -this.cam.y + sy);
      // lava under everything
      const lavaY = GROUND_Y + 36, t = performance.now() / 1000;
      const lg = ctx.createLinearGradient(0, lavaY, 0, lavaY + 160); lg.addColorStop(0, '#ffb347'); lg.addColorStop(0.25, pal.lava); lg.addColorStop(1, '#6a1202');
      ctx.fillStyle = lg; ctx.fillRect(this.cam.x - 50, lavaY, W + 100, Math.max(200, H));
      ctx.fillStyle = 'rgba(255,230,150,.35)';
      for (let x = Math.floor(this.cam.x / 40) * 40; x < this.cam.x + W + 40; x += 40) { const h = 4 + Math.sin(t * 2 + x * 0.05) * 3; ctx.fillRect(x, lavaY - h, 24, h + 2); }
      // ground blocks
      for (const r of this.solids) this.drawBlock(r, pal);
      for (const r of this.platforms) this.drawSlab(r, pal, 0);
      for (const c of this.crumbles) if (!c.gone) { const shakeX = c.timer > 0 && c.timer < 0.7 ? (Math.random() - .5) * 4 : 0; this.drawSlab({ ...c, x: c.x + shakeX, y: c.y + c.fall }, pal, c.timer); }
      // checkpoints + portal
      for (const c of this.checkpoints) this.drawTotem(c, t);
      this.drawPortal(t);
      // honey
      for (const h of this.honey) if (!h.taken) this.drawHoney(h, t);
      // enemies
      for (const e of this.enemies) this.drawEnemy(e, t);
      // player
      for (const tr of this.trail) { ctx.globalAlpha = tr.t * 1.6; this.sprite.draw(ctx, tr.x, tr.y, 1, 0); }
      ctx.globalAlpha = 1;
      if (this.p.dead <= 0) { if (this.p.inv > 0 && Math.floor(this.p.inv * 14) % 2 === 0) ctx.globalAlpha = 0.45; this.sprite.draw(ctx, this.p.x, this.p.y, 1, 0); ctx.globalAlpha = 1; }
      // rings: double-jump puffs and the Honey Burst shockwave
      for (const r of this.rings) {
        const life = r.big ? 1 - r.t / 0.7 : 1 - r.t / 0.35, rad = r.big ? 40 + life * 230 : 10 + life * 40;
        ctx.globalAlpha = (1 - life) * 0.9; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = r.big ? 6 : 3; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, r.big ? rad * 0.8 : rad * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (this.p.burstFx > 0) { ctx.globalAlpha = this.p.burstFx * 0.35; ctx.fillStyle = '#ffe9a8'; ctx.fillRect(this.cam.x - 50, this.cam.y - 50, W + 100, H + 100); ctx.globalAlpha = 1; }
      // particles / floats
      for (const q of this.particles) { ctx.globalAlpha = clamp(q.t, 0, 1); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.font = 'bold 16px Cinzel, serif'; ctx.textAlign = 'center';
      for (const f of this.floats) { ctx.globalAlpha = clamp(f.t, 0, 1); ctx.fillStyle = f.color; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.restore();
    }
    drawBlock(r, pal) {
      const ctx = this.ctx;
      ctx.fillStyle = pal.rock; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = pal.rockTop; ctx.fillRect(r.x, r.y, r.w, 10);
      ctx.fillStyle = 'rgba(255,120,40,.12)'; ctx.fillRect(r.x, r.y + 10, r.w, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      for (let x = r.x + 30; x < r.x + r.w; x += 70) { ctx.beginPath(); ctx.moveTo(x, r.y + 20); ctx.lineTo(x + 12, r.y + 60); ctx.lineTo(x - 6, r.y + 110); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(r.x, r.y + r.h - 30, r.w, 30);
    }
    drawSlab(r, pal, cracked) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(r.x + 4, r.y + 6, r.w, r.h);
      ctx.fillStyle = cracked ? '#3a2420' : pal.rock; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = cracked ? '#7a4a30' : pal.rockTop; ctx.fillRect(r.x, r.y, r.w, 6);
      if (cracked) { ctx.strokeStyle = 'rgba(255,200,120,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r.x + 10, r.y + 4); ctx.lineTo(r.x + r.w * 0.4, r.y + 14); ctx.lineTo(r.x + r.w * 0.7, r.y + 6); ctx.lineTo(r.x + r.w - 8, r.y + 15); ctx.stroke(); }
    }
    drawTotem(c, t) {
      const ctx = this.ctx, x = c.x, y = GROUND_Y;
      ctx.fillStyle = '#2b1a14'; ctx.fillRect(x - 10, y - 90, 20, 90);
      ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x - 14, y - 96, 28, 10);
      ctx.font = '30px serif'; ctx.textAlign = 'center';
      ctx.fillText(c.lit ? '🔥' : '🪨', x, y - 100 + (c.lit ? Math.sin(t * 8) * 2 : 0));
    }
    drawPortal(t) {
      const ctx = this.ctx, x = this.L.portal, y = GROUND_Y - 80;
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.6 + i * 0.4) * (i % 2 ? -1 : 1));
        ctx.strokeStyle = ['#3498db', '#7fdbff', '#f5e06e'][i]; ctx.lineWidth = 4 - i; ctx.shadowColor = '#7fdbff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(0, 0, 46 + i * 12, 70 + i * 10, 0, 0.3, Math.PI * 1.8); ctx.stroke(); ctx.restore();
      }
      const g = ctx.createRadialGradient(x, y, 5, x, y, 60); g.addColorStop(0, 'rgba(127,219,255,.45)'); g.addColorStop(1, 'rgba(52,152,219,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 44, 66, 0, 0, 7); ctx.fill();
      ctx.font = 'bold 11px Cinzel, serif'; ctx.fillStyle = '#7fdbff'; ctx.textAlign = 'center'; ctx.fillText('ARCHEAN', x, y + 100);
    }
    drawHoney(h, t) {
      const ctx = this.ctx, y = h.y + Math.sin(t * 3 + h.t) * 5;
      ctx.save(); ctx.translate(h.x, y);
      ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.bezierCurveTo(10, -4, 11, 6, 0, 12); ctx.bezierCurveTo(-11, 6, -10, -4, 0, -16); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-3, -2, 2.5, 4, -0.4, 0, 7); ctx.fill();
      ctx.restore();
    }
    drawEnemy(e, t) {
      const ctx = this.ctx;
      if (e.hpLeft <= 0 && e.dead <= 0) return;
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, e.w * 0.5, 7, 0, 0, 7); ctx.fill();
      if (e.dead > 0) { ctx.globalAlpha = e.dead / 0.6; ctx.scale(1 + (0.6 - e.dead), 1 - (0.6 - e.dead) * 0.8); }
      ctx.scale(e.dir, 1);
      ctx.font = `${e.h}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (e.hit > 0 && Math.floor(e.hit * 20) % 2 === 0) ctx.filter = 'brightness(3)';
      ctx.fillText(e.emoji, 0, Math.sin(t * 6 + e.bob) * 3);
      ctx.restore();
      if (e.hp > 1 && e.hpLeft > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40, 5); ctx.fillStyle = '#e74c3c'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40 * e.hpLeft / e.hp, 5); }
    }
  }

  root.HoneyRoad = HoneyRoad;
  root.HONEY_ROAD_LEVELS = LEVELS;
})(typeof self !== 'undefined' ? self : this);
