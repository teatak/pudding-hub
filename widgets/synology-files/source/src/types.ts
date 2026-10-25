import { z } from "zod";

export const fileItemSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isdir: z.boolean(),
  size: z.number().int().nonnegative().optional().default(0),
  mtime: z.number().int().optional().default(0),
  fileType: z.string().optional(),
});

export type FileItem = z.infer<typeof fileItemSchema>;

export const shareFolderSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isdir: z.literal(true).default(true),
  desc: z.string().optional().default(""),
});

export type ShareFolder = z.infer<typeof shareFolderSchema>;

export const synologyStoreSchema = z.object({
  currentPath: z.string().default("/"),
  selectedShare: z.string().default(""),
  recentPaths: z.array(z.string()).max(10).default([]),
  sortBy: z.enum(["name", "mtime", "size"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type SynologyStore = z.infer<typeof synologyStoreSchema>;

export type FileCategory =
  | "folder"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "other";

export function getFileCategory(name: string, isdir: boolean): FileCategory {
  if (isdir) return "folder";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf", "doc", "docx", "txt", "rtf", "odt", "pages", "xls", "xlsx", "ppt", "pptx", "md", "csv"].includes(ext)) {
    return "document";
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "heic", "raw"].includes(ext)) {
    return "image";
  }
  if (["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"].includes(ext)) {
    return "audio";
  }
  if (["zip", "tar", "gz", "7z", "rar", "bz2", "xz", "iso", "dmg"].includes(ext)) {
    return "archive";
  }
  if (["ts", "tsx", "js", "jsx", "json", "html", "css", "py", "go", "rs", "java", "c", "cpp", "h", "sh", "yaml", "yml", "sql"].includes(ext)) {
    return "code";
  }
  return "other";
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const normalizedIndex = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, normalizedIndex);
  return `${val < 10 && normalizedIndex > 0 ? val.toFixed(1) : Math.round(val)} ${units[normalizedIndex]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
