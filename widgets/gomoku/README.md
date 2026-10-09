# Gomoku

15 × 15 Gomoku. Connect conversations, then each participant chooses a seat and gets ready inside the widget. Interface and CDP moves share the same rules. The next player receives a directed action request; the result is broadcast. Reloading or restarting restores the board; explicitly closing the tab resets it.

`readBoard` and `placeStone` return a labelled text board (`.` empty, `B` Black, `W` White), stone coordinates and the last move using 1-based row/column positions. They include named seats, the caller's own seats/readiness and `yourTurn`; the internal flat array is not exposed as the tool view. Seat operations also return the caller's own identity and readiness.

Requires source-package format 2, protocol 22 and SDK 1. See [development guide](../../docs/widget-development.md). Historical HTML releases are preserved and no longer used by the current source.
