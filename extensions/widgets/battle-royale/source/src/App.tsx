import React, { useState, useEffect, useRef } from "react";
import {
  pudding,
  useWidgetState,
  useWidgetInteraction,
  useWidgetLocale,
} from "@pudding/widget";
import {
  Crosshair,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Users,
  Trophy,
  Zap,
  Check,
  ChevronDown,
  UserRound,
  Bot,
  Sparkles,
  AlertTriangle,
  X,
  Plane,
} from "lucide-react";
import type {
  Seat,
  TerrainType,
  WeaponId,
  BattleRoyaleLobby,
  BattleRoyalePosition,
} from "./types";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  COL_LETTERS,
  seatsForCount,
  isBotParticipant,
  WEAPONS,
  canAgentSeeAgent,
  canAgentSeeTile,
  chebyshevDist,
  isInStorm,
} from "./rules";
import {
  lobby,
  position,
  start,
  dropIn,
  takeAction,
  stepBotTurn,
  pause as pauseGame,
  resume as resumeGame,
} from "./game";
import {
  t,
  setLocale,
  seatLabel,
  seatShortLabel,
  botNameForSeat,
  terrainLabel,
} from "./text";
import {
  isSoundMuted,
  toggleSoundMute,
  playShotgunSound,
  playSniperSound,
  playExplosionSound,
  playHitSound,
  playVictorySound,
  playStepSound,
  playSelectSound,
} from "./sound";
import "./style.css";

interface Candidates {
  sessions: SessionCandidate[];
}

interface SessionCandidate {
  id: string;
  name: string;
  participantID?: string;
  model?: {
    name?: string;
    icon?: string;
  };
}

const SEAT_THEMES: Record<
  Seat,
  { border: string; glow: string; bg: string; text: string }
> = {
  Seat1: {
    border: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.45)",
    bg: "rgba(8, 47, 73, 0.7)",
    text: "#7dd3fc",
  },
  Seat2: {
    border: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.45)",
    bg: "rgba(69, 26, 3, 0.7)",
    text: "#fde047",
  },
  Seat3: {
    border: "#10b981",
    glow: "rgba(16, 185, 129, 0.45)",
    bg: "rgba(6, 78, 59, 0.7)",
    text: "#6ee7b7",
  },
  Seat4: {
    border: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    bg: "rgba(59, 7, 100, 0.7)",
    text: "#d8b4fe",
  },
  Seat5: {
    border: "#ec4899",
    glow: "rgba(236, 72, 153, 0.45)",
    bg: "rgba(80, 7, 36, 0.7)",
    text: "#f472b6",
  },
  Seat6: {
    border: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.45)",
    bg: "rgba(22, 78, 99, 0.7)",
    text: "#67e8f9",
  },
};

function TerrainBushArt() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="br-terrain-svg is-bush"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="48" height="48" fill="#14532d" fillOpacity="0.25" />
      <circle cx="14" cy="18" r="9" fill="#15803d" fillOpacity="0.32" />
      <circle cx="32" cy="16" r="10" fill="#166534" fillOpacity="0.35" />
      <circle cx="22" cy="30" r="11" fill="#14532d" fillOpacity="0.4" />
      <circle cx="34" cy="32" r="8" fill="#15803d" fillOpacity="0.3" />
    </svg>
  );
}

function SupplyCrateArt() {
  return (
    <svg viewBox="0 0 28 28" className="br-crate-svg" aria-hidden="true">
      <rect x="3" y="6" width="22" height="17" rx="3" fill="#854d0e" stroke="#fbbf24" strokeWidth="1.5" />
      <path d="M3 14H25M14 6V23" stroke="#fde047" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="#fbbf24" />
    </svg>
  );
}

function AirdropCrateArt() {
  return (
    <svg viewBox="0 0 28 28" className="br-crate-svg is-airdrop" aria-hidden="true">
      <rect x="3" y="10" width="22" height="15" rx="2" fill="#1e3a8a" stroke="#ef4444" strokeWidth="1.5" />
      <rect x="3" y="6" width="22" height="5" rx="1" fill="#dc2626" />
      <path d="M14 6V25M3 15H25" stroke="#fde047" strokeWidth="1.5" />
    </svg>
  );
}

