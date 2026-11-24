import * as THREE from 'three';
import { WeaponDef, ArmorDef, HelmetDef, ThrowableDef } from './arsenal';
import { EnemyArchetypeDef, BossDef } from './stages';
import {
  CharacterAppearanceConfig,
  DEFAULT_CHARACTER_APPEARANCE,
  SKIN_COMPLEXIONS,
  EYE_IRIS_COLORS,
  evaluateShinogiZukuriProfile,
  evaluateFourierHakamaRadius,
} from './characterCustomization';

export interface ProceduralTextures {
  washiAlbedo: THREE.CanvasTexture;
  washiBump: THREE.CanvasTexture;
  washiNormal: THREE.CanvasTexture;
  washiRoughness: THREE.CanvasTexture;
  tamahaganeTex: THREE.CanvasTexture;
  toonGradient: THREE.DataTexture;
  contactShadowTex: THREE.CanvasTexture;
  inkSplatterTex: THREE.CanvasTexture;
  slashBrushTex: THREE.CanvasTexture;
}

let cachedTextures: ProceduralTextures | null = null;

export function createProceduralTextures(maxAnisotropy = 4): ProceduralTextures {
  if (cachedTextures) return cachedTextures;

  // 1. High-Resolution Washi Paper, Rock & Bark Relief Canvas (512x512)
  const washiCanvas = document.createElement('canvas');
  washiCanvas.width = 512;
  washiCanvas.height = 512;
  const ctx = washiCanvas.getContext('2d')!;
  ctx.fillStyle = '#ece1cc';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wet ink cloud patches (Sumi-e bokashi wash)
  for (let i = 0; i < 24; i++) {
    const cx = ((i * 137) % 512);
    const cy = ((i * 293) % 512);
    const r = 36 + (i % 5) * 16;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(120, 98, 72, 0.08)' : 'rgba(255, 250, 238, 0.11)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Organic intertwined Mulberry / Kozo Washi & Rock Micro-Grain
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 10 + Math.random() * 38;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle =
      i % 6 === 0
        ? 'rgba(72, 56, 38, 0.26)'
        : i % 3 === 0
          ? 'rgba(255, 251, 242, 0.36)'
          : 'rgba(148, 124, 92, 0.20)';
    ctx.lineWidth = 0.7 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 8,
      y + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 8,
      x + Math.cos(angle) * len,
      y + Math.sin(angle) * len
    );
    ctx.stroke();
  }

  const washiAlbedo = new THREE.CanvasTexture(washiCanvas);
  washiAlbedo.colorSpace = THREE.SRGBColorSpace;
  washiAlbedo.wrapS = THREE.RepeatWrapping;
  washiAlbedo.wrapT = THREE.RepeatWrapping;
  washiAlbedo.repeat.set(8, 8);
  washiAlbedo.anisotropy = maxAnisotropy;

  const washiBump = new THREE.CanvasTexture(washiCanvas);
  washiBump.wrapS = THREE.RepeatWrapping;
  washiBump.wrapT = THREE.RepeatWrapping;
  washiBump.repeat.set(6, 6);
  washiBump.anisotropy = maxAnisotropy;

  // Compute True Tangent-Space Sobel Normal Map N = normalize(-dH/du, -dH/dv, 1) & Roughness Map
  const nSize = 256;
  const normCanvas = document.createElement('canvas');
  normCanvas.width = nSize;
  normCanvas.height = nSize;
  const nCtx = normCanvas.getContext('2d')!;
  nCtx.drawImage(washiCanvas, 0, 0, nSize, nSize);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = nSize;
  roughCanvas.height = nSize;
  const rCtx = roughCanvas.getContext('2d')!;

  const srcImg = nCtx.getImageData(0, 0, nSize, nSize);
  const srcPixels = srcImg.data;
  const heightField = new Float32Array(nSize * nSize);
  for (let i = 0; i < nSize * nSize; i++) {
    heightField[i] =
      (srcPixels[i * 4] * 0.299 + srcPixels[i * 4 + 1] * 0.587 + srcPixels[i * 4 + 2] * 0.114) /
      255.0;
  }

  const normOut = nCtx.createImageData(nSize, nSize);
  const roughOut = rCtx.createImageData(nSize, nSize);
  const nd = normOut.data;
  const rd = roughOut.data;
  const sobelStrength = 4.2;

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % nSize) + nSize) % nSize;
    const wy = ((y % nSize) + nSize) % nSize;
    return heightField[wy * nSize + wx];
  };

  for (let y = 0; y < nSize; y++) {
    for (let x = 0; x < nSize; x++) {
      const tl = sampleH(x - 1, y - 1);
      const tc = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const ml = sampleH(x - 1, y);
      const mr = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const bc = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = tr + 2 * mr + br - (tl + 2 * ml + bl);
      const dY = bl + 2 * bc + br - (tl + 2 * tc + tr);
      let nx = -dX * sobelStrength;
      let ny = -dY * sobelStrength;
      let nz = 1.0;
      const invLen = 1.0 / Math.max(1e-5, Math.hypot(nx, ny, nz));
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * nSize + x) * 4;
      nd[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      nd[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nd[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nd[idx + 3] = 255;

      const hVal = heightField[y * nSize + x];
      const slopeMag = Math.min(1, Math.hypot(dX, dY) * 2.5);
      const roughByte = Math.round(Math.max(45, Math.min(245, (1.0 - hVal * 0.45 + slopeMag * 0.35) * 215)));
      rd[idx] = roughByte;
      rd[idx + 1] = roughByte;
      rd[idx + 2] = roughByte;
      rd[idx + 3] = 255;
    }
  }
  nCtx.putImageData(normOut, 0, 0);
  rCtx.putImageData(roughOut, 0, 0);

  const washiNormal = new THREE.CanvasTexture(normCanvas);
  washiNormal.wrapS = THREE.RepeatWrapping;
  washiNormal.wrapT = THREE.RepeatWrapping;
  washiNormal.repeat.set(6, 6);
  washiNormal.anisotropy = maxAnisotropy;

  const washiRoughness = new THREE.CanvasTexture(roughCanvas);
  washiRoughness.wrapS = THREE.RepeatWrapping;
  washiRoughness.wrapT = THREE.RepeatWrapping;
  washiRoughness.repeat.set(6, 6);
  washiRoughness.anisotropy = maxAnisotropy;

  // 2. Tamahagane Folded Damascus Steel & Wavy Martensite Hamon Line Texture
  const steelCanvas = document.createElement('canvas');
  steelCanvas.width = 512;
  steelCanvas.height = 128;
  const stCtx = steelCanvas.getContext('2d')!;
  const stGrad = stCtx.createLinearGradient(0, 0, 0, 128);
  stGrad.addColorStop(0, '#64748b');
  stGrad.addColorStop(0.58, '#cbd5e1');
  stGrad.addColorStop(0.78, '#f8fafc');
  stGrad.addColorStop(1, '#ffffff');
  stCtx.fillStyle = stGrad;
  stCtx.fillRect(0, 0, 512, 128);

  // Damascus Jihada wood-grain folded steel layers
  stCtx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
  stCtx.lineWidth = 1.1;
  for (let w = 0; w < 28; w++) {
    stCtx.beginPath();
    const baseY = (w / 28) * 90;
    for (let x = 0; x <= 512; x += 8) {
      const y = baseY + Math.sin(x * 0.04 + w) * 3.5 + Math.cos(x * 0.11 - w) * 1.5;
      if (x === 0) stCtx.moveTo(x, y);
      else stCtx.lineTo(x, y);
    }
    stCtx.stroke();
  }

  // Wavy Gunome-Midare Hamon Martensite Temper Line along the cutting edge
  stCtx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
  stCtx.lineWidth = 3.6;
  stCtx.beginPath();
  for (let x = 0; x <= 512; x += 4) {
    const y = 94 + Math.sin(x * 0.085) * 7 + Math.cos(x * 0.21) * 3.5;
    if (x === 0) stCtx.moveTo(x, y);
    else stCtx.lineTo(x, y);
  }
  stCtx.stroke();

  const tamahaganeTex = new THREE.CanvasTexture(steelCanvas);
  tamahaganeTex.colorSpace = THREE.SRGBColorSpace;
  tamahaganeTex.wrapS = THREE.RepeatWrapping;
  tamahaganeTex.wrapT = THREE.ClampToEdgeWrapping;
  tamahaganeTex.anisotropy = maxAnisotropy;

  // 3. Cel-Shaded 4-Band Toon Ramp
  const rampBytes = new Uint8Array([34, 112, 198, 255]);
  const toonGradient = new THREE.DataTexture(rampBytes, 4, 1, THREE.RedFormat);
  toonGradient.minFilter = THREE.NearestFilter;
  toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.needsUpdate = true;

  // 4. Soft Radial Contact Shadow Disc Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(12, 9, 7, 0.76)');
  grad.addColorStop(0.55, 'rgba(12, 9, 7, 0.34)');
  grad.addColorStop(1, 'rgba(12, 9, 7, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
  contactShadowTex.colorSpace = THREE.SRGBColorSpace;

  // 5. Sumi-e Ink & Crimson Splatter Decal Texture
  const splatCanvas = document.createElement('canvas');
  splatCanvas.width = 256;
  splatCanvas.height = 256;
  const spCtx = splatCanvas.getContext('2d')!;
  spCtx.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2 + Math.random() * 0.25;
    const dist = Math.random() * 76;
    const r = 6 + Math.random() * 28 * (1 - dist / 95);
    const isCrimson = i % 3 === 0;
    spCtx.fillStyle = isCrimson ? 'rgba(153, 27, 27, 0.88)' : 'rgba(18, 14, 12, 0.92)';
    spCtx.beginPath();
    spCtx.arc(128 + Math.cos(angle) * dist, 128 + Math.sin(angle) * dist, r, 0, Math.PI * 2);
    spCtx.fill();

    spCtx.strokeStyle = isCrimson ? 'rgba(185, 28, 28, 0.75)' : 'rgba(18, 14, 12, 0.8)';
    spCtx.lineWidth = 1.5 + Math.random() * 3.5;
    spCtx.beginPath();
    spCtx.moveTo(128 + Math.cos(angle) * dist, 128 + Math.sin(angle) * dist);
    spCtx.lineTo(
      128 + Math.cos(angle) * (dist + 18 + Math.random() * 28),
      128 + Math.sin(angle) * (dist + 18 + Math.random() * 28)
    );
    spCtx.stroke();
  }
  const inkSplatterTex = new THREE.CanvasTexture(splatCanvas);
  inkSplatterTex.colorSpace = THREE.SRGBColorSpace;

  // 6. Sumi-e Calligraphy Brush Stroke Texture for 3D Slash Ribbons
  const slashCanvas = document.createElement('canvas');
  slashCanvas.width = 256;
  slashCanvas.height = 128;
  const slCtx = slashCanvas.getContext('2d')!;
  slCtx.clearRect(0, 0, 256, 128);
  for (let b = 0; b < 26; b++) {
    const yNorm = b / 25;
    const y = 14 + yNorm * 100;
    const alpha = Math.sin(yNorm * Math.PI) * (0.65 + (b % 3) * 0.12);
    slCtx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    slCtx.lineWidth = 2.2 + (b % 4) * 1.1;
    slCtx.beginPath();
    slCtx.moveTo(8, y);
    slCtx.lineTo(248 - (b % 7) * 8, y + (Math.random() - 0.5) * 4);
    slCtx.stroke();
  }
  const slashBrushTex = new THREE.CanvasTexture(slashCanvas);
  slashBrushTex.colorSpace = THREE.SRGBColorSpace;

  cachedTextures = {
    washiAlbedo,
    washiBump,
    washiNormal,
    washiRoughness,
    tamahaganeTex,
    toonGradient,
    contactShadowTex,
    inkSplatterTex,
    slashBrushTex,
  };
  return cachedTextures;
}

// ============================================================================
// CUSTOM GLSL KAMI-E & SUMI-E PBR SHADER PIPELINE (Sobel Normal + Roughness + Urushi Clearcoat)
// ============================================================================
export function createSumiWashiMaterial(
  colorHex: number,
  roughness: number,
  metalness: number,
  textures: ProceduralTextures,
  emissiveHex = 0x000000
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness,
    metalness,
    normalMap: textures.washiNormal,
    normalScale: new THREE.Vector2(2.2, 2.2),
    roughnessMap: textures.washiRoughness,
    bumpMap: textures.washiBump,
    bumpScale: 0.032,
    emissive: emissiveHex,
    emissiveIntensity: emissiveHex ? 0.55 : 0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // 1. 4-Band Ukiyo-e / Sumi-e Quantized Luminance Step Contrast
      float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      float stepFactor = lum < 0.14 ? 0.56 : (lum < 0.34 ? 0.82 : (lum < 0.66 ? 0.98 : 1.10));
      gl_FragColor.rgb *= stepFactor;

      // 2. Sumi-e Calligraphy Wet-Brush Rim Darkening (View-Space Silhouette Pooling)
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = abs(dot(normalize(vNormal), viewDir));
      float inkRim = smoothstep(0.18, 0.46, ndotv);
      gl_FragColor.rgb = mix(vec3(0.06, 0.045, 0.035), gl_FragColor.rgb, 0.32 + 0.68 * inkRim);

      // 3. Procedural Washi Paper Micro-Fiber Grain Modulation
      float fiberNoise = fract(sin(dot(gl_FragCoord.xy * 0.35, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor.rgb += (fiberNoise - 0.5) * 0.028;

      #include <dithering_fragment>
      `
    );
  };
  return mat;
}

export function createUrushiLacquerMaterial(
  colorHex: number,
  textures: ProceduralTextures,
  isTamahaganeBlade = false
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: isTamahaganeBlade ? 0xffffff : colorHex,
    map: isTamahaganeBlade ? textures.tamahaganeTex : null,
    vertexColors: isTamahaganeBlade,
    metalness: isTamahaganeBlade ? 0.94 : 0.45,
    roughness: isTamahaganeBlade ? 0.15 : 0.24,
    roughnessMap: textures.washiRoughness,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.95,
    normalMap: textures.washiNormal,
    normalScale: new THREE.Vector2(isTamahaganeBlade ? 1.25 : 2.2, isTamahaganeBlade ? 1.25 : 2.2),
    bumpMap: textures.washiBump,
    bumpScale: isTamahaganeBlade ? 0.012 : 0.026,
  });
}

// ============================================================================
// CUSTOM GLSL SUBSURFACE SCATTERING (SSS) WATER-TIGHT HUMAN SKIN SHADER
// I_skin = I_diffuse(N.L) + k_sss * smoothstep(-0.35, 0.65, N.L) * C_dermis + Specular_CookTorrance
// Strictly Opaque: transparent: false, opacity: 1.0, depthWrite: true, side: THREE.DoubleSide
// ============================================================================
export function createAnatomicalSSSMaterial(
  skinColorHex: number,
  sssDermisHex: number,
  weatheringSheen: number,
  hasIrezumiTattoo: boolean,
  textures: ProceduralTextures
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: skinColorHex,
    roughness: Math.max(0.22, 0.56 - weatheringSheen * 0.28),
    metalness: 0.04,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    side: THREE.DoubleSide,
    bumpMap: textures.washiBump,
    bumpScale: 0.008,
  });

  const dermisColor = new THREE.Color(sssDermisHex);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDermisColor = { value: new THREE.Vector3(dermisColor.r, dermisColor.g, dermisColor.b) };
    shader.uniforms.uHasIrezumi = { value: hasIrezumiTattoo ? 1.0 : 0.0 };
    shader.fragmentShader =
      `
      uniform vec3 uDermisColor;
      uniform float uHasIrezumi;
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        // Subsurface Scattering (SSS) Sub-Dermal Blood Diffusion Profile
        vec3 viewDir = normalize(vViewPosition);
        vec3 nDir = normalize(vNormal);
        vec3 keyLightDir = normalize(vec3(0.45, 0.75, 0.48));
        float ndotl = dot(nDir, keyLightDir);
        float sssWrap = smoothstep(-0.35, 0.65, ndotl);
        float backTranslucency = pow(clamp(1.0 - abs(dot(nDir, viewDir)), 0.0, 1.0), 2.2);
        vec3 sssContribution = (0.18 * sssWrap + 0.14 * backTranslucency) * uDermisColor;
        gl_FragColor.rgb += sssContribution;

        // Procedural Dragon & Koi Irezumi / War Paint Motif on Chest & Forearms
        if (uHasIrezumi > 0.5) {
          float tattooWave = sin(gl_FragCoord.x * 0.12 + sin(gl_FragCoord.y * 0.09) * 2.5);
          if (tattooWave > 0.72) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.08, 0.12, 0.22), 0.32);
          } else if (tattooWave < -0.82) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.72, 0.12, 0.12), 0.35);
          }
        }
        gl_FragColor.a = 1.0;
        #include <dithering_fragment>
        `
      );
  };
  return mat;
}

// Screen-Space Sobel / Laplacian Ink Outline & Washi Paper Overlay Post-Process Shader definition
export function createKamiSobelShaderDefinition(washiTex: THREE.Texture) {
  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      tWashi: { value: washiTex },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uInkStrength: { value: 0.65 },
      uPaperGrainStrength: { value: 0.06 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tWashi;
      uniform vec2 uResolution;
      uniform float uInkStrength;
      uniform float uPaperGrainStrength;
      varying vec2 vUv;

      float luma(vec3 c) {
        return dot(c, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec2 texel = 1.0 / max(uResolution, vec2(1.0));
        vec4 baseColor = texture2D(tDiffuse, vUv);

        // 3x3 Sobel Edge Kernel for Sumi-e Brush Outlines
        float tl = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0,  1.0)).rgb);
        float tm = luma(texture2D(tDiffuse, vUv + texel * vec2( 0.0,  1.0)).rgb);
        float tr = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0,  1.0)).rgb);
        float ml = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0,  0.0)).rgb);
        float mr = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0,  0.0)).rgb);
        float bl = luma(texture2D(tDiffuse, vUv + texel * vec2(-1.0, -1.0)).rgb);
        float bm = luma(texture2D(tDiffuse, vUv + texel * vec2( 0.0, -1.0)).rgb);
        float br = luma(texture2D(tDiffuse, vUv + texel * vec2( 1.0, -1.0)).rgb);

        float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
        float gy = -tl - 2.0 * tm - tr + bl + 2.0 * bm + br;
        float edge = clamp(sqrt(gx * gx + gy * gy) * 2.1, 0.0, 1.0);
        float inkEdge = smoothstep(0.22, 0.68, edge) * uInkStrength;

        // Washi Paper Fibrous Overlay
        vec3 paperSample = texture2D(tWashi, vUv * 4.5).rgb;
        vec3 paperTinted = mix(baseColor.rgb, baseColor.rgb * (0.90 + paperSample * 0.20), uPaperGrainStrength * 6.0);

        // Composite Sumi Ink Edge (#110d0a)
        vec3 sumiInk = vec3(0.067, 0.051, 0.039);
        vec3 finalRgb = mix(paperTinted, sumiInk, inkEdge);

        gl_FragColor = vec4(finalRgb, baseColor.a);
      }
    `,
  };
}

