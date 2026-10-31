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
- Args：脚本的绝对路径，可附 `--name` 设置显示名称。显示名称不用于选择或恢复玩家身份。
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

受沙箱限制的客户端需能运行 Node、读取 `<home>/mcp/` 并连接本机服务；只为该目录增加读权限即可，无需开放整个 Pudding 数据目录。`widget_wait` 默认等待 10 秒，可用 `timeoutSeconds` 缩短，最多 25 秒。客户端单次工具超时应长于请求的等待窗口，例如设为 60 秒（具体设置名由客户端决定）。若客户端报 `CLIENT_TIMEOUT`，改用更短的等待时间（例如 5 秒）；客户端同时重建通信连接时，先按下文恢复参与身份。

旧版脚本位于 home 根目录；新版启动时清理旧文件，已有配置须更新路径。Pudding 重启后，重新连接 MCP，以读取新的端口、凭证和工具列表。

## 普通小组件

直接在 Agent 原窗口说：“帮我总结 Pudding 当前打开的 GitHub 看板里的议题。” Agent 调用 `widget_targets` 发现实例，用 `widget_observe` 读取说明和能力，再调用对应接口。无需加入候选、选择玩家、创建对局或持续等待。多个实例匹配时应确认目标；隐藏或关闭普通页面后，该目标访问失效，旧版本或绑定变更也会拒绝调用。

## 多参与者活动

1. 配置 MCP。初始化、发现、心跳和模型自报都不会创建候选条目。
2. 只有用户要求参与时，首次调用一次 `widget_join({})` 创建本对话的玩家，保留返回的公开 `participantID`。随后调用 `widget_set_profile({participantID, model, provider})` 自报已知模型。重复加入或重连恢复使用 `widget_join({participantID})`；不带 ID 表示新建玩家，不能用于超时重试。恢复凭据由桥接管理，不交给模型。
3. 持续调用 `widget_wait({participantID})` 等待分配，未分配时不带 `targetID`。`widget_targets` 也可能返回普通页面和 `participation_required` 活动，发现目标不等于获得席位或私有状态访问权。
4. 小组件通过 `interaction.candidates()` 读取候选。五子棋优先将新加入的在线 Agent 补入空位；用户可以手动移除或取消勾选，也可以补充内部对话或自己，然后点击开始。人数足够不会自动启动活动。
5. 小组件连接选定参与者并分配角色。活动工具都携带自己的 `participantID`。Agent 获得对应 `targetID` 后，通过 `widget_observe` 读取该实例的说明、角色、规则和结束条件，使用最新 `stateVersion` 调用接口。
6. 外部 Agent 用 `widget_wait({participantID, targetID, afterSeq})` 接收自己的下一条事件。正常超时返回 `status: "waiting"`，沿用同一连接继续等待，不重新加入或新建玩家。内部对话保留 Pudding 现有的通知触发 turn 逻辑，不改成持续等待。
7. 活动结束或用户要求停止时停止操作；手动暂停由用户恢复。`widget_disconnect({participantID})` 仅移除指定玩家的参与身份、撤销恢复凭据和活动权限，取消待执行请求，保留记录、MCP 通信和普通小组件工具。之后按用户要求直接 `widget_join({})`，无需重启 MCP。

席位数量由各小组件决定，MCP 不固定人数：五子棋 2 人，斗地主 3 人，谁是卧底可设置 4–6 人并由用户确认本局名单。小组件在 `interaction.connect` 前校验人数；候选过多时决定选择方式，负责角色分配和中途离席处理。宿主目前最多支持 15 个非人类参与者加一个用户，这是技术上限，不是游戏规则。运行上下文中有用户身份，不代表用户必须占用游戏席位。

MCP 不能唤醒已经结束的模型 turn，外部 Agent 连续参与时须保持等待循环。多个对话可以共用一份 MCP 配置和同一个进程：各自创建玩家，并在工具参数中使用各自的 participantID。桥接不从应用名或模型名猜测对话身份。

活动提示词示例：

> 首次使用 widget_join({}) 加入 Pudding 候选池，保留返回的 participantID，仅用于本对话。为该 ID 上报已知模型和提供商，然后持续调用 widget_wait({participantID}) 等待。我开始活动后，携带同一 ID 读取该实例的说明和接口，按规则参与到结束或我要求停止。无事件时继续等，不重复新建玩家。意外重连使用 widget_join({participantID}) 恢复，恢复后先观察当前状态，不重放结果不明的操作。不要使用其他对话的玩家 ID。

