# Pudding App 开发

Pudding app 放在 `apps/<name>/` 下。一个 app 包通过 `app.yaml` 声明 API
endpoint、认证方式、skill、资源文件，以及可选的连接字段。

## 打包 App

打包单个 app：

```bash
pnpm package-app github
```

打包 `apps/registry.json` 中列出的所有 app：

```bash
pnpm package-apps
```

## 连接字段

`connection.fields` 用来描述“不是认证 token，但几乎每个接口都要带”的连接级参数，例如
`hotelCode`、`tenantId`、环境代码，或者 app 自定义 header。

Pudding 会在创建或编辑连接时显示这些字段，并把值保存在对应连接里。

```yaml
connection:
  fields:
    - id: hotelCode
      label: 酒店代码
      required: true
      inject:
        - target: query
          name: hotelCode
          methods: [GET, DELETE]
        - target: body
          name: hotelCode
          methods: [POST, PUT, PATCH]
        - target: header
          name: X-Hotel-Code
```

字段属性：

- `id`：稳定字段 ID，同一个 app 内唯一。
- `label`：连接弹窗里的展示名。
- `description`：可选说明。
- `placeholder`：可选输入占位。
- `required`：为空时禁止保存连接。
- `secret`：隐藏输入值。
- `inject`：可选请求注入规则。

注入规则：

- `target`：`query`、`body` 或 `header`。
- `name`：请求参数名或 header 名，不填时使用字段 `id`。
- `methods`：可选 HTTP 方法白名单；不填则对所有 REST 方法生效。

注入行为：

- `query` 会追加到请求 query 参数。
- `body` 会追加到 `body_json`，要求 `body_json` 是对象，不能和 `body_text` 混用。
- `header` 会追加到请求 header。
- 如果 tool call 已经显式传了同名 query/body/header，Pudding 不会覆盖。

## Skill 说明

app 特有的字段规则写在 app 自己的 skill 里，让 LLM 知道哪些值会由 app 自动注入：

```md
- Connections require `hotelCode`. The app injects it as query parameter
  `hotelCode` for GET/DELETE, JSON body field `hotelCode` for POST/PUT/PATCH,
  and header `X-Hotel-Code`; do not duplicate it unless the user explicitly
  wants to override the value for one call.
```
