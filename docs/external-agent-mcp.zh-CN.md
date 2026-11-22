# 用 MCP 将外部 Agent 连接到 Pudding

[English](external-agent-mcp.md) · [文档首页](README.zh-CN.md)

支持本地 stdio MCP 的客户端可以直接调用 Pudding 的工具。普通小组件接入后即可使用。要让 Agent 读取项目文件、操作浏览器，或把工作记录到某段对话，再绑定目标会话。会话工具需要包含「连接 Agent」的 Pudding Desktop 版本。

## 首次接入

1. 打开 Pudding Desktop，在 **设置 → 工具 → 复制 MCP 配置** 取得本机配置，将其中的 `pudding` 服务添加到客户端。
2. 如果客户端要求填写启动命令，打开目标会话菜单的 **连接 Agent → 首次使用？查看接入方式**。单个命令栏可直接粘贴整行。若分栏填写，`command` 是 Pudding 自带的 `puddingd`（Windows 上为 `puddingd.exe`）的绝对路径，`args` 是三个独立参数：`mcp`、`--home`、Pudding 数据目录的绝对路径。
3. 保持 Pudding 运行，启动客户端的 MCP 连接。沙箱客户端需要能启动该程序、读取 `<home>/mcp/widget-mcp.json` 并连接本机回环地址。请使用相应版本界面给出的路径，正式版和 dev 版使用各自的数据目录。无需另装 Node.js 或 Python。

只操作普通小组件时，直接用 `widget_targets` 找到目标，再用 `widget_observe` 读取其接口。多人活动按小组件的规则加入，使用独立的 `participantID`。详见[小组件 MCP 指南](widget-mcp.zh-CN.md)。

## 绑定会话

在目标会话的 **连接 Agent** 弹窗中复制邀请消息，发到要使用这段会话的外部聊天。Agent 调用 `pudding_connect`，传入 `{"invite":"<邀请码>"}`，并在该聊天中保留返回的 `bindingID`。邀请限用一次，10 分钟内有效。

绑定继承这段会话当前的模式、工具和权限。需要新的目录或更高权限时，Pudding 按会话规则审批。重启 Pudding 后，让客户端重新连接 MCP，再用原 `bindingID` 调用 `pudding_session_status`。绑定本身没有固定到期时间。若外部聊天压缩了上下文，从该聊天原来的连接结果找回 ID；找不回时，在 Pudding 中断开旧绑定并发出新邀请。绑定凭证由 Desktop 保存在 `<home>/data/mcp-session-bindings/`，客户端无需读取该目录。

## 一个用户任务记作一个 Turn

| 时机 | Agent 调用 |
| --- | --- |
| 查找工具 | `pudding_session_tools` 传 `bindingID`，可加 `query` 按名称查参数定义。目录反映当前会话可用的工具、插件和 Skill 说明。 |
| 开始任务 | `pudding_turn_begin` 传 `bindingID` 和简短的 `task`，保留返回的 `turnID`。 |
| 连续执行 | 每次 `pudding_session_call` 传同一组 `bindingID`、`turnID`，以及本次的 `tool` 和 `arguments`。加载插件后可重新查目录，按回包中的最新说明继续。 |
| 中断后查看 | `pudding_session_status` 传 `bindingID` 查看自己的活动轮次，再加 `turnID` 可查看该轮状态及 Pudding 用户追加的消息。 |
| 收尾 | `pudding_turn_end` 传两个 ID，将 `status` 设为 `completed`、`failed` 或 `cancelled`，可加 `summary`。本轮临时授权随之结束。 |

两次工具调用之间空闲满 10 分钟，Pudding 会取消这一轮。执行工具和等待该工具审批的时间不计入空闲。绑定仍然有效。如果用户希望继续，先核对前面调用的结果，再开新 Turn 完成剩下的工作。

在 Code 模式下，开始 Turn 时可从 `projectInstructions` 读取已授权目录的项目规则。需要某个全局 Skill 时，用 `builtin_skill_read` 传入目录中的 `skill_id` 获取当前正文。用户在 Pudding 点击停止后，可用 `pudding_session_status` 确认该轮已取消。

例如，用户说“查一下新加坡和 UTC 的当前时间”，开始一个 Turn，先用以下参数调用 `pudding_session_call`，再用同一对 ID 把 `timezone` 改为 `UTC` 调用第二次，最后结束这一轮。

```json
{
  "bindingID": "<pudding_connect 返回的 bindingID>",
  "turnID": "<pudding_turn_begin 返回的 turnID>",
  "tool": "builtin_time_get_current",
  "arguments": { "timezone": "Asia/Singapore" }
}
```

## 看浏览器截图后点击

1. 在同一个 Turn 中加载浏览器插件（`builtin_plugin_load` 的参数为 `{"plugin_id":"browser"}`），打开或选择标签页，调用 `builtin_browser_screenshot`。
2. 优先读取 MCP 回包中的图片块。如果客户端没有内联显示，用客户端自己的读图工具打开该次回包对应的 PNG。实测 Gemini App 可在任务模式下连接该会话的截图目录，用 `view_file` 打开 `localImagePath` 原图；Antigravity 可用 `read_file` 打开它为该次回包保存的 `media_0.png`。Pudding 导出的原图位于 `<home>/temp/mcp-screenshots/<sessionID>/`。
3. 按实际看的图片尺寸换算。横坐标为 `captureBounds.x + 图上横坐标 × captureBounds.width / 所看图片宽度`，纵坐标同理。MCP 图片块的尺寸是 `modelWidth × modelHeight`，导出原图是 `width × height`。若读图工具又缩放了一次，就用测量点位时的显示尺寸。
4. 把换算出的 `x`、`y` 和该截图的 `observationID`、对应标签页的 `tabID`（回包中的 `tab.id`）传给 `builtin_browser_click`。滚动、跳转或调整布局后，重新截图再定位。
