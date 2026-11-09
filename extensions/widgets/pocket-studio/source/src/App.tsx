import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { pudding, useStorage, useWidgetLocale } from "@pudding/widget";
import { type SongState, type Instrument } from "./types";
import { edit, editSong, readSong, getDefaultSong, registerPlaybackController, importSong, exportSong, canExportWav } from "./api";
import "./api";
import { getAudioContext, audioState } from "./audio";
import { playInstrument, resolvePitch, getDefaultReverb } from "./instruments";
import { parseProject, maxProjectBytes } from "./project";
import { t, setLocale, errorText } from "./text";
import "./style.css";

const PRESETS = [
  ["mario", "presetMario"],
  ["donkeyKong", "presetDonkeyKong"],
  ["oriental", "presetOriental"],
  ["lofi", "presetLofi"],
] as const;

// 音乐工坊官方统一徽标 (与 assets/icon.svg 100% 保持一致)
function StudioBrandIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="24" fill="#4F46E5" />
      <circle cx="64" cy="64" r="48" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
      <g>
        <rect x="28" y="28" width="32" height="32" rx="7" fill="#FF3366" />
        <rect x="68" y="28" width="32" height="32" rx="7" fill="#00D2FF" />
        <rect x="28" y="68" width="32" height="32" rx="7" fill="#FFB703" />
        <rect x="68" y="68" width="32" height="32" rx="7" fill="#10B981" />
        <rect x="33" y="33" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.35" />
        <rect x="73" y="33" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.35" />
        <rect x="33" y="73" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.35" />
        <rect x="73" y="73" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.35" />
      </g>
      <path
        d="M22 64 L38 64 L46 48 L56 80 L66 40 L76 88 L86 54 L94 64 L106 64"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 规范工业级 SVG 矢量乐器微图标
function InstrumentSvgIcon({ type }: { type: string }) {
  switch (type) {
    case "kick":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "snare":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" /><path d="m4.93 4.93 14.14 14.14M19.07 4.93 4.93 19.07" />
        </svg>
      );
    case "hat":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "bass":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "mario":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "kong":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
        </svg>
      );
  }
}

// The live player and offline export use the same synthesizers and pitch rules.
const INSTRUMENTS: Instrument[] = [
  {
    "id": "marioLead",
    "name": "8-Bit 经典方波",
    "category": "Melodic",
    "iconType": "mario",
    "colorClass": "is-mario",
    "desc": "经典复古脉冲方波"
  },
  {
    "id": "kongLead",
    "name": "街机 8-Bit 方波",
    "category": "Melodic",
    "iconType": "kong",
    "colorClass": "is-kong",
    "desc": "街机跳跃脉冲波"
  },
  {
    "id": "marioBass",
    "name": "8-Bit 三角波低音",
    "category": "Bass",
    "iconType": "bass",
    "colorClass": "is-bass",
    "desc": "弹性复古芯片低音"
  },
  {
    "id": "kick",
    "name": "808 底鼓 (Kick)",
    "category": "Drums",
    "iconType": "kick",
    "colorClass": "is-kick",
    "desc": "下潜重低音"
  },
  {
    "id": "snare",
    "name": "8-Bit 军鼓 (Snare)",
    "category": "Drums",
    "iconType": "snare",
    "colorClass": "is-snare",
    "desc": "清脆切分敲击"
  },
  {
    "id": "hat",
    "name": "闭镲 (Hi-Hat)",
    "category": "Drums",
    "iconType": "hat",
    "colorClass": "is-hat",
    "desc": "金属碎拍律动"
  },
  {
    "id": "lead",
    "name": "五声音阶琴",
    "category": "Melodic",
    "iconType": "lead",
    "colorClass": "is-lead",
    "desc": "空灵自然音色"
  },
  {
    "id": "bass",
    "name": "模拟低音 Bass",
    "category": "Bass",
    "iconType": "bass",
    "colorClass": "is-bass",
    "desc": "温暖低通贝斯"
  },
  {
    "id": "epiano",
    "name": "电钢琴 Rhodes",
    "category": "Melodic",
    "iconType": "synth",
    "colorClass": "is-snare",
    "desc": "温润爵士和弦"
  },
  {
    "id": "marimba",
    "name": "木琴 Marimba",
    "category": "Melodic",
    "iconType": "synth",
    "colorClass": "is-hat",
    "desc": "清脆热带木质"
  }
];
const INSTRUMENT_MAP: Record<string, Instrument & { playSound: (time: number, step: number, pitch?: number | null, duration?: number, volume?: number, reverb?: number) => void }> = Object.fromEntries(INSTRUMENTS.map(inst => [inst.id, {
  ...inst,
  playSound: (time: number, step: number, pitch?: number | null, duration?: number, volume = 1, reverb?: number) => playInstrument(inst.id, time, step, pitch, duration, undefined, volume, reverb),
}]));

function getInstName(instId: string): string {
  const key = `inst_${instId}_name`;
  const translated = t(key);
  if (translated !== key) return translated;
  return INSTRUMENT_MAP[instId]?.name || instId;
}

function getInstDesc(instId: string): string {
  const key = `inst_${instId}_desc`;
  const translated = t(key);
  if (translated !== key) return translated;
  return INSTRUMENT_MAP[instId]?.desc || "";
}

// 音乐理论与 MIDI 转换实用函数
const NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const WHITE_KEYS = [
  { note: "C", offset: 0 },
  { note: "D", offset: 2 },
  { note: "E", offset: 4 },
  { note: "F", offset: 5 },
  { note: "G", offset: 7 },
  { note: "A", offset: 9 },
  { note: "B", offset: 11 }
];

const BLACK_KEYS = [
  { note: "C#", offset: 1, leftStyle: "calc(14.285% - 9px)" },
  { note: "D#", offset: 3, leftStyle: "calc(28.57% - 9px)" },
  { note: "F#", offset: 6, leftStyle: "calc(57.14% - 9px)" },
  { note: "G#", offset: 8, leftStyle: "calc(71.43% - 9px)" },
  { note: "A#", offset: 10, leftStyle: "calc(85.71% - 9px)" }
];

// 可供手动添加子条选择的标准音高列表 (C2 ~ B6)
const SELECTABLE_MIDIS: number[] = [];
for (let m = 84; m >= 36; m--) {
  SELECTABLE_MIDIS.push(m);
}

