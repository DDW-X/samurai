export class SamuraiAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private bgmInterval: number | null = null;
  private customAudioElement: HTMLAudioElement | null = null;
  private stepIdx = 0;

  // Japanese In-Sen Pentatonic Scale frequencies (D, Eb, G, A, C) across octaves
  private readonly pentatonicFreqs = [
    146.83, 155.56, 196.0, 220.0, 261.63,
    293.66, 311.13, 392.0, 440.0, 523.25,
    587.33, 622.25, 783.99,
  ];

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbientLoop();
      if (this.customAudioElement) {
        this.customAudioElement.pause();
      }
    } else {
      if (this.customAudioElement) {
        this.customAudioElement.play().catch(() => {});
      } else {
        this.startAmbientLoop();
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playCustomLyriaTrack(audioUrl: string) {
    this.stopAmbientLoop();
    if (this.customAudioElement) {
      this.customAudioElement.pause();
    }
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = 0.55;
    this.customAudioElement = audio;
    if (!this.isMuted) {
      audio.play().catch(() => {});
    }
  }

  public startAmbientLoop() {
    if (this.bgmInterval !== null || this.isMuted || this.customAudioElement) return;
    this.bgmInterval = window.setInterval(() => {
      if (this.isMuted || document.body.dataset.state !== 'playing') return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      this.stepIdx++;
      // Koto plucked string every beat
      if (this.stepIdx % 2 === 0 || Math.random() < 0.45) {
        const note =
          this.pentatonicFreqs[
            (this.stepIdx * 3 + Math.floor(Math.random() * 3)) % this.pentatonicFreqs.length
          ];
        this.triggerKotoPluck(ctx, note, 0.045);
      }

      // Shakuhachi breathy flute phrase every 8 steps
      if (this.stepIdx % 8 === 0) {
        const fluteNote = this.pentatonicFreqs[4 + (this.stepIdx % 5)];
        this.triggerShakuhachi(ctx, fluteNote, 1.4, 0.035);
      }

      // Deep Taiko pulse every 4 steps
      if (this.stepIdx % 4 === 0) {
        this.triggerTaiko(ctx, this.stepIdx % 8 === 0 ? 68 : 52, 0.06);
      }
    }, 340);
  }

  public stopAmbientLoop() {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  private triggerKotoPluck(ctx: AudioContext, freq: number, gainVal: number) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.02, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.68);
  }

  private triggerShakuhachi(ctx: AudioContext, freq: number, duration: number, gainVal: number) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.98, now);
    osc.frequency.linearRampToValueAtTime(freq, now + 0.25);

    vibrato.frequency.value = 5.2;
    vibGain.gain.value = 3.5;
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    vibrato.start(now);
    osc.stop(now + duration + 0.05);
    vibrato.stop(now + duration + 0.05);
  }

  private triggerTaiko(ctx: AudioContext, startFreq: number, gainVal: number) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 1.6, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.65, now + 0.28);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playSwordSlash(isHeavy = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchJitter = 0.94 + Math.random() * 0.12;

    // Whoosh noise filter + metallic ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHeavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime((isHeavy ? 260 : 480) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime((isHeavy ? 75 : 140) * pitchJitter, now + (isHeavy ? 0.24 : 0.14));

    gain.gain.setValueAtTime(isHeavy ? 0.14 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.26 : 0.15));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isHeavy ? 0.28 : 0.16));
  }

  public playParryClash(isPerfect = true) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = isPerfect ? [1180, 1760, 2480] : [620, 910];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f * (0.98 + Math.random() * 0.04), now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.85, now + 0.28);

      gain.gain.setValueAtTime(0.08 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  public playBowTwang() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playMatchlockBoom() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // White noise buffer burst + low cannon thump
    const bufferSize = ctx.sampleRate * 0.32;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.31);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playHitImpact(isKill = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.triggerTaiko(ctx, isKill ? 95 : 135, isKill ? 0.18 : 0.11);
  }

  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  /**
   * 3D HRTF Spatial Audio Panner helper: positions sound in 3D space relative to player listener.
   */
  private createSpatialOutNode(
    ctx: AudioContext,
    sourceWorldPos?: { x: number; y: number; z: number },
    listenerWorldPos?: { x: number; y: number; z: number }
  ): AudioNode {
    if (!sourceWorldPos || !listenerWorldPos || typeof ctx.createPanner !== 'function') {
      return ctx.destination;
    }
    try {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3.0;
      panner.maxDistance = 60.0;
      panner.rolloffFactor = 1.2;
      const dx = sourceWorldPos.x - listenerWorldPos.x;
      const dy = sourceWorldPos.y - listenerWorldPos.y;
      const dz = sourceWorldPos.z - listenerWorldPos.z;
      panner.setPosition(
        Number.isFinite(dx) ? dx : 0,
        Number.isFinite(dy) ? dy : 0,
        Number.isFinite(dz) ? dz : 0
      );
      panner.connect(ctx.destination);
      return panner;
    } catch {
      return ctx.destination;
    }
  }

  /**
   * Web Audio Formant Vocal-Tract Synthesizer for Samurai Kiai War Cries ("Ha!", "Sei!", "Teyaa!", "Zandatsu!")
   * Chains sawtooth glottal source + breath burst through 3 parallel Bandpass Formant Filters (F1, F2, F3).
   */
  public playKiaiVocalFormant(
    kiaiType: 'ha' | 'sei' | 'teyaa' | 'zandatsu' | 'kuji_in' = 'ha',
    sourcePos?: { x: number; y: number; z: number },
    listenerPos?: { x: number; y: number; z: number }
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const outNode = this.createSpatialOutNode(ctx, sourcePos, listenerPos);

    const presets: Record<
      typeof kiaiType,
      { f0Start: number; f0End: number; dur: number; formants: [number, number, number] }
    > = {
      ha: { f0Start: 158, f0End: 118, dur: 0.24, formants: [780, 1220, 2550] },
      sei: { f0Start: 185, f0End: 145, dur: 0.28, formants: [480, 1980, 2720] },
      teyaa: { f0Start: 210, f0End: 132, dur: 0.42, formants: [720, 1620, 2650] },
      zandatsu: { f0Start: 142, f0End: 96, dur: 0.48, formants: [680, 1340, 2420] },
      kuji_in: { f0Start: 112, f0End: 108, dur: 0.55, formants: [360, 920, 2150] },
    };

    const cfg = presets[kiaiType] || presets.ha;
    const glottal = ctx.createOscillator();
    glottal.type = 'sawtooth';
    glottal.frequency.setValueAtTime(cfg.f0Start, now);
    glottal.frequency.exponentialRampToValueAtTime(cfg.f0End, now + cfg.dur);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.11, now + 0.025);
    masterGain.gain.exponentialRampToValueAtTime(0.0008, now + cfg.dur);
    masterGain.connect(outNode);

    cfg.formants.forEach((fFreq, idx) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fFreq, now);
      bp.Q.setValueAtTime(6.5 + idx * 2, now);

      const fGain = ctx.createGain();
      fGain.gain.value = 1 / (idx + 1);

      glottal.connect(bp);
      bp.connect(fGain);
      fGain.connect(masterGain);
    });

    glottal.start(now);
    glottal.stop(now + cfg.dur + 0.03);
  }

  /**
   * Deep Sub-Bass & Formant Growl Synthesizer for Mythological Yokai (Oni Warlords, Jorogumo, Gashadokuro, Mizuchi).
   */
  public playYokaiRoarFormant(
    yokaiType: 'oni' | 'jorogumo' | 'gashadokuro' | 'tengu' | 'mizuchi' = 'oni',
    sourcePos?: { x: number; y: number; z: number },
    listenerPos?: { x: number; y: number; z: number }
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const outNode = this.createSpatialOutNode(ctx, sourcePos, listenerPos);

    const basePitch =
      yokaiType === 'gashadokuro'
        ? 48
        : yokaiType === 'oni'
          ? 64
          : yokaiType === 'mizuchi'
            ? 88
            : yokaiType === 'tengu'
              ? 240
              : 175;
    const dur = yokaiType === 'gashadokuro' ? 0.85 : 0.58;

    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(basePitch * 1.25, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch * 0.65, now + dur);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(yokaiType === 'jorogumo' ? 44 : 22, now);
    modGain.gain.setValueAtTime(basePitch * 0.35, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(basePitch * 4.2, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(outNode);

    osc.start(now);
    mod.start(now);
    osc.stop(now + dur + 0.04);
    mod.stop(now + dur + 0.04);
  }

  /**
   * Hybrid Japanese Voice & Dialogue Synthesizer (`window.speechSynthesis` `ja-JP` with Formant Vocal-Tract fallback).
   */
  public speakJapaneseBattleLine(
    japaneseRomaji: string,
    japaneseKanji: string,
    pitch = 0.82,
    rate = 1.05,
    sourcePos?: { x: number; y: number; z: number },
    listenerPos?: { x: number; y: number; z: number }
  ) {
    if (this.isMuted) return;
    // Always trigger subtle vocal formant resonance so audio is immediate even in headless/no-TTS browsers
    this.playKiaiVocalFormant('ha', sourcePos, listenerPos);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(japaneseKanji || japaneseRomaji);
        utter.lang = 'ja-JP';
        utter.pitch = pitch;
        utter.rate = rate;
        utter.volume = 0.65;
        window.speechSynthesis.speak(utter);
      } catch {
        // Fallback already handled via formant synthesizer
      }
    }
  }
}

