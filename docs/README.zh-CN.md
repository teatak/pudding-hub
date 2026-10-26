# Pudding 开发文档

[English](README.md) · [Hub 首页](../README.zh-CN.md)

需要通过连接访问外部 REST、GraphQL 或 MCP 服务，并提供任务指引时，开发**插件**；需要可交互的 React 界面、调用已安装插件的接口时，开发**小组件**。App 包已经被插件替代，新集成统一使用 `plugin.yaml`。

| 指南 | 内容 |
| --- | --- |
| [插件开发](plugin-development.zh-CN.md) | 包结构、端点、认证、连接、Skill、本地创作与分发 |
| [小组件开发](widget-development.zh-CN.md) | 首个小组件、源码清单、账号绑定、模型交互、打包与验证 |
| [小组件 SDK 参考](widget-sdk.zh-CN.md) | 全部公开 SDK 方法、state 与 storage、查询与操作、权限、系统通知和文件导出 |

从[共享待办](../widgets/shared-todo/source/src/App.tsx)了解状态和模型接口，从 [Gmail 看板](../widgets/gmail-board/source/widget.json)了解插件数据接入；插件端点与认证可参考 [GitHub](../plugins/github/plugin.yaml)、[Synology](../plugins/synology/plugin.yaml)和 [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml)。

## 依据与维护

Hub 是面向作者的统一参考入口。中英文指南覆盖相同功能，新增公开能力时一起维护。SDK 1 包含随宿主逐步增加的能力；较新的原生功能应检查 `pudding.capabilities`，不能只凭 SDK 1 推断支持情况。

实现细节仍由 [Core 契约](https://github.com/teatak/pudding-core/blob/main/contracts/README.md)、[插件定义](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go)、[Desktop SDK 类型](https://github.com/teatak/pudding-desktop/blob/main/electron/widget-sdk.cjs)和 [Desktop 运行时授权](https://github.com/teatak/pudding-desktop/blob/main/docs/widget-permissions-design.md)说明。按当前源码记录的能力，可能需要比已安装正式版更新的 Desktop。

整理开发文档不会修改注册表包或发布版本。需要分发新版本时，按各指南的打包步骤操作。
