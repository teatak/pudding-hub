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

const cardSchema = z
  .object({
    status: z.enum(statuses),
    note: z.string().max(2000),
    followUpAt: dateSchema.nullable(),
    draft: draftSchema.nullable(),
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
  })
  .strict()
  .refine(
    (v) =>
      v.status !== undefined ||
      v.note !== undefined ||
      v.followUpAt !== undefined,
    "Provide status, note or followUpAt",
  );

export type Update = z.infer<typeof updateSchema>;

export function updateCards(
  store: BoardStore,
  account: string,
  updates: Update[],
  knownIDs: Set<string>,
): BoardStore {
  if (updates.length < 1 || updates.length > 20) throw new Error("batchSize");
  if (new Set(updates.map((x) => x.id)).size !== updates.length)
    throw new Error("duplicate");
  const cards = { ...store.accounts[account] };
  for (const raw of updates) {
    const { id, ...patch } = updateSchema.parse(raw);
    if (!knownIDs.has(id)) throw new Error("unknownItem");
    cards[id] = { ...(cards[id] ?? emptyCard()), ...patch };
  }
  return { ...store, accounts: { ...store.accounts, [account]: cards } };
}

export function saveDraft(
  store: BoardStore,
  account: string,
  id: string,
  draft: Card["draft"],
): BoardStore {
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
  stargazers_count: z.number().default(0),
  open_issues_count: z.number().default(0),
  language: z.string().nullable().optional(),
  default_branch: z.string().default("main"),
  updated_at: z.string().default(""),
});

export const repoListSchema = z.array(repoItemSchema);

export function repoSummary(raw: z.infer<typeof repoItemSchema>) {
  return {
    fullName: raw.full_name,
    description: (raw.description ?? "").slice(0, 240),
    isPrivate: raw.private,
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
  pull_request: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type GhIssue = z.infer<typeof ghIssueSchema>;

export const searchResultSchema = z.object({
  total_count: z.number().int().nonnegative().default(0),
  items: z.array(ghIssueSchema).default([]),
});

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

export function itemSummary(item: GhIssue, fallbackRepo?: string) {
  const repo = extractRepoFullName(item, fallbackRepo);
  const id = `${repo}#${item.number}`;
  return {
    id,
    repo,
    number: item.number,
    kind: item.pull_request ? ("pr" as const) : ("issue" as const),
    title: item.title,
    state: item.state,
    isDraftPR: Boolean(item.draft),
    author: item.user?.login ?? "unknown",
    labels: item.labels.slice(0, 6).map((l) => ({
      name: l.name,
      color: l.color.replace(/^#/, ""),
    })),
    assignees: item.assignees.slice(0, 4).map((a) => a.login),
    commentCount: item.comments,
    updatedAt: item.updated_at,
    snippet: cleanMarkdownSnippet(item.body),
  };
}
export type ItemSummary = ReturnType<typeof itemSummary>;
