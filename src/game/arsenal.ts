export type WeaponCategory = 'bladed' | 'polearm_heavy' | 'ranged';

export type ArtworkThemeId =
  | 'sumi_blood_ink'
  | 'edo_ukiyoe_woodblock'
  | 'imperial_gold_leaf'
  | 'dark_tamahagane_forge';

export interface WeaponDef {
  id: string;
  index: number;
  name: string;
  kanji: string;
  category: WeaponCategory;
  damage: number;
  postureDamage: number;
  speed: number; // attacks per second
  reach: number; // world units
  swingArcDeg: number; // degrees of cleave
  kiCost: number;
  bleedBuildup: number;
  armorPiercing: number; // 0 to 1
  critMultiplier: number;
  projectileSpeed?: number;
  reloadTime?: number;
  specialEffect: string;
  description: string;
  bladeColor: number;
  hiltColor: number;
  trailColor: number;
  metricSpecs: string;
  wazamonoGrade: 'Saijo O-Wazamono' | 'O-Wazamono' | 'Ryo-Wazamono' | 'Wazamono';
  auraMotif: 'emerald_wind' | 'crimson_lightning' | 'ember_smoke' | 'azure_mist' | 'violet_shadow';
  aiPrompt: string;
}

export interface ThrowableDef {
  id: string;
  index: number;
  name: string;
  kanji: string;
  damage: number;
  postureDamage: number;
  cooldown: number;
  maxStock: number;
  countPerThrow: number;
  spreadAngleDeg: number;
  projectileSpeed: number;
  aoeRadius: number;
  effectType: 'bleed_fan' | 'stagger_pierce' | 'fire_aoe' | 'caltrop_slow';
  roleClue: string;
  description: string;
  color: number;
  metricSpecs: string;
  wazamonoGrade: 'Saijo O-Wazamono' | 'O-Wazamono' | 'Ryo-Wazamono' | 'Wazamono';
  auraMotif: 'emerald_wind' | 'crimson_lightning' | 'ember_smoke' | 'azure_mist' | 'violet_shadow';
  aiPrompt: string;
}

export interface ArmorDef {
  id: string;
  name: string;
  kanji: string;
  defense: number; // % damage reduction (0.05 - 0.45)
  speedMultiplier: number; // 0.82 - 1.22
  kiRegenMultiplier: number; // 0.80 - 1.38
  critBonus: number;
  damageMultiplier: number;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  silhouetteType:
    | 'haori'
    | 'domaru'
    | 'oyoroi'
    | 'shinobi'
    | 'origami'
    | 'crimson_ghost'
    | 'kitsune_mystic'
    | 'tengu_hermit'
    | 'komuso_monk'
    | 'oni_berserker'
    | 'snow_wolf'
    | 'sakura_duelist';
  roleClue: string;
  description: string;
  metricSpecs: string;
  aiPrompt: string;
}

export interface HelmetDef {
  id: string;
  name: string;
  kanji: string;
  postureDefenseBonus: number;
  critDamageBonus: number;
  kiCostReduction: number;
  intimidationAura: number;
  primaryColor: number;
  crestColor: number;
  styleType: 'suji_kabuto' | 'tengu_menpo' | 'kasa' | 'oni_kabuto' | 'hannya_mask';
  maedateType: 'crescent_moon' | 'stag_antlers' | 'oni_horns' | 'dragon_coils';
  roleClue: string;
  description: string;
  metricSpecs: string;
  aiPrompt: string;
}

