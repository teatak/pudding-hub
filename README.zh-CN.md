# Pudding Hub

[English](README.md)

Pudding Hub 是 Pudding 的官方公共资源仓库，用来发布可安装的插件、可编辑源码小组件及对应源码。

## 注册表地址

插件注册表（Desktop protocol 8）：

```text
https://teatak.github.io/pudding-hub/plugins/registry.json
```

插件源码位于 `plugins/<name>/`，定义文件为 `plugin.yaml`，包格式为 `pudding.plugin.package`，扩展名为 `.pudding-plugin.json`。运行 `pnpm package-plugin <name>` 打包一个插件，或运行 `pnpm package-plugins` 打包全部插件。新注册表包含各插件当前源码版本，包括预览版本。

`apps/` 目录与已发布包保持不变，继续供旧客户端使用。

旧版 App 注册表：

```text
https://teatak.github.io/pudding-hub/apps/registry.json
```

小组件注册表：

```text
https://teatak.github.io/pudding-hub/widgets/registry.json
```

在 Pudding 中添加上面的地址，即可发现并安装官方 App 和小组件。

GitHub Pages 需要在仓库设置中开启，source 选 `main` 分支，folder 选 `/ (root)`。

## 注册表元信息

`widgets/registry.json` 包含源级展示信息：

```json
{
  "kind": "pudding.widget.registry",
  "schemaVersion": 2,
  "name": "pudding-widgets",
  "title": {
    "zh-CN": "Pudding 小组件",
    "zh-TW": "Pudding 小組件",
    "en": "Pudding Widgets"
  },
  "items": []
}
```

`name` 是稳定的源标识。`title` 是多语言展示名。Pudding 展示时优先使用 `title`，没有时降级到 `name`，再没有时显示 registry URL。

## 仓库结构

```text
pudding-hub/
  scripts/package-widget.mjs
  widgets/
    registry.json
    shared-todo/
      manifest.json
      README.md
      source/
        widget.json
        src/App.tsx
        src/style.css
      releases/1.0.0/shared-todo.pudding-widget.json
    gomoku/
    rps-decider/
```

关键文件：

- `widgets/registry.json`：Pudding 读取的小组件注册表。
- `widgets/<name>/manifest.json`：精简的身份、版本、兼容性和 package 指针。
- `widgets/<name>/source/`：可编辑源码。
- `widgets/<name>/releases/<version>/`：Pudding 安装的不可变发布快照。
- `scripts/package-widget.mjs`：本仓库内置打包脚本。

## 小组件源码包

Widget 使用 React / TypeScript 源码包（格式 2），需要支持协议 18、SDK 1 的 Desktop。
Hub 当前提供待办、五子棋 2.0.1 和猜拳 2.0.1。旧 HTML release 保留历史文件，不再进入安装候选列表；无旧 SDK 兼容运行时。

```sh
pnpm install
export PUDDING_CORE_DIR=/path/to/pudding-core
pnpm package-widget shared-todo --dev
pnpm test
pnpm package-widgets
```

`PUDDING_CORE_DIR` 必须指向包含 `cmd/widget-package` 的 Core 源码。打包器读取 Core 公共策略，并调用同一个 Go 校验器验证包，不维护第二套源码规则。正式发布时使用已提交、与 Desktop 锁定版本匹配的 Core。

- `widgets/<name>/manifest.json`：包 ID、版本、三语名称、简介和最低能力。
- `source/widget.json`、`source/src/*`：当前编辑源码，可使用固定的 `@pudding/widget` SDK。
- `releases/<version>/<name>.pudding-widget.json`：完整源码、文件 SHA-256 清单。已存在的版本不得改写；改源码必须升版本。
- `widgets/registry.json`：格式 2，只列新源码 release，提供完整包 SHA-256。
- `--dev` 仅输出到忽略的 `dev/`，不修改 registry 或正式 release。

Desktop 从 Studio → 开始创作 → 小组件库安装。重复安装打开原项；只有 LLM 首次编辑下载原版时创建独立副本，复制当时的长期数据，之后各自独立。更新保存为待启用版本，经过预览和启用后生效；有本地源码修改时拒绝覆盖。

制作规范与数据/通知示例见 [小组件开发](docs/widget-development.zh-CN.md)。
