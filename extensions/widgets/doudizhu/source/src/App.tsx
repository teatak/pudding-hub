import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetLocale,
  useWidgetState,
} from "@pudding/widget";
import {
  Bot,
  Check,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Lightbulb,
  MessagesSquare,
  MessageSquareOff,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserRound,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Seat, Card } from "./types";
import {
  seats,
  prevSeat,
  isBotParticipant,
  classifyCards,
  canBeat,
  findLegalPlays,
} from "./rules";
import {
  lobby,
  position,
  start,
  callLandlord,
  playCards,
  passTurn,
  stepBotTurn,
  pause,
  resume,
} from "./game";
import {
  t,
  setLocale,
  seatLabel,
  botNameForSeat,
  comboLabel,
} from "./text";
import {
  isSoundEnabled,
  setSoundEnabled,
  playSelectSound,
  playDealSound,
  playPassSound,
  playBidSound,
  playComboSound,
  playFinishSound,
} from "./sound";
import "./style.css";

type Candidates = Awaited<ReturnType<typeof pudding.interaction.candidates>>;
type SessionCandidate = Candidates["sessions"][number];

interface PlayerInfo {
  id: string;
  name: string;
  isHuman: boolean;
  isBot: boolean;
  model?: SessionCandidate["model"];
}

/**
 * Matches `widgets/doudizhu/assets/icon.svg` 100% so the in-page emblem is identical to the tab icon.
 */
function DoudizhuEmblemIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="26" fill="#B91C1C" />
      <rect
        x="6"
        y="6"
        width="116"
        height="116"
        rx="22"
        stroke="#FCA5A5"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <g transform="rotate(-14 46 68)">
        <rect
          x="20"
          y="26"
          width="52"
          height="74"
          rx="8"
          fill="#FFFBEB"
          stroke="#D97706"
          strokeWidth="2"
        />
        <text
          x="27"
          y="44"
          fill="#1E293B"
          fontFamily="-apple-system, sans-serif"
          fontSize="15"
          fontWeight="800"
        >
          A
        </text>
        <path
          d="M46 52C46 52 36 62 36 68C36 72 39 75 43 75C45 75 46 74 46 74C46 74 47 75 49 75C53 75 56 72 56 68C56 62 46 52 46 52Z"
          fill="#1E293B"
        />
      </g>
      <g transform="rotate(10 78 66)">
        <rect
          x="52"
          y="24"
          width="54"
          height="76"
          rx="8"
          fill="#FFFFFF"
          stroke="#F59E0B"
          strokeWidth="2.5"
        />
        <text
          x="59"
          y="42"
          fill="#DC2626"
          fontFamily="-apple-system, sans-serif"
          fontSize="14"
          fontWeight="800"
        >
          王
        </text>
        <path
          d="M64 74L68 54L79 63L90 54L94 74H64Z"
          fill="#F59E0B"
          stroke="#B45309"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="68" cy="50" r="2.5" fill="#EF4444" />
        <circle cx="79" cy="48" r="3" fill="#EF4444" />
        <circle cx="90" cy="50" r="2.5" fill="#EF4444" />
      </g>
    </svg>
  );
}

/**
 * Renders the participant's actual avatar (AI model icon `info.model?.icon`, Human icon, or Bot icon).
 * When `isLandlord` is true, surrounds the avatar with a golden polygonal star-burst frame and a crown badge
 * while keeping the model's own icon clearly visible in the center.
 */
