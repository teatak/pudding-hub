import { useState, useMemo, useEffect, useRef } from "react";
import { useStorage, useWidgetLocale } from "@pudding/widget";
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  Search,
  X,
  ChevronRight,
  Copy,
  Check,
  Download,
  HardDrive,
  CornerLeftUp,
  RefreshCw,
} from "lucide-react";
import {
  type ShareFolder,
  type FileItem,
  type FileCategory,
  type SynologyStore,
  getFileCategory,
  formatBytes,
  formatDate,
} from "./types";
import {
  DEFAULT_STORE,
  fetchShares,
  fetchFiles,
  searchFiles,
  writeStore,
  registerInterfaces,
} from "./api";
import { t, setLocale } from "./text";
import "./style.css";

function FileIcon({ category, size = 18 }: { category: FileCategory; size?: number }) {
  switch (category) {
    case "folder":
      return <Folder size={size} color="#0284c7" fill="#0284c7" fillOpacity={0.15} />;
    case "document":
      return <FileText size={size} color="#2563eb" />;
    case "image":
      return <ImageIcon size={size} color="#16a34a" />;
    case "video":
      return <Video size={size} color="#9333ea" />;
    case "audio":
      return <Music size={size} color="#ea580c" />;
    case "archive":
      return <Archive size={size} color="#d97706" />;
    case "code":
      return <Code size={size} color="#4f46e5" />;
    default:
      return <File size={size} color="#64748b" />;
  }
}

