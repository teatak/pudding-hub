import { useState } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import {
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

function BoardIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor" opacity="0.35">
        <rect x="22" y="24" width="24" height="80" rx="4" />
        <rect x="52" y="24" width="24" height="80" rx="4" />
        <rect x="82" y="24" width="24" height="80" rx="4" />
      </g>
      <g fill="currentColor">
        <rect x="25" y="28" width="18" height="22" rx="3" />
        <rect x="25" y="56" width="18" height="30" rx="3" />
        <rect x="55" y="28" width="18" height="36" rx="3" />
        <rect x="85" y="28" width="18" height="20" rx="3" />
        <rect x="85" y="54" width="18" height="20" rx="3" />
        <rect x="85" y="80" width="18" height="18" rx="3" />
      </g>
    </svg>
  );
}

export default function App() {
  useWidgetLocale();
  const storage = useStorage();

  const [addDrafts, setAddDrafts] = useState<
    Record<ColumnId, { title: string; description: string; showDesc?: boolean }>
  >({
    todo: { title: "", description: "" },
    in_progress: { title: "", description: "" },
    done: { title: "", description: "" },
  });
  const [editingCard, setEditingCard] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
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
    try {
      await edit(value);
      if (value.action === "add") {
        const col = value.cards[0]?.column ?? "todo";
        setAddDrafts((prev) => ({
          ...prev,
          [col]: { title: "", description: "", showDesc: false },
        }));
      } else if (value.action === "update") {
        setEditingCard(null);
      }
    } catch (e) {
      setError(e);
      await storage.refetch();
    } finally {
      setBusy(false);
    }
  }

  function handleAdd(column: ColumnId) {
    const draft = addDrafts[column];
    const rawTitle = draft?.title?.trim();
    if (!rawTitle) return;
    const rawDesc = draft?.description?.trim();
    void submit({
      action: "add",
      cards: [
        {
          title: rawTitle,
          column,
          ...(rawDesc ? { description: rawDesc } : {}),
        },
      ],
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
            <BoardIcon size={24} />
          </div>
          <div>
            <h1>{t("title")}</h1>
          </div>
        </div>
        <div className="kb-total-badge">
          {t("cardCount", { count: totals.total })}
        </div>
      </header>

      {!!failure && (
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
                <div className="kb-add-form">
                  <input
                    type="text"
                    className="kb-add-input"
                    placeholder={t("addCardPlaceholder")}
                    value={addDrafts[col].title}
                    disabled={unavailable}
                    onChange={(e) =>
                      setAddDrafts((prev) => ({
                        ...prev,
                        [col]: { ...prev[col], title: e.target.value },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleAdd(col);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="kb-add-btn"
                    disabled={unavailable || !addDrafts[col].title.trim()}
                    onClick={() => handleAdd(col)}
                    aria-label={t("addCard")}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {(addDrafts[col].showDesc || !!addDrafts[col].title.trim()) && (
                  <textarea
                    className="kb-add-desc"
                    placeholder={t("addDescPlaceholder")}
                    rows={2}
                    value={addDrafts[col].description}
                    disabled={unavailable}
                    onChange={(e) =>
                      setAddDrafts((prev) => ({
                        ...prev,
                        [col]: { ...prev[col], description: e.target.value },
                      }))
                    }
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleAdd(col);
                      }
                    }}
                  />
                )}
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
                              placeholder={t("addCardPlaceholder")}
                              value={editingCard.title}
                              autoFocus
                              disabled={unavailable}
                              onChange={(e) =>
                                setEditingCard({ ...editingCard, title: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setEditingCard(null);
                                } else if (
                                  e.key === "Enter" &&
                                  !e.shiftKey &&
                                  !e.nativeEvent.isComposing
                                ) {
                                  e.preventDefault();
                                  if (editingCard.title.trim()) {
                                    void submit({
                                      action: "update",
                                      updates: [
                                        {
                                          id: card.id,
                                          title: editingCard.title.trim(),
                                          description: editingCard.description.trim(),
                                        },
                                      ],
                                    });
                                  }
                                }
                              }}
                            />
                            <textarea
                              className="kb-card-edit-desc"
                              placeholder={t("addDescPlaceholder")}
                              rows={3}
                              value={editingCard.description}
                              disabled={unavailable}
                              onChange={(e) =>
                                setEditingCard({
                                  ...editingCard,
                                  description: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setEditingCard(null);
                                } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                  e.preventDefault();
                                  if (editingCard.title.trim()) {
                                    void submit({
                                      action: "update",
                                      updates: [
                                        {
                                          id: card.id,
                                          title: editingCard.title.trim(),
                                          description: editingCard.description.trim(),
                                        },
                                      ],
                                    });
                                  }
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
                                        {
                                          id: card.id,
                                          title: editingCard.title.trim(),
                                          description: editingCard.description.trim(),
                                        },
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
                                    setEditingCard({
                                      id: card.id,
                                      title: card.title,
                                      description: card.description ?? "",
                                    })
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
