# Widget development

[中文](widget-development.zh-CN.md) · [Developer documentation](README.md) · [SDK reference](widget-sdk.md)

Widgets are editable React/TypeScript source packages. The host provides compilation, data access and model interaction; authors own the interface and business rules. A widget does not need a plugin unless it accesses an external service.

## First widget

Create these files in Hub:

```text
widgets/counter/
  manifest.json
  source/widget.json
  source/src/App.tsx
```

`manifest.json` is catalog metadata:

```json
{
  "id": "teatak/pudding-hub/widgets/counter",
  "version": "1.0.0",
  "title": {"en": "Counter", "zh-CN": "计数器", "zh-TW": "計數器"},
  "description": {"en": "A page counter.", "zh-CN": "页面计数器。", "zh-TW": "頁面計數器。"},
  "requires": {"protocolVersion": 24, "sdkVersion": "1"}
}
```

`source/widget.json` is the runtime contract:

```json
{
  "schemaVersion": 1, "sdkVersion": "1", "entry": "src/App.tsx",
  "sources": {}, "operations": {}
}
```

`source/src/App.tsx` exports a React component:

```tsx
import { useState } from 'react';
import { pudding, useWidgetLocale, useWidgetState } from '@pudding/widget';

export default function App() {
  const snapshot = useWidgetState();
  const locale = useWidgetLocale();
  const [error, setError] = useState('');
  const count = typeof snapshot.data.count === 'number' ? snapshot.data.count : 0;
  const labels = {
    en: { title: 'Counter', add: 'Add one' },
    'zh-CN': { title: '计数器', add: '加一' },
    'zh-TW': { title: '計數器', add: '加一' },
  }[locale];
  async function add() {
    const current = pudding.state.read();
    const previous = typeof current.data.count === 'number' ? current.data.count : 0;
    try {
      await pudding.state.write({
        expectedVersion: current.version,
        data: { ...current.data, count: previous + 1 },
      });
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  return <main style={{ padding: 24 }}>
    <h1>{labels.title}</h1><output>{count}</output>
    <button type="button" onClick={() => void add()}>{labels.add}</button>
    {error ? <p role="alert">{error}</p> : null}
  </main>;
}
```