export const WEAPONS: WeaponDef[] = [
  // ==========================================================================
  // CLASS 1: BLADES & SWORDS (KATANA FAMILY, 1-6)
  // ==========================================================================
  {
    id: 'uchigatana',
    index: 1,
    name: 'Uchigatana',
    kanji: '打刀',
    category: 'bladed',
    damage: 38,
    postureDamage: 28,
    speed: 2.6,
    reach: 2.8,
    swingArcDeg: 115,
    kiCost: 12,
    bleedBuildup: 25,
    armorPiercing: 0.2,
    critMultiplier: 1.5,
    specialEffect: 'Crimson Bleed Buildup & Emerald Wind Draw',
    description:
      'Standard Tamahagane katana worn edge-up. Overall 1.02m, Nagasa 0.73m, Sori curvature 0.018m, circular iron Tsuba (r=0.04m), silk Tsuka-ito (0.28m).',
    bladeColor: 0xe5e7eb,
    hiltColor: 0x7f1d1d,
    trailColor: 0xdc2626,
    metricSpecs: 'Length 1.02m · Nagasa 0.73m · Sori 18mm · Kasane 7mm',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'emerald_wind',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print and photorealistic macro studio photography of a legendary feudal Samurai Uchigatana katana, Tamahagane Damascus folded steel blade with glowing wavy Hamon temper line, ornate gold-inlaid iron Tsuba, crimson silk Tsuka-ito handle wrap, resting on handmade fibrous Washi paper with dramatic Sumi-e black ink splashes and emerald wind vortex, 8k AAA game icon artwork',
  },
  {
    id: 'odachi',
    index: 2,
    name: 'Odachi / Nodachi',
    kanji: '大太刀',
    category: 'bladed',
    damage: 72,
    postureDamage: 58,
    speed: 1.25,
    reach: 4.5,
    swingArcDeg: 175,
    kiCost: 26,
    bleedBuildup: 35,
    armorPiercing: 0.35,
    critMultiplier: 1.6,
    specialEffect: 'Colossal 270° Posture-Shattering Cleave',
    description:
      'Massive two-handed battlefield field sword. Overall 1.68m, Nagasa 1.32m, deep Sori curvature 0.034m, wrapped handle 0.36m.',
    bladeColor: 0xd1d5db,
    hiltColor: 0x1e293b,
    trailColor: 0x991b1b,
    metricSpecs: 'Length 1.68m · Nagasa 1.32m · Sori 34mm · Tsuka 0.36m',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print and macro studio photography of a colossal Samurai Odachi Nodachi great sword, 1.68m curved Tamahagane blade with glowing wavy Hamon temper line and crimson lightning ink arcs on fibrous Washi parchment, gold Kintsugi seal, 8k AAA game weapon portrait',
  },
  {
    id: 'wakizashi',
    index: 3,
    name: 'Wakizashi',
    kanji: '脇差',
    category: 'bladed',
    damage: 27,
    postureDamage: 20,
    speed: 3.7,
    reach: 2.1,
    swingArcDeg: 95,
    kiCost: 8,
    bleedBuildup: 20,
    armorPiercing: 0.25,
    critMultiplier: 1.65,
    specialEffect: 'High-Mobility Close-Quarters Flurry',
    description:
      'Companion short sword forged for indoor velocity and parries. Overall 0.68m, blade 0.51m, Sori 0.011m.',
    bladeColor: 0xf3f4f6,
    hiltColor: 0x14532d,
    trailColor: 0xfef08a,
    metricSpecs: 'Length 0.68m · Nagasa 0.51m · Sori 11mm · Motohaba 28mm',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'emerald_wind',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print and macro photography of a feudal Samurai Wakizashi short sword, folded Tamahagane steel with bright Hamon line, emerald silk Tsuka-ito wrap, resting on textured Washi paper with Sumi-e black ink calligraphy strokes, 8k game icon',
  },
  {
    id: 'tanto',
    index: 4,
    name: 'Tanto',
    kanji: '短刀',
    category: 'bladed',
    damage: 24,
    postureDamage: 16,
    speed: 4.5,
    reach: 1.65,
    swingArcDeg: 75,
    kiCost: 6,
    bleedBuildup: 30,
    armorPiercing: 0.75,
    critMultiplier: 2.4,
    specialEffect: 'Armor-Piercing Yoroi-Doshi Vital Strikes',
    description:
      'Thick-spined armor-piercing dagger (Overall 0.38m, Nagasa 0.26m, Kasane spine 0.009m) that slips through lamellar gaps.',
    bladeColor: 0xe2e8f0,
    hiltColor: 0x451a03,
    trailColor: 0xf97316,
    metricSpecs: 'Length 0.38m · Nagasa 0.26m · Spine Kasane 9mm',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print and studio macro photography of an ornate Samurai Tanto armor-piercing dagger, thick Tamahagane spine, glowing Hamon edge, gold dragon Menuki, on handmade Washi paper with crimson ink splatters, 8k game art',
  },
  {
    id: 'dual_ninjato',
    index: 5,
    name: 'Niten Dual Wield & Ninjato',
    kanji: '二天一流・双刀',
    category: 'bladed',
    damage: 34,
    postureDamage: 26,
    speed: 3.9,
    reach: 2.4,
    swingArcDeg: 165,
    kiCost: 11,
    bleedBuildup: 28,
    armorPiercing: 0.32,
    critMultiplier: 1.85,
    specialEffect: 'Musashi Niten Ichi-Ryu Twin-Blade Whirlwind',
    description:
      'Simultaneous dual-blade stance pairing a straight square-Tsuba shinobi Ninjato (0.58m) and companion blade for rotary parries and cross-slashes.',
    bladeColor: 0x94a3b8,
    hiltColor: 0x0f172a,
    trailColor: 0xef4444,
    metricSpecs: 'Twin Blades: 0.73m + 0.58m · Square Iron Tsuba · Sakate Grip',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of crossed Niten Ichi-Ryu dual Samurai swords (Katana and straight Ninjato), square bronze Tsuba, dark indigo silk wrap, swirling purple and black Sumi-e ink dragon aura on fibrous Washi paper, 8k game art',
  },
  {
    id: 'tachi',
    index: 6,
    name: 'Nagamaki & Cavalry Tachi',
    kanji: '長巻・太刀',
    category: 'bladed',
    damage: 50,
    postureDamage: 40,
    speed: 2.0,
    reach: 3.4,
    swingArcDeg: 150,
    kiCost: 16,
    bleedBuildup: 28,
    armorPiercing: 0.35,
    critMultiplier: 1.6,
    specialEffect: 'High-Leverage Diagonal Dismemberment Arc',
    description:
      'Deeply curved 0.82m Tachi blade mounted on a long 0.85m silk-wrapped Nagamaki shaft (total 1.67m) for devastating sweeping momentum.',
    bladeColor: 0xfef3c7,
    hiltColor: 0x92400e,
    trailColor: 0xd97706,
    metricSpecs: 'Total 1.67m · Blade 0.82m · Wrapped Shaft 0.85m · Sori 26mm',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a legendary Samurai Nagamaki and Tachi cavalry sword, long gold-and-crimson wrapped handle, deeply curved Damascus steel blade with bright Hamon temper line on Washi parchment, 8k game icon',
  },

  // ==========================================================================
  // CLASS 2: POLEARMS & HEAVY IMPACT WEAPONS (7-11)
  // ==========================================================================
  {
    id: 'naginata',
    index: 7,
    name: 'Naginata (Curved Glaive)',
    kanji: '薙刀',
    category: 'polearm_heavy',
    damage: 46,
    postureDamage: 36,
    speed: 2.1,
    reach: 4.3,
    swingArcDeg: 165,
    kiCost: 15,
    bleedBuildup: 22,
    armorPiercing: 0.3,
    critMultiplier: 1.5,
    specialEffect: '360° Crowd-Control Glaive Sweep',
    description:
      'Oval hardwood shaft (1.85m, cross-section 36x28mm) topped with a sweeping 0.52m curved blade and brass Ishizuki butt-cap.',
    bladeColor: 0xe5e7eb,
    hiltColor: 0x78350f,
    trailColor: 0x38bdf8,
    metricSpecs: 'Shaft 1.85m (36×28mm) · Curved Blade 0.52m · Total 2.37m',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an ornate Sohei Naginata polearm glaive, lacquered hardwood shaft with gold kanji inlays, sweeping curved steel blade with Hamon line, cherry blossom petals and azure wind ink wash on Washi paper, 8k',
  },
  {
    id: 'yari',
    index: 8,
    name: 'Jumonji Yari (Cross Spear)',
    kanji: '十文字槍',
    category: 'polearm_heavy',
    damage: 52,
    postureDamage: 42,
    speed: 2.3,
    reach: 5.0,
    swingArcDeg: 55,
    kiCost: 14,
    bleedBuildup: 18,
    armorPiercing: 0.65,
    critMultiplier: 1.9,
    specialEffect: 'Armor-Piercing Lunge & Helmet Hook',
    description:
      '2.35m shaft crowned with a central 0.42m double-edged spearhead flanked by two crescent horizontal side-blades (0.18m span).',
    bladeColor: 0xf1f5f9,
    hiltColor: 0x991b1b,
    trailColor: 0xfacc15,
    metricSpecs: 'Shaft 2.35m · Central Blade 0.42m · Cross Span 0.18m',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a legendary Jumonji Yari cross-bladed samurai spear, gleaming triple-tipped Tamahagane spearhead, vermilion lacquered shaft with brass bindings, dramatic Sumi-e ink splashes on Washi paper, 8k',
  },
  {
    id: 'kanabo',
    index: 9,
    name: 'Kanabo / Tetsubo',
    kanji: '金砕棒',
    category: 'polearm_heavy',
    damage: 86,
    postureDamage: 82,
    speed: 0.95,
    reach: 3.6,
    swingArcDeg: 130,
    kiCost: 30,
    bleedBuildup: 10,
    armorPiercing: 0.9,
    critMultiplier: 1.75,
    specialEffect: '48-Stud Armor & Posture Crusher',
    description:
      'Octagonal heavy oak core bound in iron (1.45m length, tapering from 35mm handle to 85mm barrel) studded with 48 hemispherical iron spikes.',
    bladeColor: 0x334155,
    hiltColor: 0x451a03,
    trailColor: 0xf97316,
    metricSpecs: 'Length 1.45m · Taper 35mm→85mm · 48 Hemispherical Iron Spikes',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a fearsome Oni Kanabo Tetsubo iron-studded war club, octagonal blackened steel barrel with 48 gleaming brass spikes, fiery crimson ink shockwaves on Washi paper, 8k game art',
  },
  {
    id: 'kusarigama',
    index: 10,
    name: 'Kusarigama (Chain & Sickle)',
    kanji: '鎖鎌',
    category: 'polearm_heavy',
    damage: 39,
    postureDamage: 46,
    speed: 2.4,
    reach: 4.6,
    swingArcDeg: 180,
    kiCost: 16,
    bleedBuildup: 28,
    armorPiercing: 0.4,
    critMultiplier: 1.7,
    specialEffect: 'Verlet Chain Entangle & Whipping Sweep',
    description:
      '0.40m hardwood handle with a perpendicular 0.24m curved sickle blade connected via a 2.6m iron chain to a 0.06m faceted iron Fundo weight.',
    bladeColor: 0xcbd5e1,
    hiltColor: 0x312e81,
    trailColor: 0xa855f7,
    metricSpecs: 'Handle 0.40m · Sickle 0.24m · Verlet Chain 2.6m · Fundo 60mm',
    wazamonoGrade: 'Ryo-Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Shinobi Kusarigama chain-and-sickle weapon, razor-sharp curved Kama blade, coiled iron chain with faceted meteor weight, swirling purple shadow ink on Washi paper, 8k',
  },
  {
    id: 'otsuchi',
    index: 11,
    name: 'Ono & Otsuchi (Great War Axe/Mallet)',
    kanji: '大斧・大槌',
    category: 'polearm_heavy',
    damage: 94,
    postureDamage: 90,
    speed: 0.85,
    reach: 3.5,
    swingArcDeg: 150,
    kiCost: 34,
    bleedBuildup: 18,
    armorPiercing: 0.88,
    critMultiplier: 1.8,
    specialEffect: 'Bearded Crescent Cleave & Seismic Shockwave AoE',
    description:
      '1.30m reinforced shaft carrying a massive 0.38m bearded crescent steel Ono axe-head backed by an Otsuchi seismic hammer poll.',
    bladeColor: 0x78350f,
    hiltColor: 0x27272a,
    trailColor: 0xeab308,
    metricSpecs: 'Shaft 1.30m · Bearded Crescent Axe Head 0.38m · Seismic Poll',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a colossal Samurai Ono great battle axe and Otsuchi war mallet, 38cm bearded crescent Damascus blade with gold dragon engravings, earth-shattering golden ink shockwaves on Washi paper, 8k',
  },

  // ==========================================================================
  // CLASS 3: BOWS & FIREARMS (RANGED PRIMARY, 12-15)
  // ==========================================================================
  {
    id: 'daikyu',
    index: 12,
    name: 'Daikyu / Yumi (Great Longbow)',
    kanji: '大弓',
    category: 'ranged',
    damage: 68,
    postureDamage: 45,
    speed: 1.2,
    reach: 26.0,
    swingArcDeg: 15,
    kiCost: 18,
    bleedBuildup: 20,
    armorPiercing: 0.65,
    critMultiplier: 2.2,
    projectileSpeed: 42,
    reloadTime: 0.85,
    specialEffect: 'Asymmetrical 2.21m Draw & Piercing Karimata Ya',
    description:
      'Authentic 2.21m laminated bamboo-and-wood Yumi bow with grip one-third from bottom (0.74m below, 1.47m above), firing 0.95m bamboo arrows.',
    bladeColor: 0x92400e,
    hiltColor: 0x991b1b,
    trailColor: 0xfef08a,
    metricSpecs: 'Length 2.21m (0.74m Lower / 1.47m Upper) · 0.95m Ya Arrows',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an asymmetrical Samurai Daikyu Yumi longbow, red and black Urushi lacquered bamboo limbs with rattan bindings, nocked steel-tipped arrow, rising crimson sun and ink clouds on Washi paper, 8k',
  },
  {
    id: 'hankyu',
    index: 13,
    name: 'Hankyu (Composite Half-Bow)',
    kanji: '半弓',
    category: 'ranged',
    damage: 34,
    postureDamage: 22,
    speed: 2.8,
    reach: 20.0,
    swingArcDeg: 20,
    kiCost: 9,
    bleedBuildup: 14,
    armorPiercing: 0.35,
    critMultiplier: 1.75,
    projectileSpeed: 36,
    reloadTime: 0.35,
    specialEffect: 'Rapid-Fire Mobile Dodge Archery',
    description:
      'Compact 1.15m recurve composite bow engineered for rapid firing while sprinting, vaulting, or dodging.',
    bladeColor: 0xb45309,
    hiltColor: 0x1e293b,
    trailColor: 0x38bdf8,
    metricSpecs: 'Length 1.15m Recurve · Draw Velocity 36m/s · Mobile Nocking',
    wazamonoGrade: 'Ryo-Wazamono',
    auraMotif: 'emerald_wind',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a compact Samurai Hankyu recurve half-bow, lacquered horn and bamboo limbs, emerald wind currents and Sumi-e ink brush strokes on Washi paper, 8k',
  },
  {
    id: 'tanegashima',
    index: 14,
    name: 'Tanegashima (Matchlock Arquebus)',
    kanji: '種子島銃',
    category: 'ranged',
    damage: 115,
    postureDamage: 88,
    speed: 0.65,
    reach: 30.0,
    swingArcDeg: 10,
    kiCost: 24,
    bleedBuildup: 15,
    armorPiercing: 0.95,
    critMultiplier: 2.5,
    projectileSpeed: 64,
    reloadTime: 1.55,
    specialEffect: '14mm Lead Ball, Muzzle Flash & Smoke Cloud',
    description:
      '1.28m octagonal steel barrel (14mm bore) set in a lacquered Japanese oak stock with a brass serpentine matchlock mechanism.',
    bladeColor: 0x475569,
    hiltColor: 0x78350f,
    trailColor: 0xf97316,
    metricSpecs: 'Barrel 1.28m Octagonal · 14mm Bore · Brass Serpentine Lock',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a feudal Samurai Tanegashima matchlock arquebus rifle, octagonal Damascus barrel with gold dragon inlay, brass serpentine lock, billowing gunpowder smoke and embers on Washi paper, 8k',
  },
  {
    id: 'fukiya',
    index: 15,
    name: 'Fukiya & Bo-Shuriken Launcher',
    kanji: '吹き矢・棒手裏剣',
    category: 'ranged',
    damage: 24,
    postureDamage: 18,
    speed: 3.4,
    reach: 18.0,
    swingArcDeg: 12,
    kiCost: 7,
    bleedBuildup: 45,
    armorPiercing: 0.55,
    critMultiplier: 1.95,
    projectileSpeed: 42,
    reloadTime: 0.28,
    specialEffect: '0.18m Octagonal Steel Spikes & Viridian Poison DoT',
    description:
      'Lacquered shinobi tube firing 0.18m octagonal Bo-Shuriken needles coated in neurotoxic aconite poison.',
    bladeColor: 0x166534,
    hiltColor: 0x14532d,
    trailColor: 0x22c55e,
    metricSpecs: 'Tube 1.20m · Projectiles: 0.18m Octagonal Bo-Shuriken Needles',
    wazamonoGrade: 'Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Shinobi Fukiya blowgun and octagonal steel Bo-Shuriken throwing spikes dripping with emerald venom ink on handmade Washi paper, 8k game icon',
  },
  // ==========================================================================
  // CLASS 5: 15 NEW EXOTIC, MYTHIC & SIEGE WEAPONS (21-35)
  // ==========================================================================
  {
    id: 'zanbato',
    index: 21,
    name: 'Zanbato (Horse-Slaying Greatsword)',
    kanji: '斬馬刀',
    category: 'bladed',
    damage: 94,
    postureDamage: 82,
    speed: 0.95,
    reach: 5.2,
    swingArcDeg: 360,
    kiCost: 32,
    bleedBuildup: 48,
    armorPiercing: 0.65,
    critMultiplier: 1.85,
    specialEffect: 'Colossal 2.25m 360° Whirlwind Cleave & Pillar Slicer',
    description:
      'Ultra-heavy 2.25m two-handed horse-slaying greatsword (80mm wide Shinogi-Zukuri slab) that cleaves through multiple armored foes and bamboo pillars in a 360° whirlwind.',
    bladeColor: 0xe2e8f0,
    hiltColor: 0x7f1d1d,
    trailColor: 0xef4444,
    metricSpecs: 'Length 2.25m · Blade Width 80mm · 360° Whirlwind Cleave',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a colossal 2.25m Samurai Zanbato horse-slaying greatsword cleaving through crimson lightning and Sumi-e ink clouds on fibrous Washi paper, 8k',
  },
  {
    id: 'chigiriki',
    index: 22,
    name: 'Chigiriki (Morningstar Chain Flail)',
    kanji: '乳切木',
    category: 'polearm_heavy',
    damage: 58,
    postureDamage: 66,
    speed: 1.85,
    reach: 4.8,
    swingArcDeg: 210,
    kiCost: 19,
    bleedBuildup: 28,
    armorPiercing: 0.58,
    critMultiplier: 1.65,
    specialEffect: 'Shield-Bypassing 1.2m Chain & Spiked Iron Suburi-Slam',
    description:
      '1.5m iron-shod bamboo staff concealing a 1.2m physics-simulated chain and spiked iron morningstar that whips around enemy guards.',
    bladeColor: 0x52525b,
    hiltColor: 0x78350f,
    trailColor: 0xf59e0b,
    metricSpecs: 'Staff 1.50m · Chain 1.20m · Spiked Iron Head Ø0.14m',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Samurai Chigiriki chain-and-morningstar flail whipping golden sparks across handmade Washi paper, 8k',
  },
  {
    id: 'tekko_kagi',
    index: 23,
    name: 'Tekko-Kagi & Shuko (Iron Tiger Claws)',
    kanji: '手甲鉤・手鉤',
    category: 'bladed',
    damage: 32,
    postureDamage: 30,
    speed: 4.8,
    reach: 2.1,
    swingArcDeg: 140,
    kiCost: 7,
    bleedBuildup: 44,
    armorPiercing: 0.48,
    critMultiplier: 2.2,
    specialEffect: '10-Hit Feral Claw Flurry & Blade-Catching Parry',
    description:
      'Dual 5-bladed forearm steel tiger claws (0.32m curved talons) engineered for lightning-fast 10-hit feral combos and bare-handed blade trapping.',
    bladeColor: 0xcbd5e1,
    hiltColor: 0x1e1b4b,
    trailColor: 0x38bdf8,
    metricSpecs: '5 Talons × 0.32m · Dual Forearm Kote Mount · 4.8x Speed',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of dual Shinobi Tekko-Kagi 5-bladed steel tiger-claw gauntlets slashing azure wind arcs on Washi paper, 8k',
  },
  {
    id: 'shakujo',
    index: 24,
    name: 'Shakujo (6-Ringed Pewter Monk Staff)',
    kanji: '錫杖',
    category: 'polearm_heavy',
    damage: 54,
    postureDamage: 74,
    speed: 2.1,
    reach: 3.9,
    swingArcDeg: 240,
    kiCost: 16,
    bleedBuildup: 0,
    armorPiercing: 0.72,
    critMultiplier: 1.75,
    specialEffect: '6-Ringed Golden Dharma Shockwave Slam',
    description:
      '1.90m hardwood Sohei warrior-monk staff crowned with intertwined bronze loops holding 6 loose pewter rings that unleash concussive golden shockwaves.',
    bladeColor: 0xfbbf24,
    hiltColor: 0x451a03,
    trailColor: 0xfde047,
    metricSpecs: 'Length 1.90m · Finial Crown 0.34m · 6 Resonant Bronze Rings',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Buddhist Warrior-Monk Shakujo pewter staff with six glowing golden rings radiating sacred shockwaves on Washi paper, 8k',
  },
  {
    id: 'urumi_whip',
    index: 25,
    name: 'Kusari-Katana (12-Segment Whip-Sword)',
    kanji: '蛇腹剣・鎖刀',
    category: 'bladed',
    damage: 46,
    postureDamage: 42,
    speed: 2.5,
    reach: 5.5,
    swingArcDeg: 220,
    kiCost: 16,
    bleedBuildup: 42,
    armorPiercing: 0.4,
    critMultiplier: 1.7,
    specialEffect: '5.5m 12-Segment Razor Wire Whip-Crack Sweep',
    description:
      'Exotic serpent katana whose Tamahagane blade splits into 12 razor-edged steel segments linked by a glowing tension cable, extending 5.5m.',
    bladeColor: 0xe2e8f0,
    hiltColor: 0x881337,
    trailColor: 0xf43f5e,
    metricSpecs: 'Coiled 1.05m · Extended 5.50m · 12 Articulated Blade Segments',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a 12-segmented Kusari-Katana whip-sword uncoiling like a silver serpent through crimson Sumi-e ink on Washi paper, 8k',
  },
  {
    id: 'twin_sai',
    index: 26,
    name: 'Twin Sai (Trident Parrying Daggers)',
    kanji: '双釵',
    category: 'bladed',
    damage: 34,
    postureDamage: 54,
    speed: 4.1,
    reach: 2.0,
    swingArcDeg: 125,
    kiCost: 8,
    bleedBuildup: 18,
    armorPiercing: 0.62,
    critMultiplier: 2.0,
    specialEffect: 'Yoku-Prong Disarming Parry & Throat Thrust',
    description:
      'Dual octagonal pronged tridents (0.52m) with curved Yoku trapping guards that wrench enemy blades out of alignment on a Perfect Deflect.',
    bladeColor: 0x94a3b8,
    hiltColor: 0x1e293b,
    trailColor: 0x60a5fa,
    metricSpecs: 'Twin Tridents 0.52m · Octagonal Shaft · Yoku Guard Span 0.16m',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of Twin Samurai Sai trident parrying daggers with silver octagonal shafts and indigo silk grips on Washi paper, 8k',
  },
  {
    id: 'bo_staff',
    index: 27,
    name: "Roku-Shaku Bo (Master's 1.82m Oak Staff)",
    kanji: '六尺棒',
    category: 'polearm_heavy',
    damage: 44,
    postureDamage: 62,
    speed: 3.1,
    reach: 3.8,
    swingArcDeg: 260,
    kiCost: 11,
    bleedBuildup: 0,
    armorPiercing: 0.5,
    critMultiplier: 1.6,
    specialEffect: 'High-Speed 360° Rotary Twirl & Vaulting Pole-Kick',
    description:
      '1.82m octagonal white-oak staff capped with ironferrules for blinding rotational defense, multi-target posture sweeps, and vault kicks.',
    bladeColor: 0xa16207,
    hiltColor: 0x451a03,
    trailColor: 0x34d399,
    metricSpecs: 'Length 1.82m (6 Shaku) · Octagonal White Oak Ø32mm',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'emerald_wind',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a master Roku-Shaku Bo octagonal oak staff spinning emerald wind vortices on handmade Washi paper, 8k',
  },
  {
    id: 'sasumata',
    index: 28,
    name: 'Sasumata (Forked Man-Catcher Polearm)',
    kanji: '刺股',
    category: 'polearm_heavy',
    damage: 48,
    postureDamage: 70,
    speed: 1.9,
    reach: 4.3,
    swingArcDeg: 155,
    kiCost: 16,
    bleedBuildup: 24,
    armorPiercing: 0.45,
    critMultiplier: 1.65,
    specialEffect: 'Crescent Barbed Neck-Pin & Hazard Hurl',
    description:
      'Edo-period crescent-horned polearm lined with inward steel barbs on the shaft to trap, pin, and hurl armored warriors backward.',
    bladeColor: 0xcbd5e1,
    hiltColor: 0x7f1d1d,
    trailColor: 0xf97316,
    metricSpecs: 'Length 2.15m · Crescent Fork Span 0.44m · Barbed Iron Tang',
    wazamonoGrade: 'Ryo-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an Edo Samurai Sasumata horned man-catcher polearm with barbed iron shaft on fibrous Washi paper, 8k',
  },
  {
    id: 'tonfa',
    index: 29,
    name: 'Twin Tonfa (Rotational Hardwood Batons)',
    kanji: '双拐・トンファー',
    category: 'polearm_heavy',
    damage: 36,
    postureDamage: 56,
    speed: 4.3,
    reach: 2.0,
    swingArcDeg: 180,
    kiCost: 8,
    bleedBuildup: 0,
    armorPiercing: 0.68,
    critMultiplier: 1.8,
    specialEffect: 'Centrifugal Spin-Guard & Ki-Pulse Palm Blast',
    description:
      'Dual iron-reinforced red-oak rotational forearm batons that turn every block into a high-velocity centrifugal rib-cracking counter.',
    bladeColor: 0x451a03,
    hiltColor: 0xd97706,
    trailColor: 0xfbbf24,
    metricSpecs: 'Length 0.54m · Perpendicular Grip 0.13m · Iron End-Caps',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of dual iron-shod Samurai Tonfa rotational batons surrounded by golden impact shockwaves on Washi paper, 8k',
  },
  {
    id: 'hiya_zutsu',
    index: 30,
    name: 'Ozutsu Blunderbuss & Hiya-Zutsu Cannon',
    kanji: '大筒・火矢筒',
    category: 'ranged',
    damage: 112,
    postureDamage: 95,
    speed: 0.72,
    reach: 26.0,
    swingArcDeg: 25,
    kiCost: 28,
    bleedBuildup: 30,
    armorPiercing: 0.92,
    critMultiplier: 2.1,
    projectileSpeed: 38,
    reloadTime: 1.35,
    specialEffect: '8-Pellet Blunderbuss Shrapnel Cone & 5.0m Firestorm',
    description:
      'Flared-muzzle bronze Ozutsu Blunderbuss and siege mortar firing an 8-pellet shrapnel cone with heavy knockback and Bo-Hiya firestorm rounds.',
    bladeColor: 0xb45309,
    hiltColor: 0x451a03,
    trailColor: 0xef4444,
    metricSpecs: 'Flared Bore Ø48mm · Barrel 0.95m · 8-Pellet Shrapnel + Bo-Hiya',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a bronze Samurai Hiya-Zutsu hand-cannon firing a blazing Bo-Hiya rocket arrow with crimson ink dragon flames on Washi paper, 8k',
  },
  {
    id: 'bajozutsu',
    index: 31,
    name: 'Twin Bajozutsu (Matchlock Cavalry Pistols)',
    kanji: '馬上筒・双短銃',
    category: 'ranged',
    damage: 48,
    postureDamage: 46,
    speed: 2.8,
    reach: 19.0,
    swingArcDeg: 20,
    kiCost: 11,
    bleedBuildup: 20,
    armorPiercing: 0.78,
    critMultiplier: 2.0,
    projectileSpeed: 54,
    reloadTime: 0.35,
    specialEffect: 'Akimbo Gun-Fu Rapid Matchlock Volley',
    description:
      'Pair of octagonal brass-inlaid matchlock cavalry pistols engineered for close-range Gun-Fu stagger shots woven directly between sword combos.',
    bladeColor: 0xd97706,
    hiltColor: 0x78350f,
    trailColor: 0xf97316,
    metricSpecs: 'Twin Pistols 0.46m · Octagonal Bore Ø14mm · Gold Karakusa Inlay',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of dual gold-inlaid Samurai Bajozutsu matchlock cavalry pistols firing smoky ember volleys on Washi paper, 8k',
  },
  {
    id: 'fukiya_stealth',
    index: 32,
    name: 'Dokubari Fukiya (Frenzy Venom Blowgun)',
    kanji: '毒針吹矢',
    category: 'ranged',
    damage: 30,
    postureDamage: 26,
    speed: 3.8,
    reach: 20.0,
    swingArcDeg: 10,
    kiCost: 6,
    bleedBuildup: 60,
    armorPiercing: 0.65,
    critMultiplier: 2.3,
    projectileSpeed: 48,
    reloadTime: 0.24,
    specialEffect: 'Neurotoxic Paralysis & Berserk Frenzy Darts',
    description:
      'Whisper-silent black-lacquered bamboo blowgun firing pufferfish-and-wolfsbane darts that paralyze and corrupt enemy posture.',
    bladeColor: 0x065f46,
    hiltColor: 0x064e3b,
    trailColor: 0x10b981,
    metricSpecs: 'Length 1.35m · Silent Bore Ø11mm · Tetrodotoxin Needles',
    wazamonoGrade: 'Ryo-Wazamono',
    auraMotif: 'emerald_wind',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a black-lacquered Shinobi Dokubari Fukiya blowgun with glowing emerald poison darts on Washi paper, 8k',
  },
  {
    id: 'tessen',
    index: 33,
    name: 'Gumbai & Iron Tessen (Razor War Fan)',
    kanji: '鉄扇・軍配',
    category: 'bladed',
    damage: 38,
    postureDamage: 40,
    speed: 3.5,
    reach: 3.2,
    swingArcDeg: 185,
    kiCost: 10,
    bleedBuildup: 32,
    armorPiercing: 0.42,
    critMultiplier: 1.85,
    specialEffect: 'Arrow-Reflecting Gale Vortex & Razor Folding Ribs',
    description:
      '10-ribbed forged Tamahagane war fan painted with a crimson rising sun on heavy Washi; conjures slicing wind tornadoes and deflects arrows.',
    bladeColor: 0xfef2f2,
    hiltColor: 0x991b1b,
    trailColor: 0x38bdf8,
    metricSpecs: 'Open Span 0.56m · 10 Forged Steel Ribs · Rising Sun Washi Leaf',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an open Samurai steel-ribbed Tessen war fan painted with a crimson sun and unleashing azure wind tornadoes on Washi paper, 8k',
  },
  {
    id: 'onmyoji_scroll',
    index: 34,
    name: 'Onmyoji Ofuda Talisman Scroll',
    kanji: '陰陽師・呪符巻物',
    category: 'ranged',
    damage: 56,
    postureDamage: 52,
    speed: 2.4,
    reach: 22.0,
    swingArcDeg: 45,
    kiCost: 14,
    bleedBuildup: 35,
    armorPiercing: 0.85,
    critMultiplier: 1.9,
    projectileSpeed: 40,
    reloadTime: 0.4,
    specialEffect: 'Homing Sacred Ofuda Talismans & Spectral Ink Wolf',
    description:
      'Floating Heian-period esoteric paper scroll that launches glowing vermilion Ofuda talismans and binds enemies in Shimenawa spirit ropes.',
    bladeColor: 0xfef3c7,
    hiltColor: 0xdc2626,
    trailColor: 0xa855f7,
    metricSpecs: 'Scroll Span 0.85m · Five-Element Pentagram Seal (Seiman)',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a floating mystical Onmyoji paper scroll and glowing crimson Ofuda talismans summoning a black Sumi-e ink wolf on Washi paper, 8k',
  },
  {
    id: 'muramasa_cursed',
    index: 35,
    name: 'Senji Muramasa (Cursed Blood-Katana)',
    kanji: '妖刀・千子村正',
    category: 'bladed',
    damage: 64,
    postureDamage: 52,
    speed: 2.9,
    reach: 3.6,
    swingArcDeg: 160,
    kiCost: 15,
    bleedBuildup: 65,
    armorPiercing: 0.6,
    critMultiplier: 2.25,
    specialEffect: 'Blood-Thirst Extending 3.6m Crimson Lightning Odachi-Arc',
    description:
      'Legendary demonic blade forged by Senji Muramasa with a symmetric Tanagobara fish-belly Hamon; drinks blood/ink to extend its crimson lightning reach.',
    bladeColor: 0xfca5a5,
    hiltColor: 0x450a0a,
    trailColor: 0xdc2626,
    metricSpecs: 'Length 1.08m (Aura Reach 3.60m) · Tanagobara Hamon · Cursed Tang',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of the legendary cursed demon katana Senji Muramasa glowing with blood-red lightning and symmetric Hamon temper line on dark Washi paper, 8k',
  },
];

