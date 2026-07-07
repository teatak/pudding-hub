---
name: notion-data-sources
description: Use when the user asks to query, summarize, inspect, or report on Notion data sources, databases, views, or structured Notion records through a connected Notion app.
---

# Notion Data Sources

Use this skill when a Notion connection is available and the user asks about structured Notion data.

## Endpoint

- Use `notion_rest` with `builtin_rest_request`.
- Authorization is injected by Pudding.
- The connection injects the required `Notion-Version` header. If a request fails with `missing_version`, ask the user to edit the connection and set `Notion-Version` to `2026-03-11`.

## Read examples

Search data sources and databases:

```json
{
  "endpoint": "notion_rest",
  "method": "POST",
  "path": "/v1/search",
  "body_json": {
    "query": "tasks",
    "filter": { "property": "object", "value": "data_source" },
    "page_size": 10
  }
}
```

Retrieve a data source:

```json
{
  "endpoint": "notion_rest",
  "path": "/v1/data_sources/{data_source_id}"
}
```

Query a data source:

```json
{
  "endpoint": "notion_rest",
  "method": "POST",
  "path": "/v1/data_sources/{data_source_id}/query",
  "body_json": {
    "page_size": 100
  }
}
```

Query with a filter and sort:

```json
{
  "endpoint": "notion_rest",
  "method": "POST",
  "path": "/v1/data_sources/{data_source_id}/query",
  "body_json": {
    "filter": {
      "property": "Status",
      "status": { "does_not_equal": "Done" }
    },
    "sorts": [
      { "property": "Due", "direction": "ascending" }
    ],
    "page_size": 100
  }
}
```

Legacy database endpoints may still exist in older workspaces, but prefer data source endpoints when available.

## Guidance

- Ask for the data source URL, database URL, or name when the target is unclear.
- Use search first when the user gives a natural-language data source name.
- Prefer canvas grids/tables for records, property audits, and task lists.
- Prefer canvas timelines for date-based records such as roadmaps, editorial calendars, launch plans, and tasks with due dates.
- Treat `next_cursor` as opaque and pass it back unchanged for pagination.
- Do not create, update, or delete records unless the user explicitly asks for a write operation.
