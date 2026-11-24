import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  WEAPONS,
  THROWABLES,
  ARMORS,
  HELMETS,
  WeaponDef,
  ThrowableDef,
  ArmorDef,
  HelmetDef,
  ComputedSamuraiStats,
  computeSamuraiStats,
} from './arsenal';
import { AdaptiveAIBrain, AIAdaptationSnapshot } from './aiBrain';
import {
  CAMPAIGN_STAGES,
  ENEMY_ARCHETYPES,
  StageDef,
  EnemyArchetypeDef,
  BossDef,
} from './stages';
import {
  createProceduralTextures,
  createSamuraiHeroRig,
  updateSamuraiEquipmentVisuals,
  createEnemyMeshRig,
  createDojoDummyMeshRig,
  createProjectileMesh,
  createSumiWashiMaterial,
  createUrushiLacquerMaterial,
  createSplineLatheGeometry,
  createIrimoyaPagodaRoofGeometry,
  createMultiBladeGrassClumpGeometry,
  createSegmentedBambooWithNodesGeometry,
  applyMoroteDualHandWeaponIK,
  buildGnarledJapaneseTree,
  SamuraiRig,
  ProceduralTextures,
} from './proceduralMeshes';
import {
  CharacterAppearanceConfig,
  DEFAULT_CHARACTER_APPEARANCE,
  ELEMENTAL_INFUSIONS,
  ElementalInfusionId,
  ElementalInfusionDef,
  DodgeModeId,
  stepPendulumGrapple,
} from './characterCustomization';
import {
  SmartAssetManager,
  AssetTargetSlot,
  InspectedModelTelemetry,
  VERIFIED_3D_ASSET_PRESETS,
  inspectObject3DTelemetry,
} from './assetManager';
import {
  CannonMultiPhysicsEngine,
  VerletClothSheet,
  sliceBufferGeometryByPlane,
  solveTwoBoneIK,
  computeAerodynamicDragForce,
  sanitizePhysicsVec3,
  FixedTimestepStepper,
  ActorCapsule,
  StaticCollider,
  resolveCapsuleVsCapsuleSeparation,
  resolveCapsuleVsStaticColliders,
  findNearbyWallVaultObstacle,
} from './multiPhysics';
import {
  SIX_COMBAT_MOVES,
  SixMoveCombatId,
  CombatMoveDefinition,
  evaluateSixMoveCombatTrajectory,
  generateEightBladeRays,
  checkEightBladeRayHit,
  evaluateSekiroDeflectAngle,
  createAnisotropicKuwaharaSumiShader,
} from './combatSplinesAndShaders';
import {
  InfiniteOpenWorldCDLODManager,
  FloatingOriginTelemetry,
  OPEN_WORLD_BIOMES,
  OpenWorldBiomeDefinition,
  hash2D,
} from './openWorldEngine';
import {
  NANO_BANANA_PBR_PRESETS,
  NanoBananaPresetId,
  SobelPBRMapBundle,
  synthesizeNanoBananaPBRBundle,
  applyPOMAndTriplanarMaterial,
  buildFourMapPBRBundleFromCanvas,
  generateProceduralSourceCanvas,
} from './pbrTextureForge';
import {
  InteractiveComboDojoController,
  DojoTrainerSnapshot,
  DOJO_CURRICULUM_LESSONS,
} from './comboDojoTrainer';
import {
  SamuraiAudioSynth,
  BILINGUAL_BATTLE_DIALOGUES,
  BilingualBattleDialogue,
} from './audioSynth';

export type CameraPerspectiveMode = 'third_person_rpg' | 'first_person_fpv' | 'isometric_tactical';

export const CAMERA_MODE_LABELS: Record<CameraPerspectiveMode, string> = {
  third_person_rpg: 'Mode 1: Over-Shoulder 3rd-Person RPG',
  first_person_fpv: 'Mode 2: 1st-Person Samurai FPV',
  isometric_tactical: 'Mode 3: Tactical Isometric 45°',
};

export interface FloatingDamageText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  isCrit: boolean;
  life: number;
}

export interface MythicCombatArtDef {
  id: 'sakura_dance' | 'ashina_cross' | 'mortal_crimson_wave' | 'raijin_thunder_plunge';
  slot: 1 | 2 | 3 | 4;
  kanji: string;
  name: string;
  kiCost: number;
  damageMultiplier: number;
  postureMultiplier: number;
  range: number;
  durationSec: number;
  accentHex: number;
}

export const MYTHIC_COMBAT_ARTS: readonly MythicCombatArtDef[] = [
  {
    id: 'sakura_dance',
    slot: 1,
    kanji: '桜舞',
    name: 'Sakura Dance',
    kiCost: 22,
    damageMultiplier: 1.55,
    postureMultiplier: 1.45,
    range: 4.4,
    durationSec: 0.65,
    accentHex: 0xf472b6,
  },
  {
    id: 'ashina_cross',
    slot: 2,
    kanji: '葦名十文字',
    name: 'Ashina Cross',
    kiCost: 26,
    damageMultiplier: 1.85,
    postureMultiplier: 1.65,
    range: 4.8,
    durationSec: 0.52,
    accentHex: 0x38bdf8,
  },
  {
    id: 'mortal_crimson_wave',
    slot: 3,
    kanji: '不死斬り',
    name: 'Mortal Crimson Wave',
    kiCost: 32,
    damageMultiplier: 2.1,
    postureMultiplier: 1.9,
    range: 6.2,
    durationSec: 0.72,
    accentHex: 0xdc2626,
  },
  {
    id: 'raijin_thunder_plunge',
    slot: 4,
    kanji: '雷神落雷',
    name: 'Raijin Thunder Plunge',
    kiCost: 30,
    damageMultiplier: 1.95,
    postureMultiplier: 2.0,
    range: 5.5,
    durationSec: 0.75,
    accentHex: 0xfbbf24,
  },
];

export interface WorldMapLandmark {
  id: string;
  type: 'bridge' | 'torii_shrine' | 'cave_entrance' | 'world_boss';
  name: string;
  kanji: string;
  worldX: number;
  worldZ: number;
}

export interface EnemyRadarPoint {
  id: number;
  x: number;
  z: number;
  isBoss: boolean;
}

export interface ExecuteTargetPrompt {
  enemyId: number;
  enemyName: string;
  screenXPercent: number;
  screenYPercent: number;
}

export interface ActiveCinematicFinisher {
  kanji: string;
  name: string;
  subtitle: string;
}

export interface HUDStateSnapshot {
  gameState: 'title' | 'playing' | 'paused' | 'gameover' | 'victory';
  cameraMode: CameraPerspectiveMode;
  cameraModeLabel: string;
  hp: number;
  maxHp: number;
  ghostHp: number;
  posture: number;
  maxPosture: number;
  ki: number;
  maxKi: number;
  score: number;
  bestScore: number;
  comboCount: number;
  stageIndex: number; // 0 to 9 (10 Biomes)
  highestUnlockedStage: number;
  stageDef: StageDef;
  enemiesRemaining: number;
  bossActive: boolean;
  bossName: string;
  bossKanji: string;
  bossTitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPosture: number;
  bossMaxPosture: number;
  activeSlot: 'primary' | 'secondary' | 'ranged';
  primaryWeapon: WeaponDef;
  secondaryWeapon: WeaponDef;
  rangedWeapon: WeaponDef;
  equippedThrowable: ThrowableDef;
  throwableStock: number;
  throwableCooldown: number;
  equippedArmor: ArmorDef;
  equippedHelmet: HelmetDef;
  computedStats: ComputedSamuraiStats;
  aiSnapshot: AIAdaptationSnapshot;
  statusBanner: string;
  clearTimeSec: number;
  damageTakenRun: number;
  isDojoMode: boolean;
  koku: number;
  zanshinReady: boolean;
  floatingNumbers: FloatingDamageText[];
  // New Overhaul State
  appearance: CharacterAppearanceConfig;
  customizerMode: boolean;
  activeInfusion: ElementalInfusionId;
  activeInfusionDef: ElementalInfusionDef;
  lastDodgeMode: DodgeModeId;
  chronosTimer: number;
  shadowCrossReady: boolean;
  grappleActive: boolean;
  armorIntegrity: number;
  // Multi-Physics, 6-Move Combat & 3D Asset Inspector Telemetry
  activeCombatMove: SixMoveCombatId;
  activeCombatMoveDef: CombatMoveDefinition;
  lastBladeRayHits: number;
  lastBisectedTriCount: number;
  verletClothNodeCount: number;
  cannonRigidBodyCount: number;
  inspectedTelemetry: InspectedModelTelemetry | null;
  lastDeflectAngleDeg: number;
  // Open-World CDLOD, Interactive Combo Dojo, Nano Banana Pro PBR & Bilingual Dialogue Telemetry
  openWorldTelemetry: FloatingOriginTelemetry;
  dojoSnapshot: DojoTrainerSnapshot;
  activePbrBundle: {
    presetId: string;
    title: string;
    targetSlot: 'weapon' | 'armor' | 'terrain';
    sourceModel: string;
    pomSteps: number;
    triplanarActive: boolean;
    albedoUrl: string;
    normalUrl: string;
    heightUrl: string;
    roughnessUrl: string;
  } | null;
  activeDialogueSubtitle: BilingualBattleDialogue | null;
  // Open-World Tactical Radar, Camera Heading & Cinematic Execution Telemetry
  playerWorldPos: { x: number; y: number; z: number };
  camYaw: number;
  playerYaw: number;
  worldMapLandmarks: WorldMapLandmark[];
  enemyRadarPoints: EnemyRadarPoint[];
  executeTargetPrompt: ExecuteTargetPrompt | null;
  activeCinematicFinisher: ActiveCinematicFinisher | null;
  activeMythicArt: MythicCombatArtDef | null;
}

interface ActiveEnemy {
  id: number;
  name: string;
  isBoss: boolean;
  isTrainingDummy?: boolean;
  archetype?: EnemyArchetypeDef;
  bossDef?: BossDef;
  rig: {
    root: THREE.Group;
    bodyPivot: THREE.Group;
    weaponArm: THREE.Group;
    telegraphRing: THREE.Mesh;
  };
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  height: number;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  state: 'patrol' | 'approach' | 'zigzag_dash' | 'windup' | 'attack' | 'recover' | 'staggered' | 'ko';
  stateTimer: number;
  windupDuration: number;
  hyperArmorActive: boolean;
  poisonTimer: number;
  slowTimer: number;
  burnTimer: number;
  strafeSign: number;
  specialCooldown: number;
  hitFlashTimer: number;
  dismembered?: boolean;
}

interface ActiveProjectile {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fromPlayer: boolean;
  damage: number;
  postureDamage: number;
  aoeRadius: number;
  effectType: ThrowableDef['effectType'] | 'arrow' | 'bullet' | 'dart';
  piercing: boolean;
  life: number;
  isCaltropGrounded: boolean;
}

interface PhysicsDebrisPiece {
  mesh: THREE.Object3D;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
}

interface UtsusemiDecoyClone {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  timer: number;
}

interface SliceableBambooProp {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  sliced: boolean;
  colliderId: string;
}

export class SamuraiEngine {
  private container: HTMLElement;
  private onHUDUpdate: (hud: HUDStateSnapshot) => void;
  private renderer!: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private sobelPass: ShaderPass | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;

  public audio = new SamuraiAudioSynth();
  public aiBrain = new AdaptiveAIBrain();
  public assetManager = new SmartAssetManager();
  public multiPhysics = new CannonMultiPhysicsEngine();
  public openWorld = new InfiniteOpenWorldCDLODManager();
  public comboDojo = new InteractiveComboDojoController();
  private lastOpenWorldTelemetry: FloatingOriginTelemetry = {
    floatingOriginShiftCount: 0,
    accumulatedWorldOffset: { x: 0, y: 0, z: 0 },
    activeChunkCount: 25,
    disposedChunkCount: 0,
    currentBiome: OPEN_WORLD_BIOMES.misty_bamboo_forest,
    currentElevationMeters: 0,
    inSubterraneanCave: false,
    inShallowWater: false,
    onSuspensionBridge: false,
  };
  private lastDojoSnapshot!: DojoTrainerSnapshot;
  private activePbrBundle: SobelPBRMapBundle | null = null;
  private activeDialogueSubtitle: BilingualBattleDialogue | null = null;
  private dialogueTimer = 0;
  private textures!: ProceduralTextures;
  private haoriVerletCloth: VerletClothSheet | null = null;
  private bannerVerletCloth: VerletClothSheet | null = null;
  private customAssetMixers: THREE.AnimationMixer[] = [];

  // 3-Mode Camera Switcher State (Key V: 1. Over-the-Shoulder 3rd-Person RPG [DEFAULT], 2. 1st-Person FPV, 3. Isometric Tactical)
  public cameraMode: CameraPerspectiveMode = 'third_person_rpg';
  private currentCamYaw = 0;
  private spawnedChunkKeys = new Set<string>();

  // Mythic Combat Arts & Cinematic Execution Telemetry State
  private activeMythicArt: MythicCombatArtDef | null = null;
  private activeMythicArtTimer = 0;
  private activeCinematicFinisher: ActiveCinematicFinisher | null = null;
  private activeCinematicFinisherTimer = 0;

  // 6-Move Hermite Spline Combat & 8-Ray Blade Raycasting State
  private activeCombatMove: SixMoveCombatId = 'kesa_giri';
  private activeMoveDuration = 0.28;
  private lastBladeRayHits = 8;
  private lastBisectedTriCount = 0;
  private lastDeflectAngleDeg = 0;
  private prevTsubaWorld = new THREE.Vector3();
  private prevKissakiWorld = new THREE.Vector3();

  // Game & Stage State (Infinite Seamless Multi-Biome Open World)
  private gameState: HUDStateSnapshot['gameState'] = 'title';
  private isDojoMode = false;
  private customizerMode = false;
  private stageIndex = 0;
  private highestUnlockedStage = CAMPAIGN_STAGES.length - 1;
  private score = 0;
  private bestScore = 1200;
  private koku = 350;
  private comboCount = 0;
  private comboTimer = 0;
  private runTimeSec = 0;
  private damageTakenRun = 0;
  private statusBanner = 'Seamless 5×5 Open World · Press [V] to Switch Camera Mode';

  // Character Appearance & 3D Face Customizer State
  private appearance: CharacterAppearanceConfig = { ...DEFAULT_CHARACTER_APPEARANCE };
  private blinkCycleTimer = 0;
  private customizerOrbitYaw = 0;

  // Loadout State
  private activeSlot: 'primary' | 'secondary' | 'ranged' = 'primary';
  private primaryWeapon: WeaponDef = WEAPONS[0]; // Uchigatana
  private secondaryWeapon: WeaponDef = WEAPONS[6]; // Naginata
  private rangedWeapon: WeaponDef = WEAPONS[11]; // Daikyu
  private equippedThrowable: ThrowableDef = THROWABLES[0]; // Shuriken
  private equippedArmor: ArmorDef = ARMORS[0]; // Ronin Haori
  private equippedHelmet: HelmetDef = HELMETS[0]; // Suji-Kabuto
  private stats!: ComputedSamuraiStats;
  private armorIntegrity = 100;

  // 5 Elemental Weapon Infusions (Z, X, C, N, B)
  private activeInfusion: ElementalInfusionId = 'none';

  // 7-Mode Dodge, Acrobatics & Kaginawa Grappling Hook State (Velocity-Driven, Zero Teleports)
  private lastDodgeMode: DodgeModeId = 'tai_sabaki';
  private lastShiftTapTime = 0;
  private rollAnimTimer = 0;
  private rollAnimDuration = 0.36;
  private dodgeActive = false;
  private dodgeTimer = 0;
  private dodgeDuration = 0.24;
  private dodgeDirX = 0;
  private dodgeDirZ = 1;
  private dodgePeakSpeed = 16.0;
  private chronosTimer = 0; // Miri-Kiri Time-Dilation (15% enemy speed)
  private shadowCrossReady = false;
  private grappleActive = false;
  private grappleAnchor = new THREE.Vector3(0, 6.4, -18);
  private grappleStartPos = new THREE.Vector3();
  private grappleRopeLength = 9.5;
  private grappleTheta = -0.65;
  private grappleOmega = 0;
  private grappleTimer = 0;
  private grappleDuration = 0.65;
  private grappleTangentVel = new THREE.Vector3();
  private grappleLineMesh: THREE.Line | null = null;

  // Player Physics, 3D Capsule & Combat State
  private playerRig!: SamuraiRig;
  private readonly playerRadius = 0.42;
  private playerPos = new THREE.Vector3(0, 0, 12);
  private playerVel = new THREE.Vector3();
  private playerYaw = Math.PI;
  private hp = 220;
  private ghostHp = 220;
  private posture = 0;
  private ki = 120;
  private isGrounded = true;
  private coyoteTimer = 0;
  private walkDistance = 0;
  private attackCooldown = 0;
  private attackAnimTimer = 0;
  private comboStep = 0;
  private isChargingHeavy = false;
  private chargeHoldTime = 0;
  private parryWindowTimer = 0;
  private parryCooldown = 0;
  private throwableStock = 12;
  private throwableCooldown = 0;
  private invulnTimer = 0;

  // Hitstop, Zanshin Finisher Zoom & Camera Juice
  private hitstopTimer = 0;
  private zanshinZoomTimer = 0;
  private cameraTrauma = 0;
  private cameraFocus = new THREE.Vector3(0, 1, 12);
  private titleOrbitAngle = 0;

  // Input State
  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();
  private mousePosNDC = new THREE.Vector2(0, 0);
  private mouseWorldPoint = new THREE.Vector3(0, 0, 0);
  private leftMouseDown = false;
  private leftMouseHoldTime = 0;

  // Entities, Interactive Environment, Static Colliders & Pooled Buffers
  private envGroup = new THREE.Group();
  private stageStaticColliders: StaticCollider[] = [];
  private enemies: ActiveEnemy[] = [];
  private projectiles: ActiveProjectile[] = [];
  private slashTrails: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
  private groundDecals: THREE.Mesh[] = [];
  private debrisPieces: PhysicsDebrisPiece[] = [];
  private utsusemiClones: UtsusemiDecoyClone[] = [];
  private sliceableBamboos: SliceableBambooProp[] = [];
  private grassInstancedMesh: THREE.InstancedMesh | null = null;
  private grassBaseCoords: { x: number; z: number; scale: number; yaw: number }[] = [];
  private bossSpawnedInStage = false;
  private portalCooldown = 0;
  private nextEnemyId = 1;
  private floatingTexts: FloatingDamageText[] = [];
  private nextFloatId = 1;

  // Fixed-Timestep 60Hz Simulation Accumulator (max frame delta 50ms, max 4 substeps)
  private readonly simStepper = new FixedTimestepStepper(1 / 60, 0.05, 4);

  // Zero-GC Pooled Particle System (Sakura Petals + Sparks + Ink Drops)
  private readonly PARTICLE_COUNT = 220;
  private particleMesh!: THREE.InstancedMesh;
  private particlePos: Float32Array;
  private particleVel: Float32Array;
  private particleLife: Float32Array;
  private particleScale: Float32Array;

  // Pre-allocated Scratch Math Objects (Zero-GC in Loop)
  private readonly _v1 = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _upVec = new THREE.Vector3(0, 1, 0);
  private readonly _mat4 = new THREE.Matrix4();
  private readonly _quat = new THREE.Quaternion();
  private readonly _euler = new THREE.Euler();
  private readonly _color = new THREE.Color();
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private lastFrameTime = performance.now();
  private lastHudBroadcast = 0;

  constructor(container: HTMLElement, onHUDUpdate: (hud: HUDStateSnapshot) => void) {
    this.container = container;
    this.onHUDUpdate = onHUDUpdate;
    this.particlePos = new Float32Array(this.PARTICLE_COUNT * 3);
    this.particleVel = new Float32Array(this.PARTICLE_COUNT * 3);
    this.particleLife = new Float32Array(this.PARTICLE_COUNT);
    this.particleScale = new Float32Array(this.PARTICLE_COUNT);

    this.initRendererAndScene();
    this.bindEvents();
    this.recomputeStatsAndVisuals();
    this.loadStage(0);

    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.startGame();
      this.updateGameplayCamera(0);
    } else {
      document.body.dataset.state = 'title';
      this.updateTitleCameraAndIdle(0);
      this.broadcastHUD(true);
    }

