import { useState } from "react";
import {
  useWidgetLocale,
  useWidgetState,
} from "@pudding/widget";
import {
  Coins,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { type Card, type HandValue } from "./types";
import { calculateHand } from "./rules";
import {
  lobby,
  position,
  deal,
  hit,
  stand,
  doubleDown,
  refillChips,
} from "./game";
import { t, setLocale } from "./text";
import "./style.css";

const CHIP_VALUES = [10, 25, 50, 100];

function suitSymbol(suit: Card["suit"]): string {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "C") return "♣";
  if (suit === "D") return "♦";
  return "";
}

function isRedSuit(suit: Card["suit"]): boolean {
  return suit === "H" || suit === "D";
}

function PokerCardView({ card }: { card: Card }) {
  if (!card.faceUp) {
    return (
      <div className="bj-card bj-card-back">
        <div className="bj-card-back-pattern" />
      </div>
    );
  }

  const red = isRedSuit(card.suit);
  const sym = suitSymbol(card.suit);

  return (
    <div className={`bj-card ${red ? "red" : "black"}`}>
      <div className="bj-card-corner">
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-suit-sm">{sym}</span>
      </div>
      <div className="bj-card-center-suit">{sym}</div>
      <div className="bj-card-corner bottom">
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-suit-sm">{sym}</span>
      </div>
    </div>
  );
}

