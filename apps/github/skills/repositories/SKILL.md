---
name: repositories
description: Use when the user asks to inspect GitHub repositories, branches, commits, contents, pull requests, or repository metadata through a connected GitHub app.
---

# GitHub Repositories

Use this skill when a GitHub connection is available and the user asks about repository data.

The connection is provided by the Pudding Connector GitHub App. Pudding supplies a GitHub App user-to-server token; do not ask the user for a Personal Access Token, OAuth code, or authorization header.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` for GraphQL queries.

## REST examples

- Repository metadata: `GET /repos/{owner}/{repo}`
- Branches: `GET /repos/{owner}/{repo}/branches`
- Pull requests: `GET /repos/{owner}/{repo}/pulls`
- File contents: `GET /repos/{owner}/{repo}/contents/{path}`

## Guidance

- Ask for the repository owner/name if it is not clear from context.
- Prefer GraphQL when the request needs several related resources in one response.
- Current Pudding Connector permissions are `contents:read`, `issues:read`, and `pull_requests:read`; treat this app as read-only.
- Do not mutate GitHub state or ask for broader permissions from this skill.
