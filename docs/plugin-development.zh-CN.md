# 插件开发

[English](plugin-development.md) · [开发文档](README.zh-CN.md) · [小组件接入](widget-sdk.zh-CN.md)

Pudding 插件声明外部端点、认证、连接配置和 Skill。宿主解析凭据，加载后提供通用 REST／GraphQL 工具或发现 MCP 工具。App 包已经被插件替代，新集成统一使用 `plugins/<name>/plugin.yaml`。

## 首个插件

```text
plugins/example-service/
  manifest.json
  plugin.yaml
  assets/icon.svg
  skills/records/SKILL.md
```

`plugin.yaml` 定义运行行为：

```yaml
id: example-service
name: Example Service
version: 1.0.0
description: Read Example Service records.
auth:
  required: true
  methods:
    - id: api-token
      type: bearer
      label: API token
      default: true
icon:
  svg: assets/icon.svg
endpoints:
  example_rest:
    kind: rest
    url: https://api.example.com
skills:
  - skills/records/SKILL.md
```

`manifest.json` 描述目录身份和完整包文件列表：

```json
{
  "kind": "pudding.plugin.manifest", "schema_version": 1,
  "id": "teatak/pudding-hub/plugins/example-service",
  "name": "example-service", "version": "1.0.0",
  "title": {"en": "Example Service", "zh-CN": "示例服务", "zh-TW": "範例服務"},
  "description": {"en": "Read service records.", "zh-CN": "读取服务记录。", "zh-TW": "讀取服務記錄。"},
  "files": ["plugin.yaml", "skills/records/SKILL.md", "assets/icon.svg"],
  "requires": {"pudding_plugin": "^1.0.0"}
}
```

运行 ID（`plugin.yaml.id`、`manifest.name`）为 `example-service`，目录 ID 为带仓库前缀的 `manifest.id`。版本保持一致。端点名以小写字母开头，只用小写字母、数字、下划线，优先使用 `example_rest` 这类带插件含义的名称。

## Skill 与模型工具

Skill 说明真实 API 行为和适用的用户请求：

```markdown
---
name: example-records
description: Read Example Service records when the user asks about them.
---

# Example records

Use endpoint `example_rest`. Read the service API before forming a request.
Select the account matching the user's intent before reading private records.
```

通过 `builtin_plugin_load(plugin_id, connection_id?)` 加载。REST 使用 `builtin_rest_request`；GraphQL 使用 `builtin_graphql_request`、`builtin_graphql_introspect`、`builtin_graphql_search`；MCP 端点解析完成后发现工具。Skill 应描述标识符、分页、自动注入字段和读写边界，不授予发送邮件、删除记录等外部写入的权限。

通过 LLM 创建本地已安装插件时，在 Code 模式加载 `plugin-authoring`，再调用 `builtin_plugin_save`，传入 `operation: create|update`、`plugin_id` 和完整 UTF-8 文件集合。更新前可读取 plugin 文件作用域。保存会先校验候选，再替换安装目录；它不是局部补丁，也不是 Hub 发布。Ask／Auto 模式确认持久包写入，Full Access 直接保存。不能覆盖内置或运行时插件。凭据通过连接设置配置，不写入包文件或聊天。

## 端点类型

| 类型 | 配置 | 执行方式 |
| --- | --- | --- |
| REST | `kind: rest`、`url` | 通用 HTTP 请求 |
| GraphQL | `kind: graphql`、`url` | 查询、内省和搜索工具 |
| HTTP MCP | `kind: mcp`、`transport: streamable_http`、`url` | 加载后发现工具 |
| stdio MCP | `kind: mcp`、`transport: stdio`、`command`，可选 `args`／`env` | 按需启动进程，需要 Code 能力 |

REST／GraphQL 地址默认固定，只有声明 `url_config` 才支持连接级覆盖。端点设置 `widget_writes: true` 才允许小组件准备外部写入，仍需宿主确认。小组件来源使用 `{pluginID:'example-service',endpoint:'example_rest'}`，不使用带仓库前缀的目录 ID。

MCP 调用需要按系统调整时，使用端点 `platforms` 覆盖，参考 [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml)。凭据保存在连接／私有 override 中，不写进提交到 Hub 的 env 字面量。

