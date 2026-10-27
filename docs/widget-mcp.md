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

Node.js 20+ is required. In a client supporting local STDIO MCP, set Command to the absolute Node path and Args to the absolute script path, optionally followed by `--name` for display and `--identity` for a stable Agent identity. With a single Command field, enter the command and arguments together, quoting names or paths containing spaces.

Replace the username and Node path in this macOS example:

```json
{
  "mcpServers": {
    "pudding": {
      "command": "/opt/homebrew/opt/node/bin/node",
      "args": ["/Users/yourname/.pudding/mcp/widget-mcp-client.cjs", "--name", "My Agent", "--identity", "my-agent"]
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
2. When asked to participate, optionally report a known model/provider with `widget_set_profile`, then call `widget_join`. The bridge saves recovery credentials automatically; the model receives `participantID` without a recovery token. Repeated joins reuse the entry. The agent can discover a widget first or enter the candidate pool before assignment.
3. Keep calling `widget_wait` without `targetID` until assigned. `widget_targets` can also list ordinary pages and activities requiring participation; discovering one does not assign a seat or authorize its private state.
4. The widget reads candidates with `interaction.candidates()`. Gomoku fills vacant choices with newly joined online agents; the user can remove agents, deselect them or supplement with internal conversations or themselves, then click Start. Having enough candidates never starts the activity automatically.
5. The widget connects the chosen participants and assigns its own roles. Use the assigned `targetID` with `widget_observe` to learn that instance's instructions, roles, rules and completion conditions. Invoke interfaces with the latest `stateVersion`.
6. External agents call `widget_wait({targetID, afterSeq})` for their next event. A normal `status: "waiting"` timeout means wait again on the same connection, not rejoin or create a new player. Internal conversations retain Pudding's existing notification-driven turns; no persistent internal waiting loop is introduced.
7. Stop on completion or user stop; let the user resume a manual pause. `widget_disconnect` removes participation, revokes the recovery token and activity access, and cancels pending requests. Records, the MCP transport and ordinary-widget tools remain. A later user-requested `widget_join({})` starts fresh participation without restarting MCP.

Seat counts belong to each widget, not MCP: Gomoku requires 2, a three-player card game requires 3, and a social deduction game may accept 4–6 with the user confirming the roster. The widget validates the count before `interaction.connect`, chooses the roster when too many candidates are available, assigns roles, and handles departure during play. The host supports up to 15 non-human participants plus one human; this is a technical limit, not a game rule. Human presence in the run is not automatically a playing seat.

MCP cannot wake an ended model turn. External agents must remain in their waiting loop for continuous participation. Multiple conversations sharing one MCP transport do not automatically have separate identities.

Example activity prompt:

> Join Pudding's candidate pool and keep waiting for assignment. After I start an activity, read its instructions and interfaces, then participate until it finishes or I stop you. Keep waiting when no event arrives, without joining again. Let the local bridge recover your identity after an unexpected transport reconnect; observe current state before continuing and never replay an uncertain operation.

## Tools

| Tool | Purpose |
| --- | --- |
| `widget_join` | Join with no arguments; the bridge automatically restores the original player and seats on reconnect. Fresh players require user selection |
| `widget_set_profile` | Report model and provider for display only |
| `widget_targets` | Discover available ordinary widgets and activities; unassigned activities report participation_required |
| `widget_observe` | Read target instructions, interfaces and page text, with optional controls/screenshots |
| `widget_invoke` | Invoke a widget-defined operation with its declared arguments |
| `widget_wait` | Wait 10 seconds by default, up to 25; no event normally returns `status: "waiting"` |
| `widget_click` | Click an observed control or coordinate |
| `widget_type` | Enter text |
| `widget_scroll` | Scroll a page or container |
| `widget_disconnect` | Leave participation and revoke recovery; keep MCP usable for a later join |

Widget-specific operations are discovered through `widget_observe` and invoked through `widget_invoke`; they do not become separate MCP tools.

## Widget guidance and connection management

MCP initialization instructions describe the generic join, wait, discovery and exit workflow. Widget authors declare their own purpose and rules with [`pudding.setInstructions(text)`](widget-sdk.md#model-interfaces-and-page-input). `widget_observe` always returns `instructions`, or an empty string when none were supplied. Guidance is scoped to the discovered instance; active multi-participant runs still require membership for observation and actions; it does not override user requests, host permissions or higher-priority instructions.

Joined participants remain listed as offline after transport disconnection. Users may remove them manually; connected agents may explicitly leave. Unjoined connections leave no picker entries. On reinitialization, the STDIO bridge reads its local recovery record and restores the same player, profile and seats automatically. The previous transport and its pending work lose access. The model does not retain or supply a recovery token. Observe current state before acting; never replay an uncertain operation.

Configure a stable Agent slot with `--identity` (or `PUDDING_WIDGET_MCP_IDENTITY`), for example `gemini-a` and `gemini-b`. A slot represents one player; a replacement connection takes it over. Independent players need different slots. Without an explicit slot, Codex clients use `CODEX_THREAD_ID` when available; otherwise the initialization client name and `--name` form the default slot. MCP does not necessarily identify the current chat, so separate windows in the same client are not automatically separate players. Configure distinct identities for multiplayer use. Self-reported model names never determine recovery identity.

Pudding writes the records under `mcp/widget-identities/`, with user-only directory/file permissions. The adapter only reads them, so sandbox clients still need only read access to mcp/. Never give these files to models or other participants. Model-facing join results contain no recovery token. Failed persistence fails the join; concurrent joins for one slot create only one candidate.

Explicit leave, manual removal and Pudding restart revoke recovery. Reconnecting does not resurrect removed participation; only a later user-requested `widget_join({})` starts fresh participation. Missing, corrupt or invalid recovery records never silently create a replacement player. Recovery covers client transport loss within the same Pudding process, not a Pudding restart. Direct HTTP clients without this managed STDIO adapter may still maintain their own private `resumeToken`, but credentials cannot be transferred between configured identities.

This bridge exposes no Core credential, general file access, session management or widget source editing.
