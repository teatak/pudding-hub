import { useState } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { edit } from "./api";
import {
  counts,
  readTasks,
  selectTasks,
  type Edit,
  type Status,
  type Task,
} from "./tasks";
import { t, errorText, type TextKey } from "./text";
import "./style.css";

export default function App() {
  useWidgetLocale();
  const storage = useStorage();
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<TextKey | null>(null);
  const [busy, setBusy] = useState(false);
  let tasks: Task[] = [],
    invalid: unknown = null;
  try {
    tasks = readTasks(storage.data?.data.tasks ?? []);
  } catch (e) {
    invalid = e;
  }
  const totals = counts(tasks),
    unavailable = busy || storage.isPending || !!storage.error || !!invalid;
  const failure = error || storage.error || invalid;
  const active = selectTasks(tasks, "active"),
    completed = selectTasks(tasks, "completed");
  async function submit(value: Edit) {
    if (unavailable) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await edit(value);
      if (value.action === "add") setTitle("");
      if (value.action === "update") setEditing(null);
      setNotice(
        value.action === "add"
          ? "added"
          : value.action === "delete"
            ? "removed"
            : "saved",
      );
    } catch (e) {
      setError(e);
      await storage.refetch();
    } finally {
      setBusy(false);
    }
  }
  function row(task: Task) {
    const draft = editing?.id === task.id ? editing : null;
    return (
      <li
        key={task.id}
        data-task-id={task.id}
        className={task.done ? "td-row is-done" : "td-row"}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          className="td-check"
          data-complete
          aria-label={t(task.done ? "reopen" : "complete", {
            title: task.title,
          })}
          disabled={unavailable}
          onClick={() =>
            void submit({
              action: "update",
              updates: [{ id: task.id, done: !task.done }],
            })
          }
        >
          {task.done && <Check size={14} />}
        </button>
        {draft ? (
          <div className="td-edit">
            <input
              autoFocus
              data-edit-title
              aria-label={t("editTitle")}
              maxLength={300}
              value={draft.title}
              onChange={(e) => setEditing({ ...draft, title: e.target.value })}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(null);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draft.title.trim())
                    void submit({ action: "update", updates: [draft] });
                }
              }}
            />
            <button
              type="button"
              className="td-icon"
              data-save
              title={t("save")}
              aria-label={t("save")}
              disabled={unavailable || !draft.title.trim()}
              onClick={() =>
                void submit({ action: "update", updates: [draft] })
              }
            >
              <Check size={17} />
            </button>
            <button
              type="button"
              className="td-icon"
              title={t("cancel")}
              aria-label={t("cancel")}
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              <X size={17} />
            </button>
          </div>
        ) : (
          <>
            <span className="td-task-title">{task.title}</span>
            <div className="td-row-actions">
              <button
                type="button"
                className="td-icon"
                data-edit
                title={t("edit", { title: task.title })}
                aria-label={t("edit", { title: task.title })}
                disabled={unavailable}
                onClick={() => {
                  setEditing({ id: task.id, title: task.title });
                  setNotice(null);
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="td-icon td-delete"
                data-delete
                title={t("remove", { title: task.title })}
                aria-label={t("remove", { title: task.title })}
                disabled={unavailable}
                onClick={() =>
                  void submit({ action: "delete", ids: [task.id] })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </li>
    );
  }
  const visible = selectTasks(tasks, filter);
  return (
    <main className="td-app">
      <header className="td-header">
        <div className="td-heading">
          <span className="td-emblem">
            <ListTodo size={22} />
          </span>
          <h1>{t("title")}</h1>
        </div>
        {!storage.isPending && !failure && (
          <span className="td-count" data-remaining>
            {t("remaining", { count: totals.active })}
          </span>
        )}
      </header>
      <form className="td-add" onSubmit={(e) => e.preventDefault()}>
        <input
          id="new-task"
          aria-label={t("editTitle")}
          placeholder={t("placeholder")}
          value={title}
          maxLength={300}
          disabled={unavailable}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (title.trim()) void submit({ action: "add", titles: [title] });
            }
          }}
        />
        <button
          type="button"
          className="td-primary"
          disabled={unavailable || !title.trim()}
          onClick={() => void submit({ action: "add", titles: [title] })}
        >
          <Plus size={17} />
          <span>{t("add")}</span>
        </button>
      </form>
      <div className="td-toolbar">
        <div className="td-filters" role="group" aria-label={t("filters")}>
          {(["all", "active", "completed"] as const).map((status) => (
            <button
              type="button"
              key={status}
              data-filter={status}
              aria-pressed={filter === status}
              onClick={() => {
                setFilter(status);
                setEditing(null);
              }}
            >
              {t(status)}
              <span>{status === "all" ? totals.total : totals[status]}</span>
            </button>
          ))}
        </div>
      </div>
      {storage.isPending && (
        <p className="td-loading" role="status">
          {t("loading")}
        </p>
      )}
      {failure ? (
        <div className="td-error" role="alert">
          <span>{errorText(failure)}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              void storage.refetch();
            }}
          >
            {t("retry")}
          </button>
          {error && !storage.error && !invalid ? (
            <button
              type="button"
              className="td-icon"
              aria-label={t("dismiss")}
              onClick={() => setError(null)}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
      {!storage.isPending && !invalid && !storage.error && (
        <>
          <ul className="td-list">
            {(filter === "all" ? active : visible).map(row)}
          </ul>
          {filter === "all" && completed.length > 0 && (
            <section className="td-completed">
              <button
                type="button"
                className="td-disclosure"
                id="completed-toggle"
                aria-expanded={expanded}
                aria-controls="completed-list"
                onClick={() => {
                  setExpanded(!expanded);
                  setEditing(null);
                }}
              >
                {expanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                {t("completed")}
                <span>{completed.length}</span>
              </button>
              {expanded && (
                <ul className="td-list" id="completed-list">
                  {completed.map(row)}
                </ul>
              )}
            </section>
          )}
          {!visible.length && (
            <div className="td-empty">
              <CheckCheck size={32} />
              <strong>
                {t(
                  !tasks.length
                    ? "emptyTitle"
                    : filter === "completed"
                      ? "completedEmpty"
                      : "activeEmpty",
                )}
              </strong>
              <p>
                {t(
                  !tasks.length
                    ? "emptyHint"
                    : filter === "completed"
                      ? "completedHint"
                      : "activeHint",
                )}
              </p>
            </div>
          )}
        </>
      )}
      <p className="td-feedback" role="status" aria-live="polite">
        {notice ? t(notice) : ""}
      </p>
    </main>
  );
}
