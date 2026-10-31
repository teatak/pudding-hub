import { ui } from "./text";
import { useEffect, useId, useRef, useState } from "react";
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
  Crosshair,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mic,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Unlock,
  UserRound,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Seat, WordCategory, PlayerRole } from "./types";
import {
  seatsForCount,
  isBotParticipant,
  eligibleVoteTargetsFor,
  containsOwnSecretWord,
} from "./rules";
import {
  lobby,
  position,
  start,
  speak,
  vote,
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
  categoryLabel,
} from "./text";
import {
  isSoundEnabled,
  setSoundEnabled,
  playSelectSound,
  playDealSound,
  playSpeakSound,
  playVoteSound,
  playPkTieSound,
  playEliminateSound,
  playVictorySound,
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
 * Matches `widgets/undercover/assets/icon.svg` 100% so the in-page emblem is identical to the tab icon.
 */
function UndercoverEmblemIcon({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="26" fill="#0F172A" />
      <rect
        x="6"
        y="6"
        width="116"
        height="116"
        rx="22"
        stroke="#F59E0B"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle
        cx="64"
        cy="64"
        r="46"
        fill="#1E293B"
        stroke="#D97706"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <path
        d="M22 60C34 55 94 55 106 60C96 66 32 66 22 60Z"
        fill="#F59E0B"
      />
      <path
        d="M36 58L43 32C44 28 51 26 57 29L64 33L71 29C77 26 84 28 85 32L92 58H36Z"
        fill="#FBBF24"
      />
      <path d="M37 52H91V57H37V52Z" fill="#B45309" />
      <rect
        x="34"
        y="69"
        width="26"
        height="16"
        rx="6"
        fill="#0F172A"
        stroke="#FDE047"
        strokeWidth="2.5"
      />
      <rect
        x="68"
        y="69"
        width="26"
        height="16"
        rx="6"
        fill="#0F172A"
        stroke="#FDE047"
        strokeWidth="2.5"
      />
      <path
        d="M60 75H68"
        stroke="#FDE047"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M39 73L45 81"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M73 73L79 81"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="92"
        cy="92"
        r="13"
        fill="#DC2626"
        stroke="#FEF08A"
        strokeWidth="2.5"
      />
      <path
        d="M88 92H96M92 88V96"
        stroke="#FEF08A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Renders the participant's actual avatar (AI model icon `info.model?.icon`, Human icon, or Bot icon)
 * inside a sleek Noir Detective frame. When revealed as Undercover (in God View or after elimination/finish),
 * renders a crimson-gold spy star frame around the model's icon.
 */
function AgentAvatar({
  info,
  seat,
  revealedRole,
  isTurn,
  isAlive,
}: {
  info: PlayerInfo;
  seat: Seat;
  revealedRole: PlayerRole | null;
  isTurn: boolean;
  isAlive: boolean;
}) {
  const gradId = useId();
  const isUndercover = revealedRole === "Undercover";

  const innerContent = info.model?.icon ? (
    <img src={info.model.icon} alt="" className="uc-avatar-img" />
  ) : info.isHuman ? (
    <UserRound size={18} />
  ) : info.isBot ? (
    <Bot size={18} />
  ) : (
    <Sparkles size={18} />
  );

  return (
    <div
      className={`uc-avatar-wrap ${isTurn ? "is-turn" : ""} ${
        !isAlive ? "is-out" : ""
      } ${isUndercover ? "is-undercover" : ""}`}
    >
      {isUndercover && (
        <svg
          className="uc-undercover-star-ring"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <polygon
            points="50,2 61,15 78,9 81,26 96,33 90,50 96,67 81,74 78,91 61,85 50,98 39,85 22,91 19,74 4,67 10,50 4,33 19,26 22,9 39,15"
            fill={`url(#${gradId})`}
            stroke="#FCA5A5"
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
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <div
        className={`uc-avatar-circle ${isUndercover ? "is-undercover" : ""}`}
      >
        {innerContent}
      </div>
      <span className="uc-seat-num-badge">{seatShortLabel(seat)}</span>
    </div>
  );
}

/**
 * Custom Seat Selector Dropdown with Model Icons (`sess.model?.icon`), Bot Avatar, and Human Avatar.
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

  const isMe = value === "@me";
  const isBot = value === "@bot" || value.startsWith("@bot");
  const currentSession = sessions.find(
    (s) => s.id === value || s.participantID === value,
  );

  return (
    <div className="uc-select-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="uc-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="uc-select-item-left">
          {isMe ? (
            <span className="uc-select-icon is-human">
              <UserRound size={15} />
            </span>
          ) : isBot ? (
            <span className="uc-select-icon is-bot">
              <Bot size={15} />
            </span>
          ) : currentSession?.model?.icon ? (
            <img
              src={currentSession.model.icon}
              alt=""
              className="uc-select-model-img"
            />
          ) : (
            <span className="uc-select-icon is-ai">
              <Sparkles size={15} />
            </span>
          )}
          <div className="uc-select-texts">
            <strong className="uc-select-title">
              {isMe
                ? t("playerYou")
                : isBot
                  ? `${t("playerBot")} · ${botNameForSeat(seat)}`
                  : currentSession?.name || value}
            </strong>
            <small className="uc-select-sub">
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
          className={`uc-select-chevron ${open ? "is-open" : ""}`}
        />
      </button>

      {open && (
        <div className="uc-select-menu" style={menuStyle}>
          <button
            type="button"
            className={`uc-select-option ${isMe ? "is-selected" : ""}`}
            onClick={() => {
              onChange("@me");
              setOpen(false);
            }}
          >
            <div className="uc-select-item-left">
              <span className="uc-select-icon is-human">
                <UserRound size={15} />
              </span>
              <div className="uc-select-texts">
                <strong className="uc-select-title">{t("playerYou")}</strong>
                <small className="uc-select-sub">{t("humanSubTag")}</small>
              </div>
            </div>
            {isMe && <Check size={14} className="uc-select-check" />}
          </button>

          <button
            type="button"
            className={`uc-select-option ${isBot ? "is-selected" : ""}`}
            onClick={() => {
              onChange("@bot");
              setOpen(false);
            }}
          >
            <div className="uc-select-item-left">
              <span className="uc-select-icon is-bot">
                <Bot size={15} />
              </span>
              <div className="uc-select-texts">
                <strong className="uc-select-title">
                  {t("playerBot")} · {botNameForSeat(seat)}
                </strong>
                <small className="uc-select-sub">{t("botTag")}</small>
              </div>
            </div>
            {isBot && <Check size={14} className="uc-select-check" />}
          </button>

          {sessions.map((sess) => {
            const selected = value === sess.id || value === sess.participantID;
            return (
              <button
                key={sess.id}
                type="button"
                className={`uc-select-option ${selected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(sess.id);
                  setOpen(false);
                }}
              >
                <div className="uc-select-item-left">
                  {sess.model?.icon ? (
                    <img
                      src={sess.model.icon}
                      alt=""
                      className="uc-select-model-img"
                    />
                  ) : (
                    <span className="uc-select-icon is-ai">
                      <Sparkles size={15} />
                    </span>
                  )}
                  <div className="uc-select-texts">
                    <strong className="uc-select-title">{sess.name}</strong>
                    <small className="uc-select-sub">
                      {sess.model?.name || "AI Session"}
                    </small>
                  </div>
                </div>
                {selected && <Check size={14} className="uc-select-check" />}
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
  const [pickerPlayerCount, setPickerPlayerCount] = useState<4 | 6>(
    l.playerCount || 4,
  );
  const [pickerUndercoverCount, setPickerUndercoverCount] = useState<1 | 2>(
    l.undercoverCount || 1,
  );
  const [pickerCategory, setPickerCategory] = useState<WordCategory>(
    l.category || "all",
  );
  const [pickerCustomCiv, setPickerCustomCiv] = useState<string>(
    l.customCivilianWord || "",
  );
  const [pickerCustomUnd, setPickerCustomUnd] = useState<string>(
    l.customUndercoverWord || "",
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
  const [maskMyWord, setMaskMyWord] = useState(false);

  const [draftSpeech, setDraftSpeech] = useState("");
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<Seat | null>(
    null,
  );
  const [draftVoteReason, setDraftVoteReason] = useState("");

  const prevRoundRef = useRef<number>(l.round);
  const prevStepRef = useRef<number>(p.stepCount);
  const dossierListRef = useRef<HTMLDivElement>(null);

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
    (l.phase === "speaking" || l.phase === "voting") &&
    !p.winner &&
    p.turn === humanSeat;

  // Reset vote target when turn/phase changes
  useEffect(() => {
    if (humanSeat && l.phase === "voting" && p.turn === humanSeat) {
      const targets = eligibleVoteTargetsFor(p, humanSeat);
      setSelectedVoteTarget((prev) =>
        prev && targets.includes(prev) ? prev : targets[0] || null,
      );
    } else {
      setSelectedVoteTarget(null);
    }
  }, [l.round, l.phase, p.cycle, p.turn, humanSeat]);

  // Auto-scroll dossier log to latest entry
  useEffect(() => {
    if (dossierListRef.current) {
      dossierListRef.current.scrollTop = dossierListRef.current.scrollHeight;
    }
  }, [p.stepCount, l.phase]);

  // Trigger synthesized audio effects on game events
  useEffect(() => {
    if (l.round > 0 && l.round !== prevRoundRef.current) {
      prevRoundRef.current = l.round;
      prevStepRef.current = p.stepCount;
      playDealSound();
      return;
    }
    if (p.stepCount !== prevStepRef.current) {
      prevStepRef.current = p.stepCount;
      const ev = p.lastEvent;
      if (!ev) return;

      if (ev.kind === "victory") {
        playVictorySound(ev.winner);
      } else if (ev.kind === "eliminated") {
        playEliminateSound(ev.role);
      } else if (ev.kind === "pk_tie") {
        playPkTieSound();
      } else if (ev.kind === "vote") {
        playVoteSound();
      } else if (ev.kind === "speak") {
        playSpeakSound();
      }
    }
  }, [l.round, p.stepCount, p.lastEvent]);

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
      Seat1: "@me",
      Seat2: pool[0] || "@bot",
      Seat3: pool[1] || "@bot",
      Seat4: pool[2] || "@bot",
      Seat5: pool[3] || "@bot",
      Seat6: pool[4] || "@bot",
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
    setPickerPlayerCount(l.playerCount || 4);
    setPickerUndercoverCount(l.undercoverCount || 1);
    setPickerCategory(l.category || "all");
    setPickerCustomCiv(l.customCivilianWord || "");
    setPickerCustomUnd(l.customUndercoverWord || "");
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

  // Step built-in bot turns automatically
  useEffect(() => {
    if (isPaused) return;
    if (l.phase !== "speaking" && l.phase !== "voting") return;
    if (!p.turn || p.winner) return;
    const activeId = l.seats[p.turn];
    if (!isBotParticipant(activeId)) return;

    const timer = setTimeout(() => {
      void stepBotTurn().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    }, 680);
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

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSelectSound();
  }

  const bottomSeat: Seat =
    humanSeat && activeSeats.includes(humanSeat) ? humanSeat : activeSeats[0];

  const isBottomTurn =
    !isPaused &&
    (l.phase === "speaking" || l.phase === "voting") &&
    !p.winner &&
    p.turn === bottomSeat;

  // Rotate remaining seats clockwise around the interrogation table
  const bottomIdx = activeSeats.indexOf(bottomSeat);
  const rotatedOpponents: Seat[] = [];
  for (let i = 1; i < activeSeats.length; i++) {
    rotatedOpponents.push(activeSeats[(bottomIdx + i) % activeSeats.length]);
  }

  // Split opponent seats between Left Wing, Top Center, and Right Wing
  // Left wing flows clockwise from bottom to top, so visually top-to-bottom is [top-left, bottom-left].
  const leftWingSeats: Seat[] =
    activeSeats.length === 4
      ? [rotatedOpponents[0]]
      : [rotatedOpponents[1], rotatedOpponents[0]];
  const topCenterSeat: Seat | null =
    activeSeats.length === 4 ? rotatedOpponents[1] : rotatedOpponents[2];
  const rightWingSeats: Seat[] =
    activeSeats.length === 4
      ? [rotatedOpponents[2]]
      : [rotatedOpponents[3], rotatedOpponents[4]];

  const isFinished = l.phase === "finished" && Boolean(p.winner);
  const myWord = l.round > 0 ? p.words[bottomSeat] || "" : "";
  const eligibleTargetsForHuman =
    myTurn && l.phase === "voting" && humanSeat
      ? eligibleVoteTargetsFor(p, humanSeat)
      : [];

  function renderAgentCard(seat: Seat, side: "left" | "top" | "right") {
    const info = getPlayerInfo(seat);
    const isAlive = p.aliveSeats.includes(seat);
    const elimRecord = p.eliminated.find((e) => e.seat === seat) || null;
    const isTurn =
      (l.phase === "speaking" || l.phase === "voting") &&
      !p.winner &&
      p.turn === seat;
    const isPkCandidate = p.pkRound > 0 && p.pkCandidates.includes(seat);

    const revealedRole: PlayerRole | null =
      godView || isFinished
        ? p.roles[seat]
        : elimRecord
          ? elimRecord.role
          : null;
    const revealedWord: string | null =
      (godView || isFinished) && l.round > 0 ? p.words[seat] : null;

    const lastAct = p.lastActions[seat];
    const latestSpeechInCycle = [...p.speeches]
      .reverse()
      .find((s) => s.seat === seat && s.cycle === p.cycle);
    const currentVote = p.currentVotes[seat];

    const canClickToVote =
      myTurn &&
      l.phase === "voting" &&
      eligibleTargetsForHuman.includes(seat);
    const isVoteSelected = canClickToVote && selectedVoteTarget === seat;

    const incomingVotes = p.votingOrder.filter(
      (voter) => p.currentVotes[voter]?.target === seat,
    );

    return (
      <div
        key={seat}
        className={`uc-agent-card is-${side} ${isTurn ? "is-turn" : ""} ${
          !isAlive ? "is-eliminated" : ""
        } ${isPkCandidate ? "is-pk" : ""} ${
          canClickToVote ? "is-votable" : ""
        } ${isVoteSelected ? "is-vote-selected" : ""}`}
        onClick={() => {
          if (canClickToVote) {
            playSelectSound();
            setSelectedVoteTarget(seat);
          }
        }}
      >
        {isVoteSelected && (
          <div className="uc-target-reticle" aria-hidden="true">
            <Crosshair size={20} />
          </div>
        )}

        <div className="uc-agent-header">
          <AgentAvatar
            info={info}
            seat={seat}
            revealedRole={revealedRole}
            isTurn={isTurn}
            isAlive={isAlive}
          />
          <div className="uc-agent-meta">
            <div className="uc-agent-name-row">
              <strong className="uc-agent-name" title={info.name}>
                {info.name}
              </strong>
              {incomingVotes.length > 0 && l.phase === "voting" && (
                <span className="uc-incoming-vote-pill">
                  🎯 {ui("votesCount", { count: incomingVotes.length })}
                </span>
              )}
            </div>

            <div className="uc-agent-tags">
              {revealedRole ? (
                <span
                  className={`uc-role-badge ${
                    revealedRole === "Undercover"
                      ? "is-undercover"
                      : "is-civilian"
                  }`}
                  aria-hidden="true"
                  data-label={
                    revealedRole === "Undercover"
                      ? t("roleUndercover")
                      : t("roleCivilian")
                  }
                />
              ) : (
                <span className="uc-role-badge is-secret">
                  {isAlive ? t("statusAlive") : t("statusOut")}
                </span>
              )}

              {revealedWord && (
                <span
                  className="uc-secret-word-chip"
                  aria-hidden="true"
                  data-word={`「${revealedWord}」`}
                />
              )}
            </div>
          </div>
        </div>

        <div className="uc-agent-testimony-slot">
          {isTurn ? (
            <div className="uc-thinking-bar">
              <span className="uc-radar-dot" />
              <span>
                {l.phase === "voting" ? t("votingThinking") : t("thinking")}
              </span>
            </div>
          ) : l.phase === "voting" && currentVote ? (
            <div className="uc-vote-action-box">
              <span className="uc-vote-arrow-tag">
                🎯{" "}
                {t("voteTargetBadge", {
                  seat: seatShortLabel(currentVote.target),
                })}
              </span>
              {currentVote.reason && (
                <p className="uc-vote-reason-text" title={currentVote.reason}>
                  “{currentVote.reason}”
                </p>
              )}
            </div>
          ) : latestSpeechInCycle ? (
            <div
              key={latestSpeechInCycle.step}
              className="uc-speech-bubble"
              title={latestSpeechInCycle.text}
            >
              <span className="uc-speech-quote">
                “{latestSpeechInCycle.text}”
              </span>
            </div>
          ) : lastAct?.kind === "speak" && lastAct.text ? (
            <div className="uc-speech-bubble is-muted" title={lastAct.text}>
              <span className="uc-speech-quote">“{lastAct.text}”</span>
            </div>
          ) : (
            <div className="uc-speech-placeholder">
              <span>{ui("waitingStatements")}</span>
            </div>
          )}
        </div>

        {!isAlive && elimRecord && (
          <div className="uc-eliminated-stamp" aria-hidden="true">
            <span
              data-stamp={t("eliminatedStamp", {
                role:
                  elimRecord.role === "Undercover"
                    ? t("roleUndercover")
                    : t("roleCivilian"),
              })}
            />
          </div>
        )}
      </div>
    );
  }

  function handleQuickStart() {
    void perform(async () => {
      await start({
        playerCount: pickerPlayerCount,
        undercoverCount: pickerPlayerCount === 4 ? 1 : pickerUndercoverCount,
        category: pickerCategory,
        customCivilianWord: pickerCustomCiv,
        customUndercoverWord: pickerCustomUnd,
        assignments: pickerSlots,
        locale: locale || undefined,
      });
      setPicker(false);
    });
  }

  function submitHumanSpeech() {
    if (busy || !myTurn || l.phase !== "speaking") return;
    const text = draftSpeech.trim();
    if (!text) return;
    if (containsOwnSecretWord(text, myWord)) {
      setError(t("wordLeakError", { word: myWord }));
      return;
    }
    void perform(async () => {
      await pudding.interaction.handle((c) => speak({ clue: text }, c));
      setDraftSpeech("");
    });
  }

  function submitHumanVote() {
    if (busy || !myTurn || l.phase !== "voting" || !selectedVoteTarget) return;
    void perform(async () => {
      await pudding.interaction.handle((c) =>
        vote(
          {
            target: selectedVoteTarget,
            reason: draftVoteReason.trim() || undefined,
          },
          c,
        ),
      );
      setDraftVoteReason("");
    });
  }

  const aliveUndercoverCount = p.aliveSeats.filter(
    (s) => p.roles[s] === "Undercover",
  ).length;
  const bottomInfo = getPlayerInfo(bottomSeat);
  const bottomAlive = p.aliveSeats.includes(bottomSeat);
  const bottomElim = p.eliminated.find((e) => e.seat === bottomSeat) || null;
  const bottomRevealedRole: PlayerRole | null =
    godView || isFinished
      ? p.roles[bottomSeat]
      : bottomElim
        ? bottomElim.role
        : null;
  const bottomLatestSpeech = [...p.speeches]
    .reverse()
    .find((s) => s.seat === bottomSeat && s.cycle === p.cycle);

  const phaseBadgeText =
    l.phase === "lobby"
      ? t("phaseLobby")
      : l.phase === "finished"
        ? t("phaseFinished")
        : l.phase === "speaking"
          ? p.pkRound > 0
            ? t("phasePkSpeaking", { cycle: p.cycle })
            : t("phaseSpeaking", { cycle: p.cycle })
          : p.pkRound > 0
            ? t("phasePkVoting", { cycle: p.cycle })
            : t("phaseVoting", { cycle: p.cycle });

  return (
    <div className="uc-app">
      {/* Top Header Bar */}
      <header className="uc-topbar">
        <div className="uc-brand">
          <div className="uc-emblem" aria-hidden="true">
            <UndercoverEmblemIcon size={30} />
          </div>
          <h1>{t("appTitle")}</h1>
          {l.round > 0 && (
            <div className="uc-status-pills">
              <span className="uc-phase-pill">{phaseBadgeText}</span>
              <span className="uc-alive-pill">
                {t("aliveCount", {
                  alive: p.aliveSeats.length,
                  total: activeSeats.length,
                })}
              </span>
              <span className="uc-spy-pill">
                {t("undercoverRemain", { count: aliveUndercoverCount })}
              </span>
            </div>
          )}
        </div>

        <div className="uc-toolbar">
          <button
            type="button"
            className={`uc-top-btn ${godView ? "is-active" : ""}`}
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
            className={`uc-top-btn is-icon ${soundOn ? "is-active" : ""}`}
            title={t("toggleSound")}
            aria-label={t("toggleSound")}
            onClick={toggleSound}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {l.phase !== "lobby" && !p.winner && (
            <button
              type="button"
              className="uc-top-btn"
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
            className="uc-top-btn"
            disabled={busy}
            onClick={openPickerModal}
          >
            <UsersRound size={15} />
            <span>{t("configure")}</span>
          </button>

          <button
            type="button"
            className="uc-top-btn is-primary"
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

      {/* Error Toast Overlay */}
      {error && (
        <div className="uc-error-toast" role="alert">
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

      {/* Main Round-Table Interrogation Arena */}
      <main className="uc-arena">
        {/* Left Wing Agent Seats */}
        <aside className="uc-wing is-left">
          {leftWingSeats.map((s) => renderAgentCard(s, "left"))}
        </aside>

        {/* Center Column: Top Agent Seat + Classified Dossier + Bottom Centered Main Seat (#1) */}
        <section className="uc-center-stage">
          {topCenterSeat && (
            <div className="uc-top-seat-holder">
              {renderAgentCard(topCenterSeat, "top")}
            </div>
          )}

          {/* Classified Case Dossier Box */}
          <div className="uc-dossier-panel">
            <div className="uc-dossier-header">
              <div className="uc-dossier-title-wrap">
                <FileText size={15} className="uc-dossier-icon" />
                <span>{t("dossierTitle")}</span>
              </div>

              {(godView || isFinished) && l.round > 0 && (
                <div className="uc-god-word-bar" aria-hidden="true">
                  <span
                    className="uc-god-chip is-civ"
                    data-pair={`${t("civilianWordLabel")}：${p.civilianWord}`}
                  />
                  <span
                    className="uc-god-chip is-und"
                    data-pair={`${t("undercoverWordLabel")}：${p.undercoverWord}`}
                  />
                </div>
              )}
            </div>

            <div className="uc-dossier-body" ref={dossierListRef}>
              {l.phase === "lobby" || l.round === 0 ? (
                <div className="uc-welcome-card">
                  <div className="uc-welcome-seal">🕵️</div>
                  <h2>{t("welcomeTitle")}</h2>
                  <p>{t("welcomeSub")}</p>
                  <button
                    type="button"
                    className="uc-cta-btn"
                    onClick={openPickerModal}
                  >
                    <Sparkles size={16} />
                    <span>{t("startInterrogation")}</span>
                  </button>
                </div>
              ) : (
                <div className="uc-timeline-list">
                  {Array.from({ length: p.cycle }).map((_, idx) => {
                    const cNum = idx + 1;
                    const cycleSpeeches = p.speeches.filter(
                      (s) => s.cycle === cNum,
                    );
                    const cycleVotes = p.votes.filter((v) => v.cycle === cNum);
                    const cycleElim = p.eliminated.find(
                      (e) => e.cycle === cNum,
                    );

                    return (
                      <div key={cNum} className="uc-timeline-cycle">
                        <div className="uc-cycle-divider">
                          <span>{ui("cycleLog", {cycle: cNum})}</span>
                        </div>

                        {cycleSpeeches.map((sp) => {
                          const sInfo = getPlayerInfo(sp.seat);
                          return (
                            <div key={sp.step} className="uc-log-item is-speech">
                              <span className="uc-log-badge">
                                {seatShortLabel(sp.seat)} · {sInfo.name}
                                {sp.isPk ? ` ${ui("pkSuffix")}` : ""}
                              </span>
                              <span className="uc-log-text">“{sp.text}”</span>
                            </div>
                          );
                        })}

                        {cycleVotes.length > 0 && (
                          <div className="uc-log-votes-row">
                            {cycleVotes.map((vt) => (
                              <span
                                key={vt.step}
                                className="uc-mini-vote-chip"
                                title={vt.reason || ""}
                              >
                                {seatShortLabel(vt.voter)} ➔{" "}
                                <strong>{seatShortLabel(vt.target)}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {cycleElim && (
                          <div
                            className={`uc-log-elim-banner ${
                              cycleElim.role === "Undercover"
                                ? "is-undercover"
                                : "is-civilian"
                            }`}
                          >
                            <span>
                              🚨 {ui("eliminatedRole", {seat: seatLabel(cycleElim.seat)})}{" "}
                              <strong>
                                {cycleElim.role === "Undercover"
                                  ? t("roleUndercover")
                                  : t("roleCivilian")}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isFinished && p.winner && (
                    <div
                      className={`uc-victory-banner ${
                        p.winner === "Civilian"
                          ? "is-civilian-win"
                          : "is-undercover-win"
                      }`}
                    >
                      <div className="uc-victory-headline">
                        <Sparkles size={18} />
                        <strong>{ui(p.winner === "Civilian" ? "civilianWin" : "undercoverWin")}</strong>
                      </div>
                      <div className="uc-victory-words">
                        <span>
                          {t("civilianWordLabel")}：
                          <strong>「{p.civilianWord}」</strong>
                        </span>
                        <span>
                          {t("undercoverWordLabel")}：
                          <strong>「{p.undercoverWord}」</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Centered Lead Detective Seat (#1) & Action Hub */}
          <div className="uc-bottom-seat-holder">
            <div
              className={`uc-main-seat-card ${isBottomTurn ? "is-turn is-my-turn" : ""} ${
                !bottomAlive && l.round > 0 ? "is-eliminated" : ""
              }`}
            >
              {/* Left section: Seat #1 Avatar + Name + Classified Word Dossier */}
              <div className="uc-main-seat-head">
                <div className="uc-envelope-left">
                  <AgentAvatar
                    info={bottomInfo}
                    seat={bottomSeat}
                    revealedRole={bottomRevealedRole}
                    isTurn={isBottomTurn}
                    isAlive={bottomAlive}
                  />
                  <div className="uc-envelope-agent">
                    <strong>{bottomInfo.name}</strong>
                    <small>
                      {bottomRevealedRole
                        ? bottomRevealedRole === "Undercover"
                          ? t("roleUndercover")
                          : t("roleCivilian")
                        : t("roleSecret")}
                    </small>
                  </div>
                </div>

                {/* Secret Word Badge */}
                <div className="uc-main-word-badge">
                  <div className="uc-envelope-label-row">
                    <span className="uc-wax-seal">{ui("secretSeal")}</span>
                    <span className="uc-envelope-label">
                      {t("secretCardTitle")}
                    </span>
                    {l.round > 0 && (
                      <button
                        type="button"
                        className="uc-mask-toggle"
                        onClick={() => {
                          playSelectSound();
                          setMaskMyWord(!maskMyWord);
                        }}
                      >
                        {maskMyWord ? <Unlock size={11} /> : <Lock size={11} />}
                        <span>
                          {maskMyWord ? t("revealWord") : t("holdToHide")}
                        </span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`uc-secret-word-display ${
                      maskMyWord || l.round === 0 ? "is-masked" : ""
                    }`}
                    aria-hidden="true"
                    data-word={
                      l.round === 0
                        ? ui("notDealt")
                        : maskMyWord
                          ? t("wordHiddenMask")
                          : `「${myWord}」`
                    }
                  />
                </div>
              </div>

              {/* Right / Bottom section inside Main Seat Card: Interactive Controls or Status */}
              <div className="uc-main-seat-body">
                {myTurn && l.phase === "speaking" ? (
                  <div className="uc-speak-input-row">
                    <input
                      type="text"
                      className="uc-clue-input"
                      value={draftSpeech}
                      maxLength={100}
                      placeholder={t("speakPlaceholder")}
                      onChange={(e) => setDraftSpeech(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitHumanSpeech();
                      }}
                    />
                    <button
                      type="button"
                      className="uc-submit-btn is-gold"
                      disabled={busy || !draftSpeech.trim()}
                      onClick={submitHumanSpeech}
                    >
                      <Mic size={15} />
                      <span>{t("submitSpeech")}</span>
                    </button>
                  </div>
                ) : myTurn && l.phase === "voting" ? (
                  <div className="uc-vote-compact-wrap">
                    <div className="uc-target-pills">
                      <span className="uc-vote-prompt">{t("votePrompt")}</span>
                      {eligibleTargetsForHuman.map((tSeat) => {
                        const tInfo = getPlayerInfo(tSeat);
                        const active = selectedVoteTarget === tSeat;
                        return (
                          <button
                            key={tSeat}
                            type="button"
                            className={`uc-target-pill ${
                              active ? "is-selected" : ""
                            }`}
                            onClick={() => {
                              playSelectSound();
                              setSelectedVoteTarget(tSeat);
                            }}
                          >
                            <Crosshair size={12} />
                            <span>
                              {seatShortLabel(tSeat)} · {tInfo.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="uc-speak-input-row">
                      <input
                        type="text"
                        className="uc-clue-input"
                        value={draftVoteReason}
                        maxLength={70}
                        placeholder={t("voteReasonPlaceholder")}
                        onChange={(e) => setDraftVoteReason(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitHumanVote();
                        }}
                      />
                      <button
                        type="button"
                        className="uc-submit-btn is-crimson"
                        disabled={busy || !selectedVoteTarget}
                        onClick={submitHumanVote}
                      >
                        <Crosshair size={15} />
                        <span>{t("submitVote")}</span>
                      </button>
                    </div>
                  </div>
                ) : l.round === 0 || l.phase === "lobby" ? (
                  <div className="uc-main-idle-hint">
                    <span>{t("secretCardHint")}</span>
                  </div>
                ) : isFinished ? (
                  <div className="uc-main-idle-hint">
                    <span>
                      🏆 {ui(p.winner === "Civilian" ? "civilianWin" : "undercoverWin")}
                    </span>
                  </div>
                ) : (
                  <div className="uc-main-idle-hint">
                    {bottomLatestSpeech ? (
                      <span className="uc-my-last-clue">
                        {ui("saidClue", {clue: bottomLatestSpeech.text})}
                      </span>
                    ) : (
                      <div className="uc-standby-status">
                        <div className="uc-waveform" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                        <span>
                          {p.turn
                            ? ui("waitingNamed", { seat: seatLabel(p.turn), name: getPlayerInfo(p.turn).name, action: ui(l.phase === "voting" ? "waitingVote" : "waitingClue") })
                            : ui("inProgress")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!bottomAlive && bottomElim && (
                <div className="uc-eliminated-stamp" aria-hidden="true">
                  <span
                    data-stamp={t("eliminatedStamp", {
                      role:
                        bottomElim.role === "Undercover"
                          ? t("roleUndercover")
                          : t("roleCivilian"),
                    })}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Wing Agent Seats */}
        <aside className="uc-wing is-right">
          {rightWingSeats.map((s) => renderAgentCard(s, "right"))}
        </aside>
      </main>

      {/* Seat & Word Bank Configuration Modal */}
      {picker && (
        <div
          className="uc-modal-backdrop"
          onClick={() => !busy && setPicker(false)}
        >
          <div
            className="uc-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="uc-modal-header">
              <div className="uc-modal-title-row">
                <UndercoverEmblemIcon size={26} />
                <h3>{t("modalTitle")}</h3>
              </div>
              <button
                type="button"
                className="uc-modal-close"
                onClick={() => setPicker(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="uc-modal-body">
              <div className="uc-config-group">
                <label className="uc-config-label">{t("playerCountLabel")}</label>
                <div className="uc-mode-tabs">
                  <button
                    type="button"
                    className={`uc-mode-tab ${
                      pickerPlayerCount === 4 ? "is-active" : ""
                    }`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(4);
                      setPickerUndercoverCount(1);
                    }}
                  >
                    {t("mode4Players")}
                  </button>
                  <button
                    type="button"
                    className={`uc-mode-tab ${
                      pickerPlayerCount === 6 && pickerUndercoverCount === 1
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(6);
                      setPickerUndercoverCount(1);
                    }}
                  >
                    {t("mode6Players1U")}
                  </button>
                  <button
                    type="button"
                    className={`uc-mode-tab ${
                      pickerPlayerCount === 6 && pickerUndercoverCount === 2
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() => {
                      playSelectSound();
                      setPickerPlayerCount(6);
                      setPickerUndercoverCount(2);
                    }}
                  >
                    {t("mode6Players2U")}
                  </button>
                </div>
              </div>

              <div className="uc-config-group">
                <label className="uc-config-label">{t("categoryLabel")}</label>
                <div className="uc-cat-pills">
                  {(
                    [
                      "all",
                      "tech",
                      "food",
                      "culture",
                      "daily",
                      "custom",
                    ] as WordCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`uc-cat-pill ${
                        pickerCategory === cat ? "is-active" : ""
                      }`}
                      onClick={() => {
                        playSelectSound();
                        setPickerCategory(cat);
                      }}
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>

                {pickerCategory === "custom" && (
                  <div className="uc-custom-words-row">
                    <input
                      type="text"
                      className="uc-custom-input"
                      placeholder={t("customCivPlaceholder")}
                      value={pickerCustomCiv}
                      maxLength={24}
                      onChange={(e) => setPickerCustomCiv(e.target.value)}
                    />
                    <input
                      type="text"
                      className="uc-custom-input"
                      placeholder={t("customUndPlaceholder")}
                      value={pickerCustomUnd}
                      maxLength={24}
                      onChange={(e) => setPickerCustomUnd(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="uc-seats-grid">
                {seatsForCount(pickerPlayerCount).map((seat) => (
                  <div key={seat} className="uc-seat-field">
                    <span className="uc-seat-field-label">
                      {seatLabel(seat)}
                    </span>
                    <SeatSelectorDropdown
                      seat={seat}
                      value={pickerSlots[seat]}
                      onChange={(val) =>
                        setPickerSlots((prev) => ({ ...prev, [seat]: val }))
                      }
                      sessions={candidates?.sessions || []}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="uc-modal-footer">
              <button
                type="button"
                className="uc-modal-btn is-ghost"
                disabled={busy}
                onClick={() => setPicker(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="uc-modal-btn is-confirm"
                disabled={busy}
                onClick={handleQuickStart}
              >
                <Sparkles size={15} />
                <span>{t("confirmStart")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
