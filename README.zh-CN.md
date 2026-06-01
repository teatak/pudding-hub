# Pudding Hub

[English](README.md)

Pudding Hub 是 Pudding 的官方公共资源仓库，用来发布可安装的小组件以及对应源码。

## 注册表地址

小组件注册表：

```text
https://raw.githubusercontent.com/teatak/pudding-hub/main/widgets/registry.json
```

在 Pudding 中添加上面的地址，即可发现并安装官方小组件。

## 仓库结构

```text
pudding-hub/
  package.json
  scripts/
    package-widget.mjs
  widgets/
    registry.json
    rps-decider/
      manifest.json
      README.md
      assets/
      source/
        index.html
        style.css
        src/
          app.js
          i18n.js
      screenshots/
        .gitkeep
      releases/
        1.0.0/
          manifest.json
          rps-decider.pudding-widget.json
          assets/
          source/
          screenshots/
```

关键文件：

- `widgets/registry.json`：Pudding 读取的小组件注册表。
- `widgets/<name>/manifest.json`：精简的身份、版本、兼容性和 package 指针。
- `widgets/<name>/source/`：可编辑源码。
- `widgets/<name>/releases/<version>/`：Pudding 安装的不可变发布快照。
- `scripts/package-widget.mjs`：本仓库内置打包脚本。

## 小组件 ID 规则

官方小组件和第三方 GitHub 小组件使用同一套完整命名，不做特殊短命名。

格式：

```text
<owner>/<repo>/widgets/<name>
```

示例：

```text
teatak/pudding-hub/widgets/rps-decider
teatak/pudding-hub/widgets/gomoku
foo/my-widgets/widgets/weather
```

建议校验规则：

- 如果 registry 来自 `github.com/<owner>/<repo>`，其中的 item id 应该以 `<owner>/<repo>/` 开头。
- 小组件名使用小写 kebab-case，例如 `rps-decider`、`weather-widget`。
- `id` 是安装和升级的稳定唯一键。

## 打包小组件

如果还没有安装依赖：

```bash
pnpm install
```

打包单个小组件：

```bash
pnpm package-widget rps-decider
```

生成本地测试临时包：

```bash
pnpm package-widget rps-decider --dev
```

打包 `widgets/registry.json` 中列出的所有小组件：

```bash
pnpm package-widgets
```

打包脚本会：

1. 读取 `widgets/<name>/manifest.json`。
2. 读取 `widgets/<name>/source/index.html`。
3. 内联同一个 `source/` 目录里的本地 CSS 和 JS。
4. 写入 `widgets/<name>/releases/<version>/<name>.pudding-widget.json`。
5. 将 assets、source、screenshots 和 manifest 复制到 release 目录。
6. 同步更新 `manifest.json` 和 `widgets/registry.json` 中的 `package_sha256`。

`--dev` 只写入 `widgets/<name>/dev/<name>.dev.pudding-widget.json` 和 `widgets/<name>/dev/manifest.json`，可反复覆盖，不更新 releases 或 registry。dev 包使用 `<widget-id>-dev`，会和正式小组件分开安装。

## 小组件发布流程

1. 修改 `widgets/<name>/source/` 下的源码。
2. 运行 `pnpm package-widget <name> --dev`。
3. 在 Pudding 中导入 `widgets/<name>/dev/<name>.dev.pudding-widget.json` 并测试。
4. 测试通过后，提升 `widgets/<name>/manifest.json` 中的 `version`。
5. 运行 `pnpm package-widget <name>` 生成 release 快照。
6. 提交源码、release 快照、manifest 和 registry。

## 添加小组件

1. 在 `widgets/<name>/` 下创建目录。
2. 将源码放到 `widgets/<name>/source/`。
3. 创建 `widgets/<name>/manifest.json`。
4. 用 `pnpm package-widget <name> --dev` 测试。
5. 用 `pnpm package-widget <name>` 发布。
6. 提交源码、release 快照、manifest 和 registry。

完整开发指南见 [Pudding 小组件开发指南](docs/widget-development.zh-CN.md)。

## 源码 Manifest 示例

`manifest.json` 保留小组件身份、市场展示信息、兼容性和当前 package 指针：

```json
{
  "kind": "pudding.widget.manifest",
  "schema_version": 1,
  "id": "teatak/pudding-hub/widgets/rps-decider",
  "name": "rps-decider",
  "title": {
    "zh-CN": "分歧终端机",
    "zh-TW": "分歧終端機",
    "en": "RPS Decider"
  },
  "version": "1.0.0",
  "description": {
    "zh-CN": "用石头剪刀布快速裁决分歧。",
    "en": "Resolve small disagreements with rock-paper-scissors."
  },
  "icon": "./assets/icon.svg",
  "screenshots": [],
  "tags": ["game", "decision", "multi-session"],
  "size": "lg",
  "orientation": "portrait",
  "author": { "name": "Pudding" },
  "package": "./releases/1.0.0/rps-decider.pudding-widget.json",
  "package_sha256": "...",
  "requires": {
    "widget_api": "^1.0.0"
  }
}
```

`size` 可选 `sm`、`md`、`lg`；不填时默认 `lg`。Pudding 当前将 `lg` 映射为横向/自动窗口至少 800x600，纵向窗口 600x800。

打包脚本固定从约定路径 `source/index.html` 读取源码。小组件默认状态属于源码逻辑；生成的 package 使用空 `initial_state` 对象。

Release 快照内也会包含精简的 `releases/<version>/manifest.json`，用于版本审计。

## 源码与快照

`source/` 给维护者编辑；Pudding 安装的是 `releases/<version>/` 下的快照。

除非调试打包产物，不要手改 `releases/<version>/` 下的文件。应修改源码，必要时提升 `version`，然后重新运行打包命令。
