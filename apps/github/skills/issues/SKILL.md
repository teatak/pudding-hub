---
name: github-issues
description: Use when the user asks to find, summarize, triage, or inspect GitHub issues and issue comments through a connected GitHub app.
---

# GitHub Issues

Use this skill when a GitHub connection is available and the user asks about GitHub issues.

## Endpoints

- Use `github_rest` with `builtin_rest_request` for REST paths under `https://api.github.com`.
- Use `github_graphql` with `builtin_graphql_request` when labels, assignees, comments, and timeline data are needed together.

## REST examples

- List repository issues: `GET /repos/{owner}/{repo}/issues`
- Read one issue: `GET /repos/{owner}/{repo}/issues/{issue_number}`
- Issue comments: `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`

## Guidance

- Ask for the repository owner/name when it is missing.
- Keep triage summaries short and separate facts from recommendations.
- Do not create, edit, close, label, or comment on issues unless the user explicitly asks.
