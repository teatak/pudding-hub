# 小组件开发

小组件是普通 React 源码包。规则由作者定义，平台只提供通用的页面观察/操作、可选接口、临时状态、长期存储、参与者和通知。

## 源码与包契约

`source/widget.json` 使用 `schemaVersion:1`、`sdkVersion:"1"`、`entry:"src/App.tsx"`，并显式声明 `sources` / `operations`。入口导出 React 组件。支持源码内的 TS、TSX、CSS、JSON、SVG；使用固定依赖，不带 package.json、构建脚本、外部模块或预编译 HTML。

外层 `manifest.json`：

```json
{
  "id": "teatak/pudding-hub/widgets/shared-todo",
  "version": "1.0.0",
  "title": {"en":"Shared Todo","zh-CN":"共享待办","zh-TW":"共享待辦"},
  "description": {"en":"One persistent list across all openings."},
  "requires": {"protocolVersion":18,"sdkVersion":"1"}
}
```

打包器生成 `pudding.widget.source-package`（schemaVersion 2），包含 source.files 和 fileHashes。Core 验证身份、最低宿主能力、完整包 SHA-256、逐文件哈希、路径、大小和 widget.json；Desktop 使用现有编译器，不执行 Hub 的构建脚本。使用 `PUDDING_CORE_DIR` 指定同一 Core 契约，并执行 `pnpm package-widget <name> --dev` 验证，再升版本正式打包。旧发布文件不可改写。

## state 与 storage

- `pudding.state.read/write/subscribe`、`useWidgetState()`：当前页面的持久快照，作者模块执行前恢复。`read()` 同步读取，必须等待 `await write(...)` 提交成功再通知或返回。刷新、崩溃与重启保留，显式关闭标签页清理；源码版本间隔离。页面与接口共用它。
- `pudding.storage.read/write/subscribe`、`useStorage()`：Studio item 的长期 JSON 数据，所有打开位置共享，重启、源码升级后仍保留。副本独立；源码预览不能写入。
- 写入必须提供读到的 `expectedVersion`。冲突时呈现错误并重新读取，不盲目自动覆盖。
- 不把业务数据放 localStorage。观察工具不会自动返回 state；未揭晓选择可保存在 state，但不能通过 DOM、通知、日志或接口返回暴露。

[共享待办](../widgets/shared-todo/source/src/App.tsx) 展示 UI 与 addTask / completeTask / deleteTask 接口共用同一个 CAS 写入函数，不启动互动会话。

原生表单提交由 sandbox 禁止。使用 `type="button"` 的按钮直接调用保存函数，输入框回车先 `preventDefault()` 再调用同一函数；不要依赖 form 的原生 submit。

## 页面操作与可选接口

页面提供可观察文字、清晰可访问名称和控件，模型可通过 widget_observe/click/type/scroll 操作。需要更精确的操作时，可用 `pudding.defineInterface({name,description,input:z.object(...),run(input,context)})` 声明接口；模型通过 widget_invoke 调用。两种入口任选，也可共存。不要求定义 placeStone 之类的接口，也不禁止作者定义。

模型身份取 `context.actor`，不能信任输入中的 sessionID、role 或 participantID。接口可以接收业务角色参数，但必须检查调用者确实拥有该角色。DOM 异步处理用 `pudding.interaction.handle(context=>...)` 保留 CDP 调用者身份。规则函数在更新状态前检查角色、当前业务状态、重复操作和 AbortSignal。没有主持者/棋类专用平台逻辑。

## 参与者与主动通知

`interaction.start({roles:[...]})` 打开宿主确认，由用户把角色分配给自己或明确会话。多个角色可属于同一参与者。不能自动把可见会话算作成员。

`interaction.notify({id,audience,delivery,topic,summary?,message,data?})`：

- `audience:{kind:"all"}` 全体；`{kind:"selected",participantIDs:[...]}` 定向。
- `delivery:"inform"` 只记录，不调用模型；`"request-action"` 请求行动，忙碌会话等待已有工作完成。
- `summary` 使用用户语言提供简短可见摘要；`message` 放完整操作说明，通知卡片将其折叠，模型仍收到完整内容。
- notification ID 和内容不可变；重复发送去重。业务完成后用 `setRequests` 保留仍有效的请求键。清除后不能靠重复旧通知重新唤醒。
- 暂停、结束、关闭由宿主管理。模型 turn 完成不等于业务完成，组件用自身规则判定。

[五子棋](../widgets/gomoku/source/src/App.tsx) 验证轮流行动：下一方定向行动请求，结束使用 `all + request-action` 通知全体，让各会话参与者自动处理结果。界面只写“通知全体”，不强调请求回复。
[猜拳](../widgets/rps-decider/source/src/App.tsx) 验证独立提交：同时请求尚未提交的参与者，双方提交后公开结果，并使用 `all + request-action` 通知全体。未揭晓选择随页面 state 保存，恢复后仍不得出现在接口返回、DOM、通知或错误中。作者和调试权限不构成对抗性保密边界。

## 安装与升级

来源记录包含 registry URL、包 ID、版本、包哈希和原始源码哈希。重复安装打开原 item；仅 LLM 首次编辑下载原版时创建副本，复制当前长期数据后各自独立，组件库无手动复制入口。升级只在当前源码仍等于安装源码且没有未提交编辑时允许，保存为新的 head，不自动启用；当前 active 和 storage 保留。用户通过现有版本历史预览/启用新源码。已归档的原项需要先恢复；不会静默另建同源安装。

## 验证

`PUDDING_CORE_DIR=... pnpm test` 验证包的不可改写性和样例规则。Desktop 的 `widget-hub` smoke 使用 `PUDDING_HUB_DIR` 读取当前源码，在隔离 home/端口中测试真实 guest 和 Core/MCP，不依赖线上 registry。外部模型的观察、决策效果及 Windows 需单独验收。

恢复互动会创建新的暂停运行，旧 target 与在途调用失效。作者注册 `pudding.interaction.onResume(async () => { ... })`，在用户继续且宿主核验参与者后，根据保存的状态生成当前有效请求；不重播旧回执或已结束的结果，不将持久业务数据绑定到临时 runID。结束互动保留页面，明确关闭标签页才清理。
