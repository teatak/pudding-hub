# Plugin development

[中文](plugin-development.zh-CN.md) · [Developer documentation](README.md) · [Widget integration](widget-sdk.md)

A Pudding plugin declares external endpoints, authentication, connection configuration and Skills. The host resolves credentials and exposes generic REST/GraphQL or discovered MCP tools after loading. App packages were replaced by plugins; use `plugins/<name>/plugin.yaml` for new integrations.

## First plugin

```text
plugins/example-service/
  manifest.json
  plugin.yaml
  assets/icon.svg
  skills/records/SKILL.md
```

`plugin.yaml` defines runtime behavior:

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

`manifest.json` describes catalog identity and the complete package file list:

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

The runtime ID (`plugin.yaml.id`, `manifest.name`) is `example-service`; the catalog ID is the qualified `manifest.id`. Keep versions consistent. Endpoint names start with a lowercase letter and use lowercase letters, digits and underscores; prefer a scoped name such as `example_rest`.

## Skills and model tools

A Skill describes real API behavior and the user requests it supports:

```markdown
---
name: example-records
description: Read Example Service records when the user asks about them.
---

# Example records

Use endpoint `example_rest`. Read the service API before forming a request.
Select the account matching the user's intent before reading private records.
```

Load with `builtin_plugin_load(plugin_id, connection_id?)`. REST uses `builtin_rest_request`; GraphQL uses `builtin_graphql_request`, `builtin_graphql_introspect` and `builtin_graphql_search`. MCP tools are discovered after their endpoint is resolved. Skills should explain identifiers, pagination, injected fields and meaningful read/write boundaries. They do not grant permission to send mail, delete records or perform other external writes.

To create a local installed plugin with an LLM, load `plugin-authoring` in Code mode, then use `builtin_plugin_save` with `operation: create|update`, `plugin_id` and the complete UTF-8 file set. Updates may inspect the read-only plugin file scope first. Save validates a candidate before replacement; it is not a partial patch or a Hub release. Ask/Auto approval modes confirm persistent package writes; Full Access saves directly. It cannot overwrite built-in/runtime plugins. Configure credentials in Connections, never in package files or chat.

## Endpoint types

| Kind | Configuration | Execution |
| --- | --- | --- |
| REST | `kind: rest`, `url` | Generic HTTP requests |
| GraphQL | `kind: graphql`, `url` | Query/introspection/search tools |
| MCP over HTTP | `kind: mcp`, `transport: streamable_http`, `url` | Tools discovered on load |
| MCP over stdio | `kind: mcp`, `transport: stdio`, `command`, optional `args`/`env` | Process started on demand; requires Code capability |

REST/GraphQL addresses are fixed unless `url_config` is declared. `widget_writes: true` explicitly lets widgets prepare writes to an endpoint; host confirmation remains necessary. Widget reads use source slots such as `{pluginID:'example-service',endpoint:'example_rest'}`, not the catalog-qualified ID.

For platform-specific MCP invocations, use endpoint `platforms` overrides, as in [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml). Keep secrets in connections/private overrides, not `env` literals committed to Hub.

The **Add MCP Plugin** UI imports standard `mcpServers` JSON as a simplified `kind: mcp` plugin: exactly one MCP endpoint and no plugin connection. Sensitive headers/environment overrides remain in private configuration. It uses the same load mechanism; there is no separate `builtin_mcp_load` tool. Streamable HTTP simplified MCP plugins require Work capability; stdio requires Code.

## Authentication

Declare methods in `auth.methods`; users select/configure one in Connections. `required: false` supports configuration-only connections, including services without authentication.

| Type | Purpose |
| --- | --- |
| `none` | No credentials; only when authentication is optional |
| `bearer` | Bearer token |
| `token` | Token with an optional configured authorization prefix |
| `basic` | Username/password HTTP authentication |
| `header` | Token in a declared `header` |
| `oauth2` | A host-supported provider named by `provider` |
| `token_exchange` | Connection fields exchanged for a short-lived token |
| `session` | Interactive declarative login returning managed credentials |

An `oauth2` provider name does not add a new OAuth implementation by itself. Use supported providers and configure the host's authorization service. GitHub and Gmail examples live in their [manifests](../plugins/github/plugin.yaml) and [Skills](../plugins/gmail/skills/mailbox/SKILL.md). A plugin update cannot expand scopes of an existing token; reauthorize when the required scopes change. Gmail's current read/send scopes do not imply draft-editing or mailbox-modification permissions.

### Token exchange

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

`body_fields` maps request keys to connection field IDs; response paths may be dotted. Core exchanges and caches tokens for REST/GraphQL calls until shortly before expiry. Credentials and token responses are not model arguments or output. See [Feishu](../plugins/feishu/plugin.yaml).

### Interactive session login

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

Protocol 52 introduces this flow. `encoding` supports form or JSON. Inputs preserve exact values, including password whitespace; `success_field` must be JSON true. Outputs map JSON paths to declared secret fields, with at least one required credential. `expires_in_field`, if used, is positive seconds up to one year.

