import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS,
  THROWABLES,
  ARMORS,
  HELMETS,
  TWENTY_AUTHENTIC_ARSENAL,
  computeSamuraiStats,
} from './arsenal';
import { AdaptiveAIBrain } from './aiBrain';
import { CAMPAIGN_STAGES, ENEMY_ARCHETYPES } from './stages';
import {
  SKIN_COMPLEXIONS,
  EYE_IRIS_COLORS,
  HAIRSTYLES,
  FACIAL_HAIRS,
  SCAR_ACCESSORIES,
  TATTOO_PAINTS,
  ELEMENTAL_INFUSIONS,
  stepPendulumGrapple,
  evaluateShinogiZukuriProfile,
  evaluateFourierHakamaRadius,
} from './characterCustomization';

test('Arsenal contains all 30 primary/secondary/ranged weapons, 4 throwables, 35 compendium items, and 12 complete outfit sets', () => {
  assert.equal(WEAPONS.length, 30, 'Should have 30 primary/secondary/ranged weapons');
  assert.equal(THROWABLES.length, 4, 'Should have 4 throwable ninjutsu tools');
  assert.equal(
    TWENTY_AUTHENTIC_ARSENAL.length,
    35,
    'Should have all 35 authentic arsenal compendium items'
  );
  assert.equal(ARMORS.length, 12, 'Should have 12 complete mix-and-match Samurai outfit sets');

  const bladed = WEAPONS.filter((w) => w.category === 'bladed');
  const polearms = WEAPONS.filter((w) => w.category === 'polearm_heavy');
  const ranged = WEAPONS.filter((w) => w.category === 'ranged');

  assert.ok(bladed.length >= 10, 'Should have at least 10 bladed melee weapons');
  assert.ok(polearms.length >= 10, 'Should have at least 10 polearm/heavy weapons');
  assert.ok(ranged.length >= 7, 'Should have at least 7 ranged weapons');

  for (const w of WEAPONS) {
    assert.ok(
      w.damage > 0 && w.postureDamage > 0 && w.reach > 0,
      `Weapon ${w.name} has valid stats`
    );
    assert.ok(
      w.metricSpecs.length > 5 && w.aiPrompt.length > 20,
      `Weapon ${w.name} has metric specs and AI prompt`
    );
  }
});

test('3D Character & Face Customization Studio options and Mathematical Parametric Surface equations are accurate', () => {
  assert.equal(SKIN_COMPLEXIONS.length, 8, 'Should have 8 SSS skin complexions');
  assert.equal(EYE_IRIS_COLORS.length, 12, 'Should have 12 eye iris colors for heterochromia');
  assert.equal(HAIRSTYLES.length, 10, 'Should have 10 procedural 3D hairstyles');
  assert.equal(FACIAL_HAIRS.length, 5, 'Should have 5 facial hair styles');
  assert.equal(SCAR_ACCESSORIES.length, 5, 'Should have 5 scars and Date Masamune eyepatch');
  assert.equal(TATTOO_PAINTS.length, 4, 'Should have 4 Irezumi tattoos and face paints');
  assert.equal(ELEMENTAL_INFUSIONS.length, 6, 'Should have none + 5 elemental weapon infusions');

  // Verify Shinogi-Zukuri parabolic Sori y(z) = s_max * (z/L)^2.15 and taper W(z)
  const moto = evaluateShinogiZukuriProfile(0, 1.0, 0.034, 0.025);
  const kissaki = evaluateShinogiZukuriProfile(0.9, 1.0, 0.034, 0.025);
  assert.equal(moto.soriY, 0, 'Sori deflection at Tsuba (z=0) must be 0');
  assert.ok(kissaki.soriY > 0.015, 'Sori deflection near tip must curve upward');
  assert.ok(kissaki.width < moto.width, 'Blade width must taper from Moto-haba to Saki-haba');

  // Verify Fourier 7-Pleat Hakama radius R(theta, y)
  const rWaist = evaluateFourierHakamaRadius(0, 0, 0.18, 0.26);
  const rMidPleat = evaluateFourierHakamaRadius(0, 0.5, 0.18, 0.26);
  assert.ok(rMidPleat > rWaist, 'Hakama radius should flare and pleat along y');

  // Verify Kaginawa Grappling Hook pendulum ODE solver: L*theta'' + g*sin(theta) + b*theta' = 0
  const step1 = stepPendulumGrapple(-0.6, 0, 10.0, 0.05);
  assert.ok(step1.omega > 0, 'Pendulum released at negative angle must accelerate toward nadir');
});

