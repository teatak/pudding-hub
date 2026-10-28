---
name: github-issues
description: Use when the user asks to find, summarize, triage, inspect, create, or comment on GitHub issues and pull request discussions through a connected GitHub plugin.
---

# GitHub Issues

Use this skill when a GitHub connection is available and the user asks about GitHub issues or issue/PR comments.

Pudding injects credentials from the selected connection. Never ask the user for a Personal Access Token, OAuth code, or authorization header. The non-secret auth method is either `github-app` or `github-pat`.

## Connection and permissions

- Reuse the chat's existing GitHub binding. Without a binding, Pudding automatically uses the sole usable connection. If multiple accounts are available, choose the account matching the user's intent by calling `builtin_plugin_load` with `plugin_id: "github"` and the returned `connection_id`. If ambiguous, ask which account to use in chat, then bind it with that tool; do not require the user to operate the header connection picker.
- Effective permissions come from the selected GitHub App installation or PAT scopes. If a write request returns `403` or `404` due to missing permissions, explain that the repository or token lacks write access for that operation.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` when labels, assignees, comments, and timeline data are needed together.

## Read examples

- Get the connected GitHub account: `GET /user` (read `login`).
- List repository issues and pull requests: `GET /repos/{owner}/{repo}/issues` with query `state` (`open`, `closed`, `all`), `sort=updated`, and `per_page`.
- Read one issue: `GET /repos/{owner}/{repo}/issues/{issue_number}`
- Issue or PR comments: `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`

## Repository discovery

- For `github-app`, discover owners with `GET /user/installations`, then repositories with `GET /user/installations/{installation_id}/repositories`, or `GET /user/repos`.
- For `github-pat`, prefer `GET /user/repos` when the repository is not already known.
- Never interpret an empty `GET /user/orgs` response as proof that the user has no organizations.

## Commenting and issue actions

When the user explicitly asks to post a comment, create an issue, or update labels/state (including publishing a draft prepared in `github-board`), execute the action through `builtin_rest_request`:

- Post an issue or PR comment:
  ```json
  {
    "endpoint": "github_rest",
    "method": "POST",
    "path": "/repos/{owner}/{repo}/issues/{issue_number}/comments",
    "body_json": { "body": "<markdown comment>" }
  }
  ```
- Create an issue:
  ```json
  {
    "endpoint": "github_rest",
    "method": "POST",
    "path": "/repos/{owner}/{repo}/issues",
    "body_json": {
      "title": "<issue title>",
      "body": "<issue description>",
      "labels": ["<optional-label>"]
    }
  }
  ```
- Update issue state, labels, or assignees:
  ```json
  {
    "endpoint": "github_rest",
    "method": "PATCH",
    "path": "/repos/{owner}/{repo}/issues/{issue_number}",
    "body_json": { "state": "open" }
  }
  ```

## Guidance

- Ask for the repository `owner/repo` when it is missing and cannot be inferred from context.
- Keep triage summaries concise and separate facts from recommendations.
- Only perform write operations (creating issues, posting comments, editing labels/state) when explicitly requested by the user. A request to draft or organize notes in `github-board` alone is not a request to post to GitHub remotely.
