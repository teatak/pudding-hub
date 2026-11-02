import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pudding, useWidgetLocale } from "@pudding/widget";
import {
  Mail,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  ExternalLink,
  Globe,
  FileText,
} from "lucide-react";
import { createMailbox, registerInterfaces, type Mailbox } from "./api";
import { t, errorText } from "./text";
import "./style.css";
import { copyError } from "./copy";
import { sanitizeEmailHtml } from "./html";
import { decodeHeaderWords, parseSender } from "./headers";
import { EmailBody } from "./EmailBody";

function ErrorBox({
  error,
  retry,
  retryLabel,
}: {
  error: unknown;
  retry?: () => void;
  retryLabel?: string;
}) {
  const detail = errorText(error);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setCopied("idle"), [detail]);
  return (
    <div className="gb-error" role="alert" ref={box}>
      <div>
        <strong>{t("error")}</strong>
        {retry && <button onClick={retry}>{retryLabel ?? t("retry")}</button>}
      </div>
      <details>
        <summary>{t("details")}</summary>
        <textarea
          ref={text}
          readOnly
          aria-label={t("details")}
          value={detail}
        />
        <div className="gb-copy-row">
          <button
            onClick={() => {
              const ok = copyError(detail, box.current!);
              setCopied(ok ? "copied" : "failed");
              if (!ok) {
                text.current?.focus();
                text.current?.select();
              }
            }}
          >
            {copied === "copied" ? <Check size={14} /> : <Copy size={14} />}
            {t(copied === "copied" ? "copied" : "copy")}
          </button>
          <span role="status">
            {copied === "failed" ? t("copyFailed") : ""}
          </span>
        </div>
      </details>
    </div>
  );
}
function SenderAvatar({ name }: { name: string }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  return (
    <div className="gb-sender-avatar" aria-hidden="true">
      {letter}
    </div>
  );
}

function formatUrlLabel(url: string): string {
  try {
    const u = new URL(url);
    const pathPart =
      u.pathname.length > 24 ? u.pathname.slice(0, 20) + "…" : u.pathname;
    return `${u.hostname}${pathPart !== "/" ? pathPart : ""}`;
  } catch {
    return url.length > 36 ? url.slice(0, 32) + "…" : url;
  }
}

