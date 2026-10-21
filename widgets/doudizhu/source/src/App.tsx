import { useEffect, useState } from "react";
import {
  pudding,
  useWidgetInteraction,
  useWidgetLocale,
  useWidgetState,
} from "@pudding/widget";
import {
  Bot,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Lightbulb,
  MessagesSquare,
  MessageSquareOff,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  type Seat,
  type Card,
} from "./types";
import {
  seats,
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

function DoudizhuEmblemIcon({ size = 24 }: { size?: number }) {
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
      <g transform="rotate(-12 48 66)">
        <rect
          x="22"
          y="26"
          width="50"
          height="72"
          rx="8"
          fill="#FFFBEB"
          stroke="#D97706"
          strokeWidth="2.5"
        />
        <circle cx="47" cy="62" r="11" fill="#1E293B" />
      </g>
      <g transform="rotate(10 78 64)">
        <rect
          x="52"
          y="24"
          width="52"
          height="74"
          rx="8"
          fill="#FFFFFF"
          stroke="#F59E0B"
          strokeWidth="2.5"
        />
        <path
          d="M64 72L68 52L78 61L88 52L92 72H64Z"
          fill="#F59E0B"
          stroke="#B45309"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
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
  if (rank === "BJ") return "小王";
  if (rank === "RJ") return "大王";
  return rank;
}

function PokerCardView({
  card,
  small = false,
  selected = false,
  onClick,
  disabled = false,
}: {
  card: Card;
  small?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const red = isRedCard(card);
  const rankText = displayRankText(card.rank);
  const sym = suitSymbol(card.suit);
  const isJoker = card.rank === "BJ" || card.rank === "RJ";

  if (onClick) {
    return (
      <button
        type="button"
        className={`ddz-card is-interactive ${small ? "is-small" : ""} ${
          red ? "is-red" : "is-black"
        } ${isJoker ? "is-joker" : ""} ${selected ? "is-selected" : ""}`}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="ddz-card-corner">
          <strong className="ddz-card-rank">{rankText}</strong>
          <small className="ddz-card-suit">{sym}</small>
        </span>
        <span className="ddz-card-center" aria-hidden="true">
          {isJoker ? (card.rank === "RJ" ? "👑" : "🃏") : sym}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`ddz-card ${small ? "is-small" : ""} ${
        red ? "is-red" : "is-black"
      } ${isJoker ? "is-joker" : ""}`}
    >
      <span className="ddz-card-corner">
        <strong className="ddz-card-rank">{rankText}</strong>
        <small className="ddz-card-suit">{sym}</small>
      </span>
      <span className="ddz-card-center" aria-hidden="true">
        {isJoker ? (card.rank === "RJ" ? "👑" : "🃏") : sym}
      </span>
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

  // Human card selection & privacy toggle
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [manualPeek, setManualPeek] = useState(false);

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

  // Clear selection when round or turn changes
  useEffect(() => {
    setSelectedCardIds([]);
    setHintIndex(0);
  }, [l.round, p.stepCount, l.phase]);

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

  // Built-in Bot turn driver
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

  // Perspective mapping: if human is seated, put human at bottom; otherwise South at bottom
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

  const holeRevealed = l.phase === "playing" || l.phase === "finished";
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

  // Show bottom seat's hand face-up ONLY when:
  // 1) Round is finished (reveal all), OR
  // 2) Bottom seat is Human AND (it is Human's turn OR Human toggled manualPeek)
  const showBottomHandFaceUp =
    l.phase === "finished" ||
    (Boolean(humanSeat) && (myTurn || manualPeek));

  function toggleCardSelection(cardId: string) {
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  }

  function cycleHint() {
    if (!legalPlaysForBottom.length) return;
    const chosen = legalPlaysForBottom[hintIndex % legalPlaysForBottom.length];
    setSelectedCardIds(chosen.map((c) => c.id));
    setHintIndex((prev) => prev + 1);
  }

  function renderRoleBadge(seat: Seat) {
    if (!p.landlord) return null;
    const isLandlord = p.landlord === seat;
    return (
      <span
        className={`ddz-role-badge ${
          isLandlord ? "is-landlord" : "is-peasant"
        }`}
      >
        {isLandlord ? <Crown size={12} /> : <Shield size={12} />}
        <span>{isLandlord ? t("roleLandlord") : t("rolePeasant")}</span>
      </span>
    );
  }

  function renderActionSpot(seat: Seat) {
    const act = p.lastActions[seat];
    const isTurn =
      (l.phase === "bidding" || l.phase === "playing") &&
      !p.winner &&
      p.turn === seat;

    if (isTurn) {
      return (
        <div className="ddz-spot-status is-thinking">
          <span className="ddz-pulse-dot" />
          <span>{t("thinking")}</span>
        </div>
      );
    }

    if (!act) return null;

    if (act.kind === "call") {
      return <span className="ddz-action-tag is-call">{t("tagCalled")}</span>;
    }
    if (act.kind === "rob") {
      return <span className="ddz-action-tag is-rob">{t("tagRobbed")}</span>;
    }
    if (act.kind === "no_call") {
      return <span className="ddz-action-tag is-pass">{t("tagNoCall")}</span>;
    }
    if (act.kind === "no_rob") {
      return <span className="ddz-action-tag is-pass">{t("tagNoRob")}</span>;
    }
    if (act.kind === "pass") {
      return <span className="ddz-action-tag is-pass">{t("tagPassed")}</span>;
    }
    if (act.kind === "play" && act.cards) {
      return (
        <div className="ddz-played-group">
          <div className="ddz-played-cards">
            {act.cards.map((c) => (
              <PokerCardView key={c.id} card={c} small />
            ))}
          </div>
          {act.combo && (
            <span className="ddz-combo-pill">
              {comboLabel(act.combo.type, act.combo.mainRank)}
            </span>
          )}
        </div>
      );
    }
    return null;
  }

  function renderSideSeat(seat: Seat, side: "left" | "right") {
    const info = getPlayerInfo(seat);
    const hand = p.hands[seat] || [];
    const isTurn =
      (l.phase === "bidding" || l.phase === "playing") &&
      !p.winner &&
      p.turn === seat;
    const comment = p.comments[seat];

    return (
      <aside
        className={`ddz-side-seat is-${side} ${isTurn ? "is-turn" : ""}`}
      >
        <div className="ddz-seat-card">
          <div className="ddz-seat-top">
            <span className="ddz-seat-pos">{seatLabel(seat)}</span>
            {renderRoleBadge(seat)}
          </div>

          <div className="ddz-seat-profile">
            <div className="ddz-avatar">
              {info.isHuman ? (
                <UserRound size={18} />
              ) : info.model?.icon ? (
                <img src={info.model.icon} alt="" className="ddz-avatar-img" />
              ) : info.isBot ? (
                <Bot size={18} />
              ) : (
                <Sparkles size={18} />
              )}
            </div>
            <div className="ddz-seat-meta">
              <strong className="ddz-seat-name">{info.name}</strong>
              <small className="ddz-seat-sub">
                {info.model?.name ||
                  (info.isBot ? t("botTag") : t("playerYou"))}
              </small>
            </div>
          </div>

          {/* Remaining Card Back Counter */}
          {l.phase !== "lobby" && (
            <div className="ddz-card-counter">
              <div className="ddz-card-back-mini" aria-hidden="true" />
              <strong
                className={`ddz-count-num ${
                  hand.length <= 2 ? "is-alarm" : ""
                }`}
              >
                {t("cardsLeft", { count: hand.length })}
              </strong>
            </div>
          )}

          {/* Danmaku speech bubble */}
          {danmaku && comment?.text && (
            <div className="ddz-speech" title={comment.text}>
              “{comment.text}”
            </div>
          )}

          {/* End-of-game hand reveal ONLY when finished */}
          {l.phase === "finished" && hand.length > 0 && (
            <div className="ddz-finished-reveal">
              {hand.map((c) => (
                <PokerCardView key={c.id} card={c} small />
              ))}
            </div>
          )}
        </div>

        {/* Action spot on the felt next to this player */}
        <div className="ddz-side-action-zone">{renderActionSpot(seat)}</div>
      </aside>
    );
  }

  return (
    <div className="ddz-app">
      {/* Header */}
      <header className="ddz-header">
        <div className="ddz-heading">
          <div className="ddz-emblem" aria-hidden="true">
            <DoudizhuEmblemIcon size={24} />
          </div>
          <div>
            <h1>{t("appTitle")}</h1>
          </div>
        </div>

        <div className="ddz-header-actions">
          <button
            type="button"
            className={`ddz-btn ddz-icon-btn ${danmaku ? "is-active" : ""}`}
            title={t("toggleDanmaku")}
            aria-label={t("toggleDanmaku")}
            onClick={() => setDanmaku(!danmaku)}
          >
            {danmaku ? (
              <MessagesSquare size={16} />
            ) : (
              <MessageSquareOff size={16} />
            )}
          </button>

          {l.phase !== "lobby" && !p.winner && !isPaused && (
            <button
              type="button"
              className="ddz-btn"
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
              className="ddz-btn is-primary"
              disabled={busy}
              onClick={() => void perform(resume)}
            >
              <Play size={14} />
              <span>{t("continueGame")}</span>
            </button>
          )}

          {l.round > 0 && (
            <button
              type="button"
              className="ddz-btn"
              disabled={busy}
              onClick={openPickerModal}
            >
              <UsersRound size={14} />
              <span>{t("changeSeats")}</span>
            </button>
          )}

          <button
            type="button"
            className="ddz-btn is-primary"
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
            className="ddz-btn ddz-icon-btn"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Felt Poker Table */}
      <main className="ddz-table">
        {/* Top Table Bar: 3 Hole Cards + Multiplier + Bombs */}
        <div className="ddz-table-topbar">
          <div className="ddz-hole-box">
            <span className="ddz-top-label">{t("holeCardsLabel")}</span>
            {holeRevealed ? (
              <div className="ddz-hole-cards">
                {p.bottomCards.map((c) => (
                  <PokerCardView key={c.id} card={c} small />
                ))}
              </div>
            ) : (
              <div className="ddz-hole-cards">
                <div className="ddz-card-back-hole" />
                <div className="ddz-card-back-hole" />
                <div className="ddz-card-back-hole" />
                <span className="ddz-hole-hidden-tag">{t("holeHidden")}</span>
              </div>
            )}
          </div>

          <div className="ddz-phase-pill">
            {l.phase === "lobby"
              ? t("phaseLobby")
              : l.phase === "bidding"
                ? t("phaseBidding")
                : l.phase === "playing"
                  ? t("phasePlaying")
                  : t("phaseFinished")}
          </div>

          <div className="ddz-stats-box">
            <span className="ddz-stat-chip is-mult">
              <Flame size={13} />
              <span>
                {t("multiplierLabel")} ×{p.multiplier}
              </span>
            </span>
            {p.bombCount > 0 && (
              <span className="ddz-stat-chip is-bomb">
                <span>
                  {t("bombCountLabel")} {p.bombCount}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Upper Arena: West Seat (Left) + Center Felt + East Seat (Right) */}
        <div className="ddz-upper-arena">
          {renderSideSeat(leftSeat, "left")}

          <div className="ddz-center-stage">
            {l.phase === "lobby" ? (
              <div className="ddz-lobby-welcome">
                <Crown size={36} className="ddz-welcome-icon" />
                <h2>{t("appTitle")}</h2>
                <p>{t("pickerSubtitle")}</p>
                <button
                  type="button"
                  className="ddz-btn is-primary"
                  onClick={openPickerModal}
                >
                  <Play size={15} />
                  <span>{t("startMatch")}</span>
                </button>
              </div>
            ) : l.phase === "finished" && p.winner ? (
              <div className="ddz-result-banner">
                <Crown size={32} className="ddz-winner-crown" />
                <h3>
                  {p.winner === "Landlord"
                    ? t("winnerLandlord")
                    : t("winnerPeasant")}
                </h3>
                <div className="ddz-result-tags">
                  <span className="ddz-stat-chip is-mult">
                    {t("multiplierLabel")} ×{p.multiplier}
                  </span>
                  {p.spring === "spring" && (
                    <span className="ddz-stat-chip is-bomb">
                      {t("springBadge")}
                    </span>
                  )}
                  {p.spring === "anti_spring" && (
                    <span className="ddz-stat-chip is-bomb">
                      {t("antiSpringBadge")}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="ddz-center-trick">
                {p.currentPlay ? (
                  <div className="ddz-active-play-box">
                    <span className="ddz-active-play-owner">
                      {seatLabel(p.currentPlay.seat)} ·{" "}
                      {comboLabel(
                        p.currentPlay.combo.type,
                        p.currentPlay.combo.mainRank,
                      )}
                    </span>
                    <div className="ddz-played-cards">
                      {p.currentPlay.cards.map((c) => (
                        <PokerCardView key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ddz-center-watermark">
                    {l.phase === "bidding"
                      ? p.bidding.calledBy
                        ? t("actRob")
                        : t("actCall")
                      : t("phasePlaying")}
                  </div>
                )}
              </div>
            )}
          </div>

          {renderSideSeat(rightSeat, "right")}
        </div>

        {/* Bottom Main Seat */}
        {l.phase !== "lobby" && (
          <section
            className={`ddz-bottom-seat ${
              p.turn === bottomSeat && !p.winner ? "is-turn" : ""
            }`}
          >
            {/* Bottom Seat Action Spot (just above hand) */}
            <div className="ddz-bottom-action-spot">
              {renderActionSpot(bottomSeat)}
            </div>

            {/* Human Interactive Action Bar */}
            {myTurn && (
              <div className="ddz-human-toolbar">
                {l.phase === "bidding" ? (
                  <div className="ddz-action-buttons">
                    {!p.bidding.calledBy ? (
                      <>
                        <button
                          type="button"
                          className="ddz-btn is-gold"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await pudding.interaction.handle((c) =>
                                callLandlord(
                                  {
                                    decision: "call",
                                    comment: draftComment.trim() || undefined,
                                  },
                                  c,
                                ),
                              );
                              setDraftComment("");
                            })
                          }
                        >
                          <Crown size={15} />
                          <span>{t("actCall")}</span>
                        </button>
                        <button
                          type="button"
                          className="ddz-btn"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await pudding.interaction.handle((c) =>
                                callLandlord(
                                  {
                                    decision: "pass",
                                    comment: draftComment.trim() || undefined,
                                  },
                                  c,
                                ),
                              );
                              setDraftComment("");
                            })
                          }
                        >
                          <span>{t("actNoCall")}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ddz-btn is-gold"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await pudding.interaction.handle((c) =>
                                callLandlord(
                                  {
                                    decision: "rob",
                                    comment: draftComment.trim() || undefined,
                                  },
                                  c,
                                ),
                              );
                              setDraftComment("");
                            })
                          }
                        >
                          <Flame size={15} />
                          <span>{t("actRob")}</span>
                        </button>
                        <button
                          type="button"
                          className="ddz-btn"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              await pudding.interaction.handle((c) =>
                                callLandlord(
                                  {
                                    decision: "pass",
                                    comment: draftComment.trim() || undefined,
                                  },
                                  c,
                                ),
                              );
                              setDraftComment("");
                            })
                          }
                        >
                          <span>{t("actNoRob")}</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="ddz-action-buttons">
                    {canHumanPass && (
                      <button
                        type="button"
                        className="ddz-btn"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await pudding.interaction.handle((c) =>
                              passTurn(
                                {
                                  comment: draftComment.trim() || undefined,
                                },
                                c,
                              ),
                            );
                            setDraftComment("");
                          })
                        }
                      >
                        <span>{t("actPass")}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="ddz-btn"
                      disabled={busy || legalPlaysForBottom.length === 0}
                      onClick={cycleHint}
                    >
                      <Lightbulb size={14} />
                      <span>{t("actHint")}</span>
                    </button>

                    {selectedCardIds.length > 0 && (
                      <button
                        type="button"
                        className="ddz-btn"
                        disabled={busy}
                        onClick={() => setSelectedCardIds([])}
                      >
                        <span>{t("actClear")}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="ddz-btn is-gold"
                      disabled={busy || !isSelectionPlayable}
                      onClick={() =>
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
                        })
                      }
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
                  </div>
                )}

                <input
                  type="text"
                  className="ddz-comment-input"
                  placeholder={t("commentPlaceholder")}
                  maxLength={40}
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                />
              </div>
            )}

            {/* Bottom Seat Header Info */}
            <div className="ddz-bottom-bar">
              <div className="ddz-bottom-identity">
                <span className="ddz-seat-pos">{seatLabel(bottomSeat)}</span>
                {renderRoleBadge(bottomSeat)}
                <strong className="ddz-seat-name">
                  {getPlayerInfo(bottomSeat).name}
                </strong>
                <span className="ddz-count-pill">
                  {t("cardsLeft", { count: bottomHand.length })}
                </span>
                {danmaku && p.comments[bottomSeat]?.text && (
                  <span className="ddz-inline-speech">
                    “{p.comments[bottomSeat]!.text}”
                  </span>
                )}
              </div>

              {humanSeat && l.phase !== "finished" && (
                <button
                  type="button"
                  className="ddz-btn ddz-btn-sm"
                  onClick={() => setManualPeek(!manualPeek)}
                >
                  {showBottomHandFaceUp ? (
                    <>
                      <EyeOff size={13} />
                      <span>{t("hideHandBtn")}</span>
                    </>
                  ) : (
                    <>
                      <Eye size={13} />
                      <span>{t("revealHandBtn")}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Bottom Hand Fan (Strict anti-peek when not human's turn unless revealed) */}
            {showBottomHandFaceUp ? (
              <div className="ddz-hand-fan">
                {bottomHand.map((card) => (
                  <PokerCardView
                    key={card.id}
                    card={card}
                    selected={selectedCardIds.includes(card.id)}
                    onClick={
                      myTurn && l.phase === "playing"
                        ? () => toggleCardSelection(card.id)
                        : undefined
                    }
                    disabled={busy}
                  />
                ))}
              </div>
            ) : (
              <div className="ddz-hand-hidden-box">
                <div className="ddz-card-back-fan" aria-hidden="true">
                  {Array.from({ length: Math.min(bottomHand.length, 10) }).map(
                    (_, idx) => (
                      <div key={idx} className="ddz-card-back-hole" />
                    ),
                  )}
                </div>
                <span className="ddz-hidden-text">
                  {humanSeat ? t("handHiddenHint") : t("spectatorHiddenHint")}
                </span>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Seat Configuration Modal */}
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
                <select
                  className="ddz-slot-select"
                  value={pickerSlots[s]}
                  onChange={(e) =>
                    setPickerSlots((prev) => ({
                      ...prev,
                      [s]: e.target.value,
                    }))
                  }
                >
                  <option value="@me">{t("playerYou")}</option>
                  <option value="@bot">
                    {t("playerBot")} ({botNameForSeat(s)})
                  </option>
                  {sessionList.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.name}
                      {sess.model?.name ? ` (${sess.model.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {hasConflict && (
            <div className="ddz-slot-alert">{t("seatConflictError")}</div>
          )}

          <div className="ddz-modal-actions">
            <button
              type="button"
              className="ddz-btn"
              disabled={busy}
              onClick={() => setPicker(false)}
            >
              {t("pickerCancel")}
            </button>
            <button
              type="button"
              className="ddz-btn is-primary"
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
