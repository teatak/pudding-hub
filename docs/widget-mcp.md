# External widget MCP

[中文](widget-mcp.zh-CN.md) · [Documentation home](README.md)

Pudding's local MCP lets external agents participate in widgets selected by the user, including games, collaborative tasks and other interactions. This guide describes current source; installed releases may not yet include new tools or the instructions field.

## Server and client

The MCP server is built into Pudding Desktop, starts with the app and listens only on local `127.0.0.1`. No separate deployment is needed. A STDIO client forwards MCP requests to it; the client does not run a model. Client source is maintained and shipped with Desktop; Hub hosts setup and authoring documentation.

Starting Pudding creates:

```text
~/.pudding/mcp/
├── widget-mcp-client.cjs
├── widget-mcp.json
└── widget-identities/       # private recovery records, created on first join
```

Development builds use `~/.pudding-dev/mcp/`; a custom `PUDDING_HOME` uses its `mcp/` subdirectory. The connection file contains a random port and a separate access credential. Only the local client reads it: do not paste it into prompts, commit it or copy it into widgets. Pudding removes the credential file when it exits.

The supported entry point is currently the script installed by Pudding. No npm client package for this bridge has been published; do not use a guessed `npx` package name. A future npm/npx launcher would still require Pudding to be running, with the server and authorization managed by the desktop app.

## Configure an MCP client

Node.js 20+ is required. In a client supporting local STDIO MCP, set Command to the absolute Node path and Args to the absolute script path, optionally followed by `--name` for display. Names do not select or restore player identities. With a single Command field, enter the command and arguments together, quoting names or paths containing spaces.

Replace the username and Node path in this macOS example:

```json
{
  "mcpServers": {
    "pudding": {
      "command": "/opt/homebrew/opt/node/bin/node",
      "args": ["/Users/yourname/.pudding/mcp/widget-mcp-client.cjs", "--name", "My Agent"]
    }
  }
}
```

For development builds, replace `.pudding` with `.pudding-dev`. On Windows and other platforms, use the actual absolute Node path and script path under the app's home directory. Configuration files generally do not expand `~` or `$HOME`.

Sandboxed clients need to execute Node, read `<home>/mcp/` and connect to the local server. Add read access to that directory rather than the full Pudding data directory. `widget_wait` defaults to 10 seconds and accepts a shorter `timeoutSeconds`, up to 25 seconds. Set client tool timeouts longer than the requested wait, for example 60 seconds; the setting name depends on the client. If the client reports `CLIENT_TIMEOUT`, use a shorter wait (for example 5 seconds). If it also resets the transport, recover participation as described below.

Older versions installed the script directly in the home root. New versions remove those legacy files at startup, so update existing client paths. Reconnect MCP after restarting Pudding to load the new address, credential and tools.

## Ordinary widgets

Ask the agent directly: “Summarize the mail in the Gmail Board currently open in Pudding.” It calls `widget_targets`, chooses the matching instance, reads `widget_observe` and invokes its interfaces. No candidate registration, player selection, activity run or waiting loop is needed. It completes the user's task in the original agent conversation. If several instances match, clarify which one to use. Hiding or closing an ordinary page revokes access to that target; stale revisions and bindings are also rejected.

## Multi-participant activities

1. Configure MCP. Initialization, discovery, heartbeats and model profiles never create candidate entries.
2. Only when asked to participate, call `widget_join({})` once to create this conversation’s player. Keep the returned public `participantID`. Then report your known model/provider with `widget_set_profile({participantID, model, provider})`. To restore or rejoin this player use `widget_join({participantID})`; calling without an ID creates a new player and must not be used as a timeout retry. Private recovery credentials stay in the bridge.
3. Keep calling `widget_wait({participantID})` without `targetID` until assigned. `widget_targets` can also list ordinary pages and activities requiring participation; discovering one does not assign a seat or authorize its private state.
4. The widget reads candidates with `interaction.candidates()`. Gomoku fills vacant choices with newly joined online agents; the user can remove agents, deselect them or supplement with internal conversations or themselves, then click Start. Having enough candidates never starts the activity automatically.
5. The widget connects the chosen participants and assigns its own roles. Include your `participantID` in activity tools. Use the assigned `targetID` with `widget_observe` to learn that instance's instructions, roles, rules and completion conditions. Invoke interfaces with the latest `stateVersion`.
6. External agents call `widget_wait({participantID, targetID, afterSeq})` for their next event. A normal `status: "waiting"` timeout means wait again on the same connection, not rejoin or create a new player. Internal conversations retain Pudding's existing notification-driven turns; no persistent internal waiting loop is introduced.
7. Stop on completion or user stop; let the user resume a manual pause. `widget_disconnect({participantID})` removes only this player’s participation, revokes the recovery token and activity access, and cancels pending requests. Records, the MCP transport and ordinary-widget tools remain. A later user-requested `widget_join({})` starts fresh participation without restarting MCP.

