import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

import { DESIGN_BOARD_SIZE, LEADERBOARD_DATA_KEY, BLACK_SIDE, WHITE_SIDE } from "./constants.js";
import { t, normalizeLocale, setGlobalLocale, applyPuddingTheme, sideForStone, public_row, public_col, isHuman, formatBoardText, getBattleLogs } from "./utils.js";
import { normalizeState, innerOnAction, normalizeScore, withDerivedState, publicState } from "./gameLogic.js";

import { PlayerCard } from "./components/PlayerCard.jsx";
import { Leaderboard } from "./components/Leaderboard.jsx";
import { Board } from "./components/Board.jsx";

// 全局暴露给外部如果需要
window.formatBoardText = formatBoardText;
window.normalizeState = normalizeState;

function App() {
  const [state, setState] = useState(() => normalizeState(window.pudding?.getState()));
  const [locale, setLocale] = useState(() => normalizeLocale(window.pudding?.locale));
  const [boardWidth, setBoardWidth] = useState(DESIGN_BOARD_SIZE);
  const [currentSortKey, setCurrentSortKey] = useState("win");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const [lastMoveAnimated, setLastMoveAnimated] = useState(false);
  const [bubbleTextBlack, setBubbleTextBlack] = useState("");
  const [bubbleTextWhite, setBubbleTextWhite] = useState("");
  const [uiCountdown, setUiCountdown] = useState(null);
  const prevStatusRef = useRef(state.status);

  const boardRef = useRef(null);
  const logRef = useRef(null);
  const prevHistoryLengthRef = useRef(state.history.length);
  const bubbleTimerBlackRef = useRef(null);
  const bubbleTimerWhiteRef = useRef(null);

  useEffect(() => {
    if (window.pudding) {
      applyPuddingTheme(window.pudding.theme);
      if (typeof window.pudding.onTheme === "function") {
        window.pudding.onTheme(applyPuddingTheme);
      }

      const onLocaleHandler = (next) => {
        const nextLoc = normalizeLocale(next && typeof next === "object" ? next.locale : next);
        setGlobalLocale(nextLoc);
        document.documentElement.lang = nextLoc;
        setLocale(nextLoc);
        setState(prev => normalizeState({ ...prev }));
      };
      onLocaleHandler(window.pudding.locale);
      if (typeof window.pudding.onLocale === "function") {
        window.pudding.onLocale(onLocaleHandler);
      }

      const onStateHandler = (nextState) => {
        if (!nextState) return;
        const nextNormalized = normalizeState(nextState);
        setState(nextNormalized);
      };
      window.pudding.onState(onStateHandler);

      const currentState = window.pudding.getState();
      if (!currentState || !currentState.actions_schema) {
        window.pudding.dispatch({ type: "init" });
      }
    }
  }, []);

  useEffect(() => {
    const initScore = async () => {
      if (!window.pudding || typeof window.pudding.getData !== "function") return;
      try {
        const stored = normalizeScore(await window.pudding.getData(LEADERBOARD_DATA_KEY));
        if (stored && Object.keys(stored).length > 0) {
          setState(prev => {
            const next = { ...prev };
            next.score = { ...next.score, ...stored };
            return normalizeState(next);
          });
        }
      } catch (err) {
        // ignore
      }
    };
    initScore();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const wrapper = document.getElementById("board-wrapper");
      if (wrapper) {
        const boardEl = wrapper.querySelector("#gomoku-board");
        if (boardEl) {
          setBoardWidth(boardEl.clientWidth || DESIGN_BOARD_SIZE);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.history.length, state.status]);

  useEffect(() => {
    if (state.history.length > prevHistoryLengthRef.current) {
      setLastMoveAnimated(false);

      const latestMove = state.history[state.history.length - 1];
      if (latestMove && latestMove.message) {
        const side = sideForStone(latestMove.stone);
        if (side === BLACK_SIDE) {
          setBubbleTextBlack(latestMove.message);
          if (bubbleTimerBlackRef.current) clearTimeout(bubbleTimerBlackRef.current);
          bubbleTimerBlackRef.current = setTimeout(() => {
            setBubbleTextBlack("");
          }, 4000);
        } else {
          setBubbleTextWhite(latestMove.message);
          if (bubbleTimerWhiteRef.current) clearTimeout(bubbleTimerWhiteRef.current);
          bubbleTimerWhiteRef.current = setTimeout(() => {
            setBubbleTextWhite("");
          }, 4000);
        }
      }
    } else if (state.history.length === 0) {
      setLastMoveAnimated(false);
      setBubbleTextBlack("");
      setBubbleTextWhite("");
    }
    prevHistoryLengthRef.current = state.history.length;
  }, [state.history.length]);

  useEffect(() => {
    if (!lastMoveAnimated && state.history.length > 0) {
      const timer = setTimeout(() => {
        setLastMoveAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lastMoveAnimated, state.history.length]);

  useEffect(() => {
    if (state.status === "ready_checking" && prevStatusRef.current !== "ready_checking") {
      setUiCountdown(3);
      if (navigator.vibrate) navigator.vibrate(15);
      let count = 0;
      const timer = setInterval(() => {
        count++;
        if (count < 3) {
          setUiCountdown(3 - count);
          if (navigator.vibrate) navigator.vibrate(15);
        } else {
          clearInterval(timer);
          setUiCountdown(null);
        }
      }, 1000);
      return () => clearInterval(timer);
    } else if (state.status !== "ready_checking") {
      setUiCountdown(null);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const onBoardClick = (row, col) => {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      window.pudding.dispatch({ type: "place_stone", row: public_row(row), col: public_col(col) });
    }
  };

  const onSeatAction = (actionType, side) => {
    if (window.pudding && typeof window.pudding.dispatch === "function") {
      if (actionType === "ready") {
        window.pudding.dispatch({ type: "ready" });
      } else if (actionType === "undo") {
        window.pudding.dispatch({ type: "undo" });
      } else if (actionType === "reset") {
        window.pudding.dispatch({ type: "reset" });
      } else if (actionType === "clear_score") {
        window.pudding.dispatch({ type: "clear_score" });
      } else {
        window.pudding.dispatch({ type: actionType, side: side });
      }
    }
  };

  const displayState = uiCountdown !== null ? { ...state, status: "countdown" } : state;

  const isHumanReadyCheck = state.status === "ready_checking" && uiCountdown === null && (
    (isHuman(state.black_player?.session_id) && !state.black_ready) ||
    (isHuman(state.white_player?.session_id) && !state.white_ready)
  );

  const currentTurnIsHuman = state.status === "playing" && state.turn && isHuman(state[state.turn + "_player"]?.session_id);
  const isUndoEnabled = state.status === "playing" && currentTurnIsHuman && state.history.length > 0;

  return (
    <div id="gomoku-container">
      <div className="arena-layout">
        <div className="center-panel">
          <div className="arena-header">
            <span className="arena-title" id="arena-title-id">{t("title")}</span>
          </div>

          <div id="board-wrapper">
            <PlayerCard state={displayState} side={BLACK_SIDE} onSeatAction={onSeatAction} countdownNum={uiCountdown} bubbleText={bubbleTextBlack} />
            <div className="board-container-wrapper" ref={boardRef} style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Board boardWidth={boardWidth} state={state} lastMoveAnimated={lastMoveAnimated} onBoardClick={onBoardClick} />
            </div>
            <PlayerCard state={displayState} side={WHITE_SIDE} onSeatAction={onSeatAction} countdownNum={uiCountdown} bubbleText={bubbleTextWhite} />
          </div>

          <div id="battle-log" ref={logRef}>
            {getBattleLogs(state).map((item, idx) => {
              let className = "log-system";
              if (item.type === "black") className = "log-black";
              else if (item.type === "white") className = "log-white";
              else if (item.type === "win") className = "log-win";
              else if (item.type === "error") className = "log-error";
              return (
                <div key={idx} className={className}>
                  {item.text}
                </div>
              );
            })}
          </div>

          <div className="buttons">
            {isHumanReadyCheck && (
              <button id="ready-btn" className="control primary" type="button" onClick={() => onSeatAction("ready")}>
                {t("ready")}
              </button>
            )}
            <button id="undo-btn" className="control" type="button" disabled={!isUndoEnabled} onClick={() => onSeatAction("undo")}>
              {t("undo")}
            </button>
            <button id="leaderboard-btn" className="control" type="button" onClick={() => setLeaderboardOpen(true)}>
              🏆 {t("leaderboard")}
            </button>
            <button id="reset-btn" className="control" type="button" onClick={() => onSeatAction("reset")}>
              {t("reset_board")}
            </button>
          </div>
        </div>

        <Leaderboard state={state} leaderboardOpen={leaderboardOpen} setLeaderboardOpen={setLeaderboardOpen} currentSortKey={currentSortKey} setCurrentSortKey={setCurrentSortKey} onClearScore={() => onSeatAction("clear_score")} />
      </div>
    </div>
  );
}

async function loadLeaderboardData(currentState) {
  if (!window.pudding || typeof window.pudding.getData !== "function") return currentState;
  try {
    const stored = normalizeScore(await window.pudding.getData(LEADERBOARD_DATA_KEY));
    if (stored && Object.keys(stored).length > 0) {
      currentState.score = stored;
      return currentState;
    }
  } catch (err) {
    // 忽略加载错误
  }
  return currentState;
}

async function saveLeaderboardData(score) {
  if (!window.pudding || typeof window.pudding.setData !== "function") return;
  try {
    await window.pudding.setData(LEADERBOARD_DATA_KEY, normalizeScore(score));
  } catch (err) {
    // 忽略保存错误
  }
}

async function deleteLeaderboardData() {
  if (!window.pudding || typeof window.pudding.deleteData !== "function") return;
  try {
    await window.pudding.deleteData(LEADERBOARD_DATA_KEY);
  } catch (err) {
    // 忽略删除错误
  }
}

if (window.pudding) {
  window.pudding.onAction(async function (action, context) {
    let currState = window.pudding.getState();

    currState = await loadLeaderboardData(currState);

    const result = innerOnAction(action, currState, context);
    if (result && result.ok && result.state) {
      withDerivedState(result.state);
      if (action && action.type === "clear_score") {
        await deleteLeaderboardData();
      } else if (action && action.type === "place_stone" && result.state.status === "game_over") {
        await saveLeaderboardData(result.state.score);
      }
      
      // 直接把返回给宿主和大模型的 state 转换为公开格式
      result.state = publicState(result.state);
    }
    return result;
  });
}

render(<App />, document.getElementById("app"));
