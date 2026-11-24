import * as THREE from 'three';
import {
  WEAPONS,
  THROWABLES,
  ARMORS,
  HELMETS,
  TWENTY_AUTHENTIC_ARSENAL,
  ArtworkThemeId,
  WeaponDef,
  ArmorDef,
  HelmetDef,
} from './arsenal';
import { CAMPAIGN_STAGES, BossDef } from './stages';
import {
  createProceduralTextures,
  buildProceduralWeaponMesh,
  createProjectileMesh,
  createEnemyMeshRig,
} from './proceduralMeshes';

export interface ArtworkThemeConfig {
  id: ArtworkThemeId;
  name: string;
  kanji: string;
  bgTop: string;
  bgBottom: string;
  sunColor: string;
  inkColor: string;
  frameColor: string;
  promptSuffix: string;
}

export const ARTWORK_THEMES: ArtworkThemeConfig[] = [
  {
    id: 'sumi_blood_ink',
    name: 'Sumi-e Blood Ink',
    kanji: '墨血画',
    bgTop: '#f2e7d3',
    bgBottom: '#d8c5a8',
    sunColor: 'rgba(153, 27, 27, 0.86)',
    inkColor: 'rgba(18, 14, 11, 0.92)',
    frameColor: '#d97706',
    promptSuffix:
      'dramatic Sumi-e black ink wash and crimson blood-moon splatters on handmade fibrous Washi paper, vermilion hanko seal',
  },
  {
    id: 'edo_ukiyoe_woodblock',
    name: 'Edo Ukiyo-e Woodblock',
    kanji: '浮世絵木版',
    bgTop: '#efe4ce',
    bgBottom: '#c2d1d8',
    sunColor: 'rgba(185, 28, 28, 0.82)',
    inkColor: 'rgba(23, 37, 84, 0.88)',
    frameColor: '#b45309',
    promptSuffix:
      'authentic Edo-period Ukiyo-e polychrome woodblock print in Prussian blue, vermilion, and warm parchment tones',
  },
  {
    id: 'imperial_gold_leaf',
    name: 'Imperial Gold Leaf (Kinpaku)',
    kanji: '金箔極彩',
    bgTop: '#292018',
    bgBottom: '#45321b',
    sunColor: 'rgba(245, 158, 11, 0.88)',
    inkColor: 'rgba(254, 240, 138, 0.78)',
    frameColor: '#fbbf24',
    promptSuffix:
      'Kano-school imperial folding screen (Byobu) on gleaming Kinpaku gold leaf with black ink dragon brushwork and Kintsugi seams',
  },
  {
    id: 'dark_tamahagane_forge',
    name: 'Photorealistic Dark Forge',
    kanji: '玉鋼鍛冶',
    bgTop: '#0f141c',
    bgBottom: '#1e1b24',
    sunColor: 'rgba(234, 88, 12, 0.82)',
    inkColor: 'rgba(226, 232, 240, 0.85)',
    frameColor: '#f59e0b',
    promptSuffix:
      'photorealistic macro studio swordsmith photography in a glowing charcoal Tamahagane forge with flying golden sparks and sharp specular steel reflections',
  },
];

const STORAGE_PREFIX = 'kami_washi_art_v2_';
const IDB_NAME = 'kami_washi_artwork_db';
const IDB_STORE = 'scroll_portraits';
const memoryArtworkCache = new Map<string, string>();

function savePortraitToIndexedDB(key: string, dataUrl: string): void {
  if (typeof indexedDB === 'undefined') return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(dataUrl, key);
    };
  } catch {
    // Ignore IndexedDB quota/privacy errors
  }
}

// Shared offscreen WebGL studio renderer (created lazily once)
let studioRenderer: THREE.WebGLRenderer | null = null;
let studioScene: THREE.Scene | null = null;
let studioCamera: THREE.PerspectiveCamera | null = null;
let studioSubjectMount: THREE.Group | null = null;

