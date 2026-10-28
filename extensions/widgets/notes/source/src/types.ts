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
        content: string;
        color?: NoteColor;
        pinned?: boolean;
      }>;
    }
  | {
      action: "update";
      updates: Array<{
        id: string;
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
      action: "reorder";
      orderedIds: string[];
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

    const color = NOTE_COLORS.includes(r.color as NoteColor)
      ? (r.color as NoteColor)
      : "yellow";
    const pinned = Boolean(r.pinned);
    const createdAt = typeof r.createdAt === "number" ? r.createdAt : now;
    const updatedAt = typeof r.updatedAt === "number" ? r.updatedAt : createdAt;

    valid.push({
      id,
      content,
      color,
      pinned,
      createdAt,
      updatedAt,
    });
  }

  // 保持置顶在前，同时尊重存储的顺序
  return groupPinnedFirst(valid);
}

export function groupPinnedFirst(notes: Note[]): Note[] {
  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);
  return [...pinned, ...unpinned];
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
  let resultList = [...current];

  switch (edit.action) {
    case "add": {
      const added: Note[] = [];
      for (const item of edit.notes) {
        const content = item.content.trim();
        if (!content) continue;
        const id = `note_${now}_${Math.random().toString(36).slice(2, 8)}`;
        const note: Note = {
          id,
          content: content.slice(0, 2000),
          color: item.color && NOTE_COLORS.includes(item.color) ? item.color : "yellow",
          pinned: Boolean(item.pinned),
          createdAt: now,
          updatedAt: now,
        };
        map.set(id, note);
        changed.push(note);
        added.push(note);
      }
      // 新添加的便签插入在前面
      resultList = [...added, ...resultList];
      break;
    }
    case "update": {
      for (const item of edit.updates) {
        const existing = map.get(item.id);
        if (!existing) continue;
        let modified = false;

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
      resultList = resultList.map((n) => map.get(n.id) ?? n);
      break;
    }
    case "toggle_pin": {
      const existing = map.get(edit.id);
      if (existing) {
        existing.pinned = !existing.pinned;
        existing.updatedAt = now;
        changed.push(existing);
        resultList = resultList.map((n) => (n.id === edit.id ? existing : n));
      }
      break;
    }
    case "reorder": {
      const newOrdered: Note[] = [];
      const seen = new Set<string>();
      for (const id of edit.orderedIds) {
        const n = map.get(id);
        if (n && !seen.has(id)) {
          newOrdered.push(n);
          seen.add(id);
        }
      }
      // 如果有遗漏项追加到最后
      for (const n of resultList) {
        if (!seen.has(n.id)) {
          newOrdered.push(n);
          seen.add(n.id);
        }
      }
      resultList = newOrdered;
      break;
    }
    case "delete": {
      const toDelete = new Set(edit.ids);
      for (const id of edit.ids) {
        if (map.delete(id)) {
          deletedIDs.push(id);
        }
      }
      resultList = resultList.filter((n) => !toDelete.has(n.id));
      break;
    }
    case "clear": {
      for (const id of map.keys()) {
        deletedIDs.push(id);
      }
      map.clear();
      resultList = [];
      break;
    }
  }

  return {
    notes: groupPinnedFirst(resultList),
    changed,
    deletedIDs,
  };
}
