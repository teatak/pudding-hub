---
name: gitlab-issues-merge-requests
description: Use when the user asks to inspect GitLab issues, merge requests, discussions, approvals, or review status through a connected GitLab app.
---

# GitLab Issues And Merge Requests

Use this skill when a GitLab connection is available and the user asks about issues, merge requests, reviews, or discussions.

## Endpoint

- Use `gitlab_rest` with `builtin_rest_request` for REST paths under `https://gitlab.com/api/v4`.
- Authentication is already sent as the `PRIVATE-TOKEN` header. Do not duplicate the token in query parameters or headers.

## Issues

- User-visible issues: `GET /issues`
- Project issues: `GET /projects/{id}/issues`
- Single issue: `GET /projects/{id}/issues/{issue_iid}`
- Issue notes: `GET /projects/{id}/issues/{issue_iid}/notes`

## Merge Requests

- User-visible merge requests: `GET /merge_requests`
- Project merge requests: `GET /projects/{id}/merge_requests`
- Single merge request: `GET /projects/{id}/merge_requests/{merge_request_iid}`
- Merge request changes: `GET /projects/{id}/merge_requests/{merge_request_iid}/changes`
- Merge request commits: `GET /projects/{id}/merge_requests/{merge_request_iid}/commits`
- Merge request discussions: `GET /projects/{id}/merge_requests/{merge_request_iid}/discussions`
- Merge request approvals: `GET /projects/{id}/merge_requests/{merge_request_iid}/approvals`

## Guidance

- Prefer concise summaries that mention state, assignee, author, labels, target branch, pipeline status, and blockers when present.
- For "my" work, start with `/issues?scope=assigned_to_me` or `/merge_requests?scope=assigned_to_me`.
- Use project-scoped `iid` values in issue and merge request paths, not the global `id`.
- Do not create comments, labels, approvals, or state changes unless the user explicitly asks.
