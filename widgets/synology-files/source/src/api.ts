import { pudding, type JSONValue } from "@pudding/widget";
import { z } from "zod";
import {
  shareFolderSchema,
  fileItemSchema,
  synologyStoreSchema,
  type ShareFolder,
  type FileItem,
  type SynologyStore,
} from "./types";
import { t, errorText } from "./text";

export const DEFAULT_STORE: SynologyStore = {
  currentPath: "/",
  selectedShare: "",
  recentPaths: ["/"],
  sortBy: "name",
  sortOrder: "asc",
};

export async function readStore(signal?: AbortSignal): Promise<{ store: SynologyStore; version: number }> {
  try {
    const raw = await pudding.storage.read({ signal });
    const parsed = synologyStoreSchema.safeParse(raw.data?.synologyFiles);
    return {
      store: parsed.success ? parsed.data : DEFAULT_STORE,
      version: raw.version,
    };
  } catch {
    return { store: DEFAULT_STORE, version: 0 };
  }
}

export async function writeStore(
  next: SynologyStore,
  expectedVersion: number,
  signal?: AbortSignal,
): Promise<number> {
  const current = await pudding.storage.read({ signal });
  const data = {
    ...current.data,
    synologyFiles: next as unknown as JSONValue,
  };
  const saved = await pudding.storage.write({
    expectedVersion,
    data,
  });
  return saved.version;
}

export async function fetchShares(signal?: AbortSignal): Promise<ShareFolder[]> {
  const res = await pudding.query("listShares", {}, { signal });
  return z.array(shareFolderSchema).parse(res.data);
}

export async function fetchFiles(
  folderPath: string,
  sortBy: "name" | "mtime" | "size" = "name",
  sortOrder: "asc" | "desc" = "asc",
  signal?: AbortSignal,
): Promise<FileItem[]> {
  const res = await pudding.query(
    "listFiles",
    { folderPath, sortBy, sortOrder },
    { signal },
  );
  return z.array(fileItemSchema).parse(res.data);
}

export async function searchFiles(
  folderPath: string,
  keyword: string,
  signal?: AbortSignal,
): Promise<FileItem[]> {
  const query = keyword.trim();
  if (!query) return [];
  const res = await pudding.query(
    "searchFiles",
    { folderPath, query },
    { signal },
  );
  return z.array(fileItemSchema).parse(res.data);
}

export function registerInterfaces() {
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
      name: "listShares",
      description: "List accessible Synology NAS shared folders",
      input: z.object({}).strict(),
      run: wrap((_, s) => fetchShares(s)),
    }),
    pudding.defineInterface({
      name: "listFiles",
      description: "List directory contents (files and folders) within a Synology NAS path",
      input: z
        .object({
          folderPath: z.string().default("/"),
          sortBy: z.enum(["name", "mtime", "size"]).default("name"),
          sortOrder: z.enum(["asc", "desc"]).default("asc"),
        })
        .strict(),
      run: wrap((i, s) => fetchFiles(i.folderPath, i.sortBy, i.sortOrder, s)),
    }),
    pudding.defineInterface({
      name: "searchFiles",
      description: "Search Synology NAS files across directories by keyword",
      input: z
        .object({
          folderPath: z.string().default("/"),
          query: z.string().min(1).max(200),
        })
        .strict(),
      run: wrap((i, s) => searchFiles(i.folderPath, i.query, s)),
    }),
    pudding.defineInterface({
      name: "getBoardState",
      description: "Get the current Synology Files board path and preferences",
      input: z.object({}).strict(),
      run: wrap(async (_, s) => {
        const { store } = await readStore(s);
        return store;
      }),
    }),
  ];
}
