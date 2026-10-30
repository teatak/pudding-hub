import React, { useState, useEffect, useId, useRef } from "react";
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
  Flame,
  Skull,
  ShieldAlert,
  X,
} from "lucide-react";
import type { BattleEvent, Seat, WeaponId } from "./types";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  COL_LETTERS,
  seatsForCount,
  isBotParticipant,
  WEAPONS,
  parseCoord,
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
  weaponLabel,
  terrainLabel,
} from "./text";
import {
  isSoundMuted,
  toggleSoundMute,
  playDropSound,
  playMoveSound,
  playAttackSound,
  playKillSound,
  playExplosionSound,
  playVictorySound,
  playSelectSound,
} from "./sound";
import "./style.css";

interface Candidates {
  sessions: SessionCandidate[];
  preferredSessionIDs?: string[];
}

interface SessionCandidate {
  id: string;
  name: string;
  participantID?: string;
  kind?: "session" | "external";
  connected?: boolean;
  model?: {
    name?: string;
    icon?: string;
  };
}

const interaction = pudding.interaction as typeof pudding.interaction & {
  onCandidatesChanged?: (listener: () => void) => () => void;
};

const SEAT_THEMES: Record<
  Seat,
  { border: string; glow: string; bg: string; text: string }
> = {
  Seat1: {
    border: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.5)",
    bg: "rgba(8, 47, 73, 0.85)",
    text: "#7dd3fc",
  },
  Seat2: {
    border: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.5)",
    bg: "rgba(69, 26, 3, 0.85)",
    text: "#fde047",
  },
  Seat3: {
    border: "#10b981",
    glow: "rgba(16, 185, 129, 0.5)",
    bg: "rgba(6, 78, 59, 0.85)",
    text: "#6ee7b7",
  },
  Seat4: {
    border: "#a855f7",
    glow: "rgba(168, 85, 247, 0.5)",
    bg: "rgba(59, 7, 100, 0.85)",
    text: "#d8b4fe",
  },
  Seat5: {
    border: "#ec4899",
    glow: "rgba(236, 72, 153, 0.5)",
    bg: "rgba(80, 7, 36, 0.85)",
    text: "#f472b6",
  },
  Seat6: {
    border: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.5)",
    bg: "rgba(22, 78, 99, 0.85)",
    text: "#67e8f9",
  },
};

/**
 * Matches `extensions/widgets/battle-royale/assets/icon.svg` 100%.
 */
function BattleRoyaleEmblemIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="26" fill="#0B111E" />
      <rect
        x="6"
        y="6"
        width="116"
        height="116"
        rx="22"
        stroke="#F59E0B"
        strokeOpacity="0.45"
        strokeWidth="2.5"
      />
      <circle
        cx="64"
        cy="64"
        r="46"
        fill="#111C2D"
        stroke="#38BDF8"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <path
        d="M64 12V24M64 104V116M12 64H24M104 64H116"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M34 62C34 43 46 31 64 31C82 31 94 43 94 62V82C94 88 89 93 83 93H45C39 93 34 88 34 82V62Z"
        fill="#334155"
        stroke="#FBBF24"
        strokeWidth="2.5"
      />
      <path
        d="M40 52H88C90 52 92 54 92 56V71C92 73 90 75 88 75H40C38 75 36 73 36 71V56C36 54 38 52 40 52Z"
        fill="#1E293B"
        stroke="#94A3B8"
        strokeWidth="2"
      />
      <rect x="43" y="59" width="42" height="9" rx="3" fill="#F59E0B" />
      <path
        d="M46 61H62"
        stroke="#FEF08A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="45" cy="84" r="2.5" fill="#FBBF24" />
      <circle cx="83" cy="84" r="2.5" fill="#FBBF24" />
      <path
        d="M53 84H75"
        stroke="#64748B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="96"
        cy="94"
        r="14"
        fill="#DC2626"
        stroke="#FEF08A"
        strokeWidth="2.5"
      />
      <path
        d="M90 95L94 99L103 90"
        stroke="#FEF08A"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Crisp layered tactical camouflage foliage SVG (replaces flat overlapping circles).
 */
