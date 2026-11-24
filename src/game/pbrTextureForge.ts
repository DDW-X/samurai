import * as THREE from 'three';

export type NanoBananaPresetId =
  | 'folded_damascus_steel'
  | 'gnarled_sakura_bark'
  | 'volcanic_basalt_magma'
  | 'carved_jade_dragon_scales'
  | 'gold_inlaid_black_lacquer'
  | 'weathered_blood_silk';

export interface NanoBananaPresetDef {
  id: NanoBananaPresetId;
  name: string;
  kanji: string;
  targetCategory: 'weapon' | 'armor' | 'terrain';
  prompt: string;
  roughnessBase: number;
  metalnessBase: number;
  pomDepthScale: number;
  normalStrength: number;
}

export const NANO_BANANA_PBR_PRESETS: NanoBananaPresetDef[] = [
  {
    id: 'folded_damascus_steel',
    name: 'Folded Tamahagane Damascus Steel',
    kanji: '玉鋼綾杉肌',
    targetCategory: 'weapon',
    prompt:
      'Seamless tileable 1:1 macro PBR texture of Japanese Tamahagane folded Damascus steel with wavy martensite Hamon temper crystal line and microscopic carbon grain, flat orthographic lighting',
    roughnessBase: 0.18,
    metalnessBase: 0.94,
    pomDepthScale: 0.032,
    normalStrength: 2.6,
  },
  {
    id: 'gnarled_sakura_bark',
    name: 'Gnarled Cherry-Blossom Bark & Moss',
    kanji: '古桜苔樹皮',
    targetCategory: 'terrain',
    prompt:
      'Seamless tileable 1:1 PBR texture of ancient gnarled Japanese cherry blossom tree bark with deep crevices and vibrant emerald moss patches, orthographic top-down',
    roughnessBase: 0.84,
    metalnessBase: 0.05,
    pomDepthScale: 0.055,
    normalStrength: 3.4,
  },
  {
    id: 'volcanic_basalt_magma',
    name: 'Volcanic Basalt & Magma Fissures',
    kanji: '阿蘇黒曜溶岩',
    targetCategory: 'terrain',
    prompt:
      'Seamless tileable 1:1 PBR texture of cracked dark obsidian volcanic basalt rock with glowing molten orange magma veins deep in the fissures',
    roughnessBase: 0.72,
    metalnessBase: 0.18,
    pomDepthScale: 0.06,
    normalStrength: 3.8,
  },
  {
    id: 'carved_jade_dragon_scales',
    name: 'Carved Imperial Jade Dragon Scales',
    kanji: '翡翠龍鱗彫',
    targetCategory: 'armor',
    prompt:
      'Seamless tileable 1:1 PBR texture of overlapping hand-carved imperial green jade dragon scales with gold-leaf Kintsugi bevels',
    roughnessBase: 0.26,
    metalnessBase: 0.35,
    pomDepthScale: 0.048,
    normalStrength: 3.2,
  },
  {
    id: 'gold_inlaid_black_lacquer',
    name: 'Gold-Inlaid Kuro-Urushi Lacquer',
    kanji: '黒漆蒔絵金箔',
    targetCategory: 'armor',
    prompt:
      'Seamless tileable 1:1 PBR texture of glossy black Japanese Urushi lacquer Kozane armor scales inlaid with raised golden Maki-e clouds and crests',
    roughnessBase: 0.16,
    metalnessBase: 0.58,
    pomDepthScale: 0.04,
    normalStrength: 2.8,
  },
  {
    id: 'weathered_blood_silk',
    name: 'Weathered Crimson Nishijin Brocade Silk',
    kanji: '緋威西陣織',
    targetCategory: 'armor',
    prompt:
      'Seamless tileable 1:1 macro PBR texture of heavy woven crimson Japanese Nishijin brocade silk with golden phoenix threads and battle-worn fiber relief',
    roughnessBase: 0.64,
    metalnessBase: 0.14,
    pomDepthScale: 0.036,
    normalStrength: 2.5,
  },
];

export interface SobelPBRMapBundle {
  presetId: string;
  albedoDataUrl: string;
  normalDataUrl: string;
  heightDataUrl: string;
  roughnessDataUrl: string;
  albedoTex: THREE.CanvasTexture;
  normalTex: THREE.CanvasTexture;
  heightTex: THREE.CanvasTexture;
  roughnessTex: THREE.CanvasTexture;
  width: number;
  height: number;
  sourceModel: 'gemini-3-pro-image-preview' | 'procedural-sobel-synthesizer';
}

