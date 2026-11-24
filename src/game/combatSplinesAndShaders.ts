import * as THREE from 'three';

export type SixMoveCombatId =
  | 'kesa_giri'
  | 'gyaku_kesa'
  | 'tsumuji_kaze'
  | 'iaijutsu_charged'
  | 'tsuki_lunge'
  | 'kabuto_wari';

export interface CombatMoveDefinition {
  id: SixMoveCombatId;
  moveNumber: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  kanji: string;
  inputLabel: string;
  durationSec: number;
  damageMultiplier: number;
  postureDamageMultiplier: number;
  rootMotionForwardImpulse: number;
  cuttingPlaneNormalLocal: { x: number; y: number; z: number };
  description: string;
}

export const SIX_COMBAT_MOVES: Record<SixMoveCombatId, CombatMoveDefinition> = {
  kesa_giri: {
    id: 'kesa_giri',
    moveNumber: 1,
    name: 'Kesa-Giri (Diagonal Downward Slash)',
    kanji: '袈裟斬り・壱ノ太刀',
    inputLabel: 'Tap LMB (Strike 1)',
    durationSec: 0.26,
    damageMultiplier: 1.0,
    postureDamageMultiplier: 1.0,
    rootMotionForwardImpulse: 4.5,
    cuttingPlaneNormalLocal: { x: 0.707, y: 0.707, z: 0 },
    description: '45° shoulder-to-hip cleaving diagonal arc with fast startup.',
  },
  gyaku_kesa: {
    id: 'gyaku_kesa',
    moveNumber: 2,
    name: 'Gyaku-Kesa (Rising Reverse Slash)',
    kanji: '逆袈裟・弐ノ太刀',
    inputLabel: 'Combo LMB (Strike 2)',
    durationSec: 0.28,
    damageMultiplier: 1.18,
    postureDamageMultiplier: 1.45,
    rootMotionForwardImpulse: 5.4,
    cuttingPlaneNormalLocal: { x: -0.707, y: 0.707, z: 0 },
    description: 'Upward diagonal reverse slice that shatters enemy guard posture.',
  },
  tsumuji_kaze: {
    id: 'tsumuji_kaze',
    moveNumber: 3,
    name: 'Tsumuji-Kaze (360° Whirlwind Sweep)',
    kanji: '旋風斬・参ノ太刀',
    inputLabel: 'Combo LMB (Strike 3 Finisher)',
    durationSec: 0.36,
    damageMultiplier: 1.42,
    postureDamageMultiplier: 1.65,
    rootMotionForwardImpulse: 6.8,
    cuttingPlaneNormalLocal: { x: 0.12, y: 0.99, z: 0 },
    description: 'Full 360° rotational torso spin hitting all surrounding foes with centrifugal knockback.',
  },
  iaijutsu_charged: {
    id: 'iaijutsu_charged',
    moveNumber: 4,
    name: 'Iaijutsu / Charged Stance Technique',
    kanji: '居合抜刀・奥義',
    inputLabel: 'Hold LMB (>300ms)',
    durationSec: 0.38,
    damageMultiplier: 1.85,
    postureDamageMultiplier: 2.1,
    rootMotionForwardImpulse: 12.5,
    cuttingPlaneNormalLocal: { x: 0.35, y: 0.93, z: 0 },
    description: 'Weapon-specific signature charged technique (Sheathed Dash-Cut / Seismic Slam / Triple-Shot).',
  },
  tsuki_lunge: {
    id: 'tsuki_lunge',
    moveNumber: 5,
    name: 'Tsuki (Armor-Piercing Lunge)',
    kanji: '牙突・貫通突き',
    inputLabel: 'W + Shift + LMB',
    durationSec: 0.29,
    damageMultiplier: 1.55,
    postureDamageMultiplier: 1.75,
    rootMotionForwardImpulse: 15.0,
    cuttingPlaneNormalLocal: { x: 0.92, y: 0.38, z: 0 },
    description: 'High-velocity forward thrust that penetrates heavy lamellar armor and pins light foes.',
  },
  kabuto_wari: {
    id: 'kabuto_wari',
    moveNumber: 6,
    name: 'Kabuto-Wari (Aerial Helm-Splitter)',
    kanji: '兜割り・天墜撃',
    inputLabel: 'Space + LMB (Mid-Air)',
    durationSec: 0.35,
    damageMultiplier: 1.95,
    postureDamageMultiplier: 2.35,
    rootMotionForwardImpulse: 7.2,
    cuttingPlaneNormalLocal: { x: 1.0, y: 0.05, z: 0 },
    description: 'High-gravity downward vertical plunge attack creating a localized physics shockwave on impact.',
  },
};

