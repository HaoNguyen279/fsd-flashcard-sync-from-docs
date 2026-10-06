// Lightweight UI sound effects synthesized with the Web Audio API (no audio files needed).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Short, pleasant two-note "ding" for a correct answer. */
export function playCorrectSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 1046.5, t, 0.18, 0.12, "triangle"); // C6
    tone(ctx, 1568.0, t + 0.09, 0.32, 0.1, "triangle"); // G6
  } catch {
    // ignore audio errors (autoplay policies, unsupported browsers, ...)
  }
}
