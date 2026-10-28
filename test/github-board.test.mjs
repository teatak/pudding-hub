import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(
  path.resolve(
    process.env.PUDDING_DESKTOP_DIR || "../pudding-desktop",
    "web/package.json",
  ),
);
const source = new URL("../extensions/widgets/github-board/source/src/", import.meta.url);

let saved,
  account,
  requests,
  gate,
  locale = "en",
  defs;

const mockIssue = (repo, number, isPR = false) => ({
  number,
  title: `${isPR ? "PR" : "Issue"} #${number} in ${repo}`,
  state: "open",
  draft: false,
  body: `Body description for ${repo}#${number}`,
  comments: 2,
  updated_at: `2026-10-25T10:0${number}:00Z`,
  repository_url: `https://api.github.com/repos/${repo}`,
  user: { login: account },
  labels: [{ name: "bug", color: "d73a4a" }],
  assignees: [{ login: account }],
  requested_reviewers: [],
  ...(isPR
    ? {
        pull_request: {
          url: `https://api.github.com/repos/${repo}/pulls/${number}`,
        },
      }
    : {}),
});

globalThis.__githubSDK = {
  query: async (name, p = {}, { signal } = {}) => {
    requests.push({ name, p });
    if (gate) await gate;
    signal?.throwIfAborted();
    if (name === "viewer") return { data: { login: account } };
    if (name === "repos") {
      return {
        data: [
          {
            id: 101,
            full_name: "teatak/pudding-core",
            description: "Core daemon",
            private: true,
            has_issues: true,
            stargazers_count: 88,
            open_issues_count: 4,
            language: "Go",
            default_branch: "main",
            updated_at: "2026-10-25T09:00:00Z",
          },
        ],
      };
    }
    if (name === "installations") {
      return {
        data: {
          installations: [{ id: 777 }],
        },
      };
    }
    if (name === "installationRepos") {
      return {
        data: {
          repositories: [
            {
              id: 102,
              full_name: "teatak/pudding-hub",
              description: "Widgets and plugins hub",
              private: false,
              has_issues: true,
              stargazers_count: 64,
              open_issues_count: 2,
              language: "TypeScript",
              default_branch: "main",
              updated_at: "2026-10-25T10:00:00Z",
            },
          ],
        },
      };
    }
    if (name === "repoIssues") {
      const fullRepo = `${p.owner}/${p.repo}`;
      if (p.page === 2) {
        return {
          data:
            fullRepo === "teatak/pudding-hub"
              ? [mockIssue("teatak/pudding-hub", 3, true)]
              : [],
        };
      }
      if (fullRepo === "teatak/pudding-core") {
        return {
          data: [
            mockIssue("teatak/pudding-core", 1, false),
            mockIssue("teatak/pudding-core", 2, true),
          ],
        };
      }
      return {
        data: [mockIssue(fullRepo, 3, true)],
      };
    }
    if (name === "repoPulls") {
      const fullRepo = `${p.owner}/${p.repo}`;
      return {
        data: [mockIssue(fullRepo, 2, true)],
      };
    }
    if (name === "itemDetail" || name === "pullDetail") {
      return {
        data: mockIssue(`${p.owner}/${p.repo}`, p.number, p.number === 2),
      };
    }
    if (name === "itemComments") {
      return {
        data: [
          {
            id: 5001,
            user: { login: "reviewer1" },
            created_at: "2026-10-25T11:00:00Z",
            body: `LGTM on #${p.number}`,
          },
        ],
      };
    }
    throw new Error(`Unexpected query: ${name}`);
  },
  storage: {
    read: async () => structuredClone(saved),
    write: async (v) => {
      assert.equal(v.expectedVersion, saved.version);
      saved = { version: saved.version + 1, data: structuredClone(v.data) };
      return structuredClone(saved);
    },
  },
  locale: { read: () => locale },
  defineInterface: (d) => {
    defs.set(d.name, d);
    return () => defs.delete(d.name);
  },
};

