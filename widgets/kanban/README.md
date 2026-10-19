# Kanban

A shared, persistent Kanban board with workflow columns (To Do, In Progress, Done), inline card adding and editing, stream-lined movement across columns, per-column card counts, and a clear-completed feature. The UI follows Pudding's light/dark theme and Simplified Chinese, Traditional Chinese or English setting live.

Existing data stays in item storage as `cards: [{id, title, column, description?, createdAt?}]`. Every opening of the same item reads the same storage; copies remain independent. A mutation reads once, validates the whole batch, then performs one version-checked write. Invalid batches write nothing; conflicts are surfaced without automatic retries.

Models call interfaces through `widget_invoke({targetID, expectedStateVersion, name, input})`:

- `addCards({cards:[{title, column?, description?}]})`: add 1–100 cards; title is trimmed and requires 1–300 characters; column defaults to `todo`.
- `moveCard({id, toColumn, targetIndex?})`: move a card to `todo`, `in_progress`, or `done`.
- `updateCards({updates:[{id, title?, column?, description?}]})`: update title, column, or description for 1–100 distinct cards.
- `deleteCards({ids:[id]})`: delete 1–100 distinct cards.
- `clearCompleted({})`: delete all cards in the `done` column in one atomic operation.
- `listBoard({column?})`: list cards optionally filtered by column (`todo`, `in_progress`, `done`, or `all`). Returns `cards`, `counts`, and `storageVersion`.

This is the initial public `1.0.0` source package, requiring format 2, protocol 24 and SDK 1.
