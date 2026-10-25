import { pudding, type JSONValue } from "@pudding/widget";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  accountSchema,
  itemIDSchema,
  parseItemID,
  viewerSchema,
  repoListSchema,
  repoSummary,
  searchResultSchema,
  ghIssueSchema,
  commentListSchema,
  itemSummary,
  readStore,
  cardFor,
  updateCards,
  saveDraft,
  statuses,
  draftSchema,
  updateSchema,
  type Update,
  type Card,
} from "./model";
import { t, errorText } from "./text";

export const DEFAULT_QUERY = "is:open involves:@me";

// One controller/cache per guest binding. Shared cache requests own their
// cancellation signal so canceling one UI reader never aborts a shared request.
export function createGitHubBoard(client: QueryClient) {
  const known = new Set<string>();

  const viewer = () =>
    client.fetchQuery({
      queryKey: ["github", "viewer"],
      queryFn: async () => {
        const res = await pudding.query("viewer");
        return accountSchema.parse(viewerSchema.parse(res.data).login);
      },
      staleTime: Infinity,
    });

  const ensure = async (account: string, signal?: AbortSignal) => {
    if ((await viewer()) !== accountSchema.parse(account)) {
      throw new Error("wrongAccount");
    }
    signal?.throwIfAborted();
  };

  const storage = async (signal?: AbortSignal) => {
    const raw = await pudding.storage.read({ signal });
    return { raw, store: readStore(raw.data.githubBoard) };
  };

  async function repos(
    account: string,
    page = 1,
    limit = 20,
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const items = await client.fetchQuery({
      queryKey: ["github", "repos", account, page, limit],
      staleTime: 60000,
      queryFn: async ({ signal: querySignal }) => {
        const raw = repoListSchema.parse(
          (
            await pudding.query(
              "repos",
              { page, limit },
              { signal: querySignal },
            )
          ).data,
        );
        return raw.map(repoSummary);
      },
    });
    signal?.throwIfAborted();
    return {
      account,
      page,
      hasNextPage: items.length === limit,
      repos: items,
    };
  }

  async function searchPage(
    account: string,
    q = DEFAULT_QUERY,
    page = 1,
    limit = 20,
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const normalizedQ = q.trim() || DEFAULT_QUERY;
    const result = await client.fetchQuery({
      queryKey: ["github", "search", account, normalizedQ, page, limit],
      staleTime: 60000,
      queryFn: async ({ signal: searchSignal }) => {
        const parsed = searchResultSchema.parse(
          (
            await pudding.query(
              "searchItems",
              { q: normalizedQ, page, limit },
              { signal: searchSignal },
            )
          ).data,
        );
        const items = parsed.items.map((item) => itemSummary(item));
        return {
          totalCount: parsed.total_count,
          items,
          hasNextPage:
            items.length === limit && page * limit < parsed.total_count,
        };
      },
    });
    signal?.throwIfAborted();
    result.items.forEach((x) => known.add(x.id));
    return { q: normalizedQ, page, ...result };
  }

  async function list(
    account: string,
    q = DEFAULT_QUERY,
    page = 1,
    limit = 20,
    signal?: AbortSignal,
  ) {
    const p = await searchPage(account, q, page, limit, signal);
    const s = await storage(signal);
    return {
      account,
      q: p.q,
      page: p.page,
      totalCount: p.totalCount,
      hasNextPage: p.hasNextPage,
      items: p.items.map((item) => {
        const c = cardFor(s.store, account, item.id);
        return {
          ...item,
          status: c.status,
          followUpAt: c.followUpAt,
          hasDraft: Boolean(c.draft),
        };
      }),
      storageVersion: s.raw.version,
    };
  }

  async function board(signal?: AbortSignal) {
    const account = await viewer();
    const p = await list(account, DEFAULT_QUERY, 1, 20, signal);
    return {
      account,
      query: p.q,
      counts: Object.fromEntries(
        statuses.map((st) => [
          st,
          p.items.filter((x) => x.status === st).length,
        ]),
      ),
      countScope: "first search page",
      loadedCount: p.items.length,
      totalCount: p.totalCount,
      hasNextPage: p.hasNextPage,
      storageVersion: p.storageVersion,
    };
  }

  async function read(
    account: string,
    id: string,
    commentPage = 1,
    commentLimit = 10,
    signal?: AbortSignal,
  ) {
    await ensure(account, signal);
    const { owner, repo, number } = parseItemID(id);
    const fullRepo = `${owner}/${repo}`;

    const [issue, comments] = await Promise.all([
      client.fetchQuery({
        queryKey: ["github", "detail", account, fullRepo, number],
        staleTime: 60000,
        queryFn: async ({ signal: detailSignal }) =>
          ghIssueSchema.parse(
            (
              await pudding.query(
                "itemDetail",
                { owner, repo, number },
                { signal: detailSignal },
              )
            ).data,
          ),
      }),
      client.fetchQuery({
        queryKey: [
          "github",
          "comments",
          account,
          fullRepo,
          number,
          commentPage,
          commentLimit,
        ],
        staleTime: 60000,
        queryFn: async ({ signal: commentsSignal }) =>
          commentListSchema.parse(
            (
              await pudding.query(
                "itemComments",
                {
                  owner,
                  repo,
                  number,
                  page: commentPage,
                  limit: commentLimit,
                },
                { signal: commentsSignal },
              )
            ).data,
          ),
      }),
    ]);

    if (issue.number !== number) throw new Error("Item number mismatch");
    signal?.throwIfAborted();

    const summary = itemSummary(issue, fullRepo);
    known.add(summary.id);
    const s = await storage(signal);
    const rawBody = issue.body ?? "";

    return {
      account,
      ...summary,
      ...cardFor(s.store, account, summary.id),
      storageVersion: s.raw.version,
      body: rawBody.slice(0, 12000),
      bodyTruncated: rawBody.length > 12000,
      commentPage,
      hasNextCommentPage:
        comments.length === commentLimit &&
        commentPage * commentLimit < summary.commentCount,
      comments: comments.map((c) => {
        const text = c.body ?? "";
        return {
          id: String(c.id),
          author: c.user?.login ?? "unknown",
          createdAt: c.created_at,
          body: text.slice(0, 8000),
          truncated: text.length > 8000,
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
      const validId = itemIDSchema.parse(draft.id);
      if (!known.has(validId)) throw new Error("unknownItem");
      next = saveDraft(next, account, validId, draft.value);
    }
    const data = { ...s.raw.data, githubBoard: next as unknown as JSONValue };
    if (new TextEncoder().encode(JSON.stringify(data)).length > 262144) {
      throw new Error("storageLimit");
    }
    signal?.throwIfAborted();
    const saved = await pudding.storage.write({
      expectedVersion: expectedStorageVersion,
      data,
    });
    await client.invalidateQueries({ queryKey: ["github-board-view"] });
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
      queryKey: ["github"],
      refetchType: "none",
    });
    await client.invalidateQueries({
      queryKey: ["github-board-view"],
      refetchType: "none",
    });
    return board(signal);
  }

  return { viewer, repos, searchPage, list, board, read, edit, refresh };
}

export type GitHubBoard = ReturnType<typeof createGitHubBoard>;

export function registerInterfaces(gh: GitHubBoard) {
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
      run: wrap((_, s) => gh.board(s)),
    }),
    pudding.defineInterface({
      name: "listRepos",
      description: t("descRepos"),
      input: z
        .object({
          ...account,
          page: z.number().int().min(1).max(50).default(1),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      run: wrap(
        (i: { account: string; page: number; limit: number }, s) =>
          gh.repos(i.account, i.page, i.limit, s),
      ),
    }),
    pudding.defineInterface({
      name: "listItems",
      description: t("descList"),
      input: z
        .object({
          ...account,
          q: z.string().max(500).default(DEFAULT_QUERY),
          page: z.number().int().min(1).max(50).default(1),
          limit: z.number().int().min(1).max(30).default(20),
        })
        .strict(),
      run: wrap(
        (i: { account: string; q: string; page: number; limit: number }, s) =>
          gh.list(i.account, i.q, i.page, i.limit, s),
      ),
    }),
    pudding.defineInterface({
      name: "readItem",
      description: t("descRead"),
      input: z
        .object({
          ...account,
          id: itemIDSchema,
          commentPage: z.number().int().min(1).max(50).default(1),
          commentLimit: z.number().int().min(1).max(20).default(10),
        })
        .strict(),
      run: wrap(
        (
          i: {
            account: string;
            id: string;
            commentPage: number;
            commentLimit: number;
          },
          s,
        ) => gh.read(i.account, i.id, i.commentPage, i.commentLimit, s),
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
          gh.edit(
            i.account,
            i.expectedStorageVersion,
            i.updates,
            undefined,
            s,
          ),
      ),
    }),
    pudding.defineInterface({
      name: "saveCommentDraft",
      description: t("descDraft"),
      input: z
        .object({
          ...write,
          id: itemIDSchema,
          draft: draftSchema.nullable(),
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
          gh.edit(
            i.account,
            i.expectedStorageVersion,
            [],
            { id: i.id, value: i.draft },
            s,
          ),
      ),
    }),
    pudding.defineInterface({
      name: "refreshBoard",
      description: t("descRefresh"),
      input: z.object(account).strict(),
      run: wrap((i: { account: string }, s) => gh.refresh(i.account, s)),
    }),
  ];
}