// Backface inverted-hull Sumi-e Ink Outline Material
const outlineMat = new THREE.MeshBasicMaterial({
  color: 0x110d0a,
  side: THREE.BackSide,
});

function addWithInkOutline(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  outlineThickness = 1.055
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const outline = new THREE.Mesh(geometry, outlineMat);
  outline.scale.setScalar(outlineThickness);
  mesh.add(outline);

  parent.add(mesh);
  return mesh;
}

// ============================================================================
// HIGH-SUBDIVISION PARAMETRIC GEOMETRY GENERATORS (Lathe, Extrude, Tube)
// ============================================================================
export function createSplineLatheGeometry(
  radiiAndHeights: [number, number][],
  radialSegments = 48,
  phiStart = 0,
  phiLength = Math.PI * 2
): THREE.LatheGeometry {
  const controlPts = radiiAndHeights.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  const spline = new THREE.SplineCurve(controlPts);
  const sampled = spline.getPoints(24);
  const geo = new THREE.LatheGeometry(sampled, radialSegments, phiStart, phiLength);
  geo.computeVertexNormals();
  return geo;
}

function createExtrudedCurvedBladeGeometry(
  length: number,
  baseWidth: number,
  tipWidth: number,
  soriCurvature: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const steps = 18;

  // Spine (Mune) curve from base (y=0) to Kissaki tip (y=length)
  shape.moveTo(-baseWidth * 0.5, 0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = t * length;
    const soriOffset = Math.pow(t, 1.85) * soriCurvature;
    const w = THREE.MathUtils.lerp(baseWidth, tipWidth, t);
    shape.lineTo(-w * 0.5 + soriOffset, y);
  }

  // Chisel Kissaki Tip apex
  const tipSori = soriCurvature * 1.08;
  shape.lineTo(tipWidth * 0.55 + tipSori, length + tipWidth * 1.45);

  // Cutting Edge (Ha) curve back down to Habaki collar
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const y = t * length;
    const soriOffset = Math.pow(t, 1.85) * soriCurvature;
    const w = THREE.MathUtils.lerp(baseWidth, tipWidth, t);
    shape.lineTo(w * 0.5 + soriOffset, y);
  }
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.45,
    bevelSize: baseWidth * 0.16,
    bevelSegments: 8,
  });
  // Center thickness on X and orient blade edge along +Z
  extrudeGeo.rotateY(Math.PI / 2);
  extrudeGeo.computeVertexNormals();
  return extrudeGeo;
}

