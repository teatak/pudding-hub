# Widget development

[中文](widget-development.zh-CN.md) · [Developer documentation](README.md) · [SDK reference](widget-sdk.md)

A widget is a React/TypeScript interface running in Pudding. It can display data, provide controls and expose business operations to models. Pudding handles compilation, persistence and host permissions; authors build the interface and business rules.

A widget that displays supplied data or runs a local game needs no plugin. To access Gmail, GitHub or another service, install its plugin and use the declared endpoint.

## Choose an authoring workflow

**Create with a model in Pudding** to make or edit your own widget. Enter Code mode, load widget-authoring and follow “open draft → edit → commit → inspect → activate.” See the [model authoring workflow](#model-authoring-workflow).

**Develop and distribute through Hub** to maintain source, tests and installable packages. The counter below demonstrates this workflow. Hub's manifest.json describes distribution; widget.json and the React files are the runtime source.

## First widget

Create these files in Hub:

```text
extensions/widgets/counter/
  manifest.json
  source/widget.json
  source/src/App.tsx
```

### 1. Add package metadata

manifest.json declares the ID, version, display name and minimum host requirements:

```json
{
  "id": "teatak/pudding-hub/widgets/counter",
  "version": "1.0.0",
  "title": {"en": "Counter", "zh-CN": "计数器", "zh-TW": "計數器"},
  "description": {"en": "A page counter.", "zh-CN": "页面计数器。", "zh-TW": "頁面計數器。"},
  "requires": {"protocolVersion": 24, "sdkVersion": "1.1.0"}
}
```

### 2. Declare the entry point

source/widget.json tells Pudding which file to run. The counter has no external service, so sources and operations are empty:

```json
{
  "schemaVersion": 1, "sdkVersion": "1.1.0", "entry": "src/App.tsx",
  "sources": {}, "operations": {}
}
```

### 3. Build the interface

source/src/App.tsx must default-export a React component:

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

Clicking the button saves the count in page state. Refresh restores it; explicitly closing the page clears it. Use storage if the count must survive closing. See [state and storage](widget-sdk.md#state-and-storage). useWidgetLocale keeps the title and button in Pudding's selected language.

### 4. Compile a development package

Prepare compatible sibling Core and Desktop checkouts and the Node version required by Desktop. Run in Hub:

```bash
pnpm install
npm --prefix ../pudding-desktop/web ci
PUDDING_CORE_DIR=../pudding-core npm --prefix ../pudding-desktop run core:prepare
PUDDING_CORE_DIR=../pudding-core PUDDING_DESKTOP_DIR=../pudding-desktop pnpm package-widget counter --dev
```

`--dev` writes to the ignored dev directory without creating a formal release. Packaging runs Core source validation and Desktop's TypeScript/JS/CSS compiler; compilation failure prevents output. This checks whether source builds. Verify actual interaction in Pudding separately.

## Model authoring workflow

Models edit drafts through Pudding tools rather than writing into installation directories:

1. Find existing widgets with widget_list, then create or open a draft with widget_draft_open.
2. Keep the returned widget.id. The first edit of a downloaded widget creates an independent copy; use that copy's ID afterward.
3. Use built-in file tools with `scope:"widget"`, widget_id and relative paths. Edit with builtin_file_patch and the latest expectedDraftHash.
4. Commit with widget_commit, then use widget_inspect to examine compilation, queries, errors and the rendered page. widget_preview can show a candidate first.
5. Fix issues, commit and inspect again. Call widget_activate and confirm activeRevision matches the inspected version before reporting it active.

Creating an item or its first editing copy requires clientRequestID. It identifies one creation intent: after response loss or an uncertain result, reuse the same ID and arguments to avoid duplicates. Continuing an owned item or existing copy does not require another creation.

A draft may be incomplete while editing. File changes do not alter the running page; commit creates a source revision and activation changes the default version. A draft-only request does not require activation. Exact arguments are defined by the [Desktop authoring tools](https://github.com/teatak/pudding-desktop/blob/main/web/src/mcp/widgetSourceTools.ts).

## Source requirements

- widget.json uses schemaVersion: 1, sdkVersion: "1" and a TSX entry under src.
- Source validation accepts TS, TSX, CSS, JSON and SVG in permitted paths, including src, assets and fixtures. Distribute files needed at runtime, without invented business data used for testing.
- Limits are 32 source files, 512 KiB per file and 2 MiB total. See [Core source policy](https://github.com/teatak/pudding-core/blob/main/contracts/widget.json).
- The host provides React, React DOM, TanStack Query, react-hook-form, Zod, Recharts, lucide-react, `@pudding/widget` and `@pudding/ui`. Widgets cannot install npm packages or run their own build scripts.

Import local CSS from the entry. Support narrow panels, both themes and keyboard input. Handle forms through business functions and prevent native submission. Update React content instead of replacing the host document with document.write or similar methods.

## Connect plugin data

Read the installed plugin's real endpoints and Skill before declaring sources and operations in widget.json. Sources identify plugins and endpoints; operations describe queries or writes. See the [SDK data example](widget-sdk.md#plugin-data-and-actions) and [Gmail Board](../extensions/widgets/gmail-board/source/widget.json).

Pudding's source selector manages accounts and credentials, so the widget does not handle tokens. Its account is independent of the chat's plugin account. Keep drafts and workflow state separate per account. Clear selections on changes and ignore unfinished requests from the previous account.

Use action for external writes. The endpoint must declare widget_writes: true, and the host asks for confirmation. On query failure, show the error and a retry control rather than substituting sample data.

## Expose useful model operations

Register operations such as “add a task,” “edit a bar” or “place at H8” with `pudding.defineInterface`. Define clear input and a handler. Models call it through widget_invoke or operate the page with observe, click and related tools.

Use the same business function for buttons and interfaces. For multiplayer work, identify callers through host-supplied context.actor. Validate business rules before mutation and check cancellation after asynchronous work. Validate an entire batch before committing one write.

Return a short receipt describing changes and versions. Expose full histories, scores or large lists through separate read operations. See [SDK model interfaces](widget-sdk.md#model-interfaces-and-page-input).

## Participants and the two notification channels

Use interaction when several conversations participate in a match or task. Pudding handles identities and scheduling; the widget owns roles, readiness and turns. Save business state before notifying.

| Need | API |
| --- | --- |
| Add information to participants' context | interaction.notify with delivery: inform |
| Ask participant models to act | interaction.notify with delivery: request-action |
| Remind the user through the operating system | notifications.show, with separate permission |

Conversation and system notifications have different recipients. System notifications never start a model. Clipboard writing has its own permission, and export uses the system save dialog. See [model collaboration](widget-sdk.md#participants-and-model-notifications), [clipboard](widget-sdk.md#runtime-authorization-and-clipboard), [system notifications](widget-sdk.md#system-notifications) and [file export](widget-sdk.md#file-export).

## Validate and package

Validate a development package in a temporary Pudding data directory before creating a formal release. Check the features the widget actually uses:

- UI and model operations modify the same data and handle conflicts, cancellation and errors.
- Refresh, closing/reopening and upgrades follow the state/storage behavior.
- Account switching, all three languages, narrow panels and both themes work.
- Copy, notification and export flows handle permission refusal and cancellation correctly.

Desktop's widget-hub smoke can read local source through PUDDING_HUB_DIR. Hub tests require a compatible PUDDING_CORE_DIR; compilation also requires a matching Desktop. Record the models and platforms actually tested rather than inferring broader coverage.

## Publish and upgrade

### Stable and preview releases

Packages use pudding.widget.source-package with schemaVersion 2 and contain source, per-file hashes and package metadata. registry.json is the install catalog read by Pudding and records complete package hashes.

Update the version in manifest.json before releasing changed content, then run `pnpm package-widget counter`. Use `pnpm package-widgets` for all widget directories. These commands write releases and registry metadata. Existing published packages cannot be overwritten.

Before publishing a stable update, compile the exact package with the oldest supported Desktop SDK/compiler and check its main interactions with that desktop's locked Core. Compilation on the current development host alone does not establish backward compatibility.

For previews, use a distinct version such as 1.1.0-preview.1 and set `"preview": true` in manifest.json. A version suffix or channel alone does not mark a widget as preview. Users enable widget previews in Settings → Advanced; plugin previews have a separate switch. Turning the switch off does not downgrade or uninstall an existing preview.

To withdraw a broken release, move its catalog release record into that widget's `withdrawn.json` (`{"releases": [...]}`) and add a `reason`. Keep the package at its original URL unchanged. Catalog checks verify withdrawn package hashes too and reject versions listed in both places. Withdrawal stops new catalog installations; it does not remove or downgrade installed copies.

### Updating installed widgets

Repeated installation opens the original item. A model's first edit of a downloaded original copies its source and current storage. The original and copy then remain independent.

Updates do not overwrite locally edited source. A validated, activated version becomes the default, while existing pages continue their original revision until reloaded. Storage persists; state is scoped to its page and source revision. The package supplies installed icons, and the host manages localized item names.

Formal packages and catalogs are written to `extensions/widgets/`; legacy paths remain available. Follow the [SDK version rules](widget-sdk.md#sdk-version-compatibility), without a minimum Pudding version.