function ensureOffscreenStudio(): {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mount: THREE.Group;
} {
  if (!studioScene) {
    studioScene = new THREE.Scene();
    studioCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    studioCamera.position.set(0, 1.05, 3.35);
    studioCamera.lookAt(0, 0.95, 0);

    // 3-Point Macro Studio Lighting Rig (Golden Rim, Cool Moonlight Key, Specular Edge Fill)
    const keyLight = new THREE.DirectionalLight(0xe2f1ff, 2.8);
    keyLight.position.set(2.6, 3.8, 3.2);
    studioScene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffb74d, 3.2);
    rimLight.position.set(-2.8, 2.4, -2.2);
    studioScene.add(rimLight);

    const bladeSpecularLight = new THREE.PointLight(0xffffff, 2.4, 10);
    bladeSpecularLight.position.set(0.8, 1.4, 2.2);
    studioScene.add(bladeSpecularLight);

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x1e1b18, 1.35);
    studioScene.add(hemi);

    studioSubjectMount = new THREE.Group();
    studioScene.add(studioSubjectMount);

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 320;
      offCanvas.height = 320;
      studioRenderer = new THREE.WebGLRenderer({
        canvas: offCanvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      studioRenderer.setSize(320, 320, false);
      studioRenderer.outputColorSpace = THREE.SRGBColorSpace;
      studioRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      studioRenderer.toneMappingExposure = 1.22;
    } catch {
      studioRenderer = null;
    }
  }
  return {
    renderer: studioRenderer,
    scene: studioScene!,
    camera: studioCamera!,
    mount: studioSubjectMount!,
  };
}