“添加 MCP 插件”界面把标准 `mcpServers` JSON 导入为简化的 `kind: mcp` 插件：只有一个 MCP 端点，不需要插件连接。敏感 header／环境变量 override 保存在私有配置中。加载机制与其他插件相同，不存在单独的 `builtin_mcp_load` 工具。简化 HTTP MCP 插件需要 Work 能力，stdio 需要 Code。

## 认证

在 `auth.methods` 声明方式，由用户在连接设置选择和配置。`required: false` 支持只有配置、没有凭据的连接，也适用于未声明认证的服务。

| 类型 | 用途 |
| --- | --- |
| `none` | 无凭据，仅用于认证可选时 |
| `bearer` | Bearer token |
| `token` | 可配置 authorization 前缀的 token |
| `basic` | 用户名／密码 HTTP 认证 |
| `header` | 写入声明的 header |
| `oauth2` | 由 provider 指定宿主已支持的认证提供方 |
| `token_exchange` | 连接字段交换短期 token |
| `session` | 交互式、声明式登录，返回托管凭据 |

填写一个 `oauth2` provider 名称，不会自动增加新的 OAuth 实现。使用宿主支持的提供方，并配置其认证服务。GitHub、Gmail 的用法参考[清单](../plugins/github/plugin.yaml)和 [Skill](../plugins/gmail/skills/mailbox/SKILL.md)。插件升级不能扩大现有 token 的 scope；所需 scope 变化后需要重新授权。Gmail 当前的读取／发送 scope 不代表拥有修改草稿或邮箱的权限。

### Token 交换

```yaml
auth:
  required: true
  methods:
    - id: app-credentials
      type: token_exchange
      token_exchange:
        url: https://example.com/oauth/token
        body_fields: {client_id: clientId, client_secret: clientSecret}
        access_token_field: access_token
        expires_in_field: expires_in
        token_type: Bearer
connection:
  fields:
    - {id: clientId, required: true}
    - {id: clientSecret, required: true, secret: true}
```

`body_fields` 将请求键映射到连接字段 ID；响应字段可用点分路径。Core 在 REST／GraphQL 请求时交换 token，缓存到临近过期。凭据和 token 响应不作为模型参数或结果暴露，参考[飞书](../plugins/feishu/plugin.yaml)。

### 交互式会话登录

```yaml
auth:
  required: true
  methods:
    - id: account-login
      type: session
      session:
        endpoint: private_api
        path: /login
        encoding: form
        inputs:
          - {id: account, label: Account, required: true}
          - {id: password, label: Password, required: true, secret: true}
          - {id: otp, label: Verification code, secret: true}
        parameters: {action: login}
        body_fields: {username: account, password: password, otp: otp}
        success_field: success
        error_code_field: error.code
        challenges: {otp_required: [otp]}
        outputs: {sid: data.sid}
        account_input: account
connection:
  fields:
    - id: sid
      required: true
      secret: true
      inject: [{target: header, name: X-Session-ID}]
endpoints:
  private_api:
    kind: rest
    url: https://server.example/api
    url_config: {label: Server URL, required: true}
```

该流程从 protocol 52 起提供。encoding 支持 form 或 JSON；输入保留原值，包括密码空白。`success_field` 必须为 JSON true。outputs 将 JSON 路径映射到已声明的 secret 字段，至少一个为必填凭据。可选 `expires_in_field` 为正秒数，上限一年。

登录属于设置操作，不是模型工具。challenge 指示下一次明确提交表单需要的输入，不保留尚未完成的服务端登录。失败保留旧连接，并发修改报冲突。宿主不保存密码、自动重新登录、重放失败业务请求、支持 cookie 会话或运行任意登录脚本。实际用例见 [Synology](../plugins/synology/plugin.yaml)。

## 连接与账号选择

`connection.selection` 默认 `user`。会话复用已保存绑定；没有绑定时，可解析唯一可用连接，但不会因此保存绑定。多个账号必须通过 `builtin_plugin_load(plugin_id, connection_id)` 明确选择，已经加载的插件也能这样切换；意图不清时询问用户。保存凭据不等于选择账号，REST／GraphQL 的 connection 参数只核对已经解析的账号。

`single_active` 支持保存多个连接，但只有一个全局活动选择，使用插件的活动连接设置，工具间共享。`automatic` 仅预留，清单校验会拒绝，不是第三种可用模式。会话绑定持久保存，但克隆／子会话不继承；连接缺失、删除或身份改变时需要重选，不自动回退。小组件有独立的明确资源绑定。

