# 小组件 SDK 参考

[English](widget-sdk.md) · [开发文档](README.zh-CN.md) · [小组件开发](widget-development.zh-CN.md)

通过 `import { pudding } from '@pudding/widget'` 使用宿主固定提供的 SDK。本文覆盖 SDK 1 的公开能力；准确类型由[运行时 TypeScript 声明](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs)定义，源码清单和外部操作由 Core 校验。

## 能力索引

| API | 用途 |
| --- | --- |
| `state.read/write/subscribe`、`useWidgetState` | 当前页面状态 |
| `storage.read/write/subscribe`、`useStorage` | 同一 item 各打开位置共享的长期数据 |
| `query`、`useQuery` | 已声明的插件读取 |
| `action`、`useAction` | 由宿主确认后执行的外部写入 |
| `defineInterface` | 供模型调用的类型化操作 |
| `interaction.*`、`useWidgetInteraction` | 参与者、模型通知和运行控制 |
| `locale.read/subscribe`、`useWidgetLocale` | 跟随 Pudding 语言 |
| `clipboard.writeText` | 授权后复制文本 |
| `notifications.getPermission/requestPermission/show` | 授权后发送系统通知 |
| `exportFile`、`capabilities` | 系统保存对话框与能力检测 |
| `links.list/create/remove` | 绑定来源中的实体关联 |
| `requestAgent` | 用户确认后交给选定会话 |

## 宿主 UI 组件

从 `@pudding/ui` 导入固定组件，不支持任意组件路径或自行安装依赖。宿主提供 Button、Card、Input、Textarea、Badge、Table、Separator、Label 系列，以及以下组合组件：

| 组件 | 参数 |
| --- | --- |
| `Document` | `title?`、`children` |
| `DataTable` | `title?`、`columns: {key,label}[]`、`rows: Record<string,unknown>[]`、`exportName?` |
| `ChartView` | `title?`、`rows`、`xKey`、`series: {key,label?,color?}[]`、`type?: 'bar' \| 'line'` |