function PlayerAvatar({
  info,
  isLandlord,
  compact = false,
}: {
  info: PlayerInfo;
  isLandlord: boolean;
  compact?: boolean;
}) {
  const gradId = useId();
  const iconSize = compact ? 16 : 18;
  const innerContent = info.model?.icon ? (
    <img src={info.model.icon} alt="" className="ddz-avatar-img" />
  ) : info.isHuman ? (
    <UserRound size={iconSize} />
  ) : info.isBot ? (
    <Bot size={iconSize} />
  ) : (
    <Sparkles size={iconSize} />
  );

  return (
    <div
      className={`ddz-avatar-wrap ${isLandlord ? "is-landlord" : "is-peasant"} ${
        compact ? "is-compact" : ""
      }`}
    >
      {isLandlord && (
        <svg
          className="ddz-landlord-star-ring"
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
      <div
        className={`ddz-avatar-circle ${
          isLandlord ? "is-landlord" : "is-peasant"
        }`}
      >
        {innerContent}
      </div>
      {isLandlord && (
        <span className="ddz-landlord-crown-tag" aria-hidden="true">
          <Crown size={10} />
        </span>
      )}
    </div>
  );
}

function suitSymbol(suit: Card["suit"]): string {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "C") return "♣";
  if (suit === "D") return "♦";
  return "★";
}

function isRedCard(card: Card): boolean {
  return card.suit === "H" || card.suit === "D" || card.rank === "RJ";
}

function displayRankText(rank: Card["rank"]): string {
  if (rank === "BJ") return "JOKER";
  if (rank === "RJ") return "JOKER";
  return rank;
}

/**
 * Renders a poker card using CSS `attr(data-label)` pseudo-elements and `aria-hidden="true"`
 * so card ranks/suits are crisp to human eyes but never leak into DOM `innerText` if `widget_observe` is called.
 */
function PokerCardFace({
  card,
  size = "table",
  selected = false,
  onClick,
  disabled = false,
  style,
}: {
  card: Card;
  size?: "hole" | "table" | "hand" | "mini";
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const red = isRedCard(card);
  const rankText = displayRankText(card.rank);
  const sym = suitSymbol(card.suit);
  const isJoker = card.rank === "BJ" || card.rank === "RJ";
  const suitLabel = isJoker ? (card.rank === "RJ" ? "大" : "小") : sym;
  const pipLabel = isJoker ? (card.rank === "RJ" ? "👑" : "🃏") : sym;

  const content = (
    <>
      <span className="ddz-card-corner is-top" aria-hidden="true">
        <strong className="ddz-card-rank" data-label={rankText} />
        <small className="ddz-card-suit" data-label={suitLabel} />
      </span>
      <span
        className="ddz-card-pip"
        data-label={pipLabel}
        aria-hidden="true"
      />
      <span className="ddz-card-corner is-bottom" aria-hidden="true">
        <strong className="ddz-card-rank" data-label={rankText} />
        <small className="ddz-card-suit" data-label={suitLabel} />
      </span>
    </>
  );

  const cls = `ddz-poker-card is-${size} ${red ? "is-red" : "is-black"} ${
    isJoker ? "is-joker" : ""
  } ${selected ? "is-selected" : ""} ${onClick ? "is-interactive" : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={cls}
        style={style}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cls} style={style}>
      {content}
    </div>
  );
}

/**
 * Renders the side player's hand inside a strictly fixed-height container (`220px`).
 * - When `reveal` is false: curved vertical stack of blue diamond card backs.
 * - When `reveal` is true (God View or Round Finished): tightly stacked overlapping poker cards
 *   (2 overlapping rows where each card overlaps the previous one by `-26px` horizontally),
 *   keeping the exact same compact footprint without ever stretching the layout.
 */
function SideCardFan({
  cards,
  side,
  reveal,
}: {
  cards: Card[];
  side: "left" | "right";
  reveal: boolean;
}) {
  const count = cards.length;
  if (count === 0) {
    return <div className={`ddz-side-fan-box is-${side}`} />;
  }

  if (reveal) {
    const splitAt = Math.ceil(count / 2);
    const row1 = cards.slice(0, splitAt);
    const row2 = cards.slice(splitAt);
    return (
      <div className={`ddz-side-fan-box is-${side}`}>
        <div className={`ddz-side-stacked-rows is-${side}`}>
          <div className="ddz-side-stacked-row">
            {row1.map((c, idx) => (
              <PokerCardFace
                key={c.id}
                card={c}
                size="mini"
                style={{ zIndex: idx + 1 }}
              />
            ))}
          </div>
          {row2.length > 0 && (
            <div className="ddz-side-stacked-row is-second">
              {row2.map((c, idx) => (
                <PokerCardFace
                  key={c.id}
                  card={c}
                  size="mini"
                  style={{ zIndex: idx + 20 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const visibleBacks = Math.min(count, 11);
  return (
    <div className={`ddz-side-fan-box is-${side}`} aria-hidden="true">
      <div className={`ddz-side-back-fan is-${side}`}>
        {Array.from({ length: visibleBacks }).map((_, i) => {
          const progress =
            visibleBacks > 1 ? i / (visibleBacks - 1) - 0.5 : 0;
          const rot =
            side === "left" ? -22 + progress * 24 : 22 - progress * 24;
          const shiftX =
            side === "left"
              ? Math.abs(progress) * -12
              : Math.abs(progress) * 12;
          return (
            <div
              key={i}
              className="ddz-blue-card-back"
              style={{
                transform: `translate(${shiftX}px, ${i * 14.5}px) rotate(${rot}deg)`,
                zIndex: i + 1,
              }}
            >
              <span className="ddz-back-diamond" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom Seat Selector Dropdown with Model Icons (`sess.model?.icon`), Bot Avatar, and Human Avatar,
 * plus click-outside auto-close.
 */
function SeatSelectorDropdown({
  seat,
  value,
  onChange,
  sessions,
}: {
  seat: Seat;
  value: string;
  onChange: (val: string) => void;
  sessions: SessionCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const isMe = value === "@me";
  const isBot = value === "@bot" || value.startsWith("@bot");
  const currentSession = sessions.find(
    (s) => s.id === value || s.participantID === value,
  );

  return (
    <div className="ddz-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ddz-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="ddz-select-item-left">
          {isMe ? (
            <span className="ddz-select-icon is-human">
              <UserRound size={15} />
            </span>
          ) : isBot ? (
            <span className="ddz-select-icon is-bot">
              <Bot size={15} />
            </span>
          ) : currentSession?.model?.icon ? (
            <img
              src={currentSession.model.icon}
              alt=""
              className="ddz-select-model-img"
            />
          ) : (
            <span className="ddz-select-icon is-ai">
              <Sparkles size={15} />
            </span>
          )}
          <div className="ddz-select-texts">
            <strong className="ddz-select-title">
              {isMe
                ? t("playerYou")
                : isBot
                  ? `${t("playerBot")} · ${botNameForSeat(seat)}`
                  : currentSession?.name || value}
            </strong>
            <small className="ddz-select-sub">
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
          className={`ddz-select-chevron ${open ? "is-open" : ""}`}
        />
      </button>

      {open && (
        <div className="ddz-select-menu">
          <button
            type="button"
            className={`ddz-select-option ${isMe ? "is-selected" : ""}`}
            onClick={() => {
              onChange("@me");
              setOpen(false);
            }}
          >
            <div className="ddz-select-item-left">
              <span className="ddz-select-icon is-human">
                <UserRound size={15} />
              </span>
              <div className="ddz-select-texts">
                <strong className="ddz-select-title">{t("playerYou")}</strong>
                <small className="ddz-select-sub">{t("humanSubTag")}</small>
              </div>
            </div>
            {isMe && <Check size={14} className="ddz-select-check" />}
          </button>

          <button
            type="button"
            className={`ddz-select-option ${isBot ? "is-selected" : ""}`}
            onClick={() => {
              onChange("@bot");
              setOpen(false);
            }}
          >
            <div className="ddz-select-item-left">
              <span className="ddz-select-icon is-bot">
                <Bot size={15} />
              </span>
              <div className="ddz-select-texts">
                <strong className="ddz-select-title">
                  {t("playerBot")} · {botNameForSeat(seat)}
                </strong>
                <small className="ddz-select-sub">{t("botTag")}</small>
              </div>
            </div>
            {isBot && <Check size={14} className="ddz-select-check" />}
          </button>

          {sessions.map((sess) => {
            const selected = value === sess.id || value === sess.participantID;
            return (
              <button
                key={sess.id}
                type="button"
                className={`ddz-select-option ${selected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(sess.id);
                  setOpen(false);
                }}
              >
                <div className="ddz-select-item-left">
                  {sess.model?.icon ? (
                    <img
                      src={sess.model.icon}
                      alt=""
                      className="ddz-select-model-img"
                    />
                  ) : (
                    <span className="ddz-select-icon is-ai">
                      <Sparkles size={15} />
                    </span>
                  )}
                  <div className="ddz-select-texts">
                    <strong className="ddz-select-title">{sess.name}</strong>
                    <small className="ddz-select-sub">
                      {sess.model?.name || "AI Session"}
                    </small>
                  </div>
                </div>
                {selected && <Check size={14} className="ddz-select-check" />}
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
  const [pickerSlots, setPickerSlots] = useState<Record<Seat, string>>({
    South: "@me",
    East: "@bot",
    West: "@bot",
  });
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [danmaku, setDanmaku] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [godView, setGodView] = useState(false);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [draftComment, setDraftComment] = useState("");

  const prevRoundRef = useRef<number>(l.round);
  const prevStepRef = useRef<number>(p.stepCount);
  const prevTurnRef = useRef<Seat | null>(p.turn);
  const prevPhaseRef = useRef<string>(l.phase);
  const prevRobCountRef = useRef<number>(p.bidding.robCount);

  const humanPart = run?.participants.find((part) => part.kind === "human");
  const humanSeat =
    (humanPart && seats.find((s) => l.seats[s] === humanPart.id)) || null;

  const isPaused = run?.status === "paused";
  const myTurn =
    !isPaused &&
    Boolean(humanSeat) &&
    (l.phase === "bidding" || l.phase === "playing") &&
    !p.winner &&
    p.turn === humanSeat;

  useEffect(() => {
    setSelectedCardIds([]);
    setHintIndex(0);
  }, [l.round, p.stepCount, l.phase]);

  useEffect(() => {
    if (l.round > 0 && l.round !== prevRoundRef.current) {
      prevRoundRef.current = l.round;
      prevStepRef.current = p.stepCount;
      prevTurnRef.current = p.turn;
      prevPhaseRef.current = l.phase;
      prevRobCountRef.current = p.bidding.robCount;
      playDealSound();
      return;
    }
    if (p.stepCount !== prevStepRef.current) {
      const actorSeat =
        prevTurnRef.current || (p.turn ? prevSeat(p.turn) : null);
      const wasBidding = prevPhaseRef.current === "bidding";
      const prevRobs = prevRobCountRef.current;

      prevStepRef.current = p.stepCount;
      prevTurnRef.current = p.turn;
      prevPhaseRef.current = l.phase;
      prevRobCountRef.current = p.bidding.robCount;

      if (l.phase === "finished" && p.winner) {
        if (
          p.currentPlay &&
          (p.currentPlay.combo.type === "bomb" ||
            p.currentPlay.combo.type === "rocket")
        ) {
          playComboSound(p.currentPlay.combo.type);
        }
        playFinishSound();
        return;
      }

      if (wasBidding && l.phase === "playing") {
        if (p.bidding.robCount > prevRobs) {
          playBidSound("rob");
        } else if (actorSeat && p.bidding.calledBy === actorSeat) {
          playBidSound("call");
        } else {
          playPassSound();
        }
        return;
      }

      const act = actorSeat ? p.lastActions[actorSeat] : null;
      if (!act) return;

      if (act.kind === "play") {
        if (act.combo) playComboSound(act.combo.type);
      } else if (act.kind === "pass") {
        playPassSound();
      } else {
        playBidSound(act.kind);
      }
    }
  }, [l.round, l.phase, p.stepCount, p.turn, p.winner, p.bidding.robCount]);

  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function initDefaultSeats(c: Candidates) {
    const sessions = c.sessions || [];
    const preferred = (c.preferredSessionIDs || []).filter((id) =>
      sessions.some((s) => s.id === id),
    );
    const pool = [
      ...preferred,
      ...sessions.map((s) => s.id).filter((id) => !preferred.includes(id)),
    ];
    setPickerSlots({
      South: "@me",
      East: pool[0] || "@bot",
      West: pool[1] || "@bot",
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
    if (l.round > 0) {
      setPickerSlots({
        South: resolveSeatChoice(l.seats.South),
        East: resolveSeatChoice(l.seats.East),
        West: resolveSeatChoice(l.seats.West),
      });
    } else if (candidates) {
      initDefaultSeats(candidates);
    }
    setError(null);
    setPicker(true);
  }

  async function loadCandidates(): Promise<Candidates | null> {
    try {
      const val = await pudding.interaction.candidates();
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
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [
    run?.status,
    run?.participants?.map((part) => `${part.id}:${part.name}`).join(","),
  ]);

  useEffect(() => {
    if (isPaused) return;
    if (l.phase !== "bidding" && l.phase !== "playing") return;
    if (!p.turn || p.winner) return;
    const activeId = l.seats[p.turn];
    if (!isBotParticipant(activeId)) return;

    const timer = setTimeout(() => {
      void stepBotTurn().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    }, 520);
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
    const sessionModel = candidates?.sessions.find(
      (s) =>
        (s.participantID && s.participantID === pid) ||
        s.id === pid ||
        (part as unknown as { sessionID?: string })?.sessionID === s.id ||
        (part?.name && s.name === part.name),
    )?.model;

    return {
      id: pid,
      name: isHuman ? t("playerYou") : part?.name || seatLabel(seat),
      isHuman: Boolean(isHuman),
      isBot: false,
      model: sessionModel,
    };
  }

  const bottomSeat: Seat = humanSeat || "South";
  const rightSeat: Seat =
    bottomSeat === "South"
      ? "East"
      : bottomSeat === "East"
        ? "West"
        : "South";
  const leftSeat: Seat =
    bottomSeat === "South"
      ? "West"
      : bottomSeat === "East"
        ? "South"
        : "East";

  const holeRevealed =
    godView || l.phase === "playing" || l.phase === "finished";
  const bottomHand = p.hands[bottomSeat] || [];
  const targetCombo =
    p.currentPlay && p.currentPlay.seat !== bottomSeat
      ? p.currentPlay.combo
      : null;

  const legalPlaysForBottom =
    myTurn && l.phase === "playing"
      ? findLegalPlays(bottomHand, targetCombo)
      : [];

  const selectedCards = bottomHand.filter((c) =>
    selectedCardIds.includes(c.id),
  );
  const selectedCombo = classifyCards(selectedCards);
  const isSelectionPlayable = Boolean(
    selectedCombo && canBeat(selectedCombo, targetCombo),
  );
  const canHumanPass = Boolean(
    myTurn &&
      l.phase === "playing" &&
      p.currentPlay &&
      p.currentPlay.seat !== bottomSeat,
  );

  const showBottomHandFaceUp =
    Boolean(humanSeat) || godView || l.phase === "finished";

  function toggleCardSelection(cardId: string) {
    playSelectSound();
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  }

  function cycleHint() {
    if (!legalPlaysForBottom.length) return;
    playSelectSound();
    const chosen = legalPlaysForBottom[hintIndex % legalPlaysForBottom.length];
    setSelectedCardIds(chosen.map((c) => c.id));
    setHintIndex((prev) => prev + 1);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSelectSound();
  }

  function roleBadgeFor(seat: Seat, relLabel: string) {
    const isLandlord = p.landlord === seat;
    const roleText = p.landlord
      ? isLandlord
        ? t("roleLandlord")
        : t("rolePeasant")
      : seatLabel(seat);
    return (
      <span
        className={`ddz-role-pill ${
          p.landlord
            ? isLandlord
              ? "is-landlord"
              : "is-peasant"
            : "is-undecided"
        }`}
      >
        {roleText} ({relLabel})
      </span>
    );
  }

  function renderTableSpot(seat: Seat, posClass: "left" | "right" | "bottom") {
    const act = p.lastActions[seat];
    const isTurn =
      (l.phase === "bidding" || l.phase === "playing") &&
      !p.winner &&
      p.turn === seat;
    const isCurrentReigningPlay = p.currentPlay?.seat === seat;

    if (isTurn) {
      return (
        <div className={`ddz-table-spot is-${posClass} is-active-spot`}>
          <div className="ddz-spot-chip is-thinking">
            <span className="ddz-pulse-dot" />
            <span>{t("thinking")}</span>
          </div>
        </div>
      );
    }

    if (!act) return <div className={`ddz-table-spot is-${posClass}`} />;

    if (act.kind === "call") {
      return (
        <div className={`ddz-table-spot is-${posClass}`}>
          <span className="ddz-spot-chip is-gold">{t("tagCalled")}</span>
        </div>
      );
    }
    if (act.kind === "rob") {
      return (
        <div className={`ddz-table-spot is-${posClass}`}>
          <span className="ddz-spot-chip is-gold">{t("tagRobbed")}</span>
        </div>
      );
    }
    if (act.kind === "no_call") {
      return (
        <div className={`ddz-table-spot is-${posClass}`}>
          <span className="ddz-spot-chip is-pass">{t("tagNoCall")}</span>
        </div>
      );
    }
    if (act.kind === "no_rob") {
      return (
        <div className={`ddz-table-spot is-${posClass}`}>
          <span className="ddz-spot-chip is-pass">{t("tagNoRob")}</span>
        </div>
      );
    }
    if (act.kind === "pass") {
      return (
        <div className={`ddz-table-spot is-${posClass}`}>
          <span className="ddz-spot-chip is-pass">{t("tagPassed")}</span>
        </div>
      );
    }
    if (act.kind === "play" && act.cards && act.cards.length > 0) {
      const count = act.cards.length;
      return (
        <div
          className={`ddz-table-spot is-${posClass} ${
            isCurrentReigningPlay ? "is-reigning" : "is-previous"
          }`}
        >
          <div
            className={`ddz-table-played-fan ${count > 6 ? "is-dense" : ""}`}
          >
            {act.cards.map((c, idx) => {
              const mid = (count - 1) / 2;
              const offset = idx - mid;
              return (
                <PokerCardFace
                  key={c.id}
                  card={c}
                  size="table"
                  style={{
                    transform: `rotate(${offset * 2.4}deg) translateY(${
                      Math.abs(offset) * 1.2
                    }px)`,
                    zIndex: idx + 1,
                  }}
                />
              );
            })}
          </div>
          {act.combo && (
            <span className="ddz-combo-badge">
              {comboLabel(act.combo.type, act.combo.mainRank)}
            </span>
          )}
        </div>
      );
    }
    return <div className={`ddz-table-spot is-${posClass}`} />;
  }

  function renderSidePlayer(seat: Seat, side: "left" | "right") {
    const info = getPlayerInfo(seat);
    const hand = p.hands[seat] || [];
    const isTurn =
      (l.phase === "bidding" || l.phase === "playing") &&
      !p.winner &&
      p.turn === seat;
    const isLandlord = p.landlord === seat;
    const comment = p.comments[seat];
    const relLabel = side === "left" ? t("relUpper") : t("relLower");

    return (
      <aside className={`ddz-wing is-${side}`}>
        {/* Speech bubble directly above the player pill */}
        {danmaku && comment?.text && (
          <div
            key={`${seat}-${comment.step}`}
            className={`ddz-quote-bubble is-floating is-${side}`}
            title={comment.text}
          >
            “{comment.text}”
          </div>
        )}

        {/* Player Identity Badge Pill */}
        <div
          className={`ddz-player-pill ${isTurn ? "is-turn" : ""} ${
            isLandlord ? "is-landlord" : ""
          }`}
        >
          <PlayerAvatar info={info} isLandlord={isLandlord} />

          <div className="ddz-pill-info">
            <div className="ddz-pill-name-row">
              <strong className="ddz-pill-name">{info.name}</strong>
              {l.phase !== "lobby" && (
                <span
                  className={`ddz-mini-count ${
                    hand.length <= 2 ? "is-alarm" : ""
                  }`}
                >
                  {hand.length}
                </span>
              )}
            </div>
            {roleBadgeFor(seat, relLabel)}
          </div>
        </div>

        {/* Fixed-height Side Card Fan Box */}
        <SideCardFan
          cards={l.phase !== "lobby" ? hand : []}
          side={side}
          reveal={godView || l.phase === "finished"}
        />
      </aside>
    );
  }

  const multParts: string[] = [];
  if (p.bidding.robCount > 0) {
    multParts.push(`${t("robTag")} ×${Math.pow(2, p.bidding.robCount)}`);
  }
  if (p.bombCount > 0) {
    multParts.push(`${t("bombCountLabel")} ×${Math.pow(2, p.bombCount)}`);
  }
  if (p.spring === "spring") multParts.push(t("springBadge"));
  if (p.spring === "anti_spring") multParts.push(t("antiSpringBadge"));

  const bottomInfo = getPlayerInfo(bottomSeat);

  function submitSelectedCards() {
    if (busy || !isSelectionPlayable) return;
    void perform(async () => {
      await pudding.interaction.handle((c) =>
        playCards(
          {
            cards: selectedCardIds,
            comment: draftComment.trim() || undefined,
          },
          c,
        ),
      );
      setSelectedCardIds([]);
      setDraftComment("");
    });
  }

  return (
    <div
      className="ddz-app"
      onDoubleClick={() => {
        if (selectedCardIds.length > 0) setSelectedCardIds([]);
      }}
    >
      {/* Top Header Bar */}
      <header className="ddz-topbar">
        <div className="ddz-brand">
          <div className="ddz-emblem" aria-hidden="true">
            <DoudizhuEmblemIcon size={32} />
          </div>
          <h1>{t("appTitle")}</h1>
        </div>

        <div className="ddz-toolbar">
          <button
            type="button"
            className={`ddz-top-btn ${godView ? "is-active" : ""}`}
            onClick={() => setGodView(!godView)}
          >
            {godView ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{godView ? t("godViewOff") : t("godViewOn")}</span>
          </button>

          <button
            type="button"
            className={`ddz-top-btn is-icon ${danmaku ? "is-active" : ""}`}
            title={t("toggleDanmaku")}
            aria-label={t("toggleDanmaku")}
            onClick={() => setDanmaku(!danmaku)}
          >
            {danmaku ? (
              <MessagesSquare size={15} />
            ) : (
              <MessageSquareOff size={15} />
            )}
          </button>

          <button
            type="button"
            className={`ddz-top-btn is-icon ${soundOn ? "is-active" : ""}`}
            title={t("toggleSound")}
            aria-label={t("toggleSound")}
            onClick={toggleSound}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {l.phase !== "lobby" && !p.winner && !isPaused && (
            <button
              type="button"
              className="ddz-top-btn"
              disabled={busy}
              onClick={() => void perform(pause)}
            >
              <Pause size={14} />
              <span>{t("pauseGame")}</span>
            </button>
          )}

          {l.phase !== "lobby" && !p.winner && isPaused && (
            <button
              type="button"
              className="ddz-top-btn is-active"
              disabled={busy}
              onClick={() => void perform(resume)}
            >
              <Play size={14} />
              <span>{t("continueGame")}</span>
            </button>
          )}

          <button
            type="button"
            className="ddz-top-btn"
            disabled={busy}
            onClick={openPickerModal}
          >
            <UsersRound size={14} />
            <span>{t("changeSeats")}</span>
          </button>

          <button
            type="button"
            className="ddz-top-btn"
            disabled={busy}
            onClick={() => {
              if (l.round > 0) {
                void perform(() =>
                  start({
                    South: resolveSeatChoice(l.seats.South),
                    East: resolveSeatChoice(l.seats.East),
                    West: resolveSeatChoice(l.seats.West),
                  }),
                );
              } else {
                openPickerModal();
              }
            }}
          >
            <RotateCcw size={14} />
            <span>{l.round > 0 ? t("newRound") : t("startMatch")}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="ddz-error-banner" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="ddz-top-btn is-icon"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Full-Bleed Emerald Felt Table */}
      <main className="ddz-table">
        {/* Row 1 (92px): Top-Center Floating Hole Cards & Multiplier Capsule */}
        <div className="ddz-top-row">
          <div className="ddz-top-capsule">
            <div className="ddz-hole-section">
              <span className="ddz-capsule-label">{t("holeCardsLabel")}</span>
              <div className="ddz-hole-row">
                {holeRevealed && l.phase !== "lobby" ? (
                  p.bottomCards.map((c) => (
                    <PokerCardFace key={c.id} card={c} size="hole" />
                  ))
                ) : (
                  <>
                    <div className="ddz-hole-back">
                      <span className="ddz-back-diamond" />
                    </div>
                    <div className="ddz-hole-back">
                      <span className="ddz-back-diamond" />
                    </div>
                    <div className="ddz-hole-back">
                      <span className="ddz-back-diamond" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="ddz-capsule-divider" />

            <div className="ddz-score-section">
              <span className="ddz-gold-stat">
                {t("baseScoreLabel")}: {p.baseScore ?? 3}
              </span>
              <span className="ddz-gold-stat">
                {t("multiplierLabel")}: × {p.multiplier}
                {multParts.length > 0 ? ` (${multParts.join(" · ")})` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2 (Spacious Middle Arena): Left Wing (West) + 3-Directional Play Stage + Right Wing (East) */}
        <div className="ddz-arena">
          {renderSidePlayer(leftSeat, "left")}

          <div className="ddz-center-felt">
            {l.phase === "lobby" ? (
              <div className="ddz-center-overlay">
                <Crown size={36} className="ddz-gold-crown" />
                <h2>{t("appTitle")}</h2>
                <p>{t("lobbyWelcomeSub")}</p>
                <button
                  type="button"
                  className="ddz-pill-btn is-gold"
                  onClick={openPickerModal}
                >
                  <Play size={15} />
                  <span>{t("startMatch")}</span>
                </button>
              </div>
            ) : (
              <>
                {renderTableSpot(leftSeat, "left")}
                {renderTableSpot(rightSeat, "right")}
                {renderTableSpot(bottomSeat, "bottom")}

                {l.phase === "finished" && p.winner && (
                  <div className="ddz-winner-toast">
                    <Crown size={20} className="ddz-gold-crown" />
                    <strong>
                      {p.winner === "Landlord"
                        ? t("winnerLandlord")
                        : t("winnerPeasant")}
                    </strong>
                    <span className="ddz-winner-mult">×{p.multiplier}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {renderSidePlayer(rightSeat, "right")}
        </div>

        {/* Row 3 (232px): Fixed Control Bar (54px) + Fixed Hand Fan Slot (178px) */}
        <section className="ddz-bottom-zone">
          {l.phase !== "lobby" && (
            <>
              <div className="ddz-bottom-hud">
                <div className="ddz-bottom-pill-wrap">
                  {danmaku && p.comments[bottomSeat]?.text && (
                    <div
                      key={`bottom-${p.comments[bottomSeat]!.step}`}
                      className="ddz-quote-bubble is-bottom-float"
                    >
                      “{p.comments[bottomSeat]!.text}”
                    </div>
                  )}
                  <div
                    className={`ddz-player-pill is-compact ${
                      p.turn === bottomSeat && !p.winner ? "is-turn" : ""
                    }`}
                  >
                    <PlayerAvatar
                      info={bottomInfo}
                      isLandlord={p.landlord === bottomSeat}
                      compact
                    />
                    <div className="ddz-pill-info">
                      <div className="ddz-pill-name-row">
                        <strong className="ddz-pill-name">
                          {bottomInfo.name}
                        </strong>
                        <span
                          className={`ddz-mini-count ${
                            bottomHand.length <= 2 ? "is-alarm" : ""
                          }`}
                        >
                          {bottomHand.length}
                        </span>
                      </div>
                      {roleBadgeFor(bottomSeat, t("relSelf"))}
                    </div>
                  </div>
                </div>

                {/* Fixed-height Action Slot: never collapses or wraps */}
                <div className="ddz-action-slot">
                  {myTurn ? (
                    <div className="ddz-action-row">
                      {l.phase === "bidding" ? (
                        !p.bidding.calledBy ? (
                          <>
                            <button
                              type="button"
                              className="ddz-pill-btn is-pass"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await pudding.interaction.handle((c) =>
                                    callLandlord(
                                      {
                                        decision: "pass",
                                        comment:
                                          draftComment.trim() || undefined,
                                      },
                                      c,
                                    ),
                                  );
                                  setDraftComment("");
                                })
                              }
                            >
                              {t("actNoCall")}
                            </button>
                            <button
                              type="button"
                              className="ddz-pill-btn is-gold"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await pudding.interaction.handle((c) =>
                                    callLandlord(
                                      {
                                        decision: "call",
                                        comment:
                                          draftComment.trim() || undefined,
                                      },
                                      c,
                                    ),
                                  );
                                  setDraftComment("");
                                })
                              }
                            >
                              {t("actCall")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="ddz-pill-btn is-pass"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await pudding.interaction.handle((c) =>
                                    callLandlord(
                                      {
                                        decision: "pass",
                                        comment:
                                          draftComment.trim() || undefined,
                                      },
                                      c,
                                    ),
                                  );
                                  setDraftComment("");
                                })
                              }
                            >
                              {t("actNoRob")}
                            </button>
                            <button
                              type="button"
                              className="ddz-pill-btn is-gold"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await pudding.interaction.handle((c) =>
                                    callLandlord(
                                      {
                                        decision: "rob",
                                        comment:
                                          draftComment.trim() || undefined,
                                      },
                                      c,
                                    ),
                                  );
                                  setDraftComment("");
                                })
                              }
                            >
                              {t("actRob")}
                            </button>
                          </>
                        )
                      ) : (
                        <>
                          {canHumanPass && (
                            <button
                              type="button"
                              className="ddz-pill-btn is-pass"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await pudding.interaction.handle((c) =>
                                    passTurn(
                                      {
                                        comment:
                                          draftComment.trim() || undefined,
                                      },
                                      c,
                                    ),
                                  );
                                  setDraftComment("");
                                })
                              }
                            >
                              {t("actPass")}
                            </button>
                          )}

                          <button
                            type="button"
                            className="ddz-pill-btn is-hint"
                            disabled={busy || legalPlaysForBottom.length === 0}
                            onClick={cycleHint}
                          >
                            <Lightbulb size={14} />
                            <span>{t("actHint")}</span>
                          </button>

                          {selectedCardIds.length > 0 && (
                            <button
                              type="button"
                              className="ddz-pill-btn is-hint"
                              disabled={busy}
                              onClick={() => setSelectedCardIds([])}
                            >
                              {t("actClear")}
                            </button>
                          )}

                          <button
                            type="button"
                            className="ddz-pill-btn is-gold"
                            disabled={busy || !isSelectionPlayable}
                            onClick={submitSelectedCards}
                          >
                            <span>
                              {t("actPlay")}
                              {selectedCombo && isSelectionPlayable
                                ? ` · ${comboLabel(
                                    selectedCombo.type,
                                    selectedCombo.mainRank,
                                  )}`
                                : ""}
                            </span>
                          </button>
                        </>
                      )}

                      <input
                        type="text"
                        className="ddz-talk-input"
                        placeholder={t("commentPlaceholder")}
                        maxLength={40}
                        value={draftComment}
                        onChange={(e) => setDraftComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            l.phase === "playing" &&
                            isSelectionPlayable
                          ) {
                            e.preventDefault();
                            submitSelectedCards();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="ddz-idle-bar">
                      <span>
                        {l.phase === "finished"
                          ? t("phaseFinished")
                          : t("waitingTurn")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed-height Hand Fan Slot (No clipping, zero jump) */}
              <div className="ddz-arch-fan-slot">
                {showBottomHandFaceUp ? (
                  <div className="ddz-arch-fan">
                    {bottomHand.map((card, idx) => {
                      const total = bottomHand.length;
                      const mid = (total - 1) / 2;
                      const norm =
                        total > 1 ? (idx - mid) / Math.max(mid, 1) : 0;
                      const angle = norm * 6.5;
                      const archY = norm * norm * 6;
                      return (
                        <PokerCardFace
                          key={card.id}
                          card={card}
                          size="hand"
                          selected={selectedCardIds.includes(card.id)}
                          onClick={
                            myTurn && l.phase === "playing"
                              ? () => toggleCardSelection(card.id)
                              : undefined
                          }
                          disabled={busy}
                          style={
                            {
                              "--fan-angle": `${angle.toFixed(2)}deg`,
                              "--fan-y": `${archY.toFixed(1)}px`,
                              zIndex: idx + 1,
                            } as CSSProperties
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="ddz-spectator-mask">
                    <span>{t("spectatorHiddenHint")}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {picker && renderPickerModal()}
    </div>
  );

  function renderPickerModal() {
    const sessionList = candidates?.sessions || [];
    const chosenNonBots = Object.values(pickerSlots).filter(
      (id) => id && id !== "@bot",
    );
    const hasConflict = new Set(chosenNonBots).size !== chosenNonBots.length;

    return (
      <div className="ddz-modal-overlay" onClick={() => setPicker(false)}>
        <div className="ddz-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ddz-modal-head">
            <h3>{t("pickerTitle")}</h3>
            <p>{t("pickerSubtitle")}</p>
          </div>

          <div className="ddz-slot-list">
            {(["South", "East", "West"] as Seat[]).map((s) => (
              <div key={s} className="ddz-slot-row">
                <label className="ddz-slot-label">
                  {s === "South"
                    ? t("seatSouth")
                    : s === "East"
                      ? t("seatEast")
                      : t("seatWest")}
                </label>
                <SeatSelectorDropdown
                  seat={s}
                  value={pickerSlots[s]}
                  onChange={(val) =>
                    setPickerSlots((prev) => ({
                      ...prev,
                      [s]: val,
                    }))
                  }
                  sessions={sessionList}
                />
              </div>
            ))}
          </div>

          {hasConflict && (
            <div className="ddz-slot-alert">{t("seatConflictError")}</div>
          )}

          <div className="ddz-modal-actions">
            <button
              type="button"
              className="ddz-top-btn"
              disabled={busy}
              onClick={() => setPicker(false)}
            >
              {t("pickerCancel")}
            </button>
            <button
              type="button"
              className="ddz-pill-btn is-gold"
              disabled={busy || hasConflict}
              onClick={() =>
                void perform(async () => {
                  await start(pickerSlots);
                  setPicker(false);
                })
              }
            >
              {t("pickerConfirm")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