const hook = registerHooks({
  resolve(s, c, next) {
    if (s === "@pudding/widget")
      return {
        url: "data:text/javascript,export const pudding=globalThis.__githubSDK",
        shortCircuit: true,
      };
    if (["zod", "@tanstack/react-query"].includes(s))
      return {
        url: pathToFileURL(require.resolve(s)).href,
        shortCircuit: true,
      };
    if (
      c.parentURL?.startsWith(source.href) &&
      s.startsWith("./") &&
      !path.extname(s)
    )
      return next(s + ".ts", c);
    return next(s, c);
  },
});

const { createGitHubBoard, registerInterfaces } = await import(
  new URL("api.ts", source)
);
const { readStore, dateSchema, parseItemID, parseSearchQuery } = await import(
  new URL("model.ts", source)
);
const { messages } = await import(new URL("text.ts", source));
const { QueryClient } = await import(
  pathToFileURL(require.resolve("@tanstack/react-query"))
);
const { toJSONSchema } = await import(pathToFileURL(require.resolve("zod")));
hook.deregister();

const make = () =>
  createGitHubBoard(
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    }),
  );

let api;
const call = (name, input = {}) => {
  const d = defs.get(name);
  return d.run(d.input.parse(input), { signal: new AbortController().signal });
};

beforeEach(() => {
  saved = { version: 0, data: { unrelated: 42 } };
  account = "octocat";
  requests = [];
  gate = null;
  defs = new Map();
  locale = "en";
  api = make();
  registerInterfaces(api);
});

test("viewer account, combined user + installation repository listing, direct repoIssues/repoPulls reads, and taggedCards persistence across repo switches", async () => {
  const b = await call("getBoard");
  assert.equal(b.account, "octocat");
  assert.equal(b.loadedCount, 3);
  assert.equal(b.counts.triage, 3);
  assert.ok(!requests.some((r) => r.name === "itemDetail"));

  // Merges /user/repos ("teatak/pudding-core") and /user/installations ("teatak/pudding-hub")
  const reposRes = await call("listRepos", { account: "octocat" });
  assert.equal(reposRes.repos.length, 2);
  assert.equal(reposRes.repos[0].fullName, "teatak/pudding-hub");
  assert.equal(reposRes.repos[1].fullName, "teatak/pudding-core");

  // Move teatak/pudding-core#2 to "review" column
  await call("updateCards", {
    account: "octocat",
    expectedStorageVersion: 0,
    updates: [{ id: "teatak/pudding-core#2", status: "review", note: "Check PR" }],
  });

  // Switch query to ONLY teatak/pudding-hub — teatak/pudding-core#2 is STILL preserved in taggedCards with its meta!
  const hubOnly = await call("listItems", {
    account: "octocat",
    q: "repo:teatak/pudding-hub is:open",
    page: 1,
    limit: 20,
  });
  assert.equal(hubOnly.items.length, 1);
  assert.equal(hubOnly.items[0].id, "teatak/pudding-hub#3");
  assert.equal(hubOnly.taggedCards.length, 1);
  assert.equal(hubOnly.taggedCards[0].id, "teatak/pudding-core#2");
  assert.equal(hubOnly.taggedCards[0].title, "PR #2 in teatak/pudding-core");
  assert.equal(hubOnly.taggedCards[0].status, "review");

  const detail = await call("readItem", {
    account: "octocat",
    id: "teatak/pudding-core#1",
  });
  assert.equal(detail.body, "Body description for teatak/pudding-core#1");
  assert.equal(detail.comments.length, 1);
  assert.equal(detail.comments[0].body, "LGTM on #1");
});

