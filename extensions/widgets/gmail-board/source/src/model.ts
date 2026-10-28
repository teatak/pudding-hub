import { z } from "zod";

export const statuses = ["todo", "reply", "followUp", "done"] as const;
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const accountSchema = z.string().email().max(320);
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
    schemaVersion: z.literal(1),
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
  if (value === undefined) return { schemaVersion: 1, accounts: {} };
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

const headers = z
  .array(z.object({ name: z.string(), value: z.string() }))
  .default([]);
export type Part = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string };
  parts?: Part[];
};
const partSchema: z.ZodType<Part> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: headers.optional(),
    body: z
      .object({
        data: z.string().optional(),
        attachmentId: z.string().optional(),
      })
      .optional(),
    parts: z.array(partSchema).optional(),
  }),
);
export const threadSchema = z.object({
  id: idSchema,
  snippet: z.string().default(""),
  messages: z
    .array(
      z.object({
        id: idSchema,
        internalDate: z.string().regex(/^\d+$/),
        labelIds: z.array(z.string()).default([]),
        snippet: z.string().default(""),
        payload: partSchema,
      }),
    )
    .min(1),
});
export type Thread = z.infer<typeof threadSchema>;
export const listSchema = z.object({
  threads: z.array(z.object({ id: idSchema })).default([]),
  nextPageToken: z.string().optional(),
  resultSizeEstimate: z.number().optional(),
});
export function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes("&")) return str;
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  if (typeof DOMParser === "undefined") {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/\s+on\w+="[^"]*"/gi, "")
      .replace(/\s+on\w+='[^']*'/gi, "");
  }

  try {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");
    const dangerous = doc.querySelectorAll(
      "script,iframe,object,embed,form,input,button,select,textarea,meta,link,base,applet,frame,frameset",
    );
    dangerous.forEach((el) => el.remove());

    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
        } else if (
          (name === "href" || name === "src" || name === "action") &&
          (value.startsWith("javascript:") ||
            value.startsWith("data:text/html") ||
            value.startsWith("vbscript:"))
        ) {
          el.removeAttribute(attr.name);
        }
      }

      if (el.tagName.toLowerCase() === "a") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    return doc.body.innerHTML || "";
  } catch {
    return "";
  }
}

export function header(part: Part, name: string) {
  return (
    part.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}
export function threadSummary(thread: Thread) {
  const messages = [...thread.messages].sort(
    (a, b) => Number(a.internalDate) - Number(b.internalDate),
  );
  const last = messages[messages.length - 1];
  return {
    id: thread.id,
    subject: decodeHtmlEntities(header(last.payload, "Subject")),
    from: header(last.payload, "From"),
    snippet: decodeHtmlEntities((last.snippet || thread.snippet).slice(0, 300)),
    updatedAt: new Date(Number(last.internalDate)).toISOString(),
    messageCount: messages.length,
    unread: messages.some((m) => m.labelIds.includes("UNREAD")),
  };
}
export type Summary = ReturnType<typeof threadSummary>;
export function messageBody(part: Part): {
  text: string;
  html?: string;
  format: "plain" | "html" | "html-text" | "unavailable";
} {
  const leaves: Part[] = [];
  const visit = (p: Part) => {
    if (p.filename) return;
    if (p.body?.data) leaves.push(p);
    for (const c of p.parts ?? []) visit(c);
  };
  visit(part);
  const decode = (p: Part) =>
    new TextDecoder().decode(
      Uint8Array.from(
        atob(p.body!.data!.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      ),
    );
  const plain = leaves.filter((p) => p.mimeType === "text/plain");
  const htmlParts = leaves.filter((p) => p.mimeType === "text/html");

  const rawHtml = htmlParts.length
    ? htmlParts.map(decode).join("<hr />")
    : undefined;
  const sanitizedHtml = rawHtml ? sanitizeEmailHtml(rawHtml) : undefined;

  if (plain.length) {
    const text = plain.map(decode).join("\n");
    return {
      text,
      ...(sanitizedHtml ? { html: sanitizedHtml } : {}),
      format: sanitizedHtml ? "html" : "plain",
    };
  }
  if (rawHtml) {
    let text = "";
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");
      doc
        .querySelectorAll("script,style,iframe,object,svg")
        .forEach((e) => e.remove());
      doc
        .querySelectorAll("br,p,div,li,tr")
        .forEach((e) => e.append(doc.createTextNode("\n")));
      text = doc.body.textContent?.trim() ?? "";
    } else {
      text = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    return {
      text,
      ...(sanitizedHtml ? { html: sanitizedHtml } : {}),
      format: "html",
    };
  }
  return { text: "", format: "unavailable" };
}
