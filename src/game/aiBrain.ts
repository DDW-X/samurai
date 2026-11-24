export type DodgeDirection = 'left' | 'right' | 'back' | 'forward';

export interface AIAdaptationSnapshot {
  meleeSpamRate: number; // 0.0 to 1.0
  rangedDependency: number; // 0.0 to 1.0
  preferredDodgeVector: DodgeDirection;
  parryTimingAccuracy: number; // 0.0 to 1.0
  jumpFrequency: number; // 0.0 to 1.0
  // Derived FSM Mutation Weights
  autoParryProb: number;
  hyperArmorProb: number;
  zigZagSprintProb: number;
  arrowDeflectProb: number;
  antiAirSlashProb: number;
  feintDelayProb: number;
  dodgePredictProb: number;
  activePostureStance: string;
  activeCounterCallout: string;
  telegraphColorHex: number;
  adaptationSummary: string;
  learningTier: number; // 1.0 to 2.5 (scales with stage/boss)
}

export class AdaptiveAIBrain {
  private recentMeleeTimestamps: number[] = [];
  private meleeDamageTotal = 10;
  private rangedDamageTotal = 0;
  private dodgeCounts: Record<DodgeDirection, number> = {
    left: 1,
    right: 1,
    back: 2,
    forward: 1,
  };
  private parrySuccesses = 1;
  private parryAttempts = 2;
  private recentJumpTimestamps: number[] = [];
  private learningMultiplier = 1.0;

  public setLearningMultiplier(mult: number) {
    this.learningMultiplier = Math.max(0.5, Math.min(2.5, mult));
  }

  public recordMeleeAttack(nowMs: number, damageDealt = 0) {
    this.recentMeleeTimestamps.push(nowMs);
    this.pruneTimestamps(nowMs);
    this.meleeDamageTotal += Math.max(5, damageDealt);
    this.meleeDamageTotal *= 0.96;
    this.rangedDamageTotal *= 0.96;
  }

  public recordRangedOrThrowableAttack(nowMs: number, damageDealt = 0) {
    this.pruneTimestamps(nowMs);
    this.rangedDamageTotal += Math.max(12, damageDealt);
    this.meleeDamageTotal *= 0.96;
    this.rangedDamageTotal *= 0.96;
  }

  public recordDodgeOrMoveBias(dir: DodgeDirection) {
    this.dodgeCounts[dir] = (this.dodgeCounts[dir] || 0) + 1;
    const total =
      this.dodgeCounts.left +
      this.dodgeCounts.right +
      this.dodgeCounts.back +
      this.dodgeCounts.forward;
    if (total > 30) {
      this.dodgeCounts.left *= 0.8;
      this.dodgeCounts.right *= 0.8;
      this.dodgeCounts.back *= 0.8;
      this.dodgeCounts.forward *= 0.8;
    }
  }

  public recordParryAttempt(succeeded: boolean) {
    this.parryAttempts += 1;
    if (succeeded) {
      this.parrySuccesses += 1;
    }
    if (this.parryAttempts > 20) {
      this.parryAttempts *= 0.75;
      this.parrySuccesses *= 0.75;
    }
  }

  public recordJump(nowMs: number) {
    this.recentJumpTimestamps.push(nowMs);
    this.pruneTimestamps(nowMs);
  }

  private pruneTimestamps(nowMs: number) {
    const windowMs = 6000;
    this.recentMeleeTimestamps = this.recentMeleeTimestamps.filter(
      (t) => nowMs - t <= windowMs
    );
    this.recentJumpTimestamps = this.recentJumpTimestamps.filter(
      (t) => nowMs - t <= windowMs
    );
  }