export default function App() {
  useWidgetState();
  const locale = useWidgetLocale();
  if (locale) setLocale(locale);

  const l = lobby();
  const p = position();

  const [selectedBet, setSelectedBet] = useState(p.currentBet || 50);
  const [busy, setBusy] = useState(false);

  // 计算当前点数
  const isSettled = p.phase === "settled";
  const pVal: HandValue = calculateHand(p.playerHand);
  const dVal: HandValue = calculateHand(p.dealerHand, !isSettled);

  async function handleDeal() {
    if (busy) return;
    setBusy(true);
    try {
      await deal(selectedBet);
    } catch {}
    finally {
      setBusy(false);
    }
  }

  async function handleHit() {
    if (busy || p.phase !== "player_turn") return;
    setBusy(true);
    try {
      await hit();
    } catch {}
    finally {
      setBusy(false);
    }
  }

  async function handleStand() {
    if (busy || p.phase !== "player_turn") return;
    setBusy(true);
    try {
      await stand();
    } catch {}
    finally {
      setBusy(false);
    }
  }

  async function handleDouble() {
    if (busy || p.phase !== "player_turn") return;
    setBusy(true);
    try {
      await doubleDown();
    } catch {}
    finally {
      setBusy(false);
    }
  }

  async function handleRefill() {
    try {
      await refillChips();
    } catch {}
  }

  const canDouble =
    p.phase === "player_turn" &&
    p.playerHand.length === 2 &&
    p.chips >= p.currentBet;

  return (
    <div className="bj-container">
      {/* 顶部状态栏 */}
      <header className="bj-header">
        <div className="bj-brand">
          <span className="bj-logo">🃏</span>
          <span className="bj-title">{t("appTitle")}</span>
        </div>

        <div className="bj-bankroll-box">
          <div className="bj-chip-balance">
            <Coins size={15} color="#FBBF24" />
            <span>{p.chips}</span>
          </div>
          {p.chips < 10 && (
            <button className="bj-btn-refill" onClick={handleRefill}>
              {t("btnResetBankroll")}
            </button>
          )}
        </div>
      </header>

      {/* 经典绒布牌桌主体 */}
      <main className="bj-table">
        {/* 背景烫金线装饰 */}
        <div className="bj-table-banner">
          <div className="bj-banner-line" />
          <span className="bj-banner-text">
            BLACKJACK PAYS 3 TO 2 • DEALER MUST STAND ON 17
          </span>
        </div>

        {/* 1. 庄家区域 (顶部) */}
        <section className="bj-area">
          <div className="bj-dealer-speech">{p.dealerSpeech}</div>

          <div className="bj-area-label">
            <span>{l.dealerName}</span>
            {p.dealerHand.length > 0 && (
              <span
                className={`bj-points-badge ${
                  dVal.isBust
                    ? "bj-points-bust"
                    : dVal.isBlackjack
                      ? "bj-points-bj"
                      : ""
                }`}
              >
                {dVal.isBust
                  ? "爆牌"
                  : dVal.isBlackjack
                    ? "21点 (BJ)"
                    : `${dVal.total} ${t("points")}`}
              </span>
            )}
          </div>

          <div className="bj-hand-cards">
            {p.dealerHand.length === 0 ? (
              <div style={{ height: "96px" }} />
            ) : (
              p.dealerHand.map((card) => (
                <PokerCardView key={card.id} card={card} />
              ))
            )}
          </div>
        </section>

        {/* 2. 牌桌中央：底池与结算横幅 */}
        <section className="bj-center-zone">
          {isSettled ? (
            <div
              className={`bj-result-banner ${
                p.result === "blackjack_win"
                  ? "bj-res-bj"
                  : p.result === "player_win" || p.result === "dealer_bust_win"
                    ? "bj-res-win"
                    : p.result === "push"
                      ? "bj-res-push"
                      : "bj-res-loss"
              }`}
            >
              {p.result === "blackjack_win"
                ? t("resBlackjack")
                : p.result === "dealer_bust_win"
                  ? t("resDealerBust")
                  : p.result === "player_win"
                    ? t("resPlayerWin")
                    : p.result === "push"
                      ? t("resPush")
                      : p.result === "player_bust"
                        ? t("resPlayerBust")
                        : t("resDealerWin")}
            </div>
          ) : p.phase === "player_turn" ? (
            <div className="bj-pot-badge">
              <Coins size={14} />
              <span>
                {t("currentBet")}: {p.currentBet}
              </span>
            </div>
          ) : null}
        </section>

        {/* 3. 玩家区域 (底部) */}
        <section className="bj-area">
          <div className="bj-hand-cards">
            {p.playerHand.length === 0 ? (
              <div style={{ height: "96px" }} />
            ) : (
              p.playerHand.map((card) => (
                <PokerCardView key={card.id} card={card} />
              ))
            )}
          </div>

          <div className="bj-area-label">
            <span>{l.playerName}</span>
            {p.playerHand.length > 0 && (
              <span
                className={`bj-points-badge ${
                  pVal.isBust
                    ? "bj-points-bust"
                    : pVal.isBlackjack
                      ? "bj-points-bj"
                      : ""
                }`}
              >
                {pVal.isBust
                  ? "爆牌"
                  : pVal.isBlackjack
                    ? "天王 21 点"
                    : pVal.isSoft
                      ? `${t("soft")} ${pVal.total} ${t("points")}`
                      : `${pVal.total} ${t("points")}`}
              </span>
            )}
          </div>
        </section>
      </main>

      {/* 底部交互控制台 */}
      <footer className="bj-controls-bar">
        {p.phase === "player_turn" ? (
          /* 行动回合大按钮 */
          <div className="bj-action-group" style={{ margin: "0 auto" }}>
            <button
              className="bj-btn bj-btn-hit"
              onClick={handleHit}
              disabled={busy}
            >
              <PlusCircle size={16} />
              {t("btnHit")}
            </button>
            <button
              className="bj-btn bj-btn-stand"
              onClick={handleStand}
              disabled={busy}
            >
              <RotateCcw size={16} />
              {t("btnStand")}
            </button>
            <button
              className="bj-btn bj-btn-double"
              onClick={handleDouble}
              disabled={busy || !canDouble}
              title={!canDouble ? "加倍仅限起手前两张牌且筹码充足" : ""}
            >
              <Flame size={16} />
              {t("btnDouble")}
            </button>
          </div>
        ) : (
          /* 下注与发牌 */
          <>
            <div className="bj-chips-selector">
              <span style={{ fontSize: "12px", color: "var(--bj-gold)" }}>
                下注：
              </span>
              {CHIP_VALUES.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`bj-chip-btn bj-chip-${val} ${
                    selectedBet === val ? "active" : ""
                  }`}
                  onClick={() => setSelectedBet(val)}
                >
                  {val}
                </button>
              ))}
            </div>

            <button
              className="bj-btn bj-btn-deal"
              onClick={handleDeal}
              disabled={busy || p.chips < selectedBet}
            >
              <Sparkles size={18} />
              {p.playerHand.length > 0 ? t("btnNextHand") : t("btnDeal")} ({selectedBet})
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
