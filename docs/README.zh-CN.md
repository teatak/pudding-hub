# Pudding 开发文档

[English](README.md) · [Hub 首页](../README.zh-CN.md)

Pudding 支持两种扩展：**插件**负责接入外部服务，**小组件**负责展示内容和提供交互。两者可以配合使用，也可以独立开发。例如，Gmail 插件提供邮件接口，Gmail 看板小组件用这些接口展示邮件；五子棋小组件则不需要外部服务。

App 是插件的旧名称，已不再作为独立扩展类型。新插件统一使用 `plugin.yaml`。

## 从哪里开始

| 你想做什么 | 阅读文档 |
| --- | --- |
| 让模型使用某个 API 或 MCP 服务 | [插件开发](plugin-development.zh-CN.md) |
| 制作一个可点击、可编辑的界面 | [小组件开发](widget-development.zh-CN.md) |
| 查询小组件如何保存数据、调用模型、复制内容或发送系统通知 | [小组件 SDK 参考](widget-sdk.zh-CN.md) |
| 让外部 agent 接入正在运行的 Pudding 小组件 | [小组件 MCP 接入](widget-mcp.zh-CN.md) |

开发指南包含步骤和示例。SDK 参考按功能解释方法、参数和返回值。两类文档都提供完整中英文版本。

## 文档中的几个概念

- **宿主**：运行小组件和插件的 Pudding。它负责编译、保存数据、调用外部服务和处理授权。
- **端点**：插件声明的一个服务入口，例如 GitHub REST API。端点名用于告诉工具应调用哪个服务。
- **连接**：用户为插件配置的账号、凭据和服务地址。同一个插件可以配置多个连接。
- **小组件条目（item）**：保存在 Studio 中的一份小组件，有自己的源码和长期数据。
- **运行页面（实例）**：小组件被打开后正在运行的页面。多个会话可以访问同一个页面；同一条目也可能被独立打开为多个页面。
- **Skill**：交给模型的使用说明。插件 Skill 说明如何使用服务，制作 Skill 说明如何创建或修改插件、小组件。

“连接某个账号”和“允许复制或发送系统通知”是两件事：前者选择数据来源，后者决定小组件可以使用哪些宿主能力。

## 参考示例

| 示例 | 适合参考的内容 |
| --- | --- |
| [共享待办](../extensions/widgets/shared-todo/source/src/App.tsx) | 保存数据、向模型提供操作接口 |
| [Gmail 看板](../extensions/widgets/gmail-board/source/widget.json) | 声明插件数据来源和查询 |
| [GitHub 插件](../extensions/plugins/github/plugin.yaml) | REST 端点和认证 |
| [Synology 插件](../extensions/plugins/synology/plugin.yaml) | 自定义服务地址和账号登录 |
| [Sequential Thinking](../extensions/plugins/sequential-thinking/plugin.yaml) | MCP 端点和不同系统下的启动方式 |

## 版本与维护

这些文档以当前源码为依据。较新的能力可能尚未包含在用户安装的版本中。SDK 版本同为 1，也不代表所有宿主都支持相同的原生能力；使用前应检查相应的 `pudding.capabilities` 标记。

Hub 维护面向开发者的指南，中英文同步更新。Pudding 内置制作 Skill 保留完成任务所需的操作说明，并链接到这里查询详细用法。实现细节见 [Core 契约](https://github.com/teatak/pudding-core/blob/main/contracts/README.md)、[插件类型](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go)、[Widget SDK 类型](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs)和[授权设计](https://github.com/teatak/pudding-desktop/blob/main/docs/widget-permissions-design.md)。
