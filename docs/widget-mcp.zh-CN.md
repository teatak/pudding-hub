# 外部小组件 MCP

[English](widget-mcp.md) · [文档首页](README.zh-CN.md)

Pudding 的本地 MCP 让外部 agent 参与用户选定的小组件，适用于游戏、协作任务和其他交互。这里描述当前源码能力；安装版可能尚未包含新工具或说明字段。

## 服务与客户端

实际 MCP 服务内置于 Pudding Desktop，随应用启动，只监听本机 `127.0.0.1`，无需单独部署。STDIO 客户端负责把 MCP 请求转发给桌面服务，不运行模型。源码随 Desktop 维护、随应用安装；Hub 提供接入与作者文档。

启动 Pudding 后自动生成：

```text
~/.pudding/mcp/
├── widget-mcp-client.cjs
├── widget-mcp.json
└── widget-identities/       # 首次加入后生成的私有恢复记录
```

开发版使用 `~/.pudding-dev/mcp/`；自定义 `PUDDING_HOME` 时使用其 `mcp/` 子目录。连接文件包含随机端口和独立访问凭证，只由本地客户端读取，不应贴到提示词、提交仓库或复制进小组件。Pudding 退出后删除凭证文件。

当前可用入口是随应用生成的脚本，尚未发布用于此桥接的 npm 客户端包，不要使用猜测的 `npx` 包名。将来即使提供 npm/npx 启动器，桌面应用仍须运行，实际服务和授权仍由 Pudding 管理。

## 配置 MCP 客户端

需要 Node.js 20+。在支持本地 STDIO MCP 的客户端配置：

- Command：本机 Node 的绝对路径。
- Args：脚本的绝对路径，可附 `--name` 设置显示名称，`--identity` 设置固定 Agent 身份。
- 只有一个 Command 输入框时，把命令和参数写在同一行；带空格的路径或名称需加引号。

以下 macOS 示例中的用户名、Node 路径需要替换成自己的实际路径：

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

开发版把 `.pudding` 改成 `.pudding-dev`。Windows 等平台同样使用实际 Node 和 Pudding home 下的脚本绝对路径。一般配置文件不会展开 `~` 或 `$HOME`。

受沙箱限制的客户端需能运行 Node、读取 `<home>/mcp/` 并连接本机服务；只为该目录增加读权限即可，无需开放整个 Pudding 数据目录。`widget_wait` 默认等待 10 秒，可用 `timeoutSeconds` 缩短，最多 25 秒。客户端单次工具超时应长于请求的等待窗口，例如设为 60 秒（具体设置名由客户端决定）。若客户端报 `CLIENT_TIMEOUT`，改用更短的等待时间（例如 5 秒）；客户端同时重建通信连接时，先按下文恢复参与身份。

旧版脚本位于 home 根目录；新版启动时清理旧文件，已有配置须更新路径。Pudding 重启后，重新连接 MCP，以读取新的端口、凭证和工具列表。

## 普通小组件

直接在 Agent 原窗口说：“帮我总结 Pudding 当前打开的 Gmail Board 里的邮件。” Agent 调用 `widget_targets` 发现实例，用 `widget_observe` 读取说明和能力，再调用对应接口。无需加入候选、选择玩家、创建对局或持续等待。多个实例匹配时应确认目标；隐藏或关闭普通页面后，该目标访问失效，旧版本或绑定变更也会拒绝调用。

## 多参与者活动

1. 配置 MCP。初始化、发现、心跳和模型自报都不会创建候选条目。
2. 用户要求参与时，可先用 `widget_set_profile` 自报已知模型，再调用 `widget_join`；桥接自动保存恢复凭据，模型只需使用返回的 `participantID`，重复加入复用原条目。可以先发现小组件，也可以先进入待分配候选池。
3. 不带 `targetID` 持续调用 `widget_wait` 等待分配。`widget_targets` 也可能返回普通页面和 `participation_required` 活动，发现目标不等于获得席位或私有状态访问权。
4. 小组件通过 `interaction.candidates()` 读取候选。五子棋优先将新加入的在线 Agent 补入空位；用户可以手动移除或取消勾选，也可以补充内部对话或自己，然后点击开始。人数足够不会自动启动活动。
5. 小组件连接选定参与者并分配角色。Agent 获得对应 `targetID` 后，通过 `widget_observe` 读取该实例的说明、角色、规则和结束条件，使用最新 `stateVersion` 调用接口。
6. 外部 Agent 用 `widget_wait({targetID, afterSeq})` 接收自己的下一条事件。正常超时返回 `status: "waiting"`，沿用同一连接继续等待，不重新加入或新建玩家。内部对话保留 Pudding 现有的通知触发 turn 逻辑，不改成持续等待。
7. 活动结束或用户要求停止时停止操作；手动暂停由用户恢复。`widget_disconnect` 移除参与身份、撤销恢复凭据和活动权限，取消待执行请求，保留记录、MCP 通信和普通小组件工具。之后按用户要求直接 `widget_join({})`，无需重启 MCP。

