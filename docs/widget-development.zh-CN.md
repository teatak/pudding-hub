# 小组件开发

[English](widget-development.md) · [开发文档](README.zh-CN.md) · [SDK 参考](widget-sdk.zh-CN.md)

小组件是可编辑的 React／TypeScript 源码包。宿主提供编译、数据接入和模型交互，作者负责界面和业务规则。不访问外部服务的小组件不需要插件。

## 首个小组件

在 Hub 中创建：

```text
widgets/counter/
  manifest.json
  source/widget.json
  source/src/App.tsx
```

`manifest.json` 为目录元数据：

```json
{
  "id": "teatak/pudding-hub/widgets/counter",
  "version": "1.0.0",
  "title": {"en": "Counter", "zh-CN": "计数器", "zh-TW": "計數器"},
  "description": {"en": "A page counter.", "zh-CN": "页面计数器。", "zh-TW": "頁面計數器。"},
  "requires": {"protocolVersion": 24, "sdkVersion": "1"}
}
```

`source/widget.json` 为运行契约：

```json
{
  "schemaVersion": 1, "sdkVersion": "1", "entry": "src/App.tsx",
  "sources": {}, "operations": {}
}
```

`source/src/App.tsx` 导出 React 组件：

```tsx
import { useState } from 'react';
import { pudding, useWidgetLocale, useWidgetState } from '@pudding/widget';

export default function App() {
  const snapshot = useWidgetState();
  const locale = useWidgetLocale();
  const [error, setError] = useState('');
  const count = typeof snapshot.data.count === 'number' ? snapshot.data.count : 0;
  const labels = {
    en: { title: 'Counter', add: 'Add one' },
    'zh-CN': { title: '计数器', add: '加一' },
    'zh-TW': { title: '計數器', add: '加一' },
  }[locale];
  async function add() {
    const current = pudding.state.read();
    const previous = typeof current.data.count === 'number' ? current.data.count : 0;
    try {
      await pudding.state.write({
        expectedVersion: current.version,
        data: { ...current.data, count: previous + 1 },
      });
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  return <main style={{ padding: 24 }}>
    <h1>{labels.title}</h1><output>{count}</output>
    <button type="button" onClick={() => void add()}>{labels.add}</button>
    {error ? <p role="alert">{error}</p> : null}
  </main>;
}
```

