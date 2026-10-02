---
name: jira-issues
description: Use when the user asks to search, inspect, summarize, or update Jira Cloud issues through a connected Jira app.
---

# Jira Issues

Use this skill when a Jira connection is available and the user asks about Jira issues, JQL, comments, assignees, status, or transitions.

## Endpoint

- Use `jira_rest` with `builtin_rest_request`.
- Authentication is already sent as `Authorization: Bearer ...`. Do not duplicate the token.
- Jira Cloud OAuth requests go through `https://api.atlassian.com`.

## Site Resolution

- First call `GET /oauth/token/accessible-resources` unless the cloud ID is already known in the conversation.
- Pick the matching Jira site from the returned `id`, `name`, and `url`.
- Then call Jira paths as `/ex/jira/{cloudId}/rest/api/3/{resource}`.

## Common Requests

- Current user: `GET /ex/jira/{cloudId}/rest/api/3/myself`
- Get issue: `GET /ex/jira/{cloudId}/rest/api/3/issue/{issueIdOrKey}`
- Issue comments: `GET /ex/jira/{cloudId}/rest/api/3/issue/{issueIdOrKey}/comment`
- Issue transitions: `GET /ex/jira/{cloudId}/rest/api/3/issue/{issueIdOrKey}/transitions`
- Issue search with JQL: prefer `GET /ex/jira/{cloudId}/rest/api/3/search/jql` with query parameters such as `jql`, `maxResults`, and `fields`.
- Issue picker: `GET /ex/jira/{cloudId}/rest/api/3/issue/picker`

## Guidance

- Prefer focused JQL over broad issue listing. Include `fields=summary,status,assignee,reporter,priority,updated,project,issuetype` when enough.
- For "my issues", use JQL like `assignee = currentUser() ORDER BY updated DESC`.
- Summaries should mention key, summary, status, assignee, priority, updated time, and blockers when visible.
- Do not create comments, change assignees, or transition issues unless the user explicitly asks for a write operation.
