# Gmail Board · 1.0.0-preview.4

A local triage board for Gmail threads. Requires the Gmail plugin and a connected Google account with `gmail.readonly`. Enable **Show widget preview versions** to install this preview (and **Show plugin preview versions** if Gmail is still a preview).

## Connections and data

Use Pudding's **account selector in the widget toolbar** to choose an existing Gmail connection. With one connection the host selects it automatically; with multiple connections it requires an explicit selection. Add/reconnect accounts in Pudding's plugin settings. This widget does not handle OAuth credentials.

Each connected mailbox is identified by the authenticated Gmail profile's email address, normalized to lowercase. Board statuses, follow-up dates, notes and saved reply drafts are partitioned by that mailbox inside the widget's item storage. Two connections to the same Gmail account intentionally share its board. Switching connections starts a fresh guest/cache; returning to an account loads its saved data. Reading a thread does not move its card or change unread state.

Use the status tabs to filter one mail list. Selecting a thread opens its body in the reading pane on the right; switch to **Organize & draft** for its local form. The list and reader scroll independently, and the list remains accessible while reading. Status counts apply to the current Gmail page. Errors stay compact without shifting the board; details expand within a bounded area and can be copied from the sandbox. If copying is blocked, the error is selected for keyboard copying.

Changes in the detail form are saved with **Save**; the form shows when changes are unsaved. Save before switching accounts, changing threads or closing the view. Drafts are local to this installed board, **not Gmail server drafts**. No send, archive, label modification or mark-as-read endpoints are declared.

The default search is `in:inbox`. Each board page displays up to 20 threads; column counts apply to that page, not the entire mailbox. Gmail search syntax and next/previous pages are supported. Remote metadata is cached for one minute and refreshed on request. Bodies are fetched only when opening a thread. HTML is converted into inert text; images and attachments are not fetched. Each body view is capped at 12,000 characters and visibly marked if shortened. Local storage is limited to 256 KiB by Pudding; the widget reports a full store without deleting data.

## LLM interfaces

Discover this running instance with `widget_targets`, inspect its interfaces with `widget_observe` when needed, and invoke via:

```json
{"tool":"widget_invoke","input":{"targetID":"<current target>","expectedStateVersion":0,"name":"getBoard","input":{}}}
```

Use the current `stateVersion` from the host; it is distinct from `storageVersion` in business responses. Connection switching changes the runtime target: discover the current target again. Never reuse an old account, thread ID or storage version after switching.

| Interface | Purpose |
| --- | --- |
| `getBoard` | Current account, counts for first inbox page, next cursor, storage version |
| `listThreads` | Gmail query and cursor pagination; summary, status, follow-up date, draft presence |
| `readThread` | On-demand newest-first message page, note and local draft |
| `updateCards` | Atomic batch of 1–20 statuses, notes and follow-up dates |
| `saveReplyDraft` | Save or clear one local draft |
| `refreshMailbox` | Refresh reads without deleting local work |

All operations after discovery require the exact `account` returned by `getBoard`. Writes additionally require `expectedStorageVersion`; a conflict rejects the write and requires a fresh read and decision. Thread IDs must first be read/listed in the current guest. Mutation receipts contain only the account, changed IDs and new storage version. UI and LLM share the same validation and write path.

## Verification

```sh
PATH=/opt/homebrew/opt/node@24/bin:$PATH node --experimental-strip-types --test test/gmail-board.test.mjs
PUDDING_CORE_DIR=/path/to/compatible/core node scripts/package-widget.mjs gmail-board --dev
```

Desktop acceptance: `PUDDING_SMOKE_SCENARIO=gmail-board-live npm run smoke:electron-workspace`, with `PUDDING_HUB_DIR`, a matching `PUDDING_CORE_DIR`/isolated `PUDDING_DAEMON_BIN`, and explicit `PUDDING_MUSIC_PROFILE` / `PUDDING_MUSIC_PROFILES`. It uses real Desktop plugin bindings against two controlled Gmail HTTP fixtures and **DeepSeek Flash** for the model turn. It never accesses a real mailbox or sends mail. OAuth authorization is supplied by the existing Gmail plugin, not exercised by these fixtures.
