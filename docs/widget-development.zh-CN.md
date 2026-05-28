# Pudding 小组件开发指南

[English](widget-development.md)

本文说明如何开发、打包和发布 Pudding Hub 小组件。

## 小组件是什么

Pudding 小组件是一种可交互 card，包含两部分：

- 源码：放在 `widgets/<name>/source/` 下的 HTML、CSS 和 JavaScript。
- package：`widgets/<name>/<name>.pudding-widget.json`，由打包脚本生成，Pudding 安装它。

维护者修改源码，再重新生成package。Pudding 安装的是package。

## 目录结构

每个小组件一个目录：

```text
widgets/
  <name>/
    manifest.json
    <name>.pudding-widget.json
    README.md
    source/
      index.html
      style.css
      src/
        app.js
        i18n.js
    screenshots/
      .gitkeep
```

`<name>` 使用小写 kebab-case，例如 `rps-decider` 或 `weather-card`。

`source/index.html` 是入口文件。打包时会把这个文件引用的本地 CSS 和 JS 内联进package。

## Manifest

每个小组件都需要 `widgets/<name>/manifest.json`。

```json
{
  "kind": "pudding.widget",
  "schema_version": 1,
  "id": "teatak/pudding-hub/widgets/rps-decider",
  "name": "rps-decider",
  "title": {
    "zh-CN": "分歧终端机",
    "zh-TW": "分歧終端機",
    "en": "RPS Decider"
  },
  "widget_version": "1.0.0",
  "description": {
    "zh-CN": "用石头剪刀布快速裁决分歧。",
    "zh-TW": "用猜拳快速裁決分歧。",
    "en": "Resolve small disagreements with rock-paper-scissors."
  },
  "source": "./source/index.html",
  "package": "./rps-decider.pudding-widget.json",
  "package_sha256": "...",
  "screenshots": [],
  "tags": ["game", "decision"],
  "orientation": "portrait",
  "initial_state": {}
}
```

关键字段：

- `id`：稳定的安装和升级键。本仓库使用 `<owner>/<repo>/widgets/<name>`。
- `name`：目录名和包名。
- `title`：多语言展示标题。至少包含 `en`，建议同时包含 `zh-CN` 和 `zh-TW`。
- `widget_version`：小组件语义化版本，用于升级。
- `source`：入口 HTML 路径，通常是 `./source/index.html`。
- `orientation`：`auto`、`portrait` 或 `landscape`。
- `initial_state`：card 初始状态。

## 构建与打包

安装依赖：

```bash
pnpm install
```

打包单个小组件：

```bash
pnpm package-widget rps-decider
```

打包 `widgets/registry.json` 中列出的所有小组件：

```bash
pnpm package-widgets
```

打包脚本会：

1. 读取 `manifest.json`。
2. 读取 `source/index.html`。
3. 内联 HTML 引用的本地 CSS 和 JS。
4. 压缩运行 HTML 快照。
5. 写入 `<name>.pudding-widget.json`。
6. 更新 `manifest.json` 和 `widgets/registry.json` 中的 `package_sha256`。

不要手动编辑 `<name>.pudding-widget.json`。应该修改 `source/`，然后重新打包。

## 运行时 API

小组件通过 `window.pudding` 和 Pudding 通信。

### 状态

```js
const state = window.pudding.getState();

window.pudding.onState((state) => {
  if (!state) return;
  render(state);
});

window.pudding.setState(nextState);
window.pudding.updateState((state) => ({ ...state, count: state.count + 1 }));
```

状态用于当前 card 实例，例如棋盘、表单输入、当前主题或本地 UI 阶段。

状态属于画布上的 card 实例，不属于已安装的小组件包本身。

### 动作

用户点击时发送小 action：

```js
button.addEventListener("click", () => {
  window.pudding.dispatch({ type: "choose_gesture", gesture: "rock" });
});
```

注册一个 action 处理函数：

```js
window.pudding.onAction((action, context) => {
  const state = window.pudding.getState();

  if (action.type === "choose_gesture") {
    const nextState = applyChoice(state, action, context);
    return { ok: true, state: nextState };
  }

  return { ok: false, error: "unknown_action" };
});
```

action 要小而明确，不要把完整 state 放进 action。

`context.actor` 标识谁触发了动作。`context.visible_sessions` 列出当前可见会话。Pudding 只提供身份；玩家、座位、回合和角色由小组件自己决定。

### 发送消息到会话

当小组件需要让某个 AI 或用户会话收到消息时，使用 `window.pudding.send(...)`。

```js
window.pudding.send({
  type: "request_gesture",
  to: { sessions: ["s_abc"] },
  text: "Choose rock, paper, or scissors. Call the widget action only.",
  data: { topic: "who washes dishes" },
  lock_until_done: false
});
```