席位数量由各小组件决定，MCP 不固定人数：五子棋 2 人，斗地主 3 人，谁是卧底可设置 4–6 人并由用户确认本局名单。小组件在 `interaction.connect` 前校验人数；候选过多时决定选择方式，负责角色分配和中途离席处理。宿主目前最多支持 15 个非人类参与者加一个用户，这是技术上限，不是游戏规则。运行上下文中有用户身份，不代表用户必须占用游戏席位。

MCP 不能唤醒已经结束的模型 turn，外部 Agent 连续参与时须保持等待循环。共享同一 MCP 通信连接的多个对话不会自动拥有独立身份。

活动提示词示例：

> 加入 Pudding 候选池并持续等待分配。我开始活动后，读取该实例的说明和接口，按规则参与到结束或我要求停止。无事件时继续等待，不重复加入。意外重连由桥接恢复原身份，恢复后先读取当前状态再继续，不重放结果不明的操作。

## 工具

| 工具 | 作用 |
| --- | --- |
| `widget_join` | 不带参数登记候选；桥接自动恢复原身份和已有席位。新身份须由用户选择 |
| `widget_set_profile` | 自报模型名称和提供商，只影响显示 |
| `widget_targets` | 发现可用普通小组件和活动；未分配的活动返回 participation_required |
| `widget_observe` | 读取指定目标的说明、接口、页面文本，或按需读取控件/截图 |
| `widget_invoke` | 按小组件声明的接口和参数执行操作 |
| `widget_wait` | 默认等待 10 秒、最多 25 秒；无事件正常返回 `status: "waiting"` |
| `widget_click` | 点击已观察到的控件或坐标 |
| `widget_type` | 输入文本 |
| `widget_scroll` | 滚动页面或容器 |
| `widget_disconnect` | 退出参与并撤销恢复凭据；保留 MCP 通信，可直接再次加入 |

每个小组件的具体业务接口通过 `widget_observe` 发现，再通过 `widget_invoke` 调用，不会变成独立的 MCP 工具。

## 小组件说明与连接管理

MCP 初始化说明负责通用的加入、等待、发现和退出流程。小组件作者通过 [`pudding.setInstructions(text)`](widget-sdk.zh-CN.md#模型接口与页面输入) 声明自身用途与规则；`widget_observe` 总是返回 `instructions`，未声明时为空字符串。说明按目标实例隔离，已开始的多参与者活动仍须获得席位后才能观察和操作；它不覆盖用户要求、宿主权限或上层指令。

已加入的参与者断线后保留并标记离线，由用户手动移除，或由仍连接的 agent 主动退出。未加入的连接不会留下候选项。STDIO 桥接在重新初始化时读取本地恢复记录，自动恢复同一个候选项、模型显示和已选席位；同时撤销旧通信连接及其待执行请求。模型不需要记住或传入 `resumeToken`。恢复后先观察当前状态，不重放结果不明的旧操作。

`--identity`（或 `PUDDING_WIDGET_MCP_IDENTITY`）是配置时设置的固定 Agent 槽位，例如 `gemini-a`、`gemini-b`。同一槽位代表同一玩家，替换连接会接管它；两个独立玩家必须使用不同槽位。未设置时，Codex 客户端若有 `CODEX_THREAD_ID` 就按会话隔离；否则按初始化客户端名称与 `--name` 组合选择默认槽位。MCP 不一定提供聊天会话 ID，不能据此区分同一客户端内的多个聊天窗口；需要多玩家时显式配置 identity。身份不依据模型名称或模型自报信息合并。

恢复记录由 Pudding 写入 `mcp/widget-identities/`，目录仅当前用户可访问、文件仅当前用户可读写。适配器只读取，因此沙箱客户端仍只需 mcp 目录读取权限。文件不应交给模型或其他参与者；返回给模型的工具结果不包含恢复 token。保存失败则加入失败，同槽位并发加入不会新增多份候选。

主动退出、手动移除或 Pudding 重启会撤销恢复。重新连接不会自动复活被移除的玩家，只有用户要求后再次显式调用 `widget_join({})` 才开始新的参与。记录损坏、缺失或 token 失效时，不静默创建替代玩家。恢复只覆盖同一 Pudding 进程内的客户端断线，不跨 Pudding 重启。直接连接 HTTP、未使用此托管 STDIO 适配器的客户端仍可自行维护私有 `resumeToken`，但不能混用其他 identity 的凭据。

此桥接不暴露 Core 凭证、通用文件操作、会话管理或小组件源码编辑。