function createOrnateTsubaGeometry(radius: number, thickness: number, isSquare = false): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (isSquare) {
    const r = radius * 0.92;
    shape.moveTo(-r, -r);
    shape.lineTo(r, -r);
    shape.lineTo(r, r);
    shape.lineTo(-r, r);
    shape.closePath();
  } else {
    // Lobed Mokko-gata four-petal samurai Tsuba silhouette
    const pts = 48;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const lobe = 1 - 0.08 * Math.pow(Math.sin(a * 2), 2);
      const x = Math.cos(a) * radius * lobe;
      const y = Math.sin(a) * radius * lobe;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createTubularPathGeometry(
  points: [number, number, number][],
  radius: number,
  tubularSegments = 48,
  radialSegments = 16
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// EXACT MATHEMATICAL PARAMETRIC SURFACES:
// 1. Unified 5-Vertex Shinogi-Zukuri Single-Edged Blade + Parabolic Sori Curve
//    y_curve(t) = S * t^2,  y_axis(t) = t * L   (t in [0, 1])
//    with Integrated Wavy Gunome-Midare Hamon Vertex Attributes (ZERO Split Edges!)
// 2. Fourier Harmonic Pleated Hakama Trousers Surface
// 3. Woven Bamboo Kasa Spiral Hat Surface
// 4. Hyperbolic Catenary Irimoya-Zukuri Castle/Pagoda Roof Surface
// ============================================================================
export function createShinogiZukuriBladeGeometry(
  length: number,
  motoWidth: number,
  soriMax: number,
  thickness = 0.018,
  zSegments = 48
): THREE.BufferGeometry {
  // Single Unified 5-Vertex Shinogi-Zukuri Pentagonal Cross-Section per slice t in [0, 1]:
  // v0: Blunt Back Spine (Mune)
  // v1: Right Shinogi Ridge (+X)
  // v2: Single Razor Cutting Edge (Ha) with Wavy Hamon Temper Line
  // v3: Left Shinogi Ridge (-X)
  // v4: Blunt Back Spine Closure (Mune, UV seam)
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= zSegments; i++) {
    const t = i / zSegments;
    const y = t * length;

    // Exact Single Parabolic Sori Curve: z_curve(t) = S * t^2
    const soriOffset = soriMax * (t * t);

    // Smooth taper from Moto-haba (base) to Saki-haba, converging to a single sharp Kissaki point at t = 1
    const kissakiTaper = t > 0.88 ? Math.max(0.008, 1.0 - (t - 0.88) / 0.12) : 1.0;
    const width = motoWidth * (1.0 - 0.28 * t) * kissakiTaper;
    const curThick = thickness * (1.0 - 0.34 * t) * kissakiTaper;
    const halfT = curThick * 0.5;

    // All 5 cross-section vertices share the EXACT same parabolic soriOffset
    const zMune = soriOffset - width * 0.5;
    const zShinogi = soriOffset - width * 0.08;
    const zHa = soriOffset + width * 0.5;

    // Wavy Gunome-Midare Hamon Martensite Temper Line Modulation along blade length
    const hamonWave = 0.92 + 0.08 * Math.sin(t * 44.0 + Math.cos(t * 19.0) * 1.5);

    // v0: Mune (blunt back spine — dark folded Jihada steel)
    positions.push(0, y, zMune);
    colors.push(0.42, 0.48, 0.56);
    uvs.push(t, 0.0);

    // v1: +X Shinogi ridge (polished steel ridge)
    positions.push(halfT, y, zShinogi);
    colors.push(0.76 * hamonWave, 0.81 * hamonWave, 0.88 * hamonWave);
    uvs.push(t, 0.38);

    // v2: Ha (single razor cutting edge — gleaming white martensite Hamon)
    positions.push(0, y, zHa);
    colors.push(1.0, 1.0, 1.0);
    uvs.push(t, 0.98);

    // v3: -X Shinogi ridge (polished steel ridge)
    positions.push(-halfT, y, zShinogi);
    colors.push(0.76 * hamonWave, 0.81 * hamonWave, 0.88 * hamonWave);
    uvs.push(t, 0.38);

    // v4: Mune closure (back spine UV wrap)
    positions.push(0, y, zMune);
    colors.push(0.42, 0.48, 0.56);
    uvs.push(t, 0.0);
  }

  const stride = 5;
  for (let i = 0; i < zSegments; i++) {
    const base = i * stride;
    const next = (i + 1) * stride;
    for (let k = 0; k < 4; k++) {
      indices.push(base + k, next + k, next + k + 1);
      indices.push(base + k, next + k + 1, base + k + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// BOTANICAL MULTI-BLADE CURVED GRASS CLUMP & SEGMENTED NODAL BAMBOO (ZERO CONES!)
// ============================================================================
export function createMultiBladeGrassClumpGeometry(bladeCount = 9): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const segsPerBlade = 5;
  let vertOffset = 0;

  for (let b = 0; b < bladeCount; b++) {
    const angle = (b / bladeCount) * Math.PI * 2 + (b % 3) * 0.22;
    const radiusOffset = (b % 2) * 0.08;
    const bx = Math.cos(angle) * radiusOffset;
    const bz = Math.sin(angle) * radiusOffset;
    const bladeHeight = 0.82 + (b % 4) * 0.16;
    const archDroop = 0.22 + (b % 3) * 0.09;
    const baseHalfWidth = 0.038;

    const dirX = Math.cos(angle + 0.15);
    const dirZ = Math.sin(angle + 0.15);
    const perpX = -dirZ;
    const perpZ = dirX;

    for (let s = 0; s <= segsPerBlade; s++) {
      const t = s / segsPerBlade;
      const y = bladeHeight * (t - 0.18 * t * t);
      const reach = archDroop * (t * t);
      const halfW = baseHalfWidth * (1.0 - 0.88 * Math.pow(t, 1.25));

      const cx = bx + dirX * reach;
      const cz = bz + dirZ * reach;

      // Root-to-tip botanical subsurface color gradient
      const rCol = THREE.MathUtils.lerp(0.14, 0.46, t);
      const gCol = THREE.MathUtils.lerp(0.28, 0.68, t);
      const bCol = THREE.MathUtils.lerp(0.11, 0.22, t);

      positions.push(cx - perpX * halfW, y, cz - perpZ * halfW);
      colors.push(rCol, gCol, bCol);
      uvs.push(0, t);

      positions.push(cx + perpX * halfW, y, cz + perpZ * halfW);
      colors.push(rCol, gCol, bCol);
      uvs.push(1, t);
    }

    for (let s = 0; s < segsPerBlade; s++) {
      const i0 = vertOffset + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
    vertOffset += (segsPerBlade + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createSegmentedBambooWithNodesGeometry(height = 8.4): THREE.BufferGeometry {
  // Multi-node Mosochiku Bamboo culm with raised nodal rings and slight organic curve
  return createSplineLatheGeometry(
    [
      [0.19, 0.0],
      [0.16, 0.25],
      [0.15, 1.35],
      [0.175, 1.42], // Nodal joint ring 1
      [0.145, 1.48],
      [0.14, 2.75],
      [0.168, 2.82], // Nodal joint ring 2
      [0.138, 2.88],
      [0.132, 4.25],
      [0.158, 4.32], // Nodal joint ring 3
      [0.128, 4.38],
      [0.12, 5.85],
      [0.145, 5.92], // Nodal joint ring 4
      [0.115, 5.98],
      [0.095, height * 0.92],
      [0.04, height],
    ],
    24
  );
}

export function createHarmonicHakamaGeometry(
  waistR: number,
  hemR: number,
  legHeight: number,
  radialSegments = 48,
  heightSegments = 24
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegments; iy++) {
    const v = iy / heightSegments;
    const y = -v * legHeight;
    for (let ix = 0; ix <= radialSegments; ix++) {
      const u = ix / radialSegments;
      const theta = u * Math.PI * 2;
      const r = evaluateFourierHakamaRadius(theta, v, waistR, hemR, 0.022, 0.008);
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < radialSegments; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = (iy + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createParametricWovenKasaGeometry(
  radius: number,
  height: number,
  radialSegments = 64,
  ringSegments = 24
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ir = 0; ir <= ringSegments; ir++) {
    const v = ir / ringSegments;
    const r = Math.max(0.005, v * radius);
    for (let it = 0; it <= radialSegments; it++) {
      const u = it / radialSegments;
      const theta = u * Math.PI * 2;
      const weave = 0.0035 * Math.sin(64 * theta) * Math.cos(40 * Math.PI * v);
      const y = height * (1 - Math.pow(v, 1.35)) + weave;
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let ir = 0; ir < ringSegments; ir++) {
    for (let it = 0; it < radialSegments; it++) {
      const a = ir * stride + it;
      const b = a + 1;
      const c = (ir + 1) * stride + it;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createIrimoyaPagodaRoofGeometry(
  lx: number,
  lz: number,
  roofHeight: number,
  gridX = 32,
  gridZ = 32
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iz = 0; iz <= gridZ; iz++) {
    const vz = iz / gridZ - 0.5;
    const z = vz * lz * 2;
    for (let ix = 0; ix <= gridX; ix++) {
      const vx = ix / gridX - 0.5;
      const x = vx * lx * 2;
      const nx = x / lx;
      const nz = z / lz;
      const y =
        roofHeight -
        0.42 * (Math.cosh(0.95 * nx) - 1) -
        0.42 * (Math.cosh(0.95 * nz) - 1) +
        0.28 * Math.pow(nx * nx * nz * nz, 1.5);
      positions.push(x, y, z);
    }
  }

  const stride = gridX + 1;
  for (let iz = 0; iz < gridZ; iz++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = iz * stride + ix;
      const b = a + 1;
      const c = (iz + 1) * stride + ix;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// HIGH-DETAIL PARAMETRIC 3D WEAPON MESH BUILDER (All 20 Authentic Weapons)
// Every single-edged Japanese blade uses ONE Unified Shinogi-Zukuri BufferGeometry
// swept along a single parabolic Sori curve y(t) = S * t^2 (ZERO Split Edges!)
// and defines explicit Two-Handed IK Grip Sockets (gripRightLocal & gripLeftLocal).
// ============================================================================
export function buildProceduralWeaponMesh(
  weapon: WeaponDef,
  textures: ProceduralTextures
): THREE.Group {
  const group = new THREE.Group();
  const bladeMat = createUrushiLacquerMaterial(weapon.bladeColor, textures, true);
  const hamonMat = createSumiWashiMaterial(0xffffff, 0.1, 0.98, textures, weapon.trailColor);
  const hiltMat = createSumiWashiMaterial(weapon.hiltColor, 0.68, 0.18, textures);
  const brassMat = createUrushiLacquerMaterial(0xfbbf24, textures, false);
  const ironMat = createUrushiLacquerMaterial(0x1f242d, textures, false);

  // Default Two-Handed Morote IK Grip Sockets along the Tsuka / Shaft
  let isTwoHanded = true;
  let gripRightLocal = { x: 0, y: 0.32, z: 0 };
  let gripLeftLocal = { x: 0, y: 0.06, z: 0 };

  switch (weapon.id) {
    case 'uchigatana':
    case 'tachi':
    case 'odachi':
    case 'wakizashi':
    case 'tanto': {
      const length =
        weapon.id === 'odachi'
          ? 2.28
          : weapon.id === 'tachi'
            ? 1.76
            : weapon.id === 'uchigatana'
              ? 1.48
              : weapon.id === 'wakizashi'
                ? 1.02
                : 0.68;
      const hiltLen =
        weapon.id === 'odachi'
          ? 0.62
          : weapon.id === 'tachi'
            ? 0.52
            : weapon.id === 'tanto'
              ? 0.24
              : 0.40;
      const sori =
        weapon.id === 'tachi'
          ? 0.20
          : weapon.id === 'odachi'
            ? 0.25
            : weapon.id === 'uchigatana'
              ? 0.14
              : 0.06;

      isTwoHanded = weapon.id !== 'tanto';
      gripRightLocal = { x: 0, y: hiltLen - 0.05, z: 0 };
      gripLeftLocal = { x: 0, y: 0.05, z: 0 };

      // Turned Lathed Tsuka Hilt + Kashira Pommel + Fuchi Collar (48 radial segments)
      const tsukaGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.042, 0.02],
          [0.035, hiltLen * 0.5],
          [0.040, hiltLen],
          [0.01, hiltLen + 0.01],
        ],
        48
      );
      addWithInkOutline(group, tsukaGeo, hiltMat, [0, 0, 0]);

      // Silk Tsuka-ito Diamond Cord Cross-Wraps along Hilt
      const wrapCount = weapon.id === 'odachi' ? 7 : weapon.id === 'tanto' ? 3 : 5;
      for (let w = 0; w < wrapCount; w++) {
        const wy = 0.05 + (w / Math.max(1, wrapCount - 1)) * (hiltLen - 0.10);
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(0.037, 0.0075, 10, 24),
          ironMat,
          [0, wy, 0],
          [Math.PI / 2 + (w % 2 === 0 ? 0.22 : -0.22), 0, 0]
        );
      }

      // Extruded Beveled Mokko-Gata Tsuba Handguard (`bevelSegments: 8`)
      const tsubaRadius = weapon.id === 'tanto' ? 0.058 : 0.108;
      const tsubaGeo = createOrnateTsubaGeometry(tsubaRadius, 0.020, false);
      addWithInkOutline(group, tsubaGeo, brassMat, [0, hiltLen + 0.01, 0]);

      // Brass Habaki Blade Collar (Lathed)
      const habakiGeo = createSplineLatheGeometry(
        [
          [0.036, 0],
          [0.042, 0.035],
          [0.038, 0.07],
        ],
        32
      );
      addWithInkOutline(group, habakiGeo, brassMat, [0, hiltLen + 0.01, 0]);

      // SINGLE UNIFIED 5-VERTEX SHINOGI-ZUKURI BLADE GEOMETRY (Zero secondary spine or detached Hamon!)
      const unifiedBladeGeo = createShinogiZukuriBladeGeometry(
        length,
        weapon.id === 'odachi' ? 0.086 : 0.074,
        sori,
        0.018,
        48
      );
      addWithInkOutline(group, unifiedBladeGeo, bladeMat, [0, hiltLen + 0.06, 0]);
      break;
    }

    case 'dual_ninjato': {
      isTwoHanded = false;
      gripRightLocal = { x: 0.17, y: 0.26, z: 0 };
      gripLeftLocal = { x: -0.15, y: 0.26, z: 0 };
      // Niten Ichi-Ryu Dual Wield (Curved Katana + Companion Wakizashi/Ninjato — Unified Shinogi-Zukuri)
      for (const [idx, side] of [-0.15, 0.17].entries()) {
        const isSecond = idx === 1;
        const bLen = isSecond ? 1.12 : 1.38;
        const sori = isSecond ? 0.04 : 0.12;
        const tsukaGeo = createSplineLatheGeometry(
          [
            [0.01, 0],
            [0.036, 0.02],
            [0.033, 0.18],
            [0.036, 0.35],
          ],
          36
        );
        addWithInkOutline(group, tsukaGeo, hiltMat, [side, 0, 0]);
        addWithInkOutline(
          group,
          createOrnateTsubaGeometry(0.092, 0.018, isSecond),
          brassMat,
          [side, 0.35, 0]
        );
        const bladeGeo = createShinogiZukuriBladeGeometry(bLen, 0.068, sori, 0.016, 40);
        addWithInkOutline(group, bladeGeo, bladeMat, [side, 0.36, 0]);
      }
      break;
    }

    case 'naginata': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.38, z: 0 };
      gripLeftLocal = { x: 0, y: 0.56, z: 0 };
      // Turned Oval Hardwood Shaft + Brass Ishizuki + Unified Shinogi-Zukuri Sweeping Glaive Blade
      const shaftGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.052, 0.08],
          [0.036, 0.22],
          [0.039, 1.2],
          [0.044, 2.06],
        ],
        48
      );
      addWithInkOutline(group, shaftGeo, hiltMat, [0, 0, 0]);
      for (const ringY of [0.18, 0.72, 1.38, 1.98]) {
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(0.044, 0.0085, 10, 28),
          brassMat,
          [0, ringY, 0],
          [Math.PI / 2, 0, 0]
        );
      }
      addWithInkOutline(
        group,
        createOrnateTsubaGeometry(0.086, 0.02, false),
        brassMat,
        [0, 2.06, 0]
      );
      const glaiveGeo = createShinogiZukuriBladeGeometry(1.06, 0.098, 0.22, 0.02, 44);
      addWithInkOutline(group, glaiveGeo, bladeMat, [0, 2.07, 0]);
      break;
    }

    case 'yari': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.48, z: 0 };
      gripLeftLocal = { x: 0, y: 0.62, z: 0 };
      // Jumonji Yari (2.35m Turned Shaft + Unified Spearhead + Crescent Cross-Blades)
      const shaftGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.05, 0.08],
          [0.038, 0.25],
          [0.04, 1.85],
          [0.048, 2.35],
        ],
        48
      );
      addWithInkOutline(group, shaftGeo, hiltMat, [0, 0, 0]);
      const centralBlade = createShinogiZukuriBladeGeometry(0.74, 0.082, 0.0, 0.022, 32);
      addWithInkOutline(group, centralBlade, bladeMat, [0, 2.34, 0]);
      const crescentGeo = createTubularPathGeometry(
        [
          [0, 2.66, -0.34],
          [0, 2.52, -0.18],
          [0, 2.46, 0],
          [0, 2.52, 0.18],
          [0, 2.66, 0.34],
        ],
        0.024,
        36,
        14
      );
      addWithInkOutline(group, crescentGeo, bladeMat, [0, 0, 0]);
      break;
    }

    case 'kanabo': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.52, z: 0 };
      gripLeftLocal = { x: 0, y: 0.12, z: 0 };
      // Tapered Iron-Studded Kanabo / Tetsubo War Club (Lathed Core + 48 Hemispherical Studs)
      const clubGeo = createSplineLatheGeometry(
        [
          [0.065, 0],
          [0.042, 0.08],
          [0.044, 0.52],
          [0.095, 0.62],
          [0.135, 1.35],
          [0.16, 2.02],
          [0.02, 2.12],
        ],
        32
      );
      addWithInkOutline(group, clubGeo, bladeMat, [0, 0, 0]);

      const studGeo = new THREE.SphereGeometry(0.034, 12, 12);
      for (let row = 0; row < 6; row++) {
        const y = 0.74 + row * 0.22;
        const r = 0.105 + row * 0.008;
        for (let c = 0; c < 8; c++) {
          const a = (c / 8) * Math.PI * 2 + (row % 2) * (Math.PI / 8);
          addWithInkOutline(
            group,
            studGeo,
            brassMat,
            [Math.cos(a) * r, y, Math.sin(a) * r],
            [0, 0, 0],
            [1, 1, 1],
            1.03
          );
        }
      }
      break;
    }

    case 'kusarigama': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.68, z: 0 };
      gripLeftLocal = { x: 0, y: 0.16, z: 0 };
      const handleGeo = createSplineLatheGeometry(
        [
          [0.046, 0],
          [0.038, 0.45],
          [0.052, 0.94],
        ],
        36
      );
      addWithInkOutline(group, handleGeo, hiltMat, [0, 0, 0]);

      const sickleGeo = createShinogiZukuriBladeGeometry(0.56, 0.078, 0.14, 0.018, 32);
      addWithInkOutline(
        group,
        sickleGeo,
        bladeMat,
        [0, 0.88, 0.04],
        [Math.PI * 0.46, 0, 0]
      );

      const chainGeo = createTubularPathGeometry(
        [
          [0, 0.04, 0],
          [0.08, -0.14, -0.14],
          [-0.06, -0.24, -0.32],
          [0.04, -0.18, -0.52],
        ],
        0.014,
        36,
        10
      );
      addWithInkOutline(group, chainGeo, ironMat, [0, 0, 0]);
      const fundoGeo = createSplineLatheGeometry(
        [
          [0.01, -0.12],
          [0.11, -0.04],
          [0.12, 0.04],
          [0.04, 0.11],
          [0.01, 0.13],
        ],
        24
      );
      addWithInkOutline(group, fundoGeo, brassMat, [0.04, -0.18, -0.54]);
      break;
    }

    case 'otsuchi': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.24, z: 0 };
      gripLeftLocal = { x: 0, y: 0.42, z: 0 };
      const shaftGeo = createSplineLatheGeometry(
        [
          [0.058, 0],
          [0.048, 0.3],
          [0.054, 1.5],
          [0.068, 2.02],
        ],
        40
      );
      addWithInkOutline(group, shaftGeo, hiltMat, [0, 0, 0]);

      const axeShape = new THREE.Shape();
      axeShape.moveTo(0, -0.18);
      axeShape.quadraticCurveTo(0.28, -0.24, 0.46, -0.44);
      axeShape.quadraticCurveTo(0.62, -0.05, 0.48, 0.34);
      axeShape.quadraticCurveTo(0.24, 0.18, 0, 0.14);
      axeShape.closePath();
      const axeGeo = new THREE.ExtrudeGeometry(axeShape, {
        steps: 1,
        depth: 0.036,
        bevelEnabled: true,
        bevelThickness: 0.014,
        bevelSize: 0.014,
        bevelSegments: 8,
      });
      axeGeo.rotateY(Math.PI / 2);
      axeGeo.computeVertexNormals();
      addWithInkOutline(group, axeGeo, bladeMat, [-0.018, 1.72, 0.04]);

      const pollGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.16, 0.04],
          [0.14, 0.28],
          [0.18, 0.38],
          [0.01, 0.42],
        ],
        32
      );
      addWithInkOutline(group, pollGeo, brassMat, [0, 1.74, -0.02], [-Math.PI / 2, 0, 0]);
      break;
    }

    case 'daikyu':
    case 'hankyu': {
      const h = weapon.id === 'daikyu' ? 2.24 : 1.45;
      isTwoHanded = true;
      gripLeftLocal = { x: 0, y: h * 0.38, z: 0.28 }; // Left hand holds bow Nigiri grip
      gripRightLocal = { x: 0, y: h * 0.38, z: -0.08 }; // Right hand draws Tsuru bowstring
      const bowCurveGeo = createTubularPathGeometry(
        [
          [0, -h * 0.32, -0.08],
          [0, -h * 0.14, 0.18],
          [0, 0.06, 0.28],
          [0, h * 0.34, 0.36],
          [0, h * 0.58, 0.14],
          [0, h * 0.68, -0.1],
        ],
        0.034,
        64,
        18
      );
      addWithInkOutline(group, bowCurveGeo, bladeMat, [0, h * 0.32, 0]);

      const gripGeo = createSplineLatheGeometry(
        [
          [0.042, -0.12],
          [0.046, 0],
          [0.042, 0.12],
        ],
        32
      );
      addWithInkOutline(group, gripGeo, hiltMat, [0, h * 0.38, 0.28]);

      const stringGeo = createTubularPathGeometry(
        [
          [0, 0.02, -0.08],
          [0, h * 0.5, -0.09],
          [0, h * 0.99, -0.1],
        ],
        0.007,
        24,
        8
      );
      addWithInkOutline(group, stringGeo, brassMat, [0, 0, 0]);

      const arrowGeo = createTubularPathGeometry(
        [
          [0, h * 0.38, -0.1],
          [0, h * 0.38, 0.78],
        ],
        0.012,
        16,
        10
      );
      addWithInkOutline(group, arrowGeo, hiltMat, [0, 0, 0]);
      const headGeo = createShinogiZukuriBladeGeometry(0.18, 0.052, 0, 0.012, 16);
      addWithInkOutline(
        group,
        headGeo,
        bladeMat,
        [0, h * 0.38, 0.76],
        [Math.PI / 2, 0, 0]
      );
      break;
    }

    case 'tanegashima': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.42, z: 0.04 };
      gripLeftLocal = { x: 0, y: 1.05, z: 0.04 };
      const stockShape = new THREE.Shape();
      stockShape.moveTo(0, 0);
      stockShape.lineTo(0.16, 0.06);
      stockShape.lineTo(0.12, 0.65);
      stockShape.lineTo(0.09, 1.55);
      stockShape.lineTo(0.01, 1.55);
      stockShape.lineTo(0.02, 0.52);
      stockShape.lineTo(-0.08, 0.14);
      stockShape.closePath();

      const stockGeo = new THREE.ExtrudeGeometry(stockShape, {
        steps: 1,
        depth: 0.075,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 8,
      });
      stockGeo.rotateY(Math.PI / 2);
      stockGeo.computeVertexNormals();
      addWithInkOutline(group, stockGeo, hiltMat, [-0.037, 0.05, -0.04]);

      const barrelGeo = createSplineLatheGeometry(
        [
          [0.052, 0.45],
          [0.046, 1.25],
          [0.042, 1.88],
          [0.064, 1.98],
          [0.025, 2.0],
        ],
        32
      );
      addWithInkOutline(group, barrelGeo, bladeMat, [0, 0, 0.04]);

      for (const by of [0.65, 1.12, 1.58]) {
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(0.054, 0.011, 10, 24),
          brassMat,
          [0, by, 0.02],
          [Math.PI / 2, 0, 0]
        );
      }
      const serpGeo = createTubularPathGeometry(
        [
          [0.05, 0.52, 0.02],
          [0.07, 0.62, 0.08],
          [0.04, 0.68, 0.05],
        ],
        0.014,
        24,
        10
      );
      addWithInkOutline(group, serpGeo, brassMat, [0, 0, 0]);
      break;
    }

    case 'fukiya':
    case 'fukiya_stealth': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.28, z: 0 };
      gripLeftLocal = { x: 0, y: 0.72, z: 0 };
      const pipeGeo = createSplineLatheGeometry(
        [
          [0.062, 0],
          [0.04, 0.14],
          [0.036, 0.85],
          [0.034, 1.52],
          [0.044, 1.58],
        ],
        40
      );
      addWithInkOutline(group, pipeGeo, bladeMat, [0, 0, 0]);
      for (const ny of [0.42, 0.86, 1.28]) {
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(0.04, 0.009, 10, 24),
          brassMat,
          [0, ny, 0],
          [Math.PI / 2, 0, 0]
        );
      }
      break;
    }

    case 'zanbato':
    case 'muramasa_cursed': {
      const isZanbato = weapon.id === 'zanbato';
      const hiltLen = isZanbato ? 0.78 : 0.44;
      const bladeLen = isZanbato ? 2.25 : 1.72;
      const sori = isZanbato ? 0.18 : 0.22;
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: hiltLen - 0.06, z: 0 };
      gripLeftLocal = { x: 0, y: 0.06, z: 0 };

      const tsukaGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.052, 0.03],
          [0.044, hiltLen * 0.5],
          [0.05, hiltLen],
        ],
        48
      );
      addWithInkOutline(group, tsukaGeo, hiltMat, [0, 0, 0]);
      addWithInkOutline(group, createOrnateTsubaGeometry(0.13, 0.024, false), brassMat, [0, hiltLen, 0]);
      const shinogiGeo = createShinogiZukuriBladeGeometry(
        bladeLen,
        isZanbato ? 0.115 : 0.084,
        sori,
        isZanbato ? 0.024 : 0.018,
        48
      );
      addWithInkOutline(group, shinogiGeo, bladeMat, [0, hiltLen + 0.02, 0]);
      break;
    }

    case 'chigiriki': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.05, z: 0 };
      gripLeftLocal = { x: 0, y: 0.35, z: 0 };
      const staffGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.042, 0.08],
          [0.038, 1.5],
          [0.046, 1.54],
        ],
        36
      );
      addWithInkOutline(group, staffGeo, hiltMat, [0, 0, 0]);
      const chainGeo = createTubularPathGeometry(
        [
          [0, 1.54, 0],
          [0.18, 1.78, 0.22],
          [0.32, 1.42, 0.52],
          [0.38, 1.05, 0.68],
        ],
        0.014,
        32,
        10
      );
      addWithInkOutline(group, chainGeo, ironMat, [0, 0, 0]);
      const ballGeo = createSplineLatheGeometry(
        [
          [0.01, -0.14],
          [0.14, 0],
          [0.01, 0.14],
        ],
        32
      );
      addWithInkOutline(group, ballGeo, bladeMat, [0.38, 1.02, 0.68]);
      break;
    }

    case 'tekko_kagi': {
      isTwoHanded = false;
      gripRightLocal = { x: 0.14, y: 0.14, z: 0 };
      gripLeftLocal = { x: -0.14, y: 0.14, z: 0 };
      for (const side of [-0.14, 0.14]) {
        const braceGeo = createSplineLatheGeometry(
          [
            [0.068, 0],
            [0.058, 0.28],
          ],
          28
        );
        addWithInkOutline(group, braceGeo, hiltMat, [side, 0, 0]);
        for (let c = -2; c <= 2; c++) {
          const clawGeo = createShinogiZukuriBladeGeometry(0.42, 0.024, 0.06, 0.008, 18);
          addWithInkOutline(group, clawGeo, bladeMat, [side + c * 0.025, 0.28, 0.02]);
        }
      }
      break;
    }

    case 'shakujo': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.26, z: 0 };
      gripLeftLocal = { x: 0, y: 0.48, z: 0 };
      const shaftGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.042, 0.1],
          [0.038, 1.85],
          [0.052, 1.9],
        ],
        40
      );
      addWithInkOutline(group, shaftGeo, hiltMat, [0, 0, 0]);
      addWithInkOutline(group, new THREE.TorusGeometry(0.18, 0.022, 14, 36), brassMat, [0, 2.08, 0]);
      for (let r = 0; r < 6; r++) {
        const ang = (r / 6) * Math.PI * 2;
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(0.055, 0.009, 10, 20),
          brassMat,
          [Math.cos(ang) * 0.16, 2.08 + Math.sin(ang) * 0.12, 0],
          [0, Math.PI / 2, 0]
        );
      }
      break;
    }

    case 'urumi_whip': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.30, z: 0 };
      gripLeftLocal = { x: 0, y: 0.06, z: 0 };
      const tsukaGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.042, 0.36],
        ],
        36
      );
      addWithInkOutline(group, tsukaGeo, hiltMat, [0, 0, 0]);
      addWithInkOutline(group, createOrnateTsubaGeometry(0.11, 0.02, false), brassMat, [0, 0.36, 0]);
      const wireGeo = createTubularPathGeometry(
        [
          [0, 0.38, 0],
          [0.12, 0.95, 0.18],
          [-0.14, 1.55, 0.36],
          [0.18, 2.15, 0.52],
          [0, 2.75, 0.68],
        ],
        0.011,
        48,
        10
      );
      addWithInkOutline(group, wireGeo, hamonMat, [0, 0, 0]);
      for (let s = 0; s < 12; s++) {
        const t = s / 11;
        const segGeo = createShinogiZukuriBladeGeometry(0.18, 0.068, 0.01, 0.014, 12);
        addWithInkOutline(
          group,
          segGeo,
          bladeMat,
          [Math.sin(t * Math.PI * 3) * 0.14, 0.42 + t * 2.25, t * 0.64]
        );
      }
      break;
    }

    case 'twin_sai': {
      isTwoHanded = false;
      gripRightLocal = { x: 0.14, y: 0.12, z: 0 };
      gripLeftLocal = { x: -0.14, y: 0.12, z: 0 };
      for (const side of [-0.14, 0.14]) {
        const shaftGeo = createSplineLatheGeometry(
          [
            [0.032, 0],
            [0.028, 0.18],
            [0.022, 0.68],
            [0.002, 0.78],
          ],
          24
        );
        addWithInkOutline(group, shaftGeo, bladeMat, [side, 0, 0]);
        const yokuGeo = createTubularPathGeometry(
          [
            [side, 0.32, -0.14],
            [side, 0.2, 0],
            [side, 0.32, 0.14],
          ],
          0.016,
          24,
          10
        );
        addWithInkOutline(group, yokuGeo, brassMat, [0, 0, 0]);
      }
      break;
    }

    case 'bo_staff':
    case 'sasumata': {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 1.32, z: 0 };
      gripLeftLocal = { x: 0, y: 0.54, z: 0 };
      const staffGeo = createSplineLatheGeometry(
        [
          [0.01, 0],
          [0.038, 0.08],
          [0.036, 2.05],
          [0.042, 2.12],
        ],
        32
      );
      addWithInkOutline(group, staffGeo, hiltMat, [0, 0, 0]);
      if (weapon.id === 'sasumata') {
        const forkGeo = createTubularPathGeometry(
          [
            [0, 2.42, -0.24],
            [0, 2.1, 0],
            [0, 2.42, 0.24],
          ],
          0.024,
          32,
          12
        );
        addWithInkOutline(group, forkGeo, bladeMat, [0, 0, 0]);
      } else {
        for (const fy of [0.06, 2.06]) {
          addWithInkOutline(
            group,
            new THREE.TorusGeometry(0.04, 0.01, 10, 24),
            brassMat,
            [0, fy, 0],
            [Math.PI / 2, 0, 0]
          );
        }
      }
      break;
    }

    case 'tonfa': {
      isTwoHanded = false;
      gripRightLocal = { x: 0.15, y: 0.08, z: -0.12 };
      gripLeftLocal = { x: -0.15, y: 0.08, z: -0.12 };
      for (const side of [-0.15, 0.15]) {
        const batonGeo = createSplineLatheGeometry(
          [
            [0.036, -0.18],
            [0.032, 0.56],
            [0.04, 0.6],
          ],
          28
        );
        addWithInkOutline(group, batonGeo, bladeMat, [side, 0, 0]);
        const gripGeo = createSplineLatheGeometry(
          [
            [0.028, 0],
            [0.032, 0.14],
          ],
          24
        );
        addWithInkOutline(group, gripGeo, brassMat, [side, 0.08, -0.12], [Math.PI / 2, 0, 0]);
      }
      break;
    }

    case 'hiya_zutsu':
    case 'bajozutsu': {
      const isCannon = weapon.id === 'hiya_zutsu';
      isTwoHanded = isCannon;
      gripRightLocal = { x: 0, y: 0.22, z: 0 };
      gripLeftLocal = { x: 0, y: isCannon ? 0.72 : 0.12, z: 0 };
      const barrelGeo = createSplineLatheGeometry(
        isCannon
          ? [
              [0.08, 0],
              [0.11, 0.25],
              [0.095, 1.15],
              [0.125, 1.25],
            ]
          : [
              [0.04, 0],
              [0.038, 0.58],
              [0.046, 0.64],
            ],
        36
      );
      addWithInkOutline(group, barrelGeo, bladeMat, [0, 0, 0]);
      for (const by of isCannon ? [0.22, 0.62, 1.02] : [0.18, 0.46]) {
        addWithInkOutline(
          group,
          new THREE.TorusGeometry(isCannon ? 0.105 : 0.042, 0.014, 10, 28),
          brassMat,
          [0, by, 0],
          [Math.PI / 2, 0, 0]
        );
      }
      break;
    }

    case 'tessen':
    case 'onmyoji_scroll': {
      isTwoHanded = false;
      gripRightLocal = { x: 0, y: 0.14, z: 0 };
      gripLeftLocal = { x: -0.12, y: 0.18, z: 0 };
      const fanShape = new THREE.Shape();
      fanShape.moveTo(0, 0);
      fanShape.absarc(0, 0, 0.52, Math.PI * 0.15, Math.PI * 0.85, false);
      fanShape.closePath();
      const fanGeo = new THREE.ExtrudeGeometry(fanShape, {
        steps: 1,
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 8,
      });
      addWithInkOutline(group, fanGeo, bladeMat, [0, 0.18, 0], [0, Math.PI / 2, 0]);
      addWithInkOutline(
        group,
        new THREE.TorusGeometry(0.14, 0.018, 12, 28),
        hamonMat,
        [0, 0.45, 0],
        [0, Math.PI / 2, 0]
      );
      break;
    }

    default: {
      isTwoHanded = true;
      gripRightLocal = { x: 0, y: 0.34, z: 0 };
      gripLeftLocal = { x: 0, y: 0.06, z: 0 };
      const bladeGeo = createShinogiZukuriBladeGeometry(1.48, 0.074, 0.14, 0.018, 48);
      addWithInkOutline(group, bladeGeo, bladeMat, [0, 0.38, 0]);
      break;
    }
  }

  group.userData.isTwoHanded = isTwoHanded;
  group.userData.gripRightLocal = gripRightLocal;
  group.userData.gripLeftLocal = gripLeftLocal;

  return group;
}

