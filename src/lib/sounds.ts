// Synthesized task completion sound using Web Audio API
// A pleasant ascending chime: two short tones going up

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Master gain
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.connect(ctx.destination);

    // Note 1: C5 (523 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523, now);
    gain1.gain.setValueAtTime(0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(master);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: E5 (659 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659, now + 0.1);
    gain2.gain.setValueAtTime(0.01, now);
    gain2.gain.setValueAtTime(0.6, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);

    // Note 3: G5 (784 Hz) — final bright tone
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(784, now + 0.2);
    gain3.gain.setValueAtTime(0.01, now);
    gain3.gain.setValueAtTime(0.5, now + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc3.connect(gain3);
    gain3.connect(master);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.5);
  } catch (e) {
    // Audio not supported — fail silently
  }
}
