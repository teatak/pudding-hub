import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pudding, useWidgetLocale } from "@pudding/widget";
import {
  Mail,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FilePenLine,
  CalendarClock,
  Info,
  Copy,
  Check,
  ExternalLink,
  Globe,
  FileText,
} from "lucide-react";
import { createMailbox, registerInterfaces, type Mailbox } from "./api";
import { statuses, decodeHtmlEntities, type Card } from "./model";
import { t, errorText } from "./text";
import "./style.css";
import { copyError } from "./copy";

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
function parseSender(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    let name = match[1].trim().replace(/^["']|["']$/g, "");
    const email = match[2].trim();
    if (!name) name = email.split("@")[0] || email;
    return { name, email, full: raw };
  }
  return {
    name: trimmed.split("@")[0] || trimmed,
    email: trimmed.includes("@") ? trimmed : "",
    full: raw,
  };
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
  const clean = decodeHtmlEntities(text);
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
    if (raw.startsWith("<") && raw.endsWith(">")) {
      url = raw.slice(1, -1);
    }
    parts.push(<LinkChip key={match.index} url={url} />);
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
  const hasHtml = Boolean(m.html);
  const [viewMode, setViewMode] = useState<"html" | "plain">(
    hasHtml ? "html" : "plain",
  );
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
          <p className="gb-recipient" title={m.to}>
            To: {m.to || "me"}
          </p>
        </div>
        {hasHtml && (
          <div className="gb-view-toggle">
            <button
              type="button"
              className={viewMode === "html" ? "is-active" : ""}
              onClick={() => setViewMode("html")}
              title={t("viewHtml")}
            >
              <Globe size={12} />
              <span>{t("viewHtml")}</span>
            </button>
            <button
              type="button"
              className={viewMode === "plain" ? "is-active" : ""}
              onClick={() => setViewMode("plain")}
              title={t("viewPlain")}
            >
              <FileText size={12} />
              <span>{t("viewPlain")}</span>
            </button>
          </div>
        )}
      </div>

      {m.format === "unavailable" && (
        <p className="gb-muted">{t("bodyUnavailable")}</p>
      )}

      <div className="gb-message-content">
        {viewMode === "html" && m.html ? (
          <div
            className="gb-email-html"
            dangerouslySetInnerHTML={{ __html: m.html }}
          />
        ) : (
          <FormattedText text={m.text} />
        )}
      </div>

      {m.truncated && <p className="gb-muted gb-truncated">{t("truncated")}</p>}
    </article>
  );
}

