// OkayCubs: The Honey Chronicles — battle & economy engine.
// Pure functions, no DOM. Loaded by the browser (demo mode) and imported by the
// Next.js API routes (wallet mode), so both sides share one set of rules.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HoneyEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ERA_ORDER  = ['hadean', 'archean', 'proterozoic', 'paleozoic', 'mesozoic', 'cenozoic'];
  const ERA_UNLOCK = { hadean:0, archean:5, proterozoic:15, paleozoic:30, mesozoic:50, cenozoic:75 };
  const ERA_HONEY  = { hadean:'Magma Honey', archean:'Stone Honey', proterozoic:'Tide Honey', paleozoic:'Bloom Honey', mesozoic:'Titan Honey', cenozoic:'Frost Honey' };
  const ERA_LVL    = { hadean:[1,5], archean:[6,15], proterozoic:[16,30], paleozoic:[31,50], mesozoic:[51,75], cenozoic:[76,100] };
  const COOLDOWN_MS = 30 * 60 * 1000;
  const MAX_LEVEL   = 50;

  // Scout Cubs: loaned to wallets that hold no OkayCubs. Capped so holding the real thing matters.
  const SCOUT_LEVEL_CAP = 10, SCOUT_ERA_CAP = 'archean';
  const SCOUT_CUBS = [
    { id:'scout-35',  name:'Scout Cub #35',  number:35,  image:'/cubs/35.png',  rarity:'legendary', class:'Magma Warden',   traits:{ Background:'Volcanic Rift', Eyes:'Obsidian Gaze', Fur:'Ashen Gray', Accessory:'Crystal Pickaxe', Mouth:'Ember Fangs' } },
    { id:'scout-99',  name:'Scout Cub #99',  number:99,  image:'/cubs/99.png',  rarity:'epic',      class:'Stratum Knight', traits:{ Background:'Deep Fault', Eyes:'Sapphire Core', Fur:'Slate Blue', Accessory:'Geode Shield', Mouth:'Iron Jaw' } },
    { id:'scout-177', name:'Scout Cub #177', number:177, image:'/cubs/177.png', rarity:'rare',      class:'Fossil Rogue',   traits:{ Background:'Amber Resin', Eyes:'Topaz Sight', Fur:'Sandstone', Accessory:'Ammonite Ring', Mouth:'Quartz Bite' } },
    { id:'scout-432', name:'Scout Cub #432', number:432, image:'/cubs/432.png', rarity:'common',    class:'Sediment Scout', traits:{ Background:'River Delta', Eyes:'Flint Gray', Fur:'Clay Brown', Accessory:'Stone Compass', Mouth:'Pebble Grin' } },
  ];
  const isScout   = id => String(id).startsWith('scout-');
  const scoutCub  = id => SCOUT_CUBS.find(c => c.id === id) || null;
  const levelCap  = id => isScout(id) ? SCOUT_LEVEL_CAP : MAX_LEVEL;
  const scoutEraOk = (id, era) => !isScout(id) || ERA_ORDER.indexOf(era) <= ERA_ORDER.indexOf(SCOUT_ERA_CAP);
  // Era Bosses: the kill threshold wakes the boss; beating it opens the era's Honey Road. Three phases each.
  const ERA_BOSSES = {
    hadean:      { name:'The Caldera Queen',   emoji:'🐉', cls:'Sovereign of Magma Honey', hp:420,  atk:30, def:16, xp:60,  lvl:6,   shot:'🔥', phases:[{ family:'jumper', move:'high' }, { family:'charger', move:'stomp' }, { family:'shooter', move:'rain' }] },
    archean:     { name:'Tectonic Titan',      emoji:'⛰',  cls:'Sovereign of Stone Honey', hp:700,  atk:42, def:30, xp:110, lvl:16,  shot:'🪨', phases:[{ family:'charger', move:'double' }, { family:'jumper', move:'hops' }, { family:'charger', move:'stomp' }] },
    proterozoic: { name:'Snowball Leviathan',  emoji:'🐋', cls:'Sovereign of Tide Honey',  hp:900,  atk:52, def:36, xp:170, lvl:31,  shot:'🧊', phases:[{ family:'shooter', move:'rain' }, { family:'flyer', move:'twin' }, { family:'jumper', move:'high' }] },
    paleozoic:   { name:'Reef Colossus',       emoji:'🦑', cls:'Sovereign of Bloom Honey', hp:1100, atk:60, def:42, xp:230, lvl:51,  shot:'🫧', phases:[{ family:'shooter', move:'spread' }, { family:'jumper', move:'hops' }, { family:'flyer', move:'drop' }] },
    mesozoic:    { name:'Tyrant of Pangaea',   emoji:'🦖', cls:'Sovereign of Titan Honey', hp:1400, atk:72, def:50, xp:300, lvl:76,  shot:'☄', phases:[{ family:'charger', move:'double' }, { family:'charger', move:'stomp' }, { family:'jumper', move:'high' }] },
    cenozoic:    { name:'The Warden of Time',  emoji:'👁', cls:'Sovereign of Frost Honey', hp:1800, atk:84, def:60, xp:400, lvl:100, shot:'⏳', phases:[{ family:'shooter', move:'spread' }, { family:'flyer', move:'drop' }, { family:'charger', move:'double' }] },
  };
  const bossHoneyBonus = era => 40 + eraIdx(era) * 20;

  // Honey Roads: the era's boss must fall first; finishing the road unlocks the next era
  const ROADS = {
    hadean:      { next:'archean',     wins:5,   maxHoney: 36, minTimeMs: 9000 },
    archean:     { next:'proterozoic', wins:15,  maxHoney: 36, minTimeMs: 10000 },
    proterozoic: { next:'paleozoic',   wins:30,  maxHoney: 36, minTimeMs: 10000 },
    paleozoic:   { next:'mesozoic',    wins:50,  maxHoney: 36, minTimeMs: 11000 },
    mesozoic:    { next:'cenozoic',    wins:75,  maxHoney: 36, minTimeMs: 11000 },
    cenozoic:    { next:null,          wins:100, maxHoney: 36, minTimeMs: 12000 },
  };

  const ERA_ENEMIES = {
    hadean: [
      { name:'Magma Keeper',     emoji:'🌋', cls:'Magma Honey Guardian', hp:80,  atk:22, def:10, xp:10 },
      { name:'Ember Sentinel',   emoji:'🔥', cls:'Magma Honey Guardian', hp:65,  atk:28, def:8,  xp:12 },
      { name:'Caldera Warden',   emoji:'👹', cls:'Magma Honey Guardian', hp:140, atk:25, def:18, xp:18 },
      { name:'Lava Specter',     emoji:'👻', cls:'Magma Honey Guardian', hp:55,  atk:32, def:5,  xp:15 },
      { name:'Cinder Golem',     emoji:'🗿', cls:'Magma Honey Guardian', hp:75,  atk:19, def:22, xp:12 },
    ],
    archean: [
      { name:'Stone Warden',     emoji:'🗿', cls:'Stone Honey Guardian', hp:160, atk:30, def:35, xp:22 },
      { name:'Fault Titan',      emoji:'⛰', cls:'Stone Honey Guardian', hp:130, atk:33, def:22, xp:24 },
      { name:'Crust Shade',      emoji:'🌑', cls:'Stone Honey Guardian', hp:95,  atk:44, def:10, xp:28 },
      { name:'Obsidian Keeper',  emoji:'🦎', cls:'Stone Honey Guardian', hp:115, atk:38, def:18, xp:26 },
      { name:'Deep Rock Elder',  emoji:'🪨', cls:'Stone Honey Guardian', hp:180, atk:28, def:40, xp:30 },
    ],
    proterozoic: [
      { name:'Tide Keeper',      emoji:'🌊', cls:'Tide Honey Guardian',  hp:200, atk:35, def:42, xp:32 },
      { name:'Frost Sentinel',   emoji:'🧊', cls:'Tide Honey Guardian',  hp:110, atk:48, def:12, xp:36 },
      { name:'Current Warden',   emoji:'🌫', cls:'Tide Honey Guardian',  hp:170, atk:32, def:38, xp:34 },
      { name:'Ice Colossus',     emoji:'❄',  cls:'Tide Honey Guardian',  hp:155, atk:38, def:30, xp:35 },
      { name:'Ocean Ancient',    emoji:'🦠', cls:'Tide Honey Guardian',  hp:90,  atk:55, def:8,  xp:40 },
    ],
    paleozoic: [
      { name:'Bloom Keeper',     emoji:'🌿', cls:'Bloom Honey Guardian', hp:240, atk:42, def:45, xp:44 },
      { name:'Reef Warden',      emoji:'🪸', cls:'Bloom Honey Guardian', hp:220, atk:48, def:40, xp:46 },
      { name:'Venom Crawler',    emoji:'🦂', cls:'Bloom Honey Guardian', hp:175, atk:52, def:32, xp:42 },
      { name:'Spore Specter',    emoji:'🌱', cls:'Bloom Honey Guardian', hp:130, atk:64, def:16, xp:52 },
      { name:'Tide Leviathan',   emoji:'🐚', cls:'Bloom Honey Guardian', hp:190, atk:45, def:50, xp:48 },
    ],
    mesozoic: [
      { name:'Titan Keeper',     emoji:'🦕', cls:'Titan Honey Guardian', hp:290, atk:55, def:52, xp:58 },
      { name:'Scale Warden',     emoji:'🐉', cls:'Titan Honey Guardian', hp:340, atk:48, def:58, xp:60 },
      { name:'Apex Sentinel',    emoji:'🦖', cls:'Titan Honey Guardian', hp:210, atk:64, def:38, xp:62 },
      { name:'Pangaea Colossus', emoji:'🌍', cls:'Titan Honey Guardian', hp:380, atk:58, def:62, xp:65 },
      { name:'Sky Warden',       emoji:'🦅', cls:'Titan Honey Guardian', hp:240, atk:68, def:30, xp:64 },
    ],
    cenozoic: [
      { name:'Frost Keeper',     emoji:'❄',  cls:'Frost Honey Guardian', hp:360, atk:68, def:62, xp:72 },
      { name:'Time Warden',      emoji:'⏳', cls:'Frost Honey Guardian', hp:440, atk:62, def:72, xp:78 },
      { name:'Epoch Sentinel',   emoji:'🌀', cls:'Frost Honey Guardian', hp:520, atk:72, def:68, xp:88 },
      { name:'The Last Guardian',emoji:'👁', cls:'Frost Honey Guardian', hp:650, atk:78, def:78, xp:100 },
      { name:'Ice Age Titan',    emoji:'🏔', cls:'Frost Honey Guardian', hp:400, atk:75, def:60, xp:82 },
    ],
  };

  const GEO_BURSTS = [
    'Magma Honey Wave','Stone Honey Slam','Tide Honey Surge','Bloom Honey Rush',
    'Titan Honey Crush','Frost Honey Spike','Golden Burst','Honey Strike',
    'Amber Flood','Crystal Drop','Primal Honey','The Golden Drop',
  ];
  const CLASS_BURSTS = {
    'Magma Warden':     ['Magma Honey Wave','Core Honey Eruption','Lava Drop'],
    'Ember Knight':     ['Ember Honey Barrage','Magma Honey Wave','Fire Drop'],
    'Glacial Scout':    ['Tide Honey Surge','Frost Honey Spike','Glacial Drop'],
    'Void Stalker':     ['Shadow Honey Strike','Void Drop','Dark Honey Crush'],
    'Quartz Sage':      ['Crystal Drop','Tide Honey Surge','Stone Honey Slam'],
    'Stratum Knight':   ['Stone Honey Slam','Titan Honey Crush','Golden Burst'],
    'Tidal Rogue':      ['Tide Honey Surge','Amber Flood','Bloom Honey Rush'],
    'Desert Fossil':    ['Bloom Honey Rush','Amber Flood','Golden Drop'],
    'Carbonite Ranger': ['Titan Honey Crush','Bloom Honey Rush','Golden Burst'],
    'Sediment Scout':   ['Stone Honey Slam','Honey Strike','Primal Honey'],
    'Fossil Rogue':     ['Bloom Honey Rush','Amber Flood','Crystal Drop'],
    'Crystal Mage':     ['Crystal Drop','Frost Honey Spike','The Golden Drop'],
    'Tectonic Guard':   ['Stone Honey Slam','Titan Honey Crush','Honey Strike'],
    'Stratum Keeper':   ['Stone Honey Slam','Primal Honey','Honey Strike'],
  };
  // Honey Power: what a Cub's Honey Burst does in the den, by trait family
  const CLASS_POWER = {
    'Magma Warden':'magma', 'Ember Knight':'magma',
    'Stratum Knight':'stone', 'Tectonic Guard':'stone', 'Stratum Keeper':'stone', 'Sediment Scout':'stone',
    'Glacial Scout':'tide', 'Tidal Rogue':'tide',
    'Quartz Sage':'crystal', 'Crystal Mage':'crystal',
    'Desert Fossil':'primal', 'Fossil Rogue':'primal', 'Carbonite Ranger':'primal', 'Void Stalker':'primal',
  };
  const POWERS = {
    magma:   { name:'Magma Nova',     icon:'🌋', dmg:3.5, burn:3,   desc:'A blast of molten honey — heavy damage, and the guardian burns for three ticks.' },
    stone:   { name:'Stone Bulwark',  icon:'🪨', dmg:2.0, shield:2.5, stagger:1.8, desc:'Honey hardens into stone — a long stagger, and nothing can touch you for 2.5 seconds.' },
    tide:    { name:'Tide Surge',     icon:'🌊', dmg:2.2, heal:0.25, desc:'A wave of living honey — damage, and a quarter of your health flows back.' },
    crystal: { name:'Crystal Prism',  icon:'💎', dmg:2.4, freeze:4,  desc:'Honey crystallises around the guardian — it crawls for four seconds and takes extra damage.' },
    primal:  { name:'Primal Rush',    icon:'🌿', dmg:2.0, frenzy:6,  desc:'Ancient honey in the blood — six seconds of frenzy: every hit ×1.6, and the next Burst needs only two.' },
  };
  function powerOf(cls) { return POWERS[CLASS_POWER[cls] || 'primal']; }

  const CLASS_AFFINITY = {
    'Magma Warden':     { strong:'hadean',      weak:'proterozoic' },
    'Ember Knight':     { strong:'hadean',      weak:'cenozoic' },
    'Stratum Knight':   { strong:'archean',     weak:'paleozoic' },
    'Tectonic Guard':   { strong:'archean',     weak:'mesozoic' },
    'Stratum Keeper':   { strong:'archean',     weak:'cenozoic' },
    'Sediment Scout':   { strong:'archean',     weak:'hadean' },
    'Tidal Rogue':      { strong:'proterozoic', weak:'hadean' },
    'Quartz Sage':      { strong:'proterozoic', weak:'mesozoic' },
    'Desert Fossil':    { strong:'paleozoic',   weak:'proterozoic' },
    'Fossil Rogue':     { strong:'paleozoic',   weak:'cenozoic' },
    'Carbonite Ranger': { strong:'mesozoic',    weak:'hadean' },
    'Void Stalker':     { strong:'mesozoic',    weak:'archean' },
    'Glacial Scout':    { strong:'cenozoic',    weak:'hadean' },
    'Crystal Mage':     { strong:'cenozoic',    weak:'paleozoic' },
  };

  const eraIdx     = era => Math.max(0, ERA_ORDER.indexOf(era));
  const drinkCost  = era => 8 + eraIdx(era) * 4;
  const switchCost = era => 6 + eraIdx(era) * 3;
  const reviveCost = era => 25 + eraIdx(era) * 5;
  const infuseCost = lvl => 12 + lvl * 6;
  const xpToNext   = lvl => 25 + lvl * 15;
  const honeyDrop  = (era, rng) => 4 + eraIdx(era) * 3 + Math.floor(rng() * 3);

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return Math.abs(h);
  }

  function deriveClass(traits, seed) {
    traits = traits || {}; seed = seed || '';
    const classes = {
      'Volcanic':'Magma Warden',    'Lava':'Magma Warden',     'Caldera':'Magma Warden',
      'Fire':'Ember Knight',        'Flame':'Ember Knight',    'Ember':'Ember Knight',
      'Ice':'Glacial Scout',        'Frost':'Glacial Scout',   'Arctic':'Glacial Scout',  'Glacial':'Glacial Scout',
      'Dark':'Void Stalker',        'Shadow':'Void Stalker',   'Obsidian':'Void Stalker', 'Void':'Void Stalker',
      'Light':'Quartz Sage',        'Crystal':'Quartz Sage',   'Quartz':'Quartz Sage',    'Gem':'Quartz Sage',
      'Stone':'Stratum Knight',     'Rock':'Stratum Knight',   'Granite':'Stratum Knight','Stratum':'Stratum Knight',
      'Water':'Tidal Rogue',        'Ocean':'Tidal Rogue',     'River':'Tidal Rogue',     'Tidal':'Tidal Rogue',
      'Sand':'Desert Fossil',       'Desert':'Desert Fossil',  'Amber':'Desert Fossil',   'Dune':'Desert Fossil',
      'Forest':'Carbonite Ranger',  'Jungle':'Carbonite Ranger','Moss':'Carbonite Ranger', 'Carbon':'Carbonite Ranger',
    };
    const bg = traits['Background'] || traits['background'] || traits['Era'] || traits['era'] || '';
    for (const k in classes) if (bg.toLowerCase().includes(k.toLowerCase())) return classes[k];
    const fallbacks = ['Sediment Scout','Fossil Rogue','Crystal Mage','Tectonic Guard','Magma Warden','Stratum Keeper'];
    return fallbacks[hash(bg + (traits['Eyes'] || '') + seed) % fallbacks.length];
  }

  function rarityForNumber(num) {
    if (!num) return 'common';
    return num % 100 === 0 ? 'legendary' : num % 25 === 0 ? 'epic' : num % 5 === 0 ? 'rare' : 'common';
  }

  function baseStats(cub) {
    const rb = { legendary:30, epic:20, rare:10, common:0 }[cub.rarity] || 0;
    const t  = cub.traits || {};
    const atkSeed = hash((t['Eyes']       || t['Mouth']  || '') + 'atk' + cub.name);
    const defSeed = hash((t['Fur']        || t['Body']   || '') + 'def' + cub.name);
    const spdSeed = hash((t['Accessory']  || t['Hat']    || '') + 'spd' + cub.name);
    const lckSeed = hash((t['Background'] || t['Era']    || '') + 'lck' + cub.name);
    return {
      ATK: Math.min(99, 28 + (atkSeed % 45) + rb),
      DEF: Math.min(99, 22 + (defSeed % 40) + rb),
      SPD: Math.min(99, 25 + (spdSeed % 42) + rb),
      LCK: Math.min(99, 18 + (lckSeed % 38) + rb),
      HP:  120 + rb * 2,
    };
  }

  function affinity(cls, era) {
    const a = CLASS_AFFINITY[cls];
    if (!a) return 0;
    return a.strong === era ? 1 : a.weak === era ? -1 : 0;
  }

  // Level and era affinity scale the trait-derived base stats
  function getStats(cub, lvl, era) {
    lvl = lvl || 1;
    const base = baseStats(cub), aff = affinity(cub.class, era);
    const mult = (1 + 0.04 * (lvl - 1)) * (aff === 1 ? 1.2 : aff === -1 ? 0.85 : 1);
    const sc = v => Math.min(160, Math.round(v * mult));
    return { ATK: sc(base.ATK), DEF: sc(base.DEF), SPD: sc(base.SPD), LCK: sc(base.LCK), HP: base.HP + 8 * (lvl - 1) };
  }

  function newProfile() {
    return { honey:0, honeyByEra:{}, wins:0, era:'hadean', cubProg:{}, cooldowns:{}, hpPool:{}, battle:null, roads:{}, bosses:{} };
  }
  function prog(p, id) { return p.cubProg[id] || (p.cubProg[id] = { xp:0, lvl:1 }); }
  function isCoolingDown(p, id, now) { return !!p.cooldowns[id] && p.cooldowns[id] > now; }
  function bossDone(p, era) { return !!(p.bosses && p.bosses[era] && p.bosses[era].runs > 0); }
  function bossAvailable(p, era) { const r = ROADS[era]; return !!r && !!ERA_BOSSES[era] && isEraUnlocked(p, era) && p.wins >= r.wins; }
  function roadAvailable(p, era) { const r = ROADS[era]; return !!r && isEraUnlocked(p, era) && p.wins >= r.wins && (!ERA_BOSSES[era] || bossDone(p, era)); }
  function roadDone(p, era) { return !!(p.roads && p.roads[era] && p.roads[era].runs > 0); }
  function isEraUnlocked(p, era) {
    if (p.wins < (ERA_UNLOCK[era] || 0)) return false;
    const prev = ERA_ORDER[ERA_ORDER.indexOf(era) - 1];
    return !(prev && ROADS[prev]) || roadDone(p, prev);
  }
  function completeRoad(p, era, timeMs, honey, now, cubId) {
    const road = ROADS[era];
    if (!road) return fail('unknown road');
    if (cubId && !scoutEraOk(cubId, era)) return fail('scout_era');
    if (!roadAvailable(p, era)) return fail('locked');
    if (!(timeMs >= road.minTimeMs)) return fail('too_fast');
    honey = Math.max(0, Math.min(road.maxHoney, Math.floor(honey || 0)));
    p.roads = p.roads || {};
    const r = p.roads[era] || (p.roads[era] = { runs:0, best:null, honey:0, lastAt:0 });
    const first = r.runs === 0;
    r.runs++; r.best = r.best == null ? timeMs : Math.min(r.best, timeMs); r.honey += honey; r.lastAt = now || Date.now();
    p.honey += honey; p.honeyByEra[era] = (p.honeyByEra[era] || 0) + honey;
    const unlocked = first && road.next && isEraUnlocked(p, road.next) ? [road.next] : [];
    return { ok:true, unlocked, first, p };
  }
  function fail(error) { return { ok:false, error }; }

  function spawnEnemy(p, rng) {
    const pool = ERA_ENEMIES[p.era] || ERA_ENEMIES.hadean;
    const [lo, hi] = ERA_LVL[p.era] || ERA_LVL.hadean;
    const e = Object.assign({}, pool[Math.floor(rng() * pool.length)]);
    e.lvl = lo + Math.floor(rng() * (hi - lo + 1));
    p.battle.enemy = e;
    p.battle.eHP = p.battle.eMaxHP = e.hp;
    return { t:'spawn', enemy:e, eHP:e.hp, eMaxHP:e.hp };
  }

  function enterCub(p, cub) {
    const max = getStats(cub, prog(p, cub.id).lvl, p.era).HP;
    p.battle.cubId = cub.id;
    p.battle.pMaxHP = max;
    p.battle.pHP = Math.min(max, p.hpPool[cub.id] != null ? p.hpPool[cub.id] : max);
  }

  // Start (or restart) a hunt with `cub` in the profile's current era
  function startBattle(p, cub, opts) {
    const now = opts.now || Date.now(), rng = opts.rng || Math.random;
    if (isCoolingDown(p, cub.id, now)) return fail('cooling');
    if (!scoutEraOk(cub.id, p.era)) return fail('scout_era');
    p.battle = { cubId:null, pHP:0, pMaxHP:0, enemy:null, eHP:0, eMaxHP:0, defending:false, burst: takeBurstBank(p) };
    enterCub(p, cub);
    const events = [spawnEnemy(p, rng)];
    return { ok:true, events, p };
  }

  function endBattle(p) { p.battle = null; }
  // A fallen cub's charged Honey Bursts pass to the next cub that enters the den (up to two)
  const MAX_BURST = 2;
  function takeBurstBank(p) { const n = Math.max(0, Math.min(MAX_BURST, Math.floor(p.burstBank || 0))); p.burstBank = 0; return n; }
  function bankBurst(p, n) { p.burstBank = Math.max(0, Math.min(MAX_BURST, Math.floor(Number.isFinite(n) ? n : 0))); return p.burstBank; }

  // The era boss replaces the guardian in an open battle; it is a hunt with phases
  function startBoss(p, cub, opts) {
    const now = opts.now || Date.now();
    if (isCoolingDown(p, cub.id, now)) return fail('cooling');
    if (!scoutEraOk(cub.id, p.era)) return fail('scout_era');
    if (!bossAvailable(p, p.era)) return fail('boss_locked');
    const boss = ERA_BOSSES[p.era];
    p.battle = { cubId:null, pHP:0, pMaxHP:0, enemy:null, eHP:0, eMaxHP:0, defending:false, boss:true, era:p.era, burst: takeBurstBank(p) };
    enterCub(p, cub);
    p.battle.enemy = Object.assign({ boss:true }, boss, { phases: boss.phases.map(ph => Object.assign({}, ph)) });
    const rec = p.bosses && p.bosses[p.era];
    p.battle.eMaxHP = boss.hp;
    p.battle.eHP = rec && rec.hpLeft > 0 && rec.hpLeft < boss.hp ? Math.floor(rec.hpLeft) : boss.hp;   // siege: wounds persist
    return { ok:true, events:[{ t:'spawn', enemy:p.battle.enemy, eHP:boss.hp, eMaxHP:boss.hp }], p };
  }

  // ---- rewards shared by every kind of fight ----
  function applyVictory(p, cub, enemy, rng) {
    const era = p.era, xpGain = enemy.xp || 10, drop = honeyDrop(era, rng);
    const prevWins = p.wins; p.wins++;
    const pr = prog(p, cub.id); pr.xp += xpGain;
    let ups = 0; const cap = levelCap(cub.id);
    while (pr.lvl < cap && pr.xp >= xpToNext(pr.lvl)) { pr.xp -= xpToNext(pr.lvl); pr.lvl++; ups++; }
    if (pr.lvl >= cap) pr.xp = Math.min(pr.xp, xpToNext(pr.lvl) - 1);
    p.honey += drop; p.honeyByEra[era] = (p.honeyByEra[era] || 0) + drop;
    const unlocked = ERA_ORDER.filter(e => prevWins < ERA_UNLOCK[e] && p.wins >= ERA_UNLOCK[e] && isEraUnlocked(p, e));
    return { honey: drop, honeyName: ERA_HONEY[era], xp: xpGain, ups, lvl: pr.lvl, wins: p.wins, unlocked };
  }
  function applyDefeat(p, cubId, now) {
    p.cooldowns[cubId] = now + COOLDOWN_MS;
    delete p.hpPool[cubId];
    return p.cooldowns[cubId];
  }

  // ---- combat numbers: one formula set for the real-time hunt (client) and its validation (server) ----
  const COMBAT = {
    hit:   (stats, rng) => Math.floor(stats.ATK * 0.4 + (rng || Math.random)() * 15),   // honey ladle swing
    crit:  (stats, rng) => (rng || Math.random)() < stats.LCK / 200,                       // ×1.8
    burst: (stats)      => Math.floor(stats.ATK * 1.2 + stats.LCK * 0.3),                // Honey Burst, staggers
    taken: (stats, enemy, rng, scale) => Math.max(1, Math.floor((enemy.atk * 0.6 + (rng || Math.random)() * 12) * (scale || 1)) - Math.floor(stats.DEF * 0.2)),
  };

  // The browser fights in real time; the server only grants what is plausible: a win cannot land
  // faster than the cub's best possible damage output, and a report must match the open battle.
  const HUNT = { minSeconds: 4, maxHitsPerSecond: 3.5, bossMinSeconds: 20, chainWindow: 4 };   // bursts within chainWindow seconds chain: ×2, ×3…
  function huntMinTimeMs(cub, lvl, era, enemy) {
    const s = getStats(cub, lvl, era), perHit = (s.ATK * 0.4 + 15) * 1.8;
    return Math.max(HUNT.minSeconds * 1000, Math.floor(enemy.hp / (perHit * HUNT.maxHitsPerSecond) * 1000));
  }
  // the most damage a cub could plausibly deal in a span (swings at the cap, every one a crit, bursts on top)
  function huntMaxDamage(cub, lvl, era, timeMs) {
    const s = getStats(cub, lvl, era), perHit = (s.ATK * 0.4 + 15) * 1.8;
    return Math.ceil(perHit * HUNT.maxHitsPerSecond * (timeMs / 1000) * 1.6);
  }
  function resolveHunt(p, cub, report, opts) {
    opts = opts || {};
    const now = opts.now || Date.now(), rng = opts.rng || Math.random, b = p.battle;
    if (!b || !b.enemy) return fail('no battle');
    if (b.cubId !== cub.id) return fail('wrong cub');
    const timeMs = Math.round(report.timeMs || 0);
    const keepHP = () => { p.hpPool[cub.id] = Math.max(1, Math.min(b.pMaxHP, Math.round(report.pHP != null ? report.pHP : b.pMaxHP))); };
    if (report.outcome === 'win') {
      const remaining = Object.assign({}, b.enemy, { hp: b.eHP });   // a sieged boss only has its remaining HP to lose
      if (timeMs < Math.max(huntMinTimeMs(cub, prog(p, cub.id).lvl, p.era, remaining), b.boss ? Math.floor(HUNT.bossMinSeconds * 1000 * b.eHP / b.eMaxHP) : 0)) return fail('too_fast');
      const v = applyVictory(p, cub, b.enemy, rng);
      let bossResult = null;
      if (b.boss) {
        const era = b.era || p.era, bonus = bossHoneyBonus(era);
        p.bosses = p.bosses || {};
        const rec = p.bosses[era] || (p.bosses[era] = { runs:0, best:null, lastAt:0 });
        const first = rec.runs === 0;
        rec.runs++; rec.best = rec.best == null ? timeMs : Math.min(rec.best, timeMs); rec.lastAt = now; delete rec.hpLeft; rec.attempts = 0;
        p.honey += bonus; p.honeyByEra[era] = (p.honeyByEra[era] || 0) + bonus;
        v.honey += bonus;
        bossResult = { era, first, roadOpened: first && roadAvailable(p, era) };
      }
      keepHP(); endBattle(p);
      return Object.assign({ ok:true, outcome:'win', enemy:b.enemy, boss:bossResult, p }, v);
    }
    // siege: a boss keeps the wounds it took, clamped to what the cub could plausibly have dealt in that time
    const keepBossHP = () => {
      if (!b.boss) return null;
      const era = b.era || p.era, lvl = prog(p, cub.id).lvl;
      const reported = Number.isFinite(report.eHP) ? Math.max(1, Math.floor(report.eHP)) : b.eHP;
      const dealt = Math.max(0, Math.min(b.eHP - reported, huntMaxDamage(cub, lvl, era, timeMs)));
      p.bosses = p.bosses || {};
      const rec = p.bosses[era] || (p.bosses[era] = { runs:0, best:null, lastAt:0 });
      rec.hpLeft = Math.max(1, b.eHP - dealt); rec.attempts = (rec.attempts || 0) + 1;
      return { era, hpLeft: rec.hpLeft, hpMax: b.eMaxHP, dealt };
    };
    if (report.outcome === 'lose') {
      const boss = keepBossHP(), inherited = bankBurst(p, report.burst);
      const until = applyDefeat(p, cub.id, now); endBattle(p);
      return { ok:true, outcome:'lose', cooldownUntil: until, boss, inherited, p };
    }
    if (report.outcome === 'flee') { const boss = keepBossHP(); keepHP(); endBattle(p); return { ok:true, outcome:'flee', boss, p }; }
    return fail('bad outcome');
  }

  function infuse(p, cub) {
    const pr = prog(p, cub.id);
    if (pr.lvl >= levelCap(cub.id)) return fail('max');
    const cost = infuseCost(pr.lvl);
    if (p.honey < cost) return fail('honey');
    p.honey -= cost; pr.lvl++; pr.xp = 0;
    if (p.battle && p.battle.cubId === cub.id) {
      p.battle.pMaxHP = getStats(cub, pr.lvl, p.era).HP;
      p.battle.pHP = Math.min(p.battle.pMaxHP, p.battle.pHP + 8);
    }
    return { ok:true, cost, lvl:pr.lvl, p };
  }

  function reviveWithHoney(p, cubId, now) {
    now = now || Date.now();
    if (!isCoolingDown(p, cubId, now)) return fail('not cooling');
    const cost = reviveCost(p.era);
    if (p.honey < cost) return fail('honey');
    p.honey -= cost;
    delete p.cooldowns[cubId]; delete p.hpPool[cubId];
    return { ok:true, cost, p };
  }

  function clearCooldown(p, cubId) {
    delete p.cooldowns[cubId]; delete p.hpPool[cubId];
    return { ok:true, p };
  }

  function selectEra(p, era, cub, opts) {
    if (!ERA_UNLOCK.hasOwnProperty(era)) return fail('unknown era');
    if (!isEraUnlocked(p, era)) return fail('locked');
    if (cub && !scoutEraOk(cub.id, era)) return fail('scout_era');
    if (p.battle && p.battle.boss && p.battle.era !== era) p.battle = null;
    p.era = era;
    const events = [];
    if (p.battle && cub) {
      enterCub(p, cub);          // affinity may change max HP
      events.push(spawnEnemy(p, opts && opts.rng || Math.random));
    }
    return { ok:true, events, p };
  }

  return {
    ERA_ORDER, ERA_UNLOCK, ERA_HONEY, ERA_LVL, ERA_ENEMIES, GEO_BURSTS, CLASS_BURSTS, CLASS_AFFINITY,
    COOLDOWN_MS, MAX_LEVEL, eraIdx, drinkCost, switchCost, reviveCost, infuseCost, xpToNext,
    hash, deriveClass, rarityForNumber, baseStats, affinity, getStats,
    ROADS, SCOUT_CUBS, SCOUT_LEVEL_CAP, SCOUT_ERA_CAP, isScout, scoutCub, levelCap, scoutEraOk, CLASS_POWER, POWERS, powerOf,
    newProfile, prog, isCoolingDown, isEraUnlocked, roadAvailable, roadDone, completeRoad,
    COMBAT, HUNT, MAX_BURST, huntMinTimeMs, huntMaxDamage, startBattle, startBoss, resolveHunt, applyVictory, applyDefeat, infuse, reviveWithHoney, clearCooldown, selectEra,
    ERA_BOSSES, bossAvailable, bossDone, bossHoneyBonus,
  };
});
