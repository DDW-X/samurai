export type SkinComplexionId =
  | 'pale_porcelain'
  | 'warm_edo_olive'
  | 'sun_bronzed_ronin'
  | 'battle_weathered'
  | 'ashen_ghost'
  | 'golden_touched'
  | 'obsidian_dusk'
  | 'sakura_ivory';

export type EyeIrisColorId =
  | 'dark_amber'
  | 'obsidian'
  | 'jade_green'
  | 'crimson_oni'
  | 'ice_blue'
  | 'golden_kitsune'
  | 'blind_white_scarred'
  | 'amethyst_void'
  | 'emerald_dragon'
  | 'blood_moon'
  | 'silver_mist'
  | 'copper_flame';

export type HairstyleId =
  | 'chonmage'
  | 'wild_ronin_mane'
  | 'high_bushido_ponytail'
  | 'twintail_kunoichi'
  | 'top_bun_sidelocks'
  | 'braided_warlocks'
  | 'wind_swept_halftied'
  | 'shaved_sohei_monk'
  | 'silver_streaked_veteran'
  | 'flowing_white_kitsune';

export type FacialHairId =
  | 'clean_shaven'
  | 'daimyo_mustache_goatee'
  | 'full_ronin_beard'
  | 'braided_chin_beard'
  | 'mutton_chops';

export type ScarAccessoryId =
  | 'none'
  | 'kenshin_cross_scar'
  | 'vertical_eye_slash'
  | 'burn_mark'
  | 'masamune_eyepatch';

export type TattooPaintId =
  | 'none'
  | 'kabuki_kumadori'
  | 'oni_demon_jaw'
  | 'dragon_koi_irezumi';

export type ElementalInfusionId =
  | 'none'
  | 'kagutsuchi_flame'
  | 'raijin_thunder'
  | 'fujin_gale'
  | 'yuki_onna_frost'
  | 'yomi_blood_ink';

export type DodgeMechanicId =
  | 'tai_sabaki_sidestep'
  | 'ukemi_roll'
  | 'miri_kiri_flashstep'
  | 'utsusemi_ink_clone'
  | 'mikiri_blade_stomp'
  | 'wall_vault_jump'
  | 'kaginawa_grapple';

export type DodgeModeId =
  | 'tai_sabaki'
  | 'ukemi_roll'
  | 'miri_kiri'
  | 'utsusemi_clone'
  | 'mikiri_counter'
  | 'wall_vault'
  | 'kaginawa_grapple';

export interface CharacterAppearanceConfig {
  // 1. Facial & Body Bone Structure Morph Sliders
  jawWidth: number; // 0.80 to 1.30
  cheekboneProminence: number; // 0.80 to 1.30
  chinLength: number; // 0.80 to 1.30
  noseBridgeHeight: number; // 0.80 to 1.30
  browAngle: number; // -0.30 to 0.30 rad
  eyeSizeTilt: number; // 0.80 to 1.25
  bodyHeightMeters: number; // 1.65 to 2.00 m
  bodyHeight: number; // 1.65 to 2.00 m alias
  muscularity: number; // 0.85 to 1.30

  // 2. Skin Tone & Weathering
  skinComplexion: SkinComplexionId;
  weatheringSheen: number; // 0.0 to 1.0 (sweat/battle dirt specular)

  // 3. Eyes & Heterochromia (12 Iris Colors)
  leftEyeColor: EyeIrisColorId;
  rightEyeColor: EyeIrisColorId;

  // 4. 10 Procedural 3D Hairstyles + Hair Color
  hairstyle: HairstyleId;
  hairColorHex: number;

  // 5. Facial Hair, Scars, Eyepatch & Irezumi Tattoos
  facialHair: FacialHairId;
  scarOrEyepatch: ScarAccessoryId;
  tattooOrPaint: TattooPaintId;
  hideHelmetInGameplay: boolean;
}

export const DEFAULT_CHARACTER_APPEARANCE: CharacterAppearanceConfig = {
  jawWidth: 1.0,
  cheekboneProminence: 1.05,
  chinLength: 1.0,
  noseBridgeHeight: 1.05,
  browAngle: 0.08,
  eyeSizeTilt: 1.0,
  bodyHeightMeters: 1.78,
  bodyHeight: 1.78,
  muscularity: 1.06,
  skinComplexion: 'warm_edo_olive',
  weatheringSheen: 0.35,
  leftEyeColor: 'dark_amber',
  rightEyeColor: 'dark_amber',
  hairstyle: 'wild_ronin_mane',
  hairColorHex: 0x14110f,
  facialHair: 'daimyo_mustache_goatee',
  scarOrEyepatch: 'kenshin_cross_scar',
  tattooOrPaint: 'dragon_koi_irezumi',
  hideHelmetInGameplay: false,
};

