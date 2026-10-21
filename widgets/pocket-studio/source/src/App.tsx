import { useState, useEffect, useRef } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import { type SongState, type Instrument } from "./types";
import { edit, readSong, getDefaultSong } from "./api";
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

// 乐器音色库
const INSTRUMENT_MAP: Record<string, Instrument & { playSound: (time: number, step: number, pitch?: number | null) => void }> = {
  marioLead: {
    id: "marioLead",
    name: "Mario 8-Bit 方波",
    category: "Melodic",
    iconType: "mario",
    colorClass: "is-mario",
    desc: "经典红白机方波",
    playSound: (time, _s, pitch) => playSquareWave(pitch || 659.25, time)
  },
  kongLead: {
    id: "kongLead",
    name: "大金刚 1981 街机",
    category: "Melodic",
    iconType: "kong",
    colorClass: "is-kong",
    desc: "街机跳跃方波",
    playSound: (time, _s, pitch) => playSquareWave(pitch || 349.23, time, 0.16)
  },
  marioBass: {
    id: "marioBass",
    name: "8-Bit 三角波低音",
    category: "Bass",
    iconType: "bass",
    colorClass: "is-bass",
    desc: "弹性跳跃贝斯",
    playSound: (time, _s, pitch) => playTriangleBass(pitch || 130.81, time)
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
    playSound: (time, step) => {
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
      playSoftPluck(pentatonic[step % pentatonic.length], time);
    }
  },
  bass: {
    id: "bass",
    name: "模拟低音 Bass",
    category: "Bass",
    iconType: "bass",
    colorClass: "is-bass",
    desc: "温暖低通贝斯",
    playSound: (time, step) => {
      const progression = [65.41, 87.31, 98.00, 110.00];
      playAnalogBass(progression[Math.floor(step / 16) % 4], time);
    }
  },
  epiano: {
    id: "epiano",
    name: "电钢琴 Rhodes",
    category: "Melodic",
    iconType: "synth",
    colorClass: "is-snare",
    desc: "温润爵士和弦",
    playSound: (time, step) => {
      const scale = [261.63, 329.63, 392.00, 493.88, 523.25];
      playRhodes(scale[step % scale.length], time);
    }
  },
  marimba: {
    id: "marimba",
    name: "木琴 Marimba",
    category: "Melodic",
    iconType: "synth",
    colorClass: "is-hat",
    desc: "清脆热带木质",
    playSound: (time, step) => {
      const scale = [329.63, 392.00, 440.00, 523.25, 659.25];
      playMarimba(scale[step % scale.length], time);
    }
  }
};

