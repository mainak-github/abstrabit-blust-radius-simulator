class SoundManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playStart() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Play double warning beep
      this.beep(880, 0.15, "sine", now);
      this.beep(880, 0.15, "sine", now + 0.2);
    } catch {
      // Ignore autoplay errors
    }
  }

  playUpdate() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Play a soft high-pitched tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(1600, now);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore
    }
  }

  playSuccess() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Rising major chime (C - E - G - C)
      this.beep(523.25, 0.1, "sine", now); // C5
      this.beep(659.25, 0.1, "sine", now + 0.08); // E5
      this.beep(783.99, 0.1, "sine", now + 0.16); // G5
      this.beep(1046.50, 0.25, "sine", now + 0.24); // C6
    } catch {
      // Ignore
    }
  }

  playFailure() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Low buzzing alarm
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(110, now);
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch {
      // Ignore
    }
  }

  private beep(freq: number, duration: number, type: OscillatorType = "sine", time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(freq, time);
    osc.type = type;
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }
}

export const sounds = new SoundManager();