function weaponBadgeCode(w: WeaponId): string {
  if (w === "sniper") return "98K";
  if (w === "rifle") return "M416";
  return t("weapon_fists_short");
}

function OperativeAvatar({
  info,
  seat,
  isWinner,
  isTurn,
  isAlive,
}: {
  info: { name: string; isBot: boolean; icon?: string };
  seat: Seat;
  isWinner?: boolean;
  isTurn?: boolean;
  isAlive?: boolean;
}) {
  const theme = SEAT_THEMES[seat];
  return (
    <div
      className={`br-avatar-wrap ${isTurn ? "is-turn" : ""} ${!isAlive ? "is-dead" : ""}`}
      style={{ borderColor: theme.border }}
    >
      <div className="br-avatar-circle" style={{ background: theme.bg }}>
        {info.icon ? (
          <img src={info.icon} alt="" className="br-avatar-img" />
        ) : info.isBot ? (
          <Bot size={13} style={{ color: theme.text }} />
        ) : (
          <UserRound size={13} style={{ color: theme.text }} />
        )}
      </div>
      {isWinner && <Trophy size={11} className="br-avatar-crown" />}
    </div>
  );
}

function SeatSelectorDropdown({
  seat,
  value,
  onChange,
  sessions,
  activeSeats,
  allSlots,
}: {
  seat: Seat;
  value: string;
  onChange: (val: string) => void;
  sessions: SessionCandidate[];
  activeSeats: Seat[];
  allSlots: Record<Seat, string>;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 230 && rect.top > spaceBelow;
      if (openUpward) {
        setMenuStyle({
          position: "fixed",
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          bottom: `${window.innerHeight - rect.top + 5}px`,
          top: "auto",
          maxHeight: `${Math.min(240, rect.top - 16)}px`,
          zIndex: 999,
        });
      } else {
        setMenuStyle({
          position: "fixed",
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          top: `${rect.bottom + 5}px`,
          bottom: "auto",
          maxHeight: `${Math.min(240, spaceBelow - 16)}px`,
          zIndex: 999,
        });
      }
    };
    updatePosition();
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open]);

  function getOccupiedSeat(id: string): Seat | null {
    if (!id || id.startsWith("@bot")) return null;
    const found = activeSeats.find((s) => s !== seat && allSlots[s] === id);
    return found || null;
  }

  const isMe = value === "@me";
  const isBot = value === "@bot" || value.startsWith("@bot");
  const currentSession = sessions.find(
    (s) => s.id === value || s.participantID === value,
  );

  const meOccupiedBy = getOccupiedSeat("@me");

  return (
    <div className="br-select-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="br-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="br-select-item-left">
          {isMe ? (
            <span className="br-select-icon is-human">
              <UserRound size={15} />
            </span>
          ) : isBot ? (
            <span className="br-select-icon is-bot">
              <Bot size={15} />
            </span>
          ) : currentSession?.model?.icon ? (
            <img
              src={currentSession.model.icon}
              alt=""
              className="br-select-model-img"
            />
          ) : (
            <span className="br-select-icon is-ai">
              <Sparkles size={15} />
            </span>
          )}
          <div className="br-select-texts">
            <strong className="br-select-title">
              {isMe
                ? t("playerYou")
                : isBot
                  ? `${t("playerBot")} · ${botNameForSeat(seat)}`
                  : currentSession?.name || value}
            </strong>
            <small className="br-select-sub">
              {isMe
                ? t("humanSubTag")
                : isBot
                  ? t("botTag")
                  : currentSession?.model?.name || "AI Session"}
            </small>
          </div>
        </div>
        <ChevronDown
          size={15}
          className={`br-select-chevron ${open ? "is-open" : ""}`}
        />
      </button>

      {open && (
        <div className="br-select-menu" style={menuStyle}>
          {/* Option: @me (You) */}
          <button
            type="button"
            disabled={Boolean(meOccupiedBy)}
            className={`br-select-option ${isMe ? "is-selected" : ""} ${
              meOccupiedBy ? "is-disabled" : ""
            }`}
            onClick={() => {
              if (meOccupiedBy) return;
              onChange("@me");
              setOpen(false);
            }}
          >
            <div className="br-select-item-left">
              <span className="br-select-icon is-human">
                <UserRound size={15} />
              </span>
              <div className="br-select-texts">
                <strong className="br-select-title">{t("playerYou")}</strong>
                <small className="br-select-sub">
                  {meOccupiedBy
                    ? t("alreadyAssignedTo", { seat: seatLabel(meOccupiedBy) })
                    : t("humanSubTag")}
                </small>
              </div>
            </div>
            {isMe && <Check size={14} className="br-select-check" />}
          </button>

          {/* Option: @bot (Built-in Bot) */}
          <button
            type="button"
            className={`br-select-option ${isBot ? "is-selected" : ""}`}
            onClick={() => {
              onChange("@bot");
              setOpen(false);
            }}
          >
            <div className="br-select-item-left">
              <span className="br-select-icon is-bot">
                <Bot size={15} />
              </span>
              <div className="br-select-texts">
                <strong className="br-select-title">
                  {t("playerBot")} · {botNameForSeat(seat)}
                </strong>
                <small className="br-select-sub">{t("botTag")}</small>
              </div>
            </div>
            {isBot && <Check size={14} className="br-select-check" />}
          </button>

          {/* Sessions Options */}
          {sessions.map((sess) => {
            const selected = value === sess.id || value === sess.participantID;
            const occ =
              getOccupiedSeat(sess.id) ||
              (sess.participantID ? getOccupiedSeat(sess.participantID) : null);
            return (
              <button
                key={sess.id}
                type="button"
                disabled={Boolean(occ)}
                className={`br-select-option ${selected ? "is-selected" : ""} ${
                  occ ? "is-disabled" : ""
                }`}
                onClick={() => {
                  if (occ) return;
                  onChange(sess.id);
                  setOpen(false);
                }}
              >
                <div className="br-select-item-left">
                  {sess.model?.icon ? (
                    <img
                      src={sess.model.icon}
                      alt=""
                      className="br-select-model-img"
                    />
                  ) : (
                    <span className="br-select-icon is-ai">
                      <Sparkles size={15} />
                    </span>
                  )}
                  <div className="br-select-texts">
                    <strong className="br-select-title">{sess.name}</strong>
                    <small className="br-select-sub">
                      {occ
                        ? t("alreadyAssignedTo", { seat: seatLabel(occ) })
                        : sess.model?.name || "AI Session"}
                    </small>
                  </div>
                </div>
                {selected && <Check size={14} className="br-select-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const l = lobby();
  const p = position();
  const run = useWidgetInteraction();

  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const knownPlayers = useRef(new Map<string, SessionCandidate>());
  const [pickerPlayerCount, setPickerPlayerCount] = useState<4 | 6>(l.playerCount || 4);
  const [pickerSlots, setPickerSlots] = useState<Record<Seat, string>>({
    Seat1: "@me",
    Seat2: "@bot",
    Seat3: "@bot",
    Seat4: "@bot",
    Seat5: "@bot",
    Seat6: "@bot",
  });
  const [picker, setPicker] = useState(false);
  const [godView, setGodView] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unmounted = false;
    (async () => {
      try {
        const c = await pudding.interaction.candidates();
        if (!unmounted && c) {
          setCandidates(c as unknown as Candidates);
          c.sessions?.forEach((s: SessionCandidate) => {
            knownPlayers.current.set(s.id, s);
            if (s.participantID) knownPlayers.current.set(s.participantID, s);
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      unmounted = true;
    };
  }, []);

  // Bot Turn Driver
  useEffect(() => {
    if (l.phase !== "dropping" && l.phase !== "combat") return;
    if (!p.turn || p.winner) return;

    const pid = l.seats[p.turn];
    if (!isBotParticipant(pid)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await stepBotTurn();
      } catch (err) {
        console.error("Bot turn execution failed:", err);
      }
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [l.phase, p.turn, p.winner, p.stepCount, l.seats]);

  // Audio Effects on Event
  const lastStepRef = useRef(p.stepCount);
  useEffect(() => {
    if (p.stepCount === lastStepRef.current) return;
    lastStepRef.current = p.stepCount;
    const ev = p.lastEvent;
    if (!ev) return;

    if (ev.kind === "victory") {
      playVictorySound();
    } else if (ev.kind === "attack" || ev.kind === "kill") {
      if (ev.weapon === "sniper") playSniperSound();
      else if (ev.weapon === "rifle") playShotgunSound();
      else playHitSound();
    } else if (ev.kind === "move" || ev.kind === "drop") {
      playStepSound();
    } else if (ev.kind === "storm") {
      playExplosionSound();
    }
  }, [p.stepCount, p.lastEvent]);

  const activeSeats = seatsForCount(l.playerCount);
  const human = run?.participants?.find((part) => part.kind === "human");
  const currentPartID = human?.id;
  const humanSeat = activeSeats.find((s) => l.seats[s] === currentPartID) || null;
  const isMyTurn = Boolean(humanSeat && p.turn === humanSeat && !p.winner);
  const observerSeat = godView ? null : humanSeat;
  const isFinished = l.phase === "finished" || Boolean(p.winner);

  async function perform(
    fn: (context: Parameters<typeof dropIn>[1]) => Promise<unknown>,
  ) {
    setBusy(true);
    setErrorMessage(null);
    try {
      await pudding.interaction.handle((c) => fn(c));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function getPlayerInfo(seat: Seat) {
    const pid = l.seats[seat];
    const isBot = isBotParticipant(pid);
    if (isBot) {
      return { name: botNameForSeat(seat), isBot: true };
    }
    if (pid === "@me" || (currentPartID && l.seats[seat] === currentPartID)) {
      return { name: t("playerYou"), isBot: false };
    }
    const found = pid ? knownPlayers.current.get(pid) : null;
    return { name: found?.name || seatShortLabel(seat), isBot: false, icon: found?.model?.icon };
  }

  async function handleTileClick(coord: string, x: number, y: number) {
    if (busy || !isMyTurn || isFinished || !humanSeat) return;
    const meAg = p.agents[humanSeat];
    if (!meAg.alive) return;

    if (l.phase === "dropping") {
      await perform((c) => dropIn({ coord }, c));
    } else if (l.phase === "combat") {
      if (meAg.x === null || meAg.y === null) return;
      const dist = chebyshevDist(meAg.x, meAg.y, x, y);
      const wep = WEAPONS[meAg.weapon];

      // Check if there is an attackable enemy on tile
      const enemiesOnTile = p.aliveSeats
        .filter((s) => s !== humanSeat)
        .map((s) => p.agents[s])
        .filter((e) => e.x === x && e.y === y);

      if (enemiesOnTile.length > 0 && dist <= wep.range) {
        // Attack!
        await perform((c) =>
          takeAction({ kind: "attack", target: enemiesOnTile[0].seat }, c),
        );
      } else if (dist === 1) {
        // Move! (Auto-loots crates on destination)
        await perform((c) => takeAction({ kind: "move", to: coord }, c));
      }
    }
  }

  const leftWingSeats = activeSeats.slice(0, Math.ceil(activeSeats.length / 2));
  const rightWingSeats = activeSeats.slice(Math.ceil(activeSeats.length / 2));

  function renderOperativeCard(seat: Seat) {
    const ag = p.agents[seat];
    const pInfo = getPlayerInfo(seat);
    const theme = SEAT_THEMES[seat];
    const isCurrent = p.turn === seat && !isFinished;
    const isWinner = p.winner === seat;

    return (
      <div
        key={seat}
        className={`br-agent-card ${isCurrent ? "is-turn" : ""} ${isWinner ? "is-winner" : ""} ${
          !ag.alive ? "is-eliminated" : ""
        }`}
        style={{ borderColor: isCurrent ? theme.border : undefined }}
      >
        <div className="br-agent-top">
          <OperativeAvatar
            info={pInfo}
            seat={seat}
            isWinner={isWinner}
            isTurn={isCurrent}
            isAlive={ag.alive}
          />
          <div className="br-agent-meta">
            <div className="br-agent-name-row">
              <span className="br-agent-name" title={pInfo.name}>
                {pInfo.name}
              </span>
              <span className="br-seat-pill" style={{ color: theme.text }}>
                {seatShortLabel(seat)}
              </span>
            </div>
            <div className="br-agent-tags">
              <span className={`br-wep-tag is-${ag.weapon}`}>
                {weaponBadgeCode(ag.weapon)}
              </span>
              {ag.kills > 0 && (
                <span className="br-kills-tag" title="Kills">
                  ⚔ {ag.kills}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="br-agent-bars">
          <div className="br-bar-track is-hp" title={`HP: ${ag.hp}/100`}>
            <div
              className={`br-bar-fill is-hp ${ag.hp <= 30 ? "is-critical" : ""}`}
              style={{ width: `${Math.max(0, Math.min(100, ag.hp))}%` }}
            />
            <span className="br-bar-label">HP {ag.hp}</span>
          </div>
        </div>

        {/* Action Note */}
        <div className="br-agent-radio-slot">
          {ag.lastActionSummary ? (
            <p className="br-action-note" title={ag.lastActionSummary}>
              {ag.lastActionSummary}
            </p>
          ) : (
            <p className="br-action-placeholder">{t("statusWaitingDrop")}</p>
          )}
        </div>

        {!ag.alive && (
          <div className="br-kia-stamp" aria-hidden="true">
            <span data-stamp={t("statusEliminated", { rank: ag.placement || "-" })} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="br-app">
      {errorMessage && (
        <div className="br-error-toast" role="alert">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="br-topbar">
        <div className="br-brand">
          <div className="br-emblem">
            <Plane size={18} className="br-plane-icon" />
          </div>
          <h1>{t("appTitle")}</h1>
          <div className="br-status-pills">
            {isFinished && p.winner ? (
              <span className="br-winner-pill">
                <Trophy size={13} />
                {t("winnerHeader", {
                  seat: seatShortLabel(p.winner),
                  name: getPlayerInfo(p.winner).name,
                })}
              </span>
            ) : (
              <>
                <span className="br-phase-pill">
                  {l.phase === "lobby"
                    ? t("phaseLobby")
                    : l.phase === "dropping"
                      ? t("phaseDropping")
                      : t("phaseCombat", { cycle: p.cycle, radius: p.stormRadius })}
                </span>
                <span className="br-alive-pill">
                  {t("aliveCount", { alive: p.aliveSeats.length, total: activeSeats.length })}
                </span>
                <span className="br-storm-pill">
                  <Zap size={11} />
                  {t("stormStatus", { radius: p.stormRadius, center: p.stormCenter.coord })}
                </span>
                {p.turn && l.phase !== "lobby" && (
                  <span className="br-turn-pill">
                    <Crosshair size={11} />
                    {seatShortLabel(p.turn)} · {getPlayerInfo(p.turn).name}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="br-toolbar">
          <button
            type="button"
            className={`br-top-btn ${godView ? "is-active" : ""}`}
            title={godView ? t("godViewOff") : t("godViewOn")}
            onClick={() => setGodView(!godView)}
          >
            {godView ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{godView ? t("godViewOff") : t("godViewOn")}</span>
          </button>

          <button
            type="button"
            className="br-top-btn is-icon"
            title={t("toggleSound")}
            onClick={() => setMuted(toggleSoundMute())}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Pause / Resume: only visible during active combat */}
          {l.phase === "combat" && !isFinished && (
            run?.status === "paused" ? (
              <button
                type="button"
                className="br-top-btn"
                onClick={() => void resumeGame()}
              >
                <Play size={13} />
                <span>{t("resume")}</span>
              </button>
            ) : (
              <button
                type="button"
                className="br-top-btn"
                onClick={() => void pauseGame()}
              >
                <Pause size={13} />
                <span>{t("pause")}</span>
              </button>
            )
          )}

          <button
            type="button"
            className="br-top-btn"
            onClick={() => setPicker(true)}
          >
            <Users size={13} />
            <span>{t("configure")}</span>
          </button>

          <button
            type="button"
            className="br-top-btn is-primary"
            onClick={() => {
              playSelectSound();
              setPicker(true);
            }}
          >
            <RotateCcw size={13} />
            <span>{t("newRound")}</span>
          </button>
        </div>
      </header>

      {/* Main Tactical Arena */}
      <main className="br-arena">
        {/* Left Operatives */}
        <aside className="br-wing is-left">
          {leftWingSeats.map((s) => renderOperativeCard(s))}
        </aside>

        {/* Center Stage: 8x8 Board */}
        <section className="br-center-stage">
          {l.phase === "lobby" && (
            <div className="br-welcome-overlay">
              <h2>{t("welcomeTitle")}</h2>
              <p>{t("welcomeSub")}</p>
              <button
                type="button"
                className="br-cta-btn"
                onClick={() => setPicker(true)}
              >
                <Plane size={15} />
                <span>{t("startDropBtn")}</span>
              </button>
            </div>
          )}

          <div className="br-board-box">
            {/* Column Headers A-H */}
            <div className="br-col-headers">
              <span className="br-corner-spacer" />
              {COL_LETTERS.map((col) => (
                <span key={col} className="br-col-label">
                  {col}
                </span>
              ))}
            </div>

            <div className="br-grid-body">
              {/* Row Numbers 1-8 */}
              <div className="br-row-headers">
                {Array.from({ length: GRID_HEIGHT }, (_, i) => (
                  <span key={i + 1} className="br-row-label">
                    {i + 1}
                  </span>
                ))}
              </div>

              {/* 8x8 Grid Tiles */}
              <div className="br-tiles-grid">
                {/* Safe Zone Perimeter Highlight */}
                {(() => {
                  const safeMinX = Math.max(0, p.stormCenter.x - p.stormRadius);
                  const safeMaxX = Math.min(GRID_WIDTH - 1, p.stormCenter.x + p.stormRadius);
                  const safeMinY = Math.max(0, p.stormCenter.y - p.stormRadius);
                  const safeMaxY = Math.min(GRID_HEIGHT - 1, p.stormCenter.y + p.stormRadius);
                  const safeColSpan = safeMaxX - safeMinX + 1;
                  const safeRowSpan = safeMaxY - safeMinY + 1;
                  return (
                    <div
                      className="br-safe-perimeter-box"
                      style={{
                        left: `calc(${safeMinX} * (var(--tile-size) + 2px))`,
                        top: `calc(${safeMinY} * (var(--tile-size) + 2px))`,
                        width: `calc(${safeColSpan} * var(--tile-size) + ${safeColSpan - 1} * 2px)`,
                        height: `calc(${safeRowSpan} * var(--tile-size) + ${safeRowSpan - 1} * 2px)`,
                      }}
                      aria-hidden="true"
                    >
                      <span className="br-safe-corner is-tl" />
                      <span className="br-safe-corner is-tr" />
                      <span className="br-safe-corner is-bl" />
                      <span className="br-safe-corner is-br" />
                      <span className="br-safe-perimeter-tag">{t("tagSafeZone")}</span>
                    </div>
                  );
                })()}

                {p.tiles.map((tile) => {
                  const inStorm = isInStorm(tile.x, tile.y, p.stormCenter, p.stormRadius);
                  const isStormCenter = tile.coord === p.stormCenter.coord;
                  const visibleInFog = canAgentSeeTile(p, observerSeat, tile.x, tile.y);
                  const agentsOnTile = p.activeSeats
                    .map((s) => p.agents[s])
                    .filter((ag) => ag.alive && ag.dropped && ag.x === tile.x && ag.y === tile.y);

                  let isMoveTarget = false;
                  let isAttackTarget = false;

                  if (isMyTurn && humanSeat) {
                    if (l.phase === "dropping") {
                      isMoveTarget = true;
                    } else if (l.phase === "combat") {
                      const meAg = p.agents[humanSeat];
                      if (meAg && meAg.x !== null && meAg.y !== null) {
                        const dist = chebyshevDist(meAg.x, meAg.y, tile.x, tile.y);
                        const wep = WEAPONS[meAg.weapon];
                        const hasEnemy = agentsOnTile.some((a) => a.seat !== humanSeat);

                        if (hasEnemy && dist <= wep.range) {
                          isAttackTarget = true;
                        } else if (dist === 1) {
                          isMoveTarget = true;
                        }
                      }
                    }
                  }

                  return (
                    <button
                      key={tile.coord}
                      type="button"
                      className={`br-tile is-ter-${tile.terrain} ${
                        inStorm ? "is-storm" : "is-safe"
                      } ${!visibleInFog ? "is-fog" : ""} ${
                        isMoveTarget ? "is-move-target" : ""
                      } ${isAttackTarget ? "is-attack-target" : ""}`}
                      title={`${tile.coord} · ${terrainLabel(tile.terrain)}${
                        isAttackTarget ? ` · ${t("tipTargetLocked")}` : ""
                      }`}
                      onClick={() => handleTileClick(tile.coord, tile.x, tile.y)}
                    >
                      {/* Bush Art */}
                      <div className="br-tile-terrain-art" aria-hidden="true">
                        {tile.terrain === "bush" && <TerrainBushArt />}
                      </div>

                      {/* Crates */}
                      {visibleInFog && tile.crate !== "none" && (
                        <div
                          className="br-loot-box"
                          title={tile.crate === "airdrop" ? t("crate_airdrop_tip") : t("crate_supply_tip")}
                        >
                          {tile.crate === "airdrop" ? <AirdropCrateArt /> : <SupplyCrateArt />}
                        </div>
                      )}

                      {/* Operative Tokens on Tile */}
                      <div className={`br-tile-agents count-${agentsOnTile.length}`}>
                        {agentsOnTile.map((ag) => {
                          const pInfo = getPlayerInfo(ag.seat);
                          const isMe = ag.seat === humanSeat;
                          const theme = SEAT_THEMES[ag.seat];
                          return (
                            <div
                              key={ag.seat}
                              className={`br-board-token ${isMe ? "is-self" : "is-enemy"} ${
                                p.turn === ag.seat ? "is-active-turn" : ""
                              }`}
                              title={`${seatLabel(ag.seat)} · ${pInfo.name} (HP: ${ag.hp})`}
                            >
                              {p.turn === ag.seat && <span className="br-token-ping-ring" />}
                              <div
                                className="br-token-disc"
                                style={{
                                  borderColor: theme.border,
                                  boxShadow: `0 0 10px ${theme.glow}`,
                                }}
                              >
                                <OperativeAvatar
                                  info={pInfo}
                                  seat={ag.seat}
                                  isWinner={p.winner === ag.seat}
                                  isTurn={p.turn === ag.seat}
                                  isAlive={ag.alive}
                                />
                                <span
                                  className="br-token-seat-badge"
                                  style={{ backgroundColor: theme.border }}
                                >
                                  {seatShortLabel(ag.seat)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Simple Human Turn Action Banner */}
          {isMyTurn && humanSeat && (
            <div className="br-action-banner">
              <span className="br-action-dot" />
              <span>{l.phase === "dropping" ? t("dropPrompt") : t("combatPrompt")}</span>
            </div>
          )}
        </section>

        {/* Right Operatives */}
        <aside className="br-wing is-right">
          {rightWingSeats.map((s) => renderOperativeCard(s))}
        </aside>
      </main>

      {/* Roster & Squad Size Modal */}
      {picker && (
        <div className="br-modal-backdrop" onClick={() => !busy && setPicker(false)}>
          <div className="br-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="br-modal-header">
              <div className="br-modal-title-row">
                <Users size={16} />
                <h3>{t("modalTitle")}</h3>
              </div>
              <button
                type="button"
                className="br-modal-close"
                disabled={busy}
                onClick={() => setPicker(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="br-modal-body">
              <div className="br-config-group">
                <label className="br-config-label">{t("playerCountLabel")}</label>
                <div className="br-mode-tabs">
                  <button
                    type="button"
                    className={`br-mode-tab ${pickerPlayerCount === 4 ? "is-active" : ""}`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(4);
                    }}
                  >
                    {t("mode4Players")}
                  </button>
                  <button
                    type="button"
                    className={`br-mode-tab ${pickerPlayerCount === 6 ? "is-active" : ""}`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(6);
                    }}
                  >
                    {t("mode6Players")}
                  </button>
                </div>
              </div>

              <div className="br-seats-grid">
                {seatsForCount(pickerPlayerCount).map((seat) => (
                  <div key={seat} className="br-seat-field">
                    <span className="br-seat-field-label">{seatLabel(seat)}</span>
                    <SeatSelectorDropdown
                      seat={seat}
                      value={pickerSlots[seat]}
                      onChange={(val) =>
                        setPickerSlots((prev) => ({ ...prev, [seat]: val }))
                      }
                      sessions={candidates?.sessions || []}
                      activeSeats={seatsForCount(pickerPlayerCount)}
                      allSlots={pickerSlots}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="br-modal-footer">
              <button
                type="button"
                className="br-modal-btn is-ghost"
                disabled={busy}
                onClick={() => setPicker(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="br-modal-btn is-confirm"
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    await start({
                      playerCount: pickerPlayerCount,
                      assignments: pickerSlots,
                    });
                    setPicker(false);
                  } catch (err: unknown) {
                    setErrorMessage(err instanceof Error ? err.message : String(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Plane size={13} />
                <span>{t("confirmStart")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
