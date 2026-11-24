import * as THREE from 'three';
import {
  SixMoveCombatId,
  evaluateSixMoveCombatTrajectory,
} from './combatSplinesAndShaders';
import { createSplineLatheGeometry } from './proceduralMeshes';

export type DojoLessonId =
  | 'lesson_1_kesa_giri'
  | 'lesson_2_gyaku_kesa'
  | 'lesson_3_tsumuji_kaze'
  | 'lesson_4_iaijutsu_charged'
  | 'lesson_5_tsuki_lunge'
  | 'lesson_6_kabuto_wari'
  | 'lesson_7_mizu_nagare_deflect';

export type FrameWindowPhase = 'startup' | 'active_hit' | 'cancel_golden' | 'recovery';

export interface DojoLessonDefinition {
  id: DojoLessonId;
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  moveId: SixMoveCombatId;
  name: string;
  kanji: string;
  keySequencePrompts: string[];
  timingHint: string;
  requiredReps: number;
  startupRange: [number, number];
  activeHitRange: [number, number];
  cancelGoldenRange: [number, number];
  recoveryRange: [number, number];
  masteryScrollTitle: string;
  masteryScrollKanji: string;
  masteryBonusDescription: string;
}

export const DOJO_CURRICULUM_LESSONS: DojoLessonDefinition[] = [
  {
    id: 'lesson_1_kesa_giri',
    stepNumber: 1,
    moveId: 'kesa_giri',
    name: 'Move 1 — Kesa-Giri (Diagonal Downward Slash)',
    kanji: '壱ノ型・袈裟斬り',
    keySequencePrompts: ['LMB'],
    timingHint: 'Tap Left-Click (LMB) to cleave diagonally from right shoulder to left hip.',
    requiredReps: 2,
    startupRange: [0.0, 0.2],
    activeHitRange: [0.2, 0.52],
    cancelGoldenRange: [0.52, 0.8],
    recoveryRange: [0.8, 1.0],
    masteryScrollTitle: 'Scroll of the Falling Pine',
    masteryScrollKanji: '落松之巻',
    masteryBonusDescription: '+8% Kesa-Giri Opening Slash Speed',
  },
  {
    id: 'lesson_2_gyaku_kesa',
    stepNumber: 2,
    moveId: 'gyaku_kesa',
    name: 'Move 2 — Gyaku-Kesa (Rising Reverse Slash)',
    kanji: '弐ノ型・逆袈裟',
    keySequencePrompts: ['LMB', 'LMB (Golden Window)'],
    timingHint: 'Press LMB a second time inside the Golden Cancel Window (52%–80%) of Strike 1.',
    requiredReps: 2,
    startupRange: [0.0, 0.18],
    activeHitRange: [0.18, 0.5],
    cancelGoldenRange: [0.5, 0.82],
    recoveryRange: [0.82, 1.0],
    masteryScrollTitle: 'Scroll of the Rising Heron',
    masteryScrollKanji: '昇鷺之巻',
    masteryBonusDescription: '+12% Guard-Shatter Posture Damage',
  },
  {
    id: 'lesson_3_tsumuji_kaze',
    stepNumber: 3,
    moveId: 'tsumuji_kaze',
    name: 'Move 3 — Tsumuji-Kaze (360° Whirlwind Finisher)',
    kanji: '参ノ型・旋風斬',
    keySequencePrompts: ['LMB', 'LMB', 'LMB (Finisher)'],
    timingHint: 'Complete the 3-hit chain by pressing LMB during Strike 2’s Golden Window.',
    requiredReps: 2,
    startupRange: [0.0, 0.22],
    activeHitRange: [0.22, 0.62],
    cancelGoldenRange: [0.62, 0.85],
    recoveryRange: [0.85, 1.0],
    masteryScrollTitle: 'Scroll of the Cyclone Blade',
    masteryScrollKanji: '疾風旋風之巻',
    masteryBonusDescription: '+15% 360° Cleave Radius & Knockback',
  },
  {
    id: 'lesson_4_iaijutsu_charged',
    stepNumber: 4,
    moveId: 'iaijutsu_charged',
    name: 'Move 4 — Iaijutsu / Charged Stance Art',
    kanji: '肆ノ型・居合抜刀奥義',
    keySequencePrompts: ['Hold LMB (>350ms)', 'Release at Golden Flash'],
    timingHint: 'Hold Left-Click (>350ms) until the scabbard glints gold, then release.',
    requiredReps: 2,
    startupRange: [0.0, 0.26],
    activeHitRange: [0.26, 0.6],
    cancelGoldenRange: [0.6, 0.84],
    recoveryRange: [0.84, 1.0],
    masteryScrollTitle: 'Scroll of the Lightning Draw',
    masteryScrollKanji: '雷光抜刀之巻',
    masteryBonusDescription: '+20% Iaijutsu Critical Multiplier',
  },
  {
    id: 'lesson_5_tsuki_lunge',
    stepNumber: 5,
    moveId: 'tsuki_lunge',
    name: 'Move 5 — Tsuki (Armor-Piercing Lunge)',
    kanji: '伍ノ型・牙突貫通突き',
    keySequencePrompts: ['W', 'Shift', 'LMB'],
    timingHint: 'Hold W + Shift to sprint forward and press LMB for a high-velocity piercing thrust.',
    requiredReps: 2,
    startupRange: [0.0, 0.16],
    activeHitRange: [0.16, 0.54],
    cancelGoldenRange: [0.54, 0.8],
    recoveryRange: [0.8, 1.0],
    masteryScrollTitle: 'Scroll of the Piercing Fang',
    masteryScrollKanji: '牙突貫通之巻',
    masteryBonusDescription: '+25% Lamellar Armor Penetration',
  },
  {
    id: 'lesson_6_kabuto_wari',
    stepNumber: 6,
    moveId: 'kabuto_wari',
    name: 'Move 6 — Kabuto-Wari (Aerial Helm-Splitter)',
    kanji: '陸ノ型・天墜兜割り',
    keySequencePrompts: ['Space (Jump)', 'LMB (Mid-Air)'],
    timingHint: 'Press Space to leap into the air, then press LMB at the apex for a vertical plunge.',
    requiredReps: 2,
    startupRange: [0.0, 0.24],
    activeHitRange: [0.24, 0.64],
    cancelGoldenRange: [0.64, 0.86],
    recoveryRange: [0.86, 1.0],
    masteryScrollTitle: 'Scroll of the Heaven-Splitting Helm',
    masteryScrollKanji: '天墜兜割之巻',
    masteryBonusDescription: '+30% Radial Shockwave Impact Force',
  },
  {
    id: 'lesson_7_mizu_nagare_deflect',
    stepNumber: 7,
    moveId: 'kesa_giri',
    name: 'Defensive Mastery — Mizu-Nagare Deflect & Counter',
    kanji: '奥義・水流弾き返し',
    keySequencePrompts: ['RMB (<180ms Flash)', 'LMB Riposte'],
    timingHint: 'Tap Right-Click (RMB) as the enemy telegraph flashes gold/red, then counter with LMB.',
    requiredReps: 2,
    startupRange: [0.0, 0.12],
    activeHitRange: [0.12, 0.48],
    cancelGoldenRange: [0.48, 0.85],
    recoveryRange: [0.85, 1.0],
    masteryScrollTitle: 'Grandmaster Scroll of Mizu-Nagare',
    masteryScrollKanji: '免許皆伝・水鏡之巻',
    masteryBonusDescription: 'Unlocks Grandmaster Golden Blade Trail & +25% Deflect Posture Shatter',
  },
];