test('Armor and Kabuto customization alters computed Samurai stats accurately', () => {
  const katana = WEAPONS[0];
  const roninHaori = ARMORS.find((a) => a.id === 'ronin_haori')!;
  const oyoroi = ARMORS.find((a) => a.id === 'samurai_oyoroi')!;
  const ghostPaper = ARMORS.find((a) => a.id === 'ghost_paper')!;
  const kasa = HELMETS.find((h) => h.id === 'kasa')!;
  const oniKabuto = HELMETS.find((h) => h.id === 'oni_kabuto')!;

  const agileStats = computeSamuraiStats(katana, roninHaori, kasa);
  const tankStats = computeSamuraiStats(katana, oyoroi, oniKabuto);
  const mythicStats = computeSamuraiStats(katana, ghostPaper, oniKabuto);

  assert.ok(agileStats.moveSpeed > tankStats.moveSpeed, 'Ronin Haori should move faster than O-Yoroi');
  assert.ok(
    tankStats.defensePercent > agileStats.defensePercent,
    'O-Yoroi + Oni Kabuto should have higher defense'
  );
  assert.ok(
    mythicStats.attackPower > agileStats.attackPower,
    'Ghost Paper Armor should boost attack power'
  );
});

test('AdaptiveAIBrain mutates FSM weights based on melee spam, ranged dependency, and jump frequency', () => {
  const brain = new AdaptiveAIBrain();
  const baseSnap = brain.getSnapshot(1000);

  for (let i = 0; i < 10; i++) {
    brain.recordMeleeAttack(1100 + i * 120, 35);
  }
  const meleeSnap = brain.getSnapshot(2500);
  assert.ok(
    meleeSnap.autoParryProb > baseSnap.autoParryProb,
    'Auto-parry probability should increase when player spams melee'
  );
  assert.ok(
    meleeSnap.hyperArmorProb > baseSnap.hyperArmorProb,
    'Hyper-armor probability should increase when player spams melee'
  );

  const rangedBrain = new AdaptiveAIBrain();
  for (let i = 0; i < 8; i++) {
    rangedBrain.recordRangedOrThrowableAttack(1000 + i * 200, 65);
  }
  const rangedSnap = rangedBrain.getSnapshot(3000);
  assert.ok(
    rangedSnap.zigZagSprintProb > baseSnap.zigZagSprintProb,
    'Zig-zag sprint probability should increase when player relies on ranged attacks'
  );
  assert.ok(
    rangedSnap.arrowDeflectProb > baseSnap.arrowDeflectProb,
    'Arrow deflect probability should increase when player relies on ranged attacks'
  );

  for (let i = 0; i < 5; i++) {
    rangedBrain.recordJump(3100 + i * 150);
  }
  const jumpSnap = rangedBrain.getSnapshot(4000);
  assert.ok(
    jumpSnap.antiAirSlashProb > baseSnap.antiAirSlashProb,
    'Anti-air upward slash probability should increase when player jumps frequently'
  );

  for (let i = 0; i < 12; i++) {
    rangedBrain.recordDodgeOrMoveBias('left');
  }
  const dodgeSnap = rangedBrain.getSnapshot(4100);
  assert.equal(dodgeSnap.preferredDodgeVector, 'left', 'Preferred dodge vector should track left bias');
  assert.ok(dodgeSnap.dodgePredictProb > 0.3, 'Dodge prediction probability should scale with dominance');
});

test('10-Biome Infinite-Looping Campaign and 15 Enemy Archetypes have valid bosses and policies', () => {
  assert.equal(CAMPAIGN_STAGES.length, 10, 'Campaign must have 10 distinct biomes');
  assert.equal(
    Object.keys(ENEMY_ARCHETYPES).length,
    15,
    'Must have all 15 enemy archetypes including the 6 new elite archetypes'
  );
  const policies = new Set(Object.values(ENEMY_ARCHETYPES).map((e) => e.policy));
  assert.ok(policies.size >= 4, 'Enemy archetypes must implement at least 4 distinct AI policies');
  assert.ok(ENEMY_ARCHETYPES.tengu_crow_warrior, 'Tengu Crow-Warrior elite archetype exists');
  assert.ok(ENEMY_ARCHETYPES.takeda_cavalry, 'Takeda Mounted Cavalry elite archetype exists');
});

import * as THREE from 'three';
import {
  evaluateDifferentialKatanaPoint,
  createDifferentialKatanaGeometry,
  VERIFIED_3D_ASSET_PRESETS,
} from './assetManager';
import {
  computeAerodynamicDragForce,
  solveTwoBoneIK,
  sliceBufferGeometryByPlane,
  VerletClothSheet,
} from './multiPhysics';
import {
  SIX_COMBAT_MOVES,
  evaluateSixMoveCombatTrajectory,
  generateEightBladeRays,
  evaluateSekiroDeflectAngle,
} from './combatSplinesAndShaders';

