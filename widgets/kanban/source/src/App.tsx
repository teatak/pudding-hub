import { useState } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import {
  Kanban as KanbanIcon,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { edit } from "./api";
import {
  counts,
  readCards,
  COLUMNS,
  type Card,
  type ColumnId,
  type Edit,
} from "./types";
import { t, errorText, type TextKey } from "./text";
import "./style.css";

export default function App() {
  useWidgetLocale();
  const storage = useStorage();

  const [addDrafts, setAddDrafts] = useState<Record<ColumnId, string>>({
    todo: "",
    in_progress: "",
    done: "",
  });
  const [editingCard, setEditingCard] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<TextKey | null>(null);
  const [busy, setBusy] = useState(false);

  let cards: Card[] = [];
  let invalid: unknown = null;
  try {
    cards = readCards(storage.data?.data?.cards ?? []);
  } catch (e) {
    invalid = e;
  }

  const totals = counts(cards);
  const unavailable = busy || storage.isPending || !!storage.error || !!invalid;
  const failure = error || storage.error || invalid;

  async function submit(value: Edit) {
    if (unavailable) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await edit(value);
      if (value.action === "add") {
        setAddDrafts((prev) => ({
          ...prev,
          [value.cards[0]?.column ?? "todo"]: "",
        }));
        setNotice("added");
      } else if (value.action === "update") {
        setEditingCard(null);
        setNotice("saved");
      } else if (value.action === "move") {
        setNotice("moved");
      } else if (value.action === "delete") {
        setNotice("deleted");
      } else if (value.action === "clear_completed") {
        setNotice("clearedCompleted");
      }
    } catch (e) {
      setError(e);
      await storage.refetch();
    } finally {
      setBusy(false);
    }
  }

  function handleAdd(column: ColumnId) {
    const raw = addDrafts[column]?.trim();
    if (!raw) return;
    void submit({
      action: "add",
      cards: [{ title: raw, column }],
    });
  }

  function handleMove(card: Card, direction: "prev" | "next") {
    const targetCol: ColumnId =
      direction === "prev"
        ? card.column === "done"
          ? "in_progress"
          : "todo"
        : card.column === "todo"
          ? "in_progress"
          : "done";

    void submit({
      action: "move",
      id: card.id,
      toColumn: targetCol,
    });
  }

  const columnTitles: Record<ColumnId, TextKey> = {
    todo: "todo",
    in_progress: "inProgress",
    done: "done",
  };

  return (
    <div className="kb-app">
      {/* Header */}
      <header className="kb-header">
        <div className="kb-heading">
          <div className="kb-emblem">
            <KanbanIcon size={22} />
          </div>
          <div>
            <h1>{t("title")}</h1>
          </div>
        </div>
        <div className="kb-total-badge">
          {t("cardCount", { count: totals.total })}
        </div>
      </header>

      {/* Notice / Feedback */}
      {notice && (
        <div className="kb-notice" role="status">
          <span>{t(notice)}</span>
          <button
            type="button"
            className="kb-icon-btn"
            onClick={() => setNotice(null)}
            aria-label={t("cancel")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error alert */}
      {failure && (
        <div className="kb-error" role="alert">
          <span>{errorText(failure)}</span>
          <button
            type="button"
            className="kb-icon-btn is-danger"
            onClick={() => {
              setError(null);
              void storage.refetch();
            }}
            aria-label={t("retry")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Board Columns */}
      <div className="kb-board">
        {COLUMNS.map((col) => {
          const colCards = cards.filter((c) => c.column === col);
          const isDone = col === "done";

          return (
            <div key={col} className="kb-column" data-column={col}>
              {/* Column Header */}
              <div className="kb-column-header">
                <div className="kb-column-title-group">
                  <h2 className="kb-column-title">{t(columnTitles[col])}</h2>
                  <span className="kb-column-badge">{totals[col]}</span>
                </div>
                {isDone && totals.done > 0 && (
                  <button
                    type="button"
                    className="kb-clear-btn"
                    disabled={unavailable}
                    onClick={() => {
                      if (window.confirm(t("clearCompletedConfirm"))) {
                        void submit({ action: "clear_completed" });
                      }
                    }}
                    title={t("clearCompleted")}
                  >
                    <CheckCheck size={12} />
                    <span>{t("clearCompleted")}</span>
                  </button>
                )}
              </div>

              {/* Add Card in Column */}
              <div className="kb-column-add">
                <form
                  className="kb-add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdd(col);
                  }}
                >
                  <input
                    type="text"
                    className="kb-add-input"
                    placeholder={t("addCardPlaceholder")}
                    value={addDrafts[col]}
                    disabled={unavailable}
                    onChange={(e) =>
                      setAddDrafts((prev) => ({ ...prev, [col]: e.target.value }))
                    }
                  />
                  <button
                    type="submit"
                    className="kb-add-btn"
                    disabled={unavailable || !addDrafts[col]?.trim()}
                    aria-label={t("addCard")}
                  >
                    <Plus size={16} />
                  </button>
                </form>
              </div>

              {/* Cards List */}
              <ul className="kb-cards-list">
                {colCards.length === 0 ? (
                  <li className="kb-empty">{t("emptyColumn")}</li>
                ) : (
                  colCards.map((card) => {
                    const isEditing = editingCard?.id === card.id;

                    return (
                      <li key={card.id} className="kb-card" data-card-id={card.id}>
                        {isEditing ? (
                          <div className="kb-card-edit-form">
                            <input
                              type="text"
                              className="kb-card-edit-input"
                              value={editingCard.title}
                              autoFocus
                              onChange={(e) =>
                                setEditingCard({ ...editingCard, title: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (editingCard.title.trim()) {
                                    void submit({
                                      action: "update",
                                      updates: [
                                        { id: card.id, title: editingCard.title.trim() },
                                      ],
                                    });
                                  }
                                } else if (e.key === "Escape") {
                                  setEditingCard(null);
                                }
                              }}
                            />
                            <div className="kb-card-edit-actions">
                              <button
                                type="button"
                                className="kb-btn-cancel"
                                onClick={() => setEditingCard(null)}
                              >
                                {t("cancel")}
                              </button>
                              <button
                                type="button"
                                className="kb-btn-save"
                                disabled={!editingCard.title.trim()}
                                onClick={() => {
                                  if (editingCard.title.trim()) {
                                    void submit({
                                      action: "update",
                                      updates: [
                                        { id: card.id, title: editingCard.title.trim() },
                                      ],
                                    });
                                  }
                                }}
                              >
                                {t("save")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="kb-card-main">
                              <span className="kb-card-title">{card.title}</span>
                              {card.description && (
                                <span className="kb-card-desc">
                                  {card.description}
                                </span>
                              )}
                            </div>

                            <div className="kb-card-footer">
                              <div className="kb-card-nav">
                                {col !== "todo" && (
                                  <button
                                    type="button"
                                    className="kb-icon-btn"
                                    disabled={unavailable}
                                    onClick={() => handleMove(card, "prev")}
                                    title={t("moveLeft")}
                                  >
                                    <ChevronLeft size={14} />
                                  </button>
                                )}
                                {col !== "done" && (
                                  <button
                                    type="button"
                                    className="kb-icon-btn"
                                    disabled={unavailable}
                                    onClick={() => handleMove(card, "next")}
                                    title={t("moveRight")}
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                )}
                              </div>

                              <div className="kb-card-nav">
                                <button
                                  type="button"
                                  className="kb-icon-btn"
                                  disabled={unavailable}
                                  onClick={() =>
                                    setEditingCard({ id: card.id, title: card.title })
                                  }
                                  title={t("edit")}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="kb-icon-btn is-danger"
                                  disabled={unavailable}
                                  onClick={() =>
                                    void submit({
                                      action: "delete",
                                      ids: [card.id],
                                    })
                                  }
                                  title={t("delete")}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