export const SKIN_COMPLEXIONS: {
  id: SkinComplexionId;
  name: string;
  kanji: string;
  colorHex: number;
  sssDermisHex: number;
}[] = [
  { id: 'pale_porcelain', name: 'Pale Porcelain', kanji: '白磁肌', colorHex: 0xf3dfd1, sssDermisHex: 0xe85d4a },
  { id: 'warm_edo_olive', name: 'Warm Edo Olive', kanji: '江戸小麦', colorHex: 0xe0b998, sssDermisHex: 0xe04832 },
  { id: 'sun_bronzed_ronin', name: 'Sun-Bronzed Ronin', kanji: '日焼浪人', colorHex: 0xc68f68, sssDermisHex: 0xd93822 },
  { id: 'battle_weathered', name: 'Battle-Weathered', kanji: '歴戦古肌', colorHex: 0xb58362, sssDermisHex: 0xc8321e },
  { id: 'ashen_ghost', name: 'Ashen Ghost (Kuro-Kami)', kanji: '灰白冥肌', colorHex: 0xd8d2cb, sssDermisHex: 0xb91c1c },
  { id: 'golden_touched', name: 'Golden-Touched', kanji: '金剛肌', colorHex: 0xe5be8a, sssDermisHex: 0xea580c },
  { id: 'obsidian_dusk', name: 'Obsidian Dusk', kanji: '黒曜肌', colorHex: 0x8d5b3e, sssDermisHex: 0xc2410c },
  { id: 'sakura_ivory', name: 'Sakura Ivory', kanji: '桜象牙', colorHex: 0xf7e6dc, sssDermisHex: 0xf43f5e },
];

export const EYE_IRIS_COLORS: {
  id: EyeIrisColorId;
  name: string;
  colorHex: number;
}[] = [
  { id: 'dark_amber', name: 'Dark Amber', colorHex: 0x92400e },
  { id: 'obsidian', name: 'Obsidian Ink', colorHex: 0x1c1917 },
  { id: 'jade_green', name: 'Jade Green', colorHex: 0x10b981 },
  { id: 'crimson_oni', name: 'Crimson Oni', colorHex: 0xdc2626 },
  { id: 'ice_blue', name: 'Ice Blue', colorHex: 0x38bdf8 },
  { id: 'golden_kitsune', name: 'Golden Kitsune', colorHex: 0xfbbf24 },
  { id: 'blind_white_scarred', name: 'Blind White Scarred', colorHex: 0xe2e8f0 },
  { id: 'amethyst_void', name: 'Amethyst Void', colorHex: 0xa855f7 },
  { id: 'emerald_dragon', name: 'Emerald Dragon', colorHex: 0x059669 },
  { id: 'blood_moon', name: 'Blood Moon', colorHex: 0x991b1b },
  { id: 'silver_mist', name: 'Silver Mist', colorHex: 0x94a3b8 },
  { id: 'copper_flame', name: 'Copper Flame', colorHex: 0xea580c },
];

export const HAIRSTYLES: {
  id: HairstyleId;
  name: string;
  kanji: string;
  description: string;
}[] = [
  { id: 'chonmage', name: 'Edo Chonmage Topknot', kanji: '丁髷', description: 'Authentic shaved crown with oiled Samurai topknot.' },
  { id: 'wild_ronin_mane', name: 'Wild Ronin Mane', kanji: '荒浪人長髪', description: 'Long, untamed flowing hair strands simulated with spring wind physics.' },
  { id: 'high_bushido_ponytail', name: 'High Bushido Ponytail', kanji: '武士道総髪', description: 'Voluminous tied wolf-tail swaying dynamically with movement.' },
  { id: 'twintail_kunoichi', name: 'Twin-Tail Kunoichi', kanji: '双尾忍髪', description: 'Dual high-mounted shinobi tails with crimson silk ribbons.' },
  { id: 'top_bun_sidelocks', name: 'Top-Bun & Loose Side-Locks', kanji: '茶筅髷', description: 'High tea-whisk top-bun framed by cheek-grazing side locks.' },
  { id: 'braided_warlocks', name: 'Braided Warlocks', kanji: '戦編み髪', description: 'Heavy warrior braids bound with iron rings.' },
  { id: 'wind_swept_halftied', name: 'Wind-Swept Half-Tied', kanji: '疾風半結', description: 'Half-up wandering swordsman locks billowing in the gale.' },
  { id: 'shaved_sohei_monk', name: 'Shaved Sohei Monk', kanji: '僧兵剃髪', description: 'Clean-shaven warrior monk cranium with forehead prayer seal.' },
  { id: 'silver_streaked_veteran', name: 'Silver-Streaked Veteran', kanji: '白銀歴戦髪', description: 'Swept-back mane with silver-streaked temple locks.' },
  { id: 'flowing_white_kitsune', name: 'Flowing White Kitsune', kanji: '白狐神髪', description: 'Celestial waist-length white shrine spirit hair.' },
];

