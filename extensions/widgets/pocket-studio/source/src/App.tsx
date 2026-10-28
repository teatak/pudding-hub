import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { pudding, useStorage, useWidgetLocale } from "@pudding/widget";
import { type SongState, type Instrument } from "./types";
import { edit, editSong, readSong, getDefaultSong, registerPlaybackController, importSong, exportSong, canExportWav } from "./api";
import "./api";
import { getAudioContext, audioState } from "./audio";
import { playInstrument, resolvePitch } from "./instruments";
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
const INSTRUMENT_MAP: Record<string, Instrument & { playSound: (time: number, step: number, pitch?: number | null, duration?: number, volume?: number) => void }> = Object.fromEntries(INSTRUMENTS.map(inst => [inst.id, {
  ...inst,
  playSound: (time: number, step: number, pitch?: number | null, duration?: number, volume = 1) => playInstrument(inst.id, time, step, pitch, duration, undefined, volume),
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
  { note: "C#", offset: 1, leftStyle: "calc(14.28% - 7.5px)" },
  { note: "D#", offset: 3, leftStyle: "calc(28.57% - 7.5px)" },
  { note: "F#", offset: 6, leftStyle: "calc(57.14% - 7.5px)" },
  { note: "G#", offset: 8, leftStyle: "calc(71.43% - 7.5px)" },
  { note: "A#", offset: 10, leftStyle: "calc(85.71% - 7.5px)" }
];

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
  anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
    showBelow: boolean;
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

  const [draggingNote, setDraggingNote] = useState<{
    trackKey: string;
    barIdx: number;
    stepIdx: number;
    gStep: number;
    duration: number;
  } | null>(null);

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const songRef = useRef(song);
  songRef.current = song;

  const HEADER_WIDTH = 168;
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

  // 动态步进跨小节播放循环：支持实时变速，根据每个音符的 duration 持续发音
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
            if (barData.steps[t.trackKey]?.[stepInBar]) {
              const inst = INSTRUMENT_MAP[t.instId];
              if (inst) {
                const pitch = barData.pitches?.[t.trackKey]?.[stepInBar];
                const durSteps = barData.durations?.[t.trackKey]?.[stepInBar] || 1;
                const durSec = durSteps * stepSec;
                inst.playSound(now, currentGlobalStep, pitch, durSec, t.volume ?? 1);
              }
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

      // 循环重绕：步数回跳或回到第 0 步时，瞬间跳回开头（0 延迟即刻就绪）
      if (playStep < prevStep || playStep === 0) {
        container.scrollTo({ left: 0, behavior: "auto" });
        return;
      }

      // 正常向前播放：指针即将超出可视区域右边界时平滑向右跟随
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
          void perform({
            action: "toggleStep",
            barIndex: activePopover.barIdx,
            trackKey: activePopover.trackKey,
            stepIndex: activePopover.stepIdx
          });
          setActivePopover(null);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activePopover, importPending]);

  // 方案 A：右侧拖拽手柄放长音符
  function startDrag(
    e: React.PointerEvent,
    trackKey: string,
    barIdx: number,
    stepIdx: number,
    gStep: number,
    initialDuration: number,
    totalTimelineSteps: number
  ) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let lastDur = initialDuration;

    setDraggingNote({ trackKey, barIdx, stepIdx, gStep, duration: initialDuration });

    const maxAllowedDuration = Math.min(32, totalTimelineSteps - gStep);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSteps = Math.round(deltaX / STEP_PITCH);
      const nextDur = Math.max(1, Math.min(maxAllowedDuration, initialDuration + deltaSteps));
      if (nextDur !== lastDur) {
        lastDur = nextDur;
        setDraggingNote({ trackKey, barIdx, stepIdx, gStep, duration: nextDur });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setDraggingNote(null);
      if (lastDur !== initialDuration) {
        void perform({
          action: "setNoteDuration",
          barIndex: barIdx,
          trackKey,
          stepIndex: stepIdx,
          duration: lastDur
        });
        const now = getAudioContext().currentTime;
        const trackConf = songRef.current.tracks.find((t) => t.trackKey === trackKey);
        const inst = trackConf ? INSTRUMENT_MAP[trackConf.instId] : undefined;
        if (inst) {
          const pitch = songRef.current.bars[barIdx]?.pitches?.[trackKey]?.[stepIdx];
          const stepSec = 60 / songRef.current.bpm / 4;
          inst.playSound(now, gStep, pitch, lastDur * stepSec);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  const currentPlayingBar = Math.floor(playStep / 16);

  return (
    <main className="ps-console" data-playing={isPlaying} data-play-step={playStep}>
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
                      width: `${16 * STEP_PITCH - STEP_GAP}px`,
                      marginRight: `${STEP_GAP}px`
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
                      style={{ width: `${STEP_WIDTH}px` }}
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
              style={{ left: `${HEADER_WIDTH + playStep * STEP_PITCH + STEP_WIDTH / 2}px` }}
            />
          )}

          {/* 所有音轨行 */}
          <div className="ps-timeline-tracks">
            {song.tracks.map((tConfig, trackIdx) => {
              const inst = INSTRUMENT_MAP[tConfig.instId] || INSTRUMENT_MAP["lead"];

              // 提取该音轨所有音符
              const notes: {
                gStep: number;
                barIdx: number;
                stepIdx: number;
                duration: number;
                pitch?: number | null;
              }[] = [];

              song.bars.forEach((bar, bIdx) => {
                const steps = bar.steps[tConfig.trackKey];
                if (steps) {
                  steps.forEach((isActive, sIdx) => {
                    if (isActive) {
                      const gStep = bIdx * 16 + sIdx;
                      const dur = bar.durations?.[tConfig.trackKey]?.[sIdx] || 1;
                      const pitch = bar.pitches?.[tConfig.trackKey]?.[sIdx];
                      notes.push({ gStep, barIdx: bIdx, stepIdx: sIdx, duration: dur, pitch });
                    }
                  });
                }
              });

              return (
                <div key={tConfig.trackKey} className="ps-timeline-track-row">
                  {/* 左侧固定乐器头容器 (Sticky Left) */}
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
                            <span className="ps-row-name-text" title={getInstName(tConfig.instId)}>{getInstName(tConfig.instId)}</span>
                            <span className="ps-row-name-chevron" aria-hidden="true">▾</span>
                          </div>
                          <div className="ps-row-desc" title={getInstDesc(tConfig.instId)}>{getInstDesc(tConfig.instId)}</div>
                        </div>
                      </div>
                      {song.tracks.length > 1 && (
                        <button
                          type="button"
                          className="ps-btn-del"
                          title={t("deleteTrackTooltip")}
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void perform({ action: "removeTrack", trackKey: tConfig.trackKey });
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 时间轴步进区域 */}
                  <div className="ps-track-timeline" style={{ width: `${totalSteps * STEP_PITCH}px` }}>
                    {/* 底层网格格子：供点击创建新音符 */}
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
                            className={`ps-pad-btn ${isBarStart ? "bar-start" : ""} ${isBeat ? "bar-beat" : ""} ${
                              isCurrentBeat ? "playhead" : ""
                            }`}
                            style={{ width: `${STEP_WIDTH}px` }}
                            onClick={() => {
                              if (activePopover) setActivePopover(null);
                              const defaultPitch = getResolvedPitch(tConfig.instId, sIdx, null);
                              const now = getAudioContext().currentTime;
                              inst.playSound(now, g, defaultPitch, 0.2);
                              void perform({
                                action: "toggleStep",
                                barIndex: bIdx,
                                trackKey: tConfig.trackKey,
                                stepIndex: sIdx,
                                pitch: defaultPitch || undefined,
                                duration: 1
                              });
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* 上层音符块层：渲染实际音符，支持长音药丸条、拖拽手柄、点击弹出音调气泡 */}
                    <div className="ps-notes-layer">
                      {notes.map((note) => {
                        const isDraggingThis =
                          draggingNote &&
                          draggingNote.trackKey === tConfig.trackKey &&
                          draggingNote.gStep === note.gStep;
                        const currentDur = isDraggingThis ? draggingNote.duration : note.duration;
                        const isPlayingThisNote =
                          isPlaying && playStep >= note.gStep && playStep < note.gStep + currentDur;

                        const effectivePitch = getResolvedPitch(tConfig.instId, note.stepIdx, note.pitch);
                        const noteMidi = effectivePitch ? freqToMidi(effectivePitch) : null;
                        const noteName = noteMidi !== null ? midiToNoteName(noteMidi) : null;

                        return (
                          <div
                            key={note.gStep}
                            className={`ps-note-block ${inst.colorClass} ${isPlayingThisNote ? "active-playing" : ""}`}
                            style={{
                              left: `${note.gStep * STEP_PITCH}px`,
                              width: `${currentDur * STEP_PITCH - STEP_GAP}px`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const now = getAudioContext().currentTime;
                              inst.playSound(now, note.stepIdx, effectivePitch, 0.25);

                              const noteX = HEADER_WIDTH + note.gStep * STEP_PITCH;
                              const noteY = 48 + trackIdx * 52;
                              const showBelow = trackIdx <= 1;

                              setActivePopover({
                                trackKey: tConfig.trackKey,
                                instId: tConfig.instId,
                                barIdx: note.barIdx,
                                stepIdx: note.stepIdx,
                                gStep: note.gStep,
                                duration: currentDur,
                                pitch: effectivePitch,
                                anchor: {
                                  x: noteX,
                                  y: noteY,
                                  width: currentDur * STEP_PITCH - STEP_GAP,
                                  height: 52,
                                  showBelow
                                }
                              });
                            }}
                          >
                            <div className="ps-note-body">
                              {noteName && <span className="ps-note-pitch-tag">{noteName}</span>}
                              {currentDur > 1 ? (
                                <span className="ps-note-len-badge">{currentDur}</span>
                              ) : null}
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
                                  totalSteps
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

          {/* 音调与防误删气泡悬浮窗 */}
          {activePopover && (() => {
            const popoverWidth = 270;
            let popoverLeft = activePopover.anchor.x + activePopover.anchor.width / 2 - popoverWidth / 2;
            popoverLeft = Math.max(HEADER_WIDTH + 8, Math.min(totalSteps * STEP_PITCH + HEADER_WIDTH - popoverWidth - 8, popoverLeft));
            const popoverTop = activePopover.anchor.showBelow
              ? activePopover.anchor.y + activePopover.anchor.height + 8
              : Math.max(52, activePopover.anchor.y - 170);

            const inst = INSTRUMENT_MAP[activePopover.instId] || INSTRUMENT_MAP["lead"];
            const isPercussion = inst.category === "Drums";
            const curMidi = activePopover.pitch ? freqToMidi(activePopover.pitch) : 60;
            const curName = midiToNoteName(curMidi);
            const curOctave = Math.floor(curMidi / 12) - 1;
            const curSemitone = ((curMidi % 12) + 12) % 12;

            const updatePitch = (targetMidi: number) => {
              const clampedMidi = Math.max(24, Math.min(96, targetMidi));
              const newFreq = midiToFreq(clampedMidi);
              const now = getAudioContext().currentTime;
              inst.playSound(now, activePopover.stepIdx, newFreq, 0.25);
              setActivePopover((prev) => (prev ? { ...prev, pitch: newFreq } : null));
              void perform({
                action: "setNotePitch",
                barIndex: activePopover.barIdx,
                trackKey: activePopover.trackKey,
                stepIndex: activePopover.stepIdx,
                pitch: newFreq
              });
            };

            const deleteCurrentNote = () => {
              void perform({
                action: "toggleStep",
                barIndex: activePopover.barIdx,
                trackKey: activePopover.trackKey,
                stepIndex: activePopover.stepIdx
              });
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
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{getInstName(inst.id)}</span>
                      ) : (
                        <>
                          <span className="ps-popover-note-name">{curName}</span>
                          <span className="ps-popover-note-freq">({activePopover.pitch?.toFixed(1) || "440.0"} Hz)</span>
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
                          <span style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "var(--ps-muted)" }}>
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

                      {/* 单八度钢琴键 */}
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
          })()}
        </div>
      </div>

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
        </div>
      </div>
    </main>
  );
}
