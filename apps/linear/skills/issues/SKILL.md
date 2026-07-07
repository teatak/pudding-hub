---
name: linear-issues
description: Use when the user asks to find, summarize, triage, or inspect Linear issues, comments, assignees, labels, states, priorities, or cycles through a connected Linear app.
---

# Linear Issues

Use this skill when a Linear connection is available and the user asks about Linear issues.

## Endpoint

- Use `linear_graphql` with `builtin_graphql_request`.
- Authorization is injected by Pudding. Linear personal API keys are stored as an `Authorization` header value.
- Use `builtin_graphql_search` or `builtin_graphql_introspect` when field names are uncertain.

## Common Queries

Read viewer:

```graphql
query Viewer {
  viewer {
    id
    name
    email
  }
}
```

List teams:

```graphql
query Teams {
  teams {
    nodes {
      id
      key
      name
    }
  }
}
```

Search recent issues:

```graphql
query Issues($first: Int!) {
  issues(first: $first, orderBy: updatedAt) {
    nodes {
      id
      identifier
      title
      priority
      url
      updatedAt
      team {
        key
        name
      }
      state {
        name
        type
      }
      assignee {
        name
        email
      }
      labels {
        nodes {
          name
        }
      }
    }
  }
}
```

Read one issue by UUID or identifier:

```graphql
query Issue($id: String!) {
  issue(id: $id) {
    id
    identifier
    title
    description
    priority
    url
    createdAt
    updatedAt
    state {
      name
      type
    }
    team {
      key
      name
    }
    assignee {
      name
      email
    }
    comments {
      nodes {
        body
        createdAt
        user {
          name
        }
      }
    }
  }
}
```

## Guidance

- Ask for the team, project, cycle, label, or issue identifier when the target is ambiguous.
- Prefer filtering in GraphQL instead of fetching broad issue lists.
- For status summaries, return compact tables or canvas grids grouped by state, assignee, team, priority, or cycle.
- Do not create, update, comment on, or close issues unless the user explicitly asks for a write operation.
