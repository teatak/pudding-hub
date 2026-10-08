# Pudding Hub

[中文](README.zh-CN.md)

Pudding Hub is the official public resource hub for Pudding. It hosts installable plugins and editable-source widgets with their editable source files.

## Registry URL

Plugins registry (Desktop protocol 8):

```text
https://teatak.github.io/pudding-hub/plugins/registry.json
```

Plugin sources live in `plugins/<name>/` with `plugin.yaml`; packages use `pudding.plugin.package` and `.pudding-plugin.json`. Rebuild a plugin with `pnpm package-plugin <name>`, or all plugins with `pnpm package-plugins`. The new registry contains the current source release of each plugin, including preview releases.

The `apps/` directory and its released packages remain unchanged for older clients.

Legacy Apps registry:

```text
https://teatak.github.io/pudding-hub/apps/registry.json
```

Widgets registry:

```text
https://teatak.github.io/pudding-hub/widgets/registry.json
```

Use these URLs in Pudding to discover and install official apps and widgets.

GitHub Pages should be enabled for this repository with source `main` branch and folder `/ (root)`.

## Registry Metadata

`widgets/registry.json` includes source-level display metadata:

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

`name` identifies the registry. `title` provides localized display metadata.

## Repository Layout

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

Key files:

- `widgets/registry.json`: widget registry consumed by Pudding.
- `widgets/<name>/manifest.json`: identity, version, localized metadata and host requirements.
- `widgets/<name>/source/`: editable source files.
- `widgets/<name>/releases/<version>/`: immutable release snapshot installed by Pudding.
- `scripts/package-widget.mjs`: local packaging script.

## Widget source packages

Widgets ship as React / TypeScript source packages (format 2), requiring Desktop protocol 18 and SDK 1. Current examples are Shared Todo, Gomoku 2.0.1, and RPS 2.0.1. Historical HTML releases remain immutable on disk and are excluded from install candidates.

```sh
pnpm install
export PUDDING_CORE_DIR=/path/to/pudding-core
pnpm package-widget shared-todo --dev
pnpm test
pnpm package-widgets
```

Use a Core checkout containing `cmd/widget-package`. The packager reads Core policy and invokes the same validator as installation. Publish against a committed Core revision matching the Desktop lock.

`manifest.json` declares identity, version, localized metadata and host requirements. `source/widget.json` and `source/src/` are editable runtime files. Releases include the complete source and per-file SHA-256 inventory; registry format 2 pins the complete package SHA-256. Existing release bytes cannot change. `--dev` writes only the ignored `dev/` directory.

Install from Studio → Start creating → Widget library. Reinstall opens the existing item; copies have independent storage. Updates stage a source version for preview/activation, preserving the current running rules and all item data. Local source edits are never overwritten.

See [Widget development](docs/widget-development.md).