export const FACIAL_HAIRS: { id: FacialHairId; name: string; kanji: string }[] = [
  { id: 'clean_shaven', name: 'Clean-Shaven', kanji: '無髭' },
  { id: 'daimyo_mustache_goatee', name: 'Fierce Daimyo Mustache & Goatee', kanji: '大名口髭・顎髭' },
  { id: 'full_ronin_beard', name: 'Full Ronin Beard', kanji: '浪人総髭' },
  { id: 'braided_chin_beard', name: 'Braided Chin-Beard', kanji: '編み顎髭' },
  { id: 'mutton_chops', name: 'Samurai Side-Whiskers', kanji: '頬髭' },
];

export const SCAR_ACCESSORIES: { id: ScarAccessoryId; name: string; kanji: string }[] = [
  { id: 'none', name: 'Unscarred Visage', kanji: '無傷' },
  { id: 'kenshin_cross_scar', name: 'Cross-Cheek Katana X-Scar', kanji: '十字刀傷' },
  { id: 'vertical_eye_slash', name: 'Vertical Eye-Slash Scar', kanji: '縦一文字傷' },
  { id: 'burn_mark', name: 'Crimson Battle Burn Mark', kanji: '業火焼痕' },
  { id: 'masamune_eyepatch', name: 'Date Masamune Iron Eyepatch (Gantai)', kanji: '独眼竜眼帯' },
];

export const TATTOO_PAINTS: { id: TattooPaintId; name: string; kanji: string }[] = [
  { id: 'none', name: 'Pure Unmarked Skin', kanji: '無紋' },
  { id: 'kabuki_kumadori', name: 'Kabuki Kumadori Crimson Stripes', kanji: '歌舞伎隈取' },
  { id: 'oni_demon_jaw', name: 'Oni Demon War Paint', kanji: '鬼神戦化粧' },
  { id: 'dragon_koi_irezumi', name: 'Full-Body Dragon & Koi Irezumi', kanji: '倶利伽羅龍刺青' },
];

export interface ElementalInfusionDef {
  id: ElementalInfusionId;
  hotkey: string;
  keyCode: string;
  name: string;
  kanji: string;
  colorHex: number;
  trailColorHex: number;
  emissiveHex: string;
  bonusDamageMult: number;
  description: string;
}

