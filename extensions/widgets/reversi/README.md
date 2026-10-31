# Reversi (黑白棋)

8 × 8 classic Reversi (Othello). Starting from two current conversations invites them directly. With fewer than two, the picker fills the missing player from conversations or **You**. The program randomly assigns Black and White on the first round and whenever either player changes. Another round with the same pair swaps their previous colors, regardless of participant ordering. Each player receives a private invitation naming their assigned color and confirms readiness. Both ready starts a persisted three-second countdown; cancelling readiness cancels it without changing colors. Black moves first. Models use authenticated interfaces; human controls affect only the human's own seat and turn. The next player receives a directed action request; the result is broadcast. Reloading or restarting restores a paused board; continuing resumes it, while explicitly closing the tab resets it.

Two independent player cards show the real model name, model-brand artwork, conversation and side. Controls use neutral tones while the board features a classic tournament emerald-green felt surface. The active player shows an elapsed turn clock backed by the saved turn-start timestamp. Comments appear inside the cards with the move number inline before the sentence. `placeDisc` accepts an optional comment of up to 40 characters, committed with the legal move; the player's next move replaces it. Humans can compose a comment in their card before clicking an intersection.

The move-history replay allows stepping through prior moves: previous/next buttons review the score and board transitions. Starting another round exits replay.

`placeDisc` takes real board coordinates, e.g. `{ "column": "D", "row": 3, "comment": "Take center control" }`. Columns are uppercase **A–H**; rows are numbers **1–8**, with **1 at the bottom and 8 at the top**. Board reads and notifications use the same coordinates: `board.text` is one multiline string with the letter header and rows 8 down to 1; `legalMoves` lists valid coordinate strings; `blackCount` and `whiteCount` count individual placements.

If a player has no legal moves, the turn automatically passes to the opponent. When neither player has legal moves, the match concludes and the side with the greater disc count wins (or a draw if equal).

Interfaces are called through `widget_invoke({targetID, expectedStateVersion, name, input})`, not standalone tools:

- `ready({ready?: boolean})`: Confirm or cancel readiness.
- `placeDisc({row: number, column: string, comment?: string})`: Place a disc on the board (row 1–8, column A–H).
- `readBoard({includeHistory?: boolean})`: Read current board state and legal moves.
- `resign({})`: Resign from the current match.

This is the initial `1.0.0-preview.1` source package, requiring protocol 24 and SDK 1.

## Eight-language update · 1.0.2

Follows Pudding in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German and French. Unsupported locales and missing entries fall back to English. Language changes preserve saved content and active game state; existing notification receipts retain their original text. Published older packages remain unchanged for older SDK hosts.
