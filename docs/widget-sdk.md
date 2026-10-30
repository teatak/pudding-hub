# Widget SDK reference

[中文](widget-sdk.zh-CN.md) · [Developer documentation](README.md) · [Widget development](widget-development.md)

The SDK is Pudding's interface for widgets. Import `pudding` from `@pudding/widget`; methods such as state and query below belong to that object. Import React hooks whose names start with use separately from the same package.

Start with the [counter example](widget-development.md#first-widget) if this is your first widget. Use this reference to look up individual features. Exact types are in the [SDK declarations](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs).

## Capability map

| Need | API |
| --- | --- |
| Reuse buttons, tables and charts | `@pudding/ui` |
| Save the current page's state | `state`, `useWidgetState` |
| Keep data after closing the page | `storage`, `useStorage` |
| Read an external service | `query`, `useQuery` |
| Change data in an external service | `action`, `useAction` |
| Let a model call business operations | `defineInterface` |
| Coordinate conversations and request model work | `interaction`, `useWidgetInteraction` |
| Follow Pudding's language | `locale`, `useWidgetLocale` |
| Copy text | `clipboard.writeText` |
| Send OS notifications | `notifications` |
| Save text or binary files | `exportFile` |
| Link records from different services | `links` |
| Ask the user to choose a conversation for a task | `requestAgent` |

## Host UI components

Import from `@pudding/ui`. Available families include Button, Card, Input, Textarea, Badge, Table, Separator and Label, including their child components. Three composed components are also available:

| Component | Props | Behavior |
| --- | --- | --- |
| `Document` | `title?`, `children` | Lay out a title and body |
| `DataTable` | `title?`, `columns: {key,label}[]`, `rows: Record<string,unknown>[]`, `exportName?` | Display rows; exportName enables CSV export |
| `ChartView` | `title?`, `rows`, `xKey`, `series: {key,label?,color?}[]`, `type?: 'bar' \| 'line'` | Display a bar or line chart; defaults to bar, with a height of 320 pixels |

These components display supplied data. They neither fetch nor persist it and do not create Studio Pages or Sheets. See [WidgetComponents](https://github.com/teatak/pudding-desktop/blob/main/electron/WidgetComponents.tsx) for exact props.

Import custom CSS from the TSX entry. The compiler generates Tailwind styles from class names found in source; avoid building unscannable class names at runtime. Default color variables use light values, so author and check dark styles as well.

## State and storage

Choose a store according to how long the data must survive:

| | `state` | `storage` |
| --- | --- | --- |
| Suitable data | Page filters, temporary edits, a game's progress | Tasks, songs and account-specific drafts |
| Owner | Running page and its source revision | Widget item in Studio |
| Refresh or app restart | Restored while the page still exists | Preserved |
| Explicit page close | Cleared | Preserved |
| Independent pages of the same item | Separate | Shared |
| Copy to a new item | A separate page state | Snapshot copied, then independent |

Both store a JSON object and return `{version, data}`. version detects write conflicts; data is the complete object. Values may be null, booleans, finite numbers, strings, arrays or JSON objects. Omit missing properties or use null; do not pass undefined, Date instances or functions.

| Method | Result |
| --- | --- |
| `state.read()` | Synchronous `DataSnapshot` |
| `state.write({expectedVersion, data})` | Promise of the new committed snapshot |
| `state.subscribe(listener)` | Unsubscribe function |
| `useWidgetState()` | Page snapshot that updates with state changes |
| `storage.read({signal?})` | Promise of the durable snapshot |
| `storage.write({expectedVersion, data})` | Promise of the new committed snapshot |
| `storage.subscribe(listener)` | Unsubscribe function |
| `useStorage()` | TanStack Query result with loading state, error and snapshot |

A write **replaces the whole data object**. Preserve other fields when changing one:

```ts
const current = pudding.state.read();
await pudding.state.write({
  expectedVersion: current.version,
  data: { ...current.data, completed: true },
});
```

A stale version is rejected. Read again, reconcile the requested change and submit it. State and storage writes are separate commits, not one transaction. Each store currently has a 256 KiB limit.

The host restores state before loading author code. Initialize defaults only when saved data is absent. useStorage refreshes every five seconds while visible and responds to host data changes. Do not write an empty object back while a read is pending or has failed.

Open pages may keep running old source after an update, so consider them when changing the storage format. Source upgrades do not migrate business data automatically. Return only the data needed by the public UI or interface; keep connection credentials out of widget data.

## Plugin data and actions

### Declare sources and requests

Give a plugin endpoint a local name in widget.json sources, then declare callable requests in operations. This example names the GitHub source gh and defines a viewer query:

```json
{
  "schemaVersion": 1,
  "sdkVersion": "1.1.0",
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

The widget calls `query('viewer')`; the host sends the request using the selected GitHub connection. The widget never receives its token. pluginID is the runtime ID, such as github, rather than a catalog ID with a repository prefix.

Use JSON Pointer values such as `{"$input":"/id"}` for dynamic inputs. Declare URL parameters in pathParams; query and body fields can also reference inputs. Follow the plugin's actual API. An operationID cannot be replaced with an arbitrary URL.

### Read and refresh

`query<T>(operationID, params?, options?)` returns a Promise. options accepts `{signal}` for cancellation. The result is `{data:T, fetchedAt, requestID, revisionHash, bindingVersion}`, with the service response in data.

`useQuery<T>(operationID, params?, {enabled?}?)` returns a TanStack Query result. Access the service payload through `result.data?.data`; the outer result also provides isPending, isFetching, error and refetch.

The hook reads when visible and enabled is not false. It does not automatically refresh on focus, reconnect, remount or action completion, and has no polling schedule. Call refetch explicitly when needed; the legacy refreshMS option is ignored. Refreshing reads the service without invoking a model.

### Write and switch accounts

`action(operationID, params?)` prepares the operation, asks for user confirmation and returns an action record. `useAction(operationID)` provides the corresponding mutation. Check the record's `state` field for `succeeded`, `failed` or `unknown`; do not report an unknown outcome as success or retry it blindly.

External writes also require `widget_writes: true` on the plugin endpoint. effectHint is part of the operation declaration, not a way around plugin or host restrictions.

The host's source selector manages accounts independently of a chat's plugin binding. Partition durable data and drafts by stable account identity. On account changes, clear the current selection and ignore earlier requests so old responses cannot be written into the new account's data.

## Model interfaces and page input

Use `pudding.setInstructions(text)` to describe this widget's purpose, roles, rules, workflow and completion conditions. The host returns that string as `instructions` in every authorized `widget_observe({targetID, ...})` result, independently of `include`. The MCP connection itself has no selected widget; an external agent learns this guidance only after the user selects it in a widget and starts participation. Joining, waiting and leaving are explained by the MCP server, not by individual widgets. See [External widget MCP](widget-mcp.md).

```ts
pudding.setInstructions('Review only the items assigned to your role. Finish when every item is reviewed.');
```

Instructions are optional, limited to 12,000 characters, local to the running page and empty when not provided. Passing `''` clears them. They are runtime metadata: declare them at initialization and update on locale changes; they do not modify state or storage. They describe the activity and do not override user instructions or host permissions. Feature-detect `setInstructions` when supporting older SDK 1 hosts; older compiled widgets without this field continue to work.

Models can operate page controls or call interfaces you define. Interfaces are useful for precise or batch operations; every button does not need its own interface.

`defineInterface({name, description, input, run})` registers an operation and returns an unregister function. input is a Zod object schema; run returns a value or Promise. Unregister interfaces created in a React effect when the component unmounts.

```ts
import { z } from 'zod';

const unregister = pudding.defineInterface({
  name: 'readSummary', description: 'Read the current completion status.',
  input: z.object({}).strict(),
  run: () => ({ completed: pudding.state.read().data.completed === true }),
});
```

Models call `widget_invoke({targetID, name, input, expectedStateVersion})` and receive `{result, stateVersion}`. The host checks the page version before running the handler. This does not cover storage: durable writes still require reading its version and passing expectedVersion.

The handler's context contains callID, signal and optional sessionID and actor. In a shared run, actor is `{runID, participantID, notificationID?}` supplied by the host. Use it to check roles instead of trusting an identity supplied in input. Check signal after asynchronous work, before writing.

UI buttons and model interfaces should call the same business function. Wrap asynchronous buttons that need participant identity with `interaction.handle(context => ...)`; interface handlers already have that context.

Models may also use `widget_observe/click/type/scroll`. Observe omits controls and screenshots by default; request them when needed. Return short operation results and expose large histories through a separate read interface.

Limits: names start with a letter and contain at most 64 letters, digits or underscores; at most 64 interfaces; descriptions up to 2000 characters; serialized input schemas up to 16,000 characters; results up to 256 KiB.

### Declaring model-visible text (SDK 1.2.0)

Set `widget.json.sdkVersion` to `"1.2.0"` when using `modelOutput`. It is host
presentation metadata, not an input argument. The developer setting **Tool result
text expansion** defaults off; when enabled, the host expands declared strings
inside the same tool result, with an ID, source pointer and optional title. Raw
results and `stateVersion` remain available. No extra model message is created.

```ts
pudding.defineInterface({
  name: 'readBoard', description: 'Read the current board.',
  input: z.object({}).strict(),
  modelOutput: { version: 1, textFields: [
    { path: '/board/text', title: 'Board', overflow: 'whole' },
  ] },
  run: () => ({ board: { text: 'A B\n. .\n' } }),
});
```

Paths use JSON Pointer (RFC 6901), relative to the handler's returned value. The
SDK rebases them under `/result`. Multiple fields may be declared; `each: '/items',
path: '/text'` expands one field per array item. `optional: true` allows absence,
not null or the wrong type. `overflow: 'whole'` displays the entire text or an
explicit omission with readback; the default `'excerpt'` permits a marked preview.
Declaration errors do not turn an already-completed action into a failed action.

For notifications, put the declaration next to `data` in the notice passed to
`interaction.notify`, using `path: '/data/board/text'` for the same board. Internal
notices retain their original message role and trigger; external `widget_wait`
rebases each declaration to `/notifications/<index>/data/board/text`. Do not parse
or replace `\n` yourself: real line breaks are decoded once, while literal escape
sequences stay literal. Standard MCP text is readable, and raw structured data is
retained; another client's final text/structured-content combination is its choice.

## Participants and model notifications

### Select conversations

Visible split conversations can share the current page. Use interaction when the widget needs an explicit set of participants and action requests, such as a match or collaborative task.

`interaction.candidates()` returns `{sessions, preferredSessionIDs, connectedSessionIDs, maxSessions}`. Each session contains `{id, name, participantID?, model:{id,name,icon}}`.

External MCP candidates additionally expose `kind: "external"` and `connected: boolean`. They use the host's icon and a self-reported `Model name (MCP)` label, or MCP when no model was reported. Offline entries remain visible until the user removes them or the agent explicitly leaves. Subscribe with `interaction.onCandidatesChanged(listener)` and re-read candidates to reflect connection/profile changes; the returned function unsubscribes. A user-facing removal button may call `interaction.removeCandidate({id})` for an external candidate. Removing a connection does not change the board or run participants. Agents use the separate `widget_disconnect` MCP tool to leave their own connection. Feature-detect these SDK methods for older hosts.

Initialize a selector once with `connectedSessionIDs ?? preferredSessionIDs`: Studio defaults to none, a conversation to itself, and a split to both sides. Preserve an existing empty selection. Do not reapply defaults on focus changes.

`interaction.connect({sessionIDs})` creates or updates a run with up to 15 conversations and one human participant. The host assigns participantIDs; the widget assigns business roles such as stone colors and readiness. Connecting alone does not invoke a model.

`interaction.read()` returns `WidgetRun | null`; `interaction.subscribe(listener)` returns an unsubscribe function; `useWidgetInteraction()` provides the React hook. WidgetRun includes run status, participants and notification receipts.

### Send notifications

```ts
{
  id: 'round-1-result',
  audience: { kind: 'all' }, // or {kind:'selected',participantIDs:[...]}
  delivery: 'inform',       // or 'request-action'
  topic: 'result', summary: 'Round finished', message: 'The round is complete.',
  data: { round: 1 }
}
```

Pass that object to `interaction.notify(notification)`. delivery determines its purpose:

- `inform` adds context to conversations without starting a model.
- `request-action` requests model work. A busy conversation waits rather than being interrupted.

audience all includes the sender; selected addresses the given participantIDs. Use summary for a short display message, message for the task and data for necessary public context. The host adds targetID, participant identity and the current stateVersion.

Commit business state before notifying. Use a stable ID and identical content when retrying the same event; use a new ID for a new event. Avoid repeating full history or requiring observe before every action. Directed delivery does not make data on a shared page private.

### Complete, pause and resume

`interaction.setRequests([{notificationID, participantID}, ...])` states which existing action requests remain valid. Remove the completed request while preserving other pending ones; [] clears them all. Resending an old notification cannot restore a cleared request.

`pause()` suspends automatic model execution, `resume()` continues it, and `disconnect()` removes participants and cancels pending work while keeping business data. The widget decides whether human edits are allowed during a pause.

After a page refresh or app restart, a run is restored paused. Register `onResume(handler)` to derive fresh outstanding requests from current business state; it returns an unregister function. Do not replay completed results or use a runID as a permanent business identity.

Runs have no elapsed-time pause limit. Manual pause/resume and the limit on 200 automatically started internal model turns remain; external MCP actions do not count toward that turn limit.

## Language

`locale.read()` returns zh-CN, zh-TW or en; `locale.subscribe(listener)` returns an unsubscribe function. In React, use `useWidgetLocale()` to respond to language changes without reloading.

Translate UI text, errors, interface descriptions and notification summaries. The host manages the installed item's Studio title; authors translate the widget's own content.

## Runtime authorization and clipboard

Permissions are stored per widget item and capability, independently of account connections. Pudding asks Deny/Allow at first use, with no one-time option. Decisions persist and can be changed in **⋯ → Permissions**. Existing widgets also need authorization when first using a new permission.

`clipboard.writeText(text)` returns a Promise and accepts up to 256 KiB. Report successful copying only after it resolves. Programmatic clipboard reading remains prohibited; user-initiated paste is normal input.

Refusal rejects with `permission_denied: clipboard.write`. Treat it as a permission outcome without adding a red runtime error. The initial denial closes the dialog. A later blocked user action shows a neutral bar with Manage permissions and Close; background retries stay quiet.

Use the SDK for new widgets. The host also controls browser copying, but a legacy synchronous copy API cannot accurately report the result of asynchronous authorization.

## System notifications

System notifications appear in the operating system's notification UI. They are separate from conversation notifications, require their own permission and never start a model.

1. Check `capabilities.systemNotifications`.
2. When the user enables reminders, call `notifications.requestPermission()` from the visible page.
3. After granted, send with `notifications.show()`.

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

`notifications.getPermission()` reads the decision; requestPermission requests it. Both return prompt, granted or denied.

| show argument | Requirement |
| --- | --- |
| title | Required; 1–120 characters |
| body | Optional; up to 1000 characters |
| tag | Optional; nonempty and up to 80 characters. Replaces an existing notification with the same tag for this item |

The host identifies the widget and limits delivery to one notification per item every three seconds. Clicking returns to where the widget was opened without starting a model.

show returns `{shown:true}` after native delivery acknowledgement. Otherwise it returns `{shown:false, reason}`, where reason is permission_denied, permission_required, rate_limited, unavailable, closed or delivery_failed. Refusal is not an exception; invalid input throws a validation error.

An authorized page may notify while running in the background. A hidden page with no permission decision cannot prompt; show returns permission_required. Closing or reloading the page, or revoking permission, closes its outstanding notifications. No background service continues a closed widget's timers.

OS notification settings and Do Not Disturb still apply. shown does not prove the user saw or read the notification. Use the SDK instead of `new Notification`. Older SDKs may lack these methods; hosts providing the API express unavailability through the capability flag and unavailable result. Always detect the capability first.

## File export

`exportFile({filename, content, encoding?})` opens the system save dialog and returns `{saved:boolean}`. Cancellation returns saved: false. filename suggests a name; the user chooses the destination.

- Text: omit encoding or use utf8. content is a string, such as JSON, CSV or Markdown.
- Binary: check `capabilities.binaryFileExport`, use encoding: base64 and pass a base64 string. Decoded content is limited to 8 MiB.

WAV export uses this same API. Widgets cannot write arbitrary filesystem paths or use download links to replace the native export flow.

For import, use a file input and FileReader to read the user's chosen file. Validate it completely before replacing data. Keep progress within existing controls so a new status row does not shift the editor.

## Entity links and conversation handoff

### Link records

links stores relationships between records from different sources, such as a GitHub issue and a task in another service.

- `links.list()` returns `{links}`.
- `links.create({left,right})` creates a link; each side is `{source,entityType,entityID}`.
- `links.remove(linkID)` removes it.

source names a declared source; the host adds plugin and account identities. Stored links contain id, itemID, left, right and createdAt. Creation and removal require host confirmation. An account change does not reinterpret existing links as records belonging to the new account.

### Hand off a task

`requestAgent({prompt,context?})` asks the user to select a conversation and confirm the task. Its result is host-defined and typed as unknown. Keep context to the JSON data needed for that task.

Use interaction request-action notifications for participants in an established run. Use requestAgent when the user should choose a conversation for a handoff. System notifications do neither.

## Sandbox and errors

Use declared plugin operations for services and SDK methods for file saving, copying and notifications. Widgets have no daemon token, Node/Electron API, arbitrary fetch or clipboard read access. HTTPS images may load under host policy, but cannot attach connection credentials and do not imply general network access.

The host owns the page document. Update React content rather than replacing the page with `document.open/write/writeln`. Native form submission is blocked; prevent the default submission and call your handler.

Source, build and runtime failures appear in the top error bar, with expandable, scrollable, copyable and dismissible details. For business validation, return the field and allowed range rather than a large JSON dump. Closing the bar does not reload the page; a different new error may appear again.

## SDK version compatibility

The current Widget SDK is **1.2.0**. `widget.json.sdkVersion` and the distribution
manifest's `requires.sdkVersion` declare the same minimum stable SDK version.
The host supports older minor/patch requirements within the same major; a newer
requirement or a different major is incompatible. A breaking host SDK upgrade
blocks an installed incompatible widget and asks the user to update it, preserving
its source and data. Compatible SDK additions do not require updating old widgets.
Legacy `"1"` stays readable as 1.0.0. New work should use a semantic version.
Do not declare a minimum Pudding application version. SDK, catalog format and
extension release versions are independent.
