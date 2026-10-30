import React, { useEffect, useId, useRef, useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetLocale,
  useWidgetState,
  type SessionCandidate as SDKSessionCandidate,
} from "@pudding/widget";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  Lock,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  GRID_WIDTH,
  GRID_HEIGHT,
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

/* Tactical SVG Terrain Micro-Landscapes (Soft, low-contrast tactical backdrop) */
function TerrainBushArt() {
  return (
    <svg
      className="br-terrain-svg is-bush"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 柔和半透明草甸底色 */}
      <rect width="48" height="48" fill="#14532D" fillOpacity="0.35" />
      <rect x="1" y="1" width="46" height="46" fill="#166534" fillOpacity="0.45" />

      {/* 浅淡低对比度灌木地表起伏 */}
      <ellipse cx="12" cy="12" rx="11" ry="9" fill="#15803D" fillOpacity="0.4" />
      <ellipse cx="36" cy="12" rx="11" ry="9" fill="#15803D" fillOpacity="0.4" />
      <ellipse cx="12" cy="36" rx="11" ry="9" fill="#15803D" fillOpacity="0.4" />
      <ellipse cx="36" cy="36" rx="11" ry="9" fill="#15803D" fillOpacity="0.4" />

      <ellipse cx="24" cy="10" rx="9" ry="7" fill="#166534" fillOpacity="0.45" />
      <ellipse cx="24" cy="38" rx="9" ry="7" fill="#166534" fillOpacity="0.45" />
      <ellipse cx="10" cy="24" rx="7" ry="9" fill="#166534" fillOpacity="0.45" />
      <ellipse cx="38" cy="24" rx="7" ry="9" fill="#166534" fillOpacity="0.45" />

      <circle cx="24" cy="24" r="10" fill="#15803D" fillOpacity="0.4" />
      <circle cx="16" cy="20" r="7" fill="#22C55E" fillOpacity="0.35" />
      <circle cx="32" cy="28" r="7" fill="#22C55E" fillOpacity="0.35" />

      {/* 极轻微草芒点缀 */}
      <path d="M8 8L10 5M12 9L15 6M34 8L36 5M38 9L41 6" stroke="#86EFAC" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M8 40L10 43M12 39L15 42M34 40L36 43M38 39L41 42" stroke="#86EFAC" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

function TerrainBunkerArt() {
  return (
    <svg
      className="br-terrain-svg is-bunker"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 阵地地基淡暗地坪 */}
      <rect x="2" y="2" width="44" height="44" rx="4" fill="#0F172A" fillOpacity="0.35" stroke="#475569" strokeWidth="0.8" strokeDasharray="3 2" />

      {/* 外圈灰砂战术沙袋 (低饱和度、浅淡沉稳沙灰) */}
      <rect x="7" y="6" width="9" height="5" rx="1.5" fill="#44403C" stroke="#78716C" strokeWidth="0.6" />
      <rect x="17" y="6" width="9" height="5" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.6" />
      <rect x="27" y="6" width="9" height="5" rx="1.5" fill="#44403C" stroke="#78716C" strokeWidth="0.6" />
      <rect x="5" y="12" width="6" height="8" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.6" />
      <rect x="5" y="21" width="6" height="8" rx="1.5" fill="#44403C" stroke="#78716C" strokeWidth="0.6" />
      <rect x="5" y="30" width="6" height="8" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.6" />
      <rect x="37" y="12" width="6" height="8" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.6" />
      <rect x="37" y="21" width="6" height="8" rx="1.5" fill="#44403C" stroke="#78716C" strokeWidth="0.6" />
      <rect x="37" y="30" width="6" height="8" rx="1.5" fill="#292524" stroke="#57534E" strokeWidth="0.6" />

      {/* 倒U型装甲混凝土掩体墙 */}
      <path
        d="M12 36V16C12 13.5 13.5 12 16 12H32C34.5 12 36 13.5 36 16V36"
        fill="#1E293B"
        fillOpacity="0.6"
        stroke="#64748B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M14 36V17C14 15 15.5 13.5 17.5 13.5H30.5C32.5 13.5 34 15 34 17V36"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />

      {/* 战术射击孔微光 */}
      <rect x="18" y="15" width="4" height="2" rx="0.5" fill="#D97706" fillOpacity="0.75" />
      <rect x="26" y="15" width="4" height="2" rx="0.5" fill="#D97706" fillOpacity="0.75" />

      {/* 掩体中央特工驻立钢板站位 */}
      <rect x="18" y="24" width="12" height="12" rx="2" fill="#334155" fillOpacity="0.4" stroke="#64748B" strokeWidth="0.6" />
    </svg>
  );
}

