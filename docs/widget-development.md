# Widget development

Widgets use React source packages and the fixed `@pudding/widget` SDK. The platform supplies generic page inspection/input, optional typed interfaces, page state, item storage, participant binding and notifications. It does not define game rules.

See the [complete Chinese contract and examples](widget-development.zh-CN.md). The runtime sources are [Shared Todo](../widgets/shared-todo/source/src/App.tsx) and [Gomoku](../widgets/gomoku/source/src/App.tsx).

- `state` is a durable per-page snapshot, hydrated before author module code. Refresh/crash/restart preserve it; explicit tab close clears it. `state.read()` is synchronous, but always await `state.write(...)` before publishing or returning. Source revisions have separate snapshots. `storage` is persistent per-item JSON shared by all openings; copies are independent. Both use version checks. Never silently retry a conflicting write.
- Native form submission is disabled by the sandbox. Use `type="button"` and an Enter handler that prevents the default and invokes the same save function.
- The author may define interfaces with Zod input schemas. UI handlers and interfaces call the same business logic. DOM handlers use `interaction.handle` to retain the trusted actor across asynchronous work. Use the trusted `context.actor.participantID` to check roles in your own state; never trust identity in business arguments.
- `await interaction.candidates()` returns real sessions, `preferredSessionIDs`, `connectedSessionIDs` and `maxSessions`. Your selector initializes once with `connectedSessionIDs ?? preferredSessionIDs`: Studio defaults to none, a conversation to itself, a split to both sides. Call `interaction.connect({sessionIDs})` to create/update connections; one human and up to 15 sessions. Retained members keep their IDs; removal revokes access and pending work. Connection does not assign roles or wake models. Store roles/readiness in page state, assign roles according to the widget rules, and send invitations for models to confirm readiness through interfaces.
- With protocol 23, each candidate includes `model: {id, name, icon}` (real model ID, display name and a self-contained `data:` brand image), plus `participantID` when connected. Match this ID to public run participants to render player cards. Packages using this metadata must require protocol 23. Candidate reads also work while a widget is hidden/preloading; hidden writes remain restricted.
- Optional notification `summary` is a short localized user-facing description; `message` contains full instructions shown in collapsed details and retained in model context.
- The host supplies notification `targetID`, participant identity and `stateVersion`. Put appropriate public context from the same committed state in `data`, without unrevealed/private inputs. Describe the business goal instead of requiring `widget_observe` before every action. Models with known interfaces and sufficient context may act directly; page observation and read interfaces fill missing context. Version conflicts still require a fresh read and a new decision, never a blind write retry.
- Notifications independently choose all/selected participants and inform/request-action delivery. IDs are immutable and deduplicated. `setRequests` retains only still-valid requests; cleared requests cannot be revived by resending an old notification. Turn completion is not business completion.
- Store recoverable unrevealed choices in page state, which is not automatically exposed by inspection tools. Keep them out of DOM, logs, notifications and interface results. A widget author/debugger is not an adversarial isolation boundary.

Package identity and requirements belong in `widgets/<name>/manifest.json`; editable files live under `source/`, including `widget.json`. Runtime dependencies are fixed; no package manager, build scripts, external modules or HTML runtime bundle. Format 2 wraps the source plus a SHA-256 inventory. The registry pins complete package bytes.

Set `PUDDING_CORE_DIR` to the compatible Core checkout and run `pnpm package-widget <name> --dev`, then `pnpm test`. The packager invokes Core's installation validator. Bump the version before formal packaging; published bytes are immutable. The development output never changes the registry.

Installation creates a normal Studio item with source provenance. Reinstall opens it. Only the LLM editing workflow forks downloaded originals, snapshotting current persistent data into an independent item. Upgrades refuse local edits and make the successfully built new source the default. Existing pages remain pinned; newly opened pages use the new version. Old pages offer an explicit reload with a page-state warning; durable storage is retained. Restore archived installations before reinstalling.

### Widget artwork

The optional `icon` in `manifest.json` points to `./assets/<name>.svg`. The packager embeds the same SVG as a base64 image in the registry and source package; Core limits it to 16 KiB and stores it with the installed item. Catalog cards, tabs and the Studio sidebar share this icon, including offline. Existing release bytes remain immutable: bump the version when adding or changing artwork. SVGs are displayed only as images, never injected into the host DOM.

Gomoku sends its final result with `audience: {kind: "all"}` and `delivery: "request-action"`, so each conversation participant processes the result once. The card says “Notified everyone”; ordinary `inform` broadcasts remain passive.

Restored interactions create a new paused run and revoke old targets. Register `pudding.interaction.onResume(async () => { ... })` to derive only currently valid requests from saved state after the user continues. Never replay old receipts or completed results; do not bind persisted business data to an ephemeral run ID. Authors may call `interaction.pause()/resume()/disconnect()` and render their own controls. Pause affects model execution only. Disconnect retains page state. The host does not render game controls.

The initial catalog contains Todo and Gomoku 1.0.0, requiring protocol 24. Unreleased widget history was reset once before production; future formal release bytes remain immutable. Development builds use `--dev` and do not accumulate catalog releases.

For a distributed preview release, use a distinct version such as `1.1.0-preview.1` and set `"preview": true` in `manifest.json`; optional `"channel": "preview"` is descriptive metadata. The packager preserves these fields in both the source package and registry release. As with plugins, `preview` is the authoritative flag; a version suffix or channel alone does not opt a release into preview filtering. Desktop hides previews by default. Settings → Advanced → Show widget preview versions enables their selection independently of plugin previews. Disabling it never downgrades or removes an installed preview; a newer stable release can replace it while preserving item data. `--dev` remains local-only and does not publish a preview.

## Follow the application language

Packages requiring protocol 24 can read `pudding.locale.read()` and subscribe with
`pudding.locale.subscribe(listener)`, or call `useWidgetLocale()` in React. The
host supplies `zh-CN`, `zh-TW` or `en` before module initialization and updates it
without remounting the page. Use this instead of `navigator.language`; keep
interface names, JSON fields and coordinate values language-independent. Installed
item names need not change when the user changes language.
