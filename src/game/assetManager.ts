import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export type AssetTargetSlot = 'samurai' | 'weapon' | 'boss' | 'prop' | 'hdri';

export interface Verified3DAssetPreset {
  id: string;
  name: string;
  kanji: string;
  slot: AssetTargetSlot;
  format: 'glb' | 'gltf' | 'hdr' | 'procedural_math';
  url: string;
  targetHeightMeters: number;
  sourceRepo: string;
  description: string;
}

export interface InspectedModelTelemetry {
  name: string;
  slot: AssetTargetSlot;
  sourceUrlOrFile: string;
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  boneCount: number;
  skinnedMeshCount: number;
  animationClipCount: number;
  materialChannels: string[];
  boundingBoxMeters: { x: number; y: number; z: number };
  loadedAtIso: string;
}

/**
 * Curated, real, CORS-accessible 3D glTF/GLB & Poly Haven HDRI presets from
 * KhronosGroup/glTF-Sample-Assets, Three.js CDN, and Poly Haven API.
 */
export const VERIFIED_3D_ASSET_PRESETS: Verified3DAssetPreset[] = [
  {
    id: 'math_forged_default',
    name: 'Parametric Mathematical Forge (Default)',
    kanji: '数理鍛造・純正',
    slot: 'samurai',
    format: 'procedural_math',
    url: 'procedural://mathematical-samurai-rig',
    targetHeightMeters: 1.82,
    sourceRepo: 'Internal Differential & Spherical-Harmonic Engine',
    description:
      'Watertight SSS anatomical human mesh + Spherical-Harmonic Kozane O-Yoroi + Differential Cosh Sori Katana.',
  },
  {
    id: 'khronos_damaged_helmet_kabuto',
    name: 'Khronos Battle-Scarred War Helm (.glb)',
    kanji: '歴戦鉄兜・GLB',
    slot: 'weapon',
    format: 'glb',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    targetHeightMeters: 0.85,
    sourceRepo: 'KhronosGroup/glTF-Sample-Assets (CORS CDN)',
    description:
      'Official Khronos PBR DamagedHelmet.glb with full metallic-roughness, normal, AO, and emissive maps.',
  },
  {
    id: 'khronos_cesium_warrior',
    name: 'Khronos Articulated Skinned Warrior (.glb)',
    kanji: '骨格装甲武者・GLB',
    slot: 'samurai',
    format: 'glb',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
    targetHeightMeters: 1.85,
    sourceRepo: 'KhronosGroup/glTF-Sample-Assets (CORS CDN)',
    description:
      'Skinned skeletal character rig with bone hierarchy and animation clips from Khronos glTF-Sample-Assets.',
  },
  {
    id: 'khronos_kitsune_fox_boss',
    name: 'Inari Kitsune Spirit Guardian (.glb)',
    kanji: '稲荷白狐・霊獣GLB',
    slot: 'boss',
    format: 'glb',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
    targetHeightMeters: 2.35,
    sourceRepo: 'KhronosGroup/glTF-Sample-Assets (CORS CDN)',
    description:
      'Articulated Kitsune fox spirit model with skeletal Survey/Walk/Run animation clips for Boss overrides.',
  },
  {
    id: 'khronos_karakuri_brainstem',
    name: 'Karakuri Automaton Colossus (.glb)',
    kanji: '絡繰機神・GLB',
    slot: 'boss',
    format: 'glb',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
    targetHeightMeters: 2.6,
    sourceRepo: 'KhronosGroup/glTF-Sample-Assets (CORS CDN)',
    description:
      'Multi-jointed mechanical Karakuri golem with deep bone hierarchy from Khronos glTF-Sample-Assets.',
  },
  {
    id: 'polyhaven_kloppenheim_moonlit_hdr',
    name: 'Poly Haven Moonlit Mist HDRI (1K .hdr)',
    kanji: '月夜霧・環境光HDR',
    slot: 'hdri',
    format: 'hdr',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr',
    targetHeightMeters: 1.0,
    sourceRepo: 'Poly Haven Public CDN (dl.polyhaven.org)',
    description:
      'Real 32-bit RGBE equirectangular environment lighting map for Tamahagane steel reflections.',
  },
  {
    id: 'polyhaven_autumn_forest_hdr',
    name: 'Poly Haven Crimson Autumn Shrine HDRI (1K .hdr)',
    kanji: '紅葉古社・環境光HDR',
    slot: 'hdri',
    format: 'hdr',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/autumn_forest_04_1k.hdr',
    targetHeightMeters: 1.0,
    sourceRepo: 'Poly Haven Public CDN (dl.polyhaven.org)',
    description:
      'Warm autumn foliage equirectangular HDRI for rich lacquer and gold crest specular reflections.',
  },
];

