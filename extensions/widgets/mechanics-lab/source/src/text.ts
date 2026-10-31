/**
 * ============================================================================
 * 经典力学实验室 (Mechanics Lab) — 多语言国际化词典 (`src/text.ts`)
 * ============================================================================
 * 仅存放宿主公共外壳的通用文案（按钮、能量守恒标签、时间控制、MCP 接口说明）。
 * 各实验台专属的参数名称、预设说明与原理解析封装在各自的 `src/benches/*.tsx` 中，
 * 保证增删实验台时无需在全局词典中堆砌耦合字段。
 */

export type LocaleKey = "zh-CN" | "zh-TW" | "en";

let currentLocale: LocaleKey = "zh-CN";

export function setLocale(raw?: string): void {
  if (!raw) return;
  const lower = raw.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.includes("hant")) {
    currentLocale = "zh-TW";
  } else if (lower.startsWith("zh")) {
    currentLocale = "zh-CN";
  } else {
    currentLocale = "en";
  }
}

export function getLocale(): LocaleKey {
  return currentLocale;
}

export const UI_DICT: Record<LocaleKey, Record<string, string>> = {
  "zh-CN": {
    appTitle: "经典力学实验室",
    appBadge: "模块化物理引擎 · 实时受力与能量透视",
    btnPlay: "开始实验",
    btnPause: "暂停定格",
    btnReset: "重置初态",
    btnStep: "单步 +0.02s",
    speedNormal: "1.0x 常速",
    speedSlow: "0.25x 慢镜",
    toggleVectors: "受力矢量图",
    toggleGrid: "坐标标尺",
    toggleSound: "实验音效",
    energyTitle: "机械能守恒实时监测 (E = Ek + Ep + Q)",
    energyKinetic: "动能 Ek",
    energyPotential: "势能 Ep",
    energyThermal: "摩擦内能 Q",
    energyTotal: "总能 E总",
    panelParams: "实验参数调节",
    panelPresets: "经典教学预设场景",
    panelTelemetry: "实时物理量测量仪",
    panelWaveform: "纸带打点 / 实时波形记录仪",
    panelPrinciple: "核心物理原理解析",
    statusRunning: "实验进行中",
    statusPaused: "已定格暂停",
    statusCompleted: "单次实验完成",
    descReadLab: "读取当前激活的物理实验台、参数配置、实时物理量读数、机械能分解与教学诊断结论。",
    descConfigureExperiment: "切换实验台（ramp / projectile / collision / harmonic）并批量设置物理参数，可选自动启动实验。",
    descLoadPreset: "加载当前实验台或指定实验台的经典教学预设场景（如临界摩擦角、平抛对比、完全非弹性碰撞等）。",
    descControlSimulation: "控制物理仿真时钟：play（播放）、pause（暂停定格）、reset（重置回 t=0）、step（单步推进 0.02 秒）或切换慢动作。",
  },
  "zh-TW": {
    appTitle: "經典力學實驗室",
    appBadge: "模組化物理引擎 · 即時受力與能量透視",
    btnPlay: "開始實驗",
    btnPause: "暫停定格",
    btnReset: "重置初態",
    btnStep: "單步 +0.02s",
    speedNormal: "1.0x 常速",
    speedSlow: "0.25x 慢鏡",
    toggleVectors: "受力向量圖",
    toggleGrid: "座標標尺",
    toggleSound: "實驗音效",
    energyTitle: "機械能守恆即時監測 (E = Ek + Ep + Q)",
    energyKinetic: "動能 Ek",
    energyPotential: "勢能 Ep",
    energyThermal: "摩擦內能 Q",
    energyTotal: "總能 E總",
    panelParams: "實驗參數調節",
    panelPresets: "經典教學預設場景",
    panelTelemetry: "即時物理量測量儀",
    panelWaveform: "紙帶打點 / 即時波形記錄儀",
    panelPrinciple: "核心物理原理解析",
    statusRunning: "實驗進行中",
    statusPaused: "已定格暫停",
    statusCompleted: "單次實驗完成",
    descReadLab: "讀取目前啟用的物理實驗台、參數配置、即時物理量讀數、機械能分解與教學診斷結論。",
    descConfigureExperiment: "切換實驗台（ramp / projectile / collision / harmonic）並批次設定物理參數，可選自動啟動實驗。",
    descLoadPreset: "載入目前實驗台或指定實驗台的經典教學預設場景（如臨界摩擦角、平拋對比、完全非彈性碰撞等）。",
    descControlSimulation: "控制物理模擬時鐘：play（播放）、pause（暫停定格）、reset（重置回 t=0）、step（單步推進 0.02 秒）或切換慢動作。",
  },
  en: {
    appTitle: "Classical Mechanics Lab",
    appBadge: "Modular Physics Engine · Live Vectors & Energy Monitor",
    btnPlay: "Run",
    btnPause: "Freeze",
    btnReset: "Reset",
    btnStep: "Step +0.02s",
    speedNormal: "1.0x Speed",
    speedSlow: "0.25x Slow-Mo",
    toggleVectors: "Force Vectors",
    toggleGrid: "Grid & Ruler",
    toggleSound: "Lab Audio",
    energyTitle: "Conservation of Energy Monitor (E = Ek + Ep + Q)",
    energyKinetic: "Kinetic Ek",
    energyPotential: "Potential Ep",
    energyThermal: "Thermal Q",
    energyTotal: "Total E",
    panelParams: "Experiment Parameters",
    panelPresets: "Classic Teaching Presets",
    panelTelemetry: "Real-Time Telemetry",
    panelWaveform: "Strip-Chart Oscilloscope",
    panelPrinciple: "Physical Principle Breakdown",
    statusRunning: "Running",
    statusPaused: "Frozen",
    statusCompleted: "Completed",
    descReadLab: "Read active physics bench, parameters, live telemetry, energy breakdown, and educational insights.",
    descConfigureExperiment: "Switch physics bench (ramp / projectile / collision / harmonic) and set numeric parameters.",
    descLoadPreset: "Load a classic teaching preset scenario on the active or specified experiment bench.",
    descControlSimulation: "Control simulation clock: play, pause, reset, step (+0.02s), or toggle slow-motion.",
  },
};

export function t(key: string): string {
  return UI_DICT[currentLocale]?.[key] ?? UI_DICT["zh-CN"][key] ?? key;
}
