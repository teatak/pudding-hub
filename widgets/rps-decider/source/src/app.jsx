import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import './i18n.js';

const I18N = window.RPS_DECIDER_I18N || {};
const gestures = ["rock", "paper", "scissors"];
const emojiMap = { rock: "✊", paper: "🖐️", scissors: "✌️" };
const slotColors = { top: "yellow", bottom: "blue" };
const slotOrder = ["top", "bottom"];

let currentLocale = "zh-CN";
let latestState = null;
let savedCustomTopic = "";
let updateAppInstance = null;
let leaderboardStatsGlobal = {};

function normalizeLocale(value) {
  return value === "zh-CN" || value === "zh-TW" || value === "en" ? value : "zh-CN";
}

function t(locale, key, params) {
  const dict = I18N[locale] || I18N["zh-CN"] || {};
  const fallback = I18N["zh-CN"] || {};
  let text = dict[key] || fallback[key] || key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeChoice(value) {
  return gestures.includes(value) ? value : "";
}

function choice_label(locale, choice) {
  return `${emojiMap[choice] || "?"} ${t(locale, choice)}`;
}

function validGestures(locale) {
  return gestures.map((gesture) => ({
    gesture,
    gesture_label: choice_label(locale, gesture),
  }));
}

function titleForActor(locale, actor) {
  if (!actor || actor.role === "human") return t(locale, "user");
  return actor.name || t(locale, "ai");
}

function participantID(actor) {
  const role = actor && actor.role === "assistant" ? "assistant" : "human";
  const session_id = actor && typeof actor.session_id === "string" && actor.session_id.trim()
    ? actor.session_id.trim()
    : "local";
  return `${role}:${session_id}`;
}

function playerFromActor(locale, actor, slot) {
  const role = actor && actor.role === "assistant" ? "assistant" : "human";
  const session_id = actor && typeof actor.session_id === "string" ? actor.session_id.trim() : "";
  return {
    id: participantID(actor),
    session_id,
    role,
    title: titleForActor(locale, actor),
    slot,
    color: slotColors[slot],
    choice: null,
    result: null,
  };
}

function emptyState(locale) {
  return {
    status: "waiting",
    locale,
    topic: savedCustomTopic || t(locale, "defaultTopic"),
    players: [],
    result_summary: null,
  };
}

function normalizeState(raw, locale) {
  const base = emptyState(locale);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const state = Object.assign(base, clone(raw));
  state.status = typeof state.status === "string" && state.status ? state.status : "waiting";
  state.locale = normalizeLocale(state.locale || locale);
  state.topic = typeof state.topic === "string" && state.topic ? state.topic : (savedCustomTopic || t(state.locale, "defaultTopic"));
  state.players = Array.isArray(state.players) ? state.players : [];
  state.result_summary = state.result_summary && typeof state.result_summary === "object" ? state.result_summary : null;
  return state;
}

function nextOpenSlot(players) {
  const occupied = new Set((players || []).map((player) => player.slot));
  return slotOrder.find((slot) => !occupied.has(slot)) || "";
}

function participantByID(players, id) {
  return (players || []).find((player) => player && player.id === id) || null;
}

function sortedPlayers(players) {
  return slotOrder
    .map((slot) => (players || []).find((player) => player && player.slot === slot))
    .filter(Boolean);
}

function bothPlayersReady(players) {
  const ordered = sortedPlayers(players);
  return ordered.length === 2 && ordered.every((player) => normalizeChoice(player.choice));
}

function resultForChoices(a, b) {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "win";
  }
  return "lose";
}

function requestForOpenRound(locale, state, isNextRound) {
  return {
    type: "request_gesture",
    to: "visible",
    data: {
      locale,
      topic: state.topic,
      participants: "anonymous_until_choose",
      valid_gestures: validGestures(locale),
      next_action: "choose_gesture",
      action_example: {
        type: "choose_gesture",
        gesture: "rock",
      },
      instruction: t(locale, isNextRound ? "requestInstructionNext" : "requestInstructionStart", {
        topic: state.topic,
      }),
    },
  };
}