// ============================================================================
// COMPOSITE ARTICULATED SAMURAI HERO MODEL
// 100% Opaque Watertight Anatomical Human Body + SSS Shader + 3D Face Customizer
// ============================================================================
export interface SamuraiRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  torsoGroup: THREE.Group;
  skinBodyGroup: THREE.Group;
  armorGroup: THREE.Group;
  headGroup: THREE.Group;
  faceFeaturesGroup: THREE.Group;
  hairGroup: THREE.Group;
  helmetGroup: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  rightForearm: THREE.Group;
  leftForearm: THREE.Group;
  weaponMount: THREE.Group;
  leftEyelid?: THREE.Mesh;
  rightEyelid?: THREE.Mesh;
  capeMesh?: THREE.Mesh;
}

export function createSamuraiHeroRig(
  weapon: WeaponDef,
  armor: ArmorDef,
  helmet: HelmetDef,
  textures: ProceduralTextures,
  appearance: CharacterAppearanceConfig = DEFAULT_CHARACTER_APPEARANCE
): SamuraiRig {
  const root = new THREE.Group();

  // Contact shadow disc flush with ground (y = 0.015)
  const shadowGeo = new THREE.CircleGeometry(0.98, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowTex,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.21, 0.76, 0);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.21, 0.76, 0);
  bodyPivot.add(rightLeg);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.76, 0);
  bodyPivot.add(torsoGroup);

  const skinBodyGroup = new THREE.Group();
  torsoGroup.add(skinBodyGroup);

  const armorGroup = new THREE.Group();
  torsoGroup.add(armorGroup);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.92, 0);
  torsoGroup.add(headGroup);

  const faceFeaturesGroup = new THREE.Group();
  headGroup.add(faceFeaturesGroup);

  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  const helmetGroup = new THREE.Group();
  headGroup.add(helmetGroup);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 0.76, 0.06);
  torsoGroup.add(leftArm);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -0.28, 0);
  leftArm.add(leftForearm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.36, 0.76, 0.06);
  torsoGroup.add(rightArm);

  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -0.28, 0);
  rightArm.add(rightForearm);

  // Two-Handed Morote Weapon Mount poised in Chudan-no-kamae in front of torso
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.05, 0.36, 0.44);
  weaponMount.rotation.set(Math.PI * 0.24, -0.12, -0.14);
  torsoGroup.add(weaponMount);

  const rig: SamuraiRig = {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    torsoGroup,
    skinBodyGroup,
    armorGroup,
    headGroup,
    faceFeaturesGroup,
    hairGroup,
    helmetGroup,
    rightArm,
    leftArm,
    rightForearm,
    leftForearm,
    weaponMount,
  };

  updateSamuraiEquipmentVisuals(rig, weapon, armor, helmet, textures, appearance);
  return rig;
}

