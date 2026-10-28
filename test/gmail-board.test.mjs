import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(
  path.resolve(
    process.env.PUDDING_DESKTOP_DIR || "../pudding-desktop",
    "web/package.json",
  ),
);
const source = new URL("../extensions/widgets/gmail-board/source/src/", import.meta.url);
let saved,
  account,
  requests,
  gate,
  locale = "en",
  defs;
const mail = (id, format) => ({
  id,
  snippet: "Summary " + id,
  messages: [
    {
      id: "m_" + id,
      internalDate: "1760000000000",
      labelIds: ["INBOX", "UNREAD"],
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "Subject", value: "Subject " + id },
          { name: "From", value: account },
        ],
        ...(format === "thread"
          ? {
              body: {
                data: Buffer.from("你好，正文 " + id).toString("base64url"),
              },
            }
          : {}),
      },
    },
  ],
});
globalThis.__gmailSDK = {
  query: async (name, p = {}, { signal } = {}) => {
    requests.push({ name, p });
    if (gate) await gate;
    signal?.throwIfAborted();
    if (name === "profile") return { data: { emailAddress: account } };
    if (name === "list")
      return {
        data: p.pageToken
          ? { threads: [{ id: "t3" }] }
          : { threads: [{ id: "t1" }, { id: "t2" }], nextPageToken: "next" },
      };
    return { data: mail(p.id, name) };
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
        url: "data:text/javascript,export const pudding=globalThis.__gmailSDK",
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
const { createMailbox, registerInterfaces } = await import(
  new URL("api.ts", source)
);
const { readStore, updateCards, dateSchema, messageBody } = await import(
  new URL("model.ts", source)
);
const { messages } = await import(new URL("text.ts", source));
const { QueryClient } = await import(
  pathToFileURL(require.resolve("@tanstack/react-query"))
);
const { toJSONSchema } = await import(pathToFileURL(require.resolve("zod")));
hook.deregister();
const make = () =>
  createMailbox(
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
  account = "a@example.com";
  requests = [];
  gate = null;
  defs = new Map();
  locale = "en";
  api = make();
  registerInterfaces(api);
});
test("connection account, compact reads, pagination and bodies on demand", async () => {
  const b = await call("getBoard");
  assert.equal(b.account, account);
  assert.equal(b.loadedCount, 2);
  assert.equal(b.counts.todo, 2);
  assert.equal(b.nextCursor, "next");
  assert.ok(!requests.some((r) => r.name === "thread"));
  assert.ok(JSON.stringify(b).length < 400);
  const p = await call("listThreads", { account, cursor: "next" });
  assert.equal(p.items[0].id, "t3");
  assert.equal(p.nextCursor, null);
  const r = await call("readThread", { account, id: "t1" });
  assert.equal(r.messages[0].text, "你好，正文 t1");
  assert.equal(saved.version, 0);
});
test("same thread IDs in two accounts retain separate drafts, notes and status across switching back", async () => {
  await api.board();
  await api.edit(account, 0, [{ id: "t1", status: "reply", note: "A note" }], {
    id: "t1",
    value: { subject: "A subject", body: "A private draft" },
  });
  account = "b@example.com";
  const b = make();
  const info = await b.board();
  assert.equal(info.counts.todo, 2);
  assert.equal((await b.read(account, "t1")).draft, null);
  await b.edit(account, 1, [{ id: "t1", status: "done", note: "B note" }], {
    id: "t1",
    value: { subject: "B subject", body: "B private draft" },
  });
  account = "a@example.com";
  const again = make();
  const a = await again.read(account, "t1");
  assert.equal(a.draft.body, "A private draft");
  assert.equal(a.note, "A note");
  assert.equal(a.status, "reply");
  assert.equal(saved.data.unrelated, 42);
  const before = structuredClone(saved);
  await assert.rejects(
    () => again.edit("b@example.com", 2, [{ id: "t1", note: "bad" }]),
    /wrongAccount/,
  );
  assert.deepEqual(saved, before);
});
test("atomic batch validation, conflicts, unknown and duplicate IDs never partially commit", async () => {
  await api.board();
  const before = structuredClone(saved);
  for (const updates of [
    [
      { id: "t1", status: "done" },
      { id: "missing", status: "done" },
    ],
    [
      { id: "t1", note: "a" },
      { id: "t1", note: "b" },
    ],
  ])
    await assert.rejects(() => api.edit(account, 0, updates));
  await assert.rejects(
    () => api.edit(account, 99, [{ id: "t1", status: "done" }]),
    /conflict/,
  );
  assert.deepEqual(saved, before);
  const result = await api.edit(account, 0, [
    { id: "t1", status: "done" },
    { id: "t2", followUpAt: "2026-12-31" },
  ]);
  assert.equal(saved.version, 1);
  assert.deepEqual(result.changedIDs, ["t1", "t2"]);
  assert.ok(JSON.stringify(result).length < 150);
});
test("aborted old-binding reads and writes do not publish or commit", async () => {
  let release;
  gate = new Promise((r) => (release = r));
  const abort = new AbortController();
  const pending = api.list(account, "in:inbox", "", 20, abort.signal);
  abort.abort();
  release();
  await assert.rejects(pending, { name: "AbortError" });
  gate = null;
  await api.board();
  await assert.rejects(
    () =>
      api.edit(
        account,
        0,
        [{ id: "t1", status: "done" }],
        undefined,
        abort.signal,
      ),
    { name: "AbortError" },
  );
  assert.equal(saved.version, 0);
});
test("malformed storage is reported, never reset; saved data is bounded", async () => {
  saved.data.gmailBoard = { schemaVersion: 999 };
  await assert.rejects(() => api.board(), /invalidData/);
  assert.equal(saved.version, 0);
  saved.data.gmailBoard = { schemaVersion: 1, accounts: {} };
  saved.data.other = "x".repeat(262144);
  await api.page(account);
  await assert.rejects(
    () => api.edit(account, 0, [{ id: "t1", status: "done" }]),
    /storageLimit/,
  );
  assert.equal(saved.version, 0);
});
test("draft clearing, Gmail refresh retain local organization and require fresh storage version", async () => {
  await api.board();
  await call("saveReplyDraft", {
    account,
    id: "t1",
    expectedStorageVersion: 0,
    draft: { subject: "Re: test", body: "local only" },
  });
  await call("refreshMailbox", { account });
  assert.equal((await api.read(account, "t1")).draft.body, "local only");
  await call("saveReplyDraft", {
    account,
    id: "t1",
    expectedStorageVersion: 1,
    draft: null,
  });
  assert.equal((await api.read(account, "t1")).draft, null);
  assert.ok(
    requests.every((r) =>
      ["profile", "list", "metadata", "thread"].includes(r.name),
    ),
  );
});
test("all interfaces serialize to JSON schema in all three locales; invalid fields rejected", () => {
  for (locale of ["en", "zh-CN", "zh-TW"]) {
    defs.clear();
    registerInterfaces(api);
    assert.equal(defs.size, 6);
    for (const def of defs.values())
      assert.ok(
        JSON.stringify(toJSONSchema(def.input, { io: "input" })).length < 16384,
      );
    assert.deepEqual(Object.keys(messages[locale]), Object.keys(messages.en));
  }
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  assert.throws(() =>
    defs.get("saveReplyDraft").input.parse({
      account,
      id: "t1",
      expectedStorageVersion: 0,
      draft: { subject: "", body: "x".repeat(8001) },
    }),
  );
  assert.throws(() =>
    defs.get("updateCards").input.parse({
      account,
      expectedStorageVersion: 0,
      updates: [{ id: "t1" }],
    }),
  );
  assert.throws(() => readStore(null), /invalidData/);
});
test("multipart plain text prefers body over attachments and decodes base64url UTF-8", () => {
  const data = (s) => Buffer.from(s).toString("base64url");
  assert.deepEqual(
    messageBody({
      mimeType: "multipart/mixed",
      parts: [
        { mimeType: "text/plain", body: { data: data("您好 🌤") } },
        {
          filename: "secret.txt",
          mimeType: "text/plain",
          body: { data: data("attachment") },
        },
      ],
    }),
    { text: "您好 🌤", format: "plain" },
  );
});

test("multipart html email extracts both text and sanitized html", () => {
  const data = (s) => Buffer.from(s).toString("base64url");
  const res = messageBody({
    mimeType: "multipart/alternative",
    parts: [
      { mimeType: "text/plain", body: { data: data("Plain text") } },
      {
        mimeType: "text/html",
        body: {
          data: data(
            '<div style="color:red"><script>alert(1)</script><p>Hello HTML</p></div>',
          ),
        },
      },
    ],
  });
  assert.equal(res.text, "Plain text");
  assert.equal(res.format, "html");
  assert.ok(res.html.includes("<p>Hello HTML</p>"));
  assert.ok(!res.html.includes("<script>"));
});

test("canceling one UI reader does not abort a shared mailbox or message read used by another caller", async () => {
  await api.profile();
  for (const kind of ["page", "message"]) {
    let release;
    gate = new Promise((r) => {
      release = r;
    });
    const canceled = new AbortController();
    const read = (signal) =>
      kind === "page"
        ? api.list(account, "in:inbox", "", 20, signal)
        : api.read(account, "t1", 0, 5, signal);
    const first = read(canceled.signal);
    const failure = assert.rejects(first, { name: "AbortError" });
    // Let the first reader create the shared request before the second attaches.
    await new Promise((r) => setTimeout(r, 0));
    const second = read(new AbortController().signal);
    canceled.abort();
    release();
    await failure;
    const result = await second;
    assert.equal(result.account, account);
    gate = null;
  }
});
test("cards use the most recent Gmail message snippet when the thread omits snippet", async () => {
  const { threadSummary, threadSchema } = await import(
    new URL("model.ts", source)
  );
  const data = mail("t1", "metadata");
  delete data.snippet;
  data.messages[0].snippet = "Actual Gmail message summary";
  assert.equal(
    threadSummary(threadSchema.parse(data)).snippet,
    "Actual Gmail message summary",
  );
});