function announceForPlayer(locale, player, state) {
  const opponent = sortedPlayers(state.players).find((item) => item.id !== player.id) || null;
  const resultSummary = state.result_summary || { outcome: "draw", winner_title: t(locale, "none"), loser_title: t(locale, "none") };
  return {
    type: "announce_winner",
    to: { sessions: [player.session_id] },
    data: {
      locale,
      topic: state.topic,
      self_result: player.result || "draw",
      self: {
        title: player.title,
        gesture: player.choice,
        gesture_label: choice_label(locale, player.choice),
      },
      opponent: opponent ? {
        title: opponent.title,
        gesture: opponent.choice,
        gesture_label: choice_label(locale, opponent.choice),
        result: opponent.result || "draw",
      } : null,
      match_result: resultSummary,
      next_action: "announce_only",
      instruction: t(locale, "announceInstruction", {
        topic: state.topic,
        selfTitle: player.title,
        selfGesture: choice_label(locale, player.choice),
        opponentTitle: opponent ? opponent.title : t(locale, "none"),
        opponentGesture: opponent ? choice_label(locale, opponent.choice) : t(locale, "none"),
        winner_title: resultSummary.winner_title || t(locale, "none"),
        loser_title: resultSummary.loser_title || t(locale, "none"),
        self_result: t(locale, player.result || "draw"),
      }),
    },
  };
}

function announcementsForAssistants(locale, state) {
  return sortedPlayers(state.players)
    .filter((player) => player.role === "assistant" && player.session_id)
    .map((player) => announceForPlayer(locale, player, state));
}

