# 外部小组件 MCP

[English](widget-mcp.md) · [文档首页](README.zh-CN.md)

Pudding 的本地 MCP 让外部 agent 参与用户选定的小组件，适用于游戏、协作任务和其他交互。这里描述当前源码能力；安装版可能尚未包含新工具或说明字段。

## 服务与客户端

实际 MCP 服务内置于 Pudding Desktop，随应用启动，只监听本机 `127.0.0.1`，无需单独部署。STDIO 客户端负责把 MCP 请求转发给桌面服务，不运行模型。源码随 Desktop 维护、随应用安装；Hub 提供接入与作者文档。

启动 Pudding 后自动生成：

```text
~/.pudding/mcp/
├── widget-mcp-client.cjs
└── widget-mcp.json
```

开发版使用 `~/.pudding-dev/mcp/`；自定义 `PUDDING_HOME` 时使用其 `mcp/` 子目录。连接文件包含随机端口和独立访问凭证，只由本地客户端读取，不应贴到提示词、提交仓库或复制进小组件。Pudding 退出后删除凭证文件。

当前可用入口是随应用生成的脚本，尚未发布用于此桥接的 npm 客户端包，不要使用猜测的 `npx` 包名。将来即使提供 npm/npx 启动器，桌面应用仍须运行，实际服务和授权仍由 Pudding 管理。

## 配置 MCP 客户端

需要 Node.js 20+。在支持本地 STDIO MCP 的客户端配置：

- Command：本机 Node 的绝对路径。
- Args：脚本的绝对路径，可附 `--name` 和容易辨认的客户端名称。
- 只有一个 Command 输入框时，把命令和参数写在同一行；带空格的路径或名称需加引号。

以下 macOS 示例中的用户名、Node 路径需要替换成自己的实际路径：

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

开发版把 `.pudding` 改成 `.pudding-dev`。Windows 等平台同样使用实际 Node 和 Pudding home 下的脚本绝对路径。一般配置文件不会展开 `~` 或 `$HOME`。

受沙箱限制的客户端需能运行 Node、读取 `<home>/mcp/` 并连接本机服务；只为该目录增加读权限即可，无需开放整个 Pudding 数据目录。客户端单次工具超时应长于 `widget_wait` 的 25 秒等待窗口，例如设为 60 秒（具体设置名由客户端决定）。

旧版脚本位于 home 根目录；新版启动时清理旧文件，已有配置须更新路径。Pudding 重启后，重新连接 MCP，以读取新的端口、凭证和工具列表。

## 参与流程

1. 配置并连接 MCP。初始化、工具发现、心跳和自报模型都不会显示为候选参与者。
2. 用户要求加入小组件后，agent 可先用 `widget_set_profile` 自报确切知道的模型和提供商，再调用 `widget_join`。重复加入不会增加条目。
3. 此时还没有选定具体小组件。agent 用 `widget_targets` 查找已授权目标；没有目标则调用不带 `targetID` 的 `widget_wait`，等待用户选择。
4. 用户在某个小组件中选择参与者并开始。agent 获得对应的 `targetID`，调用 `widget_observe` 读取该运行实例的 `instructions`、页面和接口说明，了解业务角色、规则和完成条件。
5. 按发现的接口操作，使用最新 `stateVersion`。行动后携带 `targetID`、最新 `afterSeq` 继续 `widget_wait`；超时意味着暂时无事件，不意味着活动结束。
6. 活动结束或用户要求停止时停止自动操作；手动暂停由用户恢复。明确离开时调用 `widget_disconnect`，只移除自己的条目并保留活动记录。

MCP 不会自行唤醒已经结束的模型 turn；持续参与需要客户端中的 agent 保持执行等待循环。共享一个 MCP 连接的多个对话不会自动拥有独立身份；两个独立连接可以作为两个参与者。

可以直接告诉 agent：

> 加入 Pudding 小组件，等待我选择你。被选中后读取该小组件的说明和接口，按规则持续参与到活动结束或我要求停止；等待超时后继续等待。

## 工具

| 工具 | 作用 |
| --- | --- |
| `widget_join` | 明确登记到候选参与者列表，不授予任何具体小组件的操作权限 |
| `widget_set_profile` | 自报模型名称和提供商，只影响显示 |
| `widget_targets` | 查找用户已授权参与的运行目标 |
| `widget_observe` | 读取指定目标的说明、接口、页面文本，或按需读取控件/截图 |
| `widget_invoke` | 按小组件声明的接口和参数执行操作 |
| `widget_wait` | 最多等待 25 秒，等待选择或当前参与者的新通知 |
| `widget_click` | 点击已观察到的控件或坐标 |
| `widget_type` | 输入文本 |
| `widget_scroll` | 滚动页面或容器 |
| `widget_disconnect` | 退出并移除自己的候选项 |

每个小组件的具体业务接口通过 `widget_observe` 发现，再通过 `widget_invoke` 调用，不会变成独立的 MCP 工具。

## 小组件说明与连接管理

MCP 初始化说明负责通用的加入、等待、发现和退出流程。小组件作者通过 [`pudding.setInstructions(text)`](widget-sdk.zh-CN.md#模型接口与页面输入) 声明自身用途与规则；`widget_observe` 总是返回 `instructions`，未声明时为空字符串。说明按目标实例隔离，只有已授权参与者可读取；它不覆盖用户要求、宿主权限或上层指令。

已加入的参与者断线后保留并标记离线，由用户手动移除，或由仍连接的 agent 主动退出。未加入的连接不会留下候选项。重连产生新身份，需要再次明确加入并由用户选择；不要按模型名称合并身份，否则两个同模型参与者会被混淆。

此桥接不暴露 Core 凭证、通用文件操作、会话管理或小组件源码编辑。
