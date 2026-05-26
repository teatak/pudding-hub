# Pudding Hub

[中文](README.zh-CN.md)

Pudding Hub is the official public resource hub for Pudding. It hosts installable widgets and their editable source files.

## Registry URL

Widgets registry:

```text
https://raw.githubusercontent.com/teatak/pudding-hub/main/widgets/registry.json
```

Use this URL in Pudding to discover and install official widgets.

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
      widget.pudding-card.json
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
- `widgets/<name>/widget.pudding-card.json`: installable runtime snapshot.
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
- Widget names should use lowercase kebab-case: `rps-decider`, `weather-card`.
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

Package all widgets listed in `widgets/registry.json`:

```bash
pnpm package-widgets
```

The packaging script:

1. Reads `widgets/<name>/manifest.json`.
2. Reads `widgets/<name>/source/index.html`.
3. Inlines local CSS and JS from the same `source/` directory.
4. Writes `widgets/<name>/widget.pudding-card.json`.
5. Updates `card_sha256` in both `manifest.json` and `widgets/registry.json`.

## Add A Widget

1. Create a directory under `widgets/<name>/`.
2. Put editable files under `widgets/<name>/source/`.
3. Create `widgets/<name>/manifest.json`.
4. Run `pnpm package-widget <name>`.
5. Commit the updated source, card snapshot, manifest, and registry.

For the full development guide, see [Pudding Widget Development](docs/widget-development.md).

## Manifest Example

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
  "card": "./widget.pudding-card.json",
  "screenshots": [],
  "tags": ["game", "decision", "multi-session"],
  "orientation": "portrait",
  "initial_state": {}
}
```

## Source vs Snapshot

`source/` is for humans and maintainers. Pudding installs `widget.pudding-card.json`.

Do not edit `widget.pudding-card.json` by hand unless you are debugging packaging output. Change source files, then run the package command.
