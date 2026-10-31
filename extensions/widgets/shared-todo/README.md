# Todo

A shared, persistent task list with inline title editing, completion/reopening, deletion, All/Active/Completed filters, a collapsible completed section and an outstanding-task count. The UI follows Pudding's light/dark theme and Simplified Chinese, Traditional Chinese or English setting live, including accessibility labels and interface descriptions. Input-method composition does not submit unfinished text; Enter saves and Escape cancels inline editing.

Existing data stays in item storage as `tasks: [{id, title, done}]`. Opening the new source performs no migration or write. IDs, completed tasks, ordering and unrelated top-level data are preserved. Every opening of the same item reads the same storage; copies remain independent. A mutation reads once, validates the whole batch, then performs one version-checked write. Invalid batches write nothing; conflicts are surfaced without automatic retries. No-op updates do not write. Filters, disclosure state and edit drafts are local view state.

Models call interfaces through `widget_invoke({targetID, expectedStateVersion, name, input})`:

- `addTasks({titles:["One", "Two"]})`: add 1–100 titles; trim whitespace and require 1–300 characters each.
- `updateTasks({updates:[{id, title?, done?}]})`: change titles and/or completion for 1–100 distinct task IDs.
- `deleteTasks({ids:[id]})`: delete 1–100 distinct task IDs.
- `listTasks({status?, offset?, limit?})`: status is `active` by default, `completed` or `all`; offset defaults to 0, limit to 50 (maximum 100). Returns the requested page, counts, totalMatched, hasMore and storageVersion.

Mutation responses contain only changed `tasks` (or `deletedIDs`), counts and storageVersion. The host's stateVersion is page state, while storageVersion describes the shared task data. Missing IDs, duplicate IDs and empty updates reject the entire batch. List tasks when needed to get IDs; successful writes do not resend the full list. The former single-task interfaces have been removed; UI and batch interfaces use the same business functions.

This is the initial public `1.0.0` source package, requiring format 2, protocol 24 and SDK 1. Prerelease widget packages have been removed from the repository. This distribution reset does not delete or rewrite installed development items or their task data. See the [development guide](../../../docs/widget-development.md); use `package-widget shared-todo --dev` during development and only create a formal release after acceptance.

## Eight-language update · 1.0.2

Follows Pudding in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German and French. Unsupported locales and missing entries fall back to English. Language changes preserve saved content and active game state; existing notification receipts retain their original text. Published older packages remain unchanged for older SDK hosts.