export interface BilingualBattleDialogue {
  id: string;
  speaker: string;
  japaneseKanji: string;
  romaji: string;
  english: string;
  category: 'patrol_alert' | 'flank_order' | 'archer_volley' | 'boss_challenge' | 'samurai_kiai' | 'kuji_in';
}

export const BILINGUAL_BATTLE_DIALOGUES: Record<string, BilingualBattleDialogue> = {
  katana_wo_nuke: {
    id: 'katana_wo_nuke',
    speaker: 'Ronin Patrol Captain',
    japaneseKanji: '刀を抜け！曲者だ！',
    romaji: 'Katana wo nuke! Kusemono da!',
    english: 'Draw your blades! Intruder sighted!',
    category: 'patrol_alert',
  },
  kakome: {
    id: 'kakome',
    speaker: 'Ashigaru Vanguard',
    japaneseKanji: '囲め！退路を断て！',
    romaji: 'Kakome! Tairo wo tate!',
    english: 'Surround him! Cut off his retreat!',
    category: 'flank_order',
  },
  yumi_tai_hanate: {
    id: 'yumi_tai_hanate',
    speaker: 'Bandit Marksman Commander',
    japaneseKanji: '弓隊、放て！火矢を浴びせよ！',
    romaji: 'Yumi-tai, hanate! Hiya wo abiseyo!',
    english: 'Archers, loose! Rain fire arrows upon him!',
    category: 'archer_volley',
  },
  boss_challenge: {
    id: 'boss_challenge',
    speaker: 'Yokai Warlord',
    japaneseKanji: '貴様の剣、見せてみろ…墨の刃で散れ！',
    romaji: 'Kisama no ken, misete miro... Sumi no yaiba de chire!',
    english: 'Show me your blade... Scatter before the Ink Edge!',
    category: 'boss_challenge',
  },
  samurai_zandatsu: {
    id: 'samurai_zandatsu',
    speaker: 'Kensei (Player)',
    japaneseKanji: '一刀両断・残奪！',
    romaji: 'Itto Ryodan — Zandatsu!',
    english: 'One Stroke, Two Halves — Sever!',
    category: 'samurai_kiai',
  },
  kuji_in_mantra: {
    id: 'kuji_in_mantra',
    speaker: 'Kensei (Player)',
    japaneseKanji: '臨・兵・闘・者・皆・陣・列・在・前！',
    romaji: 'Rin · Pyo · To · Sha · Kai · Jin · Retsu · Zai · Zen!',
    english: 'Nine Syllables of Kuji-in: Awaken the Inner Ki!',
    category: 'kuji_in',
  },
};

