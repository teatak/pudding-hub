import { pudding } from "@pudding/widget";
import { z } from "zod";
import { counts, editTasks, readTasks, taskPage, type Edit } from "./tasks";
import { t, errorText } from "./text";

// UI and models write the same item storage once. Never overwrite a conflict
// by retrying against unseen data; unrelated top-level data stays intact.
export async function edit(value: Edit, signal?: AbortSignal) {
  const old = await pudding.storage.read({ signal });
  const result = editTasks(readTasks(old.data.tasks ?? []), value);
  if (signal?.aborted) throw new Error("Cancelled");
  const saved =
    result.changed.length || result.deletedIDs.length
      ? await pudding.storage.write({
          expectedVersion: old.version,
          data: { ...old.data, tasks: result.tasks },
        })
      : old;
  return {
    ...(value.action === "delete"
      ? { deletedIDs: result.deletedIDs }
      : { tasks: result.changed }),
    counts: counts(result.tasks),
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
      name: "addTasks",
      description: t("descAdd"),
      input: z
        .object({
          titles: z
            .array(title)
            .min(1, t("batchError"))
            .max(100, t("batchError")),
        })
        .strict(),
      run: wrap((input: { titles: string[] }, signal) =>
        edit({ action: "add", ...input }, signal),
      ),
    }),
    pudding.defineInterface({
      name: "updateTasks",
      description: t("descUpdate"),
      input: z
        .object({
          updates: z
            .array(
              z
                .object({
                  id: z.string(),
                  title: title.optional(),
                  done: z.boolean().optional(),
                })
                .strict(),
            )
            .min(1, t("batchError"))
            .max(100, t("batchError")),
        })
        .strict(),
      run: wrap(
        (
          input: { updates: { id: string; title?: string; done?: boolean }[] },
          signal,
        ) => edit({ action: "update", ...input }, signal),
      ),
    }),
    pudding.defineInterface({
      name: "deleteTasks",
      description: t("descDelete"),
      input: z.object({ ids }).strict(),
      run: wrap((input: { ids: string[] }, signal) =>
        edit({ action: "delete", ...input }, signal),
      ),
    }),
    pudding.defineInterface({
      name: "listTasks",
      description: t("descList"),
      input: z
        .object({
          status: z.enum(["all", "active", "completed"]).optional(),
          offset: z.number().int().min(0).optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .strict(),
      run: wrap(
        async (
          input: {
            status?: "all" | "active" | "completed";
            offset?: number;
            limit?: number;
          },
          signal,
        ) => {
          const saved = await pudding.storage.read({ signal });
          return {
            ...taskPage(
              readTasks(saved.data.tasks ?? []),
              input.status,
              input.offset,
              input.limit,
            ),
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
