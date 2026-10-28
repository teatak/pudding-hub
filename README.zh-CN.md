# Pudding Hub

[English](README.md)

Pudding Hub 是 Pudding 的官方扩展仓库，保存插件、小组件的源码和安装包。

- **插件**接入外部服务，供模型或小组件调用。
- **小组件**提供可交互的界面，可以使用插件数据，也可以独立运行。

## 开发文档

从[开发文档总览](docs/README.zh-CN.md)选择入口：

| 文档 | 内容 |
| --- | --- |
| [插件开发](docs/plugin-development.zh-CN.md) | 定义服务、配置认证和连接、编写 Skill、验证与发布 |
| [小组件开发](docs/widget-development.zh-CN.md) | 完整示例、模型创作流程、接入数据、测试与发布 |
| [小组件 SDK](docs/widget-sdk.zh-CN.md) | 状态保存、模型接口、协作、剪贴板、系统通知与文件导出 |

[英文文档](docs/README.md)覆盖相同内容。

## 在 Pudding 中安装

Pudding 从注册表读取可安装资源及版本。官方地址：

| 类型 | 注册表 |
| --- | --- |
| 插件 | https://teatak.github.io/pudding-hub/plugins/registry.json |
| 小组件 | https://teatak.github.io/pudding-hub/widgets/registry.json |

在对应的来源管理中使用这些地址。小组件从 Studio 的小组件库安装；预览版本需要在“设置 → 高级”开启相应开关。

## 源码和发布包放在哪里

```text
plugins/<name>/
  plugin.yaml             # 服务、认证、连接和 Skill 路径
  manifest.json           # Hub 发布信息与文件列表
  skills/                 # 交给模型的使用说明
  releases/<version>/     # 已打包的安装内容
widgets/<name>/
  manifest.json           # Hub 发布信息与宿主要求
  source/widget.json      # 小组件运行入口和数据操作
  source/src/             # React、TypeScript 和样式
  releases/<version>/     # 已打包的源码版本
scripts/                  # 打包脚本
```

修改 source 或 Skill 文件不会更新用户已经安装的版本。需要按开发指南重新打包和发布。插件使用 pudding.plugin.package 格式；小组件使用 pudding.widget.source-package 格式，两者的字段和打包流程不同。

小组件可用 `pnpm package-widget <name> --dev` 生成开发包，结果写入忽略的 dev 目录。正式打包命令会修改发布文件和注册表，具体步骤见对应开发指南。发布新内容前更新版本，不覆盖已经发布的小组件包。

## 注册表与托管

plugins/registry.json 和 widgets/registry.json 是 Pudding 读取的安装清单。小组件注册表的基本结构：

```json
{
  "kind": "pudding.widget.registry",
  "schemaVersion": 2,
  "name": "pudding-widgets",
  "title": {"zh-CN":"Pudding 小组件","zh-TW":"Pudding 小組件","en":"Pudding Widgets"},
  "items": []
}
```

name 是稳定标识，title 是显示名称的语言映射。items 记录资源、版本和包哈希。上面的空数组仅用于说明结构，实际安装清单由打包流程维护。

仓库通过 GitHub Pages 托管，设置使用 main 分支的根目录。Pudding 校验下载包的 SHA-256，发布时需要一起更新包文件和注册表。

## 历史兼容

App 已被插件替代，不再作为独立开发类型。apps 目录和[历史注册表](https://teatak.github.io/pudding-hub/apps/registry.json)仅用于旧客户端兼容，新集成使用 plugin.yaml。

## 根索引与当前分发目录

新版客户端通过 [`index.json`](index.json) 发现来源。每个来源包含稳定 ID、多语言名称、
仓库地址，以及每种类型唯一的当前目录。官方目录和安装包统一放在
`extensions/widgets/`、`extensions/plugins/`；路径不随 SDK、API 或扩展版本变化。
原有 `widgets/`、`plugins/` 的公开目录和历史包继续保留给老客户端，开发源码也仍在原目录。

第三方维护者可以提交 PR，在 `index.json` 新增来源。目录使用 HTTPS 地址；迁移仓库或
目录时保留来源 ID。索引只负责发现，用户自行选择添加来源和安装扩展。
运行 `node scripts/validate-index.mjs` 校验，CI 使用同一份公开契约。

新正式包只写入 `extensions/`，`--dev` 开发包的行为不变。
`scripts/distribution.mjs` 按原始字节迁移历史产物，不重写已有包。清理旧公开路径需另行
决定：先确认受支持客户端都能读取根索引，当前目录也不再引用旧路径。不要删除开发源码
或用户已安装的数据。将来要恢复原公开路径，先准备好对应目录和包，再只修改索引中的
URL；来源 ID、包字节及哈希保持不变。本次不设置清理日期或自动删除机制。
