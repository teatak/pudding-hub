---
name: github-repositories
description: Use when the user asks to inspect GitHub repositories, branches, commits, contents, pull requests, or repository metadata through a connected GitHub app.
---

# GitHub Repositories

Use this skill when a GitHub connection is available and the user asks about repository data.

Pudding injects credentials from the selected connection. Never ask the user for a Personal Access Token, OAuth code, or authorization header. Use the non-secret auth method attached to the connection or tool result to select the correct discovery flow:

- `github-app`: Pudding Connector GitHub App user access token.
- `github-pat`: user-supplied personal access token, which may be classic or fine-grained.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` for GraphQL queries.

## REST examples

- Repository metadata: `GET /repos/{owner}/{repo}`
- Branches: `GET /repos/{owner}/{repo}/branches`
- Pull requests: `GET /repos/{owner}/{repo}/pulls`
- File contents: `GET /repos/{owner}/{repo}/contents/{path}`

## Repository and organization discovery

For a `github-app` connection:

1. Call `GET /user/installations`.
2. Read each installation's `account.login` and `account.type` to identify user and organization owners.
3. Call `GET /user/installations/{installation_id}/repositories` to list repositories granted to that installation.

Do not use `GET /user/orgs` to determine GitHub App organization access. GitHub intentionally returns `200` with an empty list for GitHub App user access tokens and other fine-grained tokens. An empty `/user/orgs` response does not mean the user has no organization membership or installation access.

For a `github-pat` connection:

- `GET /user/orgs` can list organizations for an OAuth-style classic PAT when its scopes permit it.
- A fine-grained PAT may also return `200` with an empty list from `/user/orgs`; never infer absence of organization access from that empty response.
- Prefer `GET /user/repos` to discover repositories accessible through the PAT and derive owners from `owner.login` or `full_name`.

## Guidance

- Ask for the repository owner/name if it is not clear from context.
- Prefer GraphQL when the request needs several related resources in one response.
- Treat both connection methods as read-only in this skill.
- The effective permissions come from the selected connection and GitHub API responses. Do not infer or audit a complete permission list from this Skill.
- Do not mutate GitHub state or ask for broader permissions from this skill.