function Editor({
  mail,
  account,
  id,
}: {
  mail: Mailbox;
  account: string;
  id: string;
}) {
  const client = useQueryClient();
  const [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [tab, setTab] = useState<"message" | "organize">("message");
  const detail = useQuery({
    queryKey: ["gmail-board-view", "detail", account, id, offset],
    queryFn: ({ signal }) => mail.read(account, id, offset, 5, signal),
    retry: false,
  });
  const [form, setForm] = useState<Card | null>(null),
    [baseVersion, setBaseVersion] = useState(0),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (detail.data && !dirty) {
      const d = detail.data;
      setForm({
        status: d.status,
        note: d.note,
        followUpAt: d.followUpAt,
        draft: d.draft,
      });
      setBaseVersion(d.storageVersion);
    }
  }, [detail.data, dirty]);
  function change(patch: Partial<Card>) {
    setForm((v) => (v ? { ...v, ...patch } : v));
    setDirty(true);
  }
  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await mail.edit(
        account,
        baseVersion,
        [
          {
            id,
            status: form.status,
            note: form.note,
            followUpAt: form.followUpAt,
          },
        ],
        {
          id,
          value: form.draft?.subject || form.draft?.body ? form.draft : null,
        },
      );
      setDirty(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <nav className="gb-detail-tabs" aria-label={t("detailView")}>
        <button
          aria-pressed={tab === "message"}
          onClick={() => setTab("message")}
        >
          {t("messageTab")}
        </button>
        <button
          aria-pressed={tab === "organize"}
          onClick={() => setTab("organize")}
        >
          {t("organizeTab")}
          {dirty && <i />}
        </button>
      </nav>
      <div className="gb-detail-scroll">
        {detail.error ? (
          <ErrorBox error={detail.error} retry={() => void detail.refetch()} />
        ) : null}
        {error ? (
          <ErrorBox
            error={error}
            retryLabel={t("reloadSaved")}
            retry={() => {
              setError(null);
              setDirty(false);
              void client.invalidateQueries({ queryKey: ["gmail-board-view"] });
            }}
          />
        ) : null}
        {detail.isPending ? <p className="gb-muted">{t("loading")}</p> : null}
        {detail.data && (
          <h2 className="gb-thread-title">
            {detail.data.subject || t("untitled")}
          </h2>
        )}
        {detail.data && (
          <section className="gb-read" hidden={tab !== "message"}>
            <p className="gb-muted">
              {detail.data.messageCount === 1
                ? t("oneMessage")
                : `${detail.data.messageCount} ${t("messages")}`}
            </p>
            <section className="gb-messages">
              {detail.data.messages.map((m) => (
                <MessageCard key={m.id} m={m} />
              ))}
            </section>
            {(offset > 0 || detail.data.nextOffset !== null) && (
              <nav className="gb-pager">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 5))}
                >
                  {t("newer")}
                </button>
                <button
                  disabled={detail.data.nextOffset === null}
                  onClick={() => setOffset(detail.data!.nextOffset!)}
                >
                  {t("older")}
                </button>
              </nav>
            )}
          </section>
        )}
        {form && (
          <section className="gb-form" hidden={tab !== "organize"}>
            <div className="gb-form-row">
              <label>
                {t("status")}
                <select
                  value={form.status}
                  onChange={(e) =>
                    change({ status: e.target.value as Card["status"] })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("followUpAt")}
                <input
                  type="date"
                  value={form.followUpAt ?? ""}
                  onChange={(e) =>
                    change({ followUpAt: e.target.value || null })
                  }
                />
              </label>
            </div>
            <label>
              {t("note")}
              <textarea
                rows={2}
                maxLength={2000}
                value={form.note}
                onChange={(e) => change({ note: e.target.value })}
              />
            </label>
            <h3>
              <FilePenLine size={16} />
              {t("draft")}
            </h3>
            <p className="gb-muted">{t("localDraft")}</p>
            <label>
              {t("subject")}
              <input
                maxLength={500}
                value={form.draft?.subject ?? ""}
                onChange={(e) =>
                  change({
                    draft: {
                      subject: e.target.value,
                      body: form.draft?.body ?? "",
                    },
                  })
                }
              />
            </label>
            <label>
              {t("body")}
              <textarea
                rows={5}
                maxLength={8000}
                value={form.draft?.body ?? ""}
                onChange={(e) =>
                  change({
                    draft: {
                      subject: form.draft?.subject ?? "",
                      body: e.target.value,
                    },
                  })
                }
              />
            </label>
            <div className="gb-save">
              <span role="status">{dirty ? t("unsaved") : t("saved")}</span>
              <button
                className="gb-primary"
                disabled={!dirty || busy}
                onClick={() => void pudding.interaction.handle(save)}
              >
                {t("save")}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
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
      <div className="gb-detail-top">
        <span title={account}>{account}</span>
        <button aria-label={t("close")} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <Editor key={`${account}:${id}`} mail={mail} account={account} id={id} />
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
        void client.invalidateQueries({ queryKey: ["gmail-board-view"] });
      }),
    [client],
  );
  const profile = useQuery({
    queryKey: ["gmail-board-view", "account"],
    queryFn: () => mail.profile(),
    retry: false,
  });
  const account = profile.data;
  const [search, setSearch] = useState("in:inbox"),
    [q, setQ] = useState("in:inbox"),
    [cursors, setCursors] = useState([""]),
    [selected, setSelected] = useState<string | null>(null),
    [status, setStatus] = useState<Card["status"]>("todo"),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState<unknown>(null);
  const cursor = cursors[cursors.length - 1];
  const list = useQuery({
    queryKey: ["gmail-board-view", "list", account, q, cursor],
    queryFn: ({ signal }) => mail.list(account!, q, cursor, 20, signal),
    enabled: !!account,
    retry: false,
  });
  const items = list.data?.items.filter((item) => item.status === status) ?? [];
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
      await client.invalidateQueries({ queryKey: ["gmail-board-view"] });
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
            <p className="gb-account" title={account}>
              {account ?? t("loading")}
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
        <details className="gb-help">
          <summary aria-label={t("about")}>
            <Info size={17} />
          </summary>
          <div>
            {t("accountHint")}
            <p>{t("scope")}</p>
          </div>
        </details>
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
          <nav
            className="gb-status-tabs"
            role="tablist"
            aria-label={t("status")}
          >
            {statuses.map((value, index) => (
              <button
                key={value}
                role="tab"
                id={`gb-tab-${value}`}
                aria-selected={status === value}
                aria-controls="gb-thread-list"
                tabIndex={status === value ? 0 : -1}
                onClick={() => {
                  setStatus(value);
                  setSelected(null);
                }}
                onKeyDown={(event) => {
                  let next: number;
                  if (event.key === "ArrowRight")
                    next = (index + 1) % statuses.length;
                  else if (event.key === "ArrowLeft")
                    next = (index + statuses.length - 1) % statuses.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = statuses.length - 1;
                  else return;
                  event.preventDefault();
                  setStatus(statuses[next]);
                  setSelected(null);
                  document.getElementById(`gb-tab-${statuses[next]}`)?.focus();
                }}
              >
                {t(value)}
                <span>
                  {list.data?.items.filter((item) => item.status === value)
                    .length ?? 0}
                </span>
              </button>
            ))}
          </nav>
          <div
            className="gb-cards"
            id="gb-thread-list"
            role="tabpanel"
            aria-labelledby={`gb-tab-${status}`}
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
                  <span title={item.from}>{item.from}</span>
                  <time>
                    {new Date(item.updatedAt).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  {item.unread && <i aria-label={t("unread")} />}
                </div>
                <strong title={item.subject}>
                  {item.subject || t("untitled")}
                </strong>
                {item.snippet && <p>{item.snippet}</p>}
                {(item.hasDraft || item.followUpAt) && (
                  <footer>
                    {item.hasDraft && (
                      <FilePenLine size={14} aria-label={t("draft")} />
                    )}
                    {item.followUpAt && (
                      <>
                        <CalendarClock size={14} />
                        {item.followUpAt}
                      </>
                    )}
                  </footer>
                )}
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
                : `${list.data?.items.length ?? 0} ${t("loaded")}`}
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
