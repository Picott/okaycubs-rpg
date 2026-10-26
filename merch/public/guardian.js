// Guardian AI for the real-time hunt. Four families with telegraphed attacks and a vulnerable
// recovery window — the fight is about reading the tell, dodging, and punishing.
(function (root) {
  'use strict';
  const GROUND_Y = 480, GRAVITY = 2000;
  const FAMILY_OF = {
    golem: 'charger', rockgolem: 'charger', raptor: 'charger', warden: 'charger',
    ember: 'jumper', frost: 'jumper', keeper: 'jumper', crawler: 'jumper',
    shade: 'shooter', specter: 'shooter', ancient: 'shooter',
    sky: 'flyer',
  };
  const TUNE = {
    charger: { cooldown: 1.5, tell: 0.55, chargeSpeed: 560, chargeTime: 0.62, rest: 1.1, contact: 1.2 },
    jumper:  { cooldown: 1.6, tell: 0.5,  leapVX: 340, leapVY: 720, rest: 0.8, contact: 1.0, wave: 0.8 },
    shooter: { cooldown: 1.3, tell: 0.45, shots: 3, shotGap: 0.28, shotSpeed: 400, reload: 0.9, contact: 0.9, shot: 0.7, keepAway: 300 },
    flyer:   { cooldown: 1.4, tell: 0.45, swoop: 0.95, rest: 0.7, contact: 1.0, hover: 130 },
  };
  // guardian emoji → projectile glyph by era feel
  const SHOT = { shade: '🌑', specter: '🌱', ancient: '🫧' };

  const FAMILY_OF_EMOJI = { '🗿':'charger', '🪨':'charger', '🦖':'charger', '⏳':'charger', '🌍':'charger', '🏔':'charger', '⛰':'charger', '🦎':'charger', '🐚':'charger',
    '🔥':'jumper', '🧊':'jumper', '❄':'jumper', '🦂':'jumper', '🌋':'jumper', '👹':'jumper', '🌿':'jumper', '🪸':'jumper', '🦕':'jumper',
    '👻':'shooter', '🌑':'shooter', '🌱':'shooter', '🦠':'shooter', '🌫':'shooter', '🌀':'shooter', '👁':'shooter', '🌊':'shooter',
    '🦅':'flyer', '🐉':'flyer' };
  function familyOf(type, emoji) { return FAMILY_OF[type] || FAMILY_OF_EMOJI[emoji] || 'jumper'; }

  function init(g) {
    g.family = g.family || familyOf(g.type, g.emoji);
    g.state = 'idle'; g.t = 0; g.vx = 0; g.vy = 0; g.airborne = false;
    g.stagger = 0; g.tell = 0; g.shotsLeft = 0; g.shotT = 0;
    g.baseY = GROUND_Y; g.y = GROUND_Y;
    if (g.family === 'flyer') { g.y = GROUND_Y - TUNE.flyer.hover; g.fly = true; }
    g.hpLeft = g.hp;
  }

  function step(game, g, dt) {
    const p = game.p, T = TUNE[g.family];
    const dx = p.x - g.x, dir = dx < 0 ? -1 : 1, dist = Math.abs(dx);
    g.t += dt;
    if (g.stagger > 0) { g.stagger -= dt; g.vx *= 0.8; g.x += g.vx * dt; return; }
    if (g.state !== 'leap' && g.state !== 'swoop') g.dir = dir;

    switch (g.state) {
      case 'idle': {
        if (g.family === 'shooter') {
          if (dist < T.keepAway - 60) g.vx = -dir * g.speed * 1.2; else if (dist > T.keepAway + 80) g.vx = dir * g.speed; else g.vx *= 0.8;
        } else if (g.family === 'flyer') {
          g.vx = dir * g.speed * (dist > 160 ? 1 : 0.3);
          g.y = GROUND_Y - T.hover + Math.sin(game.time * 2.2) * 14;
        } else {
          g.vx = dist > 70 ? dir * g.speed * 0.9 : 0;
        }
        if (g.t > T.cooldown && (g.family === 'shooter' ? dist < 700 : dist < 320)) { g.state = 'tell'; g.t = 0; g.vx = 0; game.float(g.x, g.y - g.h - 12, '!', '#ff8a7a'); }
        break;
      }
      case 'tell': {
        g.vx = 0;
        if (g.t >= T.tell) {
          g.t = 0;
          if (g.family === 'charger')      { g.state = 'charge'; g.vx = g.dir * T.chargeSpeed; game.shake = Math.max(game.shake, 0.15); }
          else if (g.family === 'jumper')  { g.state = 'leap'; g.vx = g.dir * T.leapVX; g.vy = -T.leapVY; g.airborne = true; }
          else if (g.family === 'shooter') { g.state = 'shoot'; g.shotsLeft = T.shots; g.shotT = 0; }
          else                             { g.state = 'swoop'; g.swoopFrom = { x: g.x, y: g.y }; g.swoopTo = { x: p.x + dir * 60, y: GROUND_Y - 30 }; }
        }
        break;
      }
      case 'charge': {
        if (g.t >= T.chargeTime) { g.state = 'rest'; g.t = 0; g.vx = 0; game.burst(g.x, g.y - 10, ['#ddd', '#aaa'], 8, 80); }
        break;
      }
      case 'leap': {
        g.vy += GRAVITY * dt; g.y += g.vy * dt;
        if (g.y >= GROUND_Y) {
          g.y = GROUND_Y; g.vy = 0; g.airborne = false; g.state = 'rest'; g.t = 0; g.vx = 0;
          game.shake = Math.max(game.shake, 0.35);
          game.burst(g.x, g.y, ['#ffb347', '#fff'], 14, 140);
          game.waves.push({ x: g.x, dir: -1, t: 1.1, scale: T.wave, atk: g.atk }, { x: g.x, dir: 1, t: 1.1, scale: T.wave, atk: g.atk });
        }
        break;
      }
      case 'shoot': {
        g.vx = 0; g.shotT -= dt;
        if (g.shotsLeft > 0 && g.shotT <= 0) {
          g.shotsLeft--; g.shotT = T.shotGap;
          const sx = g.x + g.dir * 20, sy = g.y - g.h * 0.55, tx = p.x, ty = p.y - 40;
          const ang = Math.atan2(ty - sy, tx - sx), v = T.shotSpeed;
          game.projectiles.push({ x: sx, y: sy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 60, t: 2.2, glyph: SHOT[g.type] || '✦', scale: T.shot, atk: g.atk });
        }
        if (g.shotsLeft <= 0 && g.shotT <= 0) { g.state = 'reload'; g.t = 0; }
        break;
      }
      case 'reload': { g.vx = -g.dir * g.speed * 0.5; if (g.t >= T.reload) { g.state = 'idle'; g.t = 0; } break; }
      case 'swoop': {
        const k = Math.min(1, g.t / T.swoop), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        g.x = g.swoopFrom.x + (g.swoopTo.x - g.swoopFrom.x) * e;
        g.y = g.swoopFrom.y + (g.swoopTo.y - g.swoopFrom.y) * Math.sin(e * Math.PI);
        g.vx = 0;
        if (k >= 1) { g.state = 'rest'; g.t = 0; g.y = GROUND_Y - T.hover * 0.5; }
        break;
      }
      case 'rest': {
        g.vx *= 0.85;
        if (g.family === 'flyer') g.y += (GROUND_Y - T.hover - g.y) * Math.min(1, dt * 3);
        if (g.t >= T.rest) { g.state = 'idle'; g.t = 0; }
        break;
      }
    }
    g.x += g.vx * dt;
    g.x = Math.max(g.range[0], Math.min(g.range[1], g.x));
    if (g.x === g.range[0] || g.x === g.range[1]) { if (g.state === 'charge') { g.state = 'rest'; g.t = 0; g.vx = 0; } }
  }

  // damage multiplier the guardian takes right now (punish the recovery window)
  function vulnerability(g) { return g.state === 'rest' || g.state === 'reload' || g.stagger > 0 ? 1.5 : 1; }
  // damage the guardian deals on contact in its current state
  function contactScale(g) { const T = TUNE[g.family]; return g.state === 'rest' || g.state === 'reload' ? 0 : (g.state === 'charge' || g.state === 'leap' || g.state === 'swoop') ? T.contact : 0.6; }

  root.Guardian = { init, step, vulnerability, contactScale, familyOf, TUNE };
})(typeof self !== 'undefined' ? self : this);