test('Differential Katana Surface P(u,v), Multi-Physics (Drag, 2-Bone IK, Verlet Cloth, Zandatsu Slicing), and 6-Move Hermite Splines', () => {
  const bladeParams = {
    length: 0.95,
    motoWidth: 0.034,
    sakiWidth: 0.024,
    thickness: 0.0075,
    alphaCosh: 0.018,
    betaCosh: 1.4,
  };

  // 1. Differential Katana surface P(u,v) = (x(u,v), y(u) + alpha*cosh(beta*u), z(u,v))^T
  const basePt = evaluateDifferentialKatanaPoint(0, 0, 1, bladeParams);
  const tipEdgePt = evaluateDifferentialKatanaPoint(1, 1, 1, bladeParams);
  assert.ok(tipEdgePt.y > basePt.y, 'Cosh differential Sori curve must elevate blade toward Kissaki');
  assert.equal(
    Math.abs(tipEdgePt.x) < 1e-5,
    true,
    'Ha razor edge thickness w(v) must converge to 0 at v=1'
  );

  const katanaGeo = createDifferentialKatanaGeometry(bladeParams, 24, 8);
  assert.ok(
    katanaGeo.attributes.position.count > 100,
    'Differential Katana geometry generates high-density vertex buffer with Hamon attributes'
  );
  assert.ok(VERIFIED_3D_ASSET_PRESETS.length >= 6, 'Includes verified CORS-safe 3D asset presets');

  // 2. Aerodynamic drag F_drag = -0.5 * rho * ||v|| * v * C_d * A
  const drag = computeAerodynamicDragForce({ x: 30, y: 0, z: 0 });
  assert.ok(drag.fx < 0 && Math.abs(drag.fy) < 1e-6, 'Quadratic drag opposes velocity vector');

  // 3. Analytical 2-Bone Inverse Kinematics (Law of Cosines)
  const ik = solveTwoBoneIK(
    { x: 0, y: 1.0, z: 0 },
    { x: 0, y: 0.2, z: 0.35 },
    { x: 0, y: 0.5, z: 1.0 },
    0.48,
    0.48
  );
  const distToTarget = Math.hypot(
    ik.endEffectorPos.x - 0,
    ik.endEffectorPos.y - 0.2,
    ik.endEffectorPos.z - 0.35
  );
  assert.ok(distToTarget < 0.02, '2-Bone IK analytical solver reaches target within limb length');

  // 4. 3D Verlet Cloth Sheet solver
  const clothMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
  const cloth = new VerletClothSheet(0.6, 0.7, 6, 6, clothMat);
  cloth.step(1 / 60, { x: 4, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 3);
  assert.equal(cloth.currPos.length, 7 * 7 * 3, 'Verlet cloth updates 3D particle positions');

  // 5. Real-Time Planar Mesh Slicing (Zandatsu Bisection)
  const sliceSource = createDifferentialKatanaGeometry(bladeParams, 12, 6);
  const sliced = sliceBufferGeometryByPlane(
    sliceSource,
    new THREE.Vector3(0, 0.45, 0),
    new THREE.Vector3(0, 1, 0)
  );
  assert.ok(
    sliced.upperTriCount > 0 && sliced.lowerTriCount > 0,
    'Zandatsu planar bisection splits mesh into upper and lower geometries with cross-section caps'
  );

  // 6. 6-Move Combat System & 8-Ray Blade Raycasting
  const moveList = Object.values(SIX_COMBAT_MOVES);
  assert.equal(moveList.length, 6, 'Each weapon supports all 6 distinct combat moves');
  for (const m of moveList) {
    const poseMid = evaluateSixMoveCombatTrajectory(m.id, 0.5);
    assert.ok(
      typeof poseMid.torsoYawOffset === 'number',
      `Move ${m.id} evaluates Cubic Hermite trajectory`
    );
  }
  const rays = generateEightBladeRays(
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 1 },
    { x: 0, y: 0.9, z: -0.2 },
    { x: 0.4, y: 0.9, z: 0.8 }
  );
  assert.equal(rays.length, 8, 'Generates 8 blade rays from Tsuba to Kissaki');

  const deflect = evaluateSekiroDeflectAngle({ x: 0, z: 0 }, 0, { x: 0, z: 3 });
  assert.equal(
    deflect.isFrontArcDeflect,
    true,
    'Opposing blade vector in front guard arc triggers Sekiro Deflect'
  );
});