export default function App() {
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const storage = useStorage();
  const rawSong = (storage.data as { song?: unknown } | undefined)?.song;
  const song: SongState = readSong(rawSong);

  const [activeBar, setActiveBar] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playStep, setPlayStep] = useState(0); // 0 ~ 63
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const songRef = useRef(song);
  songRef.current = song;
  const activeBarRef = useRef(activeBar);
  activeBarRef.current = activeBar;

  async function perform(action: Parameters<typeof edit>[0]) {
    setBusy(true);
    try {
      await edit(action);
    } catch (e) {
      console.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // 64 步进跨小节播放循环
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const stepMs = (60 / songRef.current.bpm / 4) * 1000;
      let currentGlobalStep = 0;

      timer = setInterval(() => {
        const now = getAudioContext().currentTime;
        const barIdx = Math.floor(currentGlobalStep / 16);
        const stepInBar = currentGlobalStep % 16;

        setPlayStep(currentGlobalStep);
        if (barIdx !== activeBarRef.current) {
          setActiveBar(barIdx);
        }

        const currentSong = songRef.current;
        const barData = currentSong.bars[barIdx];
        if (barData) {
          currentSong.tracks.forEach((t) => {
            if (barData.steps[t.trackKey]?.[stepInBar]) {
              const inst = INSTRUMENT_MAP[t.instId];
              if (inst) {
                const pitch = barData.pitches?.[t.trackKey]?.[stepInBar];
                inst.playSound(now, currentGlobalStep, pitch);
              }
            }
          });
        }

        currentGlobalStep = (currentGlobalStep + 1) % 64;
      }, stepMs);
    } else {
      setPlayStep(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

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

  const currentPlayingBar = Math.floor(playStep / 16);
  const currentStepInBar = playStep % 16;

  return (
    <main className="ps-console">
      {/* 顶部控制栏 */}
      <header className="ps-top-bar">
        <div className="ps-brand">
          <div className="ps-brand-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4" />
            </svg>
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
            <span style={{ color: "var(--ps-dim)" }}>{t("bpm")}</span>
            <span className="ps-tempo-val">{song.bpm}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
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
            className="ps-btn-pill"
            disabled={busy}
            onClick={() => void perform({ action: "loadPreset", presetName: "oriental" })}
          >
            🎋 {t("presetOriental")}
          </button>
          <button
            type="button"
            className="ps-btn-pill"
            disabled={busy}
            onClick={() =>
              void perform({ action: "copyBar", fromBar: activeBar, toBar: (activeBar + 1) % 4 })
            }
          >
            {t("copyNext")}
          </button>
          <button
            type="button"
            className="ps-btn-pill"
            style={{ color: "#f87171" }}
            disabled={busy}
            onClick={() => void perform({ action: "clearBar", barIndex: activeBar })}
          >
            {t("clearBar")}
          </button>
        </div>
      </header>

      {/* 4 小节翻页条 */}
      <div className="ps-structure-bar">
        <div className="ps-bars-selector">
          {[t("bar1"), t("bar2"), t("bar3"), t("bar4")].map((barLabel, idx) => (
            <button
              key={idx}
              type="button"
              className={`ps-bar-btn ${activeBar === idx ? "active" : ""} ${
                isPlaying && currentPlayingBar === idx ? "playing-now" : ""
              }`}
              onClick={() => setActiveBar(idx)}
            >
              <span className="ps-bar-dot" />
              <span>{barLabel}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-dim)", fontFamily: "monospace" }}>
          <span>
            {isPlaying ? (
              <strong style={{ color: "#10b981" }}>
                BAR {currentPlayingBar + 1} ({String(playStep + 1).padStart(2, "0")}/64)
              </strong>
            ) : (
              `BAR ${activeBar + 1} (EDITING)`
            )}
          </span>
        </div>
      </div>

      {/* 16 步进矩阵滚动主体 */}
      <div className="ps-matrix-scroll">
        <div className="ps-beat-scale">
          <div />
          <div className="ps-beat-mark bar-head">1.1</div>
          <div className="ps-beat-mark">.2</div>
          <div className="ps-beat-mark">.3</div>
          <div className="ps-beat-mark">.4</div>
          <div className="ps-beat-mark bar-head">2.1</div>
          <div className="ps-beat-mark">.2</div>
          <div className="ps-beat-mark">.3</div>
          <div className="ps-beat-mark">.4</div>
          <div className="ps-beat-mark bar-head">3.1</div>
          <div className="ps-beat-mark">.2</div>
          <div className="ps-beat-mark">.3</div>
          <div className="ps-beat-mark">.4</div>
          <div className="ps-beat-mark bar-head">4.1</div>
          <div className="ps-beat-mark">.2</div>
          <div className="ps-beat-mark">.3</div>
          <div className="ps-beat-mark">.4</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {song.tracks.map((tConfig) => {
            const inst = INSTRUMENT_MAP[tConfig.instId] || INSTRUMENT_MAP["lead"];
            const currentBarData = song.bars[activeBar];
            const trackSteps = currentBarData?.steps[tConfig.trackKey] || new Array(16).fill(false);

            return (
              <div key={tConfig.trackKey} className="ps-matrix-row">
                {/* 乐器信息卡片 */}
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

                {/* 16 步进打击垫 */}
                {trackSteps.map((isActive: boolean, stepIdx: number) => {
                  const isCurrentBeat = isPlaying && currentPlayingBar === activeBar && currentStepInBar === stepIdx;
                  const isBarBeat = stepIdx % 4 === 0;

                  return (
                    <div
                      key={stepIdx}
                      className={`ps-pad-btn ${isBarBeat ? "bar-beat" : ""} ${
                        isActive ? `active ${inst.colorClass}` : ""
                      } ${isCurrentBeat ? "playhead" : ""}`}
                      onClick={() => {
                        const nextActive = !isActive;
                        if (nextActive) {
                          const now = getAudioContext().currentTime;
                          inst.playSound(now, activeBar * 16 + stepIdx);
                        }
                        void perform({
                          action: "toggleStep",
                          barIndex: activeBar,
                          trackKey: tConfig.trackKey,
                          stepIndex: stepIdx
                        });
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 添加新乐器音轨插槽 */}
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
          <span>＋</span>
          <span>{t("addTrack")}</span>
        </div>
      </div>

      {/* 底部说明 */}
      <footer className="ps-bottom-bar">
        <div style={{ color: "var(--ps-dim)" }}>💡 {t("hintText")}</div>
        <div style={{ color: "var(--ps-muted)" }}>{t("sessionTip")}</div>
      </footer>

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