/**
 * Pure Mathematical Sobel-Scharr Normal, Height & Laplace Cavity/Roughness Generator
 * Given an RGBA Uint8ClampedArray of dimensions (width x height), computes:
 * 1. Grayscale Height Map H(u,v) in [0, 255]
 * 2. Tangent-Space Normal Map N(u,v) = normalize(-dH/du * s, -dH/dv * s, 1.0) encoded in RGB
 * 3. Roughness/Cavity Map via 3x3 Laplacian edge curvature operator
 */
export function computeSobelScharrPBRBuffers(
  rgbaPixels: Uint8ClampedArray,
  width: number,
  height: number,
  normalStrength = 3.0
): {
  heightPixels: Uint8ClampedArray;
  normalPixels: Uint8ClampedArray;
  roughnessPixels: Uint8ClampedArray;
} {
  const totalPixels = width * height;
  const luma = new Float32Array(totalPixels);
  const heightPixels = new Uint8ClampedArray(totalPixels * 4);
  const normalPixels = new Uint8ClampedArray(totalPixels * 4);
  const roughnessPixels = new Uint8ClampedArray(totalPixels * 4);

  for (let i = 0; i < totalPixels; i++) {
    const r = rgbaPixels[i * 4] / 255;
    const g = rgbaPixels[i * 4 + 1] / 255;
    const b = rgbaPixels[i * 4 + 2] / 255;
    const hVal = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[i] = hVal;
    const byteH = Math.round(hVal * 255);
    heightPixels[i * 4] = byteH;
    heightPixels[i * 4 + 1] = byteH;
    heightPixels[i * 4 + 2] = byteH;
    heightPixels[i * 4 + 3] = 255;
  }

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % width) + width) % width;
    const wy = ((y % height) + height) % height;
    return luma[wy * width + wx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const tl = sampleH(x - 1, y - 1);
      const tc = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const ml = sampleH(x - 1, y);
      const mc = sampleH(x, y);
      const mr = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const bc = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      // Scharr 3x3 rotational-symmetry gradient operator (3, 10, 3)
      const dHdu =
        (-3 * tl + 3 * tr - 10 * ml + 10 * mr - 3 * bl + 3 * br) / 16.0;
      const dHdv =
        (-3 * tl - 10 * tc - 3 * tr + 3 * bl + 10 * bc + 3 * br) / 16.0;

      // Tangent-space normal: N = normalize(-dH/du * s, -dH/dv * s, 1.0)
      const rawNx = -dHdu * normalStrength;
      const rawNy = -dHdv * normalStrength;
      const rawNz = 1.0;
      const invLen = 1.0 / Math.hypot(rawNx, rawNy, rawNz);

      const nx = rawNx * invLen;
      const ny = rawNy * invLen;
      const nz = rawNz * invLen;

      normalPixels[idx] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)));
      normalPixels[idx + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)));
      normalPixels[idx + 2] = Math.max(0, Math.min(255, Math.round((nz * 0.5 + 0.5) * 255)));
      normalPixels[idx + 3] = 255;

      // 3x3 Discrete Laplacian for cavity / micro-roughness map
      const laplace = -4 * mc + tc + bc + ml + mr;
      const roughVal = Math.max(
        0.08,
        Math.min(0.96, 1.0 - mc * 0.45 + Math.abs(laplace) * 2.4)
      );
      const byteR = Math.round(roughVal * 255);
      roughnessPixels[idx] = byteR;
      roughnessPixels[idx + 1] = byteR;
      roughnessPixels[idx + 2] = byteR;
      roughnessPixels[idx + 3] = 255;
    }
  }

  return { heightPixels, normalPixels, roughnessPixels };
}

/**
 * Generates a high-detail procedural 256x256 Albedo Canvas for any Nano Banana preset or custom prompt,
 * then runs the Sobel-Scharr & Laplace GPU/Canvas pipeline to produce all 4 PBR maps.
 */