// ============================================================================
// CLASS 4: THROWABLES & TACTICAL NINJA TOOLS (16-20 — Completing all 20 Items)
// ============================================================================
export const THROWABLES: ThrowableDef[] = [
  {
    id: 'shuriken',
    index: 16,
    name: 'Hira-Shuriken (Star Blades)',
    kanji: '平手裏剣',
    damage: 18,
    postureDamage: 14,
    cooldown: 1.1,
    maxStock: 12,
    countPerThrow: 3,
    spreadAngleDeg: 18,
    projectileSpeed: 32,
    aoeRadius: 0,
    effectType: 'bleed_fan',
    roleClue: 'Ø0.11m · 3-Star Fan Spread · Bleed',
    description:
      'Forged 4-point and 8-point star blades (diameter 0.11m, thickness 3mm) thrown in a rapid fan spread to interrupt enemy windups.',
    color: 0xe2e8f0,
    metricSpecs: 'Diameter 0.11m · Thickness 3mm · Multi-Star Fan Spread',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'azure_mist',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of gleaming 8-point Hira-Shuriken ninja star blades spinning through Sumi-e black ink wind trails on fibrous Washi paper, vermilion artist seal, 8k',
  },
  {
    id: 'kunai',
    index: 17,
    name: 'Kunai (Heavy Throwing Knives)',
    kanji: '苦無',
    damage: 42,
    postureDamage: 48,
    cooldown: 1.6,
    maxStock: 8,
    countPerThrow: 1,
    spreadAngleDeg: 0,
    projectileSpeed: 36,
    aoeRadius: 0,
    effectType: 'stagger_pierce',
    roleClue: '0.24m Leaf Blade · Stagger & Pin',
    description:
      '0.24m leaf-shaped forged iron blades with ring pommels and crimson cord wraps; embeds into targets with heavy posture stagger.',
    color: 0x94a3b8,
    metricSpecs: 'Length 0.24m · Leaf Forged Iron · Ring Pommel',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'crimson_lightning',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of heavy forged iron Shinobi Kunai throwing knives with crimson silk cord wrapped handles and ring pommels on handmade Washi paper, 8k',
  },
  {
    id: 'horokudama',
    index: 18,
    name: 'Horokudama (Ceramic Fire Bombs)',
    kanji: '焙烙玉',
    damage: 78,
    postureDamage: 65,
    cooldown: 2.8,
    maxStock: 5,
    countPerThrow: 1,
    spreadAngleDeg: 0,
    projectileSpeed: 22,
    aoeRadius: 4.5,
    effectType: 'fire_aoe',
    roleClue: 'Ø0.12m Ceramic Bomb · 3.5m+ Fire AoE',
    description:
      '0.12m Washi-wrapped ceramic spheres filled with black powder and iron shrapnel; parabolic arc explodes into a blazing fire zone.',
    color: 0xdc2626,
    metricSpecs: 'Sphere Ø0.12m · Parabolic Arc · 3.5m+ Fire & Shrapnel Blast',
    wazamonoGrade: 'Saijo O-Wazamono',
    auraMotif: 'ember_smoke',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a burning Samurai Horokudama ceramic black-powder fire bomb wrapped in calligraphy Washi paper with blazing fuse and explosive crimson ink flames, 8k',
  },
  {
    id: 'makibishi',
    index: 19,
    name: 'Metsubushi & Makibishi Caltrops',
    kanji: '目潰し・撒菱',
    damage: 25,
    postureDamage: 30,
    cooldown: 2.0,
    maxStock: 6,
    countPerThrow: 5,
    spreadAngleDeg: 65,
    projectileSpeed: 12,
    aoeRadius: 4.0,
    effectType: 'caltrop_slow',
    roleClue: '4.0m Ash Stun & 4-Spike Iron Caltrops',
    description:
      'Deploys blinding ash clouds and 4-spiked iron caltrops across a 4.0m zone that stun, slow, and bleed pursuing enemies.',
    color: 0x71717a,
    metricSpecs: '4.0m Cone · 4-Spiked Forged Iron Caltrops & Blinding Ash',
    wazamonoGrade: 'Ryo-Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of Shinobi Makibishi iron caltrops and lacquered Metsubushi blinding ash bombs surrounded by swirling violet Sumi-e smoke on Washi paper, 8k',
  },
];