function TerrainTowerArt() {
  return (
    <svg
      className="br-terrain-svg is-tower"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 满格科技淡暗地基 */}
      <rect x="2" y="2" width="44" height="44" rx="4" fill="#082F49" fillOpacity="0.22" stroke="#0284C7" strokeWidth="0.6" strokeDasharray="3 2" />

      {/* 四角桁架拉索 (浅色微弱) */}
      <line x1="4" y1="4" x2="16" y2="16" stroke="#0284C7" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="44" y1="4" x2="32" y2="16" stroke="#0284C7" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="4" y1="44" x2="16" y2="32" stroke="#0284C7" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="44" y1="44" x2="32" y2="32" stroke="#0284C7" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.35" />

      {/* 360度雷达刻度圆环 */}
      <circle cx="24" cy="24" r="18" stroke="#0284C7" strokeWidth="0.8" strokeDasharray="2 3" strokeOpacity="0.35" />
      <circle cx="24" cy="24" r="12" stroke="#38BDF8" strokeWidth="0.6" strokeOpacity="0.25" />

      {/* 极淡雷达扫描波束 */}
      <path
        d="M24 24L36 12A18 18 0 0 0 24 6Z"
        fill="#38BDF8"
        fillOpacity="0.08"
      />

      {/* 雷达主天线大锅与馈源 */}
      <ellipse cx="24" cy="24" rx="8" ry="6" fill="#0F172A" stroke="#0284C7" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="24" y1="24" x2="28" y2="18" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="28" cy="18" r="1.2" fill="#EF4444" fillOpacity="0.75" />
    </svg>
  );
}