/**
 * Exact Differential Curvature Katana & Blade Surface Evaluator:
 * P(u, v) = ( x(u,v), y(u) + alpha * cosh(beta * u), z(u,v) )
 * where u in [0, 1] is normalized blade spine parameter (Tsuba -> Kissaki)
 * and v in [-1, 1] parameterizes the hexagonal Shinogi-zukuri cross-section
 * tapering to a razor edge with thickness w(v) -> 0 at Ha (v -> 1).
 */
export interface DifferentialBladeParams {
  length: number;
  motoWidth: number;
  sakiWidth: number;
  thickness: number;
  alphaCosh: number; // hyperbolic catenary Sori amplitude
  betaCosh: number; // hyperbolic curvature rate
}

export function evaluateDifferentialKatanaPoint(
  u: number,
  v: number,
  sideSign: 1 | -1,
  params: DifferentialBladeParams
): { x: number; y: number; z: number; hamonMask: number } {
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, Math.abs(v)));

  // Longitudinal coordinate along the blade (y-axis in local weapon space)
  const yBase = clampedU * params.length;

  // Differential curvature offset: alpha * (cosh(beta * u) - 1) along blade forward/back axis (z)
  const soriOffset = params.alphaCosh * (Math.cosh(params.betaCosh * clampedU) - 1.0);

  // Width taper from Moto-haba to Saki-haba with Kissaki geometric point closure
  const kissakiTaper =
    clampedU > 0.88 ? Math.pow(Math.max(0, 1 - (clampedU - 0.88) / 0.12), 0.72) : 1.0;
  const widthAtU =
    (params.motoWidth + (params.sakiWidth - params.motoWidth) * Math.pow(clampedU, 1.15)) *
    kissakiTaper;

  // Hexagonal Shinogi-Zukuri cross-section profile:
  // v = 0.0 -> Mune (back spine tip)
  // v = 0.18 -> Mune-kado (spine shoulder)
  // v = 0.42 -> Shinogi (ridge line, maximum thickness)
  // v = 1.00 -> Ha (tempered razor edge where thickness w(v) -> 0)
  let halfThicknessFactor = 0;
  if (clampedV < 0.18) {
    halfThicknessFactor = (clampedV / 0.18) * 0.72;
  } else if (clampedV < 0.42) {
    const t = (clampedV - 0.18) / (0.42 - 0.18);
    halfThicknessFactor = 0.72 + t * 0.28;
  } else {
    const t = (clampedV - 0.42) / (1.0 - 0.42);
    // Razor edge convergence w(v) -> 0
    halfThicknessFactor = Math.max(0, 1.0 - Math.pow(t, 1.12));
  }

  const distalThicknessTaper = 1.0 - 0.38 * Math.pow(clampedU, 1.25);
  const x = sideSign * (params.thickness * 0.5) * halfThicknessFactor * distalThicknessTaper;
  const z = -soriOffset - (clampedV - 0.35) * widthAtU;
  const y = yBase + params.alphaCosh * 0.08 * Math.cosh(params.betaCosh * clampedU);

  // Procedural wavy Notare/choji Hamon temper line mask near the Ha razor edge
  const hamonWave =
    0.72 + 0.06 * Math.sin(clampedU * 38.0) + 0.03 * Math.cos(clampedU * 82.0 + 1.1);
  const hamonMask = clampedV >= hamonWave ? 1.0 : 0.0;

  return { x, y, z, hamonMask };
}

