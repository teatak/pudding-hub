# External widget MCP

[中文](widget-mcp.zh-CN.md) · [Documentation home](README.md)

Pudding's local MCP lets external agents participate in widgets selected by the user, including games, collaborative tasks and other interactions. This guide describes current source; installed releases may not yet include new tools or the instructions field.

## Server and client

The MCP server is built into Pudding Desktop, starts with the app and listens only on local `127.0.0.1`. No separate deployment is needed. A STDIO client forwards MCP requests to it; the client does not run a model. Client source is maintained and shipped with Desktop; Hub hosts setup and authoring documentation.

Starting Pudding creates:

```text
~/.pudding/mcp/
├── widget-mcp-client.cjs
└── widget-mcp.json
```

Development builds use `~/.pudding-dev/mcp/`; a custom `PUDDING_HOME` uses its `mcp/` subdirectory. The connection file contains a random port and a separate access credential. Only the local client reads it: do not paste it into prompts, commit it or copy it into widgets. Pudding removes the credential file when it exits.

The supported entry point is currently the script installed by Pudding. No npm client package for this bridge has been published; do not use a guessed `npx` package name. A future npm/npx launcher would still require Pudding to be running, with the server and authorization managed by the desktop app.

## Configure an MCP client

Node.js 20+ is required. In a client supporting local STDIO MCP, set Command to the absolute Node path and Args to the absolute script path, optionally followed by `--name` and a recognizable client name. With a single Command field, enter the command and arguments together, quoting names or paths containing spaces.

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

Sandboxed clients need to execute Node, read `<home>/mcp/` and connect to the local server. Add read access to that directory rather than the full Pudding data directory. Set tool timeouts longer than `widget_wait`'s 25-second window, for example 60 seconds; the setting name depends on the client.

Older versions installed the script directly in the home root. New versions remove those legacy files at startup, so update existing client paths. Reconnect MCP after restarting Pudding to load the new address, credential and tools.

## Participation flow

1. Configure and connect MCP. Initialization, tool discovery, heartbeats and model profiles do not create picker entries.
2. When the user asks to participate, optionally report a known model/provider with `widget_set_profile`, then call `widget_join`. Repeated joins reuse the same entry.
3. No specific widget is selected yet. Call `widget_targets`; if none are authorized, call `widget_wait` without `targetID` while the user selects participants.
4. The user selects the agent in a widget and starts participation. Use the returned `targetID` with `widget_observe` to read that instance's `instructions`, page and interface descriptions. Learn its roles, rules and completion conditions there.
5. Operate through discovered interfaces with the latest `stateVersion`. After acting, call `widget_wait` with `targetID` and the latest `afterSeq`. Timeout means no new event, not completion.
6. Stop automatic actions when the activity finishes or the user asks to stop. Let the user resume a manual pause. To explicitly leave, call `widget_disconnect`; it removes only the caller's entry and retains activity records.

MCP cannot itself wake an ended model turn. Continuous participation requires the agent to keep its waiting loop running. Conversations sharing one MCP connection do not automatically get separate identities; two independent connections can be two participants.

Example prompt:

> Join Pudding widgets and wait for me to select you. Once selected, read that widget's instructions and interfaces, then participate according to its rules until the activity finishes or I ask you to stop. Keep waiting after a wait timeout.

## Tools

| Tool | Purpose |
| --- | --- |
| `widget_join` | Register as a candidate participant; does not grant access to a specific widget |
| `widget_set_profile` | Report model and provider for display only |
| `widget_targets` | Discover running targets authorized by the user |
| `widget_observe` | Read target instructions, interfaces and page text, with optional controls/screenshots |
| `widget_invoke` | Invoke a widget-defined operation with its declared arguments |
| `widget_wait` | Wait up to 25 seconds for selection or new notices addressed to this participant |
| `widget_click` | Click an observed control or coordinate |
| `widget_type` | Enter text |
| `widget_scroll` | Scroll a page or container |
| `widget_disconnect` | Leave and remove the caller's entry |

Widget-specific operations are discovered through `widget_observe` and invoked through `widget_invoke`; they do not become separate MCP tools.

## Widget guidance and connection management

MCP initialization instructions describe the generic join, wait, discovery and exit workflow. Widget authors declare their own purpose and rules with [`pudding.setInstructions(text)`](widget-sdk.md#model-interfaces-and-page-input). `widget_observe` always returns `instructions`, or an empty string when none were supplied. Guidance is scoped to the selected instance and accessible only to authorized participants; it does not override user requests, host permissions or higher-priority instructions.

Joined participants remain listed as offline after transport disconnection. Users may remove them manually; connected agents may explicitly leave. Unjoined connections leave no picker entries. Reconnection creates a new identity requiring an explicit join and user selection. Do not merge identities by model name: two participants may use the same model.

This bridge exposes no Core credential, general file access, session management or widget source editing.
