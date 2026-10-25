import { z } from "zod";

export const statuses = ["triage", "review", "inProgress", "done"] as const;
export const draftKinds = ["comment", "approve", "requestChanges"] as const;

export const accountSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/)
  .max(39);

export const itemIDSchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[1-9][0-9]*$/)
  .max(220);

export function parseItemID(id: string): {
  owner: string;
  repo: string;
  number: number;
} {
  const valid = itemIDSchema.parse(id);
  const [fullRepo, numStr] = valid.split("#");
  const [owner, repo] = fullRepo.split("/");
  return { owner, repo, number: Number(numStr) };
}

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
  });

export const draftSchema = z
  .object({
    kind: z.enum(draftKinds),
    body: z.string().min(1).max(8000),
  })
  .strict();

export const cardMetaSchema = z
  .object({
    title: z.string().max(500).default(""),
    author: z.string().max(120).default(""),
    snippet: z.string().max(1000).default(""),
    updatedAt: z.string().max(100).default(""),
    kind: z.enum(["pr", "issue"]).default("issue"),
    state: z.string().max(40).default("open"),
    isDraftPR: z.boolean().default(false),
    commentCount: z.number().int().nonnegative().default(0),
    labels: z
      .array(
        z
          .object({
            name: z.string().max(100),
            color: z.string().max(20),
          })
          .strict(),
      )
      .max(8)
      .default([]),
  })
  .strict();

export type CardMeta = z.infer<typeof cardMetaSchema>;

const cardSchema = z
  .object({
    status: z.enum(statuses),
    note: z.string().max(2000),
    followUpAt: dateSchema.nullable(),
    draft: draftSchema.nullable(),
    meta: cardMetaSchema.optional(),
  })
  .strict();

const storeSchema = z
  .object({
    schemaVersion: z.literal(1),
    accounts: z.record(accountSchema, z.record(itemIDSchema, cardSchema)),
  })
  .strict();

export type Card = z.infer<typeof cardSchema>;
export type BoardStore = z.infer<typeof storeSchema>;

export const emptyCard = (): Card => ({
  status: "triage",
  note: "",
  followUpAt: null,
  draft: null,
});

export function readStore(value: unknown): BoardStore {
  if (value === undefined) return { schemaVersion: 1, accounts: {} };
  const parsed = storeSchema.safeParse(value);
  if (!parsed.success) throw new Error("invalidData");
  return parsed.data;
}