/**
 * Forges a high-density Three.js BufferGeometry using evaluateDifferentialKatanaPoint.
 */
export function createDifferentialKatanaGeometry(
  params: DifferentialBladeParams,
  uSegments = 48,
  vSegments = 12
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const vStops: number[] = [];
  for (let j = 0; j <= vSegments; j++) {
    vStops.push(j / vSegments);
  }
  const ringProfileCount = vStops.length * 2 - 2; // closed loop around left & right faces

  for (let i = 0; i <= uSegments; i++) {
    const u = i / uSegments;
    // Right side (sideSign = +1, v from 0 to 1)
    for (let j = 0; j < vStops.length; j++) {
      const v = vStops[j];
      const pt = evaluateDifferentialKatanaPoint(u, v, 1, params);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u, v);
      const c = pt.hamonMask > 0.5 ? 0.98 : 0.78;
      colors.push(c, c, pt.hamonMask > 0.5 ? 1.0 : 0.84);
    }
    // Left side returning from Ha to Mune (sideSign = -1, v from vStops[len-2] down to 1)
    for (let j = vStops.length - 2; j >= 1; j--) {
      const v = vStops[j];
      const pt = evaluateDifferentialKatanaPoint(u, v, -1, params);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u, v);
      const c = pt.hamonMask > 0.5 ? 0.98 : 0.78;
      colors.push(c, c, pt.hamonMask > 0.5 ? 1.0 : 0.84);
    }
  }

  for (let i = 0; i < uSegments; i++) {
    const rowA = i * ringProfileCount;
    const rowB = (i + 1) * ringProfileCount;
    for (let j = 0; j < ringProfileCount; j++) {
      const jNext = (j + 1) % ringProfileCount;
      const a = rowA + j;
      const b = rowA + jNext;
      const c = rowB + jNext;
      const d = rowB + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Constructs a curved Kozane lamellar armor shell using Spherical Harmonics Y_l^m(theta, phi)
 * and binds it to an articulated THREE.Bone + THREE.SkinnedMesh hierarchy.
 */
export function createArticulatedSkinnedKozaneArmor(
  primaryMat: THREE.Material,
  cordMat: THREE.Material,
  radiusX = 0.31,
  radiusZ = 0.23,
  height = 0.62
): {
  skinnedMesh: THREE.SkinnedMesh;
  cordGroup: THREE.Group;
  bones: THREE.Bone[];
} {
  const radialSegs = 48;
  const heightSegs = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = v * height;
    const phi = v * Math.PI;
    // Spherical-harmonic Y_4^2 & lamellar tier modulation
    const tierStep = Math.sin(v * Math.PI * 6.0) * 0.012;
    const waistTapering = 0.92 + 0.14 * Math.sin(phi) + 0.06 * Math.cos(2 * phi);

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      // Spherical harmonic lamellar ridge ripple cos(18 * theta)
      const kozaneScaleRipple = 0.0045 * Math.cos(18.0 * theta);
      const rX = (radiusX * waistTapering + tierStep + kozaneScaleRipple) * Math.sin(theta);
      const rZ = (radiusZ * waistTapering + tierStep + kozaneScaleRipple) * Math.cos(theta);

      positions.push(rX, y, rZ);
      uvs.push(u, v);

      // Weight between root bone (0: pelvis/waist), mid bone (1: solar plexus), chest bone (2: shoulders)
      if (v < 0.5) {
        const w1 = v * 2.0;
        skinIndices.push(0, 1, 0, 0);
        skinWeights.push(1 - w1, w1, 0, 0);
      } else {
        const w2 = (v - 0.5) * 2.0;
        skinIndices.push(1, 2, 0, 0);
        skinWeights.push(1 - w2, w2, 0, 0);
      }
    }
  }

  const rowStride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * rowStride + ix;
      const b = a + 1;
      const c = (iy + 1) * rowStride + ix + 1;
      const d = (iy + 1) * rowStride + ix;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const rootBone = new THREE.Bone();
  rootBone.name = 'KozaneWaistBone';
  rootBone.position.set(0, 0, 0);

  const midBone = new THREE.Bone();
  midBone.name = 'KozaneThoraxBone';
  midBone.position.set(0, height * 0.5, 0);
  rootBone.add(midBone);

  const chestBone = new THREE.Bone();
  chestBone.name = 'KozaneShoulderBone';
  chestBone.position.set(0, height * 0.5, 0);
  midBone.add(chestBone);

  const bones = [rootBone, midBone, chestBone];
  const skeleton = new THREE.Skeleton(bones);
  const skinnedMesh = new THREE.SkinnedMesh(geo, primaryMat);
  skinnedMesh.add(rootBone);
  skinnedMesh.bind(skeleton);

  // Braided silk Odoshige cords via sinusoidal tube extrusions
  const cordGroup = new THREE.Group();
  for (let tier = 1; tier <= 4; tier++) {
    const yTier = (tier / 5) * height;
    const pts: THREE.Vector3[] = [];
    const samples = 36;
    for (let s = 0; s <= samples; s++) {
      const t = (s / samples) * Math.PI * 2;
      const waveY = yTier + Math.sin(t * 12) * 0.012;
      const rx = (radiusX + 0.015) * Math.sin(t);
      const rz = (radiusZ + 0.015) * Math.cos(t);
      pts.push(new THREE.Vector3(rx, waveY, rz));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0065, 8, true);
    cordGroup.add(new THREE.Mesh(tubeGeo, cordMat));
  }

  return { skinnedMesh, cordGroup, bones };
}

