import { pudding } from "@pudding/widget";
const en = {
  reloadSaved: "Reload saved content",
  title: "Gmail Board",
  accountHint: "Switch accounts in the connection selector above",
  scope:
    "Board status and drafts are local. Your Gmail mailbox stays unchanged.",
  todo: "To do",
  reply: "To reply",
  followUp: "Follow up",
  done: "Done",
  search: "Search Gmail",
  searchHint: "Gmail query, e.g. in:inbox",
  refresh: "Refresh",
  previous: "Previous",
  next: "Next",
  loading: "Loading mailbox…",
  empty: "No threads on this page",
  openHint: "Select a thread to read and organize it.",
  untitled: "(No subject)",
  unread: "Unread",
  messages: "messages",
  loaded: "threads on this page",
  close: "Close",
  status: "Board status",
  note: "Processing note",
  followUpAt: "Follow-up date",
  draft: "Local reply draft",
  subject: "Subject",
  body: "Reply text",
  save: "Save",
  saved: "Saved locally",
  unsaved: "Unsaved changes",
  localDraft:
    "Saved only in this board; not sent or synchronized to Gmail drafts.",
  details: "Details",
  copy: "Copy error",
  error: "Could not complete this action",
  retry: "Retry",
  bodyUnavailable: "Message body unavailable; showing its snippet.",
  older: "Older messages",
  newer: "Newer messages",
  truncated: "Text shortened for this view.",
  invalidData: "Saved board data is invalid. It has not been changed.",
  wrongAccount:
    "The connected account changed. Read getBoard again before editing.",
  unknownThread: "Read or list the thread in this account before editing it.",
  conflict: "Data changed in another view. Refresh, review and try again.",
  duplicate: "Each thread may appear only once per batch.",
  batchSize: "Choose 1–20 threads.",
  storageLimit:
    "Local notes and drafts exceed the storage limit. Shorten or clear a draft.",
  descBoard:
    "Read the connected account, counts for the default inbox page and storageVersion. Connection is selected in the host toolbar. All board statuses, notes and drafts are local; this widget never sends or modifies Gmail messages.",
  descList:
    "Read a page of Gmail thread summaries, with local status, followUpAt and hasDraft. q uses Gmail search syntax (default in:inbox), cursor is nextCursor from the previous page, limit 1–20. No bodies or drafts returned. Pass the exact account from getBoard; each account is independent.",
  descRead:
    "Read a thread and its local note/draft on demand. Pass account and id from listThreads. Messages are newest-first, paginated using offset (default 0) and limit (default 5, max 10), each body at most 12000 characters. HTML is converted to text; external images and attachments are not loaded.",
  descUpdate:
    "Atomically update 1–20 previously read/listed threads in this account. status: todo/reply/followUp/done; note max 2000 characters; followUpAt YYYY-MM-DD or null to clear. Requires account and expectedStorageVersion from a read. Returns only changed IDs and storageVersion. Does not archive or label Gmail mail.",
  descDraft:
    "Save a local reply draft (subject max 500, body max 8000 characters), or draft:null to remove it. Requires a previously read/listed thread, account and expectedStorageVersion. Does not send mail or create a Gmail server draft.",
  descRefresh:
    "Refresh Gmail reads for the connected account. Returns getBoard summary, not full mail. Pass the account from getBoard. Local statuses and drafts are retained.",
};
type Key = keyof typeof en;
export const messages: Record<"en" | "zh-CN" | "zh-TW", Record<Key, string>> = {
  en,
  "zh-CN": {
    reloadSaved: "重新载入已保存内容",
    title: "Gmail 看板",
    accountHint: "可在上方连接选择器切换账号",
    scope: "看板状态和草稿仅保存在本地，不修改 Gmail 邮箱。",
    todo: "待处理",
    reply: "待回复",
    followUp: "待跟进",
    done: "已处理",
    search: "搜索 Gmail",
    searchHint: "Gmail 搜索条件，如 in:inbox",
    refresh: "刷新",
    previous: "上一页",
    next: "下一页",
    loading: "正在读取邮箱…",
    empty: "本页暂无邮件会话",
    openHint: "选择邮件会话，查看内容并整理。",
    untitled: "（无主题）",
    unread: "未读",
    messages: "封邮件",
    loaded: "个会话 · 当前页",
    close: "关闭",
    status: "看板状态",
    note: "处理备注",
    followUpAt: "跟进日期",
    draft: "本地回复草稿",
    subject: "主题",
    body: "回复内容",
    save: "保存",
    saved: "已保存到本地",
    unsaved: "有未保存的修改",
    localDraft: "仅保存在此看板，不会发送或同步到 Gmail 草稿箱。",
    details: "错误详情",
    copy: "复制错误",
    error: "操作未完成",
    retry: "重试",
    bodyUnavailable: "无法读取正文，显示邮件摘要。",
    older: "更早的邮件",
    newer: "较新的邮件",
    truncated: "此视图已截短正文。",
    invalidData: "已保存的看板数据无效，原数据未被修改。",
    wrongAccount: "连接账号已变化，请重新读取 getBoard 再操作。",
    unknownThread: "请先在当前账号读取或列出此邮件会话，再进行修改。",
    conflict: "数据已在其他窗口更新，请刷新核对后重试。",
    duplicate: "同一批中不能重复指定邮件会话。",
    batchSize: "每批请选择 1–20 个会话。",
    storageLimit: "本地备注和草稿超出存储上限，请缩短或清除部分草稿。",
    descBoard:
      "读取当前连接账号、默认收件箱第一页的各列数量和 storageVersion。在宿主顶部切换连接。所有看板状态、备注和草稿只保存在本地，本组件不会发送或修改 Gmail 邮件。",
    descList:
      "分页读取 Gmail 会话摘要和本地 status、followUpAt、hasDraft。q 使用 Gmail 搜索语法，默认 in:inbox；cursor 使用上一页 nextCursor；limit 为 1–20。不返回正文和草稿。account 必须使用 getBoard 返回的账号，各账号独立。",
    descRead:
      "按需读取邮件会话及本地备注、草稿。account 和 id 来自 listThreads。邮件按新到旧排列，offset 默认 0，limit 默认 5、最多 10；每封正文最多 12000 字符。HTML 转纯文本，不加载外部图片或附件。",
    descUpdate:
      "原子更新当前账号已读取或列出的 1–20 个会话。status 可为 todo/reply/followUp/done；note 最多 2000 字符；followUpAt 为 YYYY-MM-DD 或 null 清除。必须提供 account 和读取结果中的 expectedStorageVersion，只返回变更 ID 和 storageVersion，不会归档或修改 Gmail 标签。",
    descDraft:
      "保存本地回复草稿（subject 最多 500 字符、body 最多 8000），draft:null 清除。需要已读取或列出的 id、account、expectedStorageVersion。不会发送邮件或创建 Gmail 服务端草稿。",
    descRefresh:
      "刷新当前连接账号的 Gmail 读取缓存，返回 getBoard 摘要，不重复返回完整邮件。account 来自 getBoard，本地状态和草稿保留。",
  },
  "zh-TW": {
    reloadSaved: "重新載入已儲存內容",
    title: "Gmail 看板",
    accountHint: "可在上方連線選擇器切換帳號",
    scope: "看板狀態與草稿僅儲存在本機，不修改 Gmail 信箱。",
    todo: "待處理",
    reply: "待回覆",
    followUp: "待追蹤",
    done: "已處理",
    search: "搜尋 Gmail",
    searchHint: "Gmail 搜尋條件，如 in:inbox",
    refresh: "重新整理",
    previous: "上一頁",
    next: "下一頁",
    loading: "正在讀取信箱…",
    empty: "本頁尚無郵件對話",
    openHint: "選擇郵件對話，查看內容並整理。",
    untitled: "（無主旨）",
    unread: "未讀",
    messages: "封郵件",
    loaded: "個對話 · 目前頁面",
    close: "關閉",
    status: "看板狀態",
    note: "處理備註",
    followUpAt: "追蹤日期",
    draft: "本機回覆草稿",
    subject: "主旨",
    body: "回覆內容",
    save: "儲存",
    saved: "已儲存到本機",
    unsaved: "有尚未儲存的修改",
    localDraft: "僅儲存在此看板，不會寄出或同步至 Gmail 草稿匣。",
    details: "錯誤詳情",
    copy: "複製錯誤",
    error: "操作未完成",
    retry: "重試",
    bodyUnavailable: "無法讀取內文，顯示郵件摘要。",
    older: "更早的郵件",
    newer: "較新的郵件",
    truncated: "此檢視已截短內文。",
    invalidData: "已儲存的看板資料無效，原資料未被修改。",
    wrongAccount: "連線帳號已變更，請重新讀取 getBoard 再操作。",
    unknownThread: "請先在目前帳號讀取或列出此郵件對話，再進行修改。",
    conflict: "資料已在其他視窗更新，請重新整理確認後再試。",
    duplicate: "同一批中不能重複指定郵件對話。",
    batchSize: "每批請選擇 1–20 個對話。",
    storageLimit: "本機備註與草稿超出儲存上限，請縮短或清除部分草稿。",
    descBoard:
      "讀取目前連線帳號、預設收件匣第一頁的各欄數量與 storageVersion。在宿主頂部切換連線。看板狀態、備註與草稿僅儲存在本機，本元件不會寄出或修改 Gmail 郵件。",
    descList:
      "分頁讀取 Gmail 對話摘要與本機 status、followUpAt、hasDraft。q 使用 Gmail 搜尋語法，預設 in:inbox；cursor 使用前一頁 nextCursor；limit 為 1–20。不回傳內文或草稿。account 必須使用 getBoard 回傳的帳號，各帳號獨立。",
    descRead:
      "按需讀取郵件對話與本機備註、草稿。account 與 id 來自 listThreads。郵件由新到舊排列，offset 預設 0，limit 預設 5、最多 10，每封內文最多 12000 字元。HTML 轉純文字，不載入外部圖片或附件。",
    descUpdate:
      "原子更新目前帳號已讀取或列出的 1–20 個對話。status 為 todo/reply/followUp/done；note 最多 2000 字元；followUpAt 為 YYYY-MM-DD 或 null 清除。須提供 account 與讀取結果中的 expectedStorageVersion，只回傳變更 ID 與 storageVersion，不會封存或修改 Gmail 標籤。",
    descDraft:
      "儲存本機回覆草稿（subject 最多 500 字元、body 最多 8000），draft:null 清除。需要已讀取或列出的 id、account、expectedStorageVersion。不會寄出郵件或建立 Gmail 伺服器草稿。",
    descRefresh:
      "重新整理目前連線帳號的 Gmail 讀取快取，回傳 getBoard 摘要，不重複回傳完整郵件。account 來自 getBoard，本機狀態與草稿保留。",
  },
};
export function t(key: Key) {
  return messages[pudding.locale.read()][key];
}
export function errorText(error: unknown) {
  const s = error instanceof Error ? error.message : String(error);
  return s in en
    ? t(s as Key)
    : s.includes("widget_data_conflict")
      ? t("conflict")
      : s;
}
