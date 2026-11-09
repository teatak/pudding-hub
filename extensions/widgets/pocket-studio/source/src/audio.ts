// Web Audio API 纯原生音频合成引擎 (零外部体积依赖)
// 包含物理声学建模、双振荡器失谐、调频谐波及多层滤波包络优化

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

// 1. 8-Bit 方波 (经典街机/红白机风格，加入平滑低通滤除尖锐数码毛刺)
export function playSquareWave(freq: number, time: number, duration = 0.12, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(4200, time);

  osc.type = "square";
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.008;
  const release = Math.min(0.04, duration * 0.2);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.28, time + attack);
  gain.gain.setValueAtTime(0.25, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + duration);
}

// 2. 8-Bit 三角波贝斯 (纯正跳跃低音，加入低频共振保持紧凑质感)
export function playTriangleBass(freq: number, time: number, duration = 0.18, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, time);

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);

  const attack = 0.01;
  const release = Math.min(0.05, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.65, time + attack);
  gain.gain.setValueAtTime(0.55, time + sustainTime);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + duration);
}

// 3. 808 底鼓 (Kick): 冲激点击 (Punch Click) + 浑厚超低频下潜 (Sub Body)
export function playKick(time: number, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();

  // 头部破击点击瞬态 (Beater Click)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.frequency.setValueAtTime(320, time);
  clickOsc.frequency.exponentialRampToValueAtTime(70, time + 0.02);
  clickGain.gain.setValueAtTime(0.7, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  clickOsc.connect(clickGain);
  clickGain.connect(masterGain);

  // 主低频下潜音 (Sub Boom)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.frequency.setValueAtTime(140, time);
  subOsc.frequency.exponentialRampToValueAtTime(42, time + 0.28);
  subGain.gain.setValueAtTime(1.0, time);
  subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  subOsc.connect(subGain);
  subGain.connect(masterGain);

  masterGain.connect(output);

  clickOsc.start(time);
  clickOsc.stop(time + 0.02);
  subOsc.start(time);
  subOsc.stop(time + 0.28);
}

// 4. 808 军鼓 (Snare): 扎实鼓身 Thump + 清脆带通响弦 Wire
export function playSnare(time: number, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();

  // 1. 鼓身冲击调谐音 (Tone)
  const toneOsc = ctx.createOscillator();
  const toneGain = ctx.createGain();
  toneOsc.type = "triangle";
  toneOsc.frequency.setValueAtTime(220, time);
  toneOsc.frequency.exponentialRampToValueAtTime(90, time + 0.07);
  toneGain.gain.setValueAtTime(0.65, time);
  toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
  toneOsc.connect(toneGain);
  toneGain.connect(masterGain);

  // 2. 响弦白噪声 (Wire)
  const bufferSize = Math.floor(ctx.sampleRate * 0.16);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1400, time);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.55, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);

  masterGain.connect(output);

  toneOsc.start(time);
  toneOsc.stop(time + 0.07);
  noise.start(time);
  noise.stop(time + 0.16);
}

// 5. 闭镲 (Hi-Hat): 精准带通滤波金属感短促击打
export function playHat(time: number, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.035);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(8500, time);
  filter.Q.setValueAtTime(1.8, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.48, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(output);

  noise.start(time);
  noise.stop(time + 0.035);
}

// 6. 模拟低通滤波低音 (Analog Bass): 双振荡器微失谐 (Detune) + 共振峰低通扫频
export function playAnalogBass(freq: number, time: number, duration = 0.32, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.setValueAtTime(3.2, time); // 饱满的模拟共振峰

  // 滤波器截止频率包络：明亮开门随后快速闭合收拢
  const startFreq = Math.min(3200, Math.max(800, freq * 6));
  const endFreq = Math.max(90, freq * 1.2);
  filter.frequency.setValueAtTime(startFreq, time);
  filter.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

  // 双锯齿波振荡器微失谐 (Detune ±7 音分)，营造饱满立体声感
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq, time);
  osc1.detune.setValueAtTime(-7, time);
  osc2.detune.setValueAtTime(7, time);

  const attack = 0.012;
  const release = Math.min(0.08, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  masterGain.gain.setValueAtTime(0.001, time);
  masterGain.gain.linearRampToValueAtTime(0.72, time + attack);
  masterGain.gain.setValueAtTime(0.62, time + sustainTime);
  masterGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(output);

  osc1.start(time);
  osc1.stop(time + duration);
  osc2.start(time);
  osc2.stop(time + duration);
}

// 7. 柔和拨弦琴 (Soft Pluck): 三角基波 + 弱二次谐波 + 琴弦物理闭合低通
export function playSoftPluck(freq: number, time: number, duration = 0.38, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";

  // 低通滤波器从明亮随拨弦迅速闭合至暗淡柔和
  filter.frequency.setValueAtTime(Math.min(3000, freq * 7), time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), time + duration);

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, time);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, time);

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(0.2, time);
  osc2.connect(osc2Gain);

  const attack = 0.008;
  const release = Math.min(0.07, duration * 0.25);
  const sustainTime = Math.max(attack, duration - release);

  masterGain.gain.setValueAtTime(0.001, time);
  masterGain.gain.linearRampToValueAtTime(0.5, time + attack);
  masterGain.gain.setValueAtTime(0.38, time + sustainTime);
  masterGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc1.connect(filter);
  osc2Gain.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(output);

  osc1.start(time);
  osc1.stop(time + duration);
  osc2.start(time);
  osc2.stop(time + duration);
}

