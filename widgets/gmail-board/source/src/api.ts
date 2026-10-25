import { pudding, type JSONValue } from "@pudding/widget";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  accountSchema,
  idSchema,
  listSchema,
  threadSchema,
  threadSummary,
  messageBody,
  header,
  readStore,
  cardFor,
  updateCards,
  saveDraft,
  statuses,
  updateSchema,
  type Update,
  type Card,
} from "./model";
import { t, errorText } from "./text";

// One controller/cache per guest binding. A connection change creates a new guest.
export function createMailbox(client: QueryClient) {
  const known = new Set<string>();
  const profile = () =>
    client.fetchQuery({
      queryKey: ["gmail", "profile"],
      queryFn: async () =>
        accountSchema
          .parse(
            (await pudding.query<{ emailAddress: string }>("profile")).data
              .emailAddress,
          )
          .toLowerCase(),
      staleTime: Infinity,
    });
  const ensure = async (account: string, signal?: AbortSignal) => {
    if ((await profile()) !== accountSchema.parse(account))
      throw new Error("wrongAccount");
    signal?.throwIfAborted();
  };
  const storage = async (signal?: AbortSignal) => {
    const raw = await pudding.storage.read({ signal });
    return { raw, store: readStore(raw.data.gmailBoard) };
  };
  async function page(
    account: string,
    q = "in:inbox",
    cursor = "",
    limit = 20,
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const result = await client.fetchQuery({
      queryKey: ["gmail", "page", account, q, cursor, limit],
      staleTime: 60000,
      queryFn: async () => {
        const listing = listSchema.parse(
          (
            await pudding.query(
              "list",
              { q, pageToken: cursor, limit },
              { signal },
            )
          ).data,
        );
        const items = [];
        // At most three upstream metadata requests: host limit is four per widget.
        for (let i = 0; i < listing.threads.length; i += 3) {
          items.push(
            ...(await Promise.all(
              listing.threads.slice(i, i + 3).map(async ({ id }) => {
                const raw = await client.fetchQuery({
                  queryKey: ["gmail", "metadata", account, id],
                  staleTime: 60000,
                  queryFn: async () =>
                    threadSchema.parse(
                      (await pudding.query("metadata", { id }, { signal }))
                        .data,
                    ),
                });
                if (raw.id !== id) throw new Error("Thread ID mismatch");
                return threadSummary(raw);
              }),
            )),
          );
        }
        return { items, nextCursor: listing.nextPageToken ?? null };
      },
    });
    signal?.throwIfAborted();
    result.items.forEach((x) => known.add(x.id));
    return result;
  }
  async function list(
    account: string,
    q = "in:inbox",
    cursor = "",
    limit = 20,
    signal?: AbortSignal,
  ) {
    const p = await page(account, q, cursor, limit, signal),
      s = await storage(signal);
    return {
      account,
      q,
      ...p,
      items: p.items.map((item) => {
        const c = cardFor(s.store, account, item.id);
        return {
          ...item,
          status: c.status,
          followUpAt: c.followUpAt,
          hasDraft: !!c.draft,
        };
      }),
      storageVersion: s.raw.version,
    };
  }
  async function board(signal?: AbortSignal) {
    const account = await profile(),
      p = await list(account, "in:inbox", "", 20, signal);
    return {
      account,
      query: p.q,
      counts: Object.fromEntries(
        statuses.map((s) => [s, p.items.filter((x) => x.status === s).length]),
      ),
      countScope: "first inbox page",
      loadedCount: p.items.length,
      nextCursor: p.nextCursor,
      storageVersion: p.storageVersion,
    };
  }
  async function read(
    account: string,
    id: string,
    offset = 0,
    limit = 5,
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const thread = await client.fetchQuery({
      queryKey: ["gmail", "thread", account, id],
      staleTime: 60000,
      queryFn: async () =>
        threadSchema.parse(
          (await pudding.query("thread", { id }, { signal })).data,
        ),
    });
    if (thread.id !== id) throw new Error("Thread ID mismatch");
    signal?.throwIfAborted();
    known.add(id);
    const s = await storage(signal);
    const ordered = [...thread.messages].sort(
      (a, b) => Number(b.internalDate) - Number(a.internalDate),
    );
    return {
      account,
      ...threadSummary(thread),
      ...cardFor(s.store, account, id),
      storageVersion: s.raw.version,
      offset,
      nextOffset: offset + limit < ordered.length ? offset + limit : null,
      messages: ordered.slice(offset, offset + limit).map((m) => {
        const body = messageBody(m.payload),
          text = body.text || m.snippet;
        return {
          id: m.id,
          from: header(m.payload, "From"),
          to: header(m.payload, "To"),
          date: new Date(Number(m.internalDate)).toISOString(),
          text: text.slice(0, 12000),
          format: body.format,
          truncated: text.length > 12000,
        };
      }),
    };
  }
  async function edit(
    account: string,
    expectedStorageVersion: number,
    updates: Update[],
    draft?: { id: string; value: Card["draft"] },
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const s = await storage(signal);
    if (s.raw.version !== expectedStorageVersion) throw new Error("conflict");
    let next = updates.length
      ? updateCards(s.store, account, updates, known)
      : s.store;
    if (draft) {
      if (!known.has(draft.id)) throw new Error("unknownThread");
      next = saveDraft(next, account, draft.id, draft.value);
    }
    const data = { ...s.raw.data, gmailBoard: next as unknown as JSONValue };
    if (new TextEncoder().encode(JSON.stringify(data)).length > 262144)
      throw new Error("storageLimit");
    signal?.throwIfAborted();
    const saved = await pudding.storage.write({
      expectedVersion: expectedStorageVersion,
      data,
    });
    await client.invalidateQueries({ queryKey: ["gmail-board-view"] });
    return {
      account,
      changedIDs: [
        ...new Set([...updates.map((x) => x.id), ...(draft ? [draft.id] : [])]),
      ],
      storageVersion: saved.version,
    };
  }
  async function refresh(account: string, signal?: AbortSignal) {
    await ensure(account, signal);
    await client.invalidateQueries({
      queryKey: ["gmail"],
      refetchType: "none",
    });
    await client.invalidateQueries({
      queryKey: ["gmail-board-view"],
      refetchType: "none",
    });
    return board(signal);
  }
  return { profile, page, list, board, read, edit, refresh };
}
export type Mailbox = ReturnType<typeof createMailbox>;
export function registerInterfaces(mail: Mailbox) {
  const account = { account: accountSchema };
  const write = { ...account, expectedStorageVersion: z.number().int().min(0) };
  const wrap =
    <I, O>(run: (i: I, signal: AbortSignal) => Promise<O>) =>
    async (i: I, c: { signal: AbortSignal }) => {
      try {
        return await run(i, c.signal);
      } catch (e) {
        throw new Error(errorText(e));
      }
    };
  return [
    pudding.defineInterface({
      name: "getBoard",
      description: t("descBoard"),
      input: z.object({}).strict(),
      run: wrap((_, s) => mail.board(s)),
    }),
    pudding.defineInterface({
      name: "listThreads",
      description: t("descList"),
      input: z
        .object({
          ...account,
          q: z.string().max(500).default("in:inbox"),
          cursor: z.string().max(2048).default(""),
          limit: z.number().int().min(1).max(20).default(20),
        })
        .strict(),
      run: wrap(
        (i: { account: string; q: string; cursor: string; limit: number }, s) =>
          mail.list(i.account, i.q, i.cursor, i.limit, s),
      ),
    }),
    pudding.defineInterface({
      name: "readThread",
      description: t("descRead"),
      input: z
        .object({
          ...account,
          id: idSchema,
          offset: z.number().int().min(0).default(0),
          limit: z.number().int().min(1).max(10).default(5),
        })
        .strict(),
      run: wrap(
        (
          i: { account: string; id: string; offset: number; limit: number },
          s,
        ) => mail.read(i.account, i.id, i.offset, i.limit, s),
      ),
    }),
    pudding.defineInterface({
      name: "updateCards",
      description: t("descUpdate"),
      input: z
        .object({ ...write, updates: z.array(updateSchema).min(1).max(20) })
        .strict(),
      run: wrap(
        (
          i: {
            account: string;
            expectedStorageVersion: number;
            updates: Update[];
          },
          s,
        ) =>
          mail.edit(
            i.account,
            i.expectedStorageVersion,
            i.updates,
            undefined,
            s,
          ),
      ),
    }),
    pudding.defineInterface({
      name: "saveReplyDraft",
      description: t("descDraft"),
      input: z
        .object({
          ...write,
          id: idSchema,
          draft: z
            .object({
              subject: z.string().max(500),
              body: z.string().max(8000),
            })
            .strict()
            .nullable(),
        })
        .strict(),
      run: wrap(
        (
          i: {
            account: string;
            expectedStorageVersion: number;
            id: string;
            draft: Card["draft"];
          },
          s,
        ) =>
          mail.edit(
            i.account,
            i.expectedStorageVersion,
            [],
            { id: i.id, value: i.draft },
            s,
          ),
      ),
    }),
    pudding.defineInterface({
      name: "refreshMailbox",
      description: t("descRefresh"),
      input: z.object(account).strict(),
      run: wrap((i: { account: string }, s) => mail.refresh(i.account, s)),
    }),
  ];
}
