import * as THREE from 'three';
import {
  createMultiBladeGrassClumpGeometry,
  createSegmentedBambooWithNodesGeometry,
  createSplineLatheGeometry,
  createTubularPathGeometry,
} from './proceduralMeshes';

export type OpenWorldBiomeId =
  | 'crimson_momiji_valley'
  | 'snowy_fuji_peaks'
  | 'misty_bamboo_forest'
  | 'volcanic_oni_caldera'
  | 'bioluminescent_crystal_caves'
  | 'ruined_castle_town';

export interface OpenWorldBiomeDefinition {
  id: OpenWorldBiomeId;
  name: string;
  kanji: string;
  groundHex: number;
  cliffHex: number;
  foliageHex: number;
  fogHex: number;
  waterTintHex: number;
  moistureRange: [number, number];
  altitudeRange: [number, number];
  description: string;
}

export const OPEN_WORLD_BIOMES: Record<OpenWorldBiomeId, OpenWorldBiomeDefinition> = {
  crimson_momiji_valley: {
    id: 'crimson_momiji_valley',
    name: 'Crimson Momiji Valleys',
    kanji: '紅葉渓谷',
    groundHex: 0x5c3a28,
    cliffHex: 0x3f2e26,
    foliageHex: 0xdc2626,
    fogHex: 0xd8c3b0,
    waterTintHex: 0x1e4e5f,
    moistureRange: [0.35, 0.75],
    altitudeRange: [-4, 14],
    description: 'Scarlet Japanese maple gorges, mossy boulders, and meandering mountain streams.',
  },
  snowy_fuji_peaks: {
    id: 'snowy_fuji_peaks',
    name: 'Snowy Mount Fuji Peaks',
    kanji: '富士白雪嶺',
    groundHex: 0xe2e8f0,
    cliffHex: 0x475569,
    foliageHex: 0xbae6fd,
    fogHex: 0xcbd5e1,
    waterTintHex: 0x0f344c,
    moistureRange: [0.0, 1.0],
    altitudeRange: [14, 60],
    description: 'High-altitude wind-carved snow ridges, frozen shrines, and Karasu-Tengu aeries.',
  },
  misty_bamboo_forest: {
    id: 'misty_bamboo_forest',
    name: 'Misty Bamboo Forests',
    kanji: '霧深き竹林',
    groundHex: 0x3b4d34,
    cliffHex: 0x2d372c,
    foliageHex: 0x4ade80,
    fogHex: 0xcfd8cc,
    waterTintHex: 0x164e46,
    moistureRange: [0.65, 1.0],
    altitudeRange: [-2, 14],
    description: 'Dense towering Mosochiku bamboo groves shrouded in emerald mist and river fog.',
  },
  volcanic_oni_caldera: {
    id: 'volcanic_oni_caldera',
    name: 'Volcanic Oni Calderas',
    kanji: '鬼神黒曜火口',
    groundHex: 0x231915,
    cliffHex: 0x18110e,
    foliageHex: 0xf97316,
    fogHex: 0x2e1711,
    waterTintHex: 0x7c2d12,
    moistureRange: [0.0, 0.35],
    altitudeRange: [2, 28],
    description: 'Cracked basalt obsidian plains, sulfur vents, and Oni Warlord strongholds.',
  },
  bioluminescent_crystal_caves: {
    id: 'bioluminescent_crystal_caves',
    name: 'Subterranean Bioluminescent Crystal Caves',
    kanji: '地底蛍石鍾乳洞',
    groundHex: 0x172536,
    cliffHex: 0x0f172a,
    foliageHex: 0x38bdf8,
    fogHex: 0x0f1c2e,
    waterTintHex: 0x0284c7,
    moistureRange: [0.5, 1.0],
    altitudeRange: [-30, -1.5],
    description: '3D Simplex worm-tunnel caverns with glowing azure crystals, stalactites, and Jorogumo lairs.',
  },
  ruined_castle_town: {
    id: 'ruined_castle_town',
    name: 'Ancient Ruined Castle Towns',
    kanji: '古城下町廃墟',
    groundHex: 0x4b443c,
    cliffHex: 0x332e2a,
    foliageHex: 0xfacc15,
    fogHex: 0xc7bfb2,
    waterTintHex: 0x1e3a4c,
    moistureRange: [0.25, 0.65],
    altitudeRange: [-2, 10],
    description: 'Shattered Sengoku stone ramparts, watchtowers, and roaming Ronin/Ashigaru patrols.',
  },
};

/**
 * Deterministic 2D & 3D Simplex-like Gradient Noise for Multifractal Terrain & Worm Caves
 */
export function hash2D(x: number, z: number): number {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

export function smoothNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  const res = a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  return res * 2 - 1; // [-1, 1]
}

export function smoothNoise3D(x: number, y: number, z: number): number {
  const xy = smoothNoise2D(x + y * 0.57, z - y * 0.43);
  const yz = smoothNoise2D(y + z * 0.37, x - z * 0.61);
  return 0.5 * (xy + yz);
}

/**
 * Evaluates a smooth [0, 1] blend factor for organic winding mountain dirt & cobblestone trails
 * (NO flat rectangular strips!)
 */
