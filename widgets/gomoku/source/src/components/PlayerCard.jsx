import { t, isHuman } from "../utils.js";
import { renderAvatar } from "./Avatars.jsx";
import { BLACK_SIDE, WHITE_SIDE } from "../constants.js";

export function PlayerCard({ state, side, onSeatAction, countdownNum, bubbleText }) {
  const isBlack = side === BLACK_SIDE;
  const player = isBlack ? state.black_player : state.white_player;
  const isReady = isBlack ? state.black_ready : state.white_ready;
  const panelId = isBlack ? "panel-black" : "panel-white";
  const bubbleId = isBlack ? "bubble-black" : "bubble-white";
  const bubbleClass = isBlack ? "bubble-left" : "bubble-right";
  const avatarId = isBlack ? "avatar-black-container" : "avatar-white-container";
  const scoreId = isBlack ? "score-black-display" : "score-white-display";
  const nameId = isBlack ? "name-black" : "name-white";
  const footerId = isBlack ? "footer-black" : "footer-white";

  return (
    <div className={`player-panel side-${side}`} id={panelId}>
      {player ? (
        <div className={`player-card occupied${isReady && state.status === "ready_checking" ? " ready-state" : ""}${state.status === "playing" && state.turn === side ? " active-turn" : ""}`}>
          <div className={`speech-bubble ${bubbleClass}${bubbleText ? " show" : ""}`} id={bubbleId}>
            {bubbleText}
          </div>
          <div className="card-top-half">
            <div className="card-header">
              <div className="avatar-wrapper" id={avatarId} dangerouslySetInnerHTML={{ __html: renderAvatar(player.session_id, isHuman(player.session_id) ? t("human_judge") : player.title) }} />
              <div className="player-score" id={scoreId}>
                {state.score[player.title] && typeof state.score[player.title] === "object" ? state.score[player.title].win : 0}
              </div>
            </div>
          </div>
          <div className="card-divider" />
          <div className="card-bottom-half">
            <div className="player-name" id={nameId}>
              {isHuman(player.session_id) ? t("human_judge") : player.title}
            </div>
            <div className="status-row">
              <span className="player-status-badge ready" style={{ display: state.status === "ready_checking" && isReady ? "inline-flex" : "none" }}>{t("ready_status")}</span>
              <span className="player-status-badge" style={{ display: state.status === "ready_checking" && !isReady ? "inline-flex" : "none" }}>{t("preparing")}</span>
              <span className="player-status-badge countdown-badge" style={{ display: state.status === "countdown" ? "inline-flex" : "none", fontSize: "14px", fontWeight: "bold", padding: "0 8px", background: "var(--pudding-primary)", color: "var(--pudding-bg)" }}>{countdownNum}</span>
              <span className="player-status-badge thinking" style={{ display: state.status === "playing" && state.turn === side ? "inline-flex" : "none" }}>{t("thinking")}</span>
              <span className="player-status-badge" style={{ display: state.status === "playing" && state.turn !== side ? "inline-flex" : "none" }}>{t("waiting")}</span>
              <span className="player-status-badge" style={{ display: state.status !== "ready_checking" && state.status !== "playing" ? "inline-flex" : "none" }}>{t("seated")}</span>
            </div>
            <div className="panel-action">
              {isHuman(player.session_id) ? (
                <button className="seat-btn leave-btn" onClick={() => onSeatAction("leave_game", side)}>{t("leave")}</button>
              ) : (
                <button className="seat-btn kick-btn" onClick={() => onSeatAction("kick_player", side)}>{t("kick")}</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="player-card empty-state">
          <div className="empty-avatar-placeholder">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className="empty-status-text">{t("waiting_join")}</div>
          <div className="card-footer" id={footerId}>
            {state.status === "idle" ? (
              <div className="panel-action" style={{ display: "flex", gap: "6px" }}>
                <button className="seat-btn join-btn" onClick={() => onSeatAction("join_game", side)}>{isBlack ? t("join_black") : t("join_white")}</button>
                <button className="seat-btn join-btn" onClick={() => onSeatAction("invite_ai", side)}>{t("invite_ai_btn")}</button>
              </div>
            ) : (
              <span className="player-status-badge" style={{ display: "none" }}>{t("empty")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
