# Widget development

Widgets use React source packages and the fixed `@pudding/widget` SDK. The platform supplies generic page inspection/input, optional typed interfaces, page state, item storage, participant binding and notifications. It does not define game rules.

See the [complete Chinese contract and examples](widget-development.zh-CN.md). The runtime sources are [Shared Todo](../widgets/shared-todo/source/src/App.tsx), [Gomoku](../widgets/gomoku/source/src/App.tsx) and [Rock Paper Scissors](../widgets/rps-decider/source/src/App.tsx).

- `state` is public per-guest state and resets on close/reload. `storage` is persistent per-item JSON shared by all openings; copies are independent. Both use version checks. Never silently retry a conflicting write.
- Native form submission is disabled by the sandbox. Use `type="button"` and an Enter handler that prevents the default and invokes the same save function.
- The author may define interfaces with Zod input schemas. UI handlers and interfaces call the same business logic. DOM handlers use `interaction.handle` to retain the trusted actor across asynchronous work. Validate roles from `context.actor`, never trust identity in business arguments.
- `interaction.start({roles})` asks the user to bind explicit participants. Visible sessions are not implicit members.
- Notifications independently choose all/selected participants and inform/request-action delivery. IDs are immutable and deduplicated. `setRequests` retains only still-valid requests; cleared requests cannot be revived by resending an old notification. Turn completion is not business completion.
- Keep unrevealed choices out of public state, DOM, logs, notifications and interface results. A widget author/debugger is not an adversarial isolation boundary.

Package identity and requirements belong in `widgets/<name>/manifest.json`; editable files live under `source/`, including `widget.json`. Runtime dependencies are fixed; no package manager, build scripts, external modules or HTML runtime bundle. Format 2 wraps the source plus a SHA-256 inventory. The registry pins complete package bytes.

Set `PUDDING_CORE_DIR` to the compatible Core checkout and run `pnpm package-widget <name> --dev`, then `pnpm test`. The packager invokes Core's installation validator. Bump the version before formal packaging; published bytes are immutable. The development output never changes the registry.

Installation creates a normal Studio item with source provenance. Reinstall opens it. Only the LLM editing workflow forks downloaded originals, snapshotting current persistent data into an independent item. Upgrades refuse local edits and stage a new head without changing active rules or storage. Preview/activate through version history. Restore archived installations before reinstalling.

### Widget artwork

The optional `icon` in `manifest.json` points to `./assets/<name>.svg`. The packager embeds the same SVG as a base64 image in the registry and source package; Core limits it to 16 KiB and stores it with the installed item. Catalog cards, tabs and the Studio sidebar share this icon, including offline. Existing release bytes remain immutable: bump the version when adding or changing artwork. SVGs are displayed only as images, never injected into the host DOM.
