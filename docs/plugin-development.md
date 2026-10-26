# Plugin development

[中文](plugin-development.zh-CN.md) · [Developer documentation](README.md) · [Widget SDK](widget-sdk.md)

Plugins let Pudding call external services. Authors declare service addresses, authentication and usage instructions. Pudding reads the user's connection settings and executes requests. A plugin can provide REST, GraphQL or MCP endpoints, and widgets can use it as a data source.

Plugins replaced Apps; new definitions use plugin.yaml. First create the service definition and Skill, configure a connection and verify it in Pudding. Package through Hub when you want to distribute it.

## First plugin

This example uses a fictional Example Service to illustrate the files. Replace the address, authentication and operations with the real service's documented API.

```text
plugins/example-service/
  manifest.json
  plugin.yaml
  assets/icon.svg
  skills/records/SKILL.md
```

### 1. Define the service

Pudding reads plugin.yaml at runtime. This example declares a REST endpoint with Bearer token authentication:

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

example_rest is the endpoint name used by tools and widgets. Names start with a lowercase letter and then use lowercase letters, digits and underscores.

### 2. Add instructions and an icon

Save the next section's Skill example as skills/records/SKILL.md and create assets/icon.svg. Use a self-contained square SVG. The Skill should describe actual operations, parameters and results rather than only listing product features.

### 3. Add Hub metadata

Source maintained in Hub also needs manifest.json. It lists installed files and the metadata shown in the catalog:

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

The two IDs serve different purposes:

| Field | Example | Purpose |
| --- | --- | --- |
| plugin.yaml.id, manifest.name | example-service | Runtime identity used by tools |
| manifest.id | teatak/pudding-hub/plugins/example-service | Distribution identity, including the source repository |

Keep version equal in both files and include every installed file in manifest.files. When creating a local plugin directly in Pudding, the authoring tool saves runtime files; no handwritten Hub registry is needed.

## Skills and model tools

### Write a service Skill

A Skill tells the model when to use the plugin and how to call it correctly:

```markdown
---
name: example-records
description: Read Example Service records when the user asks about them.
---

# Example records

Use endpoint `example_rest`. Read the service API before forming a request.
Select the account matching the user's intent before reading private records.
```

A real Skill should identify the endpoint, record IDs, pagination, success criteria and operations that change external data. Explain automatically injected fields so the model does not supply credentials again.

Load with `builtin_plugin_load(plugin_id, connection_id?)`, then use:

| Endpoint | Tools |
| --- | --- |
| REST | builtin_rest_request |
| GraphQL | builtin_graphql_request, builtin_graphql_introspect, builtin_graphql_search |
| MCP | Tools discovered after loading the endpoint |

A Skill does not replace user authorization. A request to draft mail does not authorize sending it. Follow the user's request and host approval rules for each operation.

### Create a plugin with a model

1. Load plugin-authoring in Code mode to obtain the plugin-creator Skill and builtin_plugin_save.
2. Prepare complete runtime files. For an update, read the installed package using built-in file tools with `scope:"plugin"`; connection and private configuration files are excluded.
3. Call builtin_plugin_save with create or update, plugin_id and the complete UTF-8 file set. It validates a temporary package before replacement. Omitted files are not retained automatically.
4. Configure an account in the plugin's connection settings, then load the plugin and verify a small read request.

Ask/Auto modes confirm changes to installed packages; Full Access saves directly. The tool cannot replace built-in or runtime-provided plugins. Saving a local installation does not publish it to Hub.

## Endpoint types

| Type | Configuration | Purpose |
| --- | --- | --- |
| REST | kind: rest, url | HTTP API |
| GraphQL | kind: graphql, url | GraphQL requests and related tools |
| HTTP MCP | kind: mcp, transport: streamable_http, url | Remote MCP service |
| stdio MCP | kind: mcp, transport: stdio, command, optional args/env | Local MCP process started on demand; requires Code capability |

