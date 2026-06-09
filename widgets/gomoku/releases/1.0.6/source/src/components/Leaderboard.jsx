import { t } from "../utils.js";

export function Leaderboard({ state, leaderboardOpen, setLeaderboardOpen, currentSortKey, setCurrentSortKey }) {
  const getSortedLeaderboard = () => {
    const list = [];
    for (const name in state.score) {
      const entry = state.score[name];
      if (entry && typeof entry === "object") {
        const win = entry.win || 0;
        const lose = entry.lose || 0;
        const draw = entry.draw || 0;
        const total = entry.total || 0;
        const winRate = total > 0 ? (win / total) : 0;
        list.push({ name, win, lose, draw, total, winRate });
      }
    }
    list.sort((a, b) => {
      if (currentSortKey === "win") {
        if (b.win !== a.win) return b.win - a.win;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return a.total - b.total;
      } else if (currentSortKey === "total") {
        if (b.total !== a.total) return b.total - a.total;
        if (b.win !== a.win) return b.win - a.win;
        return b.winRate - a.winRate;
      } else if (currentSortKey === "winRate") {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.win !== a.win) return b.win - a.win;
        return a.total - b.total;
      }
      return 0;
    });
    return list;
  };

  const sortedList = getSortedLeaderboard();

  return (
    <div id="leaderboard-modal" className={`modal-overlay${leaderboardOpen ? " show" : ""}`} onClick={(e) => e.target.id === "leaderboard-modal" && setLeaderboardOpen(false)}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title" id="leaderboard-title">🏆 {t("leaderboard_title")}</span>
          <button className="modal-close" id="modal-close-btn" onClick={() => setLeaderboardOpen(false)}>&times;</button>
        </div>
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }} id="th-rank">{t("rank")}</th>
                <th id="th-player">{t("player")}</th>
                <th
                  style={{ width: "70px", textAlign: "center" }}
                  className={`sortable${currentSortKey === "total" ? " active-sort" : ""}`}
                  id="th-total"
                  onClick={() => setCurrentSortKey("total")}
                >
                  {t("total")}{currentSortKey === "total" ? " ↓" : ""}
                </th>
                <th
                  style={{ width: "55px", textAlign: "center", color: "#22c55e" }}
                  className={`sortable${currentSortKey === "win" ? " active-sort" : ""}`}
                  id="th-win"
                  onClick={() => setCurrentSortKey("win")}
                >
                  {t("win")}{currentSortKey === "win" ? " ↓" : ""}
                </th>
                <th style={{ width: "55px", textAlign: "center", color: "#ef4444" }} id="th-lose">{t("lose")}</th>
                <th style={{ width: "55px", textAlign: "center", color: "#a1a1aa" }} id="th-draw">{t("draw")}</th>
                <th
                  style={{ width: "70px", textAlign: "center", color: "#eab308" }}
                  className={`sortable${currentSortKey === "winRate" ? " active-sort" : ""}`}
                  id="th-winRate"
                  onClick={() => setCurrentSortKey("winRate")}
                >
                  {t("win_rate")}{currentSortKey === "winRate" ? " ↓" : ""}
                </th>
              </tr>
            </thead>
            <tbody id="leaderboard-tbody">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "24px 0" }}>
                    {t("empty_leaderboard")}
                  </td>
                </tr>
              ) : (
                sortedList.map((item, index) => {
                  let rankClass = "rank-other";
                  if (index === 0) rankClass = "rank-1";
                  else if (index === 1) rankClass = "rank-2";
                  else if (index === 2) rankClass = "rank-3";

                  const pct = (item.winRate * 100).toFixed(0) + "%";
                  return (
                    <tr key={item.name}>
                      <td>
                        <span className={`rank-badge ${rankClass}`}>{index + 1}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td style={{ textAlign: "center" }}>{item.total}</td>
                      <td style={{ textAlign: "center", color: "#22c55e", fontWeight: 700 }}>{item.win}</td>
                      <td style={{ textAlign: "center", color: "#ef4444" }}>{item.lose}</td>
                      <td style={{ textAlign: "center", color: "#a1a1aa" }}>{item.draw}</td>
                      <td style={{ textAlign: "center", color: "#eab308", fontWeight: 700 }}>{pct}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
