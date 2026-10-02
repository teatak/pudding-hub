---
name: jira-projects
description: Use when the user asks to inspect Jira Cloud projects, boards, sprints, versions, components, users, or project metadata through a connected Jira app.
---

# Jira Projects

Use this skill when a Jira connection is available and the user asks about Jira projects, boards, sprints, versions, components, users, or project metadata.

## Endpoint

- Use `jira_rest` with `builtin_rest_request`.
- Authentication is already sent as `Authorization: Bearer ...`. Do not duplicate the token.
- Jira Cloud OAuth requests go through `https://api.atlassian.com`.

## Site Resolution

- First call `GET /oauth/token/accessible-resources` unless the cloud ID is already known in the conversation.
- Pick the matching Jira site from the returned `id`, `name`, and `url`.
- Then call Jira paths as `/ex/jira/{cloudId}/rest/api/3/{resource}`.

## Common Requests

- Projects: `GET /ex/jira/{cloudId}/rest/api/3/project/search`
- Project metadata: `GET /ex/jira/{cloudId}/rest/api/3/project/{projectIdOrKey}`
- Project versions: `GET /ex/jira/{cloudId}/rest/api/3/project/{projectIdOrKey}/versions`
- Project components: `GET /ex/jira/{cloudId}/rest/api/3/project/{projectIdOrKey}/components`
- Boards: `GET /ex/jira/{cloudId}/rest/agile/1.0/board`
- Board sprints: `GET /ex/jira/{cloudId}/rest/agile/1.0/board/{boardId}/sprint`
- Sprint issues: `GET /ex/jira/{cloudId}/rest/agile/1.0/sprint/{sprintId}/issue`
- Users: `GET /ex/jira/{cloudId}/rest/api/3/users/search`

## Guidance

- Ask for a project key, project name, board name, or site choice if several matches are possible.
- Use Jira pagination fields such as `startAt`, `maxResults`, `isLast`, and `nextPageToken` when present.
- For delivery status, combine project metadata with JQL issue search rather than listing everything.
- Do not create projects, versions, boards, or sprints unless the user explicitly asks for a write operation.