export const updateSchema = z
  .object({
    id: itemIDSchema,
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
  metaLookup?: Map<string, CardMeta>,
): BoardStore {
  if (updates.length < 1 || updates.length > 20) throw new Error("batchSize");
  if (new Set(updates.map((x) => x.id)).size !== updates.length)
    throw new Error("duplicate");
  const cards = { ...store.accounts[account] };
  for (const raw of updates) {
    const { id, ...patch } = updateSchema.parse(raw);
    if (!knownIDs.has(id)) throw new Error("unknownItem");
    const existing = cards[id] ?? emptyCard();
    const inferredMeta = patch.meta ?? existing.meta ?? metaLookup?.get(id);
    cards[id] = {
      ...existing,
      ...patch,
      ...(inferredMeta ? { meta: inferredMeta } : {}),
    };
  }
  return { ...store, accounts: { ...store.accounts, [account]: cards } };
}

export function saveDraft(
  store: BoardStore,
  account: string,
  id: string,
  draft: Card["draft"],
  metaLookup?: Map<string, CardMeta>,
): BoardStore {
  const existing = store.accounts[account]?.[id] ?? emptyCard();
  const inferredMeta = existing.meta ?? metaLookup?.get(id);
  const card = cardSchema.parse({
    ...existing,
    draft,
    ...(inferredMeta ? { meta: inferredMeta } : {}),
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

export const viewerSchema = z.object({
  login: z.string().min(1),
  name: z.string().nullable().optional(),
  avatar_url: z.string().optional(),
});

export const repoItemSchema = z.object({
  id: z.number(),
  full_name: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  description: z.string().nullable().optional(),
  private: z.boolean().default(false),
  has_issues: z.boolean().default(true),
  stargazers_count: z.number().default(0),
  open_issues_count: z.number().default(0),
  language: z.string().nullable().optional(),
  default_branch: z.string().default("main"),
  updated_at: z.string().default(""),
});

export const repoListSchema = z.array(repoItemSchema);

export const installationsResponseSchema = z.object({
  installations: z
    .array(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .default([]),
});

export const installationReposResponseSchema = z.object({
  repositories: z.array(repoItemSchema).default([]),
});

export function repoSummary(raw: z.infer<typeof repoItemSchema>) {
  return {
    fullName: raw.full_name,
    description: (raw.description ?? "").slice(0, 240),
    isPrivate: raw.private,
    hasIssues: raw.has_issues,
    stars: raw.stargazers_count,
    openIssues: raw.open_issues_count,
    language: raw.language ?? null,
    defaultBranch: raw.default_branch,
    updatedAt: raw.updated_at,
  };
}
export type RepoSummary = ReturnType<typeof repoSummary>;

const labelSchema = z.object({
  name: z.string(),
  color: z.string().default("6e7781"),
});

export const ghIssueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().default(""),
  state: z.string().default("open"),
  draft: z.boolean().optional(),
  body: z.string().nullable().optional(),
  comments: z.number().int().nonnegative().default(0),
  updated_at: z.string(),
  created_at: z.string().optional(),
  repository_url: z.string().optional(),
  html_url: z.string().optional(),
  head: z.record(z.string(), z.unknown()).optional(),
  user: z
    .object({
      login: z.string(),
    })
    .nullable()
    .optional(),
  labels: z.array(labelSchema).default([]),
  assignees: z
    .array(z.object({ login: z.string() }))
    .default([]),
  requested_reviewers: z
    .array(z.object({ login: z.string() }))
    .default([]),
  pull_request: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type GhIssue = z.infer<typeof ghIssueSchema>;
export const ghIssueListSchema = z.array(ghIssueSchema);

export const commentItemSchema = z.object({
  id: z.number(),
  user: z
    .object({
      login: z.string(),
    })
    .nullable()
    .optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  body: z.string().nullable().optional(),
});

export const commentListSchema = z.array(commentItemSchema);

export function extractRepoFullName(
  item: GhIssue,
  fallbackRepo?: string,
): string {
  if (item.repository_url) {
    const m = item.repository_url.match(
      /\/repos\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/,
    );
    if (m) return m[1];
  }
  if (item.html_url) {
    const m = item.html_url.match(
      /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/(?:issues|pull)\//,
    );
    if (m) return m[1];
  }
  if (fallbackRepo) return fallbackRepo;
  throw new Error("Repository full_name missing from GitHub item");
}

export function cleanMarkdownSnippet(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

export function itemSummary(
  item: GhIssue,
  fallbackRepo?: string,
  forcePR = false,
) {
  const repo = extractRepoFullName(item, fallbackRepo);
  const id = `${repo}#${item.number}`;
  const isPR = forcePR || Boolean(item.pull_request) || Boolean(item.head);
  return {
    id,
    repo,
    number: item.number,
    kind: isPR ? ("pr" as const) : ("issue" as const),
    title: item.title,
    state: item.state,
    isDraftPR: Boolean(item.draft),
    author: item.user?.login ?? "unknown",
    labels: item.labels.slice(0, 6).map((l) => ({
      name: l.name,
      color: (l.color || "6e7781").replace(/^#/, ""),
    })),
    assignees: item.assignees.slice(0, 4).map((a) => a.login),
    requestedReviewers: item.requested_reviewers
      .slice(0, 4)
      .map((r) => r.login),
    commentCount: item.comments,
    updatedAt: item.updated_at,
    snippet: cleanMarkdownSnippet(item.body),
  };
}
export type ItemSummary = ReturnType<typeof itemSummary>;

export function metaFromSummary(s: ItemSummary): CardMeta {
  return {
    title: s.title.slice(0, 500),
    author: s.author.slice(0, 120),
    snippet: s.snippet.slice(0, 1000),
    updatedAt: s.updatedAt.slice(0, 100),
    kind: s.kind,
    state: s.state.slice(0, 40),
    isDraftPR: s.isDraftPR,
    commentCount: s.commentCount,
    labels: s.labels.slice(0, 8),
  };
}

export interface ParsedQuery {
  repo: string | null;
  state: "open" | "closed" | "all";
  kind: "pr" | "issue" | "all";
  author: string | null;
  assignee: string | null;
  reviewRequested: string | null;
  involves: string | null;
  keywords: string[];
}

export function parseSearchQuery(rawQ: string, account: string): ParsedQuery {
  const tokens = rawQ.trim().split(/\s+/).filter(Boolean);
  let repo: string | null = null;
  let state: "open" | "closed" | "all" = "open";
  let kind: "pr" | "issue" | "all" = "all";
  let author: string | null = null;
  let assignee: string | null = null;
  let reviewRequested: string | null = null;
  let involves: string | null = null;
  const keywords: string[] = [];

  const resolveUser = (val: string) =>
    val.toLowerCase() === "@me" ? account.toLowerCase() : val.toLowerCase();

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (lower.startsWith("repo:")) {
      const r = tok.slice(5);
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r)) repo = r;
    } else if (lower === "is:open" || lower === "state:open") {
      state = "open";
    } else if (lower === "is:closed" || lower === "state:closed") {
      state = "closed";
    } else if (lower === "is:all" || lower === "state:all") {
      state = "all";
    } else if (lower === "is:pr" || lower === "type:pr") {
      kind = "pr";
    } else if (lower === "is:issue" || lower === "type:issue") {
      kind = "issue";
    } else if (lower.startsWith("author:")) {
      author = resolveUser(tok.slice(7));
    } else if (lower.startsWith("assignee:")) {
      assignee = resolveUser(tok.slice(9));
    } else if (lower.startsWith("review-requested:")) {
      reviewRequested = resolveUser(tok.slice(17));
      kind = "pr";
    } else if (lower.startsWith("involves:")) {
      involves = resolveUser(tok.slice(9));
    } else {
      keywords.push(lower);
    }
  }

  return {
    repo,
    state,
    kind,
    author,
    assignee,
    reviewRequested,
    involves,
    keywords,
  };
}

export function matchesParsedQuery(
  item: ItemSummary,
  parsed: ParsedQuery,
): boolean {
  if (parsed.state !== "all" && item.state.toLowerCase() !== parsed.state) {
    return false;
  }
  if (parsed.kind !== "all" && item.kind !== parsed.kind) {
    return false;
  }
  if (parsed.author && item.author.toLowerCase() !== parsed.author) {
    return false;
  }
  if (
    parsed.assignee &&
    !item.assignees.some((a) => a.toLowerCase() === parsed.assignee)
  ) {
    return false;
  }
  if (parsed.reviewRequested) {
    const isRequested = item.requestedReviewers.some(
      (r) => r.toLowerCase() === parsed.reviewRequested,
    );
    if (!isRequested && item.author.toLowerCase() === parsed.reviewRequested) {
      return false;
    }
  }
  for (const kw of parsed.keywords) {
    const hay =
      `${item.id} ${item.title} ${item.snippet} ${item.author} ${item.labels
        .map((l) => l.name)
        .join(" ")}`.toLowerCase();
    if (!hay.includes(kw)) return false;
  }
  return true;
}
