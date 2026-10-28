# GitHub Board · 1.0.0-preview.1

A local triage board for GitHub repositories, issues and pull requests. Requires the GitHub plugin and a connected GitHub App or personal access token.

## Connections and data

Use Pudding's **account selector in the widget toolbar** to choose an existing GitHub connection. Each connected account is identified by the authenticated GitHub user's `login`, normalized to lowercase. Board statuses (`triage`, `review`, `inProgress`, `done`), follow-up dates, notes and saved comment/review drafts are partitioned by that account inside the widget's item storage.

Use the repository drawer/selector to list and filter by repository, or use GitHub search syntax (`is:open`, `is:pr`, `is:issue`, `repo:owner/name`, `involves:@me`) to inspect issues and pull requests. Selecting an item opens its description and comments on the right; switch to **Organize & draft** for its local triage status, follow-up date, notes and comment/review draft. All statuses, notes and drafts are stored locally in this board; your GitHub repositories, issues and pull requests are never modified remotely.

## LLM interfaces

| Interface | Purpose |
| --- | --- |
| `getBoard` | Current GitHub account login, counts for the default query page, total count, storage version |
| `listRepos` | Paginated list of repositories accessible to the connected account |
| `listItems` | GitHub issue/PR search query and page pagination; summary, local status, follow-up date, draft presence |
| `readItem` | On-demand issue/PR body, paginated comments, local note and draft |
| `updateCards` | Atomic batch of 1–20 local statuses, notes and follow-up dates |
| `saveCommentDraft` | Save or clear one local comment/review draft |
| `refreshBoard` | Refresh GitHub reads without deleting local organization |
