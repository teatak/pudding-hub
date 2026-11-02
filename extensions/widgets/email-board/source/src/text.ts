import extra from "./locales.json" with { type: "json" };
export type WidgetLocale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko" | "es" | "de" | "fr";
export function normalizeLocale(raw?: string): WidgetLocale {
  const locale = (raw || "en").toLowerCase();
  if (/^zh-(tw|hk|mo|hant)(-|$)/.test(locale)) return "zh-TW";
  if (locale === "zh" || locale.startsWith("zh-")) return "zh-CN";
  const language = locale.split("-")[0];
  return language === "ja" || language === "ko" || language === "es" || language === "de" || language === "fr" ? language : "en";
}

import { pudding } from "@pudding/widget";
const en = {
  instructions: "Email Board reads the connected mailbox and organizes local cards and reply drafts. No seats, candidate join, readiness or event waiting is required. Start with getBoard to learn the account and storage version, then use listMessages and readMessage as needed. updateCards and saveReplyDraft modify Pudding storage only; they do not send email or change mailbox. Use the returned account and expectedStorageVersion for local writes and the latest widget stateVersion for interface calls. Stop when the user’s request is complete.",
  copied: "Copied",
  attachments: "Attachments (names only)",
  copyFailed: "Copy unavailable. The text is selected; press ⌘C / Ctrl+C.",
  messageTab: "Messages",
  organizeTab: "Organize & draft",
  detailView: "Message details",
  about: "About this board",
  reloadSaved: "Reload saved content",
  title: "Email Board",
  accountHint: "Switch accounts in the connection selector above",
  scope:
    "Board status and drafts are local. Opening a message marks it read in your mailbox.",
  todo: "To do",
  reply: "To reply",
  followUp: "Follow up",
  done: "Done",
  search: "Search mailbox",
  searchHint: "Search inbox text; older results are loaded by page",
  refresh: "Refresh mail",
  readSyncFailed: "Could not mark this message as read in your mailbox. You can still read it; retry to sync its read status.",
  previous: "Previous",
  next: "Next",
  loading: "Loading mailbox…",
  empty: "No messages on this page",
  openHint: "Select a message to read and organize it.",
  untitled: "(No subject)",
  unread: "Unread",
  messages: "messages",
  oneMessage: "1 message",
  viewHtml: "Rich text",
  viewPlain: "Plain text",
  openLink: "Open link",
  copyLink: "Copy link",
  linkCopied: "Copied!",
  loaded: "messages on this page",
  boardThreads: "messages in board",
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
    "Saved only in this board; not sent or synchronized to mailbox drafts.",
  details: "Details",
  copy: "Copy error",
  error: "Could not complete this action",
  retry: "Retry",
  bodyUnavailable: "Message body is unavailable.",
  older: "Older messages",
  newer: "Newer messages",
  truncated: "Text shortened for this view.",
  invalidData: "Saved board data is invalid. It has not been changed.",
  wrongAccount:
    "The connected account changed. Read getBoard again before editing.",
  unknownThread: "Read or list the message in this account before editing it.",
  conflict: "Data changed in another view. Refresh, review and try again.",
  duplicate: "Each message may appear only once per batch.",
  batchSize: "Choose 1–20 messages.",
  storageLimit:
    "Local notes and drafts exceed the storage limit. Shorten or clear a draft.",
  descBoard:
    "Read the connected account, counts for the default inbox page and storageVersion. Connection is selected in the host toolbar. Board statuses, notes and drafts are local. Opening a message in the UI marks it read in the mailbox; model reads remain read-only. The board never sends mail.",
  descList:
    "Read a page of mailbox message summaries, with local status, followUpAt and hasDraft. q is plain inbox text (default empty); each page searches up to 5,000 UID positions, cursor is nextCursor from the previous page, limit 1–20. No bodies or drafts returned. Pass the exact account from getBoard; each account is independent.",
  descRead:
    "Read a message and its local note/draft on demand. Pass account and id from listMessages. Plain text and optional untrusted HTML are each bounded to 64 KiB; truncated indicates an incomplete body. The UI displays sanitized HTML in an isolated document with sender scripts disabled and loads HTTPS images by default. Attachments expose metadata only.",
  descUpdate:
    "Atomically update 1–20 previously read/listed messages in this account. status: todo/reply/followUp/done; note max 2000 characters; followUpAt YYYY-MM-DD or null to clear. Requires account and expectedStorageVersion from a read. Returns only changed IDs and storageVersion. Does not archive or label mailbox mail.",
  descDraft:
    "Save a local reply draft (subject max 500, body max 8000 characters), or draft:null to remove it. Requires a previously read/listed message, account and expectedStorageVersion. Does not send mail or create a mailbox server draft.",
  descRefresh:
    "Refresh mailbox reads for the connected account. Returns getBoard summary, not full mail. Pass the account from getBoard. Local statuses and drafts are retained.",
};
type Key = keyof typeof en;
export const messages: Record<WidgetLocale, Record<Key, string>> = {
  en,
  ja: extra.ja.messages, ko: extra.ko.messages, es: extra.es.messages, de: extra.de.messages, fr: extra.fr.messages,
  "zh-CN": {
    instructions: "Email Board 用于读取已连接邮箱、整理本地卡片和回复草稿。不需要席位、加入候选、准备或持续等待。先调用 getBoard 获取账号和存储版本，再按需调用 listMessages、readMessage。updateCards 和 saveReplyDraft 只修改 Pudding 本地存储，不发送邮件、不修改邮箱。写入使用返回的账号和 expectedStorageVersion，接口调用使用最新小组件 stateVersion。完成用户需求后结束。",
    copied: "已复制",
    attachments: "附件（仅显示名称）",
    copyFailed: "无法自动复制，已选中文字，请按 ⌘C / Ctrl+C。",
    messageTab: "邮件正文",
    organizeTab: "处理与草稿",
    detailView: "邮件详情",
    about: "关于看板",
    reloadSaved: "重新载入已保存内容",
    title: "邮件看板",
    accountHint: "可在上方连接选择器切换账号",
    scope: "看板状态和草稿仅保存在本地，打开邮件会同步邮箱已读状态。",
    todo: "待处理",
    reply: "待回复",
    followUp: "待跟进",
    done: "已处理",
    search: "搜索邮件",
    searchHint: "搜索收件箱内容，较早邮件按页加载",
    refresh: "刷新邮件",
    readSyncFailed: "未能同步邮箱已读状态，邮件仍可正常阅读。请重试同步。",
    previous: "上一页",
    next: "下一页",
    loading: "正在读取邮箱…",
    empty: "本页暂无邮件",
    openHint: "选择邮件，查看内容并整理。",
    untitled: "（无主题）",
    unread: "未读",
    messages: "封邮件",
    oneMessage: "1 封邮件",
    viewHtml: "富文本",
    viewPlain: "纯文本",
    openLink: "打开链接",
    copyLink: "复制链接",
    linkCopied: "已复制链接",
    loaded: "封邮件 · 当前页",
    boardThreads: "封邮件 · 全局看板",
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
    localDraft: "仅保存在此看板，不会发送或同步到 邮箱草稿箱。",
    details: "错误详情",
    copy: "复制错误",
    error: "操作未完成",
    retry: "重试",
    bodyUnavailable: "无法读取邮件正文。",
    older: "更早的邮件",
    newer: "较新的邮件",
    truncated: "此视图已截短正文。",
    invalidData: "已保存的看板数据无效，原数据未被修改。",
    wrongAccount: "连接账号已变化，请重新读取 getBoard 再操作。",
    unknownThread: "请先在当前账号读取或列出此邮件，再进行修改。",
    conflict: "数据已在其他窗口更新，请刷新核对后重试。",
    duplicate: "同一批中不能重复指定邮件。",
    batchSize: "每批请选择 1–20 封邮件。",
    storageLimit: "本地备注和草稿超出存储上限，请缩短或清除部分草稿。",
    descBoard:
      "读取当前连接账号、默认收件箱第一页的各列数量和 storageVersion。在宿主顶部切换连接。看板状态、备注和草稿只保存在本地。在界面打开邮件会同步邮箱已读状态，模型读取仍只读。看板不会发送邮件。",
    descList:
      "分页读取 邮件摘要和本地 status、followUpAt、hasDraft。q 为收件箱纯文本搜索，默认空，每页最多搜索 5000 个 UID 位置，空页有 cursor 时可继续；cursor 使用上一页 nextCursor；limit 为 1–20。不返回正文和草稿。account 必须使用 getBoard 返回的账号，各账号独立。",
    descRead:
      "按需读取邮件及本地备注、草稿。account 和 id 来自 listMessages。纯文本和可选的不可信 HTML 各最多读取 64 KiB，truncated 表示内容不完整。界面在禁用脚本的隔离文档中显示清理后的 HTML，默认加载 HTTPS 图片；附件仅返回元数据。",
    descUpdate:
      "原子更新当前账号已读取或列出的 1–20 封邮件。status 可为 todo/reply/followUp/done；note 最多 2000 字符；followUpAt 为 YYYY-MM-DD 或 null 清除。必须提供 account 和读取结果中的 expectedStorageVersion，只返回变更 ID 和 storageVersion，不会归档或修改邮箱标签。",
    descDraft:
      "保存本地回复草稿（subject 最多 500 字符、body 最多 8000），draft:null 清除。需要已读取或列出的 id、account、expectedStorageVersion。不会发送邮件或创建邮件服务端草稿。",
    descRefresh:
      "刷新当前连接账号的邮件读取缓存，返回 getBoard 摘要，不重复返回完整邮件。account 来自 getBoard，本地状态和草稿保留。",
  },
  "zh-TW": {
    instructions: "Email Board 用於讀取已連接信箱、整理本機卡片和回覆草稿。不需要席位、加入候選、準備或持續等待。先呼叫 getBoard 取得帳號和儲存版本，再按需呼叫 listMessages、readMessage。updateCards 和 saveReplyDraft 只修改 Pudding 本機儲存，不寄送郵件、不修改信箱。寫入使用返回的帳號和 expectedStorageVersion，介面呼叫使用最新小元件 stateVersion。完成使用者需求後結束。",
    copied: "已複製",
    attachments: "附件（僅顯示名稱）",
    copyFailed: "無法自動複製，已選取文字，請按 ⌘C / Ctrl+C。",
    messageTab: "郵件內文",
    organizeTab: "處理與草稿",
    detailView: "郵件詳情",
    about: "關於看板",
    reloadSaved: "重新載入已儲存內容",
    title: "郵件看板",
    accountHint: "可在上方連線選擇器切換帳號",
    scope: "看板狀態與草稿僅儲存在本機，開啟郵件會同步信箱已讀狀態。",
    todo: "待處理",
    reply: "待回覆",
    followUp: "待追蹤",
    done: "已處理",
    search: "搜尋郵件",
    searchHint: "搜尋收件匣內容，較早郵件分頁載入",
    refresh: "重新整理郵件",
    readSyncFailed: "無法同步信箱已讀狀態，仍可正常閱讀郵件。請重試同步。",
    previous: "上一頁",
    next: "下一頁",
    loading: "正在讀取信箱…",
    empty: "本頁尚無郵件",
    openHint: "選擇郵件，查看內容並整理。",
    untitled: "（無主旨）",
    unread: "未讀",
    messages: "封郵件",
    oneMessage: "1 封郵件",
    viewHtml: "豐富文字",
    viewPlain: "純文字",
    openLink: "開啟連結",
    copyLink: "複製連結",
    linkCopied: "已複製連結",
    loaded: "封郵件 · 目前頁面",
    boardThreads: "封郵件 · 全局看板",
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
    localDraft: "僅儲存在此看板，不會寄出或同步至 信箱草稿匣。",
    details: "錯誤詳情",
    copy: "複製錯誤",
    error: "操作未完成",
    retry: "重試",
    bodyUnavailable: "無法讀取郵件內文。",
    older: "更早的郵件",
    newer: "較新的郵件",
    truncated: "此檢視已截短內文。",
    invalidData: "已儲存的看板資料無效，原資料未被修改。",
    wrongAccount: "連線帳號已變更，請重新讀取 getBoard 再操作。",
    unknownThread: "請先在目前帳號讀取或列出此郵件，再進行修改。",
    conflict: "資料已在其他視窗更新，請重新整理確認後再試。",
    duplicate: "同一批中不能重複指定郵件。",
    batchSize: "每批請選擇 1–20 封郵件。",
    storageLimit: "本機備註與草稿超出儲存上限，請縮短或清除部分草稿。",
    descBoard:
      "讀取目前連線帳號、預設收件匣第一頁的各欄數量與 storageVersion。在宿主頂部切換連線。看板狀態、備註與草稿僅儲存在本機。在介面開啟郵件會同步信箱已讀狀態，模型讀取仍唯讀。看板不會寄出郵件。",
    descList:
      "分頁讀取 郵件摘要與本機 status、followUpAt、hasDraft。q 為收件匣純文字搜尋，預設空，每頁最多搜尋 5000 個 UID 位置，空頁有 cursor 時可繼續；cursor 使用前一頁 nextCursor；limit 為 1–20。不回傳內文或草稿。account 必須使用 getBoard 回傳的帳號，各帳號獨立。",
    descRead:
      "按需讀取郵件與本機備註、草稿。account 與 id 來自 listMessages。純文字與可選的不可信 HTML 各最多讀取 64 KiB，truncated 表示內容不完整。介面在停用指令碼的隔離文件中顯示清理後的 HTML，預設載入 HTTPS 圖片；附件僅回傳中繼資料。",
    descUpdate:
      "原子更新目前帳號已讀取或列出的 1–20 封郵件。status 為 todo/reply/followUp/done；note 最多 2000 字元；followUpAt 為 YYYY-MM-DD 或 null 清除。須提供 account 與讀取結果中的 expectedStorageVersion，只回傳變更 ID 與 storageVersion，不會封存或修改信箱標籤。",
    descDraft:
      "儲存本機回覆草稿（subject 最多 500 字元、body 最多 8000），draft:null 清除。需要已讀取或列出的 id、account、expectedStorageVersion。不會寄出郵件或建立郵件伺服器草稿。",
    descRefresh:
      "重新整理目前連線帳號的郵件讀取快取，回傳 getBoard 摘要，不重複回傳完整郵件。account 來自 getBoard，本機狀態與草稿保留。",
  },
};
export function t(key: Key) {
  return messages[normalizeLocale(pudding.locale.read())][key] ?? en[key];
}
export function errorText(error: unknown) {
  const s = error instanceof Error ? error.message : String(error);
  return s in en
    ? t(s as Key)
    : s.includes("widget_data_conflict")
      ? t("conflict")
      : s;
}
