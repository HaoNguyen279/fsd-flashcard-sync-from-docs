export class AudioManager {
  private audioContext: AudioContext | null = null;
  public soundEnabled: boolean = true;
  private crashSound: HTMLAudioElement | null = null;

  constructor() {
    // Sound starts ON by default
    if (typeof window !== "undefined") {
      try {
        this.crashSound = new Audio("/assets/minecraft-explode1.mp3");
        this.crashSound.preload = "auto";
      } catch (_) {}
    }
  }

  public unlockAudio(): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioContext && typeof window !== "undefined") {
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtor) {
          this.audioContext = new AudioCtor();
        }
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
    } catch (_) {
      // Ignore audio unlock errors
    }
  }

  public playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.05,
    delay: number = 0
  ): void {
    if (!this.soundEnabled || !this.audioContext || this.audioContext.state !== "running") return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const time = this.audioContext.currentTime + delay;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      oscillator.start(time);
      oscillator.stop(time + duration + 0.02);

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch (_) {
      // Ignore audio synthesis errors
    }
  }

  public playCrashSound(): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.crashSound && typeof window !== "undefined") {
        this.crashSound = new Audio("/assets/minecraft-explode1.mp3");
      }
      if (this.crashSound) {
        this.crashSound.currentTime = 0;
        this.crashSound.volume = 0.2;
        this.crashSound.play().catch(() => {});
      }
    } catch (_) {}
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.unlockAudio();
      this.playTone(520, 0.09);
    } else {
      if (this.crashSound) {
        this.crashSound.pause();
      }
    }
    return this.soundEnabled;
  }

  public destroy(): void {
    if (this.crashSound) {
      try {
        this.crashSound.pause();
        this.crashSound.src = "";
      } catch (_) {}
      this.crashSound = null;
    }
    if (this.audioContext) {
      try {
        void this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
  }
}
