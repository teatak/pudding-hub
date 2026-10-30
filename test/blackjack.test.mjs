import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateHand,
  createDeck,
  dealRound,
  playerHit,
  playerStand,
  initialPosition,
} from "../extensions/widgets/blackjack/source/src/rules.ts";

const root = fileURLToPath(
  new URL("../extensions/widgets/blackjack", import.meta.url),
);

test("Blackjack preview release package exists, is verified, and contains valid source files", async () => {
  const pkgPath = path.join(
    root,
    "releases/1.0.0-preview.1/blackjack.pudding-widget.json",
  );
  const raw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw);

  assert.equal(pkg.id, "teatak/pudding-hub/widgets/blackjack");
  assert.equal(pkg.version, "1.0.0-preview.1");
  assert.equal(pkg.preview, true);
  assert.equal(pkg.channel, "preview");
  assert.equal(pkg.requires.protocolVersion, 24);
  assert.equal(pkg.requires.sdkVersion, "1");

  const requiredFiles = [
    "widget.json",
    "src/App.tsx",
    "src/game.ts",
    "src/rules.ts",
    "src/sound.ts",
    "src/types.ts",
    "src/text.ts",
    "src/style.css",
  ];

  for (const file of requiredFiles) {
    assert.ok(pkg.source.files[file], `missing file in package: ${file}`);
  }

  // Ensure game interfaces are exported
  const gameSrc = pkg.source.files["src/game.ts"];
  assert.match(gameSrc, /deal/);
  assert.match(gameSrc, /hit/);
  assert.match(gameSrc, /stand/);
  assert.match(gameSrc, /doubleDown/);
  assert.match(gameSrc, /readTable/);
  assert.match(gameSrc, /onResume/);

  // Ensure App.tsx renders Blackjack table elements
  const appSrc = pkg.source.files["src/App.tsx"];
  assert.match(appSrc, /useWidgetState/);
  assert.match(appSrc, /bj-container/);
  assert.match(appSrc, /bj-hand-cards/);
  assert.match(appSrc, /bj-btn-hit/);
});

test("Blackjack point calculations and Ace soft/hard handling work accurately", () => {
  // 1. Natural Blackjack (A + K)
  const bj = calculateHand([
    { id: "1", suit: "S", rank: "A", faceUp: true },
    { id: "2", suit: "H", rank: "K", faceUp: true },
  ]);
  assert.equal(bj.total, 21);
  assert.equal(bj.isBlackjack, true);
  assert.equal(bj.isSoft, true);
  assert.equal(bj.isBust, false);

  // 2. Ace adjusts from 11 to 1 on bust (A + 8 + 5 = 14)
  const softBust = calculateHand([
    { id: "1", suit: "S", rank: "A", faceUp: true },
    { id: "2", suit: "H", rank: "8", faceUp: true },
    { id: "3", suit: "C", rank: "5", faceUp: true },
  ]);
  assert.equal(softBust.total, 14);
  assert.equal(softBust.isSoft, false);
  assert.equal(softBust.isBust, false);

  // 3. True bust (10 + 7 + 6 = 23)
  const bust = calculateHand([
    { id: "1", suit: "S", rank: "10", faceUp: true },
    { id: "2", suit: "H", rank: "7", faceUp: true },
    { id: "3", suit: "C", rank: "6", faceUp: true },
  ]);
  assert.equal(bust.total, 23);
  assert.equal(bust.isBust, true);
});

test("Blackjack round flow and state transitions execute correctly", () => {
  let pos = initialPosition();
  assert.equal(pos.phase, "betting");
  assert.equal(pos.chips, 1000);

  // Deal
  pos = dealRound(pos, 50);
  assert.equal(pos.currentBet, 50);
  assert.equal(pos.chips, 950);
  assert.equal(pos.playerHand.length, 2);
  assert.equal(pos.dealerHand.length, 2);
  assert.equal(pos.dealerHand[1].faceUp, false); // hole card hidden

  if (pos.phase === "player_turn") {
    // Player Stand
    pos = playerStand(pos);
    assert.equal(pos.phase, "settled");
    assert.equal(pos.dealerHand[1].faceUp, true); // hole card revealed
    assert.ok(pos.chips >= 950);
  }
});