// Complete 20-Item Compendium Catalog (including #20 Bo-Shuriken Needle Showcase)
export interface ArsenalCompendiumItem {
  id: string;
  catalogNumber: number; // 1 to 20
  name: string;
  kanji: string;
  classLabel: string;
  metricSpecs: string;
  wazamonoGrade: string;
  auraMotif: WeaponDef['auraMotif'];
  aiPrompt: string;
  weaponRef?: WeaponDef;
  throwableRef?: ThrowableDef;
}

export const TWENTY_AUTHENTIC_ARSENAL: ArsenalCompendiumItem[] = [
  ...WEAPONS.map((w) => ({
    id: w.id,
    catalogNumber: w.index,
    name: w.name,
    kanji: w.kanji,
    classLabel:
      w.category === 'bladed'
        ? 'Class 1 · Katana & Blades'
        : w.category === 'polearm_heavy'
          ? 'Class 2 · Polearms & Heavy'
          : 'Class 3 · Bows & Firearms',
    metricSpecs: w.metricSpecs,
    wazamonoGrade: w.wazamonoGrade,
    auraMotif: w.auraMotif,
    aiPrompt: w.aiPrompt,
    weaponRef: w,
  })),
  ...THROWABLES.map((t) => ({
    id: t.id,
    catalogNumber: t.index,
    name: t.name,
    kanji: t.kanji,
    classLabel: 'Class 4 · Tactical Ninja Tools',
    metricSpecs: t.metricSpecs,
    wazamonoGrade: t.wazamonoGrade,
    auraMotif: t.auraMotif,
    aiPrompt: t.aiPrompt,
    throwableRef: t,
  })),
  {
    id: 'bo_shuriken',
    catalogNumber: 20,
    name: 'Bo-Shuriken (Iron Throwing Spikes)',
    kanji: '棒手裏剣',
    classLabel: 'Class 4 · Tactical Ninja Tools',
    metricSpecs: 'Length 0.18m · Octagonal Forged Steel Needles · Tassel Tail',
    wazamonoGrade: 'O-Wazamono',
    auraMotif: 'violet_shadow',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of five 18cm octagonal steel Bo-Shuriken throwing spikes with crimson silk tassels piercing through Sumi-e ink clouds on handmade Washi paper, 8k',
    throwableRef: THROWABLES[0],
  },
];

