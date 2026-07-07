---
name: linear-projects
description: Use when the user asks to inspect or summarize Linear projects, roadmaps, milestones, teams, cycles, initiatives, or progress through a connected Linear app.
---

# Linear Projects

Use this skill when a Linear connection is available and the user asks about Linear planning data.

## Endpoint

- Use `linear_graphql` with `builtin_graphql_request`.
- Authorization is injected by Pudding. Linear personal API keys are stored as an `Authorization` header value.
- Use `builtin_graphql_search` or `builtin_graphql_introspect` when field names are uncertain.

## Common Queries

List projects:

```graphql
query Projects($first: Int!) {
  projects(first: $first, orderBy: updatedAt) {
    nodes {
      id
      name
      description
      state
      progress
      startDate
      targetDate
      updatedAt
      url
      lead {
        name
        email
      }
      teams {
        nodes {
          key
          name
        }
      }
    }
  }
}
```

List cycles:

```graphql
query Cycles($first: Int!) {
  cycles(first: $first) {
    nodes {
      id
      name
      number
      startsAt
      endsAt
      completedAt
      team {
        key
        name
      }
    }
  }
}
```

Read project issues:

```graphql
query ProjectIssues($id: String!, $first: Int!) {
  project(id: $id) {
    id
    name
    state
    progress
    targetDate
    issues(first: $first) {
      nodes {
        identifier
        title
        priority
        url
        state {
          name
          type
        }
        assignee {
          name
        }
      }
    }
  }
}
```

## Guidance

- Prefer canvas timeline views for roadmap, milestone, cycle, or target-date requests.
- Prefer canvas grid/table views for project health, issue breakdowns, assignee load, and priority summaries.
- Keep planning summaries factual: progress, dates, owners, issue counts, blockers, and recently changed items.
- Do not create or update projects, cycles, milestones, or initiatives unless the user explicitly asks for a write operation.