export function updateSamuraiEquipmentVisuals(
  rig: SamuraiRig,
  weapon: WeaponDef,
  armor: ArmorDef,
  helmet: HelmetDef,
  textures: ProceduralTextures,
  appearance: CharacterAppearanceConfig = DEFAULT_CHARACTER_APPEARANCE
) {
  for (const grp of [
    rig.skinBodyGroup,
    rig.armorGroup,
    rig.faceFeaturesGroup,
    rig.hairGroup,
    rig.helmetGroup,
    rig.leftLeg,
    rig.rightLeg,
    rig.leftForearm,
    rig.rightForearm,
  ]) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }
  for (let i = rig.leftArm.children.length - 1; i >= 0; i--) {
    if (rig.leftArm.children[i] !== rig.leftForearm) {
      rig.leftArm.remove(rig.leftArm.children[i]);
    }
  }
  for (let i = rig.rightArm.children.length - 1; i >= 0; i--) {
    if (rig.rightArm.children[i] !== rig.rightForearm && rig.rightArm.children[i] !== rig.weaponMount) {
      rig.rightArm.remove(rig.rightArm.children[i]);
    }
  }
  while (rig.weaponMount.children.length > 0) {
    rig.weaponMount.remove(rig.weaponMount.children[0]);
  }

  // Apply Overall Body Height & Muscularity Scaling
  const heightRatio = appearance.bodyHeightMeters / 1.78;
  const musc = appearance.muscularity;
  rig.bodyPivot.scale.set(musc, heightRatio, musc);

  // 1. Subsurface Scattering (SSS) Watertight Opaque Human Skin Material
  const skinDef =
    SKIN_COMPLEXIONS.find((s) => s.id === appearance.skinComplexion) || SKIN_COMPLEXIONS[1];
  const skinMat = createAnatomicalSSSMaterial(
    skinDef.colorHex,
    skinDef.sssDermisHex,
    appearance.weatheringSheen,
    appearance.tattooOrPaint !== 'none',
    textures
  );
  const faceSkinMat = createAnatomicalSSSMaterial(
    skinDef.colorHex,
    skinDef.sssDermisHex,
    appearance.weatheringSheen,
    appearance.tattooOrPaint === 'kabuki_kumadori' || appearance.tattooOrPaint === 'oni_demon_jaw',
    textures
  );
  const sandalMat = createSumiWashiMaterial(0x9a7b56, 0.74, 0.1, textures);
  const ironGreaveMat = createUrushiLacquerMaterial(0x27272a, textures, false);

  // ==========================================================================
  // A. SOLID WATERTIGHT ANATOMICAL TORSO, PECTORALS, CLAVICLES & NECK
  // Continuous from Pelvis (y=-0.08) through Chest (y=0.78) to Neck/Chin (y=1.04)
  // ==========================================================================
  const anatomicalTorsoNeckGeo = createSplineLatheGeometry(
    [
      [0.24, -0.08], // Pelvis & Hips
      [0.26, 0.12], // Waist & Abdominals
      [0.31, 0.45], // Ribcage & Serratus
      [0.34, 0.72], // Pectorals & Deltoid Bridge
      [0.22, 0.84], // Clavicle & Trapezius Slope
      [0.125, 0.92], // Sternocleidomastoid Neck Base
      [0.115, 1.04], // Upper Neck into Cranium
      [0.01, 1.06],
    ],
    48
  );
  addWithInkOutline(rig.skinBodyGroup, anatomicalTorsoNeckGeo, faceSkinMat, [0, 0, 0]);

  // Sculpted Pectoral & Clavicle Muscle Relief Ridges
  for (const side of [-1, 1]) {
    const clavicleGeo = createTubularPathGeometry(
      [
        [side * 0.04, 0.81, 0.22],
        [side * 0.22, 0.83, 0.19],
        [side * 0.38, 0.8, 0.06],
      ],
      0.032,
      20,
      12
    );
    addWithInkOutline(rig.skinBodyGroup, clavicleGeo, faceSkinMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);
  }

  // ==========================================================================
  // B. SOLID ANATOMICAL LEGS, CALVES, ANKLES, FEET + FOURIER PLEATED HAKAMA
  // ==========================================================================
  const solidLegSkinGeo = createSplineLatheGeometry(
    [
      [0.075, -0.72], // Ankle
      [0.11, -0.48], // Gastrocnemius Calf Muscle
      [0.098, -0.34], // Knee Joint
      [0.155, -0.14], // Quadriceps Thigh
      [0.165, 0.04], // Hip Socket
    ],
    36
  );
  const hakamaLegGeo = createHarmonicHakamaGeometry(0.18, 0.25, 0.46, 48, 20);
  const suneateGeo = createSplineLatheGeometry(
    [
      [0.095, -0.64],
      [0.118, -0.46],
      [0.125, -0.3],
    ],
    36
  );
  const footSkinGeo = createExtrudedCurvedBladeGeometry(0.26, 0.13, 0.11, 0.005, 0.055);
  const sandalSoleGeo = createExtrudedCurvedBladeGeometry(0.28, 0.16, 0.13, 0.01, 0.035);

  const primaryMat =
    armor.silhouetteType === 'oyoroi' || armor.silhouetteType === 'domaru' || armor.silhouetteType === 'crimson_ghost'
      ? createUrushiLacquerMaterial(armor.primaryColor, textures, false)
      : createSumiWashiMaterial(armor.primaryColor, 0.62, 0.18, textures);
  const secondaryMat = createSumiWashiMaterial(armor.secondaryColor, 0.52, 0.24, textures);
  const accentMat = createUrushiLacquerMaterial(armor.accentColor, textures, false);

  for (const legGrp of [rig.leftLeg, rig.rightLeg]) {
    // 1. Solid continuous anatomical leg skin (thigh -> knee -> calf -> ankle)
    addWithInkOutline(legGrp, solidLegSkinGeo, skinMat, [0, 0, 0]);
    // 2. Sculpted anatomical foot skin + Waraji straw sandal sole & crimson thongs
    addWithInkOutline(legGrp, footSkinGeo, skinMat, [-0.03, -0.68, -0.06], [Math.PI / 2, 0, 0]);
    addWithInkOutline(legGrp, sandalSoleGeo, sandalMat, [-0.035, -0.72, -0.08], [Math.PI / 2, 0, 0]);
    // 3. Mathematical Fourier 7-Pleat Hakama Trousers
    addWithInkOutline(legGrp, hakamaLegGeo, secondaryMat, [0, 0.02, 0]);
    // 4. 3-Hinged Suneate Shin Greaves
    addWithInkOutline(legGrp, suneateGeo, ironGreaveMat, [0, 0, 0]);
  }

  // ==========================================================================
  // C. ARTICULATED 2-BONE ARMS (UPPER ARM + FOREARM/KOTE GAUNTLET + 5-FINGER HAND)
  // Built along -Y so Two-Bone Analytical IK (`applyMoroteDualHandWeaponIK`)
  // locks BOTH left and right hands firmly onto the weapon's Tsuka handle!
  // ==========================================================================
  const upperArmSkinGeo = createSplineLatheGeometry(
    [
      [0.068, -0.29], // Elbow joint
      [0.094, -0.14], // Bicep / Tricep
      [0.108, 0.04],  // Deltoid Shoulder Cap
    ],
    32
  );
  const upperSleeveGeo = createSplineLatheGeometry(
    [
      [0.102, -0.26],
      [0.125, -0.1],
      [0.134, 0.03],
    ],
    32
  );
  const forearmSkinGeo = createSplineLatheGeometry(
    [
      [0.052, -0.25], // Wrist
      [0.076, -0.12], // Forearm Muscle
      [0.07, 0.02],   // Elbow Socket
    ],
    32
  );
  const koteGauntletGeo = createSplineLatheGeometry(
    [
      [0.068, -0.23], // Armored Wrist Cuff
      [0.088, -0.11], // Kote Splint Plate
      [0.084, 0.0],
    ],
    32
  );
  const palmGeo = createSplineLatheGeometry(
    [
      [0.012, -0.32],
      [0.058, -0.28],
      [0.054, -0.23],
    ],
    24
  );

  for (const [armIdx, pair] of (
    [
      [rig.leftArm, rig.leftForearm],
      [rig.rightArm, rig.rightForearm],
    ] as [THREE.Group, THREE.Group][]
  ).entries()) {
    const [upperGrp, forearmGrp] = pair;
    const isLeft = armIdx === 0;
    // Upper arm skin & Kosode sleeve
    addWithInkOutline(upperGrp, upperArmSkinGeo, skinMat, [0, 0, 0]);
    const slipLeftSleeve = isLeft && armor.silhouetteType === 'haori';
    if (!slipLeftSleeve) {
      addWithInkOutline(upperGrp, upperSleeveGeo, primaryMat, [0, 0, 0]);
    }

    // Forearm skin, armored Kote gauntlet, palm & 5 curled fingers gripping Tsuka
    addWithInkOutline(forearmGrp, forearmSkinGeo, skinMat, [0, 0, 0]);
    addWithInkOutline(forearmGrp, koteGauntletGeo, ironGreaveMat, [0, 0, 0]);
    addWithInkOutline(forearmGrp, palmGeo, faceSkinMat, [0, 0, 0.015]);

    for (let f = 0; f < 5; f++) {
      const fOffset = (f - 2) * 0.017;
      const isThumb = f === 0;
      const fingerGeo = createTubularPathGeometry(
        isThumb
          ? [
              [0.034, -0.25, 0.025],
              [0.05, -0.27, 0.065],
              [0.026, -0.28, 0.095],
            ]
          : [
              [fOffset, -0.27, 0.035],
              [fOffset, -0.3, 0.078],
              [fOffset * 0.8, -0.28, 0.115],
            ],
        0.011,
        14,
        8
      );
      addWithInkOutline(forearmGrp, fingerGeo, faceSkinMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);
    }
  }

  // ==========================================================================
  // D. HIGH-POLY SCULPTED CRANIUM, FACE, JAW, EYES, EARS, HAIR & SCARS (64x64)
  // ==========================================================================
  const jw = appearance.jawWidth;
  const cb = appearance.cheekboneProminence;
  const cl = appearance.chinLength;

  const craniumGeo = createSplineLatheGeometry(
    [
      [0.095, -0.02], // Neck Insertion
      [0.125 * cl, 0.04], // Chin & Mandible Tip
      [0.185 * jw, 0.11], // Jawline Angle (Gonion)
      [0.215 * cb, 0.19], // Zygomatic Cheekbones
      [0.21, 0.28], // Brow Ridge & Temples
      [0.185, 0.38], // Parietal Cranium
      [0.09, 0.44], // Crown
      [0.01, 0.46],
    ],
    64
  );
  addWithInkOutline(rig.faceFeaturesGroup, craniumGeo, faceSkinMat, [0, 0, 0]);

  // Sculpted 3D Nose Bridge & Tip
  const nb = appearance.noseBridgeHeight;
  const noseGeo = createTubularPathGeometry(
    [
      [0, 0.25, 0.195],
      [0, 0.19, 0.235 * nb],
      [0, 0.16, 0.215 * nb],
    ],
    0.024,
    18,
    12
  );
  addWithInkOutline(rig.faceFeaturesGroup, noseGeo, faceSkinMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);

  // Sculpted Brow Ridge, Lips & 3D Left/Right Ears
  const browMat = createSumiWashiMaterial(appearance.hairColorHex, 0.65, 0.1, textures);
  for (const side of [-1, 1]) {
    // Supraorbital Brow Ridge
    const browGeo = createTubularPathGeometry(
      [
        [side * 0.025, 0.255, 0.205],
        [side * 0.075, 0.265 + side * appearance.browAngle * 0.04, 0.198],
        [side * 0.115, 0.25, 0.175],
      ],
      0.014,
      16,
      10
    );
    addWithInkOutline(rig.faceFeaturesGroup, browGeo, browMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);

    // Sculpted 3D Auricle Ear (Helix + Lobule)
    const earGeo = createTubularPathGeometry(
      [
        [side * 0.205 * cb, 0.23, 0.02],
        [side * 0.225 * cb, 0.2, -0.01],
        [side * 0.205 * cb, 0.15, 0.01],
      ],
      0.022,
      16,
      10
    );
    addWithInkOutline(rig.faceFeaturesGroup, earGeo, faceSkinMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);
  }

  // Sculpted Upper & Lower Lips
  const lipMat = createSumiWashiMaterial(0xb86b5a, 0.48, 0.08, textures);
  const lipGeo = createTubularPathGeometry(
    [
      [-0.045, 0.115, 0.192],
      [0, 0.118, 0.206],
      [0.045, 0.115, 0.192],
    ],
    0.013,
    16,
    10
  );
  addWithInkOutline(rig.faceFeaturesGroup, lipGeo, lipMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.01);

  // Recessed Wet-Specular Eyeballs (Sclera + Left/Right Heterochromia Colored Iris + Pupil + Blinking Eyelids)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.08, metalness: 0.05 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090807 });
  const leftIrisDef = EYE_IRIS_COLORS.find((c) => c.id === appearance.leftEyeColor) || EYE_IRIS_COLORS[0];
  const rightIrisDef = EYE_IRIS_COLORS.find((c) => c.id === appearance.rightEyeColor) || EYE_IRIS_COLORS[0];

  const eyeBallGeo = createSplineLatheGeometry(
    [
      [0.002, -0.026],
      [0.026 * appearance.eyeSizeTilt, 0],
      [0.002, 0.026],
    ],
    24
  );
  const irisGeo = new THREE.CircleGeometry(0.015 * appearance.eyeSizeTilt, 20);
  const pupilGeo = new THREE.CircleGeometry(0.007 * appearance.eyeSizeTilt, 16);
  const eyelidGeo = createSplineLatheGeometry(
    [
      [0.004, 0],
      [0.029 * appearance.eyeSizeTilt, 0.014],
      [0.004, 0.028],
    ],
    24,
    -Math.PI * 0.5,
    Math.PI
  );

  for (const side of [-1, 1]) {
    const ex = side * 0.068;
    const ey = 0.218;
    const ez = 0.188;
    const eyeball = new THREE.Mesh(eyeBallGeo, scleraMat);
    eyeball.position.set(ex, ey, ez);
    rig.faceFeaturesGroup.add(eyeball);

    const irisMat = new THREE.MeshStandardMaterial({
      color: side < 0 ? leftIrisDef.colorHex : rightIrisDef.colorHex,
      roughness: 0.12,
      metalness: 0.2,
    });
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(ex, ey, ez + 0.025);
    rig.faceFeaturesGroup.add(iris);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(ex, ey, ez + 0.0265);
    rig.faceFeaturesGroup.add(pupil);

    const lid = new THREE.Mesh(eyelidGeo, faceSkinMat);
    lid.position.set(ex, ey + 0.004, ez + 0.002);
    lid.scale.set(1, 0.15, 1); // Open by default; scales Y to 1.0 when blinking every 3.5s
    rig.faceFeaturesGroup.add(lid);
    if (side < 0) rig.leftEyelid = lid;
    else rig.rightEyelid = lid;
  }

  // Facial Hair (Beards & Mustaches)
  if (appearance.facialHair !== 'clean_shaven') {
    for (const side of [-1, 1]) {
      const mustacheGeo = createTubularPathGeometry(
        [
          [side * 0.01, 0.138, 0.21],
          [side * 0.055, 0.132, 0.198],
          [side * 0.095, 0.112, 0.175],
        ],
        0.012,
        16,
        10
      );
      addWithInkOutline(rig.faceFeaturesGroup, mustacheGeo, browMat, [0, 0, 0]);
    }
    if (appearance.facialHair === 'full_ronin_beard' || appearance.facialHair === 'braided_chin_beard') {
      const beardGeo = createSplineLatheGeometry(
        [
          [0.02, -0.06],
          [0.11, 0.02],
          [0.16 * jw, 0.1],
        ],
        32,
        -Math.PI * 0.45,
        Math.PI * 0.9
      );
      addWithInkOutline(rig.faceFeaturesGroup, beardGeo, browMat, [0, 0, 0.04]);
    }
  }

  // Scars & Date Masamune Iron Eyepatch (Gantai)
  if (appearance.scarOrEyepatch === 'masamune_eyepatch') {
    const patchMat = createUrushiLacquerMaterial(0x18181b, textures, false);
    const patchDisc = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), patchMat);
    patchDisc.position.set(0.068, 0.218, 0.215);
    rig.faceFeaturesGroup.add(patchDisc);
    const cordGeo = new THREE.TorusGeometry(0.205, 0.008, 8, 36);
    const cordMesh = new THREE.Mesh(cordGeo, patchMat);
    cordMesh.position.set(0, 0.22, 0);
    cordMesh.rotation.set(Math.PI / 2, 0.22, 0);
    rig.faceFeaturesGroup.add(cordMesh);
  } else if (appearance.scarOrEyepatch !== 'none') {
    const scarMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const scarA = createTubularPathGeometry(
      [
        [-0.095, 0.19, 0.185],
        [-0.055, 0.13, 0.198],
      ],
      0.005,
      12,
      8
    );
    rig.faceFeaturesGroup.add(new THREE.Mesh(scarA, scarMat));
    if (appearance.scarOrEyepatch === 'kenshin_cross_scar') {
      const scarB = createTubularPathGeometry(
        [
          [-0.095, 0.14, 0.188],
          [-0.05, 0.185, 0.195],
        ],
        0.005,
        12,
        8
      );
      rig.faceFeaturesGroup.add(new THREE.Mesh(scarB, scarMat));
    }
  }

  // ==========================================================================
  // E. 10 PROCEDURAL 3D HAIRSTYLES WITH REAL-TIME WIND SWAY
  // ==========================================================================
  const hairColor =
    appearance.hairstyle === 'flowing_white_kitsune'
      ? 0xf8fafc
      : appearance.hairstyle === 'silver_streaked_veteran'
        ? 0x94a3b8
        : appearance.hairColorHex;
  const hairMat = createSumiWashiMaterial(hairColor, 0.55, 0.18, textures);

  if (appearance.hairstyle !== 'shaved_sohei_monk') {
    // Base cranial hair cap
    const hairCapGeo = createSplineLatheGeometry(
      [
        [0.215, 0.22],
        [0.22, 0.34],
        [0.15, 0.43],
        [0.01, 0.47],
      ],
      40,
      Math.PI * 0.25,
      Math.PI * 1.5
    );
    addWithInkOutline(rig.hairGroup, hairCapGeo, hairMat, [0, 0, 0]);
  }

  if (appearance.hairstyle === 'chonmage' || appearance.hairstyle === 'top_bun_sidelocks') {
    const chonmageGeo = createTubularPathGeometry(
      [
        [0, 0.42, -0.08],
        [0, 0.5, -0.02],
        [0, 0.51, 0.1],
      ],
      0.048,
      24,
      12
    );
    addWithInkOutline(rig.hairGroup, chonmageGeo, hairMat, [0, 0, 0]);
  } else if (appearance.hairstyle === 'twintail_kunoichi') {
    for (const side of [-1, 1]) {
      const tailGeo = createTubularPathGeometry(
        [
          [side * 0.16, 0.38, -0.12],
          [side * 0.28, 0.24, -0.26],
          [side * 0.32, -0.05, -0.34],
        ],
        0.045,
        28,
        12
      );
      addWithInkOutline(rig.hairGroup, tailGeo, hairMat, [0, 0, 0]);
    }
  } else if (appearance.hairstyle !== 'shaved_sohei_monk') {
    // Flowing Ronin Mane / High Bushido Ponytail / White Kitsune Locks
    const strandCount = appearance.hairstyle === 'high_bushido_ponytail' ? 3 : 5;
    for (let s = 0; s < strandCount; s++) {
      const sx = (s - (strandCount - 1) * 0.5) * 0.065;
      const maneGeo = createTubularPathGeometry(
        [
          [sx * 0.6, 0.42, -0.12],
          [sx, 0.28, -0.28],
          [sx * 1.3, 0.02, -0.36],
          [sx * 1.5, -0.24, -0.42],
        ],
        0.046,
        28,
        12
      );
      addWithInkOutline(rig.hairGroup, maneGeo, hairMat, [0, 0, 0]);
    }
  }

  // ==========================================================================
  // F. 12 COMPLETE MIX-AND-MATCH OUTFITS & MODULAR ARMOR SETS
  // ==========================================================================
  const doCuirassGeo = createSplineLatheGeometry(
    [
      [0.32, 0.02],
      [0.3, 0.24],
      [0.36, 0.56],
      [0.38, 0.82],
      [0.26, 0.88],
    ],
    48
  );
  addWithInkOutline(rig.armorGroup, doCuirassGeo, primaryMat, [0, 0, 0]);

  for (const oy of [0.22, 0.42, 0.62, 0.78]) {
    addWithInkOutline(
      rig.armorGroup,
      new THREE.TorusGeometry(0.345, 0.014, 10, 36),
      accentMat,
      [0, oy, 0],
      [Math.PI / 2, 0, 0]
    );
  }

  // Obi Waist Sash + Curved Daisho Saya Scabbards at Left Hip
  addWithInkOutline(
    rig.armorGroup,
    new THREE.TorusGeometry(0.33, 0.048, 12, 36),
    accentMat,
    [0, 0.12, 0],
    [Math.PI / 2, 0, 0]
  );
  const sayaGeo = createTubularPathGeometry(
    [
      [-0.34, 0.28, 0.35],
      [-0.36, 0.12, -0.05],
      [-0.38, -0.02, -0.58],
    ],
    0.026,
    32,
    14
  );
  addWithInkOutline(rig.armorGroup, sayaGeo, secondaryMat, [0, 0, 0]);

  // 7-Panel Flared Kusazuri Tassets hanging from Waist
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const tassetGeo = createSplineLatheGeometry(
      [
        [0.38, -0.22],
        [0.35, -0.08],
        [0.32, 0.04],
      ],
      16,
      a - 0.34,
      0.68
    );
    addWithInkOutline(
      rig.armorGroup,
      tassetGeo,
      k % 2 === 0 ? primaryMat : secondaryMat,
      [0, 0.04, 0]
    );
  }

  // Outfit-Specific Signature Silhouettes (12 Outfits)
  if (
    armor.silhouetteType === 'oyoroi' ||
    armor.silhouetteType === 'domaru' ||
    armor.silhouetteType === 'oni_berserker'
  ) {
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 5; tier++) {
        const sodeArcGeo = createSplineLatheGeometry(
          [
            [0.44 + tier * 0.01, 0.82 - tier * 0.075],
            [0.46 + tier * 0.01, 0.87 - tier * 0.075],
          ],
          24,
          side > 0 ? -0.55 : Math.PI - 0.55,
          1.1
        );
        addWithInkOutline(
          rig.armorGroup,
          sodeArcGeo,
          tier % 2 === 0 ? primaryMat : accentMat,
          [0, 0, 0]
        );
      }
    }
  } else if (
    armor.silhouetteType === 'crimson_ghost' ||
    armor.silhouetteType === 'snow_wolf'
  ) {
    // Flowing 1.8m Verlet Silk Cape / Wolf-Fur Mantle on Back
    const capeGeo = createHarmonicHakamaGeometry(0.28, 0.62, 1.35, 32, 18);
    const capeMesh = addWithInkOutline(
      rig.armorGroup,
      capeGeo,
      accentMat,
      [0, 0.84, -0.22],
      [0.24, 0, 0]
    );
    rig.capeMesh = capeMesh;
  } else if (armor.silhouetteType === 'kitsune_mystic' || armor.silhouetteType === 'origami') {
    // 6 Orbiting Sacred Paper Ofuda Talismans around Shoulders
    for (let t = 0; t < 6; t++) {
      const ang = (t / 6) * Math.PI * 2;
      const ofudaGeo = createExtrudedCurvedBladeGeometry(0.26, 0.08, 0.08, 0.02, 0.008);
      addWithInkOutline(
        rig.armorGroup,
        ofudaGeo,
        accentMat,
        [Math.cos(ang) * 0.62, 0.72 + Math.sin(ang * 2) * 0.08, Math.sin(ang) * 0.62],
        [0, -ang, 0.18]
      );
    }
  } else if (armor.silhouetteType === 'komuso_monk' || armor.silhouetteType === 'tengu_hermit') {
    // 36 Individual 3D Carved Wooden Juzu Prayer Beads around Neck & Chest
    for (let b = 0; b < 36; b++) {
      const ang = (b / 36) * Math.PI * 2;
      const beadGeo = new THREE.SphereGeometry(0.024, 12, 10);
      addWithInkOutline(
        rig.armorGroup,
        beadGeo,
        accentMat,
        [Math.cos(ang) * 0.31, 0.82 - Math.cos(ang) * 0.08, Math.sin(ang) * 0.31]
      );
    }
  } else {
    // Flowing Haori / Kamishimo Winged Collar
    addWithInkOutline(
      rig.armorGroup,
      new THREE.TorusGeometry(0.29, 0.075, 14, 36),
      accentMat,
      [0, 0.84, 0],
      [Math.PI / 2, 0, 0]
    );
  }

  // ==========================================================================
  // G. MODULAR KABUTO HELMET, WOVEN KASA, MENPO MASK & MAEDATE CREST
  // ==========================================================================
  if (!appearance.hideHelmetInGameplay) {
    const helmMat = createUrushiLacquerMaterial(helmet.primaryColor, textures, false);
    const crestMat = createUrushiLacquerMaterial(helmet.crestColor, textures, false);

    if (helmet.styleType === 'kasa') {
      // Exact Mathematical Woven Bamboo Kasa Spiral Surface
      const kasaGeo = createParametricWovenKasaGeometry(0.78, 0.34, 64, 24);
      addWithInkOutline(rig.helmetGroup, kasaGeo, helmMat, [0, 0.28, 0]);
    } else {
      const domeGeo = createSplineLatheGeometry(
        [
          [0.25, 0.22],
          [0.27, 0.32],
          [0.21, 0.44],
          [0.08, 0.5],
          [0.01, 0.52],
        ],
        64
      );
      addWithInkOutline(rig.helmetGroup, domeGeo, helmMat, [0, 0, 0]);

      for (let t = 0; t < 5; t++) {
        const shikoroTierGeo = createSplineLatheGeometry(
          [
            [0.29 + t * 0.03, 0.22 - t * 0.035],
            [0.27 + t * 0.026, 0.25 - t * 0.035],
          ],
          48,
          Math.PI * 0.33,
          Math.PI * 1.34
        );
        addWithInkOutline(
          rig.helmetGroup,
          shikoroTierGeo,
          t % 2 === 0 ? helmMat : crestMat,
          [0, 0, 0]
        );
      }
    }

    if (helmet.maedateType === 'crescent_moon') {
      const moonShape = new THREE.Shape();
      moonShape.absarc(0, 0, 0.28, -Math.PI * 0.15, Math.PI * 1.15, false);
      moonShape.absarc(0, 0.09, 0.24, Math.PI * 1.12, -Math.PI * 0.12, true);
      moonShape.closePath();
      const moonGeo = new THREE.ExtrudeGeometry(moonShape, {
        steps: 1,
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 8,
      });
      addWithInkOutline(rig.helmetGroup, moonGeo, crestMat, [0, 0.42, 0.25]);
    } else if (helmet.maedateType === 'stag_antlers') {
      for (const side of [-1, 1]) {
        const mainBranch = createTubularPathGeometry(
          [
            [side * 0.06, 0.36, 0.24],
            [side * 0.22, 0.52, 0.22],
            [side * 0.32, 0.74, 0.16],
            [side * 0.26, 0.92, 0.24],
          ],
          0.022,
          36,
          12
        );
        addWithInkOutline(rig.helmetGroup, mainBranch, crestMat, [0, 0, 0]);
      }
    } else if (helmet.maedateType === 'oni_horns') {
      for (const side of [-1, 1]) {
        const hornGeo = createTubularPathGeometry(
          [
            [side * 0.14, 0.36, 0.18],
            [side * 0.28, 0.56, 0.24],
            [side * 0.22, 0.84, 0.12],
          ],
          0.044,
          36,
          16
        );
        addWithInkOutline(rig.helmetGroup, hornGeo, crestMat, [0, 0, 0]);
      }
    } else {
      const dragonCoilGeo = createTubularPathGeometry(
        [
          [-0.18, 0.38, 0.24],
          [-0.08, 0.54, 0.28],
          [0.08, 0.46, 0.3],
          [0.18, 0.64, 0.26],
          [0.0, 0.76, 0.32],
        ],
        0.024,
        48,
        14
      );
      addWithInkOutline(rig.helmetGroup, dragonCoilGeo, crestMat, [0, 0, 0]);
    }
  }

  // Mount Equipped 3D Weapon
  const weaponMesh = buildProceduralWeaponMesh(weapon, textures);
  rig.weaponMount.add(weaponMesh);
}

