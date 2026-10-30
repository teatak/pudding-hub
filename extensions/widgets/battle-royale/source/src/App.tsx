import React, { useEffect, useId, useRef, useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetLocale,
  useWidgetState,
  type SessionCandidate as SDKSessionCandidate,
} from "@pudding/widget";
import {
  Bot,
  Check,
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import type { Seat, TerrainType, WeaponId } from "./types";
import {
  COL_LETTERS,
  seatsForCount,
  isBotParticipant,
  WEAPONS,
  chebyshevDist,
  isInStorm,
  canAgentSeeAgent,
  canAgentSeeTile,
  attackRangeFor,
  parseCoord,
} from "./rules";
import {
  lobby,
  position,
  start,
  dropIn,
  takeAction,
  stepBotTurn,
  pause,
  resume,
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
  isSoundEnabled,
  setSoundEnabled,
  playSelectSound,
  playDropSound,
  playMoveSound,
  playLootSound,
  playHealSound,
  playAttackSound,
  playKillSound,
  playVictorySound,
} from "./sound";
import "./style.css";

type SessionCandidate = SDKSessionCandidate & {
  kind?: "session" | "external";
  connected?: boolean;
};
type Candidates = Omit<
  Awaited<ReturnType<typeof pudding.interaction.candidates>>,
  "sessions"
> & { sessions: SessionCandidate[] };

const interaction = pudding.interaction as typeof pudding.interaction & {
  onCandidatesChanged?: (listener: () => void) => () => void;
};

interface PlayerInfo {
  id: string;
  name: string;
  isHuman: boolean;
  isBot: boolean;
  model?: SessionCandidate["model"];
}

/**
 * Matches `extensions/widgets/battle-royale/assets/icon.svg` 100%.
 */
function BattleRoyaleEmblemIcon({ size = 30 }: { size?: number }) {
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
        strokeOpacity="0.4"
        strokeWidth="2"
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

function OperativeAvatar({
  info,
  seat,
  isWinner,
  isTurn,
  isAlive,
  size = "normal",
}: {
  info: PlayerInfo;
  seat: Seat;
  isWinner: boolean;
  isTurn: boolean;
  isAlive: boolean;
  size?: "normal" | "token";
}) {
  const gradId = useId();

  const innerContent = info.model?.icon ? (
    <img src={info.model.icon} alt="" className="br-avatar-img" />
  ) : info.isHuman ? (
    <UserRound size={size === "token" ? 13 : 17} />
  ) : info.isBot ? (
    <Bot size={size === "token" ? 13 : 17} />
  ) : (
    <Sparkles size={size === "token" ? 13 : 17} />
  );

  return (
    <div
      className={`br-avatar-wrap is-${size} ${isTurn ? "is-turn" : ""} ${
        !isAlive ? "is-out" : ""
      } ${isWinner ? "is-winner" : ""}`}
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
      <div className="br-avatar-circle">{innerContent}</div>
      <span className="br-seat-num-badge">{seatShortLabel(seat)}</span>
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
                    ? `(已分配给 ${seatLabel(meOccupiedBy)})`
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
                        ? `(已分配给 ${seatLabel(occ)})`
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

const SEAT_THEMES: Record<
  Seat,
  { color: string; bg: string; border: string; glow: string }
> = {
  Seat1: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", border: "#38bdf8", glow: "rgba(56, 189, 248, 0.55)" },
  Seat2: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)", border: "#f59e0b", glow: "rgba(245, 158, 11, 0.55)" },
  Seat3: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)", border: "#a855f7", glow: "rgba(168, 85, 247, 0.55)" },
  Seat4: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.18)", border: "#22c55e", glow: "rgba(34, 197, 94, 0.55)" },
  Seat5: { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)", border: "#06b6d4", glow: "rgba(6, 182, 212, 0.55)" },
  Seat6: { color: "#ec4899", bg: "rgba(236, 72, 153, 0.18)", border: "#ec4899", glow: "rgba(236, 72, 153, 0.55)" },
};

function terrainShortIcon(ter: TerrainType): string {
  if (ter === "base") return "🏰";
  if (ter === "tower") return "📡";
  if (ter === "bush") return "🌿";
  if (ter === "bunker") return "🛡️";
  return "";
}

function weaponBadgeCode(w: WeaponId): string {
  if (w === "awm") return "AWM";
  if (w === "sniper") return "98K";
  if (w === "rifle") return "M416";
  if (w === "shotgun") return "S12K";
  if (w === "smg") return "UMP";
  return "匕首";
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
    l.playerCount || 6,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [godView, setGodView] = useState(false);
  const [useGrenadeMode, setUseGrenadeMode] = useState(false);
  const [draftRadio, setDraftRadio] = useState("");
  const [whisperTarget, setWhisperTarget] = useState<"public" | Seat>("public");

  const prevRoundRef = useRef<number>(l.round);
  const prevStepRef = useRef<number>(p.stepCount);

  const humanPart = run?.participants.find((part) => part.kind === "human");
  const activeSeats = p.activeSeats.length
    ? p.activeSeats
    : seatsForCount(l.playerCount);
  const humanSeat =
    (humanPart && activeSeats.find((s) => l.seats[s] === humanPart.id)) || null;

  const isPaused = run?.status === "paused";
  const myTurn =
    !isPaused &&
    Boolean(humanSeat) &&
    (l.phase === "dropping" || l.phase === "combat") &&
    !p.winner &&
    p.turn === humanSeat;

  // Reset grenade toggle when turn changes
  useEffect(() => {
    setUseGrenadeMode(false);
  }, [p.turn, p.stepCount]);

  // Trigger battlefield audio synthesis on game events
  useEffect(() => {
    if (l.round > 0 && l.round !== prevRoundRef.current) {
      prevRoundRef.current = l.round;
      prevStepRef.current = p.stepCount;
      playDropSound();
      return;
    }
    if (p.stepCount !== prevStepRef.current) {
      prevStepRef.current = p.stepCount;
      const ev = p.lastEvent;
      if (!ev) return;

      if (ev.kind === "victory") {
        playVictorySound();
      } else if (ev.kind === "kill") {
        playKillSound(ev.weapon);
      } else if (ev.kind === "attack" || ev.kind === "grenade") {
        playAttackSound(ev.weapon);
      } else if (ev.kind === "loot") {
        playLootSound();
      } else if (ev.kind === "heal" || ev.kind === "guard") {
        playHealSound();
      } else if (ev.kind === "drop") {
        playDropSound();
      } else if (ev.kind === "move") {
        playMoveSound();
      }
    }
  }, [l.round, p.stepCount, p.lastEvent]);

  async function perform(
    fn: (context: Parameters<typeof dropIn>[1]) => Promise<unknown>,
  ) {
    setBusy(true);
    setError(null);
    try {
      await pudding.interaction.handle((c) => fn(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function initDefaultSeats(c: Candidates) {
    const sessions = (c.sessions || []).filter((s) => s.connected !== false);
    const externals = sessions
      .filter((s) => s.kind === "external")
      .map((s) => s.id);
    const preferred = (c.preferredSessionIDs || []).filter((id) =>
      sessions.some((s) => s.id === id),
    );
    const pool = Array.from(
      new Set([...externals, ...preferred, ...sessions.map((s) => s.id)]),
    );

    const assigned = new Set<string>(["@me"]);
    const nextSlot = () => {
      for (const id of pool) {
        if (!assigned.has(id)) {
          assigned.add(id);
          return id;
        }
      }
      return "@bot";
    };

    setPickerSlots({
      Seat1: "@me",
      Seat2: nextSlot(),
      Seat3: nextSlot(),
      Seat4: nextSlot(),
      Seat5: nextSlot(),
      Seat6: nextSlot(),
    });
  }

  function resolveSeatChoice(pid: string | null | undefined): string {
    if (!pid || isBotParticipant(pid)) return "@bot";
    if (humanPart?.id && pid === humanPart.id) return "@me";
    const matched = candidates?.sessions.find(
      (s) =>
        s.participantID === pid ||
        s.id === pid ||
        (
          run?.participants.find((part) => part.id === pid) as unknown as {
            sessionID?: string;
          }
        )?.sessionID === s.id ||
        run?.participants.find((part) => part.id === pid)?.name === s.name,
    );
    return matched ? matched.id : "@bot";
  }

  function openPickerModal() {
    setPickerPlayerCount(l.playerCount || 6);
    if (l.round > 0) {
      setPickerSlots({
        Seat1: resolveSeatChoice(l.seats.Seat1),
        Seat2: resolveSeatChoice(l.seats.Seat2),
        Seat3: resolveSeatChoice(l.seats.Seat3),
        Seat4: resolveSeatChoice(l.seats.Seat4),
        Seat5: resolveSeatChoice(l.seats.Seat5),
        Seat6: resolveSeatChoice(l.seats.Seat6),
      });
    } else if (candidates) {
      initDefaultSeats(candidates);
    }
    setError(null);
    setPicker(true);
  }

  async function loadCandidates(): Promise<Candidates | null> {
    try {
      const val: Candidates = await pudding.interaction.candidates();
      val.sessions.forEach((s) => {
        if (s.participantID) knownPlayers.current.set(s.participantID, s);
      });
      setCandidates(val);
      return val;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  useEffect(() => {
    void loadCandidates().then((val) => {
      if (val && l.round === 0) initDefaultSeats(val);
    });
    const unsubscribe = interaction.onCandidatesChanged?.(() => {
      void loadCandidates();
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [
    run?.status,
    run?.participants?.map((part) => `${part.id}:${part.name}`).join(","),
  ]);

  // Automatically step built-in Bot turns
  useEffect(() => {
    if (isPaused) return;
    if (l.phase !== "dropping" && l.phase !== "combat") return;
    if (!p.turn || p.winner) return;
    const activeId = l.seats[p.turn];
    if (!isBotParticipant(activeId)) return;

    const timer = setTimeout(() => {
      void stepBotTurn().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    }, 620);
    return () => clearTimeout(timer);
  }, [l.round, l.phase, p.turn, p.stepCount, p.winner, isPaused]);

  function getPlayerInfo(seat: Seat): PlayerInfo {
    const pid = l.seats[seat];
    if (!pid || isBotParticipant(pid)) {
      return {
        id: pid || `@bot:${seat}`,
        name: botNameForSeat(seat),
        isHuman: false,
        isBot: true,
      };
    }
    const part = run?.participants.find((item) => item.id === pid);
    const isHuman = part?.kind === "human";
    const candidate = candidates?.sessions.find(
      (s) =>
        (s.participantID && s.participantID === pid) ||
        s.id === pid ||
        (part as unknown as { sessionID?: string })?.sessionID === s.id ||
        (part?.name && s.name === part.name),
    );
    const sessionModel =
      candidate?.model ?? knownPlayers.current.get(pid)?.model;

    return {
      id: pid,
      name: isHuman ? t("playerYou") : part?.name || seatLabel(seat),
      isHuman: Boolean(isHuman),
      isBot: false,
      model: sessionModel,
    };
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSelectSound();
  }

  const observerSeat: Seat =
    humanSeat && activeSeats.includes(humanSeat) ? humanSeat : activeSeats[0];
  const observerAgent = p.agents[observerSeat];
  const isFinished = l.phase === "finished" && Boolean(p.winner);

  // Split seats symmetrically between Left Wing and Right Wing
  const half = Math.ceil(activeSeats.length / 2);
  const leftWingSeats = activeSeats.slice(0, half);
  const rightWingSeats = activeSeats.slice(half);

  function handleQuickStart() {
    void perform(async () => {
      await start({
        playerCount: pickerPlayerCount,
        assignments: pickerSlots,
      });
      setPicker(false);
    });
  }

  function buildCommsPayload() {
    const text = draftRadio.trim();
    if (!text) return { radio: undefined, whisper: undefined };
    if (whisperTarget !== "public" && whisperTarget !== humanSeat) {
      return {
        radio: undefined,
        whisper: { to: whisperTarget, message: text },
      };
    }
    return { radio: text, whisper: undefined };
  }

  function handleTileClick(coord: string, x: number, y: number) {
    if (busy || !myTurn || !humanSeat) return;

    if (l.phase === "dropping") {
      playSelectSound();
      void perform(async (c) => {
        await dropIn(
          {
            coord,
            radio: draftRadio.trim() || undefined,
          },
          c,
        );
        setDraftRadio("");
      });
      return;
    }

    if (l.phase === "combat") {
      const meAg = p.agents[humanSeat];
      if (!meAg || !meAg.alive || meAg.x === null || meAg.y === null) return;

      const dist = chebyshevDist(meAg.x, meAg.y, x, y);
      const maxRange = attackRangeFor(
        p,
        humanSeat,
        useGrenadeMode && meAg.grenades > 0,
      );

      // Check if there is an attackable visible enemy on this tile
      const enemyOnTile = p.aliveSeats
        .filter((s) => s !== humanSeat)
        .map((s) => p.agents[s])
        .find(
          (a) =>
            a.alive &&
            a.x === x &&
            a.y === y &&
            (godView || canAgentSeeAgent(p, humanSeat, a.seat)),
        );

      if (enemyOnTile && dist <= maxRange) {
        const comms = buildCommsPayload();
        void perform(async (c) => {
          await takeAction(
            {
              steps: [
                {
                  kind: "attack",
                  target: enemyOnTile.seat,
                  useGrenade: useGrenadeMode && meAg.grenades > 0,
                },
              ],
              radio: comms.radio,
              whisper: comms.whisper,
              finishTurn: p.turnAp <= 1,
            },
            c,
          );
          setDraftRadio("");
          setUseGrenadeMode(false);
        });
        return;
      }

      // If clicking current tile -> loot crate!
      if (dist === 0) {
        const comms = buildCommsPayload();
        void perform(async (c) => {
          await takeAction(
            {
              steps: [{ kind: "loot" }],
              radio: comms.radio,
              whisper: comms.whisper,
              finishTurn: p.turnAp <= 1,
            },
            c,
          );
          setDraftRadio("");
        });
        return;
      }

      // If clicking adjacent tile -> move 1 step (consuming 1 AP)!
      if (dist === 1) {
        const comms = buildCommsPayload();
        void perform(async (c) => {
          await takeAction(
            {
              steps: [{ kind: "move", to: coord }],
              radio: comms.radio,
              whisper: comms.whisper,
              finishTurn: p.turnAp <= 1,
            },
            c,
          );
          setDraftRadio("");
        });
      }
    }
  }

  function triggerHumanSingleStep(
    step:
      | { kind: "loot" }
      | { kind: "heal" }
      | { kind: "guard" },
  ) {
    if (busy || !myTurn || !humanSeat || !run || !humanPart) return;
    const comms = buildCommsPayload();
    void perform(async (c) => {
      await takeAction(
        {
          steps: [step],
          radio: comms.radio,
          whisper: comms.whisper,
          finishTurn: step.kind === "guard" || p.turnAp <= 1,
        },
        c,
      );
      setDraftRadio("");
    });
  }

  function renderOperativeCard(seat: Seat) {
    const info = getPlayerInfo(seat);
    const ag = p.agents[seat];
    const isTurn =
      (l.phase === "dropping" || l.phase === "combat") &&
      !p.winner &&
      p.turn === seat;
    const isWinner = isFinished && p.winner === seat;
    const visibleToObserver =
      godView ||
      isFinished ||
      seat === observerSeat ||
      (l.phase === "combat" &&
        (!observerAgent?.alive || canAgentSeeAgent(p, observerSeat, seat)));

    const hpPercent = Math.max(0, Math.min(100, Math.round((ag.hp / ag.maxHp) * 100)));
    const shieldPercent =
      ag.maxShield > 0
        ? Math.max(0, Math.min(100, Math.round((ag.shield / ag.maxShield) * 100)))
        : 0;

    const latestWhisper = (p.whisperLogs || [])
      .filter(
        (w) =>
          (w.fromSeat === seat || w.toSeat === seat) &&
          (godView ||
            isFinished ||
            w.fromSeat === observerSeat ||
            w.toSeat === observerSeat),
      )
      .at(-1);

    return (
      <article
        key={seat}
        className={`br-agent-card ${isTurn ? "is-turn" : ""} ${
          !ag.alive ? "is-eliminated" : ""
        } ${isWinner ? "is-winner" : ""}`}
      >
        <div className="br-agent-top">
          <OperativeAvatar
            info={info}
            seat={seat}
            isWinner={isWinner}
            isTurn={isTurn}
            isAlive={ag.alive}
          />
          <div className="br-agent-meta">
            <div className="br-agent-name-row">
              <strong className="br-agent-name" title={info.name}>
                {info.name}
              </strong>
              <div className="br-agent-badges">
                <span
                  className="br-iq-badge"
                  title={t("iqBadge", { score: ag.tacticalScore || 0 })}
                >
                  ⚡{ag.tacticalScore || 0}
                </span>
                <span className="br-kill-badge" title="Kills">
                  <Skull size={11} />
                  {ag.kills}
                </span>
              </div>
            </div>

            <div className="br-agent-sub-row">
              {ag.alive ? (
                <span
                  className="br-weapon-pill"
                  title={`${weaponLabel(ag.weapon)}${
                    ag.weapon !== "fists" ? ` · ${ag.ammo}/${ag.maxAmmo}` : ""
                  }`}
                >
                  <Swords size={10} className="br-wep-icon" />
                  <span className="br-wep-name">
                    {weaponLabel(ag.weapon)}
                    {ag.weapon !== "fists" ? ` · ${ag.ammo}/${ag.maxAmmo}` : ""}
                  </span>
                </span>
              ) : (
                <span className="br-out-pill">
                  {t("statusEliminated", { rank: ag.placement || "-" })}
                </span>
              )}

              {ag.alive && ag.spawnProtected && l.phase === "combat" && (
                <span className="br-spawn-pill" title={t("spawnShieldBadge")}>
                  🛡️-40%
                </span>
              )}

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

        {/* HP & Shield Vitality Bars */}
        <div className="br-vitality-bars">
          <div className="br-bar-track is-hp" title={`HP ${ag.hp}/${ag.maxHp}`}>
            <div
              className={`br-bar-fill is-hp ${
                ag.hp <= 35 ? "is-critical" : ag.hp <= 65 ? "is-warn" : ""
              }`}
              style={{ width: `${hpPercent}%` }}
            />
            <span className="br-bar-label">HP {ag.hp}</span>
          </div>

          <div
            className="br-bar-track is-shield"
            title={`Lv.${ag.armorLevel} Shield ${ag.shield}/${ag.maxShield}`}
          >
            <div
              className="br-bar-fill is-shield"
              style={{ width: `${shieldPercent}%` }}
            />
            <span className="br-bar-label">
              Lv.{ag.armorLevel} 甲 {ag.shield}
            </span>
          </div>
        </div>

        {/* Fixed-Height Radio, Encrypted Whisper & Tactical Log Slot */}
        <div className="br-agent-radio-slot">
          {latestWhisper && latestWhisper.fromSeat === seat ? (
            <p
              className="br-whisper-quote"
              title={`[密电 ➔ ${seatShortLabel(latestWhisper.toSeat)}] ${latestWhisper.text}`}
            >
              <span>
                🔒➔{seatShortLabel(latestWhisper.toSeat)}: “{latestWhisper.text}”
              </span>
            </p>
          ) : ag.lastRadio ? (
            <p className="br-radio-quote" title={ag.lastRadio}>
              <Radio size={11} className="br-radio-icon" />
              <span>“{ag.lastRadio}”</span>
            </p>
          ) : ag.lastActionSummary ? (
            <p className="br-action-note" title={ag.lastActionSummary}>
              {ag.lastActionSummary}
            </p>
          ) : (
            <p className="br-action-placeholder">等待盲降指令...</p>
          )}
        </div>

        {/* K.I.A Stamp Overlay when Eliminated */}
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

  // Compute bullet/grenade tracer coordinates if lastEvent was an attack/grenade/kill
  const ev = p.lastEvent;
  const showTracer =
    ev &&
    (ev.kind === "attack" || ev.kind === "grenade" || ev.kind === "kill") &&
    ev.fromCoord &&
    ev.toCoord;

  let tracerPoints: { x1: number; y1: number; x2: number; y2: number } | null =
    null;
  if (showTracer && ev?.fromCoord && ev?.toCoord) {
    try {
      const f = parseCoord(ev.fromCoord);
      const tCoord = parseCoord(ev.toCoord);
      tracerPoints = {
        x1: (f.x + 0.5) * (100 / 8),
        y1: (f.y + 0.5) * (100 / 6),
        x2: (tCoord.x + 0.5) * (100 / 8),
        y2: (tCoord.y + 0.5) * (100 / 6),
      };
    } catch {
      tracerPoints = null;
    }
  }

  const phaseText =
    l.phase === "lobby"
      ? t("phaseLobby")
      : l.phase === "dropping"
        ? t("phaseDropping")
        : l.phase === "finished"
          ? t("phaseFinished")
          : t("phaseCombat", { cycle: p.cycle, radius: p.stormRadius });

  return (
    <div className="br-app">
      {/* Top Header Bar */}
      <header className="br-topbar">
        <div className="br-brand">
          <div className="br-emblem" aria-hidden="true">
            <BattleRoyaleEmblemIcon size={30} />
          </div>
          <h1>{t("appTitle")}</h1>
          {l.round > 0 && (
            <div className="br-status-pills">
              <span className="br-phase-pill">{phaseText}</span>
              <span className="br-alive-pill">
                {t("aliveCount", {
                  alive: p.aliveSeats.length,
                  total: activeSeats.length,
                })}
              </span>
              <span className="br-storm-pill">
                <Zap size={12} />
                {t("stormStatus", {
                  radius: p.stormRadius,
                  center: p.stormCenter.coord,
                })}
              </span>
            </div>
          )}
        </div>

        <div className="br-toolbar">
          <button
            type="button"
            className={`br-top-btn ${godView ? "is-active" : ""}`}
            onClick={() => {
              playSelectSound();
              setGodView(!godView);
            }}
          >
            {godView ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{godView ? t("godViewOff") : t("godViewOn")}</span>
          </button>

          <button
            type="button"
            className={`br-top-btn is-icon ${soundOn ? "is-active" : ""}`}
            title={t("toggleSound")}
            aria-label={t("toggleSound")}
            onClick={toggleSound}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {l.phase !== "lobby" && !p.winner && (
            <button
              type="button"
              className="br-top-btn"
              disabled={busy}
              onClick={() =>
                void perform(() => (isPaused ? resume() : pause()))
              }
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isPaused ? t("resume") : t("pause")}</span>
            </button>
          )}

          <button
            type="button"
            className="br-top-btn"
            disabled={busy}
            onClick={openPickerModal}
          >
            <UsersRound size={15} />
            <span>{t("configure")}</span>
          </button>

          <button
            type="button"
            className="br-top-btn is-primary"
            disabled={busy}
            onClick={() => {
              if (l.round === 0) {
                openPickerModal();
              } else {
                handleQuickStart();
              }
            }}
          >
            <RotateCcw size={14} />
            <span>{t("newRound")}</span>
          </button>
        </div>
      </header>

      {/* Error Toast */}
      {error && (
        <div className="br-error-toast" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main 3-Column Tactical Arena */}
      <main className="br-arena">
        {/* Left Wing Operative Vitality Cards */}
        <aside className="br-wing is-left">
          {leftWingSeats.map((s) => renderOperativeCard(s))}
        </aside>

        {/* Center Stage: Kill-Feed Ticker + 8x6 Tactical Battlefield Grid + Bottom Command Dock */}
        <section className="br-center-stage">
          {/* Live Kill-Feed & Event Ticker */}
          <div className="br-ticker-bar">
            <div className="br-ticker-left">
              <Flame size={15} className="br-ticker-icon" />
              <span>
                {isFinished && p.winner
                  ? t("winnerBanner", {
                      name: `${seatShortLabel(p.winner)} · ${
                        getPlayerInfo(p.winner).name
                      }`,
                      kills: p.agents[p.winner]?.kills || 0,
                      score: p.agents[p.winner]?.tacticalScore || 0,
                    })
                  : p.lastEvent
                    ? p.lastEvent.summary
                    : t("welcomeSub")}
              </span>
            </div>

            {p.turn && !p.winner && l.phase !== "lobby" && (
              <span className="br-turn-tag">
                🎯 当前行动：{seatShortLabel(p.turn)} ·{" "}
                {getPlayerInfo(p.turn).name}
                {l.phase === "combat" ? ` (${p.turnAp} AP)` : ""}
              </span>
            )}
          </div>

          {/* 8x6 Tactical Island Map Grid */}
          <div className="br-map-container">
            {l.round === 0 || l.phase === "lobby" ? (
              <div className="br-welcome-overlay">
                <div className="br-welcome-emblem">
                  <BattleRoyaleEmblemIcon size={54} />
                </div>
                <h2>{t("welcomeTitle")}</h2>
                <p>{t("welcomeSub")}</p>
                <button
                  type="button"
                  className="br-cta-btn"
                  onClick={openPickerModal}
                >
                  <Sparkles size={16} />
                  <span>{t("startDropBtn")}</span>
                </button>
              </div>
            ) : null}

            {/* Column Letters Header (A..H) */}
            <div className="br-board-box">
              <div className="br-col-headers" aria-hidden="true">
                <span className="br-corner-spacer" />
                {COL_LETTERS.map((col) => (
                  <span key={col} className="br-col-label">
                    {col}
                  </span>
                ))}
              </div>

              <div className="br-grid-body">
                {/* Row Numbers (1..6) */}
                <div className="br-row-headers" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6].map((rNum) => (
                    <span key={rNum} className="br-row-label">
                      {rNum}
                    </span>
                  ))}
                </div>

                {/* 8x6 Tactical Tiles */}
                <div className="br-tiles-grid">
                {/* Animated Bullet / Laser Tracer SVG Overlay */}
                {tracerPoints && (
                  <svg
                    className="br-tracer-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      key={p.stepCount}
                      x1={tracerPoints.x1}
                      y1={tracerPoints.y1}
                      x2={tracerPoints.x2}
                      y2={tracerPoints.y2}
                      className={`br-tracer-line ${
                        ev?.kind === "grenade" ? "is-grenade" : "is-bullet"
                      }`}
                    />
                    <circle
                      cx={tracerPoints.x2}
                      cy={tracerPoints.y2}
                      r="4"
                      className="br-impact-ring"
                    />
                  </svg>
                )}

                {p.tiles.map((tile) => {
                  const inStorm = isInStorm(p, tile.x, tile.y);
                  const isStormCenter =
                    p.stormCenter.x === tile.x && p.stormCenter.y === tile.y;

                  const visibleInFog =
                    godView ||
                    isFinished ||
                    l.phase !== "combat" ||
                    !observerAgent?.alive ||
                    canAgentSeeTile(p, observerSeat, tile.x, tile.y);

                  // Operatives standing on this tile that are visible to the current view (honors Blind Drop during dropping)
                  const agentsOnTile = p.aliveSeats
                    .map((s) => p.agents[s])
                    .filter(
                      (a) =>
                        a.alive &&
                        a.x === tile.x &&
                        a.y === tile.y &&
                        (godView ||
                          isFinished ||
                          a.seat === observerSeat ||
                          (l.phase === "combat" &&
                            (!observerAgent?.alive ||
                              canAgentSeeAgent(p, observerSeat, a.seat)))),
                    );

                  // Sound ping on this tile if in fog
                  const recentPing = !visibleInFog
                    ? p.soundPings.find(
                        (pg) =>
                          pg.cycle === p.cycle &&
                          pg.x === tile.x &&
                          pg.y === tile.y,
                      )
                    : null;

                  // Interactive highlight for human turn
                  let isMoveTarget = false;
                  let isAttackTarget = false;
                  if (myTurn && humanSeat) {
                    if (l.phase === "dropping") {
                      isMoveTarget = true;
                    } else if (l.phase === "combat") {
                      const meAg = p.agents[humanSeat];
                      if (meAg && meAg.x !== null && meAg.y !== null) {
                        const d = chebyshevDist(
                          meAg.x,
                          meAg.y,
                          tile.x,
                          tile.y,
                        );
                        const range = attackRangeFor(
                          p,
                          humanSeat,
                          useGrenadeMode && meAg.grenades > 0,
                        );
                        const hasEnemy = agentsOnTile.some(
                          (a) => a.seat !== humanSeat,
                        );
                        if (hasEnemy && d <= range) {
                          isAttackTarget = true;
                        } else if (d === 1) {
                          isMoveTarget = true;
                        }
                      }
                    }
                  }

                  const isDamagedTile =
                    showTracer && ev?.toCoord === tile.coord && ev.damage;

                  return (
                    <button
                      key={tile.coord}
                      type="button"
                      className={`br-tile is-ter-${tile.terrain} ${
                        inStorm ? "is-storm" : "is-safe"
                      } ${isStormCenter ? "is-storm-center" : ""} ${
                        !visibleInFog ? "is-fog" : ""
                      } ${isMoveTarget ? "is-move-target" : ""} ${
                        isAttackTarget ? "is-attack-target" : ""
                      }`}
                      title={`${tile.coord} · ${terrainLabel(tile.terrain)}`}
                      onClick={() =>
                        handleTileClick(tile.coord, tile.x, tile.y)
                      }
                    >
                      {/* Top row inside tile: coord + terrain / storm center marker */}
                      <div className="br-tile-head">
                        <span className="br-tile-coord">{tile.coord}</span>
                        <span className="br-tile-icons">
                          {isStormCenter && (
                            <span title="安全区中心" className="br-storm-center-marker">
                              🎯
                            </span>
                          )}
                          {terrainShortIcon(tile.terrain) && (
                            <span
                              className="br-ter-icon"
                              title={terrainLabel(tile.terrain)}
                            >
                              {terrainShortIcon(tile.terrain)}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Tactical Crates / Airdrops */}
                      {visibleInFog && tile.crate && (
                        <div
                          className={`br-loot-box is-${tile.crate} ${
                            agentsOnTile.length > 0 ? "is-compact" : "is-prominent"
                          }`}
                          title={
                            tile.crate === "airdrop"
                              ? "黄金空投箱 (高阶武器与护甲)"
                              : tile.crate === "supply"
                                ? "军备补给箱 (弹药与装备)"
                                : "淘汰战利品盒"
                          }
                        >
                          <div className="br-loot-box-art">
                            {tile.crate === "airdrop" ? (
                              <span className="br-airdrop-emoji">🪂</span>
                            ) : tile.crate === "supply" ? (
                              <Package size={agentsOnTile.length > 0 ? 12 : 18} />
                            ) : (
                              <span className="br-deathbox-emoji">💼</span>
                            )}
                          </div>
                          <span className="br-loot-box-tag">
                            {tile.crate === "airdrop"
                              ? "空投"
                              : tile.crate === "supply"
                                ? "补给"
                                : "战利品"}
                          </span>
                        </div>
                      )}

                      {!visibleInFog && recentPing && (
                        <div className="br-ping-sonar" title="探测到战场声纹">
                          <span className="br-sonar-ring" />
                          <span className="br-sonar-core">🔊</span>
                        </div>
                      )}

                      {/* Operatives tokens on this tile */}
                      <div className={`br-tile-agents count-${agentsOnTile.length}`}>
                        {agentsOnTile.map((ag) => {
                          const pInfo = getPlayerInfo(ag.seat);
                          const isMe = ag.seat === observerSeat;
                          const theme = SEAT_THEMES[ag.seat];
                          return (
                            <div
                              key={ag.seat}
                              className={`br-board-token ${
                                isMe ? "is-self" : "is-enemy"
                              } ${p.turn === ag.seat ? "is-active-turn" : ""} ${
                                ag.guarding ? "is-guarding" : ""
                              } ${ag.spawnProtected ? "is-protected" : ""}`}
                              title={`${seatLabel(ag.seat)} · ${pInfo.name} (${ag.hp}HP, ${weaponLabel(ag.weapon)})`}
                            >
                              {/* Active Turn Radar Ring */}
                              {p.turn === ag.seat && (
                                <span className="br-token-ping-ring" />
                              )}

                              {/* Guarding Holo Shield */}
                              {ag.guarding && (
                                <div className="br-token-guard-aura" title="架枪防御中">
                                  <Shield size={11} />
                                </div>
                              )}

                              {/* Token Avatar Disc */}
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
                                  size="token"
                                />
                                <span
                                  className="br-token-seat-badge"
                                  style={{
                                    backgroundColor: theme.border,
                                  }}
                                >
                                  {seatShortLabel(ag.seat)}
                                </span>
                              </div>

                              {/* Weapon Tag */}
                              <div className={`br-token-weapon-badge is-${ag.weapon}`}>
                                <span className="br-token-wep-code">
                                  {weaponBadgeCode(ag.weapon)}
                                </span>
                                {ag.weapon !== "fists" && (
                                  <span
                                    className={`br-token-ammo-text ${
                                      ag.ammo === 0 ? "is-empty" : ""
                                    }`}
                                  >
                                    {ag.ammo}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Floating Damage Popup */}
                      {isDamagedTile && ev?.damage && (
                        <div
                          key={`dmg-${p.stepCount}`}
                          className="br-floating-dmg"
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
        </div>

          {/* Bottom Tactical Control Dock */}
          <div className="br-control-dock">
            {myTurn && humanSeat && l.phase === "dropping" ? (
              <div className="br-dock-inner">
                <div className="br-dock-prompt">
                  <span className="br-beacon-dot" />
                  <strong>{t("dropPrompt")}</strong>
                </div>
                <div className="br-radio-row">
                  <input
                    type="text"
                    className="br-radio-input"
                    value={draftRadio}
                    maxLength={70}
                    placeholder={t("radioPlaceholder")}
                    onChange={(e) => setDraftRadio(e.target.value)}
                  />
                </div>
              </div>
            ) : myTurn && humanSeat && l.phase === "combat" ? (
              <div className="br-dock-inner">
                <div className="br-combat-actions-row">
                  <span className="br-ap-badge">⚡ {p.turnAp} AP</span>

                  <button
                    type="button"
                    className="br-act-btn is-loot"
                    disabled={busy}
                    onClick={() => triggerHumanSingleStep({ kind: "loot" })}
                  >
                    <Package size={14} />
                    <span>{t("actLoot")}</span>
                  </button>

                  <button
                    type="button"
                    className="br-act-btn is-heal"
                    disabled={
                      busy ||
                      (p.agents[humanSeat].medkits <= 0 &&
                        p.agents[humanSeat].hp >= 100)
                    }
                    onClick={() => triggerHumanSingleStep({ kind: "heal" })}
                  >
                    <HeartPulse size={14} />
                    <span>
                      {t("actHeal", { count: p.agents[humanSeat].medkits })}
                    </span>
                  </button>

                  {p.agents[humanSeat].grenades > 0 && (
                    <button
                      type="button"
                      className={`br-act-btn is-grenade ${
                        useGrenadeMode ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        playSelectSound();
                        setUseGrenadeMode(!useGrenadeMode);
                      }}
                    >
                      <Crosshair size={14} />
                      <span>
                        {t("actGrenade", {
                          count: p.agents[humanSeat].grenades,
                        })}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="br-act-btn is-guard"
                    disabled={busy}
                    onClick={() => triggerHumanSingleStep({ kind: "guard" })}
                  >
                    <Shield size={14} />
                    <span>{t("actGuard")}</span>
                  </button>

                  <select
                    className="br-whisper-select"
                    value={whisperTarget}
                    onChange={(e) =>
                      setWhisperTarget(e.target.value as "public" | Seat)
                    }
                  >
                    <option value="public">{t("whisperPublicOpt")}</option>
                    {p.aliveSeats
                      .filter((s) => s !== humanSeat)
                      .map((s) => (
                        <option key={s} value={s}>
                          {t("whisperToPrefix")}
                          {seatShortLabel(s)}
                        </option>
                      ))}
                  </select>

                  <input
                    type="text"
                    className="br-radio-input"
                    value={draftRadio}
                    maxLength={70}
                    placeholder={t("radioPlaceholder")}
                    onChange={(e) => setDraftRadio(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="br-dock-inner is-standby">
                {isFinished && p.winner ? (
                  <div className="br-standby-bar">
                    <Trophy size={16} className="br-gold-icon" />
                    <strong>
                      {t("winnerBanner", {
                        name: `${seatShortLabel(p.winner)} · ${
                          getPlayerInfo(p.winner).name
                        }`,
                        kills: p.agents[p.winner]?.kills || 0,
                        score: p.agents[p.winner]?.tacticalScore || 0,
                      })}
                    </strong>
                    <button
                      type="button"
                      className="br-act-btn is-gold"
                      onClick={handleQuickStart}
                    >
                      <RotateCcw size={14} />
                      <span>{t("newRound")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="br-standby-bar">
                    <span className="br-beacon-dot" />
                    <span>
                      {p.turn
                        ? `正在等待 ${seatLabel(p.turn)}（${
                            getPlayerInfo(p.turn).name
                          }）执行战术行动...`
                        : t("welcomeSub")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Wing Operative Vitality Cards */}
        <aside className="br-wing is-right">
          {rightWingSeats.map((s) => renderOperativeCard(s))}
        </aside>
      </main>

      {/* Squad & Arena Configuration Modal */}
      {picker && (
        <div
          className="br-modal-backdrop"
          onClick={() => !busy && setPicker(false)}
        >
          <div
            className="br-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="br-modal-header">
              <div className="br-modal-title-row">
                <BattleRoyaleEmblemIcon size={26} />
                <h3>{t("modalTitle")}</h3>
              </div>
              <button
                type="button"
                className="br-modal-close"
                onClick={() => setPicker(false)}
              >
                <X size={16} />
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

            {(() => {
              const activeSeats = seatsForCount(pickerPlayerCount);
              const nonBots = activeSeats
                .map((s) => pickerSlots[s])
                .filter((id) => id && !id.startsWith("@bot"));
              const hasConflict = new Set(nonBots).size !== nonBots.length;
              return (
                <>
                  {hasConflict && (
                    <div className="br-modal-warn-text">
                      ⚠️ 同一会话或“我”不可重复分配给多个特工席位
                    </div>
                  )}
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
                      disabled={busy || hasConflict}
                      onClick={handleQuickStart}
                    >
                      <Sparkles size={15} />
                      <span>{t("confirmStart")}</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
