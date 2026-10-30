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
}