Seat counts belong to each widget, not MCP: Gomoku requires 2, a three-player card game requires 3, and a social deduction game may accept 4–6 with the user confirming the roster. The widget validates the count before `interaction.connect`, chooses the roster when too many candidates are available, assigns roles, and handles departure during play. The host supports up to 15 non-human participants plus one human; this is a technical limit, not a game rule. Human presence in the run is not automatically a playing seat.

MCP cannot wake an ended model turn. External agents must remain in their waiting loop for continuous participation. Multiple conversations can share one MCP configuration and process: each creates its own player and supplies its own participantID. The bridge never guesses a conversation from app names or models.

Example activity prompt:

> Join Pudding’s candidate pool once with widget_join({}) and keep its returned participantID in this conversation. Report your known model/provider for that ID, then keep waiting with widget_wait({participantID}). After I start an activity, use that same ID to observe its instructions and participate until completion or I stop you. A normal timeout means wait again. After reconnecting restore with widget_join({participantID}), observe current state and never replay an uncertain action. Do not create another player or use another conversation’s ID.

## Tools

| Tool | Purpose |
| --- | --- |
| `widget_join` | `{}` creates a new player; `{participantID}` restores/reuses that player and its seats. No credentials in model arguments/results |
| `widget_set_profile` | Requires `participantID`; report the known model/provider for that player’s display only |
| `widget_targets` | Discover available ordinary widgets and activities; unassigned activities report participation_required |
| `widget_observe` | Read target instructions, interfaces and page text, with optional controls/screenshots |
| `widget_invoke` | Invoke a widget-defined operation with its declared arguments |
| `widget_wait` | Requires `participantID`; wait 10 seconds by default, up to 25; no event normally returns `status: "waiting"` |
| `widget_click` | Click an observed control or coordinate |
| `widget_type` | Enter text |
| `widget_scroll` | Scroll a page or container |
| `widget_disconnect` | Requires `participantID`; revoke only this player, retaining other players and ordinary tools |

Activity calls to `widget_targets`, `widget_observe`, `widget_invoke`, `widget_click`, `widget_type` and `widget_scroll` also include the same `participantID`. Ordinary widgets require no joining: omit the ID. Use the public ID returned by widget_join, not a widget’s internal seat identifier.

Widget-specific operations are discovered through `widget_observe` and invoked through `widget_invoke`; they do not become separate MCP tools.

## Widget guidance and connection management

MCP initialization instructions describe the generic join, wait, discovery and exit workflow. Widget authors declare their own purpose and rules with [`pudding.setInstructions(text)`](widget-sdk.md#model-interfaces-and-page-input). `widget_observe` always returns `instructions`, or an empty string when none were supplied. Guidance is scoped to the discovered instance; active multi-participant runs still require membership for observation and actions; it does not override user requests, host permissions or higher-priority instructions.

Joined participants remain listed as offline after transport disconnection. Users may remove them manually; agents may explicitly leave their own player. Unjoined connections leave no picker entries. Initializing the STDIO process never claims a player. Only `widget_join({participantID})` or a participation tool carrying that ID restores the corresponding player, profile and seats. Only that player’s old internal HTTP channel and pending requests lose access; other players and ordinary discovery stay connected. Observe current state before acting; never replay an uncertain operation.

One STDIO process keeps a discovery channel and an independent HTTP channel per participantID. Multiple Gemini conversations can share the same MCP configuration without sharing identity. `--name` is display metadata only; `--identity`, its environment variable, app names and CODEX_THREAD_ID no longer select recovery slots. The conversation must use its public ID in tool calls. This ID routes requests within the locally authorized MCP configuration; it is not proof of chat ownership. Do not use other conversations’ IDs. A client that supplies no stable conversation identifier cannot have one inferred by the bridge.

Pudding atomically writes `mcp/widget-identities/<participantID>.json` with user-only directory/file permissions and the Pudding instance ID. The adapter reads the private credential from that record; models neither retain nor supply it. Sandboxed clients still need only read access to mcp/. Never give these files to models or other participants. Persistence failure fails joining. Concurrent recovery of the same ID within one bridge opens one player channel, while distinct IDs never merge.

Explicit leave, manual removal and Pudding restart revoke recovery. Missing, corrupt, mismatched, revoked or old-instance records return errors without creating replacement players. A later user-requested `widget_join({})` creates a fresh player requiring new selection. Recovery covers transport loss within the same Pudding instance. An expired HTTP call returns an error; subsequent calls with the same ID restore the channel. Mutating calls are never automatically replayed. Direct HTTP clients retain the legacy private resumeToken flow; its credentials cannot be mixed with the managed bridge. Old configuration-hash records are not adopted.

This workflow requires an updated Pudding host and its installed participantID-based adapter. Restart MCP after upgrading. It requires no changes to widget game rules.

This bridge exposes no Core credential, general file access, session management or widget source editing.