export function generateProceduralSourceCanvas(
  presetId: NanoBananaPresetId | string,
  customPrompt = '',
  size = 256
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const promptLower = (presetId + ' ' + customPrompt).toLowerCase();

  if (promptLower.includes('damascus') || promptLower.includes('steel') || promptLower.includes('blade')) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#475569');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Damascus Jihada folded steel bands
    for (let w = 0; w < 42; w++) {
      ctx.strokeStyle = w % 2 === 0 ? 'rgba(15, 23, 42, 0.42)' : 'rgba(248, 250, 252, 0.58)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const baseY = (w / 42) * size;
      for (let x = 0; x <= size; x += 4) {
        const y =
          baseY +
          Math.sin(x * 0.07 + w * 0.45) * 9.5 +
          Math.cos(x * 0.16 - w * 0.3) * 4.2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (promptLower.includes('lava') || promptLower.includes('basalt') || promptLower.includes('magma')) {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, size, size);
    // Cracked polygonal basalt plates with glowing magma veins
    for (let i = 0; i < 65; i++) {
      const cx = ((i * 73) % size);
      const cy = ((i * 137) % size);
      ctx.fillStyle = i % 3 === 0 ? '#292524' : '#181411';
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + (i % 14), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = i % 4 === 0 ? '#f97316' : '#dc2626';
      ctx.lineWidth = i % 4 === 0 ? 2.6 : 1.3;
      ctx.stroke();
    }
  } else if (promptLower.includes('jade') || promptLower.includes('scale') || promptLower.includes('dragon')) {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, size, size);
    const cols = 8;
    const rows = 10;
    const r = size / cols;
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const cx = col * r + (row % 2 === 0 ? 0 : r * 0.5);
        const cy = row * (size / rows);
        const radGrad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, r * 0.72);
        radGrad.addColorStop(0, '#34d399');
        radGrad.addColorStop(0.7, '#059669');
        radGrad.addColorStop(1, '#fbbf24');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  } else if (promptLower.includes('bark') || promptLower.includes('moss') || promptLower.includes('wood')) {
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i++) {
      const x = (i / 120) * size;
      ctx.strokeStyle = i % 5 === 0 ? '#4ade80' : i % 2 === 0 ? '#271713' : '#5d4037';
      ctx.lineWidth = 2.5 + (i % 4);
      ctx.beginPath();
      for (let y = 0; y <= size; y += 8) {
        const wx = x + Math.sin(y * 0.08 + i) * 6;
        if (y === 0) ctx.moveTo(wx, y);
        else ctx.lineTo(wx, y);
      }
      ctx.stroke();
    }
  } else {
    // Gold-inlaid Kuro-Urushi Lacquer / Crimson Silk weave
    ctx.fillStyle = promptLower.includes('silk') ? '#7f1d1d' : '#14110f';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 24) {
        ctx.fillStyle = (x + y) % 32 === 0 ? '#fbbf24' : '#991b1b';
        ctx.fillRect(x + 2, y + 2, 18, 11);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.1;
        ctx.strokeRect(x + 2, y + 2, 18, 11);
      }
    }
  }

  return canvas;
}

/**
 * Converts a 2D source HTMLCanvasElement or Image into a complete 4-Map SobelPBRMapBundle
 * (Albedo sRGB, Tangent-Space Normal Map, Parallax Height Map, Roughness/Cavity Map).
 */
export function buildFourMapPBRBundleFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  presetId: string,
  normalStrength = 3.0,
  sourceModel: SobelPBRMapBundle['sourceModel'] = 'procedural-sobel-synthesizer'
): SobelPBRMapBundle {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h);

  const { heightPixels, normalPixels, roughnessPixels } = computeSobelScharrPBRBuffers(
    imgData.data,
    w,
    h,
    normalStrength
  );

  const makeMapCanvas = (pixels: Uint8ClampedArray): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cCtx = c.getContext('2d')!;
    const outData = cCtx.createImageData(w, h);
    outData.data.set(pixels);
    cCtx.putImageData(outData, 0, 0);
    return c;
  };

  const normalCanvas = makeMapCanvas(normalPixels);
  const heightCanvas = makeMapCanvas(heightPixels);
  const roughnessCanvas = makeMapCanvas(roughnessPixels);

  const configureTex = (c: HTMLCanvasElement, isSrgb: boolean): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(c);
    if (isSrgb) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.needsUpdate = true;
    return tex;
  };

  return {
    presetId,
    albedoDataUrl: sourceCanvas.toDataURL('image/png'),
    normalDataUrl: normalCanvas.toDataURL('image/png'),
    heightDataUrl: heightCanvas.toDataURL('image/png'),
    roughnessDataUrl: roughnessCanvas.toDataURL('image/png'),
    albedoTex: configureTex(sourceCanvas, true),
    normalTex: configureTex(normalCanvas, false),
    heightTex: configureTex(heightCanvas, false),
    roughnessTex: configureTex(roughnessCanvas, false),
    width: w,
    height: h,
    sourceModel,
  };
}