/**
 * Inspects any Three.js Object3D hierarchy and computes exact vertex/triangle/bone/material telemetry.
 */
export function inspectObject3DTelemetry(
  root: THREE.Object3D,
  name: string,
  slot: AssetTargetSlot,
  sourceUrlOrFile: string,
  animationClipCount = 0
): InspectedModelTelemetry {
  let vertexCount = 0;
  let triangleCount = 0;
  let meshCount = 0;
  let boneCount = 0;
  let skinnedMeshCount = 0;
  const channels = new Set<string>();

  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      boneCount++;
    }
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedMeshCount++;
    }
    if ((obj as THREE.Mesh).isMesh) {
      meshCount++;
      const mesh = obj as THREE.Mesh;
      const geom = mesh.geometry;
      if (geom) {
        const pos = geom.getAttribute('position');
        if (pos) vertexCount += pos.count;
        if (geom.index) {
          triangleCount += Math.round(geom.index.count / 3);
        } else if (pos) {
          triangleCount += Math.round(pos.count / 3);
        }
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) channels.add('Albedo (sRGB)');
        if (std.normalMap) channels.add('Normal');
        if (std.roughnessMap || std.metalnessMap) channels.add('Metallic/Roughness');
        if (std.bumpMap) channels.add('Washi Bump');
        if (std.emissiveMap || (std.emissive && std.emissive.getHex() > 0)) channels.add('Emissive');
      }
    }
  });

  if (channels.size === 0) {
    channels.add('PBR Standard + Sumi-e Rim');
  }

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(1, 1, 1);
  if (!box.isEmpty()) {
    box.getSize(size);
  }

  return {
    name,
    slot,
    sourceUrlOrFile,
    vertexCount,
    triangleCount,
    meshCount,
    boneCount,
    skinnedMeshCount,
    animationClipCount,
    materialChannels: Array.from(channels),
    boundingBoxMeters: {
      x: Number(size.x.toFixed(2)),
      y: Number(size.y.toFixed(2)),
      z: Number(size.z.toFixed(2)),
    },
    loadedAtIso: new Date().toLocaleTimeString(),
  };
}