import {
  OPEN_WORLD_BIOMES,
  evaluateMultifractalTerrainHeight,
  evaluateWindingTrailFactor,
  classifyOpenWorldBiome,
  evaluateCaveWormTunnelSDF,
  evaluateCatenaryBridgeHeight,
  InfiniteOpenWorldCDLODManager,
} from './openWorldEngine';
import {
  createShinogiZukuriBladeGeometry,
  createMultiBladeGrassClumpGeometry,
  createSegmentedBambooWithNodesGeometry,
} from './proceduralMeshes';
import {
  NANO_BANANA_PBR_PRESETS,
  computeSobelScharrPBRBuffers,
} from './pbrTextureForge';
import {
  DOJO_CURRICULUM_LESSONS,
  evaluateDojoFrameWindowPhase,
  InteractiveComboDojoController,
} from './comboDojoTrainer';
import { sanitizePhysicsVec3 } from './multiPhysics';
import { BILINGUAL_BATTLE_DIALOGUES } from './audioSynth';

test('Infinite Open-World 5x5 CDLOD Chunk Streaming (80m x 80m), 6-Octave Ridged Multifractal fBm Terrain, Winding Trails, 6 Biomes, 3D Cave Worm Tunnels, and Catenary Bridge Sag', () => {
  assert.equal(
    Object.keys(OPEN_WORLD_BIOMES).length,
    6,
    'Open world must define all 6 seamless Japanese archipelago biomes'
  );

  // Verify 5x5 chunk streaming grid (gridRadius = 2 -> 25 chunks of 80m x 80m)
  const worldMgr = new InfiniteOpenWorldCDLODManager();
  assert.equal(worldMgr.chunkSize, 80, 'Each streamed chunk must be 80m x 80m');
  assert.equal(worldMgr.gridRadius, 2, 'Grid radius of 2 streams a 5x5 (25-chunk) active window');

  // Center starting clearing around (0,0) is gently smoothed while outer archipelago rises/carves rivers
  const centerHeight = evaluateMultifractalTerrainHeight(0, 0);
  const outerMountainHeight = evaluateMultifractalTerrainHeight(160, -140);
  assert.ok(Math.abs(centerHeight) < 0.05, 'Starting clearing around origin remains level for clean footing');
  assert.ok(
    Number.isFinite(outerMountainHeight) && Math.abs(outerMountainHeight) > 0.2,
    'Outer terrain evaluates finite 6-octave Ridged Multifractal elevation'
  );

  const trailFactor = evaluateWindingTrailFactor(0, 10);
  assert.ok(trailFactor >= 0 && trailFactor <= 1, 'Winding mountain trail factor evaluates smoothly in [0, 1]');

  // Verify biomes can be classified by elevation and coordinates
  const snowBiome = classifyOpenWorldBiome(200, 200, 15.0);
  const caveBiome = classifyOpenWorldBiome(100, 100, -3.5);
  assert.equal(snowBiome.id, 'snowy_fuji_peaks', 'High elevation classifies as Snowy Mount Fuji Peaks');
  assert.equal(
    caveBiome.id,
    'bioluminescent_crystal_caves',
    'Subterranean cavern classifies as Bioluminescent Crystal Caves'
  );

  // Verify 3D Simplex Worm Tunnel SDF
  const sdfSample = evaluateCaveWormTunnelSDF(60, 1.5, -60);
  assert.ok(Number.isFinite(sdfSample), '3D Simplex Worm Tunnel SDF returns finite signed distance');

  // Verify Catenary & Taiko-bashi Bridge weight sag
  const unloadedArch = evaluateCatenaryBridgeHeight(0.5, 0.1, 2.2, null, 82);
  const loadedArch = evaluateCatenaryBridgeHeight(0.5, 0.1, 2.2, 0.5, 110);
  assert.ok(
    loadedArch < unloadedArch,
    'Bridge height sags dynamically when player/Oni weight load is applied'
  );

  // Verify Unified Single-Edged Shinogi-Zukuri Blade Geometry (5-vertex cross-section along single parabolic Sori curve)
  const bladeGeo = createShinogiZukuriBladeGeometry(1.5, 0.042, 0.095, 0.011, 48);
  assert.equal(
    bladeGeo.attributes.position.count,
    (48 + 1) * 5,
    'Single unified Shinogi-Zukuri blade has exactly 5 vertices per cross-section slice along one Sori curve'
  );
  assert.ok(bladeGeo.attributes.color, 'Unified blade includes wavy Hamon vertex color attribute');

  // Verify Multi-Blade Curved Grass Clump & Segmented Nodal Bamboo Geometries
  const grassGeo = createMultiBladeGrassClumpGeometry(9);
  assert.ok(grassGeo.attributes.position.count > 100, 'Multi-blade grass clump builds 9 curved tapering ribbon blades');
  const bambooGeo = createSegmentedBambooWithNodesGeometry(8.5);
  assert.ok(bambooGeo.attributes.position.count > 400, 'Segmented nodal bamboo builds high-poly LatheGeometry with ring nodes');
});

