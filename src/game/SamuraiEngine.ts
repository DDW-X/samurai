import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
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
import { SamuraiAudioSynth } from './audioSynth';
import {
  createProceduralTextures,
  createSamuraiHeroRig,
  updateSamuraiEquipmentVisuals,
  createEnemyMeshRig,
  createDojoDummyMeshRig,
  createProjectileMesh,
  createSumiWashiMaterial,
  createUrushiLacquerMaterial,
  createKamiSobelShaderDefinition,
  createSplineLatheGeometry,
  createIrimoyaPagodaRoofGeometry,
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

export interface FloatingDamageText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  isCrit: boolean;
  life: number;
}

export interface HUDStateSnapshot {
  gameState: 'title' | 'playing' | 'paused' | 'gameover' | 'victory';
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
  private textures!: ProceduralTextures;

  // Game & Stage State (10 Biomes)
  private gameState: HUDStateSnapshot['gameState'] = 'title';
  private isDojoMode = false;
  private customizerMode = false;
  private stageIndex = 0;
  private highestUnlockedStage = CAMPAIGN_STAGES.length - 1; // All 10 Biomes unlocked & inspectable
  private score = 0;
  private bestScore = 1200;
  private koku = 350;
  private comboCount = 0;
  private comboTimer = 0;
  private runTimeSec = 0;
  private damageTakenRun = 0;
  private statusBanner = 'Bamboo Forest of Whispers · Strike with Honor';

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

  // 5 Elemental Weapon Infusions (Z, X, C, V, B)
  private activeInfusion: ElementalInfusionId = 'none';

  // 7-Mode Dodge, Acrobatics & Kaginawa Grappling Hook State
  private lastDodgeMode: DodgeModeId = 'tai_sabaki';
  private lastShiftTapTime = 0;
  private rollAnimTimer = 0;
  private chronosTimer = 0; // Miri-Kiri Time-Dilation (15% enemy speed)
  private shadowCrossReady = false;
  private grappleActive = false;
  private grappleAnchor = new THREE.Vector3(0, 6.4, -18);
  private grappleTheta = -0.65;
  private grappleOmega = 0;
  private grappleTimer = 0;
  private grappleLineMesh: THREE.Line | null = null;

  // Player Physics & Combat State
  private playerRig!: SamuraiRig;
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

