/**
 * OkayCubs Personality Engine
 * Generates a unique personality profile (Moltbook entry) for each Cub
 * based on its on-chain NFT traits.
 */

export interface CubPersonality {
  title: string;          // e.g. "The Ember Warden"
  tagline: string;        // Short punchy one-liner
  bio: string;            // 2-3 sentence personality description
  quirk: string;          // Unique personality quirk
  element: string;        // Dominant elemental affinity
  elementColor: string;   // Hex color for the element
  combatStyle: string;    // How they fight
  favoriteEra: string;    // Which geological era they vibe with
  stats: {
    str: number; // Strength   0-100
    def: number; // Defense    0-100
    spd: number; // Speed      0-100
    lck: number; // Luck       0-100
    wis: number; // Wisdom     0-100
  };
  badges: string[];       // Earned trait-based badges
}

// ── Trait → personality mappings ─────────────────────────────────────────────

const BACKGROUND_VIBES: Record<string, Partial<CubPersonality>> = {
  'Cosmic':       { element: 'Void',    elementColor: '#9b59b6', favoriteEra: 'Hadean',      stats: { str:60, def:50, spd:75, lck:85, wis:90 } },
  'Lava':         { element: 'Fire',    elementColor: '#e74c3c', favoriteEra: 'Hadean',      stats: { str:90, def:55, spd:70, lck:50, wis:45 } },
  'Deep Ocean':   { element: 'Water',   elementColor: '#3498db', favoriteEra: 'Archean',     stats: { str:55, def:80, spd:60, lck:65, wis:75 } },
  'Nebula':       { element: 'Void',    elementColor: '#8e44ad', favoriteEra: 'Hadean',      stats: { str:50, def:45, spd:85, lck:90, wis:80 } },
  'Forest':       { element: 'Nature',  elementColor: '#27ae60', favoriteEra: 'Cenozoic',    stats: { str:70, def:75, spd:65, lck:60, wis:70 } },
  'Desert':       { element: 'Earth',   elementColor: '#e67e22', favoriteEra: 'Mesozoic',    stats: { str:80, def:70, spd:55, lck:55, wis:60 } },
  'Arctic':       { element: 'Ice',     elementColor: '#85c1e9', favoriteEra: 'Proterozoic', stats: { str:65, def:85, spd:50, lck:60, wis:80 } },
  'Storm':        { element: 'Thunder', elementColor: '#f1c40f', favoriteEra: 'Archean',     stats: { str:85, def:50, spd:90, lck:70, wis:55 } },
  'Crystal Cave': { element: 'Crystal', elementColor: '#a8d8ea', favoriteEra: 'Proterozoic', stats: { str:55, def:90, spd:45, lck:75, wis:85 } },
  'Volcano':      { element: 'Magma',   elementColor: '#c0392b', favoriteEra: 'Hadean',      stats: { str:95, def:60, spd:65, lck:45, wis:50 } },
};

const FUR_TITLES: Record<string, string> = {
  'Black':       'Shadow',
  'White':       'Frost',
  'Brown':       'Stone',
  'Golden':      'Solar',
  'Silver':      'Lunar',
  'Red':         'Ember',
  'Blue':        'Tide',
  'Purple':      'Arcane',
  'Green':       'Verdant',
  'Striped':     'Phantom',
  'Spotted':     'Dappled',
  'Cosmic':      'Stellar',
  'Lava':        'Igneous',
  'Crystal':     'Prismatic',
};

const EYE_QUIRKS: Record<string, string> = {
  'Laser':        'Can vaporize rocks — and excuses — with a single glance.',
  'Hollow':       'Stares into the void so long the void started blinking first.',
  'Stars':        'Dreams of the Hadean sky even when wide awake.',
  'Fire':         'Has never lost a staring contest. Not once.',
  'Sad':          'Carries the weight of 4.5 billion years personally.',
  'Happy':        'Finds gold veins in the darkest strata — always optimistic.',
  'Angry':        'Tectonic energy. Do not tap the glass.',
  'Hypnotic':     "You already agreed to something. You just don't remember what.",
  'Dead':         'Vibes on a frequency that predates life itself.',
  'Closed':       'Meditates so hard they can hear plate tectonics shift.',
  'Sunglasses':   'Too cool for the Cenozoic. Too cool for most things, honestly.',
  'Crying':       "Every tear contains a fossil record. It's actually kind of beautiful.",
  '3D Glasses':   "Perceives dimensions your feeble era can't comprehend.",
};

const HAT_ROLES: Record<string, string> = {
  'Crown':        'Sovereign',
  'Wizard Hat':   'Archmage',
  'Cowboy Hat':   'Ranger',
  'Top Hat':      'Aristocrat',
  'Bucket Hat':   'Explorer',
  'Beanie':       'Scout',
  'Halo':         'Celestial',
  'Horns':        'Harbinger',
  'None':         'Wanderer',
  'Laurel':       'Champion',
  'Miner Helmet': 'Excavator',
  'Space Helmet': 'Cosmonaut',
};

