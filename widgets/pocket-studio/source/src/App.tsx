import { useState, useEffect, useRef, useMemo } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import { type SongState, type Instrument } from "./types";
import { edit, editSong, readSong, getDefaultSong } from "./api";
import "./api";
import {
  getAudioContext,
  playSquareWave,
  playTriangleBass,
  playKick,
  playSnare,
  playHat,
  playAnalogBass,
  playSoftPluck,
  playRhodes,
  playMarimba
} from "./audio";
import { t, setLocale, errorText } from "./text";
import "./style.css";

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

// 乐器音色库 (支持持续发音时长 duration)
const INSTRUMENT_MAP: Record<string, Instrument & { playSound: (time: number, step: number, pitch?: number | null, duration?: number) => void }> = {
  marioLead: {
    id: "marioLead",
    name: "Mario 8-Bit 方波",
    category: "Melodic",
    iconType: "mario",
    colorClass: "is-mario",
    desc: "经典红白机方波",
    playSound: (time, _s, pitch, dur) => playSquareWave(pitch || 659.25, time, dur || 0.12)
  },
  kongLead: {
    id: "kongLead",
    name: "大金刚 1981 街机",
    category: "Melodic",
    iconType: "kong",
    colorClass: "is-kong",
    desc: "街机跳跃方波",
    playSound: (time, _s, pitch, dur) => playSquareWave(pitch || 349.23, time, dur || 0.16)
  },
  marioBass: {
    id: "marioBass",
    name: "8-Bit 三角波低音",
    category: "Bass",
    iconType: "bass",
    colorClass: "is-bass",
    desc: "弹性跳跃贝斯",
    playSound: (time, _s, pitch, dur) => playTriangleBass(pitch || 130.81, time, dur || 0.18)
  },
  kick: {
    id: "kick",
    name: "808 底鼓 (Kick)",
    category: "Drums",
    iconType: "kick",
    colorClass: "is-kick",
    desc: "下潜重低音",
    playSound: (time) => playKick(time)
  },
  snare: {
    id: "snare",
    name: "8-Bit 军鼓 (Snare)",
    category: "Drums",
    iconType: "snare",
    colorClass: "is-snare",
    desc: "清脆切分敲击",
    playSound: (time) => playSnare(time)
  },
  hat: {
    id: "hat",
    name: "闭镲 (Hi-Hat)",
    category: "Drums",
    iconType: "hat",
    colorClass: "is-hat",
    desc: "金属碎拍律动",
    playSound: (time) => playHat(time)
  },
  lead: {
    id: "lead",
    name: "五声音阶琴",
    category: "Melodic",
    iconType: "lead",
    colorClass: "is-lead",
    desc: "空灵自然音色",
    playSound: (time, step, pitch, dur) => {
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
      playSoftPluck(pitch || pentatonic[step % pentatonic.length], time, dur || 0.38);
    }
  },
  bass: {
    id: "bass",
    name: "模拟低音 Bass",
    category: "Bass",
    iconType: "bass",
    colorClass: "is-bass",
    desc: "温暖低通贝斯",
    playSound: (time, step, pitch, dur) => {
      const progression = [65.41, 87.31, 98.00, 110.00];
      playAnalogBass(pitch || progression[Math.floor(step / 16) % 4], time, dur || 0.32);
    }
  },
  epiano: {
    id: "epiano",
    name: "电钢琴 Rhodes",
    category: "Melodic",
    iconType: "synth",
    colorClass: "is-snare",
    desc: "温润爵士和弦",
    playSound: (time, step, pitch, dur) => {
      const scale = [261.63, 329.63, 392.00, 493.88, 523.25];
      playRhodes(pitch || scale[step % scale.length], time, dur || 0.5);
    }
  },
  marimba: {
    id: "marimba",
    name: "木琴 Marimba",
    category: "Melodic",
    iconType: "synth",
    colorClass: "is-hat",
    desc: "清脆热带木质",
    playSound: (time, _step, pitch, dur) => {
      playMarimba(pitch || 440, time, dur || 0.22);
    }
  }
};

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

  const HEADER_WIDTH = 154;
  const STEP_WIDTH = 34;
  const STEP_GAP = 4;
  const STEP_PITCH = STEP_WIDTH + STEP_GAP;

  const totalBars = song.bars.length;
  const totalSteps = totalBars * 16;

  async function perform(action: Parameters<typeof edit>[0]) {
    setBusy(true);
    // 乐观更新：点击即时生效
    setSong((prev) => editSong(prev, action));
    try {
      await edit(action);
    } catch (e) {
      console.error(errorText(e));
      await storage.refetch?.();
    } finally {
      setBusy(false);
    }
  }

  const playStepRef = useRef(0);

  // 动态步进跨小节播放循环：支持实时变速，根据每个音符的 duration 持续发音
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const stepMs = (60 / song.bpm / 4) * 1000;
      const stepSec = stepMs / 1000;
      let currentGlobalStep = playStepRef.current;

      timer = setInterval(() => {
        const now = getAudioContext().currentTime;
        const currentBarsCount = songRef.current.bars.length || 1;
        const currentTotalSteps = currentBarsCount * 16;
        currentGlobalStep = currentGlobalStep % currentTotalSteps;

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
                inst.playSound(now, currentGlobalStep, pitch, durSec);
              }
            }
          });
        }

        currentGlobalStep = (currentGlobalStep + 1) % currentTotalSteps;
      }, stepMs);
    } else {
      playStepRef.current = 0;
      setPlayStep(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, song.bpm, song.bars.length]);

  // 播放时时间轴自动跟随指针平滑向右滚动
  useEffect(() => {
    if (isPlaying && timelineScrollRef.current) {
      const container = timelineScrollRef.current;
      const playheadX = HEADER_WIDTH + playStep * STEP_PITCH;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;

      if (playheadX > viewRight - 100 || playheadX < viewLeft + HEADER_WIDTH) {
        const targetScroll = Math.max(0, playheadX - HEADER_WIDTH - 60);
        container.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }
  }, [isPlaying, playStep]);

  function togglePlay() {
    getAudioContext();
    setIsPlaying((prev) => !prev);
  }

  // 空格快捷键
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target instanceof HTMLElement && e.target.tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
    <main className="ps-console">
      {/* 顶部控制栏 */}
      <header className="ps-top-bar">
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
          >
            {isPlaying ? "■" : "▶"}
          </button>
          <div className="ps-tempo-pill">
            <button
              type="button"
              className="ps-tempo-step-btn"
              disabled={busy || song.bpm <= 60}
              onClick={() => void perform({ action: "setBpm", bpm: song.bpm - 5 })}
              title="减速 (-5)"
            >
              −
            </button>
            <span style={{ color: "var(--ps-dim)" }}>{t("bpm")}</span>
            <span className="ps-tempo-val">{song.bpm}</span>
            <button
              type="button"
              className="ps-tempo-step-btn"
              disabled={busy || song.bpm >= 180}
              onClick={() => void perform({ action: "setBpm", bpm: song.bpm + 5 })}
              title="加速 (+5)"
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="ps-btn-pill mario"
            disabled={busy}
            onClick={() => void perform({ action: "loadPreset", presetName: "mario" })}
          >
            🍄 {t("presetMario")}
          </button>
          <button
            type="button"
            className="ps-btn-pill kong"
            disabled={busy}
            onClick={() => void perform({ action: "loadPreset", presetName: "donkeyKong" })}
          >
            🦍 {t("presetDonkeyKong")}
          </button>
          <button
            type="button"
            className="ps-btn-pill oriental"
            disabled={busy}
            onClick={() => void perform({ action: "loadPreset", presetName: "oriental" })}
          >
            🎋 {t("presetOriental")}
          </button>
          <button
            type="button"
            className="ps-btn-pill"
            disabled={busy}
            onClick={() => void perform({ action: "loadPreset", presetName: "lofi" })}
          >
            ☕ {t("presetLofi")}
          </button>
          <button
            type="button"
            className="ps-btn-pill"
            style={{ color: "#818cf8" }}
            disabled={busy || totalBars >= 16}
            onClick={() => void perform({ action: "addBar" })}
            title="追加小节"
          >
            + {t("addBar")}
          </button>
          {totalBars > 1 && (
            <button
              type="button"
              className="ps-btn-pill"
              style={{ color: "#f87171" }}
              disabled={busy}
              onClick={() => void perform({ action: "removeBar" })}
              title="删除最后一节"
            >
              - {t("removeBar")}
            </button>
          )}
          <button
            type="button"
            className="ps-btn-pill"
            style={{ color: "#94a3b8" }}
            disabled={busy}
            onClick={() => {
              for (let i = 0; i < totalBars; i++) {
                void perform({ action: "clearBar", barIndex: i });
              }
            }}
          >
            {t("clearAll")}
          </button>
        </div>
      </header>

      {/* 连续横向滚动时间轴主体 (不分页) */}
      <div className="ps-timeline-viewport" ref={timelineScrollRef}>
        {/* 时间标尺行 (Sticky Top) */}
        <div className="ps-timeline-ruler-row">
          <div className="ps-ruler-corner">
            <span>{t("tracks")} ({song.tracks.length})</span>
            <span className="ps-total-bars-pill">{totalBars} BARS</span>
          </div>

          <div className="ps-ruler-track" style={{ width: `${totalSteps * STEP_PITCH}px` }}>
            {Array.from({ length: totalBars }).map((_, barIdx) => (
              <div key={barIdx} className="ps-ruler-bar-group" style={{ width: `${16 * STEP_PITCH}px` }}>
                <div className="ps-ruler-bar-label">
                  <span>BAR {barIdx + 1}</span>
                  {totalBars > 1 && (
                    <button
                      type="button"
                      className="ps-ruler-bar-del"
                      title={`删除第 ${barIdx + 1} 小节`}
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
                <div className="ps-ruler-ticks">
                  <span className="tick primary">{barIdx + 1}.1</span>
                  <span className="tick">.2</span>
                  <span className="tick">.3</span>
                  <span className="tick">.4</span>
                  <span className="tick primary">2</span>
                  <span className="tick">.2</span>
                  <span className="tick">.3</span>
                  <span className="tick">.4</span>
                  <span className="tick primary">3</span>
                  <span className="tick">.2</span>
                  <span className="tick">.3</span>
                  <span className="tick">.4</span>
                  <span className="tick primary">4</span>
                  <span className="tick">.2</span>
                  <span className="tick">.3</span>
                  <span className="tick">.4</span>
                </div>
              </div>
            ))}

            {totalBars < 16 && (
              <button
                type="button"
                className="ps-ruler-add-bar-btn"
                title="追加小节 (+1)"
                disabled={busy}
                onClick={() => void perform({ action: "addBar" })}
              >
                +
              </button>
            )}
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
        <div className="ps-timeline-tracks" style={{ width: `${HEADER_WIDTH + totalSteps * STEP_PITCH + 60}px` }}>
          {song.tracks.map((tConfig) => {
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
                {/* 乐器信息卡片 (Sticky Left) */}
                <div
                  className="ps-card-info sticky"
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
                        <span>{inst.name}</span>
                        <span style={{ fontSize: 8, color: "var(--ps-dim)" }}>▾</span>
                      </div>
                      <div className="ps-row-desc">{inst.desc}</div>
                    </div>
                  </div>
                  {song.tracks.length > 1 && (
                    <button
                      type="button"
                      className="ps-btn-del"
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
                            const now = getAudioContext().currentTime;
                            inst.playSound(now, g);
                            void perform({
                              action: "toggleStep",
                              barIndex: bIdx,
                              trackKey: tConfig.trackKey,
                              stepIndex: sIdx,
                              duration: 1
                            });
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* 上层音符块层：渲染实际音符，支持长音药丸条、拖拽手柄、点击删除 */}
                  <div className="ps-notes-layer">
                    {notes.map((note) => {
                      const isDraggingThis =
                        draggingNote &&
                        draggingNote.trackKey === tConfig.trackKey &&
                        draggingNote.gStep === note.gStep;
                      const currentDur = isDraggingThis ? draggingNote.duration : note.duration;
                      const isPlayingThisNote =
                        isPlaying && playStep >= note.gStep && playStep < note.gStep + currentDur;

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
                            void perform({
                              action: "toggleStep",
                              barIndex: note.barIdx,
                              trackKey: tConfig.trackKey,
                              stepIndex: note.stepIdx
                            });
                          }}
                        >
                          <div className="ps-note-body">
                            {currentDur > 1 ? (
                              <span className="ps-note-len-badge">{currentDur}</span>
                            ) : null}
                          </div>

                          <div
                            className="ps-note-handle"
                            title="按住向右拖拽放长节拍"
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

          {/* 添加音轨槽 */}
          <div className="ps-timeline-add-row">
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
              <span>{t("addTrack")}</span>
            </div>
          </div>
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
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{inst.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ps-dim)" }}>
                    {inst.desc} · [{inst.category}]
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