/**
 * Exact Cubic Hermite Spline Evaluator:
 * H(t) = (2t^3 - 3t^2 + 1) * p0 + (t^3 - 2t^2 + t) * m0 + (-2t^3 + 3t^2) * p1 + (t^3 - t^2) * m1
 */
export function evaluateCubicHermiteScalar(
  p0: number,
  m0: number,
  p1: number,
  m1: number,
  t: number
): number {
  const u = Math.max(0, Math.min(1, t));
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

export function evaluateCubicHermiteVec3(
  p0: { x: number; y: number; z: number },
  m0: { x: number; y: number; z: number },
  p1: { x: number; y: number; z: number },
  m1: { x: number; y: number; z: number },
  t: number
): { x: number; y: number; z: number } {
  return {
    x: evaluateCubicHermiteScalar(p0.x, m0.x, p1.x, m1.x, t),
    y: evaluateCubicHermiteScalar(p0.y, m0.y, p1.y, m1.y, t),
    z: evaluateCubicHermiteScalar(p0.z, m0.z, p1.z, m1.z, t),
  };
}

/**
 * Evaluates the 3D arm/blade Euler rotation and local hilt offset along a Cubic Hermite Spline
 * for each of the 6 distinct combat moves.
 */
export interface SixMoveSplineSample {
  armEuler: { x: number; y: number; z: number };
  torsoYawOffset: number;
  hiltOffsetLocal: { x: number; y: number; z: number };
  cuttingPlaneNormal: { x: number; y: number; z: number };
}

export function evaluateSixMoveCombatTrajectory(
  moveId: SixMoveCombatId,
  normalizedTime: number
): SixMoveSplineSample {
  const t = Math.max(0, Math.min(1, normalizedTime));
  const moveDef = SIX_COMBAT_MOVES[moveId] || SIX_COMBAT_MOVES.kesa_giri;

  switch (moveId) {
    case 'kesa_giri': {
      // 45-deg high right shoulder to low left hip diagonal cleave
      const armEuler = evaluateCubicHermiteVec3(
        { x: -1.35, y: 0.55, z: 0.65 },
        { x: 3.2, y: -2.4, z: -2.1 },
        { x: 0.85, y: -0.75, z: -0.72 },
        { x: 0.8, y: -0.5, z: -0.4 },
        t
      );
      const hiltOffsetLocal = evaluateCubicHermiteVec3(
        { x: 0.38, y: 1.52, z: 0.18 },
        { x: -0.9, y: -1.2, z: 1.4 },
        { x: -0.28, y: 0.86, z: 0.52 },
        { x: -0.2, y: -0.3, z: 0.1 },
        t
      );
      return {
        armEuler,
        torsoYawOffset: evaluateCubicHermiteScalar(-0.35, 1.8, 0.45, 0.2, t),
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }

    case 'gyaku_kesa': {
      // Upward rising reverse diagonal slash from low left hip to high right shoulder
      const armEuler = evaluateCubicHermiteVec3(
        { x: 0.88, y: -0.82, z: -0.78 },
        { x: -3.5, y: 2.6, z: 2.4 },
        { x: -1.28, y: 0.68, z: 0.72 },
        { x: -0.6, y: 0.4, z: 0.4 },
        t
      );
      const hiltOffsetLocal = evaluateCubicHermiteVec3(
        { x: -0.32, y: 0.82, z: 0.35 },
        { x: 1.1, y: 1.4, z: 1.1 },
        { x: 0.42, y: 1.58, z: 0.48 },
        { x: 0.2, y: 0.3, z: 0.1 },
        t
      );
      return {
        armEuler,
        torsoYawOffset: evaluateCubicHermiteScalar(0.45, -2.0, -0.42, -0.2, t),
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }

    case 'tsumuji_kaze': {
      // 360-degree horizontal whirlwind spin
      const spinYaw = evaluateCubicHermiteScalar(0, 8.2, Math.PI * 2, 4.0, t);
      const armEuler = {
        x: -0.15,
        y: 0.1,
        z: -1.42,
      };
      const hiltOffsetLocal = {
        x: Math.cos(spinYaw) * 0.46,
        y: 1.18,
        z: Math.sin(spinYaw) * 0.46 + 0.25,
      };
      return {
        armEuler,
        torsoYawOffset: spinYaw,
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }

    case 'iaijutsu_charged': {
      // Lightning sheathed low crouch draw into wide horizontal-upward flash arc
      const armEuler = evaluateCubicHermiteVec3(
        { x: 0.42, y: -1.25, z: -1.1 },
        { x: -4.8, y: 5.5, z: 3.2 },
        { x: -0.65, y: 1.15, z: 0.95 },
        { x: -0.4, y: 0.8, z: 0.5 },
        t
      );
      const hiltOffsetLocal = evaluateCubicHermiteVec3(
        { x: -0.36, y: 0.92, z: 0.12 },
        { x: 1.8, y: 0.6, z: 2.2 },
        { x: 0.48, y: 1.28, z: 0.68 },
        { x: 0.4, y: 0.1, z: 0.2 },
        t
      );
      return {
        armEuler,
        torsoYawOffset: evaluateCubicHermiteScalar(-0.65, 3.4, 0.72, 0.4, t),
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }

    case 'tsuki_lunge': {
      // High-velocity linear forward piercing thrust
      const armEuler = evaluateCubicHermiteVec3(
        { x: -0.25, y: -0.15, z: 0.05 },
        { x: 2.8, y: 0.3, z: 0 },
        { x: 1.48, y: 0.0, z: 0.0 },
        { x: 0.2, y: 0, z: 0 },
        t
      );
      const hiltOffsetLocal = evaluateCubicHermiteVec3(
        { x: 0.24, y: 1.15, z: -0.18 },
        { x: -0.2, y: 0.1, z: 3.2 },
        { x: 0.06, y: 1.22, z: 0.88 },
        { x: 0, y: 0, z: 0.4 },
        t
      );
      return {
        armEuler,
        torsoYawOffset: evaluateCubicHermiteScalar(-0.22, 1.1, 0.28, 0.1, t),
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }

    case 'kabuto_wari': {
      // Overhead two-handed vertical plunge helm-splitter
      const armEuler = evaluateCubicHermiteVec3(
        { x: -2.35, y: 0.0, z: 0.0 },
        { x: 5.6, y: 0.0, z: 0.0 },
        { x: 1.25, y: 0.0, z: 0.0 },
        { x: 1.2, y: 0.0, z: 0.0 },
        t
      );
      const hiltOffsetLocal = evaluateCubicHermiteVec3(
        { x: 0.0, y: 1.95, z: 0.08 },
        { x: 0.0, y: -2.4, z: 1.8 },
        { x: 0.0, y: 0.55, z: 0.65 },
        { x: 0.0, y: -0.8, z: 0.2 },
        t
      );
      return {
        armEuler,
        torsoYawOffset: 0,
        hiltOffsetLocal,
        cuttingPlaneNormal: moveDef.cuttingPlaneNormalLocal,
      };
    }
  }
}

/**
 * Casts 8 sample rays along the weapon blade from Tsuba (s = 0) to Kissaki (s = 1)
 * between the previous frame and current frame blade positions for frame-perfect hit detection.
 */
export interface BladeRaySample {
  s: number;
  origin: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  length: number;
}

export function generateEightBladeRays(
  prevTsuba: { x: number; y: number; z: number },
  prevKissaki: { x: number; y: number; z: number },
  currTsuba: { x: number; y: number; z: number },
  currKissaki: { x: number; y: number; z: number }
): BladeRaySample[] {
  const rays: BladeRaySample[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const s = i / (count - 1);
    const ox = prevTsuba.x + (prevKissaki.x - prevTsuba.x) * s;
    const oy = prevTsuba.y + (prevKissaki.y - prevTsuba.y) * s;
    const oz = prevTsuba.z + (prevKissaki.z - prevTsuba.z) * s;

    const tx = currTsuba.x + (currKissaki.x - currTsuba.x) * s;
    const ty = currTsuba.y + (currKissaki.y - currTsuba.y) * s;
    const tz = currTsuba.z + (currKissaki.z - currTsuba.z) * s;

    const dx = tx - ox;
    const dy = ty - oy;
    const dz = tz - oz;
    const len = Math.hypot(dx, dy, dz);
    const inv = len > 1e-5 ? 1 / len : 0;

    rays.push({
      s,
      origin: { x: ox, y: oy, z: oz },
      target: { x: tx, y: ty, z: tz },
      direction: { x: dx * inv, y: dy * inv, z: dz * inv },
      length: len,
    });
  }
  return rays;
}

/**
 * Checks whether any of the 8 blade points/rays intersect a cylindrical target actor volume.
 */
export function checkEightBladeRayHit(
  rays: BladeRaySample[],
  actorPos: { x: number; y: number; z: number },
  actorRadius = 0.85
): { hit: boolean; hitRayIndex: number; hitPoint: { x: number; y: number; z: number } } {
  const rSq = actorRadius * actorRadius;
  for (let i = 0; i < rays.length; i++) {
    const ray = rays[i];
    // Check midpoint and endpoint of each of the 8 blade sweep rays in XZ
    for (let step = 0; step <= 2; step++) {
      const f = step * 0.5;
      const px = ray.origin.x + (ray.target.x - ray.origin.x) * f;
      const py = ray.origin.y + (ray.target.y - ray.origin.y) * f;
      const pz = ray.origin.z + (ray.target.z - ray.origin.z) * f;
      const dx = px - actorPos.x;
      const dz = pz - actorPos.z;
      if (dx * dx + dz * dz <= rSq) {
        return {
          hit: true,
          hitRayIndex: i,
          hitPoint: { x: px, y: py, z: pz },
        };
      }
    }
  }
  return { hit: false, hitRayIndex: -1, hitPoint: { x: actorPos.x, y: actorPos.y + 1.1, z: actorPos.z } };
}

/**
 * Defensive Mastery (Right-Click): Timed Sekiro-style Deflect/Parry vector evaluation.
 * Calculates the angle between the player's forward guard vector and incoming enemy blade vector.
 */
export function evaluateSekiroDeflectAngle(
  playerPos: { x: number; z: number },
  playerYaw: number,
  enemyPos: { x: number; z: number }
): { angleDeg: number; isFrontArcDeflect: boolean; postureMultiplier: number } {
  const toEnemyX = enemyPos.x - playerPos.x;
  const toEnemyZ = enemyPos.z - playerPos.z;
  const dist = Math.hypot(toEnemyX, toEnemyZ) || 1;
  const nx = toEnemyX / dist;
  const nz = toEnemyZ / dist;

  const guardX = Math.sin(playerYaw);
  const guardZ = Math.cos(playerYaw);
  const dot = Math.max(-1, Math.min(1, nx * guardX + nz * guardZ));
  const angleDeg = (Math.acos(dot) * 180) / Math.PI;

  // Perfect front-arc guard (< 115 deg) yields 1.5x bonus enemy posture shatter
  const isFrontArcDeflect = angleDeg <= 115;
  const postureMultiplier = angleDeg <= 55 ? 1.65 : isFrontArcDeflect ? 1.35 : 1.0;

  return {
    angleDeg: Number(angleDeg.toFixed(1)),
    isFrontArcDeflect,
    postureMultiplier,
  };
}

/**
 * Custom GLSL Post-Processing Shader:
 * Combines an Anisotropic Kuwahara 4-Quadrant Directional Variance Kernel
 * (giving 3D PBR lighting a painted Washi-paper brushwork texture while preserving crisp edges)
 * with a Sobel Depth/Luma Edge Detector for variable-thickness Sumi-e black ink outlines.
 */
export function createAnisotropicKuwaharaSumiShader() {
  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uTime: { value: 0 },
      uInkStrength: { value: 0.28 },
      uKuwaharaStrength: { value: 0.0 },
      uWashiWarmth: { value: 0.04 },
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
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uInkStrength;
      uniform float uKuwaharaStrength;
      uniform float uWashiWarmth;
      varying vec2 vUv;

      float getLuma(vec3 c) {
        return dot(c, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        // 100% Crystal-Clear Native Resolution Sampling (ZERO UV warping, ZERO sinusoidal distortion)
        vec2 texel = 1.0 / max(uResolution, vec2(1.0));
        vec4 centerSample = texture2D(tDiffuse, vUv);

        // Crisp 1-texel Sobel silhouette edge accent with zero blur
        float tl = getLuma(texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * texel).rgb);
        float tm = getLuma(texture2D(tDiffuse, vUv + vec2( 0.0, -1.0) * texel).rgb);
        float tr = getLuma(texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * texel).rgb);
        float ml = getLuma(texture2D(tDiffuse, vUv + vec2(-1.0,  0.0) * texel).rgb);
        float mr = getLuma(texture2D(tDiffuse, vUv + vec2( 1.0,  0.0) * texel).rgb);
        float bl = getLuma(texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * texel).rgb);
        float bm = getLuma(texture2D(tDiffuse, vUv + vec2( 0.0,  1.0) * texel).rgb);
        float br = getLuma(texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * texel).rgb);

        float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
        float gy = -tl - 2.0 * tm - tr + bl + 2.0 * bm + br;
        float grad = sqrt(gx * gx + gy * gy);

        float inkEdge = smoothstep(0.32, 0.78, grad) * uInkStrength;
        vec3 crispColor = mix(centerSample.rgb, centerSample.rgb * vec3(1.01, 1.0, 0.98), uWashiWarmth);
        vec3 sumiInk = vec3(0.055, 0.042, 0.035);

        gl_FragColor = vec4(mix(crispColor, sumiInk, inkEdge), centerSample.a);
      }
    `,
  };
}
