(function() {
  const I18N = window.RPS_DECIDER_I18N || {};
  const gestures = ["rock", "paper", "scissors"];
  const emojiMap = { rock: "✊", paper: "🖐️", scissors: "✌️" };
  const slotColors = { top: "yellow", bottom: "blue" };
  const slotOrder = ["top", "bottom"];

  let currentLocale = "zh-CN";
  let latestState = null;
  let isCountingDown = false;
  let nextRoundLockedUntil = 0;
  let nextRoundRevealTimer = null;
  let nextRoundRevealKey = "";

  const initView = document.getElementById("init-view");
  const matchView = document.getElementById("match-view");
  const conflictInput = document.getElementById("conflict-input");
  const btnStartArbitrate = document.getElementById("btn-start-arbitrate");
  const tickerText = document.getElementById("ticker-text");
  const cylinderBody = document.getElementById("cylinder-body");
  const displayTop = document.getElementById("display-top");
  const displayBottom = document.getElementById("display-bottom");
  const labelTop = document.getElementById("label-top");
  const labelBottom = document.getElementById("label-bottom");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownText = document.getElementById("countdown-text");
  const gestureButtons = document.getElementById("gesture-buttons");
  const btnNextRound = document.getElementById("btn-next-round");
  const btnChangeConflict = document.getElementById("btn-change-conflict");
  const leverRail = document.getElementById("lever-rail");
  const btnLeaderboard = document.getElementById("btn-leaderboard");
  const leaderboardModal = document.getElementById("leaderboard-modal");
  const leaderboardClose = document.getElementById("leaderboard-close");
  const leaderboardBody = document.getElementById("leaderboard-body");
  const leaderboardTitle = document.getElementById("leaderboard-title");
  const rankHead = document.getElementById("rank-head");
  const playerHead = document.getElementById("player-head");
  const totalHead = document.getElementById("total-head");
  const winHead = document.getElementById("win-head");
  const loseHead = document.getElementById("lose-head");
  const drawHead = document.getElementById("draw-head");
  const rateHead = document.getElementById("rate-head");
  const leaderboardDataKey = "leaderboard";
  let leaderboardStats = {};

  function normalizeLocale(value) {
    return value === "zh-CN" || value === "zh-TW" || value === "en" ? value : "zh-CN";
  }

  function t(key, params) {
    const dict = I18N[currentLocale] || I18N["zh-CN"] || {};
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

  function choice_label(choice) {
    return `${emojiMap[choice] || "?"} ${t(choice)}`;
  }

  function validGestures() {
    return gestures.map((gesture) => ({
      gesture,
      gesture_label: choice_label(gesture),
    }));
  }

  function titleForActor(actor) {
    if (!actor || actor.role === "human") return t("user");
    return actor.name || t("ai");
  }

  function participantID(actor) {
    const role = actor && actor.role === "assistant" ? "assistant" : "human";
    const session_id = actor && typeof actor.session_id === "string" && actor.session_id.trim()
      ? actor.session_id.trim()
      : "local";
    return `${role}:${session_id}`;
  }

  function playerFromActor(actor, slot) {
    const role = actor && actor.role === "assistant" ? "assistant" : "human";
    const session_id = actor && typeof actor.session_id === "string" ? actor.session_id.trim() : "";
    return {
      id: participantID(actor),
      session_id,
      role,
      title: titleForActor(actor),
      slot,
      color: slotColors[slot],
      choice: null,
      result: null,
    };
  }

  function emptyState(locale) {
    return {
      status: "init",
      locale,
      topic: null,
      players: [],
      result_summary: null,
    };
  }

  function normalizeState(raw) {
    const base = emptyState(currentLocale);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    const state = Object.assign(base, clone(raw));
    state.status = typeof state.status === "string" && state.status ? state.status : "init";
    state.locale = normalizeLocale(state.locale || currentLocale);
    state.topic = typeof state.topic === "string" ? state.topic : null;
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

  function requestForOpenRound(state, isNextRound) {
    return {
      type: "request_gesture",
      to: "visible",
      data: {
        locale: currentLocale,
        topic: state.topic,
        participants: "anonymous_until_choose",
        valid_gestures: validGestures(),
        next_action: "choose_gesture",
        action_example: {
          type: "choose_gesture",
          gesture: "rock",
        },
        instruction: t(isNextRound ? "requestInstructionNext" : "requestInstructionStart", {
          topic: state.topic,
        }),
      },
    };
  }

  function announceForPlayer(player, state) {
    const opponent = sortedPlayers(state.players).find((item) => item.id !== player.id) || null;
    const resultSummary = state.result_summary || { outcome: "draw", winner_title: t("none"), loser_title: t("none") };
    return {
      type: "announce_winner",
      to: { sessions: [player.session_id] },
      data: {
        locale: currentLocale,
        topic: state.topic,
        self_result: player.result || "draw",
        self: {
          title: player.title,
          gesture: player.choice,
          gesture_label: choice_label(player.choice),
        },
        opponent: opponent ? {
          title: opponent.title,
          gesture: opponent.choice,
          gesture_label: choice_label(opponent.choice),
          result: opponent.result || "draw",
        } : null,
        match_result: resultSummary,
        next_action: "announce_only",
        instruction: t("announceInstruction", {
          topic: state.topic,
          selfTitle: player.title,
          selfGesture: choice_label(player.choice),
          opponentTitle: opponent ? opponent.title : t("none"),
          opponentGesture: opponent ? choice_label(opponent.choice) : t("none"),
          winner_title: resultSummary.winner_title || t("none"),
          loser_title: resultSummary.loser_title || t("none"),
          self_result: t(player.result || "draw"),
        }),
      },
    };
  }

  function announcementsForAssistants(state) {
    return sortedPlayers(state.players)
      .filter((player) => player.role === "assistant" && player.session_id)
      .map((player) => announceForPlayer(player, state));
  }

  async function loadLeaderboardData() {
    try {
      if (!window.pudding || typeof window.pudding.getData !== "function") return;
      const parsed = await window.pudding.getData(leaderboardDataKey);
      leaderboardStats = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      renderLeaderboard();
    } catch (err) {
      leaderboardStats = {};
    }
  }

  async function saveLeaderboard() {
    try {
      if (!window.pudding || typeof window.pudding.setData !== "function") return;
      await window.pudding.setData(leaderboardDataKey, leaderboardStats);
    } catch (err) {
      // Ranking persistence should not affect the match.
    }
  }

  function normalizeLeaderboard(value) {
    try {
      const parsed = value && typeof value === "object" && !Array.isArray(value) ? value : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function ensureLeaderboardEntry(title) {
    const key = String(title || t("unknownPlayer")).trim() || t("unknownPlayer");
    const entry = leaderboardStats[key];
    if (!entry || typeof entry !== "object") {
      leaderboardStats[key] = { win: 0, lose: 0, draw: 0, total: 0 };
    }
    return leaderboardStats[key];
  }

  async function recordLeaderboard(players) {
    leaderboardStats = normalizeLeaderboard(leaderboardStats);
    for (const player of players || []) {
      const entry = ensureLeaderboardEntry(player.title);
      if (player.result === "win") entry.win += 1;
      else if (player.result === "lose") entry.lose += 1;
      else entry.draw += 1;
      entry.total += 1;
    }
    await saveLeaderboard();
    renderLeaderboard();
  }

  function leaderboardRows() {
    return Object.entries(leaderboardStats)
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
  }

  function appendCell(row, text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function renderLeaderboard() {
    if (!leaderboardBody) return;
    leaderboardBody.innerHTML = "";
    const rows = leaderboardRows();
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = t("emptyLeaderboard");
      td.style.textAlign = "center";
      td.style.padding = "24px 0";
      td.style.color = "var(--surface-muted-fg)";
      tr.appendChild(td);
      leaderboardBody.appendChild(tr);
      return;
    }

    rows.forEach((item, index) => {
      const tr = document.createElement("tr");
      const rankCell = document.createElement("td");
      const rank = document.createElement("span");
      rank.className = `rank-badge ${index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-other"}`;
      rank.textContent = String(index + 1);
      rankCell.appendChild(rank);
      tr.appendChild(rankCell);

      appendCell(tr, item.name, "leaderboard-name").title = item.name;
      appendCell(tr, String(item.total));
      appendCell(tr, String(item.win), "stat-win");
      appendCell(tr, String(item.lose), "stat-lose");
      appendCell(tr, String(item.draw), "stat-draw");
      appendCell(tr, `${Math.round(item.winRate * 100)}%`, "stat-rate");
      leaderboardBody.appendChild(tr);
    });
  }

  function applyPuddingTheme(theme) {
    document.documentElement.dataset.puddingTheme = theme && theme.mode === "light" ? "light" : "dark";
  }

  function localizeStatic() {
    btnStartArbitrate.textContent = t("start");
    conflictInput.placeholder = t("inputPlaceholder");
    btnChangeConflict.title = t("reset_topic");
    btnChangeConflict.setAttribute("aria-label", t("reset_topic"));
    btnNextRound.title = t("nextRound");
    btnNextRound.setAttribute("aria-label", t("nextRound"));
    btnLeaderboard.title = t("leaderboard");
    btnLeaderboard.setAttribute("aria-label", t("leaderboard"));
    leaderboardTitle.textContent = t("leaderboardTitle");
    leaderboardClose.setAttribute("aria-label", t("close"));
    rankHead.textContent = t("rank");
    playerHead.textContent = t("player");
    totalHead.textContent = t("total");
    winHead.textContent = t("win");
    loseHead.textContent = t("lose");
    drawHead.textContent = t("draw");
    rateHead.textContent = t("winRate");
    for (const btn of gestureButtons.querySelectorAll(".btn-gesture")) {
      const gesture = btn.dataset.choice;
      if (!gesture) continue;
      btn.title = t(gesture);
      btn.setAttribute("aria-label", t(gesture));
    }
  }

  function applyPuddingLocale(next) {
    currentLocale = normalizeLocale(next && typeof next === "object" ? next.locale : next);
    document.documentElement.lang = currentLocale;
    localizeStatic();
    renderLeaderboard();
    if (latestState) render(latestState);
  }

  function setGestureButtonsDisabled(disabled) {
    for (const btn of gestureButtons.querySelectorAll(".btn-gesture")) {
      btn.disabled = disabled;
    }
  }

  function clearNextRoundRevealDelay() {
    if (nextRoundRevealTimer) {
      clearTimeout(nextRoundRevealTimer);
      nextRoundRevealTimer = null;
    }
    nextRoundRevealKey = "";
    btnNextRound.classList.remove("fade-in");
  }

  function revealKeyForState(state) {
    return sortedPlayers(state.players)
      .map((player) => `${player.id}:${player.choice}:${player.result}`)
      .join("|");
  }

  function showNextRoundAfterReveal(state) {
    const key = revealKeyForState(state);
    if (nextRoundRevealKey === key) return;
    if (nextRoundRevealTimer) clearTimeout(nextRoundRevealTimer);
    nextRoundRevealKey = key;
    btnNextRound.style.display = "none";
    btnNextRound.classList.remove("fade-in");
    nextRoundRevealTimer = setTimeout(() => {
      nextRoundRevealTimer = null;
      if (latestState && latestState.status === "resolved" && revealKeyForState(latestState) === key) {
        btnNextRound.style.display = "flex";
        btnNextRound.classList.remove("fade-in");
        void btnNextRound.offsetWidth;
        btnNextRound.classList.add("fade-in");
      }
    }, 760);
  }

  function triggerLeverEffect(callback) {
    leverRail.classList.add("pulled");
    setTimeout(() => {
      leverRail.classList.remove("pulled");
      if (callback) callback();
    }, 450);
  }

  function runCountdownAndReveal() {
    if (isCountingDown) return;
    isCountingDown = true;
    setGestureButtonsDisabled(true);
    btnNextRound.style.display = "none";
    countdownOverlay.style.display = "flex";
    const values = ["3", "2", "1"];
    let index = 0;
    countdownText.textContent = values[index];
    const timer = setInterval(() => {
      index += 1;
      if (index < values.length) {
        countdownText.textContent = values[index];
        return;
      }
      clearInterval(timer);
      countdownOverlay.style.display = "none";
      triggerLeverEffect(() => {
        isCountingDown = false;
        window.pudding.dispatch({ type: "reveal_result" });
      });
    }, 1000);
  }

  function playerForSlot(state, slot) {
    return (state.players || []).find((player) => player && player.slot === slot) || null;
  }

  function renderLabel(label, player, fallbackKey) {
    label.textContent = player ? player.title : t(fallbackKey);
    label.classList.remove("ready", "winner-glow");
    if (player && normalizeChoice(player.choice)) label.classList.add("ready");
    if (player && player.result === "win") label.classList.add("winner-glow");
  }

  function render(state) {
    state = normalizeState(state);
    latestState = state;

    const topic = state.topic || "";
    tickerText.textContent = state.status === "init" ? t("waitingTopic") : t("topicLabel", { topic });
    tickerText.title = tickerText.textContent;
    btnChangeConflict.style.display = state.status === "init" ? "none" : "flex";

    if (state.status === "init") {
      clearNextRoundRevealDelay();
      initView.style.display = "flex";
      matchView.style.display = "none";
      labelTop.textContent = t("waitingPlayer");
      labelBottom.textContent = t("waitingPlayer");
      btnNextRound.style.display = "flex";
      return;
    }

    initView.style.display = "none";
    matchView.style.display = "flex";
    const topPlayer = playerForSlot(state, "top");
    const bottomPlayer = playerForSlot(state, "bottom");
    renderLabel(labelTop, topPlayer, "waitingPlayer");
    renderLabel(labelBottom, bottomPlayer, "waitingPlayer");

    cylinderBody.className = "cylinder";
    displayTop.textContent = "?";
    displayBottom.textContent = "?";

    if (state.status === "resolved") {
      cylinderBody.classList.add("revealed");
      if (topPlayer) displayTop.textContent = emojiMap[topPlayer.choice] || "?";
      if (bottomPlayer) displayBottom.textContent = emojiMap[bottomPlayer.choice] || "?";
      if (topPlayer && topPlayer.result === "win") cylinderBody.classList.add("win-top");
      if (bottomPlayer && bottomPlayer.result === "win") cylinderBody.classList.add("win-bottom");
      setGestureButtonsDisabled(true);
      showNextRoundAfterReveal(state);
      gestureButtons.style.display = "flex";
      return;
    }

    clearNextRoundRevealDelay();
    const humanPlayer = (state.players || []).find((player) => player.role === "human");
    const seatsFull = sortedPlayers(state.players).length >= 2;
    setGestureButtonsDisabled(Boolean(humanPlayer && humanPlayer.choice) || (seatsFull && !humanPlayer));
    btnNextRound.style.display = "flex";
    gestureButtons.style.display = "flex";

    if (state.status === "waiting" && bothPlayersReady(state.players)) {
      runCountdownAndReveal();
    }
  }

  function startTopic(action, context) {
    const topic = typeof action.topic === "string" ? action.topic.trim() : "";
    if (!topic) return { ok: false, error: "topic is required" };
    const state = emptyState(currentLocale);
    state.status = "waiting";
    state.topic = topic;
    state.players = [];
    return { ok: true, state, send: requestForOpenRound(state, false) };
  }

  function chooseGesture(action, context) {
    const gesture = normalizeChoice(action.gesture || action.choice);
    if (!gesture) return { ok: false, error: "gesture must be rock, paper, or scissors" };

    const state = normalizeState(window.pudding.getState());
    if (state.status !== "waiting") return { ok: true, state };
    const actor = context && context.actor ? context.actor : { role: "human" };
    const id = participantID(actor);
    let players = Array.isArray(state.players) ? state.players : [];
    let player = participantByID(players, id);

    if (!player) {
      const slot = nextOpenSlot(players);
      if (!slot) return { ok: true, state };
      player = playerFromActor(actor, slot);
      players = [...players, player];
    }

    state.players = players.map((item) =>
      item.id === player.id
        ? { ...item, title: titleForActor(actor), choice: gesture, result: null }
        : item
    );
    state.result_summary = null;
    return { ok: true, state };
  }

  async function revealResult() {
    const state = normalizeState(window.pudding.getState());
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
      winner_title: winner ? winner.title : t("none"),
      loser_title: loser ? loser.title : t("none"),
    };
    await recordLeaderboard(nextPlayers);

    const send = announcementsForAssistants(state);
    return { ok: true, state, ...(send.length ? { send } : {}) };
  }

  function reset(action, context) {
    const state = normalizeState(window.pudding.getState());
    if (action.reset_topic) {
      return { ok: true, state: emptyState(currentLocale) };
    }

    state.status = "waiting";
    state.locale = currentLocale;
    state.players = [];
    state.result_summary = null;
    return { ok: true, state, send: requestForOpenRound(state, true) };
  }

  btnStartArbitrate.addEventListener("click", function() {
    const topic = conflictInput.value.trim();
    if (!topic) return;
    window.pudding.dispatch({ type: "start_topic", topic });
  });

  gestureButtons.addEventListener("click", function(event) {
    const btn = event.target.closest(".btn-gesture");
    if (!btn || btn.disabled) return;
    window.pudding.dispatch({ type: "choose_gesture", gesture: btn.dataset.choice });
  });

  btnNextRound.addEventListener("click", function() {
    const now = Date.now();
    if (now < nextRoundLockedUntil) return;
    nextRoundLockedUntil = now + 800;
    triggerLeverEffect(() => window.pudding.dispatch({ type: "reset", reset_topic: false }));
  });

  btnChangeConflict.addEventListener("click", function() {
    triggerLeverEffect(() => {
      conflictInput.value = "";
      window.pudding.dispatch({ type: "reset", reset_topic: true });
    });
  });

  btnLeaderboard.addEventListener("click", function() {
    renderLeaderboard();
    leaderboardModal.classList.add("show");
  });

  leaderboardClose.addEventListener("click", function() {
    leaderboardModal.classList.remove("show");
  });

  leaderboardModal.addEventListener("click", function(event) {
    if (event.target === leaderboardModal) {
      leaderboardModal.classList.remove("show");
    }
  });

  applyPuddingTheme(window.pudding.theme);
  window.pudding.onTheme(applyPuddingTheme);
  applyPuddingLocale(window.pudding.locale);
  window.pudding.onLocale(applyPuddingLocale);
  window.pudding.onState(render);
  render(window.pudding.getState());
  loadLeaderboardData();

  window.pudding.onAction(function(action, context) {
    if (!action || typeof action !== "object") return { ok: false, error: "action must be an object" };
    if (action.type === "start_topic") return startTopic(action, context || {});
    if (action.type === "choose_gesture") return chooseGesture(action, context || {});
    if (action.type === "reveal_result") return revealResult();
    if (action.type === "reset") return reset(action, context || {});
    return { ok: false, error: `unsupported action type: ${action.type}` };
  });
})();