export const ARMORS: ArmorDef[] = [
  {
    id: 'ronin_haori',
    name: '1. Ronin Wanderer Set (Kosode & Haori)',
    kanji: '浪人放浪装束',
    defense: 0.1,
    speedMultiplier: 1.18,
    kiRegenMultiplier: 1.25,
    critBonus: 0.08,
    damageMultiplier: 1.05,
    primaryColor: 0x1e293b,
    secondaryColor: 0xd6c7b2,
    accentColor: 0x991b1b,
    silhouetteType: 'haori',
    roleClue: 'One-Sleeve Slipped Kosode & Pleated Hakama · Max Agility',
    description:
      'Weathered indigo Kosode kimono with one sleeve slipped off the shoulder revealing tattooed muscular chest/arm, wide Fourier-pleated Hakama, and tattered Haori coat.',
    metricSpecs: 'Torso 0.56m · Fourier 7-Pleat Hakama · Flowing Haori Sleeve 0.48m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a wandering Samurai Ronin indigo Haori coat with one sleeve slipped off revealing dragon tattoos and pleated Hakama on Washi paper, 8k',
  },
  {
    id: 'crimson_ghost',
    name: '2. Crimson Ghost of Tsushima Set',
    kanji: '対馬緋影具足',
    defense: 0.28,
    speedMultiplier: 1.14,
    kiRegenMultiplier: 1.22,
    critBonus: 0.22,
    damageMultiplier: 1.2,
    primaryColor: 0x18181b,
    secondaryColor: 0x7f1d1d,
    accentColor: 0xdc2626,
    silhouetteType: 'crimson_ghost',
    roleClue: 'Black Scale Armor & 1.8m Verlet Crimson Cape · +22% Crit',
    description:
      'Black lacquered scale armor paired with a flowing 1.8m crimson silk Verlet cape, iron ghost Menpo mask, and wind-blown 1.2m Hachimaki headband tails.',
    metricSpecs: 'Black Scale Do · 1.80m Verlet Silk Cape · 1.20m Hachimaki Tails',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of black lacquered Samurai Ghost scale armor with a billowing 1.8m crimson silk cape and iron ghost mask on Washi paper, 8k',
  },
  {
    id: 'samurai_oyoroi',
    name: '3. Golden Shogunate O-Yoroi Set',
    kanji: '将軍家金箔大鎧',
    defense: 0.42,
    speedMultiplier: 0.86,
    kiRegenMultiplier: 0.85,
    critBonus: 0.02,
    damageMultiplier: 1.12,
    primaryColor: 0x7f1d1d,
    secondaryColor: 0x1c1917,
    accentColor: 0xfbbf24,
    silhouetteType: 'oyoroi',
    roleClue: 'Kinpaku Gold-Leaf & Vermilion Silk O-Yoroi · Max Defense',
    description:
      'Heirloom crimson Urushi lacquer and gold-leaf (Kinpaku) Great Armor with 6-tiered Sode shoulder shields (0.28x0.22m), Kote, Haidate, and 3-hinged Suneate greaves.',
    metricSpecs: 'Do 0.42×0.26m · 6-Tier Sode 0.28×0.22m · Suneate 0.36m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of ornate crimson and gold-leaf Shogunate O-Yoroi full samurai armor with 6-tiered Sode shoulder shields on Washi paper, 8k',
  },
  {
    id: 'kitsune_mystic',
    name: '4. Kitsune Shrine Mystic Set',
    kanji: '白狐神官狩衣',
    defense: 0.16,
    speedMultiplier: 1.2,
    kiRegenMultiplier: 1.35,
    critBonus: 0.18,
    damageMultiplier: 1.18,
    primaryColor: 0xfafaf9,
    secondaryColor: 0xb91c1c,
    accentColor: 0xfbbf24,
    silhouetteType: 'kitsune_mystic',
    roleClue: 'White/Crimson Kariginu Silk & Orbiting Ofuda Talismans',
    description:
      'Pure white and vermilion Shinto shrine silk robes accompanied by floating paper Ofuda prayer talismans orbiting the shoulders.',
    metricSpecs: 'Silk Kariginu Robes · 6 Orbiting Sacred Ofuda Talismans',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of pure white and crimson Kitsune Shrine Mystic silk robes with glowing golden Ofuda talismans floating around the shoulders on Washi paper, 8k',
  },
  {
    id: 'tengu_hermit',
    name: '5. Tengu Mountain Hermit Set',
    kanji: '鞍馬天狗山伏装束',
    defense: 0.2,
    speedMultiplier: 1.22,
    kiRegenMultiplier: 1.28,
    critBonus: 0.16,
    damageMultiplier: 1.16,
    primaryColor: 0x1c1917,
    secondaryColor: 0x991b1b,
    accentColor: 0xf59e0b,
    silhouetteType: 'tengu_hermit',
    roleClue: 'Feathered Raven Cloak, Yamabushi Pom-Poms & Tengu-Geta',
    description:
      'Feathered raven-black mountain cloak, Yamabushi monk pom-pom sash (Suzukake), and elevated single-tooth wooden clogs (Tengu-geta) for aerial mastery.',
    metricSpecs: 'Raven Feather Mantle · 12 Suzukake Pom-Poms · Single-Tooth Geta',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Kurama Mountain Tengu Yamabushi hermit cloak made of black raven feathers with crimson sash and wooden Tengu-geta clogs on Washi paper, 8k',
  },
  {
    id: 'komuso_monk',
    name: '6. Komuso Zen Flute-Monk Set',
    kanji: '虚無僧天蓋法衣',
    defense: 0.18,
    speedMultiplier: 1.12,
    kiRegenMultiplier: 1.4,
    critBonus: 0.14,
    damageMultiplier: 1.1,
    primaryColor: 0x1e3a8a,
    secondaryColor: 0xd6b87c,
    accentColor: 0xfef3c7,
    silhouetteType: 'komuso_monk',
    roleClue: 'Navy Hemp Robes & 36-Bead 3D Wooden Juzu Necklace · +40% Ki Regen',
    description:
      'Austere navy hemp robes draped with a Kesa stole and 36 individual 3D carved wooden Buddhist prayer beads (Juzu) around the neck.',
    metricSpecs: 'Navy Hemp Kesa · 36 Individual 3D Carved Juzu Prayer Beads',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a Komuso Zen warrior-monk navy hemp robe with large wooden Juzu prayer beads and woven reed basket hat on Washi paper, 8k',
  },
  {
    id: 'oni_berserker',
    name: '7. Oni Demon Berserker Set',
    kanji: '羅生門鬼神具足',
    defense: 0.36,
    speedMultiplier: 0.96,
    kiRegenMultiplier: 1.05,
    critBonus: 0.24,
    damageMultiplier: 1.32,
    primaryColor: 0x27272a,
    secondaryColor: 0x7f1d1d,
    accentColor: 0xf97316,
    silhouetteType: 'oni_berserker',
    roleClue: 'Volcanic Spiked Iron Plate & White Horsehair Mane · +32% Dmg',
    description:
      'Charred black iron armor bristling with jagged shoulder spikes, glowing volcanic magma cracks, and a wild white horsehair mane.',
    metricSpecs: 'Spiked Demon Pauldrons · Glowing Magma Seams · +32% Melee Power',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of charred black iron Oni Demon Berserker samurai armor with glowing volcanic cracks and jagged shoulder spikes on Washi paper, 8k',
  },
  {
    id: 'shinobi_shozoku',
    name: '8. Koga Shadow Shinobi Set',
    kanji: '甲賀忍鎖装束',
    defense: 0.14,
    speedMultiplier: 1.15,
    kiRegenMultiplier: 1.2,
    critBonus: 0.25,
    damageMultiplier: 1.15,
    primaryColor: 0x0f172a,
    secondaryColor: 0x1e1b4b,
    accentColor: 0xef4444,
    silhouetteType: 'shinobi',
    roleClue: 'Kusari Chainmail Hood & Dual Back Scabbards · +25% Crit',
    description:
      'Tightly bound dark-indigo shinobi shozoku reinforced with riveted Kusari chainmail, splinted iron Kote forearm sleeves, and dual back-mounted scabbards.',
    metricSpecs: 'Chainmail Kote 0.26m · Dual Back Saya · Tabi Boots 0.26m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of dark indigo Koga Shinobi chainmail armor with dual back-mounted katana scabbards and crimson scarf on Washi paper, 8k',
  },
  {
    id: 'snow_wolf_ezo',
    name: '9. Snow-Wolf Ezo Hunter Set',
    kanji: '蝦夷白狼毛皮具足',
    defense: 0.32,
    speedMultiplier: 1.06,
    kiRegenMultiplier: 1.16,
    critBonus: 0.15,
    damageMultiplier: 1.14,
    primaryColor: 0xe2e8f0,
    secondaryColor: 0x334155,
    accentColor: 0x38bdf8,
    silhouetteType: 'snow_wolf',
    roleClue: 'White Wolf-Fur Pelt Mantle & Frost-Etched Lamellar',
    description:
      'Thick northern white wolf-fur pelt cloak draped over frost-etched steel lamellar plates forged in the blizzards of Ezo.',
    metricSpecs: 'Layered Wolf-Fur Mantle · Frost-Etched Steel Kozane',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of northern Ezo Samurai armor draped in a thick white snow-wolf fur pelt over frost-etched steel plates on Washi paper, 8k',
  },
  {
    id: 'imperial_sakura',
    name: '10. Imperial Sakura Duelist Set',
    kanji: '御前桜花裃装束',
    defense: 0.18,
    speedMultiplier: 1.16,
    kiRegenMultiplier: 1.26,
    critBonus: 0.2,
    damageMultiplier: 1.18,
    primaryColor: 0x881337,
    secondaryColor: 0xfef2f2,
    accentColor: 0xfda4af,
    silhouetteType: 'sakura_duelist',
    roleClue: 'Winged Kamishimo Vest & White Silk Pleated Hakama',
    description:
      'Ceremonial cherry-blossom embroidered Kamishimo winged kataginu vest over crisp white silk pleated Hakama worn by imperial sword instructors.',
    metricSpecs: 'Kataginu Wing Span 0.64m · Pure White Silk Fourier Hakama',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an Imperial Samurai Duelist winged Kamishimo vest embroidered with cherry blossoms over white silk Hakama on Washi paper, 8k',
  },
  {
    id: 'ashigaru_domaru',
    name: '11. Sengoku Ashigaru Captain Set',
    kanji: '戦国足軽大将胴丸',
    defense: 0.22,
    speedMultiplier: 1.04,
    kiRegenMultiplier: 1.08,
    critBonus: 0.05,
    damageMultiplier: 1.0,
    primaryColor: 0x451a03,
    secondaryColor: 0x78350f,
    accentColor: 0xd97706,
    silhouetteType: 'domaru',
    roleClue: 'Laced Laminar Scale Do-Maru & Clan Sashimono Banner',
    description:
      'Urushi-lacquered iron-and-leather laminar scale breastplate (Hon-Kozane Do, height 0.42m, depth 0.26m) bound with vermilion silk Odoshi.',
    metricSpecs: 'Do Height 0.42m · Depth 0.26m · 7-Panel Kusazuri Tassets 0.26m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of traditional Samurai Hon-Kozane Do-Maru laminar scale armor lacquered in deep amber and gold silk Odoshi lacing on Washi paper, 8k',
  },
  {
    id: 'ghost_paper',
    name: '12. Celestial Ink-God (Kami no Sumi) Set',
    kanji: '墨神天衣・紙魂具足',
    defense: 0.05,
    speedMultiplier: 1.22,
    kiRegenMultiplier: 1.38,
    critBonus: 0.3,
    damageMultiplier: 1.45,
    primaryColor: 0xf5f0e6,
    secondaryColor: 0x181411,
    accentColor: 0xdc2626,
    silhouetteType: 'origami',
    roleClue: 'Living Sumi-e Dragon Washi Plates · +45% Damage Glass Cannon',
    description:
      'Living animated shader armor where flowing black Sumi-e ink dragons swim across glowing white Washi paper plates with gold Kintsugi seams.',
    metricSpecs: 'Living Ink Shader Kozane 0.42m · Shide Talisman Wings 0.86m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of mythical white folded Washi-paper Samurai armor inscribed with living black ink dragons and gold leaf Kintsugi on dark ink wash, 8k',
  },
];