function drawAuraMotif(
  ctx: CanvasRenderingContext2D,
  size: number,
  motif: WeaponDef['auraMotif'],
  seedOffset = 0
) {
  const auraColors: Record<WeaponDef['auraMotif'], [string, string]> = {
    emerald_wind: ['rgba(16, 185, 129, 0.46)', 'rgba(167, 243, 208, 0.72)'],
    crimson_lightning: ['rgba(220, 38, 38, 0.52)', 'rgba(254, 202, 202, 0.78)'],
    ember_smoke: ['rgba(234, 88, 12, 0.52)', 'rgba(253, 224, 71, 0.80)'],
    azure_mist: ['rgba(14, 165, 233, 0.45)', 'rgba(186, 230, 253, 0.75)'],
    violet_shadow: ['rgba(147, 51, 234, 0.48)', 'rgba(233, 213, 255, 0.75)'],
  };
  const [primaryAura, highlightAura] = auraColors[motif] || auraColors.crimson_lightning;

  ctx.save();
  // Swirling calligraphy elemental vortex rings
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 === 0 ? primaryAura : highlightAura;
    ctx.lineWidth = (4 - i * 0.45) * (size / 320);
    ctx.beginPath();
    const startA = i * 0.85 + seedOffset;
    ctx.arc(
      size * 0.5,
      size * 0.5,
      size * (0.22 + i * 0.036),
      startA,
      startA + Math.PI * 1.15
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawProcedural2DIllustratedWeaponOverlay(
  ctx: CanvasRenderingContext2D,
  size: number,
  itemId: string,
  primaryHex: number,
  secondaryHex: number
) {
  ctx.save();
  ctx.translate(size * 0.5, size * 0.52);
  ctx.rotate(-Math.PI * 0.21); // Iconic 35-degree diagonal studio presentation

  const primaryCss = `#${primaryHex.toString(16).padStart(6, '0')}`;
  const secondaryCss = `#${secondaryHex.toString(16).padStart(6, '0')}`;

  if (
    itemId === 'uchigatana' ||
    itemId === 'odachi' ||
    itemId === 'wakizashi' ||
    itemId === 'tanto' ||
    itemId === 'tachi' ||
    itemId === 'dual_ninjato'
  ) {
    const blades = itemId === 'dual_ninjato' ? [-14, 14] : [0];
    const bladeLen =
      itemId === 'odachi'
        ? size * 0.42
        : itemId === 'tanto'
          ? size * 0.24
          : itemId === 'wakizashi'
            ? size * 0.3
            : size * 0.37;

    for (const xOff of blades) {
      ctx.save();
      ctx.translate(xOff, 0);
      // Silk-wrapped Tsuka Hilt
      ctx.fillStyle = secondaryCss;
      ctx.fillRect(-6, bladeLen * 0.42, 12, size * 0.18);
      // Diamond Tsuka-ito cord markings
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      for (let y = bladeLen * 0.45; y < bladeLen * 0.58; y += 9) {
        ctx.beginPath();
        ctx.moveTo(-6, y);
        ctx.lineTo(6, y + 5);
        ctx.moveTo(6, y);
        ctx.lineTo(-6, y + 5);
        ctx.stroke();
      }
      // Ornate Gold-Rimmed Tsuba Guard
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, bladeLen * 0.41, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tamahagane Curved Blade with Wavy Martensite Hamon Line
      const bGrad = ctx.createLinearGradient(-8, -bladeLen, 10, bladeLen * 0.4);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.5, '#cbd5e1');
      bGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(-5, bladeLen * 0.4);
      ctx.quadraticCurveTo(-12, 0, -2, -bladeLen);
      ctx.lineTo(7, -bladeLen + 14);
      ctx.quadraticCurveTo(2, 0, 6, bladeLen * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing Wavy Hamon Temper Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let y = bladeLen * 0.38; y >= -bladeLen + 16; y -= 6) {
        const wave = Math.sin(y * 0.18) * 2.2;
        const x = 2 + wave;
        if (y === bladeLen * 0.38) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  } else if (itemId === 'naginata' || itemId === 'yari' || itemId === 'kanabo' || itemId === 'otsuchi') {
    // Polearms & Heavy Weapons
    ctx.fillStyle = secondaryCss;
    ctx.fillRect(-5, -size * 0.1, 10, size * 0.46);
    if (itemId === 'kanabo') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-13, -size * 0.38, 26, size * 0.38);
      ctx.fillStyle = '#fbbf24';
      for (let y = -size * 0.35; y < -2; y += 14) {
        ctx.beginPath();
        ctx.arc(-14, y, 4, 0, Math.PI * 2);
        ctx.arc(14, y, 4, 0, Math.PI * 2);
        ctx.arc(0, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (itemId === 'otsuchi') {
      // Ono Bearded Crescent Battle Axe + Hammer Poll
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.28);
      ctx.quadraticCurveTo(46, -size * 0.36, 52, -size * 0.04);
      ctx.quadraticCurveTo(24, -size * 0.14, 0, -size * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (itemId === 'yari') {
      // Jumonji Cross Spear
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.42);
      ctx.lineTo(9, -size * 0.12);
      ctx.lineTo(-9, -size * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -size * 0.16, 26, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      // Sweeping Naginata Blade
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-5, -size * 0.08);
      ctx.quadraticCurveTo(-18, -size * 0.26, 8, -size * 0.42);
      ctx.quadraticCurveTo(18, -size * 0.24, 6, -size * 0.08);
      ctx.closePath();
      ctx.fill();
    }
  } else if (itemId === 'daikyu' || itemId === 'hankyu') {
    // Asymmetrical Yumi Bow + Nocked Ya Arrow
    ctx.strokeStyle = primaryCss;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-18, 0, size * 0.34, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-18 + Math.cos(-Math.PI * 0.42) * size * 0.34, Math.sin(-Math.PI * 0.42) * size * 0.34);
    ctx.lineTo(-18 + Math.cos(Math.PI * 0.42) * size * 0.34, Math.sin(Math.PI * 0.42) * size * 0.34);
    ctx.stroke();
    // Crossed Arrow
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.15);
    ctx.lineTo(size * 0.28, -size * 0.15);
    ctx.stroke();
  } else if (itemId === 'tanegashima') {
    // Matchlock Arquebus
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -size * 0.15, 16, size * 0.46);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-5, -size * 0.4, 10, size * 0.55);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-7, -size * 0.25, 14, 6);
    ctx.fillRect(-7, -size * 0.05, 14, 6);
  } else if (itemId === 'shuriken' || itemId === 'bo_shuriken') {
    // 8-Point Star / Spikes
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    for (let r = 0; r < 2; r++) {
      ctx.save();
      ctx.rotate((r * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.26);
      ctx.lineTo(size * 0.07, -size * 0.07);
      ctx.lineTo(size * 0.26, 0);
      ctx.lineTo(size * 0.07, size * 0.07);
      ctx.lineTo(0, size * 0.26);
      ctx.lineTo(-size * 0.07, size * 0.07);
      ctx.lineTo(-size * 0.26, 0);
      ctx.lineTo(-size * 0.07, -size * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#181411';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (itemId === 'horokudama') {
    // Ceramic Black-Powder Bomb with Blazing Fuse
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 10, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -size * 0.16, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Armor / Kabuto / Kunai / Kusarigama / Caltrops emblem
    ctx.fillStyle = primaryCss;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, Math.PI, 0);
    ctx.lineTo(size * 0.26, size * 0.18);
    ctx.lineTo(-size * 0.26, size * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Golden Crescent Maedate
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -size * 0.12, size * 0.14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderStudioUkiyoePortrait(
  options: {
    id: string;
    title: string;
    kanji: string;
    subtitle: string;
    gradeLabel: string;
    auraMotif: WeaponDef['auraMotif'];
    primaryColor: number;
    secondaryColor: number;
    subject3D?: THREE.Object3D;
    themeId?: ArtworkThemeId;
    resolution?: number;
  }
): string {
  const theme =
    ARTWORK_THEMES.find((t) => t.id === (options.themeId || 'sumi_blood_ink')) || ARTWORK_THEMES[0];
  const size = options.resolution || 320;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Washi Paper & Theme Woodblock Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, theme.bgTop);
  bgGrad.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Organic Mulberry Washi Paper Fibers & Gold-Leaf (Kinpaku) Flakes
  for (let i = 0; i < 160; i++) {
    const x = ((i * 73) % size);
    const y = ((i * 137) % size);
    const len = 10 + (i % 18);
    const a = (i * 0.618) * Math.PI * 2;
    ctx.strokeStyle =
      i % 9 === 0 ? 'rgba(251, 191, 36, 0.38)' : 'rgba(120, 98, 72, 0.16)';
    ctx.lineWidth = i % 9 === 0 ? 1.8 : 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // 3. Ukiyo-e Rising Crimson Sun / Blood-Moon Disk
  ctx.fillStyle = theme.sunColor;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.48, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 4. Swirling Sumi-e Ink Calligraphy Brushstroke Arc
  ctx.strokeStyle = theme.inkColor;
  ctx.lineWidth = size * 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.34, Math.PI * 0.18, Math.PI * 1.45);
  ctx.stroke();

  // 5. Class-Specific Elemental Combat Aura
  drawAuraMotif(ctx, size, options.auraMotif, options.id.length * 0.3);

  // 6. Illustrated 2D Woodblock Silhouette Underlay
  drawProcedural2DIllustratedWeaponOverlay(
    ctx,
    size,
    options.id,
    options.primaryColor,
    options.secondaryColor
  );

  // 7. 3-Point Macro Studio 3D Render Pass (Composited at 35° Diagonal Presentation Angle)
  if (options.subject3D) {
    const { renderer, scene, camera, mount } = ensureOffscreenStudio();
    if (renderer) {
      while (mount.children.length > 0) {
        mount.remove(mount.children[0]);
      }
      const wrapper = new THREE.Group();
      wrapper.add(options.subject3D);

      // Compute bounding box to auto-frame any 3D weapon, armor, or boss
      const box = new THREE.Box3().setFromObject(wrapper);
      const center = new THREE.Vector3();
      const boxSize = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(boxSize);
      const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z, 0.4);
      const fitScale = 1.65 / maxDim;

      options.subject3D.position.sub(center);
      wrapper.scale.setScalar(fitScale);
      wrapper.rotation.set(0.22, 0.48, -Math.PI * 0.19); // 35° dramatic diagonal studio angle
      wrapper.position.set(0, 0.95, 0);
      mount.add(wrapper);

      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0, size, size);
    }
  }

  // 8. Vertical Japanese Kanji Calligraphy Column (Top-Right)
  ctx.save();
  ctx.fillStyle = theme.id === 'imperial_gold_leaf' || theme.id === 'dark_tamahagane_forge' ? '#fef3c7' : '#181411';
  ctx.font = `bold ${Math.round(size * 0.082)}px "Shippori Mincho", "Crimson Pro", serif`;
  ctx.textAlign = 'center';
  const chars = options.kanji.split('').slice(0, 5);
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, size * 0.87, size * (0.2 + idx * 0.095));
  });
  ctx.restore();

  // 9. Traditional Vermilion Artist Seal (Hanko Stamp "紙刃") in Bottom-Right Corner
  const sealSize = size * 0.13;
  const sealX = size * 0.81;
  const sealY = size * 0.74;
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(sealX, sealY, sealSize, sealSize);
  ctx.strokeStyle = '#fef2f2';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(sealX + 2, sealY + 2, sealSize - 4, sealSize - 4);
  ctx.fillStyle = '#fef2f2';
  ctx.font = `bold ${Math.round(sealSize * 0.42)}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('紙', sealX + sealSize * 0.5, sealY + sealSize * 0.44);
  ctx.fillText('刃', sealX + sealSize * 0.5, sealY + sealSize * 0.84);

  // 10. Bottom Calligraphy Scroll Banner & Metric Specs Strip
  ctx.fillStyle = 'rgba(18, 14, 11, 0.86)';
  ctx.fillRect(0, size * 0.84, size, size * 0.16);
  ctx.strokeStyle = theme.frameColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.84);
  ctx.lineTo(size, size * 0.84);
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = `bold ${Math.round(size * 0.045)}px "Cinzel", serif`;
  ctx.textAlign = 'left';
  ctx.fillText(options.title.slice(0, 26), size * 0.045, size * 0.905);

  ctx.fillStyle = '#fbbf24';
  ctx.font = `${Math.round(size * 0.033)}px "JetBrains Mono", monospace`;
  ctx.fillText(options.subtitle.slice(0, 38), size * 0.045, size * 0.958);

  // 11. Wazamono / O-Wazamono Supreme Grade Gold Border Frame
  ctx.strokeStyle = theme.frameColor;
  ctx.lineWidth = size * 0.022;
  ctx.strokeRect(size * 0.011, size * 0.011, size * 0.978, size * 0.978);
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(size * 0.028, size * 0.028, size * 0.944, size * 0.944);

  return canvas.toDataURL('image/png');
}

// ============================================================================
// GENERATE & CACHE ALL 20 WEAPONS, 5 ARMORS, 5 HELMETS & 5 BOSSES AT STARTUP
// ============================================================================
export function generateAllStudioArtworkPortraits(
  themeId: ArtworkThemeId = 'sumi_blood_ink'
): Record<string, string> {
  const textures = createProceduralTextures(4);
  const result: Record<string, string> = {};

  // 1. All 20 Arsenal Items (15 Weapons + 5 Throwables)
  for (const item of TWENTY_AUTHENTIC_ARSENAL) {
    const cacheKey = `${item.id}_${themeId}`;
    const cached = memoryArtworkCache.get(cacheKey);
    if (cached) {
      result[item.id] = cached;
      continue;
    }

    let subject3D: THREE.Object3D | undefined;
    if (item.weaponRef) {
      subject3D = buildProceduralWeaponMesh(item.weaponRef, textures);
    } else if (item.throwableRef) {
      subject3D = createProjectileMesh(
        item.throwableRef.effectType,
        item.throwableRef.color,
        textures
      );
    }

    const url = renderStudioUkiyoePortrait({
      id: item.id,
      title: item.name,
      kanji: item.kanji,
      subtitle: `${item.wazamonoGrade} · ${item.metricSpecs}`,
      gradeLabel: item.wazamonoGrade,
      auraMotif: item.auraMotif,
      primaryColor: item.weaponRef?.bladeColor ?? item.throwableRef?.color ?? 0xe2e8f0,
      secondaryColor: item.weaponRef?.hiltColor ?? 0x991b1b,
      subject3D,
      themeId,
    });
    memoryArtworkCache.set(cacheKey, url);
    result[item.id] = url;
  }

  // 2. All 5 Armor Sets (Do Cuirass)
  for (const armor of ARMORS) {
    const cacheKey = `armor_${armor.id}_${themeId}`;
    const url =
      memoryArtworkCache.get(cacheKey) ||
      renderStudioUkiyoePortrait({
        id: armor.id,
        title: armor.name,
        kanji: armor.kanji,
        subtitle: armor.metricSpecs,
        gradeLabel: 'O-Yoroi Masterwork',
        auraMotif: 'crimson_lightning',
        primaryColor: armor.primaryColor,
        secondaryColor: armor.accentColor,
        themeId,
      });
    memoryArtworkCache.set(cacheKey, url);
    result[`armor_${armor.id}`] = url;
  }

  // 3. All 5 Kabuto & Menpo Helmets
  for (const helmet of HELMETS) {
    const cacheKey = `helmet_${helmet.id}_${themeId}`;
    const url =
      memoryArtworkCache.get(cacheKey) ||
      renderStudioUkiyoePortrait({
        id: helmet.id,
        title: helmet.name,
        kanji: helmet.kanji,
        subtitle: helmet.metricSpecs,
        gradeLabel: 'Kabuto Masterwork',
        auraMotif: 'ember_smoke',
        primaryColor: helmet.primaryColor,
        secondaryColor: helmet.crestColor,
        themeId,
      });
    memoryArtworkCache.set(cacheKey, url);
    result[`helmet_${helmet.id}`] = url;
  }

  // 4. All 5 Campaign Bosses
  for (const stage of CAMPAIGN_STAGES) {
    const boss: BossDef = stage.boss;
    const cacheKey = `boss_${boss.id}_${themeId}`;
    let url = memoryArtworkCache.get(cacheKey);
    if (!url) {
      const bossRig = createEnemyMeshRig(boss, true, textures, WEAPONS[1]);
      url = renderStudioUkiyoePortrait({
        id: boss.id,
        title: boss.name,
        kanji: boss.kanjiSubtitle.slice(0, 4),
        subtitle: `${boss.title} · Stage ${stage.id}`,
        gradeLabel: 'Apex Warlord',
        auraMotif: 'crimson_lightning',
        primaryColor: boss.primaryColor,
        secondaryColor: boss.accentColor,
        subject3D: bossRig.root,
        themeId,
      });
      memoryArtworkCache.set(cacheKey, url);
    }
    result[`boss_${boss.id}`] = url;
  }

  return result;
}

// ============================================================================
// PIPELINE 2: LIVE GOOGLE AI STUDIO (@google/genai) CONCEPT-ART SYNTHESIZER
// ============================================================================
export async function synthesizeLiveAIScrollPortrait(params: {
  itemId: string;
  title: string;
  kanji: string;
  subtitle: string;
  aiPrompt: string;
  auraMotif: WeaponDef['auraMotif'];
  primaryColor: number;
  secondaryColor: number;
  themeId: ArtworkThemeId;
}): Promise<{ dataUrl: string; source: 'gemini-imagen' | 'studio-3d-ukiyoe' }> {
  const theme = ARTWORK_THEMES.find((t) => t.id === params.themeId) || ARTWORK_THEMES[0];
  const fullPrompt = `${params.aiPrompt}, ${theme.promptSuffix}`;

  try {
    const res = await fetch('/api/generate-scroll-art', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: params.itemId,
        prompt: fullPrompt,
        themeId: params.themeId,
      }),
    });
    const data = await res.json();
    if (data.imageBase64) {
      const dataUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
      const cacheKey = `${params.itemId}_${params.themeId}`;
      memoryArtworkCache.set(cacheKey, dataUrl);
      savePortraitToIndexedDB(cacheKey, dataUrl);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${params.itemId}`, dataUrl);
      } catch {
        // Ignore storage quota errors
      }
      return { dataUrl, source: 'gemini-imagen' };
    }
  } catch {
    // Fallback to High-Resolution 512x512 3D Studio + Ukiyo-e Scroll Compositor below
  }

  // Synthesize High-Resolution 512x512 Masterpiece Scroll via Pipeline 1 Studio Compositor
  const textures = createProceduralTextures(4);
  const compItem = TWENTY_AUTHENTIC_ARSENAL.find((i) => i.id === params.itemId);
  let subject3D: THREE.Object3D | undefined;
  if (compItem?.weaponRef) {
    subject3D = buildProceduralWeaponMesh(compItem.weaponRef, textures);
  } else if (compItem?.throwableRef) {
    subject3D = createProjectileMesh(
      compItem.throwableRef.effectType,
      compItem.throwableRef.color,
      textures
    );
  }

  const dataUrl = renderStudioUkiyoePortrait({
    id: params.itemId,
    title: params.title,
    kanji: params.kanji,
    subtitle: params.subtitle,
    gradeLabel: 'AI & Studio Masterpiece',
    auraMotif: params.auraMotif,
    primaryColor: params.primaryColor,
    secondaryColor: params.secondaryColor,
    subject3D,
    themeId: params.themeId,
    resolution: 512,
  });

  const cacheKey = `${params.itemId}_${params.themeId}`;
  memoryArtworkCache.set(cacheKey, dataUrl);
  savePortraitToIndexedDB(cacheKey, dataUrl);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${params.itemId}`, dataUrl);
  } catch {
    // Ignore storage quota errors
  }

  return { dataUrl, source: 'studio-3d-ukiyoe' };
}