export interface DojoTrainerSnapshot {
  trainerOpen: boolean;
  activeLessonIndex: number;
  activeLesson: DojoLessonDefinition;
  lessonProgress: Record<DojoLessonId, { repsCompleted: number; mastered: boolean }>;
  unlockedScrolls: string[];
  frameCursorNormalized: number; // 0.0 to 1.0 along the Rhythm & Frame-Window Bar
  currentPhase: FrameWindowPhase;
  lastTimingGrade: 'PERFECT GOLDEN WINDOW!' | 'GOOD STRIKE' | 'EARLY STARTUP' | 'LATE RECOVERY' | 'READY';
  ghostMasterSlowMoSpeed: number;
  ghostMasterNormalizedTime: number;
  liveDps: number;
  livePostureBreakRate: number;
}

export interface HolographicGhostMasterRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  bladeMesh: THREE.Mesh;
  trailLine: THREE.Line;
  trailPoints: THREE.Vector3[];
}

/**
 * Evaluates which Frame-Window Phase (`startup`, `active_hit`, `cancel_golden`, `recovery`)
 * corresponds to normalized time t in [0, 1] for a given Dojo lesson.
 */
export function evaluateDojoFrameWindowPhase(
  lesson: DojoLessonDefinition,
  normalizedTime: number
): FrameWindowPhase {
  const t = Math.max(0, Math.min(1, normalizedTime));
  if (t < lesson.startupRange[1]) return 'startup';
  if (t < lesson.activeHitRange[1]) return 'active_hit';
  if (t <= lesson.cancelGoldenRange[1]) return 'cancel_golden';
  return 'recovery';
}

