# 小组件开发

[English](widget-development.md) · [开发文档](README.zh-CN.md) · [SDK 参考](widget-sdk.zh-CN.md)

小组件是在 Pudding 中运行的 React／TypeScript 界面。它可以展示数据、提供交互，并向模型开放业务操作。Pudding 负责编译、保存数据和处理宿主权限，作者编写界面与业务规则。

只展示已有数据或运行本地游戏时，不需要插件。需要读取 Gmail、GitHub 等服务时，先安装对应插件，再让小组件使用它的端点。

## 选择制作方式

**在 Pudding 中用模型制作**：适合直接创建和修改自己的小组件。进入 Code 模式，加载 widget-authoring，按“打开草稿 → 编辑 → 提交 → 检查 → 启用”完成。详见下文[模型创作流程](#模型创作流程)。

**在 Hub 中开发和分发**：适合维护源码、测试和发布安装包。下面的计数器演示这一方式。Hub 的 manifest.json 是分发信息，运行源码仍是 widget.json 和 React 文件。

## 首个小组件

在 Hub 中创建以下文件：

```text
widgets/counter/
  manifest.json
  source/widget.json
  source/src/App.tsx
```

### 1. 填写发布信息

manifest.json 说明小组件的 ID、版本、显示名称及最低宿主要求：

```json
{
  "id": "teatak/pudding-hub/widgets/counter",
  "version": "1.0.0",
  "title": {"en": "Counter", "zh-CN": "计数器", "zh-TW": "計數器"},
  "description": {"en": "A page counter.", "zh-CN": "页面计数器。", "zh-TW": "頁面計數器。"},
  "requires": {"protocolVersion": 24, "sdkVersion": "1.1.0"}
}
```

### 2. 声明运行入口

source/widget.json 告诉 Pudding 从哪个文件开始运行。计数器不访问外部服务，所以 sources 和 operations 均为空：

```json
{
  "schemaVersion": 1, "sdkVersion": "1.1.0", "entry": "src/App.tsx",
  "sources": {}, "operations": {}
}
```

### 3. 编写界面

source/src/App.tsx 必须默认导出一个 React 组件：

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

点击按钮后，计数保存到当前页面的 state。刷新页面可以恢复，显式关闭页面后清除。如果关闭后也要保留，改用 storage；区别见 [state 与 storage](widget-sdk.zh-CN.md#state-与-storage)。useWidgetLocale 让按钮和标题跟随 Pudding 的语言设置。

### 4. 编译开发包

准备同级 Core、Desktop 仓库，使用 Desktop 要求的 Node 版本，然后在 Hub 执行：

```bash
pnpm install
npm --prefix ../pudding-desktop/web ci
PUDDING_CORE_DIR=../pudding-core npm --prefix ../pudding-desktop run core:prepare
PUDDING_CORE_DIR=../pudding-core PUDDING_DESKTOP_DIR=../pudding-desktop pnpm package-widget counter --dev
```

`--dev` 将结果写入忽略的 dev 目录，不生成正式发布记录。打包器会运行 Core 的源码包校验和 Desktop 的 TypeScript／JS／CSS 编译；编译失败时不会生成包。此步骤验证源码能否构建，实际交互仍需在 Pudding 中检查。

## 模型创作流程

模型通过 Pudding 内置工具编辑草稿，不直接改写安装目录：

1. 用 widget_list 查找已有小组件，用 widget_draft_open 新建或打开草稿。
2. 保留返回的 widget.id。首次编辑下载的小组件会创建独立副本，后续操作应使用副本 ID。
3. 使用内置文件工具，传 `scope:"widget"`、widget_id 和相对路径。修改用 builtin_file_patch，并传入最新 expectedDraftHash。
4. 编辑完成后调用 widget_commit，再用 widget_inspect 检查构建、查询、错误和画面。widget_preview 可用于先查看候选版本。
5. 修正问题后重新提交和检查。调用 widget_activate，确认 activeRevision 指向检查过的版本，才表示小组件已启用。

新建条目或首次创建编辑副本时需要 clientRequestID。它标识一次创建意图：响应丢失或结果不明时，使用同一 ID 和原参数重试，避免创建重复条目。打开已有自建条目或副本不需要再新建。

草稿可以暂时不完整。文件修改不会立即改变正在运行的页面；提交生成源码版本，启用才改变默认使用的版本。只要求草稿时无需启用。工具的准确参数见 [Desktop 创作工具](https://github.com/teatak/pudding-desktop/blob/main/web/src/mcp/widgetSourceTools.ts)。

## 源码要求

- widget.json 使用 schemaVersion: 1、sdkVersion: "1"，入口是 src 下的 TSX 文件。
- 源码校验允许规定路径下的 TS、TSX、CSS、JSON、SVG 文件，包括 src、assets、fixtures。发布内容只保留运行所需文件，不带测试用的虚构业务数据。
- 最多 32 个源码文件，单文件不超过 512 KiB，总计不超过 2 MiB。完整规则见 [Core 源码策略](https://github.com/teatak/pudding-core/blob/main/contracts/widget.json)。
- 依赖由宿主提供，包括 React、React DOM、TanStack Query、react-hook-form、Zod、Recharts、lucide-react、`@pudding/widget`、`@pudding/ui`。组件不能自行安装 npm 包或运行构建脚本。

从入口导入本地 CSS。界面要适应窄栏、明暗主题和键盘操作。表单通过业务函数处理，阻止原生提交；更新 React 内容即可，不要用 document.write 等方法替换宿主页面。

## 接入插件数据

先查看已安装插件的真实端点和 Skill，再在 widget.json 中声明 sources 和 operations。sources 指明插件和端点，operations 定义查询或写入请求。完整示例见 [SDK 数据接入](widget-sdk.zh-CN.md#插件数据与操作)和 [Gmail 看板](../widgets/gmail-board/source/widget.json)。

账号和凭据由 Pudding 的来源选择器管理，小组件无需接触 token。小组件使用的账号与聊天会话中的插件账号独立。按账号分别保存草稿和处理状态；切换后清理当前选中项，并忽略前一个账号尚未返回的请求。

外部写入通过 action 执行。插件端点必须声明 widget_writes: true，宿主还会请用户确认。查询失败应显示错误和重试入口，不能用示例数据代替真实结果。

## 提供实用的模型操作

对于“添加待办”“修改一小节”“在 H8 落子”这类操作，用 `pudding.defineInterface` 注册明确的输入和处理函数。模型通过 widget_invoke 调用，也可通过 observe、click 等工具操作页面。

按钮与模型接口共用业务函数。多人场景使用宿主提供的 context.actor 判断身份；修改前校验业务规则，异步操作后检查是否已取消。批量修改先整体校验，再一次写入。

写操作返回本次变更和新版本等简短结果。长历史、完整曲谱或大列表通过单独的读取接口按需获取。参数示例见 [SDK 模型接口](widget-sdk.zh-CN.md#模型接口与页面输入)。

## 参与者与两类通知

多个会话参与同一对局或协作任务时，用 interaction 选择参与者和请求行动。Pudding 负责身份和调度，小组件负责角色分配、准备、回合等规则。先保存业务状态，再发通知。

| 需求 | 使用方式 |
| --- | --- |
| 给参与会话补充信息 | interaction.notify，delivery: inform |
| 请求参与模型处理任务 | interaction.notify，delivery: request-action |
| 给用户发送操作系统提醒 | notifications.show，需要独立授权 |

会话通知和系统通知的目标不同。系统通知不会启动模型；剪贴板写入也有单独权限。文件导出由系统保存对话框处理。详见 [模型协作](widget-sdk.zh-CN.md#参与者与模型通知)、[剪贴板](widget-sdk.zh-CN.md#运行时授权与剪贴板)、[系统通知](widget-sdk.zh-CN.md#系统通知)和[文件导出](widget-sdk.zh-CN.md#文件导出)。

## 验证与打包

先使用开发包和临时 Pudding 数据目录验证，再打正式包。至少检查实际使用到的功能：

- 页面按钮和模型接口是否修改同一份数据；冲突、取消和错误是否被正确处理。
- 刷新、关闭重开和升级后的数据是否符合 state／storage 的约定。
- 账号切换、三种语言、窄栏及明暗主题是否正常。
- 使用复制、通知或导出时，拒绝授权和取消操作是否有正确反馈。

Desktop 的 widget-hub smoke 可通过 PUDDING_HUB_DIR 读取本地源码。运行 Hub 测试需配置兼容的 PUDDING_CORE_DIR；打包编译还需要匹配的 Desktop。测试通过不代表所有模型或平台都已验证，按实际测试范围记录结果。

## 发布与升级

### 正式版和预览版

发布包格式为 pudding.widget.source-package，schemaVersion 为 2，包含源码、逐文件哈希和包信息。registry.json 是 Pudding 读取的安装目录，记录完整包哈希。

发布新内容时先更新 manifest.json 的版本，再运行 `pnpm package-widget counter`。批量打包用 `pnpm package-widgets`。正式命令会写入 releases 和注册表；已有正式发布包不可覆盖。

发布正式更新前，用最低支持版本 Desktop 的 SDK／编译器检查实际发布包，并配合该版本锁定的 Core 验证主要交互。仅在当前开发版宿主上编译通过，不能证明向后兼容。

预览版使用独立版本，例如 1.1.0-preview.1，并在 manifest.json 设置 `"preview": true`。仅添加版本后缀或 channel 不会将小组件标记为预览版。用户在“设置 → 高级”开启小组件预览版；插件预览版是另一个开关。关闭开关不会降级或卸载已有预览版。

撤下有问题的版本时，将其目录发布记录移至该小组件的 `withdrawn.json`（`{"releases": [...]}`），并补充 `reason`。原包保留在原地址，不修改内容。目录测试仍会校验撤回包的哈希，并禁止同一版本同时出现在安装目录和撤回记录中。撤回只停止目录中的新安装，不会移除或降级已安装的版本。

### 已安装小组件如何更新

重复安装会打开原条目。通过模型首次编辑下载原版时，会复制源码和当时的 storage；原版和副本此后独立。

更新不会覆盖本地修改过的源码。通过校验并启用的新版本成为默认版本，已经打开的页面仍运行原版本，重载后才切换。storage 保留，state 按页面和源码版本区分。安装条目的图标由包提供，名称的语言切换由宿主管理。

正式包与目录写入 `extensions/widgets/`；历史路径保留。兼容声明遵循 [SDK 版本规则](widget-sdk.zh-CN.md#sdk-版本兼容)，不声明最低 Pudding 版本。
