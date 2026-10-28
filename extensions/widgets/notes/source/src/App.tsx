import { useState, useMemo } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import {
  Pin,
  Trash2,
  Edit2,
  Plus,
  Search,
  X,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import {
  type Note,
  type NoteColor,
  type Edit,
  NOTE_COLORS,
  readNotes,
} from "./types";
import { edit } from "./api";
import { t, errorText } from "./text";
import "./style.css";

function NoteEmblemIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="24" fill="#F59E0B" />
      <path d="M30 26 H98 V74 L74 98 H30 Z" fill="#FEF3C7" opacity="0.95" />
      <path d="M74 74 H98 L74 98 Z" fill="#FDE68A" />
      <rect x="42" y="42" width="44" height="6" rx="3" fill="#D97706" />
      <rect x="42" y="56" width="34" height="6" rx="3" fill="#F59E0B" />
      <rect x="42" y="70" width="24" height="6" rx="3" fill="#F59E0B" />
      <circle cx="64" cy="22" r="5" fill="#DC2626" />
      <circle cx="64" cy="22" r="2.5" fill="#EF4444" />
    </svg>
  );
}

export default function App() {
  useWidgetLocale();
  const storage = useStorage();

  const [search, setSearch] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftColor, setDraftColor] = useState<NoteColor>("yellow");
  const [draftPinned, setDraftPinned] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  let notes: Note[] = [];
  let invalid: unknown = null;
  try {
    notes = readNotes(storage.data?.data?.notes ?? []);
  } catch (e) {
    invalid = e;
  }

  const unavailable = busy || storage.isPending || !!storage.error || !!invalid;
  const failure = error || storage.error || invalid;

  async function submit(op: Edit) {
    if (unavailable) return;
    setBusy(true);
    setError(null);
    try {
      await edit(op);
      if (op.action === "add") {
        setDraftContent("");
        setDraftPinned(false);
        setIsComposerFocused(false);
      } else if (op.action === "update") {
        setEditingNote(null);
      }
    } catch (err) {
      setError(err);
      await storage.refetch();
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    const content = draftContent.trim();
    if (!content) return;
    void submit({
      action: "add",
      notes: [
        {
          content,
          color: draftColor,
          pinned: draftPinned,
        },
      ],
    });
  }

  function handleUpdate() {
    if (!editingNote || !editingNote.content.trim()) return;
    void submit({
      action: "update",
      updates: [
        {
          id: editingNote.id,
          content: editingNote.content.trim(),
          color: editingNote.color,
          pinned: editingNote.pinned,
        },
      ],
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  }

  function handleDragLeave(e: React.DragEvent, id: string) {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData("text/plain");
    setDragOverId(null);
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = notes.findIndex((n) => n.id === sourceId);
    const targetIdx = notes.findIndex((n) => n.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const sourceNote = notes[sourceIdx];
    const targetNote = notes[targetIdx];
    if (sourceNote.pinned !== targetNote.pinned) return;

    const updated = [...notes];
    const [moved] = updated.splice(sourceIdx, 1);
    const newTargetIdx = updated.findIndex((n) => n.id === targetId);
    if (newTargetIdx === -1) return;
    updated.splice(targetIdx > sourceIdx ? newTargetIdx + 1 : newTargetIdx, 0, moved);

    void submit({
      action: "reorder",
      orderedIds: updated.map((n) => n.id),
    });
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes],
  );
  const unpinnedNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes],
  );

  function formatTime(timestamp: number) {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="nt-app">
      {/* 头部标题与统计（与看板像素级统一） */}
      <header className="nt-header">
        <div className="nt-heading">
          <div className="nt-emblem" aria-hidden="true">
            <NoteEmblemIcon size={40} />
          </div>
          <div>
            <h1>{t("appTitle")}</h1>
          </div>
        </div>

        <div className="nt-header-actions">
          <span className="nt-total-badge">
            {t("totalNotes", { count: notes.length })}
          </span>
          {notes.length > 0 && (
            <div className="nt-search-box">
              <Search size={14} className="nt-search-icon" />
              <input
                type="text"
                className="nt-search-input"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {notes.length > 0 && (
            <button
              type="button"
              className="nt-clear-btn"
              disabled={unavailable}
              onClick={() => {
                if (window.confirm(t("clearConfirm"))) {
                  void submit({ action: "clear" });
                }
              }}
              aria-label={t("clearAll")}
            >
              <RotateCcw size={12} />
              <span>{t("clearAll")}</span>
            </button>
          )}
        </div>
      </header>

      {/* 错误提示 - 显式布尔判断避免 React 渲染 unknown */}
      {!!failure && (
        <div className="nt-error-banner" role="alert">
          <span>{errorText(failure)}</span>
          <button
            type="button"
            className="nt-icon-btn is-danger"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 新建便签卡片（无标题） */}
      <div className={`nt-composer ${isComposerFocused ? "is-focused" : ""}`}>
        <textarea
          className="nt-composer-content"
          placeholder={t("addPlaceholder")}
          value={draftContent}
          rows={isComposerFocused ? 3 : 1}
          disabled={unavailable}
          onFocus={() => setIsComposerFocused(true)}
          onChange={(e) => setDraftContent(e.target.value)}
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === "Enter" &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        {isComposerFocused && (
          <div className="nt-composer-footer">
            <div className="nt-color-picker" aria-label="Color Picker">
              {NOTE_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`nt-color-dot color-${col} ${
                    draftColor === col ? "is-active" : ""
                  }`}
                  onClick={() => setDraftColor(col)}
                  aria-label={col}
                />
              ))}
            </div>

            <div className="nt-composer-actions">
              <button
                type="button"
                className={`nt-pin-toggle-btn ${draftPinned ? "is-pinned" : ""}`}
                onClick={() => setDraftPinned(!draftPinned)}
                aria-label={draftPinned ? t("unpin") : t("pin")}
                title={draftPinned ? t("unpin") : t("pin")}
              >
                <Pin size={15} />
              </button>
              <button
                type="button"
                className="nt-submit-btn"
                disabled={unavailable || !draftContent.trim()}
                onClick={handleAdd}
              >
                <Plus size={16} />
                <span>{t("addBtn")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 加载中或空状态 */}
      {storage.isPending ? (
        <div className="nt-empty-state">
          <p className="nt-empty-text">Loading...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="nt-empty-state">
          <NoteEmblemIcon size={48} />
          <p className="nt-empty-text">{t("emptyNotes")}</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="nt-empty-state">
          <Search size={32} className="nt-empty-icon" />
          <p className="nt-empty-text">{t("emptySearch")}</p>
        </div>
      ) : (
        <>
          {/* 置顶便签区域 */}
          {pinnedNotes.length > 0 && (
            <section>
              <div className="nt-section-title">
                <Pin size={13} />
                <span>{t("pinnedSection")}</span>
              </div>
              <div className="nt-grid">
                {pinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </section>
          )}

          {/* 其余便签区域 */}
          {unpinnedNotes.length > 0 && (
            <section>
              {pinnedNotes.length > 0 && (
                <div className="nt-section-title">
                  <span>{t("otherSection")}</span>
                </div>
              )}
              <div className="nt-grid">
                {unpinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );

  function renderNoteCard(note: Note) {
    const isEditing = editingNote?.id === note.id;

    return (
      <article
        key={note.id}
        className={`nt-card color-${isEditing ? editingNote.color : note.color} ${
          isEditing ? "is-editing" : ""
        } ${draggedId === note.id ? "is-dragging" : ""} ${
          dragOverId === note.id ? "is-drag-over" : ""
        }`}
        data-note-id={note.id}
        draggable={!isEditing && !unavailable}
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragOver={(e) => handleDragOver(e, note.id)}
        onDragLeave={(e) => handleDragLeave(e, note.id)}
        onDrop={(e) => handleDrop(e, note.id)}
        onDragEnd={handleDragEnd}
      >
        {isEditing ? (
          <div className="nt-card-edit-form">
            <textarea
              className="nt-card-edit-content"
              placeholder={t("addPlaceholder")}
              value={editingNote.content}
              disabled={unavailable}
              autoFocus
              onChange={(e) =>
                setEditingNote({ ...editingNote, content: e.target.value })
              }
              onKeyDown={(e) => {
                if (
                  (e.metaKey || e.ctrlKey) &&
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  handleUpdate();
                } else if (e.key === "Escape") {
                  setEditingNote(null);
                }
              }}
            />

            <div className="nt-color-picker" style={{ marginTop: 4 }}>
              {NOTE_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`nt-color-dot color-${col} ${
                    editingNote.color === col ? "is-active" : ""
                  }`}
                  onClick={() => setEditingNote({ ...editingNote, color: col })}
                  aria-label={col}
                />
              ))}
            </div>

            <div className="nt-card-edit-actions">
              <button
                type="button"
                className="nt-btn-cancel"
                onClick={() => setEditingNote(null)}
              >
                {t("cancelBtn")}
              </button>
              <button
                type="button"
                className="nt-btn-save"
                disabled={unavailable || !editingNote.content.trim()}
                onClick={handleUpdate}
              >
                {t("editBtn")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="nt-card-top-bar">
              <div className="nt-drag-handle" title="拖拽排序">
                <GripVertical size={14} />
              </div>
              {note.pinned && (
                <div className="nt-card-pin-badge" title={t("pinnedSection")}>
                  <Pin size={11} />
                </div>
              )}
            </div>

            <div className="nt-card-body">{note.content}</div>

            <div className="nt-card-footer">
              <span className="nt-card-time">{formatTime(note.updatedAt)}</span>
              <div className="nt-card-actions">
                <button
                  type="button"
                  className="nt-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    void submit({ action: "toggle_pin", id: note.id });
                  }}
                  title={note.pinned ? t("unpin") : t("pin")}
                  aria-label={note.pinned ? t("unpin") : t("pin")}
                >
                  <Pin size={13} />
                </button>
                <button
                  type="button"
                  className="nt-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingNote({ ...note });
                  }}
                  title={t("edit")}
                  aria-label={t("edit")}
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  className="nt-icon-btn is-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    void submit({ action: "delete", ids: [note.id] });
                  }}
                  title={t("delete")}
                  aria-label={t("delete")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </article>
    );
  }
}
