---
name: github-issues
description: Use when the user asks to find, summarize, triage, or inspect GitHub issues and issue comments through a connected GitHub app.
---

# GitHub Issues

Use this skill when a GitHub connection is available and the user asks about GitHub issues.

Pudding injects credentials from the selected connection. Never ask the user for a Personal Access Token, OAuth code, or authorization header. The non-secret auth method is either `github-app` or `github-pat`.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` when labels, assignees, comments, and timeline data are needed together.

## REST examples

- List repository issues: `GET /repos/{owner}/{repo}/issues`
- Read one issue: `GET /repos/{owner}/{repo}/issues/{issue_number}`
- Issue comments: `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`

## Repository discovery

- For `github-app`, discover owners with `GET /user/installations`, then repositories with `GET /user/installations/{installation_id}/repositories`.
- For `github-pat`, prefer `GET /user/repos` when the repository is not already known.
- Never interpret an empty `GET /user/orgs` response as proof that the user has no organizations. GitHub App user access tokens and fine-grained PATs can intentionally receive `200` with an empty list from that endpoint.

## Guidance

- Ask for the repository owner/name when it is missing.
- Keep triage summaries short and separate facts from recommendations.
- Treat both connection methods as read-only in this skill.
- The effective permissions come from the selected connection and GitHub API responses. Do not infer or audit a complete permission list from this Skill.
- Do not create, edit, close, label, or comment on issues, and do not ask for broader permissions from this skill.