/**
 * Creates the Translucent Golden Holographic Ghost Master 3D Rig that demonstrates
 * each move's exact Cubic Hermite blade spline in slow motion beside the player.
 */
export function createHolographicGhostMasterRig(): HolographicGhostMasterRig {
  const root = new THREE.Group();
  root.name = 'Holographic_Ghost_Master';

  const holoGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.85,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const holoBladeMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  // Sculpted Hakama + Haori Torso Silhouette using LatheGeometry
  const lowerHakamaGeo = createSplineLatheGeometry(
    [
      [0.02, 0.0],
      [0.34, 0.04],
      [0.31, 0.42],
      [0.24, 0.78],
      [0.02, 0.8],
    ],
    24
  );
  root.add(new THREE.Mesh(lowerHakamaGeo, holoGoldMat));

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.78, 0);
  const chestGeo = createSplineLatheGeometry(
    [
      [0.02, 0.0],
      [0.24, 0.04],
      [0.29, 0.35],
      [0.26, 0.58],
      [0.02, 0.62],
    ],
    24
  );
  torsoGroup.add(new THREE.Mesh(chestGeo, holoGoldMat));

  // Kabuto Head Silhouette
  const headGeo = createSplineLatheGeometry(
    [
      [0.01, 0.64],
      [0.14, 0.68],
      [0.16, 0.86],
      [0.28, 0.92],
      [0.12, 1.06],
      [0.01, 1.1],
    ],
    24
  );
  torsoGroup.add(new THREE.Mesh(headGeo, holoGoldMat));
  root.add(torsoGroup);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.28, 0.48, 0.06);
  const armGeo = createSplineLatheGeometry(
    [
      [0.01, 0.0],
      [0.075, 0.05],
      [0.065, 0.48],
      [0.01, 0.52],
    ],
    16
  );
  rightArm.add(new THREE.Mesh(armGeo, holoGoldMat));

  // Holographic Katana Blade
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.018, 0);
  bladeShape.quadraticCurveTo(0.024, 0.55, 0.002, 1.05);
  bladeShape.quadraticCurveTo(-0.014, 0.55, -0.018, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.008,
    bevelEnabled: false,
  });
  const bladeMesh = new THREE.Mesh(bladeGeo, holoBladeMat);
  bladeMesh.position.set(0, 0.42, 0.12);
  bladeMesh.rotation.x = Math.PI * 0.35;
  rightArm.add(bladeMesh);
  torsoGroup.add(rightArm);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.28, 0.48, 0.06);
  leftArm.add(new THREE.Mesh(armGeo, holoGoldMat));
  torsoGroup.add(leftArm);

  // Golden Holographic Blade Trajectory Spline Ribbon
  const trailPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    trailPoints.push(new THREE.Vector3(0, 1.2, 0));
  }
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.85,
  });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  root.add(trailLine);

  // Ground Sacred Golden Pedestal Ring
  const ringGeo = new THREE.RingGeometry(0.68, 0.82, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, holoBladeMat);
  ringMesh.position.y = 0.02;
  root.add(ringMesh);

  return {
    root,
    torsoGroup,
    rightArm,
    leftArm,
    bladeMesh,
    trailLine,
    trailPoints,
  };
}

