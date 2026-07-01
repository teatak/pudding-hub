---
name: gmail-mailbox
description: Use when the user asks to search, inspect, summarize, or triage Gmail messages, threads, labels, or inbox state through a connected Gmail app.
---

# Gmail Mailbox

Use this skill when a Gmail connection is available and the user asks about mailbox content.

## Endpoint

Use `gmail_rest` with `builtin_rest_request` for Gmail API paths under `https://gmail.googleapis.com/gmail/v1`.

## Read examples

- Search messages: `GET /users/me/messages` with query `q` and `maxResults`.
- Get a message: `GET /users/me/messages/{id}` with query `format=metadata` or `format=full`.
- Get a thread: `GET /users/me/threads/{id}` with query `format=metadata` or `format=full`.
- List labels: `GET /users/me/labels`.

## Guidance

- Prefer Gmail search syntax in `q` instead of fetching broad inbox pages.
- Summarize only the messages needed for the user request.
- This app is currently read-only; do not claim to send, archive, delete, or label messages unless write scopes and tools are added later.
