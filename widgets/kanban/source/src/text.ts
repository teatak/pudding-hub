import { pudding } from "@pudding/widget";

export const messages = {
  en: {
    title: "Kanban",
    todo: "To Do",
    inProgress: "In Progress",
    done: "Done",
    addCard: "Add card",
    addCardPlaceholder: "Card title…",
    cardCount: "{count} cards",
    oneCard: "1 card",
    emptyColumn: "No cards",
    clearCompleted: "Clear completed",
    clearCompletedConfirm: "Clear all completed cards?",
    clearedCompleted: "Cleared completed cards",
    moveLeft: "Move left",
    moveRight: "Move right",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    retry: "Refresh",
    saved: "Saved",
    added: "Card added",
    deleted: "Card deleted",
    moved: "Card moved",
    loading: "Loading board…",
    invalidData:
      "Saved board could not be read. Refresh to try again; your data has not been changed.",
    conflict:
      "The board changed in another window. Refresh, review it and try again.",
    titleError: "Use 1–300 characters for the title",
    batchError: "Choose 1–100 cards",
    missing: "Card no longer exists",
    duplicate: "Each card may appear only once",
    updateError: "Provide a title or column",
    columnError: "Invalid column. Use todo, in_progress, or done",
    descAdd:
      "Add 1–100 cards to the board. Accepts title, column ('todo'|'in_progress'|'done', default 'todo'), and optional description.",
    descMove:
      "Move a card to another column ('todo'|'in_progress'|'done') with optional targetIndex.",
    descUpdate:
      "Update 1–100 cards by ID, modifying title, description, or column.",
    descDelete:
      "Delete 1–100 cards by ID.",
    descClearCompleted:
      "Delete all cards in the 'done' column in one atomic write.",
    descList:
      "List cards from the board, optionally filtered by column ('todo'|'in_progress'|'done'|'all').",
  },
  "zh-CN": {
    title: "看板",
    todo: "待处理",
    inProgress: "进行中",
    done: "已完成",
    addCard: "添加卡片",
    addCardPlaceholder: "卡片标题…",
    cardCount: "{count} 张卡片",
    oneCard: "1 张卡片",
    emptyColumn: "暂无卡片",
    clearCompleted: "清理已完成",
    clearCompletedConfirm: "确定清理所有已完成卡片？",
    clearedCompleted: "已清理已完成卡片",
    moveLeft: "移至上一列",
    moveRight: "移至下一列",
    edit: "编辑",
    delete: "删除",
    save: "保存",
    cancel: "取消",
    retry: "刷新",
    saved: "已保存",
    added: "已添加卡片",
    deleted: "已删除卡片",
    moved: "已移动卡片",
    loading: "正在读取看板…",
    invalidData: "无法读取看板数据，请刷新重试。原有数据未被修改。",
    conflict: "看板已在其他窗口更新，请刷新核对后再操作。",
    titleError: "卡片标题请填写 1–300 个字符",
    batchError: "每批请选择 1–100 张卡片",
    missing: "该卡片已不存在",
    duplicate: "同一批中不能重复指定卡片",
    updateError: "请提供卡片标题或泳道",
    columnError: "无效泳道，请使用 todo、in_progress 或 done",
    descAdd:
      "批量添加 1–100 张卡片，支持指定标题、所在泳道（todo、in_progress、done，默认 todo）和选填描述。",
    descMove:
      "将指定 ID 的卡片移动到目标泳道（todo、in_progress、done），支持可选位置 targetIndex。",
    descUpdate:
      "按 ID 批量修改 1–100 张卡片的标题、描述或所在泳道。",
    descDelete:
      "按 ID 批量删除 1–100 张卡片。",
    descClearCompleted:
      "一键清理并删除所有处于“已完成”（done）泳道的卡片。",
    descList:
      "按需查询看板卡片列表，可按泳道（todo、in_progress、done 或 all）筛选。",
  },
  "zh-TW": {
    title: "看板",
    todo: "待處理",
    inProgress: "進行中",
    done: "已完成",
    addCard: "新增卡片",
    addCardPlaceholder: "卡片標題…",
    cardCount: "{count} 張卡片",
    oneCard: "1 張卡片",
    emptyColumn: "尚無卡片",
    clearCompleted: "清理已完成",
    clearCompletedConfirm: "確定清理所有已完成卡片？",
    clearedCompleted: "已清理已完成卡片",
    moveLeft: "移至上一欄",
    moveRight: "移至下一欄",
    edit: "編輯",
    delete: "刪除",
    save: "儲存",
    cancel: "取消",
    retry: "重新整理",
    saved: "已儲存",
    added: "已新增卡片",
    deleted: "已刪除卡片",
    moved: "已移動卡片",
    loading: "正在載入看板…",
    invalidData: "無法讀取看板資料，請重新整理後重試。原有資料未被修改。",
    conflict: "看板已在其他視窗更新，請重新整理核對後再操作。",
    titleError: "卡片標題請填寫 1–300 個字元",
    batchError: "每批請選擇 1–100 張卡片",
    missing: "該卡片已不存在",
    duplicate: "同一批中不能重複指定卡片",
    updateError: "請提供卡片標題或泳道",
    columnError: "無效泳道，請使用 todo、in_progress 或 done",
    descAdd:
      "批量新增 1–100 張卡片，支援指定標題、所在泳道（todo、in_progress、done，預設 todo）與選填描述。",
    descMove:
      "將指定 ID 的卡片移動到目標泳道（todo、in_progress、done），支援可選位置 targetIndex。",
    descUpdate:
      "按 ID 批量修改 1–100 張卡片的標題、描述或所在泳道。",
    descDelete:
      "按 ID 批量刪除 1–100 張卡片。",
    descClearCompleted:
      "一鍵清理並刪除所有處於「已完成」（done）泳道的卡片。",
    descList:
      "按需查詢看板卡片列表，可按泳道（todo、in_progress、done 或 all）篩選。",
  },
} as const;

export type TextKey = keyof typeof messages.en;

export function t(key: TextKey, params?: Record<string, string | number>): string {
  const loc = (pudding.locale.read() ?? "zh-CN") as keyof typeof messages;
  const bundle = messages[loc] ?? messages["zh-CN"] ?? messages.en;
  let text: string = bundle[key] ?? messages.en[key] ?? String(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "Unknown error");
}
