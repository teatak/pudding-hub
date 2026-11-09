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

// 8. 经典电钢琴 (Rhodes EPiano): 音簧金属敲击钟鸣瞬态 (Tine Bell Chime) + 暖色谐波振荡 + 真实按住保持 (Sustain) 与松开制音 (Damper Release)
export function playRhodes(freq: number, time: number, duration = 0.5, ctx: BaseAudioContext = getAudioContext(), output: AudioNode = ctx.destination) {
  const masterGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";

  // 1. 动态温和低通滤波 (起音明亮，按住时平滑保留温润音簧质感)
  const peakCutoff = Math.min(6500, Math.max(2200, freq * 4.8));
  const bodyCutoff = Math.min(2600, Math.max(800, freq * 2.0));
  filter.frequency.setValueAtTime(peakCutoff, time);
  const filterDecay = Math.min(0.25, duration * 0.4);
  filter.frequency.exponentialRampToValueAtTime(bodyCutoff, time + filterDecay);
  filter.Q.setValueAtTime(1.2, time);

  // 2. 金属音簧触键钟鸣瞬态 (Tine Bell Chime: 5.0x 谐波，约 35ms 迅速收束)
  const chimeOsc = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  chimeOsc.type = "sine";
  chimeOsc.frequency.setValueAtTime(freq * 5.0, time);
  chimeGain.gain.setValueAtTime(0.32, time);
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);
  chimeOsc.connect(chimeGain);
  chimeGain.connect(filter);

  // 3. 音簧主体振荡器 (基音 + 2次暖谐波)
  const oscBase = ctx.createOscillator();
  oscBase.type = "sine";
  oscBase.frequency.setValueAtTime(freq, time);

  const oscHarmonic = ctx.createOscillator();
  oscHarmonic.type = "sine";
  oscHarmonic.frequency.setValueAtTime(freq * 2.0, time);
  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.24, time);
  harmGain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(1.2, duration));
  oscHarmonic.connect(harmGain);
  harmGain.connect(filter);

  // 4. 真实物理触键包络：按住保持 (Sustain) + 抬起制音 (Release)
  const stringGain = ctx.createGain();
  const attack = 0.003;
  const releaseTime = 0.08;
  const totalDuration = duration + releaseTime;

  stringGain.gain.setValueAtTime(0.0001, time);
  stringGain.gain.linearRampToValueAtTime(0.55, time + attack);
  // 按住期间 (Hold/Sustain): 随机械阻尼自然微衰减，不提前掉电
  const holdDecayTarget = Math.max(0.25, 0.55 * Math.exp(-duration * 0.45));
  stringGain.gain.exponentialRampToValueAtTime(holdDecayTarget, time + duration);
  // 松键制音 (Release/Damper): 制音器回落贴紧，80ms 内平滑消退
  stringGain.gain.exponentialRampToValueAtTime(0.0001, time + totalDuration);

  oscBase.connect(stringGain);
  stringGain.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(output);

  // 5. 启动与停止管理
  oscBase.start(time);
  oscBase.stop(time + totalDuration + 0.01);
  oscHarmonic.start(time);
  oscHarmonic.stop(time + totalDuration + 0.01);
  chimeOsc.start(time);
  chimeOsc.stop(time + 0.045);
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
