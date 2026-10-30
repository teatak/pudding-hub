# AGENTS.md

回答尽量简短。

## 分发目录

- 小组件源码、正式包、预览包、开发包和注册表只维护在 `extensions/widgets/`。
- 仓库根目录的 `widgets/` 已停止维护。禁止向其中生成、复制或同步任何新包，禁止为了兼容旧路径新增镜像。已有公开历史包保持冻结，不覆盖、不删除。
- 通过 `scripts/package-widget.mjs` 打包，不手改发布包或哈希。发布版本不可覆盖。
- 分发规则见 [README](README.zh-CN.md#根索引与当前分发目录) 和 [小组件发布与升级](docs/widget-development.zh-CN.md#发布与升级)。