export const HELMETS: HelmetDef[] = [
  {
    id: 'suji_kabuto',
    name: 'Suji-Bachi Kabuto (Crescent Moon)',
    kanji: '三十二間筋兜',
    postureDefenseBonus: 0.2,
    critDamageBonus: 0.1,
    kiCostReduction: 0.08,
    intimidationAura: 0.1,
    primaryColor: 0x1c1917,
    crestColor: 0xfbbf24,
    styleType: 'suji_kabuto',
    maedateType: 'crescent_moon',
    roleClue: '32-Ridged Iron Dome · 0.34m Golden Crescent Maedate',
    description:
      '32-ridged riveted iron Suji-bachi dome (r=0.135m, h=0.16m) with 5-tiered sweeping Shikoro neck guard (240° span, 0.14m drop), Fukigaeshi wings, and 0.34m Golden Crescent Moon Maedate.',
    metricSpecs: 'Dome r=0.135m h=0.16m · 5-Tier Shikoro 0.14m · Maedate Span 0.34m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a 32-ridged black iron Samurai Suji-Bachi Kabuto helmet with a gleaming golden crescent moon Maedate crest and 5-tier Shikoro neck guard on Washi paper, 8k',
  },
  {
    id: 'tengu_menpo',
    name: 'Karura Tengu Menpo & Stag Kabuto',
    kanji: '天狗面頬・鹿角兜',
    postureDefenseBonus: 0.1,
    critDamageBonus: 0.25,
    kiCostReduction: 0.15,
    intimidationAura: 0.2,
    primaryColor: 0x991b1b,
    crestColor: 0xfef3c7,
    styleType: 'tengu_menpo',
    maedateType: 'stag_antlers',
    roleClue: 'Fierce Iron Menpo (0.14×0.12m) & 0.38m Stag Antlers',
    description:
      'Sculpted vermilion lacquer Menpo facial mask (0.14x0.12m) with 4-tiered Yodarekake throat guard, horsehair mustache, and towering 0.38m Stag Antler Maedate.',
    metricSpecs: 'Menpo 0.14×0.12m · 4-Tier Yodarekake · Stag Antlers h=0.38m',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a fierce crimson lacquer Samurai Menpo war mask and Kabuto crowned with towering golden stag antlers on fibrous Washi paper, 8k',
  },
  {
    id: 'kasa',
    name: 'Sandogasa & Dragon Maedate',
    kanji: '編笠・龍神前立',
    postureDefenseBonus: 0.08,
    critDamageBonus: 0.15,
    kiCostReduction: 0.22,
    intimidationAura: 0.05,
    primaryColor: 0xd6b87c,
    crestColor: 0x78350f,
    styleType: 'kasa',
    maedateType: 'dragon_coils',
    roleClue: 'Woven Sedge Hat & Dragon Crest · -22% Ki Expenditure',
    description:
      'Wide conical woven sedge hat worn by master kenkaku over a hidden iron forehead plate embossed with coiled Dragon Maedate.',
    metricSpecs: 'Diameter 0.58m · Height 0.18m · Coiled Brass Dragon Fore-Crest',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a wandering Samurai Ronin woven bamboo Sandogasa hat with a golden coiled dragon emblem amidst swirling Sumi-e ink mist on Washi paper, 8k',
  },
  {
    id: 'oni_kabuto',
    name: 'Demon Oni-Bachi Kabuto & Menpo',
    kanji: '鬼角大兜',
    postureDefenseBonus: 0.3,
    critDamageBonus: 0.2,
    kiCostReduction: 0.05,
    intimidationAura: 0.35,
    primaryColor: 0x450a0a,
    crestColor: 0xe5e7eb,
    styleType: 'oni_kabuto',
    maedateType: 'oni_horns',
    roleClue: 'Demon Oni Horns & Iron Menpo · +35% Posture Break Aura',
    description:
      'Heavy blackened Urushi war helmet with 5-tier Shikoro, fierce fanged Demon Menpo (0.14x0.12m), and towering curved Oni Horns.',
    metricSpecs: 'Dome r=0.14m · Oni Horn Span 0.38m · 5-Tier Shikoro 240°',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of a terrifying blackened steel Samurai Oni Kabuto helmet with massive curved demon horns, snarling iron Menpo mask, and crimson ink aura on Washi paper, 8k',
  },
  {
    id: 'hannya_mask',
    name: 'Hannya Noh Visage & Dragon Kabuto',
    kanji: '般若面・龍頭兜',
    postureDefenseBonus: 0.12,
    critDamageBonus: 0.4,
    kiCostReduction: 0.12,
    intimidationAura: 0.28,
    primaryColor: 0xf3ebd9,
    crestColor: 0xdc2626,
    styleType: 'hannya_mask',
    maedateType: 'dragon_coils',
    roleClue: 'Ivory Hannya Visage & Dragon Coils · +40% Critical Damage',
    description:
      'Carved ivory and iron Hannya mask with metallic fangs, 4-tiered throat guard, and coiled Dragon Maedate that amplifies Zanshin counters.',
    metricSpecs: 'Visage 0.14×0.12m · Metallic Fangs · Coiled Dragon Crest',
    aiPrompt:
      'Masterpiece Japanese Ukiyo-e woodblock print of an ivory and gold Samurai Hannya demon mask with crimson markings and dragon crest surrounded by black Sumi-e ink strokes on Washi paper, 8k',
  },
];