也可以从 action 处理函数返回 `send`：

```js
return {
  ok: true,
  state: nextState,
  send: {
    type: "announce_result",
    to: { sessions: [winnerSessionID] },
    data: resultPayload,
    lock_until_done: false
  }
};
```

`lock_until_done` 默认是 `false`。只有需要防止重复点击，并且必须等目标会话回复完成后再解锁时，才设置为 `true`。

### 持久化小组件数据

排行榜这类需要跨 card 状态重置保留的数据，使用 widget data。

```js
const leaderboard = await window.pudding.getData("leaderboard");
await window.pudding.setData("leaderboard", nextLeaderboard);
await window.pudding.deleteData("leaderboard");
```

当前对局或 UI 放在 card state；长期的小组件自有数据放在 widget data。

### 主题

使用 Pudding theme token，不要硬编码应用颜色。

```js
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme?.mode || "dark";
}

applyTheme(window.pudding.theme);
window.pudding.onTheme(applyTheme);
```

推荐 CSS token：

```css
body {
  margin: 0;
  color: var(--pudding-fg);
  background: var(--pudding-bg);
  font-family: var(--pudding-font);
}

.panel {
  background: var(--pudding-card);
  border: 1px solid var(--pudding-border);
  border-radius: var(--pudding-radius);
}
```

### 多语言

使用 `window.pudding.locale` 和 `window.pudding.onLocale(...)`。

```js
const messages = {
  "zh-CN": { start: "开始" },
  "zh-TW": { start: "開始" },
  en: { start: "Start" }
};

let locale = "zh-CN";

function applyLocale(next) {
  const raw = typeof next === "object" ? next.locale : next;
  locale = raw === "zh-CN" || raw === "zh-TW" || raw === "en" ? raw : "zh-CN";
  document.documentElement.lang = locale;
  render(window.pudding.getState());
}

function t(key) {
  return messages[locale]?.[key] || messages.en[key] || key;
}

applyLocale(window.pudding.locale);
window.pudding.onLocale(applyLocale);
```

发布的小组件至少应该在 `title.en` 和运行时 UI 文案里提供英文。

## 面向 LLM 的设计

Pudding 小组件经常会被 LLM 操作。契约要无聊、明确、可预测：

- 使用清楚的 action 名：`choose_gesture`、`place_stone`、`reset_game`。
- 使用直白的字段：`gesture`、`row`、`col`、`topic`。
- 避免 `peer1`、`peer2` 或多重含义的 `result` 这类歧义命名。
- widget state 和 action 的 JSON 字段优先使用 snake_case。
- 不要把隐藏分数或历史规律暴露给 LLM prompt，避免影响后续决策。
- 在指令里提供完整、精确的 action 示例。

好的示例：

```json
{
  "id": "card-id",
  "action": {
    "type": "choose_gesture",
    "gesture": "rock"
  }
}
```

## 可访问性与布局

- 可点击控件使用真正的 button。
- 固定尺寸控件里的文本不要溢出。
- 支持亮色和暗色主题。
- 不要依赖只有 hover 才能出现的控件。
- 高棋盘类组件使用 `orientation: "portrait"`，宽工具类组件使用 `orientation: "landscape"`。
- 第一屏就应该可用；工具型 widget 不要做 landing page。

## 发布检查清单

发布前检查：

- `manifest.json` 有稳定的 `id`。
- `title` 包含 `en` 和目标中文语言。
- 用户可见变化已更新 `widget_version`。
- `source/` 包含可编辑实现。
- `pnpm package-widget <name>` 可以成功运行。
- 打包后 `<name>.pudding-widget.json` 已更新。
- `manifest.json` 和 `widgets/registry.json` 中的 `package_sha256` 已更新。
- 小组件在亮色和暗色主题下都可用。
- 小组件支持 `zh-CN`、`zh-TW` 和 `en`。
- 小组件不依赖外部网络资源。

## 快速流程

开发一个小组件的推荐流程：

1. 在 `widgets/<name>/source/` 写源码。
2. 在 `manifest.json` 里定义 `id`、标题、多语言、版本、方向和初始状态。
3. 用 `window.pudding.getState/onState/onAction/dispatch/send` 管理交互。
4. 用 `theme/onTheme` 和 CSS token 适配主题。
5. 用 `locale/onLocale` 适配中英文。
6. 运行 `pnpm package-widget <name>` 生成可安装快照。
7. 提交源码、快照、manifest 和 registry。

核心原则：源码给人维护，`<name>.pudding-widget.json` 给 Pudding 安装；小组件自己管理业务状态，Pudding 只提供身份、会话、主题、语言和消息通道。
