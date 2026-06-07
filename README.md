# Pudding Hub

[中文](README.zh-CN.md)

Pudding Hub is the official public resource hub for Pudding. It hosts installable widgets and their editable source files.

## Registry URL

Widgets registry:

```text
https://raw.githubusercontent.com/teatak/pudding-hub/main/widgets/registry.json
```

Use this URL in Pudding to discover and install official widgets.

## Registry Metadata

`widgets/registry.json` includes source-level display metadata:

```json
{
  "kind": "pudding.widget.registry",
  "name": "pudding-widgets",
  "title": {
    "zh-CN": "Pudding 小组件",
    "zh-TW": "Pudding 小組件",
    "en": "Pudding Widgets"
  },
  "items": []
}
```

`name` is the stable source identifier. `title` is the localized display name. Pudding displays `title`, then falls back to `name`, then the registry URL.

## Repository Layout

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

Key files:

- `widgets/registry.json`: widget registry consumed by Pudding.
- `widgets/<name>/manifest.json`: slim identity, version, compatibility, and package pointer.
- `widgets/<name>/source/`: editable source files.
- `widgets/<name>/releases/<version>/`: immutable release snapshot installed by Pudding.
- `scripts/package-widget.mjs`: local packaging script.

## Widget ID Rules

Official widgets use the same format as third-party GitHub widgets. There is no special short namespace.

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
- Widget names should use lowercase kebab-case: `rps-decider`, `weather-widget`.
- The `id` is the stable install and upgrade key.

## Package Widgets

Install dependencies if needed:

```bash
pnpm install
```

Package one widget:

```bash
pnpm package-widget rps-decider
```

Build a temporary package for local testing:

```bash
pnpm package-widget rps-decider --dev
```

Package all widgets listed in `widgets/registry.json`:

```bash
pnpm package-widgets
```

The packaging script:

1. Reads `widgets/<name>/manifest.json`.
2. Reads `widgets/<name>/source/index.html`.
3. Inlines local CSS and JS from the same `source/` directory.
4. Writes `widgets/<name>/releases/<version>/<name>.pudding-widget.json`.
5. Copies release assets, source, screenshots, and manifest into the release directory.
6. Updates `package_sha256` in both `manifest.json` and `widgets/registry.json`.

`--dev` writes `widgets/<name>/dev/<name>.dev.pudding-widget.json` and `widgets/<name>/dev/manifest.json` only. It can be overwritten and does not update releases or registry. The dev package uses `<widget-id>-dev` so it installs separately from the release widget.

## Widget Release Flow

1. Edit files under `widgets/<name>/source/`.
2. Run `pnpm package-widget <name> --dev`.
3. Import `widgets/<name>/dev/<name>.dev.pudding-widget.json` into Pudding and test it.
4. If testing passes, bump `version` in `widgets/<name>/manifest.json`.
5. Run `pnpm package-widget <name>` to create the release snapshot.
6. Commit the source, release snapshot, manifest, and registry.

## Add A Widget

1. Create a directory under `widgets/<name>/`.
2. Put editable files under `widgets/<name>/source/`.
3. Create `widgets/<name>/manifest.json`.
4. Test with `pnpm package-widget <name> --dev`.
5. Release with `pnpm package-widget <name>`.
6. Commit the updated source, release snapshot, manifest, and registry.

For the full development guide, see [Pudding Widget Development](docs/widget-development.md).

## Source Manifest Example

`manifest.json` keeps widget identity, Hub listing metadata, compatibility, and the current package pointer:

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

`size` accepts `sm`, `md`, or `lg`; omit it to use `lg`. Pudding currently maps `lg` to at least 800x600 for landscape/auto widgets and 600x800 for portrait widgets.

Manifest `icon` is for Hub display only and may point to a local asset such as `./assets/icon.svg`. Package `widget.icon` is also named `icon`, but it is generated by inlining the conventional `assets/icon.svg` file as `data:image/svg+xml;base64,...`, so the generated `.pudding-widget.json` stays self-contained. It must not use `icon_url`, a relative path, or a remote URL.

The package script reads source from the conventional `source/index.html` path. Widget default state belongs in widget code; generated packages use an empty `initial_state` object.

Release snapshots also include compact `releases/<version>/manifest.json` for version auditing.

## Source vs Snapshot

`source/` is for humans and maintainers. Pudding installs the snapshot under `releases/<version>/`.

Do not edit files under `releases/<version>/` by hand unless you are debugging packaging output. Change source files, bump `version` when needed, then run the package command.