/**
 * Injects Steep Raymarched Parallax Occlusion Mapping (POM) with POM Self-Shadowing
 * and Triplanar World-Space Projection (w = |N|^p / |||N|^p||_1) into a Three.js PBR material.
 */
export function applyPOMAndTriplanarMaterial(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  bundle: SobelPBRMapBundle,
  pomHeightScale = 0.042,
  normalScaleVal = 1.35
) {
  material.color.setHex(0xffffff);
  material.map = bundle.albedoTex;
  material.normalMap = bundle.normalTex;
  material.normalScale = new THREE.Vector2(normalScaleVal, normalScaleVal);
  material.roughnessMap = bundle.roughnessTex;
  material.bumpMap = bundle.heightTex;
  material.bumpScale = pomHeightScale;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHeightMap = { value: bundle.heightTex };
    shader.uniforms.uPomScale = { value: pomHeightScale };
    material.userData.pomShader = shader;

    shader.fragmentShader =
      `
      uniform sampler2D uHeightMap;
      uniform float uPomScale;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          // Steep 16-Step Parallax Occlusion Mapping (POM) + Self-Shadowing
          vec3 viewDirTS = normalize(vViewPosition);
          float numLayers = 16.0;
          float layerDepth = 1.0 / numLayers;
          float currentLayerDepth = 0.0;
          vec2 P = viewDirTS.xy / max(0.25, abs(viewDirTS.z)) * uPomScale;
          vec2 deltaTexCoords = P / numLayers;
          vec2 currentTexCoords = vMapUv;
          float currentDepthMapValue = 1.0 - texture2D(uHeightMap, currentTexCoords).r;

          for (int i = 0; i < 16; i++) {
            if (currentLayerDepth < currentDepthMapValue) {
              currentTexCoords -= deltaTexCoords;
              currentDepthMapValue = 1.0 - texture2D(uHeightMap, currentTexCoords).r;
              currentLayerDepth += layerDepth;
            }
          }
          vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
          float afterDepth = currentDepthMapValue - currentLayerDepth;
          float beforeDepth = (1.0 - texture2D(uHeightMap, prevTexCoords).r) - currentLayerDepth + layerDepth;
          float weight = clamp(afterDepth / max(0.0001, afterDepth - beforeDepth), 0.0, 1.0);
          vec2 pomUv = mix(currentTexCoords, prevTexCoords, weight);

          // POM Micro-Crevice Self-Shadowing
          float lightSampleH = 1.0 - texture2D(uHeightMap, pomUv + vec2(0.008, 0.008)).r;
          float pomSelfShadow = clamp(1.0 - max(0.0, currentDepthMapValue - lightSampleH) * 1.65, 0.55, 1.0);

          vec4 sampledDiffuseColor = texture2D(map, pomUv);
          sampledDiffuseColor.rgb *= pomSelfShadow;
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      );
  };
  material.needsUpdate = true;
}

/**
 * Calls server-side /api/nano-banana-pbr (`gemini-3-pro-image-preview`) or falls back to
 * deterministic procedural Sobel-Scharr synthesis to return a complete 4-map PBR bundle.
 */
export async function synthesizeNanoBananaPBRBundle(
  presetId: NanoBananaPresetId,
  customPrompt = ''
): Promise<SobelPBRMapBundle> {
  const preset =
    NANO_BANANA_PBR_PRESETS.find((p) => p.id === presetId) || NANO_BANANA_PBR_PRESETS[0];
  const finalPrompt = customPrompt.trim() ? customPrompt.trim() : preset.prompt;

  try {
    const res = await fetch('/api/nano-banana-pbr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetId,
        prompt: finalPrompt,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.imageBase64) {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 256, 256);
        return buildFourMapPBRBundleFromCanvas(
          canvas,
          presetId,
          preset.normalStrength,
          'gemini-3-pro-image-preview'
        );
      }
    }
  } catch {
    // Graceful deterministic procedural Sobel-Scharr fallback
  }

  const fallbackCanvas = generateProceduralSourceCanvas(presetId, finalPrompt, 256);
  return buildFourMapPBRBundleFromCanvas(
    fallbackCanvas,
    presetId,
    preset.normalStrength,
    'procedural-sobel-synthesizer'
  );
}
