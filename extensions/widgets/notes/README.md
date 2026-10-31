# Sticky Notes (多彩便签)

A lightweight, color-coded sticky notes widget with 5 clean note colors (yellow, pink, green, blue, purple), pinning support, drag-and-drop reordering, real-time keyword search, inline editing, and atomic storage operations. The UI follows Pudding's light/dark theme and supports Simplified Chinese, Traditional Chinese, and English live.

Existing data stays in item storage as `notes: [{id, content, color, pinned, createdAt, updatedAt}]`. Every opening of the same item reads the same storage; copies remain independent. A mutation reads once, validates the whole batch, then performs one version-checked write.

Models call interfaces through `widget_invoke({targetID, expectedStateVersion, name, input})`:

- `addNotes({notes:[{content, color?, pinned?}]})`: add 1–100 sticky notes.
- `updateNotes({updates:[{id, content?, color?, pinned?}]})`: update content, color or pin status for 1–100 notes.
- `togglePin({id})`: toggle pin status for a note.
- `reorderNotes({orderedIds:[id]})`: reorder sticky notes.
- `deleteNotes({ids:[id]})`: delete 1–100 distinct notes.
- `clearNotes({})`: clear all notes.

This is the `1.0.0` release package, requiring protocol 24 and SDK 1.

## Eight-language update · 1.0.1

Follows Pudding in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German and French. Unsupported locales and missing entries fall back to English. Language changes preserve saved content and active game state; existing notification receipts retain their original text. Published older packages remain unchanged for older SDK hosts.