function TerrainBushArt() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="br-terrain-svg is-bush"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="6"
        fill="#052e16"
        fillOpacity="0.42"
      />
      {/* Back dark foliage blades */}
      <path
        d="M10 36C8 27 13 18 22 14C19 22 19 29 22 36H10Z"
        fill="#14532d"
        fillOpacity="0.65"
      />
      <path
        d="M38 36C40 27 35 18 26 14C29 22 29 29 26 36H38Z"
        fill="#14532d"
        fillOpacity="0.65"
      />
      {/* Mid emerald leaf cluster */}
      <path
        d="M15 37C14 26 20 16 24 11C28 16 34 26 33 37H15Z"
        fill="#166534"
        fillOpacity="0.72"
      />
      <path
        d="M8 37C9 29 14 23 21 21C18 27 17 32 18 37H8Z"
        fill="#15803d"
        fillOpacity="0.6"
      />
      <path
        d="M40 37C39 29 34 23 27 21C30 27 31 32 30 37H40Z"
        fill="#15803d"
        fillOpacity="0.6"
      />
      {/* Crisp leaf vein highlights */}
      <path
        d="M24 15V35M24 23L19 19M24 26L29 22M14 34L19 27M34 34L29 27"
        stroke="#4ade80"
        strokeOpacity="0.38"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SupplyCrateArt() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="br-crate-svg is-supply"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="7"
        width="24"
        height="18"
        rx="3.5"
        fill="#78350f"
        stroke="#fbbf24"
        strokeWidth="1.6"
      />
      <rect x="6" y="9" width="20" height="5" rx="1.5" fill="#92400e" />
      <path
        d="M4 15.5H28M11 7V25M21 7V25"
        stroke="#fde047"
        strokeOpacity="0.85"
        strokeWidth="1.4"
      />
      <rect x="13" y="13" width="6" height="5" rx="1" fill="#fde047" />
    </svg>
  );
}

function AirdropCrateArt() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="br-crate-svg is-airdrop"
      aria-hidden="true"
    >
      <path
        d="M7 9C7 4.8 11 2 16 2C21 2 25 4.8 25 9H7Z"
        fill="#ef4444"
        fillOpacity="0.9"
        stroke="#fde047"
        strokeWidth="1.2"
      />
      <path
        d="M9 9L12 14M23 9L20 14M16 9V14"
        stroke="#cbd5e1"
        strokeWidth="1.1"
      />
      <rect
        x="6"
        y="13"
        width="20"
        height="15"
        rx="2.5"
        fill="#1e3a8a"
        stroke="#f87171"
        strokeWidth="1.5"
      />
      <rect x="6" y="12" width="20" height="4.5" rx="1.2" fill="#dc2626" />
      <path d="M16 12V28M6 20H26" stroke="#fde047" strokeWidth="1.5" />
    </svg>
  );
}