function normalizeLeaderboard(value) {
  try {
    const parsed = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

function ensureLeaderboardEntry(locale, title) {
  const key = String(title || t(locale, "unknownPlayer")).trim() || t(locale, "unknownPlayer");
  const entry = leaderboardStatsGlobal[key];
  if (!entry || typeof entry !== "object") {
    leaderboardStatsGlobal[key] = { win: 0, lose: 0, draw: 0, total: 0 };
  }
  return leaderboardStatsGlobal[key];
}

async function recordLeaderboard(locale, players) {
  leaderboardStatsGlobal = normalizeLeaderboard(leaderboardStatsGlobal);
  for (const player of players || []) {
    const entry = ensureLeaderboardEntry(locale, player.title);
    if (player.result === "win") entry.win += 1;
    else if (player.result === "lose") entry.lose += 1;
    else entry.draw += 1;
    entry.total += 1;
  }
  try {
    if (window.pudding && typeof window.pudding.setData === "function") {
      await window.pudding.setData("leaderboard", leaderboardStatsGlobal);
    }
  } catch (err) {}
  updateAppInstance?.();
}

// Global action handlers
function startTopic(action, context) {
  const topic = typeof action.topic === "string" ? action.topic.trim() : "";
  if (!topic) return { ok: false, error: "topic is required" };
  const state = emptyState(currentLocale);
  state.status = "waiting";
  state.topic = topic;
  state.players = [];
  savedCustomTopic = topic;
  try {
    if (window.pudding && typeof window.pudding.setData === "function") {
      window.pudding.setData("custom_topic", topic);
    }
  } catch (err) {}
  return { ok: true, state };
}

function chooseGesture(action, context) {
  const gesture = normalizeChoice(action.gesture || action.choice);
  if (!gesture) return { ok: false, error: "gesture must be rock, paper, or scissors" };

  const state = normalizeState(window.pudding.getState(), currentLocale);
  if (state.status !== "waiting") return { ok: true, state };
  const actor = context && context.actor ? context.actor : { role: "human" };
  const id = participantID(actor);
  let players = Array.isArray(state.players) ? state.players : [];
  let player = participantByID(players, id);

  if (!player) {
    const slot = nextOpenSlot(players);
    if (!slot) return { ok: true, state };
    player = playerFromActor(currentLocale, actor, slot);
    players = [...players, player];
  }

  state.players = players.map((item) =>
    item.id === player.id
      ? { ...item, title: titleForActor(currentLocale, actor), choice: gesture, result: null }
      : item
  );
  state.result_summary = null;
  return { ok: true, state };
}

async function revealResult() {
  const state = normalizeState(window.pudding.getState(), currentLocale);
  if (state.status !== "waiting" || !bothPlayersReady(state.players)) {
    return { ok: true, state };
  }

  const players = sortedPlayers(state.players);
  const top = players.find((player) => player.slot === "top");
  const bottom = players.find((player) => player.slot === "bottom");
  const topVsBottom = resultForChoices(top.choice, bottom.choice);
  const bottomResult = topVsBottom === "draw" ? "draw" : (topVsBottom === "win" ? "lose" : "win");
  const nextPlayers = players.map((player) => {
    if (player.id === top.id) return { ...player, result: topVsBottom };
    if (player.id === bottom.id) return { ...player, result: bottomResult };
    return player;
  });
  const winner = nextPlayers.find((player) => player.result === "win") || null;
  const loser = nextPlayers.find((player) => player.result === "lose") || null;
  state.status = "resolved";
  state.players = nextPlayers;
  state.result_summary = {
    outcome: winner ? "decided" : "draw",
    winner_title: winner ? winner.title : t(currentLocale, "none"),
    loser_title: loser ? loser.title : t(currentLocale, "none"),
  };
  await recordLeaderboard(currentLocale, nextPlayers);

  const send = announcementsForAssistants(currentLocale, state);
  return { ok: true, state, ...(send.length ? { send } : {}) };
}

function reset(action, context) {
  const state = normalizeState(window.pudding.getState(), currentLocale);
  if (action.reset_topic) {
    savedCustomTopic = "";
    try {
      if (window.pudding && typeof window.pudding.setData === "function") {
        window.pudding.setData("custom_topic", "");
      }
    } catch (err) {}
    return { ok: true, state: emptyState(currentLocale) };
  }

  state.status = "waiting";
  state.locale = currentLocale;
  state.players = [];
  state.result_summary = null;
  return { ok: true, state, send: requestForOpenRound(currentLocale, state, true) };
}

// Preact Root Component
function App() {
  const [state, setState] = useState(() => emptyState(currentLocale));
  const [locale, setLocale] = useState(currentLocale);
  const [themeMode, setThemeMode] = useState("dark");
  
  useEffect(() => {
    document.documentElement.dataset.puddingTheme = themeMode;
  }, [themeMode]);
  
  const topPlayer = (state.players || []).find(p => p && p.slot === "top") || null;
  const bottomPlayer = (state.players || []).find(p => p && p.slot === "bottom") || null;
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [nextRoundRevealLocked, setNextRoundRevealLocked] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [conflictInputVal, setConflictInputVal] = useState("");
  const [leverPulled, setLeverPulled] = useState(false);
  const [leaderboardStats, setLeaderboardStats] = useState({});
  const [nextRoundClickLocked, setNextRoundClickLocked] = useState(false);

  const countdownTimerRef = useRef(null);
  const prevRevealKeyRef = useRef("");

  const loadLeaderboardData = async () => {
    try {
      if (!window.pudding || typeof window.pudding.getData !== "function") return;
      const parsed = await window.pudding.getData("leaderboard");
      const stats = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      leaderboardStatsGlobal = stats;
      setLeaderboardStats(stats);
    } catch (err) {
      setLeaderboardStats({});
    }
  };

  const loadTopicData = async () => {
    try {
      if (!window.pudding || typeof window.pudding.getData !== "function") return;
      const saved = await window.pudding.getData("custom_topic");
      if (typeof saved === "string" && saved.trim()) {
        savedCustomTopic = saved.trim();
        setState(prev => {
          if (prev.topic === t(locale, "defaultTopic")) {
            return { ...prev, topic: savedCustomTopic };
          }
          return prev;
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    updateAppInstance = () => {
      loadLeaderboardData();
    };

    setState(normalizeState(window.pudding.getState(), currentLocale));
    const handleState = (next) => {
      const norm = normalizeState(next, currentLocale);
      setState(norm);
    };
    window.pudding.onState(handleState);

    const handleTheme = (theme) => {
      setThemeMode(theme && theme.mode === "light" ? "light" : "dark");
    };
    window.pudding.onTheme(handleTheme);
    setThemeMode(window.pudding.theme && window.pudding.theme.mode === "light" ? "light" : "dark");

    const handleLocale = (nextLoc) => {
      const val = normalizeLocale(nextLoc && typeof nextLoc === "object" ? nextLoc.locale : nextLoc);
      currentLocale = val;
      setLocale(val);
    };
    window.pudding.onLocale(handleLocale);
    const initialLoc = normalizeLocale(window.pudding.locale);
    currentLocale = initialLoc;
    setLocale(initialLoc);

    loadLeaderboardData();
    loadTopicData();

    return () => {
      updateAppInstance = null;
    };
  }, []);

  const isReadyToStart = state.status === "waiting" && bothPlayersReady(state.players);
  useEffect(() => {
    if (isReadyToStart) {
      if (isCountingDown) return;
      setIsCountingDown(true);
      setCountdownVal(3);
      
      let val = 3;
      countdownTimerRef.current = setInterval(() => {
        val -= 1;
        if (val >= 1) {
          setCountdownVal(val);
        } else {
          clearInterval(countdownTimerRef.current);
          setIsCountingDown(false);
          setLeverPulled(true);
          setTimeout(() => {
            setLeverPulled(false);
            window.pudding.dispatch({ type: "reveal_result" });
          }, 450);
        }
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      setIsCountingDown(false);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isReadyToStart]);

  const revealKey = sortedPlayers(state.players)
    .map((player) => `${player.id}:${player.choice}:${player.result}`)
    .join("|");

  useEffect(() => {
    if (state.status === "resolved") {
      if (prevRevealKeyRef.current !== revealKey) {
        prevRevealKeyRef.current = revealKey;
        setNextRoundRevealLocked(true);
        const timer = setTimeout(() => {
          setNextRoundRevealLocked(false);
        }, 760);
        return () => clearTimeout(timer);
      }
    } else {
      setNextRoundRevealLocked(false);
      prevRevealKeyRef.current = "";
    }
  }, [state.status, revealKey]);

  const handleChooseGesture = (gesture) => {
    window.pudding.dispatch({ type: "choose_gesture", gesture });
  };

  const handleNextRound = () => {
    if (nextRoundClickLocked) return;
    setNextRoundClickLocked(true);
    setLeverPulled(true);
    setTimeout(() => {
      setLeverPulled(false);
      window.pudding.dispatch({ type: "reset", reset_topic: false });
    }, 450);
    setTimeout(() => {
      setNextRoundClickLocked(false);
    }, 800);
  };

  const handleSaveConflict = () => {
    const topic = conflictInputVal.trim();
    if (!topic) return;
    window.pudding.dispatch({ type: "start_topic", topic });
    setConflictVisible(false);
  };

  const humanPlayer = (state.players || []).find((player) => player.role === "human");
  const seatsFull = sortedPlayers(state.players).length >= 2;

  const topPlayerReady = topPlayer && normalizeChoice(topPlayer.choice);
  const bottomPlayerReady = bottomPlayer && normalizeChoice(bottomPlayer.choice);
  const topPlayerWinner = topPlayer && topPlayer.result === "win";
  const bottomPlayerWinner = bottomPlayer && bottomPlayer.result === "win";

  const leaderboardRowsVal = Object.entries(leaderboardStats)
    .map(([name, entry]) => {
      const win = Number(entry && entry.win) || 0;
      const lose = Number(entry && entry.lose) || 0;
      const draw = Number(entry && entry.draw) || 0;
      const total = Number(entry && entry.total) || win + lose + draw;
      const winRate = total > 0 ? win / total : 0;
      return { name, win, lose, draw, total, winRate };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => {
      if (b.win !== a.win) return b.win - a.win;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

  const translate = (key, params) => t(locale, key, params);

  const countdownOverlay = isCountingDown ? (
    <div class="countdown-overlay" style="display: flex;">
      <span class="countdown-num">{countdownVal}</span>
    </div>
  ) : null;

  const leaderboardTableBody = leaderboardRowsVal.length === 0 ? (
    <tr>
      <td colspan={7} style="text-align: center; padding: 24px 0; color: var(--surface-muted-fg);">
        {translate("emptyLeaderboard")}
      </td>
    </tr>
  ) : leaderboardRowsVal.map((item, idx) => (
    <tr key={item.name}>
      <td>
        <span class={`rank-badge ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
          {idx + 1}
        </span>
      </td>
      <td class="leaderboard-name" title={item.name}>{item.name}</td>
      <td>{item.total}</td>
      <td class="stat-win">{item.win}</td>
      <td class="stat-lose">{item.lose}</td>
      <td class="stat-draw">{item.draw}</td>
      <td class="stat-rate">{Math.round(item.winRate * 100)}%</td>
    </tr>
  ));

  const leaderboardModal = leaderboardVisible ? (
    <div class="modal-overlay show" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setLeaderboardVisible(false); }}>
      <div class="modal-content" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">{translate("leaderboardTitle")}</span>
          <button class="modal-close" aria-label={translate("close")} onClick={() => setLeaderboardVisible(false)}>×</button>
        </div>
        <div class="leaderboard-table-container">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>{translate("rank")}</th>
                <th>{translate("player")}</th>
                <th>{translate("total")}</th>
                <th>{translate("win")}</th>
                <th>{translate("lose")}</th>
                <th>{translate("draw")}</th>
                <th>{translate("winRate")}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardTableBody}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;

  const conflictModal = conflictVisible ? (
    <div class="modal-overlay show" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setConflictVisible(false); }}>
      <div class="modal-content" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">{translate("editTopic")}</span>
          <button class="modal-close" aria-label={translate("close")} onClick={() => setConflictVisible(false)}>×</button>
        </div>
        <div class="init-form" style="display: flex; width: 100%;">
          <textarea class="init-textarea" placeholder={translate("inputPlaceholder")} maxLength={2000} value={conflictInputVal} onInput={(e) => setConflictInputVal(e.target.value)}></textarea>
          <button class="btn-brass" onClick={handleSaveConflict}>{translate("start")}</button>
        </div>
      </div>
    </div>
  ) : null;

  try {
    return (
      <div class="machine-container" data-pudding-theme={themeMode}>
        <div class="header">
          <div class="conflict-header">
            <span class="conflict-title" id="ticker-text" title={translate("topicLabel", { topic: state.topic })}>
              {translate("topicLabel", { topic: state.topic })}
            </span>
            <button class="btn-header-reset" id="btn-change-conflict" title={translate("editTopic")} aria-label={translate("editTopic")} onClick={() => { setConflictInputVal(state.topic); setConflictVisible(true); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
          <button class="btn-header-icon" id="btn-leaderboard" title={translate("leaderboard")} aria-label={translate("leaderboard")} onClick={() => setLeaderboardVisible(true)}>🏆</button>
        </div>

        <div class={`lever-rail ${leverPulled ? 'pulled' : ''}`} id="lever-rail">
          <div class="lever-handle" id="lever-handle"></div>
        </div>

        <div id="match-view" class="match-panel" style="display: flex;">
          <div class="duel-layout">
            <div class="arena">
              <div class="arena-content">
                <span class={`chamber-label label-top-outer ${topPlayerReady ? 'ready' : ''} ${topPlayerWinner ? 'winner-glow' : ''}`}>
                  {topPlayer ? topPlayer.title : translate("waitingPlayer")}
                </span>

                <div class={`cylinder ${state.status === 'resolved' ? 'revealed' : ''} ${topPlayerWinner ? 'win-top' : ''} ${bottomPlayerWinner ? 'win-bottom' : ''}`}>
                  <div class="cylinder-glass-glare"></div>

                  <div class="chamber chamber-top">
                    <div class="shutter shutter-top" style={{ height: state.status === 'resolved' ? '0%' : '100%' }}>
                      <div class={`shutter-indicator ${topPlayerReady ? 'ready' : ''}`}></div>
                    </div>
                    <span class="gesture-display">
                      {state.status === 'resolved' && topPlayer ? emojiMap[topPlayer.choice] : ''}
                    </span>
                  </div>

                  <div class="chamber chamber-bottom">
                    <div class="shutter shutter-bottom" style={{ height: state.status === 'resolved' ? '0%' : '100%' }}>
                      <div class={`shutter-indicator ${bottomPlayerReady ? 'ready' : ''}`}></div>
                    </div>
                    <span class="gesture-display">
                      {state.status === 'resolved' && bottomPlayer ? emojiMap[bottomPlayer.choice] : ''}
                    </span>
                  </div>

                  {countdownOverlay}
                </div>

                <span class={`chamber-label label-bottom-outer ${bottomPlayerReady ? 'ready' : ''} ${bottomPlayerWinner ? 'winner-glow' : ''}`}>
                  {bottomPlayer ? bottomPlayer.title : translate("waitingPlayer")}
                </span>

                <div class="button-group">
                  {gestures.map(gesture => {
                    const hasChosen = humanPlayer && humanPlayer.choice;
                    const isChoiceDisabled = isCountingDown || hasChosen || (seatsFull && !humanPlayer);
                    return (
                      <button
                        key={gesture}
                        class="btn-gesture"
                        disabled={isChoiceDisabled}
                        onClick={() => handleChooseGesture(gesture)}
                        title={translate(gesture)}
                        aria-label={translate(gesture)}
                      >
                        {emojiMap[gesture]}
                      </button>
                    );
                  })}
                </div>

                <button
                  class="btn-next-round"
                  disabled={nextRoundRevealLocked || isCountingDown || nextRoundClickLocked}
                  onClick={handleNextRound}
                >
                  {translate("invitePlayers")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {leaderboardModal}
        {conflictModal}
      </div>
    );
  } catch (err) {
    console.error("App render exception:", err);
    return <pre style="color: red; padding: 20px; font-size: 14px; word-break: break-all; white-space: pre-wrap; background: #111;">App Render Error:\n{err.stack || err.message || err}</pre>;
  }
}

try {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Could not find #app element in DOM");
  }
  render(<App />, container);
} catch (err) {
  const container = document.getElementById("app");
  if (container) {
    container.innerHTML = `<pre style="color: red; padding: 20px; font-size: 14px; word-break: break-all; white-space: pre-wrap; background: #111;">Render Error:\n${err.stack || err.message || err}</pre>`;
  }
  console.error("Render Error:", err);
}

window.pudding.onAction(function(action, context) {
  if (!action || typeof action !== "object") return { ok: false, error: "action must be an object" };
  if (action.type === "start_topic") return startTopic(action, context || {});
  if (action.type === "choose_gesture") return chooseGesture(action, context || {});
  if (action.type === "reveal_result") return revealResult();
  if (action.type === "reset") return reset(action, context || {});
  return { ok: false, error: `unsupported action type: ${action.type}` };
});