export class InteractiveComboDojoController {
  public trainerOpen = false;
  public activeLessonIndex = 0;
  public ghostMasterNormalizedTime = 0;
  public ghostMasterSlowMoSpeed = 0.45; // 45% slow-motion holographic demonstration
  public frameCursorNormalized = 0;
  public lastTimingGrade: DojoTrainerSnapshot['lastTimingGrade'] = 'READY';
  public lessonProgress: Record<DojoLessonId, { repsCompleted: number; mastered: boolean }>;
  public unlockedScrolls: string[] = [];

  private recentDamageDealt: Array<{ timeSec: number; dmg: number; posture: number }> = [];
  public ghostRig: HolographicGhostMasterRig | null = null;

  constructor() {
    this.lessonProgress = {} as Record<DojoLessonId, { repsCompleted: number; mastered: boolean }>;
    for (const lesson of DOJO_CURRICULUM_LESSONS) {
      this.lessonProgress[lesson.id] = { repsCompleted: 0, mastered: false };
    }
  }

  public attachGhostMasterToScene(scene: THREE.Scene): HolographicGhostMasterRig {
    if (!this.ghostRig) {
      this.ghostRig = createHolographicGhostMasterRig();
      this.ghostRig.root.visible = false;
      scene.add(this.ghostRig.root);
    }
    return this.ghostRig;
  }

  public setTrainerOpen(open: boolean) {
    this.trainerOpen = open;
    if (this.ghostRig) {
      this.ghostRig.root.visible = open;
    }
  }

  public selectLesson(index: number) {
    this.activeLessonIndex =
      ((index % DOJO_CURRICULUM_LESSONS.length) + DOJO_CURRICULUM_LESSONS.length) %
      DOJO_CURRICULUM_LESSONS.length;
    this.ghostMasterNormalizedTime = 0;
    this.lastTimingGrade = 'READY';
  }

  public recordPlayerMoveExecution(
    executedMoveId: SixMoveCombatId | 'mizu_nagare_deflect',
    normalizedWindowCursor: number,
    damageDealt: number,
    postureDealt: number,
    nowSec: number
  ): { advancedLesson: boolean; newlyUnlockedScroll: string | null } {
    this.recentDamageDealt.push({ timeSec: nowSec, dmg: damageDealt, posture: postureDealt });
    this.recentDamageDealt = this.recentDamageDealt.filter((e) => nowSec - e.timeSec <= 5.0);

    const activeLesson = DOJO_CURRICULUM_LESSONS[this.activeLessonIndex];
    const phase = evaluateDojoFrameWindowPhase(activeLesson, normalizedWindowCursor);

    if (phase === 'cancel_golden') {
      this.lastTimingGrade = 'PERFECT GOLDEN WINDOW!';
    } else if (phase === 'active_hit') {
      this.lastTimingGrade = 'GOOD STRIKE';
    } else if (phase === 'startup') {
      this.lastTimingGrade = 'EARLY STARTUP';
    } else {
      this.lastTimingGrade = 'LATE RECOVERY';
    }

    const matchesLesson =
      (activeLesson.id === 'lesson_7_mizu_nagare_deflect' &&
        executedMoveId === 'mizu_nagare_deflect') ||
      activeLesson.moveId === executedMoveId;

    if (!matchesLesson) {
      return { advancedLesson: false, newlyUnlockedScroll: null };
    }

    const prog = this.lessonProgress[activeLesson.id];
    prog.repsCompleted = Math.min(activeLesson.requiredReps, prog.repsCompleted + 1);
    let newlyUnlockedScroll: string | null = null;
    let advancedLesson = false;

    if (prog.repsCompleted >= activeLesson.requiredReps && !prog.mastered) {
      prog.mastered = true;
      newlyUnlockedScroll = `${activeLesson.masteryScrollTitle} (${activeLesson.masteryScrollKanji})`;
      if (!this.unlockedScrolls.includes(newlyUnlockedScroll)) {
        this.unlockedScrolls.push(newlyUnlockedScroll);
      }
      if (this.activeLessonIndex < DOJO_CURRICULUM_LESSONS.length - 1) {
        this.activeLessonIndex++;
        advancedLesson = true;
      }
    }

    return { advancedLesson, newlyUnlockedScroll };
  }