REST/GraphQL use fixed addresses by default. Add url_config when users must supply their own server; see [connection addresses](#per-connection-addresses-and-tls). Use platforms for MCP commands that differ by operating system, as in [Sequential Thinking](../plugins/sequential-thinking/plugin.yaml).

Widgets identify an endpoint with `{pluginID:'example-service', endpoint:'example_rest'}`. Set widget_writes: true on an endpoint if widgets need to change its data. The host still asks for confirmation before execution.

### Import an existing MCP server

Add MCP Plugin imports standard mcpServers JSON. It creates a simplified kind: mcp plugin with one endpoint and no separate plugin connection. Sensitive headers and environment variables stay in private configuration. HTTP requires Work capability; stdio requires Code. Loading uses builtin_plugin_load, with no separate builtin_mcp_load tool.

## Authentication

auth.methods declares the choices shown in connection settings. Packages contain field definitions, never real tokens or passwords. Use required: false when authentication is optional; configuration-only connections can still hold a server address or other settings.

| Type | Use |
| --- | --- |
| none | No credentials, only when authentication is optional |
| bearer | Authorization: Bearer token |
| token | Authorization token with a configurable prefix |
| basic | HTTP username/password authentication |
| header | Token in a specified header |
| oauth2 | An OAuth provider already supported by Pudding |
| token_exchange | Exchange connection fields for a short-lived token |
| session | User signs in through settings; store returned session credentials |

An oauth2 provider must be implemented by the host. A new name alone does not add a new OAuth integration. See the [GitHub definition](../plugins/github/plugin.yaml) and [Gmail Skill](../plugins/gmail/skills/mailbox/SKILL.md).

Updating a plugin cannot expand an existing token's scopes. Users must reauthorize when new scopes are needed. For example, current Gmail read/send scopes do not cover editing drafts, archiving or changing labels.

### Token exchange

Use this for services that exchange an application ID and secret for a short-lived token:

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

body_fields maps request parameter names on the left to connection.fields IDs on the right. access_token_field and expires_in_field locate values in the response and support dotted paths. Core performs the exchange before REST/GraphQL requests and refreshes its cache near expiry. Models need not read secrets or make token requests themselves. See [Feishu](../plugins/feishu/plugin.yaml).

### Interactive session login

Use this when a service accepts an account, password or verification code and returns a session token:

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

Supported from protocol 52. The main fields are:

| Field | Meaning |
| --- | --- |
| endpoint, path | Declared endpoint and path receiving the login request |
| encoding | form or json request encoding |
| inputs | Fields collected in settings; mark passwords and similar inputs secret |
| body_fields | Map inputs to login parameters |
| success_field | Response path whose value must be JSON true |
| challenges | Additional inputs requested by the service, such as a verification code |
| outputs | Save response fields into declared secret connection fields |

At least one credential output must be required. Optional expires_in_field gives positive lifetime seconds, up to one year. Inputs preserve their exact characters, including password whitespace.

Login is performed by the user in settings, not exposed as a model tool. A challenge requires another form submission; the host retains neither unfinished login passwords nor challenges. Failure preserves the previous connection, and concurrent edits cause a conflict. Cookie sessions, automatic re-login and arbitrary login scripts are unsupported. See [Synology](../plugins/synology/plugin.yaml) for a complete example.

## Connections and account selection

connection.selection controls how multiple connections are selected:

| Value | Behavior |
| --- | --- |
| user (default) | Each conversation selects its own connection |
| single_active | All consumers share one globally selected connection |
| automatic | Reserved and currently rejected |

With user, reuse the conversation's saved binding first. With no binding and one usable connection, use it without saving a binding. With several connections, select explicitly through `builtin_plugin_load(plugin_id, connection_id)`. Calling it again can switch an already loaded plugin. Ask the user only when the intended account is unclear.

Saving credentials, selecting an account and enabling a plugin are separate operations. The REST/GraphQL connection argument only checks the resolved connection; it cannot switch accounts. Conversation bindings survive restart but do not carry over to cloned or child conversations. A deleted connection or changed identity requires a new selection.

Widgets select their own source connections rather than inheriting chat bindings.

### Connection fields and injection

Services may need per-connection settings such as a tenantId in addition to authentication:

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

Fields support label, description, placeholder, required and secret. secret hides input in the form; it does not guarantee encryption at rest.

inject specifies where to use the value: query, body, header, or env for stdio MCP. Omitted name uses the field ID; omitted methods covers relevant REST methods. Injection does not overwrite explicit request values.

Body injection requires an object body_json and cannot be combined with body_text. Forbidden headers such as Host and Content-Length fail validation.

### Per-connection addresses and TLS

To let users enter their own service address:

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

Only REST/GraphQL endpoints with url_config accept per-connection addresses. required: true demands a value; otherwise an empty value keeps the default. Addresses must be HTTP/HTTPS without userinfo, query or fragment. MCP addresses and headers use private MCP configuration.

Protocol 53 adds Ignore server certificate errors for configurable HTTPS endpoints, off by default. It disables certificate-chain and hostname validation only for that connection and endpoint. Prefer a valid server certificate.

Changing the URL clears the exception. Session-login connections must sign in again after this setting changes. The exception covers login, REST, GraphQL and widget requests, not browsers or OAuth/token-exchange URLs. See [Core implementation notes](https://github.com/teatak/pudding-core/blob/main/docs/plugins.md) for persistence and APIs.

## Icons and localized metadata

Use a self-contained assets/icon.svg without scripts, remote resources or credentials. plugin.yaml.icon chooses the runtime icon and can set light/dark color and background values.

Hub manifest.title and description are language maps. Maintain English, Simplified Chinese and Traditional Chinese names and descriptions. Update source and release packages together so installed metadata matches the catalog. List only supported, verified host targets in targets.

## Packaging and previews

Run in Hub:

```bash
pnpm install
pnpm package-plugin example-service
# All plugin source directories:
pnpm package-plugins
```

These commands create releases and update registries. Plugin packaging has no --dev mode and rewrites the selected version's output. Bump the version before changing published content.

The packager reads UTF-8 files listed in manifest.files, checks basic YAML/package structure and generates pudding.plugin.package format 1 with SHA-256 metadata. Core performs complete endpoint, authentication and Skill validation on installation. Packaging success therefore still needs installation verification.

Releases live in `plugins/<name>/releases/<version>/`. Plugin packages use schema_version and package_sha256; widget packages use schemaVersion and packageSHA256. Keep the formats distinct, and exclude credentials, installation locks and private MCP configuration from files.

For previews, use a distinct version such as 1.1.0-preview.1 and set preview: true in manifest.json; channel: preview may also be supplied. A version suffix alone is insufficient. Users enable plugin previews in Settings → Advanced; widget previews have their own switch.

Third-party distribution uses plugins/registry.json. Pudding retains package source information and rejects silent replacement of an installed package by another source.

## Validation and references

Install and test in a separate Pudding data directory. Check IDs, versions, file lists and Skill paths, then configure a real connection and verify a small read. If accounts or custom servers are supported, test switching, cancellation and preservation of the old connection after a failed login.

Test external writes within the user's authorized task. Sending real mail or deleting production data is not an ordinary installation check. Built-in and runtime-provided plugins are maintained in their implementation repositories rather than replaced by Hub packages.

Exact fields and validation live in the [Core plugin types](https://github.com/teatak/pudding-core/blob/main/internal/plugin/types.go) and [loader](https://github.com/teatak/pudding-core/blob/main/internal/plugin/loader.go). Widget integration is covered by the [SDK reference](widget-sdk.md).
