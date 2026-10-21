// Web Audio API 纯原生音频合成引擎 (零外部体积依赖)

let audioCtx: AudioContext | null = null;

export function audioState() {
  return audioCtx?.state ?? "uninitialized";
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

// 1. 8-Bit 方波 (马里奥、大金刚等经典街机/红白机声音，支持持续时长)
export function playSquareWave(freq: number, time: number, duration = 0.12) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(freq, time);

  // ADSR 包络：快速启动 (0.008s)，根据 duration 维持延音，并在末尾平滑释放
  const attack = 0.008;
  const release = Math.min(0.04, duration * 0.2);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.28, time + attack);
  gain.gain.setValueAtTime(0.25, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// 2. 8-Bit 三角波贝斯 (纯正跳跃低音，支持持续时长)
export function playTriangleBass(freq: number, time: number, duration = 0.18) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.01;
  const release = Math.min(0.05, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.65, time + attack);
  gain.gain.setValueAtTime(0.55, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// 3. 808 底鼓 (Kick): 快速频率俯冲下潜
export function playKick(time: number) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);

  gain.gain.setValueAtTime(1.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.35);
}

// 4. 808 军鼓 (Snare): 白噪声 + 调谐三角波
export function playSnare(time: number) {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 0.18;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 950;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 0.18);
}

// 5. 闭镲 (Hi-Hat): 高通滤波金属感短促白噪声
export function playHat(time: number) {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 0.04;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7500;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 0.04);
}

// 6. 模拟低通滤波低音 (Sub Bass，支持持续时长)
export function playAnalogBass(freq: number, time: number, duration = 0.32) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450, time);
  filter.frequency.exponentialRampToValueAtTime(100, time + duration);

  const attack = 0.015;
  const release = Math.min(0.08, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.8, time + attack);
  gain.gain.setValueAtTime(0.7, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// 7. 柔和五声音阶琴 (支持持续时长)
export function playSoftPluck(freq: number, time: number, duration = 0.38) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.01;
  const release = Math.min(0.06, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.42, time + attack);
  gain.gain.setValueAtTime(0.35, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// 8. 电钢琴 Rhodes (支持持续时长)
export function playRhodes(freq: number, time: number, duration = 0.5) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.015;
  const release = Math.min(0.1, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.5, time + attack);
  gain.gain.setValueAtTime(0.4, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// 9. 木琴 Marimba (支持持续时长)
export function playMarimba(freq: number, time: number, duration = 0.22) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0.65, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}
