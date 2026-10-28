import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pudding, useWidgetLocale } from "@pudding/widget";
import {
  BookMarked,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  FilePenLine,
  FolderGit2,
  GitPullRequest,
  GitPullRequestDraft,
  Info,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  createGitHubBoard,
  registerInterfaces,
  DEFAULT_QUERY,
  type GitHubBoard,
} from "./api";
import { statuses, draftKinds, type Card } from "./model";
import { t, errorText, type MessageKey } from "./text";
import { copyText } from "./copy";
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
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setCopied("idle"), [detail]);
  return (
    <div className="ghb-error" role="alert" ref={box}>
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
        <div className="ghb-copy-row">
          <button
            onClick={() => {
              const ok = copyText(detail, box.current!);
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

function ItemEditor({
  gh,
  account,
  id,
}: {
  gh: GitHubBoard;
  account: string;
  id: string;
}) {
  const client = useQueryClient();
  const [commentPage, setCommentPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [tab, setTab] = useState<"discussion" | "organize">("discussion");
  const [draftCopied, setDraftCopied] = useState(false);
  const formRef = useRef<HTMLElement>(null);

  const detail = useQuery({
    queryKey: ["github-board-view", "detail", account, id, commentPage],
    queryFn: ({ signal }) => gh.read(account, id, commentPage, 10, signal),
    retry: false,
  });

  const [form, setForm] = useState<Card | null>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const [dirty, setDirty] = useState(false);

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
      const trimmedBody = form.draft?.body.trim() ?? "";
      const draftValue = trimmedBody
        ? {
            kind: form.draft?.kind ?? "comment",
            body: form.draft!.body,
          }
        : null;
      await gh.edit(
        account,
        baseVersion,
        [
          {
            id,
            status: form.status,
            note: form.note,
            followUpAt: form.followUpAt,
            ...(detail.data
              ? {
                  meta: {
                    title: detail.data.title,
                    author: detail.data.author,
                    snippet: detail.data.snippet,
                    updatedAt: detail.data.updatedAt,
                    kind: detail.data.kind,
                    state: detail.data.state,
                    isDraftPR: detail.data.isDraftPR,
                    commentCount: detail.data.commentCount,
                    labels: detail.data.labels,
                  },
                }
              : {}),
          },
        ],
        {
          id,
          value: draftValue,
        },
      );
      setDirty(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const d = detail.data;

  return (
    <>
      <nav className="ghb-detail-tabs" aria-label={t("detailView")}>
        <button
          aria-pressed={tab === "discussion"}
          onClick={() => setTab("discussion")}
        >
          {t("discussionTab")}
        </button>
        <button
          aria-pressed={tab === "organize"}
          onClick={() => setTab("organize")}
        >
          {t("organizeTab")}
          {dirty && <i />}
        </button>
      </nav>

      <div className="ghb-detail-scroll">
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
              void client.invalidateQueries({ queryKey: ["github-board-view"] });
            }}
          />
        ) : null}
        {detail.isPending ? <p className="ghb-muted">{t("loading")}</p> : null}

        {d && (
          <div className="ghb-item-header">
            <div className="ghb-item-badges">
              <span
                className={`ghb-kind-pill ${
                  d.kind === "pr"
                    ? d.isDraftPR
                      ? "is-draft"
                      : "is-pr"
                    : "is-issue"
                }`}
              >
                {d.kind === "pr" ? (
                  d.isDraftPR ? (
                    <GitPullRequestDraft size={13} />
                  ) : (
                    <GitPullRequest size={13} />
                  )
                ) : (
                  <CircleDot size={13} />
                )}
                {d.kind === "pr"
                  ? d.isDraftPR
                    ? t("kindDraftPR")
                    : t("kindPR")
                  : t("kindIssue")}
              </span>
              <span
                className={`ghb-state-pill ${
                  d.state === "open" ? "is-open" : "is-closed"
                }`}
              >
                {d.state === "open" ? t("stateOpen") : t("stateClosed")}
              </span>
              <span className="ghb-repo-ref">{d.id}</span>
            </div>
            <h2 className="ghb-item-title">{d.title || t("untitled")}</h2>
            {d.labels.length > 0 && (
              <div className="ghb-labels-row">
                {d.labels.map((lbl) => (
                  <span
                    key={lbl.name}
                    className="ghb-label-chip"
                    style={
                      {
                        "--lbl-color": `#${lbl.color}`,
                      } as React.CSSProperties
                    }
                  >
                    <i />
                    {lbl.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {d && (
          <section className="ghb-read" hidden={tab !== "discussion"}>
            <article className="ghb-post is-op">
              <div className="ghb-post-meta">
                <strong>@{d.author}</strong>
                <time>
                  {new Date(d.updatedAt).toLocaleString(pudding.locale.read())}
                </time>
              </div>
              {d.body ? (
                <pre>{d.body}</pre>
              ) : (
                <p className="ghb-muted ghb-italic">{t("noDescription")}</p>
              )}
              {d.bodyTruncated && <p className="ghb-muted">{t("truncated")}</p>}
            </article>

            <div className="ghb-comments-head">
              <h3>
                <MessageSquare size={15} />
                <span>
                  {d.commentCount} {t("comments")}
                </span>
              </h3>
            </div>

            {d.comments.length === 0 ? (
              <p className="ghb-muted">{t("noComments")}</p>
            ) : (
              <section className="ghb-comments-list">
                {d.comments.map((c) => (
                  <article key={c.id} className="ghb-post">
                    <div className="ghb-post-meta">
                      <strong>@{c.author}</strong>
                      <time>
                        {new Date(c.createdAt).toLocaleString(
                          pudding.locale.read(),
                        )}
                      </time>
                    </div>
                    <pre>{c.body}</pre>
                    {c.truncated && (
                      <p className="ghb-muted">{t("truncated")}</p>
                    )}
                  </article>
                ))}
              </section>
            )}

            {(commentPage > 1 || d.hasNextCommentPage) && (
              <nav className="ghb-pager">
                <button
                  disabled={commentPage <= 1}
                  onClick={() => setCommentPage(Math.max(1, commentPage - 1))}
                >
                  {t("newerComments")}
                </button>
                <span>{commentPage}</span>
                <button
                  disabled={!d.hasNextCommentPage}
                  onClick={() => setCommentPage(commentPage + 1)}
                >
                  {t("olderComments")}
                </button>
              </nav>
            )}
          </section>
        )}

        {form && (
          <section
            className="ghb-form"
            hidden={tab !== "organize"}
            ref={formRef}
          >
            <div className="ghb-form-row">
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
                rows={3}
                maxLength={2000}
                value={form.note}
                onChange={(e) => change({ note: e.target.value })}
              />
            </label>

            <div className="ghb-draft-head">
              <h3>
                <FilePenLine size={16} />
                {t("draft")}
              </h3>
              {form.draft?.body && (
                <button
                  type="button"
                  className="ghb-copy-btn"
                  onClick={() => {
                    if (!formRef.current || !form.draft?.body) return;
                    const ok = copyText(form.draft.body, formRef.current);
                    if (ok) {
                      setDraftCopied(true);
                      setTimeout(() => setDraftCopied(false), 1800);
                    }
                  }}
                >
                  {draftCopied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{draftCopied ? t("copied") : t("copyDraft")}</span>
                </button>
              )}
            </div>
            <p className="ghb-muted">{t("localDraft")}</p>

            <label>
              {t("draftKind")}
              <select
                value={form.draft?.kind ?? "comment"}
                onChange={(e) =>
                  change({
                    draft: {
                      kind: e.target.value as NonNullable<Card["draft"]>["kind"],
                      body: form.draft?.body ?? "",
                    },
                  })
                }
              >
                {draftKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`draftKind_${k}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("body")}
              <textarea
                rows={6}
                maxLength={8000}
                value={form.draft?.body ?? ""}
                onChange={(e) =>
                  change({
                    draft: e.target.value
                      ? {
                          kind: form.draft?.kind ?? "comment",
                          body: e.target.value,
                        }
                      : null,
                  })
                }
              />
            </label>

            <div className="ghb-save">
              <span role="status">{dirty ? t("unsaved") : t("saved")}</span>
              <button
                className="ghb-primary"
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

export default function App() {
  const locale = useWidgetLocale();
  const client = useQueryClient();
  const gh = useMemo(() => createGitHubBoard(client), [client]);

  useEffect(() => {
    const dispose = registerInterfaces(gh);
    return () => dispose.forEach((fn) => fn());
  }, [gh, locale]);

  useEffect(
    () =>
      pudding.storage.subscribe(() => {
        void client.invalidateQueries({ queryKey: ["github-board-view"] });
      }),
    [client],
  );

  const viewer = useQuery({
    queryKey: ["github-board-view", "viewer"],
    queryFn: () => gh.viewer(),
    retry: false,
  });
  const account = viewer.data;

  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);
  const [q, setQ] = useState(DEFAULT_QUERY);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Card["status"]>("triage");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const repoWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!repoMenuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (
        repoWrapRef.current &&
        !repoWrapRef.current.contains(e.target as Node)
      ) {
        setRepoMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [repoMenuOpen]);

  const reposQuery = useQuery({
    queryKey: ["github-board-view", "repos", account],
    queryFn: ({ signal }) => gh.repos(account!, 1, 30, signal),
    enabled: Boolean(account) && repoMenuOpen,
    retry: false,
  });

  const list = useQuery({
    queryKey: ["github-board-view", "list", account, q, page],
    queryFn: ({ signal }) => gh.list(account!, q, page, 20, signal),
    enabled: Boolean(account),
    retry: false,
  });

  const isTriageTab = status === "triage";
  const taggedList = list.data?.taggedCards ?? [];
  const items = isTriageTab
    ? (list.data?.items.filter((item) => item.status === "triage") ?? [])
    : taggedList.filter((item) => item.status === status);

  const tabCounts = useMemo(() => {
    const triageCount =
      list.data?.items.filter((item) => item.status === "triage").length ?? 0;
    const tagged = list.data?.taggedCards ?? [];
    return {
      triage: triageCount,
      review: tagged.filter((c) => c.status === "review").length,
      inProgress: tagged.filter((c) => c.status === "inProgress").length,
      done: tagged.filter((c) => c.status === "done").length,
    };
  }, [list.data]);

  function applyQuery(nextQuery: string, nextRepo: string | null = selectedRepo) {
    const clean = nextQuery.trim() || DEFAULT_QUERY;
    setSearchInput(clean);
    setQ(clean);
    setSelectedRepo(nextRepo);
    setPage(1);
    setSelected(null);
  }

  function selectRepository(fullName: string | null) {
    setRepoMenuOpen(false);
    if (!fullName) {
      applyQuery(DEFAULT_QUERY, null);
    } else {
      applyQuery(`repo:${fullName} is:open`, fullName);
    }
  }

  function applyPreset(presetFilter: string) {
    const prefix = selectedRepo ? `repo:${selectedRepo} ` : "";
    applyQuery(`${prefix}${presetFilter}`, selectedRepo);
  }

  async function refresh() {
    if (!account) return;
    setRefreshing(true);
    setError(null);
    try {
      await gh.refresh(account);
      await client.invalidateQueries({ queryKey: ["github-board-view"] });
    } catch (e) {
      setError(e);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="ghb-app">
      <header className="ghb-header">
        <div className="ghb-brand">
          <span className="ghb-icon" aria-hidden="true" />
          <div>
            <h1>{t("title")}</h1>
            <p className="ghb-account" title={account}>
              {account ? `@${account}` : t("loading")}
            </p>
          </div>
        </div>

        {/* Direct Repository Fleet Dropdown (Uses bound `repos` & `installations` operations) */}
        <div className="ghb-repo-picker" ref={repoWrapRef}>
          <button
            type="button"
            className={`ghb-repo-btn ${selectedRepo ? "is-filtered" : ""}`}
            disabled={!account}
            onClick={() => setRepoMenuOpen(!repoMenuOpen)}
          >
            <FolderGit2 size={15} />
            <span className="ghb-repo-btn-label">
              {selectedRepo ?? t("reposButton")}
            </span>
            <ChevronDown size={14} />
          </button>

          {repoMenuOpen && (
            <div className="ghb-repo-popover">
              <button
                type="button"
                className={`ghb-repo-item ${!selectedRepo ? "is-active" : ""}`}
                onClick={() => selectRepository(null)}
              >
                <div className="ghb-repo-item-main">
                  <strong>{t("allRepos")}</strong>
                </div>
                {!selectedRepo && <Check size={14} />}
              </button>

              {reposQuery.isPending && (
                <p className="ghb-repo-status">{t("loadingRepos")}</p>
              )}
              {reposQuery.error ? (
                <div className="ghb-repo-error">
                  <ErrorBox
                    error={reposQuery.error}
                    retry={() => void reposQuery.refetch()}
                  />
                </div>
              ) : null}

              {reposQuery.data?.repos.map((r) => {
                const active = selectedRepo === r.fullName;
                return (
                  <button
                    key={r.fullName}
                    type="button"
                    className={`ghb-repo-item ${active ? "is-active" : ""}`}
                    onClick={() => selectRepository(r.fullName)}
                  >
                    <div className="ghb-repo-item-main">
                      <div className="ghb-repo-name-row">
                        <strong>{r.fullName}</strong>
                        {r.isPrivate && <Lock size={11} />}
                      </div>
                      {r.description && <small>{r.description}</small>}
                    </div>
                    <div className="ghb-repo-stats">
                      {r.language && (
                        <span className="ghb-repo-lang">{r.language}</span>
                      )}
                      <span className="ghb-repo-star">
                        <Star size={11} />
                        {r.stars}
                      </span>
                    </div>
                  </button>
                );
              })}

              {reposQuery.data && reposQuery.data.repos.length === 0 && (
                <p className="ghb-repo-status">{t("emptyRepos")}</p>
              )}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="ghb-search">
          <Search size={15} />
          <input
            aria-label={t("search")}
            placeholder={t("searchHint")}
            maxLength={500}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyQuery(searchInput, null);
              }
            }}
          />
          <button onClick={() => applyQuery(searchInput, null)}>
            {t("search")}
          </button>
        </div>

        <details className="ghb-help">
          <summary aria-label={t("about")}>
            <Info size={17} />
          </summary>
          <div>
            {t("accountHint")}
            <p>{t("scope")}</p>
          </div>
        </details>

        <button
          className="ghb-refresh"
          aria-label={t("refresh")}
          title={t("refresh")}
          disabled={!account || refreshing || list.isFetching}
          onClick={() => void pudding.interaction.handle(refresh)}
        >
          <RefreshCw size={15} className={refreshing ? "ghb-spin" : ""} />
        </button>
      </header>

      {/* Quick Filter Preset Bar */}
      <nav className="ghb-presets" aria-label={t("search")}>
        {[
          { key: "presetInvolved" as const, filter: "is:open involves:@me" },
          {
            key: "presetReviewReq" as const,
            filter: "is:open is:pr review-requested:@me",
          },
          { key: "presetAssigned" as const, filter: "is:open assignee:@me" },
          { key: "presetMyPRs" as const, filter: "is:open is:pr author:@me" },
          {
            key: "presetOpenIssues" as const,
            filter: "is:open is:issue involves:@me",
          },
        ].map((preset) => {
          const expectedQ = selectedRepo
            ? `repo:${selectedRepo} ${preset.filter}`
            : preset.filter;
          const isCurrent = q === expectedQ;
          return (
            <button
              key={preset.key}
              type="button"
              className={`ghb-preset-chip ${isCurrent ? "is-active" : ""}`}
              onClick={() => applyPreset(preset.filter)}
            >
              {t(preset.key)}
            </button>
          );
        })}
      </nav>

      {viewer.error || list.error || error ? (
        <div className="ghb-alert">
          <ErrorBox
            error={viewer.error || list.error || error}
            retry={() => {
              setError(null);
              void viewer.refetch();
              void list.refetch();
            }}
          />
        </div>
      ) : null}

      <div className="ghb-workspace">
        <section className="ghb-inbox" aria-label={t("title")}>
          <nav
            className="ghb-status-tabs"
            role="tablist"
            aria-label={t("status")}
          >
            {statuses.map((value, index) => (
              <button
                key={value}
                role="tab"
                id={`ghb-tab-${value}`}
                aria-selected={status === value}
                aria-controls="ghb-item-list"
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
                  document.getElementById(`ghb-tab-${statuses[next]}`)?.focus();
                }}
              >
                {t(value)}
                <span>{tabCounts[value]}</span>
              </button>
            ))}
          </nav>

          <div
            className="ghb-cards"
            id="ghb-item-list"
            role="tabpanel"
            aria-labelledby={`ghb-tab-${status}`}
            tabIndex={0}
          >
            {items.map((item) => (
              <button
                key={item.id}
                className="ghb-card"
                data-item-id={item.id}
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
              >
                <div className="ghb-card-top">
                  <span
                    className={`ghb-mini-kind ${
                      item.kind === "pr"
                        ? item.isDraftPR
                          ? "is-draft"
                          : "is-pr"
                        : "is-issue"
                    }`}
                  >
                    {item.kind === "pr" ? (
                      item.isDraftPR ? (
                        <GitPullRequestDraft size={13} />
                      ) : (
                        <GitPullRequest size={13} />
                      )
                    ) : (
                      <CircleDot size={13} />
                    )}
                  </span>
                  <span className="ghb-card-repo" title={item.id}>
                    {item.id}
                  </span>
                  <time>
                    {new Date(item.updatedAt).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>

                <strong title={item.title}>{item.title || t("untitled")}</strong>

                {item.snippet && <p>{item.snippet}</p>}

                {item.labels.length > 0 && (
                  <div className="ghb-card-labels">
                    {item.labels.slice(0, 4).map((lbl) => (
                      <span
                        key={lbl.name}
                        className="ghb-label-chip"
                        style={
                          {
                            "--lbl-color": `#${lbl.color}`,
                          } as React.CSSProperties
                        }
                      >
                        <i />
                        {lbl.name}
                      </span>
                    ))}
                  </div>
                )}

                <footer>
                  <span>@{item.author}</span>
                  {item.commentCount > 0 && (
                    <span className="ghb-meta-inline">
                      <MessageSquare size={12} />
                      {item.commentCount}
                    </span>
                  )}
                  {item.hasDraft && (
                    <span className="ghb-meta-inline is-accent">
                      <FilePenLine size={12} aria-label={t("draft")} />
                    </span>
                  )}
                  {item.followUpAt && (
                    <span className="ghb-meta-inline">
                      <CalendarClock size={12} />
                      {item.followUpAt}
                    </span>
                  )}
                </footer>
              </button>
            ))}

            {!items.length && (
              <p className="ghb-empty">
                {list.isFetching ? t("loading") : t("empty")}
              </p>
            )}
          </div>

          <div className="ghb-page-info">
            <span aria-live="polite">
              {list.isFetching
                ? t("loading")
                : isTriageTab
                  ? `${items.length} ${t("loaded")} · ${
                      list.data?.totalCount ?? 0
                    } ${t("totalMatched")}`
                  : `${items.length} ${t("boardItems")}`}
            </span>
            {isTriageTab && (
              <nav className="ghb-pager">
                <button
                  aria-label={t("previous")}
                  disabled={page <= 1 || list.isFetching}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setSelected(null);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{page}</span>
                <button
                  aria-label={t("next")}
                  disabled={!list.data?.hasNextPage || list.isFetching}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setSelected(null);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        </section>

        {selected && account ? (
          <aside className="ghb-detail" aria-label={t("detailView")}>
            <div className="ghb-detail-top">
              <span title={selected}>{selected}</span>
              <button
                aria-label={t("close")}
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <ItemEditor
              key={`${account}:${selected}`}
              gh={gh}
              account={account}
              id={selected}
            />
          </aside>
        ) : (
          <section className="ghb-reader-empty">
            <BookMarked size={28} />
            <p>{t("openHint")}</p>
          </section>
        )}
      </div>
    </main>
  );
}
