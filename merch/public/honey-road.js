// Honey Road — side-scrolling platformer levels between eras. Canvas 2D, no dependencies beyond sprite.js.
(function (root) {
  'use strict';
  const PHYS = root.PHYS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const VIEW_H = 600, GROUND_Y = 480, FLOOR_H = 160;
  const PLAYER_W = 34, PLAYER_H = 74;

  // ---------- level data ----------
  // x grows to the right, y grows down; the floor top is GROUND_Y. Gaps in `ground` are the era's hazard.
  // `ice: true` on a ground segment / platform makes it slippery. Honey is auto-placed unless listed.
  const LEVELS = {
    hadean: {
      title: 'Magma Road', honeyName: 'Magma Honey', next: 'archean', length: 3600, hazard: 'lava',
      intro: 'Run the molten road, dodge the Ember Sentinels, gather every drop of Magma Honey and reach the portal to the Archean era.',
      palette: { skyTop: '#140612', skyBottom: '#4a1208', far: '#2a0a12', mid: '#1b0909', rock: '#241412', rockTop: '#5a3a2c', ember: ['#ff6b35', '#f1c40f', '#ff3b1f'], glow: 'rgba(255,90,30,.25)' },
      ground: [[0, 900], [1020, 1500], [1700, 2320], [2440, 3600]],
      platforms: [{ x: 640, y: 372, w: 150 }, { x: 1180, y: 352, w: 120 }, { x: 1330, y: 268, w: 110 }, { x: 2080, y: 330, w: 130 }, { x: 2650, y: 360, w: 140 }, { x: 2860, y: 280, w: 120 }, { x: 3050, y: 360, w: 130 }],
      crumble: [{ x: 1545, y: 392, w: 110 }, { x: 1880, y: 372, w: 130 }, { x: 2340, y: 400, w: 90 }],
      enemies: [{ type: 'ember', x: 520, range: [400, 760] }, { type: 'ember', x: 1150, range: [1040, 1450] }, { type: 'golem', x: 1850, range: [1720, 2050] }, { type: 'ember', x: 2560, range: [2460, 2780] }, { type: 'ember', x: 2950, range: [2820, 3150] }, { type: 'golem', x: 3250, range: [3180, 3420] }],
      honey: [[220, 430], [300, 400], [380, 430], [680, 320], [730, 300], [780, 320], [960, 300], [1100, 430], [1230, 300], [1380, 215], [1430, 215], [1600, 330], [1760, 430], [1930, 320], [2140, 280], [2200, 430], [2380, 340], [2520, 430], [2700, 310], [2750, 310], [2900, 230], [2950, 230], [3100, 310], [3200, 430], [3300, 400], [3360, 430]],
      checkpoints: [1080, 2480], portal: 3500,
    },
    archean: {
      title: 'Stone Road', honeyName: 'Stone Honey', next: 'proterozoic', length: 4000, hazard: 'chasm',
      intro: 'The crust has hardened into cliffs and bottomless faults. Ride the drifting slabs, outrun the Crust Shades and claim the Stone Honey.',
      palette: { skyTop: '#070b16', skyBottom: '#1c2a3f', far: '#101a2a', mid: '#0b121d', rock: '#1f2733', rockTop: '#5b6b80', ember: ['#8fa3bf', '#3498db', '#dfe7f2'], glow: 'rgba(52,152,219,.22)' },
      ground: [[0, 700], [860, 1300], [1560, 1900], [2240, 2700], [2900, 3200], [3420, 4000]],
      platforms: [{ x: 560, y: 360, w: 120 }, { x: 1120, y: 340, w: 110 }, { x: 1740, y: 350, w: 120 }, { x: 2460, y: 330, w: 120 }, { x: 2600, y: 240, w: 100 }, { x: 3000, y: 350, w: 120 }, { x: 3560, y: 340, w: 130 }],
      crumble: [{ x: 1960, y: 390, w: 100 }, { x: 3260, y: 400, w: 90 }],
      movers: [{ x: 720, y: 400, w: 110, dx: 50, dy: 0, period: 3 }, { x: 1380, y: 380, w: 110, dx: 0, dy: 70, period: 3.4 }, { x: 2070, y: 360, w: 110, dx: 60, dy: 40, period: 4 }, { x: 2760, y: 400, w: 100, dx: 40, dy: 0, period: 2.6 }, { x: 3300, y: 330, w: 100, dx: 0, dy: 80, period: 3.2 }],
      enemies: [{ type: 'shade', x: 420, range: [300, 640] }, { type: 'rockgolem', x: 1050, range: [900, 1250] }, { type: 'shade', x: 1700, range: [1580, 1860] }, { type: 'shade', x: 2400, range: [2260, 2660] }, { type: 'rockgolem', x: 3050, range: [2920, 3180] }, { type: 'shade', x: 3650, range: [3460, 3850] }, { type: 'rockgolem', x: 3800, range: [3700, 3900] }],
      checkpoints: [900, 2280, 3460], portal: 3900,
    },
    proterozoic: {
      title: 'Tide Road', honeyName: 'Tide Honey', next: 'paleozoic', length: 4200, hazard: 'water',
      intro: 'Snowball Earth: the oceans learned to breathe, then the whole planet froze. Everything slides — plan your jumps, stomp the Frost Sentinels and bring back the Tide Honey.',
      palette: { skyTop: '#031016', skyBottom: '#0b3a40', far: '#0a2a30', mid: '#061c22', rock: '#163a44', rockTop: '#a8e6cf', ember: ['#7fdbff', '#a8e6cf', '#ffffff'], glow: 'rgba(26,188,156,.25)' },
      ground: [[0, 760, true], [900, 1400, true], [1640, 2000], [2200, 2800, true], [3000, 3400, true], [3600, 4200, true]],
      platforms: [{ x: 620, y: 350, w: 120, ice: true }, { x: 1180, y: 330, w: 110 }, { x: 1440, y: 400, w: 100, ice: true }, { x: 1800, y: 340, w: 120 }, { x: 2060, y: 380, w: 90 }, { x: 2460, y: 340, w: 120, ice: true }, { x: 2620, y: 250, w: 100 }, { x: 3160, y: 350, w: 120, ice: true }, { x: 3440, y: 390, w: 100 }, { x: 3800, y: 340, w: 130 }],
      crumble: [{ x: 2860, y: 400, w: 90 }],
      movers: [{ x: 3480, y: 320, w: 100, dx: 0, dy: 70, period: 3 }],
      enemies: [{ type: 'frost', x: 480, range: [330, 700] }, { type: 'ancient', x: 1100, range: [950, 1350] }, { type: 'frost', x: 1750, range: [1660, 1960] }, { type: 'frost', x: 2400, range: [2240, 2760] }, { type: 'ancient', x: 2650, range: [2500, 2800] }, { type: 'frost', x: 3200, range: [3020, 3380] }, { type: 'ancient', x: 3850, range: [3640, 4100] }, { type: 'frost', x: 3950, range: [3700, 4100] }],
      checkpoints: [940, 2240, 3640], portal: 4100,
    },
    paleozoic: {
      title: 'Bloom Road', honeyName: 'Bloom Honey', next: 'mesozoic', length: 4400, hazard: 'venom',
      intro: 'Life explodes across the reef. Bounce off the giant mushrooms, watch the venom pools and outrun every crawler to the Bloom Honey.',
      palette: { skyTop: '#06140a', skyBottom: '#1c3d14', far: '#0f2a12', mid: '#091c0c', rock: '#1d2e14', rockTop: '#5f8f3a', ember: ['#a3ff8f', '#f1c40f', '#2ecc71'], glow: 'rgba(46,204,113,.22)' },
      ground: [[0, 680], [840, 1240], [1480, 1900], [2120, 2560], [2760, 3200], [3440, 3800], [3960, 4400]],
      platforms: [{ x: 1020, y: 330, w: 110 }, { x: 1700, y: 330, w: 110 }, { x: 1860, y: 240, w: 100 }, { x: 2300, y: 350, w: 120 }, { x: 2940, y: 320, w: 120 }, { x: 3100, y: 230, w: 100 }, { x: 3600, y: 340, w: 110 }, { x: 4100, y: 330, w: 130 }],
      crumble: [{ x: 1280, y: 400, w: 100 }, { x: 2600, y: 400, w: 90 }, { x: 3840, y: 400, w: 90 }],
      springs: [{ x: 620 }, { x: 1420 }, { x: 2070 }, { x: 2700 }, { x: 3380 }, { x: 3900 }],
      enemies: [{ type: 'crawler', x: 400, range: [250, 620] }, { type: 'specter', x: 1000, range: [880, 1200] }, { type: 'crawler', x: 1600, range: [1500, 1860] }, { type: 'crawler', x: 2300, range: [2140, 2520] }, { type: 'specter', x: 2900, range: [2780, 3160] }, { type: 'crawler', x: 3600, range: [3460, 3760] }, { type: 'specter', x: 4100, range: [3980, 4300] }, { type: 'crawler', x: 4200, range: [4000, 4320] }],
      checkpoints: [880, 2160, 3480], portal: 4300,
    },
    mesozoic: {
      title: 'Titan Road', honeyName: 'Titan Honey', next: 'cenozoic', length: 4600, hazard: 'amber',
      intro: 'The age of giants. Apex Sentinels charge the moment they see you, pterosaur Sky Wardens dive from above and the amber pools swallow whoever stops — keep moving and seize the Titan Honey.',
      palette: { skyTop: '#160b03', skyBottom: '#5a2e0a', far: '#2e1708', mid: '#1c0e05', rock: '#2a1a0e', rockTop: '#8a5a2a', ember: ['#f39c12', '#ff9f43', '#ffe08a'], glow: 'rgba(243,156,18,.25)' },
      ground: [[0, 800], [980, 1500], [1700, 2200], [2420, 2900], [3080, 3600], [3820, 4600]],
      platforms: [{ x: 640, y: 350, w: 120 }, { x: 860, y: 380, w: 100 }, { x: 1240, y: 330, w: 120 }, { x: 1560, y: 390, w: 110 }, { x: 1960, y: 330, w: 120 }, { x: 2280, y: 380, w: 110 }, { x: 2660, y: 340, w: 120 }, { x: 2960, y: 400, w: 100 }, { x: 3300, y: 330, w: 130 }, { x: 3680, y: 380, w: 110 }, { x: 4100, y: 330, w: 130 }, { x: 4300, y: 240, w: 100 }],
      crumble: [{ x: 1040, y: 400, w: 90 }, { x: 2500, y: 400, w: 90 }, { x: 3900, y: 400, w: 90 }],
      movers: [{ x: 2100, y: 300, w: 100, dx: 0, dy: 90, period: 3.2 }, { x: 3480, y: 380, w: 100, dx: 60, dy: 0, period: 2.8 }],
      enemies: [{ type: 'raptor', x: 500, range: [300, 760] }, { type: 'sky', x: 1200, range: [1000, 1480] }, { type: 'raptor', x: 1900, range: [1720, 2180] }, { type: 'sky', x: 2600, range: [2440, 2880] }, { type: 'raptor', x: 3300, range: [3100, 3580] }, { type: 'sky', x: 3400, range: [3100, 3580] }, { type: 'raptor', x: 4200, range: [3860, 4480] }, { type: 'sky', x: 4300, range: [4000, 4500] }],
      checkpoints: [1020, 2460, 3860], portal: 4500,
    },
    cenozoic: {
      title: 'Frost Road', honeyName: 'Frost Honey', next: null, length: 5000, hazard: 'ice',
      intro: 'The last road, in the age the first bears were born. Ice, drifting floes and the Time Wardens stand between you and the Golden Drop — the honey that bends time itself.',
      palette: { skyTop: '#060a14', skyBottom: '#1f3348', far: '#162638', mid: '#0d1826', rock: '#24344a', rockTop: '#dfe9f5', ember: ['#ffffff', '#aed6f1', '#e74c3c'], glow: 'rgba(174,214,241,.22)' },
      ground: [[0, 700, true], [880, 1300, true], [1520, 1900], [2120, 2600, true], [2840, 3200, true], [3440, 3900], [4120, 5000, true]],
      platforms: [{ x: 540, y: 340, w: 120, ice: true }, { x: 1100, y: 330, w: 110 }, { x: 1700, y: 340, w: 120, ice: true }, { x: 1960, y: 390, w: 90 }, { x: 2360, y: 330, w: 120 }, { x: 2520, y: 240, w: 100, ice: true }, { x: 3000, y: 340, w: 120 }, { x: 3600, y: 330, w: 120, ice: true }, { x: 3760, y: 240, w: 100 }, { x: 4300, y: 340, w: 130 }, { x: 4600, y: 300, w: 120, ice: true }],
      crumble: [{ x: 1340, y: 400, w: 90 }, { x: 2660, y: 400, w: 90 }, { x: 3960, y: 400, w: 90 }],
      movers: [{ x: 740, y: 380, w: 100, dx: 50, dy: 0, period: 2.8 }, { x: 1980, y: 300, w: 100, dx: 0, dy: 90, period: 3 }, { x: 3260, y: 360, w: 100, dx: 70, dy: 30, period: 3.6 }, { x: 4000, y: 320, w: 100, dx: 0, dy: 70, period: 2.6 }],
      springs: [{ x: 1600 }, { x: 3500 }],
      enemies: [{ type: 'keeper', x: 420, range: [280, 660] }, { type: 'warden', x: 1100, range: [920, 1260] }, { type: 'keeper', x: 1700, range: [1560, 1860] }, { type: 'keeper', x: 2300, range: [2160, 2560] }, { type: 'warden', x: 3000, range: [2880, 3160] }, { type: 'keeper', x: 3650, range: [3480, 3860] }, { type: 'warden', x: 4400, range: [4160, 4700] }, { type: 'keeper', x: 4700, range: [4500, 4850] }, { type: 'warden', x: 4800, range: [4600, 4900] }],
      checkpoints: [920, 2160, 3480, 4160], portal: 4900,
    },
  };

  const HAZARDS = {
    lava:  { top: '#ffb347', mid: '#ff6a1a', deep: '#6a1202', foam: 'rgba(255,230,150,.35)', name: 'lava' },
    chasm: { top: '#0b1220', mid: '#05080f', deep: '#000000', foam: 'rgba(120,150,200,.12)', name: 'the fault' },
    water: { top: '#7fdbff', mid: '#1a8fa8', deep: '#062a33', foam: 'rgba(255,255,255,.45)', name: 'freezing water' },
    venom: { top: '#b8ff6a', mid: '#4caf2a', deep: '#123a0a', foam: 'rgba(230,255,160,.4)', name: 'venom' },
    amber: { top: '#ffd27a', mid: '#e0932a', deep: '#6b3b05', foam: 'rgba(255,240,200,.4)', name: 'amber' },
    ice:   { top: '#e8f6ff', mid: '#8ec5e8', deep: '#1b4a6b', foam: 'rgba(255,255,255,.6)', name: 'glacial water' },
  };

  const ENEMY_TYPES = {
    ember:     { emoji: '🔥', hp: 1, speed: 95,  w: 44, h: 52, stompable: true,  name: 'Ember Sentinel' },
    golem:     { emoji: '🗿', hp: 2, speed: 42,  w: 56, h: 66, stompable: false, name: 'Cinder Golem' },
    shade:     { emoji: '🌑', hp: 1, speed: 135, w: 44, h: 48, stompable: true,  name: 'Crust Shade' },
    rockgolem: { emoji: '🪨', hp: 3, speed: 36,  w: 60, h: 62, stompable: false, name: 'Deep Rock Elder' },
    frost:     { emoji: '🧊', hp: 1, speed: 85,  w: 46, h: 50, stompable: true,  name: 'Frost Sentinel' },
    ancient:   { emoji: '🦠', hp: 2, speed: 60,  w: 48, h: 50, stompable: true,  fly: true, name: 'Ocean Ancient' },
    crawler:   { emoji: '🦂', hp: 1, speed: 150, w: 48, h: 44, stompable: true,  name: 'Venom Crawler' },
    specter:   { emoji: '🌱', hp: 2, speed: 55,  w: 44, h: 50, stompable: true,  fly: true, name: 'Spore Specter' },
    raptor:    { emoji: '🦖', hp: 3, speed: 60,  w: 64, h: 70, stompable: false, charge: true, name: 'Apex Sentinel' },
    sky:       { emoji: '🦅', hp: 1, speed: 110, w: 52, h: 48, stompable: true,  fly: true, name: 'Pterosaur Warden' },
    keeper:    { emoji: '❄',  hp: 2, speed: 75,  w: 48, h: 50, stompable: true,  name: 'Frost Keeper' },
    warden:    { emoji: '⏳', hp: 3, speed: 50,  w: 52, h: 64, stompable: false, charge: true, name: 'Time Warden' },
  };

  // Auto-place honey: a drop every ~190px of safe floor, plus a pair above every platform. Capped at 36.
  function autoHoney(L) {
    const out = [];
    for (const [a, b] of L.ground) for (let x = a + 150; x < b - 100; x += 190) { if (Math.abs(x - L.portal) > 160) out.push([x, 432]); }
    for (const p of [...L.platforms, ...(L.crumble || []), ...(L.movers || [])]) { out.push([p.x + p.w / 2 - 22, p.y - 56], [p.x + p.w / 2 + 22, p.y - 56]); }
    out.sort((p, q) => p[0] - q[0]);
    if (out.length > 36) { const step = out.length / 36; return Array.from({ length: 36 }, (_, i) => out[Math.floor(i * step)]); }
    return out;
  }
  for (const L of Object.values(LEVELS)) { if (!L.honey) L.honey = autoHoney(L); L.movers = L.movers || []; L.springs = L.springs || []; L.crumble = L.crumble || []; }

  // ---------- game ----------
  class HoneyRoad {
    constructor(canvas, sprite, era, hooks) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.sprite = sprite; this.era = era; this.L = typeof era === 'object' ? era : (LEVELS[era] || LEVELS.hadean); this.hooks = hooks || {};
      this.input = { left: false, right: false, jump: false, jumpHeld: false, attack: false, dash: false, block: false };
      this.reset();
      this.embers = Array.from({ length: 60 }, () => this.mkEmber(true));
      this.last = performance.now(); this.running = false; this.paused = false;
      this.resize();
      addEventListener('resize', () => this.resize());
    }

    sfx(name) { try { root.GameMusic?.sfx(name); } catch (e) {} }
    reset() {
      const L = this.L;
      this.p = { x: 80, y: GROUND_Y, vx: 0, vy: 0, grounded: true, facing: 1, coyote: 0, buffer: 0, dashT: 0, dashCd: 0, dashDir: 1,
                 hp: 3, inv: 0, honey: 0, checkpoint: 80, dead: 0, attackT: 0, stunned: 0,
                 jumpsLeft: 1, burst: 0, burstStreak: 0, primed: 0, burstFx: 0, onRect: null };
      this.solids = L.ground.map(([a, b, ice]) => ({ x: a, y: GROUND_Y, w: b - a, h: FLOOR_H, type: 'ground', ice: !!ice }));
      this.platforms = L.platforms.map(p => ({ ...p, h: 18, type: 'platform' }));
      this.movers = L.movers.map(m => ({ ...m, h: 18, type: 'mover', cx: m.x, cy: m.y, dx0: 0, dy0: 0 }));
      this.springs = L.springs.map(sp => ({ x: sp.x, y: GROUND_Y, t: 0 }));
      this.crumbles = L.crumble.map(p => ({ ...p, h: 18, type: 'crumble', timer: 0, fall: 0, gone: false }));
      this.enemies = L.enemies.map(e => ({ ...ENEMY_TYPES[e.type], type: e.type, x: e.x, y: GROUND_Y, range: e.range, dir: 1, hpLeft: ENEMY_TYPES[e.type].hp, dead: 0, hit: 0, bob: Math.random() * 6, chargeT: 0, restT: 0 }));
      this.honey = L.honey.map(([x, y]) => ({ x, y, taken: false, t: Math.random() * 6 }));
      this.checkpoints = L.checkpoints.map(x => ({ x, lit: false }));
      this.particles = []; this.floats = []; this.trail = []; this.rings = []; this.projectiles = []; this.waves = [];
      if (L.mode === 'hunt') {
        // one guardian with a brain, numeric HP on both sides, no honey or portal — the fight is the level
        const g = { ...L.guardian, x: L.guardian.x || L.length - 400, y: GROUND_Y, range: [120, L.length - 120], dir: -1, dead: 0, hit: 0, bob: 0,
                    guardian: true, w: L.guardian.w || 84, h: L.guardian.h || 100, speed: L.guardian.speed || 95 };
        root.Guardian.init(g);
        this.enemies = [g]; this.honey = []; this.checkpoints = []; this.L.portal = Infinity;
        this.p.hpNum = L.pHP; this.p.hpMax = L.pMaxHP; this.p.hits = 0; this.p.frenzy = 0; this.p.shieldFx = 0;
        this.power = L.power || null;
        // healing honey: a jar drops when the boss changes phase, heals a share of max HP, fades if ignored
        this.heal = L.heal ? Object.assign({ pct: 0.2, ttl: 10 }, L.heal) : null;
      }
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
    rects() { return [...this.solids, ...this.platforms, ...this.movers, ...this.crumbles.filter(c => !c.gone).map(c => ({ ...c, y: c.y + c.fall }))]; }

    // drifting slabs: sinusoidal paths; whoever stands on one is carried along
    stepMovers() {
      const t = this.time;
      for (const m of this.movers) {
        const nx = m.cx + Math.sin(t * Math.PI * 2 / m.period) * m.dx, ny = m.cy + Math.sin(t * Math.PI * 2 / m.period) * m.dy;
        m.dx0 = nx - m.x; m.dy0 = ny - m.y; m.x = nx; m.y = ny;
      }
      const p = this.p;
      if (p.grounded && p.onRect && p.onRect.type === 'mover') { p.x += p.onRect.dx0; p.y += p.onRect.dy0; }
    }

    stepPlayer(dt) {
      const p = this.p, i = this.input, P = PHYS;
      if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) this.respawn(); return { vx: 0, vy: 0, grounded: false, justJumped: false, justLanded: false, dashing: false, height: 0 }; }
      p.inv = Math.max(0, p.inv - dt); p.attackT = Math.max(0, p.attackT - dt); p.stunned = Math.max(0, p.stunned - dt);
      p.coyote = p.grounded ? P.coyote : Math.max(0, p.coyote - dt);
      if (i.jump) { p.buffer = P.buffer; i.jump = false; } else p.buffer = Math.max(0, p.buffer - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.burstFx = Math.max(0, p.burstFx - dt);
      const wasPrimed = p.primed > 0;
      p.primed = Math.max(0, p.primed - dt);
      if (p.chainT > 0) { p.chainT -= dt; if (p.chainT <= 0) { p.chain = 0; this.hooks.onBurst?.(p.burst); } }
      if (wasPrimed && p.primed <= 0) this.hooks.onBurst?.(p.burst);
      // Honey Burst is a sequence: dash (with a charge ready) primes it, hit releases it
      p.dashGrace = Math.max(0, (p.dashGrace || 0) - dt);
      if (p.dashT > 0 && p.dashT - dt <= 0) p.dashGrace = 0.1;
      if (i.dash && p.dashCd <= 0 && p.dashT <= 0 && p.stunned <= 0) {
        this.sfx('dash');
        p.dashT = P.dashTime; p.dashCd = P.dashCooldown; p.dashDir = p.facing;
        if (p.burst >= 1) { p.primed = 1.2; this.burst(p.x, p.y - 30, ['#f5e06e', '#fff2b0'], 10, 120); this.hooks.onBurst?.(p.burst); }
      }
      i.dash = false;
      // block: plant the paws and raise the ladle — stops projectiles and shoves, not the big attacks
      p.blocking = !!i.block && p.grounded && p.stunned <= 0 && p.dashT <= 0 && p.attackT <= 0;
      if (i.attack) {
        i.attack = false;
        if (p.primed > 0 && p.burst >= 1) this.honeyBurst();   // a panic button: works even while stunned
        else if (!p.blocking && p.attackT <= 0 && p.stunned <= 0 && this.sprite.attack()) p.attackT = 0.34;
      }

      const dir = p.stunned > 0 || p.blocking ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
      let justJumped = false, justLanded = false;
      if (p.dashT > 0) {
        p.dashT -= dt; p.vx = p.dashDir * P.dashSpeed; if (p.vy > 0) p.vy = 0;
        this.trail.push({ x: p.x, y: p.y, t: .22 });
      } else {
        const ice = p.grounded && p.onRect && p.onRect.ice;
        const ctl = p.grounded ? (ice ? 0.5 : 1) : P.airControl;
        if (dir !== 0) { p.vx += dir * P.accel * ctl * dt; p.facing = dir; }
        else if (p.grounded) { const f = P.friction * (ice ? 0.1 : 1) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
        else p.vx *= 1 - 0.6 * dt;
        p.vx = clamp(p.vx, -P.maxSpeed, P.maxSpeed);
      }
      if (p.grounded) p.jumpsLeft = 1;
      if (p.buffer > 0 && p.coyote > 0 && p.stunned <= 0 && !p.blocking) { p.vy = -P.jumpVel; p.grounded = false; p.coyote = 0; p.buffer = 0; justJumped = true; this.sfx('jump'); }
      else if (p.buffer > 0 && !p.grounded && p.coyote <= 0 && p.jumpsLeft > 0 && p.stunned <= 0) {
        // double jump: a little shorter, with a honey ring under the paws
        p.vy = -P.jumpVel * 0.88; p.jumpsLeft--; p.buffer = 0; justJumped = true; this.sfx('djump');
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
      let landed = false, onRect = null;
      for (const r of this.rects()) {
        const oneWay = r.type !== 'ground';
        if (!this.overlaps(p, r)) continue;
        if (p.vy >= 0 && prevFeet <= r.y + 1) {                 // landing from above
          p.y = r.y; p.vy = 0; landed = true; onRect = r;
          if (r.type === 'crumble') { const c = this.crumbles.find(c => c.x === r.x); if (c && c.timer === 0) c.timer = 0.001; }
        } else if (!oneWay && p.vy < 0) {                        // bumping a ceiling
          p.y = r.y + r.h + PLAYER_H; p.vy = 0;
        }
      }
      if (landed && !p.grounded) { justLanded = true; this.sfx('land'); }
      p.grounded = landed; p.onRect = landed ? (onRect.type === 'mover' ? this.movers.find(m => m.cx === onRect.cx) || onRect : onRect) : null;

      // springs: giant mushrooms that launch the cub
      if (p.grounded) for (const sp of this.springs) {
        if (Math.abs(p.x - sp.x) < 36 && Math.abs(p.y - sp.y) < 4) {
          p.vy = -P.jumpVel * 1.5; p.grounded = false; p.jumpsLeft = 1; sp.t = 0.35; justJumped = true;
          this.burst(sp.x, sp.y - 20, ['#ff8fa3', '#ffd6e0', '#f5e06e'], 12, 120);
        }
      }

      // the era's hazard / falling off the world
      if (p.y > GROUND_Y + 60 && p.dead <= 0) this.die(this.L.hazard);

      return { vx: p.vx, vy: p.vy, grounded: p.grounded, justJumped, justLanded, dashing: p.dashT > 0, blocking: p.blocking, height: 0 };
    }

    overlaps(p, r) {
      return p.x + PLAYER_W / 2 > r.x && p.x - PLAYER_W / 2 < r.x + r.w && p.y > r.y && p.y - PLAYER_H < r.y + r.h;
    }

    die(cause) {
      const p = this.p;
      this.sfx('defeat');
      p.dead = 1.1; p.hp = 0; p.vx = 0; p.vy = 0;
      this.sprite.hurt(); this.shake = 0.5;
      const hz = HAZARDS[cause];
      this.burst(p.x, p.y - 30, hz ? [hz.top, hz.mid, '#fff'] : ['#fff', '#ff8a7a'], 26, 220);
      this.hooks.onDeath?.(cause);
    }
    respawn() {
      const p = this.p;
      p.x = p.checkpoint; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.hp = 3; p.inv = 1.5; p.grounded = true;
      this.crumbles.forEach(c => { c.gone = false; c.fall = 0; c.timer = 0; });
      p.onRect = null;
      this.hooks.onRespawn?.();
    }
    damage(from, scale, kind) {
      const p = this.p;
      if (p.inv > 0 || p.dead > 0) return;
      if (p.dashT > 0 || p.dashGrace > 0) { this.float(p.x, p.y - 100, 'dodged', '#7fdbff'); return; }
      if (kind === 'ground' && !p.grounded) { this.float(p.x, p.y - 100, 'jumped it', '#7fdbff'); return; }
      if (this.L.mode === 'hunt') {
        const dmg = root.HoneyEngine.COMBAT.taken(this.L.stats, from, Math.random, scale || 1);
        p.hpNum = Math.max(0, p.hpNum - dmg); p.inv = 0.9; p.stunned = 0.25;
        p.vx = (p.x < from.x ? -1 : 1) * 280; p.vy = -360; p.grounded = false;
        this.sprite.hurt(); this.shake = 0.35; this.sfx('hurt');
        this.float(p.x, p.y - 100, `-${dmg}`, '#ff5b4d');
        this.hooks.onHurt?.(p.hpNum);
        if (p.hpNum <= 0) { p.dead = 1e9; this.finished = true; this.sfx('defeat'); this.burst(p.x, p.y - 30, ['#fff', '#ff8a7a'], 26, 220); this.hooks.onCubDown?.({ timeMs: Math.round(this.time * 1000) }); }
        return;
      }
      p.hp -= 1; p.inv = 1.2; p.stunned = 0.3; this.sfx('hurt');
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
        if (e.guardian) { this.stepGuardian(e, dt); continue; }
        if (e.dead > 0) { e.dead -= dt; continue; }
        if (e.hpLeft <= 0) continue;
        e.hit = Math.max(0, e.hit - dt);
        let speed = e.speed;
        if (e.charge) {
          if (e.chargeT > 0) { e.chargeT -= dt; speed *= 3.2; if (e.chargeT <= 0) e.restT = 1.4; }
          else if (e.restT > 0) { e.restT -= dt; speed = 0; }
          else if (p.dead <= 0 && Math.abs(p.x - e.x) < 300 && Math.abs(p.y - e.y) < 90) { e.chargeT = 1.0; e.dir = p.x < e.x ? -1 : 1; this.float(e.x, e.y - e.h - 10, '!', '#ff8a7a'); this.shake = Math.max(this.shake, 0.15); }
        }
        e.x += e.dir * speed * dt;
        if (e.fly) e.y = GROUND_Y - 100 + Math.sin(this.time * 2 + e.bob) * 48;
        if (e.x < e.range[0]) { e.x = e.range[0]; e.dir = 1; if (e.chargeT > 0) { e.chargeT = 0; e.restT = 1.2; } }
        if (e.x > e.range[1]) { e.x = e.range[1]; e.dir = -1; if (e.chargeT > 0) { e.chargeT = 0; e.restT = 1.2; } }
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
      if (this.L.mode === 'hunt' && p.dead <= 0 && !this.finished) {
        for (const h of this.honey) if (h.heal && !h.taken) { h.ttl -= dt; if (h.ttl <= 0) { h.taken = true; this.float(h.x, h.y - 10, 'gone', '#b8bcc8'); } }
      }
      for (const h of this.honey) {
        if (h.taken || p.dead > 0) continue;
        if (Math.abs(h.x - p.x) < 30 && Math.abs(h.y - (p.y - 36)) < 48) {
          if (h.heal) {
            h.taken = true; const amt = Math.max(1, Math.floor(p.hpMax * this.heal.pct));
            p.hpNum = Math.min(p.hpMax, p.hpNum + amt); this.sfx('power');
            this.burst(h.x, h.y, ['#7cf29e', '#f5e06e', '#fff2b0'], 16, 120);
            this.float(h.x, h.y - 24, `+${amt} ❤`, '#7cf29e'); this.hooks.onHurt?.(p.hpNum);
            continue;
          }
          h.taken = true; p.honey++; this.sfx('honey');
          // every five drops charge a Honey Burst (up to two stored)
          if (++p.burstStreak >= 5) { p.burstStreak = 0; if (p.burst < 2) { p.burst++; this.float(p.x, p.y - 110, '✦ Burst charged', '#ffe27a'); } }
          this.burst(h.x, h.y, ['#f5e06e', '#d4af37', '#fff2b0'], 10, 90);
          this.float(h.x, h.y - 20, '+1 🍯', '#ffe27a'); this.hooks.onHoney?.(p.honey);
        }
      }
      // guardian projectiles and ground shockwaves
      for (const q of this.projectiles) {
        q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.gravity || 120) * dt;
        if (p.dead <= 0 && Math.abs(q.x - p.x) < (p.blocking ? 44 : 26) && q.y > p.y - PLAYER_H - 10 && q.y < p.y) {
          q.t = 0;
          if (p.blocking && !q.rain && Math.sign(q.x - p.x) === p.facing) { this.burst(q.x, q.y, ['#f5e06e', '#fff2b0'], 10, 120); this.float(p.x, p.y - 100, 'blocked', '#ffe27a'); this.shake = Math.max(this.shake, 0.08); this.sfx('block'); }
          else { this.damage({ x: q.x, atk: q.atk }, q.scale); this.burst(q.x, q.y, ['#fff', '#ffb347'], 6, 80); }
        }
      }
      this.projectiles = this.projectiles.filter(q => q.t > 0 && q.y < GROUND_Y + 40);
      for (const w of this.waves) {
        w.t -= dt; w.x += w.dir * 420 * dt;
        if (p.dead <= 0 && p.grounded && Math.abs(w.x - p.x) < 28) { w.t = 0; this.damage({ x: w.x, atk: w.atk }, w.scale); }
      }
      this.waves = this.waves.filter(w => w.t > 0);
      for (const sp of this.springs) sp.t = Math.max(0, sp.t - dt);
      for (const c of this.checkpoints) if (!c.lit && p.x > c.x) { c.lit = true; p.checkpoint = c.x; this.float(c.x, GROUND_Y - 120, 'Checkpoint', '#7cf29e'); this.sfx('checkpoint'); this.hooks.onCheckpoint?.(); }
      if (!this.finished && p.x > this.L.portal - 10 && p.dead <= 0) this.finish();
    }
    stepGuardian(g, dt) {
      const p = this.p;
      if (g.dead > 0) { g.dead -= dt; return; }
      if (g.hpLeft <= 0) return;
      g.hit = Math.max(0, g.hit - dt);
      p.frenzy = Math.max(0, (p.frenzy || 0) - dt); p.shieldFx = Math.max(0, (p.shieldFx || 0) - dt);
      if (g.frozen > 0) g.frozen -= dt;
      if (g.burn > 0 && g.transition <= 0) { g.burnT -= dt; if (g.burnT <= 0) { g.burn--; g.burnT = 0.6; const d = Math.max(3, Math.floor(this.L.stats.ATK * 0.15)); g.hpLeft = Math.max(0, g.hpLeft - d); this.float(g.x, g.y - g.h - 8, `-${d} 🔥`, '#ff8a4a'); this.burst(g.x, g.y - g.h / 2, ['#ff6b35', '#ffb347'], 6, 90); this.hooks.onGuardianHit?.(g, d); if (g.hpLeft <= 0) { g.dead = 0.9; this.finished = true; this.sprite.cheer(); this.sfx('victory'); this.hooks.onGuardianDown?.({ timeMs: Math.round(this.time * 1000), pHP: p.hpNum, hits: p.hits }); return; } } }
      root.Guardian.step(this, g, dt);
      if (p.dead > 0) return;
      // the swing lands once per attack
      if (p.attackT > 0 && p.attackT < 0.26 && !p.swingHit) {
        const hx = p.x + p.facing * 48, hy = p.y - 34;
        if (Math.abs(hx - g.x) < (g.w / 2 + 40) && Math.abs(hy - (g.y - g.h / 2)) < 76) { p.swingHit = true; this.hitGuardian(g, false); }
      }
      if (p.attackT <= 0) p.swingHit = false;
      const hitX = Math.abs(g.x - p.x) < (g.w + PLAYER_W) / 2, hitY = p.y > g.y - g.h && p.y - PLAYER_H < g.y;
      const scale = root.Guardian.contactScale(g), special = root.Guardian.isSpecial(g);
      if (hitX && hitY && scale > 0) {
        if (p.blocking && !special && Math.sign(g.x - p.x) === p.facing) { if (p.inv <= 0) { p.inv = 0.5; p.vx = -p.facing * 160; this.float(p.x, p.y - 100, 'blocked', '#ffe27a'); this.sfx('block'); } }
        else this.damage(g, scale, g.state === 'charge' || g.state === 'idle' ? 'ground' : 'any');
      }
    }
    spawnHealDrop() {
      if (!this.heal) return;
      if (this.honey.some(h => h.heal && !h.taken)) return;   // one jar at a time
      const L = this.L, p = this.p, g = this.enemies[0];
      // ground spot away from the guardian, or one of the platforms — whichever is farther from the guardian
      const spots = [{ x: 160 + Math.random() * (L.length - 320), y: GROUND_Y - 36 }];
      for (const pl of L.platforms || []) spots.push({ x: pl.x + pl.w / 2, y: pl.y - 36 });
      spots.sort((a, b) => Math.abs(b.x - (g ? g.x : p.x)) - Math.abs(a.x - (g ? g.x : p.x)));
      const s = spots[Math.floor(Math.random() * Math.min(2, spots.length))];
      this.honey.push({ x: s.x, y: s.y, taken: false, t: Math.random() * 6, heal: true, ttl: this.heal.ttl });
      this.float(s.x, s.y - 30, '🍯 honey!', '#7cf29e'); this.sfx('honey');
    }
    hitGuardian(g, burst) {
      const p = this.p, s = this.L.stats, C = root.HoneyEngine.COMBAT;
      if (g.transition > 0) { this.float(g.x, g.y - g.h - 10, 'immune', '#b8bcc8'); this.sfx('block'); return; }
      const crit = !burst && C.crit(s);
      let dmg = burst ? Math.floor(C.burst(s) * ((this.power?.dmg || 3) / 3) * Math.max(1, p.chain || 1)) : Math.floor(C.hit(s) * (crit ? 1.8 : 1) * (p.frenzy > 0 ? 1.6 : 1));
      dmg = Math.floor(dmg * root.Guardian.vulnerability(g) * (g.frozen > 0 ? 1.5 : 1));
      g.hpLeft = Math.max(0, g.hpLeft - dmg); g.hit = 0.3; p.hits++;
      const need = p.frenzy > 0 ? 2 : 4;
      if (burst) { g.stagger = Math.max(g.stagger, this.power?.stagger || 1.2); g.vx = 0; }
      else if (++p.burstStreak >= need) { p.burstStreak = 0; if (p.burst < 2) { p.burst++; this.float(p.x, p.y - 110, '✦ Burst charged', '#ffe27a'); this.sfx('charged'); } this.hooks.onBurst?.(p.burst); }
      this.sfx(burst ? 'burst' : crit ? 'crit' : 'hit');
      this.burst(g.x, g.y - g.h / 2, burst ? ['#f5e06e', '#fff2b0', '#ffb347'] : ['#fff', '#ffb347', '#ff6b35'], burst ? 40 : 16, burst ? 260 : 170);
      this.shake = Math.max(this.shake, crit || burst ? 0.4 : 0.15);
      this.float(g.x + (Math.random() - .5) * 40, g.y - g.h - 10, `-${dmg}${crit ? ' CRIT' : burst && p.chain > 1 ? ` ×${p.chain} CHAIN` : ''}`, crit ? '#ff6b35' : burst ? '#ffe27a' : '#fff');
      this.hooks.onGuardianHit?.(g, dmg);
      const ph = root.Guardian.checkPhase(this, g);
      if (ph >= 0) { this.projectiles = []; this.waves = []; this.spawnHealDrop(); this.hooks.onPhase?.(g, ph); }
      if (g.hpLeft <= 0) {
        g.dead = g.boss ? 1.6 : 0.9; this.finished = true; this.sprite.cheer(); this.sfx('victory');
        this.burst(g.x, g.y - g.h / 2, ['#f5e06e', '#d4af37', '#fff2b0', '#7fdbff'], 60, 280);
        this.hooks.onGuardianDown?.({ timeMs: Math.round(this.time * 1000), pHP: p.hpNum, hits: p.hits });
      }
    }
    honeyBurst() {
      const p = this.p;
      // bursts fired within a few seconds of each other chain: the second hits ×2, the third ×3…
      p.chain = (p.chainT || 0) > 0 ? (p.chain || 1) + 1 : 1; p.chainT = root.HoneyEngine.HUNT.chainWindow;
      p.burst -= 1; p.primed = 0; p.burstFx = 0.7; p.inv = Math.max(p.inv, 1.1); p.dashT = 0;
      p.vy = Math.min(p.vy, -200); p.grounded = false;
      this.sprite.cheerT = 0.6; this.shake = 0.6;
      this.rings.push({ x: p.x, y: p.y - 30, t: 0.7, big: true });
      this.burst(p.x, p.y - 30, ['#f5e06e', '#d4af37', '#fff2b0', '#ffb347'], 70, 320);
      this.float(p.x, p.y - 110, p.chain > 1 ? `✦ HONEY BURST ×${p.chain} ✦` : '✦ HONEY BURST ✦', p.chain > 1 ? '#ff8a7a' : '#ffe27a');
      if (p.chain > 1) { this.shake = 0.8; setTimeout(() => this.rings.push({ x: p.x, y: p.y - 30, t: 0.7, big: true }), 120); }
      for (const e of this.enemies) {
        if (e.hpLeft <= 0) continue;
        if (Math.hypot(e.x - p.x, (e.y - e.h / 2) - (p.y - 30)) >= 240) continue;
        if (e.guardian) {
          this.hitGuardian(e, true);
          const pw = this.power;
          if (pw) {
            if (pw.burn)   { e.burn = pw.burn; e.burnT = 0.6; }
            if (pw.freeze) { e.frozen = pw.freeze; }
            if (pw.shield) { p.inv = Math.max(p.inv, pw.shield); p.shieldFx = pw.shield; }
            if (pw.heal)   { const h = Math.floor(p.hpMax * pw.heal); p.hpNum = Math.min(p.hpMax, p.hpNum + h); this.float(p.x, p.y - 120, `+${h}`, '#7cf29e'); this.hooks.onHurt?.(p.hpNum); }
            if (pw.frenzy) { p.frenzy = pw.frenzy; }
            this.float(p.x, p.y - 140, `${pw.icon} ${pw.name}`, '#ffe27a');
            this.sfx('power');
          }
          continue;
        }
        e.hit = 0; this.hitEnemy(e, Math.sign(e.x - p.x) || 1); if (e.hpLeft > 0) { e.hit = 0; this.hitEnemy(e, Math.sign(e.x - p.x) || 1); }
      }
      this.hooks.onBurst?.(p.burst);
      this.hooks.onBurstFire?.();
    }
    hitEnemy(e, dir, stomp) {
      e.hpLeft -= 1; e.hit = 0.4;
      this.burst(e.x, e.y - e.h / 2, ['#fff', '#ffb347', '#ff6b35'], stomp ? 14 : 18, 180);
      this.shake = Math.max(this.shake, 0.2);
      if (e.hpLeft <= 0) { e.dead = 0.6; this.float(e.x, e.y - e.h, e.name + ' down!', '#ff8a7a'); this.sfx('crit'); this.hooks.onKill?.(e); }
      else { e.x += (dir || 0) * 30; this.float(e.x, e.y - e.h, 'hit', '#fff'); this.sfx('hit'); }
    }
    finish() {
      this.finished = true; this.sprite.cheer(); this.sfx('portal');
      this.burst(this.p.x, this.p.y - 40, ['#f5e06e', '#d4af37', '#fff2b0', '#7fdbff'], 60, 260);
      this.hooks.onFinish?.({ timeMs: Math.round(this.time * 1000), honey: this.p.honey });
    }

    // ---------- loop ----------
    frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.033, (now - this.last) / 1000); this.last = now;
      if (!this.paused && !this.finished && this.started) {
        this.time += dt;
        this.stepMovers();
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
      const glow = ctx.createRadialGradient(W * 0.5, 460, 20, W * 0.5, 460, 520); glow.addColorStop(0, pal.glow || 'rgba(255,90,30,.25)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
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
      // the era's hazard under everything
      const hz = HAZARDS[L.hazard] || HAZARDS.lava;
      const lavaY = GROUND_Y + 36, t = performance.now() / 1000;
      const lg = ctx.createLinearGradient(0, lavaY, 0, lavaY + 160); lg.addColorStop(0, hz.top); lg.addColorStop(0.25, hz.mid); lg.addColorStop(1, hz.deep);
      ctx.fillStyle = lg; ctx.fillRect(this.cam.x - 50, lavaY, W + 100, Math.max(200, H));
      ctx.fillStyle = hz.foam;
      for (let x = Math.floor(this.cam.x / 40) * 40; x < this.cam.x + W + 40; x += 40) { const h = 4 + Math.sin(t * 2 + x * 0.05) * 3; ctx.fillRect(x, lavaY - h, 24, h + 2); }
      // ground blocks
      for (const r of this.solids) this.drawBlock(r, pal);
      for (const r of this.platforms) this.drawSlab(r, pal, 0);
      for (const m of this.movers) this.drawSlab(m, pal, 0, true);
      for (const sp of this.springs) this.drawSpring(sp);
      for (const c of this.crumbles) if (!c.gone) { const shakeX = c.timer > 0 && c.timer < 0.7 ? (Math.random() - .5) * 4 : 0; this.drawSlab({ ...c, x: c.x + shakeX, y: c.y + c.fall }, pal, c.timer); }
      // checkpoints + portal
      for (const c of this.checkpoints) this.drawTotem(c, t);
      if (Number.isFinite(this.L.portal)) this.drawPortal(t);
      // honey
      for (const h of this.honey) if (!h.taken) { if (h.heal && h.ttl < 2.5 && Math.floor(t * 8) % 2) continue; this.drawHoney(h, t); if (h.heal) this.drawHealRing(h, t); }
      // enemies
      for (const e of this.enemies) if (e.guardian) root.Guardian.drawTelegraph(ctx, e, this);
      for (const e of this.enemies) this.drawEnemy(e, t);
      for (const w of this.waves) { ctx.save(); ctx.globalAlpha = Math.min(1, w.t); ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 4; ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(w.x, GROUND_Y, 26, Math.PI, 0); ctx.stroke(); ctx.restore(); }
      for (const q of this.projectiles) { ctx.save(); ctx.translate(q.x, q.y); ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14; ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.glyph, 0, 0); ctx.restore(); }
      // player
      for (const tr of this.trail) { ctx.globalAlpha = tr.t * 1.6; this.sprite.draw(ctx, tr.x, tr.y, 1, 0); }
      ctx.globalAlpha = 1;
      if (this.p.primed > 0) {
        const pulse = 0.7 + Math.sin(t * 18) * 0.3;
        ctx.save(); ctx.globalAlpha = Math.min(1, this.p.primed) * 0.8; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3 + pulse * 2; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 24 * pulse;
        ctx.beginPath(); ctx.ellipse(this.p.x, this.p.y - 36, 48 + pulse * 6, 60 + pulse * 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (this.p.dead <= 0) { if (this.p.inv > 0 && Math.floor(this.p.inv * 14) % 2 === 0) ctx.globalAlpha = 0.45; this.sprite.draw(ctx, this.p.x, this.p.y, 1, 0); ctx.globalAlpha = 1; }
      if (this.p.shieldFx > 0 && this.p.dead <= 0) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#d9c38a'; ctx.lineWidth = 4; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.ellipse(this.p.x, this.p.y - 40, 52, 66, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (this.p.frenzy > 0 && this.p.dead <= 0) {
        ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; ctx.strokeStyle = '#a3ff8f'; ctx.lineWidth = 3; ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(this.p.x, this.p.y - 40, 46, 60, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (this.p.blocking && this.p.dead <= 0) {
        const f = this.sprite.facing, px = this.p.x + f * 34, py = this.p.y - 40;
        ctx.save(); ctx.translate(px, py); ctx.scale(f, 1);
        ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = '#f5e06e'; ctx.shadowBlur = 18; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2 + 0.15, Math.PI / 2 - 0.15); ctx.stroke();
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#f5e06e'; ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2 + 0.15, Math.PI / 2 - 0.15); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
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
    drawSlab(r, pal, cracked, mover) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(r.x + 4, r.y + 6, r.w, r.h);
      ctx.fillStyle = cracked ? '#3a2420' : pal.rock; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = r.ice ? '#e8f6ff' : cracked ? '#7a4a30' : pal.rockTop; ctx.fillRect(r.x, r.y, r.w, 6);
      if (r.ice) { ctx.fillStyle = 'rgba(200,235,255,.35)'; ctx.fillRect(r.x, r.y + 6, r.w, 5); }
      if (mover) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let x = r.x + 8; x < r.x + r.w - 6; x += 16) ctx.fillRect(x, r.y + r.h - 5, 8, 2); }
      if (cracked) { ctx.strokeStyle = 'rgba(255,200,120,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r.x + 10, r.y + 4); ctx.lineTo(r.x + r.w * 0.4, r.y + 14); ctx.lineTo(r.x + r.w * 0.7, r.y + 6); ctx.lineTo(r.x + r.w - 8, r.y + 15); ctx.stroke(); }
    }
    drawSpring(sp) {
      const ctx = this.ctx, sq = sp.t > 0 ? 1 - sp.t * 1.4 : 1;
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.scale(1 / Math.max(0.6, sq), Math.max(0.5, sq));
      ctx.fillStyle = '#e8d9b5'; ctx.fillRect(-9, -26, 18, 26);
      ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(0, -28, 34, 16, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffe0e8'; for (const [dx, dy] of [[-16, -32], [4, -36], [20, -30]]) { ctx.beginPath(); ctx.arc(dx, dy, 4, 0, 7); ctx.fill(); }
      ctx.restore();
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
      ctx.font = 'bold 11px Cinzel, serif'; ctx.fillStyle = this.L.next ? '#7fdbff' : '#f5e06e'; ctx.textAlign = 'center'; ctx.fillText(this.L.next ? this.L.next.toUpperCase() : '✦ THE GOLDEN DROP ✦', x, y + 100);
    }
    drawHealRing(h, t) {
      const ctx = this.ctx, y = h.y + Math.sin(t * 3 + h.t) * 5, k = 0.5 + Math.sin(t * 5) * 0.5;
      ctx.save(); ctx.strokeStyle = `rgba(124,242,158,${0.35 + 0.4 * k})`; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(h.x, y - 2, 24 + k * 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = 'bold 13px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7cf29e'; ctx.fillText('❤', h.x + 16, y - 20);
      ctx.restore();
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
      if (e.fly) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, GROUND_Y - e.y + 4, e.w * 0.35, 5, 0, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, e.w * 0.5, 7, 0, 0, 7); ctx.fill(); }
      if (e.chargeT > 0 || e.state === 'charge' || e.state === 'swoop' || e.state === 'hop' || e.state === 'leap') ctx.filter = 'drop-shadow(0 0 10px #ff6b35)';
      if (e.state === 'tell') ctx.filter = `drop-shadow(0 0 ${14 + Math.sin(t * 30) * 6}px #ff3b1f) brightness(1.5)`;
      if (e.stagger > 0) ctx.filter = 'saturate(0.4) brightness(1.2)';
      if (e.frozen > 0) ctx.filter = 'hue-rotate(180deg) saturate(0.5) brightness(1.3) drop-shadow(0 0 12px #7fdbff)';
      if (e.burn > 0) ctx.filter = 'drop-shadow(0 0 14px #ff6b35) saturate(1.4)';
      if (e.transition > 0) { const k = 1 + Math.sin(t * 40) * 0.06 + e.transition * 0.12; ctx.filter = 'brightness(2.2) drop-shadow(0 0 30px #fff)'; ctx.scale(k, k); }
      if (e.boss && e.transition <= 0 && e.dead <= 0 && e.phase > 0) ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `drop-shadow(0 0 ${10 + e.phase * 8}px ${e.phase === 2 ? '#ff3b1f' : '#ffb347'})`;
      if (e.dead > 0) { const d = e.boss ? e.dead / 1.6 : e.dead / 0.6; ctx.globalAlpha = Math.min(1, d); ctx.scale(1 + (1 - d) * 0.6, 1 - (1 - d) * 0.5); }
      ctx.scale(e.dir, 1);
      ctx.font = `${e.h}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (e.hit > 0 && Math.floor(e.hit * 20) % 2 === 0) ctx.filter = 'brightness(3)';
      if (e.restT > 0) ctx.globalAlpha *= 0.85;
      ctx.fillText(e.emoji, 0, Math.sin(t * 6 + e.bob) * 3);
      ctx.restore();
      if (e.guardian && e.stagger > 0) { ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText('✦', e.x + Math.sin(t * 9) * 18, e.y - e.h - 16); }
      if (e.boss && e.hpLeft > 0) {   // the crown and the phase pips
        ctx.save(); ctx.textAlign = 'center'; ctx.font = '22px serif'; ctx.fillText('👑', e.x, e.y - e.h - 18 + Math.sin(t * 3) * 3);
        for (let i = 0; i < (e.phases ? e.phases.length : 3); i++) { ctx.fillStyle = i <= e.phase ? '#ff6b5a' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(e.x - 14 + i * 14, e.y - e.h - 44, 4, 0, 7); ctx.fill(); }
        if (e.transition > 0) { ctx.strokeStyle = `rgba(255,120,90,${Math.min(1, e.transition)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - e.h / 2, (1.4 - e.transition) * 260 + 20, 0, 7); ctx.stroke(); }
        ctx.restore();
      }
      if (!e.guardian && e.hp > 1 && e.hpLeft > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40, 5); ctx.fillStyle = '#e74c3c'; ctx.fillRect(e.x - 20, e.y - e.h - 14, 40 * e.hpLeft / e.hp, 5); }
    }
  }

  root.HoneyRoad = HoneyRoad;
  root.HONEY_ROAD_LEVELS = LEVELS;
  root.HONEY_ROAD_HAZARDS = HAZARDS;
})(typeof self !== 'undefined' ? self : this);