export function App() {
  const locale = useWidgetLocale();
  useEffect(() => {
    setLocale(locale);
  }, [locale]);

  const storage = useStorage();
  const store = (storage.data?.data?.synologyFiles as SynologyStore) ?? DEFAULT_STORE;
  const storageVersion = storage.data?.version ?? 0;

  const [shares, setShares] = useState<ShareFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const currentPath = store.currentPath || "/";
  const sortBy = store.sortBy || "name";
  const sortOrder = store.sortOrder || "asc";

  // Register interfaces for AI Agent execution
  useEffect(() => {
    registerInterfaces();
  }, []);

  // Fetch accessible share folders on mount
  useEffect(() => {
    let cancelled = false;
    void fetchShares().then((res) => {
      if (!cancelled) setShares(res);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch directory files or search results
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (searchQuery.trim()) {
      void searchFiles(currentPath, searchQuery).then((res) => {
        if (!cancelled) {
          setFiles(res);
          setLoading(false);
        }
      });
    } else {
      void fetchFiles(currentPath, sortBy, sortOrder).then((res) => {
        if (!cancelled) {
          setFiles(res);
          setLoading(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [currentPath, searchQuery, sortBy, sortOrder]);

  const navigateTo = (path: string) => {
    const clean = path.replace(/\/+$/, "") || "/";
    void writeStore(
      {
        ...store,
        currentPath: clean,
      },
      storageVersion,
    );
  };

  const handleCopyPath = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const breadcrumbs = useMemo(() => {
    if (currentPath === "/") return [{ name: t("root"), path: "/" }];
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs = [{ name: t("root"), path: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.isdir !== b.isdir) {
        return a.isdir ? -1 : 1; // Folders always first
      }
      if (sortBy === "size") {
        return sortOrder === "asc" ? a.size - b.size : b.size - a.size;
      }
      if (sortBy === "mtime") {
        return sortOrder === "asc" ? a.mtime - b.mtime : b.mtime - a.mtime;
      }
      return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [files, sortBy, sortOrder]);

  return (
    <div className="syno-container">
      {/* Top Header */}
      <header className="syno-header">
        <div className="syno-brand">
          <HardDrive size={18} color="#0284c7" />
          <span>{t("title")}</span>
          <span className="syno-status-badge">
            <span className="syno-status-dot" />
            {t("connected")}
          </span>
        </div>

        <div className="syno-search-bar">
          <Search size={14} color="#94a3b8" />
          <input
            className="syno-search-input"
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="syno-search-clear"
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <select
          className="syno-sort-select"
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split("-") as [
              "name" | "mtime" | "size",
              "asc" | "desc",
            ];
            void writeStore(
              { ...store, sortBy: by, sortOrder: order },
              storageVersion,
            );
          }}
        >
          <option value="name-asc">{t("sortByName")} (A-Z)</option>
          <option value="name-desc">{t("sortByName")} (Z-A)</option>
          <option value="mtime-desc">{t("sortByDate")} (最新)</option>
          <option value="mtime-asc">{t("sortByDate")} (最早)</option>
          <option value="size-desc">{t("sortBySize")} (从大到小)</option>
          <option value="size-asc">{t("sortBySize")} (从小到大)</option>
        </select>
      </header>

      {/* Navigation Section */}
      <section className="syno-nav-section">
        {/* Breadcrumbs */}
        <div className="syno-breadcrumbs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={crumb.path} style={{ display: "inline-flex", alignItems: "center" }}>
                <button
                  type="button"
                  className={`syno-crumb ${isLast ? "is-current" : ""}`}
                  onClick={() => navigateTo(crumb.path)}
                  disabled={isLast}
                >
                  {crumb.name}
                </button>
                {!isLast && <ChevronRight size={12} className="syno-crumb-sep" />}
              </span>
            );
          })}
        </div>

        {/* Shares quick chips */}
        <div className="syno-shares-bar">
          {shares.map((share) => {
            const isActive = currentPath === share.path || currentPath.startsWith(`${share.path}/`);
            return (
              <button
                key={share.path}
                type="button"
                className={`syno-share-chip ${isActive ? "is-active" : ""}`}
                onClick={() => navigateTo(share.path)}
              >
                <Folder size={12} />
                <span>{share.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main File List View */}
      <main className="syno-content-area">
        {loading ? (
          <div className="syno-empty-state">
            <RefreshCw size={24} className="animate-spin" />
            <span>{searchQuery ? t("searching") : t("loading")}</span>
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="syno-empty-state">
            <Folder size={36} color="#94a3b8" />
            <span>{searchQuery ? t("noSearchResults") : t("noFiles")}</span>
          </div>
        ) : (
          <div className="syno-file-list">
            {currentPath !== "/" && !searchQuery ? (
              <div
                className="syno-file-row"
                onClick={() => {
                  const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
                  navigateTo(parent);
                }}
              >
                <div className="syno-file-main">
                  <div className="syno-file-icon">
                    <CornerLeftUp size={16} color="#64748b" />
                  </div>
                  <span className="syno-file-name">.. ({t("parentDir")})</span>
                </div>
              </div>
            ) : null}

            {sortedFiles.map((file) => {
              const category = getFileCategory(file.name, file.isdir);
              return (
                <div
                  key={file.path}
                  className="syno-file-row"
                  onClick={() => {
                    if (file.isdir) {
                      navigateTo(file.path);
                    }
                  }}
                >
                  <div className="syno-file-main">
                    <div className="syno-file-icon">
                      <FileIcon category={category} />
                    </div>
                    <div className="syno-file-info">
                      <span className="syno-file-name" title={file.name}>
                        {file.name}
                      </span>
                      {searchQuery ? (
                        <span className="syno-file-path-sub">{file.path}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="syno-file-meta">
                    <span>{file.isdir ? t("typeFolder") : formatBytes(file.size)}</span>
                    <span>{formatDate(file.mtime)}</span>
                    <div className="syno-file-actions">
                      <button
                        type="button"
                        className="syno-action-btn"
                        title={copiedPath === file.path ? t("copied") : t("copyPath")}
                        onClick={(e) => handleCopyPath(file.path, e)}
                      >
                        {copiedPath === file.path ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      </button>
                      {!file.isdir ? (
                        <button
                          type="button"
                          className="syno-action-btn"
                          title={t("download")}
                          onClick={(e) => {
                            e.stopPropagation();
                            // In desktop environment, triggers native external open/download
                            const dummyUrl = `synology-download://${file.path}`;
                            window.open?.(dummyUrl, "_blank");
                          }}
                        >
                          <Download size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Status */}
      <footer className="syno-footer">
        <span>
          {searchQuery
            ? t("searchCount", { count: sortedFiles.length })
            : t("itemsCount", { count: sortedFiles.length })}
        </span>
        <span>{currentPath}</span>
      </footer>
    </div>
  );
}

export default App;