const MOUTH_COMBAT: Record<string, string> = {
  'Smile':     "Disarms enemies with charm, then strikes when they're laughing.",
  'Grin':      'Fights dirty — and loves every second of it.',
  'Fangs':     'Opens with a bite. Finishes with a roar.',
  'Gold Tooth':'Negotiates first. Destroys second. Keeps the gold either way.',
  'Pipe':      'Calculated, patient. Strikes only when victory is certain.',
  'Tongue':    'Unpredictable — chaos incarnate on the battlefield.',
  'Sad':       'Weaponizes sadness. Opponents let their guard down. Mistake.',
  'Angry':     'Berserker mode: all offense, zero hesitation.',
  'Neutral':   'Reads every situation with cold, geological patience.',
  'Open':      'A battle cry that echoes through the strata.',
};

const CLOTHES_BONUS: Record<string, Partial<{ str: number; def: number; spd: number; lck: number; wis: number }>> = {
  'Armor':       { def: 15, str: 5 },
  'Robe':        { wis: 15, lck: 5 },
  'Jacket':      { spd: 10, lck: 10 },
  'Hoodie':      { def: 5,  lck: 15 },
  'Tank Top':    { str: 15, spd: 5 },
  'Suit':        { wis: 10, lck: 10 },
  'Cape':        { spd: 15, wis: 5 },
  'Chain Mail':  { def: 20 },
  'Wizard Robe': { wis: 20 },
  'None':        { spd: 5, lck: 5 },
};

const ACCESSORY_BADGES: Record<string, string> = {
  'Gold Chain':    '⛓ Chain Lord',
  'Sword':         '⚔ Blade Master',
  'Shield':        '🛡 Iron Warden',
  'Staff':         '🪄 Runic Caster',
  'Bow':           '🏹 Strata Archer',
  'Lantern':       '🔦 Lightbringer',
  'Map':           '🗺 Cartographer',
  'Fossil':        '🦴 Fossil Keeper',
  'Crystal':       '💎 Crystal Bearer',
  'Honey Jar':     '🍯 Honey Sovereign',
  'Pickaxe':       '⛏ Deep Miner',
  'Compass':       '🧭 True North',
  'Book':          '📜 Lore Scholar',
  'Potion':        '⚗ Alchemist',
};

// ── Personality title builder ─────────────────────────────────────────────────

const ROLE_SUFFIXES = [
  'Warden', 'Keeper', 'Seeker', 'Walker', 'Drifter',
  'Sovereign', 'Caster', 'Striker', 'Guardian', 'Wanderer',
  'Forger', 'Excavator', 'Chronicler', 'Herald', 'Sentinel',
];

function buildTitle(traits: Record<string, string>): string {
  const fur  = traits['Fur'] || traits['Body'] || traits['Background'] || '';
  const hat  = traits['Hat'] || traits['Head'] || '';
  const prefix = FUR_TITLES[fur] || FUR_TITLES[Object.keys(FUR_TITLES).find(k => fur.includes(k)) || ''] || 'Ancient';
  const role = HAT_ROLES[hat] || ROLE_SUFFIXES[Math.abs(hashString(fur + hat)) % ROLE_SUFFIXES.length];
  return `The ${prefix} ${role}`;
}

// Deterministic hash for consistent personality (no random per reload)
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}

// ── Stat blending ─────────────────────────────────────────────────────────────

function blendStats(
  base: CubPersonality['stats'],
  bonus: Partial<CubPersonality['stats']>
): CubPersonality['stats'] {
  return {
    str: Math.min(100, base.str + (bonus.str ?? 0)),
    def: Math.min(100, base.def + (bonus.def ?? 0)),
    spd: Math.min(100, base.spd + (bonus.spd ?? 0)),
    lck: Math.min(100, base.lck + (bonus.lck ?? 0)),
    wis: Math.min(100, base.wis + (bonus.wis ?? 0)),
  };
}

// Default stats for unknown traits
const DEFAULT_STATS: CubPersonality['stats'] = { str: 65, def: 65, spd: 65, lck: 65, wis: 65 };

// ── Bio generation ────────────────────────────────────────────────────────────

const BIO_OPENINGS = [
  'Born in the {era}, {name} carved their legend into the rock itself.',
  'The strata remember {name}. They remember everything.',
  'Where others see stone, {name} sees memory — and opportunity.',
  'Ancient beyond reckoning, {name} has outlasted three mass extinctions and one very bad era.',
  'Even the fossils speak of {name} in hushed tones.',
  '{name} didn\'t choose the geological life. The geological life chose them.',
];