`Document` 是排版容器，不会创建保存到 Studio 的 Page。`DataTable` 展示传入行，设置 exportName 后通过原生保存接口导出 CSV，不会创建 Studio 表格。`ChartView` 默认柱状图，图表高度 320 像素。这些组件本身不读取或持久化业务数据。准确参数见 [WidgetComponents](https://github.com/teatak/pudding-desktop/blob/main/electron/WidgetComponents.tsx)。

在 TSX 入口导入组件 CSS，编译器扫描源码类名生成 Tailwind 工具样式。内置颜色 token 默认浅色，作者仍需编写并验证明暗主题，不能假设已完整自动适配。避免使用会撑坏窄栏的固定尺寸。

## state 与 storage

两者都保存 JSON 对象，快照格式为 `{ version, data }`。JSON 值包括 null、布尔、有限数字、字符串、数组和由 JSON 值组成的对象。缺失值使用 null，不把 undefined、函数、Date 对象或凭据放入公开结果。

`state.read(): DataSnapshot` 同步返回已恢复、冻结的页面快照。`await state.write({expectedVersion, data})` 在宿主提交后整体替换对象，并返回新快照。`state.subscribe(listener)` 返回取消订阅函数；React 中使用 `useWidgetState()` 订阅。

页面存在期间，state 在刷新、崩溃和重启后保留；显式关闭页面清理。它按源码版本和页面身份隔离。`storage.read({signal?})` 异步读取；`storage.write({expectedVersion,data})` 同样整体替换。`storage.subscribe(listener)` 和 `useStorage()` 观察长期 item 数据，各打开位置共享，升级后保留。复制 item 时得到独立数据快照。Core 当前将 storage 限制为 256 KiB。

```ts
const current = pudding.state.read();
await pudding.state.write({
  expectedVersion: current.version,
  data: { ...current.data, completed: true },
});
```

冲突时重新读取并判断操作，不能盲目重试覆盖。通知或返回成功前必须等待写入完成。`useState` 只保存临时控件状态，不用 localStorage 另建业务存储。观察工具不会自动暴露 state，但作者和调试工具不属于对抗性的隔离边界。

## 插件数据与操作

在 `widget.json` 中声明来源槽位和操作：

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

`query<T>(operationID, params?, {signal?}?)` 返回 `{data:T, fetchedAt, requestID, revisionHash, bindingVersion}`。ID 对应已声明的操作，不能替换成任意 URL。请求模板可用 `{"$input":"/id"}` 映射到已声明的路径参数、query 或 body 字段；先读真实插件 API 再填写。凭据和连接级地址由 Core 解析，不经过小组件源码。

`useQuery<T>(operationID, params?, {enabled?}?)` 返回 TanStack Query 结果。仅可见时读取，stale time 为无限，不在聚焦、重连或重新挂载时自动刷新。历史 `refreshMS` 参数已经忽略，需要时由组件显式定时调用 `refetch()`。`useStorage()` 则在可见时刷新长期数据，包括每五秒一次刷新。

Hook 保留加载、错误状态和结果外层：`useQuery<T>(...).data?.data` 是服务返回值，`useStorage().data?.data` 是保存的 JSON 对象。不能把加载中或失败的读取当成成功的空结果。

`action(operationID, params?)` 经宿主准备和用户确认后，返回执行结果。`useAction(operationID)` 返回 mutation。声明写入不等于获得执行权限：插件端点须以 `widget_writes: true` 开放，仍需宿主审批。标记为读取不能授权写入。

通过宿主的来源选择器绑定连接。插件会话绑定与小组件资源绑定相互独立。切换账号时，长期草稿按稳定账号身份分区，清理页面选中项，丢弃旧请求结果。不要在源码中保存 API key，也不要用直接 fetch 绕过来源绑定。

## 模型接口与页面输入

`defineInterface({name, description, input, run})` 注册操作并返回注销函数。`input` 为 Zod 对象 schema；`run(input, context)` 可异步执行。注册一次，或在 React effect 中注册并返回注销函数。

```ts
import { z } from 'zod';

const unregister = pudding.defineInterface({
  name: 'readSummary', description: '读取当前完成状态。',
  input: z.object({}).strict(),
  run: () => ({ completed: pudding.state.read().data.completed === true }),
});
```

模型通过 `widget_invoke` 传入 `{targetID, name, input, expectedStateVersion}`。宿主注入调用者身份，版本过期时在运行接口前拒绝。返回值包含 `{result, stateVersion}`。`context` 含 `callID`、`signal`，以及可选的 `sessionID` 和 `actor:{runID,participantID,notificationID?}`。写入前检查取消和业务规则，不能把 input 中的角色或会话 ID 当成真实调用者。

页面上的可访问控件也能通过 `widget_observe/click/type/scroll` 操作，接口不是必需的。observe 默认返回精简信息，不会默认列出全部控件或截图。模型可用读取接口或页面观察补充状态。异步 DOM 业务操作用 `interaction.handle(context => ...)` 包裹，以保留宿主 actor 作用域；接口处理函数已经有该作用域。

接口名以字母开头，最多 64 个字母、数字或下划线；最多 64 个接口。说明最多 2000 字符，schema 序列化后最多 16,000 字符，结果最多 256 KiB。写操作保持原子性，只返回精简回执；大历史由独立读取接口按需返回。

## 参与者与模型通知

`interaction.read()` 返回 `WidgetRun | null`；`interaction.subscribe(listener)` 和 `useWidgetInteraction()` 观察公开运行信息。run 包含身份、状态、参与者和通知回执。模型与人类的 participantID 由宿主管理，业务角色由 state 保存。

`await interaction.candidates()` 返回 `{sessions, preferredSessionIDs, connectedSessionIDs, maxSessions}`。每个会话有 `{id,name,participantID?,model:{id,name,icon}}`。选择器只用 `connectedSessionIDs ?? preferredSessionIDs` 初始化一次：Studio 默认不选，会话默认自己，上下分屏默认两侧。`connect({sessionIDs})` 创建或更新明确运行，最多 15 个会话和一个人类。连接不会分配座位或唤醒模型。

`interaction.notify(notification)` 接受：

```ts
{
  id: 'round-1-result',
  audience: { kind: 'all' }, // 或 {kind:'selected',participantIDs:[...]}
  delivery: 'inform',       // 或 'request-action'
  topic: 'result', summary: '本局结束', message: '本局已经完成。',
  data: { round: 1 }
}
```

`inform` 仅记录上下文，不调用模型；`request-action` 请求指定参与者行动。这是会话通知，与系统通知不同。宿主附加目标、身份和当前 state version。先提交业务状态，再通知；通知 ID 稳定，同一 ID 和内容不可修改。data 只包含适当的公开数据，不放未揭晓选择或凭据。

`setRequests([{notificationID,participantID}, ...])` 只保留仍有效的请求键。清除会撤销待执行工作，重发旧通知不会恢复已清除请求。`pause()`、`resume()` 控制模型自动执行；`disconnect()` 移除连接但不删除业务数据。`onResume(handler)` 返回注销函数，用于恢复暂停运行时重新生成当前有效请求。旧 target/run ID 和回执不能充当长期业务身份。

## 语言

`locale.read()` 返回 `zh-CN`、`zh-TW` 或 `en`；`locale.subscribe(listener)` 返回取消订阅函数。`useWidgetLocale()` 在语言切换时更新，不重载组件。界面、错误、模型接口说明和通知摘要都应本地化。已安装小组件由宿主管理的标题／图标，与其内部界面分别处理。

## 运行时授权与剪贴板

授权按已安装 item 和能力分别保存，与账号、业务数据独立。首次使用由宿主 App 弹出“拒绝／允许”，两种决定都保留；在小组件 **⋯ → 权限** 中管理。新引入的权限，已有组件也从未询问开始。

`await clipboard.writeText(text)` 复制文本，上限 256 KiB。程序读取剪贴板始终禁止，用户主动粘贴仍是正常输入。拒绝时抛出 `permission_denied: clipboard.write`，不作为致命运行错误。Promise 成功后才能显示已复制。宿主也控制浏览器异步和旧式复制路径，新组件应使用 SDK Promise。

首次拒绝安静关闭。后续用户操作被已保存的拒绝拦截时，显示紧凑、中性的权限横条，提供管理权限与关闭；后台重试不提示。权限开关已经表达决定，不额外重复“已允许／未允许”。

## 系统通知

`capabilities.systemNotifications` 检测宿主 API。`notifications.getPermission()` 查询，`requestPermission()` 申请，返回 `prompt | granted | denied`，与剪贴板权限独立。应在用户开启提醒、组件可见时申请。

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

`show({title, body?, tag?})` 的 title 为 1–120 字符，body 最多 1000 字符，tag 非空且最多 80 字符。同一 item 的同 tag 通知替换已有通知。宿主添加小组件名称，每个 item 每三秒最多发送一条。点击返回原有小组件／会话挂载，不启动模型。

收到原生投递回执后返回 `{shown:true}`；否则为 `{shown:false,reason}`，原因包括 `permission_denied`、`permission_required`、`rate_limited`、`unavailable`、`closed`、`delivery_failed`。拒绝是正常结果，不抛异常；输入无效则在申请权限前抛出简短字段错误。

已授权且仍在运行的后台组件可发送。未授权的隐藏组件不能弹窗，show 返回 `permission_required`。关闭、重载实例或撤销权限会关闭其尚未结束的通知；没有服务在组件关闭后继续运行计时器。系统通知设置和专注／免打扰仍有效，shown 不表示用户已阅读。使用 SDK，不使用浏览器 `new Notification`。旧宿主的能力标记为 false，show 返回 unavailable。

## 文件导出

`capabilities.binaryFileExport` 检测原生导出能力。`exportFile({filename,content,encoding?})` 打开系统保存对话框，返回 `{saved:boolean}`。默认编码 `utf8`；`base64` 用于二进制内容，解码后上限 8 MiB。filename 只是建议名称，不授予任意路径写权限。取消是正常结果。工程 JSON、WAV 都使用这一通用接口，不需要业务专用文件系统能力。

导入可使用文件输入框／FileReader 读取用户选择的文件，完整校验后再替换状态。导入导出进度不应改变编辑区结构。不能用下载导航绕过原生导出能力。

## 实体关联与会话交接

`links.list()` 返回 `{links}`；`links.create({left,right})` 的两端使用 `{source,entityType,entityID}`，source 是已声明槽位，插件和账号身份由宿主解析。保存后的关联包含 `id,itemID,left,right,createdAt`。`links.remove(linkID)` 删除关联。创建和删除由宿主确认；切换来源账号时不能静默修改关联。

`requestAgent({prompt,context?})` 经用户确认后交给选定会话，返回宿主结果，类型为 unknown。context 保持 JSON 兼容且精简。它与明确连接的 run 中 `request-action` 通知不同；发送系统通知不意味着可以调用模型。

## 沙箱与错误

组件没有 daemon token、Node／Electron API、任意网络 fetch、剪贴板读取或文件路径访问权。使用声明的插件操作和宿主能力。HTTPS 图片遵循宿主加载策略，不等于通用联网权限。表单不能原生提交，不用 `document.open/write/writeln` 替换宿主管理的整份文档，更新 React／DOM 子树即可。

源码、构建和运行失败由宿主错误条展示简短摘要，详情可展开、滚动、复制和关闭。关闭提示不重载组件，不同的新错误仍可出现。校验、拒绝授权和业务结果应返回具体可操作的简短信息，避免重复整段 JSON 或全量数据集。
