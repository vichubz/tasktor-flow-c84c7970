// Celebratory task completion fanfare using Web Audio API
// 4-note ascending fanfare: C5 → E5 → G5 → C6 with harmonic overtones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, gain: number, master: GainNode) {
  // Fundamental
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(0.01, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.connect(g);
  g.connect(master);
  osc.start(startTime);
  osc.stop(startTime + duration);

  // Soft harmonic overtone (octave above, quieter)
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, startTime);
  g2.gain.setValueAtTime(0.01, startTime);
  g2.gain.linearRampToValueAtTime(gain * 0.15, startTime + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.7);
  osc2.connect(g2);
  g2.connect(master);
  osc2.start(startTime);
  osc2.stop(startTime + duration);
}

export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.22, now);
    master.connect(ctx.destination);

    // C5 → E5 → G5 → C6 ascending fanfare
    playTone(ctx, 523, now, 0.25, 0.6, master);        // C5
    playTone(ctx, 659, now + 0.12, 0.25, 0.55, master); // E5
    playTone(ctx, 784, now + 0.24, 0.3, 0.5, master);   // G5
    playTone(ctx, 1047, now + 0.38, 0.45, 0.55, master); // C6 — longer sustain for finale
  } catch {
    // Audio not supported — fail silently
  }
}
