import { pudding, type JSONValue } from "@pudding/widget";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  accountSchema,
  idSchema,
  listSchema,
  messageSchema,
  messageSummary,
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
// Shared cache requests own their cancellation signal; one UI/model caller must
// never cancel the same request still used by another reader.
export function createMailbox(client: QueryClient) {
  const known = new Set<string>();
  const readReceipts = new Map<string, Promise<void>>();
  const profileSchema = z.object({mailboxID:accountSchema,address:z.string(),configRevision:z.string()});
  let current: z.infer<typeof profileSchema> | undefined;
  const loadProfile = async () => {
    const next = profileSchema.parse((await pudding.query("profile")).data);
    if (current && (current.mailboxID !== next.mailboxID || current.configRevision !== next.configRevision)) known.clear();
    current = next;
    return next;
  };
  const profile = async () => (await loadProfile()).mailboxID;
  const address = () => current?.address ?? "";
  const ensure = async (account: string, signal?: AbortSignal) => {
    const p = await loadProfile();
    if (p.mailboxID !== accountSchema.parse(account)) throw new Error("wrongAccount");
    signal?.throwIfAborted();
    return {mailboxID:p.mailboxID, configRevision:p.configRevision};
  };
  const storage = async (signal?: AbortSignal) => {
    const raw = await pudding.storage.read({ signal });
    return { raw, store: readStore(raw.data.emailBoard) };
  };
  async function page(
    account: string,
    q = "",
    cursor = "",
    limit = 20,
    signal?: AbortSignal,
  ) {
    const identity = await ensure(account, signal);
    const result = await client.fetchQuery({
      queryKey: ["email", "page", account, identity.configRevision, q, cursor, limit],
      staleTime: 60000,
      queryFn: async ({signal:pageSignal}) => {
        const listing = listSchema.parse((await pudding.query("list", {...identity,q,cursor,limit}, {signal:pageSignal})).data);
        return {items:listing.messages.map(messageSummary), nextCursor:listing.nextCursor || null};
      },
    });
    signal?.throwIfAborted();
    result.items.forEach((x) => known.add(x.id));
    return result;
  }
  async function list(
    account: string,
    q = "",
    cursor = "",
    limit = 20,
    signal?: AbortSignal,
  ) {
    const p = await page(account, q, cursor, limit, signal),
      s = await storage(signal);
    const items = p.items.map((item) => {
      const c = cardFor(s.store, account, item.id);
      return {
        ...item,
        status: c.status,
        followUpAt: c.followUpAt,
        hasDraft: !!c.draft,
        note: c.note,
      };
    });

    const accountCards = s.store.accounts[account] ?? {};
    const pageItemsMap = new Map(items.map((item) => [item.id, item]));

    const taggedCards = Object.entries(accountCards)
      .filter(
        ([_, c]) =>
          c.status !== "todo" || !!c.draft || !!c.note || !!c.followUpAt,
      )
      .map(([id, c]) => {
        known.add(id);
        const fromPage = pageItemsMap.get(id);
        return {
          id,
          status: c.status,
          note: c.note,
          followUpAt: c.followUpAt,
          hasDraft: !!c.draft,
          from: c.meta?.from || fromPage?.from || address(),
          subject: c.meta?.subject || fromPage?.subject || t("untitled"),
          snippet: c.meta?.snippet || fromPage?.snippet || "",
          updatedAt:
            c.meta?.updatedAt ||
            fromPage?.updatedAt ||
            new Date().toISOString(),
          unread: fromPage?.unread ?? false,
        };
      });

    return {
      account,
      q,
      ...p,
      items,
      taggedCards,
      storageVersion: s.raw.version,
    };
  }
  async function board(signal?: AbortSignal) {
    const account = await profile(),
      p = await list(account, "", "", 20, signal);
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
    const identity = await ensure(account, signal);
    const message = await client.fetchQuery({
      queryKey:["email","message",account,identity.configRevision,id], staleTime:60000,
      queryFn:async ({signal:readSignal}) => messageSchema.parse((await pudding.query("message",{...identity,id},{signal:readSignal})).data),
    });
    if (message.id !== id) throw new Error("Message ID mismatch");
    signal?.throwIfAborted(); known.add(id);
    const s=await storage(signal);
    return {account,...messageSummary(message),...cardFor(s.store,account,id),storageVersion:s.raw.version,offset:0,nextOffset:null,
      messages:[{...message,format:message.html ? "html" : message.text ? "plain" : "unavailable"}], attachments:message.attachments};
  }

  async function markRead(account: string, id: string) {
    const identity = await ensure(account);
    idSchema.parse(id);
    const key = `${account}:${identity.configRevision}:${id}`;
    const pending = readReceipts.get(key);
    if (pending) return pending;
    const write = (async () => {
      const action = z.object({state:z.string(),result:z.unknown().optional()})
        .parse(await pudding.action("markRead", {...identity,id}));
      if (action.state !== "succeeded") throw new Error("readSyncFailed");
      const {data} = z.object({data:z.object({id:idSchema,unread:z.literal(false)})}).parse(action.result);
      if (data.id !== id) throw new Error("Message ID mismatch");
      client.setQueriesData<Awaited<ReturnType<typeof page>>>({queryKey:["email","page",account]}, cached =>
        cached ? {...cached,items:cached.items.map(item=>item.id===id?{...item,unread:false}:item)} : cached);
      client.setQueriesData<z.infer<typeof messageSchema>>({queryKey:["email","message",account,identity.configRevision,id]}, cached =>
        cached ? {...cached,unread:false} : cached);
      await client.invalidateQueries({queryKey:["email-board-view","list",account]});
      await client.invalidateQueries({queryKey:["email-board-view","detail",account,id]});
    })();
    readReceipts.set(key, write);
    try { await write; }
    finally { readReceipts.delete(key); }
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
    const data = { ...s.raw.data, emailBoard: next as unknown as JSONValue };
    if (new TextEncoder().encode(JSON.stringify(data)).length > 262144)
      throw new Error("storageLimit");
    signal?.throwIfAborted();
    const saved = await pudding.storage.write({
      expectedVersion: expectedStorageVersion,
      data,
    });
    await client.invalidateQueries({ queryKey: ["email-board-view"] });
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
      queryKey: ["email"],
      refetchType: "none",
    });
    await client.invalidateQueries({
      queryKey: ["email-board-view"],
      refetchType: "none",
    });
    return board(signal);
  }
  return { profile, address, page, list, board, read, markRead, edit, refresh };
}
export type Mailbox = ReturnType<typeof createMailbox>;
export function registerInterfaces(mail: Mailbox) {
  (pudding as typeof pudding & { setInstructions?: (text: string) => void }).setInstructions?.(t("instructions"));
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
      name: "listMessages",
      description: t("descList"),
      input: z
        .object({
          ...account,
          q: z.string().max(500).default(""),
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
      name: "readMessage",
      description: t("descRead"),
      input: z
        .object({
          ...account,
          id: idSchema,
        })
        .strict(),
      run: wrap(
        (
          i: { account: string; id: string },
          s,
        ) => mail.read(i.account, i.id, 0, 1, s),
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