function TerrainBaseArt({
  quadrant,
}: {
  quadrant?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  if (!quadrant) {
    return (
      <svg className="br-terrain-svg is-base" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="4" fill="#78350F" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="3 2" />
        <circle cx="24" cy="24" r="15" stroke="#F59E0B" strokeWidth="0.9" strokeDasharray="4 2" strokeOpacity="0.4" />
        <circle cx="24" cy="24" r="9" fill="#0F172A" stroke="#FDE047" strokeWidth="0.9" strokeOpacity="0.4" />
        <path d="M20 20V28M28 20V28M20 24H28" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    );
  }

  // 2x2 巨型联合军事停机坪基地一体化拼装 (浅淡低对比度背景)
  return (
    <svg className="br-terrain-svg is-base" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" fill="#78350F" fillOpacity="0.1" />

      {quadrant === "top-left" && (
        <>
          <path d="M12 48 A36 36 0 0 1 48 12" stroke="#B45309" strokeWidth="1.2" strokeDasharray="4 2" strokeOpacity="0.4" />
          <path d="M22 48 A26 26 0 0 1 48 22" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="5 2.5" strokeOpacity="0.45" />
          <path d="M33 48 A15 15 0 0 1 48 33" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M41 37V48M41 48H48" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
          <rect x="6" y="6" width="14" height="12" rx="2" fill="#1E293B" stroke="#B45309" strokeWidth="0.8" strokeOpacity="0.35" />
          <path d="M4 4L10 4M4 4V10" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
        </>
      )}

      {quadrant === "top-right" && (
        <>
          <path d="M0 12 A36 36 0 0 1 36 48" stroke="#B45309" strokeWidth="1.2" strokeDasharray="4 2" strokeOpacity="0.4" />
          <path d="M0 22 A26 26 0 0 1 26 48" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="5 2.5" strokeOpacity="0.45" />
          <path d="M0 33 A15 15 0 0 1 15 48" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M7 37V48M0 48H7" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
          <rect x="28" y="6" width="14" height="12" rx="2" fill="#1E293B" stroke="#B45309" strokeWidth="0.8" strokeOpacity="0.35" />
          <path d="M44 4L38 4M44 4V10" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
        </>
      )}

      {quadrant === "bottom-left" && (
        <>
          <path d="M48 36 A36 36 0 0 1 12 0" stroke="#B45309" strokeWidth="1.2" strokeDasharray="4 2" strokeOpacity="0.4" />
          <path d="M48 26 A26 26 0 0 1 22 0" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="5 2.5" strokeOpacity="0.45" />
          <path d="M48 15 A15 15 0 0 1 33 0" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M41 0V11M41 0H48" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
          <rect x="6" y="30" width="14" height="12" rx="2" fill="#1E293B" stroke="#B45309" strokeWidth="0.8" strokeOpacity="0.35" />
          <path d="M4 44L10 44M4 44V38" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
        </>
      )}

      {quadrant === "bottom-right" && (
        <>
          <path d="M36 0 A36 36 0 0 1 0 36" stroke="#B45309" strokeWidth="1.2" strokeDasharray="4 2" strokeOpacity="0.4" />
          <path d="M26 0 A26 26 0 0 1 0 26" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="5 2.5" strokeOpacity="0.45" />
          <path d="M15 0 A15 15 0 0 1 0 15" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M7 0V11M0 0H7" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.5" />
          <rect x="28" y="30" width="14" height="12" rx="2" fill="#1E293B" stroke="#B45309" strokeWidth="0.8" strokeOpacity="0.35" />
          <path d="M44 44L38 44M44 44V38" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
        </>
      )}
    </svg>
  );
}

/* Authentic Tactical Items & Equipment Icons (True-to-life military silhouettes) */
function TacticalRifleIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * 1.55)}
      height={size}
      viewBox="0 0 24 14"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 战术步枪/长枪剪影: 枪口消焰器、长枪管、护木导轨、机匣、弧形弹匣、握把与伸缩托 */}
      <path d="M0 4H3V6H0V4ZM3 5H13V6H14.5V5H19C20.1 5 21 5.9 21 7V9C21 9.6 20.6 10 20 10H18L17 12.5H15L15.5 10H12.2L10.8 13.5H8.2L9.6 10H5V8H3V5Z" />
      <rect x="7" y="3.2" width="2.5" height="1.4" rx="0.4" />
      <rect x="13.5" y="2.8" width="4.5" height="1.6" rx="0.5" />
    </svg>
  );
}

function TacticalGrenadeIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="6.5" y="2.5" width="3" height="2" rx="0.5" fill="#94A3B8" />
      <path d="M9.5 3C11 3 12 4 12 5.5V11" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="8" cy="9.5" rx="4.5" ry="5.5" fill="#15803D" stroke="#052E16" strokeWidth="0.8" />
      <line x1="5.5" y1="9.5" x2="10.5" y2="9.5" stroke="#86EFAC" strokeWidth="0.8" strokeOpacity="0.7" />
      <line x1="8" y1="5.5" x2="8" y2="14" stroke="#86EFAC" strokeWidth="0.8" strokeOpacity="0.7" />
      <circle cx="5" cy="3.5" r="1.5" stroke="#FDE047" strokeWidth="1" fill="none" />
    </svg>
  );
}

function TacticalMedkitIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="12" height="10" rx="2" fill="#047857" stroke="#10B981" strokeWidth="1" />
      <path d="M6 4V2.5C6 2.2 6.2 2 6.5 2H9.5C9.8 2 10 2.2 10 2.5V4" stroke="#A7F3D0" strokeWidth="1.2" />
      <rect x="7" y="6" width="2" height="6" rx="0.5" fill="#FFFFFF" />
      <rect x="5" y="8" width="6" height="2" rx="0.5" fill="#FFFFFF" />
    </svg>
  );
}

function TacticalLootIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="6" width="12" height="8" rx="1.5" fill="#78350F" stroke="#F59E0B" strokeWidth="1" />
      <path d="M1.5 5.5L8 2L14.5 5.5" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="7" y="8" width="2" height="3" rx="0.5" fill="#FDE047" />
    </svg>
  );
}

/* Micro-Landscape 3D Isometric Tactical Crates (High-fidelity, authentic battle royale supply models) */
function AirdropCrateArt({ compact }: { compact?: boolean }) {
  const s = compact ? 22 : 28;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 接触软阴影 */}
      <ellipse cx="16" cy="27" rx="12" ry="4" fill="#000000" fillOpacity="0.55" />

      {/* 3D等轴测空投箱体 */}
      {/* 顶面 (红色帆布顶盖，带黄色十字绑带与金属吊环) */}
      <polygon points="16,5 28,11 16,17 4,11" fill="#DC2626" stroke="#991B1B" strokeWidth="0.8" />
      <line x1="10" y1="8" x2="22" y2="14" stroke="#FDE047" strokeWidth="1.8" />
      <line x1="22" y1="8" x2="10" y2="14" stroke="#FDE047" strokeWidth="1.8" />
      <circle cx="16" cy="11" r="1.8" fill="#F59E0B" stroke="#FEF08A" strokeWidth="0.6" />

      {/* 正面左侧壁 (深蓝重型装甲，带黄色加固带) */}
      <polygon points="4,11 16,17 16,26 4,20" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth="0.8" />
      <line x1="10" y1="14" x2="10" y2="23" stroke="#FDE047" strokeWidth="1.8" />
      <line x1="4" y1="19" x2="16" y2="25" stroke="#1E3A8A" strokeWidth="1.5" />

      {/* 正面右侧壁 (暗蓝背光侧壁，带黄色加固带) */}
      <polygon points="16,17 28,11 28,20 16,26" fill="#1E3A8A" stroke="#0F172A" strokeWidth="0.8" />
      <line x1="22" y1="14" x2="22" y2="23" stroke="#EAB308" strokeWidth="1.8" />
      <line x1="16" y1="25" x2="28" y2="19" stroke="#0F172A" strokeWidth="1.5" />

      {/* 顶部天线与红色频闪信号信标 */}
      <line x1="16" y1="11" x2="16" y2="3" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="3" r="2" fill="#EF4444" />
      <circle cx="16" cy="3" r="3.8" stroke="#FCA5A5" strokeWidth="0.8" className="br-airdrop-beacon" />
    </svg>
  );
}

