# 小组件 SDK 参考

[English](widget-sdk.md) · [开发文档](README.zh-CN.md) · [小组件开发](widget-development.zh-CN.md)

SDK 是 Pudding 提供给小组件的接口。通过 `import { pudding } from '@pudding/widget'` 使用；下文的 `state`、`query` 等方法都属于 `pudding`。以 `use` 开头的 React Hook 从同一个包单独导入。

首次开发请先完成[计数器示例](widget-development.zh-CN.md#首个小组件)。本文用于查找具体能力；准确类型见[SDK 声明](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs)。

## 能力索引

| 需求 | API |
| --- | --- |
| 复用按钮、表格、图表等界面组件 | `@pudding/ui` |
| 保存当前页面状态 | `state`、`useWidgetState` |
| 保存关闭页面后仍需保留的数据 | `storage`、`useStorage` |
| 读取外部服务 | `query`、`useQuery` |
| 修改外部服务的数据 | `action`、`useAction` |
| 让模型调用小组件的业务功能 | `defineInterface` |
| 组织多会话协作、请求模型行动 | `interaction`、`useWidgetInteraction` |
| 跟随 Pudding 的语言 | `locale`、`useWidgetLocale` |
| 复制文本 | `clipboard.writeText` |
| 发送操作系统通知 | `notifications` |
| 保存文本或二进制文件 | `exportFile` |
| 保存不同服务中记录之间的关联 | `links` |
| 请用户选择一个会话处理任务 | `requestAgent` |

## 宿主 UI 组件

从 `@pudding/ui` 导入。可用的基础组件包括 Button、Card、Input、Textarea、Badge、Table、Separator、Label 及其子组件。还提供三个组合组件：

| 组件 | 参数 | 行为 |
| --- | --- | --- |
| `Document` | `title?`、`children` | 排版标题与正文 |
| `DataTable` | `title?`、`columns: {key,label}[]`、`rows: Record<string,unknown>[]`、`exportName?` | 展示行数据；指定 exportName 后提供 CSV 导出 |
| `ChartView` | `title?`、`rows`、`xKey`、`series: {key,label?,color?}[]`、`type?: 'bar' \| 'line'` | 展示柱状图或折线图，默认柱状图，高度 320 像素 |

这些组件只负责展示传入的数据，不负责读取或保存，也不会创建 Studio Page 或表格。参数类型见 [WidgetComponents](https://github.com/teatak/pudding-desktop/blob/main/electron/WidgetComponents.tsx)。

自定义 CSS 需从 TSX 入口导入。编译器根据源码中的类名生成 Tailwind 样式；不要在运行时拼接无法被扫描的类名。内置颜色变量默认使用浅色值，仍需为小组件编写和检查深色样式。

## state 与 storage

先决定数据需要保留多久：

| | `state` | `storage` |
| --- | --- | --- |
| 适合保存 | 页面筛选、临时编辑、一局游戏的进度 | 待办、乐曲、账号草稿等长期数据 |
| 归属 | 当前运行页面及其源码版本 | Studio 中的小组件条目 |
| 刷新或重启后 | 页面仍存在时恢复 | 保留 |
| 显式关闭页面后 | 清除 | 保留 |
| 同一条目的多个独立页面 | 各自独立 | 共享 |
| 复制为新条目 | 新页面有自己的状态 | 复制当时的数据，此后独立 |

两者都保存 JSON 对象，并返回 `{version, data}`。`version` 是写入时用于检查冲突的版本号；`data` 是完整数据。允许 null、布尔、有限数字、字符串、数组和 JSON 对象。缺失值可省略或写成 null，不要传 undefined、Date 实例或函数。

| 方法 | 返回值 |
| --- | --- |
| `state.read()` | 同步返回 `DataSnapshot` |
| `state.write({expectedVersion, data})` | 提交成功后返回新快照的 Promise |
| `state.subscribe(listener)` | 取消订阅函数 |
| `useWidgetState()` | 随更新变化的页面快照 |
| `storage.read({signal?})` | 长期数据快照的 Promise |
| `storage.write({expectedVersion, data})` | 提交成功后返回新快照的 Promise |
| `storage.subscribe(listener)` | 取消订阅函数 |
| `useStorage()` | 包含加载状态、错误和快照的 TanStack Query 结果 |

写入会**替换整个 data 对象**，不是合并某几个字段。例如，修改 completed 时要保留其他字段：

```ts
const current = pudding.state.read();
await pudding.state.write({
  expectedVersion: current.version,
  data: { ...current.data, completed: true },
});
```

如果版本已变化，写入会被拒绝。重新读取后，按用户意图合并修改，再提交。state 和 storage 分别写入，两个调用不构成同一个事务。两者目前各有 256 KiB 的限制。

页面加载前宿主已恢复 state；只在数据不存在时设置默认值。`useStorage()` 可见时每五秒刷新，也会响应宿主的数据变化。加载未完成或读取失败时，不应把空对象当作已有数据写回。

已有页面可能继续运行旧源码，因此更新 storage 格式时要考虑旧页面。源码升级不会自动替你迁移业务数据。小组件公开界面和接口只应返回任务需要的数据；不要在其中保存连接凭据。

## 插件数据与操作

### 声明来源和请求

在 `widget.json` 的 sources 中给插件端点起一个本地名称，再在 operations 中声明可调用的请求。以下示例把 GitHub 端点命名为 gh，并提供 viewer 查询：

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

小组件调用 `query('viewer')`，由宿主使用所选 GitHub 连接发送请求。小组件不接收账号 token。`pluginID` 使用插件运行 ID，例如 github，而不是带仓库前缀的发布 ID。

动态参数用 JSON Pointer 取值，例如 `{"$input":"/id"}`。路径参数需在 pathParams 中声明；query 和 body 也可以引用输入值。请求必须符合插件的真实 API，不能把 operationID 替换成任意 URL。

### 读取和刷新

`query<T>(operationID, params?, options?)` 返回 Promise，options 可传 `{signal}` 以取消请求。结果为 `{data:T, fetchedAt, requestID, revisionHash, bindingVersion}`，其中 data 是服务响应。

`useQuery<T>(operationID, params?, {enabled?}?)` 返回 TanStack Query 结果。因此，Hook 的 `result.data?.data` 才是服务数据；外层 result 还包含 isPending、isFetching、error 和 refetch 等状态与方法。

Hook 在页面可见且 enabled 不为 false 时发起读取。它不因聚焦、重连、重新挂载或操作完成而自动刷新，也不提供定时轮询。需要时显式调用 `refetch()`；旧的 refreshMS 参数已被忽略。刷新只读取服务，不调用模型。

### 写入和切换账号

`action(operationID, params?)` 先由宿主准备操作并请用户确认，再返回操作记录；`useAction(operationID)` 提供对应的 mutation。检查返回对象的 `state` 字段：`succeeded` 表示成功，`failed` 表示失败，`unknown` 表示结果尚不确定。结果不确定时，先核对外部数据，再决定是否重试，不能直接报告成功。

小组件写入外部服务还要求插件端点声明 `widget_writes: true`。effectHint 只是操作声明的一部分，不能绕过插件和宿主的限制。

账号由宿主的来源选择器管理，与聊天会话使用的插件账号独立。切换账号时，按稳定账号身份区分长期数据和草稿，并清理当前选中项、忽略旧请求的响应，避免将旧账号的结果写入新账号。

## 模型接口与页面输入

模型可以操作页面控件，也可以调用你定义的接口。批量编辑、准确落子等操作适合提供接口；普通按钮不必逐个注册。

`defineInterface({name, description, input, run})` 注册接口并返回注销函数。input 使用 Zod 对象 schema；run 可以返回值或 Promise。组件卸载时应注销在 React effect 中注册的接口。

```ts
import { z } from 'zod';

const unregister = pudding.defineInterface({
  name: 'readSummary', description: '读取当前完成状态。',
  input: z.object({}).strict(),
  run: () => ({ completed: pudding.state.read().data.completed === true }),
});
```

模型使用 `widget_invoke({targetID, name, input, expectedStateVersion})` 调用，结果包含 `{result, stateVersion}`。宿主先检查页面版本，再运行接口。这个检查不覆盖 storage；修改长期数据仍需读取 storage 版本并在写入时传 expectedVersion。

run 的第二个参数 context 包含 callID、signal，以及可选的 sessionID、actor。共享协作中 actor 为 `{runID, participantID, notificationID?}`，由宿主提供。按它判断调用者角色，不信任 input 中自报的身份。异步工作结束后，写入前检查 signal 是否已取消。

页面按钮与模型接口应调用同一个业务函数。有参与者身份要求的异步按钮处理，用 `interaction.handle(context => ...)` 包裹；接口处理函数已带有该上下文。

模型也可使用 `widget_observe/click/type/scroll`。observe 默认不返回所有控件或截图，按需请求即可。接口应返回简短结果，大量历史另设读取接口。

接口限制：名称以字母开头，最多 64 个字母、数字或下划线；最多 64 个接口；说明最多 2000 字符；输入 schema 序列化后最多 16,000 字符；返回值最多 256 KiB。

## 参与者与模型通知

### 选择参与会话

普通分屏会话可共享当前页面。需要明确组织对局或协作任务时，再使用 interaction 管理参与者和行动请求。

`interaction.candidates()` 返回 `{sessions, preferredSessionIDs, connectedSessionIDs, maxSessions}`。sessions 中每项有 `{id, name, participantID?, model:{id,name,icon}}`。

外部 MCP 候选另有 `kind: "external"` 和 `connected: boolean`。宿主提供模型图标和自报的“模型名称 (MCP)”标签，未自报则显示 MCP。离线项保留，直到用户手动移除或 agent 主动退出。通过 `interaction.onCandidatesChanged(listener)` 订阅连接/模型变化后重新读取候选；返回值用于取消订阅。用户的移除按钮可调用 `interaction.removeCandidate({id})` 移除外部候选，不改变棋盘或运行参与者。agent 使用独立的 `widget_disconnect` MCP 工具退出自身连接。兼容旧宿主时先检查这些 SDK 方法是否存在。

选择器用 `connectedSessionIDs ?? preferredSessionIDs` 初始化一次：Studio 默认不选会话，单会话默认选择自己，分屏默认选择两侧。已有的空选择也要保留，不要在切换焦点时重新套用默认值。

`interaction.connect({sessionIDs})` 创建或更新协作运行，最多支持 15 个会话和一个人类参与者。宿主负责 participantID，组件负责棋手颜色、准备状态等业务角色。连接本身不会启动模型。

`interaction.read()` 返回 `WidgetRun | null`；`interaction.subscribe(listener)` 返回取消订阅函数；`useWidgetInteraction()` 供 React 读取。WidgetRun 包含运行状态、参与者和通知回执。

### 发送通知

```ts
{
  id: 'round-1-result',
  audience: { kind: 'all' }, // 或 {kind:'selected',participantIDs:[...]}
  delivery: 'inform',       // 或 'request-action'
  topic: 'result', summary: '本局结束', message: '本局已经完成。',
  data: { round: 1 }
}
```

上面的对象传给 `interaction.notify(notification)`。delivery 决定用途：

- `inform`：把信息加入会话上下文，不启动模型。
- `request-action`：请求模型处理任务。会话忙碌时等待，不中断当前工作。

audience 为 all 时包含发送者；selected 只投递给指定 participantID。summary 用作简短展示，message 写清任务，data 携带需要的公开业务数据。宿主会补充 targetID、参与者身份和当前 stateVersion。

先提交业务状态，再发通知。同一逻辑通知使用固定 ID，重试时保持内容一致；新事件使用新 ID。无需每手重复完整历史，也无需强制模型每次先 observe。定向投递不会把共享页面上的数据变成私密数据。

### 完成、暂停和恢复

`interaction.setRequests([{notificationID, participantID}, ...])` 指定哪些已有行动请求仍有效。完成一个任务时，移除它并保留其他待办请求；传 [] 会清除全部请求。已经清除的请求不能靠重发旧通知恢复。

`pause()` 暂停模型自动执行，`resume()` 继续，`disconnect()` 结束参与者连接并取消待执行工作，但保留业务数据。暂停时是否允许人类修改棋盘等行为，由组件的业务规则决定。

页面刷新或应用重启后，协作运行以暂停状态恢复。通过 `onResume(handler)` 根据当前业务状态生成仍需处理的新请求；该方法返回注销函数。不要重播已完成的结果，也不要将一次运行的 runID 当作永久业务 ID。

运行不再按累计时间自动暂停。保留手动暂停/继续，以及自动启动内部模型回合的 200 次上限；外部 MCP 操作不计入该回合上限。

## 语言

`locale.read()` 返回 zh-CN、zh-TW 或 en；`locale.subscribe(listener)` 返回取消订阅函数。React 中用 `useWidgetLocale()`，语言变化时会更新，不需要重载页面。

界面、错误、接口说明和通知摘要都应跟随语言。安装后显示在 Studio 中的名称由宿主管理，小组件内部文字仍需自己翻译。

## 运行时授权与剪贴板

权限按小组件条目和能力保存，独立于账号连接。首次使用时，Pudding 弹出“拒绝／允许”；没有“本次允许”。决定会保留，可在小组件的 **⋯ → 权限** 中修改。已有组件首次使用新权限时也需要授权。

`clipboard.writeText(text)` 返回 Promise，文本上限 256 KiB。成功后才显示“已复制”。程序读取剪贴板始终禁止；用户主动粘贴仍属于正常输入。

拒绝复制会使 Promise 以 `permission_denied: clipboard.write` 失败，这是正常的权限结果，不应再显示红色运行错误。首次拒绝后关闭弹窗；以后再次点击受限操作，宿主显示带“管理权限”和关闭按钮的中性横条。后台重试不显示该提示。

新小组件应使用 SDK。宿主也管理浏览器复制权限，但旧式同步复制 API 不能准确表达异步授权是否成功。

## 系统通知

系统通知显示在操作系统的通知界面中，和前面的会话通知是两种能力。它需要单独授权，不会启动模型。

1. 检查 `capabilities.systemNotifications`。
2. 用户开启提醒时，在可见页面调用 `notifications.requestPermission()`。
3. 获得 granted 后，用 `notifications.show()` 发送。

```ts
if (pudding.capabilities.systemNotifications) {
  const permission = await pudding.notifications.requestPermission();
  if (permission === 'granted') {
    await pudding.notifications.show({
      title: '计时结束', body: '可以休息一下了。', tag: 'focus-timer',
    });
  }
}
```

`notifications.getPermission()` 查询当前决定；requestPermission 返回决定。两者的结果均为 prompt、granted 或 denied。

| show 参数 | 要求 |
| --- | --- |
| title | 必填，1–120 字符 |
| body | 可选，最多 1000 字符 |
| tag | 可选，非空且最多 80 字符；同一条目内相同 tag 替换已有通知 |

宿主在通知中标明小组件名称，每个条目每三秒最多发送一条。点击通知回到原来打开小组件的位置，不触发模型执行。

show 收到原生投递回执后返回 `{shown:true}`。未发送时返回 `{shown:false, reason}`，reason 可为 permission_denied、permission_required、rate_limited、unavailable、closed、delivery_failed。拒绝授权不会抛异常；输入不合法会抛出校验错误。

已授权且仍在运行的后台页面可以通知。尚未决定权限的隐藏页面不能弹出授权，show 返回 permission_required。关闭、重载页面或撤销授权会关闭该实例已有通知；组件关闭后没有后台服务继续它的计时器。

系统通知设置和免打扰仍然有效，shown 不表示用户已经看到或阅读。应使用 SDK，而不是 `new Notification`。缺少该能力时，旧 SDK 可能没有这些方法；提供新 API 的宿主会以能力标记和 unavailable 结果表达不可用状态。始终先检测能力。

## 文件导出

`exportFile({filename, content, encoding?})` 打开系统保存对话框，返回 `{saved:boolean}`。用户取消时 saved 为 false。filename 是建议文件名，最终路径由用户选择。

- 文本：encoding 省略或为 utf8，content 为字符串，可保存 JSON、CSV、Markdown 等。
- 二进制：先检查 `capabilities.binaryFileExport`，传 encoding: base64，content 为 base64 字符串。解码后的文件上限为 8 MiB。

WAV 导出也使用这个通用接口。小组件不能自行写入任意文件路径，下载链接也不能代替该接口。

导入时可用文件输入框和 FileReader 读取用户选定的文件，校验完整内容后再替换数据。将进度放在现有控件内，避免新增提示行让编辑区上下跳动。

## 实体关联与会话交接

### 保存记录之间的关联

links 用于记住不同来源中两条记录的关系，例如 GitHub issue 与另一服务中的任务。

- `links.list()` 返回 `{links}`。
- `links.create({left,right})` 创建关联，两端均为 `{source,entityType,entityID}`。
- `links.remove(linkID)` 删除关联。

source 对应已声明的来源名，宿主补全插件和账号身份。保存后的记录包括 id、itemID、left、right、createdAt。创建和删除均由宿主请用户确认。切换账号后，已有关联仍属于原账号，不能自动解释为新账号的数据。

### 交给另一个会话处理

`requestAgent({prompt,context?})` 请用户选择会话并确认，然后提交任务。返回值取决于宿主，类型为 unknown。context 使用必要的 JSON 数据即可。

已建立协作运行的组件可用 interaction 的 request-action 通知参与者；临时请用户选会话时用 requestAgent。系统通知不承担这两种功能。

## 沙箱与错误

外部服务通过已声明的插件操作访问；文件保存、复制和通知通过 SDK 使用。小组件没有 daemon token、Node／Electron API、任意 fetch 或剪贴板读取能力。HTTPS 图片可按宿主规则加载，但不能附加连接凭据，这也不意味着组件可任意联网。

宿主管理页面文档。更新 React 渲染内容即可，不要调用 `document.open/write/writeln` 替换整页。表单原生提交被禁止，应阻止默认提交并调用业务处理函数。

源码、构建和运行错误由顶部错误条显示，详情可展开、滚动、复制、关闭。业务校验请返回具体字段和允许范围，避免整段 JSON。关闭错误提示不会重载页面；出现不同的新错误时仍会提示。