const BIO_MIDDLES: Record<string, string> = {
  'Fire':    'Their temper runs hotter than the Hadean mantle, but so does their loyalty.',
  'Water':   'Patient as ocean tides, relentless as erosion — they always reshape what stands in their path.',
  'Nature':  'Moves through the strata like roots through limestone: slowly, silently, unstoppably.',
  'Earth':   'Solid as bedrock, immovable in conviction, catastrophic in motion.',
  'Ice':     'Cold calculation masks a burning drive that hasn\'t thawed in 500 million years.',
  'Thunder': 'Strikes without warning. Leaves the landscape changed forever.',
  'Crystal': 'Every facet of their nature refracts into something unexpected.',
  'Void':    'Operates on frequencies that predate the concept of time.',
  'Magma':   'The pressure has been building for eons. The eruption is always worth waiting for.',
};

function generateBio(name: string, traits: Record<string, string>, element: string, era: string): string {
  const h = hashString(name + element);
  const opening = BIO_OPENINGS[h % BIO_OPENINGS.length]
    .replace('{name}', name)
    .replace('{era}', era);
  const middle = BIO_MIDDLES[element] || BIO_MIDDLES['Earth'];
  const closings = [
    'Don\'t let the cub face fool you.',
    'Respect the strata. Respect the Cub.',
    'The chronicles have their name on every page.',
    'They\'ve seen empires rise, fall, and fossilize.',
  ];
  const closing = closings[h % closings.length];
  return `${opening} ${middle} ${closing}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generatePersonality(
  name: string,
  cubNumber: number,
  traits: Record<string, string>
): CubPersonality {
  // Background → base personality
  const bgKey = Object.keys(BACKGROUND_VIBES).find(k =>
    (traits['Background'] || '').includes(k)
  ) || '';
  const bgVibe = BACKGROUND_VIBES[bgKey] || {};

  const baseStats = bgVibe.stats || DEFAULT_STATS;
  const element   = bgVibe.element || 'Earth';
  const elemColor = bgVibe.elementColor || '#d4af37';
  const era       = bgVibe.favoriteEra || 'Paleozoic';

  // Apply clothing bonus
  const clothesKey = Object.keys(CLOTHES_BONUS).find(k =>
    (traits['Clothes'] || traits['Outfit'] || '').includes(k)
  ) || 'None';
  const stats = blendStats(baseStats, CLOTHES_BONUS[clothesKey] || {});

  // Apply number-based micro-variation for uniqueness
  const nudge = (cubNumber % 10) - 5; // -5 to +4
  const finalStats: CubPersonality['stats'] = {
    str: Math.min(100, Math.max(10, stats.str + nudge)),
    def: Math.min(100, Math.max(10, stats.def - nudge)),
    spd: Math.min(100, Math.max(10, stats.spd + (nudge > 0 ? 0 : nudge))),
    lck: Math.min(100, Math.max(10, stats.lck + Math.abs(nudge))),
    wis: Math.min(100, Math.max(10, stats.wis + (nudge < 0 ? 0 : nudge))),
  };

  // Title
  const title = buildTitle(traits);

  // Tagline from fur + background combo
  const taglines = [
    `${element} runs in the veins. Honey runs in the soul.`,
    `Forged in the ${era}. Still going.`,
    `The strata don't lie. Neither does this Cub.`,
    `Ancient, unstoppable, unmistakably OkayCubs.`,
    `What 4.5 billion years of pressure produces.`,
  ];
  const tagline = taglines[hashString(name) % taglines.length];

  // Quirk from eyes
  const eyeKey = Object.keys(EYE_QUIRKS).find(k =>
    (traits['Eyes'] || '').includes(k)
  ) || '';
  const quirk = EYE_QUIRKS[eyeKey] || 'Has survived every extinction event. Purely by attitude.';

  // Combat style from mouth
  const mouthKey = Object.keys(MOUTH_COMBAT).find(k =>
    (traits['Mouth'] || '').includes(k)
  ) || 'Neutral';
  const combatStyle = MOUTH_COMBAT[mouthKey] || MOUTH_COMBAT['Neutral'];

  // Badges from accessories + special traits
  const badges: string[] = [];
  const acc = traits['Accessory'] || traits['Held Item'] || '';
  const accBadge = Object.keys(ACCESSORY_BADGES).find(k => acc.includes(k));
  if (accBadge) badges.push(ACCESSORY_BADGES[accBadge]);
  if (cubNumber <= 100) badges.push('🏛 Genesis Cub');
  if (cubNumber % 100 === 0) badges.push('⚡ Century Cub');
  if (Object.keys(traits).length >= 8) badges.push('✨ Fully Adorned');
  if (element === 'Void' || element === 'Crystal') badges.push('🌌 Rare Aura');

  const bio = generateBio(name, traits, element, era);

  return {
    title,
    tagline,
    bio,
    quirk,
    element,
    elementColor: elemColor,
    combatStyle,
    favoriteEra: era,
    stats: finalStats,
    badges,
  };
}
