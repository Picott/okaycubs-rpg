// Guardian AI for the real-time hunt. Four families with telegraphed attacks and a vulnerable
// recovery window — the fight is about reading the tell, dodging, and punishing. Every guardian
// has a signature variant of its family's move, and every tell draws what is about to happen.
(function (root) {
  'use strict';
  const GROUND_Y = 480, GRAVITY = 2000;
  const FAMILY_OF = {
    golem: 'charger', rockgolem: 'charger', raptor: 'charger', warden: 'charger',
    ember: 'jumper', frost: 'jumper', keeper: 'jumper', crawler: 'jumper',
    shade: 'shooter', specter: 'shooter', ancient: 'shooter',
    sky: 'flyer',
  };
  const FAMILY_OF_EMOJI = { '🗿':'charger', '🪨':'charger', '🦖':'charger', '⏳':'charger', '🌍':'charger', '🏔':'charger', '⛰':'charger', '🦎':'charger', '🐚':'charger',
    '🔥':'jumper', '🧊':'jumper', '❄':'jumper', '🦂':'jumper', '🌋':'jumper', '👹':'jumper', '🌿':'jumper', '🪸':'jumper', '🦕':'jumper',
    '👻':'shooter', '🌑':'shooter', '🌱':'shooter', '🦠':'shooter', '🌫':'shooter', '🌀':'shooter', '👁':'shooter', '🌊':'shooter',
    '🦅':'flyer', '🐉':'flyer' };
  const TUNE = {
    charger: { cooldown: 1.5, tell: 0.55, chargeSpeed: 560, chargeTime: 0.62, rest: 1.1, contact: 1.2 },
    jumper:  { cooldown: 1.6, tell: 0.5,  leapVX: 340, leapVY: 720, rest: 0.8, contact: 1.0, wave: 0.8 },
    shooter: { cooldown: 1.3, tell: 0.45, shots: 3, shotGap: 0.28, shotSpeed: 400, reload: 0.9, contact: 0.9, shot: 0.7, keepAway: 300 },
    flyer:   { cooldown: 1.4, tell: 0.45, swoop: 0.95, rest: 0.7, contact: 1.0, hover: 130 },
  };
  // Signature moves — one per guardian, by name. Variants: charger double|stomp · jumper hops|high · shooter spread|rain · flyer twin|drop
  const MOVES = {
    'Magma Keeper':'high', 'Ember Sentinel':'hops', 'Caldera Warden':'hops', 'Lava Specter':'rain', 'Cinder Golem':'stomp',
    'Stone Warden':'double', 'Fault Titan':'stomp', 'Crust Shade':'spread', 'Obsidian Keeper':'double', 'Deep Rock Elder':'stomp',
    'Tide Keeper':'rain', 'Frost Sentinel':'hops', 'Current Warden':'spread', 'Ice Colossus':'high', 'Ocean Ancient':'rain',
    'Bloom Keeper':'high', 'Reef Warden':'hops', 'Venom Crawler':'hops', 'Spore Specter':'spread', 'Tide Leviathan':'double',
    'Titan Keeper':'high', 'Scale Warden':'twin', 'Apex Sentinel':'double', 'Pangaea Colossus':'stomp', 'Sky Warden':'drop',
    'Frost Keeper':'high', 'Time Warden':'double', 'Epoch Sentinel':'rain', 'The Last Guardian':'spread', 'Ice Age Titan':'stomp',
  };
  const MOVE_NAMES = { double:'Double Charge', stomp:'Stomp Charge', hops:'Triple Hop', high:'Sky Leap', spread:'Fan Shot', rain:'Honey Rain', twin:'Twin Dive', drop:'Bomb Drop' };
  const MOVE_TIPS  = { double:'it comes back — jump or dash twice', stomp:'the charge ends in a shockwave — stay airborne', hops:'three short hops, three small waves', high:'one huge leap — the wave is wide, jump late',
                       spread:'three shots in a fan — block, or jump the spread', rain:'shots fall from above — blocking does nothing, keep moving', twin:'two dives in a row — dodge, then dodge again', drop:'it hovers over you and drops shots — step out from under it' };
  const DEFAULT_MOVE = { charger:'double', jumper:'high', shooter:'spread', flyer:'twin' };
  const SHOT = { shade: '🌑', specter: '🌱', ancient: '🫧' };
  const ICON = { charger: '⚡', jumper: '⤵', shooter: '✦', flyer: '⬇' };

  function familyOf(type, emoji) { return FAMILY_OF[type] || FAMILY_OF_EMOJI[emoji] || 'jumper'; }

  function init(g) {
    g.family = g.family || familyOf(g.type, g.emoji);
    g.move = g.move || MOVES[g.name] || DEFAULT_MOVE[g.family];
    if (!MOVE_NAMES[g.move]) g.move = DEFAULT_MOVE[g.family];
    g.moveName = MOVE_NAMES[g.move]; g.moveTip = MOVE_TIPS[g.move];
    g.state = 'idle'; g.t = 0; g.vx = 0; g.vy = 0; g.airborne = false;
    g.stagger = 0; g.shotsLeft = 0; g.shotT = 0; g.hopsLeft = 0; g.chargesLeft = 0; g.divesLeft = 0; g.midMove = false;
    g.baseY = GROUND_Y; g.y = GROUND_Y;
    if (g.family === 'flyer') { g.y = GROUND_Y - TUNE.flyer.hover; g.fly = true; } else g.fly = false;
    g.hpLeft = g.hp;
  }

  function fire(game, g, T, angle, speed, extra) {
    const sx = g.x + g.dir * 20, sy = g.y - g.h * 0.55;
    game.projectiles.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, t: 2.4, glyph: SHOT[g.type] || '✦', scale: T.shot, atk: g.atk, ...(extra || {}) });
  }

  function step(game, g, dt) {
    const p = game.p, T = TUNE[g.family];
    const dx = p.x - g.x, dir = dx < 0 ? -1 : 1, dist = Math.abs(dx);
    g.t += dt;
    if (g.stagger > 0) { g.stagger -= dt; g.vx *= 0.8; g.x += g.vx * dt; return; }
    if (!['leap', 'swoop', 'charge', 'hop'].includes(g.state)) g.dir = dir;

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
        if (g.t > T.cooldown * (g.frozen > 0 ? 2 : 1) && (g.family === 'shooter' || g.family === 'flyer' ? dist < 700 : dist < 320)) {
          g.state = 'tell'; g.t = 0; g.vx = 0; g.aim = { x: p.x, y: p.y };
          game.float(g.x, g.y - g.h - 12, '!', '#ff8a7a'); game.sfx?.('tell');
        }
        break;
      }
      case 'tell': {
        g.vx = 0;
        if (g.family === 'flyer' && g.move === 'drop') g.x += (g.aim.x - g.x) * Math.min(1, dt * 3);   // slides over the cub before dropping
        if (g.t >= T.tell) {
          g.t = 0;
          if (g.family === 'charger')      { g.state = 'charge'; if (!g.midMove) g.chargesLeft = g.move === 'double' ? 1 : 0; g.midMove = false; g.vx = g.dir * T.chargeSpeed; game.shake = Math.max(game.shake, 0.15); }
          else if (g.family === 'jumper')  {
            if (g.move === 'hops') { g.state = 'hop'; g.hopsLeft = 2; g.vx = g.dir * T.leapVX * 0.8; g.vy = -T.leapVY * 0.55; }
            else { g.state = 'leap'; g.vx = g.dir * T.leapVX; g.vy = -T.leapVY * 1.15; }
            g.airborne = true;
          }
          else if (g.family === 'shooter') {
            if (g.move === 'spread') { const base = Math.atan2(p.y - 40 - (g.y - g.h * 0.55), p.x - g.x); for (const off of [-0.28, 0, 0.28]) fire(game, g, T, base + off, T.shotSpeed); g.state = 'reload'; }
            else { g.state = 'shoot'; g.shotsLeft = 4; g.shotT = 0; }
          }
          else {
            if (g.move === 'drop') { g.state = 'drop'; g.shotsLeft = 3; g.shotT = 0; }
            else { g.state = 'swoop'; g.divesLeft = 1; g.swoopFrom = { x: g.x, y: g.y }; g.swoopTo = { x: g.aim.x + dir * 60, y: GROUND_Y - 30 }; }
          }
        }
        break;
      }
      case 'charge': {
        if (g.t >= T.chargeTime) {
          if (g.chargesLeft > 0) { g.chargesLeft--; g.midMove = true; g.state = 'tell'; g.t = T.tell - 0.25; g.vx = 0; g.dir = p.x < g.x ? -1 : 1; g.aim = { x: p.x, y: p.y }; game.float(g.x, g.y - g.h - 12, '!', '#ff8a7a'); }
          else if (g.move === 'stomp') { g.state = 'rest'; g.t = 0; g.vx = 0; game.shake = Math.max(game.shake, 0.35); game.burst(g.x, g.y, ['#ffb347', '#fff'], 14, 140); game.waves.push({ x: g.x, dir: -1, t: 1.0, scale: 0.9, atk: g.atk }, { x: g.x, dir: 1, t: 1.0, scale: 0.9, atk: g.atk }); }
          else { g.state = 'rest'; g.t = 0; g.vx = 0; game.burst(g.x, g.y - 10, ['#ddd', '#aaa'], 8, 80); }
        }
        break;
      }
      case 'leap': case 'hop': {
        g.vy += GRAVITY * dt; g.y += g.vy * dt;
        if (g.y >= GROUND_Y) {
          g.y = GROUND_Y; g.vy = 0; g.airborne = false;
          const big = g.state === 'leap';
          game.shake = Math.max(game.shake, big ? 0.4 : 0.2);
          game.burst(g.x, g.y, ['#ffb347', '#fff'], big ? 16 : 8, big ? 160 : 100);
          game.waves.push({ x: g.x, dir: -1, t: big ? 1.3 : 0.7, scale: big ? 1.0 : 0.6, atk: g.atk }, { x: g.x, dir: 1, t: big ? 1.3 : 0.7, scale: big ? 1.0 : 0.6, atk: g.atk });
          if (g.state === 'hop' && g.hopsLeft > 0) { g.hopsLeft--; g.dir = p.x < g.x ? -1 : 1; g.vx = g.dir * T.leapVX * 0.8; g.vy = -T.leapVY * 0.55; g.airborne = true; }
          else { g.state = 'rest'; g.t = 0; g.vx = 0; }
        }
        break;
      }
      case 'shoot': {   // honey rain: lobbed high, lands around the cub
        g.vx = 0; g.shotT -= dt;
        if (g.shotsLeft > 0 && g.shotT <= 0) {
          g.shotsLeft--; g.shotT = T.shotGap;
          const tx = p.x + (Math.random() - 0.5) * 140, dxs = tx - g.x, up = -760, tFly = 1.1;
          game.projectiles.push({ x: g.x, y: g.y - g.h * 0.6, vx: dxs / tFly, vy: up, t: 3, glyph: SHOT[g.type] || '✦', scale: T.shot, atk: g.atk, rain: true, gravity: 1400 });
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
        if (k >= 1) {
          if (g.move === 'twin' && g.divesLeft > 0) { g.divesLeft--; g.t = 0; g.swoopFrom = { x: g.x, y: g.y }; g.swoopTo = { x: p.x + (p.x < g.x ? -1 : 1) * 60, y: GROUND_Y - 30 }; g.aim = { x: g.swoopTo.x, y: GROUND_Y }; }
          else { g.state = 'rest'; g.t = 0; g.y = GROUND_Y - T.hover * 0.5; }
        }
        break;
      }
      case 'drop': {   // hovers above the cub and drops three shots
        g.vx = 0; g.x += (p.x - g.x) * Math.min(1, dt * 1.5); g.y = GROUND_Y - T.hover - 20;
        g.shotT -= dt;
        if (g.shotsLeft > 0 && g.shotT <= 0) { g.shotsLeft--; g.shotT = 0.35; game.projectiles.push({ x: g.x, y: g.y + 10, vx: 0, vy: 120, t: 2.5, glyph: '💧', scale: T.shot, atk: g.atk, rain: true, gravity: 900 }); }
        if (g.shotsLeft <= 0 && g.shotT <= 0) { g.state = 'rest'; g.t = 0; }
        break;
      }
      case 'rest': {
        g.vx *= 0.85;
        if (g.family === 'flyer') g.y += (GROUND_Y - T.hover - g.y) * Math.min(1, dt * 3);
        if (g.t >= T.rest) { g.state = 'idle'; g.t = 0; }
        break;
      }
    }
    if (g.frozen > 0) g.vx *= 0.4;
    g.x += g.vx * dt;
    g.x = Math.max(g.range[0], Math.min(g.range[1], g.x));
    // hitting the arena wall ends the charge early, but the move still finishes (stomp wave / second charge)
    if ((g.x === g.range[0] || g.x === g.range[1]) && g.state === 'charge') g.t = Math.max(g.t, TUNE.charger.chargeTime);
  }

  // damage multiplier the guardian takes right now (punish the recovery window)
  function vulnerability(g) { return g.state === 'rest' || g.state === 'reload' || g.stagger > 0 ? 1.5 : 1; }
  // damage the guardian deals on contact in its current state
  function contactScale(g) { const T = TUNE[g.family]; return g.state === 'rest' || g.state === 'reload' ? 0 : (g.state === 'charge' || g.state === 'leap' || g.state === 'hop' || g.state === 'swoop') ? T.contact : 0.6; }
  function isSpecial(g) { return ['charge', 'leap', 'hop', 'swoop'].includes(g.state); }

  // What is about to happen, drawn in world space during the tell
  function drawTelegraph(ctx, g, game) {
    if (g.state !== 'tell' || !g.aim) return;
    const T = TUNE[g.family], k = Math.min(1, g.t / T.tell), pulse = 0.6 + Math.sin(game.time * 24) * 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(255,80,60,${0.35 + 0.5 * pulse})`; ctx.fillStyle = `rgba(255,80,60,${0.12 + 0.18 * pulse})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    if (g.family === 'charger') {
      const len = T.chargeSpeed * T.chargeTime, x0 = g.x, x1 = Math.max(g.range[0], Math.min(g.range[1], g.x + g.dir * len));
      ctx.beginPath(); ctx.moveTo(x0, GROUND_Y - 6); ctx.lineTo(x1, GROUND_Y - 6); ctx.stroke();
      ctx.setLineDash([]); for (let i = 1; i <= 3; i++) { const cx = x0 + (x1 - x0) * (i / 4); ctx.beginPath(); ctx.moveTo(cx - g.dir * 10, GROUND_Y - 16); ctx.lineTo(cx, GROUND_Y - 6); ctx.lineTo(cx - g.dir * 10, GROUND_Y + 4); ctx.stroke(); }
      if (g.move === 'stomp') { ctx.beginPath(); ctx.ellipse(x1, GROUND_Y, 60 * (0.6 + 0.4 * k), 12, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else if (g.family === 'jumper') {
      const vy = g.move === 'hops' ? T.leapVY * 0.55 : T.leapVY * 1.15, vx = g.move === 'hops' ? T.leapVX * 0.8 : T.leapVX;
      const land = g.x + g.dir * vx * (2 * vy / GRAVITY), w = g.move === 'hops' ? 46 : 90;
      ctx.beginPath(); ctx.ellipse(land, GROUND_Y, w * (0.6 + 0.4 * k), 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(g.x, g.y - g.h / 2); ctx.quadraticCurveTo((g.x + land) / 2, g.y - g.h / 2 - (g.move === 'hops' ? 90 : 220), land, GROUND_Y); ctx.stroke();
    } else if (g.family === 'shooter') {
      if (g.move === 'rain') { ctx.beginPath(); ctx.ellipse(g.aim.x, GROUND_Y, 110 * (0.6 + 0.4 * k), 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(g.x, g.y - g.h * 0.55); ctx.lineTo(game.p.x, game.p.y - 40); ctx.stroke(); }
    } else {
      const tx = g.move === 'drop' ? game.p.x : g.aim.x + (g.aim.x < g.x ? -1 : 1) * 60;
      ctx.beginPath(); ctx.ellipse(tx, GROUND_Y, 50 * (0.6 + 0.4 * k), 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo((g.x + tx) / 2, g.y + 20, tx, GROUND_Y - 20); ctx.stroke();
    }
    ctx.setLineDash([]);
    // the move icon over the guardian's head
    ctx.font = 'bold 26px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6b5a'; ctx.shadowColor = '#ff3b1f'; ctx.shadowBlur = 16 * pulse;
    ctx.fillText(ICON[g.family], g.x, g.y - g.h - 26 - pulse * 4);
    ctx.font = 'bold 9px Cinzel, serif'; ctx.fillStyle = '#ffd2cc'; ctx.shadowBlur = 0; ctx.fillText(g.moveName.toUpperCase(), g.x, g.y - g.h - 10);
    ctx.restore();
  }

  root.Guardian = { init, step, vulnerability, contactScale, isSpecial, drawTelegraph, familyOf, MOVES, MOVE_NAMES, MOVE_TIPS, TUNE };
})(typeof self !== 'undefined' ? self : this);
