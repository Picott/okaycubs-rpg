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
    return { honey:0, honeyByEra:{}, wins:0, era:'hadean', cubProg:{}, cooldowns:{}, hpPool:{}, battle:null };
  }
  function prog(p, id) { return p.cubProg[id] || (p.cubProg[id] = { xp:0, lvl:1 }); }
  function isCoolingDown(p, id, now) { return !!p.cooldowns[id] && p.cooldowns[id] > now; }
  function isEraUnlocked(p, era) { return p.wins >= (ERA_UNLOCK[era] || 0); }
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
    p.battle = { cubId:null, pHP:0, pMaxHP:0, enemy:null, eHP:0, eMaxHP:0, defending:false };
    enterCub(p, cub);
    const events = [spawnEnemy(p, rng)];
    return { ok:true, events, p };
  }

  function endBattle(p) { p.battle = null; }

  // Resolve one full exchange: the player's action, then the guardian's answer.
  // cubs: { [id]: cub } must contain the active cub (and the switch target, if any).
  function resolveAction(p, cubs, action, opts) {
    opts = opts || {};
    const now = opts.now || Date.now(), rng = opts.rng || Math.random;
    const b = p.battle;
    if (!b || !b.enemy) return fail('no battle');
    const cub = cubs[b.cubId];
    if (!cub) return fail('unknown cub');
    const era = p.era, events = [];
    let stats = getStats(cub, prog(p, cub.id).lvl, era);
    let defending = false, actor = cub;

    if (action === 'atk' || action === 'spc') {
      let dmg, crit = false, burst = null;
      if (action === 'atk') {
        crit = rng() < stats.LCK / 200;
        dmg  = Math.floor(stats.ATK * 0.4 + rng() * 15);
        if (crit) dmg = Math.floor(dmg * 1.8);
      } else {
        const pool = CLASS_BURSTS[cub.class] || GEO_BURSTS;
        burst = pool[Math.floor(rng() * pool.length)];
        dmg   = Math.floor(stats.ATK * .6 + stats.LCK * .3 + rng() * 20);
      }
      b.eHP = Math.max(0, b.eHP - dmg);
      events.push({ t:'player', action, dmg, crit, burst, eHP:b.eHP });
      if (b.eHP <= 0) {
        const xpGain = b.enemy.xp || 10, drop = honeyDrop(era, rng);
        const prevWins = p.wins; p.wins++;
        const pr = prog(p, cub.id); pr.xp += xpGain;
        let ups = 0;
        while (pr.lvl < MAX_LEVEL && pr.xp >= xpToNext(pr.lvl)) { pr.xp -= xpToNext(pr.lvl); pr.lvl++; ups++; }
        p.honey += drop; p.honeyByEra[era] = (p.honeyByEra[era] || 0) + drop;
        const unlocked = ERA_ORDER.filter(e => prevWins < ERA_UNLOCK[e] && p.wins >= ERA_UNLOCK[e]);
        if (ups) { b.pMaxHP = getStats(cub, pr.lvl, era).HP; b.pHP = Math.min(b.pMaxHP, b.pHP + 8 * ups); }
        events.push({ t:'victory', honey:drop, honeyName:ERA_HONEY[era], xp:xpGain, ups, lvl:pr.lvl, wins:p.wins, unlocked, pHP:b.pHP, pMaxHP:b.pMaxHP });
        events.push(spawnEnemy(p, rng));
        return { ok:true, events, p };
      }
    } else if (action === 'def') {
      defending = true;
      events.push({ t:'player', action, shield:Math.floor(stats.DEF * .5) });
    } else if (action === 'drink') {
      const cost = drinkCost(era);
      if (b.pHP >= b.pMaxHP) return fail('full');
      if (p.honey < cost) return fail('honey');
      const heal = Math.floor(b.pMaxHP * 0.4);
      p.honey -= cost;
      b.pHP = Math.min(b.pMaxHP, b.pHP + heal);
      events.push({ t:'player', action, heal, cost, honeyName:ERA_HONEY[era], pHP:b.pHP, pMaxHP:b.pMaxHP });
    } else if (action === 'switch') {
      const target = cubs[opts.switchTo];
      if (!target || target.id === cub.id) return fail('unknown cub');
      if (isCoolingDown(p, target.id, now)) return fail('cooling');
      const cost = switchCost(era);
      if (p.honey < cost) return fail('honey');
      p.honey -= cost;
      p.hpPool[cub.id] = b.pHP;
      enterCub(p, target);
      actor = target;
      stats = getStats(target, prog(p, target.id).lvl, era);
      events.push({ t:'player', action, from:cub.id, to:target.id, cost, pHP:b.pHP, pMaxHP:b.pMaxHP });
    } else {
      return fail('unknown action');
    }

    // Guardian retaliates
    const rawDmg = Math.floor(b.enemy.atk * .6 + rng() * 12);
    const red    = defending ? Math.floor(rawDmg * .35) : rawDmg;
    const dmg    = Math.max(1, red - Math.floor(stats.DEF * .2));
    b.pHP = Math.max(0, b.pHP - dmg);
    events.push({ t:'enemy', dmg, blocked:defending, pHP:b.pHP });
    if (b.pHP <= 0) {
      const until = now + COOLDOWN_MS;
      p.cooldowns[actor.id] = until;
      delete p.hpPool[actor.id];
      endBattle(p);
      events.push({ t:'defeat', cubId:actor.id, cooldownUntil:until });
    }
    return { ok:true, events, p };
  }

  function infuse(p, cub) {
    const pr = prog(p, cub.id);
    if (pr.lvl >= MAX_LEVEL) return fail('max');
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
    newProfile, prog, isCoolingDown, isEraUnlocked,
    startBattle, resolveAction, infuse, reviveWithHoney, clearCooldown, selectEra,
  };
});
