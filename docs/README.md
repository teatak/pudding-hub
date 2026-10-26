# Pudding developer documentation

[中文](README.zh-CN.md) · [Hub home](../README.md)

Use a **plugin** to expose an external REST, GraphQL or MCP service with connections and task instructions. Use a **widget** to build an interactive React interface that can use installed plugin endpoints. App packages were replaced by plugins; new integrations use `plugin.yaml`.

| Guide | Contents |
| --- | --- |
| [Plugin development](plugin-development.md) | Package layout, endpoints, authentication, connections, Skills, local authoring and distribution |
| [Widget development](widget-development.md) | First widget, source manifest, account binding, model interaction, packaging and validation |
| [Widget SDK reference](widget-sdk.md) | Every public SDK method, state and storage, queries and actions, permissions, system notifications and exports |

Start with [Shared Todo](../widgets/shared-todo/source/src/App.tsx) for state and model interfaces, [Gmail Board](../widgets/gmail-board/source/widget.json) for a plugin-backed widget, and [GitHub](../plugins/github/plugin.yaml), [Synology](../plugins/synology/plugin.yaml) or [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml) for plugin endpoint and authentication examples.

## Sources and maintenance

Hub is the shared author-facing reference. English and Chinese guides cover the same features. Keep them together when changing a public capability. Widget SDK 1 is a family of host-provided capabilities; check `pudding.capabilities` for newer native features instead of inferring support from SDK 1 alone.

Implementation details remain with [Core contracts](https://github.com/teatak/pudding-core/blob/main/contracts/README.md), [plugin definitions](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go), [Desktop SDK types](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs) and [Desktop runtime authorization](https://github.com/teatak/pudding-desktop/blob/main/docs/widget-permissions-design.md). A feature documented from current source may require a newer Desktop build than the installed release.

Developer documentation does not change registry packages or publish releases. Follow each guide's packaging steps when distributing a new version.