This example uses restored page state and follows all three Pudding locales. It does not store business data in localStorage or use a second state copy. Choose durable item storage when the counter must survive explicitly closing its page; see [state and storage](widget-sdk.md#state-and-storage).

## Source and build contract

Use schema 1, SDK `"1"` and a TSX entry under `src/`. Source files may be TS/TSX, CSS, JSON or SVG under allowed `src/`, `assets/` and `fixtures/` paths. There is no widget package manager, custom build script, precompiled HTML, Node/Electron API or arbitrary import. The host provides React, React DOM, TanStack Query, react-hook-form, Zod, Recharts, lucide-react, the fixed `@pudding/widget` SDK and supported `@pudding/ui` components. Do not assume another npm dependency is available.

Current Core source limits are 32 files, 512 KiB per file and 2 MiB total; the distribution envelope is bounded separately. [Core policy](https://github.com/teatak/pudding-core/blob/main/contracts/widget.json) owns limits and host validation. Outer manifest requirements must match the features used; newer native features also require [capability checks](widget-sdk.md#system-notifications).

The host owns the document, sandbox and message bridge. Render/update a subtree instead of `document.open/write/writeln`. Native form submission is blocked: use explicit buttons and prevent Enter's default submit before invoking the same handler. Use readable labels, keyboard-accessible controls, responsive layouts and both color themes.

## Connect plugin data

Declare `sources` as installed plugin IDs and endpoint names, then declare bounded read/write `operations`. See the [SDK query example](widget-sdk.md#plugin-data-and-actions) and [Gmail Board source](../widgets/gmail-board/source/widget.json). Never invent endpoints or embed credentials. The host's source selector owns account binding; widget binding is independent of a conversation's plugin account.

Keep each account's durable data and drafts separate, clear transient selection on account changes and ignore old requests. A source change may rebuild the page binding; it must not apply one account's response to another. Plugin endpoint writes require `widget_writes: true` and user confirmation, not just an author-supplied effect hint.

## Expose useful model operations

Accessible controls work with `widget_observe/click/type/scroll`. For exact or bulk operations register `pudding.defineInterface` with a Zod object schema and a concise description. Models use `widget_invoke` with the current target and state version. Both approaches can coexist.

UI handlers and interfaces should call the same business function. Check trusted `context.actor`, cancellation, versions and business rules; do not accept input fields as proof of identity. Validate a batch before one atomic write. Return a compact receipt and expose long history through a separate optional read interface. See [model interfaces](widget-sdk.md#model-interfaces-and-page-input).

## Participants and the two notification channels

For multiplayer or collaborative workflows, use `interaction.candidates/connect/notify/setRequests` and run controls. The host binds identities and dispatches work; the widget owns seats, readiness and phases. Commit state before sending a model request. The [SDK](widget-sdk.md#participants-and-model-notifications) covers exact arguments, caller scope, notification deduplication and recovery through `onResume`.

`interaction.notify` addresses connected conversations and may request model work. `notifications.show` instead creates an OS notification after an independent runtime permission; it never invokes a model. Ask for that permission while the user enables reminders. Clipboard write permission is separate again. File export uses a system save dialog. See [runtime authorization](widget-sdk.md#runtime-authorization-and-clipboard), [system notifications](widget-sdk.md#system-notifications) and [file export](widget-sdk.md#file-export).

## Validate and package

Use compatible sibling Core and Desktop checkouts and the Node version required by Desktop. Prepare dependencies and create a development package:

```bash
pnpm install
npm --prefix ../pudding-desktop/web ci
PUDDING_CORE_DIR=../pudding-core npm --prefix ../pudding-desktop run core:prepare
PUDDING_CORE_DIR=../pudding-core PUDDING_DESKTOP_DIR=../pudding-desktop pnpm package-widget counter --dev
```

`--dev` writes ignored local output, not a registry release. The packager invokes Core's source-package validator and Desktop's real TypeScript/JS/CSS compiler before writing output; it does not execute widget code. Missing compiler dependencies fail packaging. Use the same Core contracts as the Desktop being tested.

In Pudding, LLM authoring loads `widget-authoring` in Code mode, opens a persistent draft, edits through the built-in `scope:"widget"` file tools, then commits, previews/inspects and activates. Keep the returned widget ID, which may be an editing copy. Reuse the same `clientRequestID` and original arguments after uncertain creation; do not create another item as an error-recovery shortcut. The [Desktop authoring tool](https://github.com/teatak/pudding-desktop/blob/main/web/src/mcp/widgetSourceTools.ts) defines the current tool schema.

Test real host interaction in a temporary profile: UI/model operations, conflicts, reload/storage recovery, account switching, three locales, light/dark themes, cancellation and permission denial. Desktop's `widget-hub` smoke uses `PUDDING_HUB_DIR` for local source fixtures. Run Hub tests with a compatible `PUDDING_CORE_DIR`; individual model/Windows verification is separate. Documentation checks do not need to send mail or alter live accounts.

## Publish and upgrade

A widget release is `pudding.widget.source-package` schema 2 with all source files and their SHA-256 inventory. The registry pins complete package bytes. `manifest.json` carries identity, localized title/description, host requirements and optional self-contained icon; `source/widget.json` carries runtime behavior. The registry determines the current catalog, not a hard-coded first-launch list.

Bump the version before publishing changed bytes. `pnpm package-widget counter` writes the formal package and registry; `pnpm package-widgets` packages all widget directories. Published widget release bytes are immutable. For a preview use a distinct version such as `1.1.0-preview.1` and `"preview": true`; optional `"channel":"preview"` is descriptive. A suffix/channel alone is not the widget preview flag. Settings → Advanced has separate preview switches for widgets and plugins. Disabling previews neither downgrades nor removes an installed preview.

Repeated installation opens the original item. The first LLM edit of a downloaded original creates an independent copy of its source and durable data. Updates require unmodified installed source; local edits are not silently overwritten. A validated update becomes the default source after activation, while already-open pages retain their pinned revision until reloaded. Durable storage survives; page state belongs to its revision. Installed icons belong to the package, and the host manages localized catalog titles.
