# 插件开发

[English](plugin-development.md) · [开发文档](README.zh-CN.md) · [小组件 SDK](widget-sdk.zh-CN.md)

插件让 Pudding 调用外部服务。作者声明服务地址、认证方式和使用说明，Pudding 负责读取用户配置的连接并执行请求。插件可以提供 REST、GraphQL 或 MCP 端点，也可以被小组件用作数据来源。

App 已被插件替代，新插件使用 plugin.yaml。先创建服务定义和 Skill，在 Pudding 中配置连接并验证；需要分发给其他用户时，再通过 Hub 打包发布。

## 首个插件

以下示例使用虚构的 Example Service 地址来说明文件结构。实际开发时，用服务文档中的真实地址、认证方式和接口替换。

```text
plugins/example-service/
  manifest.json
  plugin.yaml
  assets/icon.svg
  skills/records/SKILL.md
```

### 1. 定义服务

plugin.yaml 是 Pudding 运行插件时读取的文件。示例声明了一个 REST 端点和 Bearer token 认证：

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

example_rest 是端点名，模型和小组件通过这个名称选择服务。端点名以小写字母开头，后面可用小写字母、数字和下划线。

### 2. 添加使用说明和图标

将下节的 Skill 示例保存为 skills/records/SKILL.md，并创建 assets/icon.svg。图标使用独立的正方形 SVG，不引用外部资源。Skill 中应写实际可用的操作、参数和结果，而不是仅描述产品功能。

### 3. 添加 Hub 发布信息

在 Hub 维护源码时，还需要 manifest.json。它列出包中包含的文件和安装目录中的显示信息：

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

这里有两个不同用途的 ID：

| 字段 | 示例 | 用途 |
| --- | --- | --- |
| plugin.yaml.id、manifest.name | example-service | Pudding 运行时识别插件；工具调用使用它 |
| manifest.id | teatak/pudding-hub/plugins/example-service | Hub 区分发布包及来源 |

两个文件的 version 必须一致，manifest.files 必须包含所有需要安装的文件。直接通过 Pudding 创建本地插件时，由制作工具保存运行文件，不需要手写 Hub 注册表。

## Skill 与模型工具

### 编写插件的使用 Skill

Skill 告诉模型何时使用插件，以及如何正确调用它。示例文件：

```markdown
---
name: example-records
description: Read Example Service records when the user asks about them.
---

# Example records

Use endpoint `example_rest`. Read the service API before forming a request.
Select the account matching the user's intent before reading private records.
```

实际 Skill 至少说明：使用哪个端点、如何找到记录 ID、如何分页、如何判断成功，以及哪些操作会修改外部数据。连接自动注入的字段也应说明，避免模型重复传入凭据。

加载插件使用 `builtin_plugin_load(plugin_id, connection_id?)`。随后可使用：

| 端点 | 工具 |
| --- | --- |
| REST | builtin_rest_request |
| GraphQL | builtin_graphql_request、builtin_graphql_introspect、builtin_graphql_search |
| MCP | 加载端点后发现的 MCP 工具 |

Skill 不能代替用户授权。用户要求起草邮件，不代表可以发送；具体操作按用户请求和宿主审批执行。

### 用模型制作插件

1. 在 Code 模式加载 plugin-authoring，获得 plugin-creator Skill 和 builtin_plugin_save。
2. 新建时准备完整运行文件。更新时，先用内置文件工具的 `scope:"plugin"` 读取现有包；连接和私有配置不会出现在这个范围内。
3. 调用 builtin_plugin_save，传 create 或 update、plugin_id 和完整 UTF-8 文件集合。保存先校验临时包，成功后才替换安装内容；遗漏的文件不会自动保留。
4. 在插件的连接设置中配置账号，再加载插件并执行小范围读取，确认能够工作。

Ask／Auto 模式会确认这次安装内容的写入，Full Access 直接保存。工具不允许覆盖内置或宿主提供的插件。它保存的是本地安装内容，不会发布到 Hub。

## 端点类型

| 类型 | 配置 | 用途 |
| --- | --- | --- |
| REST | kind: rest、url | HTTP API |
| GraphQL | kind: graphql、url | GraphQL 查询及相关工具 |
| HTTP MCP | kind: mcp、transport: streamable_http、url | 远程 MCP 服务 |
| stdio MCP | kind: mcp、transport: stdio、command，可选 args／env | 按需启动本地 MCP 进程，需要 Code 能力 |