function SupplyCrateArt({ compact }: { compact?: boolean }) {
  const s = compact ? 22 : 28;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 接触软阴影 */}
      <ellipse cx="15" cy="25" rx="11" ry="3.5" fill="#000000" fillOpacity="0.5" />

      {/* 3D等轴测军火弹药箱 */}
      {/* 顶面 (亮黄铜金属面，冲压防撞条) */}
      <polygon points="15,4 26,9.5 15,15 4,9.5" fill="#D97706" stroke="#92400E" strokeWidth="0.8" />
      <line x1="9" y1="7" x2="20" y2="12.5" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.8" />
      <line x1="11" y1="6" x2="22" y2="11.5" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.8" />

      {/* 正面左侧壁 (主立面，印有 3 发金色子弹弹药标志) */}
      <polygon points="4,9.5 15,15 15,24 4,18.5" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
      <line x1="7.5" y1="12" x2="7.5" y2="16.5" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="13.2" x2="10" y2="17.7" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="14.5" x2="12.5" y2="19" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="12" r="0.75" fill="#FDE047" />
      <circle cx="10" cy="13.2" r="0.75" fill="#FDE047" />
      <circle cx="12.5" cy="14.5" r="0.75" fill="#FDE047" />

      {/* 正面右侧壁 (背光暗铜色，带工业合页锁扣) */}
      <polygon points="15,15 26,9.5 26,18.5 15,24" fill="#78350F" stroke="#451A03" strokeWidth="0.8" />
      <line x1="18.5" y1="13.5" x2="18.5" y2="17.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="22.5" y1="11.5" x2="22.5" y2="15.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DeathboxCrateArt({ compact }: { compact?: boolean }) {
  const s = compact ? 22 : 28;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 30 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 接触软阴影 */}
      <ellipse cx="15" cy="27" rx="11" ry="3.5" fill="#000000" fillOpacity="0.6" />

      {/* 垂直全息战利品光柱 (冲天光束与星标) */}
      <polygon points="13,15 17,15 16,3 14,3" fill="#38BDF8" fillOpacity="0.45" />
      <line x1="15" y1="15" x2="15" y2="2" stroke="#E0F2FE" strokeWidth="1.2" strokeLinecap="round" />
      <polygon points="15,0 16,2 15,4 14,2" fill="#67E8F9" />

      {/* 3D等轴测暗钛合金箱体 */}
      {/* 顶面 (钛合金受光面，带天青色能量边缘与电子铭牌) */}
      <polygon points="15,5 26,10.5 15,16 4,10.5" fill="#334155" stroke="#38BDF8" strokeWidth="0.9" />
      <polygon points="15,9 19,11.2 15,13.5 11,11.2" fill="#1E293B" stroke="#0284C7" strokeWidth="0.6" />
      <circle cx="15" cy="11.2" r="1.2" fill="#38BDF8" />

      {/* 正面左侧壁 (黑曜石装甲，带战术荧光脉冲能量条) */}
      <polygon points="4,10.5 15,16 15,25 4,19.5" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      <line x1="6.5" y1="13" x2="12.5" y2="16" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6.5" y1="16" x2="12.5" y2="19" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />

      {/* 正面右侧壁 (极暗背光侧壁，带战术散热槽) */}
      <polygon points="15,16 26,10.5 26,19.5 15,25" fill="#0F172A" stroke="#020617" strokeWidth="0.8" />
      <line x1="18" y1="16" x2="23" y2="13.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
      <line x1="18" y1="19" x2="23" y2="16.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function StormCenterBeaconArt() {
  return (
    <svg
      className="br-beacon-art"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="5" stroke="#FDE047" strokeWidth="1.4" />
      <line x1="12" y1="1" x2="12" y2="7" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="23" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="12" x2="7" y2="12" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="12" x2="23" y2="12" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#FDE047" />
    </svg>
  );
}

function SonarPingArt() {
  return (
    <svg
      className="br-sonar-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="11" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 2" className="br-sonar-ripple" />
      <circle cx="14" cy="14" r="6" stroke="#F87171" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.5" fill="#EF4444" />
    </svg>
  );
}