// 8. 钢琴 / 电钢琴 (Piano): 真实声学击弦物理多谐波建模 + 三琴弦同度微失谐 + 琴槌敲击瞬态 + 动态共鸣低通滤波
export function playRhodes(freq: number, time: number, duration = 0.5, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();

  // 1. 真实钢琴琴弦振动频谱 (Fourier Partial Spectrum)
  // 基频与谐波依照大钢琴声学模型严谨递减，彻底摆脱单调塑料的单正弦波哨音
  const n = 16;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  const partials = [0, 1.0, 0.72, 0.48, 0.34, 0.24, 0.16, 0.11, 0.07, 0.045, 0.03, 0.02, 0.012];
  for (let i = 1; i < partials.length; i++) imag[i] = partials[i];
  const pianoWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

  // 2. 声学低通共振滤波 (击弦瞬间高频完全绽放，随后数十毫秒内快速衰减至温润木质琴身频点)
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  const peakCutoff = Math.min(7500, Math.max(2600, freq * 5.2));
  const bodyCutoff = Math.min(2800, Math.max(850, freq * 2.1));
  filter.frequency.setValueAtTime(peakCutoff, time);
  const filterDecay = Math.min(0.22, duration * 0.45);
  filter.frequency.exponentialRampToValueAtTime(bodyCutoff, time + filterDecay);
  filter.Q.setValueAtTime(1.8, time);

  // 3. 三琴弦同度微失谐 (Triple-String Unison Detune: 主弦 + 偏弦 ±2.5 cents，呈现真实三角钢琴的立体感与自然共鸣)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  osc1.setPeriodicWave(pianoWave);
  osc2.setPeriodicWave(pianoWave);
  osc3.setPeriodicWave(pianoWave);

  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq, time);
  osc2.detune.setValueAtTime(2.5, time);
  osc3.frequency.setValueAtTime(freq, time);
  osc3.detune.setValueAtTime(-2.5, time);

  // 4. 击弦打击乐器双阶段衰减包络 (极速 Attack 2.5ms -> 初段能量迅速释放 -> 后段悠长余音指数衰减)
  const stringGain = ctx.createGain();
  const attack = 0.0025;
  const promptDecay = Math.min(0.09, duration * 0.25);
  stringGain.gain.setValueAtTime(0.001, time);
  stringGain.gain.linearRampToValueAtTime(0.48, time + attack);
  stringGain.gain.exponentialRampToValueAtTime(0.28, time + promptDecay);
  stringGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc1.connect(stringGain);
  osc2.connect(stringGain);
  osc3.connect(stringGain);
  stringGain.connect(filter);

  // 5. 琴槌毛毡敲击瞬态 (Hammer Strike Transient: 140Hz 降至 40Hz 的 10ms 物理下键敲击脉冲)
  const hammerOsc = ctx.createOscillator();
  const hammerGain = ctx.createGain();
  hammerOsc.type = "sine";
  hammerOsc.frequency.setValueAtTime(140, time);
  hammerOsc.frequency.exponentialRampToValueAtTime(40, time + 0.012);
  hammerGain.gain.setValueAtTime(0.25, time);
  hammerGain.gain.exponentialRampToValueAtTime(0.001, time + 0.012);

  hammerOsc.connect(hammerGain);
  hammerGain.connect(filter);

  // 6. 输出连接
  masterGain.gain.setValueAtTime(1.0, time);
  filter.connect(masterGain);
  masterGain.connect(output);

  osc1.start(time);
  osc1.stop(time + duration);
  osc2.start(time);
  osc2.stop(time + duration);
  osc3.start(time);
  osc3.stop(time + duration);
  hammerOsc.start(time);
  hammerOsc.stop(time + 0.015);
}

// 9. 木琴 Marimba: 木槌物理打击瞬态 (Click) + 木管谐振与第 4 泛音
export function playMarimba(freq: number, time: number, duration = 0.22, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();

  // 主体木质正弦波
  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = "sine";
  bodyOsc.frequency.setValueAtTime(freq, time);

  bodyGain.gain.setValueAtTime(0.7, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  bodyOsc.connect(bodyGain);
  bodyGain.connect(masterGain);

  // 第 4 谐波泛音 (木琴物理声学特性)
  const harmonicOsc = ctx.createOscillator();
  const harmonicGain = ctx.createGain();
  harmonicOsc.type = "sine";
  harmonicOsc.frequency.setValueAtTime(freq * 3.98, time);

  const harmonicDur = Math.min(0.045, duration * 0.35);
  harmonicGain.gain.setValueAtTime(0.18, time);
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, time + harmonicDur);

  harmonicOsc.connect(harmonicGain);
  harmonicGain.connect(masterGain);

  // 软木槌敲击瞬态 (Click Transient)
  const clickBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.006), ctx.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < clickData.length; i++) clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickData.length);

  const clickSource = ctx.createBufferSource();
  clickSource.buffer = clickBuffer;
  const clickFilter = ctx.createBiquadFilter();
  clickFilter.type = "bandpass";
  clickFilter.frequency.setValueAtTime(1400, time);
  clickFilter.Q.setValueAtTime(2, time);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.3, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.006);

  clickSource.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(masterGain);

  masterGain.connect(output);

  bodyOsc.start(time);
  bodyOsc.stop(time + duration);
  harmonicOsc.start(time);
  harmonicOsc.stop(time + harmonicDur);
  clickSource.start(time);
  clickSource.stop(time + 0.006);
}
