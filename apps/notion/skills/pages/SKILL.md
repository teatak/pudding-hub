---
name: notion-pages
description: Use when the user asks to search, read, summarize, inspect, or update Notion pages, page properties, block children, comments, or workspace content through a connected Notion app.
---

# Notion Pages

Use this skill when a Notion connection is available and the user asks about Notion pages or page content.

## Endpoint

- Use `notion_rest` with `builtin_rest_request`.
- Authorization is injected by Pudding.
- The connection injects the required `Notion-Version` header. If a request fails with `missing_version`, ask the user to edit the connection and set `Notion-Version` to `2026-03-11`.

## Read examples

Search pages:

```json
{
  "endpoint": "notion_rest",
  "method": "POST",
  "path": "/v1/search",
  "body_json": {
    "query": "roadmap",
    "filter": { "property": "object", "value": "page" },
    "page_size": 10
  }
}
```

Retrieve a page:

```json
{
  "endpoint": "notion_rest",
  "path": "/v1/pages/{page_id}"
}
```

List block children:

```json
{
  "endpoint": "notion_rest",
  "path": "/v1/blocks/{block_id}/children",
  "query": { "page_size": 100 }
}
```

List comments on a block or page:

```json
{
  "endpoint": "notion_rest",
  "path": "/v1/comments",
  "query": { "block_id": "{block_id}", "page_size": 100 }
}
```

List users:

```json
{
  "endpoint": "notion_rest",
  "path": "/v1/users",
  "query": { "page_size": 100 }
}
```

## Guidance

- Ask for a page URL, title, or search term when the target page is unclear.
- For summaries, retrieve the page first, then fetch block children as needed. Do not fetch broad workspaces.
- For canvas output, use Markdown for narrative summaries, grid/table for page inventories, and timeline for dated page collections.
- Treat `next_cursor` as opaque and pass it back unchanged for pagination.
- Do not create, update, archive, or comment on pages unless the user explicitly asks for a write operation.
