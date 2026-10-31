import auxiliary from "./extra-ui.json" with { type: "json" };
import extra from "./locales.json" with { type: "json" };
export type WidgetLocale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko" | "es" | "de" | "fr";
export function normalizeLocale(raw?: string): WidgetLocale {
  const locale = (raw || "en").toLowerCase();
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(locale)) return "zh-TW";
  if (locale === "zh" || locale.startsWith("zh-")) return "zh-CN";
  const language = locale.split("-")[0];
  return language === "ja" || language === "ko" || language === "es" || language === "de" || language === "fr" ? language : "en";
}

export type Locale = WidgetLocale;

export const translations = {
  "zh-CN": {
    title: "群晖文件",
    shares: "共享文件夹",
    allFiles: "全部文件",
    searchPlaceholder: "在群晖中搜索文件或文件夹...",
    searching: "正在搜索群晖索引...",
    noFiles: "此目录下暂无文件",
    noSearchResults: "未找到匹配的文件",
    loading: "正在连接群晖加载内容...",
    error: "连接群晖失败",
    retry: "重试",
    details: "错误详情",
    copy: "复制",
    copied: "已复制",
    copyPath: "复制路径",
    pathCopied: "文件路径已复制到剪贴板",
    download: "下载",
    openFolder: "打开目录",
    parentDir: "返回上级",
    root: "根目录",
    itemsCount: "{count} 个项目",
    searchCount: "找到 {count} 个匹配项",
    sortByName: "名称",
    sortByDate: "修改日期",
    sortBySize: "大小",
    typeFolder: "文件夹",
    typeFile: "文件",
    connected: "群晖在线",
    offline: "未连接",
    notConnectedTitle: "未检测到群晖 NAS 连接",
    notConnectedDesc: "请先在「插件 (Plugins) → 群晖 NAS」中配置您的 NAS 地址与 Session Token。",
  },
  "zh-TW": {
    title: "Synology 檔案",
    shares: "共用資料夾",
    allFiles: "全部檔案",
    searchPlaceholder: "在 Synology 中搜尋檔案或資料夾...",
    searching: "正在搜尋 Synology 索引...",
    noFiles: "此目錄下暫無檔案",
    noSearchResults: "未找到相符的檔案",
    loading: "正在連線 Synology 載入內容...",
    error: "連線 Synology 失敗",
    retry: "重試",
    details: "錯誤詳情",
    copy: "複製",
    copied: "已複製",
    copyPath: "複製路徑",
    pathCopied: "檔案路徑已複製到剪貼簿",
    download: "下載",
    openFolder: "開啟目錄",
    parentDir: "返回上一層",
    root: "根目錄",
    itemsCount: "{count} 個項目",
    searchCount: "找到 {count} 個相符項",
    sortByName: "名稱",
    sortByDate: "修改日期",
    sortBySize: "大小",
    typeFolder: "資料夾",
    typeFile: "檔案",
    connected: "Synology 連線正常",
    offline: "未連線",
    notConnectedTitle: "未偵測到 Synology NAS 連線",
    notConnectedDesc: "請先在「外掛 (Plugins) → Synology NAS」中設定您的 NAS 位址與 Session Token。",
  },
  en: {
    title: "Synology Files",
    shares: "Shared Folders",
    allFiles: "All Files",
    searchPlaceholder: "Search files or folders in Synology...",
    searching: "Searching Synology index...",
    noFiles: "No files in this folder",
    noSearchResults: "No matching files found",
    loading: "Connecting to Synology NAS...",
    error: "Failed to connect to Synology NAS",
    retry: "Retry",
    details: "Error Details",
    copy: "Copy",
    copied: "Copied",
    copyPath: "Copy Path",
    pathCopied: "File path copied to clipboard",
    download: "Download",
    openFolder: "Open Folder",
    parentDir: "Up one level",
    root: "Root",
    itemsCount: "{count} items",
    searchCount: "{count} matching items found",
    sortByName: "Name",
    sortByDate: "Date Modified",
    sortBySize: "Size",
    typeFolder: "Folder",
    typeFile: "File",
    connected: "NAS Online",
    offline: "Disconnected",
    notConnectedTitle: "No Synology NAS Connection Found",
    notConnectedDesc: "Please configure your Synology NAS connection in Plugins → Synology NAS first.",
  },

  ja: extra.ja.messages,
  ko: extra.ko.messages,
  es: extra.es.messages,
  de: extra.de.messages,
  fr: extra.fr.messages,
};

let currentLocale: Locale = "en";

export function setLocale(raw?: string) { currentLocale = normalizeLocale(raw); }

export function t(key: keyof typeof translations["zh-CN"], params?: Record<string, string | number>): string {
  const dict = translations[currentLocale] || translations.en;
  let str = dict[key] || translations.en[key] || key;
  str = str.replace(/\{(\w+)\}/g, (token, key) => params && Object.hasOwn(params, key) ? String(params[key]) : token);
  return str;
}

export function errorText(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function ui(key: keyof typeof auxiliary.en, params?: Record<string, string | number>): string {
  const value = auxiliary[currentLocale][key] ?? auxiliary.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (token, name) => params && Object.hasOwn(params, name) ? String(params[name]) : token);
}