test('Nano Banana Pro 4-Map Sobel-Scharr PBR Filter Pipeline and 16-Step POM Presets', () => {
  assert.equal(NANO_BANANA_PBR_PRESETS.length, 6, 'Provides 6 PBR & POM material presets');

  const width = 16;
  const height = 16;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = (x * 16) % 256;
      rgba[idx] = val;
      rgba[idx + 1] = val;
      rgba[idx + 2] = val;
      rgba[idx + 3] = 255;
    }
  }

  const buffers = computeSobelScharrPBRBuffers(rgba, width, height, 3.2);
  assert.equal(buffers.normalPixels.length, width * height * 4, 'Generates Tangent-Space Scharr Normal Map RGBA buffer');
  assert.equal(buffers.heightPixels.length, width * height * 4, 'Generates Parallax Height Map RGBA buffer');
  assert.equal(buffers.roughnessPixels.length, width * height * 4, 'Generates Laplacian Cavity/Roughness Map RGBA buffer');
  // Normal Z channel must be positive (> 128 encoded)
  assert.ok(buffers.normalPixels[2] > 128, 'Tangent-space normal Z component points outward (+Z)');
});

test('Interactive Combo Dojo 7-Lesson Curriculum, Frame-Window Timing Bar, and Physics NaN Sanitizer', () => {
  assert.equal(DOJO_CURRICULUM_LESSONS.length, 7, 'Dojo curriculum includes all 6 weapon moves + Mizu-Nagare Deflect');
  const firstLesson = DOJO_CURRICULUM_LESSONS[0];
  assert.equal(evaluateDojoFrameWindowPhase(firstLesson, 0.1), 'startup');
  assert.equal(evaluateDojoFrameWindowPhase(firstLesson, 0.35), 'active_hit');
  assert.equal(evaluateDojoFrameWindowPhase(firstLesson, 0.65), 'cancel_golden');
  assert.equal(evaluateDojoFrameWindowPhase(firstLesson, 0.92), 'recovery');

  const dojo = new InteractiveComboDojoController();
  dojo.setTrainerOpen(true);
  assert.equal(dojo.trainerOpen, true, 'Dojo overlay opens via setTrainerOpen');

  // Execute Lesson 1 (Kesa-Giri) requiredReps (2) times to unlock Mastery Scroll
  dojo.recordPlayerMoveExecution('kesa_giri', 0.65, 48, 28, 1.0);
  const second = dojo.recordPlayerMoveExecution('kesa_giri', 0.65, 52, 30, 1.4);
  assert.equal(second.advancedLesson, true, 'Completing required repetitions advances to next lesson');
  assert.ok(second.newlyUnlockedScroll && second.newlyUnlockedScroll.length > 5, 'Unlocks Mastery Scroll upon lesson completion');

  const snap = dojo.stepGhostMasterAndTelemetry(0.016, new THREE.Vector3(0, 0, 0), 0, null, 2.0);
  assert.equal(snap.unlockedScrolls.length, 1, 'Tracks unlocked Mastery Scrolls');
  assert.equal(snap.activeLessonIndex, 1, 'Advances to Lesson 2 (Gyaku-Kesa)');

  // Verify Physics NaN/Infinity Sanitizer
  const nanSanitized = sanitizePhysicsVec3({ x: Number.NaN, y: 10, z: Number.POSITIVE_INFINITY }, 50, {
    x: 1,
    y: 2,
    z: 3,
  });
  assert.equal(nanSanitized.wasSanitized, true, 'Detects and sanitizes NaN/Infinity coordinates');
  assert.equal(nanSanitized.x, 1);

  const clampedVel = sanitizePhysicsVec3({ x: 300, y: 0, z: 400 }, 50);
  assert.equal(clampedVel.wasSanitized, true, 'Clamps excessive velocity magnitude to maxMagnitude');
  assert.ok(Math.abs(Math.hypot(clampedVel.x, clampedVel.y, clampedVel.z) - 50) < 1e-4);

  assert.ok(
    BILINGUAL_BATTLE_DIALOGUES.katana_wo_nuke && BILINGUAL_BATTLE_DIALOGUES.boss_challenge,
    'Bilingual Japanese battle dialogues are defined'
  );
});