  /**
   * Steps the Holographic Ghost Master slow-motion Cubic Hermite spline demonstration
   * beside the player so the player can visually mirror the blade path.
   */
  public stepGhostMasterAndTelemetry(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    playerAttackNormalizedT: number | null,
    nowSec: number,
    getGroundHeightAt?: (x: number, z: number) => number
  ): DojoTrainerSnapshot {
    const activeLesson = DOJO_CURRICULUM_LESSONS[this.activeLessonIndex];
    this.ghostMasterNormalizedTime =
      (this.ghostMasterNormalizedTime + dt * this.ghostMasterSlowMoSpeed) % 1.0;

    if (playerAttackNormalizedT !== null) {
      this.frameCursorNormalized = playerAttackNormalizedT;
    } else {
      this.frameCursorNormalized = this.ghostMasterNormalizedTime;
    }

    if (this.ghostRig && this.trainerOpen) {
      this.ghostRig.root.visible = true;
      // Position Ghost Master 2.2m to the right of the Samurai facing the same direction, grounded on terrain
      const rightX = Math.cos(playerYaw) * 2.2;
      const rightZ = -Math.sin(playerYaw) * 2.2;
      const ghostX = playerPos.x + rightX;
      const ghostZ = playerPos.z + rightZ;
      const ghostY = getGroundHeightAt ? getGroundHeightAt(ghostX, ghostZ) : playerPos.y;
      this.ghostRig.root.position.set(ghostX, ghostY, ghostZ);
      this.ghostRig.root.rotation.y = playerYaw;

      const sample = evaluateSixMoveCombatTrajectory(
        activeLesson.moveId,
        this.ghostMasterNormalizedTime
      );
      this.ghostRig.rightArm.rotation.set(
        sample.armEuler.x,
        sample.armEuler.y,
        sample.armEuler.z
      );
      this.ghostRig.torsoGroup.rotation.y = sample.torsoYawOffset;

      // Update precomputed 24-point golden blade trajectory spline curve in local space
      for (let i = 0; i < 24; i++) {
        const u = i / 23;
        const s = evaluateSixMoveCombatTrajectory(activeLesson.moveId, u);
        this.ghostRig.trailPoints[i].set(
          s.hiltOffsetLocal.x * 1.45,
          s.hiltOffsetLocal.y,
          s.hiltOffsetLocal.z * 1.45
        );
      }
      this.ghostRig.trailLine.geometry.setFromPoints(this.ghostRig.trailPoints);
    } else if (this.ghostRig) {
      this.ghostRig.root.visible = false;
    }

    this.recentDamageDealt = this.recentDamageDealt.filter((e) => nowSec - e.timeSec <= 5.0);
    const totalDmg = this.recentDamageDealt.reduce((acc, e) => acc + e.dmg, 0);
    const totalPosture = this.recentDamageDealt.reduce((acc, e) => acc + e.posture, 0);

    return {
      trainerOpen: this.trainerOpen,
      activeLessonIndex: this.activeLessonIndex,
      activeLesson,
      lessonProgress: { ...this.lessonProgress },
      unlockedScrolls: [...this.unlockedScrolls],
      frameCursorNormalized: Number(this.frameCursorNormalized.toFixed(2)),
      currentPhase: evaluateDojoFrameWindowPhase(activeLesson, this.frameCursorNormalized),
      lastTimingGrade: this.lastTimingGrade,
      ghostMasterSlowMoSpeed: this.ghostMasterSlowMoSpeed,
      ghostMasterNormalizedTime: Number(this.ghostMasterNormalizedTime.toFixed(2)),
      liveDps: Math.round(totalDmg / 5),
      livePostureBreakRate: Math.round(totalPosture / 5),
    };
  }
}