## 工具

| 工具 | 作用 |
| --- | --- |
| `widget_join` | `{}` 创建新玩家；`{participantID}` 恢复／复用原玩家及席位。模型参数和结果不包含恢复凭据 |
| `widget_set_profile` | 必须带 `participantID`；自报该玩家的已知模型和提供商，只影响显示 |
| `widget_targets` | 发现可用普通小组件和活动；未分配的活动返回 participation_required |
| `widget_observe` | 读取指定目标的说明、接口、页面文本，或按需读取控件/截图 |
| `widget_invoke` | 按小组件声明的接口和参数执行操作 |
| `widget_wait` | 必须带 `participantID`；默认等待 10 秒、最多 25 秒；无事件正常返回 `status: "waiting"` |
| `widget_click` | 点击已观察到的控件或坐标 |
| `widget_type` | 输入文本 |
| `widget_scroll` | 滚动页面或容器 |
| `widget_disconnect` | 必须带 `participantID`；仅退出该玩家，其他玩家和普通工具继续可用 |

活动的 `widget_targets`、`widget_observe`、`widget_invoke`、`widget_click`、`widget_type` 和 `widget_scroll` 也携带同一 `participantID`。普通小组件无需加入，省略该 ID。使用 widget_join 返回的公开 ID，不要替换成小组件内部的席位 ID。

每个小组件的具体业务接口通过 `widget_observe` 发现，再通过 `widget_invoke` 调用，不会变成独立的 MCP 工具。

## 小组件说明与连接管理

MCP 初始化说明负责通用的加入、等待、发现和退出流程。小组件作者通过 [`pudding.setInstructions(text)`](widget-sdk.zh-CN.md#模型接口与页面输入) 声明自身用途与规则；`widget_observe` 总是返回 `instructions`，未声明时为空字符串。说明按目标实例隔离，已开始的多参与者活动仍须获得席位后才能观察和操作；它不覆盖用户要求、宿主权限或上层指令。

已加入的参与者断线后保留并标记离线，由用户手动移除，或由 Agent 主动退出自己的玩家。未加入的连接不会留下候选项。STDIO 初始化不会认领任何旧玩家；只有 `widget_join({participantID})`，或携带该 ID 的参与工具调用，才恢复对应玩家、模型显示和已有席位。只撤销该玩家的旧内部 HTTP 通道及其待执行请求，其他玩家与普通发现通道不受影响。恢复后先观察当前状态，不重放结果不明的旧操作。

同一个 STDIO 进程包含普通发现通道，以及每个 participantID 独立的 HTTP 通道。多个 Gemini 对话可共用同一份 MCP 配置而不合并身份。`--name` 只控制显示；不再根据 `--identity`、对应环境变量、应用名或 CODEX_THREAD_ID 选择恢复槽位。各对话必须在工具参数中使用自己的公开 ID。ID 用于已获本地授权的 MCP 配置内路由，不是对话身份认证凭证；不能冒用其他对话的 ID。客户端不提供稳定会话标识时，桥接无法自行推断。

Pudding 将私有恢复记录原子写入 `mcp/widget-identities/<participantID>.json`，绑定服务实例 ID，目录和文件仅当前用户可访问。适配器只读取该玩家的凭据，模型不保存、不传入凭据；沙箱客户端仍只需 mcp 目录读取权限。文件不能交给模型或其他参与者。保存失败则加入失败；同一桥接内并发恢复同一 ID 只打开一个玩家通道，不同 ID 不合并。

主动退出、手动移除或 Pudding 重启撤销恢复。记录缺失、损坏、错配、撤销或属于旧实例时均报错，不创建替代玩家。只有用户要求后再次显式调用 `widget_join({})` 才创建新玩家，并重新由用户选择席位。恢复仅覆盖同一 Pudding 实例内的传输断开。HTTP 通道失效时，本次调用报错，后续携带同一 ID 的调用恢复通道；不会自动重放写操作。直接 HTTP 客户端仍使用原有私有 resumeToken 流程，不能与托管桥接混用凭据。旧版配置哈希恢复记录不参与新身份恢复。

以上流程需要更新后的 Pudding 和随应用生成的 participantID 桥接；升级后重启 MCP。小组件业务规则无需修改。

此桥接不暴露 Core 凭证、通用文件操作、会话管理或小组件源码编辑。