REST／GraphQL 默认使用固定地址。用户需要填写自己的服务器地址时，再加 url_config，见[连接地址](#连接地址与-tls)。不同系统使用不同 MCP 启动命令时，配置 platforms，参考 [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml)。

小组件读取端点时使用 `{pluginID:'example-service', endpoint:'example_rest'}`。需要允许小组件修改外部数据时，在相应端点设置 widget_writes: true；实际执行仍由宿主确认。

### 导入已有 MCP 服务

“添加 MCP 插件”支持导入标准 mcpServers JSON。它生成简化的 kind: mcp 插件，只有一个端点，不需要单独的插件连接；敏感 header 和环境变量保存在私有配置中。HTTP 类型需要 Work 能力，stdio 类型需要 Code 能力。加载仍使用 builtin_plugin_load，没有单独的 builtin_mcp_load。

## 认证

auth.methods 描述用户可以选择的认证方式，凭据在连接设置中填写。包中只放字段定义，不放真实 token 或密码。认证可选时使用 required: false，也可以保存只有地址等配置的连接。

| 类型 | 使用场景 |
| --- | --- |
| none | 不需要凭据，仅用于认证可选的插件 |
| bearer | Authorization: Bearer token |
| token | 使用可配置前缀的 Authorization token |
| basic | HTTP 用户名／密码认证 |
| header | 将 token 放入指定 header |
| oauth2 | 使用 Pudding 已支持的 OAuth 提供方 |
| token_exchange | 用连接字段换取短期访问 token |
| session | 用户在设置中登录，保存服务返回的会话凭据 |

oauth2 的 provider 必须由宿主实现；只填写一个新名称并不能接入新的 OAuth 服务。参考 [GitHub 定义](../plugins/github/plugin.yaml)和 [Gmail Skill](../plugins/gmail/skills/mailbox/SKILL.md)。

更新插件声明不会扩大已有 token 的权限。需要新 scope 时，用户必须重新授权。例如，当前 Gmail 的读取和发送 scope 不包含编辑草稿、归档或修改标签。

### Token exchange

适用于使用应用 ID、密钥换取短期 token 的服务：

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

body_fields 的左侧是 token 请求中的参数名，右侧是 connection.fields 中的字段 ID。access_token_field、expires_in_field 指定响应中读取结果的位置，支持点分隔路径。Core 在 REST／GraphQL 请求前完成交换，并在接近过期时刷新缓存。模型不需要自行读取密钥或执行 token 请求。参考[飞书插件](../plugins/feishu/plugin.yaml)。

### 交互式会话登录

适用于先提交账号、密码或验证码，再取得 session token 的服务：

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

这一能力从协议 52 开始支持。几个主要字段的含义：

| 字段 | 含义 |
| --- | --- |
| endpoint、path | 登录请求发送到哪个已声明端点及路径 |
| encoding | form 或 json 请求编码 |
| inputs | 设置界面收集的输入，密码等标为 secret |
| body_fields | 将输入映射到登录请求参数 |
| success_field | 指向响应中的成功标记，值须为 JSON true |
| challenges | 服务要求补充输入时，返回哪些输入字段，例如验证码 |
| outputs | 将响应字段保存为声明过的 secret 连接字段 |

至少要有一个必填的凭据输出。可选的 expires_in_field 表示有效秒数，必须为正且不超过一年。密码等输入保留原始字符，包括首尾空格。

登录由用户在设置中操作，不提供给模型作为工具。验证码要求再次提交表单；宿主不保存未完成登录的密码或挑战。登录失败保留原连接，并发修改会报冲突。当前不支持 cookie 登录、自动重新登录或任意登录脚本。完整示例见 [Synology](../plugins/synology/plugin.yaml)。

## 连接与账号选择

connection.selection 决定多个连接如何被选择：

| 值 | 行为 |
| --- | --- |
| user（默认） | 每个聊天会话选择自己的连接 |
| single_active | 插件所有使用方共享一个全局选中的连接 |
| automatic | 保留值，当前不能使用 |

user 模式先复用会话已有绑定。没有绑定且只有一个可用连接时，可直接使用它，但不会自动保存绑定；有多个连接时，通过 `builtin_plugin_load(plugin_id, connection_id)` 明确选择。插件已加载时也可再次调用来切换。账号意图不明确时再向用户询问。

保存凭据、选择账号、启用插件是三个独立操作。REST／GraphQL 工具的 connection 参数只检查当前解析出的连接，不能用来切换账号。会话绑定重启后保留，不传给克隆或子会话；连接被删除或身份改变后需要重新选择。

小组件使用自己明确选择的来源连接，不继承聊天的插件绑定。

### 连接字段与自动注入

除认证外，服务可能要求 tenantId 等每个连接不同的配置：

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

字段支持 label、description、placeholder、required、secret。secret 用于隐藏输入显示，不表示数据一定加密落盘。

inject 指定请求时如何使用字段：query、body、header，或 stdio MCP 的 env。省略 name 使用字段 ID；省略 methods 表示适用于相关 REST 方法。显式传入的请求值不会被自动注入覆盖。

body 注入要求请求使用对象形式的 body_json，不能与 body_text 混用。Host、Content-Length 等禁止的 header 会在校验时被拒绝。

### 连接地址与 TLS

允许用户填写服务地址的端点示例：

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

只有声明了 url_config 的 REST／GraphQL 端点支持按连接设置地址。required 为 true 时必须填写；否则留空沿用默认地址。地址只接受 HTTP／HTTPS，不能包含用户名、密码、query 或 fragment。MCP 的地址和 header 通过私有 MCP 配置管理。

协议 53 增加“忽略服务器证书错误”开关，仅适用于可配置的 HTTPS 端点，默认关闭。启用后，该连接的该端点不校验证书链和主机名；优先使用有效证书。

改变 URL 会清除例外；会话登录类连接改变此设置后需要重新登录。例外适用于登录、REST、GraphQL 和小组件请求，不影响浏览器或 OAuth／token exchange 地址。持久化和 API 细节见 [Core 实现说明](https://github.com/teatak/pudding-core/blob/main/docs/plugins.md)。

## 图标与多语言信息

图标放在 assets/icon.svg，使用独立 SVG，不包含脚本、远程资源或凭据。plugin.yaml.icon 指定运行时图标，可设置浅色和深色下的 color、background。

Hub 的 manifest.title 和 description 提供语言映射，维护英文、简中和繁中名称与说明。修改后一起更新源码与发布包，避免安装前后的显示不一致。targets 只填写已经支持并验证的宿主类型。

## 打包与预览版

在 Hub 中运行：

```bash
pnpm install
pnpm package-plugin example-service
# All plugin source directories:
pnpm package-plugins
```

这些命令会生成发布文件并修改注册表。插件打包目前没有 --dev 模式；它会重写所选版本的输出，因此修改已发布内容前应先升版本。

打包器读取 manifest.files 中的 UTF-8 文件，检查基本 YAML 和包结构，生成 pudding.plugin.package 格式 1 及 SHA-256 信息。完整的端点、认证和 Skill 校验由 Core 安装时执行，所以打包成功后还要安装验证。

发布目录是 `plugins/<name>/releases/<version>/`。插件包使用 schema_version、package_sha256 等下划线字段；小组件包使用 schemaVersion、packageSHA256。不要混用两种包格式，也不要将凭据、安装 lock 或私有 MCP 配置加入 files。

预览版使用独立版本，例如 1.1.0-preview.1，并在 manifest.json 设置 preview: true；可附带 channel: preview。仅版本后缀不够。用户在“设置 → 高级”开启插件预览版，小组件预览版是独立开关。

第三方分发使用 plugins/registry.json。Pudding 保留包的来源信息，不允许另一个来源静默替换已安装插件。

## 验证与参考

使用独立的 Pudding 数据目录安装和验证。先检查 ID、版本、文件列表和 Skill 路径，再测试真实连接和一个小范围读取。多个账号或自定义服务器是插件功能的一部分时，也验证切换、取消和登录失败后旧连接是否保留。

外部写入根据用户已经授权的任务测试；不要把发送真实邮件或删除生产数据作为普通安装检查。内置和宿主提供的插件通过对应仓库维护，不由 Hub 包覆盖。

准确字段和校验见 [Core 插件类型](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go)、[加载器](https://github.com/teatak/pudding-core/blob/main/internal/plugin/loader.go)。小组件接入见 [SDK 参考](widget-sdk.zh-CN.md)。
