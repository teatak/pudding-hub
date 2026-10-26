# Widget SDK reference

[中文](widget-sdk.zh-CN.md) · [Developer documentation](README.md) · [Widget development](widget-development.md)

Import the fixed host SDK with `import { pudding } from '@pudding/widget'`. This reference covers the public SDK 1 surface. The [runtime TypeScript declarations](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs) define exact types; Core validates source manifests and external operations.

## Capability map

| API | Purpose |
| --- | --- |
| `state.read/write/subscribe`, `useWidgetState` | Current page state |
| `storage.read/write/subscribe`, `useStorage` | Durable data shared by openings of one item |
| `query`, `useQuery` | Declared plugin reads |
| `action`, `useAction` | Declared external writes with host confirmation |
| `defineInterface` | Typed operations callable by a model |
| `interaction.*`, `useWidgetInteraction` | Participants, model notifications and run control |
| `locale.read/subscribe`, `useWidgetLocale` | Follow Pudding's language |
| `clipboard.writeText` | Authorized text copying |
| `notifications.getPermission/requestPermission/show` | Authorized system notifications |
| `exportFile`, `capabilities` | Native save dialog and feature detection |
| `links.list/create/remove` | Links between entities from bound sources |
| `requestAgent` | User-confirmed handoff to a selected conversation |

## Host UI components

Import the fixed components from `@pudding/ui`; there is no arbitrary component-path import or package installation. The host exposes Button, Card, Input, Textarea, Badge, Table, Separator and Label families, plus these higher-level components:

| Component | Props |
| --- | --- |
| `Document` | `title?`, `children` |
| `DataTable` | `title?`, `columns: {key,label}[]`, `rows: Record<string,unknown>[]`, `exportName?` |
| `ChartView` | `title?`, `rows`, `xKey`, `series: {key,label?,color?}[]`, `type?: 'bar' \| 'line'` |

