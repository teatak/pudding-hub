# Pudding Hub

Pudding Hub is the official public resource hub for Pudding. It hosts installable widgets and their editable source files.

Pudding Hub 是 Pudding 的官方公共资源仓库，用来发布可安装的小组件以及对应源码。

## Registry URL / 注册表地址

Widgets registry:

```text
https://raw.githubusercontent.com/teatak/pudding-hub/main/widgets/registry.json
```

Use this URL in Pudding to discover and install official widgets.

在 Pudding 中添加上面的地址，即可发现并安装官方小组件。

## Repository Layout / 仓库结构

```text
pudding-hub/
  package.json
  scripts/
    package-widget.mjs
  widgets/
    registry.json
    rps-decider/
      manifest.json
      card.pudding-card.json
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

Key files:

- `widgets/registry.json`: widget registry consumed by Pudding.
- `widgets/<name>/manifest.json`: metadata for one widget.
- `widgets/<name>/source/`: editable source files.
- `widgets/<name>/card.pudding-card.json`: installable runtime snapshot.
- `scripts/package-widget.mjs`: local packaging script.

关键文件：

- `widgets/registry.json`：Pudding 读取的小组件注册表。
- `widgets/<name>/manifest.json`：单个小组件的元数据。
- `widgets/<name>/source/`：可编辑源码。
- `widgets/<name>/card.pudding-card.json`：可安装的运行快照。
- `scripts/package-widget.mjs`：本仓库内置打包脚本。

## Widget ID Rules / 小组件 ID 规则

Official widgets use the same format as third-party GitHub widgets. There is no special short namespace.

官方小组件和第三方 GitHub 小组件使用同一套完整命名，不做特殊短命名。

Format:

```text
<owner>/<repo>/widgets/<name>
```

Examples:

```text
teatak/pudding-hub/widgets/rps-decider
teatak/pudding-hub/widgets/gomoku
foo/my-widgets/widgets/weather
```

Recommended validation rule:

- If a registry is loaded from `github.com/<owner>/<repo>`, every item id should start with `<owner>/<repo>/`.
- Widget names should use lowercase kebab-case: `rps-decider`, `weather-card`.
- The `id` is the stable install and upgrade key.

建议校验规则：

- 如果 registry 来自 `github.com/<owner>/<repo>`，其中的 item id 应该以 `<owner>/<repo>/` 开头。
- 小组件名使用小写 kebab-case，例如 `rps-decider`、`weather-card`。
- `id` 是安装和升级的稳定唯一键。

## Package Widgets / 打包小组件

Install dependencies if needed:

```bash
pnpm install
```

Package one widget:

```bash
pnpm package-widget rps-decider
```

Package all widgets listed in `widgets/registry.json`:

```bash
pnpm package-widgets
```

The packaging script:

1. Reads `widgets/<name>/manifest.json`.
2. Reads `widgets/<name>/source/index.html`.
3. Inlines local CSS and JS from the same `source/` directory.
4. Writes `widgets/<name>/card.pudding-card.json`.
5. Updates `card_sha256` in both `manifest.json` and `widgets/registry.json`.

打包脚本会：

1. 读取 `widgets/<name>/manifest.json`。
2. 读取 `widgets/<name>/source/index.html`。
3. 内联同一个 `source/` 目录里的本地 CSS 和 JS。
4. 写回 `widgets/<name>/card.pudding-card.json`。
5. 同步更新 `manifest.json` 和 `widgets/registry.json` 中的 `card_sha256`。

## Add A Widget / 添加小组件

1. Create a directory under `widgets/<name>/`.
2. Put editable files under `widgets/<name>/source/`.
3. Create `widgets/<name>/manifest.json`.
4. Run `pnpm package-widget <name>`.
5. Commit the updated source, card snapshot, manifest, and registry.

步骤：

1. 在 `widgets/<name>/` 下创建目录。
2. 将源码放到 `widgets/<name>/source/`。
3. 创建 `widgets/<name>/manifest.json`。
4. 运行 `pnpm package-widget <name>`。
5. 提交源码、运行快照、manifest 和 registry。

## Manifest Example / Manifest 示例

```json
{
  "version": 1,
  "kind": "pudding.widget",
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
    "en": "Resolve small disagreements with rock-paper-scissors."
  },
  "source": "./source/index.html",
  "card": "./card.pudding-card.json",
  "screenshots": [],
  "tags": ["game", "decision", "multi-session"],
  "orientation": "portrait",
  "initial_state": {}
}
```

## Source vs Snapshot / 源码与快照

`source/` is for humans and maintainers. Pudding installs `card.pudding-card.json`.

`source/` 给维护者编辑；Pudding 安装的是 `card.pudding-card.json`。

Do not edit `card.pudding-card.json` by hand unless you are debugging packaging output. Change source files, then run the package command.

除非调试打包产物，不要手改 `card.pudding-card.json`。应修改源码，然后重新运行打包命令。