export interface ComputedSamuraiStats {
  maxHp: number;
  maxPosture: number;
  maxKi: number;
  attackPower: number;
  postureBreakPower: number;
  defensePercent: number;
  moveSpeed: number;
  kiRegenPerSec: number;
  critChance: number;
  critMultiplier: number;
  kiCostMultiplier: number;
}

export function computeSamuraiStats(
  weapon: WeaponDef,
  armor: ArmorDef,
  helmet: HelmetDef
): ComputedSamuraiStats {
  const baseHp = 220;
  const basePosture = 140;
  const baseKi = 120;
  const baseSpeed = 9.2;
  const baseKiRegen = 24;

  const maxHp = Math.round(baseHp * (1 + armor.defense * 0.5));
  const maxPosture = Math.round(basePosture * (1 + helmet.postureDefenseBonus + armor.defense * 0.4));
  const maxKi = baseKi;
  const attackPower = Math.round(weapon.damage * armor.damageMultiplier);
  const postureBreakPower = Math.round(weapon.postureDamage * (1 + helmet.intimidationAura * 0.5));
  const defensePercent = Math.round(Math.min(0.65, armor.defense + helmet.postureDefenseBonus * 0.25) * 100);
  const moveSpeed = Number((baseSpeed * armor.speedMultiplier).toFixed(2));
  const kiRegenPerSec = Math.round(baseKiRegen * armor.kiRegenMultiplier);
  const critChance = Number(Math.min(0.75, 0.12 + armor.critBonus).toFixed(2));
  const critMultiplier = Number((weapon.critMultiplier + helmet.critDamageBonus).toFixed(2));
  const kiCostMultiplier = Number(Math.max(0.5, 1 - helmet.kiCostReduction).toFixed(2));

  return {
    maxHp,
    maxPosture,
    maxKi,
    attackPower,
    postureBreakPower,
    defensePercent,
    moveSpeed,
    kiRegenPerSec,
    critChance,
    critMultiplier,
    kiCostMultiplier,
  };
}