Login is a settings operation, not a model tool. A challenge identifies input fields for another explicit form submission, not a retained server-side login. Failure leaves the old connection untouched; concurrent modification fails with a conflict. The host does not retain passwords, automatically sign in again, replay failed business requests, support cookie sessions or run arbitrary login scripts. See [Synology](../plugins/synology/plugin.yaml).

## Connections and account selection

`connection.selection` is `user` by default. A chat reuses its saved binding; otherwise the sole usable connection is resolved without saving a binding. Multiple accounts require an explicit choice through `builtin_plugin_load(plugin_id, connection_id)`, including when already loaded. If intent is ambiguous, ask the user. Saving credentials does not select an account, and a REST/GraphQL `connection` argument only checks the resolved account.

`single_active` allows multiple saved connections but one globally active selection. Configuration uses the plugin's active connection setting; it is shared across tools. `automatic` is reserved and rejected, not a third working mode. Chat bindings persist with the chat but are not inherited by clones/child sessions. A missing, deleted or changed identity requires selection again, without fallback. Widgets keep independent explicit resource bindings.

### Connection fields and injection

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

Fields have stable unique IDs and optional label, description, placeholder, required, secret and inject. Injection targets are `query`, `body`, `header`, or `env` for stdio MCP. Omitted `name` uses the field ID; omitted `methods` applies to all relevant REST methods. Body injection requires an object `body_json` and cannot mix with `body_text`. Explicit tool values are not overwritten; forbidden headers such as Host/Content-Length are rejected. `secret` hides form input, not a promise of encryption at rest. Explain injected fields in the plugin's Skill.

### Per-connection addresses and TLS

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

Only REST/GraphQL endpoints declaring `url_config` can receive connection-specific addresses. Optional empty settings keep the default; required settings must be filled. Accept HTTP/HTTPS without userinfo, query or fragments. Overrides are keyed by endpoint name. MCP address/header configuration uses private MCP overrides.

Protocol 53 adds an **Ignore server certificate errors** switch for configurable HTTPS endpoints, off by default. It disables chain and hostname verification for that connection/endpoint only; prefer a valid server certificate. Changing the URL clears the exception; changing a session connection's policy requires signing in again. It applies to login, REST, GraphQL and widget requests, not browsers or OAuth/token-exchange URLs. Managed credentials are redacted from textual results. See [Core implementation notes](https://github.com/teatak/pudding-core/blob/main/docs/plugins.md) for persistence and API details.

## Icons and localized metadata

Use a self-contained square SVG in `assets/icon.svg`, without scripts, remote assets, fonts or secrets. `plugin.yaml.icon` controls the runtime icon and optional `color`/`background` values for light/dark themes. `manifest.title` and `description` support language maps; maintain English, Simplified Chinese and Traditional Chinese for catalog entries. Update source metadata and package together so catalog and installed visuals match. `targets` declares supported host targets; do not copy targets a plugin has not been tested on.

## Packaging and previews

Run in Hub:

```bash
pnpm install
pnpm package-plugin example-service
# All plugin source directories:
pnpm package-plugins
```

These commands write release files and registry metadata. There is no plugin `--dev` mode; do not run packaging just to validate documentation. The packager reads the listed UTF-8 files, checks basic YAML/package shape, generates `pudding.plugin.package` schema 1 and SHA-256 metadata. Core performs the runtime manifest/Skill/endpoint validation on installation; a successful Hub package alone is not full runtime validation.

Plugin package/registry fields use `schema_version` and `package_sha256`, unlike widget `schemaVersion` and `packageSHA256`. Releases live under `plugins/<name>/releases/<version>/`; bump a published version before changing package bytes. The package command rewrites the selected release output, so inspect the version before running it. Never put credentials, lock files or private MCP overrides in `manifest.files`.

For previews, use a distinct version such as `1.1.0-preview.1` and set `preview: true` in the outer manifest; optional `channel: preview` describes the release. A version suffix alone is not the preview flag. Users enable plugin previews in Settings → Advanced; widget previews have a separate switch. Third-party catalogs use `plugins/registry.json`; source identity is preserved, and an installed package cannot silently be adopted by a different source.

## Validation and references

Check manifest/runtime ID and version agreement, declared files, Skill paths, portable MCP commands, connection switching, cancellation and failed-login preservation. Install in an isolated Pudding data directory and use a small read-only API request; test external writes only with explicit user authorization. Verify widgets can read the endpoint and that unapproved/unopted-in writes remain blocked. Do not exercise production mail or destructive endpoints as a packaging test.

Runtime types and validation live in [Core plugin definitions](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go) and [loader](https://github.com/teatak/pudding-core/blob/main/internal/plugin/loader.go); public widget integration is documented in the [SDK reference](widget-sdk.md). Built-in/runtime plugins remain implementation-owned and are not Hub-authored replacements.