// ============================================================================
// HIGH-SUBDIVISION ENEMY & BOSS MESH BUILDER
// ============================================================================
export function createEnemyMeshRig(
  def: EnemyArchetypeDef | BossDef,
  isBoss: boolean,
  textures: ProceduralTextures,
  sampleWeapon: WeaponDef
): {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  weaponArm: THREE.Group;
  telegraphRing: THREE.Mesh;
} {
  const root = new THREE.Group();
  const s = def.scale;

  // Contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.98 * s, 28),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowTex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  // Dynamic Color-Coded Windup Telegraph Ring on ground
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.82 * s, 1.22 * s, 40),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.032;
  root.add(telegraphRing);

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(s);
  root.add(bodyPivot);

  const primaryMat = createUrushiLacquerMaterial(def.primaryColor, textures, false);
  const accentMat = createUrushiLacquerMaterial(def.accentColor, textures, false);
  const skinMat = createSumiWashiMaterial(0xd6bfa6, 0.62, 0.05, textures);

  // Lathed Articulated Legs
  const legGeo = createSplineLatheGeometry(
    [
      [0.11, 0],
      [0.15, 0.36],
      [0.21, 0.72],
    ],
    32
  );
  addWithInkOutline(bodyPivot, legGeo, primaryMat, [-0.2, 0, 0]);
  addWithInkOutline(bodyPivot, legGeo, primaryMat, [0.2, 0, 0]);

  // Lathed Armored Cuirass & Kusazuri Skirt
  const torsoGeo = createSplineLatheGeometry(
    [
      [0.46, 0.62],
      [0.32, 0.86],
      [0.39, 1.38],
      [0.28, 1.62],
    ],
    40
  );
  addWithInkOutline(bodyPivot, torsoGeo, primaryMat, [0, 0, 0]);

  // Curved Sode Shoulder Plates
  for (const side of [-1, 1]) {
    const sodeGeo = createSplineLatheGeometry(
      [
        [0.44, 1.22],
        [0.48, 1.54],
      ],
      24,
      side > 0 ? -0.55 : Math.PI - 0.55,
      1.1
    );
    addWithInkOutline(bodyPivot, sodeGeo, accentMat, [0, 0, 0]);
  }

  // Head & War Helm
  const headGeo = createSplineLatheGeometry(
    [
      [0.12, 1.62],
      [0.24, 1.82],
      [0.16, 2.02],
      [0.01, 2.06],
    ],
    32
  );
  addWithInkOutline(bodyPivot, headGeo, skinMat, [0, 0, 0]);

  if (isBoss) {
    // Boss Ornate Suji-Kabuto + Curved Demon Horns + Sashimono War Banner
    const bossHelmGeo = createSplineLatheGeometry(
      [
        [0.48, 1.86],
        [0.32, 2.04],
        [0.02, 2.18],
      ],
      48
    );
    addWithInkOutline(bodyPivot, bossHelmGeo, accentMat, [0, 0, 0]);
    for (const side of [-1, 1]) {
      const hornGeo = createTubularPathGeometry(
        [
          [side * 0.16, 2.02, 0.12],
          [side * 0.34, 2.28, 0.16],
          [side * 0.26, 2.58, 0.08],
        ],
        0.045,
        32,
        14
      );
      addWithInkOutline(bodyPivot, hornGeo, accentMat, [0, 0, 0]);
    }
    // Sashimono War Banner on Back
    const poleGeo = createTubularPathGeometry(
      [
        [0, 1.3, -0.34],
        [0, 2.95, -0.36],
      ],
      0.024,
      20,
      10
    );
    addWithInkOutline(bodyPivot, poleGeo, accentMat, [0, 0, 0]);
    const bannerGeo = createExtrudedCurvedBladeGeometry(0.88, 0.48, 0.46, 0.04, 0.024);
    addWithInkOutline(bodyPivot, bannerGeo, accentMat, [0, 2.02, -0.38], [0, Math.PI / 2, 0]);
  } else {
    // Lathed Ashigaru Jingasa / Kabuto
    const jingasaGeo = createSplineLatheGeometry(
      [
        [0.52, 1.88],
        [0.28, 2.02],
        [0.02, 2.12],
      ],
      40
    );
    addWithInkOutline(bodyPivot, jingasaGeo, accentMat, [0, 0, 0]);
  }

  // Elite Archetype-Specific 3D Silhouettes (Wings, Warhorse, Ofuda, Mawashi, Gears)
  const archId = !isBoss ? (def as EnemyArchetypeDef).id : '';
  if (archId === 'tengu_crow_warrior') {
    // Articulated 3D Feathered Crow Wings + Crimson Tengu Long-Nose Mask
    const beakGeo = createSplineLatheGeometry(
      [
        [0.055, 0],
        [0.035, 0.22],
        [0.005, 0.42],
      ],
      18
    );
    addWithInkOutline(bodyPivot, beakGeo, accentMat, [0, 1.82, 0.22], [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      for (let f = 0; f < 5; f++) {
        const wingFeatherGeo = createExtrudedCurvedBladeGeometry(
          1.15 - f * 0.14,
          0.16,
          0.03,
          0.09,
          0.024
        );
        addWithInkOutline(
          bodyPivot,
          wingFeatherGeo,
          primaryMat,
          [side * (0.28 + f * 0.12), 1.48 - f * 0.08, -0.26],
          [0.25, side * (0.65 + f * 0.14), side * 0.35]
        );
      }
    }
  } else if (archId === 'onmyoji_sorcerer') {
    // 6 Orbiting Paper Ofuda Talismans + Tall Eboshi Court Hat
    const eboshiGeo = createSplineLatheGeometry(
      [
        [0.22, 2.0],
        [0.18, 2.38],
        [0.04, 2.62],
      ],
      28
    );
    addWithInkOutline(bodyPivot, eboshiGeo, primaryMat, [0, 0, 0]);
    for (let t = 0; t < 6; t++) {
      const a = (t / 6) * Math.PI * 2;
      const ofudaGeo = createExtrudedCurvedBladeGeometry(0.28, 0.09, 0.09, 0.02, 0.01);
      addWithInkOutline(
        bodyPivot,
        ofudaGeo,
        accentMat,
        [Math.cos(a) * 0.78, 1.38 + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.78],
        [0, -a, 0.18]
      );
    }
  } else if (archId === 'osumo_juggernaut') {
    // Massive Braided Hemp Mawashi Loincloth & Spiked Pauldrons
    addWithInkOutline(
      bodyPivot,
      new THREE.TorusGeometry(0.46, 0.095, 16, 36),
      accentMat,
      [0, 0.78, 0],
      [Math.PI / 2, 0, 0]
    );
  } else if (archId === 'takeda_cavalry') {
    // 3D Armored Kiso-Uma Warhorse Mount underneath the Samurai Rider
    const horseMat = createSumiWashiMaterial(0x451a03, 0.68, 0.12, textures);
    const horseBarrelGeo = createSplineLatheGeometry(
      [
        [0.05, -0.85],
        [0.38, -0.62],
        [0.44, 0.0],
        [0.39, 0.65],
        [0.08, 0.88],
      ],
      36
    );
    addWithInkOutline(bodyPivot, horseBarrelGeo, horseMat, [0, 0.72, 0], [Math.PI / 2, 0, 0]);
    const horseNeckHeadGeo = createTubularPathGeometry(
      [
        [0, 0.82, 0.62],
        [0, 1.38, 0.92],
        [0, 1.24, 1.26],
      ],
      0.21,
      24,
      16
    );
    addWithInkOutline(bodyPivot, horseNeckHeadGeo, horseMat, [0, 0, 0]);
    // 4 Sculpted Warhorse Legs
    for (const [lx, lz] of [
      [-0.28, 0.56],
      [0.28, 0.56],
      [-0.28, -0.56],
      [0.28, -0.56],
    ]) {
      const hLegGeo = createSplineLatheGeometry(
        [
          [0.08, 0],
          [0.09, 0.42],
          [0.13, 0.76],
        ],
        20
      );
      addWithInkOutline(bodyPivot, hLegGeo, horseMat, [lx, 0, lz]);
    }
    // Takeda Sashimono War Banner on Horse Back
    const bannerGeo = createExtrudedCurvedBladeGeometry(0.76, 0.42, 0.4, 0.03, 0.02);
    addWithInkOutline(bodyPivot, bannerGeo, accentMat, [0, 2.15, -0.45], [0, Math.PI / 2, 0]);
  } else if (archId === 'karakuri_automata') {
    // Interlocking Brass Clockwork Mainspring Gears on Back
    for (const [gx, gy] of [
      [-0.24, 1.38],
      [0.24, 1.22],
    ]) {
      addWithInkOutline(
        bodyPivot,
        new THREE.TorusGeometry(0.24, 0.038, 12, 24),
        accentMat,
        [gx, gy, -0.34]
      );
    }
  }

  // Two-Handed Enemy Weapon Arms (Right Lead Arm + Left Support Arm reaching across to Tsuka hilt)
  const weaponArm = new THREE.Group();
  weaponArm.position.set(0.28, 1.38, 0.22);
  const armGeo = createSplineLatheGeometry(
    [
      [0.075, -0.46],
      [0.105, -0.22],
      [0.115, 0],
    ],
    28
  );
  addWithInkOutline(weaponArm, armGeo, primaryMat, [0, 0, 0], [0.42, 0, -0.32]);

  // Left support arm reaching across chest to grip lower Tsuka handle (Morote grip)
  const leftSupportArmGeo = createTubularPathGeometry(
    [
      [-0.64, 0.02, -0.14],
      [-0.38, -0.22, 0.12],
      [-0.08, -0.34, 0.24],
    ],
    0.088,
    20,
    14
  );
  addWithInkOutline(weaponArm, leftSupportArmGeo, primaryMat, [0, 0, 0]);

  const wMesh = buildProceduralWeaponMesh(sampleWeapon, textures);
  wMesh.position.set(-0.08, -0.38, 0.26);
  wMesh.rotation.set(Math.PI * 0.28, -0.15, -0.18);
  weaponArm.add(wMesh);

  bodyPivot.add(weaponArm);

  return { root, bodyPivot, weaponArm, telegraphRing };
}

// ============================================================================
// TWO-HANDED MOROTE ANALYTICAL 2-BONE IK WEAPON SOLVER
// Locks BOTH Right Hand (below Tsuba) and Left Hand (near Kashira / Shaft)
// onto the weapon handle across Idle, Locomotion, Parry, and all 6 Combat Moves
// in 3rd-Person RPG, 1st-Person FPV, and Isometric Camera Modes.
// ============================================================================
const _ikDownAxis = new THREE.Vector3(0, -1, 0);
const _ikShoulderR = new THREE.Vector3();
const _ikShoulderL = new THREE.Vector3();
const _ikTargetR = new THREE.Vector3();
const _ikTargetL = new THREE.Vector3();
const _ikElbowR = new THREE.Vector3();
const _ikElbowL = new THREE.Vector3();
const _ikDirUpper = new THREE.Vector3();
const _ikDirFore = new THREE.Vector3();
const _ikQuatUpperInv = new THREE.Quaternion();
const _ikWeaponQuat = new THREE.Quaternion();