    this.updateParticlesAndVFX(0);
    if (this.isSoftwareGl || !this.composer) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }

    this.lastFrameTime = performance.now();
    this.scheduleNextFrame();
  }

  public getCurrentWeapon(): WeaponDef {
    if (this.activeSlot === 'primary') return this.primaryWeapon;
    if (this.activeSlot === 'secondary') return this.secondaryWeapon;
    return this.rangedWeapon;
  }

  public getActiveInfusionDef(): ElementalInfusionDef {
    return (
      ELEMENTAL_INFUSIONS.find((inf) => inf.id === this.activeInfusion) ||
      ELEMENTAL_INFUSIONS[0]
    );
  }

  /**
   * Single Source of Truth ground & registered bridge height query in local scene coordinates.
   */
  public getGroundHeightAt(x: number, z: number): number {
    return this.openWorld.getGroundAndBridgeHeightAt(x, z);
  }

  /**
   * Single Source of Truth terrain/bridge surface normal query in local scene coordinates.
   */
  public getGroundNormalAt(x: number, z: number): THREE.Vector3 {
    return this.openWorld.getGroundNormalAt(x, z);
  }

  private getPlayerCapsule(): ActorCapsule {
    return {
      x: this.playerPos.x,
      y: this.playerPos.y,
      z: this.playerPos.z,
      radius: this.playerRadius,
      height: this.appearance.bodyHeight || 1.78,
    };
  }

  private getAllActiveStaticColliders(): StaticCollider[] {
    const chunkColliders = this.openWorld.getActiveChunkStaticColliders();
    const combined: StaticCollider[] = [];
    for (let i = 0; i < this.stageStaticColliders.length; i++) {
      combined.push(this.stageStaticColliders[i]);
    }
    // Live intact destructible crates act as physical box colliders until shattered
    for (let i = 0; i < this.multiPhysics.entries.length; i++) {
      const entry = this.multiPhysics.entries[i];
      if (!entry.isDestructibleProp || entry.propType !== 'crate') continue;
      combined.push({
        id: `crate_${entry.id}`,
        kind: 'box',
        x: entry.body.position.x,
        z: entry.body.position.z,
        minY: entry.body.position.y - entry.groundClearance,
        maxY: entry.body.position.y + entry.groundClearance,
        halfX: 0.44,
        halfZ: 0.44,
        tag: 'crate',
      });
    }
    for (let i = 0; i < chunkColliders.length; i++) {
      combined.push(chunkColliders[i]);
    }
    return combined;
  }

  private resolvePlayerStaticCollisions(colliders?: readonly StaticCollider[]) {
    const list = colliders ?? this.getAllActiveStaticColliders();
    const cap = this.getPlayerCapsule();
    resolveCapsuleVsStaticColliders(cap, list);
    this.playerPos.x = cap.x;
    this.playerPos.z = cap.z;
  }

  private resolveAllActorAndStaticCollisions() {
    const colliders = this.getAllActiveStaticColliders();
    const playerCap = this.getPlayerCapsule();

    // 1. Player vs static world colliders
    resolveCapsuleVsStaticColliders(playerCap, colliders);
    this.playerPos.x = playerCap.x;
    this.playerPos.z = playerCap.z;

    // 2. Active enemies vs player (prevents enemies walking through player) and vs each other (combat ring)
    const alive: ActiveEnemy[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].state !== 'ko') {
        alive.push(this.enemies[i]);
      }
    }

    for (let i = 0; i < alive.length; i++) {
      const e = alive[i];
      const eCap: ActorCapsule = {
        x: e.pos.x,
        y: e.pos.y,
        z: e.pos.z,
        radius: e.radius,
        height: e.height,
      };
      // Training dummy is anchored so player pushes around it; mobile enemies share separation weight
      const playerWeight = e.isTrainingDummy ? 1.0 : e.isBoss ? 0.65 : 0.4;
      const enemyWeight = e.isTrainingDummy ? 0.0 : e.isBoss ? 0.35 : 0.6;
      if (resolveCapsuleVsCapsuleSeparation(playerCap, eCap, playerWeight, enemyWeight)) {
        this.playerPos.x = playerCap.x;
        this.playerPos.z = playerCap.z;
        e.pos.x = eCap.x;
        e.pos.z = eCap.z;
      }
    }

    // Enemy-vs-enemy deterministic horizontal separation
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (a.isTrainingDummy) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (b.isTrainingDummy) continue;
        const capA: ActorCapsule = {
          x: a.pos.x,
          y: a.pos.y,
          z: a.pos.z,
          radius: a.radius,
          height: a.height,
        };
        const capB: ActorCapsule = {
          x: b.pos.x,
          y: b.pos.y,
          z: b.pos.z,
          radius: b.radius,
          height: b.height,
        };
        if (resolveCapsuleVsCapsuleSeparation(capA, capB, 0.5, 0.5)) {
          a.pos.x = capA.x;
          a.pos.z = capA.z;
          b.pos.x = capB.x;
          b.pos.z = capB.z;
        }
      }
    }

    // 3. Re-enforce static colliders on player and enemies after actor separation
    playerCap.x = this.playerPos.x;
    playerCap.z = this.playerPos.z;
    resolveCapsuleVsStaticColliders(playerCap, colliders);
    this.playerPos.x = playerCap.x;
    this.playerPos.z = playerCap.z;

    for (let i = 0; i < alive.length; i++) {
      const e = alive[i];
      if (e.isTrainingDummy) continue;
      const eCap: ActorCapsule = {
        x: e.pos.x,
        y: e.pos.y,
        z: e.pos.z,
        radius: e.radius,
        height: e.height,
      };
      resolveCapsuleVsStaticColliders(eCap, colliders);
      e.pos.x = eCap.x;
      e.pos.z = eCap.z;
      e.pos.y = this.getGroundHeightAt(e.pos.x, e.pos.z);
      e.rig.root.position.copy(e.pos);
    }
  }

  private initRendererAndScene() {
    this.isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.renderer.domElement.dataset.testid = 'samurai-webgl-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio PBR Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      52,
      (this.container.clientWidth || window.innerWidth) /
        (this.container.clientHeight || window.innerHeight),
      0.22,
      650
    );

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy() || 1;
    this.textures = createProceduralTextures(maxAniso);

    // Hardware GPU Multi-Pass EffectComposer: RenderPass + UnrealBloomPass + Anisotropic Kuwahara & Sumi-e Edge Pass
    if (!this.isSoftwareGl) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.36, 0.35, 0.86);
      this.composer.addPass(bloomPass);
      const kuwaharaSumiDef = createAnisotropicKuwaharaSumiShader();
      kuwaharaSumiDef.uniforms.uResolution.value.set(w, h);
      this.sobelPass = new ShaderPass(kuwaharaSumiDef);
      this.composer.addPass(this.sobelPass);
    }

    // 3-Point Balanced Studio + Outdoor Rig
    const hemiLight = new THREE.HemisphereLight(0xe6dec8, 0x383b2e, 0.9);
    hemiLight.name = 'hemiLight';
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 2.35);
    keyLight.name = 'keyLight';
    keyLight.position.set(26, 42, 28);
    keyLight.castShadow = !this.isSoftwareGl;
    const shadowRes = this.isSoftwareGl ? 1024 : 2048;
    keyLight.shadow.mapSize.set(shadowRes, shadowRes);
    keyLight.shadow.camera.left = -48;
    keyLight.shadow.camera.right = 48;
    keyLight.shadow.camera.top = 48;
    keyLight.shadow.camera.bottom = -48;
    keyLight.shadow.camera.near = 4;
    keyLight.shadow.camera.far = 140;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.95);
    rimLight.position.set(-24, 18, -22);
    this.scene.add(rimLight);

    this.scene.add(this.envGroup);

    // Build Samurai Hero Rig with 100% Opaque Watertight Anatomical SSS Skin & Face Customizer
    this.playerRig = createSamuraiHeroRig(
      this.getCurrentWeapon(),
      this.equippedArmor,
      this.equippedHelmet,
      this.textures,
      this.appearance
    );
    this.scene.add(this.playerRig.root);

    // Attach Real-Time 3D Verlet Integration Haori Cloak Grid (8x10 = 99 particles) to Samurai Back
    const haoriClothMat = createSumiWashiMaterial(
      this.equippedArmor.primaryColor,
      0.72,
      0.1,
      this.textures
    );
    haoriClothMat.side = THREE.DoubleSide;
    this.haoriVerletCloth = new VerletClothSheet(0.68, 0.82, 8, 10, haoriClothMat);
    this.haoriVerletCloth.mesh.position.set(0, 0.68, -0.22);
    this.playerRig.torsoGroup.add(this.haoriVerletCloth.mesh);

    // Record initial 3D mesh telemetry for the Live 3D Asset Inspector
    this.assetManager.setLastTelemetry(
      inspectObject3DTelemetry(
        this.playerRig.root,
        'Parametric Mathematical Samurai Rig',
        'samurai',
        'procedural://mathematical-samurai-rig',
        6
      )
    );

    // Initialize Kaginawa Grappling Silk Rope Line
    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 });
    this.grappleLineMesh = new THREE.Line(ropeGeo, ropeMat);
    this.grappleLineMesh.visible = false;
    this.scene.add(this.grappleLineMesh);

    // Initialize Pooled Particle InstancedMesh (Sakura Petals + Sparks)
    const petalGeo = new THREE.PlaneGeometry(0.26, 0.18);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    this.particleMesh = new THREE.InstancedMesh(petalGeo, petalMat, this.PARTICLE_COUNT);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.PARTICLE_COUNT * 3),
      3
    );

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.resetAmbientParticle(i, true);
    }
    this.scene.add(this.particleMesh);

    // Initialize Infinite Open-World CDLOD Water, Bridges & Holographic Dojo Ghost Master
    this.openWorld.initWaterAndBridges(this.scene, this.textures.washiNormal, this.textures.washiBump);
    this.comboDojo.attachGhostMasterToScene(this.scene);
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      0,
      this.playerPos,
      this.playerYaw,
      null,
      0,
      (x, z) => this.getGroundHeightAt(x, z)
    );
    this.lastOpenWorldTelemetry = this.openWorld.updateStreamedWorld(
      this.playerPos,
      0,
      this.textures.washiNormal,
      this.textures.washiBump,
      undefined,
      (cx, cz, wx, wz, biome) => this.spawnOpenWorldChunkEntities(cx, cz, wx, wz, biome)
    );

    // Synthesize initial 4-Map Sobel-Scharr PBR + POM bundle (Tamahagane Damascus)
    const defaultPreset = NANO_BANANA_PBR_PRESETS[0];
    const srcCanvas = generateProceduralSourceCanvas(defaultPreset.id, defaultPreset.prompt, 128);
    this.activePbrBundle = buildFourMapPBRBundleFromCanvas(
      srcCanvas,
      defaultPreset.id,
      defaultPreset.normalStrength,
      'procedural-sobel-synthesizer'
    );
    this.applyActivePBRBundleToMeshSlot(this.activePbrBundle);

    // WebGL Context Loss & Restoration Defensive Guard
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.statusBanner = 'WebGL Context Lost — Preserving Simulation State...';
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.recomputeStatsAndVisuals();
      this.loadStage(this.stageIndex);
      this.statusBanner = 'WebGL Context Restored · 60 FPS Pipeline Active';
      this.broadcastHUD(true);
    });
  }

  private resetAmbientParticle(i: number, randomHeight = false) {
    const stage = CAMPAIGN_STAGES[this.stageIndex];
    const px = this.playerPos.x + (Math.random() - 0.5) * 48;
    const pz = this.playerPos.z + (Math.random() - 0.5) * 48;
    const groundY = this.getGroundHeightAt(px, pz);
    this.particlePos[i * 3] = px;
    this.particlePos[i * 3 + 1] = groundY + (randomHeight ? 1 + Math.random() * 14 : 12 + Math.random() * 5);
    this.particlePos[i * 3 + 2] = pz;

    this.particleVel[i * 3] = -1.6 - Math.random() * 1.4;
    this.particleVel[i * 3 + 1] = -1.1 - Math.random() * 0.9;
    this.particleVel[i * 3 + 2] = 0.6 + (Math.random() - 0.5) * 1.2;
    this.particleLife[i] = 4 + Math.random() * 6;
    this.particleScale[i] = 0.75 + Math.random() * 0.65;

    this._color.setHex(stage.petalColor);
    this.particleMesh.setColorAt(i, this._color);
    this.particleMesh.instanceColor!.needsUpdate = true;
  }

  public spawnBurstParticles(
    origin: THREE.Vector3,
    colorHex: number,
    count: number,
    speed: number
  ) {
    for (let n = 0; n < count; n++) {
      const idx = Math.floor(Math.random() * this.PARTICLE_COUNT);
      this.particlePos[idx * 3] = origin.x + (Math.random() - 0.5) * 0.4;
      this.particlePos[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.4;
      this.particlePos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.4;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.75;
      this.particleVel[idx * 3] = Math.cos(theta) * Math.sin(phi) * speed;
      this.particleVel[idx * 3 + 1] = Math.cos(phi) * speed * 0.9 + 2.0;
      this.particleVel[idx * 3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
      this.particleLife[idx] = 0.45 + Math.random() * 0.35;
      this.particleScale[idx] = 1.2 + Math.random() * 0.7;

      this._color.setHex(colorHex);
      this.particleMesh.setColorAt(idx, this._color);
    }
    this.particleMesh.instanceColor!.needsUpdate = true;
  }

  public recomputeStatsAndVisuals() {
    this.stats = computeSamuraiStats(
      this.getCurrentWeapon(),
      this.equippedArmor,
      this.equippedHelmet
    );
    this.hp = Math.min(this.hp, this.stats.maxHp);
    if (this.playerRig) {
      updateSamuraiEquipmentVisuals(
        this.playerRig,
        this.getCurrentWeapon(),
        this.equippedArmor,
        this.equippedHelmet,
        this.textures,
        this.appearance
      );
      applyMoroteDualHandWeaponIK(this.playerRig, {
        isParrying: this.parryWindowTimer > 0,
        isAttacking: this.attackAnimTimer > 0,
        activeMoveId: 1,
        swingProgress: 0,
        gaitSwing: 0,
        breathTime: this.runTimeSec,
        cameraMode: this.cameraMode,
      });
    }
    this.broadcastHUD(true);
  }

  // ============================================================================
  // 3-MODE CAMERA SWITCHER API (KEY V)
  // 1. Over-the-Shoulder 3rd-Person RPG (DEFAULT)
  // 2. 1st-Person Samurai FPV (Two Hands Gripping Weapon in Viewport)
  // 3. Tactical Isometric 45° Overhead View
  // ============================================================================
  public cycleCameraMode(): CameraPerspectiveMode {
    const order: CameraPerspectiveMode[] = [
      'third_person_rpg',
      'first_person_fpv',
      'isometric_tactical',
    ];
    const nextIdx = (order.indexOf(this.cameraMode) + 1) % order.length;
    this.setCameraMode(order[nextIdx]);
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraPerspectiveMode) {
    this.cameraMode = mode;
    const label = CAMERA_MODE_LABELS[mode];
    this.statusBanner = `[V] CAMERA SWITCHED → ${label}`;
    if (this.playerRig) {
      applyMoroteDualHandWeaponIK(this.playerRig, {
        isParrying: this.parryWindowTimer > 0,
        isAttacking: this.attackAnimTimer > 0,
        activeMoveId: (this.comboStep % 6) + 1,
        swingProgress: 0,
        gaitSwing: 0,
        breathTime: this.runTimeSec,
        cameraMode: this.cameraMode,
      });
    }
    this.pushFloatingText(`🎥 ${label.toUpperCase()}`, this.playerPos, '#38bdf8', true);
    this.broadcastHUD(true);
  }

  // ============================================================================
  // 3D FACE & BODY CUSTOMIZATION STUDIO + ELEMENTAL INFUSION API
  // ============================================================================
  public setCustomizerMode(open: boolean) {
    this.customizerMode = open;
    this.customizerOrbitYaw = 0;
    if (open) {
      this.appearance = { ...this.appearance, hideHelmetInGameplay: true };
      this.recomputeStatsAndVisuals();
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
      this.updateCustomizerCamera(1.0, true);
    }
    this.broadcastHUD(true);
  }

  public updateAppearance(partial: Partial<CharacterAppearanceConfig>) {
    this.appearance = { ...this.appearance, ...partial };
    this.recomputeStatsAndVisuals();
  }

  public rotateCustomizerView(deltaYawRad: number) {
    this.customizerOrbitYaw += deltaYawRad;
  }

  public toggleElementalInfusion(infusionId: ElementalInfusionId) {
    this.activeInfusion = this.activeInfusion === infusionId ? 'none' : infusionId;
    const def = this.getActiveInfusionDef();
    if (this.activeInfusion !== 'none') {
      this._v1.copy(this.playerPos).setY(this.playerPos.y + 1.2);
      this.spawnBurstParticles(this._v1, def.trailColorHex, 24, 7.5);
      this.audio.playSwordSlash(true);
      this.pushFloatingText(
        `${def.kanji} ${def.name.toUpperCase()}`,
        this.playerPos,
        def.emissiveHex,
        true
      );
    }
    this.broadcastHUD(true);
  }

  // ============================================================================
  // AGENTIC 3D ASSET FETCHING, GLTF/HDRI HOT-SWAPPING & LIVE MODEL INSPECTOR
  // ============================================================================
  public inspectTargetSlotTelemetry(slot: AssetTargetSlot) {
    if (slot === 'weapon') {
      const t = inspectObject3DTelemetry(
        this.playerRig.weaponMount,
        this.getCurrentWeapon().name,
        'weapon',
        `procedural://weapon/${this.getCurrentWeapon().id}`,
        6
      );
      this.assetManager.setLastTelemetry(t);
    } else if (slot === 'boss' && this.enemies.length > 0) {
      const bossOrFoe = this.enemies.find((e) => e.isBoss) || this.enemies[0];
      const t = inspectObject3DTelemetry(
        bossOrFoe.rig.root,
        bossOrFoe.name,
        'boss',
        `procedural://enemy/${bossOrFoe.name}`,
        4
      );
      this.assetManager.setLastTelemetry(t);
    } else {
      const t = inspectObject3DTelemetry(
        this.playerRig.root,
        'Parametric Mathematical Samurai Rig',
        'samurai',
        'procedural://mathematical-samurai-rig',
        6
      );
      this.assetManager.setLastTelemetry(t);
    }
    this.broadcastHUD(true);
  }

  public async loadCustomGLTFUrlForSlot(
    url: string,
    slot: AssetTargetSlot,
    displayName = 'Custom 3D GLTF Model'
  ): Promise<InspectedModelTelemetry> {
    if (url.startsWith('procedural://')) {
      this.recomputeStatsAndVisuals();
      this.inspectTargetSlotTelemetry(slot);
      return this.assetManager.getLastTelemetry()!;
    }
    if (slot === 'hdri' || url.toLowerCase().endsWith('.hdr')) {
      await this.assetManager.loadHDRIEnvironment(url, this.renderer, this.scene);
      const hdrTelemetry: InspectedModelTelemetry = {
        name: displayName,
        slot: 'hdri',
        sourceUrlOrFile: url,
        vertexCount: 0,
        triangleCount: 0,
        meshCount: 1,
        boneCount: 0,
        skinnedMeshCount: 0,
        animationClipCount: 0,
        materialChannels: ['32-bit RGBE Equirectangular PMREM IBL'],
        boundingBoxMeters: { x: 180, y: 90, z: 180 },
        loadedAtIso: new Date().toLocaleTimeString(),
      };
      this.assetManager.setLastTelemetry(hdrTelemetry);
      this.statusBanner = `Applied Real HDRI Environment Map: ${displayName}`;
      this.broadcastHUD(true);
      return hdrTelemetry;
    }

    const targetHeight = slot === 'weapon' ? 1.35 : slot === 'boss' ? 2.35 : 1.82;
    const loaded = await this.assetManager.loadGLTFfromUrl(url, slot, targetHeight, displayName);
    this.applyLoadedModelToSlot(loaded.model, loaded.animations, slot, displayName);
    this.broadcastHUD(true);
    return loaded.telemetry;
  }

  public async loadDroppedGLTFFileForSlot(
    file: File,
    slot: AssetTargetSlot
  ): Promise<InspectedModelTelemetry> {
    if (file.name.toLowerCase().endsWith('.hdr')) {
      const blobUrl = URL.createObjectURL(file);
      try {
        return await this.loadCustomGLTFUrlForSlot(blobUrl, 'hdri', file.name);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }
    const targetHeight = slot === 'weapon' ? 1.35 : slot === 'boss' ? 2.35 : 1.82;
    const loaded = await this.assetManager.loadGLTFfromFile(file, slot, targetHeight);
    this.applyLoadedModelToSlot(loaded.model, loaded.animations, slot, file.name);
    this.broadcastHUD(true);
    return loaded.telemetry;
  }

  private applyLoadedModelToSlot(
    model: THREE.Group,
    animations: THREE.AnimationClip[],
    slot: AssetTargetSlot,
    displayName: string
  ) {
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(animations[0]).play();
      this.customAssetMixers.push(mixer);
    }

    if (slot === 'weapon') {
      while (this.playerRig.weaponMount.children.length > 0) {
        this.playerRig.weaponMount.remove(this.playerRig.weaponMount.children[0]);
      }
      this.playerRig.weaponMount.add(model);
      this.statusBanner = `Hot-Swapped Weapon 3D Model → ${displayName}`;
    } else if (slot === 'boss' && this.enemies.length > 0) {
      const targetEnemy = this.enemies.find((e) => e.isBoss) || this.enemies[0];
      while (targetEnemy.rig.bodyPivot.children.length > 0) {
        targetEnemy.rig.bodyPivot.remove(targetEnemy.rig.bodyPivot.children[0]);
      }
      targetEnemy.rig.bodyPivot.add(model);
      this.statusBanner = `Hot-Swapped Boss/Enemy 3D Model → ${displayName}`;
    } else {
      const existingCustom = this.playerRig.bodyPivot.getObjectByName('custom_gltf_hero');
      if (existingCustom) {
        this.playerRig.bodyPivot.remove(existingCustom);
      }
      model.name = 'custom_gltf_hero';
      this.playerRig.bodyPivot.add(model);
      this.statusBanner = `Hot-Swapped Samurai 3D Model → ${displayName}`;
    }
    this.pushFloatingText(`3D GLB LOADED: ${displayName.toUpperCase()}`, this.playerPos, '#38bdf8', true);
  }

  // ============================================================================
  // SEAMLESS INFINITE OPEN-WORLD INITIALIZATION (ZERO STATIC ROAD RECTANGLES OR CONES)
  // ============================================================================
  public loadStage(stageIdx: number) {
    this.stageIndex = ((stageIdx % CAMPAIGN_STAGES.length) + CAMPAIGN_STAGES.length) % CAMPAIGN_STAGES.length;
    const stage = CAMPAIGN_STAGES[this.stageIndex];
    this.aiBrain.setLearningMultiplier(stage.boss.aiLearningRate);

    this.scene.background = new THREE.Color(stage.skyColor);
    this.scene.fog = new THREE.FogExp2(stage.fogColor, 0.0045);

    const keyLight = this.scene.getObjectByName('keyLight') as THREE.DirectionalLight;
    if (keyLight) keyLight.color.setHex(stage.keyLightColor);

    const hemiLight = this.scene.getObjectByName('hemiLight') as THREE.HemisphereLight;
    if (hemiLight) {
      hemiLight.color.setHex(stage.hemiSkyColor);
      hemiLight.groundColor.setHex(stage.hemiGroundColor);
    }

    // Clear previous environment, static colliders, enemies, projectiles, decals, debris
    while (this.envGroup.children.length > 0) {
      this.envGroup.remove(this.envGroup.children[0]);
    }
    this.envGroup.position.set(0, 0, 0);
    this.stageStaticColliders = [];
    this.enemies.forEach((e) => this.scene.remove(e.rig.root));
    this.enemies = [];
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.groundDecals.forEach((d) => this.scene.remove(d));
    this.groundDecals = [];
    this.debrisPieces.forEach((d) => this.scene.remove(d.mesh));
    this.debrisPieces = [];
    this.utsusemiClones.forEach((c) => this.scene.remove(c.mesh));
    this.utsusemiClones = [];
    this.sliceableBamboos = [];
    this.grassInstancedMesh = null;
    this.grassBaseCoords = [];
    this.dodgeActive = false;
    this.dodgeTimer = 0;
    this.grappleActive = false;
    this.simStepper.reset();
    this.spawnedChunkKeys.clear();
    this.spawnedChunkKeys.add('0:0');
    this.multiPhysics.clearPropEntries(this.scene);

    // Spawn Destructible Wooden Crates (Kibako) & Hanging Verlet Temple Banner in Cannon-es World
    const crateGeo = createSplineLatheGeometry(
      [
        [0.02, 0.0],
        [0.44, 0.02],
        [0.46, 0.42],
        [0.44, 0.84],
        [0.02, 0.86],
      ],
      8
    );
    const crateMat = createSumiWashiMaterial(0x785233, 0.78, 0.08, this.textures);
    for (const [cx, cz] of [
      [-6.2, 6.5],
      [6.2, 6.5],
      [-6.8, -4.0],
      [6.8, -4.0],
    ]) {
      const crateGroundY = this.getGroundHeightAt(cx, cz);
      const crateMesh = new THREE.Mesh(crateGeo, crateMat);
      crateMesh.castShadow = !this.isSoftwareGl;
      crateMesh.receiveShadow = true;
      this.scene.add(crateMesh);
      this.multiPhysics.addRigidBodyMesh(
        crateMesh,
        new CANNON.Box(new CANNON.Vec3(0.42, 0.43, 0.42)),
        12,
        { x: cx, y: crateGroundY + 0.44, z: cz },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        999,
        true,
        'crate',
        40
      );
    }

    // Hanging Temple Banner with Real-Time 3D Verlet Cloth Integration
    const toriiY = this.getGroundHeightAt(0, -18);
    const bannerMat = createSumiWashiMaterial(0x991b1b, 0.65, 0.1, this.textures);
    bannerMat.side = THREE.DoubleSide;
    this.bannerVerletCloth = new VerletClothSheet(1.15, 2.2, 6, 8, bannerMat);
    this.bannerVerletCloth.mesh.position.set(-3.4, toriiY + 4.8, -17.7);
    this.envGroup.add(this.bannerVerletCloth.mesh);

    // Sacred Torii Shrine Landmark at z = -18 + Physical Pillar Colliders
    const toriiGroup = this.buildToriiLandmark(stage);
    toriiGroup.position.set(0, toriiY, -18);
    this.envGroup.add(toriiGroup);
    for (const pillarX of [-3.4, 3.4]) {
      this.stageStaticColliders.push({
        id: `stage_torii_pillar_${pillarX}`,
        kind: 'cylinder',
        x: pillarX,
        z: -18,
        minY: toriiY - 0.5,
        maxY: toriiY + 6.2,
        radius: 0.48,
        tag: 'torii_pillar',
      });
    }

    // Distant Hyperbolic Catenary Pagoda Roof Shrine Silhouette at z = -34
    const pagodaRoofGeo = createIrimoyaPagodaRoofGeometry(12.5, 10.5, 4.2, 24);
    const pagodaMat = createUrushiLacquerMaterial(0x271c19, this.textures, false);
    const pagodaRoof = new THREE.Mesh(pagodaRoofGeo, pagodaMat);
    pagodaRoof.position.set(0, this.getGroundHeightAt(0, -34) + 5.5, -34);
    this.envGroup.add(pagodaRoof);

    // Flanking Carved Stone Lanterns (Toro) + Physical Cylinder Colliders
    for (const side of [-4.8, 4.8]) {
      for (const zPos of [4, -8]) {
        const ly = this.getGroundHeightAt(side, zPos);
        const lantern = this.buildStoneLantern(stage);
        lantern.position.set(side, ly, zPos);
        this.envGroup.add(lantern);
        this.stageStaticColliders.push({
          id: `stage_lantern_${side}_${zPos}`,
          kind: 'cylinder',
          x: side,
          z: zPos,
          minY: ly - 0.5,
          maxY: ly + 2.22,
          radius: 0.44,
          tag: 'lantern',
        });
      }
    }

    // Interactive Sliceable Nodal Bamboo Stalks (Can be cut in half via Zandatsu Planar Mesh Slicing!)
    const bambooGeo = createSegmentedBambooWithNodesGeometry(4.8);
    const bambooMat = createSumiWashiMaterial(0x2d5a27, 0.54, 0.1, this.textures);
    for (let b = 0; b < 14; b++) {
      const ang = (b / 14) * Math.PI * 2 + 0.25;
      const rad = 16.5 + (b % 3) * 2.2;
      const bx = Math.cos(ang) * rad;
      const bz = Math.sin(ang) * rad - 2;
      if (Math.abs(bx) < 5.5) continue;
      const by = this.getGroundHeightAt(bx, bz);
      const bambooMesh = new THREE.Mesh(bambooGeo, bambooMat);
      bambooMesh.position.set(bx, by, bz);
      bambooMesh.castShadow = !this.isSoftwareGl;
      this.envGroup.add(bambooMesh);
      const colliderId = `stage_bamboo_${b}`;
      this.stageStaticColliders.push({
        id: colliderId,
        kind: 'cylinder',
        x: bx,
        z: bz,
        minY: by - 0.5,
        maxY: by + 4.8,
        radius: 0.28,
        tag: 'bamboo',
      });
      this.sliceableBamboos.push({
        mesh: bambooMesh,
        pos: new THREE.Vector3(bx, by, bz),
        sliced: false,
        colliderId,
      });
    }

    // GPU-Instanced Interactive Multi-Blade Curved Grass Clumps (ZERO ConeGeometry!)
    const grassCount = 120;
    const multiBladeClumpGeo = createMultiBladeGrassClumpGeometry(9);
    const grassMat = createSumiWashiMaterial(0x3f7a38, 0.66, 0.06, this.textures);
    grassMat.side = THREE.DoubleSide;
    this.grassInstancedMesh = new THREE.InstancedMesh(multiBladeClumpGeo, grassMat, grassCount);
    this.grassInstancedMesh.frustumCulled = false;
    for (let g = 0; g < grassCount; g++) {
      const a = (g / grassCount) * Math.PI * 2 + (g % 7) * 0.19;
      const r = 7.5 + (g % 11) * 1.65;
      let gx = Math.cos(a) * r;
      const gz = Math.sin(a) * r - 2;
      if (Math.abs(gx) < 4.4) gx += gx < 0 ? -4.8 : 4.8;
      const gs = 0.85 + (g % 4) * 0.22;
      const gyaw = (g * 1.3) % (Math.PI * 2);
      this.grassBaseCoords.push({ x: gx, z: gz, scale: gs, yaw: gyaw });
    }
    this.updateInteractiveGrass(0);
    this.envGroup.add(this.grassInstancedMesh);

    // Gnarled Japanese Matsu Pine & Momiji Maple Perimeter Trees + Physical Trunk Colliders
    for (let t = 0; t < 12; t++) {
      const angle = (t / 12) * Math.PI * 2 + 0.18;
      const radius = 22.0 + (t % 3) * 4.5;
      let tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius - 3;
      if (Math.abs(tx) < 6.5) tx += tx < 0 ? -7.5 : 7.5;
      const ty = this.getGroundHeightAt(tx, tz);
      const style = t % 3 === 0 ? 'momiji_maple' : t % 3 === 1 ? 'matsu_pine' : 'sakura_cherry';
      const treeGrp = buildGnarledJapaneseTree(style, this.textures);
      treeGrp.position.set(tx, ty, tz);
      treeGrp.rotation.y = angle + 1.2;
      const sc = 0.85 + (t % 3) * 0.15;
      treeGrp.scale.setScalar(sc);
      this.envGroup.add(treeGrp);
      this.stageStaticColliders.push({
        id: `stage_tree_${t}`,
        kind: 'cylinder',
        x: tx,
        z: tz,
        minY: ty - 0.5,
        maxY: ty + 5.6 * sc,
        radius: 0.45 * sc,
        tag: 'tree',
      });
    }

    // Reset Player Position on Open Shrine Glade facing North (-Z)
    const startY = this.getGroundHeightAt(0, 14);
    this.playerPos.set(0, startY, 14);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = Math.PI;
    this.hp = this.stats.maxHp;
    this.ghostHp = this.stats.maxHp;
    this.posture = 0;
    this.ki = this.stats.maxKi;
    this.armorIntegrity = 100;
    this.throwableStock = this.equippedThrowable.maxStock;
    this.bossSpawnedInStage = false;
    this.portalCooldown = 2.5;

    // Rebuild 5x5 (80m x 80m) Dynamic Open-World Chunk Grid around player
    this.lastOpenWorldTelemetry = this.openWorld.updateStreamedWorld(
      this.playerPos,
      this.runTimeSec,
      this.textures.washiNormal,
      this.textures.washiBump,
      undefined,
      (cx, cz, wx, wz, biome) => this.spawnOpenWorldChunkEntities(cx, cz, wx, wz, biome)
    );
    this.statusBanner = `${this.lastOpenWorldTelemetry.currentBiome.name} (${this.lastOpenWorldTelemetry.currentBiome.kanji}) · [V] ${CAMERA_MODE_LABELS[this.cameraMode]}`;

    this.spawnStageWave(stage);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.resetAmbientParticle(i, true);
    }
    this.broadcastHUD(true);
  }

  /**
   * Deterministically spawns roaming Ronin patrols, Yokai packs, and World Bosses
   * as the player walks infinitely in ANY 360° direction into new 80m x 80m chunks.
   */
  private spawnOpenWorldChunkEntities(
    cx: number,
    cz: number,
    chunkWorldCenterX: number,
    chunkWorldCenterZ: number,
    biome: OpenWorldBiomeDefinition
  ) {
    if (this.isDojoMode || (cx === 0 && cz === 0)) return;
    const key = `${cx}:${cz}`;
    if (this.spawnedChunkKeys.has(key)) return;
    this.spawnedChunkKeys.add(key);

    // Cap active AI entities for rock-solid 60 FPS
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'ko');
    if (aliveEnemies.length >= 16) return;

    const archetypeKeys = Object.keys(ENEMY_ARCHETYPES) as (keyof typeof ENEMY_ARCHETYPES)[];
    const seed = Math.floor(hash2D(cx * 37, cz * 59) * 1000);
    const patrolCount = 2 + (seed % 2);
    const localCenterX = cx * this.openWorld.chunkSize;
    const localCenterZ = cz * this.openWorld.chunkSize;

    for (let i = 0; i < patrolCount; i++) {
      const archKey = archetypeKeys[(seed + i * 3) % archetypeKeys.length];
      const arch = ENEMY_ARCHETYPES[archKey];
      const offsetX = (hash2D(cx * 17 + i, cz * 29 + i) - 0.5) * 36;
      const offsetZ = (hash2D(cx * 43 + i, cz * 71 + i) - 0.5) * 36;
      const sx = localCenterX + offsetX;
      const sz = localCenterZ + offsetZ;
      const sy = this.openWorld.getGroundAndBridgeHeightAt(sx, sz);

      const sampleWeapon = WEAPONS.find((w) => w.id === arch.weaponType) || WEAPONS[0];
      const rig = createEnemyMeshRig(arch, false, this.textures, sampleWeapon);
      rig.root.position.set(sx, sy, sz);
      this.scene.add(rig.root);

      this.enemies.push({
        id: this.nextEnemyId++,
        name: `${biome.kanji} ${arch.name}`,
        isBoss: false,
        archetype: arch,
        rig,
        pos: new THREE.Vector3(sx, sy, sz),
        vel: new THREE.Vector3(),
        radius: 0.44 * arch.scale,
        height: 1.85 * arch.scale,
        hp: arch.hp,
        maxHp: arch.hp,
        posture: 0,
        maxPosture: arch.posture,
        state: 'approach',
        stateTimer: 0.5 + i * 0.3,
        windupDuration: arch.windupSec,
        hyperArmorActive: false,
        poisonTimer: 0,
        slowTimer: 0,
        burnTimer: 0,
        strafeSign: i % 2 === 0 ? 1 : -1,
        specialCooldown: 3.5,
        hitFlashTimer: 0,
      });
    }

    // Spawn a Roaming Province World Boss in landmark citadel chunks when no boss is currently alive
    const hasAliveBoss = this.enemies.some((e) => e.isBoss && e.state !== 'ko');
    if (!hasAliveBoss && (Math.abs(cx) + Math.abs(cz)) % 2 === 0 && hash2D(chunkWorldCenterX, chunkWorldCenterZ) > 0.35) {
      const stageForChunk = CAMPAIGN_STAGES[Math.abs(cx * 3 + cz * 7) % CAMPAIGN_STAGES.length];
      const boss = stageForChunk.boss;
      const sampleWeapon = WEAPONS.find((w) => w.id === boss.weaponTypes[0]) || WEAPONS[1];
      const rig = createEnemyMeshRig(boss, true, this.textures, sampleWeapon);
      const bx = localCenterX;
      const bz = localCenterZ;
      const by = this.getGroundHeightAt(bx, bz);
      const spawnPos = new THREE.Vector3(bx, by, bz);
      rig.root.position.copy(spawnPos);
      this.scene.add(rig.root);

      this.enemies.push({
        id: this.nextEnemyId++,
        name: boss.name,
        isBoss: true,
        bossDef: boss,
        rig,
        pos: spawnPos,
        vel: new THREE.Vector3(),
        radius: 0.56 * boss.scale,
        height: 2.1 * boss.scale,
        hp: boss.hp,
        maxHp: boss.hp,
        posture: 0,
        maxPosture: boss.posture,
        state: 'approach',
        stateTimer: 0.6,
        windupDuration: 0.55,
        hyperArmorActive: false,
        poisonTimer: 0,
        slowTimer: 0,
        burnTimer: 0,
        strafeSign: 1,
        specialCooldown: 4.5,
        hitFlashTimer: 0,
      });
    }
  }

  private updateInteractiveGrass(timeSec: number) {
    if (!this.grassInstancedMesh) return;
    for (let i = 0; i < this.grassBaseCoords.length; i++) {
      const g = this.grassBaseCoords[i];
      const dx = g.x - this.playerPos.x;
      const dz = g.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      // Multi-blade grass bends away from player position and sways in wind
      const bendStrength = dist < 2.8 ? (1 - dist / 2.8) * 0.78 : 0;
      const windTilt = Math.sin(timeSec * 2.4 + g.x * 0.35 + g.z * 0.25) * 0.14;
      const tiltX = (dz / Math.max(0.1, dist)) * bendStrength + windTilt;
      const tiltZ = -(dx / Math.max(0.1, dist)) * bendStrength + windTilt * 0.5;
      const gy = this.openWorld.getGroundAndBridgeHeightAt(g.x, g.z);

      this._v1.set(g.x, gy, g.z);
      this._euler.set(tiltX, g.yaw, tiltZ);
      this._quat.setFromEuler(this._euler);
      this._v2.set(g.scale, g.scale, g.scale);
      this._mat4.compose(this._v1, this._quat, this._v2);
      this.grassInstancedMesh.setMatrixAt(i, this._mat4);
    }
    this.grassInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  private buildToriiLandmark(stage: StageDef): THREE.Group {
    const group = new THREE.Group();
    const redMat = createSumiWashiMaterial(0x991b1b, 0.5, 0.2, this.textures);
    const blackMat = createSumiWashiMaterial(0x181411, 0.4, 0.3, this.textures);
    const goldMat = createSumiWashiMaterial(0xfbbf24, 0.25, 0.85, this.textures);

    const baseGeo = createSplineLatheGeometry(
      [
        [0.01, 0.0],
        [0.48, 0.04],
        [0.46, 0.45],
        [0.42, 0.86],
        [0.01, 0.9],
      ],
      48
    );
    const pillarGeo = createSplineLatheGeometry(
      [
        [0.01, 0.0],
        [0.38, 0.05],
        [0.36, 2.2],
        [0.34, 4.4],
        [0.32, 6.15],
        [0.01, 6.2],
      ],
      48
    );

    for (const x of [-3.4, 3.4]) {
      const base = new THREE.Mesh(baseGeo, blackMat);
      base.position.set(x, 0, 0);
      group.add(base);

      const pillar = new THREE.Mesh(pillarGeo, redMat);
      pillar.position.set(x, 0, 0);
      pillar.castShadow = !this.isSoftwareGl;
      group.add(pillar);
    }

    const nukiShape = new THREE.Shape();
    nukiShape.moveTo(-4.1, -0.18);
    nukiShape.lineTo(4.1, -0.18);
    nukiShape.lineTo(4.02, 0.18);
    nukiShape.lineTo(-4.02, 0.18);
    nukiShape.closePath();
    const nukiGeo = new THREE.ExtrudeGeometry(nukiShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    nukiGeo.center();
    const nuki = new THREE.Mesh(nukiGeo, redMat);
    nuki.position.set(0, 4.9, 0);
    group.add(nuki);

    const kasagiShape = new THREE.Shape();
    kasagiShape.moveTo(-4.95, 0.12);
    kasagiShape.quadraticCurveTo(0, -0.18, 4.95, 0.12);
    kasagiShape.lineTo(4.78, 0.48);
    kasagiShape.quadraticCurveTo(0, 0.16, -4.78, 0.48);
    kasagiShape.closePath();
    const kasagiGeo = new THREE.ExtrudeGeometry(kasagiShape, {
      depth: 0.56,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    kasagiGeo.center();

    const shimaki = new THREE.Mesh(kasagiGeo, redMat);
    shimaki.scale.set(0.93, 0.85, 0.84);
    shimaki.position.set(0, 6.08, 0);
    group.add(shimaki);

    const kasagi = new THREE.Mesh(kasagiGeo, blackMat);
    kasagi.position.set(0, 6.4, 0);
    group.add(kasagi);

    const plaqueShape = new THREE.Shape();
    plaqueShape.moveTo(-0.36, -0.56);
    plaqueShape.lineTo(0.36, -0.56);
    plaqueShape.lineTo(0.32, 0.56);
    plaqueShape.lineTo(-0.32, 0.56);
    plaqueShape.closePath();
    const plaqueGeo = new THREE.ExtrudeGeometry(plaqueShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    plaqueGeo.center();
    const plaque = new THREE.Mesh(plaqueGeo, goldMat);
    plaque.position.set(0, 5.5, 0);
    group.add(plaque);

    // Glowing Sacred Spirit Portal Ring inside the Torii Gate
    const portalMat = new THREE.MeshBasicMaterial({
      color: stage.petalColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const portalDisc = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.75, 40), portalMat);
    portalDisc.position.set(0, 2.8, 0);
    group.add(portalDisc);

    return group;
  }

  private buildStoneLantern(_stage: StageDef): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = createSumiWashiMaterial(0x78716c, 0.82, 0.08, this.textures);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const pedestalGeo = createSplineLatheGeometry(
      [
        [0.01, 0.0],
        [0.36, 0.04],
        [0.28, 0.25],
        [0.22, 0.65],
        [0.24, 1.05],
        [0.35, 1.18],
        [0.01, 1.22],
      ],
      40
    );
    group.add(new THREE.Mesh(pedestalGeo, stoneMat));

    const fireBoxGeo = createSplineLatheGeometry(
      [
        [0.01, 1.22],
        [0.21, 1.24],
        [0.22, 1.62],
        [0.01, 1.65],
      ],
      32
    );
    group.add(new THREE.Mesh(fireBoxGeo, glowMat));

    const kasaRoofGeo = createSplineLatheGeometry(
      [
        [0.01, 1.64],
        [0.64, 1.68],
        [0.48, 1.82],
        [0.22, 1.98],
        [0.12, 2.12],
        [0.01, 2.22],
      ],
      40
    );
    group.add(new THREE.Mesh(kasaRoofGeo, stoneMat));

    return group;
  }

  private spawnStageWave(stage: StageDef) {
    let idx = 0;
    for (const wave of stage.enemyWaves) {
      const arch = ENEMY_ARCHETYPES[wave.archetype];
      for (let c = 0; c < wave.count; c++) {
        const angle = ((idx * 1.15) % (Math.PI * 1.2)) - Math.PI * 0.6;
        const dist = 12 + (idx % 3) * 4.5;
        const x = Math.sin(angle) * dist;
        const z = -Math.cos(angle) * dist + 2;
        const y = this.getGroundHeightAt(x, z);

        const sampleWeapon =
          WEAPONS.find((w) => w.id === arch.weaponType) || WEAPONS[0];
        const rig = createEnemyMeshRig(arch, false, this.textures, sampleWeapon);
        rig.root.position.set(x, y, z);
        this.scene.add(rig.root);

        this.enemies.push({
          id: this.nextEnemyId++,
          name: arch.name,
          isBoss: false,
          archetype: arch,
          rig,
          pos: new THREE.Vector3(x, y, z),
          vel: new THREE.Vector3(),
          radius: 0.44 * arch.scale,
          height: 1.85 * arch.scale,
          hp: arch.hp,
          maxHp: arch.hp,
          posture: 0,
          maxPosture: arch.posture,
          state: 'approach',
          stateTimer: 0.4 + Math.random() * 0.6,
          windupDuration: arch.windupSec,
          hyperArmorActive: false,
          poisonTimer: 0,
          slowTimer: 0,
          burnTimer: 0,
          strafeSign: idx % 2 === 0 ? 1 : -1,
          specialCooldown: 3.0,
          hitFlashTimer: 0,
        });
        idx++;
      }
    }
  }

  private spawnStageBoss() {
    if (this.bossSpawnedInStage) return;
    this.bossSpawnedInStage = true;
    const stage = CAMPAIGN_STAGES[this.stageIndex];
    const boss = stage.boss;
    const sampleWeapon =
      WEAPONS.find((w) => w.id === boss.weaponTypes[0]) || WEAPONS[1];
    const rig = createEnemyMeshRig(boss, true, this.textures, sampleWeapon);

    const bx = this.playerPos.x + Math.sin(this.playerYaw) * 14;
    const bz = this.playerPos.z + Math.cos(this.playerYaw) * 14;
    const by = this.getGroundHeightAt(bx, bz);
    const spawnPos = new THREE.Vector3(bx, by, bz);
    rig.root.position.copy(spawnPos);
    this.scene.add(rig.root);

    this.enemies.push({
      id: this.nextEnemyId++,
      name: boss.name,
      isBoss: true,
      bossDef: boss,
      rig,
      pos: spawnPos,
      vel: new THREE.Vector3(),
      radius: 0.56 * boss.scale,
      height: 2.1 * boss.scale,
      hp: boss.hp,
      maxHp: boss.hp,
      posture: 0,
      maxPosture: boss.posture,
      state: 'approach',
      stateTimer: 0.5,
      windupDuration: 0.55,
      hyperArmorActive: false,
      poisonTimer: 0,
      slowTimer: 0,
      burnTimer: 0,
      strafeSign: 1,
      specialCooldown: 4.5,
      hitFlashTimer: 0,
    });

    this.statusBanner = `BOSS AWAKENED: ${boss.name} (${boss.kanjiSubtitle})`;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
    this.audio.playHitImpact(true);
    this.audio.playYokaiRoarFormant('oni', spawnPos, this.playerPos);
    this.triggerJapaneseBattleCallout('boss_challenge', spawnPos);
    this.broadcastHUD(true);
  }

  // ============================================================================
  // INTERACTIVE COMBO DOJO, NANO BANANA PRO PBR FORGE & JAPANESE VOICE API
  // ============================================================================
  public toggleDojoOverlay(forceState?: boolean) {
    const nextState = forceState !== undefined ? forceState : !this.comboDojo.trainerOpen;
    this.comboDojo.setTrainerOpen(nextState);
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      0,
      this.playerPos,
      this.playerYaw,
      null,
      this.runTimeSec,
      (x, z) => this.getGroundHeightAt(x, z)
    );
    if (this.comboDojo.trainerOpen) {
      this.statusBanner = '稽古道場 Interactive Combo Dojo · Holographic Ghost Master Active';
      this.audio.playKiaiVocalFormant('kuji_in', this.playerPos, this.playerPos);
    }
    this.broadcastHUD(true);
  }

  public selectDojoLesson(lessonIndex: number) {
    this.comboDojo.selectLesson(lessonIndex);
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      0,
      this.playerPos,
      this.playerYaw,
      null,
      this.runTimeSec,
      (x, z) => this.getGroundHeightAt(x, z)
    );
    this.broadcastHUD(true);
  }

  public toggleGhostSlowMotion() {
    this.comboDojo.ghostMasterSlowMoSpeed =
      this.comboDojo.ghostMasterSlowMoSpeed < 0.6 ? 1.0 : 0.45;
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      0,
      this.playerPos,
      this.playerYaw,
      null,
      this.runTimeSec,
      (x, z) => this.getGroundHeightAt(x, z)
    );
    this.broadcastHUD(true);
  }

  public triggerJapaneseBattleCallout(
    dialogueId: keyof typeof BILINGUAL_BATTLE_DIALOGUES,
    sourcePos?: THREE.Vector3
  ) {
    const dlg = BILINGUAL_BATTLE_DIALOGUES[dialogueId];
    if (!dlg) return;
    this.activeDialogueSubtitle = dlg;
    this.dialogueTimer = 4.2;
    this.audio.speakJapaneseBattleLine(
      dlg.romaji,
      dlg.japaneseKanji,
      dlg.category === 'boss_challenge' ? 0.65 : 0.85,
      1.04,
      sourcePos || this.playerPos,
      this.playerPos
    );
    this.broadcastHUD(true);
  }

  public async generateAndApplyNanoBananaPBR(
    presetId: NanoBananaPresetId,
    customPrompt?: string
  ): Promise<SobelPBRMapBundle> {
    const bundle = await synthesizeNanoBananaPBRBundle(presetId, customPrompt);
    if (this.activePbrBundle) {
      this.activePbrBundle.albedoTex.dispose();
      this.activePbrBundle.normalTex.dispose();
      this.activePbrBundle.heightTex.dispose();
      this.activePbrBundle.roughnessTex.dispose();
    }
    this.activePbrBundle = bundle;
    this.applyActivePBRBundleToMeshSlot(bundle);
    const preset =
      NANO_BANANA_PBR_PRESETS.find((p) => p.id === bundle.presetId) ||
      NANO_BANANA_PBR_PRESETS[0];
    this.statusBanner = `Applied 4-Map POM Material: ${preset.name} (${bundle.sourceModel})`;
    this.pushFloatingText(`4-MAP PBR + POM APPLIED: ${preset.name.toUpperCase()}`, this.playerPos, '#38bdf8', true);
    this.broadcastHUD(true);
    return bundle;
  }

  private applyActivePBRBundleToMeshSlot(bundle: SobelPBRMapBundle) {
    const preset =
      NANO_BANANA_PBR_PRESETS.find((p) => p.id === bundle.presetId) ||
      NANO_BANANA_PBR_PRESETS[0];
    const targetRoot =
      preset.targetCategory === 'weapon'
        ? this.playerRig?.weaponMount
        : preset.targetCategory === 'armor'
          ? this.playerRig?.torsoGroup
          : this.envGroup;
    if (!targetRoot) return;

    targetRoot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const stdMat = mesh.material as THREE.MeshStandardMaterial;
        applyPOMAndTriplanarMaterial(stdMat, bundle, preset.pomDepthScale, preset.normalStrength * 0.45);
      }
    });
  }

  // ============================================================================
  // PUBLIC CONTROLS & UI ACTIONS
  // ============================================================================
  public startGame() {
    this.customizerMode = false;
    if (this.isDojoMode) {
      this.isDojoMode = false;
      this.loadStage(this.stageIndex);
    }
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.keysHeld.clear();
    this.keysJustPressed.clear();
    this.leftMouseDown = false;
    this.audio.startAmbientLoop();
    this.broadcastHUD(true);
  }

  public startDojoTraining() {
    this.customizerMode = false;
    this.isDojoMode = true;
    this.runTimeSec = 0;
    this.damageTakenRun = 0;
    this.comboCount = 0;
    this.loadStage(this.stageIndex);

    this.enemies.forEach((e) => this.scene.remove(e.rig.root));
    this.enemies = [];
    this.bossSpawnedInStage = true;

    const dummyArch = ENEMY_ARCHETYPES.armored_samurai;
    const dummyRig = createDojoDummyMeshRig(this.textures, WEAPONS[0]);
    const dummyGroundY = this.getGroundHeightAt(0, 8.2);
    const dummyPos = new THREE.Vector3(0, dummyGroundY, 8.2);
    dummyRig.root.position.copy(dummyPos);
    this.scene.add(dummyRig.root);

    this.enemies.push({
      id: this.nextEnemyId++,
      name: 'Karakuri Dojo Dummy',
      isBoss: false,
      isTrainingDummy: true,
      archetype: dummyArch,
      rig: dummyRig,
      pos: dummyPos,
      vel: new THREE.Vector3(),
      radius: 0.48,
      height: 1.9,
      hp: 1000,
      maxHp: 1000,
      posture: 0,
      maxPosture: 200,
      state: 'approach',
      stateTimer: 1.0,
      windupDuration: 0.65,
      hyperArmorActive: false,
      poisonTimer: 0,
      slowTimer: 0,
      burnTimer: 0,
      strafeSign: 1,
      specialCooldown: 999,
      hitFlashTimer: 0,
    });

    const dojoPlayerY = this.getGroundHeightAt(0, 12.6);
    this.playerPos.set(0, dojoPlayerY, 12.6);
    this.playerYaw = Math.PI;
    this.comboDojo.setTrainerOpen(true);
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      0,
      this.playerPos,
      this.playerYaw,
      null,
      this.runTimeSec,
      (x, z) => this.getGroundHeightAt(x, z)
    );
    this.statusBanner = 'Dojo Training Mode · 稽古道場 (7-Lesson Curriculum & Ghost Master Active)';
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.keysHeld.clear();
    this.keysJustPressed.clear();
    this.leftMouseDown = false;
    this.audio.startAmbientLoop();
    this.broadcastHUD(true);
  }

  public togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      document.body.dataset.state = 'paused';
      this.keysHeld.clear();
      this.leftMouseDown = false;
      this.broadcastHUD(true);
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      document.body.dataset.state = 'playing';
      this.broadcastHUD(true);
    }
  }

  public restartStage() {
    this.runTimeSec = 0;
    this.damageTakenRun = 0;
    if (this.isDojoMode) {
      this.startDojoTraining();
      return;
    }
    this.loadStage(this.stageIndex);
    this.startGame();
  }

  public returnToTitle() {
    this.isDojoMode = false;
    this.customizerMode = false;
    this.gameState = 'title';
    document.body.dataset.state = 'title';
    this.keysHeld.clear();
    this.leftMouseDown = false;
    this.loadStage(this.stageIndex);
    this.broadcastHUD(true);
  }

  public selectStage(idx: number) {
    this.loadStage(idx);
    if (this.gameState !== 'title') {
      this.startGame();
    }
  }

  public equipWeapon(weaponId: string) {
    const w = WEAPONS.find((item) => item.id === weaponId);
    if (!w) return;
    if (w.category === 'bladed') {
      this.primaryWeapon = w;
      this.activeSlot = 'primary';
    } else if (w.category === 'polearm_heavy') {
      this.secondaryWeapon = w;
      this.activeSlot = 'secondary';
    } else {
      this.rangedWeapon = w;
      this.activeSlot = 'ranged';
    }
    this.recomputeStatsAndVisuals();
  }

  public equipThrowable(throwableId: string) {
    const t = THROWABLES.find((item) => item.id === throwableId);
    if (!t) return;
    this.equippedThrowable = t;
    this.throwableStock = t.maxStock;
    this.broadcastHUD(true);
  }

  public equipArmor(armorId: string) {
    const a = ARMORS.find((item) => item.id === armorId);
    if (!a) return;
    this.equippedArmor = a;
    this.armorIntegrity = 100;
    this.recomputeStatsAndVisuals();
  }

  public equipHelmet(helmetId: string) {
    const h = HELMETS.find((item) => item.id === helmetId);
    if (!h) return;
    this.equippedHelmet = h;
    this.recomputeStatsAndVisuals();
  }

  public cycleWeaponSlot(direction: 1 | -1) {
    const order: ('primary' | 'secondary' | 'ranged')[] = ['primary', 'secondary', 'ranged'];
    const cur = order.indexOf(this.activeSlot);
    this.activeSlot = order[(cur + direction + order.length) % order.length];
    this.recomputeStatsAndVisuals();
    this.audio.playSwordSlash(false);
  }

  // ============================================================================
  // INPUT & EVENT HANDLERS
  // ============================================================================
  private bindEvents() {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

      if (code === 'KeyV' && !this.customizerMode) {
        e.preventDefault();
        this.cycleCameraMode();
        return;
      }
      if (this.gameState === 'title' && !this.customizerMode && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        this.startGame();
        return;
      }
      if (code === 'Escape' || code === 'KeyP') {
        if (this.customizerMode) {
          this.setCustomizerMode(false);
          return;
        }
        if (this.gameState === 'playing' || this.gameState === 'paused') {
          this.togglePause();
          return;
        }
      }
      if (!this.keysHeld.has(code)) {
        this.keysJustPressed.add(code);
      }
      this.keysHeld.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
      if (e.code === 'Space' && this.playerVel.y > 0) {
        this.playerVel.y *= 0.45;
      }
    };

    const onBlur = () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
      this.leftMouseDown = false;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.mousePosNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePosNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      // Align horizontal aim plane with player's current 3D ground elevation
      this._groundPlane.constant = -this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);
      this._raycaster.setFromCamera(this.mousePosNDC, this.camera);
      this._raycaster.ray.intersectPlane(this._groundPlane, this.mouseWorldPoint);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (this.gameState !== 'playing' || this.customizerMode) return;
      if ((e.target as HTMLElement)?.closest('[data-ui-interactive="true"]')) return;

      if (e.button === 0) {
        this.leftMouseDown = true;
        this.leftMouseHoldTime = 0;
        this.isChargingHeavy = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.triggerDeflectParry();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && this.leftMouseDown) {
        this.leftMouseDown = false;
        const wasHeavy = this.leftMouseHoldTime >= 0.34;
        this.isChargingHeavy = false;
        this.leftMouseHoldTime = 0;
        if (this.gameState === 'playing' && !this.customizerMode) {
          this.triggerPrimaryAttack(wasHeavy);
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) {
        this.composer.setSize(w, h);
      }
      if (this.sobelPass) {
        this.sobelPass.uniforms.uResolution.value.set(w, h);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (this.gameState !== 'playing' || this.customizerMode) return;
      if ((e.target as HTMLElement)?.closest('[data-ui-interactive="true"]')) return;
      if (Math.abs(e.deltaY) > 4) {
        this.cycleWeaponSlot(e.deltaY > 0 ? 1 : -1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', onResize);

    (this as unknown as { _unbind: () => void })._unbind = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
    };
  }

  // ============================================================================
  // 7-MODE DODGE, ACROBATICS & KAGINAWA GRAPPLING HOOK ENGINE (VELOCITY-DRIVEN)
  // ============================================================================
  private startVelocityDodge(
    dirX: number,
    dirZ: number,
    durationSec: number,
    targetDistanceMeters: number,
    invulnSec: number
  ) {
    const len = Math.hypot(dirX, dirZ);
    this.dodgeDirX = len > 1e-5 ? dirX / len : Math.sin(this.playerYaw);
    this.dodgeDirZ = len > 1e-5 ? dirZ / len : Math.cos(this.playerYaw);
    this.dodgeDuration = Math.max(0.16, durationSec);
    this.dodgeTimer = this.dodgeDuration;
    // Ease-out velocity curve v(u) = vPeak * (1 - u) has integral 0.5 * vPeak * duration = targetDistance
    this.dodgePeakSpeed = (targetDistanceMeters * 2.0) / this.dodgeDuration;
    this.dodgeActive = true;
    this.invulnTimer = Math.max(this.invulnTimer, invulnSec);
    this.playerYaw = Math.atan2(this.dodgeDirX, this.dodgeDirZ);
  }

  public triggerMultiModeDodge(moveX: number, moveZ: number, nowMs: number) {
    if (this.ki < 14 || this.invulnTimer > 0 || this.dodgeActive) return;

    const dirX = moveX !== 0 || moveZ !== 0 ? moveX : Math.sin(this.playerYaw);
    const dirZ = moveX !== 0 || moveZ !== 0 ? moveZ : Math.cos(this.playerYaw);

    // Check Mode 5: MIKIRI BLADE-STOMP COUNTER (`W + Shift` into enemy windup/attack)
    const pressingForward = this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp');
    const windupEnemy = this.enemies.find(
      (e) =>
        e.state !== 'ko' &&
        (e.state === 'windup' || e.state === 'attack') &&
        e.pos.distanceTo(this.playerPos) <= 5.4
    );

    if (pressingForward && windupEnemy && windupEnemy.stateTimer <= 0.45) {
      this.lastDodgeMode = 'mikiri_counter';
      this.ki = Math.max(0, this.ki - 12);
      const dx = windupEnemy.pos.x - this.playerPos.x;
      const dz = windupEnemy.pos.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      const stepDist = Math.max(0, dist - (this.playerRadius + windupEnemy.radius + 0.35));
      this.startVelocityDodge(dx, dz, 0.22, stepDist, 0.42);

      // Shatter 65% of enemy's Max Posture!
      const postureShatter = Math.round(windupEnemy.maxPosture * 0.65);
      windupEnemy.posture = Math.min(windupEnemy.maxPosture, windupEnemy.posture + postureShatter);
      windupEnemy.state = 'staggered';
      windupEnemy.stateTimer = 1.65;
      this.hitstopTimer = 0.08;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.52);
      this.audio.playParryClash(true);
      this._v1.set(windupEnemy.pos.x, windupEnemy.pos.y + 0.35, windupEnemy.pos.z);
      this.spawnBurstParticles(this._v1, 0xfbbf24, 28, 10.0);
      this.pushFloatingText('見切り MIKIRI BLADE-STOMP! (-65% POSTURE)', windupEnemy.pos, '#fbbf24', true);
      if (windupEnemy.posture >= windupEnemy.maxPosture) {
        this.triggerPostureBreakDeathblow(windupEnemy);
      }
      this.broadcastHUD(true);
      return;
    }

    // Check Mode 3: MIRI-KIRI PERFECT FLASH-STEP DODGE (Within 220ms of incoming strike)
    const imminentEnemy = this.enemies.find(
      (e) =>
        e.state !== 'ko' &&
        ((e.state === 'windup' && e.stateTimer <= 0.22) || e.state === 'attack') &&
        e.pos.distanceTo(this.playerPos) <= 5.8
    );
    if (imminentEnemy) {
      this.lastDodgeMode = 'miri_kiri';
      this.chronosTimer = 1.8; // 1.8s Chronos Time-Dilation (15% enemy speed)
      this.shadowCrossReady = true;
      this.ki = Math.min(this.stats.maxKi, this.ki + this.stats.maxKi * 0.4); // +40% Ki restored
      this.spawnAfterimageSilhouette(this.playerPos, this.playerYaw);
      this.startVelocityDodge(dirX, dirZ, 0.24, 3.8, 0.42);
      this.audio.playParryClash(true);
      this.pushFloatingText(
        '見切り閃光 MIRI-KIRI FLASH-STEP! (CHRONOS 1.8s +40% KI)',
        this.playerPos,
        '#38bdf8',
        true
      );
      this.broadcastHUD(true);
      return;
    }

    // Check Mode 2: UKEMI 360 ACROBATIC ROLL (Double-Tap Shift within 380ms)
    if (nowMs - this.lastShiftTapTime <= 380) {
      this.lastDodgeMode = 'ukemi_roll';
      this.lastShiftTapTime = 0;
      this.ki = Math.max(0, this.ki - 20);
      this.rollAnimDuration = 0.36;
      this.rollAnimTimer = 0.36;
      this.startVelocityDodge(dirX, dirZ, 0.36, 4.4, 0.34);
      this._v1.set(this.playerPos.x, this.playerPos.y + 0.25, this.playerPos.z);
      this.spawnBurstParticles(this._v1, 0xd6d3d1, 20, 6.5);
      this.audio.playFootstep();
      this.pushFloatingText('受身 UKEMI 360° ROLL', this.playerPos, '#e7e5e4', false);
      return;
    }

    // Mode 1: TAI-SABAKI QUICK-STEP SIDESTEP (Velocity-driven 3.8m over 0.22s with wall-sliding)
    this.lastShiftTapTime = nowMs;
    this.lastDodgeMode = 'tai_sabaki';
    this.ki = Math.max(0, this.ki - 14);
    this.spawnAfterimageSilhouette(this.playerPos, this.playerYaw);
    this.startVelocityDodge(dirX, dirZ, 0.22, 3.8, 0.22);
    this._v1.set(this.playerPos.x, this.playerPos.y + 0.9, this.playerPos.z);
    this.spawnBurstParticles(this._v1, 0x181411, 16, 6.5);
    this.audio.playFootstep();
  }

  // Mode 4: UTSUSEMI PHANTOM INK-CLONE DODGE (`Alt` key — Velocity-Driven Backstep)
  public triggerUtsusemiCloneDodge() {
    if (this.dodgeActive) return;
    if (this.ki < 26) {
      this.pushFloatingText('LOW KI FOR UTSUSEMI', this.playerPos, '#60a5fa', false);
      return;
    }
    this.ki = Math.max(0, this.ki - 26);
    this.lastDodgeMode = 'utsusemi_clone';

    // Spawn 3D Ink Decoy Clone grounded at current position that taunts enemies for 2.5s
    const cloneGroup = new THREE.Group();
    const inkMat = new THREE.MeshBasicMaterial({
      color: 0x110d0a,
      transparent: true,
      opacity: 0.78,
    });
    const cloneTorso = createSplineLatheGeometry(
      [
        [0.32, 0],
        [0.28, 0.9],
        [0.36, 1.5],
        [0.18, 1.95],
      ],
      24
    );
    cloneGroup.add(new THREE.Mesh(cloneTorso, inkMat));
    const clonePos = new THREE.Vector3(
      this.playerPos.x,
      this.getGroundHeightAt(this.playerPos.x, this.playerPos.z),
      this.playerPos.z
    );
    cloneGroup.position.copy(clonePos);
    cloneGroup.rotation.y = this.playerYaw;
    this.scene.add(cloneGroup);
    this.utsusemiClones.push({
      mesh: cloneGroup,
      pos: clonePos,
      timer: 2.5,
    });

    // Velocity-driven backstep out of danger (respects static colliders and terrain)
    const backDirX = -Math.sin(this.playerYaw);
    const backDirZ = -Math.cos(this.playerYaw);
    const prevYaw = this.playerYaw;
    this.startVelocityDodge(backDirX, backDirZ, 0.24, 3.6, 0.34);
    this.playerYaw = prevYaw; // Keep facing the decoy/enemies while stepping back

    this._v1.set(this.playerPos.x, this.playerPos.y + 1.1, this.playerPos.z);
    this.spawnBurstParticles(this._v1, 0x110d0a, 24, 8.0);
    this.audio.playSwordSlash(false);
    this.pushFloatingText('空蝉 UTSUSEMI INK DECOY!', this.playerPos, '#c084fc', true);
    this.broadcastHUD(true);
  }

  // Mode 6: WALL-VAULT / FUMIDAI ENEMY HEAD-STOMP JUMP (`Space`)
  public triggerJumpOrWallVault(nowMs: number) {
    // 1. Check for nearby enemy within 2.2m for Fumidai Head-Stomp Vault
    const nearbyEnemy = this.enemies.find(
      (e) => e.state !== 'ko' && e.pos.distanceTo(this.playerPos) <= 2.2
    );
    if (nearbyEnemy) {
      this.lastDodgeMode = 'wall_vault';
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.playerVel.y = 14.8;
      this.rollAnimDuration = 0.42;
      this.rollAnimTimer = 0.42;
      if (!nearbyEnemy.isTrainingDummy) {
        nearbyEnemy.posture = Math.min(nearbyEnemy.maxPosture, nearbyEnemy.posture + 35);
        nearbyEnemy.state = 'staggered';
        nearbyEnemy.stateTimer = 0.9;
      }
      this.pushFloatingText('踏台 FUMIDAI HEAD-STOMP VAULT!', nearbyEnemy.pos, '#fbbf24', true);
      this.audio.playFootstep();
      return;
    }

    // 2. Check for an actual physical vertical static obstacle collider within 1.6m
    const vaultObstacle = findNearbyWallVaultObstacle(
      this.getPlayerCapsule(),
      Math.sin(this.playerYaw),
      Math.cos(this.playerYaw),
      this.getAllActiveStaticColliders(),
      1.6
    );
    if (vaultObstacle) {
      this.lastDodgeMode = 'wall_vault';
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.playerVel.y = 14.4;
      // Push cleanly away from obstacle face during vault flip
      const awayX = this.playerPos.x - vaultObstacle.x;
      const awayZ = this.playerPos.z - vaultObstacle.z;
      const awayLen = Math.hypot(awayX, awayZ);
      if (awayLen > 1e-4) {
        this.playerVel.x = (awayX / awayLen) * 5.2;
        this.playerVel.z = (awayZ / awayLen) * 5.2;
      }
      this.rollAnimDuration = 0.42;
      this.rollAnimTimer = 0.42;
      this.pushFloatingText('壁跳 WALL-VAULT FLIP!', this.playerPos, '#38bdf8', false);
      this.audio.playFootstep();
      return;
    }

    if (this.isGrounded || this.coyoteTimer > 0) {
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.playerVel.y = 11.2;
      this.playerRig.bodyPivot.scale.set(0.86, 1.18, 0.86);
      this.aiBrain.recordJump(nowMs);
      this.audio.playFootstep();
    }
  }

  // Mode 7: KAGINAWA GRAPPLING HOOK (`KeyG` — True 3D Pendulum Swing & Terrain-Safe Zip Arc)
  public triggerKaginawaGrapple() {
    if (this.grappleActive) return;
    this.lastDodgeMode = 'kaginawa_grapple';
    this.dodgeActive = false;
    this.grappleActive = true;
    this.grappleDuration = 0.65;
    this.grappleTimer = this.grappleDuration;
    this.grappleStartPos.copy(this.playerPos);
    this.grappleTangentVel.set(0, 0, 0);

    // 1. Prefer a distant enemy (> 5.5m, <= 28m)
    const distantEnemy = this.enemies.find((e) => {
      if (e.state === 'ko') return false;
      const d = e.pos.distanceTo(this.playerPos);
      return d > 5.5 && d <= 28.0;
    });

    if (distantEnemy) {
      const anchorGround = this.getGroundHeightAt(distantEnemy.pos.x, distantEnemy.pos.z);
      this.grappleAnchor.set(
        distantEnemy.pos.x,
        Math.max(distantEnemy.pos.y, anchorGround) + 2.8,
        distantEnemy.pos.z
      );
    } else {
      // 2. Otherwise search tall registered static colliders (Torii pillars, trees) ahead within 24m
      const fwdX = Math.sin(this.playerYaw);
      const fwdZ = Math.cos(this.playerYaw);
      let bestCollider: StaticCollider | null = null;
      let bestScore = Infinity;
      const colliders = this.getAllActiveStaticColliders();
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.maxY - c.minY < 3.0) continue;
        const dx = c.x - this.playerPos.x;
        const dz = c.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 5.0 || dist > 26.0) continue;
        const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
        if (dot < 0.35) continue;
        const score = dist / dot;
        if (score < bestScore) {
          bestScore = score;
          bestCollider = c;
        }
      }

      if (bestCollider) {
        this.grappleAnchor.set(bestCollider.x, bestCollider.maxY + 0.4, bestCollider.z);
      } else {
        // 3. Fallback forward grapple point grounded to terrain elevation
        const ax = this.playerPos.x + fwdX * 15.0;
        const az = this.playerPos.z + fwdZ * 15.0;
        const ay = this.getGroundHeightAt(ax, az) + 6.2;
        this.grappleAnchor.set(ax, ay, az);
      }
    }

    this.grappleRopeLength = Math.max(
      4.0,
      this.playerPos.distanceTo(this.grappleAnchor)
    );
    this.grappleTheta = -0.68;
    this.grappleOmega = 2.1;
    this.isGrounded = false;
    this.playerVel.set(0, 6.5, 0);
    this.audio.playBowTwang();
    this.pushFloatingText('鉤縄 KAGINAWA GRAPPLE!', this.playerPos, '#fbbf24', true);
    this.broadcastHUD(true);
  }

  private spawnAfterimageSilhouette(pos: THREE.Vector3, yaw: number) {
    const ghostGeo = createSplineLatheGeometry(
      [
        [0.28, 0],
        [0.24, 0.85],
        [0.34, 1.48],
        [0.16, 1.88],
      ],
      18
    );
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x1c1917,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    ghostMesh.position.copy(pos);
    ghostMesh.rotation.y = yaw;
    this.scene.add(ghostMesh);
    this.slashTrails.push({ mesh: ghostMesh, life: 0.28, maxLife: 0.28 });
  }

  // ============================================================================
  // COMBAT ACTIONS: MELEE, ELEMENTAL INFUSIONS, SKELETAL DISMEMBERMENT
  // ============================================================================
  public triggerPrimaryAttack(isHeavy: boolean) {
    if (this.attackCooldown > 0) return;
    const weapon = this.getCurrentWeapon();
    const kiNeeded = Math.round(weapon.kiCost * this.stats.kiCostMultiplier * (isHeavy ? 1.45 : 1));
    if (this.ki < kiNeeded) {
      this.pushFloatingText('LOW KI', this.playerPos, '#60a5fa', false);
      return;
    }

    this.ki = Math.max(0, this.ki - kiNeeded);
    this.attackCooldown = (1 / weapon.speed) * (isHeavy ? 1.35 : 0.88);
    this.attackAnimTimer = 0.28;
    this.comboStep = (this.comboStep + 1) % 3;

    if (this.mouseWorldPoint.lengthSq() > 0.01) {
      const dx = this.mouseWorldPoint.x - this.playerPos.x;
      const dz = this.mouseWorldPoint.z - this.playerPos.z;
      if (dx * dx + dz * dz > 0.2) {
        this.playerYaw = Math.atan2(dx, dz);
      }
    }

    // Miri-Kiri Shadow-Cross Velocity-Driven Finisher Dash if ready!
    let isShadowCross = false;
    if (this.shadowCrossReady) {
      this.shadowCrossReady = false;
      isShadowCross = true;
      const target = this.enemies.find((e) => e.state !== 'ko');
      if (target) {
        const dx = target.pos.x - this.playerPos.x;
        const dz = target.pos.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1e-4) {
          this.playerYaw = Math.atan2(dx, dz);
          const desiredTravel = Math.min(8.5, Math.max(0, dist - 1.3));
          if (desiredTravel > 0.2) {
            this.lastDodgeMode = 'miri_kiri';
            this.startVelocityDodge(dx, dz, 0.16, desiredTravel, 0.24);
          }
        }
        this.pushFloatingText('影十字 SHADOW-CROSS STRIKE!', target.pos, '#38bdf8', true);
      }
    }

    const nowMs = performance.now();
    const infDef = this.getActiveInfusionDef();

    // Muramasa Cursed Blade drains 2 HP per swing for massive lethality
    if (weapon.id === 'muramasa_cursed' && !this.isDojoMode) {
      this.hp = Math.max(1, this.hp - 2);
    }

    if (weapon.category === 'ranged') {
      this.aiBrain.recordRangedOrThrowableAttack(nowMs, this.stats.attackPower);
      this.fireRangedWeaponProjectile(weapon, isHeavy);
      return;
    }

    const playerGroundY = this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);
    const heightAboveGround = this.playerPos.y - playerGroundY;
    const isPlunge = !this.isGrounded && heightAboveGround > 0.65;
    const isForwardSprintThrust =
      (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) &&
      (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight'));

    // Select exact move from the 6-Move Combat System per Weapon:
    if (isPlunge) {
      this.activeCombatMove = 'kabuto_wari'; // Move 6: Space + LMB Mid-Air Helm-Splitter
    } else if (isForwardSprintThrust) {
      this.activeCombatMove = 'tsuki_lunge'; // Move 5: W + Shift + LMB Armor-Piercing Thrust
    } else if (isHeavy) {
      this.activeCombatMove = 'iaijutsu_charged'; // Move 4: Hold LMB Charged Signature Technique
    } else if (this.comboStep === 1) {
      this.activeCombatMove = 'kesa_giri'; // Move 1: Tap LMB Strike 1 (45° Downward Cleave)
    } else if (this.comboStep === 2) {
      this.activeCombatMove = 'gyaku_kesa'; // Move 2: Combo LMB Strike 2 (Rising Reverse Guard-Break)
    } else {
      this.activeCombatMove = 'tsumuji_kaze'; // Move 3: Combo LMB Strike 3 (360° Whirlwind Finisher)
    }

    const moveDef = SIX_COMBAT_MOVES[this.activeCombatMove];
    this.activeMoveDuration = moveDef.durationSec;
    this.attackAnimTimer = moveDef.durationSec;

    const dmgMult =
      (isShadowCross ? 2.15 : moveDef.damageMultiplier) * infDef.bonusDamageMult;
    const finalBaseDmg = Math.round(this.stats.attackPower * dmgMult);
    const finalPostureDmg = Math.round(
      this.stats.postureBreakPower * (isShadowCross ? 1.85 : moveDef.postureDamageMultiplier)
    );

    this.aiBrain.recordMeleeAttack(nowMs, finalBaseDmg);
    this.audio.playSwordSlash(isHeavy || isPlunge || isShadowCross || this.activeCombatMove === 'tsumuji_kaze');
    if (isHeavy || isPlunge || this.activeCombatMove === 'tsumuji_kaze') {
      this.audio.playKiaiVocalFormant(
        this.activeCombatMove === 'iaijutsu_charged' ? 'zandatsu' : 'teyaa',
        this.playerPos,
        this.playerPos
      );
    } else if (this.comboStep === 1) {
      this.audio.playKiaiVocalFormant('ha', this.playerPos, this.playerPos);
    } else {
      this.audio.playKiaiVocalFormant('sei', this.playerPos, this.playerPos);
    }

    // Record move in Interactive Combo Dojo Trainer
    const dojoRes = this.comboDojo.recordPlayerMoveExecution(
      this.activeCombatMove,
      this.comboDojo.frameCursorNormalized,
      finalBaseDmg,
      finalPostureDmg,
      nowMs * 0.001
    );
    if (dojoRes.newlyUnlockedScroll) {
      this.pushFloatingText(`秘伝 SCROLL UNLOCKED: ${dojoRes.newlyUnlockedScroll}`, this.playerPos, '#fbbf24', true);
    }

    this.spawnInkSlashArc(weapon, isHeavy || isPlunge || isShadowCross || this.activeCombatMove === 'tsumuji_kaze');

    // Root-motion forward momentum from Cubic Hermite Spline move definition (velocity-driven, obeys wall-sliding)
    const rootImpulse = Math.min(14.5, moveDef.rootMotionForwardImpulse * 0.95);
    this.playerVel.x += Math.sin(this.playerYaw) * rootImpulse;
    this.playerVel.z += Math.cos(this.playerYaw) * rootImpulse;

    // Move 6 Kabuto-Wari Plunge triggers a radial Cannon-es physics shockwave on landing!
    if (this.activeCombatMove === 'kabuto_wari') {
      this.playerVel.y = -24.0;
      this.multiPhysics.applyRadialShockwave(this.playerPos, 5.5, 65);
    }

    // Swirl nearby Sakura petals in the 3D wind vector field from sword vortex!
    this.applySwordVortexToPetals(weapon.reach + 1.5);

    // Slice any interactive Bamboo Stalks & Destructible Cannon-es Crates using Zandatsu Planar Mesh Bisection!
    this.checkSliceableBambooHit(weapon.reach + 0.9, moveDef.cuttingPlaneNormalLocal);

    const reach =
      weapon.reach *
      (isHeavy || isPlunge || this.activeCombatMove === 'tsuki_lunge' || this.activeInfusion === 'fujin_gale'
        ? 1.38
        : 1.08);
    const halfArcRad =
      THREE.MathUtils.degToRad(
        this.activeCombatMove === 'tsumuji_kaze'
          ? 360
          : isHeavy || isPlunge || weapon.id === 'otsuchi'
            ? Math.min(360, weapon.swingArcDeg * 1.35)
            : weapon.swingArcDeg
      ) * 0.5;

    const forwardX = Math.sin(this.playerYaw);
    const forwardZ = Math.cos(this.playerYaw);

    // Cast 8 Blade Rays from Tsuba (s = 0) to Kissaki (s = 1) along the swing arc
    const prevTsuba = {
      x: this.playerPos.x - Math.cos(this.playerYaw) * 0.35,
      y: this.playerPos.y + 1.15,
      z: this.playerPos.z + Math.sin(this.playerYaw) * 0.35,
    };
    const prevKissaki = {
      x: prevTsuba.x + Math.sin(this.playerYaw - halfArcRad * 0.7) * reach,
      y: this.playerPos.y + 1.35,
      z: prevTsuba.z + Math.cos(this.playerYaw - halfArcRad * 0.7) * reach,
    };
    const currTsuba = {
      x: this.playerPos.x + Math.cos(this.playerYaw) * 0.35,
      y: this.playerPos.y + 1.05,
      z: this.playerPos.z - Math.sin(this.playerYaw) * 0.35,
    };
    const currKissaki = {
      x: currTsuba.x + Math.sin(this.playerYaw + halfArcRad * 0.7) * reach,
      y: this.playerPos.y + 0.95,
      z: currTsuba.z + Math.cos(this.playerYaw + halfArcRad * 0.7) * reach,
    };
    const eightRays = generateEightBladeRays(prevTsuba, prevKissaki, currTsuba, currKissaki);
    this.lastBladeRayHits = eightRays.length;

    let hitAny = false;
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      const dx = enemy.pos.x - this.playerPos.x;
      const dz = enemy.pos.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + 0.95) continue;

      const dirX = dx / Math.max(0.001, dist);
      const dirZ = dz / Math.max(0.001, dist);
      const dot = forwardX * dirX + forwardZ * dirZ;
      const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));
      const rayCheck = checkEightBladeRayHit(eightRays, enemy.pos, 1.05);

      if (rayCheck.hit || angle <= halfArcRad || dist < 1.35) {
        hitAny = true;
        this.applyElementalInfusionOnHit(enemy);
        this.applyDamageToEnemy(
          enemy,
          finalBaseDmg,
          finalPostureDmg,
          weapon.bleedBuildup,
          isHeavy || isPlunge || isShadowCross || this.activeCombatMove !== 'kesa_giri',
          isShadowCross
        );
      }
    }

    if (hitAny) {
      this.hitstopTimer = isHeavy || isPlunge ? 0.065 : 0.032;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + (isHeavy ? 0.38 : 0.18));
    }
  }

  private applySwordVortexToPetals(radius: number) {
    const fwdX = Math.sin(this.playerYaw);
    const fwdZ = Math.cos(this.playerYaw);
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const px = this.particlePos[i * 3];
      const pz = this.particlePos[i * 3 + 2];
      const dx = px - this.playerPos.x;
      const dz = pz - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= radius) {
        this.particleVel[i * 3] += fwdX * 7.5 - dz * 1.8;
        this.particleVel[i * 3 + 1] += 2.8;
        this.particleVel[i * 3 + 2] += fwdZ * 7.5 + dx * 1.8;
      }
    }
  }

  private applyElementalInfusionOnHit(primaryEnemy: ActiveEnemy) {
    if (this.activeInfusion === 'none') return;
    const infDef = this.getActiveInfusionDef();
    this._v1.set(primaryEnemy.pos.x, primaryEnemy.pos.y + 1.3, primaryEnemy.pos.z);
    this.spawnBurstParticles(this._v1, infDef.trailColorHex, 16, 8.0);

    if (this.activeInfusion === 'kagutsuchi_flame') {
      primaryEnemy.burnTimer = 4.5;
    } else if (this.activeInfusion === 'yuki_onna_frost') {
      primaryEnemy.slowTimer = 5.0;
    } else if (this.activeInfusion === 'yomi_blood_ink') {
      primaryEnemy.posture = Math.min(primaryEnemy.maxPosture, primaryEnemy.posture + 18);
      this.spawnGroundInkSplatter(primaryEnemy.pos);
    } else if (this.activeInfusion === 'raijin_thunder') {
      // Chain Lightning arcs up to 3 nearby enemies within 6.5m
      let chained = 0;
      for (const other of this.enemies) {
        if (other.id !== primaryEnemy.id && other.state !== 'ko' && chained < 3) {
          if (other.pos.distanceTo(primaryEnemy.pos) <= 6.5) {
            chained++;
            other.hp = Math.max(1, other.hp - 18);
            other.posture = Math.min(other.maxPosture, other.posture + 16);
            this._v2.set(other.pos.x, other.pos.y + 1.3, other.pos.z);
            this.spawnBurstParticles(this._v2, 0x38bdf8, 12, 7.0);
            this.pushFloatingText('⚡ CHAIN -18', other.pos, '#38bdf8', false);
          }
        }
      }
    }
  }

  private checkSliceableBambooHit(
    reach: number,
    planeNormal: { x: number; y: number; z: number } = { x: 0.707, y: 0.707, z: 0 }
  ) {
    // 1. Bisect Sliceable Bamboo Stalks using Real-Time Planar Mesh Slicing (sliceBufferGeometryByPlane)
    for (const bamboo of this.sliceableBamboos) {
      if (bamboo.sliced) continue;
      if (bamboo.pos.distanceTo(this.playerPos) <= reach) {
        bamboo.sliced = true;
        // Remove bamboo static collider once bisected
        const colIdx = this.stageStaticColliders.findIndex((c) => c.id === bamboo.colliderId);
        if (colIdx >= 0) {
          this.stageStaticColliders.splice(colIdx, 1);
        }

        const bisected = sliceBufferGeometryByPlane(
          bamboo.mesh.geometry,
          { x: 0, y: 1.55, z: 0 },
          planeNormal
        );
        this.lastBisectedTriCount = bisected.upperTriCount + bisected.lowerTriCount;

        // Replace lower mesh geometry with exact lower bisected half
        bamboo.mesh.geometry = bisected.lowerGeometry;

        // Spawn upper bisected half as a real Cannon-es Rigid Body with crimson/ink wound cap!
        const upperMesh = new THREE.Mesh(bisected.upperGeometry, bamboo.mesh.material);
        this.scene.add(upperMesh);
        this.multiPhysics.addRigidBodyMesh(
          upperMesh,
          new CANNON.Cylinder(0.13, 0.11, 2.2, 8),
          5.5,
          { x: bamboo.pos.x, y: bamboo.pos.y + 1.65, z: bamboo.pos.z },
          {
            x: Math.sin(this.playerYaw) * 24 + planeNormal.x * 12,
            y: 18,
            z: Math.cos(this.playerYaw) * 24,
          },
          { x: 3.2, y: 1.8, z: -2.8 },
          4.0,
          false,
          'sliced_half'
        );

        this._v1.set(bamboo.pos.x, bamboo.pos.y + 1.5, bamboo.pos.z);
        this.spawnBurstParticles(this._v1, 0x4ade80, 14, 6.0);
        this.pushFloatingText('斬奪 ZANDATSU BISECTION!', bamboo.pos, '#4ade80', false);
      }
    }

    // 2. Bisect & Shatter Destructible Cannon-es Wooden Crates within blade reach
    for (let i = this.multiPhysics.entries.length - 1; i >= 0; i--) {
      const prop = this.multiPhysics.entries[i];
      if (!prop.isDestructibleProp) continue;
      const dist = Math.hypot(
        prop.body.position.x - this.playerPos.x,
        prop.body.position.z - this.playerPos.z
      );
      if (dist <= reach + 0.5) {
        prop.isDestructibleProp = false;
        prop.life = 3.2;
        prop.body.wakeUp();
        prop.body.applyImpulse(
          new CANNON.Vec3(
            Math.sin(this.playerYaw) * 65,
            35,
            Math.cos(this.playerYaw) * 65
          )
        );
        this._v1.set(prop.body.position.x, prop.body.position.y + 0.18, prop.body.position.z);
        this.spawnBurstParticles(this._v1, 0xfbbf24, 14, 6.5);
      }
    }
  }

  private spawnEnemyDismembermentDebris(enemy: ActiveEnemy) {
    if (enemy.dismembered) return;
    enemy.dismembered = true;
    enemy.rig.weaponArm.visible = false;

    // 1. Real-Time Planar Mesh Bisection (Zandatsu) across the sword's cutting plane!
    const moveDef = SIX_COMBAT_MOVES[this.activeCombatMove];
    const sampleGeo = createSplineLatheGeometry(
      [
        [0.02, 0.0],
        [0.32, 0.25],
        [0.29, 0.75],
        [0.34, 1.25],
        [0.02, 1.4],
      ],
      20
    );
    const bisected = sliceBufferGeometryByPlane(
      sampleGeo,
      { x: 0, y: 0.72, z: 0 },
      moveDef.cuttingPlaneNormalLocal
    );
    this.lastBisectedTriCount = bisected.upperTriCount + bisected.lowerTriCount;

    const crimsonWoundMat = createSumiWashiMaterial(0x991b1b, 0.35, 0.2, this.textures);
    const upperTorsoMesh = new THREE.Mesh(bisected.upperGeometry, crimsonWoundMat);
    const lowerTorsoMesh = new THREE.Mesh(bisected.lowerGeometry, crimsonWoundMat);
    const severedArm = enemy.rig.weaponArm.clone();
    severedArm.visible = true;

    const killDir = new THREE.Vector3(
      Math.sin(this.playerYaw),
      0.35,
      Math.cos(this.playerYaw)
    ).normalize();

    // 2. Spawn Articulated Cannon-es Ragdoll & Bisected Halves with opposing physical impulses!
    this.multiPhysics.spawnArticulatedEnemyRagdoll(
      this.scene,
      enemy.pos,
      killDir,
      upperTorsoMesh,
      lowerTorsoMesh,
      severedArm
    );
  }

  private spawnDetachedArmorPlate(origin: THREE.Vector3, colorHex: number) {
    const plateGeo = createSplineLatheGeometry(
      [
        [0.18, 0],
        [0.22, 0.18],
      ],
      16,
      0,
      Math.PI * 0.8
    );
    const plateMat = createUrushiLacquerMaterial(colorHex, this.textures, false);
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(origin.x, origin.y + 1.25, origin.z);
    this.scene.add(plateMesh);
    this.debrisPieces.push({
      mesh: plateMesh,
      pos: plateMesh.position.clone(),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 4.8,
        4.5,
        (Math.random() - 0.5) * 4.8
      ),
      rotVel: new THREE.Vector3(5.5, 3.8, 4.2),
      life: 3.0,
    });
  }

  private fireRangedWeaponProjectile(weapon: WeaponDef, isCharged: boolean) {
    if (weapon.id === 'tanegashima' || weapon.id === 'hiya_zutsu' || weapon.id === 'bajozutsu') {
      this.audio.playMatchlockBoom();
      this._v1.set(this.playerPos.x, this.playerPos.y + 1.3, this.playerPos.z);
      this.spawnBurstParticles(this._v1, 0xe5e7eb, 18, 6.5);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.32);
    } else {
      this.audio.playBowTwang();
    }

    const projType =
      weapon.id === 'tanegashima' || weapon.id === 'bajozutsu'
        ? 'bullet'
        : weapon.id === 'hiya_zutsu'
          ? 'fire_aoe'
          : weapon.id === 'fukiya' || weapon.id === 'fukiya_stealth'
            ? 'dart'
            : 'arrow';
    const mesh = createProjectileMesh(projType, weapon.trailColor, this.textures);
    const spawnPos = new THREE.Vector3(
      this.playerPos.x + Math.sin(this.playerYaw) * 0.8,
      this.playerPos.y + 1.25,
      this.playerPos.z + Math.cos(this.playerYaw) * 0.8
    );
    mesh.position.copy(spawnPos);
    mesh.rotation.y = this.playerYaw;
    this.scene.add(mesh);

    const speed = weapon.projectileSpeed || 36;
    const dmg = Math.round(this.stats.attackPower * (isCharged ? 1.45 : 1.0));
    this.projectiles.push({
      mesh,
      pos: spawnPos,
      vel: new THREE.Vector3(
        Math.sin(this.playerYaw) * speed,
        0,
        Math.cos(this.playerYaw) * speed
      ),
      fromPlayer: true,
      damage: dmg,
      postureDamage: weapon.postureDamage,
      aoeRadius: projType === 'fire_aoe' ? 4.2 : 0,
      effectType: projType,
      piercing: weapon.id === 'daikyu' || weapon.id === 'tanegashima' || isCharged,
      life: 1.8,
      isCaltropGrounded: false,
    });
  }

  public triggerThrowableTool() {
    if (this.throwableCooldown > 0) return;
    if (this.throwableStock <= 0) {
      if (this.isDojoMode) {
        this.throwableStock = this.equippedThrowable.maxStock;
      } else {
        return;
      }
    }
    const tool = this.equippedThrowable;
    this.throwableStock--;
    if (this.isDojoMode && this.throwableStock === 0) {
      this.throwableStock = tool.maxStock;
    }
    this.throwableCooldown = tool.cooldown;

    if (this.mouseWorldPoint.lengthSq() > 0.01) {
      const dx = this.mouseWorldPoint.x - this.playerPos.x;
      const dz = this.mouseWorldPoint.z - this.playerPos.z;
      if (dx * dx + dz * dz > 0.2) {
        this.playerYaw = Math.atan2(dx, dz);
      }
    }

    this.aiBrain.recordRangedOrThrowableAttack(performance.now(), tool.damage * tool.countPerThrow);
    this.audio.playBowTwang();

    const count = tool.countPerThrow;
    const spreadRad = THREE.MathUtils.degToRad(tool.spreadAngleDeg);

    for (let i = 0; i < count; i++) {
      const offsetAngle = count === 1 ? 0 : (i / (count - 1) - 0.5) * spreadRad;
      const yaw = this.playerYaw + offsetAngle;
      const mesh = createProjectileMesh(tool.effectType, tool.color, this.textures);
      const spawnPos = new THREE.Vector3(
        this.playerPos.x + Math.sin(yaw) * 0.7,
        this.playerPos.y + 1.2,
        this.playerPos.z + Math.cos(yaw) * 0.7
      );
      mesh.position.copy(spawnPos);
      mesh.rotation.y = yaw;
      this.scene.add(mesh);

      this.projectiles.push({
        mesh,
        pos: spawnPos,
        vel: new THREE.Vector3(
          Math.sin(yaw) * tool.projectileSpeed,
          tool.effectType === 'caltrop_slow' ? -2.2 : 0,
          Math.cos(yaw) * tool.projectileSpeed
        ),
        fromPlayer: true,
        damage: tool.damage,
        postureDamage: tool.postureDamage,
        aoeRadius: tool.aoeRadius,
        effectType: tool.effectType,
        piercing: false,
        life: tool.effectType === 'caltrop_slow' ? 8.0 : 1.6,
        isCaltropGrounded: false,
      });
    }
  }

  public triggerDeflectParry() {
    if (this.parryCooldown > 0) return;
    this.parryWindowTimer = 0.3;
    this.parryCooldown = 0.45;
    this.audio.playSwordSlash(false);

    let deflected = false;
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      const dist = enemy.pos.distanceTo(this.playerPos);
      const enemyReach = enemy.isBoss ? enemy.bossDef!.attackRange : enemy.archetype!.attackRange;
      if (
        dist <= enemyReach + 2.2 &&
        (enemy.state === 'windup' || enemy.state === 'attack')
      ) {
        const deflectEval = evaluateSekiroDeflectAngle(
          this.playerPos,
          this.playerYaw,
          enemy.pos
        );
        this.lastDeflectAngleDeg = deflectEval.angleDeg;
        deflected = true;
        enemy.state = 'staggered';
        enemy.stateTimer = 1.25;
        enemy.posture += Math.round(
          this.stats.postureBreakPower * 1.4 * deflectEval.postureMultiplier
        );
        this.audio.playParryClash(true);
        this.hitstopTimer = 0.06; // 60ms Sekiro Hit-Stop frame freeze
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.42);
        this._v1.copy(this.playerPos).lerp(enemy.pos, 0.5);
        this._v1.y += 1.35;
        this.spawnBurstParticles(this._v1, 0xfbbf24, 24, 9.5);
        this.pushFloatingText(
          `弾き PERFECT DEFLECT! (${deflectEval.angleDeg}° · x${deflectEval.postureMultiplier})`,
          enemy.pos,
          '#fbbf24',
          true
        );

        if (enemy.posture >= enemy.maxPosture) {
          this.triggerPostureBreakDeathblow(enemy);
        }
        this.koku += 25;
      }
    }
    if (deflected) {
      const deflectDojo = this.comboDojo.recordPlayerMoveExecution(
        'mizu_nagare_deflect',
        0.65,
        0,
        this.stats.postureBreakPower,
        performance.now() * 0.001
      );
      if (deflectDojo.newlyUnlockedScroll) {
        this.pushFloatingText(`秘伝 SCROLL UNLOCKED: ${deflectDojo.newlyUnlockedScroll}`, this.playerPos, '#fbbf24', true);
      }
    }
    this.aiBrain.recordParryAttempt(deflected);
  }

  public triggerZanshinFinisherOrThrowable() {
    const target = this.enemies.find(
      (e) =>
        e.state !== 'ko' &&
        e.pos.distanceTo(this.playerPos) <= 6.0 &&
        (e.state === 'staggered' || e.posture >= e.maxPosture * 0.65 || e.hp <= e.maxHp * 0.32)
    );

    if (target) {
      const dx = target.pos.x - this.playerPos.x;
      const dz = target.pos.z - this.playerPos.z;
      this.playerYaw = Math.atan2(dx, dz);
      this.playerPos.x = target.pos.x - Math.sin(this.playerYaw) * 1.25;
      this.playerPos.z = target.pos.z - Math.cos(this.playerYaw) * 1.25;
      this.resolvePlayerStaticCollisions();
      this.playerPos.y = this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);

      this.zanshinZoomTimer = 0.65;
      this.hitstopTimer = 0.085;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
      this.hp = Math.min(this.stats.maxHp, this.hp + 35);
      this.ki = Math.min(this.stats.maxKi, this.ki + 40);
      this.koku += 120;

      this.activeCinematicFinisher = {
        kanji: '忍殺・残心',
        name: `Zanshin Deathblow — ${target.name}`,
        subtitle: '+35 Inochi · +40 Ki · +120 Koku',
      };
      this.activeCinematicFinisherTimer = 1.25;

      this.audio.playSwordSlash(true);
      this.audio.playParryClash(true);
      this.spawnInkSlashArc(this.getCurrentWeapon(), true);
      this.pushFloatingText('残心 ZANSHIN FINISHER! (+35 HP / +120 石)', target.pos, '#fbbf24', true);
      this.triggerPostureBreakDeathblow(target);
      this.broadcastHUD(true);
      return;
    }

    this.triggerThrowableTool();
  }

  public triggerMythicCombatArt(slot: number) {
    if (this.gameState !== 'playing' || this.attackCooldown > 0) return;
    const art = MYTHIC_COMBAT_ARTS.find((a) => a.slot === slot);
    if (!art) return;
    if (this.ki < art.kiCost) {
      this.pushFloatingText('LOW KI', this.playerPos, '#60a5fa', false);
      return;
    }

    this.ki = Math.max(0, this.ki - art.kiCost);
    this.activeMythicArt = art;
    this.activeMythicArtTimer = art.durationSec;
    this.attackCooldown = art.durationSec * 0.85;
    this.attackAnimTimer = art.durationSec * 0.65;
    this.activeMoveDuration = art.durationSec * 0.65;

    const fwdX = Math.sin(this.playerYaw);
    const fwdZ = Math.cos(this.playerYaw);
    if (art.id === 'ashina_cross') {
      this.startVelocityDodge(fwdX, fwdZ, 0.22, 4.2, 0.24);
    } else if (art.id === 'raijin_thunder_plunge') {
      this.isGrounded = false;
      this.playerVel.y = 10.5;
      this.playerVel.x += fwdX * 8.0;
      this.playerVel.z += fwdZ * 8.0;
      this.multiPhysics.applyRadialShockwave(this.playerPos, art.range, 72);
    } else {
      this.playerVel.x += fwdX * 9.5;
      this.playerVel.z += fwdZ * 9.5;
    }

    const baseDmg = Math.round(this.stats.attackPower * art.damageMultiplier);
    const basePosture = Math.round(this.stats.postureBreakPower * art.postureMultiplier);
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      const dist = Math.hypot(enemy.pos.x - this.playerPos.x, enemy.pos.z - this.playerPos.z);
      const vertGap = Math.abs(enemy.pos.y - this.playerPos.y);
      if (dist <= art.range + enemy.radius && vertGap <= 3.0) {
        this.applyDamageToEnemy(enemy, baseDmg, basePosture, 35, true, art.id === 'mortal_crimson_wave');
      }
    }

    this.audio.playSwordSlash(true);
    this.spawnInkSlashArc(this.getCurrentWeapon(), true);
    this._v1.set(this.playerPos.x, this.playerPos.y + 1.25, this.playerPos.z);
    this.spawnBurstParticles(this._v1, art.accentHex, 26, 9.5);
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.42);
    this.pushFloatingText(`${art.kanji} ${art.name.toUpperCase()}!`, this.playerPos, '#fbbf24', true);
    this.broadcastHUD(true);
  }

  private triggerPostureBreakDeathblow(enemy: ActiveEnemy) {
    enemy.posture = 0;
    const bonusDmg = Math.round(this.stats.attackPower * 2.2);
    this.spawnDetachedArmorPlate(
      enemy.pos,
      enemy.isBoss ? enemy.bossDef!.accentColor : enemy.archetype!.accentColor
    );
    this.pushFloatingText(`DEATHBLOW -${bonusDmg}`, enemy.pos, '#ef4444', true);
    this.applyDamageToEnemy(enemy, bonusDmg, 0, 50, true, true);
  }

  private applyDamageToEnemy(
    enemy: ActiveEnemy,
    rawDmg: number,
    postureDmg: number,
    _bleed: number,
    isHeavy: boolean,
    bypassParry: boolean
  ) {
    const aiSnap = this.aiBrain.getSnapshot(performance.now());

    if (
      !enemy.isTrainingDummy &&
      !bypassParry &&
      !isHeavy &&
      enemy.state !== 'staggered' &&
      Math.random() < aiSnap.autoParryProb * 0.45
    ) {
      this.audio.playParryClash(false);
      this._v1.set(enemy.pos.x, enemy.pos.y + 1.4, enemy.pos.z);
      this.spawnBurstParticles(this._v1, 0xfbbf24, 14, 7.0);
      this.pushFloatingText('AI DEFLECTED!', enemy.pos, '#fbbf24', false);
      enemy.state = 'windup';
      enemy.stateTimer = 0.25;
      enemy.hyperArmorActive = true;
      return;
    }

    const isCrit = Math.random() < this.stats.critChance;
    const finalDmg = Math.round(rawDmg * (isCrit ? this.stats.critMultiplier : 1.0));
    enemy.hp -= finalDmg;
    enemy.posture = Math.min(enemy.maxPosture, enemy.posture + postureDmg);
    enemy.hitFlashTimer = 0.08;

    this.comboCount++;
    this.comboTimer = 4.0;
    this.score += finalDmg * (1 + Math.floor(this.comboCount * 0.1));
    this.bestScore = Math.max(this.bestScore, this.score);

    this._v1.set(enemy.pos.x, enemy.pos.y + 1.3, enemy.pos.z);
    this.spawnBurstParticles(this._v1, 0xdc2626, isHeavy ? 20 : 10, 7.5);
    this.pushFloatingText(
      isCrit ? `CRIT -${finalDmg}` : `-${finalDmg}`,
      enemy.pos,
      isCrit ? '#fbbf24' : '#f87171',
      isCrit
    );

    if (!enemy.hyperArmorActive && !enemy.isTrainingDummy) {
      const dx = enemy.pos.x - this.playerPos.x;
      const dz = enemy.pos.z - this.playerPos.z;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      enemy.pos.x += (dx / len) * (isHeavy ? 1.15 : 0.45);
      enemy.pos.z += (dz / len) * (isHeavy ? 1.15 : 0.45);
      if (isHeavy) {
        enemy.state = 'staggered';
        enemy.stateTimer = 0.7;
      }
    }

    if (enemy.posture >= enemy.maxPosture && enemy.hp > 0) {
      enemy.posture = 0;
      enemy.state = 'staggered';
      enemy.stateTimer = 1.4;
      this.spawnDetachedArmorPlate(
        enemy.pos,
        enemy.isBoss ? enemy.bossDef!.primaryColor : enemy.archetype!.primaryColor
      );
      this.pushFloatingText('STANCE BROKEN!', enemy.pos, '#fbbf24', true);
    }

    if (enemy.hp <= 0) {
      if (enemy.isTrainingDummy) {
        enemy.hp = enemy.maxHp;
        enemy.posture = 0;
        this.audio.playHitImpact(true);
        this.spawnGroundInkSplatter(enemy.pos);
        this._v1.set(enemy.pos.x, enemy.pos.y + 1.3, enemy.pos.z);
        this.spawnBurstParticles(this._v1, 0xfbbf24, 24, 8.5);
        this.pushFloatingText(
          `DUMMY RESET · ${this.comboCount}x COMBO`,
          enemy.pos,
          '#fbbf24',
          true
        );
      } else {
        enemy.hp = 0;
        enemy.state = 'ko';
        enemy.stateTimer = 0.55;
        if (isHeavy || bypassParry) {
          this.spawnEnemyDismembermentDebris(enemy);
        }
        this.audio.playHitImpact(true);
        this.spawnGroundInkSplatter(enemy.pos);
        this._v1.set(enemy.pos.x, enemy.pos.y + 1.2, enemy.pos.z);
        this.spawnBurstParticles(this._v1, 0x110d0a, 24, 8.5);
        this.score += enemy.isBoss ? 1500 : 250;
        this.koku += enemy.isBoss ? 400 : 85;
        this.bestScore = Math.max(this.bestScore, this.score);
      }
    } else {
      this.koku += 10;
      this.audio.playHitImpact(false);
    }
  }

  private spawnInkSlashArc(weapon: WeaponDef, isHeavy: boolean) {
    const radius = weapon.reach * 0.86;
    const arcRad = THREE.MathUtils.degToRad(weapon.swingArcDeg);
    const infDef = this.getActiveInfusionDef();
    const outerColor =
      this.activeInfusion !== 'none'
        ? infDef.trailColorHex
        : isHeavy
          ? 0xdc2626
          : weapon.trailColor;

    const geo = new THREE.RingGeometry(
      radius * 0.44,
      radius * (isHeavy ? 1.24 : 1.04),
      28,
      2,
      -arcRad * 0.5,
      arcRad
    );
    const mat = new THREE.MeshBasicMaterial({
      color: outerColor,
      map: this.textures.slashBrushTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.playerPos.x, this.playerPos.y + 1.15, this.playerPos.z);
    mesh.rotation.x = -Math.PI / 2 + (this.comboStep % 2 === 0 ? 0.18 : -0.18);
    mesh.rotation.z = -this.playerYaw + Math.PI * 0.5;
    this.scene.add(mesh);
    this.slashTrails.push({ mesh, life: 0.25, maxLife: 0.25 });

    const coreGeo = new THREE.RingGeometry(
      radius * 0.56,
      radius * (isHeavy ? 0.96 : 0.82),
      24,
      1,
      -arcRad * 0.46,
      arcRad * 0.92
    );
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x110d0a,
      map: this.textures.slashBrushTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(this.playerPos.x, this.playerPos.y + 1.18, this.playerPos.z);
    coreMesh.rotation.copy(mesh.rotation);
    this.scene.add(coreMesh);
    this.slashTrails.push({ mesh: coreMesh, life: 0.22, maxLife: 0.22 });
  }

  private spawnGroundInkSplatter(pos: THREE.Vector3) {
    const geo = new THREE.PlaneGeometry(2.6, 2.6);
    geo.rotateX(-Math.PI / 2); // Local normal = +Y so we can align cleanly to terrain surface normal
    const mat = new THREE.MeshBasicMaterial({
      map: this.textures.inkSplatterTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const decal = new THREE.Mesh(geo, mat);
    const groundY = this.getGroundHeightAt(pos.x, pos.z);
    const surfaceNormal = this.getGroundNormalAt(pos.x, pos.z);

    // Orient plane to terrain surface normal and apply random spin around normal
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(this._upVec, surfaceNormal);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(
      this._upVec,
      Math.random() * Math.PI * 2
    );
    decal.quaternion.copy(alignQuat).multiply(spinQuat);
    decal.position.set(
      pos.x,
      groundY + 0.03 + (this.groundDecals.length % 20) * 0.001,
      pos.z
    );
    this.scene.add(decal);
    this.groundDecals.push(decal);
  }

  private pushFloatingText(
    text: string,
    worldPos: THREE.Vector3,
    color: string,
    isCrit: boolean
  ) {
    this._v1.copy(worldPos).add(new THREE.Vector3(0, 2.2, 0));
    this._v1.project(this.camera);
    if (this._v1.z < -1 || this._v1.z > 1) return;

    const rawX = (this._v1.x * 0.5 + 0.5) * 100;
    const rawY = (-this._v1.y * 0.5 + 0.5) * 100;
    let clampedX = Math.max(12, Math.min(88, rawX + (Math.random() - 0.5) * 4));
    const clampedY = Math.max(14, Math.min(82, rawY));
    if (clampedX > 60 && clampedY < 36) {
      clampedX = 58;
    }

    this.floatingTexts.push({
      id: this.nextFloatId++,
      text,
      x: clampedX,
      y: clampedY,
      color,
      isCrit,
      life: 0.85,
    });
    if (this.floatingTexts.length > 10) {
      this.floatingTexts.shift();
    }
  }

  // ============================================================================
  // MAIN SIMULATION & RENDER LOOP (60FPS + Software WebGL afterDraw Guard)
  // ============================================================================
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick() {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = Math.min(Math.max((now - this.lastFrameTime) / 1000, 0), 0.05);
    this.lastFrameTime = now;

    this.updateAnatomicalBlinkAndClothWind(rawDt, now * 0.001);

    if (this.customizerMode) {
      this.simStepper.reset();
      this.updateCustomizerCamera(rawDt);
      this.keysJustPressed.clear();
    } else if (this.gameState === 'title') {
      this.simStepper.reset();
      this.updateTitleCameraAndIdle(rawDt);
      this.keysJustPressed.clear();
    } else if (this.gameState === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - rawDt);
        this.keysJustPressed.clear();
      } else {
        let stepped = false;
        this.simStepper.advance(rawDt, (fixedDt, stepIdx) => {
          stepped = true;
          const simNowMs = now - Math.max(0, 1 - stepIdx) * fixedDt * 1000;
          this.updatePlayingSimulation(fixedDt, simNowMs);
          // Consume edge-triggered inputs once on the first fixed substep
          this.keysJustPressed.clear();
        });
        // If frame dt was smaller than FIXED_DT, retain keysJustPressed until next substep
        if (stepped) {
          this.keysJustPressed.clear();
        }
      }
      this.updateGameplayCamera(rawDt);
    } else {
      this.simStepper.reset();
      this.keysJustPressed.clear();
    }

    this.updateParticlesAndVFX(rawDt);
    if (this.isSoftwareGl || !this.composer) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }

    if (now - this.lastHudBroadcast > 95) {
      this.broadcastHUD(false);
    }

    this.scheduleNextFrame();
  }

  private updateAnatomicalBlinkAndClothWind(dt: number, timeSec: number) {
    // 1. Eyelid Blink Animation every 3.5 seconds
    this.blinkCycleTimer = (this.blinkCycleTimer + dt) % 3.5;
    const isBlinking = this.blinkCycleTimer > 3.34;
    const lidScaleY = isBlinking ? 1.0 : 0.14;
    if (this.playerRig.leftEyelid) {
      this.playerRig.leftEyelid.scale.y = lidScaleY;
    }
    if (this.playerRig.rightEyelid) {
      this.playerRig.rightEyelid.scale.y = lidScaleY;
    }

    // 2. Hair & 3D Verlet Integration Cloth Wind Sway (Haori Cloak + Temple Banner)
    this.playerRig.hairGroup.rotation.z = Math.sin(timeSec * 2.8) * 0.06;
    if (this.playerRig.capeMesh) {
      this.playerRig.capeMesh.rotation.x = 0.24 + Math.sin(timeSec * 3.6) * 0.09;
    }

    const windForce = {
      x: Math.sin(timeSec * 1.9) * 0.42 - 0.18,
      y: Math.cos(timeSec * 2.7) * 0.08,
      z: -0.45 + Math.cos(timeSec * 1.5) * 0.25,
    };
    if (this.haoriVerletCloth) {
      this.haoriVerletCloth.step(dt, windForce, {
        x: this.playerVel.x,
        y: this.playerVel.y,
        z: this.playerVel.z,
      });
    }
    if (this.bannerVerletCloth) {
      this.bannerVerletCloth.step(dt, windForce, { x: 0, y: 0, z: 0 });
    }
    for (const mixer of this.customAssetMixers) {
      mixer.update(dt);
    }
  }

  private updateCustomizerCamera(dt: number, immediate = false) {
    // Orbit camera in front of the Samurai's face & upper body (d = 2.05m)
    const damp = immediate ? 1.0 : 1 - Math.exp(-16.0 * dt);
    const faceWorldY = this.playerPos.y + 1.68 * (this.appearance.bodyHeight / 1.78);
    const viewAngle = this.playerYaw + this.customizerOrbitYaw;
    const dist = 2.05;
    const targetCamX = this.playerPos.x + Math.sin(viewAngle) * dist;
    const targetCamZ = this.playerPos.z + Math.cos(viewAngle) * dist;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, damp);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, faceWorldY + 0.08, damp);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, damp);

    // Offset lookAt slightly to camera-right so the Samurai is framed in the open left 65% of the screen
    const rightX = Math.cos(viewAngle) * -0.34;
    const rightZ = -Math.sin(viewAngle) * -0.34;
    this.camera.lookAt(
      this.playerPos.x + rightX,
      faceWorldY - 0.14,
      this.playerPos.z + rightZ
    );
  }

  private updateTitleCameraAndIdle(dt: number) {
    this.titleOrbitAngle += dt * 0.22;
    const groundY = this.openWorld.getGroundAndBridgeHeightAt(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = groundY;
    this.playerRig.root.position.copy(this.playerPos);

    const radius = 8.8;
    const camX = this.playerPos.x + Math.sin(this.titleOrbitAngle) * radius;
    const camZ = this.playerPos.z + Math.cos(this.titleOrbitAngle) * radius;
    const camGroundY = this.openWorld.getGroundAndBridgeHeightAt(camX, camZ);
    this.camera.position.set(camX, Math.max(camGroundY + 1.5, groundY + 3.6), camZ);
    this.camera.lookAt(this.playerPos.x - 1.4, groundY + 1.55, this.playerPos.z - 1.5);

    this.playerRig.torsoGroup.position.y = 0.75 + Math.sin(this.titleOrbitAngle * 3.2) * 0.025;
    applyMoroteDualHandWeaponIK(this.playerRig, {
      isParrying: false,
      isAttacking: false,
      activeMoveId: 1,
      swingProgress: 0,
      gaitSwing: 0,
      breathTime: this.titleOrbitAngle * 2.5,
      cameraMode: 'third_person_rpg',
    });
  }

  private updateGameplayCamera(dt: number) {
    this.zanshinZoomTimer = Math.max(0, this.zanshinZoomTimer - dt);
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.2);
    const shake = this.cameraTrauma * this.cameraTrauma * 0.45;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;

    const damp = 1 - Math.exp(-10.5 * dt);
    this.cameraFocus.x = THREE.MathUtils.lerp(this.cameraFocus.x, this.playerPos.x, damp);
    this.cameraFocus.y = THREE.MathUtils.lerp(this.cameraFocus.y, this.playerPos.y, damp);
    this.cameraFocus.z = THREE.MathUtils.lerp(this.cameraFocus.z, this.playerPos.z, damp);

    const heightScale = (this.appearance.bodyHeight || 1.78) / 1.78;
    if (this.haoriVerletCloth) {
      this.haoriVerletCloth.mesh.visible = this.cameraMode !== 'first_person_fpv';
    }

    if (this.cameraMode === 'first_person_fpv') {
      // Mode 2: 1st-Person Samurai FPV (Eye level, looking forward along yaw + mouse pitch, two hands & weapon visible in front)
      const lookYaw = this.playerYaw - this.mousePosNDC.x * 0.52;
      this.currentCamYaw = lookYaw;
      const lookPitch = THREE.MathUtils.clamp(-0.12 + this.mousePosNDC.y * 0.38, -0.65, 0.55);
      const fwdX = Math.sin(lookYaw);
      const fwdZ = Math.cos(lookYaw);
      const eyeY = this.playerPos.y + 1.56 * heightScale;

      this.camera.position.set(
        this.playerPos.x + fwdX * 0.08 + shakeX * 0.35,
        eyeY + shakeY * 0.35,
        this.playerPos.z + fwdZ * 0.08
      );
      this.camera.lookAt(
        this.playerPos.x + fwdX * 14.0,
        eyeY + Math.sin(lookPitch) * 14.0,
        this.playerPos.z + fwdZ * 14.0
      );
      return;
    }

    if (this.cameraMode === 'third_person_rpg') {
      // Mode 1 (DEFAULT): Over-the-Shoulder 3rd-Person Action-RPG View (Ghost of Tsushima / Sekiro style)
      const orbitYaw = this.playerYaw - this.mousePosNDC.x * 0.38;
      this.currentCamYaw = orbitYaw;
      const fwdX = Math.sin(orbitYaw);
      const fwdZ = Math.cos(orbitYaw);
      const rightX = Math.cos(orbitYaw);
      const rightZ = -Math.sin(orbitYaw);

      const zanshinPull = this.zanshinZoomTimer > 0 ? -1.1 : 0;
      const backDist = 3.45 + zanshinPull;
      const shoulderRight = 0.65;
      const upHeight = 1.78 * heightScale - this.mousePosNDC.y * 0.65;

      const desiredX = this.cameraFocus.x - fwdX * backDist + rightX * shoulderRight;
      const desiredZ = this.cameraFocus.z - fwdZ * backDist + rightZ * shoulderRight;
      const terrainFloorY = this.openWorld.getGroundAndBridgeHeightAt(desiredX, desiredZ);
      const desiredY = Math.max(terrainFloorY + 0.65, this.cameraFocus.y + upHeight);

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, damp) + shakeX;
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, desiredY, damp) + shakeY;
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, desiredZ, damp);

      const lookTargetX = this.cameraFocus.x + fwdX * 12.0 + rightX * 0.28;
      const lookTargetY = this.cameraFocus.y + 1.42 * heightScale + this.mousePosNDC.y * 1.65;
      const lookTargetZ = this.cameraFocus.z + fwdZ * 12.0 + rightZ * 0.28;
      this.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);
      return;
    }

    // Mode 3: Elevated 45-Degree Isometric / Tactical RPG View
    this.currentCamYaw = Math.PI;
    const zanshinOffset = this.zanshinZoomTimer > 0 ? -5.2 : 0;
    const combatZoom =
      (this.enemies.some((e) => e.pos.distanceTo(this.playerPos) < 9) ? -1.4 : 0) + zanshinOffset;
    const targetX = this.cameraFocus.x;
    const targetY = this.cameraFocus.y + 15.2 + combatZoom;
    const targetZ = this.cameraFocus.z + 14.2 + combatZoom;

    this.camera.position.set(targetX + shakeX, targetY + shakeY, targetZ);
    this.camera.lookAt(this.cameraFocus.x, this.cameraFocus.y + 1.0, this.cameraFocus.z - 1.5);
  }

  private updatePlayingSimulation(dt: number, nowMs: number) {
    this.runTimeSec += dt;
    this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    this.chronosTimer = Math.max(0, this.chronosTimer - dt);
    this.rollAnimTimer = Math.max(0, this.rollAnimTimer - dt);

    // 5 Elemental Weapon Infusions (Z, X, C, U, B) — KeyV is dedicated to 3-Mode Camera Switcher
    if (this.keysJustPressed.has('KeyZ')) this.toggleElementalInfusion('kagutsuchi_flame');
    if (this.keysJustPressed.has('KeyX')) this.toggleElementalInfusion('raijin_thunder');
    if (this.keysJustPressed.has('KeyC')) this.toggleElementalInfusion('fujin_gale');
    if (this.keysJustPressed.has('KeyU')) this.toggleElementalInfusion('yuki_onna_frost');
    if (this.keysJustPressed.has('KeyB')) this.toggleElementalInfusion('yomi_blood_ink');

    // 3D Face & Body Customizer Hotkey (`KeyK`)
    if (this.keysJustPressed.has('KeyK')) {
      this.setCustomizerMode(!this.customizerMode);
      return;
    }

    // Interactive Combo Dojo & Ghost Master Hotkey (`KeyT`)
    if (this.keysJustPressed.has('KeyT')) {
      this.toggleDojoOverlay();
    }
    if (this.keysJustPressed.has('KeyH')) {
      this.triggerJapaneseBattleCallout('kuji_in_mantra', this.playerPos);
    }

    // Weapon & Tool Hotkeys
    if (this.keysJustPressed.has('KeyQ')) {
      if (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) {
        this.triggerUtsusemiCloneDodge();
      } else {
        this.cycleWeaponSlot(-1);
      }
    }
    if (this.keysJustPressed.has('KeyE')) {
      this.cycleWeaponSlot(1);
    }
    if (this.keysJustPressed.has('Digit1')) {
      this.activeSlot = 'primary';
      this.recomputeStatsAndVisuals();
      this.audio.playSwordSlash(false);
    }
    if (this.keysJustPressed.has('Digit2')) {
      this.activeSlot = 'secondary';
      this.recomputeStatsAndVisuals();
      this.audio.playSwordSlash(false);
    }
    if (this.keysJustPressed.has('Digit3')) {
      this.activeSlot = 'ranged';
      this.recomputeStatsAndVisuals();
      this.audio.playSwordSlash(false);
    }
    if (this.keysJustPressed.has('Digit4') || this.keysJustPressed.has('Digit5')) {
      const idx = THROWABLES.findIndex((t) => t.id === this.equippedThrowable.id);
      const next = THROWABLES[(idx + 1) % THROWABLES.length];
      this.equipThrowable(next.id);
      this.audio.playSwordSlash(false);
    }
    if (this.keysJustPressed.has('KeyF')) {
      this.triggerZanshinFinisherOrThrowable();
    }
    if (this.keysJustPressed.has('KeyR')) {
      this.triggerThrowableTool();
    }
    if (this.keysJustPressed.has('AltLeft') || this.keysJustPressed.has('AltRight')) {
      this.triggerUtsusemiCloneDodge();
    }
    if (this.keysJustPressed.has('KeyG')) {
      this.triggerKaginawaGrapple();
    }

    // 8-Directional Movement Input
    let moveX = 0;
    let moveZ = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveZ -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveZ += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;
    }

    // Multi-Mode Dodge (`Shift` tap / double-tap / W+Shift Mikiri / Just-Frame Miri-Kiri)
    if (this.keysJustPressed.has('ShiftLeft') || this.keysJustPressed.has('ShiftRight')) {
      this.triggerMultiModeDodge(moveX, moveZ, nowMs);
    }

    // Jump or Wall-Vault / Fumidai Head-Stomp (`Space`)
    if (this.keysJustPressed.has('Space')) {
      this.triggerJumpOrWallVault(nowMs);
    }

    // Cooldowns & Regen
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    this.parryWindowTimer = Math.max(0, this.parryWindowTimer - dt);
    this.parryCooldown = Math.max(0, this.parryCooldown - dt);
    this.throwableCooldown = Math.max(0, this.throwableCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.comboCount = 0;

    if (this.activeMythicArtTimer > 0) {
      this.activeMythicArtTimer = Math.max(0, this.activeMythicArtTimer - dt);
      if (this.activeMythicArtTimer <= 0) {
        this.activeMythicArt = null;
      }
    }
    if (this.activeCinematicFinisherTimer > 0) {
      this.activeCinematicFinisherTimer = Math.max(0, this.activeCinematicFinisherTimer - dt);
      if (this.activeCinematicFinisherTimer <= 0) {
        this.activeCinematicFinisher = null;
      }
    }

    if (this.leftMouseDown) {
      this.leftMouseHoldTime += dt;
    }

    this.ghostHp = THREE.MathUtils.lerp(this.ghostHp, this.hp, 1 - Math.exp(-3.5 * dt));
    this.posture = Math.max(0, this.posture - 12 * dt);

    // Kaginawa Grappling Hook True 3D Pendulum Swing & Terrain-Safe Zip Arc
    if (this.grappleActive) {
      this.grappleTimer -= dt;
      const swing = stepPendulumGrapple(
        this.grappleTheta,
        this.grappleOmega,
        this.grappleRopeLength,
        dt
      );
      this.grappleTheta = swing.theta;
      this.grappleOmega = swing.omega;

      const prevX = this.playerPos.x;
      const prevY = this.playerPos.y;
      const prevZ = this.playerPos.z;

      const gx = this.grappleAnchor.x - this.playerPos.x;
      const gz = this.grappleAnchor.z - this.playerPos.z;
      const gDist = Math.hypot(gx, gz);
      const progress = THREE.MathUtils.clamp(
        1 - this.grappleTimer / Math.max(0.1, this.grappleDuration),
        0,
        1
      );

      if (gDist > 1.7 && this.grappleTimer > 0) {
        const dirX = gx / gDist;
        const dirZ = gz / gDist;
        // Lateral pendulum swing perpendicular to tether driven by ODE omega & sin(theta)
        const perpX = -dirZ;
        const perpZ = dirX;
        const swingLateralSpeed = Math.sin(this.grappleTheta) * this.grappleOmega * 1.45;
        const zipSpeed = 22.0 + Math.abs(this.grappleOmega) * 2.2;

        this.playerPos.x += (dirX * zipSpeed + perpX * swingLateralSpeed) * dt;
        this.playerPos.z += (dirZ * zipSpeed + perpZ * swingLateralSpeed) * dt;

        // Smooth 3D elevation curve interpolating from launch height toward anchor + pendulum sag,
        // strictly clearing getGroundHeightAt(x, z) + 0.5m along the entire trajectory!
        const groundUnderPlayer = this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);
        const linearY = THREE.MathUtils.lerp(
          this.grappleStartPos.y,
          this.grappleAnchor.y - 0.8,
          progress
        );
        const pendulumArcBoost =
          Math.sin(progress * Math.PI) * 2.4 + (1 - Math.cos(this.grappleTheta)) * 0.9;
        this.playerPos.y = Math.max(groundUnderPlayer + 0.5, linearY + pendulumArcBoost);
        this.playerYaw = Math.atan2(dirX, dirZ);

        // Keep grapple path collision-safe against static obstacles
        this.resolvePlayerStaticCollisions();

        // Track real tangential/forward velocity for smooth momentum transfer upon release
        if (dt > 1e-4) {
          this.grappleTangentVel.set(
            (this.playerPos.x - prevX) / dt,
            (this.playerPos.y - prevY) / dt,
            (this.playerPos.z - prevZ) / dt
          );
        }

        if (this.grappleLineMesh) {
          this.grappleLineMesh.visible = true;
          this.grappleLineMesh.geometry.setFromPoints([
            new THREE.Vector3(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z),
            this.grappleAnchor,
          ]);
        }
      } else {
        this.grappleActive = false;
        if (this.grappleLineMesh) this.grappleLineMesh.visible = false;
        // Transfer tangential/forward momentum cleanly into playerVel upon tether release
        this.playerVel.set(
          THREE.MathUtils.clamp(this.grappleTangentVel.x * 0.55, -14, 14),
          THREE.MathUtils.clamp(Math.max(4.2, this.grappleTangentVel.y * 0.45), 4.2, 11.5),
          THREE.MathUtils.clamp(this.grappleTangentVel.z * 0.55, -14, 14)
        );
        this.isGrounded = false;
      }
    }

    // Velocity-Driven Timed Dodge Stepping (Ease-out curve with wall-sliding collision)
    if (this.dodgeActive && !this.grappleActive) {
      const progress = THREE.MathUtils.clamp(
        1 - this.dodgeTimer / Math.max(0.05, this.dodgeDuration),
        0,
        1
      );
      const speed = this.dodgePeakSpeed * (1.0 - progress);
      this.playerPos.x += this.dodgeDirX * speed * dt;
      this.playerPos.z += this.dodgeDirZ * speed * dt;
      this.playerVel.x = this.dodgeDirX * speed;
      this.playerVel.z = this.dodgeDirZ * speed;
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
      if (this.dodgeTimer <= 0) {
        this.dodgeActive = false;
        this.playerVel.x *= 0.25;
        this.playerVel.z *= 0.25;
      }
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    const isSprinting =
      isMoving &&
      !this.dodgeActive &&
      (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) &&
      this.ki > 5;

    if (isSprinting) {
      this.ki = Math.max(0, this.ki - 22 * this.stats.kiCostMultiplier * dt);
    } else {
      this.ki = Math.min(this.stats.maxKi, this.ki + this.stats.kiRegenPerSec * dt);
    }

    if (isMoving && !this.grappleActive && !this.dodgeActive) {
      if (Math.random() < 0.08) {
        const bias =
          moveX < -0.4 ? 'left' : moveX > 0.4 ? 'right' : moveZ > 0.4 ? 'back' : 'forward';
        this.aiBrain.recordDodgeOrMoveBias(bias);
      }

      const speed = this.stats.moveSpeed * (isSprinting ? 1.42 : 1.0);
      this.playerPos.x += moveX * speed * dt;
      this.playerPos.z += moveZ * speed * dt;

      // Sacred Torii Spirit Portal Warp (Running through the Torii Gate at z = -18 warps to next Biome!)
      if (
        !this.isDojoMode &&
        this.portalCooldown <= 0 &&
        Math.abs(this.playerPos.x) < 2.9 &&
        Math.abs(this.playerPos.z - -18) < 1.5
      ) {
        const nextStage = (this.stageIndex + 1) % CAMPAIGN_STAGES.length;
        this.loadStage(nextStage);
        this.pushFloatingText(
          `鳥居 SPIRIT PORTAL WARP → ${CAMPAIGN_STAGES[nextStage].name.toUpperCase()}`,
          this.playerPos,
          '#fbbf24',
          true
        );
        return;
      }

      // Seamless Infinite Open-World CDLOD & Floating Origin Streaming (No Arena Walls!)
      if (this.attackAnimTimer <= 0) {
        this.playerYaw = Math.atan2(moveX, moveZ);
      }

      const prevSteps = Math.floor(this.walkDistance * 1.4);
      this.walkDistance += speed * dt;
      if (Math.floor(this.walkDistance * 1.4) > prevSteps && this.isGrounded) {
        this.audio.playFootstep();
      }
    }

    // Apply residual horizontal momentum (airborne vaults/grapple release or grounded attack root-motion)
    if (!this.grappleActive && !this.dodgeActive) {
      if (Math.abs(this.playerVel.x) > 1e-3 || Math.abs(this.playerVel.z) > 1e-3) {
        this.playerPos.x += this.playerVel.x * dt;
        this.playerPos.z += this.playerVel.z * dt;
        const dragRate = this.isGrounded ? 13.5 : 3.2;
        const drag = Math.exp(-dragRate * dt);
        this.playerVel.x *= drag;
        this.playerVel.z *= drag;
        if (Math.hypot(this.playerVel.x, this.playerVel.z) < 0.05) {
          this.playerVel.x = 0;
          this.playerVel.z = 0;
        }
      }
    }

    // Sanitize Player Position & Velocity against NaN/Infinity
    const safeVel = sanitizePhysicsVec3(this.playerVel, 60, { x: 0, y: 0, z: 0 });
    if (safeVel.wasSanitized) {
      this.playerVel.set(safeVel.x, safeVel.y, safeVel.z);
    }
    const safePos = sanitizePhysicsVec3(this.playerPos, 50000, { x: 0, y: 0, z: 12 });
    if (safePos.wasSanitized) {
      this.playerPos.set(
        safePos.x,
        this.getGroundHeightAt(safePos.x, safePos.z),
        safePos.z
      );
    }

    // Update Infinite Open-World 5x5 CDLOD Chunks, Rivers, Caves, Props & Dynamic Enemy Spawning
    this.lastOpenWorldTelemetry = this.openWorld.updateStreamedWorld(
      this.playerPos,
      nowMs * 0.001,
      this.textures.washiNormal,
      this.textures.washiBump,
      (shiftDelta) => {
        this.cameraFocus.sub(shiftDelta);
        this.envGroup.position.sub(shiftDelta);
        this.grappleAnchor.sub(shiftDelta);
        this.grappleStartPos.sub(shiftDelta);
        for (const col of this.stageStaticColliders) {
          col.x -= shiftDelta.x;
          col.z -= shiftDelta.z;
        }
        for (const g of this.grassBaseCoords) {
          g.x -= shiftDelta.x;
          g.z -= shiftDelta.z;
        }
        for (const b of this.sliceableBamboos) {
          b.pos.sub(shiftDelta);
        }
        for (const e of this.enemies) {
          e.pos.sub(shiftDelta);
          e.rig.root.position.copy(e.pos);
        }
        for (const p of this.projectiles) {
          p.pos.sub(shiftDelta);
          p.mesh.position.copy(p.pos);
        }
        for (const d of this.debrisPieces) {
          d.pos.sub(shiftDelta);
          d.mesh.position.copy(d.pos);
        }
        for (const c of this.utsusemiClones) {
          c.pos.sub(shiftDelta);
          c.mesh.position.copy(c.pos);
        }
        for (const dec of this.groundDecals) {
          dec.position.sub(shiftDelta);
        }
        this.multiPhysics.shiftAllBodies(shiftDelta);
        this.pushFloatingText('FLOATING ORIGIN RE-CENTERED (0.0m JITTER)', this.playerPos, '#38bdf8', false);
      },
      (cx, cz, wx, wz, biome) => {
        this.spawnOpenWorldChunkEntities(cx, cz, wx, wz, biome);
      }
    );

    // Update Enemies & Bosses (Chronos Time-Dilation scales enemy dt to 15%!)
    const enemyDt = this.chronosTimer > 0 ? dt * 0.15 : dt;
    this.updateEnemiesAI(enemyDt, nowMs);

    // Resolve 3D Capsule-vs-Capsule Actor Separation & Static Obstacle Wall-Sliding Collisions
    this.resolveAllActorAndStaticCollisions();

    // Vertical Gravity, Terrain Grounding & Jump Physics (after final horizontal collision resolution)
    const terrainGroundY = this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);
    if (!this.isGrounded && !this.grappleActive) {
      this.playerPos.y += this.playerVel.y * dt;
      this.playerVel.y -= 28.0 * dt;
      if (this.playerPos.y <= terrainGroundY) {
        this.playerPos.y = terrainGroundY;
        this.playerVel.y = 0;
        this.playerVel.x *= 0.35;
        this.playerVel.z *= 0.35;
        this.isGrounded = true;
        this.playerRig.bodyPivot.scale.set(1.2, 0.8, 1.2);
        this.audio.playFootstep();
      }
    } else if (this.isGrounded && !this.grappleActive) {
      this.playerPos.y = terrainGroundY;
      this.coyoteTimer = 0.1;
    }

    // Step Interactive Combo Dojo & Holographic Ghost Master (grounded on terrain)
    const attackNormT =
      this.attackAnimTimer > 0
        ? 1 - this.attackAnimTimer / Math.max(0.05, this.activeMoveDuration)
        : null;
    this.lastDojoSnapshot = this.comboDojo.stepGhostMasterAndTelemetry(
      dt,
      this.playerPos,
      this.playerYaw,
      attackNormT,
      nowMs * 0.001,
      (x, z) => this.getGroundHeightAt(x, z)
    );

    if (this.dialogueTimer > 0) {
      this.dialogueTimer = Math.max(0, this.dialogueTimer - dt);
      if (this.dialogueTimer <= 0) {
        this.activeDialogueSubtitle = null;
      }
    }

    const scaleDamp = 1 - Math.exp(-12 * dt);
    this.playerRig.bodyPivot.scale.x = THREE.MathUtils.lerp(
      this.playerRig.bodyPivot.scale.x,
      1,
      scaleDamp
    );
    this.playerRig.bodyPivot.scale.y = THREE.MathUtils.lerp(
      this.playerRig.bodyPivot.scale.y,
      1,
      scaleDamp
    );
    this.playerRig.bodyPivot.scale.z = THREE.MathUtils.lerp(
      this.playerRig.bodyPivot.scale.z,
      1,
      scaleDamp
    );

    // Ukemi 360° Acrobatic Roll Pitch Rotation
    if (this.rollAnimTimer > 0) {
      this.playerRig.bodyPivot.rotation.x =
        (1 - this.rollAnimTimer / Math.max(0.1, this.rollAnimDuration)) * Math.PI * 2;
    } else {
      this.playerRig.bodyPivot.rotation.x = 0;
    }

    // Update Player Articulated Rig with 6-Move Cubic Hermite Spline & Two-Handed Morote IK
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    const gaitSwing = isMoving && !this.dodgeActive ? Math.sin(this.walkDistance * 2.8) * 0.55 : 0;

    // Analytical Two-Bone IK (Law of Cosines) for Leg Terrain Grounding
    const leftFootIK = solveTwoBoneIK(
      { x: -0.18, y: 0.78, z: 0 },
      { x: -0.18, y: Math.max(0, Math.sin(this.walkDistance * 2.8) * 0.12), z: gaitSwing * 0.28 },
      { x: 0, y: 0, z: 1 },
      0.42,
      0.4
    );
    this.playerRig.leftLeg.rotation.x = gaitSwing - leftFootIK.lowerBoneBendRad * 0.12;
    this.playerRig.rightLeg.rotation.x = -gaitSwing + leftFootIK.lowerBoneBendRad * 0.12;

    const moveDef = SIX_COMBAT_MOVES[this.activeCombatMove];
    const normalizedSwingT =
      this.attackAnimTimer > 0
        ? 1 - this.attackAnimTimer / Math.max(0.05, this.activeMoveDuration)
        : 0;

    applyMoroteDualHandWeaponIK(this.playerRig, {
      isParrying: this.parryWindowTimer > 0,
      isAttacking: this.attackAnimTimer > 0,
      activeMoveId: moveDef ? moveDef.moveNumber : 1,
      swingProgress: normalizedSwingT,
      gaitSwing,
      breathTime: this.runTimeSec,
      cameraMode: this.cameraMode,
    });

    // Step 60Hz Cannon-es Rigid-Body & Ragdoll Physics World with True Terrain Height Contacts
    this.multiPhysics.step(dt, this.scene, (x, z) => this.getGroundHeightAt(x, z));

    // Update Interactive Grass Bending
    this.updateInteractiveGrass(nowMs * 0.001);

    // Update Utsusemi Ink Decoy Clones (Taunt for 2.5s then explode in 4.5m AoE)
    this.updateUtsusemiDecoys(dt);

    // Update Projectiles & Throwables
    this.updateProjectiles(enemyDt);

    // Check Wave / Boss Progression (Skip in Dojo Training Mode)
    if (!this.isDojoMode) {
      const aliveCount = this.enemies.filter((e) => e.state !== 'ko').length;
      if (aliveCount === 0 && !this.bossSpawnedInStage) {
        this.spawnStageBoss();
      } else if (aliveCount === 0 && this.bossSpawnedInStage && this.enemies.length === 0) {
        if (this.stageIndex < CAMPAIGN_STAGES.length - 1) {
          this.stageIndex++;
          this.highestUnlockedStage = Math.max(this.highestUnlockedStage, this.stageIndex);
          this.loadStage(this.stageIndex);
        } else {
          this.gameState = 'victory';
          document.body.dataset.state = 'gameover';
          this.broadcastHUD(true);
        }
      }
    }
  }

  private updateUtsusemiDecoys(dt: number) {
    for (let i = this.utsusemiClones.length - 1; i >= 0; i--) {
      const clone = this.utsusemiClones[i];
      clone.timer -= dt;
      clone.mesh.rotation.y += dt * 1.8;
      if (clone.timer <= 0) {
        // Explode in a 4.5m ring of razor ink spikes!
        this.audio.playHitImpact(true);
        this._v1.set(clone.pos.x, clone.pos.y + 1.1, clone.pos.z);
        this.spawnBurstParticles(this._v1, 0x110d0a, 28, 9.5);
        this.spawnGroundInkSplatter(clone.pos);
        for (const enemy of this.enemies) {
          if (enemy.state !== 'ko' && enemy.pos.distanceTo(clone.pos) <= 4.5) {
            this.applyDamageToEnemy(enemy, 42, 32, 25, true, true);
          }
        }
        this.scene.remove(clone.mesh);
        this.utsusemiClones.splice(i, 1);
      }
    }
  }

  private updateEnemiesAI(dt: number, nowMs: number) {
    const aiSnap = this.aiBrain.getSnapshot(nowMs);
    let activeAttackers = this.enemies.filter(
      (e) => e.state === 'windup' || e.state === 'attack'
    ).length;

    const activeDecoy = this.utsusemiClones[0];

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.stateTimer -= dt;
      enemy.specialCooldown = Math.max(0, enemy.specialCooldown - dt);

      // Poison DoT & Kagutsuchi Flame Burn DoT
      if (enemy.poisonTimer > 0) {
        enemy.poisonTimer -= dt;
        enemy.hp -= 12 * dt;
        if (enemy.hp <= 0 && enemy.state !== 'ko') {
          this.applyDamageToEnemy(enemy, 5, 0, 0, false, true);
        }
      }
      if (enemy.burnTimer > 0) {
        enemy.burnTimer -= dt;
        enemy.hp -= 16 * dt;
        if (Math.random() < 0.25) {
          this._v1.set(enemy.pos.x, enemy.pos.y + 1.3, enemy.pos.z);
          this.spawnBurstParticles(this._v1, 0xf97316, 1, 2.5);
        }
        if (enemy.hp <= 0 && enemy.state !== 'ko') {
          this.applyDamageToEnemy(enemy, 8, 0, 0, false, true);
        }
      }

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
      }

      if (enemy.state === 'ko') {
        enemy.rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(
          enemy.rig.bodyPivot.rotation.x,
          -Math.PI * 0.48,
          1 - Math.exp(-10 * dt)
        );
        if (enemy.stateTimer <= 0) {
          this.scene.remove(enemy.rig.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Target Utsusemi Ink Decoy if active, otherwise Player
      const targetPos = activeDecoy ? activeDecoy.pos : this.playerPos;
      const dx = targetPos.x - enemy.pos.x;
      const dz = targetPos.z - enemy.pos.z;
      const dist = Math.hypot(dx, dz);
      const yawToPlayer = Math.atan2(dx, dz);
      enemy.rig.root.rotation.y = yawToPlayer;

      if (enemy.isTrainingDummy) {
        const dummyGroundY = this.getGroundHeightAt(0, 8.2);
        enemy.pos.set(0, dummyGroundY, 8.2);
        if (enemy.state === 'staggered') {
          (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
          enemy.rig.weaponArm.rotation.x = 0.45;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'approach';
            enemy.stateTimer = 0.85;
          }
        } else if (enemy.state === 'approach') {
          (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
          enemy.rig.weaponArm.rotation.x = 0;
          if (dist <= 6.2 && enemy.stateTimer <= 0) {
            enemy.state = 'windup';
            enemy.windupDuration = 0.65;
            enemy.stateTimer = 0.65;
            const ringMat = enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial;
            ringMat.color.setHex(0xf59e0b);
            this.pushFloatingText('PARRY TIMING [Right-Click]', enemy.pos, '#fbbf24', false);
          }
        } else if (enemy.state === 'windup') {
          const progress = 1 - Math.max(0, enemy.stateTimer / enemy.windupDuration);
          const ringMat = enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial;
          ringMat.opacity = 0.45 + progress * 0.5;
          const pulseScale = 0.92 + progress * 0.25;
          enemy.rig.telegraphRing.scale.set(pulseScale, pulseScale, 1);
          enemy.rig.weaponArm.rotation.x = -Math.PI * 0.78 * progress;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'attack';
            enemy.stateTimer = 0.22;
            this.executeEnemyAttack(enemy, aiSnap);
          }
        } else if (enemy.state === 'attack') {
          (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
          enemy.rig.weaponArm.rotation.x = Math.PI * 0.35;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'recover';
            enemy.stateTimer = 1.25;
          }
        } else if (enemy.state === 'recover') {
          enemy.rig.weaponArm.rotation.x = 0;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'approach';
            enemy.stateTimer = 0.45;
          }
        }
        enemy.rig.root.position.copy(enemy.pos);
        continue;
      }

      const baseSpeed =
        (enemy.isBoss ? enemy.bossDef!.speed : enemy.archetype!.speed) *
        (enemy.slowTimer > 0 ? 0.35 : 1.0);
      const atkRange = enemy.isBoss
        ? enemy.bossDef!.attackRange
        : enemy.archetype!.attackRange;

      if (
        enemy.isBoss &&
        enemy.bossDef?.specialMechanic === 'paper_clones' &&
        enemy.specialCooldown <= 0 &&
        this.enemies.length < 5
      ) {
        enemy.specialCooldown = 9.5;
        const cloneArch = ENEMY_ARCHETYPES.paper_clone;
        const rig = createEnemyMeshRig(cloneArch, false, this.textures, WEAPONS[4]);
        const cx = enemy.pos.x + (Math.random() - 0.5) * 5;
        const cz = enemy.pos.z + (Math.random() - 0.5) * 5;
        const cy = this.getGroundHeightAt(cx, cz);
        rig.root.position.set(cx, cy, cz);
        this.scene.add(rig.root);
        this.enemies.push({
          id: this.nextEnemyId++,
          name: cloneArch.name,
          isBoss: false,
          archetype: cloneArch,
          rig,
          pos: new THREE.Vector3(cx, cy, cz),
          vel: new THREE.Vector3(),
          radius: 0.44 * cloneArch.scale,
          height: 1.85 * cloneArch.scale,
          hp: cloneArch.hp,
          maxHp: cloneArch.hp,
          posture: 0,
          maxPosture: cloneArch.posture,
          state: 'approach',
          stateTimer: 0.3,
          windupDuration: cloneArch.windupSec,
          hyperArmorActive: false,
          poisonTimer: 0,
          slowTimer: 0,
          burnTimer: 0,
          strafeSign: 1,
          specialCooldown: 5,
          hitFlashTimer: 0,
        });
        this.pushFloatingText('ORIGAMI ILLUSION!', enemy.pos, '#f472b6', true);
      }

      if (enemy.state === 'staggered') {
        (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
        enemy.rig.weaponArm.rotation.x = 0.4;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'approach';
          enemy.stateTimer = 0.3;
        }
      } else if (enemy.state === 'approach' || enemy.state === 'zigzag_dash') {
        (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
        const policy = enemy.isBoss ? 'shield_counter' : enemy.archetype!.policy;

        const useZigZag = enemy.state === 'zigzag_dash' || aiSnap.zigZagSprintProb > 0.5;
        const zigOffset = useZigZag ? Math.sin(nowMs * 0.008 + enemy.id) * 0.85 : 0;

        let moveYaw = yawToPlayer + zigOffset;
        let speedMult = useZigZag ? 1.22 : 1.0;

        if (policy === 'kiter_ranged') {
          if (dist < 8.5) {
            moveYaw = yawToPlayer + Math.PI;
          } else if (dist < atkRange * 0.85) {
            moveYaw = yawToPlayer + Math.PI * 0.5 * enemy.strafeSign;
            speedMult = 0.65;
          }
        } else if (policy === 'flank_orbiter' && dist < 6.5) {
          moveYaw = yawToPlayer + Math.PI * 0.35 * enemy.strafeSign;
          speedMult = 1.15;
        }

        if (dist > (policy === 'kiter_ranged' ? 6.0 : atkRange * 0.82)) {
          enemy.pos.x += Math.sin(moveYaw) * baseSpeed * speedMult * dt;
          enemy.pos.z += Math.cos(moveYaw) * baseSpeed * speedMult * dt;
        }

        if (dist <= atkRange && activeAttackers < 3 && enemy.stateTimer <= 0) {
          activeAttackers++;
          enemy.state = 'windup';
          const isFeint = Math.random() < aiSnap.feintDelayProb;
          const feintScale = isFeint ? 1.38 : 1.0;
          enemy.windupDuration =
            (enemy.isBoss ? 0.52 : enemy.archetype!.windupSec) * feintScale;
          enemy.stateTimer = enemy.windupDuration;
          enemy.hyperArmorActive = Math.random() < aiSnap.hyperArmorProb;

          const ringMat = enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial;
          ringMat.color.setHex(
            enemy.hyperArmorActive
              ? 0xf59e0b
              : isFeint
                ? 0xec4899
                : aiSnap.telegraphColorHex
          );

          if (enemy.isBoss || enemy.hyperArmorActive || isFeint) {
            this.pushFloatingText(
              enemy.hyperArmorActive
                ? '危 HYPER-ARMOR STRIKE'
                : isFeint
                  ? '危 DELAYED FEINT'
                  : aiSnap.activeCounterCallout,
              enemy.pos,
              enemy.hyperArmorActive ? '#fbbf24' : '#f472b6',
              enemy.isBoss
            );
          }
        }
      } else if (enemy.state === 'windup') {
        const progress = 1 - Math.max(0, enemy.stateTimer / enemy.windupDuration);
        const ringMat = enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.4 + progress * 0.55;
        const pulseScale = 0.92 + progress * 0.24;
        enemy.rig.telegraphRing.scale.set(pulseScale, pulseScale, 1);
        enemy.rig.weaponArm.rotation.x = -Math.PI * 0.78 * progress;

        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          enemy.stateTimer = 0.22;
          this.executeEnemyAttack(enemy, aiSnap);
        }
      } else if (enemy.state === 'attack') {
        (enemy.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
        enemy.rig.weaponArm.rotation.x = Math.PI * 0.35;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'recover';
          enemy.stateTimer = 0.55;
          enemy.hyperArmorActive = false;
        }
      } else if (enemy.state === 'recover') {
        enemy.rig.weaponArm.rotation.x = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'approach';
          enemy.stateTimer = 0.25;
        }
      }

      enemy.pos.y = this.openWorld.getGroundAndBridgeHeightAt(enemy.pos.x, enemy.pos.z);
      enemy.rig.root.position.copy(enemy.pos);
    }
  }

  private executeEnemyAttack(enemy: ActiveEnemy, aiSnap: AIAdaptationSnapshot) {
    const rawDmg = enemy.isBoss ? enemy.bossDef!.damage : enemy.archetype!.damage;
    const rawPosture = enemy.isBoss
      ? enemy.bossDef!.postureDamage
      : enemy.archetype!.postureDamage;
    const atkRange = enemy.isBoss
      ? enemy.bossDef!.attackRange
      : enemy.archetype!.attackRange;

    let predX = this.playerPos.x;
    let predZ = this.playerPos.z;
    if (Math.random() < aiSnap.dodgePredictProb) {
      if (aiSnap.preferredDodgeVector === 'left') predX -= 0.75;
      else if (aiSnap.preferredDodgeVector === 'right') predX += 0.75;
      else if (aiSnap.preferredDodgeVector === 'back') predZ += 0.75;
      else if (aiSnap.preferredDodgeVector === 'forward') predZ -= 0.75;
    }

    const dx = predX - enemy.pos.x;
    const dz = predZ - enemy.pos.z;
    const dist = Math.hypot(this.playerPos.x - enemy.pos.x, this.playerPos.z - enemy.pos.z);
    const yaw = Math.atan2(dx, dz);

    if (!enemy.isBoss && enemy.archetype!.policy === 'kiter_ranged') {
      const isRifle = enemy.archetype!.weaponType === 'tanegashima';
      if (isRifle) {
        this.audio.playMatchlockBoom();
      } else {
        this.audio.playBowTwang();
      }
      const mesh = createProjectileMesh(
        isRifle ? 'bullet' : 'arrow',
        0xef4444,
        this.textures
      );
      const spawnPos = new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1.25, enemy.pos.z);
      mesh.position.copy(spawnPos);
      mesh.rotation.y = yaw;
      this.scene.add(mesh);

      const spd = isRifle ? 32 : 22;
      const flightTime = Math.max(0.15, dist / spd);
      const dyToPlayerChest = this.playerPos.y + 1.15 - spawnPos.y;
      const aimVelY = THREE.MathUtils.clamp(
        dyToPlayerChest / flightTime + (isRifle ? 0.25 : 1.4) * flightTime,
        -12,
        14
      );
      this.projectiles.push({
        mesh,
        pos: spawnPos,
        vel: new THREE.Vector3(Math.sin(yaw) * spd, aimVelY, Math.cos(yaw) * spd),
        fromPlayer: false,
        damage: rawDmg,
        postureDamage: rawPosture,
        aoeRadius: 0,
        effectType: isRifle ? 'bullet' : 'arrow',
        piercing: false,
        life: 2.2,
        isCaltropGrounded: false,
      });
      return;
    }

    this.audio.playSwordSlash(enemy.isBoss);
    if (!enemy.isTrainingDummy) {
      enemy.pos.x += Math.sin(yaw) * 0.48;
      enemy.pos.z += Math.cos(yaw) * 0.48;
    }

    const playerGroundY = this.getGroundHeightAt(this.playerPos.x, this.playerPos.z);
    const heightAboveGround = this.playerPos.y - playerGroundY;
    const isJumping = heightAboveGround >= 1.2;
    const caughtInAir = isJumping && Math.random() < aiSnap.antiAirSlashProb;
    if (caughtInAir) {
      this.pushFloatingText('燕返 ANTI-AIR SLASH!', enemy.pos, '#c084fc', true);
    }
    const canHitAir = !isJumping || caughtInAir;
    const verticalGap = Math.abs(this.playerPos.y - enemy.pos.y);
    if (dist <= atkRange + 1.05 && verticalGap <= 2.4 && canHitAir) {
      this.damagePlayer(rawDmg, rawPosture, enemy);
    }
  }

  private damagePlayer(rawDmg: number, rawPosture: number, attacker?: ActiveEnemy) {
    if (this.invulnTimer > 0 || this.gameState !== 'playing') return;

    if (this.parryWindowTimer > 0) {
      this.audio.playParryClash(true);
      this.hitstopTimer = 0.065;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
      this._v1.set(this.playerPos.x, this.playerPos.y + 1.3, this.playerPos.z);
      this.spawnBurstParticles(this._v1, 0xfbbf24, 22, 9.0);
      this.pushFloatingText('DEFLECTED!', this.playerPos, '#fbbf24', true);
      this.aiBrain.recordParryAttempt(true);
      if (attacker) {
        attacker.posture += this.stats.postureBreakPower * 1.4;
        attacker.state = 'staggered';
        attacker.stateTimer = 1.1;
      }
      return;
    }

    if (this.isDojoMode) {
      this.invulnTimer = 0.35;
      this.aiBrain.recordParryAttempt(false);
      this._v1.set(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
      this.spawnBurstParticles(this._v1, 0xf59e0b, 10, 5.0);
      this.pushFloatingText('MISSED PARRY (0 DMG · DOJO)', this.playerPos, '#f59e0b', false);
      this.audio.playHitImpact(false);
      return;
    }

    const mitigated = Math.max(
      2,
      Math.round(rawDmg * (1 - this.stats.defensePercent / 100))
    );
    this.hp = Math.max(0, this.hp - mitigated);
    this.damageTakenRun += mitigated;
    this.posture = Math.min(this.stats.maxPosture, this.posture + rawPosture);
    this.invulnTimer = 0.38;
    this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.48);
    this.hitstopTimer = 0.045;

    // Destructible Armor Physics: Heavy hits reduce armor integrity and detach a 3D Sode plate
    this.armorIntegrity = Math.max(0, this.armorIntegrity - 12);
    if (this.armorIntegrity % 24 === 0) {
      this.spawnDetachedArmorPlate(this.playerPos, this.equippedArmor.primaryColor);
    }

    this._v1.set(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
    this.spawnBurstParticles(this._v1, 0xdc2626, 16, 7.0);
    this.pushFloatingText(`-${mitigated}`, this.playerPos, '#ef4444', false);
    this.audio.playHitImpact(false);

    if (this.hp <= 0) {
      this.hp = 0;
      this.gameState = 'gameover';
      document.body.dataset.state = 'gameover';
      this.broadcastHUD(true);
    }
  }

  private updateProjectiles(dt: number) {
    const aiSnap = this.aiBrain.getSnapshot(performance.now());
    const playerHeight = this.appearance.bodyHeight || 1.78;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!p.isCaltropGrounded) {
        // Apply True Ballistic Parabolic Trajectory + Quadratic Aerodynamic Drag:
        // F_drag = -0.5 * rho * ||v|| * v * C_d * A
        const drag = computeAerodynamicDragForce(p.vel, 1.225, 0.35, 0.008);
        p.vel.x += drag.fx * dt;
        p.vel.y += (drag.fy - (p.effectType === 'bullet' ? 0.8 : 4.2)) * dt;
        p.vel.z += drag.fz * dt;

        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.pos.z += p.vel.z * dt;
        if (p.effectType === 'bleed_fan') {
          p.mesh.rotation.y += 18 * dt;
        }
        const projGroundY = this.getGroundHeightAt(p.pos.x, p.pos.z);
        if (p.effectType === 'caltrop_slow' && p.pos.y <= projGroundY + 0.12) {
          p.pos.y = projGroundY + 0.12;
          p.vel.set(0, 0, 0);
          p.isCaltropGrounded = true;
        } else if (p.effectType !== 'caltrop_slow' && p.pos.y <= projGroundY) {
          if (p.effectType === 'fire_aoe') {
            this.audio.playMatchlockBoom();
            this.spawnBurstParticles(p.pos, 0xf97316, 22, 8.5);
            for (const target of this.enemies) {
              if (target.state !== 'ko' && target.pos.distanceTo(p.pos) <= p.aoeRadius) {
                this.applyDamageToEnemy(target, p.damage, p.postureDamage, 30, true, true);
              }
            }
          }
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
        p.mesh.position.copy(p.pos);
      }

      if (p.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state === 'ko') continue;
          const dist = Math.hypot(enemy.pos.x - p.pos.x, enemy.pos.z - p.pos.z);
          const hitRadius = p.isCaltropGrounded ? 1.35 : 1.05;
          const withinEnemyHeight =
            p.pos.y >= enemy.pos.y - 0.2 && p.pos.y <= enemy.pos.y + enemy.height + 0.35;
          if (dist <= hitRadius && withinEnemyHeight) {
            if (
              !p.isCaltropGrounded &&
              p.effectType !== 'fire_aoe' &&
              Math.random() < aiSnap.arrowDeflectProb * 0.45
            ) {
              this.audio.playParryClash(false);
              this._v1.set(enemy.pos.x, enemy.pos.y + 1.3, enemy.pos.z);
              this.spawnBurstParticles(this._v1, 0xfbbf24, 10, 6.0);
              this.pushFloatingText('ARROW DEFLECTED', enemy.pos, '#fbbf24', false);
              this.scene.remove(p.mesh);
              this.projectiles.splice(i, 1);
              break;
            }

            if (p.effectType === 'fire_aoe') {
              this.audio.playMatchlockBoom();
              this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.5);
              this.spawnBurstParticles(p.pos, 0xf97316, 28, 10.0);
              for (const target of this.enemies) {
                if (target.state !== 'ko' && target.pos.distanceTo(p.pos) <= p.aoeRadius) {
                  this.applyDamageToEnemy(target, p.damage, p.postureDamage, 30, true, true);
                }
              }
            } else {
              if (p.effectType === 'dart') {
                enemy.poisonTimer = 6.0;
              }
              if (p.effectType === 'caltrop_slow') {
                enemy.slowTimer = 5.0;
              }
              this.applyDamageToEnemy(
                enemy,
                p.damage,
                p.postureDamage,
                25,
                p.effectType === 'stagger_pierce',
                false
              );

              if (
                (p.effectType === 'arrow' || p.effectType === 'stagger_pierce') &&
                enemy.rig.bodyPivot.children.length < 18
              ) {
                const embedded = p.mesh.clone();
                embedded.position.set(
                  (Math.random() - 0.5) * 0.35,
                  0.95 + (Math.random() - 0.5) * 0.45,
                  0.28
                );
                embedded.scale.setScalar(0.75);
                enemy.rig.bodyPivot.add(embedded);
              }
            }

            if (!p.piercing) {
              this.scene.remove(p.mesh);
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      } else {
        const dist = Math.hypot(this.playerPos.x - p.pos.x, this.playerPos.z - p.pos.z);
        const withinPlayerHeight =
          p.pos.y >= this.playerPos.y - 0.15 && p.pos.y <= this.playerPos.y + playerHeight + 0.15;
        if (dist <= 0.95 && withinPlayerHeight) {
          this.damagePlayer(p.damage, p.postureDamage);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateParticlesAndVFX(dt: number) {
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particleLife[i] -= dt;
      const px = this.particlePos[i * 3];
      const py = this.particlePos[i * 3 + 1];
      const pz = this.particlePos[i * 3 + 2];
      const groundY = this.getGroundHeightAt(px, pz);
      if (this.particleLife[i] <= 0 || py <= groundY + 0.05) {
        this.resetAmbientParticle(i, false);
      } else {
        this.particlePos[i * 3] += this.particleVel[i * 3] * dt;
        this.particlePos[i * 3 + 1] += this.particleVel[i * 3 + 1] * dt;
        this.particlePos[i * 3 + 2] += this.particleVel[i * 3 + 2] * dt;
      }

      this._v1.set(
        this.particlePos[i * 3],
        this.particlePos[i * 3 + 1],
        this.particlePos[i * 3 + 2]
      );
      this._euler.set(
        this.particleLife[i] * 2.2,
        this.particleLife[i] * 1.7,
        this.particleLife[i]
      );
      this._quat.setFromEuler(this._euler);
      const s = this.particleScale[i];
      this._v2.set(s, s, s);
      this._mat4.compose(this._v1, this._quat, this._v2);
      this.particleMesh.setMatrixAt(i, this._mat4);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    // Update Detached Armor Plates, Sliced Bamboo & Dismembered Limb Physics Debris
    for (let i = this.debrisPieces.length - 1; i >= 0; i--) {
      const d = this.debrisPieces[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.debrisPieces.splice(i, 1);
        continue;
      }
      d.pos.x += d.vel.x * dt;
      d.pos.y += d.vel.y * dt;
      d.pos.z += d.vel.z * dt;
      d.vel.y -= 16.5 * dt; // Gravity
      const debrisGroundY = this.getGroundHeightAt(d.pos.x, d.pos.z);
      if (d.pos.y <= debrisGroundY + 0.12) {
        d.pos.y = debrisGroundY + 0.12;
        d.vel.x *= 0.65;
        d.vel.z *= 0.65;
        d.vel.y = Math.abs(d.vel.y) * 0.28;
        d.rotVel.multiplyScalar(0.7);
      }
      d.mesh.position.copy(d.pos);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
    }

    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const trail = this.slashTrails[i];
      trail.life -= dt;
      if (trail.life <= 0) {
        this.scene.remove(trail.mesh);
        this.slashTrails.splice(i, 1);
      } else {
        (trail.mesh.material as THREE.MeshBasicMaterial).opacity =
          (trail.life / trail.maxLife) * 0.85;
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].life -= dt;
      this.floatingTexts[i].y -= dt * 14;
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public broadcastHUD(force: boolean) {
    const now = performance.now();
    if (!force && now - this.lastHudBroadcast < 90) return;
    this.lastHudBroadcast = now;

    const stage = CAMPAIGN_STAGES[this.stageIndex];
    const bossEntity = this.enemies.find(
      (e) => (e.isBoss || e.isTrainingDummy) && e.state !== 'ko'
    );
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'ko').length;

    const zanshinTarget = this.enemies.some(
      (e) =>
        e.state !== 'ko' &&
        e.pos.distanceTo(this.playerPos) <= 6.0 &&
        (e.state === 'staggered' || e.posture >= e.maxPosture * 0.65 || e.hp <= e.maxHp * 0.32)
    );

    const worldOffset = this.openWorld.getAccumulatedOffset();
    const playerWorldX = Math.round(this.playerPos.x + worldOffset.x);
    const playerWorldZ = Math.round(this.playerPos.z + worldOffset.z);

    const enemyRadarPoints: EnemyRadarPoint[] = this.enemies
      .filter((e) => e.state !== 'ko')
      .map((e) => ({
        id: e.id,
        x: Math.round(e.pos.x + worldOffset.x),
        z: Math.round(e.pos.z + worldOffset.z),
        isBoss: e.isBoss,
      }));

    // Build landmarks from Single Source of Truth registered bridges + origin shrine + cave/boss markers
    const worldMapLandmarks: WorldMapLandmark[] = [
      ...this.openWorld.registeredBridges.map((b) => ({
        id: b.id,
        type: 'bridge' as const,
        name: 'Taiko-Bashi Bridge',
        kanji: '太鼓橋',
        worldX: Math.round(b.worldX),
        worldZ: Math.round(b.worldZ),
      })),
      {
        id: 'torii_origin_shrine',
        type: 'torii_shrine',
        name: 'Origin Torii Shrine',
        kanji: '鳥居',
        worldX: 0,
        worldZ: -18,
      },
      {
        id: 'cave_north_crystal',
        type: 'cave_entrance',
        name: 'Crystal Cavern',
        kanji: '鍾乳洞',
        worldX: 64,
        worldZ: -78,
      },
      {
        id: 'cave_west_oni',
        type: 'cave_entrance',
        name: 'Oni Cavern',
        kanji: '鬼穴',
        worldX: -88,
        worldZ: 42,
      },
      {
        id: 'boss_kurogane_samurai',
        type: 'world_boss',
        name: stage.boss.name,
        kanji: '鬼首領',
        worldX: bossEntity ? Math.round(bossEntity.pos.x + worldOffset.x) : 0,
        worldZ: bossEntity ? Math.round(bossEntity.pos.z + worldOffset.z) : -56,
      },
    ];

    const execCandidate = this.enemies.find(
      (e) =>
        e.state !== 'ko' &&
        e.pos.distanceTo(this.playerPos) <= 6.0 &&
        (e.state === 'staggered' || e.posture >= e.maxPosture * 0.65 || e.hp <= e.maxHp * 0.32)
    );
    let executeTargetPrompt: ExecuteTargetPrompt | null = null;
    if (execCandidate) {
      const proj = this._v1
        .set(execCandidate.pos.x, execCandidate.pos.y + execCandidate.height + 0.45, execCandidate.pos.z)
        .project(this.camera);
      if (proj.z >= -1 && proj.z <= 1) {
        executeTargetPrompt = {
          enemyId: execCandidate.id,
          enemyName: execCandidate.name,
          screenXPercent: THREE.MathUtils.clamp((proj.x * 0.5 + 0.5) * 100, 12, 88),
          screenYPercent: THREE.MathUtils.clamp((-proj.y * 0.5 + 0.5) * 100, 14, 82),
        };
      }
    }

    this.onHUDUpdate({
      gameState: this.gameState,
      hp: Math.round(this.hp),
      maxHp: this.stats.maxHp,
      ghostHp: Math.round(this.ghostHp),
      posture: Math.round(this.posture),
      maxPosture: this.stats.maxPosture,
      ki: Math.round(this.ki),
      maxKi: this.stats.maxKi,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      comboCount: this.comboCount,
      stageIndex: this.stageIndex,
      highestUnlockedStage: this.highestUnlockedStage,
      stageDef: stage,
      enemiesRemaining: aliveEnemies,
      bossActive: Boolean(bossEntity),
      bossName: this.isDojoMode ? 'Karakuri Dojo Dummy' : stage.boss.name,
      bossKanji: this.isDojoMode
        ? '稽古木人 · Stationary Parry & Combo Target'
        : stage.boss.kanjiSubtitle,
      bossTitle: this.isDojoMode ? 'Dojo Practice Target' : stage.boss.title,
      bossHp: bossEntity ? Math.round(bossEntity.hp) : 0,
      bossMaxHp: bossEntity ? bossEntity.maxHp : stage.boss.hp,
      bossPosture: bossEntity ? Math.round(bossEntity.posture) : 0,
      bossMaxPosture: bossEntity ? bossEntity.maxPosture : stage.boss.posture,
      activeSlot: this.activeSlot,
      primaryWeapon: this.primaryWeapon,
      secondaryWeapon: this.secondaryWeapon,
      rangedWeapon: this.rangedWeapon,
      equippedThrowable: this.equippedThrowable,
      throwableStock: this.throwableStock,
      throwableCooldown: Number(this.throwableCooldown.toFixed(1)),
      equippedArmor: this.equippedArmor,
      equippedHelmet: this.equippedHelmet,
      computedStats: this.stats,
      aiSnapshot: this.aiBrain.getSnapshot(now),
      statusBanner: this.statusBanner,
      clearTimeSec: Math.round(this.runTimeSec),
      damageTakenRun: Math.round(this.damageTakenRun),
      isDojoMode: this.isDojoMode,
      koku: this.koku,
      zanshinReady: zanshinTarget,
      floatingNumbers: [...this.floatingTexts],
      appearance: { ...this.appearance },
      customizerMode: this.customizerMode,
      activeInfusion: this.activeInfusion,
      activeInfusionDef: this.getActiveInfusionDef(),
      lastDodgeMode: this.lastDodgeMode,
      chronosTimer: Number(this.chronosTimer.toFixed(1)),
      shadowCrossReady: this.shadowCrossReady,
      grappleActive: this.grappleActive,
      armorIntegrity: this.armorIntegrity,
      activeCombatMove: this.activeCombatMove,
      activeCombatMoveDef: SIX_COMBAT_MOVES[this.activeCombatMove],
      lastBladeRayHits: this.lastBladeRayHits,
      lastBisectedTriCount: this.lastBisectedTriCount,
      verletClothNodeCount: this.haoriVerletCloth
        ? (this.haoriVerletCloth.cols + 1) * (this.haoriVerletCloth.rows + 1)
        : 99,
      cannonRigidBodyCount: this.multiPhysics.entries.length + 1,
      inspectedTelemetry: this.assetManager.getLastTelemetry(),
      lastDeflectAngleDeg: this.lastDeflectAngleDeg,
      openWorldTelemetry: this.lastOpenWorldTelemetry,
      dojoSnapshot: this.lastDojoSnapshot,
      activePbrBundle: this.activePbrBundle
        ? (() => {
            const preset =
              NANO_BANANA_PBR_PRESETS.find((p) => p.id === this.activePbrBundle!.presetId) ||
              NANO_BANANA_PBR_PRESETS[0];
            return {
              presetId: this.activePbrBundle.presetId,
              title: preset.name,
              targetSlot: preset.targetCategory,
              sourceModel: this.activePbrBundle.sourceModel,
              pomSteps: 16,
              triplanarActive: true,
              albedoUrl: this.activePbrBundle.albedoDataUrl,
              normalUrl: this.activePbrBundle.normalDataUrl,
              heightUrl: this.activePbrBundle.heightDataUrl,
              roughnessUrl: this.activePbrBundle.roughnessDataUrl,
            };
          })()
        : null,
      activeDialogueSubtitle: this.activeDialogueSubtitle,
      cameraMode: this.cameraMode,
      cameraModeLabel: CAMERA_MODE_LABELS[this.cameraMode],
      playerWorldPos: {
        x: playerWorldX,
        y: Number(this.playerPos.y.toFixed(1)),
        z: playerWorldZ,
      },
      camYaw: this.currentCamYaw,
      playerYaw: this.playerYaw,
      worldMapLandmarks,
      enemyRadarPoints,
      executeTargetPrompt,
      activeCinematicFinisher: this.activeCinematicFinisher,
      activeMythicArt: this.activeMythicArt,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.audio.stopAmbientLoop();
    this.openWorld.disposeAll();
    const unbind = (this as unknown as { _unbind?: () => void })._unbind;
    if (unbind) unbind();
    this.renderer.dispose();
  }
}