function WeaponSilhouette({ weapon }: { weapon: WeaponId }) {
  if (weapon === "sniper") {
    return (
      <svg viewBox="0 0 24 12" className="br-wep-svg" aria-hidden="true">
        <path
          d="M1 7H6L8 5H23V6.5H15L13 8.5H9L7 10H5.5L6.5 8H1V7Z"
          fill="currentColor"
        />
        <rect x="9" y="2.5" width="6.5" height="1.8" rx="0.8" fill="#fde047" />
      </svg>
    );
  }
  if (weapon === "rifle") {
    return (
      <svg viewBox="0 0 24 12" className="br-wep-svg" aria-hidden="true">
        <path
          d="M2 6.5H6L7.5 4.5H19.5V6.5H15L14 10H12L12.5 7.5H8.5L7.5 10.5H5.5L6.5 7.5H2V6.5Z"
          fill="currentColor"
        />
        <rect x="9" y="3" width="4" height="1.3" rx="0.5" fill="#7dd3fc" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 12" className="br-wep-svg" aria-hidden="true">
      <path
        d="M3 7.5L8 7.5L9 5.5L17 4L14 8.5L9 8.5L8 10L6.5 10L7 8.5L3 8.5V7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function weaponBadgeCode(w: WeaponId): string {
  if (w === "sniper") return "98K";
  if (w === "rifle") return "M416";
  return t("weapon_fists_short");
}

function weaponStatsShort(w: WeaponId): string {
  return t(`weapon_${w}_stat`);
}

function OperativeAvatar({
  info,
  seat,
  isWinner,
  isTurn,
  isAlive,
  size = "card",
}: {
  info: { name: string; isBot: boolean; icon?: string };
  seat: Seat;
  isWinner?: boolean;
  isTurn?: boolean;
  isAlive?: boolean;
  size?: "card" | "token";
}) {
  const gradId = useId();
  const theme = SEAT_THEMES[seat];
  const iconPx = size === "token" ? 13 : 15;

  return (
    <div
      className={`br-avatar-wrap is-${size} ${isTurn ? "is-turn" : ""} ${
        !isAlive ? "is-dead" : ""
      } ${isWinner ? "is-winner" : ""}`}
      style={{ borderColor: theme.border }}
    >
      {isWinner && (
        <svg
          className="br-winner-star-ring"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <polygon
            points="50,2 61,15 78,9 81,26 96,33 90,50 96,67 81,74 78,91 61,85 50,98 39,85 22,91 19,74 4,67 10,50 4,33 19,26 22,9 39,15"
            fill={`url(#${gradId})`}
            stroke="#FEF08A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="100"
              y2="100"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <div className="br-avatar-circle" style={{ background: theme.bg }}>
        {info.icon ? (
          <img src={info.icon} alt="" className="br-avatar-img" />
        ) : info.isBot ? (
          <Bot size={iconPx} style={{ color: theme.text }} />
        ) : (
          <UserRound size={iconPx} style={{ color: theme.text }} />
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
  const [pickerPlayerCount, setPickerPlayerCount] = useState<4 | 6>(
    l.playerCount || 4,
  );
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
  const [activeFxStep, setActiveFxStep] = useState<number | null>(null);

  async function loadCandidates(): Promise<Candidates | null> {
    try {
      const c = (await pudding.interaction.candidates()) as unknown as Candidates;
      if (c) {
        setCandidates(c);
        c.sessions?.forEach((s: SessionCandidate) => {
          knownPlayers.current.set(s.id, s);
          if (s.participantID) knownPlayers.current.set(s.participantID, s);
        });
      }
      return c;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    void loadCandidates();
    const unsubscribe = interaction.onCandidatesChanged?.(() => {
      void loadCandidates();
    });
    return () => unsubscribe?.();
  }, [
    run?.status,
    run?.participants?.map((part) => `${part.id}:${part.name}`).join(","),
  ]);

  // Bot Turn Driver
  useEffect(() => {
    if (run?.status === "paused") return;
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
    }, 640);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [l.phase, p.turn, p.winner, p.stepCount, l.seats, run?.status]);

  // Rich Multi-Layered Audio Effects & Transient Visual FX Timer on Battle Event
  const lastStepRef = useRef(p.stepCount);
  const lastRoundRef = useRef(l.round);
  useEffect(() => {
    if (l.round > 0 && l.round !== lastRoundRef.current) {
      lastRoundRef.current = l.round;
      lastStepRef.current = p.stepCount;
      playDropSound(false);
      return;
    }
    if (p.stepCount === lastStepRef.current) return;
    lastStepRef.current = p.stepCount;
    const ev = p.lastEvent;
    if (!ev) return;

    setActiveFxStep(p.stepCount);
    const fxTimer = setTimeout(() => {
      setActiveFxStep((curr) => (curr === p.stepCount ? null : curr));
    }, 680);

    if (ev.kind === "victory") {
      playVictorySound();
    } else if (ev.kind === "kill") {
      playKillSound(ev.weapon);
    } else if (ev.kind === "attack") {
      playAttackSound(ev.weapon);
    } else if (ev.kind === "drop") {
      const lootedOnDrop = Boolean(
        ev.summary && (ev.summary.includes("获得") || ev.weapon !== "fists"),
      );
      playDropSound(lootedOnDrop);
    } else if (ev.kind === "move") {
      const destTile = ev.toCoord
        ? p.tiles.find((tile) => tile.coord === ev.toCoord)
        : null;
      const inBush = destTile?.terrain === "bush";
      const lootedOnMove = Boolean(
        ev.summary &&
          (ev.summary.includes("拾取") || ev.summary.includes("获得")),
      );
      playMoveSound(inBush, lootedOnMove);
    } else if (ev.kind === "storm") {
      playExplosionSound();
    }

    return () => clearTimeout(fxTimer);
  }, [l.round, p.stepCount, p.lastEvent, p.tiles]);

  const activeSeats = seatsForCount(l.playerCount);
  const human = run?.participants?.find((part) => part.kind === "human");
  const currentPartID = human?.id;
  const humanSeat =
    activeSeats.find(
      (s) =>
        l.seats[s] === "@me" || (currentPartID && l.seats[s] === currentPartID),
    ) || null;
  const isPaused = run?.status === "paused";
  const isMyTurn = Boolean(
    !isPaused && humanSeat && p.turn === humanSeat && !p.winner,
  );
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
    const part = run?.participants?.find((item) => item.id === pid);
    if (
      pid === "@me" ||
      part?.kind === "human" ||
      (currentPartID && l.seats[seat] === currentPartID)
    ) {
      return { name: t("playerYou"), isBot: false };
    }
    const found =
      (pid ? knownPlayers.current.get(pid) : null) ||
      candidates?.sessions.find(
        (s) =>
          s.participantID === pid ||
          s.id === pid ||
          (part?.name && s.name === part.name),
      );
    return {
      name: part?.name || found?.name || seatShortLabel(seat),
      isBot: false,
      icon: found?.model?.icon,
    };
  }

  function formatSeatTag(seat: Seat | null | undefined): string {
    if (!seat) return "";
    return `${seatShortLabel(seat)} ${getPlayerInfo(seat).name}`;
  }

  /**
   * Formats an operative's latest action in the active locale without leaking raw `Seat2` IDs
   * or hardcoded Chinese strings from `rules.ts`.
   */
  function formatAgentActionText(seat: Seat): string | null {
    const ag = p.agents[seat];
    const latestEv = [...(p.history || [])]
      .reverse()
      .find((item) => item.actor === seat);

    if (latestEv) {
      if (latestEv.kind === "drop" && latestEv.toCoord) {
        const lootedSniper = latestEv.summary?.includes("狙") || latestEv.weapon === "sniper";
        const lootedRifle = latestEv.summary?.includes("步枪") || latestEv.weapon === "rifle";
        if (lootedSniper) return t("actDropSniper", { coord: latestEv.toCoord });
        if (lootedRifle) return t("actDropRifle", { coord: latestEv.toCoord });
        return t("actDropPlain", { coord: latestEv.toCoord });
      }
      if (latestEv.kind === "move" && latestEv.fromCoord && latestEv.toCoord) {
        const lootedSniper = latestEv.summary?.includes("狙");
        const lootedRifle = latestEv.summary?.includes("步枪");
        if (lootedSniper) {
          return t("actMoveSniper", {
            from: latestEv.fromCoord,
            to: latestEv.toCoord,
          });
        }
        if (lootedRifle) {
          return t("actMoveRifle", {
            from: latestEv.fromCoord,
            to: latestEv.toCoord,
          });
        }
        return t("actMovePlain", {
          from: latestEv.fromCoord,
          to: latestEv.toCoord,
        });
      }
      if (
        (latestEv.kind === "attack" || latestEv.kind === "kill") &&
        latestEv.targetSeat
      ) {
        const targetLabel = `${seatShortLabel(latestEv.targetSeat)} ${
          getPlayerInfo(latestEv.targetSeat).name
        }`;
        return t(
          latestEv.kind === "kill" ? "actAttackKill" : "actAttackHit",
          {
            target: targetLabel,
            dmg: latestEv.damage ?? WEAPONS[ag.weapon].damage,
          },
        );
      }
    }

    return ag.lastActionSummary || null;
  }

  /**
   * Formats the bottom HUD event ticker in the active locale with friendly operative names.
   */
  function formatTickerEventText(event: BattleEvent | null): string {
    if (!event) return t("welcomeSub");
    if (event.kind === "start") return t("tickerStart");
    if (event.kind === "drop" && event.actor && event.toCoord) {
      const lootedSniper =
        event.summary?.includes("狙") || event.weapon === "sniper";
      const lootedRifle =
        event.summary?.includes("步枪") || event.weapon === "rifle";
      const loot = lootedSniper
        ? t("tickerLootSniper")
        : lootedRifle
          ? t("tickerLootRifle")
          : "";
      return t("tickerDrop", {
        actor: formatSeatTag(event.actor),
        coord: event.toCoord,
        loot,
      });
    }
    if (event.kind === "move" && event.actor && event.toCoord) {
      const lootedSniper = event.summary?.includes("狙");
      const lootedRifle = event.summary?.includes("步枪");
      const loot = lootedSniper
        ? t("tickerLootSniper")
        : lootedRifle
          ? t("tickerLootRifle")
          : "";
      return t("tickerMove", {
        actor: formatSeatTag(event.actor),
        to: event.toCoord,
        loot,
      });
    }
    if (
      (event.kind === "attack" || event.kind === "kill") &&
      event.actor &&
      event.targetSeat
    ) {
      const wepCode =
        event.weapon && event.weapon !== "storm"
          ? weaponBadgeCode(event.weapon)
          : weaponBadgeCode("fists");
      return t(event.kind === "kill" ? "tickerKill" : "tickerAttack", {
        actor: formatSeatTag(event.actor),
        target: formatSeatTag(event.targetSeat),
        weapon: wepCode,
        dmg: event.damage ?? 25,
      });
    }
    if (event.kind === "victory" && event.winner) {
      return t("winnerBanner", {
        name: formatSeatTag(event.winner),
        kills: p.agents[event.winner]?.kills || 0,
      });
    }
    return event.summary;
  }

  function resolveSeatChoice(pid: string | null | undefined): string {
    if (!pid || isBotParticipant(pid)) return "@bot";
    if (pid === "@me" || (currentPartID && pid === currentPartID)) return "@me";
    const matched = candidates?.sessions.find(
      (s) =>
        s.participantID === pid ||
        s.id === pid ||
        run?.participants?.find((part) => part.id === pid)?.name === s.name,
    );
    return matched ? matched.id : "@bot";
  }

  function openPickerModal() {
    playSelectSound();
    setPickerPlayerCount(l.playerCount || 4);
    if (l.round > 0) {
      setPickerSlots({
        Seat1: resolveSeatChoice(l.seats.Seat1),
        Seat2: resolveSeatChoice(l.seats.Seat2),
        Seat3: resolveSeatChoice(l.seats.Seat3),
        Seat4: resolveSeatChoice(l.seats.Seat4),
        Seat5: resolveSeatChoice(l.seats.Seat5),
        Seat6: resolveSeatChoice(l.seats.Seat6),
      });
    }
    setErrorMessage(null);
    setPicker(true);
  }

  async function handleTileClick(coord: string, x: number, y: number) {
    if (busy || !isMyTurn || isFinished || !humanSeat) return;
    const meAg = p.agents[humanSeat];
    if (!meAg.alive) return;

    if (l.phase === "dropping") {
      playSelectSound();
      await perform((c) => dropIn({ coord }, c));
    } else if (l.phase === "combat") {
      if (meAg.x === null || meAg.y === null) return;
      const dist = chebyshevDist(meAg.x, meAg.y, x, y);
      const wep = WEAPONS[meAg.weapon];

      const enemiesOnTile = p.aliveSeats
        .filter((s) => s !== humanSeat)
        .map((s) => p.agents[s])
        .filter(
          (e) =>
            e.alive &&
            e.x === x &&
            e.y === y &&
            (godView || canAgentSeeAgent(p, humanSeat, e.seat)),
        );

      if (enemiesOnTile.length > 0 && dist <= wep.range) {
        await perform((c) =>
          takeAction({ kind: "attack", target: enemiesOnTile[0].seat }, c),
        );
      } else if (dist === 1 && enemiesOnTile.length === 0) {
        await perform((c) => takeAction({ kind: "move", to: coord }, c));
      }
    }
  }

  const leftWingSeats = activeSeats.slice(0, Math.ceil(activeSeats.length / 2));
  const rightWingSeats = activeSeats.slice(Math.ceil(activeSeats.length / 2));

  // Transient ballistic tracer line (auto-clears after 680ms so nothing ever sticks on the board)
  const ev = p.lastEvent;
  const showTracer = Boolean(
    activeFxStep === p.stepCount &&
      ev &&
      (ev.kind === "attack" || ev.kind === "kill") &&
      ev.fromCoord &&
      ev.toCoord,
  );
  let tracerPoints: { x1: number; y1: number; x2: number; y2: number } | null =
    null;
  if (showTracer && ev?.fromCoord && ev?.toCoord) {
    try {
      const f = parseCoord(ev.fromCoord);
      const tCoord = parseCoord(ev.toCoord);
      if (
        godView ||
        isFinished ||
        canAgentSeeTile(p, observerSeat, f.x, f.y) ||
        canAgentSeeTile(p, observerSeat, tCoord.x, tCoord.y)
      ) {
        tracerPoints = {
          x1: (f.x + 0.5) * (100 / GRID_WIDTH),
          y1: (f.y + 0.5) * (100 / GRID_HEIGHT),
          x2: (tCoord.x + 0.5) * (100 / GRID_WIDTH),
          y2: (tCoord.y + 0.5) * (100 / GRID_HEIGHT),
        };
      }
    } catch {
      tracerPoints = null;
    }
  }

  function renderOperativeCard(seat: Seat) {
    const ag = p.agents[seat];
    const pInfo = getPlayerInfo(seat);
    const theme = SEAT_THEMES[seat];
    const isCurrent = p.turn === seat && !isFinished && l.phase !== "lobby";
    const isWinner = isFinished && p.winner === seat;
    const visibleToObserver =
      godView ||
      isFinished ||
      seat === humanSeat ||
      (l.phase === "combat" && canAgentSeeAgent(p, observerSeat, seat));

    const hpPct = Math.max(0, Math.min(100, ag.hp));
    const actionText = formatAgentActionText(seat);

    return (
      <article
        key={seat}
        className={`br-agent-card ${isCurrent ? "is-turn" : ""} ${
          isWinner ? "is-winner" : ""
        } ${!ag.alive ? "is-eliminated" : ""}`}
        style={{
          borderColor: isCurrent ? theme.border : undefined,
          boxShadow: isCurrent ? `0 0 18px ${theme.glow}` : undefined,
        }}
      >
        <div className="br-agent-top">
          <OperativeAvatar
            info={pInfo}
            seat={seat}
            isWinner={isWinner}
            isTurn={isCurrent}
            isAlive={ag.alive}
            size="card"
          />
          <div className="br-agent-meta">
            <div className="br-agent-name-row">
              <strong className="br-agent-name" title={pInfo.name}>
                {pInfo.name}
              </strong>
              <div className="br-agent-badges">
                {ag.kills > 0 && (
                  <span className="br-kills-tag" title="Kills">
                    <Skull size={10} />
                    {ag.kills}
                  </span>
                )}
                <span
                  className="br-seat-pill"
                  style={{
                    color: theme.text,
                    borderColor: `${theme.border}66`,
                    background: theme.bg,
                  }}
                >
                  {seatShortLabel(seat)}
                </span>
              </div>
            </div>

            <div className="br-agent-tags">
              <span
                className={`br-wep-tag is-${ag.weapon}`}
                title={weaponLabel(ag.weapon)}
              >
                <WeaponSilhouette weapon={ag.weapon} />
                <span>{weaponBadgeCode(ag.weapon)}</span>
                <small>{weaponStatsShort(ag.weapon)}</small>
              </span>

              {ag.alive && visibleToObserver && ag.coord && (
                <span
                  className="br-coord-pill"
                  aria-hidden="true"
                  data-coord={ag.coord}
                />
              )}
            </div>
          </div>
        </div>

        {/* Segmented Tactical HP Bar */}
        <div className="br-agent-bars">
          <div className="br-bar-track is-hp" title={`HP: ${ag.hp}/100`}>
            <div
              className={`br-bar-fill is-hp ${
                ag.hp <= 30 ? "is-critical" : ag.hp <= 60 ? "is-warn" : ""
              }`}
              style={{ width: `${hpPct}%` }}
            />
            <div className="br-bar-segments" aria-hidden="true" />
            <span className="br-bar-label">HP {ag.hp}/100</span>
          </div>
        </div>

        {/* Localized Action Note */}
        <div className="br-agent-radio-slot">
          {actionText ? (
            <p className="br-action-note" title={actionText}>
              {actionText}
            </p>
          ) : (
            <p className="br-action-placeholder">{t("statusWaitingDrop")}</p>
          )}
        </div>

        {!ag.alive && (
          <div className="br-kia-stamp" aria-hidden="true">
            <span
              data-stamp={t("statusEliminated", { rank: ag.placement || "-" })}
            />
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="br-app">
      {errorMessage && (
        <div className="br-error-toast" role="alert">
          <ShieldAlert size={15} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="br-topbar">
        <div className="br-brand">
          <div className="br-emblem" aria-hidden="true">
            <BattleRoyaleEmblemIcon size={28} />
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
                      : t("phaseCombat", {
                          cycle: p.cycle,
                          radius: p.stormRadius,
                        })}
                </span>
                <span className="br-alive-pill">
                  {t("aliveCount", {
                    alive: p.aliveSeats.length,
                    total: activeSeats.length,
                  })}
                </span>
                <span className="br-storm-pill">
                  <Zap size={11} />
                  {t("stormStatus", {
                    radius: p.stormRadius,
                    center: p.stormCenter.coord,
                  })}
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
            onClick={() => {
              playSelectSound();
              setGodView(!godView);
            }}
          >
            {godView ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{godView ? t("godViewOff") : t("godViewOn")}</span>
          </button>

          <button
            type="button"
            className={`br-top-btn is-icon ${!muted ? "is-active" : ""}`}
            title={t("toggleSound")}
            aria-label={t("toggleSound")}
            onClick={() => {
              const nextMuted = toggleSoundMute();
              setMuted(nextMuted);
              if (!nextMuted) playSelectSound();
            }}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {l.phase !== "lobby" && !isFinished && (
            <button
              type="button"
              className="br-top-btn"
              disabled={busy}
              onClick={() =>
                void perform(() => (isPaused ? resumeGame() : pauseGame()))
              }
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? t("resume") : t("pause")}</span>
            </button>
          )}

          <button
            type="button"
            className="br-top-btn"
            disabled={busy}
            onClick={openPickerModal}
          >
            <Users size={13} />
            <span>{t("configure")}</span>
          </button>

          <button
            type="button"
            className="br-top-btn is-primary"
            disabled={busy}
            onClick={openPickerModal}
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

        {/* Center Stage: 8x8 Tactical Grid + Live Event HUD */}
        <section className="br-center-stage">
          {l.phase === "lobby" && (
            <div className="br-welcome-overlay">
              <div className="br-welcome-emblem">
                <BattleRoyaleEmblemIcon size={56} />
              </div>
              <h2>{t("welcomeTitle")}</h2>
              <p>{t("welcomeSub")}</p>
              <button
                type="button"
                className="br-cta-btn"
                onClick={openPickerModal}
              >
                <Sparkles size={15} />
                <span>{t("startDropBtn")}</span>
              </button>
            </div>
          )}

          <div className="br-board-box">
            {/* Column Headers A-H */}
            <div className="br-col-headers" aria-hidden="true">
              <span className="br-corner-spacer" />
              {COL_LETTERS.map((col) => (
                <span key={col} className="br-col-label">
                  {col}
                </span>
              ))}
            </div>

            <div className="br-grid-body">
              {/* Row Numbers 1-8 */}
              <div className="br-row-headers" aria-hidden="true">
                {Array.from({ length: GRID_HEIGHT }, (_, i) => (
                  <span key={i + 1} className="br-row-label">
                    {i + 1}
                  </span>
                ))}
              </div>

              {/* 8x8 Grid Tiles */}
              <div className="br-tiles-grid">
                {/* Transient Ballistic Bullet / Sniper Laser Tracer SVG Overlay */}
                {tracerPoints && (
                  <svg
                    className="br-tracer-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      key={`beam-${p.stepCount}`}
                      x1={tracerPoints.x1}
                      y1={tracerPoints.y1}
                      x2={tracerPoints.x2}
                      y2={tracerPoints.y2}
                      className={`br-tracer-line is-${ev?.weapon || "fists"}`}
                    />
                  </svg>
                )}

                {/* Safe Zone Perimeter Highlight */}
                {(() => {
                  const safeMinX = Math.max(0, p.stormCenter.x - p.stormRadius);
                  const safeMaxX = Math.min(
                    GRID_WIDTH - 1,
                    p.stormCenter.x + p.stormRadius,
                  );
                  const safeMinY = Math.max(0, p.stormCenter.y - p.stormRadius);
                  const safeMaxY = Math.min(
                    GRID_HEIGHT - 1,
                    p.stormCenter.y + p.stormRadius,
                  );
                  const safeColSpan = safeMaxX - safeMinX + 1;
                  const safeRowSpan = safeMaxY - safeMinY + 1;
                  return (
                    <div
                      className="br-safe-perimeter-box"
                      style={{
                        left: `calc(${safeMinX} * (var(--tile-size) + 2px))`,
                        top: `calc(${safeMinY} * (var(--tile-size) + 2px))`,
                        width: `calc(${safeColSpan} * var(--tile-size) + ${
                          safeColSpan - 1
                        } * 2px)`,
                        height: `calc(${safeRowSpan} * var(--tile-size) + ${
                          safeRowSpan - 1
                        } * 2px)`,
                      }}
                      aria-hidden="true"
                    >
                      <span className="br-safe-corner is-tl" />
                      <span className="br-safe-corner is-tr" />
                      <span className="br-safe-corner is-bl" />
                      <span className="br-safe-corner is-br" />
                      <span className="br-safe-perimeter-tag">
                        {t("tagSafeZone")}
                      </span>
                    </div>
                  );
                })()}

                {p.tiles.map((tile) => {
                  const inStorm = isInStorm(
                    tile.x,
                    tile.y,
                    p.stormCenter,
                    p.stormRadius,
                  );
                  const isStormCenter = tile.coord === p.stormCenter.coord;
                  const visibleInFog =
                    godView ||
                    isFinished ||
                    l.phase !== "combat" ||
                    canAgentSeeTile(p, observerSeat, tile.x, tile.y);

                  const agentsOnTile = p.activeSeats
                    .map((s) => p.agents[s])
                    .filter(
                      (ag) =>
                        ag.alive &&
                        ag.dropped &&
                        ag.x === tile.x &&
                        ag.y === tile.y &&
                        (godView ||
                          isFinished ||
                          ag.seat === humanSeat ||
                          (l.phase === "combat" &&
                            canAgentSeeAgent(p, observerSeat, ag.seat))),
                    );

                  let isMoveTarget = false;
                  let isAttackTarget = false;

                  if (isMyTurn && humanSeat) {
                    if (l.phase === "dropping") {
                      isMoveTarget = true;
                    } else if (l.phase === "combat") {
                      const meAg = p.agents[humanSeat];
                      if (meAg && meAg.x !== null && meAg.y !== null) {
                        const dist = chebyshevDist(
                          meAg.x,
                          meAg.y,
                          tile.x,
                          tile.y,
                        );
                        const wep = WEAPONS[meAg.weapon];
                        const hasEnemy = agentsOnTile.some(
                          (a) => a.seat !== humanSeat,
                        );

                        if (hasEnemy && dist <= wep.range) {
                          isAttackTarget = true;
                        } else if (dist === 1 && !hasEnemy) {
                          isMoveTarget = true;
                        }
                      }
                    }
                  }

                  const isDamagedTile = Boolean(
                    activeFxStep === p.stepCount &&
                      ev &&
                      (ev.kind === "attack" || ev.kind === "kill") &&
                      ev.toCoord === tile.coord &&
                      ev.damage,
                  );

                  return (
                    <button
                      key={tile.coord}
                      type="button"
                      className={`br-tile is-ter-${tile.terrain} ${
                        inStorm ? "is-storm" : "is-safe"
                      } ${!visibleInFog ? "is-fog" : ""} ${
                        isMoveTarget ? "is-move-target" : ""
                      } ${isAttackTarget ? "is-attack-target" : ""} ${
                        isDamagedTile ? "is-hit-flash" : ""
                      }`}
                      title={`${tile.coord} · ${terrainLabel(tile.terrain)}${
                        isStormCenter ? ` · ${t("tipSafeCenter")}` : ""
                      }${isAttackTarget ? ` · ${t("tipTargetLocked")}` : ""}`}
                      onClick={() =>
                        handleTileClick(tile.coord, tile.x, tile.y)
                      }
                    >
                      {/* Bush Art */}
                      <div className="br-tile-terrain-art" aria-hidden="true">
                        {tile.terrain === "bush" && <TerrainBushArt />}
                      </div>

                      {/* Subtle Coordinate Watermark */}
                      <div className="br-tile-head" aria-hidden="true">
                        <span className="br-tile-coord">{tile.coord}</span>
                      </div>

                      {/* Subtle Safe Zone Center Reticle Watermark */}
                      {isStormCenter &&
                        tile.crate === "none" &&
                        agentsOnTile.length === 0 && (
                          <span
                            className="br-center-reticle"
                            aria-hidden="true"
                          />
                        )}

                      {/* Crates */}
                      {visibleInFog && tile.crate !== "none" && (
                        <div
                          className={`br-loot-box ${
                            agentsOnTile.length > 0 ? "is-corner" : ""
                          }`}
                          title={
                            tile.crate === "airdrop"
                              ? t("crate_airdrop_tip")
                              : t("crate_supply_tip")
                          }
                        >
                          {tile.crate === "airdrop" ? (
                            <AirdropCrateArt />
                          ) : (
                            <SupplyCrateArt />
                          )}
                        </div>
                      )}

                      {/* Operative Tokens on Tile */}
                      <div
                        className={`br-tile-agents count-${agentsOnTile.length}`}
                      >
                        {agentsOnTile.map((ag) => {
                          const pInfo = getPlayerInfo(ag.seat);
                          const isMe = ag.seat === humanSeat;
                          const theme = SEAT_THEMES[ag.seat];
                          const inBush = tile.terrain === "bush";
                          return (
                            <div
                              key={ag.seat}
                              className={`br-board-token ${
                                isMe ? "is-self" : "is-enemy"
                              } ${p.turn === ag.seat ? "is-active-turn" : ""}`}
                              title={`${seatLabel(ag.seat)} · ${
                                pInfo.name
                              } (HP: ${ag.hp}, ${weaponBadgeCode(ag.weapon)})${
                                inBush ? ` ${t("tipBushConcealed")}` : ""
                              }`}
                            >
                              {p.turn === ag.seat && (
                                <span className="br-token-ping-ring" />
                              )}
                              <div
                                className="br-token-disc"
                                style={{
                                  borderColor: theme.border,
                                  boxShadow: `0 0 12px ${theme.glow}`,
                                }}
                              >
                                <OperativeAvatar
                                  info={pInfo}
                                  seat={ag.seat}
                                  isWinner={p.winner === ag.seat}
                                  isTurn={p.turn === ag.seat}
                                  isAlive={ag.alive}
                                  size="token"
                                />
                                <span
                                  className="br-token-seat-badge"
                                  style={{ backgroundColor: theme.border }}
                                >
                                  {seatShortLabel(ag.seat)}
                                </span>
                                {inBush && (
                                  <span
                                    className="br-token-stealth-dot"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <div
                                className="br-token-foot"
                                aria-hidden="true"
                              >
                                <span
                                  className={`br-token-wep-chip is-${ag.weapon}`}
                                  data-wep={weaponBadgeCode(ag.weapon)}
                                />
                                <span className="br-token-hp-mini">
                                  <i
                                    style={{
                                      width: `${Math.max(
                                        0,
                                        Math.min(100, ag.hp),
                                      )}%`,
                                    }}
                                    className={
                                      ag.hp <= 30 ? "is-critical" : ""
                                    }
                                  />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Transient Floating Damage Popup */}
                      {isDamagedTile && ev?.damage && (
                        <div
                          key={`dmg-${p.stepCount}`}
                          className={`br-floating-dmg ${
                            ev.kind === "kill" ? "is-kill" : ""
                          }`}
                          aria-hidden="true"
                        >
                          -{ev.damage}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unified Localized Tactical Event Ticker & Human Turn Banner */}
          <div
            className={`br-hud-footer ${isMyTurn ? "is-my-turn" : ""} ${
              isFinished ? "is-victory" : ""
            }`}
          >
            {isFinished && p.winner ? (
              <div className="br-hud-row">
                <Trophy size={14} className="br-hud-icon is-gold" />
                <strong>
                  {t("winnerBanner", {
                    name: `${seatShortLabel(p.winner)} · ${
                      getPlayerInfo(p.winner).name
                    }`,
                    kills: p.agents[p.winner]?.kills || 0,
                  })}
                </strong>
              </div>
            ) : isMyTurn && humanSeat ? (
              <div className="br-hud-row">
                <span className="br-action-dot" />
                <strong>
                  {l.phase === "dropping" ? t("dropPrompt") : t("combatPrompt")}
                </strong>
              </div>
            ) : (
              <div className="br-hud-row">
                <Flame size={14} className="br-hud-icon" />
                <span>{formatTickerEventText(p.lastEvent)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Operatives */}
        <aside className="br-wing is-right">
          {rightWingSeats.map((s) => renderOperativeCard(s))}
        </aside>
      </main>

      {/* Roster & Squad Size Modal */}
      {picker && (
        <div
          className="br-modal-backdrop"
          onClick={() => !busy && setPicker(false)}
        >
          <div className="br-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="br-modal-header">
              <div className="br-modal-title-row">
                <BattleRoyaleEmblemIcon size={24} />
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
                <label className="br-config-label">
                  {t("playerCountLabel")}
                </label>
                <div className="br-mode-tabs">
                  <button
                    type="button"
                    className={`br-mode-tab ${
                      pickerPlayerCount === 4 ? "is-active" : ""
                    }`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(4);
                    }}
                  >
                    {t("mode4Players")}
                  </button>
                  <button
                    type="button"
                    className={`br-mode-tab ${
                      pickerPlayerCount === 6 ? "is-active" : ""
                    }`}
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
                    <span className="br-seat-field-label">
                      {seatLabel(seat)}
                    </span>
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
                  playSelectSound();
                  await perform(async () => {
                    await start({
                      playerCount: pickerPlayerCount,
                      assignments: pickerSlots,
                    });
                    setPicker(false);
                  });
                }}
              >
                <Sparkles size={14} />
                <span>{t("confirmStart")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
