# Connect an external agent to Pudding over MCP

[中文](external-agent-mcp.zh-CN.md) · [Documentation home](README.md)

A client that supports local stdio MCP can call Pudding tools directly. Ordinary widgets are available as soon as the client connects. Bind a Pudding conversation to read project files, operate its browser, or record work in its transcript. Conversation tools require a Pudding Desktop build with **Connect agent**.

## First-time setup

1. Open Pudding Desktop and choose **Settings → Tools → Copy MCP configuration**. Add the `pudding` server from that configuration to your client.
2. If the client asks for a launch command, open the conversation menu and choose **Connect agent → First time? Set up a connection**. Paste the whole line into a single command field. For separate fields, set `command` to the absolute path of the bundled `puddingd` executable (`puddingd.exe` on Windows). Set `args` to three separate values: `mcp`, `--home`, and the absolute Pudding data directory.
3. Keep Pudding open and start the MCP connection. Sandboxed clients need to launch the executable, read `<home>/mcp/widget-mcp.json` and connect to loopback. Use the paths shown by the build you want to connect to. Release and dev builds have separate data directories. The command runs without an external Node.js or Python installation.

For an ordinary widget, use `widget_targets` to find it, then `widget_observe` to read its interfaces. Multiplayer activities have their own join flow and `participantID`. See the [widget MCP guide](widget-mcp.md).

## Bind a conversation

Open **Connect agent** in the target Pudding conversation. Copy the invitation message into the external chat that will use it. The agent calls `pudding_connect` with `{"invite":"<invitation code>"}` and keeps the returned `bindingID` in that chat. The invitation is single-use and expires after 10 minutes.

The binding inherits the conversation’s current mode, tools and permissions. Requests for another directory or a higher mode follow the conversation’s approval rules. After restarting Pudding, reconnect the client and call `pudding_session_status` with the same `bindingID`. The binding has no fixed expiry. If context compaction drops the ID, recover it from that chat’s original connection result. If you cannot recover it, disconnect the old binding in Pudding and issue a new invitation. Desktop stores binding credentials in `<home>/data/mcp-session-bindings/`. Clients do not need access to this directory.

## One Turn per user task

| When | Agent call |
| --- | --- |
| Discover tools | Give `pudding_session_tools` the `bindingID`. Add a `query` to look up a tool’s input schema. Omit the query to list the current tools, plugins and skills. |
| Start the task | Give `pudding_turn_begin` the `bindingID` and a short `task`. Keep the returned `turnID`. |
| Make successive calls | Pass the same `bindingID` and `turnID` to each `pudding_session_call`, with the chosen `tool` and its `arguments`. After loading a plugin, look up its tools and follow the updated instructions in the results. |
| Check after interruption | Call `pudding_session_status` with the `bindingID` to find this binding’s active turn. Include the `turnID` to read that turn’s status and any follow-up messages from the user in Pudding. |
| Finish | Call `pudding_turn_end` with both IDs and `status` set to `completed`, `failed` or `cancelled`. A `summary` is optional. Turn-scoped permissions expire when the turn ends. |

A Turn is cancelled after 10 idle minutes between tool calls. Time spent running a tool or waiting for its approval is excluded. The binding stays valid. If the user wants to continue after cancellation, check the outcome of earlier calls and start a new Turn for the remaining work.

In Code mode, read `projectInstructions` when first supplied and whenever it changes. If context compaction drops the instructions, call `pudding_session_tools` with your `bindingID` and `refresh: true`. Omit `query` to recover project rules and all active guides, or supply a tool name to recover its guide. To read a global Skill, call `builtin_skill_read` with its catalog ID as `skill_id`. If the user stops the Turn in Pudding, check `pudding_session_status` to confirm cancellation.

For example, if the user asks for the current time in Singapore and UTC, begin one Turn. Call `pudding_session_call` with the following arguments, call it again with the same IDs and `timezone` set to `UTC`, then end the Turn.

```json
{
  "bindingID": "<bindingID returned by pudding_connect>",
  "turnID": "<turnID returned by pudding_turn_begin>",
  "tool": "builtin_time_get_current",
  "arguments": { "timezone": "Asia/Singapore" }
}
```

## Click a point in a browser screenshot

1. In the same Turn, load the browser plugin with `builtin_plugin_load` and `{"plugin_id":"browser"}`. Open or select a tab and call `builtin_browser_screenshot`.
2. Read the image block in the MCP result. If the client does not display it inline, open the PNG from that specific call with the client’s image reader. In testing, Gemini App could read the original at `localImagePath` with `view_file` in Task mode after attaching the conversation’s screenshot folder. Antigravity could read its own saved `media_0.png` with `read_file`. Pudding exports originals under `<home>/temp/mcp-screenshots/<sessionID>/`.
3. Map the point using the dimensions of the image you measured. Calculate `x = captureBounds.x + imageX × captureBounds.width / imageWidth` and likewise for `y`. The MCP image block uses `modelWidth × modelHeight`. The exported original uses `width × height`. If the reader resizes the image again, use its displayed dimensions.
4. Pass the resulting `x` and `y` to `builtin_browser_click` with the screenshot’s `observationID` and the matching `tabID` (`tab.id` in the result). Take a fresh screenshot after scrolling, navigation or layout changes.