`Document` is a layout wrapper, not a saved Studio Page. `DataTable` displays supplied rows; `exportName` adds CSV export through the native save API. It does not create a Studio Sheet. `ChartView` defaults to a bar chart with a 320-pixel chart height. These components do not fetch or persist data themselves. Exact component props are in [WidgetComponents](https://github.com/teatak/pudding-desktop/blob/main/electron/WidgetComponents.tsx).

Import widget CSS from the TSX entry. The compiler scans source classes for Tailwind utilities. Its default color tokens are light; authors must style and verify both themes rather than assuming a complete automatic theme adaptation. Avoid hard-coded dimensions that break a narrow panel.

## State and storage

Both store a JSON object and use `{ version, data }` snapshots. JSON values are null, booleans, finite numbers, strings, arrays and records of JSON values. Use null for absent values; do not put undefined, functions, Date objects or secrets in public results.

`state.read(): DataSnapshot` is synchronous and returns the restored, frozen page snapshot. `await state.write({expectedVersion, data})` replaces the complete object after the host commits it, then returns the new snapshot. `state.subscribe(listener)` returns an unsubscribe function. `useWidgetState()` subscribes in React.

Page state survives refresh/crash/restart while its page exists; explicitly closing the page clears it. It is isolated by source revision and page identity. `storage.read({signal?})` is asynchronous; `storage.write({expectedVersion,data})` is also a complete replacement. `storage.subscribe(listener)` and `useStorage()` observe durable item data, shared across openings and preserved through upgrades. A copied item receives an independent data snapshot. Storage is currently limited to 256 KiB by Core policy.

```ts
const current = pudding.state.read();
await pudding.state.write({
  expectedVersion: current.version,
  data: { ...current.data, completed: true },
});
```

On conflict, reread and reconsider the operation; do not blindly retry an overwrite. Await the write before sending a notification or reporting success. Use `useState` only for temporary controls, and avoid localStorage as a second business store. Inspection does not automatically expose state, but authors/debuggers are not an adversarial isolation boundary.

## Plugin data and actions

Declare source slots and operations in `widget.json`:

```json
{
  "schemaVersion": 1,
  "sdkVersion": "1",
  "entry": "src/App.tsx",
  "sources": {"gh": {"pluginID": "github", "endpoint": "github_rest"}},
  "operations": {
    "viewer": {
      "source": "gh", "kind": "rest", "effectHint": "read",
      "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
      "request": {"method": "GET", "path": "/user"}
    }
  }
}
```

`query<T>(operationID, params?, {signal?}?)` returns `{data:T, fetchedAt, requestID, revisionHash, bindingVersion}`. IDs name declared operations, not arbitrary URLs. Request templates may map `{"$input":"/id"}` into declared path parameters, query or body fields; inspect the actual plugin API before writing them. Credentials and connection-specific addresses are resolved by Core, not passed through widget code.

`useQuery<T>(operationID, params?, {enabled?}?)` returns a TanStack Query result. It reads while visible, uses infinite stale time, and does not refetch automatically on focus, reconnect or remount. Its legacy `refreshMS` option is ignored; explicitly schedule `refetch()` in widget code when appropriate. `useStorage()` instead refreshes durable data while visible, including a five-second interval.

The hooks retain loading/error states and their result envelopes: `useQuery<T>(...).data?.data` is the service payload; `useStorage().data?.data` is the stored JSON object. Do not treat a pending or failed read as an empty successful result.

`action(operationID, params?)` returns the executed operation result after the host's preparation and user confirmation. `useAction(operationID)` returns a mutation. Declaring a write does not grant execution: the plugin endpoint must opt in with `widget_writes: true`, and host approval still applies. A read hint cannot authorize a write.

Select resource connections through the host's source selector. Plugin chat bindings and widget resource bindings are independent. When accounts change, partition durable drafts by a stable account identity, reset page selection, and discard stale responses. Never embed API keys or use direct fetch to bypass a source binding.

## Model interfaces and page input

`defineInterface({name, description, input, run})` registers an operation and returns its unregister function. `input` is a Zod object schema; `run(input, context)` may be asynchronous. Register once, or return the unregister function from a React effect.

```ts
import { z } from 'zod';

const unregister = pudding.defineInterface({
  name: 'readSummary', description: 'Read the current completion status.',
  input: z.object({}).strict(),
  run: () => ({ completed: pudding.state.read().data.completed === true }),
});
```

Models call `widget_invoke` with `{targetID, name, input, expectedStateVersion}`; the host supplies the caller identity and rejects stale versions before executing the handler. The result contains `{result, stateVersion}`. `context` includes `callID`, `signal`, optional `sessionID`, and optional `actor:{runID,participantID,notificationID?}`. Check cancellation and business rules before writing; never trust a role/session supplied in input as the caller's identity.

Accessible page controls are also operable with `widget_observe/click/type/scroll`; interfaces are optional. Observe defaults to compact information, not every control or a screenshot. Models can use a read interface or observation to obtain missing state. Wrap asynchronous DOM actions in `interaction.handle(context => ...)` to retain the host's actor scope; interface handlers already receive it.

Interface names start with a letter and contain up to 64 letters/digits/underscores. There are at most 64 interfaces, descriptions are at most 2000 characters, schemas at most 16,000 serialized characters and results at most 256 KiB. Keep writes atomic and return a concise receipt; expose large histories through separate read interfaces.

## Participants and model notifications

`interaction.read()` returns `WidgetRun | null`; `interaction.subscribe(listener)` and `useWidgetInteraction()` observe the public run. A run includes identity, status, participants and notification receipts. Model and human participants have host-owned IDs; business roles belong to your state.

`await interaction.candidates()` returns `{sessions, preferredSessionIDs, connectedSessionIDs, maxSessions}`. Each session includes `{id,name,participantID?,model:{id,name,icon}}`. Initialize a selector once with `connectedSessionIDs ?? preferredSessionIDs`: Studio defaults to none, a conversation to itself, and a split to both sides. `connect({sessionIDs})` creates/updates the explicit run, with up to 15 conversations and one human. Connecting does not assign seats or wake a model.

`interaction.notify(notification)` accepts:

```ts
{
  id: 'round-1-result',
  audience: { kind: 'all' }, // or {kind:'selected',participantIDs:[...]}
  delivery: 'inform',       // or 'request-action'
  topic: 'result', summary: 'Round finished', message: 'The round is complete.',
  data: { round: 1 }
}
```

`inform` records context without calling a model; `request-action` requests work from the selected participants. These are conversation notifications, separate from system notifications. The host adds target, identity and current state version. Commit business state first, use stable notification IDs, and keep the same ID/content immutable. Include only appropriate public data, never unrevealed choices or credentials.

`setRequests([{notificationID,participantID}, ...])` keeps exactly the request keys still valid. Clearing one cancels pending work; resending an old notification does not recreate a cleared request. `pause()` and `resume()` control automatic model execution; `disconnect()` removes connections without deleting business data. `onResume(handler)` returns an unregister function; use it to regenerate currently valid requests after a restored paused run. Old target/run IDs and receipts are not durable business identities.

## Language

`locale.read()` returns `zh-CN`, `zh-TW` or `en`; `locale.subscribe(listener)` returns an unsubscribe function. `useWidgetLocale()` follows changes without reloading the widget. Translate UI text, errors, model-visible descriptions and notification summaries. An installed widget's host-managed title/icon is separate from its inner UI.

## Runtime authorization and clipboard

Authorization is per installed item and capability, separate from accounts and business data. The host shows an in-app dialog with Deny/Allow at first use; both decisions persist. Manage them through the widget's **⋯ → Permissions** menu. Existing widgets begin unasked for a newly introduced permission.

`await clipboard.writeText(text)` copies text, up to 256 KiB. Clipboard reading is prohibited; user-initiated paste remains normal input. Denial rejects with `permission_denied: clipboard.write` and is not a fatal runtime error. Only report successful copying after the Promise resolves. The host also gates browser async and legacy copying; new widgets should use the SDK Promise.

Initial denial closes quietly. A later user action blocked by a saved denial gets a compact neutral permission bar with Manage permissions and Close. Background retries stay quiet. The switch conveys the decision without duplicate Allowed/Denied labels.

## System notifications

`capabilities.systemNotifications` detects the host API. Use `notifications.getPermission()` or `requestPermission()` to read/request `prompt | granted | denied`; the permission is independent of clipboard writing. Request it when the user enables reminders while the widget is visible.

```ts
if (pudding.capabilities.systemNotifications) {
  const permission = await pudding.notifications.requestPermission();
  if (permission === 'granted') {
    await pudding.notifications.show({
      title: 'Timer finished', body: 'Time for a break.', tag: 'focus-timer',
    });
  }
}
```

`show({title, body?, tag?})` accepts 1–120 characters in title, up to 1000 in body and a nonempty tag up to 80 characters. A tag replaces an earlier notification from the same item. The host prefixes the widget name and limits delivery to one notification per item every three seconds. Clicking returns to the original widget/conversation mount without starting a model.

The result is `{shown:true}` after a native delivery acknowledgement, or `{shown:false,reason}` with `permission_denied`, `permission_required`, `rate_limited`, `unavailable`, `closed` or `delivery_failed`. Denial is a normal result, not an exception. Invalid input throws a short validation error before permission is requested.

An authorized running widget can notify while hidden. A new hidden widget cannot open a permission prompt; `show` returns `permission_required`. Closing/reloading the instance or revoking permission closes its outstanding notifications. There is no service that continues a widget's timers after closing. OS notification settings and Focus/Do Not Disturb still apply; `shown` does not prove the user read a notification. Use this SDK instead of browser `new Notification`. Older hosts report the capability as false and return `unavailable` from `show`.

## File export

`capabilities.binaryFileExport` detects native file export support. `exportFile({filename,content,encoding?})` opens the system save dialog and returns `{saved:boolean}`. Default encoding is `utf8`; `base64` supports binary content up to 8 MiB decoded. The filename is a suggestion, not permission to write arbitrary paths. Cancellation is normal. Project JSON and WAV exports use this same generic API; there is no widget-specific filesystem access.

Use a file input/FileReader for a user-selected import, validate the complete project before replacing state, and do not let import/export progress change the editor's structure. Download navigation cannot substitute for the native export capability.

## Entity links and conversation handoff

`links.list()` returns `{links}`. `links.create({left,right})` accepts each side as `{source,entityType,entityID}` using declared source slots; the host resolves plugin and account identities. Stored links include `id,itemID,left,right,createdAt`. `links.remove(linkID)` removes a link. Creation/removal use host confirmation; do not silently change associations when a source account changes.

`requestAgent({prompt,context?})` opens a user-confirmed handoff to a chosen conversation and returns its host result as unknown. Keep context JSON-compatible and small. It is distinct from an explicitly connected run's `request-action` notifications, and system notifications never imply permission to invoke a model.

## Sandbox and errors

The widget has no daemon token, Node/Electron API, arbitrary network fetch, clipboard read or filesystem path access. Use declared plugin operations and host capabilities. HTTPS images follow host loading policy; that is not general network permission. Forms cannot perform native submits. Do not replace the host-owned document with `document.open/write/writeln`; update the React/DOM subtree instead.

Source/build/runtime failures use the host's short, expandable, scrollable, copyable and dismissible error bar. Closing a message does not reload the widget; a different new failure may reappear. Validation, authorization denial and business outcomes should have concise, actionable results rather than repeated full JSON or full datasets.
