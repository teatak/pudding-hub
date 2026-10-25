import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { createMailbox, registerInterfaces, type Mailbox } from "./api";
import { statuses, type Card } from "./model";
import { t, errorText } from "./text";
import "./style.css";

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
  return (
    <div className="gb-error" role="alert">
      <div>
        <strong>{t("error")}</strong>
        {retry && <button onClick={retry}>{retryLabel ?? t("retry")}</button>}
      </div>
      <details>
        <summary>{t("details")}</summary>
        <pre>{detail}</pre>
        <button onClick={() => void navigator.clipboard.writeText(detail)}>
          {t("copy")}
        </button>
      </details>
    </div>
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
    [error, setError] = useState<unknown>(null);
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
        <>
          <h2>{detail.data.subject || t("untitled")}</h2>
          <p className="gb-muted">
            {detail.data.messageCount} {t("messages")}
          </p>
          <section className="gb-messages">
            {detail.data.messages.map((m) => (
              <article key={m.id}>
                <div className="gb-message-meta">
                  <strong title={m.from}>{m.from}</strong>
                  <time>
                    {new Date(m.date).toLocaleString(pudding.locale.read())}
                  </time>
                </div>
                <p className="gb-recipient" title={m.to}>
                  {m.to}
                </p>
                {m.format === "unavailable" && (
                  <p className="gb-muted">{t("bodyUnavailable")}</p>
                )}
                <pre>{m.text}</pre>
                {m.truncated && <p className="gb-muted">{t("truncated")}</p>}
              </article>
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
        </>
      )}
      {form && (
        <section className="gb-form">
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
                onChange={(e) => change({ followUpAt: e.target.value || null })}
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
    </>
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
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState<unknown>(null);
  const cursor = cursors[cursors.length - 1];
  const list = useQuery({
    queryKey: ["gmail-board-view", "list", account, q, cursor],
    queryFn: ({ signal }) => mail.list(account!, q, cursor, 20, signal),
    enabled: !!account,
    retry: false,
  });
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
          <span className="gb-icon">
            <Mail size={24} />
          </span>
          <div>
            <h1>{t("title")}</h1>
            <p className="gb-account" title={account}>
              {account ?? t("loading")}
            </p>
          </div>
        </div>
        <button
          disabled={!account || refreshing || list.isFetching}
          onClick={() => void pudding.interaction.handle(refresh)}
        >
          <RefreshCw size={15} className={refreshing ? "gb-spin" : ""} />
          {t("refresh")}
        </button>
      </header>
      <p className="gb-muted gb-hint">
        {t("accountHint")} · {t("scope")}
      </p>
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
      {profile.error || list.error || error ? (
        <ErrorBox
          error={profile.error || list.error || error}
          retry={() => {
            setError(null);
            void profile.refetch();
            void list.refetch();
          }}
        />
      ) : null}
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
      <div className="gb-workspace" data-detail-open={!!selected}>
        <section className="gb-board" aria-label={t("title")}>
          {statuses.map((status) => {
            const items =
              list.data?.items.filter((x) => x.status === status) ?? [];
            return (
              <section key={status} className="gb-column">
                <h2>
                  {t(status)}
                  <span>{items.length}</span>
                </h2>
                <div className="gb-cards">
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
                        {item.unread && <i aria-label={t("unread")} />}
                      </div>
                      <strong title={item.subject}>
                        {item.subject || t("untitled")}
                      </strong>
                      <p>{item.snippet}</p>
                      <footer>
                        <time>
                          {new Date(item.updatedAt).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        <span>
                          {item.hasDraft && (
                            <FilePenLine size={14} aria-label={t("draft")} />
                          )}{" "}
                          {item.followUpAt && (
                            <>
                              <CalendarClock size={14} />
                              {item.followUpAt}
                            </>
                          )}
                        </span>
                      </footer>
                    </button>
                  ))}
                  {!items.length && <p className="gb-empty">{t("empty")}</p>}
                </div>
              </section>
            );
          })}
        </section>
        {selected && account && (
          <aside className="gb-detail">
            <div className="gb-detail-top">
              <span title={account}>{account}</span>
              <button aria-label={t("close")} onClick={() => setSelected(null)}>
                <X size={16} />
              </button>
            </div>
            <Editor
              key={`${account}:${selected}`}
              mail={mail}
              account={account}
              id={selected}
            />
          </aside>
        )}
      </div>
    </main>
  );
}