function midiToFreq(midi: number): number {
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

function freqToMidi(freq: number): number {
  if (!freq || freq <= 0) return 60;
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

function midiToNoteName(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_LABELS[semitone]}${octave}`;
}

const getResolvedPitch = resolvePitch;

interface ActivePopoverState {
  trackKey: string;
  instId: string;
  barIdx: number;
  stepIdx: number;
  gStep: number;
  duration: number;
  pitch: number | null;
  isPitchLane?: boolean;
  anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function App() {
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const storage = useStorage();
  const songFromStorage = useMemo(() => readSong(storage.data), [storage.data]);
  const [song, setSong] = useState<SongState>(songFromStorage);

  useEffect(() => {
    setSong(songFromStorage);
  }, [songFromStorage]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playStep, setPlayStep] = useState(0); // 0 ~ (totalSteps - 1)
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [exporting, setExporting] = useState<"project" | "wav" | null>(null);
  const [fileNotice, setFileNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [importPending, setImportPending] = useState<{ content: string; project: ReturnType<typeof parseProject>; version: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importDialog = useRef<HTMLDialogElement>(null);
  const presetMenu = useRef<HTMLDetailsElement>(null);
  const [activePopover, setActivePopover] = useState<ActivePopoverState | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      localStorage.removeItem("pocket-studio-theme");
    } catch {}
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setTheme(media.matches ? "dark" : "light");
    updateTheme();
    media.addEventListener("change", updateTheme);
    return () => media.removeEventListener("change", updateTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  const [activeReverbPopover, setActiveReverbPopover] = useState<{
    trackKey: string;
    instId: string;
    reverb: number;
    anchor: { x: number; y: number; showBelow: boolean };
  } | null>(null);

  const [draggingNote, setDraggingNote] = useState<{
    trackKey: string;
    barIdx: number;
    stepIdx: number;
    gStep: number;
    pitchMidi?: number;
    duration: number;
  } | null>(null);

  const [expandedTrackKey, setExpandedTrackKey] = useState<string | null>(null);
  // 记录每个音轨手动添加或常驻的音高子条 (MIDI 编号列表)
  const [customPitchesByTrack, setCustomPitchesByTrack] = useState<Record<string, number[]>>({});
  // 手动选择添加音高子条的下拉选中值
  const [manualMidiToAdd, setManualMidiToAdd] = useState<number>(67); // 默认 G4

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const songRef = useRef(song);
  songRef.current = song;

  const HEADER_WIDTH = 216;
  const STEP_WIDTH = 34;
  const STEP_GAP = 4;
  const STEP_PITCH = STEP_WIDTH + STEP_GAP;

  const totalBars = song.bars.length;
  const totalSteps = totalBars * 16;

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !presetMenu.current?.contains(event.target) && presetMenu.current) {
        presetMenu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    const dialog = importDialog.current;
    if (importPending && dialog && !dialog.open) dialog.showModal();
    if (!importPending && dialog?.open) dialog.close();
  }, [importPending]);

  useEffect(() => {
    if (!fileNotice || fileNotice.error) return;
    const timer = window.setTimeout(() => setFileNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [fileNotice]);

  async function prepareImport(file: File) {
    setFileBusy(true); setFileNotice(null);
    try {
      if (file.size > maxProjectBytes) throw new Error(t("projectTooLarge"));
      const content = await file.text(), project = parseProject(content);
      const saved = await pudding.storage.read();
      setImportPending({ content, project, version: saved.version });
    } catch (error) { setFileNotice({ error: true, text: errorText(error) }); }
    finally { setFileBusy(false); }
  }

  async function confirmImport() {
    if (!importPending) return;
    setFileBusy(true);
    try {
      await importSong(importPending.content, { expectedStorageVersion: importPending.version });
      songRef.current = importPending.project.song;
      setSong(importPending.project.song);
      isPlayingRef.current = false; setIsPlaying(false);
      setActivePopover(null); setIsPickerOpen(false);
      setFileNotice(null);
    } catch (error) { setFileNotice({ error: true, text: errorText(error) }); }
    finally { setImportPending(null); setFileBusy(false); }
  }

  async function saveSong(format: "project" | "wav") {
    setFileBusy(true); setExporting(format); setFileNotice(null);
    try {
      const result = await exportSong(format);
      setFileNotice({ error: false, text: t(result.saved ? "fileSaved" : "fileSaveCancelled") });
    } catch (error) { setFileNotice({ error: true, text: errorText(error) }); }
    finally { setFileBusy(false); setExporting(null); }
  }

  async function perform(action: Parameters<typeof edit>[0]) {
    setBusy(true);
    try {
      // Validate before rendering the optimistic state. The shared reducer also
      // validates interface edits, so UI and model calls use the same rules.
      const next = editSong(songRef.current, action);
      songRef.current = next;
      setSong(next);
      await edit(action);
    } catch (e) {
      console.error(errorText(e));
      const saved = await storage.refetch();
      const restored = readSong(saved.data);
      songRef.current = restored;
      setSong(restored);
    } finally {
      setBusy(false);
    }
  }

  const playStepRef = useRef(0);
  const nextStepRef = useRef(0);

  // 绑定宿主与会话的播放控制接口，支持精准的幂等 play / pause / 状态查询
  useEffect(() => {
    return registerPlaybackController({
      play: () => {
        getAudioContext();
        isPlayingRef.current = true;
        setIsPlaying(true);
      },
      pause: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
      },
      isPlaying: () => isPlayingRef.current,
      getStep: () => playStepRef.current,
      getAudioState: audioState,
    });
  }, []);

  // 动态步进跨小节播放循环：支持实时变速，同时播放主音符与同位置叠加的多音高和弦音块
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const stepMs = (60 / song.bpm / 4) * 1000;
      const stepSec = stepMs / 1000;
      timer = setInterval(() => {
        const now = getAudioContext().currentTime;
        const currentBarsCount = songRef.current.bars.length || 1;
        const currentTotalSteps = currentBarsCount * 16;
        const currentGlobalStep = nextStepRef.current % currentTotalSteps;

        const barIdx = Math.floor(currentGlobalStep / 16);
        const stepInBar = currentGlobalStep % 16;

        playStepRef.current = currentGlobalStep;
        setPlayStep(currentGlobalStep);

        const currentSong = songRef.current;
        const barData = currentSong.bars[barIdx];
        if (barData) {
          currentSong.tracks.forEach((t) => {
            if (t.muted) return;
            const inst = INSTRUMENT_MAP[t.instId];
            if (!inst) return;
            if (barData.steps[t.trackKey]?.[stepInBar]) {
              const pitch = barData.pitches?.[t.trackKey]?.[stepInBar];
              const durSteps = barData.durations?.[t.trackKey]?.[stepInBar] || 1;
              const durSec = durSteps * stepSec;
              inst.playSound(now, currentGlobalStep, pitch, durSec, t.volume ?? 1, t.reverb);
            }
            const extras = barData.extraNotes?.[t.trackKey];
            if (extras) {
              extras.forEach((extra) => {
                if (extra.step === stepInBar) {
                  const durSec = (extra.duration || 1) * stepSec;
                  inst.playSound(now, currentGlobalStep, extra.pitch, durSec, t.volume ?? 1, t.reverb);
                }
              });
            }
          });
        }

        nextStepRef.current = (currentGlobalStep + 1) % currentTotalSteps;
      }, stepMs);
    } else {
      playStepRef.current = 0;
      nextStepRef.current = 0;
      setPlayStep(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, song.bpm]);

  const lastStepRef = useRef(playStep);

  // 播放时时间轴自动跟随指针平滑向右滚动；循环重绕时即刻跳回开头，消除回滚延迟
  useEffect(() => {
    if (isPlaying && timelineScrollRef.current) {
      const container = timelineScrollRef.current;
      const prevStep = lastStepRef.current;
      lastStepRef.current = playStep;

      if (playStep < prevStep || playStep === 0) {
        container.scrollTo({ left: 0, behavior: "auto" });
        return;
      }

      const playheadX = HEADER_WIDTH + playStep * STEP_PITCH;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;

      if (playheadX > viewRight - 100) {
        const targetScroll = Math.max(0, playheadX - HEADER_WIDTH - 60);
        container.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    } else if (!isPlaying) {
      lastStepRef.current = 0;
    }
  }, [isPlaying, playStep]);

  function togglePlay() {
    getAudioContext();
    isPlayingRef.current = !isPlayingRef.current;
    setIsPlaying(isPlayingRef.current);
  }

  // 键盘快捷键：空格播放/暂停；Escape 关闭气泡；Delete/Backspace 删除当前选中的音符
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (importPending) return;
      if (e.target instanceof HTMLElement && e.target.closest('input,button,summary,select,textarea,[contenteditable="true"]')) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "Escape") {
        if (activePopover) {
          e.preventDefault();
          setActivePopover(null);
        }
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (activePopover) {
          e.preventDefault();
          if (activePopover.isPitchLane && activePopover.pitch) {
            void perform({
              action: "togglePitchStep",
              barIndex: activePopover.barIdx,
              trackKey: activePopover.trackKey,
              stepIndex: activePopover.stepIdx,
              pitch: activePopover.pitch,
            });
          } else {
            void perform({
              action: "toggleStep",
              barIndex: activePopover.barIdx,
              trackKey: activePopover.trackKey,
              stepIndex: activePopover.stepIdx,
            });
          }
          setActivePopover(null);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activePopover, importPending]);

  // 右侧拖拽手柄放长音符（支持按具体音高子条独立放长）
  function startDrag(
    e: React.PointerEvent,
    trackKey: string,
    barIdx: number,
    stepIdx: number,
    gStep: number,
    initialDuration: number,
    totalTimelineSteps: number,
    maxStepsToNextNote?: number,
    lanePitchFreq?: number
  ) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let lastDur = initialDuration;
    const pitchMidi = lanePitchFreq ? freqToMidi(lanePitchFreq) : undefined;

    setDraggingNote({ trackKey, barIdx, stepIdx, gStep, pitchMidi, duration: initialDuration });

    const maxAllowedDuration = Math.min(
      maxStepsToNextNote ?? 32,
      Math.min(32, totalTimelineSteps - gStep)
    );

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSteps = Math.round(deltaX / STEP_PITCH);
      const nextDur = Math.max(1, Math.min(maxAllowedDuration, initialDuration + deltaSteps));
      if (nextDur !== lastDur) {
        lastDur = nextDur;
        setDraggingNote({ trackKey, barIdx, stepIdx, gStep, pitchMidi, duration: nextDur });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setDraggingNote(null);
      if (lastDur !== initialDuration) {
        if (lanePitchFreq !== undefined) {
          void perform({
            action: "setPitchNoteDuration",
            barIndex: barIdx,
            trackKey,
            stepIndex: stepIdx,
            pitch: lanePitchFreq,
            duration: lastDur,
          });
        } else {
          void perform({
            action: "setNoteDuration",
            barIndex: barIdx,
            trackKey,
            stepIndex: stepIdx,
            duration: lastDur,
          });
        }
        const now = getAudioContext().currentTime;
        const trackConf = songRef.current.tracks.find((t) => t.trackKey === trackKey);
        const inst = trackConf ? INSTRUMENT_MAP[trackConf.instId] : undefined;
        if (inst) {
          const pitch = lanePitchFreq ?? songRef.current.bars[barIdx]?.pitches?.[trackKey]?.[stepIdx];
          const stepSec = 60 / songRef.current.bpm / 4;
          inst.playSound(now, gStep, pitch, lastDur * stepSec, trackConf?.volume ?? 1, trackConf?.reverb);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // 计算音轨推荐的下一个未添加音高 (MIDI)
  function getNextSuggestedMidi(instId: string, existingMidis: number[]): number {
    const scaleOffsets = [2, 3, 4, 5, 7, -2, -3, -5, -7, 1, -1];
    const base = existingMidis[0] ?? (INSTRUMENT_MAP[instId]?.category === "Bass" ? 48 : 64);
    for (const offset of scaleOffsets) {
      const candidate = base + offset;
      if (candidate >= 36 && candidate <= 84 && !existingMidis.includes(candidate)) {
        return candidate;
      }
    }
    for (let m = 72; m >= 36; m--) {
      if (!existingMidis.includes(m)) {
        return m;
      }
    }
    return 60;
  }

  // 为指定音轨添加一个音高子条
  function addPitchSubrow(trackKey: string, instId: string, existingMidis: number[], explicitMidi?: number) {
    const targetMidi = explicitMidi ?? getNextSuggestedMidi(instId, existingMidis);
    const updatedMidis = Array.from(new Set([...(customPitchesByTrack[trackKey] || []), ...existingMidis, targetMidi])).sort(
      (a, b) => b - a
    );
    setCustomPitchesByTrack((prev) => {
      const merged = Array.from(new Set([...(prev[trackKey] || []), ...existingMidis, targetMidi])).sort(
        (a, b) => b - a
      );
      return { ...prev, [trackKey]: merged };
    });
    setManualMidiToAdd(getNextSuggestedMidi(instId, updatedMidis));
    const inst = INSTRUMENT_MAP[instId];
    const trackConf = songRef.current.tracks.find((t) => t.trackKey === trackKey);
    if (inst && targetMidi !== undefined) {
      const now = getAudioContext().currentTime;
      inst.playSound(now, 0, midiToFreq(targetMidi), 0.25, trackConf?.volume ?? 1, trackConf?.reverb);
    }
  }

  // 移除指定音轨的某个空音高子条
  function removePitchSubrow(trackKey: string, midiToRemove: number, existingMidis: number[]) {
    setCustomPitchesByTrack((prev) => {
      const current = prev[trackKey] ?? existingMidis;
      return {
        ...prev,
        [trackKey]: current.filter((m) => m !== midiToRemove),
      };
    });
  }

  return (
    <main className="ps-console" data-theme={theme} data-playing={isPlaying} data-play-step={playStep}>
      {/* 顶部控制栏 */}
      <header className="ps-top-bar">
        <div className="ps-toolbar-primary">
        <div className="ps-brand">
          <div className="ps-brand-badge">
            <StudioBrandIcon size={32} />
          </div>
          <div>
            <div className="ps-brand-title">{t("appName")}</div>
          </div>
        </div>

        <div className="ps-play-cluster">
          <button
            type="button"
            className={`ps-btn-play ${isPlaying ? "playing" : ""}`}
            onClick={togglePlay}
            title={isPlaying ? t("pause") : t("play")}
            aria-label={isPlaying ? t("pause") : t("play")}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="2.5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: "translateX(1px)" }}>
                <path d="M7 4.5v15l12-7.5-12-7.5z" />
              </svg>
            )}
          </button>
          <div className="ps-tempo-pill">
            <button
              type="button"
              className="ps-tempo-step-btn"
              disabled={busy || song.bpm <= 60}
              onClick={() => void perform({ action: "setBpm", bpm: song.bpm - 5 })}
              title={t("tempoDown")}
            >
              −
            </button>
            <span className="ps-tempo-label">{t("bpm")}</span>
            <span className="ps-tempo-val">{song.bpm}</span>
            <button
              type="button"
              className="ps-tempo-step-btn"
              disabled={busy || song.bpm >= 180}
              onClick={() => void perform({ action: "setBpm", bpm: song.bpm + 5 })}
              title={t("tempoUp")}
            >
              +
            </button>
          </div>
        </div>
        </div>

        <div className="ps-toolbar-secondary">
        <details
          ref={presetMenu}
          className="ps-preset-menu"
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }}
          onKeyDown={event => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="ps-btn-pill">
            {t("presetGroup")}
            <svg className="ps-preset-chevron" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <div className="ps-preset-options" role="group" aria-label={t("presetGroup")}>
            {PRESETS.map(([name, label]) => <button
              key={name}
              type="button"
              className="ps-btn-pill"
              data-preset={name}
              disabled={busy}
              onClick={() => {
                if (presetMenu.current) {
                  presetMenu.current.open = false;
                  presetMenu.current.querySelector("summary")?.focus();
                }
                void perform({ action: "loadPreset", presetName: name });
              }}
            >{t(label)}</button>)}
          </div>
        </details>
        <div className="ps-bar-actions" role="group" aria-label={t("barActions")}>
          <button
            type="button"
            className="ps-btn-pill"
            disabled={busy || totalBars >= 16}
            onClick={() => void perform({ action: "addBar" })}
            title={t("addBarTooltip")}
          >
            + {t("addBar")}
          </button>
          {totalBars > 1 && (
            <button
              type="button"
              className="ps-btn-pill"
              disabled={busy}
              onClick={() => void perform({ action: "removeBar" })}
              title={t("deleteBarTooltip")}
            >
              - {t("removeBar")}
            </button>
          )}
          <button
            type="button"
            className="ps-btn-pill"
            disabled={busy}
            onClick={() => {
              void perform({ action: "clearSong" });
            }}
          >
            {t("clearAll")}
          </button>
        </div>
        <div className="ps-file-actions" role="group" aria-label={t("fileActions")}>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden data-music-import-input onChange={event => {
            const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
            if (file) void prepareImport(file);
          }} />
          <button type="button" className="ps-btn-pill" data-music-action="import" disabled={busy || fileBusy} onClick={() => fileInput.current?.click()}>{t("importProject")}</button>
          <button type="button" className="ps-btn-pill ps-file-export" data-music-action="project" disabled={fileBusy} aria-busy={exporting === "project"} aria-label={t(exporting === "project" ? "savingProject" : "exportProject")} title={exporting === "project" ? t("savingProject") : undefined} onClick={() => void saveSong("project")}>
            <span className="ps-file-label">{t("exportProject")}</span>
            {exporting === "project" && <span className="ps-file-spinner" aria-hidden="true" />}
          </button>
          <button type="button" className="ps-btn-pill ps-file-export" data-music-action="wav" disabled={fileBusy} aria-busy={exporting === "wav"} aria-label={t(exporting === "wav" ? "renderingWav" : "exportWav")} title={exporting === "wav" ? t("renderingWav") : canExportWav() ? undefined : t("wavRequiresUpdate")} onClick={() => void saveSong("wav")}>
            <span className="ps-file-label">{t("exportWav")}</span>
            {exporting === "wav" && <span className="ps-file-spinner" aria-hidden="true" />}
          </button>
        </div>
        </div>
      </header>
      {fileNotice && createPortal(<div className="ps-file-notice" role={fileNotice.error ? "alert" : "status"} data-error={fileNotice.error}>
        <span className="ps-file-notice-text">{fileNotice.text}</span>
        <button type="button" className="ps-notice-dismiss" aria-label={t("dismissNotice")} title={t("dismissNotice")} onClick={() => setFileNotice(null)}>×</button>
      </div>, document.body)}
      <dialog ref={importDialog} className="ps-import-dialog" onCancel={event => { if (fileBusy) event.preventDefault(); else setImportPending(null); }}>
        {importPending && <>
          <h2>{t("importProject")}</h2>
          <p>{t("importReplacesSong")}</p>
          <p>{t("importSummary").replace("{bars}", String(importPending.project.song.bars.length)).replace("{tracks}", String(importPending.project.song.tracks.length)).replace("{bpm}", String(importPending.project.song.bpm))}</p>
          <div className="ps-file-actions">
            <button type="button" className="ps-btn-pill" disabled={fileBusy} onClick={() => setImportPending(null)}>{t("cancelImport")}</button>
            <button type="button" className="ps-btn-pill" data-music-confirm-import disabled={fileBusy} onClick={() => void confirmImport()}>{t("confirmImport")}</button>
          </div>
        </>}
      </dialog>

      {/* 连续横向滚动时间轴主体 (不分页) */}
      <div className="ps-timeline-viewport" ref={timelineScrollRef}>
        <div
          className="ps-timeline-canvas"
          style={{ width: `${HEADER_WIDTH + totalSteps * STEP_PITCH + 48}px` }}
        >
          {/* 时间标尺行 (Sticky Top) */}
          <div className="ps-timeline-ruler-row">
            <div className="ps-ruler-corner">
              <span>{t("tracks")} ({song.tracks.length})</span>
              <span className="ps-total-bars-pill">{totalBars} BARS</span>
            </div>

            <div className="ps-ruler-content" style={{ width: `${totalSteps * STEP_PITCH}px` }}>
              {/* 小节横幅条 (BAR 1, BAR 2...) */}
              <div className="ps-ruler-bars-banner">
                {Array.from({ length: totalBars }).map((_, barIdx) => (
                  <div
                    key={barIdx}
                    className="ps-ruler-bar-badge"
                    style={{
                      width: `${16 * STEP_PITCH - 5}px`,
                      marginLeft: "3px",
                      marginRight: "2px",
                    }}
                  >
                    <span>BAR {barIdx + 1}</span>
                    {totalBars > 1 && (
                      <button
                        type="button"
                        className="ps-ruler-bar-del"
                        title={`${t("deleteThisBar")} (${barIdx + 1})`}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void perform({ action: "removeBar", barIndex: barIdx });
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {totalBars < 16 && (
                  <button
                    type="button"
                    className="ps-ruler-add-bar-btn"
                    title={t("addBarTooltip")}
                    disabled={busy}
                    onClick={() => void perform({ action: "addBar" })}
                  >
                    +
                  </button>
                )}
              </div>

              {/* 1:1 精确对应的步进刻度条 */}
              <div className="ps-ruler-ticks-strip">
                {Array.from({ length: totalSteps }).map((_, g) => {
                  const sIdx = g % 16;
                  const bIdx = Math.floor(g / 16);
                  const isBarStart = sIdx === 0;
                  const isBeat = sIdx % 4 === 0;

                  let text = `.${(sIdx % 4) + 1}`;
                  if (isBarStart) {
                    text = `${bIdx + 1}.1`;
                  } else if (isBeat) {
                    text = `${Math.floor(sIdx / 4) + 1}`;
                  }

                  return (
                    <div
                      key={g}
                      className={`ps-ruler-tick-cell ${isBarStart ? "bar-head" : ""} ${isBeat ? "beat-head" : ""}`}
                      style={{ width: `${STEP_PITCH}px` }}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 纵向走带指示线 */}
          {isPlaying && (
            <div
              className="ps-playhead-line"
              style={{ left: `${HEADER_WIDTH + playStep * STEP_PITCH + STEP_PITCH / 2}px` }}
            />
          )}

          {/* 所有音轨行 */}
          <div className="ps-timeline-tracks">
            {song.tracks.map((tConfig) => {
              const inst = INSTRUMENT_MAP[tConfig.instId] || INSTRUMENT_MAP["lead"];

              // 提取该音轨所有音符（包含主音符与同位置叠加的 extraNotes 和弦音块）
              const notes: {
                gStep: number;
                barIdx: number;
                stepIdx: number;
                duration: number;
                pitch: number | null;
                isExtra?: boolean;
              }[] = [];

              song.bars.forEach((bar, bIdx) => {
                const steps = bar.steps[tConfig.trackKey];
                if (steps) {
                  steps.forEach((isActive, sIdx) => {
                    if (isActive) {
                      const gStep = bIdx * 16 + sIdx;
                      const dur = bar.durations?.[tConfig.trackKey]?.[sIdx] || 1;
                      const rawPitch = bar.pitches?.[tConfig.trackKey]?.[sIdx];
                      const resolved = getResolvedPitch(tConfig.instId, sIdx, rawPitch);
                      notes.push({ gStep, barIdx: bIdx, stepIdx: sIdx, duration: dur, pitch: resolved });
                    }
                  });
                }
                const extras = bar.extraNotes?.[tConfig.trackKey];
                if (extras) {
                  extras.forEach((extra) => {
                    const gStep = bIdx * 16 + extra.step;
                    notes.push({
                      gStep,
                      barIdx: bIdx,
                      stepIdx: extra.step,
                      duration: extra.duration || 1,
                      pitch: extra.pitch,
                      isExtra: true,
                    });
                  });
                }
              });

              const isExpanded = expandedTrackKey === tConfig.trackKey;
              const isMelodic = inst.category !== "Drums";

              // 提取该音轨所有音符所包含的音高 + 用户手动添加/保留的音高子条
              const noteMidiList = notes
                .map((n) => (n.pitch ? freqToMidi(n.pitch) : 60))
                .filter((m) => m > 0);
              const customMidis = customPitchesByTrack[tConfig.trackKey] || [];

              let pitchMidis = Array.from(new Set([...noteMidiList, ...customMidis])).sort((a, b) => b - a);
              if (pitchMidis.length === 0 && isMelodic) {
                const base = inst.category === "Bass" ? 36 : 60;
                pitchMidis = [base + 12, base + 7, base + 4, base].sort((a, b) => b - a);
              }

              return (
                <div
                  key={tConfig.trackKey}
                  className={`ps-track-group ${isExpanded && isMelodic ? "is-expanded" : ""} ${tConfig.muted ? "is-muted" : ""}`}
                >
                  {/* 顶部主行：左侧始终保留音轨卡片；展开时右侧不显示重复预览条，改为音轨操作栏 */}
                  <div className="ps-timeline-track-row">
                    <div className="ps-track-header-cell sticky">
                      <div
                        className="ps-card-info"
                        onClick={() => {
                          setPickerTarget(tConfig.trackKey);
                          setIsPickerOpen(true);
                        }}
                        title={t("pickerTitle")}
                      >
                        <div className="ps-card-main">
                          <div
                            className="ps-card-icon"
                            style={{ color: `var(--ps-${inst.colorClass.replace("is-", "")})` }}
                          >
                            <InstrumentSvgIcon type={inst.iconType} />
                          </div>
                          <div className="ps-title-box">
                            <div className="ps-row-name">
                              <span className="ps-row-name-text" title={getInstName(tConfig.instId)}>
                                {getInstName(tConfig.instId)}
                              </span>
                              <span className="ps-row-name-chevron" aria-hidden="true">
                                ▾
                              </span>
                            </div>
                            <div className="ps-row-desc" title={getInstDesc(tConfig.instId)}>
                              {getInstDesc(tConfig.instId)}
                            </div>
                          </div>
                        </div>
                        <div className="ps-card-actions">
                          <button
                            type="button"
                            className={`ps-btn-rev ${(tConfig.reverb ?? getDefaultReverb(tConfig.instId)) > 0.05 ? "is-active" : ""}`}
                            title={`${t("trackReverb")}: ${Math.round((tConfig.reverb ?? getDefaultReverb(tConfig.instId)) * 100)}%`}
                            aria-label={t("trackReverb")}
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveReverbPopover((prev) =>
                                prev?.trackKey === tConfig.trackKey
                                  ? null
                                  : {
                                      trackKey: tConfig.trackKey,
                                      instId: tConfig.instId,
                                      reverb: tConfig.reverb ?? getDefaultReverb(tConfig.instId),
                                      anchor: {
                                        x: Math.min(window.innerWidth - 240, Math.max(10, rect.left)),
                                        y: rect.bottom + 6,
                                        showBelow: true,
                                      },
                                    }
                              );
                            }}
                          >
                            R
                          </button>
                          <button
                            type="button"
                            className={`ps-btn-mute ${tConfig.muted ? "is-active" : ""}`}
                            title={tConfig.muted ? t("unmuteTrack") : t("muteTrack")}
                            aria-label={tConfig.muted ? t("unmuteTrack") : t("muteTrack")}
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void perform({ action: "toggleMuteTrack", trackKey: tConfig.trackKey });
                            }}
                          >
                            M
                          </button>
                          {isMelodic && (
                            <button
                              type="button"
                              className={`ps-btn-roll ${isExpanded ? "is-active" : ""}`}
                              title={isExpanded ? t("closeRoll") : t("openRoll")}
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isExpanded) {
                                  // 展开时将当前已有的音高固定到列表，防止删除音符时子条突然消失
                                  const merged = Array.from(
                                    new Set([...(customPitchesByTrack[tConfig.trackKey] || []), ...pitchMidis])
                                  ).sort((a, b) => b - a);
                                  setCustomPitchesByTrack((prev) => ({
                                    ...prev,
                                    [tConfig.trackKey]: merged,
                                  }));
                                  setManualMidiToAdd(getNextSuggestedMidi(tConfig.instId, merged));
                                  setExpandedTrackKey(tConfig.trackKey);
                                } else {
                                  setExpandedTrackKey(null);
                                }
                              }}
                            >
                              {isExpanded ? t("closeRoll") : t("openRoll")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧区域：展开时显示操作栏（增加子条、手动选音高添加、清空、删除音轨）；收起时显示音轨步进条 */}
                    {isExpanded && isMelodic ? (
                      <div className="ps-expanded-topbar" style={{ width: `${totalSteps * STEP_PITCH}px` }}>
                        <div className="ps-expanded-actions">
                          <button
                            type="button"
                            className="ps-exp-action-btn is-primary"
                            disabled={busy}
                            onClick={() => addPitchSubrow(tConfig.trackKey, tConfig.instId, pitchMidis)}
                            title="自动在当前音轨增加一条新的音高子条"
                          >
                            ＋ 增加子条
                          </button>

                          <div className="ps-exp-manual-add">
                            <select
                              className="ps-exp-pitch-select"
                              value={manualMidiToAdd}
                              onChange={(e) => setManualMidiToAdd(Number(e.target.value))}
                              aria-label="选择要添加的音高"
                            >
                              {SELECTABLE_MIDIS.map((m) => (
                                <option key={m} value={m}>
                                  {midiToNoteName(m)} ({midiToFreq(m).toFixed(0)}Hz)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="ps-exp-action-btn"
                              disabled={busy}
                              onClick={() =>
                                addPitchSubrow(tConfig.trackKey, tConfig.instId, pitchMidis, manualMidiToAdd)
                              }
                            >
                              ＋ 手动添加 {midiToNoteName(manualMidiToAdd)}
                            </button>
                          </div>

                          <button
                            type="button"
                            className="ps-exp-action-btn"
                            disabled={busy || notes.length === 0}
                            onClick={() => void perform({ action: "clearTrack", trackKey: tConfig.trackKey })}
                            title="清空当前音轨的所有音符"
                          >
                            清空本轨
                          </button>

                          {song.tracks.length > 1 && (
                            <button
                              type="button"
                              className="ps-exp-action-btn is-danger"
                              disabled={busy}
                              onClick={() => {
                                setExpandedTrackKey(null);
                                void perform({ action: "removeTrack", trackKey: tConfig.trackKey });
                              }}
                              title={t("deleteTrackTooltip")}
                            >
                              🗑 {t("deleteTrackTooltip")}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="ps-track-timeline" style={{ width: `${totalSteps * STEP_PITCH}px` }}>
                        <div className="ps-grid-slots">
                          {Array.from({ length: totalSteps }).map((_, g) => {
                            const bIdx = Math.floor(g / 16);
                            const sIdx = g % 16;
                            const isBarStart = sIdx === 0 && g > 0;
                            const isBeat = sIdx % 4 === 0;
                            const isCurrentBeat = isPlaying && playStep === g;

                            return (
                              <div
                                key={g}
                                className={`ps-pad-btn ${g === 0 ? "first-step" : ""} ${
                                  isBarStart ? "bar-start" : ""
                                } ${isBeat ? "bar-beat" : ""} ${isCurrentBeat ? "playhead" : ""}`}
                                style={{ width: `${STEP_PITCH}px` }}
                                onClick={() => {
                                  if (activePopover) setActivePopover(null);
                                  const defaultPitch = getResolvedPitch(tConfig.instId, sIdx, null);
                                  const now = getAudioContext().currentTime;
                                  inst.playSound(now, g, defaultPitch, 0.2, tConfig.volume ?? 1, tConfig.reverb);
                                  void perform({
                                    action: "toggleStep",
                                    barIndex: bIdx,
                                    trackKey: tConfig.trackKey,
                                    stepIndex: sIdx,
                                    pitch: defaultPitch || undefined,
                                    duration: 1,
                                  });
                                }}
                              />
                            );
                          })}
                        </div>

                        <div className="ps-notes-layer">
                          {notes
                            .filter((n) => !n.isExtra)
                            .map((note) => {
                              const isDraggingThis =
                                draggingNote &&
                                draggingNote.trackKey === tConfig.trackKey &&
                                draggingNote.gStep === note.gStep &&
                                draggingNote.pitchMidi === undefined;
                              const currentDur = isDraggingThis ? draggingNote.duration : note.duration;
                              const isPlayingThisNote =
                                isPlaying && playStep >= note.gStep && playStep < note.gStep + currentDur;

                              const effectivePitch = note.pitch;
                              const noteMidi = effectivePitch ? freqToMidi(effectivePitch) : null;
                              const noteName = noteMidi !== null ? midiToNoteName(noteMidi) : null;
                              const extraCountAtStep = notes.filter(
                                (x) => x.isExtra && x.gStep === note.gStep
                              ).length;

                              return (
                                <span key={note.gStep}>
                                  {currentDur > 1 && (
                                    <div
                                      className={`ps-note-tail-line ${inst.colorClass}`}
                                      style={{
                                        left: `${note.gStep * STEP_PITCH + STEP_PITCH - 2}px`,
                                        width: `${(currentDur - 1) * STEP_PITCH}px`,
                                        zIndex: 2,
                                      }}
                                    />
                                  )}

                                  <div
                                    className={`ps-note-block ${inst.colorClass} ${
                                      currentDur === 1 ? "is-single-step" : "is-multi-step"
                                    } ${isPlayingThisNote ? "active-playing" : ""}`}
                                    style={{
                                      left: `${note.gStep * STEP_PITCH + 3}px`,
                                      width: `${STEP_PITCH - 5}px`,
                                      zIndex: 3,
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (activePopover) setActivePopover(null);
                                      void perform({
                                        action: "toggleStep",
                                        barIndex: note.barIdx,
                                        trackKey: tConfig.trackKey,
                                        stepIndex: note.stepIdx,
                                      });
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const now = getAudioContext().currentTime;
                                      inst.playSound(
                                        now,
                                        note.stepIdx,
                                        effectivePitch,
                                        0.25,
                                        tConfig.volume ?? 1,
                                        tConfig.reverb
                                      );

                                      const rect = e.currentTarget.getBoundingClientRect();

                                      setActivePopover({
                                        trackKey: tConfig.trackKey,
                                        instId: tConfig.instId,
                                        barIdx: note.barIdx,
                                        stepIdx: note.stepIdx,
                                        gStep: note.gStep,
                                        duration: currentDur,
                                        pitch: effectivePitch,
                                        isPitchLane: false,
                                        anchor: {
                                          x: rect.left,
                                          y: rect.top,
                                          width: rect.width,
                                          height: rect.height,
                                        },
                                      });
                                    }}
                                  >
                                    <div className="ps-note-body">
                                      {noteName && (
                                        <span className="ps-note-pitch-tag">
                                          {noteName}
                                          {extraCountAtStep > 0 ? `+${extraCountAtStep}` : ""}
                                        </span>
                                      )}
                                      {currentDur > 1 ? (
                                        <span className="ps-note-len-badge">{currentDur}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 展开态分音高详情子条：每个子条支持在同一步进位置共存多个音块（和弦） */}
                  {isExpanded &&
                    isMelodic &&
                    pitchMidis.map((laneMidi) => {
                      const pName = midiToNoteName(laneMidi);
                      const laneFreq = midiToFreq(laneMidi);
                      const laneNotes = notes
                        .filter((n) => (n.pitch ? freqToMidi(n.pitch) : 60) === laneMidi)
                        .sort((a, b) => a.gStep - b.gStep);
                      const isBlack = pName.includes("#");

                      return (
                        <div
                          key={laneMidi}
                          className={`ps-timeline-track-row is-pitch-subrow ${isBlack ? "is-black-row" : ""} ${
                            laneNotes.length > 0 ? "is-active-row" : ""
                          }`}
                        >
                          <div className="ps-track-header-cell sticky is-pitch-subrow">
                            <div
                              className={`ps-roll-key-lane ${isBlack ? "is-black" : ""} ${
                                laneNotes.length > 0 ? "is-active-pitch" : ""
                              }`}
                              style={{
                                borderLeftColor: `var(--ps-${inst.colorClass.replace("is-", "")})`,
                              }}
                              onClick={() => {
                                const now = getAudioContext().currentTime;
                                inst.playSound(now, 0, laneFreq, 0.25, tConfig.volume ?? 1, tConfig.reverb);
                              }}
                              title={`试听 ${pName} (${laneFreq.toFixed(1)}Hz)`}
                            >
                              <span className="ps-roll-key-name">{pName}</span>
                              <div className="ps-roll-key-right">
                                <span className="ps-pitch-hz">{laneFreq.toFixed(0)}Hz</span>
                                {pitchMidis.length > 1 && laneNotes.length === 0 && (
                                  <button
                                    type="button"
                                    className="ps-roll-key-del"
                                    title={`移除空子条 ${pName}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePitchSubrow(tConfig.trackKey, laneMidi, pitchMidis);
                                    }}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`ps-roll-pitch-row ${isBlack ? "is-black-row" : ""} ${
                              laneNotes.length > 0 ? "is-active-row" : ""
                            }`}
                            style={{ width: `${totalSteps * STEP_PITCH}px` }}
                          >
                            <div className="ps-grid-slots">
                              {Array.from({ length: totalSteps }).map((_, g) => {
                                const bIdx = Math.floor(g / 16);
                                const sIdx = g % 16;
                                const isBarStart = sIdx === 0 && g > 0;
                                const isBeat = sIdx % 4 === 0;
                                const isCurrentBeat = isPlaying && playStep === g;

                                return (
                                  <div
                                    key={g}
                                    className={`ps-pad-btn ${g === 0 ? "first-step" : ""} ${
                                      isBarStart ? "bar-start" : ""
                                    } ${isBeat ? "bar-beat" : ""} ${isCurrentBeat ? "playhead" : ""}`}
                                    style={{ width: `${STEP_PITCH}px` }}
                                    onClick={() => {
                                      if (activePopover) setActivePopover(null);
                                      const now = getAudioContext().currentTime;
                                      inst.playSound(now, g, laneFreq, 0.25, tConfig.volume ?? 1, tConfig.reverb);
                                      void perform({
                                        action: "togglePitchStep",
                                        barIndex: bIdx,
                                        trackKey: tConfig.trackKey,
                                        stepIndex: sIdx,
                                        pitch: laneFreq,
                                        duration: 1,
                                      });
                                    }}
                                  />
                                );
                              })}
                            </div>

                            <div className="ps-notes-layer">
                              {laneNotes.map((note, idxInLane) => {
                                const isDraggingThis =
                                  draggingNote &&
                                  draggingNote.trackKey === tConfig.trackKey &&
                                  draggingNote.gStep === note.gStep &&
                                  draggingNote.pitchMidi === laneMidi;
                                const currentDur = isDraggingThis ? draggingNote.duration : note.duration;
                                const isPlayingThisNote =
                                  isPlaying && playStep >= note.gStep && playStep < note.gStep + currentDur;
                                const nextSamePitchNote = laneNotes[idxInLane + 1];

                                return (
                                  <div
                                    key={`${note.gStep}-${laneMidi}`}
                                    className={`ps-roll-note-strip ${inst.colorClass} ${
                                      currentDur === 1 ? "is-single-step" : "is-multi-step"
                                    } ${isPlayingThisNote ? "active-playing" : ""}`}
                                    style={{
                                      left: `${note.gStep * STEP_PITCH + 3}px`,
                                      width: `${currentDur * STEP_PITCH - 5}px`,
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (activePopover) setActivePopover(null);
                                      void perform({
                                        action: "togglePitchStep",
                                        barIndex: note.barIdx,
                                        trackKey: tConfig.trackKey,
                                        stepIndex: note.stepIdx,
                                        pitch: laneFreq,
                                      });
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const now = getAudioContext().currentTime;
                                      inst.playSound(
                                        now,
                                        note.stepIdx,
                                        laneFreq,
                                        0.25,
                                        tConfig.volume ?? 1,
                                        tConfig.reverb
                                      );
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActivePopover({
                                        trackKey: tConfig.trackKey,
                                        instId: tConfig.instId,
                                        barIdx: note.barIdx,
                                        stepIdx: note.stepIdx,
                                        gStep: note.gStep,
                                        duration: currentDur,
                                        pitch: laneFreq,
                                        isPitchLane: true,
                                        anchor: {
                                          x: rect.left,
                                          y: rect.top,
                                          width: rect.width,
                                          height: rect.height,
                                        },
                                      });
                                    }}
                                  >
                                    <div className="ps-roll-note-body">
                                      <span className="ps-note-pitch-tag">{pName}</span>
                                      {currentDur > 1 && (
                                        <>
                                          <span className="ps-note-len-badge">{currentDur}</span>
                                          <button
                                            type="button"
                                            className="ps-roll-btn-del"
                                            title={t("deleteNote")}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void perform({
                                                action: "togglePitchStep",
                                                barIndex: note.barIdx,
                                                trackKey: tConfig.trackKey,
                                                stepIndex: note.stepIdx,
                                                pitch: laneFreq,
                                              });
                                            }}
                                          >
                                            ×
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    <div
                                      className="ps-note-handle"
                                      title={t("dragToExtend")}
                                      onPointerDown={(e) => {
                                        startDrag(
                                          e,
                                          tConfig.trackKey,
                                          note.barIdx,
                                          note.stepIdx,
                                          note.gStep,
                                          note.duration,
                                          totalSteps,
                                          nextSamePitchNote ? nextSamePitchNote.gStep - note.gStep : undefined,
                                          laneFreq
                                        );
                                      }}
                                    >
                                      <div className="ps-handle-grip" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* 添加音轨槽 (固定在左侧列) */}
            <div className="ps-timeline-add-row sticky">
              <div
                className="ps-add-lane"
                onClick={() => {
                  if (song.tracks.length >= 8) {
                    alert(t("maxTrackLimit"));
                    return;
                  }
                  setPickerTarget(null);
                  setIsPickerOpen(true);
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>＋</span>
                <span>{t("addTrackShort")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 音调与时长编辑悬浮窗：通过 Portal 挂载到 body 并使用 fixed 视口坐标，绝不遮挡或跳到屏幕最左侧 */}
      {activePopover &&
        createPortal(
          (() => {
            const inst = INSTRUMENT_MAP[activePopover.instId] || INSTRUMENT_MAP["lead"];
            const isPercussion = inst.category === "Drums";
            const popoverWidth = 284;
            const popoverEstHeight = isPercussion ? 156 : 276;

            const minLeft =
              typeof window !== "undefined" && window.innerWidth > HEADER_WIDTH + popoverWidth + 24
                ? HEADER_WIDTH + 8
                : 12;
            const maxLeft =
              typeof window !== "undefined" ? Math.max(minLeft, window.innerWidth - popoverWidth - 12) : 800;
            let popoverLeft = activePopover.anchor.x + activePopover.anchor.width / 2 - popoverWidth / 2;
            popoverLeft = Math.max(minLeft, Math.min(maxLeft, popoverLeft));

            const viewportH = typeof window !== "undefined" ? window.innerHeight : 760;
            const spaceBelow = viewportH - (activePopover.anchor.y + activePopover.anchor.height);
            const spaceAbove = activePopover.anchor.y;
            const placeBelow =
              spaceBelow >= popoverEstHeight + 12 ||
              (spaceBelow >= spaceAbove && spaceAbove < popoverEstHeight + 12);

            const popoverTop = placeBelow
              ? Math.max(12, Math.min(viewportH - popoverEstHeight - 12, activePopover.anchor.y + activePopover.anchor.height + 8))
              : Math.max(12, activePopover.anchor.y - popoverEstHeight - 8);

            const curMidi = activePopover.pitch ? freqToMidi(activePopover.pitch) : 60;
            const curName = midiToNoteName(curMidi);
            const curOctave = Math.floor(curMidi / 12) - 1;
            const curSemitone = ((curMidi % 12) + 12) % 12;

            const updatePitch = (targetMidi: number) => {
              const clampedMidi = Math.max(24, Math.min(96, targetMidi));
              const newFreq = midiToFreq(clampedMidi);
              const now = getAudioContext().currentTime;
              const targetTrack = song.tracks.find((t) => t.trackKey === activePopover.trackKey);
              inst.playSound(now, activePopover.stepIdx, newFreq, 0.25, targetTrack?.volume ?? 1, targetTrack?.reverb);
              const oldPitch = activePopover.pitch ?? newFreq;
              setActivePopover((prev) => (prev ? { ...prev, pitch: newFreq } : null));
              if (activePopover.isPitchLane) {
                setCustomPitchesByTrack((prev) => ({
                  ...prev,
                  [activePopover.trackKey]: Array.from(
                    new Set([...(prev[activePopover.trackKey] || []), clampedMidi])
                  ).sort((a, b) => b - a),
                }));
                void perform({
                  action: "changePitchNote",
                  barIndex: activePopover.barIdx,
                  trackKey: activePopover.trackKey,
                  stepIndex: activePopover.stepIdx,
                  fromPitch: oldPitch,
                  toPitch: newFreq,
                });
              } else {
                void perform({
                  action: "setNotePitch",
                  barIndex: activePopover.barIdx,
                  trackKey: activePopover.trackKey,
                  stepIndex: activePopover.stepIdx,
                  pitch: newFreq,
                });
              }
            };

            const deleteCurrentNote = () => {
              if (activePopover.isPitchLane && activePopover.pitch) {
                void perform({
                  action: "togglePitchStep",
                  barIndex: activePopover.barIdx,
                  trackKey: activePopover.trackKey,
                  stepIndex: activePopover.stepIdx,
                  pitch: activePopover.pitch,
                });
              } else {
                void perform({
                  action: "toggleStep",
                  barIndex: activePopover.barIdx,
                  trackKey: activePopover.trackKey,
                  stepIndex: activePopover.stepIdx,
                });
              }
              setActivePopover(null);
            };

            return (
              <>
                <div className="ps-popover-backdrop" onClick={() => setActivePopover(null)} />
                <div
                  className="ps-pitch-popover"
                  style={{ left: `${popoverLeft}px`, top: `${popoverTop}px` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ps-popover-header">
                    <div className="ps-popover-title-row">
                      {isPercussion ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                          {getInstName(inst.id)}
                        </span>
                      ) : (
                        <>
                          <span className="ps-popover-note-name">{curName}</span>
                          <span className="ps-popover-note-freq">
                            ({activePopover.pitch?.toFixed(1) || "440.0"} Hz)
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ps-popover-close-btn"
                      title={t("close")}
                      onClick={() => setActivePopover(null)}
                    >
                      ✕
                    </button>
                  </div>

                  {isPercussion ? (
                    <div style={{ fontSize: 11, color: "var(--ps-dim)", padding: "4px 0" }}>
                      {t("percussionNote")}
                    </div>
                  ) : (
                    <>
                      <div className="ps-popover-quick-row">
                        <div className="ps-popover-btn-group">
                          <button
                            type="button"
                            className="ps-btn-micro"
                            title={t("semitoneDown")}
                            onClick={() => updatePitch(curMidi - 1)}
                          >
                            {t("semitoneDown")}
                          </button>
                          <button
                            type="button"
                            className="ps-btn-micro"
                            title={t("semitoneUp")}
                            onClick={() => updatePitch(curMidi + 1)}
                          >
                            {t("semitoneUp")}
                          </button>
                        </div>

                        <div className="ps-popover-btn-group">
                          <button
                            type="button"
                            className="ps-btn-micro"
                            title={t("octaveDown")}
                            disabled={curOctave <= 1}
                            onClick={() => updatePitch(curMidi - 12)}
                          >
                            {t("octaveDown")}
                          </button>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: "ui-monospace, monospace",
                              color: "var(--ps-muted)",
                            }}
                          >
                            Oct {curOctave}
                          </span>
                          <button
                            type="button"
                            className="ps-btn-micro"
                            title={t("octaveUp")}
                            disabled={curOctave >= 7}
                            onClick={() => updatePitch(curMidi + 12)}
                          >
                            {t("octaveUp")}
                          </button>
                        </div>
                      </div>

                      {/* 单八度钢琴键（加高白键可视区，避免黑键遮挡白键） */}
                      <div className="ps-mini-piano">
                        {WHITE_KEYS.map((wk) => {
                          const isActive = curSemitone === wk.offset;
                          return (
                            <div
                              key={wk.note}
                              className={`ps-piano-white-key ${isActive ? "is-active" : ""}`}
                              onClick={() => updatePitch((curOctave + 1) * 12 + wk.offset)}
                            >
                              {wk.note}
                            </div>
                          );
                        })}

                        {BLACK_KEYS.map((bk) => {
                          const isActive = curSemitone === bk.offset;
                          return (
                            <div
                              key={bk.note}
                              className={`ps-piano-black-key ${isActive ? "is-active" : ""}`}
                              style={{ left: bk.leftStyle }}
                              onClick={() => updatePitch((curOctave + 1) * 12 + bk.offset)}
                            >
                              {bk.note.replace("#", "♯")}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* 持续时长快捷调节 */}
                  <div className="ps-popover-dur-row">
                    <span className="ps-popover-dur-label">持续时长</span>
                    <div className="ps-popover-dur-buttons">
                      {[
                        { steps: 1, label: "1步", hint: "1/4拍" },
                        { steps: 2, label: "2步", hint: "半拍" },
                        { steps: 4, label: "4步", hint: "1拍" },
                        { steps: 6, label: "6步", hint: "1.5拍" },
                        { steps: 8, label: "8步", hint: "2拍" },
                        { steps: 12, label: "12步", hint: "3拍" },
                        { steps: 16, label: "16步", hint: "1小节" },
                      ].map((d) => {
                        const isCur = (activePopover.duration || 1) === d.steps;
                        return (
                          <button
                            key={d.steps}
                            type="button"
                            className={`ps-btn-dur-opt ${isCur ? "is-active" : ""}`}
                            title={`${d.label} (${d.hint})`}
                            onClick={() => {
                              setActivePopover((prev) => (prev ? { ...prev, duration: d.steps } : null));
                              if (activePopover.isPitchLane && activePopover.pitch) {
                                void perform({
                                  action: "setPitchNoteDuration",
                                  barIndex: activePopover.barIdx,
                                  trackKey: activePopover.trackKey,
                                  stepIndex: activePopover.stepIdx,
                                  pitch: activePopover.pitch,
                                  duration: d.steps,
                                });
                              } else {
                                void perform({
                                  action: "setNoteDuration",
                                  barIndex: activePopover.barIdx,
                                  trackKey: activePopover.trackKey,
                                  stepIndex: activePopover.stepIdx,
                                  duration: d.steps,
                                });
                              }
                            }}
                          >
                            <span>{d.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 底部操作区：安全删除与完成 */}
                  <div className="ps-popover-actions">
                    <button
                      type="button"
                      className="ps-btn-note-del"
                      title={t("deleteNote")}
                      onClick={deleteCurrentNote}
                    >
                      <span>🗑</span>
                      <span>{t("deleteNote")}</span>
                    </button>

                    <div style={{ display: "flex", gap: 6 }}>
                      {isPercussion && (
                        <button
                          type="button"
                          className="ps-btn-micro"
                          onClick={() => {
                            const now = getAudioContext().currentTime;
                            inst.playSound(now, 0);
                          }}
                        >
                          {t("audition")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="ps-btn-note-done"
                        onClick={() => setActivePopover(null)}
                      >
                        {t("done")}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
          })(),
          document.body
        )}

      {/* 音轨空间混响 Popover 悬浮窗 */}
      {activeReverbPopover &&
        createPortal(
          <>
            <div
              className="ps-popover-backdrop"
              onClick={() => setActiveReverbPopover(null)}
            />
            <div
              className="ps-reverb-popover"
              style={{
                position: "fixed",
                left: `${activeReverbPopover.anchor.x}px`,
                top: `${activeReverbPopover.anchor.y}px`,
                zIndex: 9999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ps-reverb-header">
                <span className="ps-reverb-title">
                  {getInstName(activeReverbPopover.instId)} · {t("trackReverb")}
                </span>
                <span className="ps-reverb-val-badge">
                  {Math.round(activeReverbPopover.reverb * 100)}%
                </span>
              </div>

              <div className="ps-reverb-slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(activeReverbPopover.reverb * 100)}
                  onInput={(e) => {
                    const val = Number((e.target as HTMLInputElement).value) / 100;
                    setActiveReverbPopover((prev) => (prev ? { ...prev, reverb: val } : null));
                    const currentT = songRef.current.tracks.find(t => t.trackKey === activeReverbPopover.trackKey);
                    if (currentT) currentT.reverb = val;
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    void perform({
                      action: "setTrackReverb",
                      trackKey: activeReverbPopover.trackKey,
                      reverb: val,
                    });
                  }}
                  className="ps-reverb-slider"
                />
              </div>

              <div className="ps-reverb-presets">
                {[
                  { label: t("reverbDry"), val: 0.0 },
                  { label: t("reverbRoom"), val: 0.2 },
                  { label: t("reverbHall"), val: 0.35 },
                  { label: t("reverbCathedral"), val: 0.65 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    className={`ps-reverb-preset-btn ${Math.abs(activeReverbPopover.reverb - preset.val) < 0.05 ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveReverbPopover((prev) => (prev ? { ...prev, reverb: preset.val } : null));
                      const currentT = songRef.current.tracks.find(t => t.trackKey === activeReverbPopover.trackKey);
                      if (currentT) currentT.reverb = preset.val;
                      void perform({
                        action: "setTrackReverb",
                        trackKey: activeReverbPopover.trackKey,
                        reverb: preset.val,
                      });
                      const inst = INSTRUMENT_MAP[activeReverbPopover.instId];
                      if (inst) {
                        const now = getAudioContext().currentTime;
                        inst.playSound(now, 0, 261.63, 0.75, 1, preset.val);
                      }
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="ps-reverb-footer">
                <button
                  type="button"
                  className="ps-reverb-audition-btn"
                  onClick={() => {
                    const inst = INSTRUMENT_MAP[activeReverbPopover.instId];
                    if (inst) {
                      const now = getAudioContext().currentTime;
                      inst.playSound(now, 0, 261.63, 0.75, 1, activeReverbPopover.reverb);
                    }
                  }}
                >
                  ▶ {t("auditionReverb")}
                </button>
                <button
                  type="button"
                  className="ps-reverb-done-btn"
                  onClick={() => setActiveReverbPopover(null)}
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* 乐器库选择弹窗 */}
      <div
        className={`ps-modal-overlay ${isPickerOpen ? "open" : ""}`}
        onClick={() => setIsPickerOpen(false)}
      >
        <div className="ps-picker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ps-modal-header">
            <div className="ps-modal-title">{t("pickerTitle")}</div>
            <span style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => setIsPickerOpen(false)}>
              ✕
            </span>
          </div>

          <div className="ps-catalog-grid">
            {Object.values(INSTRUMENT_MAP).map((inst) => (
              <div
                key={inst.id}
                className="ps-inst-card"
                onClick={() => {
                  if (pickerTarget) {
                    void perform({ action: "changeInstrument", trackKey: pickerTarget, instId: inst.id });
                  } else {
                    void perform({ action: "addTrack", instId: inst.id });
                  }
                  setIsPickerOpen(false);
                  const now = getAudioContext().currentTime;
                  inst.playSound(now, 0);
                }}
              >
                <div style={{ fontSize: 16, color: `var(--ps-${inst.colorClass.replace("is-", "")})` }}>
                  <InstrumentSvgIcon type={inst.iconType} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{getInstName(inst.id)}</div>
                  <div style={{ fontSize: 10, color: "var(--ps-dim)" }}>
                    {getInstDesc(inst.id)} · [{t(`category${inst.category}`)}]
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pickerTarget && song.tracks.length > 1 && (
            <div className="ps-modal-footer-delete">
              <button
                type="button"
                className="ps-btn-modal-delete-track"
                disabled={busy}
                onClick={() => {
                  const target = pickerTarget;
                  setIsPickerOpen(false);
                  void perform({ action: "removeTrack", trackKey: target });
                }}
              >
                <span>🗑</span>
                <span>{t("deleteTrackTooltip")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