示例使用已恢复的页面状态，跟随 Pudding 三种语言，不在 localStorage 保存业务数据，也不维护第二份状态。若计数需要在显式关闭页面后继续保留，改用长期 item storage，见 [state 与 storage](widget-sdk.zh-CN.md#state-与-storage)。

## 源码与构建契约

使用 schema 1、SDK `"1"`，入口为 src 下的 TSX。允许在 src、assets、fixtures 的合法路径中放 TS／TSX、CSS、JSON、SVG。组件没有自己的包管理器、构建脚本、预编译 HTML、Node／Electron API 或任意 import。宿主固定提供 React、React DOM、TanStack Query、react-hook-form、Zod、Recharts、lucide-react、`@pudding/widget` 和受支持的 `@pudding/ui` 组件，不能假设其他 npm 依赖可用。

Core 当前限制 32 个源码文件、单文件 512 KiB、总计 2 MiB，分发包外壳另有限制。[Core 策略](https://github.com/teatak/pudding-core/blob/main/contracts/widget.json)统一规定限制和校验。外层清单的宿主要求应符合实际功能，较新原生功能还需[能力检测](widget-sdk.zh-CN.md#系统通知)。

宿主管理整份文档、沙箱和消息桥，更新渲染子树，不使用 `document.open/write/writeln`。原生表单提交被禁止，使用明确按钮，输入框回车先阻止默认提交，再调用同一处理函数。控件提供清晰名称和键盘操作，布局适应窗口宽度及明暗主题。

## 接入插件数据

sources 声明已安装插件 ID 和端点名，operations 声明受约束的读写操作。参考 [SDK 查询示例](widget-sdk.zh-CN.md#插件数据与操作)和 [Gmail 看板源码](../widgets/gmail-board/source/widget.json)。不要编造端点或嵌入凭据，账号由宿主来源选择器绑定，与会话中的插件账号独立。

长期数据和草稿按账号隔离，切换时清理临时选中项、忽略旧请求。来源变化可能更新页面绑定，不能把一个账号的响应写入另一个账号。外部写入必须由插件端点设置 `widget_writes: true` 并获得用户确认，不只看作者填写的 effect hint。

## 提供实用的模型操作

可访问控件支持 `widget_observe/click/type/scroll`。需要精确或批量操作时，用 `pudding.defineInterface` 配合 Zod 对象 schema 和简短说明注册。模型通过带当前 target 和 state version 的 `widget_invoke` 调用；两种方式可以共存。

UI 和接口共用业务函数。检查可信的 context.actor、取消、版本和业务规则，不以输入参数证明身份。批次先整体校验，再原子写入。返回精简回执，长历史由独立读取接口按需提供，详见[模型接口](widget-sdk.zh-CN.md#模型接口与页面输入)。

## 参与者与两类通知

多人或协作流程使用 `interaction.candidates/connect/notify/setRequests` 和运行控制。宿主绑定身份、调度行动，组件负责座位、准备与阶段。提交 state 后再请求模型行动。[SDK](widget-sdk.zh-CN.md#参与者与模型通知)说明参数、调用者作用域、通知去重和 onResume 恢复。

`interaction.notify` 面向已连接会话，可请求模型工作；`notifications.show` 则在独立运行时授权后发送操作系统通知，不调用模型。应在用户启用提醒时申请通知权限。剪贴板写入又是独立权限，文件导出沿用系统保存对话框。参见[运行时授权](widget-sdk.zh-CN.md#运行时授权与剪贴板)、[系统通知](widget-sdk.zh-CN.md#系统通知)、[文件导出](widget-sdk.zh-CN.md#文件导出)。

## 验证与打包

使用兼容的同级 Core、Desktop 源码和 Desktop 要求的 Node 版本，准备依赖并生成开发包：

```bash
pnpm install
npm --prefix ../pudding-desktop/web ci
PUDDING_CORE_DIR=../pudding-core npm --prefix ../pudding-desktop run core:prepare
PUDDING_CORE_DIR=../pudding-core PUDDING_DESKTOP_DIR=../pudding-desktop pnpm package-widget counter --dev
```

`--dev` 只写忽略的本地输出，不写注册表发布记录。打包器先调用 Core 源码包校验和 Desktop 真实 TypeScript／JS／CSS 编译器，再写输出，不执行组件源码。缺少编译依赖会失败。使用与被测 Desktop 相同的 Core 契约。

在 Pudding 中用 LLM 创作时，在 Code 模式加载 widget-authoring，打开持久 draft，用内置 `scope:"widget"` 文件工具编辑，然后提交、预览／检查和启用。保留返回的 widget ID，它可能是编辑副本。创建结果不确定时复用同一 clientRequestID 和原参数，不能以新建另一个 item 作为错误恢复。当前工具 schema 由 [Desktop 创作工具](https://github.com/teatak/pudding-desktop/blob/main/web/src/mcp/widgetSourceTools.ts)定义。

使用临时数据目录验证真实宿主：UI／模型操作、冲突、刷新和数据恢复、账号切换、三种语言、明暗主题、取消和拒绝授权。Desktop 的 widget-hub smoke 通过 PUDDING_HUB_DIR 读取本地源码夹具。Hub 测试需配置兼容的 PUDDING_CORE_DIR；外部模型和 Windows 验收分别进行。文档验证不需要发邮件或修改真实账号。

## 发布与升级

发布包为 `pudding.widget.source-package` schema 2，包含完整源码和逐文件 SHA-256，注册表固定整个包的哈希。manifest.json 包含身份、本地化标题／说明、宿主要求和可选自包含图标；source/widget.json 包含运行行为。当前目录由注册表决定，不沿用写死的首发清单。

改源码发布前升版本。`pnpm package-widget counter` 写正式包和注册表，`pnpm package-widgets` 打包全部组件目录。已发布小组件包字节不可修改。预览版用独立版本，如 `1.1.0-preview.1`，并设置 `"preview": true`；可选 channel 只描述渠道，仅版本后缀或 channel 不是小组件预览标记。设置 → 高级中的小组件和插件预览开关独立；关闭后不降级或删除已安装预览版。

重复安装打开原 item。首次通过 LLM 编辑下载原版，会复制源码和当时长期数据，之后独立。更新要求安装源码未被修改，不静默覆盖本地编辑。构建校验和启用后更新默认源码，已打开页面仍固定原版本，重载后才切换。长期 storage 保留，页面 state 属于各自版本。已安装图标属于包，目录标题本地化由宿主管理。