  public getSnapshot(nowMs: number): AIAdaptationSnapshot {
    this.pruneTimestamps(nowMs);

    // 1. Melee spam rate: 11+ swings in 6 seconds => 1.0
    const rawSpam = Math.min(1, this.recentMeleeTimestamps.length / 11);
    const meleeSpamRate = Number(rawSpam.toFixed(2));

    // 2. Ranged dependency: ratio of ranged damage to total damage
    const totalDmg = Math.max(1, this.meleeDamageTotal + this.rangedDamageTotal);
    const rangedDependency = Number(
      Math.min(1, this.rangedDamageTotal / totalDmg).toFixed(2)
    );

    // 3. Preferred dodge vector & dominance ratio
    let preferredDodgeVector: DodgeDirection = 'back';
    let maxCount = -1;
    const dodgeSum = Math.max(
      1,
      this.dodgeCounts.left +
        this.dodgeCounts.right +
        this.dodgeCounts.back +
        this.dodgeCounts.forward
    );
    (Object.keys(this.dodgeCounts) as DodgeDirection[]).forEach((dir) => {
      if (this.dodgeCounts[dir] > maxCount) {
        maxCount = this.dodgeCounts[dir];
        preferredDodgeVector = dir;
      }
    });
    const dodgeDominance = maxCount / dodgeSum;

    // 4. Parry timing accuracy
    const parryTimingAccuracy = Number(
      Math.min(1, this.parrySuccesses / Math.max(1, this.parryAttempts)).toFixed(2)
    );

    // 5. Jump frequency: 5+ jumps in 6 seconds => 1.0
    const jumpFrequency = Number(
      Math.min(1, this.recentJumpTimestamps.length / 5).toFixed(2)
    );

    // Compute mutated FSM weights scaled by stage learningMultiplier
    const mult = this.learningMultiplier;
    const autoParryProb = Number(
      Math.min(0.85, (0.12 + meleeSpamRate * 0.58) * mult).toFixed(2)
    );
    const hyperArmorProb = Number(
      Math.min(0.8, (0.1 + meleeSpamRate * 0.52) * mult).toFixed(2)
    );
    const zigZagSprintProb = Number(
      Math.min(0.9, (0.15 + rangedDependency * 0.68) * mult).toFixed(2)
    );
    const arrowDeflectProb = Number(
      Math.min(0.85, (0.1 + rangedDependency * 0.65) * mult).toFixed(2)
    );
    const antiAirSlashProb = Number(
      Math.min(0.9, (0.1 + jumpFrequency * 0.72) * mult).toFixed(2)
    );
    const feintDelayProb = Number(
      Math.min(0.8, (0.1 + parryTimingAccuracy * 0.55) * mult).toFixed(2)
    );
    const dodgePredictProb = Number(
      Math.min(0.85, (0.15 + dodgeDominance * 0.55) * mult).toFixed(2)
    );

    let activePostureStance = 'Balanced Chudan-no-Kamae';
    let activeCounterCallout = `TRACKING ${preferredDodgeVector.toUpperCase()} STEP`;
    let telegraphColorHex = 0xef4444; // Default crimson telegraph
    let adaptationSummary = `Tracking ${preferredDodgeVector.toUpperCase()} footwork bias (${Math.round(dodgePredictProb * 100)}% intercept)`;

    if (meleeSpamRate >= 0.45 && meleeSpamRate >= rangedDependency) {
      activePostureStance = 'Counter-Parry & Hyper-Armor';
      activeCounterCallout = '危 HYPER-ARMOR RIPOSTE';
      telegraphColorHex = 0xf59e0b; // Gold-amber hyper-armor telegraph
      adaptationSummary = `High Melee Cadence (${Math.round(meleeSpamRate * 100)}%) → Auto-Parry & Hyper-Armor`;
    } else if (rangedDependency >= 0.4) {
      activePostureStance = 'Zig-Zag Wind-Dash & Blade Deflect';
      activeCounterCallout = '疾風 ZIG-ZAG WIND-DASH';
      telegraphColorHex = 0x38bdf8; // Indigo wind-dash telegraph
      adaptationSummary = `Ranged Focus (${Math.round(rangedDependency * 100)}%) → Zig-Zag Sprint & Arrow Deflect`;
    } else if (jumpFrequency >= 0.4) {
      activePostureStance = 'Rising Swallow Anti-Air Slash';
      activeCounterCallout = '燕返 ANTI-AIR RISING SLASH';
      telegraphColorHex = 0xa855f7; // Violet anti-air telegraph
      adaptationSummary = `Frequent Aerials (${Math.round(jumpFrequency * 100)}%) → Anti-Air Upward Slashes`;
    } else if (parryTimingAccuracy >= 0.65) {
      activePostureStance = 'Delayed Feint & Unblockable Sweep';
      activeCounterCallout = '危 DELAYED FEINT CLEAVE';
      telegraphColorHex = 0xec4899; // Crimson-magenta feint telegraph
      adaptationSummary = `Sharp Parries (${Math.round(parryTimingAccuracy * 100)}%) → Delayed Feint Timing`;
    }

    return {
      meleeSpamRate,
      rangedDependency,
      preferredDodgeVector,
      parryTimingAccuracy,
      jumpFrequency,
      autoParryProb,
      hyperArmorProb,
      zigZagSprintProb,
      arrowDeflectProb,
      antiAirSlashProb,
      feintDelayProb,
      dodgePredictProb,
      activePostureStance,
      activeCounterCallout,
      telegraphColorHex,
      adaptationSummary,
      learningTier: mult,
    };
  }
}