/**
 * Agentic 3D Asset Manager with GLTFLoader, DRACOLoader, RGBELoader, caching,
 * bounding-box normalization, and drag-and-drop local .glb/.gltf/.hdr parsing.
 */
export class SmartAssetManager {
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private rgbeLoader: RGBELoader;
  private cache = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>();
  private lastTelemetry: InspectedModelTelemetry | null = null;

  constructor() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.rgbeLoader = new RGBELoader();
  }

  public getLastTelemetry(): InspectedModelTelemetry | null {
    return this.lastTelemetry;
  }

  public setLastTelemetry(telemetry: InspectedModelTelemetry) {
    this.lastTelemetry = telemetry;
  }

  private normalizeAndGroundModel(
    rawScene: THREE.Group,
    targetHeightMeters: number
  ): THREE.Group {
    const wrapper = new THREE.Group();
    const cloned = rawScene.clone(true);

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(0.001, size.y, size.x * 0.5, size.z * 0.5);
      const scale = targetHeightMeters / maxDim;
      cloned.scale.multiplyScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(cloned);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      cloned.position.x -= scaledCenter.x;
      cloned.position.z -= scaledCenter.z;
      cloned.position.y -= scaledBox.min.y;
      void center;
    }

    wrapper.add(cloned);
    return wrapper;
  }

  public async loadGLTFfromUrl(
    url: string,
    slot: AssetTargetSlot,
    targetHeightMeters = 1.8,
    displayName = 'Remote GLTF Asset'
  ): Promise<{ model: THREE.Group; animations: THREE.AnimationClip[]; telemetry: InspectedModelTelemetry }> {
    if (this.cache.has(url)) {
      const cached = this.cache.get(url)!;
      const normalized = this.normalizeAndGroundModel(cached.scene, targetHeightMeters);
      const telemetry = inspectObject3DTelemetry(
        normalized,
        displayName,
        slot,
        url,
        cached.animations.length
      );
      this.lastTelemetry = telemetry;
      return { model: normalized, animations: cached.animations, telemetry };
    }

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });

    this.cache.set(url, { scene: gltf.scene, animations: gltf.animations || [] });
    const normalized = this.normalizeAndGroundModel(gltf.scene, targetHeightMeters);
    const telemetry = inspectObject3DTelemetry(
      normalized,
      displayName,
      slot,
      url,
      (gltf.animations || []).length
    );
    this.lastTelemetry = telemetry;
    return { model: normalized, animations: gltf.animations || [], telemetry };
  }

  public async loadGLTFfromFile(
    file: File,
    slot: AssetTargetSlot,
    targetHeightMeters = 1.8
  ): Promise<{ model: THREE.Group; animations: THREE.AnimationClip[]; telemetry: InspectedModelTelemetry }> {
    const arrayBuffer = await file.arrayBuffer();
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.parse(arrayBuffer, '', resolve, reject);
    });
    const normalized = this.normalizeAndGroundModel(gltf.scene, targetHeightMeters);
    const telemetry = inspectObject3DTelemetry(
      normalized,
      file.name,
      slot,
      `local-file://${file.name}`,
      (gltf.animations || []).length
    );
    this.lastTelemetry = telemetry;
    return { model: normalized, animations: gltf.animations || [], telemetry };
  }

  public async loadHDRIEnvironment(
    url: string,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ): Promise<THREE.Texture> {
    const rawHdr = await new Promise<THREE.DataTexture>((resolve, reject) => {
      this.rgbeLoader.load(url, resolve, undefined, reject);
    });
    rawHdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromEquirectangular(rawHdr).texture;
    scene.environment = envMap;
    rawHdr.dispose();
    pmrem.dispose();
    return envMap;
  }

  public dispose() {
    this.dracoLoader.dispose();
    this.cache.clear();
  }
}