export const ELEMENTAL_INFUSIONS: ElementalInfusionDef[] = [
  {
    id: 'none',
    hotkey: '-',
    keyCode: '',
    name: 'Pure Tamahagane Steel',
    kanji: '玉鋼・無属性',
    colorHex: 0xe2e8f0,
    trailColorHex: 0xdc2626,
    emissiveHex: '#f8fafc',
    bonusDamageMult: 1.0,
    description: 'Uninfused folded Tamahagane steel.',
  },
  {
    id: 'kagutsuchi_flame',
    hotkey: 'Z',
    keyCode: 'KeyZ',
    name: 'Kagutsuchi Flame (Hi)',
    kanji: '火之迦具土・業火',
    colorHex: 0xf97316,
    trailColorHex: 0xf97316,
    emissiveHex: '#f97316',
    bonusDamageMult: 1.25,
    description: 'Molten orange blade glow, volumetric fire ribbons, and ignites enemies over time.',
  },
  {
    id: 'raijin_thunder',
    hotkey: 'X',
    keyCode: 'KeyX',
    name: 'Raijin Thunder (Kaminari)',
    kanji: '雷神・紫電',
    colorHex: 0x38bdf8,
    trailColorHex: 0x38bdf8,
    emissiveHex: '#38bdf8',
    bonusDamageMult: 1.22,
    description: 'Crackling blue-violet electrical arcs jump between up to 4 nearby enemies on every hit.',
  },
  {
    id: 'fujin_gale',
    hotkey: 'C',
    keyCode: 'KeyC',
    name: 'Fujin Gale (Kaze)',
    kanji: '風神・真空刃',
    colorHex: 0x34d399,
    trailColorHex: 0x34d399,
    emissiveHex: '#34d399',
    bonusDamageMult: 1.18,
    description: 'Launches crescent vacuum wind blades 12m forward that cleave enemies and slice bamboo stalks.',
  },
  {
    id: 'yuki_onna_frost',
    hotkey: 'V',
    keyCode: 'KeyV',
    name: 'Yuki-Onna Frost (Kori)',
    kanji: '雪女・氷結晶',
    colorHex: 0xbae6fd,
    trailColorHex: 0xbae6fd,
    emissiveHex: '#7dd3fc',
    bonusDamageMult: 1.16,
    description: 'Coats weapon in rime ice, slowing enemy animations by 50% until they freeze and shatter.',
  },
  {
    id: 'yomi_blood_ink',
    hotkey: 'B',
    keyCode: 'KeyB',
    name: 'Yomi Blood-Ink (Sumi-Chi)',
    kanji: '黄泉・血墨',
    colorHex: 0xdc2626,
    trailColorHex: 0x991b1b,
    emissiveHex: '#ef4444',
    bonusDamageMult: 1.28,
    description: 'Black-and-crimson calligraphy ink splashes blind enemies and corrupt their Posture bar.',
  },
];

// ============================================================================
// MATHEMATICAL PENDULUM GRAPPLING HOOK (KAGINAWA) STEPPER
// L * theta'' + g * sin(theta) + b * theta' = 0
// ============================================================================
export function stepPendulumGrapple(
  theta: number,
  omega: number,
  ropeLength: number,
  dt: number,
  gravity = 9.81,
  damping = 0.18
): { theta: number; omega: number; nextTheta: number; nextOmega: number } {
  const safeL = Math.max(2.0, ropeLength);
  const safeDt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.05) : 0;
  const safeTheta = Number.isFinite(theta) ? theta : 0;
  const safeOmega = Number.isFinite(omega) ? omega : 0;
  const alpha = -(gravity / safeL) * Math.sin(safeTheta) - damping * safeOmega;
  const nextOmega = safeOmega + alpha * safeDt;
  const nextTheta = safeTheta + nextOmega * safeDt;
  return { theta: nextTheta, omega: nextOmega, nextTheta, nextOmega };
}

// ============================================================================
// EXACT SHINOGI-ZUKURI PARABOLIC SORI & WIDTH TAPER EQUATIONS
// y(z) = s_max * (z / L)^2.15
// W(z) = W_moto * (1 - 0.34 * (z / L)^1.3)
// ============================================================================
export function evaluateShinogiZukuriProfile(
  z: number,
  bladeLength: number,
  motoWidth: number,
  soriMax: number
): { soriY: number; width: number } {
  const safeL = Math.max(0.1, bladeLength);
  const u = Math.max(0, Math.min(1, z / safeL));
  const soriY = soriMax * Math.pow(u, 2.15);
  let width = motoWidth * (1 - 0.34 * Math.pow(u, 1.3));
  if (u > 0.92) {
    const tipRatio = (u - 0.92) / 0.08;
    width *= Math.sqrt(Math.max(0, 1 - tipRatio * tipRatio));
  }
  return { soriY, width };
}

// ============================================================================
// FOURIER PLEATED HAKAMA SURFACE RADIUS EQUATION
// R(theta, y) = R_waist + (R_hem - R_waist)*(y/H)^0.85 + A*cos(7*theta)*sin(pi*y/H) + B*cos(14*theta)
// ============================================================================
export function evaluateFourierHakamaRadius(
  theta: number,
  yNorm: number,
  waistR: number,
  hemR: number,
  pleatAmp = 0.028,
  foldAmp = 0.009
): number {
  const u = Math.max(0, Math.min(1, yNorm));
  return (
    waistR +
    (hemR - waistR) * Math.pow(u, 0.85) +
    pleatAmp * Math.cos(7 * theta) * Math.sin(Math.PI * u) +
    foldAmp * Math.cos(14 * theta)
  );
}
