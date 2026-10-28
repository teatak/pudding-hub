---
name: gmail-mailbox
description: Use when the user asks to search, read, summarize, send, or reply to Gmail messages, or inspect threads, labels, or inbox state through a connected Gmail plugin.
---

# Gmail Mailbox

Use this skill for mailbox questions and user-requested emails or replies through a connected Gmail account.

## Endpoint

Use `gmail_rest` with `builtin_rest_request` for Gmail API paths under `https://gmail.googleapis.com/gmail/v1`.

## Connection and permissions

- Reuse the chat's existing Gmail binding. Without a binding, Pudding automatically uses the sole usable connection. If multiple accounts are available, choose the account matching the user's intent by calling `builtin_plugin_load` with `plugin_id: "gmail"` and the returned `connection_id`. If ambiguous, ask which account to use in chat, then bind it with that tool; do not require the user to operate the header connection picker.
- Gmail OAuth requests `gmail.readonly` for reading and `gmail.send` for sending. Existing read-only connections need Google reauthorization using an updated Pudding Core that requests both scopes. Adding a scope in Google Cloud alone does not update an existing token.
- If sending fails with insufficient permissions, explain that the connection needs reauthorization. If the consent flow still requests only read access, Pudding Core must be updated first. Do not infer missing scopes from `connection_required`.
- These scopes do not authorize creating or updating drafts, archiving, deleting, marking messages read, or modifying labels.

## Read examples

- Search messages: `GET /users/me/messages` with query `q` and `maxResults`.
- Get a message: `GET /users/me/messages/{id}` with query `format=metadata` or `format=full`.
- Get a thread: `GET /users/me/threads/{id}` with query `format=metadata` or `format=full`.
- List labels: `GET /users/me/labels`.
- Get the connected email address: `GET /users/me/profile` (read `emailAddress`).

## Send emails

When the user asks to send an email and the recipients and content are clear, send it through the selected connection. Ask only for missing details; do not require another confirmation for an already authorized send. A request to write or preview an email alone is not a request to send it.

1. Resolve the sender from `GET /users/me/profile`. For a self-test, use its `emailAddress` as the recipient too. `me` is an API path alias, not an email address for the `To` header.
2. Build an RFC 2822 MIME message with `From`, `To`, `Subject`, `MIME-Version: 1.0`, and a `Content-Type` such as `text/plain; charset=UTF-8` or `text/html; charset=UTF-8`. Include `Cc` and `Bcc` only when requested. Separate headers and body with a blank line and use CRLF line endings. Encode non-ASCII subjects/display names as MIME encoded-words and use an appropriate body transfer encoding, such as base64, for UTF-8 content. Use a MIME library when available; do not guess encoded bytes.
3. Base64url-encode the entire MIME message into `raw` (URL-safe alphabet, without padding). This is separate from any MIME body transfer encoding.
4. Call `builtin_rest_request` with these arguments, replacing the placeholder with the encoded message:

```json
{
  "endpoint": "gmail_rest",
  "method": "POST",
  "path": "/users/me/messages/send",
  "body_json": { "raw": "<base64url-encoded MIME message>" }
}
```

Authentication is supplied by the connection; never request or embed access tokens. Report success only when the tool succeeds and Gmail returns a message `id` in `body_json`. If the request times out or its outcome is unknown, check Sent mail before retrying to avoid duplicate messages.

## Reply to emails

Read the original message first. Use its `Reply-To` header, or `From` when absent, and include other recipients only when the user requested reply-all. Set MIME `In-Reply-To` to the original RFC `Message-ID` and extend `References` with that ID. Preserve the original subject with the normal reply prefix. Include the original Gmail `threadId` alongside `raw` in `body_json`; Gmail message IDs are not RFC `Message-ID` headers.

## API references

- [Create and send messages](https://developers.google.com/workspace/gmail/api/guides/sending)
- [messages.send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
- [Threading replies](https://developers.google.com/workspace/gmail/api/guides/threads)

## Guidance

- Prefer Gmail search syntax in `q` instead of fetching broad inbox pages.
- Summarize only the messages needed for the user request.
