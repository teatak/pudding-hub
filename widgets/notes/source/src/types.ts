import { t } from "./text";

export type NoteColor = "yellow" | "pink" | "green" | "blue" | "purple";

export const NOTE_COLORS: readonly NoteColor[] = [
  "yellow",
  "pink",
  "green",
  "blue",
  "purple",
] as const;

export type Note = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Edit =
  | {
      action: "add";
      notes: Array<{
        title?: string;
        content: string;
        color?: NoteColor;
        pinned?: boolean;
      }>;
    }
  | {
      action: "update";
      updates: Array<{
        id: string;
        title?: string;
        content?: string;
        color?: NoteColor;
        pinned?: boolean;
      }>;
    }
  | {
      action: "toggle_pin";
      id: string;
    }
  | {
      action: "delete";
      ids: string[];
    }
  | {
      action: "clear";
    };

export function readNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const valid: Note[] = [];
  const now = Date.now();

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!id || !content) continue;

    const title = typeof r.title === "string" ? r.title.trim().slice(0, 100) : "";
    const color = NOTE_COLORS.includes(r.color as NoteColor)
      ? (r.color as NoteColor)
      : "yellow";
    const pinned = Boolean(r.pinned);
    const createdAt = typeof r.createdAt === "number" ? r.createdAt : now;
    const updatedAt = typeof r.updatedAt === "number" ? r.updatedAt : createdAt;

    valid.push({
      id,
      title,
      content,
      color,
      pinned,
      createdAt,
      updatedAt,
    });
  }

  // 排序：置顶优先，其次按 updatedAt 降序
  return sortNotes(valid);
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function editNotes(
  current: Note[],
  edit: Edit,
): {
  notes: Note[];
  changed: Note[];
  deletedIDs: string[];
} {
  const map = new Map<string, Note>(current.map((n) => [n.id, { ...n }]));
  const changed: Note[] = [];
  const deletedIDs: string[] = [];
  const now = Date.now();

  switch (edit.action) {
    case "add": {
      for (const item of edit.notes) {
        const content = item.content.trim();
        if (!content) continue;
        const id = `note_${now}_${Math.random().toString(36).slice(2, 8)}`;
        const note: Note = {
          id,
          title: (item.title ?? "").trim().slice(0, 100),
          content: content.slice(0, 2000),
          color: item.color && NOTE_COLORS.includes(item.color) ? item.color : "yellow",
          pinned: Boolean(item.pinned),
          createdAt: now,
          updatedAt: now,
        };
        map.set(id, note);
        changed.push(note);
      }
      break;
    }
    case "update": {
      for (const item of edit.updates) {
        const existing = map.get(item.id);
        if (!existing) continue;
        let modified = false;

        if (item.title !== undefined) {
          existing.title = item.title.trim().slice(0, 100);
          modified = true;
        }
        if (item.content !== undefined) {
          const content = item.content.trim();
          if (content) {
            existing.content = content.slice(0, 2000);
            modified = true;
          }
        }
        if (item.color !== undefined && NOTE_COLORS.includes(item.color)) {
          existing.color = item.color;
          modified = true;
        }
        if (item.pinned !== undefined) {
          existing.pinned = Boolean(item.pinned);
          modified = true;
        }

        if (modified) {
          existing.updatedAt = now;
          changed.push(existing);
        }
      }
      break;
    }
    case "toggle_pin": {
      const existing = map.get(edit.id);
      if (existing) {
        existing.pinned = !existing.pinned;
        existing.updatedAt = now;
        changed.push(existing);
      }
      break;
    }
    case "delete": {
      for (const id of edit.ids) {
        if (map.delete(id)) {
          deletedIDs.push(id);
        }
      }
      break;
    }
    case "clear": {
      for (const id of map.keys()) {
        deletedIDs.push(id);
      }
      map.clear();
      break;
    }
  }

  const finalNotes = sortNotes(Array.from(map.values()));
  return {
    notes: finalNotes,
    changed,
    deletedIDs,
  };
}