function solveTwoBoneIKVec3(
  shoulder: THREE.Vector3,
  target: THREE.Vector3,
  poleOffset: THREE.Vector3,
  lenUpper: number,
  lenForearm: number,
  outElbow: THREE.Vector3
): void {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const dz = target.z - shoulder.z;
  const rawDist = Math.hypot(dx, dy, dz);
  const maxReach = (lenUpper + lenForearm) * 0.992;
  const minReach = Math.abs(lenUpper - lenForearm) + 0.02;
  const d = Math.max(minReach, Math.min(maxReach, rawDist));

  const invRaw = rawDist > 1e-5 ? 1 / rawDist : 0;
  const fx = dx * invRaw;
  const fy = dy * invRaw;
  const fz = dz * invRaw;

  const cosAlpha = Math.max(
    -1,
    Math.min(1, (lenUpper * lenUpper + d * d - lenForearm * lenForearm) / (2 * lenUpper * d))
  );
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  // Gram-Schmidt orthogonalization of poleOffset against forward axis f
  const dotPF = poleOffset.x * fx + poleOffset.y * fy + poleOffset.z * fz;
  let px = poleOffset.x - fx * dotPF;
  let py = poleOffset.y - fy * dotPF;
  let pz = poleOffset.z - fz * dotPF;
  const pLen = Math.hypot(px, py, pz);
  if (pLen > 1e-5) {
    px /= pLen;
    py /= pLen;
    pz /= pLen;
  } else {
    px = 0;
    py = -1;
    pz = 0;
  }

  outElbow.set(
    shoulder.x + (fx * cosAlpha + px * sinAlpha) * lenUpper,
    shoulder.y + (fy * cosAlpha + py * sinAlpha) * lenUpper,
    shoulder.z + (fz * cosAlpha + pz * sinAlpha) * lenUpper
  );
}

function orientTwoBoneArmChain(
  upperArm: THREE.Group,
  forearm: THREE.Group,
  shoulder: THREE.Vector3,
  elbow: THREE.Vector3,
  handTarget: THREE.Vector3
): void {
  _ikDirUpper.subVectors(elbow, shoulder);
  if (_ikDirUpper.lengthSq() > 1e-6) {
    _ikDirUpper.normalize();
  } else {
    _ikDirUpper.set(0, -1, 0);
  }
  upperArm.quaternion.setFromUnitVectors(_ikDownAxis, _ikDirUpper);

  // Transform forearm direction into upperArm's local coordinate frame
  _ikDirFore.subVectors(handTarget, elbow);
  if (_ikDirFore.lengthSq() > 1e-6) {
    _ikDirFore.normalize();
  } else {
    _ikDirFore.set(0, -1, 0);
  }
  _ikQuatUpperInv.copy(upperArm.quaternion).invert();
  _ikDirFore.applyQuaternion(_ikQuatUpperInv).normalize();
  forearm.quaternion.setFromUnitVectors(_ikDownAxis, _ikDirFore);
}

export function applyMoroteDualHandWeaponIK(
  rig: SamuraiRig,
  params: {
    isParrying: boolean;
    isAttacking: boolean;
    activeMoveId?: number;
    swingProgress: number;
    gaitSwing: number;
    breathTime: number;
    cameraMode: 'third_person_rpg' | 'first_person_fpv' | 'isometric_tactical';
  }
): { rightHandTorsoPos: { x: number; y: number; z: number }; leftHandTorsoPos: { x: number; y: number; z: number } } {
  const isFPV = params.cameraMode === 'first_person_fpv';
  // Strictly hide head, helmet, hair, cape, torso, and legs in 1st-person mode so they NEVER clip into camera
  rig.headGroup.visible = !isFPV;
  rig.helmetGroup.visible = !isFPV;
  rig.hairGroup.visible = !isFPV;
  if (rig.capeMesh) {
    rig.capeMesh.visible = !isFPV;
  }
  rig.torsoGroup.visible = !isFPV;
  rig.skinBodyGroup.visible = !isFPV;
  rig.armorGroup.visible = !isFPV;
  rig.leftLeg.visible = !isFPV;
  rig.rightLeg.visible = !isFPV;

  const weaponGroup = rig.weaponMount.children[0] as THREE.Group | undefined;
  const gripRightLocal: { x: number; y: number; z: number } = weaponGroup?.userData?.gripRightLocal || {
    x: 0,
    y: 0.34,
    z: 0,
  };
  const gripLeftLocal: { x: number; y: number; z: number } = weaponGroup?.userData?.gripLeftLocal || {
    x: 0,
    y: 0.06,
    z: 0,
  };

  // 1. Compute target pose of `weaponMount` in `torsoGroup` space
  const breathBob = Math.sin(params.breathTime * 2.6) * 0.014;
  const walkSwayX = params.gaitSwing * 0.035;
  const walkSwayY = Math.abs(params.gaitSwing) * 0.022;

  // Default Chudan-no-kamae (Middle Two-Handed Samurai Guard in front-right of torso, blade angled 45° up-forward)
  let wx = (isFPV ? -0.16 : -0.24) + walkSwayX;
  let wy = (isFPV ? 0.38 : 0.36) + breathBob - walkSwayY;
  let wz = isFPV ? 0.68 : 0.42;

  let rx = isFPV ? 0.46 : 0.48;
  let ry = (isFPV ? 0.18 : 0.16) + params.gaitSwing * 0.05;
  let rz = isFPV ? 0.14 : 0.18;

  if (params.isParrying) {
    // Two-Handed Diagonal Kasumi / Takigawa Parry Barrier across chest & face
    wx = 0.04;
    wy = isFPV ? 0.54 : 0.56;
    wz = isFPV ? 0.66 : 0.48;
    rx = 0.28;
    ry = 0.46;
    rz = -0.82;
  } else if (params.isAttacking) {
    const p = Math.max(0, Math.min(1, params.swingProgress));
    // Smooth S-curve whip acceleration through the slash apex
    const s = p * p * (3 - 2 * p);
    const moveId = params.activeMoveId || 1;

    switch (moveId) {
      case 1: // Kesagiri: High-Right Jodan to Low-Left Diagonal Cleave
        wx = THREE.MathUtils.lerp(0.22, -0.26, s);
        wy = THREE.MathUtils.lerp(isFPV ? 0.78 : 0.68, isFPV ? 0.36 : 0.18, s);
        wz = THREE.MathUtils.lerp(0.34, 0.56, Math.sin(p * Math.PI));
        rx = THREE.MathUtils.lerp(-0.38, 1.48, s);
        ry = THREE.MathUtils.lerp(-0.65, 0.72, s);
        rz = THREE.MathUtils.lerp(-0.55, 0.62, s);
        break;
      case 2: // Kiriage: Low-Left Wakigamae to High-Right Rising Diagonal Slash
        wx = THREE.MathUtils.lerp(-0.24, 0.24, s);
        wy = THREE.MathUtils.lerp(isFPV ? 0.34 : 0.16, isFPV ? 0.8 : 0.72, s);
        wz = THREE.MathUtils.lerp(0.36, 0.58, Math.sin(p * Math.PI));
        rx = THREE.MathUtils.lerp(1.42, -0.32, s);
        ry = THREE.MathUtils.lerp(0.68, -0.68, s);
        rz = THREE.MathUtils.lerp(0.58, -0.58, s);
        break;
      case 3: // Ichimonji: Wide Two-Handed Horizontal Cleave
        wx = THREE.MathUtils.lerp(0.28, -0.28, s);
        wy = (isFPV ? 0.58 : 0.42) + Math.sin(p * Math.PI) * 0.06;
        wz = 0.48 + Math.sin(p * Math.PI) * 0.12;
        rx = 1.18;
        ry = THREE.MathUtils.lerp(-0.95, 0.95, s);
        rz = -1.28;
        break;
      case 4: // Tsuki: Deep Two-Handed Lunging Heart-Piercer Thrust
        wx = 0.02;
        wy = isFPV ? 0.56 : 0.38;
        wz = THREE.MathUtils.lerp(0.26, 0.68, Math.sin(p * Math.PI));
        rx = 1.38;
        ry = 0.0;
        rz = -0.08;
        break;
      case 5: // Tsumujikaze: 360° Two-Handed Whirlwind Slash
        wx = Math.cos(p * Math.PI * 2) * 0.24;
        wy = isFPV ? 0.56 : 0.4;
        wz = 0.48;
        rx = 1.15;
        ry = (p - 0.5) * 1.6;
        rz = -1.15;
        break;
      case 6: // Kabutowari: High Overhead Dai-Jodan Helm-Splitter Slam
      default:
        wx = 0.0;
        wy = THREE.MathUtils.lerp(isFPV ? 0.86 : 0.82, isFPV ? 0.32 : 0.12, s);
        wz = THREE.MathUtils.lerp(0.26, 0.58, Math.sin(p * Math.PI));
        rx = THREE.MathUtils.lerp(-0.55, 1.62, s);
        ry = 0.0;
        rz = 0.0;
        break;
    }
  }

  rig.weaponMount.position.set(wx, wy, wz);
  rig.weaponMount.rotation.set(rx, ry, rz);
  _ikWeaponQuat.setFromEuler(rig.weaponMount.rotation);

  // 2. Transform weapon's local grip sockets into `torsoGroup` space
  _ikTargetR
    .set(gripRightLocal.x, gripRightLocal.y, gripRightLocal.z)
    .applyQuaternion(_ikWeaponQuat)
    .add(rig.weaponMount.position);
  _ikTargetL
    .set(gripLeftLocal.x, gripLeftLocal.y, gripLeftLocal.z)
    .applyQuaternion(_ikWeaponQuat)
    .add(rig.weaponMount.position);

  // Offset from forearm wrist (-0.28) so the 5 curled fingers wrap directly around the Tsuka
  const upperLen = 0.28;
  const forearmGripLen = 0.27;

  // Shoulder positions (lifted slightly forward in FPV so both gauntlets frame the viewport)
  rig.rightArm.position.set(isFPV ? 0.32 : 0.36, isFPV ? 0.82 : 0.76, isFPV ? 0.16 : 0.06);
  rig.leftArm.position.set(isFPV ? -0.32 : -0.36, isFPV ? 0.82 : 0.76, isFPV ? 0.16 : 0.06);

  _ikShoulderR.copy(rig.rightArm.position);
  _ikShoulderL.copy(rig.leftArm.position);

  // Solve 2-Bone Analytical IK for Right Arm -> gripRight and Left Arm -> gripLeft
  solveTwoBoneIKVec3(
    _ikShoulderR,
    _ikTargetR,
    new THREE.Vector3(0.45, -0.38, -0.18),
    upperLen,
    forearmGripLen,
    _ikElbowR
  );
  orientTwoBoneArmChain(rig.rightArm, rig.rightForearm, _ikShoulderR, _ikElbowR, _ikTargetR);

  solveTwoBoneIKVec3(
    _ikShoulderL,
    _ikTargetL,
    new THREE.Vector3(-0.45, -0.38, -0.18),
    upperLen,
    forearmGripLen,
    _ikElbowL
  );
  orientTwoBoneArmChain(rig.leftArm, rig.leftForearm, _ikShoulderL, _ikElbowL, _ikTargetL);

  return {
    rightHandTorsoPos: { x: _ikTargetR.x, y: _ikTargetR.y, z: _ikTargetR.z },
    leftHandTorsoPos: { x: _ikTargetL.x, y: _ikTargetL.y, z: _ikTargetL.z },
  };
}

// ============================================================================
// DEDICATED FIRST-PERSON VIEWMODEL RIG (`fpvRig`) ATTACHED DIRECTLY TO CAMERA
// Features two high-detail armored Samurai forearms & hands (`Kote` gauntlets +
// 5 articulated fingers) gripping the active unified Shinogi-Zukuri weapon at
// `(0.28, -0.32, -0.65)` in camera space — ZERO body/helmet clipping!
// ============================================================================
export interface FirstPersonViewmodelRig {
  root: THREE.Group;
  gripPivot: THREE.Group;
  rightArmGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  weaponMount: THREE.Group;
}

export function createFirstPersonViewmodelRig(
  weapon: WeaponDef,
  armor: ArmorDef,
  textures: ProceduralTextures,
  appearance: CharacterAppearanceConfig = DEFAULT_CHARACTER_APPEARANCE
): FirstPersonViewmodelRig {
  const root = new THREE.Group();
  root.name = 'Samurai_FPV_Viewmodel_Rig';
  // Base lower-right/center camera-space viewmodel position: (0.28, -0.32, -0.65)
  root.position.set(0.28, -0.32, -0.65);
  root.visible = false;

  const gripPivot = new THREE.Group();
  gripPivot.scale.setScalar(0.54);
  root.add(gripPivot);

  const rightArmGroup = new THREE.Group();
  const leftArmGroup = new THREE.Group();
  const weaponMount = new THREE.Group();
  gripPivot.add(rightArmGroup, leftArmGroup, weaponMount);

  const fpvRig: FirstPersonViewmodelRig = {
    root,
    gripPivot,
    rightArmGroup,
    leftArmGroup,
    weaponMount,
  };

  rebuildFirstPersonViewmodelWeapon(fpvRig, weapon, armor, textures, appearance);
  return fpvRig;
}

export function rebuildFirstPersonViewmodelWeapon(
  fpvRig: FirstPersonViewmodelRig,
  weapon: WeaponDef,
  armor: ArmorDef,
  textures: ProceduralTextures,
  appearance: CharacterAppearanceConfig = DEFAULT_CHARACTER_APPEARANCE
): void {
  for (const grp of [fpvRig.rightArmGroup, fpvRig.leftArmGroup, fpvRig.weaponMount]) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  const skinDef =
    SKIN_COMPLEXIONS.find((s) => s.id === appearance.skinComplexion) || SKIN_COMPLEXIONS[1];
  const skinMat = createAnatomicalSSSMaterial(
    skinDef.colorHex,
    skinDef.sssDermisHex,
    appearance.weatheringSheen,
    false,
    textures
  );
  const koteMat = createUrushiLacquerMaterial(armor.primaryColor, textures, false);
  const trimMat = createUrushiLacquerMaterial(armor.accentColor, textures, false);

  const forearmGeo = createSplineLatheGeometry(
    [
      [0.05, 0.0],
      [0.078, 0.16],
      [0.088, 0.36],
      [0.072, 0.44],
    ],
    28
  );
  const kotePlateGeo = createSplineLatheGeometry(
    [
      [0.066, 0.02],
      [0.092, 0.18],
      [0.096, 0.34],
    ],
    28
  );
  const palmGeo = createSplineLatheGeometry(
    [
      [0.015, -0.06],
      [0.056, -0.02],
      [0.052, 0.03],
    ],
    20
  );

  // Build Right Lead Kote Forearm & 5-Finger Hand gripping upper Tsuka (below Tsuba)
  const buildForearmAssembly = (targetGrp: THREE.Group, isLeft: boolean) => {
    addWithInkOutline(targetGrp, forearmGeo, skinMat, [0, 0, 0], [Math.PI * 0.44, 0, isLeft ? -0.32 : 0.24]);
    addWithInkOutline(targetGrp, kotePlateGeo, koteMat, [0, 0, 0], [Math.PI * 0.44, 0, isLeft ? -0.32 : 0.24]);
    addWithInkOutline(
      targetGrp,
      new THREE.TorusGeometry(0.068, 0.011, 10, 24),
      trimMat,
      [0, 0.02, 0.02],
      [Math.PI / 2, 0, 0]
    );
    addWithInkOutline(targetGrp, palmGeo, skinMat, [0, 0, 0]);
    for (let f = 0; f < 5; f++) {
      const fOff = (f - 2) * 0.016;
      const fingerGeo = createTubularPathGeometry(
        [
          [fOff, 0.01, -0.02],
          [fOff, 0.02, -0.062],
          [fOff * 0.75, -0.01, -0.082],
        ],
        0.011,
        12,
        8
      );
      addWithInkOutline(targetGrp, fingerGeo, skinMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], 1.02);
    }
  };

  buildForearmAssembly(fpvRig.rightArmGroup, false);
  buildForearmAssembly(fpvRig.leftArmGroup, true);

  // Mount Equipped Unified Shinogi-Zukuri Weapon
  const weaponMesh = buildProceduralWeaponMesh(weapon, textures);
  fpvRig.weaponMount.add(weaponMesh);

  const gripR = weaponMesh.userData?.gripRightLocal || { x: 0, y: 0.32, z: 0 };
  const gripL = weaponMesh.userData?.gripLeftLocal || { x: 0, y: 0.06, z: 0 };

  fpvRig.rightArmGroup.position.set(gripR.x + 0.02, gripR.y, gripR.z + 0.03);
  fpvRig.leftArmGroup.position.set(gripL.x - 0.02, gripL.y, gripL.z + 0.04);
}