function ClashBadgeArt() {
  return (
    <svg
      className="br-clash-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M14.5 17.5L3 6V3H6L17.5 14.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 19L19 13M16 16L20 20M19 21L21 19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 6.5L18 3H21V6L17.5 9.5" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5L6 18L3 21" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill="#FEF08A" />
    </svg>
  );
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

  function sanitizeSlots(
    slots: Record<Seat, string>,
    count: 4 | 6,
    c?: Candidates | null,
  ): Record<Seat, string> {
    const active = seatsForCount(count);
    const seen = new Set<string>();
    const res: Record<Seat, string> = { ...slots };

    const availablePool: string[] = [];
    if (c?.sessions) {
      for (const s of c.sessions) {
        if (s.connected !== false && s.id && !availablePool.includes(s.id)) {
          availablePool.push(s.id);
        }
      }
    }

    for (const s of active) {
      const val = res[s];
      if (!val || val === "@bot" || val.startsWith("@bot")) {
        res[s] = "@bot";
      } else if (seen.has(val)) {
        // 重复的会话自动寻找尚未被分配的真实会话，否则降级为 @bot
        const spare = availablePool.find((id) => !seen.has(id));
        if (spare) {
          res[s] = spare;
          seen.add(spare);
        } else {
          res[s] = "@bot";
        }
      } else {
        seen.add(val);
      }
    }
    return res;
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
    const count = (l.playerCount || 6) as 4 | 6;
    setPickerPlayerCount(count);
    if (l.round > 0) {
      const raw = {
        Seat1: resolveSeatChoice(l.seats.Seat1),
        Seat2: resolveSeatChoice(l.seats.Seat2),
        Seat3: resolveSeatChoice(l.seats.Seat3),
        Seat4: resolveSeatChoice(l.seats.Seat4),
        Seat5: resolveSeatChoice(l.seats.Seat5),
        Seat6: resolveSeatChoice(l.seats.Seat6),
      };
      setPickerSlots(sanitizeSlots(raw, count, candidates));
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
                  <Zap size={10} className="br-iq-icon" />
                  {ag.tacticalScore || 0}
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
                  <TacticalRifleIcon size={10} className="br-wep-icon" />
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
                  <Shield size={10} className="br-shield-icon" />
                  -40%
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
              title={`[密电 → ${seatShortLabel(latestWhisper.toSeat)}] ${latestWhisper.text}`}
            >
              <Lock size={10} className="br-whisper-icon" />
              <span>
                →{seatShortLabel(latestWhisper.toSeat)}: “{latestWhisper.text}”
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
        y1: (f.y + 0.5) * (100 / 8),
        x2: (tCoord.x + 0.5) * (100 / 8),
        y2: (tCoord.y + 0.5) * (100 / 8),
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
              {isFinished && p.winner ? (
                <span className="br-winner-pill">
                  <Trophy size={13} className="br-trophy-icon" />
                  胜者：{seatShortLabel(p.winner)} · {getPlayerInfo(p.winner).name}
                </span>
              ) : p.turn && l.phase !== "lobby" ? (
                <span className="br-turn-pill">
                  <Crosshair size={12} className="br-turn-icon" />
                  {seatShortLabel(p.turn)} · {getPlayerInfo(p.turn).name}
                  {l.phase === "combat" ? ` (${p.turnAp} AP)` : ""}
                </span>
              ) : null}
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

        {/* Center Stage: Pure Tactical Sandtable (No redundant headers/docks, max space) */}
        <section className="br-center-stage">
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

          {/* 8x8 Tactical Sandtable */}
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
                {/* Row Numbers (1..8) */}
                <div className="br-row-headers" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((rNum) => (
                    <span key={rNum} className="br-row-label">
                      {rNum}
                    </span>
                  ))}
                </div>

                {/* 8x8 Tactical Tiles Sandtable */}
                <div className="br-tiles-grid">
                  {/* Strict Grid-Edge Safe Zone High-Contrast Perimeter Box */}
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
                        <span className="br-safe-perimeter-tag">安全区</span>
                      </div>
                    );
                  })()}

                  {/* Ballistics Tracer Overlay */}
                  {tracerPoints && (
                    <svg
                      className="br-board-fx-svg"
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
                        r="3"
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
                      {/* Integrated Tactical Micro-Landscape Art */}
                      <div className="br-tile-terrain-art" aria-hidden="true">
                        {tile.terrain === "bush" && <TerrainBushArt />}
                        {tile.terrain === "bunker" && <TerrainBunkerArt />}
                        {tile.terrain === "tower" && <TerrainTowerArt />}
                        {tile.terrain === "base" && (
                          <TerrainBaseArt
                            quadrant={
                              tile.x === 3 && tile.y === 3
                                ? "top-left"
                                : tile.x === 4 && tile.y === 3
                                  ? "top-right"
                                  : tile.x === 3 && tile.y === 4
                                    ? "bottom-left"
                                    : tile.x === 4 && tile.y === 4
                                      ? "bottom-right"
                                      : undefined
                            }
                          />
                        )}
                      </div>

                      {/* Storm Center Beacon */}
                      {isStormCenter && (
                        <div className="br-storm-center-marker" title="安全区中心">
                          <StormCenterBeaconArt />
                        </div>
                      )}

                      {/* Close Quarters Combat Clash Indicator when 2+ operatives share tile */}
                      {visibleInFog && agentsOnTile.length >= 2 && (
                        <div className="br-cqb-clash-badge" title="近身拼枪交火对峙！">
                          <ClashBadgeArt />
                        </div>
                      )}

                      {/* Tactical Crates / Airdrops (Docked in corner on terrain/agents, centered on empty plains) */}
                      {visibleInFog && tile.crate && (
                        <div
                          className={`br-loot-box is-${tile.crate} ${
                            agentsOnTile.length > 0 || tile.terrain !== "plain"
                              ? "is-compact"
                              : "is-prominent"
                          }`}
                          title={
                            tile.crate === "airdrop"
                              ? "黄金空投箱 (高阶武器与护甲)"
                              : tile.crate === "supply"
                                ? "军备补给箱 (弹药与装备)"
                                : "战术战利品密封箱"
                          }
                        >
                          <div className="br-loot-box-art">
                            {tile.crate === "airdrop" ? (
                              <AirdropCrateArt
                                compact={
                                  agentsOnTile.length > 0 ||
                                  tile.terrain !== "plain"
                                }
                              />
                            ) : tile.crate === "supply" ? (
                              <SupplyCrateArt
                                compact={
                                  agentsOnTile.length > 0 ||
                                  tile.terrain !== "plain"
                                }
                              />
                            ) : (
                              <DeathboxCrateArt
                                compact={
                                  agentsOnTile.length > 0 ||
                                  tile.terrain !== "plain"
                                }
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {!visibleInFog && recentPing && (
                        <div className="br-ping-sonar" title="探测到战场声纹">
                          <SonarPingArt />
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
                              } ${ag.spawnProtected ? "is-protected" : ""} ${
                                tile.terrain === "bush" ? "is-in-bush" : ""
                              } ${tile.terrain === "bunker" ? "is-in-bunker" : ""}`}
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

                              {/* Direct HP Gauge on Token for Immediate Combat Readability */}
                              <div className="br-token-hp-gauge" title={`HP: ${ag.hp}/100`}>
                                <div
                                  className={`br-token-hp-fill ${
                                    ag.hp <= 30 ? "is-critical" : ag.hp <= 60 ? "is-warn" : ""
                                  }`}
                                  style={{ width: `${Math.max(0, Math.min(100, ag.hp))}%` }}
                                />
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

          {/* Floating Action HUD (Only when human commander needs to act, non-intrusive) */}
          {myTurn && humanSeat && (
            <div className="br-floating-hud">
              {l.phase === "dropping" ? (
                <div className="br-hud-inner is-drop">
                  <div className="br-hud-prompt">
                    <span className="br-beacon-dot" />
                    <strong>{t("dropPrompt")}</strong>
                  </div>
                  <input
                    type="text"
                    className="br-radio-input"
                    value={draftRadio}
                    maxLength={70}
                    placeholder={t("radioPlaceholder")}
                    onChange={(e) => setDraftRadio(e.target.value)}
                  />
                </div>
              ) : l.phase === "combat" ? (
                <div className="br-hud-inner is-combat">
                  <span className="br-ap-badge">
                    <Zap size={11} className="br-ap-icon" />
                    {p.turnAp} AP
                  </span>

                  <button
                    type="button"
                    className="br-act-btn is-loot"
                    disabled={busy}
                    onClick={() => triggerHumanSingleStep({ kind: "loot" })}
                  >
                    <TacticalLootIcon size={14} />
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
                    <TacticalMedkitIcon size={14} />
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
                      <TacticalGrenadeIcon size={14} />
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
              ) : null}
            </div>
          )}
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
                      setPickerSlots((prev) => sanitizeSlots(prev, 4, candidates));
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
                      setPickerSlots((prev) => sanitizeSlots(prev, 6, candidates));
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
                      <AlertTriangle size={13} className="br-warn-icon" />
                      <span>同一会话或“我”不可重复分配给多个特工席位</span>
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
