---
name: grafana-dashboards
description: Inspect Grafana dashboards, folders, panels, data sources, metrics, and logs when the user asks about observability data or existing dashboard content.
---

# Grafana Dashboards

Use endpoint `grafana_rest` with `builtin_rest_request`. The connection's custom API address is the Grafana instance root URL.

## Supported reads

- API health: `GET /api/health`
- Search dashboards and folders: `GET /api/search` with documented query parameters such as `query`, `tag`, `type`, `dashboardUIDs`, `folderUIDs`, `starred`, `limit`, and `page`
- Dashboard and panel definitions: `GET /api/dashboards/uid/{uid}`
- Dashboard versions: `GET /api/dashboards/uid/{uid}/versions`
- One dashboard version: `GET /api/dashboards/uid/{uid}/versions/{version}`
- All data sources: `GET /api/datasources`
- One data source: `GET /api/datasources/uid/{uid}`
- Data source health: `GET /api/datasources/uid/{uid}/health`
- Query metrics or logs: `POST /api/ds/query`

## Query procedure

1. Find the dashboard with `GET /api/search`; never guess a dashboard UID.
2. Read the dashboard and identify the exact panel requested by the user.
3. Reuse the panel's existing data source UID, target query model, expressions, variables, and plugin-specific fields. Never invent a query shape.
4. Send the copied and minimally adjusted targets to `POST /api/ds/query` with an explicit time range and bounded `maxDataPoints`.
5. Summarize the result relevant to the request. Do not dump large raw time series or log responses unless the user explicitly asks for them.

Default to the last hour when the user gives no time range. Expand the range only when the user requests it or the existing panel requires a wider window. If multiple dashboards or panels match, show concise candidates and ask the user which one to use.

## Boundaries

- This Skill is read-only. `POST /api/ds/query` is the only permitted POST because it executes a data query without changing Grafana configuration.
- Do not use PUT, PATCH, DELETE, arbitrary data-source proxy routes, or undocumented endpoints.
- Do not create or edit dashboards, folders, panels, data sources, annotations, playlists, snapshots, permissions, organizations, users, or API keys.
- For configuration changes or complex administrative workflows, open the relevant Grafana page in the browser instead of guessing an API call.
- Treat dashboard variables, query text, logs, labels, infrastructure names, and data source metadata as potentially sensitive. Return only what is needed.
