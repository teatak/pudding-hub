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
          <div className="card-top-half" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 12px 4px 12px", width: "100%" }}>
            <div className="card-left-col" style={{ width: "52px", flexShrink: 0 }}>
              <div className={`avatar-wrapper avatar-${side}`} id={avatarId} style={{ position: "relative", margin: 0, width: "52px", height: "52px" }}>
                <div dangerouslySetInnerHTML={{ __html: renderAvatar(player.session_id, isHuman(player.session_id) ? t("human_judge") : player.title) }} />
              </div>
            </div>
            
            <div className="card-right-col" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px", paddingTop: "2px" }}>
              <div className="status-row" style={{ marginTop: 0, justifyContent: "flex-end" }}>
                <span className="player-status-badge ready" style={{ display: state.status === "ready_checking" && isReady ? "inline-flex" : "none" }}>{t("ready_status")}</span>
                <span className="player-status-badge" style={{ display: state.status === "ready_checking" && !isReady ? "inline-flex" : "none" }}>{t("preparing")}</span>
                <span className="player-status-badge countdown-badge" style={{ display: state.status === "countdown" ? "inline-flex" : "none", fontSize: "14px", fontWeight: "bold", padding: "0 8px", background: "var(--pudding-primary)", color: "var(--pudding-bg)" }}>{countdownNum}</span>
                <span className="player-status-badge thinking" style={{ display: state.status === "playing" && state.turn === side ? "inline-flex" : "none" }}>{t("thinking")}</span>
                <span className="player-status-badge" style={{ display: state.status === "playing" && state.turn !== side ? "inline-flex" : "none" }}>{t("waiting")}</span>
                <span className="player-status-badge" style={{ display: state.status !== "ready_checking" && state.status !== "playing" ? "inline-flex" : "none" }}>{t("seated")}</span>
              </div>
              <div className="panel-action" style={{ width: "100%", justifyContent: "flex-end", marginTop: 0 }}>
                {isHuman(player.session_id) ? (
                  <button className="seat-btn leave-btn" onClick={() => onSeatAction("leave_game", side)}>{t("leave")}</button>
                ) : (
                  <button className="seat-btn kick-btn" onClick={() => onSeatAction("kick_player", side)}>{t("kick")}</button>
                )}
              </div>
            </div>
          </div>
          <div className="card-bottom-half" style={{ padding: "0 12px 10px 12px", width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-end", flex: 1 }}>
            <div className="player-name" id={nameId} style={{ margin: 0, textAlign: "center", wordBreak: "break-all", lineHeight: 1.2 }}>
              {isHuman(player.session_id) ? t("human_judge") : player.title}
            </div>
          </div>
        </div>
      ) : (
        <div className="player-card empty-state" style={{ padding: 0 }}>
          <div className="card-top-half" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 12px 4px 12px", width: "100%" }}>
            <div className="card-left-col" style={{ width: "52px", flexShrink: 0 }}>
              <div className={`empty-avatar-placeholder avatar-${side}`} style={{ margin: 0, width: "52px", height: "52px" }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
            
            <div className="card-right-col" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px", paddingTop: "2px" }}>
              {state.status === "idle" ? (
                <>
                  <button className="seat-btn join-btn" onClick={() => onSeatAction("join_game", side)}>{isBlack ? t("join_black") : t("join_white")}</button>
                  <button className="seat-btn join-btn" onClick={() => onSeatAction("invite_ai", side)}>{t("invite_ai_btn")}</button>
                </>
              ) : (
                <span className="player-status-badge" style={{ display: "none" }}>{t("empty")}</span>
              )}
            </div>
          </div>
          <div className="card-bottom-half" style={{ padding: "0 12px 10px 12px", width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-end", flex: 1 }}>
            <div className="empty-status-text" style={{ margin: 0, textAlign: "center", width: "100%", height: "auto", lineHeight: 1.2 }}>
              {t("waiting_join")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
