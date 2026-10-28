# Pudding developer documentation

[中文](README.zh-CN.md) · [Hub home](../README.md)

Pudding has two extension types. **Plugins** connect external services. **Widgets** display content and provide interactive interfaces. They can work together or independently: the Gmail plugin provides mail APIs for the Gmail Board widget, while a Gomoku widget needs no external service.

App was the old name for a plugin and is no longer a separate extension type. New plugins use `plugin.yaml`.

## Where to start

| What you want to build | Guide |
| --- | --- |
| Let a model use an API or MCP service | [Plugin development](plugin-development.md) |
| Create an interface people can click and edit | [Widget development](widget-development.md) |
| Find APIs for storage, model interaction, copying or system notifications | [Widget SDK reference](widget-sdk.md) |
| Connect an external agent to running Pudding widgets | [Widget MCP setup](widget-mcp.md) |

The development guides provide steps and examples. The SDK reference explains methods, arguments and results by feature. Both are available in full in English and Chinese.

## Terms used in these guides

- **Host**: Pudding, which runs plugins and widgets. It handles compilation, persistence, service requests and permission prompts.
- **Endpoint**: A service entry declared by a plugin, such as the GitHub REST API. Tools use its name to select the service.
- **Connection**: An account, credentials and service address configured by the user. A plugin can have several connections.
- **Widget item**: A widget saved in Studio, with its own source and durable data.
- **Running page (instance)**: An open, executing widget page. Several conversations can access the same page; one item can also have several independently opened pages.
- **Skill**: Instructions supplied to a model. A plugin Skill explains how to use a service. An authoring Skill explains how to create or edit plugins or widgets.

Selecting an account chooses the data source. Granting clipboard or system notification permission decides which host capabilities a widget may use. These are separate settings.

## Examples

| Example | What it demonstrates |
| --- | --- |
| [Shared Todo](../extensions/widgets/shared-todo/source/src/App.tsx) | Persistence and model-callable operations |
| [Gmail Board](../extensions/widgets/gmail-board/source/widget.json) | Plugin sources and queries |
| [GitHub plugin](../extensions/plugins/github/plugin.yaml) | REST endpoints and authentication |
| [Synology plugin](../extensions/plugins/synology/plugin.yaml) | Custom service addresses and account login |
| [Sequential Thinking](../extensions/plugins/sequential-thinking/plugin.yaml) | MCP endpoints and platform-specific commands |

## Versions and maintenance

These guides describe current source. A newer capability may not yet be available in an installed release. SDK version 1 alone does not guarantee every native feature; check the relevant `pudding.capabilities` flag before use.

Hub maintains the developer guides in both languages. Bundled authoring Skills retain the instructions needed to complete a task and link here for details. Implementation references are the [Core contracts](https://github.com/teatak/pudding-core/blob/main/contracts/README.md), [plugin types](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go), [Widget SDK types](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs) and [authorization design](https://github.com/teatak/pudding-desktop/blob/main/docs/widget-permissions-design.md).
