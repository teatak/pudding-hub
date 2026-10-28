---
name: github-repositories
description: Use when the user asks to inspect GitHub repositories, branches, commits, contents, pull requests, or submit pull request reviews through a connected GitHub plugin.
---

# GitHub Repositories

Use this skill when a GitHub connection is available and the user asks about repository data or pull requests.

Pudding injects credentials from the selected connection. Never ask the user for a Personal Access Token, OAuth code, or authorization header. Use the non-secret auth method attached to the connection or tool result to select the correct discovery flow:

- `github-app`: Pudding Connector GitHub App user access token.
- `github-pat`: user-supplied personal access token, which may be classic or fine-grained.

## Connection and permissions

- Reuse the chat's existing GitHub binding. Without a binding, Pudding automatically uses the sole usable connection. If multiple accounts are available, choose the account matching the user's intent by calling `builtin_plugin_load` with `plugin_id: "github"` and the returned `connection_id`. If ambiguous, ask which account to use in chat, then bind it with that tool; do not require the user to operate the header connection picker.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` for GraphQL queries.

## Read examples

- Repository metadata: `GET /repos/{owner}/{repo}`
- Branches: `GET /repos/{owner}/{repo}/branches`
- Pull requests: `GET /repos/{owner}/{repo}/pulls`
- Pull request detail: `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- Pull request files: `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`
- File contents: `GET /repos/{owner}/{repo}/contents/{path}`

## Repository and organization discovery

For a `github-app` connection:

1. Call `GET /user/installations`.
2. Read each installation's `account.login` and `account.type` to identify user and organization owners.
3. Call `GET /user/installations/{installation_id}/repositories` to list repositories granted to that installation (or combine with `GET /user/repos`).

Do not use `GET /user/orgs` to determine GitHub App organization access. GitHub intentionally returns `200` with an empty list for GitHub App user access tokens and other fine-grained tokens.

For a `github-pat` connection:

- Prefer `GET /user/repos` to discover repositories accessible through the PAT and derive owners from `owner.login` or `full_name`.

## Pull request reviews

When the user explicitly asks to submit a pull request review (such as `COMMENT`, `APPROVE`, or `REQUEST_CHANGES`, including publishing a review draft prepared in `github-board`):

```json
{
  "endpoint": "github_rest",
  "method": "POST",
  "path": "/repos/{owner}/{repo}/pulls/{pull_number}/reviews",
  "body_json": {
    "event": "COMMENT",
    "body": "<review summary>"
  }
}
```

## Guidance

- Ask for the repository `owner/repo` if it is not clear from context.
- Prefer GraphQL when the request needs several related resources in one response.
- Only submit reviews or mutate GitHub state when explicitly requested by the user.