export function stepFirstPersonViewmodelRig(
  fpvRig: FirstPersonViewmodelRig,
  params: {
    visible: boolean;
    isParrying: boolean;
    isAttacking: boolean;
    activeMoveId: number;
    swingProgress: number;
    walkDistance: number;
    moveSpeed: number;
    timeSec: number;
  }
): void {
  fpvRig.root.visible = params.visible;
  if (!params.visible) return;

  const isMoving = params.moveSpeed > 0.15;
  const walkPhase = params.walkDistance * 2.8;
  const bobX = isMoving ? Math.sin(walkPhase) * 0.022 : Math.sin(params.timeSec * 2.2) * 0.005;
  const bobY = isMoving ? Math.abs(Math.cos(walkPhase)) * -0.024 : Math.cos(params.timeSec * 2.6) * 0.007;

  // Base camera-space anchor: (0.28, -0.32, -0.65)
  fpvRig.root.position.set(0.28 + bobX, -0.32 + bobY, -0.65);

  // Default Chudan-no-Kamae guard angle in first-person viewport (Kote gauntlets + Tsuba + forward-angled Katana blade)
  let px = 0.0;
  let py = -0.14;
  let pz = 0.0;
  let rx = -0.34;
  let ry = 0.28;
  let rz = 0.22;

  if (params.isParrying) {
    // Diagonal Sekiro Deflect Guard raised across center of screen
    px = -0.18;
    py = 0.16;
    pz = -0.08;
    rx = 0.18;
    ry = 0.55;
    rz = -0.92;
  } else if (params.isAttacking) {
    const p = Math.max(0, Math.min(1, params.swingProgress));
    const s = p * p * (3 - 2 * p);
    switch (params.activeMoveId) {
      case 1: // Kesagiri: Top-right to bottom-left diagonal cleave across screen
        px = THREE.MathUtils.lerp(0.18, -0.52, s);
        py = THREE.MathUtils.lerp(0.28, -0.24, s);
        pz = -Math.sin(p * Math.PI) * 0.18;
        rx = THREE.MathUtils.lerp(-0.45, 1.15, s);
        ry = THREE.MathUtils.lerp(-0.42, 0.88, s);
        rz = THREE.MathUtils.lerp(-0.38, 0.85, s);
        break;
      case 2: // Kiriage: Bottom-left to top-right rising slash
        px = THREE.MathUtils.lerp(-0.48, 0.22, s);
        py = THREE.MathUtils.lerp(-0.22, 0.28, s);
        pz = -Math.sin(p * Math.PI) * 0.18;
        rx = THREE.MathUtils.lerp(1.12, -0.38, s);
        ry = THREE.MathUtils.lerp(0.82, -0.45, s);
        rz = THREE.MathUtils.lerp(0.78, -0.42, s);
        break;
      case 3: // Wide Horizontal Sweep
        px = THREE.MathUtils.lerp(0.24, -0.56, s);
        py = 0.06;
        pz = -Math.sin(p * Math.PI) * 0.22;
        rx = 0.95;
        ry = THREE.MathUtils.lerp(-0.85, 0.95, s);
        rz = -1.18;
        break;
      case 4: // Tsuki Forward Heart Thrust
        px = -0.14;
        py = 0.08;
        pz = -Math.sin(p * Math.PI) * 0.42;
        rx = 1.28;
        ry = 0.12;
        rz = 0.0;
        break;
      case 5: // Whirlwind Slash
        px = Math.cos(p * Math.PI * 2) * 0.34 - 0.14;
        py = 0.05;
        pz = -0.16;
        rx = 0.98;
        ry = (p - 0.5) * 1.8;
        rz = -1.12;
        break;
      case 6: // Overhead Helm-Splitter Cleave
      default:
        px = -0.18;
        py = THREE.MathUtils.lerp(0.36, -0.28, s);
        pz = -Math.sin(p * Math.PI) * 0.24;
        rx = THREE.MathUtils.lerp(-0.62, 1.38, s);
        ry = 0.18;
        rz = 0.08;
        break;
    }
  }

  fpvRig.gripPivot.position.set(px, py, pz);
  fpvRig.gripPivot.rotation.set(rx, ry, rz);
}


// ============================================================================
// BOTANICAL BAMBOO CANOPY & GNARLED JAPANESE TREE BUILDERS (ZERO CONES/CYLINDERS)
// ============================================================================
export function buildBambooClusterWithCanopy(
  textures: ProceduralTextures,
  stalkCount = 3,
  baseHeight = 8.4
): THREE.Group {
  const group = new THREE.Group();
  const stalkMat = createSumiWashiMaterial(0x2d5a27, 0.56, 0.08, textures);
  const leafMat = createSumiWashiMaterial(0x3f7a38, 0.62, 0.05, textures);

  const stalkGeo = createSegmentedBambooWithNodesGeometry(baseHeight);
  const leafClusterGeo = createMultiBladeGrassClumpGeometry(7);

  for (let i = 0; i < stalkCount; i++) {
    const angle = (i / stalkCount) * Math.PI * 2 + 0.35;
    const dist = i === 0 ? 0 : 0.28 + i * 0.08;
    const hScale = 0.85 + (i % 3) * 0.12;
    const stalk = new THREE.Mesh(stalkGeo, stalkMat);
    stalk.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    stalk.scale.set(1, hScale, 1);
    stalk.rotation.set((i - 1) * 0.035, angle, (1 - i) * 0.03);
    stalk.castShadow = true;
    stalk.receiveShadow = true;
    group.add(stalk);

    // Lush Bamboo Leaf Sprays at upper nodes
    for (const nodeFrac of [0.68, 0.84, 0.98]) {
      const spray = new THREE.Mesh(leafClusterGeo, leafMat);
      spray.position.set(
        stalk.position.x + Math.cos(angle + nodeFrac * 4) * 0.22,
        baseHeight * hScale * nodeFrac,
        stalk.position.z + Math.sin(angle + nodeFrac * 4) * 0.22
      );
      spray.scale.set(1.35, 0.95, 1.35);
      spray.rotation.set(0.45, angle + nodeFrac * 3.1, 0.25);
      group.add(spray);
    }
  }
  return group;
}

export function buildGnarledJapaneseTree(
  style: 'matsu_pine' | 'momiji_maple' | 'sakura_cherry',
  textures: ProceduralTextures
): THREE.Group {
  const group = new THREE.Group();
  const barkMat = createSumiWashiMaterial(0x3e2c23, 0.86, 0.05, textures);
  const foliageColor =
    style === 'momiji_maple' ? 0xb91c1c : style === 'sakura_cherry' ? 0xf472b6 : 0x1e3f20;
  const foliageAccent =
    style === 'momiji_maple' ? 0xd97706 : style === 'sakura_cherry' ? 0xfbcfe8 : 0x2d5a27;

  const foliageMatA = createSumiWashiMaterial(foliageColor, 0.72, 0.06, textures);
  const foliageMatB = createSumiWashiMaterial(foliageAccent, 0.72, 0.06, textures);

  // Gnarled Windswept Trunk swept along a 3D Catmull-Rom curve
  const trunkGeo = createTubularPathGeometry(
    [
      [0, -0.2, 0],
      [0.24, 1.45, 0.12],
      [-0.18, 3.1, -0.14],
      [0.32, 4.65, 0.18],
      [0.12, 5.8, 0.05],
    ],
    0.28,
    28,
    14
  );
  const trunkMesh = new THREE.Mesh(trunkGeo, barkMat);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  group.add(trunkMesh);

  // 3 Sculpted Boughs + Layered Cloud-Pruned (Niwaki) Canopy Pads
  const canopyPadGeo = createSplineLatheGeometry(
    [
      [0.08, -0.28],
      [1.45, -0.12],
      [1.75, 0.18],
      [0.95, 0.52],
      [0.05, 0.68],
    ],
    24
  );

  const branches: { pts: [number, number, number][]; padPos: [number, number, number]; padScale: [number, number, number] }[] = [
    {
      pts: [
        [0.05, 2.8, -0.05],
        [1.15, 3.65, 0.45],
        [2.05, 4.1, 0.75],
      ],
      padPos: [2.05, 4.15, 0.75],
      padScale: [1.1, 0.85, 1.1],
    },
    {
      pts: [
        [-0.08, 3.4, -0.08],
        [-1.25, 4.2, -0.52],
        [-2.15, 4.65, -0.82],
      ],
      padPos: [-2.15, 4.7, -0.82],
      padScale: [1.15, 0.9, 1.15],
    },
    {
      pts: [
        [0.22, 4.5, 0.12],
        [0.45, 5.5, -0.65],
        [0.15, 6.1, -0.25],
      ],
      padPos: [0.15, 6.05, -0.15],
      padScale: [1.45, 1.05, 1.45],
    },
  ];

  branches.forEach((b, idx) => {
    const bGeo = createTubularPathGeometry(b.pts, 0.14, 18, 10);
    const bMesh = new THREE.Mesh(bGeo, barkMat);
    bMesh.castShadow = true;
    group.add(bMesh);

    const padMesh = new THREE.Mesh(canopyPadGeo, idx % 2 === 0 ? foliageMatA : foliageMatB);
    padMesh.position.set(b.padPos[0], b.padPos[1], b.padPos[2]);
    padMesh.scale.set(b.padScale[0], b.padScale[1], b.padScale[2]);
    padMesh.castShadow = true;
    padMesh.receiveShadow = true;
    group.add(padMesh);
  });

  return group;
}

// ============================================================================
// HIGH-SUBDIVISION PROJECTILE & THROWABLE 3D MESHES
// ============================================================================
export function createProjectileMesh(
  type: ThrowableDef['effectType'] | 'arrow' | 'bullet' | 'dart',
  colorHex: number,
  textures: ProceduralTextures
): THREE.Group {
  const group = new THREE.Group();
  const mat = createUrushiLacquerMaterial(colorHex, textures, true);
  const accentMat = createUrushiLacquerMaterial(0xfbbf24, textures, false);

  if (type === 'bleed_fan') {
    const starShape = new THREE.Shape();
    const pts = 16;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.24 : 0.085;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      steps: 1,
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 8,
    });
    starGeo.rotateX(Math.PI / 2);
    addWithInkOutline(group, starGeo, mat, [0, 0, 0]);
    addWithInkOutline(
      group,
      new THREE.TorusGeometry(0.048, 0.012, 10, 24),
      accentMat,
      [0, 0.012, 0],
      [Math.PI / 2, 0, 0]
    );
  } else if (type === 'fire_aoe') {
    const bombGeo = createSplineLatheGeometry(
      [
        [0.01, -0.24],
        [0.22, -0.14],
        [0.26, 0],
        [0.22, 0.14],
        [0.06, 0.24],
      ],
      36
    );
    addWithInkOutline(group, bombGeo, mat, [0, 0, 0]);
    const fuseGeo = createTubularPathGeometry(
      [
        [0, 0.22, 0],
        [0.04, 0.34, 0.04],
        [-0.02, 0.42, 0.08],
      ],
      0.016,
      18,
      10
    );
    addWithInkOutline(group, fuseGeo, accentMat, [0, 0, 0]);
  } else if (type === 'caltrop_slow') {
    for (const rot of [
      [0, 0, 0],
      [Math.PI * 0.68, 0, 0],
      [-Math.PI * 0.34, 0, Math.PI * 0.62],
      [-Math.PI * 0.34, 0, -Math.PI * 0.62],
    ] as [number, number, number][]) {
      const spikeGeo = createSplineLatheGeometry(
        [
          [0.045, 0],
          [0.022, 0.14],
          [0.002, 0.26],
        ],
        18
      );
      addWithInkOutline(group, spikeGeo, mat, [0, 0, 0], rot);
    }
  } else if (type === 'bullet') {
    const ballGeo = createSplineLatheGeometry(
      [
        [0.005, -0.13],
        [0.13, 0],
        [0.005, 0.13],
      ],
      32
    );
    addWithInkOutline(group, ballGeo, mat, [0, 0, 0]);
  } else if (type === 'stagger_pierce') {
    const kunaiBlade = createExtrudedCurvedBladeGeometry(0.46, 0.095, 0.015, 0, 0.016);
    addWithInkOutline(group, kunaiBlade, mat, [-0.008, 0, -0.12], [Math.PI / 2, 0, 0]);
    addWithInkOutline(
      group,
      new THREE.TorusGeometry(0.045, 0.012, 10, 24),
      accentMat,
      [0, 0, -0.2],
      [Math.PI / 2, 0, 0]
    );
  } else {
    const shaftGeo = createTubularPathGeometry(
      [
        [0, 0, -0.36],
        [0, 0, 0.34],
      ],
      0.016,
      16,
      12
    );
    addWithInkOutline(group, shaftGeo, mat, [0, 0, 0]);
    const tipGeo = createExtrudedCurvedBladeGeometry(0.18, 0.055, 0.01, 0, 0.014);
    addWithInkOutline(group, tipGeo, accentMat, [-0.007, 0, 0.32], [Math.PI / 2, 0, 0]);
  }
  return group;
}

// ============================================================================
// STATIONARY DOJO TRAINING DUMMY RIG (Karakuri Straw Makiwara & Wooden Arms)
// ============================================================================
export function createDojoDummyMeshRig(
  textures: ProceduralTextures,
  sampleWeapon: WeaponDef
): {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  weaponArm: THREE.Group;
  telegraphRing: THREE.Mesh;
} {
  const root = new THREE.Group();

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 32),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.38, 40),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.032;
  root.add(telegraphRing);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const woodMat = createSumiWashiMaterial(0x78553a, 0.72, 0.12, textures);
  const strawMat = createSumiWashiMaterial(0xd4b475, 0.82, 0.08, textures);
  const crimsonMat = createUrushiLacquerMaterial(0x991b1b, textures, false);
  const brassMat = createUrushiLacquerMaterial(0xfbbf24, textures, false);

  const plinthDiscGeo = createSplineLatheGeometry(
    [
      [0.72, 0],
      [0.68, 0.12],
      [0.24, 0.16],
    ],
    48
  );
  addWithInkOutline(bodyPivot, plinthDiscGeo, woodMat, [0, 0, 0]);

  const postAndMakiwaraGeo = createSplineLatheGeometry(
    [
      [0.22, 0.08],
      [0.17, 0.65],
      [0.42, 0.72],
      [0.44, 1.22],
      [0.39, 1.72],
      [0.16, 1.78],
      [0.26, 1.94],
      [0.02, 2.12],
    ],
    48
  );
  addWithInkOutline(bodyPivot, postAndMakiwaraGeo, strawMat, [0, 0, 0]);

  for (const ry of [0.85, 1.2, 1.55]) {
    addWithInkOutline(
      bodyPivot,
      new THREE.TorusGeometry(0.425, 0.036, 12, 36),
      crimsonMat,
      [0, ry, 0],
      [Math.PI / 2, 0, 0]
    );
  }

  const dummyKasaGeo = createSplineLatheGeometry(
    [
      [0.58, 2.02],
      [0.32, 2.16],
      [0.02, 2.28],
    ],
    48
  );
  addWithInkOutline(bodyPivot, dummyKasaGeo, woodMat, [0, 0, 0]);
  addWithInkOutline(
    bodyPivot,
    new THREE.TorusGeometry(0.18, 0.032, 12, 28),
    brassMat,
    [0, 2.22, 0.18]
  );

  // Two-Handed Mechanical Practice Arms gripping the training blade
  const weaponArm = new THREE.Group();
  weaponArm.position.set(0.28, 1.44, 0.22);
  const armGeo = createSplineLatheGeometry(
    [
      [0.08, -0.44],
      [0.11, -0.22],
      [0.13, 0],
    ],
    28
  );
  addWithInkOutline(weaponArm, armGeo, woodMat, [0, 0, 0], [0.42, 0, -0.32]);
  const leftSupportGeo = createTubularPathGeometry(
    [
      [-0.62, 0.02, -0.12],
      [-0.36, -0.22, 0.12],
      [-0.08, -0.34, 0.24],
    ],
    0.088,
    18,
    12
  );
  addWithInkOutline(weaponArm, leftSupportGeo, woodMat, [0, 0, 0]);

  const wMesh = buildProceduralWeaponMesh(sampleWeapon, textures);
  wMesh.position.set(-0.08, -0.38, 0.26);
  wMesh.rotation.set(Math.PI * 0.28, -0.15, -0.18);
  weaponArm.add(wMesh);
  bodyPivot.add(weaponArm);

  return { root, bodyPivot, weaponArm, telegraphRing };
}
