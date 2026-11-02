import { z } from "zod";

export const statuses = ["todo", "reply", "followUp", "done"] as const;
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,2048}$/);
export const accountSchema = z.string().regex(/^mb_[a-f0-9]{64}$/);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
  });
export const cardMetaSchema = z
  .object({
    subject: z.string().max(500).default(""),
    from: z.string().max(500).default(""),
    snippet: z.string().max(1000).default(""),
    updatedAt: z.string().max(100).default(""),
  })
  .strict();
export type CardMeta = z.infer<typeof cardMetaSchema>;

const cardSchema = z
  .object({
    status: z.enum(statuses),
    note: z.string().max(2000),
    followUpAt: dateSchema.nullable(),
    draft: z
      .object({ subject: z.string().max(500), body: z.string().max(8000) })
      .strict()
      .nullable(),
    meta: cardMetaSchema.optional(),
  })
  .strict();
const storeSchema = z
  .object({
    schemaVersion: z.literal(2),
    accounts: z.record(accountSchema, z.record(idSchema, cardSchema)),
  })
  .strict();
export type Card = z.infer<typeof cardSchema>;
export type BoardStore = z.infer<typeof storeSchema>;
export const emptyCard = (): Card => ({
  status: "todo",
  note: "",
  followUpAt: null,
  draft: null,
});
export function readStore(value: unknown): BoardStore {
  if (value === undefined) return { schemaVersion: 2, accounts: {} };
  const parsed = storeSchema.safeParse(value);
  if (!parsed.success) throw new Error("invalidData");
  return parsed.data;
}
export const updateSchema = z
  .object({
    id: idSchema,
    status: z.enum(statuses).optional(),
    note: z.string().max(2000).optional(),
    followUpAt: dateSchema.nullable().optional(),
    meta: cardMetaSchema.optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.status !== undefined ||
      v.note !== undefined ||
      v.followUpAt !== undefined ||
      v.meta !== undefined,
    "Provide status, note or followUpAt",
  );
export type Update = z.infer<typeof updateSchema>;
export function updateCards(
  store: BoardStore,
  account: string,
  updates: Update[],
  knownIDs: Set<string>,
) {
  if (updates.length < 1 || updates.length > 20) throw new Error("batchSize");
  if (new Set(updates.map((x) => x.id)).size !== updates.length)
    throw new Error("duplicate");
  const cards = { ...store.accounts[account] };
  for (const raw of updates) {
    const { id, ...patch } = updateSchema.parse(raw);
    if (!knownIDs.has(id)) throw new Error("unknownThread");
    cards[id] = { ...(cards[id] ?? emptyCard()), ...patch };
  }
  return { ...store, accounts: { ...store.accounts, [account]: cards } };
}
export function saveDraft(
  store: BoardStore,
  account: string,
  id: string,
  draft: Card["draft"],
) {
  const card = cardSchema.parse({
    ...(store.accounts[account]?.[id] ?? emptyCard()),
    draft,
  });
  return {
    ...store,
    accounts: {
      ...store.accounts,
      [account]: { ...store.accounts[account], [id]: card },
    },
  };
}
export function cardFor(store: BoardStore, account: string, id: string): Card {
  return store.accounts[account]?.[id] ?? emptyCard();
}

export const messageSchema = z.object({
  id: idSchema, subject: z.string(), from: z.string(), to: z.string(), date: z.string(), unread: z.boolean(),
  text: z.string().default(""), truncated: z.boolean().default(false),
  attachments: z.array(z.object({name:z.string(), type:z.string(), size:z.number()})).default([]),
});
export const listSchema = z.object({messages:z.array(messageSchema), nextCursor:z.string()});
export function messageSummary(message: z.infer<typeof messageSchema>) {
  return {id:message.id, subject:message.subject.slice(0,500), from:message.from.slice(0,500), snippet:"", updatedAt:message.date, messageCount:1, unread:message.unread};
}
export type Summary = ReturnType<typeof messageSummary>;