### 连接字段与注入

```yaml
connection:
  selection: user
  fields:
    - id: tenantId
      label: Tenant ID
      description: Tenant used for API requests.
      placeholder: example-tenant
      required: true
      inject:
        - {target: query, name: tenantId, methods: [GET, DELETE]}
        - {target: body, name: tenantId, methods: [POST, PUT, PATCH]}
        - {target: header, name: X-Tenant-ID}
```

字段有稳定、唯一的 ID，可配 label、description、placeholder、required、secret 和 inject。注入目标为 query、body、header，或 stdio MCP 的 env。未填 name 使用字段 ID；未填 methods 应用于相关 REST 方法。body 注入要求 `body_json` 是对象，不能与 `body_text` 混用。显式工具参数不被覆盖；Host、Content-Length 等禁止 header 会被拒绝。secret 隐藏表单输入，不代表静态加密保证。自动注入规则要写入该插件 Skill。

### 连接级地址与 TLS

```yaml
endpoints:
  service_rest:
    kind: rest
    url: https://server.example/api
    url_config:
      label: Service address
      placeholder: https://service.example/api
      required: true
```

只有声明 `url_config` 的 REST／GraphQL 端点能设置连接级地址。可选配置留空使用默认值，必填配置必须填写。只接受没有 userinfo、query、fragment 的 HTTP／HTTPS 地址；按端点名保存覆盖。MCP 地址和 header 使用私有 MCP override。

Protocol 53 为可配置 HTTPS 端点增加“忽略服务器证书错误”开关，默认关闭。它只对该连接／端点同时跳过证书链和主机名验证，应优先使用有效证书。修改 URL 清除例外；修改 session 连接策略需重新登录。作用于登录、REST、GraphQL 和小组件请求，不作用于浏览器、OAuth 或 token-exchange 地址。文本结果中的托管凭据会被脱敏。落盘和 API 细节见 [Core 实现说明](https://github.com/teatak/pudding-core/blob/main/docs/plugins.md)。

## 图标与本地化元数据

使用自包含的方形 `assets/icon.svg`，不含脚本、远程资源、字体或凭据。`plugin.yaml.icon` 控制运行图标，并可配置明暗主题的 color／background。`manifest.title`、description 使用语言映射，目录元数据维护英文、简中、繁中。图标和包同步更新，避免目录与安装后样式不一致。targets 声明支持的宿主目标，不复制未经验证的平台。

## 打包与预览版

在 Hub 中执行：

```bash
pnpm install
pnpm package-plugin example-service
# 打包全部插件源码目录：
pnpm package-plugins
```

命令会写发布文件和注册表。插件打包没有 `--dev` 模式，不为验证文档运行打包。打包器读取列出的 UTF-8 文件，检查基础 YAML／包结构，生成 `pudding.plugin.package` schema 1 和 SHA-256 元数据。安装时 Core 才完整校验运行清单、Skill 和端点；Hub 打包成功不等于运行校验通过。

插件包／注册表使用 `schema_version`、`package_sha256`，小组件则是 `schemaVersion`、`packageSHA256`。发布目录为 `plugins/<name>/releases/<version>/`；改动已发布包前应升版本。打包命令会重写选定版本的输出，运行前确认版本。凭据、lock 文件和私有 MCP override 不放入 `manifest.files`。

预览版使用独立版本，如 `1.1.0-preview.1`，在外层 manifest 设置 `preview: true`，可选 `channel: preview` 描述渠道。只有版本后缀不等于预览标记。用户在设置 → 高级开启插件预览版，小组件预览版有独立开关。第三方目录使用 `plugins/registry.json`，来源身份会保留，其他来源不能静默接管已安装包。

## 验证与参考

核对清单／运行 ID、版本、文件列表、Skill 路径、MCP 命令跨平台、连接切换、取消和登录失败保留旧数据。在隔离的 Pudding 数据目录安装，用小范围只读请求验证；外部写入须有明确用户授权。确认小组件可以读取端点，未获批准或未开放的写入仍被拦截。不能把向生产邮箱发信或执行删除当成打包测试。

运行类型与校验由 [Core 插件定义](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go)、[加载器](https://github.com/teatak/pudding-core/blob/main/internal/plugin/loader.go)实现；小组件公共接入见 [SDK 参考](widget-sdk.zh-CN.md)。内置／运行时插件由实现仓库维护，不通过 Hub 自行替换。
