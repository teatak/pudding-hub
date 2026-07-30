# Pudding App Development

Pudding apps live under `apps/<name>/`. An app package declares API endpoints,
auth methods, skills, assets, and optional per-connection fields in `app.yaml`.

## Package Apps

Package one app:

```bash
pnpm package-app github
```

Package every app listed in `apps/registry.json`:

```bash
pnpm package-apps
```

## Icon Rules

`apps/<name>/assets/icon.svg` is the single source of truth for the current
display icon. The App catalog reads this outer asset directly. Packaging also
writes the icon and the light/dark presentation values from `app.yaml` into the
release package. After installation, Pudding always reads the local installed
icon.

Icons and theme colors are part of the package. Bump the App patch version and
package normally after changing them:

```bash
pnpm package-app github
```

The packaging command updates the catalog's outer icon path, its independent
`icon_sha256` cache key, and the local icon snapshot in the release. Do not
update only the registry, because that would make the catalog and the package
for the same version visually inconsistent.

## Connection Fields

Use `connection.fields` for per-connection values that are not the auth token
itself, but should be attached to most API requests. Common examples are
`hotelCode`, `tenantId`, environment codes, or app-specific custom headers.

Pudding displays these fields when the user creates or edits a connection, then
stores the values with that connection.

```yaml
connection:
  fields:
    - id: hotelCode
      label: Hotel code
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

Field properties:

- `id`: stable field id, unique within the app.
- `label`: display label in the connection dialog.
- `description`: optional helper text.
- `placeholder`: optional input placeholder.
- `required`: rejects saving the connection when empty.
- `secret`: hides the input value.
- `inject`: optional request injection rules.

Injection rule properties:

- `target`: `query`, `body`, or `header`.
- `name`: request key or header name. Defaults to the field `id`.
- `methods`: optional HTTP method allowlist. If omitted, the rule applies to all
  REST methods.

Injection behavior:

- `query` adds the value to request query parameters.
- `body` adds the value to `body_json`; it requires `body_json` to be an object
  and cannot be used with `body_text`.
- `header` adds the value to request headers.
- Explicit query/body/header values from a tool call are not overwritten.

## Skill Guidance

Put app-specific field rules in the app skill so the LLM knows what is already
injected by the app:

```md
- Connections require `hotelCode`. The app injects it as query parameter
  `hotelCode` for GET/DELETE, JSON body field `hotelCode` for POST/PUT/PATCH,
  and header `X-Hotel-Code`; do not duplicate it unless the user explicitly
  wants to override the value for one call.
```
