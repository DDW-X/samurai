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
