import { t } from "./text";

export type ColumnId = "todo" | "in_progress" | "done";

export const COLUMNS: readonly ColumnId[] = ["todo", "in_progress", "done"] as const;

export type Card = {
  id: string;
  title: string;
  column: ColumnId;
  description?: string;
  createdAt?: number;
};

export type Edit =
  | {
      action: "add";
      cards: Array<{
        title: string;
        column?: ColumnId;
        description?: string;
      }>;
    }
  | {
      action: "move";
      id: string;
      toColumn: ColumnId;
      targetIndex?: number;
    }
  | {
      action: "update";
      updates: Array<{
        id: string;
        title?: string;
        column?: ColumnId;
        description?: string;
      }>;
    }
  | {
      action: "delete";
      ids: string[];
    }
  | {
      action: "clear_completed";
    };

export function readCards(raw: unknown): Card[] {
  if (!Array.isArray(raw)) return [];
  const valid: Card[] = [];
  for (const item of raw) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      COLUMNS.includes(item.column)
    ) {
      valid.push({
        id: item.id,
        title: item.title,
        column: item.column,
        ...(typeof item.description === "string" ? { description: item.description } : {}),
        ...(typeof item.createdAt === "number" ? { createdAt: item.createdAt } : {}),
      });
    }
  }
  return valid;
}

export function counts(cards: Card[]): Record<ColumnId, number> & { total: number } {
  const result: Record<ColumnId, number> & { total: number } = {
    todo: 0,
    in_progress: 0,
    done: 0,
    total: cards.length,
  };
  for (const card of cards) {
    if (card.column in result) {
      result[card.column]++;
    }
  }
  return result;
}

function randomId(): string {
  return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function editCards(
  currentCards: Card[],
  edit: Edit,
  createId: () => string = randomId,
): { cards: Card[]; changed: Card[]; deletedIDs: string[] } {
  const cards = [...currentCards];

  if (edit.action === "add") {
    if (!edit.cards || edit.cards.length === 0 || edit.cards.length > 100) {
      throw new Error(t("batchError"));
    }
    const newCards: Card[] = [];
    for (const item of edit.cards) {
      const title = item.title?.trim();
      if (!title || title.length > 300) {
        throw new Error(t("titleError"));
      }
      const col = item.column ?? "todo";
      if (!COLUMNS.includes(col)) {
        throw new Error(t("columnError"));
      }
      const card: Card = {
        id: createId(),
        title,
        column: col,
        ...(item.description?.trim() ? { description: item.description.trim() } : {}),
        createdAt: Date.now(),
      };
      newCards.push(card);
    }
    return {
      cards: [...cards, ...newCards],
      changed: newCards,
      deletedIDs: [],
    };
  }

  if (edit.action === "move") {
    const idx = cards.findIndex((c) => c.id === edit.id);
    if (idx === -1) {
      throw new Error(t("missing"));
    }
    if (!COLUMNS.includes(edit.toColumn)) {
      throw new Error(t("columnError"));
    }
    const target = { ...cards[idx], column: edit.toColumn };
    cards.splice(idx, 1);

    if (typeof edit.targetIndex === "number" && edit.targetIndex >= 0) {
      // Find position within target column
      const colIndices: number[] = [];
      cards.forEach((c, i) => {
        if (c.column === edit.toColumn) colIndices.push(i);
      });
      const insertAt =
        edit.targetIndex < colIndices.length
          ? colIndices[edit.targetIndex]
          : cards.length;
      cards.splice(insertAt, 0, target);
    } else {
      cards.push(target);
    }

    return {
      cards,
      changed: [target],
      deletedIDs: [],
    };
  }

  if (edit.action === "update") {
    if (!edit.updates || edit.updates.length === 0 || edit.updates.length > 100) {
      throw new Error(t("batchError"));
    }
    const seen = new Set<string>();
    const changed: Card[] = [];
    const nextCards = [...cards];

    for (const update of edit.updates) {
      if (seen.has(update.id)) {
        throw new Error(t("duplicate"));
      }
      seen.add(update.id);

      const idx = nextCards.findIndex((c) => c.id === update.id);
      if (idx === -1) {
        throw new Error(t("missing"));
      }
      const original = nextCards[idx];
      let updatedTitle = original.title;
      if (update.title !== undefined) {
        const trimmed = update.title.trim();
        if (!trimmed || trimmed.length > 300) {
          throw new Error(t("titleError"));
        }
        updatedTitle = trimmed;
      }
      let updatedColumn = original.column;
      if (update.column !== undefined) {
        if (!COLUMNS.includes(update.column)) {
          throw new Error(t("columnError"));
        }
        updatedColumn = update.column;
      }
      let updatedDesc = original.description;
      if (update.description !== undefined) {
        updatedDesc = update.description.trim() || undefined;
      }

      if (
        updatedTitle !== original.title ||
        updatedColumn !== original.column ||
        updatedDesc !== original.description
      ) {
        const modified: Card = {
          ...original,
          title: updatedTitle,
          column: updatedColumn,
          ...(updatedDesc !== undefined ? { description: updatedDesc } : {}),
        };
        if (updatedDesc === undefined) {
          delete modified.description;
        }
        nextCards[idx] = modified;
        changed.push(modified);
      }
    }

    return {
      cards: nextCards,
      changed,
      deletedIDs: [],
    };
  }

  if (edit.action === "delete") {
    if (!edit.ids || edit.ids.length === 0 || edit.ids.length > 100) {
      throw new Error(t("batchError"));
    }
    const toDelete = new Set(edit.ids);
    const remaining: Card[] = [];
    const deletedIDs: string[] = [];

    for (const card of cards) {
      if (toDelete.has(card.id)) {
        deletedIDs.push(card.id);
      } else {
        remaining.push(card);
      }
    }

    return {
      cards: remaining,
      changed: [],
      deletedIDs,
    };
  }

  if (edit.action === "clear_completed") {
    const remaining: Card[] = [];
    const deletedIDs: string[] = [];

    for (const card of cards) {
      if (card.column === "done") {
        deletedIDs.push(card.id);
      } else {
        remaining.push(card);
      }
    }

    return {
      cards: remaining,
      changed: [],
      deletedIDs,
    };
  }

  return { cards, changed: [], deletedIDs: [] };
}
