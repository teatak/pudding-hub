# Email plugin and Email Board

Requires protocol 58 / Plugin API 1.2 and the matching Desktop. Install the Email plugin and Email Board, create an iCloud, Gmail or custom IMAP/SMTP connection, then select it in the board toolbar.

- iCloud: imap.mail.me.com:993 (TLS), smtp.mail.me.com:587 (STARTTLS), full email address and an Apple app-specific password. [Apple setup](https://support.apple.com/102525).
- Gmail: imap.gmail.com:993 (TLS), smtp.gmail.com:465 (TLS), full email address and a Google app password. Two-step verification is required; some managed/protected accounts cannot use app passwords. [Google setup](https://support.google.com/mail/answer/185833).
- Custom: supply both hosts, ports and TLS/STARTTLS modes. Certificates must be trusted by the system. Optional login overrides default to the email address; an unset SMTP password defaults to the main password. SMTP supports PLAIN and LOGIN. OAuth-only providers, plaintext transport and certificate bypasses are unsupported.

The iCloud and Gmail forms ask only for a connection name, email address and app password. Server and login settings are automatic. The custom IMAP/SMTP form exposes the full server and optional login settings.

Credentials use the encrypted host store and are write-only in settings. Blank secret edits preserve existing values; clearing an optional SMTP password is explicit. Saving authenticates both protocols without sending. Password rotation preserves mailbox identity, bindings and drafts. A different IMAP server/login requires a new connection and explicit selection. Configuration revisions reject stale reads and concurrent saves.

The board reads INBOX on demand, one card per message. Search is plain text, not Gmail syntax; each page searches up to 5,000 UID positions and an empty page can still have older results. Lists fetch metadata only. Text is bounded to 64 KiB, HTML becomes inert text, remote images are never loaded, and attachments expose metadata only. Reads do not mark messages read.

Local storage contains card summaries, categories, notes and reply drafts, not a mailbox replica or full bodies/attachments. The board does not change remote flags, labels or drafts. The plugin's model tool can send plain-text new messages and replies when the user requests sending. A local draft is not sent. Never automatically retry `email_send_uncertain`. SMTP acceptance is not guaranteed delivery. Sent copies depend on the server; the adapter does not append duplicates, and some custom/iCloud servers may not save a copy automatically.

The withdrawn Gmail Board's historical packages and local data remain intact. The replacement is named Email Board and uses a separate `emailBoard` namespace keyed by mailboxID. Gmail API IDs and IMAP UIDs are incompatible, so old cards are not automatically migrated. Existing OAuth connections cannot be converted to app passwords automatically.
