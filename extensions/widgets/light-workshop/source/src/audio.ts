// Tiny synthesized cues; no downloaded samples and no audio before a user gesture.
let context: AudioContext | null = null;
const voices = new Set<OscillatorNode>();
export async function unlockAudio(): Promise<boolean> {
  try {
    context ||= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch { return false; }
}
export function silence() {
  for (const voice of voices) { voice.stop(); voice.disconnect(); }
  voices.clear();
}
export function cue(kind: 'rotate' | 'blocked' | 'solved') {
  if (!context || context.state !== 'running') return;
  silence();
  const notes = kind === 'solved' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'blocked' ? [220, 196] : [740, 988];
  notes.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(), gain = context!.createGain();
    const start = context!.currentTime + i * (kind === 'solved' ? 0.11 : 0.035);
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(kind === 'solved' ? 0.07 : 0.035, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    oscillator.connect(gain); gain.connect(context!.destination); voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator); };
    oscillator.start(start); oscillator.stop(start + 0.27);
  });
}
export function disposeAudio() { silence(); const old = context; context = null; return old?.close(); }
