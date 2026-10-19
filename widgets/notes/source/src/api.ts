import { pudding } from "@pudding/widget";
import { z } from "zod";
import {
  editNotes,
  readNotes,
  type Edit,
  type Note,
  type NoteColor,
} from "./types";
import { t, errorText } from "./text";

export async function edit(value: Edit, signal?: AbortSignal) {
  const old = await pudding.storage.read({ signal });
  const result = editNotes(readNotes(old.data?.notes ?? []), value);
  if (signal?.aborted) throw new Error(t("cancelled"));

  const hasChanges = result.changed.length > 0 || result.deletedIDs.length > 0;
  const saved = hasChanges
    ? await pudding.storage.write({
        expectedVersion: old.version,
        data: { ...old.data, notes: result.notes },
      })
    : old;

  return {
    ...(value.action === "delete" || value.action === "clear"
      ? { deletedIDs: result.deletedIDs }
      : { notes: result.changed }),
    total: result.notes.length,
    storageVersion: saved.version,
  };
}

function register() {
  const title = z
    .string()
    .trim()
    .max(100, t("titleError"));

  const content = z
    .string()
    .trim()
    .min(1, t("contentError"))
    .max(2000, t("contentError"));

  const ids = z
    .array(z.string())
    .min(1, t("batchError"))
    .max(100, t("batchError"));

  const colorEnum = z.enum(["yellow", "pink", "green", "blue", "purple"]);

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
      name: "addNotes",
      description: t("descAdd"),
      input: z
        .object({
          notes: z
            .array(
              z
                .object({
                  title: title.optional(),
                  content,
                  color: colorEnum.optional(),
                  pinned: z.boolean().optional(),
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
            notes: Array<{
              title?: string;
              content: string;
              color?: NoteColor;
              pinned?: boolean;
            }>;
          },
          signal,
        ) => edit({ action: "add", notes: input.notes }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "updateNotes",
      description: t("descUpdate"),
      input: z
        .object({
          updates: z
            .array(
              z
                .object({
                  id: z.string(),
                  title: title.optional(),
                  content: content.optional(),
                  color: colorEnum.optional(),
                  pinned: z.boolean().optional(),
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
              content?: string;
              color?: NoteColor;
              pinned?: boolean;
            }>;
          },
          signal,
        ) => edit({ action: "update", updates: input.updates }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "togglePin",
      description: t("descTogglePin"),
      input: z.object({ id: z.string() }).strict(),
      run: wrap((input: { id: string }, signal) =>
        edit({ action: "toggle_pin", id: input.id }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "deleteNotes",
      description: t("descDelete"),
      input: z.object({ ids }).strict(),
      run: wrap((input: { ids: string[] }, signal) =>
        edit({ action: "delete", ids: input.ids }, signal),
      ),
    }),

    pudding.defineInterface({
      name: "clearNotes",
      description: t("descClear"),
      input: z.object({}).strict(),
      run: wrap((_input: Record<string, never>, signal) =>
        edit({ action: "clear" }, signal),
      ),
    }),
  ];
}

export const interfaces = register();