function LinkChip({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="gb-link-chip">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className="gb-link-url"
      >
        <ExternalLink size={12} />
        <span>{formatUrlLabel(url)}</span>
      </a>
      <button
        type="button"
        className="gb-link-copy-btn"
        title={copied ? t("linkCopied") : t("copyLink")}
        aria-label={t("copyLink")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}

function FormattedText({ text }: { text: string }) {
  const clean = text;
  const urlRegex = /(<https?:\/\/[^\s>]+>|https?:\/\/[^\s<>"']+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      parts.push(clean.slice(lastIndex, match.index));
    }
    const raw = match[0];
    let url = raw;
    let trailingPunct = "";
    if (raw.startsWith("<") && raw.endsWith(">")) {
      url = raw.slice(1, -1);
    } else {
      while (/[),.;]$/.test(url)) {
        trailingPunct = url.slice(-1) + trailingPunct;
        url = url.slice(0, -1);
      }
    }
    parts.push(<LinkChip key={match.index} url={url} />);
    if (trailingPunct) {
      parts.push(trailingPunct);
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < clean.length) {
    parts.push(clean.slice(lastIndex));
  }

  return <div className="gb-plain-body">{parts}</div>;
}

function MessageCard({
  m,
}: {
  m: {
    id: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html?: string;
    format: string;
    truncated?: boolean;
  };
}) {
  const html = useMemo(() => sanitizeEmailHtml(m.html ?? ""), [m.html]);
  const [viewMode, setViewMode] = useState<"html" | "plain">("html");
  const sender = parseSender(m.from);

  return (
    <article key={m.id} className="gb-message-card">
      <div className="gb-message-card-header">
        <SenderAvatar name={sender.name} />
        <div className="gb-message-header-info">
          <div className="gb-message-meta">
            <div className="gb-sender-line">
              <strong className="gb-sender-name" title={sender.full}>
                {sender.name}
              </strong>
              {sender.email && (
                <span className="gb-sender-email" title={sender.email}>
                  &lt;{sender.email}&gt;
                </span>
              )}
            </div>
            <time>
              {new Date(m.date).toLocaleString(pudding.locale.read())}
            </time>
          </div>
          <p className="gb-recipient" title={decodeHeaderWords(m.to)}>
            To: {decodeHeaderWords(m.to) || "me"}
          </p>
        </div>
        {html && (
          <div className="gb-view-toggle" role="group" aria-label={t("messageTab")}>
            <button type="button" aria-pressed={viewMode === "html"}
              className={viewMode === "html" ? "is-active" : ""}
              onClick={() => setViewMode("html")}>
              <Globe size={12} /><span>{t("viewHtml")}</span>
            </button>
            <button type="button" aria-pressed={viewMode === "plain"}
              className={viewMode === "plain" ? "is-active" : ""}
              onClick={() => setViewMode("plain")}>
              <FileText size={12} /><span>{t("viewPlain")}</span>
            </button>
          </div>
        )}
      </div>

      {m.format === "unavailable" && (
        <p className="gb-muted">{t("bodyUnavailable")}</p>
      )}

      <div className="gb-message-content">
        {viewMode === "html" && html
          ? <EmailBody document={html} title={t("messageTab")} />
          : <FormattedText text={m.text} />}
      </div>

      {m.truncated && <p className="gb-muted gb-truncated">{t("truncated")}</p>}
    </article>
  );
}

function Editor({ mail, account, id, onClose }: {
  mail: Mailbox; account: string; id: string; onClose: () => void;
}) {
  const [readError, setReadError] = useState<unknown>(null);
  const detail = useQuery({
    queryKey: ["email-board-view", "detail", account, id],
    queryFn: ({ signal }) => mail.read(account, id, 0, 1, signal),
    retry: false,
  });
  const syncRead = useCallback(async () => {
    setReadError(null);
    try { await mail.markRead(account, id); }
    catch { setReadError(new Error(t("readSyncFailed"))); }
  }, [mail, account, id]);
  useEffect(() => {
    if (detail.data?.unread) void syncRead();
  }, [detail.data?.unread, syncRead]);
  return <>
    <div className="gb-detail-header">
      <span>{t("messageTab")}</span>
      <button className="gb-detail-close" aria-label={t("close")} onClick={onClose}><X size={18} /></button>
    </div>
    <div className="gb-detail-scroll">
      {detail.error && <ErrorBox error={detail.error} retry={() => void detail.refetch()} />}
      {readError ? <ErrorBox error={readError} retry={() => void syncRead()} /> : null}
      {detail.isPending && <p className="gb-muted">{t("loading")}</p>}
      {detail.data && <>
        <h2 className="gb-thread-title">{detail.data.subject || t("untitled")}</h2>
        <section className="gb-messages">
          {detail.data.messages.map(m => <MessageCard key={m.id} m={m} />)}
        </section>
        {detail.data.attachments.length > 0 && <div className="gb-muted">
          <p>{t("attachments")}</p>
          <ul>{detail.data.attachments.map((attachment, index) => <li key={index}>
            {attachment.name || attachment.type} · {attachment.size.toLocaleString()} B
          </li>)}</ul>
        </div>}
      </>}
    </div>
  </>;
}
function ThreadDetail({
  account,
  mail,
  id,
  onClose,
}: {
  account: string;
  mail: Mailbox;
  id: string;
  onClose: () => void;
}) {
  return (
    <aside className="gb-detail" aria-label={t("detailView")}>
      <Editor key={`${account}:${id}`} mail={mail} account={account} id={id} onClose={onClose} />
    </aside>
  );
}
export default function App() {
  const locale = useWidgetLocale(),
    client = useQueryClient();
  const mail = useMemo(() => createMailbox(client), [client]);
  useEffect(() => {
    const dispose = registerInterfaces(mail);
    return () => dispose.forEach((fn) => fn());
  }, [mail, locale]);
  useEffect(
    () =>
      pudding.storage.subscribe(() => {
        void client.invalidateQueries({ queryKey: ["email-board-view"] });
      }),
    [client],
  );
  const profile = useQuery({
    queryKey: ["email-board-view", "account"],
    queryFn: ({ signal }) => mail.profile(signal),
    retry: false,
  });
  const account = profile.data;
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [cursors, setCursors] = useState([""]),
    [selected, setSelected] = useState<string | null>(null),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState<unknown>(null);
  const cursor = cursors[cursors.length - 1];
  const list = useQuery({
    queryKey: ["email-board-view", "list", account, q, cursor],
    queryFn: ({ signal }) => mail.list(account!, q, cursor, 20, signal),
    enabled: !!account,
    retry: false,
  });
  const items = list.data?.items ?? [];

  function find() {
    setQ(search.trim());
    setCursors([""]);
    setSelected(null);
  }
  async function refresh() {
    if (!account) return;
    setRefreshing(true);
    setError(null);
    try {
      await mail.refresh(account);
      await client.invalidateQueries({ queryKey: ["email-board-view"] });
    } catch (e) {
      setError(e);
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <main className="gb-app">
      <header className="gb-header">
        <div className="gb-brand">
          <span className="gb-icon" aria-hidden="true" />
          <div>
            <h1>{t("title")}</h1>
            <p className="gb-account" title={mail.address()}>
              {account ? mail.address() : t("loading")}
            </p>
          </div>
        </div>
        <div className="gb-search">
          <Search size={16} />
          <input
            aria-label={t("search")}
            placeholder={t("searchHint")}
            maxLength={500}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                find();
              }
            }}
          />
          <button onClick={find}>{t("search")}</button>
        </div>
        <button
          className="gb-refresh"
          aria-label={t("refresh")}
          title={t("refresh")}
          disabled={!account || refreshing || list.isFetching}
          onClick={() => void pudding.interaction.handle(refresh)}
        >
          <RefreshCw size={15} className={refreshing ? "gb-spin" : ""} />
        </button>
      </header>
      {profile.error || list.error || error ? (
        <div className="gb-alert">
          <ErrorBox
            error={profile.error || list.error || error}
            retry={() => {
              setError(null);
              void profile.refetch();
              void list.refetch();
            }}
          />
        </div>
      ) : null}
      <div className="gb-workspace">
        <section className="gb-inbox" aria-label={t("title")}>
          <div className="gb-inbox-heading" id="gb-inbox-heading">
            <span>{t("inbox")}</span><span>{items.length}</span>
          </div>
          <div
            className="gb-cards"
            id="gb-thread-list"
            role="region"
            aria-labelledby="gb-inbox-heading"
            tabIndex={0}
          >
            {items.map((item) => (
              <button
                key={item.id}
                className="gb-card"
                data-thread-id={item.id}
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
              >
                <div className="gb-card-top">
                  <span title={decodeHeaderWords(item.from)}>{decodeHeaderWords(item.from)}</span>
                  <time>
                    {new Date(item.updatedAt).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  {item.unread && <i aria-label={t("unread")} />}
                </div>
                <span className="gb-card-title" title={item.subject}>
                  {item.subject || t("untitled")}
                </span>
                {item.snippet && <p>{item.snippet}</p>}
              </button>
            ))}
            {!items.length && (
              <p className="gb-empty">
                {list.isFetching ? t("loading") : t("empty")}
              </p>
            )}
          </div>
          <div className="gb-page-info">
            <span aria-live="polite">
              {list.isFetching
                ? t("loading")
                : `${items.length} ${t("loaded")}`}
            </span>
              <nav className="gb-pager">
                <button
                  aria-label={t("previous")}
                  disabled={cursors.length === 1 || list.isFetching}
                  onClick={() => {
                    setCursors((v) => v.slice(0, -1));
                    setSelected(null);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{cursors.length}</span>
                <button
                  aria-label={t("next")}
                  disabled={!list.data?.nextCursor || list.isFetching}
                  onClick={() => {
                    setCursors((v) => [...v, list.data!.nextCursor!]);
                    setSelected(null);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
          </div>
        </section>
        {selected && account ? (
          <ThreadDetail
            account={account}
            mail={mail}
            id={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <section className="gb-reader-empty">
            <Mail size={28} />
            <p>{t("openHint")}</p>
          </section>
        )}
      </div>
    </main>
  );
}