  // Entities, Interactive Environment & Pooled Buffers
  private envGroup = new THREE.Group();
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
      44,
      (this.container.clientWidth || window.innerWidth) /
        (this.container.clientHeight || window.innerHeight),
      0.35,
      170
    );

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy() || 1;
    this.textures = createProceduralTextures(maxAniso);

    // Hardware GPU Sobel/Laplacian Ink Outline & Washi Paper Post-Processing Pass
    if (!this.isSoftwareGl) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const sobelDef = createKamiSobelShaderDefinition(this.textures.washiAlbedo);
      sobelDef.uniforms.uResolution.value.set(w, h);
      this.sobelPass = new ShaderPass(sobelDef);
      this.composer.addPass(this.sobelPass);
    }

    // 3-Point Balanced Studio + Outdoor Rig
    const hemiLight = new THREE.HemisphereLight(0xe6dec8, 0x383b2e, 0.85);
    hemiLight.name = 'hemiLight';
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 2.2);
    keyLight.name = 'keyLight';
    keyLight.position.set(22, 36, 24);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -35;
    keyLight.shadow.camera.right = 35;
    keyLight.shadow.camera.top = 35;
    keyLight.shadow.camera.bottom = -35;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 95;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
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
  }

  private resetAmbientParticle(i: number, randomHeight = false) {
    const stage = CAMPAIGN_STAGES[this.stageIndex];
    this.particlePos[i * 3] = this.playerPos.x + (Math.random() - 0.5) * 48;
    this.particlePos[i * 3 + 1] = randomHeight ? 1 + Math.random() * 14 : 12 + Math.random() * 5;
    this.particlePos[i * 3 + 2] = this.playerPos.z + (Math.random() - 0.5) * 48;

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
    }
    this.broadcastHUD(true);
  }

  // ============================================================================
  // 3D FACE & BODY CUSTOMIZATION STUDIO + ELEMENTAL INFUSION API
  // ============================================================================
  public setCustomizerMode(open: boolean) {
    this.customizerMode = open;
    this.customizerOrbitYaw = 0;
    if (open) {
      // Automatically show face clearly while customizing, unless user toggles helmet
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
      this._v1.copy(this.playerPos).setY(1.2);
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
  // STAGE BUILDER (10 BIOMES, TORII SPIRIT PORTALS, INTERACTIVE GRASS & BAMBOO)
  // ============================================================================
  public loadStage(stageIdx: number) {
    this.stageIndex = ((stageIdx % CAMPAIGN_STAGES.length) + CAMPAIGN_STAGES.length) % CAMPAIGN_STAGES.length;
    const stage = CAMPAIGN_STAGES[this.stageIndex];
    this.aiBrain.setLearningMultiplier(stage.boss.aiLearningRate);

    this.scene.background = new THREE.Color(stage.skyColor);
    this.scene.fog = new THREE.FogExp2(stage.fogColor, stage.fogDensity);

    const keyLight = this.scene.getObjectByName('keyLight') as THREE.DirectionalLight;
    if (keyLight) keyLight.color.setHex(stage.keyLightColor);

    const hemiLight = this.scene.getObjectByName('hemiLight') as THREE.HemisphereLight;
    if (hemiLight) {
      hemiLight.color.setHex(stage.hemiSkyColor);
      hemiLight.groundColor.setHex(stage.hemiGroundColor);
    }

    // Clear previous environment, enemies, projectiles, decals, debris
    while (this.envGroup.children.length > 0) {
      this.envGroup.remove(this.envGroup.children[0]);
    }
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

    // 1. Multi-Octave FBM Terrain Plane (96x96 segments) with Riverbed & Mountain Ridges
    const groundGeo = new THREE.PlaneGeometry(180, 180, 96, 96);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const distFromArena = Math.max(0, Math.hypot(vx, vy) - 24.5);
      if (distFromArena > 0) {
        const n1 = Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 2.2;
        const n2 = Math.sin(vx * 0.19 + 1.4) * Math.sin(vy * 0.17) * 0.9;
        const n3 = Math.cos(vx * 0.37 - vy * 0.31) * 0.35;
        const elevation = Math.min(8.8, distFromArena * 0.18 * (1.2 + n1 + n2 + n3));
        posAttr.setZ(i, Math.max(0, elevation));
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: stage.groundColor,
      roughness: 0.84,
      metalness: 0.06,
      normalMap: this.textures.washiNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      bumpMap: this.textures.washiBump,
      bumpScale: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // 2. Central Flagstone Path & Stepping Stones (Tobi-ishi)
    const pathGeo = new THREE.PlaneGeometry(7.5, 58);
    const pathMat = new THREE.MeshStandardMaterial({
      color: stage.secondaryGroundColor,
      roughness: 0.76,
      metalness: 0.1,
      bumpMap: this.textures.washiBump,
      bumpScale: 0.03,
    });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, 0.02, -4);
    pathMesh.receiveShadow = true;
    this.envGroup.add(pathMesh);

    // 3. Sacred Torii Spirit Portal at z = -18 (Run through or grapple to warp to next Biome!)
    const toriiGroup = this.buildToriiLandmark(stage);
    toriiGroup.position.set(0, 0, -18);
    this.envGroup.add(toriiGroup);

    // Distant Hyperbolic Catenary Pagoda Roof Silhouette at z = -34
    const pagodaRoofGeo = createIrimoyaPagodaRoofGeometry(12.5, 10.5, 4.2, 24);
    const pagodaMat = createUrushiLacquerMaterial(0x271c19, this.textures, false);
    const pagodaRoof = new THREE.Mesh(pagodaRoofGeo, pagodaMat);
    pagodaRoof.position.set(0, 5.5, -34);
    this.envGroup.add(pagodaRoof);

    // 4. Flanking Stone Lanterns (Toro) + Koi Pond Water Ripple Basin
    for (const side of [-4.8, 4.8]) {
      for (const zPos of [4, -8]) {
        const lantern = this.buildStoneLantern(stage);
        lantern.position.set(side, 0, zPos);
        this.envGroup.add(lantern);
      }
    }

    // 5. Interactive Sliceable Bamboo Stalks inside Arena Perimeter (Can be cut in half!)
    const bambooGeo = createSplineLatheGeometry(
      [
        [0.14, 0],
        [0.13, 1.4],
        [0.15, 1.45],
        [0.12, 2.9],
        [0.14, 2.95],
        [0.11, 4.4],
      ],
      20
    );
    const bambooMat = createSumiWashiMaterial(0x2d5a27, 0.58, 0.12, this.textures);
    for (let b = 0; b < 14; b++) {
      const ang = (b / 14) * Math.PI * 2 + 0.25;
      const rad = 16.5 + (b % 3) * 2.2;
      const bx = Math.cos(ang) * rad;
      const bz = Math.sin(ang) * rad - 2;
      if (Math.abs(bx) < 5.5) continue;
      const bambooMesh = new THREE.Mesh(bambooGeo, bambooMat);
      bambooMesh.position.set(bx, 0, bz);
      bambooMesh.castShadow = !this.isSoftwareGl;
      this.envGroup.add(bambooMesh);
      this.sliceableBamboos.push({
        mesh: bambooMesh,
        pos: new THREE.Vector3(bx, 0, bz),
        sliced: false,
      });
    }

    // 6. GPU-Instanced Interactive Susuki Pampas Grass Clusters (Bends away from Samurai & Slashes!)
    const grassCount = 160;
    const bladeGeo = new THREE.ConeGeometry(0.11, 1.15, 5);
    bladeGeo.translate(0, 0.57, 0);
    const grassMat = createSumiWashiMaterial(
      stage.environmentType === 'bamboo_forest' ? 0x4d7c3f : 0xa18862,
      0.72,
      0.08,
      this.textures
    );
    this.grassInstancedMesh = new THREE.InstancedMesh(bladeGeo, grassMat, grassCount);
    this.grassInstancedMesh.frustumCulled = false;
    for (let g = 0; g < grassCount; g++) {
      const a = (g / grassCount) * Math.PI * 2 + (g % 7) * 0.19;
      const r = 7.5 + (g % 11) * 1.45;
      let gx = Math.cos(a) * r;
      const gz = Math.sin(a) * r - 2;
      if (Math.abs(gx) < 4.4) gx += gx < 0 ? -4.8 : 4.8;
      const gs = 0.75 + (g % 4) * 0.18;
      const gyaw = (g * 1.3) % (Math.PI * 2);
      this.grassBaseCoords.push({ x: gx, z: gz, scale: gs, yaw: gyaw });
    }
    this.updateInteractiveGrass(0);
    this.envGroup.add(this.grassInstancedMesh);

    // 7. InstancedMesh Natural Perimeter Grove (> 80 instances)
    const count = 84;
    const propGeo =
      stage.environmentType === 'bamboo_forest'
        ? new THREE.CylinderGeometry(0.18, 0.24, 9.5, 12)
        : stage.environmentType === 'zen_garden'
          ? new THREE.DodecahedronGeometry(1.6, 1)
          : new THREE.CylinderGeometry(0.45, 0.55, 6.5, 16);

    const propMat = createSumiWashiMaterial(
      stage.environmentType === 'bamboo_forest'
        ? 0x2d4c2b
        : stage.environmentType === 'burning_castle'
          ? 0x271c19
          : stage.environmentType === 'origami_shrine'
            ? 0x991b1b
            : stage.environmentType === 'blood_battlefield'
              ? 0x3f1d24
              : 0x57534e,
      0.65,
      0.15,
      this.textures
    );

    const instanced = new THREE.InstancedMesh(propGeo, propMat, count);
    instanced.castShadow = !this.isSoftwareGl;
    instanced.receiveShadow = true;
    instanced.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3),
      3
    );

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.08;
      const radius = 25 + (i % 4) * 3.8;
      let x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 3;
      if (z > 10 && Math.abs(x) < 16) {
        x += x <= 0 ? -14 : 14;
      }
      const scale = 0.85 + (i % 5) * 0.08;

      this._v1.set(x, stage.environmentType === 'zen_garden' ? 1.1 * scale : 4.2 * scale, z);
      this._euler.set(((i % 3) - 1) * 0.04, (i * 0.7) % Math.PI, ((i % 2) - 0.5) * 0.04);
      this._quat.setFromEuler(this._euler);
      this._v2.set(scale, scale, scale);
      this._mat4.compose(this._v1, this._quat, this._v2);
      instanced.setMatrixAt(i, this._mat4);

      const tint = 0.86 + (i % 4) * 0.08;
      this._color.setRGB(tint, tint, tint);
      instanced.setColorAt(i, this._color);
    }
    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;
    instanced.computeBoundingSphere();
    this.envGroup.add(instanced);

    // Reset Player Position on Clear Open Path facing Landmark
    this.playerPos.set(0, 0, 14);
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
    this.statusBanner = `Biome ${this.stageIndex + 1}/10 · ${stage.name} (${stage.kanji})`;

    this.spawnStageWave(stage);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.resetAmbientParticle(i, true);
    }
    this.broadcastHUD(true);
  }

  private updateInteractiveGrass(timeSec: number) {
    if (!this.grassInstancedMesh) return;
    for (let i = 0; i < this.grassBaseCoords.length; i++) {
      const g = this.grassBaseCoords[i];
      const dx = g.x - this.playerPos.x;
      const dz = g.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      // Grass bends away from player position and sways in wind
      const bendStrength = dist < 2.6 ? (1 - dist / 2.6) * 0.85 : 0;
      const windTilt = Math.sin(timeSec * 2.4 + g.x * 0.35 + g.z * 0.25) * 0.14;
      const tiltX = (dz / Math.max(0.1, dist)) * bendStrength + windTilt;
      const tiltZ = -(dx / Math.max(0.1, dist)) * bendStrength + windTilt * 0.5;

      this._v1.set(g.x, 0, g.z);
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

        const sampleWeapon =
          WEAPONS.find((w) => w.id === arch.weaponType) || WEAPONS[0];
        const rig = createEnemyMeshRig(arch, false, this.textures, sampleWeapon);
        rig.root.position.set(x, 0, z);
        this.scene.add(rig.root);

        this.enemies.push({
          id: this.nextEnemyId++,
          name: arch.name,
          isBoss: false,
          archetype: arch,
          rig,
          pos: new THREE.Vector3(x, 0, z),
          vel: new THREE.Vector3(),
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

    const spawnPos = new THREE.Vector3(0, 0, -14);
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
    this.broadcastHUD(true);
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
    const dummyPos = new THREE.Vector3(0, 0, 8.2);
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

    this.playerPos.set(0, 0, 12.6);
    this.playerYaw = Math.PI;
    this.statusBanner = 'Dojo Training Mode · 稽古道場 (Stationary Parry & Combo Dummy)';
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
  // 7-MODE DODGE, ACROBATICS & KAGINAWA GRAPPLING HOOK ENGINE
  // ============================================================================
  public triggerMultiModeDodge(moveX: number, moveZ: number, nowMs: number) {
    if (this.ki < 14 || this.invulnTimer > 0) return;

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
      this.invulnTimer = 0.45;
      const dx = windupEnemy.pos.x - this.playerPos.x;
      const dz = windupEnemy.pos.z - this.playerPos.z;
      this.playerYaw = Math.atan2(dx, dz);
      this.playerPos.x = windupEnemy.pos.x - Math.sin(this.playerYaw) * 1.15;
      this.playerPos.z = windupEnemy.pos.z - Math.cos(this.playerYaw) * 1.15;

      // Shatter 65% of enemy's Max Posture!
      const postureShatter = Math.round(windupEnemy.maxPosture * 0.65);
      windupEnemy.posture = Math.min(windupEnemy.maxPosture, windupEnemy.posture + postureShatter);
      windupEnemy.state = 'staggered';
      windupEnemy.stateTimer = 1.65;
      this.hitstopTimer = 0.08;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.52);
      this.audio.playParryClash(true);
      this._v1.copy(windupEnemy.pos).setY(0.35);
      this.spawnBurstParticles(this._v1, 0xfbbf24, 28, 10.0);
      this.pushFloatingText('見切り MIKIRI BLADE-STOMP! (-65% POSTURE)', windupEnemy.pos, '#fbbf24', true);
      if (windupEnemy.posture >= windupEnemy.maxPosture) {
        this.triggerPostureBreakDeathblow(windupEnemy);
      }
      this.broadcastHUD(true);
      return;
    }

    // Check Mode 3: MIRI-KIRI PERFECT FLASH-STEP DODGE (Within 150ms of incoming strike)
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
      this.invulnTimer = 0.45;
      this.spawnAfterimageSilhouette(this.playerPos, this.playerYaw);
      this.playerPos.x += dirX * 3.8;
      this.playerPos.z += dirZ * 3.8;
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
      this.invulnTimer = 0.42;
      this.rollAnimTimer = 0.38;
      this.playerPos.x += dirX * 4.4;
      this.playerPos.z += dirZ * 4.4;
      this._v1.copy(this.playerPos).setY(0.25);
      this.spawnBurstParticles(this._v1, 0xd6d3d1, 20, 6.5);
      this.audio.playFootstep();
      this.pushFloatingText('受身 UKEMI 360° ROLL', this.playerPos, '#e7e5e4', false);
      return;
    }

    // Mode 1: TAI-SABAKI QUICK-STEP SIDESTEP (Single-Tap Shift: 3.8m in 0.20s + Ink Afterimage)
    this.lastShiftTapTime = nowMs;
    this.lastDodgeMode = 'tai_sabaki';
    this.ki = Math.max(0, this.ki - 14);
    this.invulnTimer = 0.24;
    this.spawnAfterimageSilhouette(this.playerPos, this.playerYaw);
    this.playerPos.x += dirX * 3.8;
    this.playerPos.z += dirZ * 3.8;
    this._v1.copy(this.playerPos).setY(0.9);
    this.spawnBurstParticles(this._v1, 0x181411, 16, 6.5);
    this.audio.playFootstep();
  }

  // Mode 4: UTSUSEMI PHANTOM INK-CLONE DODGE (`Alt` key)
  public triggerUtsusemiCloneDodge() {
    if (this.ki < 26) {
      this.pushFloatingText('LOW KI FOR UTSUSEMI', this.playerPos, '#60a5fa', false);
      return;
    }
    this.ki = Math.max(0, this.ki - 26);
    this.lastDodgeMode = 'utsusemi_clone';
    this.invulnTimer = 0.35;

    // Spawn 3D Ink Decoy Clone at current position that taunts enemies for 2.5s then explodes
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
    cloneGroup.position.copy(this.playerPos);
    cloneGroup.rotation.y = this.playerYaw;
    this.scene.add(cloneGroup);
    this.utsusemiClones.push({
      mesh: cloneGroup,
      pos: this.playerPos.clone(),
      timer: 2.5,
    });

    // Blink backward/sideways out of danger
    this.playerPos.x -= Math.sin(this.playerYaw) * 3.6;
    this.playerPos.z -= Math.cos(this.playerYaw) * 3.6;
    this._v1.copy(this.playerPos).setY(1.1);
    this.spawnBurstParticles(this._v1, 0x110d0a, 24, 8.0);
    this.audio.playSwordSlash(false);
    this.pushFloatingText('空蝉 UTSUSEMI INK DECOY!', this.playerPos, '#c084fc', true);
    this.broadcastHUD(true);
  }

  // Mode 6: WALL-VAULT / FUMIDAI ENEMY HEAD-STOMP JUMP (`Space`)
  public triggerJumpOrWallVault(nowMs: number) {
    // Check if near an enemy or bamboo/pillar for a 4.0m Fumidai Vault
    const nearbyEnemy = this.enemies.find(
      (e) => e.state !== 'ko' && e.pos.distanceTo(this.playerPos) <= 2.8
    );
    const nearPerimeterWall = Math.hypot(this.playerPos.x, this.playerPos.z + 2) >= 18.5;

    if (nearbyEnemy || nearPerimeterWall) {
      this.lastDodgeMode = 'wall_vault';
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.playerVel.y = 14.8; // 4.0m high acrobatic vault
      this.rollAnimTimer = 0.42;
      if (nearbyEnemy && !nearbyEnemy.isTrainingDummy) {
        nearbyEnemy.posture = Math.min(nearbyEnemy.maxPosture, nearbyEnemy.posture + 35);
        nearbyEnemy.state = 'staggered';
        nearbyEnemy.stateTimer = 0.9;
        this.pushFloatingText('踏台 FUMIDAI HEAD-STOMP VAULT!', nearbyEnemy.pos, '#fbbf24', true);
      } else {
        this.pushFloatingText('壁跳 WALL-VAULT FLIP!', this.playerPos, '#38bdf8', false);
      }
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

  // Mode 7: KAGINAWA GRAPPLING HOOK (`KeyG` Pendulum Swing Physics)
  public triggerKaginawaGrapple() {
    if (this.grappleActive) return;
    this.lastDodgeMode = 'kaginawa_grapple';
    this.grappleActive = true;
    this.grappleTimer = 0.65;
    this.grappleTheta = -0.75;
    this.grappleOmega = 1.8;

    // Target either a distant enemy (> 6m) or the Sacred Torii Gate lintel at (0, 6.4, -18)
    const distantEnemy = this.enemies.find(
      (e) => e.state !== 'ko' && e.pos.distanceTo(this.playerPos) > 5.5
    );
    if (distantEnemy) {
      this.grappleAnchor.set(distantEnemy.pos.x, 2.8, distantEnemy.pos.z);
    } else {
      this.grappleAnchor.set(0, 6.4, -18);
    }

    this.isGrounded = false;
    this.playerVel.y = 8.5;
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

    // Miri-Kiri Shadow-Cross Teleport Finisher if ready!
    let isShadowCross = false;
    if (this.shadowCrossReady) {
      this.shadowCrossReady = false;
      isShadowCross = true;
      const target = this.enemies.find((e) => e.state !== 'ko');
      if (target) {
        const dx = target.pos.x - this.playerPos.x;
        const dz = target.pos.z - this.playerPos.z;
        this.playerYaw = Math.atan2(dx, dz);
        this.playerPos.x = target.pos.x - Math.sin(this.playerYaw) * 1.3;
        this.playerPos.z = target.pos.z - Math.cos(this.playerYaw) * 1.3;
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

    const isPlunge = !this.isGrounded && this.playerPos.y > 0.8;
    const dmgMult =
      (isShadowCross ? 2.15 : isPlunge ? 1.85 : isHeavy ? 1.65 : 1.0 + this.comboStep * 0.12) *
      infDef.bonusDamageMult;
    const finalBaseDmg = Math.round(this.stats.attackPower * dmgMult);
    const finalPostureDmg = Math.round(
      this.stats.postureBreakPower * (isHeavy || isShadowCross ? 1.75 : 1.0)
    );

    this.aiBrain.recordMeleeAttack(nowMs, finalBaseDmg);
    this.audio.playSwordSlash(isHeavy || isPlunge || isShadowCross);

    this.spawnInkSlashArc(weapon, isHeavy || isPlunge || isShadowCross);

    this.playerPos.x += Math.sin(this.playerYaw) * 0.55;
    this.playerPos.z += Math.cos(this.playerYaw) * 0.55;

    // Slice any interactive Bamboo Stalks within blade reach!
    this.checkSliceableBambooHit(weapon.reach + 0.9);

    const reach =
      weapon.reach *
      (isHeavy || isPlunge || this.activeInfusion === 'fujin_gale' ? 1.35 : 1.05);
    const halfArcRad =
      THREE.MathUtils.degToRad(
        isHeavy || isPlunge || weapon.id === 'otsuchi'
          ? Math.min(360, weapon.swingArcDeg * 1.35)
          : weapon.swingArcDeg
      ) * 0.5;

    const forwardX = Math.sin(this.playerYaw);
    const forwardZ = Math.cos(this.playerYaw);

    let hitAny = false;
    for (const enemy of this.enemies) {
      if (enemy.state === 'ko') continue;
      const dx = enemy.pos.x - this.playerPos.x;
      const dz = enemy.pos.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach + 0.85) continue;

      const dirX = dx / Math.max(0.001, dist);
      const dirZ = dz / Math.max(0.001, dist);
      const dot = forwardX * dirX + forwardZ * dirZ;
      const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));

      if (angle <= halfArcRad || dist < 1.35) {
        hitAny = true;
        this.applyElementalInfusionOnHit(enemy);
        this.applyDamageToEnemy(
          enemy,
          finalBaseDmg,
          finalPostureDmg,
          weapon.bleedBuildup,
          isHeavy || isPlunge || isShadowCross,
          isShadowCross
        );
      }
    }

    if (hitAny) {
      this.hitstopTimer = isHeavy || isPlunge ? 0.065 : 0.032;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + (isHeavy ? 0.38 : 0.18));
    }
  }

  private applyElementalInfusionOnHit(primaryEnemy: ActiveEnemy) {
    if (this.activeInfusion === 'none') return;
    const infDef = this.getActiveInfusionDef();
    this._v1.copy(primaryEnemy.pos).setY(1.3);
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
            this._v2.copy(other.pos).setY(1.3);
            this.spawnBurstParticles(this._v2, 0x38bdf8, 12, 7.0);
            this.pushFloatingText('⚡ CHAIN -18', other.pos, '#38bdf8', false);
          }
        }
      }
    }
  }

  private checkSliceableBambooHit(reach: number) {
    for (const bamboo of this.sliceableBamboos) {
      if (bamboo.sliced) continue;
      if (bamboo.pos.distanceTo(this.playerPos) <= reach) {
        bamboo.sliced = true;
        bamboo.mesh.scale.y = 0.35; // Lower stump remains rooted
        // Spawn toppling upper bamboo stalk physics debris!
        const topGeo = createSplineLatheGeometry(
          [
            [0.13, 0],
            [0.12, 1.4],
            [0.1, 2.8],
          ],
          16
        );
        const topMesh = new THREE.Mesh(topGeo, bamboo.mesh.material);
        topMesh.position.set(bamboo.pos.x, 1.5, bamboo.pos.z);
        this.scene.add(topMesh);
        this.debrisPieces.push({
          mesh: topMesh,
          pos: topMesh.position.clone(),
          vel: new THREE.Vector3(
            Math.sin(this.playerYaw) * 4.2,
            3.8,
            Math.cos(this.playerYaw) * 4.2
          ),
          rotVel: new THREE.Vector3(2.8, 1.2, 3.4),
          life: 3.5,
        });
        this._v1.copy(bamboo.pos).setY(1.5);
        this.spawnBurstParticles(this._v1, 0x4ade80, 14, 6.0);
      }
    }
  }

  private spawnEnemyDismembermentDebris(enemy: ActiveEnemy) {
    if (enemy.dismembered) return;
    enemy.dismembered = true;
    // Detach enemy's weapon arm & helmet as flying physics debris with crimson ink spray!
    enemy.rig.weaponArm.visible = false;
    const severedArm = enemy.rig.weaponArm.clone();
    severedArm.visible = true;
    severedArm.position.set(enemy.pos.x + 0.35, 1.35, enemy.pos.z);
    this.scene.add(severedArm);
    this.debrisPieces.push({
      mesh: severedArm,
      pos: severedArm.position.clone(),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 5.5,
        5.2,
        (Math.random() - 0.5) * 5.5
      ),
      rotVel: new THREE.Vector3(6.5, 4.2, 5.8),
      life: 3.2,
    });
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
    plateMesh.position.copy(origin).setY(1.25);
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
      this._v1.copy(this.playerPos).setY(1.3);
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
      1.25,
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
        1.2,
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
        deflected = true;
        enemy.state = 'staggered';
        enemy.stateTimer = 1.25;
        enemy.posture += this.stats.postureBreakPower * 1.6;
        this.audio.playParryClash(true);
        this.hitstopTimer = 0.07;
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.42);
        this._v1.copy(this.playerPos).lerp(enemy.pos, 0.5).setY(1.35);
        this.spawnBurstParticles(this._v1, 0xfbbf24, 24, 9.5);
        this.pushFloatingText('PERFECT DEFLECT!', enemy.pos, '#fbbf24', true);

        if (enemy.posture >= enemy.maxPosture) {
          this.triggerPostureBreakDeathblow(enemy);
        }
        this.koku += 25;
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

      this.zanshinZoomTimer = 0.65;
      this.hitstopTimer = 0.085;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
      this.hp = Math.min(this.stats.maxHp, this.hp + 35);
      this.ki = Math.min(this.stats.maxKi, this.ki + 40);
      this.koku += 120;

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
      this._v1.copy(enemy.pos).setY(1.4);
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

    this._v1.copy(enemy.pos).setY(1.3);
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
        this._v1.copy(enemy.pos).setY(1.3);
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
        this._v1.copy(enemy.pos).setY(1.2);
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
    mesh.position.set(this.playerPos.x, 1.15, this.playerPos.z);
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
    coreMesh.position.set(this.playerPos.x, 1.18, this.playerPos.z);
    coreMesh.rotation.copy(mesh.rotation);
    this.scene.add(coreMesh);
    this.slashTrails.push({ mesh: coreMesh, life: 0.22, maxLife: 0.22 });
  }

  private spawnGroundInkSplatter(pos: THREE.Vector3) {
    const geo = new THREE.PlaneGeometry(2.6, 2.6);
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
    decal.rotation.x = -Math.PI / 2;
    decal.rotation.z = Math.random() * Math.PI * 2;
    decal.position.set(pos.x, 0.025 + this.groundDecals.length * 0.001, pos.z);
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
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(rawDt, 0.05);

    this.updateAnatomicalBlinkAndClothWind(dt, now * 0.001);

    if (this.customizerMode) {
      this.updateCustomizerCamera(dt);
    } else if (this.gameState === 'title') {
      this.updateTitleCameraAndIdle(dt);
    } else if (this.gameState === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.updatePlayingSimulation(dt, now);
      }
      this.updateGameplayCamera(dt);
    }

    this.updateParticlesAndVFX(dt);
    if (this.isSoftwareGl || !this.composer) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }

    if (now - this.lastHudBroadcast > 95) {
      this.broadcastHUD(false);
    }

    this.keysJustPressed.clear();
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

    // 2. Hair & Verlet Cape Wind Sway
    this.playerRig.hairGroup.rotation.z = Math.sin(timeSec * 2.8) * 0.06;
    if (this.playerRig.capeMesh) {
      this.playerRig.capeMesh.rotation.x = 0.24 + Math.sin(timeSec * 3.6) * 0.09;
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
    const radius = 11.5;
    const camX = this.playerPos.x + Math.sin(this.titleOrbitAngle) * radius;
    const camZ = this.playerPos.z + Math.cos(this.titleOrbitAngle) * radius;
    this.camera.position.set(camX, 5.2, camZ);
    this.camera.lookAt(this.playerPos.x - 1.8, 1.8, this.playerPos.z - 2.0);

    this.playerRig.torsoGroup.position.y = 0.75 + Math.sin(this.titleOrbitAngle * 6) * 0.03;
  }

  private updateGameplayCamera(dt: number) {
    this.zanshinZoomTimer = Math.max(0, this.zanshinZoomTimer - dt);
    const damp = 1 - Math.exp(-8.5 * dt);
    this.cameraFocus.x = THREE.MathUtils.lerp(this.cameraFocus.x, this.playerPos.x, damp);
    this.cameraFocus.y = THREE.MathUtils.lerp(this.cameraFocus.y, this.playerPos.y * 0.4 + 1.0, damp);
    this.cameraFocus.z = THREE.MathUtils.lerp(this.cameraFocus.z, this.playerPos.z, damp);

    const zanshinOffset = this.zanshinZoomTimer > 0 ? -5.2 : 0;
    const combatZoom =
      (this.enemies.some((e) => e.pos.distanceTo(this.playerPos) < 9) ? -1.4 : 0) + zanshinOffset;
    const targetX = this.cameraFocus.x;
    const targetY = this.cameraFocus.y + 15.5 + combatZoom;
    const targetZ = this.cameraFocus.z + 14.5 + combatZoom;

    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.2);
    const shake = this.cameraTrauma * this.cameraTrauma * 0.65;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;

    this.camera.position.set(targetX + shakeX, targetY + shakeY, targetZ);
    this.camera.lookAt(this.cameraFocus.x, this.cameraFocus.y, this.cameraFocus.z - 1.5);
  }

  private updatePlayingSimulation(dt: number, nowMs: number) {
    this.runTimeSec += dt;
    this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    this.chronosTimer = Math.max(0, this.chronosTimer - dt);
    this.rollAnimTimer = Math.max(0, this.rollAnimTimer - dt);

    // 5 Elemental Weapon Infusions (Z, X, C, V, B)
    if (this.keysJustPressed.has('KeyZ')) this.toggleElementalInfusion('kagutsuchi_flame');
    if (this.keysJustPressed.has('KeyX')) this.toggleElementalInfusion('raijin_thunder');
    if (this.keysJustPressed.has('KeyC')) this.toggleElementalInfusion('fujin_gale');
    if (this.keysJustPressed.has('KeyV')) this.toggleElementalInfusion('yuki_onna_frost');
    if (this.keysJustPressed.has('KeyB')) this.toggleElementalInfusion('yomi_blood_ink');

    // 3D Face & Body Customizer Hotkey (`KeyK`)
    if (this.keysJustPressed.has('KeyK')) {
      this.setCustomizerMode(!this.customizerMode);
      return;
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

    if (this.leftMouseDown) {
      this.leftMouseHoldTime += dt;
    }

    this.ghostHp = THREE.MathUtils.lerp(this.ghostHp, this.hp, 1 - Math.exp(-3.5 * dt));
    this.posture = Math.max(0, this.posture - 12 * dt);

    // Kaginawa Grappling Hook Pendulum Swing Physics: L*theta'' + g*sin(theta) + b*theta' = 0
    if (this.grappleActive) {
      this.grappleTimer -= dt;
      const swing = stepPendulumGrapple(this.grappleTheta, this.grappleOmega, 9.5, dt);
      this.grappleTheta = swing.theta;
      this.grappleOmega = swing.omega;

      const gx = this.grappleAnchor.x - this.playerPos.x;
      const gz = this.grappleAnchor.z - this.playerPos.z;
      const gDist = Math.hypot(gx, gz);
      if (gDist > 1.6 && this.grappleTimer > 0) {
        this.playerPos.x += (gx / gDist) * 24.0 * dt;
        this.playerPos.z += (gz / gDist) * 24.0 * dt;
        this.playerPos.y = Math.max(0.6, Math.sin((1 - this.grappleTimer / 0.65) * Math.PI) * 3.8);
        this.playerYaw = Math.atan2(gx, gz);
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
      }
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    const isSprinting =
      isMoving &&
      (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) &&
      this.ki > 5;

    if (isSprinting) {
      this.ki = Math.max(0, this.ki - 22 * this.stats.kiCostMultiplier * dt);
    } else {
      this.ki = Math.min(this.stats.maxKi, this.ki + this.stats.kiRegenPerSec * dt);
    }

    if (isMoving && !this.grappleActive) {
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

      // Toroidal Seamless Infinite-Looping World Boundary (p_world mod R_arena)
      const r = Math.hypot(this.playerPos.x, this.playerPos.z + 2);
      if (r > 23.8) {
        // Wrap seamlessly across the mist horizon to opposite side of toroidal chunk
        this.playerPos.x = -this.playerPos.x * 0.88;
        this.playerPos.z = -(this.playerPos.z + 2) * 0.88 - 2;
        this.cameraFocus.copy(this.playerPos);
      }

      if (this.attackAnimTimer <= 0) {
        this.playerYaw = Math.atan2(moveX, moveZ);
      }

      const prevSteps = Math.floor(this.walkDistance * 1.4);
      this.walkDistance += speed * dt;
      if (Math.floor(this.walkDistance * 1.4) > prevSteps && this.isGrounded) {
        this.audio.playFootstep();
      }
    }

    // Vertical Gravity & Jump Physics
    if (!this.isGrounded && !this.grappleActive) {
      this.playerPos.y += this.playerVel.y * dt;
      this.playerVel.y -= 28.0 * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVel.y = 0;
        this.isGrounded = true;
        this.playerRig.bodyPivot.scale.set(1.2, 0.8, 1.2);
        this.audio.playFootstep();
      }
    } else if (this.isGrounded) {
      this.coyoteTimer = 0.1;
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
      this.playerRig.bodyPivot.rotation.x = (1 - this.rollAnimTimer / 0.38) * Math.PI * 2;
    } else {
      this.playerRig.bodyPivot.rotation.x = 0;
    }

    // Update Player Articulated Rig
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    const gaitSwing = isMoving ? Math.sin(this.walkDistance * 2.8) * 0.55 : 0;
    this.playerRig.leftLeg.rotation.x = gaitSwing;
    this.playerRig.rightLeg.rotation.x = -gaitSwing;
    this.playerRig.leftArm.rotation.x = -gaitSwing * 0.7;

    if (this.attackAnimTimer > 0) {
      const t = 1 - this.attackAnimTimer / 0.28;
      this.playerRig.rightArm.rotation.x = -Math.PI * 0.65 + Math.sin(t * Math.PI) * 1.65;
      this.playerRig.rightArm.rotation.z = (this.comboStep % 2 === 0 ? -1 : 1) * 0.45;
    } else if (this.parryWindowTimer > 0) {
      this.playerRig.rightArm.rotation.x = -Math.PI * 0.45;
      this.playerRig.rightArm.rotation.z = 0.75;
    } else {
      this.playerRig.rightArm.rotation.x = gaitSwing * 0.5;
      this.playerRig.rightArm.rotation.z = 0;
    }

    // Update Interactive Grass Bending
    this.updateInteractiveGrass(nowMs * 0.001);

    // Update Utsusemi Ink Decoy Clones (Taunt for 2.5s then explode in 4.5m AoE)
    this.updateUtsusemiDecoys(dt);

    // Update Enemies & Bosses (Chronos Time-Dilation scales enemy dt to 15%!)
    const enemyDt = this.chronosTimer > 0 ? dt * 0.15 : dt;
    this.updateEnemiesAI(enemyDt, nowMs);

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
        this._v1.copy(clone.pos).setY(1.1);
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
          this._v1.copy(enemy.pos).setY(1.3);
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
        enemy.pos.set(0, 0, 8.2);
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
        rig.root.position.set(cx, 0, cz);
        this.scene.add(rig.root);
        this.enemies.push({
          id: this.nextEnemyId++,
          name: cloneArch.name,
          isBoss: false,
          archetype: cloneArch,
          rig,
          pos: new THREE.Vector3(cx, 0, cz),
          vel: new THREE.Vector3(),
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
      const spawnPos = new THREE.Vector3(enemy.pos.x, 1.25, enemy.pos.z);
      mesh.position.copy(spawnPos);
      mesh.rotation.y = yaw;
      this.scene.add(mesh);

      const spd = isRifle ? 32 : 22;
      this.projectiles.push({
        mesh,
        pos: spawnPos,
        vel: new THREE.Vector3(Math.sin(yaw) * spd, 0, Math.cos(yaw) * spd),
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

    const isJumping = this.playerPos.y >= 1.2;
    const caughtInAir = isJumping && Math.random() < aiSnap.antiAirSlashProb;
    if (caughtInAir) {
      this.pushFloatingText('燕返 ANTI-AIR SLASH!', enemy.pos, '#c084fc', true);
    }
    const canHitAir = !isJumping || caughtInAir;
    if (dist <= atkRange + 1.05 && canHitAir) {
      this.damagePlayer(rawDmg, rawPosture, enemy);
    }
  }

  private damagePlayer(rawDmg: number, rawPosture: number, attacker?: ActiveEnemy) {
    if (this.invulnTimer > 0 || this.gameState !== 'playing') return;

    if (this.parryWindowTimer > 0) {
      this.audio.playParryClash(true);
      this.hitstopTimer = 0.065;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
      this._v1.copy(this.playerPos).setY(1.3);
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
      this._v1.copy(this.playerPos).setY(1.2);
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

    this._v1.copy(this.playerPos).setY(1.2);
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

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!p.isCaltropGrounded) {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.pos.z += p.vel.z * dt;
        if (p.effectType === 'bleed_fan') {
          p.mesh.rotation.y += 18 * dt;
        }
        if (p.effectType === 'caltrop_slow' && p.pos.y <= 0.12) {
          p.pos.y = 0.12;
          p.vel.set(0, 0, 0);
          p.isCaltropGrounded = true;
        }
        p.mesh.position.copy(p.pos);
      }

      if (p.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state === 'ko') continue;
          const dist = Math.hypot(enemy.pos.x - p.pos.x, enemy.pos.z - p.pos.z);
          const hitRadius = p.isCaltropGrounded ? 1.35 : 1.05;
          if (dist <= hitRadius) {
            if (
              !p.isCaltropGrounded &&
              p.effectType !== 'fire_aoe' &&
              Math.random() < aiSnap.arrowDeflectProb * 0.45
            ) {
              this.audio.playParryClash(false);
              this._v1.copy(enemy.pos).setY(1.3);
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
        if (dist <= 0.95 && this.playerPos.y < 1.5) {
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
      if (this.particleLife[i] <= 0 || this.particlePos[i * 3 + 1] <= 0.05) {
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
      if (d.pos.y <= 0.12) {
        d.pos.y = 0.12;
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
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.audio.stopAmbientLoop();
    const unbind = (this as unknown as { _unbind?: () => void })._unbind;
    if (unbind) unbind();
    this.renderer.dispose();
  }
}
