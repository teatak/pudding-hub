export type Locale = "en" | "zh-CN" | "zh-TW";

export const DICTIONARY = {
  "zh-CN": {
    appTitle: "多彩便签",
    appSubtitle: "记录灵感、清单与便签贴纸",
    totalNotes: "{count} 条便签",
    pinnedSection: "置顶便签",
    otherSection: "全部便签",
    addPlaceholder: "写点什么...",
    addTitlePlaceholder: "标题（选填）",
    addBtn: "添加便签",
    editBtn: "保存",
    cancelBtn: "取消",
    searchPlaceholder: "搜索便签...",
    emptyNotes: "暂无便签，点击上方记录第一条便签吧！",
    emptySearch: "未找到匹配的便签",
    pin: "置顶便签",
    unpin: "取消置顶",
    edit: "编辑",
    delete: "删除",
    clearAll: "清空全部",
    clearConfirm: "确定要清空所有便签吗？此操作无法撤销。",
    colorYellow: "便签黄",
    colorPink: "樱花粉",
    colorGreen: "薄荷绿",
    colorBlue: "天空蓝",
    colorPurple: "香芋紫",
    titleError: "标题不能超过 100 个字符",
    contentError: "便签内容不能为空且不能超过 2000 个字符",
    batchError: "便签列表不能为空且不能超过 100 条",
    descAdd: "添加一条或多条便签",
    descUpdate: "修改便签的标题、内容、颜色或置顶状态",
    descTogglePin: "切换便签的置顶状态",
    descDelete: "删除一条或多条便签",
    descClear: "清空所有便签",
    cancelled: "操作已取消",
    unknownError: "发生未知错误",
  },
  "zh-TW": {
    appTitle: "多彩便簽",
    appSubtitle: "記錄靈感、清單與便簽貼紙",
    totalNotes: "{count} 條便簽",
    pinnedSection: "置頂便簽",
    otherSection: "全部便簽",
    addPlaceholder: "寫點什麼...",
    addTitlePlaceholder: "標題（選填）",
    addBtn: "加入便簽",
    editBtn: "儲存",
    cancelBtn: "取消",
    searchPlaceholder: "搜尋便簽...",
    emptyNotes: "暫無便簽，點擊上方記錄第一條便簽吧！",
    emptySearch: "未找到符合的便簽",
    pin: "置頂便簽",
    unpin: "取消置頂",
    edit: "編輯",
    delete: "刪除",
    clearAll: "清空全部",
    clearConfirm: "確定要清空所有便簽嗎？此操作無法復原。",
    colorYellow: "便簽黃",
    colorPink: "櫻花粉",
    colorGreen: "薄荷綠",
    colorBlue: "天空藍",
    colorPurple: "香芋紫",
    titleError: "標題不能超過 100 個字元",
    contentError: "便簽內容不能為空且不能超過 2000 個字元",
    batchError: "便簽列表不能為空且不能超過 100 條",
    descAdd: "加入一條或多條便簽",
    descUpdate: "修改便簽的標題、內容、顏色或置頂狀態",
    descTogglePin: "切換便簽的置頂狀態",
    descDelete: "刪除一條或多條便簽",
    descClear: "清空所有便簽",
    cancelled: "操作已取消",
    unknownError: "發生未知錯誤",
  },
  en: {
    appTitle: "Sticky Notes",
    appSubtitle: "Color-coded memos, ideas and quick notes",
    totalNotes: "{count} notes",
    pinnedSection: "Pinned",
    otherSection: "Notes",
    addPlaceholder: "Write something down...",
    addTitlePlaceholder: "Title (optional)",
    addBtn: "Add note",
    editBtn: "Save",
    cancelBtn: "Cancel",
    searchPlaceholder: "Search notes...",
    emptyNotes: "No notes yet. Create your first sticky note above!",
    emptySearch: "No notes matching your search",
    pin: "Pin note",
    unpin: "Unpin note",
    edit: "Edit",
    delete: "Delete",
    clearAll: "Clear all",
    clearConfirm: "Are you sure you want to delete all notes? This cannot be undone.",
    colorYellow: "Yellow",
    colorPink: "Pink",
    colorGreen: "Green",
    colorBlue: "Blue",
    colorPurple: "Purple",
    titleError: "Title cannot exceed 100 characters",
    contentError: "Note content cannot be empty or exceed 2000 characters",
    batchError: "Note list cannot be empty or exceed 100 items",
    descAdd: "Add one or more sticky notes",
    descUpdate: "Update title, content, color or pin status of sticky notes",
    descTogglePin: "Toggle the pinned status of a sticky note",
    descDelete: "Delete one or more sticky notes",
    descClear: "Clear all sticky notes",
    cancelled: "Operation cancelled",
    unknownError: "An unexpected error occurred",
  },
} as const;

export type MessageKey = keyof (typeof DICTIONARY)["en"];

let currentLocale: Locale = "zh-CN";

export function setLocale(locale?: string) {
  if (locale === "zh-TW" || locale === "en") {
    currentLocale = locale;
  } else {
    currentLocale = "zh-CN";
  }
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const dict = DICTIONARY[currentLocale] || DICTIONARY["zh-CN"];
  let text: string = dict[key] || DICTIONARY.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return t("unknownError");
}