export function evaluateWindingTrailFactor(worldX: number, worldZ: number): number {
  const northSouthTrailX =
    Math.sin(worldZ * 0.024) * 14.5 + Math.cos(worldZ * 0.009 + 1.1) * 9.0;
  const eastWestTrailZ =
    8.0 + Math.sin(worldX * 0.021 - 0.6) * 15.0 + Math.cos(worldX * 0.008) * 8.5;

  const distNS = Math.abs(worldX - northSouthTrailX);
  const distEW = Math.abs(worldZ - eastWestTrailZ);
  const minDist = Math.min(distNS, distEW);
  const widthNoise = 2.6 + 0.8 * smoothNoise2D(worldX * 0.08, worldZ * 0.08);
  if (minDist >= widthNoise) return 0;
  const t = 1.0 - minDist / widthNoise;
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates exact 6-Octave Domain-Warped Ridged Multifractal Terrain Elevation:
 * h(x, z) = sum_{i=0}^5 a_i * (1 - |simplex(omega_i * p + q(p))|)^2
 * Smoothly blends into the central duel/shrine glade near (0,0) while creating
 * rivers, valleys, mountains, winding trails, and cave entrances across infinite world coordinates.
 */
export function evaluateMultifractalTerrainHeight(worldX: number, worldZ: number): number {
  const distFromOrigin = Math.hypot(worldX, worldZ + 2);
  const centralBasinBlend = THREE.MathUtils.smoothstep(distFromOrigin, 19.5, 44.0);
  if (centralBasinBlend <= 0.0001) {
    return 0;
  }

  // Domain warp vector q(p)
  const qx = smoothNoise2D(worldX * 0.008 + 1.7, worldZ * 0.008 + 9.2) * 1.65;
  const qz = smoothNoise2D(worldX * 0.008 + 8.3, worldZ * 0.008 + 2.8) * 1.65;

  let sum = 0;
  let amp = 9.5;
  let freq = 0.011;
  let weight = 1.0;

  // 6-Octave Ridged Multifractal fBm
  for (let i = 0; i < 6; i++) {
    const nx = worldX * freq + qx * (0.45 + i * 0.12);
    const nz = worldZ * freq + qz * (0.45 + i * 0.12);
    const n = smoothNoise2D(nx, nz);
    const ridge = 1.0 - Math.abs(n);
    const signal = ridge * ridge * weight;
    weight = Math.max(0.15, Math.min(1.0, signal * 1.8));
    sum += signal * amp;
    freq *= 2.08;
    amp *= 0.48;
  }

  // Carve meandering river channel along z = riverCenterZ(x)
  const riverZ = evaluateRiverCenterlineZ(worldX);
  const distToRiver = Math.abs(worldZ - riverZ);
  const riverCarve = distToRiver < 11.0 ? Math.cos((distToRiver / 11.0) * Math.PI * 0.5) * 4.8 : 0;

  // Gently smooth micro-ridges along organic winding mountain trails
  const trailFactor = evaluateWindingTrailFactor(worldX, worldZ);
  const rawHeight = (sum - 5.2) * (1.0 - trailFactor * 0.35) * centralBasinBlend - riverCarve * centralBasinBlend;
  return Number(rawHeight.toFixed(3));
}

/**
 * Evaluates the meandering spline centerline Z coordinate for a given World X coordinate.
 */
export function evaluateRiverCenterlineZ(worldX: number): number {
  return -28.0 + Math.sin(worldX * 0.028) * 14.0 + Math.cos(worldX * 0.011) * 7.5;
}

/**
 * Evaluates 3D Simplex Worm Tunnel Signed Distance Field (SDF) for Subterranean Caves & Overhangs.
 * Negative values indicate hollowed-out cavern interiors.
 */
export function evaluateCaveWormTunnelSDF(worldX: number, worldY: number, worldZ: number): number {
  const tunnel1 = Math.abs(smoothNoise3D(worldX * 0.035, worldY * 0.06, worldZ * 0.035));
  const tunnel2 = Math.abs(smoothNoise3D(worldX * 0.042 + 13.7, worldY * 0.065, worldZ * 0.042 - 7.3));
  const wormRadius = 0.22;
  return Math.sqrt(tunnel1 * tunnel1 + tunnel2 * tunnel2) - wormRadius;
}

/**
 * Classifies any (worldX, worldZ) coordinate into one of the 6 Seamless Biomes
 * based on altitude, moisture fBm, and cave worm-tunnel depth.
 */
export function classifyOpenWorldBiome(
  worldX: number,
  worldZ: number,
  heightY?: number
): OpenWorldBiomeDefinition {
  const h = heightY !== undefined ? heightY : evaluateMultifractalTerrainHeight(worldX, worldZ);
  const moisture = 0.5 + 0.5 * smoothNoise2D(worldX * 0.006 - 4.2, worldZ * 0.006 + 7.1);
  const tectonicHeat = 0.5 + 0.5 * smoothNoise2D(worldX * 0.005 + 21.4, worldZ * 0.005 - 11.8);
  const caveSdf = evaluateCaveWormTunnelSDF(worldX, h - 1.5, worldZ);

  if (h >= 13.5) {
    return OPEN_WORLD_BIOMES.snowy_fuji_peaks;
  }
  if (h < -1.4 || (h < 6.0 && caveSdf < 0)) {
    return OPEN_WORLD_BIOMES.bioluminescent_crystal_caves;
  }
  if (tectonicHeat > 0.72 && moisture < 0.42) {
    return OPEN_WORLD_BIOMES.volcanic_oni_caldera;
  }
  if (moisture > 0.66) {
    return OPEN_WORLD_BIOMES.misty_bamboo_forest;
  }
  if (moisture < 0.36) {
    return OPEN_WORLD_BIOMES.ruined_castle_town;
  }
  return OPEN_WORLD_BIOMES.crimson_momiji_valley;
}

/**
 * Catenary Rope Suspension Bridge Sag Evaluator:
 * y(u) = y_arch(u) - k_cosh * (cosh((u - 0.5)*2) - 1) - sag(u, u_player)
 */
export function evaluateCatenaryBridgeHeight(
  uNorm: number,
  baseY: number,
  archHeight: number,
  playerNormU: number | null,
  playerWeightKg = 82
): number {
  const u = Math.max(0, Math.min(1, uNorm));
  const centered = (u - 0.5) * 2.0; // [-1, 1]
  const arch = archHeight * (1.0 - centered * centered);
  let dynamicSag = 0;
  if (playerNormU !== null && playerNormU >= 0 && playerNormU <= 1) {
    const dist = Math.abs(u - playerNormU);
    const envelope = Math.sin(u * Math.PI);
    dynamicSag = Math.max(0, 1.0 - dist * 2.5) * envelope * (playerWeightKg / 82) * 0.24;
  }
  return baseY + arch - dynamicSag;
}

/**
 * Custom GLSL 2D Shallow-Water Wave Equation & Interactive Ripple Shader
 */
export function createShallowWaterWaveMaterial(waterTintHex = 0x164e63): THREE.ShaderMaterial {
  const tint = new THREE.Color(waterTintHex);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPlayerWorldPos: { value: new THREE.Vector3(0, 0, 0) },
      uRippleStrength: { value: 0.0 },
      uWaterTint: { value: new THREE.Vector3(tint.r, tint.g, tint.b) },
      uDeepTint: { value: new THREE.Vector3(tint.r * 0.38, tint.g * 0.42, tint.b * 0.52) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uPlayerWorldPos;
      uniform float uRippleStrength;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vWaveHeight;

      void main() {
        vUv = uv;
        vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
        vec3 wPos = worldPos4.xyz;

        float w1 = sin(wPos.x * 0.42 + uTime * 2.2) * cos(wPos.z * 0.36 + uTime * 1.7) * 0.09;
        float w2 = sin((wPos.x * 0.85 - wPos.z * 0.65) + uTime * 3.4) * 0.045;

        float distToPlayer = length(wPos.xz - uPlayerWorldPos.xz);
        float playerRipple = 0.0;
        if (distToPlayer < 8.5) {
          float falloff = 1.0 - (distToPlayer / 8.5);
          playerRipple = sin(distToPlayer * 5.5 - uTime * 11.0) * falloff * falloff * (0.08 + uRippleStrength * 0.16);
        }

        vWaveHeight = w1 + w2 + playerRipple;
        wPos.y += vWaveHeight;
        vWorldPos = wPos;

        gl_Position = projectionMatrix * viewMatrix * vec4(wPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uPlayerWorldPos;
      uniform vec3 uWaterTint;
      uniform vec3 uDeepTint;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vWaveHeight;

      void main() {
        vec3 n = normalize(vec3(
          -cos(vWorldPos.x * 0.42 + uTime * 2.2) * 0.18,
          1.0,
          -sin(vWorldPos.z * 0.36 + uTime * 1.7) * 0.18
        ));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(0.0, dot(viewDir, n)), 3.2);

        float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float shoreFoam = smoothstep(0.09, 0.01, edgeDist);
        float crestFoam = smoothstep(0.065, 0.13, vWaveHeight);

        float distToPlayer = length(vWorldPos.xz - uPlayerWorldPos.xz);
        float wakeFoam = smoothstep(2.4, 0.45, distToPlayer) * (0.5 + 0.5 * sin(distToPlayer * 8.0 - uTime * 12.0));

        vec3 baseCol = mix(uDeepTint, uWaterTint, 0.45 + 0.55 * fresnel);
        vec3 skyRefl = vec3(0.86, 0.89, 0.94);
        vec3 col = mix(baseCol, skyRefl, fresnel * 0.58);
        float totalFoam = clamp(shoreFoam * 0.75 + crestFoam * 0.65 + wakeFoam * 0.7, 0.0, 1.0);
        col = mix(col, vec3(0.96, 0.97, 0.99), totalFoam);

        gl_FragColor = vec4(col, 0.84);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Quadtree CDLOD Terrain Chunk Entry & Floating Origin Manager
 */
export interface CDLODChunkEntry {
  key: string;
  chunkX: number;
  chunkZ: number;
  lodLevel: 0 | 1 | 2;
  mesh: THREE.Mesh;
  propGroup: THREE.Group;
  disposableMaterials: THREE.Material[];
  caveOverhangMesh?: THREE.Mesh;
  dominantBiome: OpenWorldBiomeDefinition;
}

export interface FloatingOriginTelemetry {
  floatingOriginShiftCount: number;
  accumulatedWorldOffset: { x: number; y: number; z: number };
  activeChunkCount: number;
  disposedChunkCount: number;
  currentBiome: OpenWorldBiomeDefinition;
  currentElevationMeters: number;
  inSubterraneanCave: boolean;
  inShallowWater: boolean;
  onSuspensionBridge: boolean;
}

export class InfiniteOpenWorldCDLODManager {
  public readonly chunkSize = 80; // 80m x 80m per chunk (5x5 active grid = 400m x 400m seamless world window)
  public readonly gridRadius = 2; // 5x5 = 25 active chunks
  public readonly maxRetentionDistance = 300; // Strictly dispose chunks > 300m away
  public readonly floatingOriginThreshold = 2000; // meters (||p_player|| > 2000m)
  public readonly chunks = new Map<string, CDLODChunkEntry>();
  public readonly chunkGroup = new THREE.Group();
  public waterMesh: THREE.Mesh | null = null;
  public waterMaterial: THREE.ShaderMaterial | null = null;
  public bridgeGroup = new THREE.Group();

  private accumulatedOffset = new THREE.Vector3(0, 0, 0);
  private shiftCount = 0;
  private disposedCount = 0;
  private lastCenterChunkX = 99999;
  private lastCenterChunkZ = 99999;

  // Shared high-subdivision procedural geometries for zero-leak chunk prop population
  private sharedGrassGeo: THREE.BufferGeometry | null = null;
  private sharedBambooGeo: THREE.BufferGeometry | null = null;
  private sharedTreeTrunkGeo: THREE.BufferGeometry | null = null;
  private sharedCanopyPadGeo: THREE.BufferGeometry | null = null;
  private sharedBoulderGeo: THREE.BufferGeometry | null = null;
  private sharedLanternGeo: THREE.BufferGeometry | null = null;
  private sharedToriiPillarGeo: THREE.BufferGeometry | null = null;
  private sharedToriiKasagiGeo: THREE.BufferGeometry | null = null;

  constructor() {
    this.chunkGroup.name = 'CDLOD_Infinite_Archipelago';
  }

  private ensureSharedPropGeometries() {
    if (this.sharedGrassGeo) return;
    this.sharedGrassGeo = createMultiBladeGrassClumpGeometry(9);
    this.sharedBambooGeo = createSegmentedBambooWithNodesGeometry(8.2);
    this.sharedTreeTrunkGeo = createTubularPathGeometry(
      [
        [0, -0.2, 0],
        [0.24, 1.45, 0.12],
        [-0.18, 3.1, -0.14],
        [0.32, 4.65, 0.18],
        [0.12, 5.8, 0.05],
      ],
      0.28,
      24,
      12
    );
    this.sharedCanopyPadGeo = createSplineLatheGeometry(
      [
        [0.08, -0.28],
        [1.45, -0.12],
        [1.85, 0.18],
        [0.98, 0.55],
        [0.05, 0.72],
      ],
      24
    );
    this.sharedBoulderGeo = createSplineLatheGeometry(
      [
        [0.05, -0.45],
        [1.15, -0.18],
        [0.98, 0.38],
        [0.52, 0.82],
        [0.04, 0.96],
      ],
      28
    );
    this.sharedLanternGeo = createSplineLatheGeometry(
      [
        [0.36, 0],
        [0.24, 0.25],
        [0.14, 1.15],
        [0.38, 1.32],
        [0.32, 1.78],
        [0.54, 1.92],
        [0.04, 2.28],
      ],
      28
    );
    this.sharedToriiPillarGeo = createSplineLatheGeometry(
      [
        [0.24, 0],
        [0.2, 3.2],
        [0.18, 6.2],
      ],
      28
    );
    this.sharedToriiKasagiGeo = createTubularPathGeometry(
      [
        [-4.2, 6.45, 0],
        [-2.0, 6.08, 0],
        [0, 5.98, 0],
        [2.0, 6.08, 0],
        [4.2, 6.45, 0],
      ],
      0.24,
      28,
      14
    );
  }

  /**
   * Computes exact ground or arched Taiko-bashi bridge height at any local (x, z) position
   * so the Samurai, enemies, and props follow the continuous 3D topography and bridges.
   */
  public getGroundAndBridgeHeightAt(localX: number, localZ: number): number {
    const trueWorldX = localX + this.accumulatedOffset.x;
    const trueWorldZ = localZ + this.accumulatedOffset.z;
    const riverZ = evaluateRiverCenterlineZ(trueWorldX);
    const bridgeHalfLen = 9.0;
    // Arched bridge spans across the river at localX in [-2.1, 2.1] and every 160m along X
    const nearestBridgeX = Math.round(trueWorldX / 160) * 160;
    const onBridgeX = Math.abs(trueWorldX - nearestBridgeX) <= 2.15;
    const bridgeRiverZ = evaluateRiverCenterlineZ(nearestBridgeX);
    if (onBridgeX && Math.abs(trueWorldZ - bridgeRiverZ) <= bridgeHalfLen) {
      const u = (trueWorldZ - (bridgeRiverZ - bridgeHalfLen)) / (bridgeHalfLen * 2);
      return evaluateCatenaryBridgeHeight(u, 0.1, 2.15, u);
    }
    return evaluateMultifractalTerrainHeight(trueWorldX, trueWorldZ);
  }

  public initWaterAndBridges(scene: THREE.Scene, normalMap: THREE.Texture, bumpMap: THREE.Texture) {
    if (!this.waterMaterial) {
      this.waterMaterial = createShallowWaterWaveMaterial(0x164e63);
    }
    if (!this.waterMesh) {
      const waterGeo = new THREE.PlaneGeometry(420, 20, 128, 16);
      waterGeo.rotateX(-Math.PI / 2);
      const pos = waterGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i);
        const wzOffset = pos.getZ(i);
        pos.setZ(i, evaluateRiverCenterlineZ(wx) + wzOffset);
      }
      waterGeo.computeVertexNormals();
      this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
      this.waterMesh.position.y = -0.32;
      this.chunkGroup.add(this.waterMesh);
    }

    while (this.bridgeGroup.children.length > 0) {
      this.bridgeGroup.remove(this.bridgeGroup.children[0]);
    }
    const lacquerRed = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.35,
      metalness: 0.18,
      normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
      bumpMap,
      bumpScale: 0.02,
    });
    const timberDark = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.78,
      metalness: 0.08,
      normalMap,
      normalScale: new THREE.Vector2(2.0, 2.0),
      bumpMap,
      bumpScale: 0.03,
    });

    const bridgeRiverZ = evaluateRiverCenterlineZ(0);
    const plankCount = 22;
    const bridgeLength = 18.0;
    for (let p = 0; p < plankCount; p++) {
      const u = p / (plankCount - 1);
      const zLocal = (u - 0.5) * bridgeLength;
      const yArch = evaluateCatenaryBridgeHeight(u, 0.1, 2.15, null);

      const plankShape = new THREE.Shape();
      plankShape.moveTo(-1.85, -0.07);
      plankShape.lineTo(1.85, -0.07);
      plankShape.lineTo(1.82, 0.07);
      plankShape.lineTo(-1.82, 0.07);
      plankShape.closePath();
      const plankGeo = new THREE.ExtrudeGeometry(plankShape, {
        depth: 0.68,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      plankGeo.center();
      const plankMesh = new THREE.Mesh(plankGeo, p % 2 === 0 ? timberDark : lacquerRed);
      plankMesh.position.set(0, yArch, bridgeRiverZ + zLocal);
      plankMesh.userData.uNorm = u;
      this.bridgeGroup.add(plankMesh);
    }

    for (const sideX of [-1.85, 1.85]) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 24; s++) {
        const u = s / 24;
        const z = bridgeRiverZ + (u - 0.5) * bridgeLength;
        const y = evaluateCatenaryBridgeHeight(u, 0.95, 2.15, null) + Math.cosh((u - 0.5) * 2.2) * 0.25;
        pts.push(new THREE.Vector3(sideX, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const ropeGeo = new THREE.TubeGeometry(curve, 32, 0.045, 8, false);
      this.bridgeGroup.add(new THREE.Mesh(ropeGeo, lacquerRed));
    }

    this.chunkGroup.add(this.bridgeGroup);
    if (!this.chunkGroup.parent) {
      scene.add(this.chunkGroup);
    }
  }

  /**
   * Executes Floating-Origin Coordinate Recentering when ||p_player|| > 2000m
   * and streams a 5x5 grid of 80m x 80m chunks dynamically around the player's (x, z).
   */
  public updateStreamedWorld(
    playerPos: THREE.Vector3,
    timeSec: number,
    normalMap: THREE.Texture,
    bumpMap: THREE.Texture,
    onOriginShift?: (shiftDelta: THREE.Vector3) => void,
    onChunkGenerated?: (
      cx: number,
      cz: number,
      chunkWorldCenterX: number,
      chunkWorldCenterZ: number,
      biome: OpenWorldBiomeDefinition
    ) => void
  ): FloatingOriginTelemetry {
    // 1. Floating Origin Recentering Check: ||p_player|| > 2000m
    const horizontalDist = Math.hypot(playerPos.x, playerPos.z);
    if (horizontalDist > this.floatingOriginThreshold) {
      const shiftDelta = new THREE.Vector3(playerPos.x, 0, playerPos.z);
      this.accumulatedOffset.add(shiftDelta);
      playerPos.sub(shiftDelta);
      this.shiftCount++;
      this.lastCenterChunkX = 99999;
      if (onOriginShift) {
        onOriginShift(shiftDelta);
      }
    }

    const trueWorldX = playerPos.x + this.accumulatedOffset.x;
    const trueWorldZ = playerPos.z + this.accumulatedOffset.z;

    const centerCX = Math.round(playerPos.x / this.chunkSize);
    const centerCZ = Math.round(playerPos.z / this.chunkSize);

    if (centerCX !== this.lastCenterChunkX || centerCZ !== this.lastCenterChunkZ) {
      this.lastCenterChunkX = centerCX;
      this.lastCenterChunkZ = centerCZ;
      this.rebuildConcentricChunks(centerCX, centerCZ, normalMap, bumpMap, onChunkGenerated);
    }

    // Update Shallow-Water Shader Uniforms
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value = timeSec;
      this.waterMaterial.uniforms.uPlayerWorldPos.value.copy(playerPos);
    }

    const riverZ = evaluateRiverCenterlineZ(trueWorldX);
    const bridgeHalfLen = 9.0;
    const onBridge =
      Math.abs(playerPos.x) <= 2.15 && Math.abs(playerPos.z - riverZ) <= bridgeHalfLen;
    const playerBridgeU = onBridge
      ? (playerPos.z - (riverZ - bridgeHalfLen)) / (bridgeHalfLen * 2)
      : null;

    for (const child of this.bridgeGroup.children) {
      if (typeof child.userData.uNorm === 'number') {
        child.position.y = evaluateCatenaryBridgeHeight(
          child.userData.uNorm,
          0.1,
          2.15,
          playerBridgeU
        );
      }
    }

    const terrainY = evaluateMultifractalTerrainHeight(trueWorldX, trueWorldZ);
    const currentBiome = classifyOpenWorldBiome(trueWorldX, trueWorldZ, terrainY);
    const caveSdf = evaluateCaveWormTunnelSDF(trueWorldX, playerPos.y, trueWorldZ);
    const inWater = !onBridge && Math.abs(playerPos.z - riverZ) < 6.8 && terrainY < 0.25;

    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uRippleStrength.value = inWater ? 1.0 : 0.15;
    }

    return {
      floatingOriginShiftCount: this.shiftCount,
      accumulatedWorldOffset: {
        x: Math.round(this.accumulatedOffset.x),
        y: Math.round(this.accumulatedOffset.y),
        z: Math.round(this.accumulatedOffset.z),
      },
      activeChunkCount: this.chunks.size,
      disposedChunkCount: this.disposedCount,
      currentBiome,
      currentElevationMeters: Number(terrainY.toFixed(2)),
      inSubterraneanCave: caveSdf < 0,
      inShallowWater: inWater,
      onSuspensionBridge: onBridge,
    };
  }

  private rebuildConcentricChunks(
    centerCX: number,
    centerCZ: number,
    normalMap: THREE.Texture,
    bumpMap: THREE.Texture,
    onChunkGenerated?: (
      cx: number,
      cz: number,
      chunkWorldCenterX: number,
      chunkWorldCenterZ: number,
      biome: OpenWorldBiomeDefinition
    ) => void
  ) {
    this.ensureSharedPropGeometries();
    const neededKeys = new Set<string>();
    const radius = this.gridRadius; // 5x5 grid (-2..+2 in X and Z = 25 chunks of 80m x 80m)

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        const ringDist = Math.max(Math.abs(dx), Math.abs(dz));
        const lodLevel: 0 | 1 | 2 = ringDist === 0 ? 0 : ringDist === 1 ? 1 : 2;
        const key = `${cx}:${cz}`;
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          const entry = this.buildChunkMeshAndProps(cx, cz, lodLevel, normalMap, bumpMap);
          this.chunks.set(key, entry);
          this.chunkGroup.add(entry.mesh);
          this.chunkGroup.add(entry.propGroup);
          if (entry.caveOverhangMesh) {
            this.chunkGroup.add(entry.caveOverhangMesh);
          }
          if (onChunkGenerated) {
            const chunkWorldCenterX = cx * this.chunkSize + this.accumulatedOffset.x;
            const chunkWorldCenterZ = cz * this.chunkSize + this.accumulatedOffset.z;
            onChunkGenerated(cx, cz, chunkWorldCenterX, chunkWorldCenterZ, entry.dominantBiome);
          }
        }
      }
    }

    // Strict GPU Memory Disposal for chunks outside the active 5x5 window or > 300m away
    for (const [key, entry] of this.chunks.entries()) {
      const distMeters = Math.hypot(
        (entry.chunkX - centerCX) * this.chunkSize,
        (entry.chunkZ - centerCZ) * this.chunkSize
      );
      if (!neededKeys.has(key) || distMeters > this.maxRetentionDistance) {
        this.disposeChunkEntry(entry);
        this.chunks.delete(key);
        this.disposedCount++;
      }
    }
  }

  private disposeChunkEntry(entry: CDLODChunkEntry) {
    this.chunkGroup.remove(entry.mesh);
    this.chunkGroup.remove(entry.propGroup);
    entry.mesh.geometry.dispose();
    if (Array.isArray(entry.mesh.material)) {
      entry.mesh.material.forEach((m) => m.dispose());
    } else {
      entry.mesh.material.dispose();
    }
    for (const mat of entry.disposableMaterials) {
      mat.dispose();
    }
    if (entry.caveOverhangMesh) {
      this.chunkGroup.remove(entry.caveOverhangMesh);
      entry.caveOverhangMesh.geometry.dispose();
      (entry.caveOverhangMesh.material as THREE.Material).dispose();
    }
  }

  private buildChunkMeshAndProps(
    cx: number,
    cz: number,
    lodLevel: 0 | 1 | 2,
    normalMap: THREE.Texture,
    bumpMap: THREE.Texture
  ): CDLODChunkEntry {
    const segs = lodLevel === 0 ? 36 : lodLevel === 1 ? 24 : 16;
    const geo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const colObj = new THREE.Color();
    const trailColObj = new THREE.Color(0x6e5a47); // Weathered mountain cobblestone/dirt trail

    const chunkWorldCenterX = cx * this.chunkSize + this.accumulatedOffset.x;
    const chunkWorldCenterZ = cz * this.chunkSize + this.accumulatedOffset.z;
    const dominantBiome = classifyOpenWorldBiome(chunkWorldCenterX, chunkWorldCenterZ);

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = chunkWorldCenterX + lx;
      const wz = chunkWorldCenterZ + lz;
      let h = evaluateMultifractalTerrainHeight(wx, wz);

      // Skirt stitching along chunk border to eliminate T-junction cracks between LOD tiers
      const isEdge =
        Math.abs(Math.abs(lx) - this.chunkSize * 0.5) < 0.05 ||
        Math.abs(Math.abs(lz) - this.chunkSize * 0.5) < 0.05;
      if (isEdge && lodLevel > 0) {
        h -= 0.16;
      }

      pos.setY(i, h);

      const biome = classifyOpenWorldBiome(wx, wz, h);
      colObj.setHex(h > 4.2 ? biome.cliffHex : biome.groundHex);

      // Blend organic winding mountain dirt/cobblestone trail into terrain vertex colors
      const trailFactor = evaluateWindingTrailFactor(wx, wz);
      if (trailFactor > 0.01 && h > -0.25) {
        colObj.lerp(trailColObj, trailFactor * 0.72);
      }

      colors[i * 3] = colObj.r;
      colors[i * 3 + 1] = colObj.g;
      colors[i * 3 + 2] = colObj.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.08,
      normalMap,
      normalScale: new THREE.Vector2(2.2, 2.2),
      bumpMap,
      bumpScale: 0.06,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx * this.chunkSize, -0.02, cz * this.chunkSize);
    mesh.receiveShadow = true;

    // ========================================================================
    // PER-CHUNK BOTANICAL & ARCHITECTURAL POPULATION (ZERO CONES OR CYLINDERS)
    // ========================================================================
    const propGroup = new THREE.Group();
    propGroup.position.set(cx * this.chunkSize, 0, cz * this.chunkSize);
    const disposableMaterials: THREE.Material[] = [];

    const grassMat = new THREE.MeshStandardMaterial({
      color: dominantBiome.foliageHex,
      roughness: 0.65,
      metalness: 0.05,
      normalMap,
      normalScale: new THREE.Vector2(1.5, 1.5),
      side: THREE.DoubleSide,
    });
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x3e2c23,
      roughness: 0.85,
      metalness: 0.05,
      normalMap,
      normalScale: new THREE.Vector2(2.2, 2.2),
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.54,
      metalness: 0.08,
      normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: dominantBiome.cliffHex,
      roughness: 0.82,
      metalness: 0.1,
      normalMap,
      normalScale: new THREE.Vector2(2.4, 2.4),
    });
    const lacquerToriiMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.35,
      metalness: 0.18,
      normalMap,
      normalScale: new THREE.Vector2(1.8, 1.8),
    });
    disposableMaterials.push(grassMat, barkMat, bambooMat, stoneMat, lacquerToriiMat);

    // 1. Instanced Multi-Blade Curved Grass Clumps (44 clumps per chunk)
    if (this.sharedGrassGeo) {
      const grassCount = 44;
      const grassInst = new THREE.InstancedMesh(this.sharedGrassGeo, grassMat, grassCount);
      const dummy = new THREE.Object3D();
      for (let g = 0; g < grassCount; g++) {
        const h1 = hash2D(cx * 31 + g * 1.7, cz * 47 + g * 2.3);
        const h2 = hash2D(cx * 73 + g * 3.1, cz * 19 + g * 4.7);
        const lx = (h1 - 0.5) * (this.chunkSize - 6);
        const lz = (h2 - 0.5) * (this.chunkSize - 6);
        const wx = chunkWorldCenterX + lx;
        const wz = chunkWorldCenterZ + lz;
        // Keep central spawn plaza & river channel clear of grass tufts
        if (Math.hypot(wx, wz) < 8.5 || Math.abs(wz - evaluateRiverCenterlineZ(wx)) < 7.5) {
          dummy.scale.setScalar(0.001);
          dummy.position.set(0, -20, 0);
        } else {
          const gy = evaluateMultifractalTerrainHeight(wx, wz);
          dummy.position.set(lx, gy, lz);
          dummy.rotation.set(0, h1 * Math.PI * 2, 0);
          const sc = 0.85 + (g % 5) * 0.22;
          dummy.scale.set(sc, sc * (0.9 + (g % 3) * 0.2), sc);
        }
        dummy.updateMatrix();
        grassInst.setMatrixAt(g, dummy.matrix);
      }
      grassInst.instanceMatrix.needsUpdate = true;
      propGroup.add(grassInst);
    }

    // 2. Segmented Nodal Bamboo Groves & Gnarled Japanese Pine/Maple/Sakura Trees (10 per chunk)
    const treeCount = 10;
    for (let t = 0; t < treeCount; t++) {
      const h1 = hash2D(cx * 53 + t * 5.1, cz * 89 + t * 7.3);
      const h2 = hash2D(cx * 97 + t * 2.9, cz * 61 + t * 8.1);
      const lx = (h1 - 0.5) * (this.chunkSize - 14);
      const lz = (h2 - 0.5) * (this.chunkSize - 14);
      const wx = chunkWorldCenterX + lx;
      const wz = chunkWorldCenterZ + lz;

      // Keep immediate spawn/shrine glade, winding trails, and river channel navigable
      if (
        Math.hypot(wx, wz) < 15.0 ||
        Math.abs(wz - evaluateRiverCenterlineZ(wx)) < 9.5 ||
        evaluateWindingTrailFactor(wx, wz) > 0.25
      ) {
        continue;
      }

      const gy = evaluateMultifractalTerrainHeight(wx, wz);
      const useBamboo =
        dominantBiome.id === 'misty_bamboo_forest' || (t % 3 === 0 && dominantBiome.id !== 'snowy_fuji_peaks');

      if (useBamboo && this.sharedBambooGeo && this.sharedGrassGeo) {
        for (let b = 0; b < 3; b++) {
          const ang = (b / 3) * Math.PI * 2 + h1 * 3;
          const stalk = new THREE.Mesh(this.sharedBambooGeo, bambooMat);
          stalk.position.set(lx + Math.cos(ang) * 0.35, gy, lz + Math.sin(ang) * 0.35);
          const scY = 0.85 + (b % 3) * 0.14;
          stalk.scale.set(1, scY, 1);
          stalk.rotation.set((b - 1) * 0.03, ang, (1 - b) * 0.03);
          stalk.castShadow = true;
          propGroup.add(stalk);

          // Leaf canopy spray at top of bamboo stalk
          const canopy = new THREE.Mesh(this.sharedGrassGeo, grassMat);
          canopy.position.set(stalk.position.x, gy + 7.2 * scY, stalk.position.z);
          canopy.scale.set(1.6, 1.1, 1.6);
          propGroup.add(canopy);
        }
      } else if (this.sharedTreeTrunkGeo && this.sharedCanopyPadGeo) {
        const treeGrp = new THREE.Group();
        treeGrp.position.set(lx, gy, lz);
        treeGrp.rotation.y = h2 * Math.PI * 2;
        const sc = 0.82 + (t % 3) * 0.18;
        treeGrp.scale.setScalar(sc);

        const trunk = new THREE.Mesh(this.sharedTreeTrunkGeo, barkMat);
        trunk.castShadow = true;
        treeGrp.add(trunk);

        for (const [px, py, pz, psc] of [
          [1.65, 4.15, 0.55, 1.05],
          [-1.75, 4.65, -0.62, 1.12],
          [0.12, 5.95, -0.1, 1.38],
        ]) {
          const pad = new THREE.Mesh(this.sharedCanopyPadGeo, grassMat);
          pad.position.set(px, py, pz);
          pad.scale.set(psc, psc * 0.78, psc);
          pad.castShadow = true;
          treeGrp.add(pad);
        }
        propGroup.add(treeGrp);
      }
    }

    // 3. Mossy Boulders, Carved Stone Lanterns (Toro), and Landmark Torii Gates in every chunk
    if (this.sharedBoulderGeo && this.sharedLanternGeo && this.sharedToriiPillarGeo && this.sharedToriiKasagiGeo) {
      for (let r = 0; r < 5; r++) {
        const rh1 = hash2D(cx * 41 + r * 9.1, cz * 67 + r * 3.7);
        const rh2 = hash2D(cx * 29 + r * 6.3, cz * 83 + r * 5.9);
        const rx = (rh1 - 0.5) * (this.chunkSize - 12);
        const rz = (rh2 - 0.5) * (this.chunkSize - 12);
        const wx = chunkWorldCenterX + rx;
        const wz = chunkWorldCenterZ + rz;
        if (Math.hypot(wx, wz) < 14.0 || Math.abs(wz - evaluateRiverCenterlineZ(wx)) < 8.0) continue;
        const ry = evaluateMultifractalTerrainHeight(wx, wz);

        const boulder = new THREE.Mesh(this.sharedBoulderGeo, stoneMat);
        boulder.position.set(rx, ry, rz);
        boulder.scale.set(0.9 + rh1 * 1.1, 0.7 + rh2 * 0.8, 0.9 + rh2 * 1.1);
        boulder.rotation.set(rh1 * 0.4, rh2 * Math.PI * 2, rh2 * 0.4);
        boulder.castShadow = true;
        boulder.receiveShadow = true;
        propGroup.add(boulder);
      }

      // Deterministic Sacred Torii Gate & Stone Lantern Landmark per outer chunk
      if (cx !== 0 || cz !== 0) {
        const lh1 = hash2D(cx * 113 + 7.1, cz * 131 + 3.3);
        const lx = (lh1 - 0.5) * 26;
        const lz = (hash2D(cx * 149, cz * 163) - 0.5) * 26;
        const wx = chunkWorldCenterX + lx;
        const wz = chunkWorldCenterZ + lz;
        if (Math.abs(wz - evaluateRiverCenterlineZ(wx)) > 9.5) {
          const ly = evaluateMultifractalTerrainHeight(wx, wz);
          const toriiGrp = new THREE.Group();
          toriiGrp.position.set(lx, ly, lz);
          toriiGrp.rotation.y = lh1 * Math.PI;

          const pL = new THREE.Mesh(this.sharedToriiPillarGeo, lacquerToriiMat);
          pL.position.set(-2.5, 0, 0);
          pL.castShadow = true;
          const pR = new THREE.Mesh(this.sharedToriiPillarGeo, lacquerToriiMat);
          pR.position.set(2.5, 0, 0);
          pR.castShadow = true;
          const kasagi = new THREE.Mesh(this.sharedToriiKasagiGeo, lacquerToriiMat);
          kasagi.castShadow = true;
          toriiGrp.add(pL, pR, kasagi);

          const lantern = new THREE.Mesh(this.sharedLanternGeo, stoneMat);
          lantern.position.set(3.8, 0, 1.4);
          lantern.castShadow = true;
          toriiGrp.add(lantern);

          propGroup.add(toriiGrp);
        }
      }
    }

    return {
      key: `${cx}:${cz}`,
      chunkX: cx,
      chunkZ: cz,
      lodLevel,
      mesh,
      propGroup,
      disposableMaterials,
      dominantBiome,
    };
  }

  public disposeAll() {
    for (const [, entry] of this.chunks.entries()) {
      this.disposeChunkEntry(entry);
    }
    this.chunks.clear();
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
    }
    if (this.waterMaterial) {
      this.waterMaterial.dispose();
    }
  }
}

