---
name: gitlab-projects
description: Use when the user asks to inspect GitLab projects, groups, branches, commits, repository files, releases, or pipelines through a connected GitLab app.
---

# GitLab Projects

Use this skill when a GitLab connection is available and the user asks about GitLab project or repository data.

## Endpoint

- Use `gitlab_rest` with `builtin_rest_request` for REST paths under `https://gitlab.com/api/v4`.
- Authentication is already sent as the `PRIVATE-TOKEN` header. Do not duplicate the token in query parameters or headers.

## Common Requests

- Current user: `GET /user`
- Projects visible to the token: `GET /projects?membership=true&simple=true`
- Project metadata: `GET /projects/{id}`
- Branches: `GET /projects/{id}/repository/branches`
- Commits: `GET /projects/{id}/repository/commits`
- Repository tree: `GET /projects/{id}/repository/tree`
- File metadata/content: `GET /projects/{id}/repository/files/{file_path}?ref={ref}`
- Pipelines: `GET /projects/{id}/pipelines`
- Pipeline jobs: `GET /projects/{id}/pipelines/{pipeline_id}/jobs`

## Guidance

- Ask for the project path or numeric project ID if it is not clear from context.
- GitLab supports namespaced project paths, but `/` must be URL-encoded as `%2F`, for example `group%2Fproject`.
- Use the `iid` field for project-scoped issues and merge requests.
- Do not mutate GitLab state unless the user explicitly asks for a write operation.