test("same item IDs in two GitHub accounts retain separate drafts, notes and statuses across switching", async () => {
  await api.board();
  await api.edit(
    "octocat",
    0,
    [
      {
        id: "teatak/pudding-core#1",
        status: "review",
        note: "Octocat review note",
      },
    ],
    {
      id: "teatak/pudding-core#1",
      value: { kind: "approve", body: "Looks good to merge!" },
    },
  );

  account = "hubot";
  const b = make();
  const info = await b.board();
  assert.equal(info.counts.triage, 3);
  assert.equal(
    (await b.read("hubot", "teatak/pudding-core#1")).draft,
    null,
  );
  await b.edit(
    "hubot",
    1,
    [
      {
        id: "teatak/pudding-core#1",
        status: "done",
        note: "Hubot note",
      },
    ],
    {
      id: "teatak/pudding-core#1",
      value: { kind: "comment", body: "Hubot comment draft" },
    },
  );

  account = "octocat";
  const again = make();
  const a = await again.read("octocat", "teatak/pudding-core#1");
  assert.equal(a.draft.body, "Looks good to merge!");
  assert.equal(a.draft.kind, "approve");
  assert.equal(a.note, "Octocat review note");
  assert.equal(a.status, "review");
  assert.equal(saved.data.unrelated, 42);

  const before = structuredClone(saved);
  await assert.rejects(
    () =>
      again.edit("hubot", 2, [
        { id: "teatak/pudding-core#1", note: "wrong account edit" },
      ]),
    /wrongAccount/,
  );
  assert.deepEqual(saved, before);
});

test("atomic batch validation, conflicts, unknown and duplicate IDs never partially commit", async () => {
  await api.board();
  const before = structuredClone(saved);
  for (const updates of [
    [
      { id: "teatak/pudding-core#1", status: "done" },
      { id: "teatak/pudding-core#999", status: "done" },
    ],
    [
      { id: "teatak/pudding-core#1", note: "a" },
      { id: "teatak/pudding-core#1", note: "b" },
    ],
  ]) {
    await assert.rejects(() => api.edit("octocat", 0, updates));
  }
  await assert.rejects(
    () =>
      api.edit("octocat", 99, [
        { id: "teatak/pudding-core#1", status: "done" },
      ]),
    /conflict/,
  );
  assert.deepEqual(saved, before);

  const result = await api.edit("octocat", 0, [
    { id: "teatak/pudding-core#1", status: "inProgress" },
    { id: "teatak/pudding-core#2", followUpAt: "2026-12-31" },
  ]);
  assert.equal(saved.version, 1);
  assert.deepEqual(result.changedIDs, [
    "teatak/pudding-core#1",
    "teatak/pudding-core#2",
  ]);
});

test("canceling one UI reader does not abort a shared search or item detail read used by another caller", async () => {
  await api.viewer();
  for (const kind of ["list", "detail"]) {
    let release;
    gate = new Promise((r) => {
      release = r;
    });
    const canceled = new AbortController();
    const read = (signal) =>
      kind === "list"
        ? api.list("octocat", "repo:teatak/pudding-core is:open", 1, 20, signal)
        : api.read("octocat", "teatak/pudding-core#1", 1, 10, signal);
    const first = read(canceled.signal);
    const failure = assert.rejects(first, { name: "AbortError" });
    await new Promise((r) => setTimeout(r, 0));
    const second = read(new AbortController().signal);
    canceled.abort();
    release();
    await failure;
    const result = await second;
    assert.equal(result.account, "octocat");
    gate = null;
  }
});

test("all 7 interfaces serialize to JSON schema in all three locales and validate inputs strictly", () => {
  for (locale of ["en", "zh-CN", "zh-TW"]) {
    defs.clear();
    registerInterfaces(api);
    assert.equal(defs.size, 7);
    for (const def of defs.values()) {
      assert.ok(
        JSON.stringify(toJSONSchema(def.input, { io: "input" })).length < 16384,
      );
    }
    assert.deepEqual(Object.keys(messages[locale]), Object.keys(messages.en));
  }
  assert.deepEqual(parseItemID("teatak/pudding-core#42"), {
    owner: "teatak",
    repo: "pudding-core",
    number: 42,
  });
  const parsed = parseSearchQuery(
    "repo:teatak/pudding-core is:open is:pr author:@me",
    "octocat",
  );
  assert.equal(parsed.repo, "teatak/pudding-core");
  assert.equal(parsed.kind, "pr");
  assert.equal(parsed.author, "octocat");
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  assert.throws(() => readStore(null), /invalidData/);
});
