import { pudding } from "@pudding/widget";
import { z } from "zod";
import {
  counts,
  editCards,
  readCards,
  type Card,
  type ColumnId,
  type Edit,
} from "./types";
import { t, errorText } from "./text";

export async function edit(value: Edit, signal?: AbortSignal) {
  const old = await pudding.storage.read({ signal });
  const result = editCards(readCards(old.data?.cards ?? []), value);
  if (signal?.aborted) throw new Error(t("cancelled"));

  const hasChanges = result.changed.length > 0 || result.deletedIDs.length > 0;
  const saved = hasChanges
    ? await pudding.storage.write({
        expectedVersion: old.version,
        data: { ...old.data, cards: result.cards },
      })
    : old;

  return {
    ...(value.action === "delete" || value.action === "clear_completed"
      ? { deletedIDs: result.deletedIDs }
      : { cards: result.changed }),
    counts: counts(result.cards),
    storageVersion: saved.version,
  };
}

function register() {
  const title = z
    .string()
    .trim()
    .min(1, t("titleError"))
    .max(300, t("titleError"));

  const ids = z
    .array(z.string())
    .min(1, t("batchError"))
    .max(100, t("batchError"));

  const colEnum = z.enum(["todo", "in_progress", "done"]);

  const wrap =
    <T, R>(run: (input: T, signal: AbortSignal) => Promise<R>) =>
    async (input: T, c: { signal: AbortSignal }) => {
      try {
        return await run(input, c.signal);
      } catch (error) {
        throw new Error(errorText(error));
      }
    };

  return [
    pudding.defineInterface({
      name: "addCards",
      description: t("descAdd"),
      input: z
        .object({
          cards: z
            .array(
              z
                .object({
                  title,
                  column: colEnum.optional(),
                  description: z.string().max(2000).optional(),
                })
                .strict(),
            )
            .min(1, t("batchError"))
            .max(100, t("batchError")),
        })
        .strict(),
      run: wrap((input: { cards: Array<{ title: string; column?: ColumnId; description?: string }> }, signal) =>
        edit({ action: "add", cards: input.cards }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "moveCard",
      description: t("descMove"),
      input: z
        .object({
          id: z.string(),
          toColumn: colEnum,
          targetIndex: z.number().int().min(0).optional(),
        })
        .strict(),
      run: wrap((input: { id: string; toColumn: ColumnId; targetIndex?: number }, signal) =>
        edit({ action: "move", ...input }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "updateCards",
      description: t("descUpdate"),
      input: z
        .object({
          updates: z
            .array(
              z
                .object({
                  id: z.string(),
                  title: title.optional(),
                  column: colEnum.optional(),
                  description: z.string().max(2000).optional(),
                })
                .strict(),
            )
            .min(1, t("batchError"))
            .max(100, t("batchError")),
        })
        .strict(),
      run: wrap(
        (
          input: {
            updates: Array<{
              id: string;
              title?: string;
              column?: ColumnId;
              description?: string;
            }>;
          },
          signal,
        ) => edit({ action: "update", updates: input.updates }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "deleteCards",
      description: t("descDelete"),
      input: z.object({ ids }).strict(),
      run: wrap((input: { ids: string[] }, signal) =>
        edit({ action: "delete", ids: input.ids }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "clearCompleted",
      description: t("descClearCompleted"),
      input: z.object({}).strict(),
      run: wrap((_input: Record<string, never>, signal) =>
        edit({ action: "clear_completed" }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "listBoard",
      description: t("descList"),
      input: z
        .object({
          column: z.enum(["all", "todo", "in_progress", "done"]).optional(),
        })
        .strict(),
      run: wrap(
        async (
          input: { column?: "all" | ColumnId },
          signal,
        ) => {
          const saved = await pudding.storage.read({ signal });
          const allCards = readCards(saved.data?.cards ?? []);
          const filtered =
            !input.column || input.column === "all"
              ? allCards
              : allCards.filter((c) => c.column === input.column);
          return {
            cards: filtered,
            counts: counts(allCards),
            storageVersion: saved.version,
          };
        },
      ),
    }),
  ];
}

let interfaces = register();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = register();
});
