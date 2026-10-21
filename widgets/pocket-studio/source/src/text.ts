export type Locale = "zh-CN" | "zh-TW" | "en";

let currentLocale: Locale = "zh-CN";

export function setLocale(locale: string) {
  if (locale === "zh-TW" || locale === "en") {
    currentLocale = locale;
  } else {
    currentLocale = "zh-CN";
  }
}

export const DICT: Record<string, Record<Locale, string>> = {
  fileActions: {"zh-CN": "工程与音频", "zh-TW": "工程與音訊", "en": "Project and audio"},
  importProject: {"zh-CN": "导入工程", "zh-TW": "匯入工程", "en": "Import project"},
  exportProject: {"zh-CN": "导出工程", "zh-TW": "匯出工程", "en": "Export project"},
  exportWav: {"zh-CN": "导出 WAV", "zh-TW": "匯出 WAV", "en": "Export WAV"},
  wavRequiresUpdate: {"zh-CN": "请升级 Pudding 后导出 WAV，当前仍可编辑和导出工程。", "zh-TW": "請升級 Pudding 後匯出 WAV，目前仍可編輯和匯出工程。", "en": "Update Pudding to export WAV. Editing and project export are still available."},
  importReplacesSong: {"zh-CN": "导入会替换当前曲目。需要保留时，请先导出工程。", "zh-TW": "匯入會取代目前曲目。需要保留時，請先匯出工程。", "en": "Import replaces the current song. Export its project first if you want to keep it."},
  importSummary: {"zh-CN": "{bars} 小节 · {tracks} 条音轨 · BPM {bpm}", "zh-TW": "{bars} 小節 · {tracks} 條音軌 · BPM {bpm}", "en": "{bars} bars · {tracks} tracks · BPM {bpm}"},
  confirmImport: {"zh-CN": "导入并替换", "zh-TW": "匯入並取代", "en": "Import and replace"},
  cancelImport: {"zh-CN": "取消", "zh-TW": "取消", "en": "Cancel"},
  projectMalformed: {"zh-CN": "无法读取工程文件，请选择有效的音乐工坊 JSON 工程。", "zh-TW": "無法讀取工程檔案，請選擇有效的音樂工坊 JSON 工程。", "en": "Cannot read this project. Select a valid Pocket Studio JSON project."},
  projectVersionError: {"zh-CN": "工程格式应为 pudding.pocket-studio，版本应为 1。", "zh-TW": "工程格式應為 pudding.pocket-studio，版本應為 1。", "en": "Project format must be pudding.pocket-studio, version 1."},
  projectInvalid: {"zh-CN": "工程字段无效：{field}。请检查音轨、16 步数组和音符范围。", "zh-TW": "工程欄位無效：{field}。請檢查音軌、16 步陣列和音符範圍。", "en": "Invalid project fields: {field}. Check track keys, 16-step arrays and note ranges."},
  projectTooLarge: {"zh-CN": "工程文件不能超过 256 KiB。", "zh-TW": "工程檔案不能超過 256 KiB。", "en": "Project files must not exceed 256 KiB."},
  renderingWav: {"zh-CN": "正在生成 WAV…", "zh-TW": "正在產生 WAV…", "en": "Rendering WAV…"},
  savingProject: {"zh-CN": "正在保存工程…", "zh-TW": "正在儲存工程…", "en": "Saving project…"},
  fileSaved: {"zh-CN": "文件已保存。", "zh-TW": "檔案已儲存。", "en": "File saved."},
  fileSaveCancelled: {"zh-CN": "已取消导出。", "zh-TW": "已取消匯出。", "en": "Export cancelled."},
  dismissNotice: {"zh-CN": "关闭提示", "zh-TW": "關閉提示", "en": "Dismiss notification"},
  descImportProject: {"zh-CN": "导入音乐工坊 JSON 工程，整曲校验后一次替换，保留其他小组件数据；支持 dryRun 与 expectedStorageVersion，成功导入后暂停播放，返回精简回执。", "zh-TW": "匯入音樂工坊 JSON 工程，整曲驗證後一次取代，保留其他小組件資料；支援 dryRun 與 expectedStorageVersion，成功匯入後暫停播放，回傳精簡回執。", "en": "Import a Pocket Studio JSON project with full validation and one atomic replacement. Preserves unrelated data. Supports dryRun and expectedStorageVersion. Pauses playback after a committed import. Returns a compact receipt."},
  descExportSong: {"zh-CN": "导出当前曲目：project 为可重新导入编辑的 JSON 工程，wav 为 44.1 kHz PCM16 单声道音频，包含末尾长音；打开系统保存对话框，返回保存结果，不回传文件内容。", "zh-TW": "匯出目前曲目：project 為可重新匯入編輯的 JSON 工程，wav 為 44.1 kHz PCM16 單聲道音訊，包含末尾長音；開啟系統儲存對話框，回傳儲存結果，不回傳檔案內容。", "en": "Export the current song: project saves editable JSON; wav renders 44.1 kHz PCM16 mono audio including note tails. Opens the system save dialog. Returns save status and file metadata, not file content."},

  presetGroup: { "zh-CN": "预设曲目", "zh-TW": "預設曲目", "en": "Presets" },
  barActions: { "zh-CN": "小节操作", "zh-TW": "小節操作", "en": "Bar actions" },
  invalidRange: {"zh-CN": "{field} 必须是 {min}–{max} 范围内的整数。", "zh-TW": "{field} 必須是 {min}–{max} 範圍內的整數。", "en": "{field} must be an integer in range {min}–{max}."},
  invalidTrack: {"zh-CN": "trackKey={field} 不存在；有效值：{allowed}。", "zh-TW": "trackKey={field} 不存在；有效值：{allowed}。", "en": "trackKey: track does not exist ({field}); allowed: {allowed}."},
  invalidPitch: {"zh-CN": "音高必须是 20–10000 Hz 的有限数值。", "zh-TW": "音高必須是 20–10000 Hz 的有限數值。", "en": "Pitch must be a finite frequency from 20 to 10000 Hz."},
  invalidInstrument: {"zh-CN": "乐器不存在。", "zh-TW": "樂器不存在。", "en": "Unknown instrument."},
  invalidPattern: {"zh-CN": "节奏、音高和时值数组必须各有 16 个元素。", "zh-TW": "節奏、音高和時值陣列必須各有 16 個元素。", "en": "Pattern arrays must contain exactly 16 values."},
  invalidSelection: {"zh-CN": "读取范围不能留空或包含重复项。", "zh-TW": "讀取範圍不能留空或包含重複項。", "en": "Selections must be nonempty and contain no duplicates."},
  inactiveNote: {"zh-CN": "这个格子没有音符，请先使用 setStep 启用。", "zh-TW": "這個格子沒有音符，請先使用 setStep 啟用。", "en": "This step has no note. Enable it with setStep first."},
  batchLimit: {"zh-CN": "一次可提交 1–100 项编辑。", "zh-TW": "一次可提交 1–100 項編輯。", "en": "Submit 1–100 edits in one batch."},
  barLimit: {"zh-CN": "最多支持 16 小节。", "zh-TW": "最多支援 16 小節。", "en": "A song supports up to 16 bars."},
  lastBar: {"zh-CN": "至少保留一个小节。", "zh-TW": "至少保留一個小節。", "en": "Keep at least one bar."},
  lastTrack: {"zh-CN": "至少保留一条音轨。", "zh-TW": "至少保留一條音軌。", "en": "Keep at least one track."},
  storageConflict: {"zh-CN": "曲目已变化，当前 storageVersion 为 {version}。请重新读取后再编辑。", "zh-TW": "曲目已變更，目前 storageVersion 為 {version}。請重新讀取後再編輯。", "en": "The song changed. Current storageVersion is {version}. Read it again before editing."},
  playbackUnavailable: {"zh-CN": "播放器尚未就绪，请等待小组件加载。", "zh-TW": "播放器尚未就緒，請等待小組件載入。", "en": "The player is not ready. Wait for the widget to load."},
  paramBar: {"zh-CN": "小节索引，从 0 开始，必须指向已有小节。", "zh-TW": "小節索引，從 0 開始，必須指向已有小節。", "en": "Zero-based index of an existing bar."},
  paramStep: {"zh-CN": "步进索引，0–15；第 5 格传 4。", "zh-TW": "步進索引，0–15；第 5 格傳 4。", "en": "Zero-based step index, 0–15; step 5 is index 4."},
  paramTrack: {"zh-CN": "已有音轨键，通过 getSong 获取。", "zh-TW": "已有音軌鍵，透過 getSong 取得。", "en": "Existing track key, obtained from getSong."},
  paramPitch: {"zh-CN": "音高频率，20–10000 Hz，例如 A4 = 440。", "zh-TW": "音高頻率，20–10000 Hz，例如 A4 = 440。", "en": "Frequency, 20–10000 Hz; for example A4 = 440."},
  paramDuration: {"zh-CN": "持续步数，1–32；4 步为一拍。", "zh-TW": "持續步數，1–32；4 步為一拍。", "en": "Duration in steps, 1–32; four steps make one beat."},
  paramDryRun: {"zh-CN": "只校验并预览修改，不保存，也不影响播放。", "zh-TW": "只驗證並預覽修改，不儲存，也不影響播放。", "en": "Validate and preview without saving or affecting playback."},
  paramVersion: {"zh-CN": "可选：要求曲目仍是读取时的 storageVersion，否则整批拒绝。", "zh-TW": "選填：要求曲目仍是讀取時的 storageVersion，否則整批拒絕。", "en": "Optional storageVersion from your previous read; reject the entire batch if it changed."},
  paramSteps: {"zh-CN": "恰好 16 个开关值，对应步进 0–15。", "zh-TW": "恰好 16 個開關值，對應步進 0–15。", "en": "Exactly 16 booleans for steps 0–15."},
  paramDurations: {"zh-CN": "16 项时值；不传时启用音符重置为 1 步；关闭音符规范为 null。", "zh-TW": "16 項時值；不傳時啟用音符重設為 1 步；關閉音符規範為 null。", "en": "16 durations; omitted durations reset enabled notes to one step. Disabled notes become null."},
  paramIncludePatterns: {"zh-CN": "默认只读概要；设为 true 读取曲谱。指定小节或音轨范围时默认读取对应曲谱。", "zh-TW": "預設只讀概要；設為 true 讀取曲譜。指定小節或音軌範圍時預設讀取對應曲譜。", "en": "Summary by default. Set true for patterns; selecting bars or tracks includes their patterns by default."},
  descEditSong: {"zh-CN": "原子批量编辑 1–100 项，按顺序校验，任一失败则全部不保存；小节和步进从 0 开始。优先使用 setStep 明确开关。dryRun 只预览；返回精简 changes 和 storageVersion，不返回整首曲谱。", "zh-TW": "原子批次編輯 1–100 項，依序驗證，任一失敗則全部不儲存；小節和步進從 0 開始。優先使用 setStep 明確開關。dryRun 只預覽；回傳精簡 changes 和 storageVersion，不回傳整首曲譜。", "en": "Atomically edit 1–100 actions in order; any invalid action rejects the entire batch. Bars and steps are zero-based. Prefer deterministic setStep. dryRun previews without saving. Returns compact changes and storageVersion, never the full song."},
  descSetStep: {"zh-CN": "明确启用或关闭一个音符，可同时设置音高和时值；支持 dryRun，重复设置不会反转。", "zh-TW": "明確啟用或關閉一個音符，可同時設定音高和時值；支援 dryRun，重複設定不會反轉。", "en": "Explicitly enable or disable a note, optionally setting pitch and duration. Supports dryRun; repeated settings do not toggle."},
  descCopyBar: {"zh-CN": "将一个已有小节的全部音轨、音高和时值复制到另一个已有小节；不新增小节。", "zh-TW": "將一個已有小節的全部音軌、音高和時值複製到另一個已有小節；不新增小節。", "en": "Copy all patterns, pitches and durations from one existing bar to another; does not append a bar."},
  mutationHint: {"zh-CN": "返回精简修改回执，不返回整曲；支持 dryRun 和 expectedStorageVersion。", "zh-TW": "回傳精簡修改回執，不回傳整曲；支援 dryRun 和 expectedStorageVersion。", "en": "Returns a compact edit receipt, not the whole song. Supports dryRun and expectedStorageVersion."},
  trackLimit: {"zh-CN": "最多支持 8 条音轨。", "zh-TW": "最多支援 8 條音軌。", "en": "A song supports up to eight tracks."},

  appName: {
    "zh-CN": "音乐工坊",
    "zh-TW": "音樂工坊",
    en: "Pocket Studio"
  },
  subtitle: {
    "zh-CN": "64步进发光矩阵编曲器",
    "zh-TW": "64步進發光矩陣編曲器",
    en: "64-Step Matrix Sequencer"
  },
  bar1: {
    "zh-CN": "小节 1 · 前奏",
    "zh-TW": "小節 1 · 前奏",
    en: "Bar 1 · Intro"
  },
  bar2: {
    "zh-CN": "小节 2 · 主题",
    "zh-TW": "小節 2 · 主題",
    en: "Bar 2 · Verse"
  },
  bar3: {
    "zh-CN": "小节 3 · 跃动",
    "zh-TW": "小節 3 · 躍動",
    en: "Bar 3 · Chorus"
  },
  bar4: {
    "zh-CN": "小节 4 · 过门",
    "zh-TW": "小節 4 · 過門",
    en: "Bar 4 · Outro"
  },
  barPrefix: {
    "zh-CN": "小节",
    "zh-TW": "小節",
    en: "Bar"
  },
  addBar: {
    "zh-CN": "添加小节",
    "zh-TW": "添加小節",
    en: "Add Bar"
  },
  removeBar: {
    "zh-CN": "删除此节",
    "zh-TW": "刪除此節",
    en: "Delete Bar"
  },
  maxBarLimit: {
    "zh-CN": "最多支持 16 个小节",
    "zh-TW": "最多支援 16 個小節",
    en: "Up to 16 bars supported"
  },
  minBarLimit: {
    "zh-CN": "至少保留 1 个小节",
    "zh-TW": "至少保留 1 個小節",
    en: "At least 1 bar required"
  },
  play: {
    "zh-CN": "播放",
    "zh-TW": "播放",
    en: "Play"
  },
  pause: {
    "zh-CN": "暂停",
    "zh-TW": "暫停",
    en: "Pause"
  },
  bpm: {
    "zh-CN": "速度",
    "zh-TW": "速度",
    en: "BPM"
  },
  presetMario: {
    "zh-CN": "像素冒险",
    "zh-TW": "像素冒險",
    en: "Pixel Quest"
  },
  presetDonkeyKong: {
    "zh-CN": "街机 1981",
    "zh-TW": "街機 1981",
    en: "Arcade 1981"
  },
  presetOriental: {
    "zh-CN": "国风五声",
    "zh-TW": "國風五聲",
    en: "Oriental"
  },
  presetLofi: {
    "zh-CN": "Lo-Fi 慢摇",
    "zh-TW": "Lo-Fi 慢搖",
    en: "Chill Lo-Fi"
  },
  copyNext: {
    "zh-CN": "复制到下一节",
    "zh-TW": "複製到下一節",
    en: "Copy to Next"
  },
  clearBar: {
    "zh-CN": "清空当前节",
    "zh-TW": "清空當前節",
    en: "Clear Bar"
  },
  clearAll: {
    "zh-CN": "清空整曲",
    "zh-TW": "清空整曲",
    en: "Clear All"
  },
  tracks: {
    "zh-CN": "音轨",
    "zh-TW": "音軌",
    en: "Tracks"
  },
  addTrack: {
    "zh-CN": "添加新乐器音轨 (从音色库中自由挑选)",
    "zh-TW": "添加新樂器音軌 (從音色庫中自由挑選)",
    en: "Add Instrument Track"
  },
  addTrackShort: {
    "zh-CN": "添加音轨",
    "zh-TW": "添加音軌",
    en: "Add Track"
  },
  pickerTitle: {
    "zh-CN": "选择音色与乐器",
    "zh-TW": "選擇音色與樂器",
    en: "Select Instrument Sound"
  },
  hintText: {
    "zh-CN": "点击左侧乐器卡片更换音色；点击方块点亮；走带自动跨小节流转播放。",
    "zh-TW": "點擊左側樂器卡片更換音色；點擊方塊點亮；走帶自動跨小節流轉播放。",
    en: "Click instrument card to change sound; click pads to trigger; continuous 4-bar flow."
  },
  sessionTip: {
    "zh-CN": "右下角会话联动：输入“换成超级马里奥”、“再来个大金刚”、“把速度调快”即可实时调度",
    "zh-TW": "右下角會話聯動：輸入「換成超級瑪利歐」、「再來個大金剛」、「把速度調快」即可實時調度",
    en: "Chat Copilot: Tell AI 'Switch to Mario', 'Play Donkey Kong', or 'Change BPM'."
  },
  maxTrackLimit: {
    "zh-CN": "最多支持同时运行 8 条音轨",
    "zh-TW": "最多支援同時運行 8 條音軌",
    en: "Up to 8 tracks supported simultaneously"
  },
  cancelled: {
    "zh-CN": "操作已取消",
    "zh-TW": "操作已取消",
    en: "Operation cancelled"
  },
  deleteNote: {
    "zh-CN": "删除音符",
    "zh-TW": "刪除音符",
    en: "Delete Note"
  },
  pitchSettings: {
    "zh-CN": "音调音高",
    "zh-TW": "音調音高",
    en: "Note Pitch"
  },
  percussionNote: {
    "zh-CN": "打击乐音符（固定音高）",
    "zh-TW": "打擊樂音符（固定音高）",
    en: "Percussion (Fixed Pitch)"
  },
  semitoneDown: {
    "zh-CN": "-半音",
    "zh-TW": "-半音",
    en: "-Semi"
  },
  semitoneUp: {
    "zh-CN": "+半音",
    "zh-TW": "+半音",
    en: "+Semi"
  },
  octaveDown: {
    "zh-CN": "-八度",
    "zh-TW": "-八度",
    en: "-Oct"
  },
  octaveUp: {
    "zh-CN": "+八度",
    "zh-TW": "+八度",
    en: "+Oct"
  },
  octave: {
    "zh-CN": "八度",
    "zh-TW": "八度",
    en: "Octave"
  },
  audition: {
    "zh-CN": "试听",
    "zh-TW": "試聽",
    en: "Preview"
  },
  done: {
    "zh-CN": "完成",
    "zh-TW": "完成",
    en: "Done"
  },
  close: {
    "zh-CN": "关闭",
    "zh-TW": "關閉",
    en: "Close"
  },
  tempoDown: {
    "zh-CN": "减速 (-5)",
    "zh-TW": "減速 (-5)",
    en: "Slow down (-5)"
  },
  tempoUp: {
    "zh-CN": "加速 (+5)",
    "zh-TW": "加速 (+5)",
    en: "Speed up (+5)"
  },
  deleteBarTooltip: {
    "zh-CN": "删除最后一节",
    "zh-TW": "刪除最後一節",
    en: "Delete last bar"
  },
  addBarTooltip: {
    "zh-CN": "追加小节 (+1)",
    "zh-TW": "追加小節 (+1)",
    en: "Add bar (+1)"
  },
  deleteThisBar: {
    "zh-CN": "删除此小节",
    "zh-TW": "刪除此小節",
    en: "Delete this bar"
  },
  dragToExtend: {
    "zh-CN": "按住向右拖拽放长节拍",
    "zh-TW": "按住向右拖拽放長節拍",
    en: "Drag right to extend note duration"
  },
  deleteTrackTooltip: {
    "zh-CN": "删除音轨",
    "zh-TW": "刪除音軌",
    en: "Delete track"
  },
  categoryMelodic: {
    "zh-CN": "旋律",
    "zh-TW": "旋律",
    en: "Melodic"
  },
  categoryBass: {
    "zh-CN": "低音",
    "zh-TW": "低音",
    en: "Bass"
  },
  categoryDrums: {
    "zh-CN": "打击乐",
    "zh-TW": "打擊樂",
    en: "Drums"
  },
  // 乐器音色库名称与描述多语言
  inst_marioLead_name: {
    "zh-CN": "8-Bit 经典方波",
    "zh-TW": "8-Bit 經典方波",
    en: "8-Bit Pulse Lead"
  },
  inst_marioLead_desc: {
    "zh-CN": "经典复古脉冲方波",
    "zh-TW": "經典復古脈衝方波",
    en: "Classic 8-bit pulse wave"
  },
  inst_kongLead_name: {
    "zh-CN": "街机 8-Bit 方波",
    "zh-TW": "街機 8-Bit 方波",
    en: "Arcade Pulse Lead"
  },
  inst_kongLead_desc: {
    "zh-CN": "街机跳跃脉冲波",
    "zh-TW": "街機跳躍脈衝波",
    en: "Arcade jump pulse wave"
  },
  inst_marioBass_name: {
    "zh-CN": "8-Bit 三角波低音",
    "zh-TW": "8-Bit 三角波低音",
    en: "8-Bit Triangle Bass"
  },
  inst_marioBass_desc: {
    "zh-CN": "弹性复古芯片低音",
    "zh-TW": "彈性復古晶片低音",
    en: "Punchy retro chip bass"
  },
  inst_kick_name: {
    "zh-CN": "808 底鼓 (Kick)",
    "zh-TW": "808 底鼓 (Kick)",
    en: "808 Kick"
  },
  inst_kick_desc: {
    "zh-CN": "下潜重低音",
    "zh-TW": "下潛重低音",
    en: "Deep sub punch"
  },
  inst_snare_name: {
    "zh-CN": "8-Bit 军鼓 (Snare)",
    "zh-TW": "8-Bit 軍鼓 (Snare)",
    en: "8-Bit Snare"
  },
  inst_snare_desc: {
    "zh-CN": "清脆切分敲击",
    "zh-TW": "清脆切分敲擊",
    en: "Crisp snappy noise"
  },
  inst_hat_name: {
    "zh-CN": "闭镲 (Hi-Hat)",
    "zh-TW": "閉鈸 (Hi-Hat)",
    en: "Closed Hi-Hat"
  },
  inst_hat_desc: {
    "zh-CN": "金属碎拍律动",
    "zh-TW": "金屬碎拍律動",
    en: "Metallic sizzle groove"
  },
  inst_lead_name: {
    "zh-CN": "五声音阶琴",
    "zh-TW": "五聲音階琴",
    en: "Pentatonic Synth"
  },
  inst_lead_desc: {
    "zh-CN": "空灵自然音色",
    "zh-TW": "空靈自然音色",
    en: "Ethereal oriental pluck"
  },
  inst_bass_name: {
    "zh-CN": "模拟低音 Bass",
    "zh-TW": "模擬低音 Bass",
    en: "Analog Synth Bass"
  },
  inst_bass_desc: {
    "zh-CN": "温暖低通贝斯",
    "zh-TW": "溫暖低通貝斯",
    en: "Warm low-pass bass"
  },
  inst_epiano_name: {
    "zh-CN": "电钢琴 Rhodes",
    "zh-TW": "電鋼琴 Rhodes",
    en: "Rhodes EPiano"
  },
  inst_epiano_desc: {
    "zh-CN": "温润爵士和弦",
    "zh-TW": "溫潤爵士和弦",
    en: "Mellow jazz chime"
  },
  inst_marimba_name: {
    "zh-CN": "木琴 Marimba",
    "zh-TW": "木琴 Marimba",
    en: "Marimba"
  },
  inst_marimba_desc: {
    "zh-CN": "清脆热带木质",
    "zh-TW": "清脆熱帶木質",
    en: "Bright wooden mallet"
  },
  // Tool 接口描述
  descGetSong: {
    "zh-CN": "按需读取曲目：默认返回速度、音轨和小节数量概要；includePatterns:true 读取曲谱，barIndices / trackKeys 可筛选范围。索引从 0 开始。",
    "zh-TW": "按需讀取曲目：預設回傳速度、音軌和小節數量概要；includePatterns:true 讀取曲譜，barIndices / trackKeys 可篩選範圍。索引從 0 開始。",
    en: "Read song on demand: summary by default; includePatterns:true reads patterns. Filter with barIndices / trackKeys. Indices are zero-based."
  },
  descAddBar: {
    "zh-CN": "添加一个新的小节（最多支持 16 小节，可选复制已有小节）",
    "zh-TW": "添加一個新的小節（最多支援 16 小節，可選複製已有小節）",
    en: "Add a new bar to the song (up to 16 bars)"
  },
  descRemoveBar: {
    "zh-CN": "删除指定小节（至少保留 1 小节，默认删除最后一小节）",
    "zh-TW": "刪除指定小節（至少保留 1 小節，預設刪除最後一小節）",
    en: "Remove a bar from the song (at least 1 bar preserved)"
  },
  descSetTrackPattern: {
    "zh-CN": "批量设置指定小节内某音轨的 16 步进节奏开关及音高频率",
    "zh-TW": "批量設定指定小節內某音軌的 16 步進節奏開關及音高頻率",
    en: "Batch set 16-step pattern and pitches for a track in a bar"
  },
  descClearBar: {
    "zh-CN": "清空指定小节内的所有音符步进",
    "zh-TW": "清空指定小節內的所有音符步進",
    en: "Clear all note steps in a specified bar"
  },
  descClearSong: {
    "zh-CN": "一键清空整首曲目中的所有音轨音符，可选重置小节数（默认保留当前小节数）",
    "zh-TW": "一鍵清空整首曲目中的所有音軌音符，可選重置小節數（預設保留當前小節數）",
    en: "Clear all notes across all tracks in the entire song, with optional bar count reset"
  },
  descPlay: {
    "zh-CN": "启动音乐工坊播放（幂等操作，已在播放时保持播放）",
    "zh-TW": "啟動音樂工坊播放（冪等操作，已在播放時保持播放）",
    en: "Start song playback (idempotent)"
  },
  descPause: {
    "zh-CN": "暂停音乐工坊播放（幂等操作，已暂停时保持暂停）",
    "zh-TW": "暫停音樂工坊播放（冪等操作，已暫停時保持暫停）",
    en: "Pause song playback (idempotent)"
  },
  descGetPlaybackStatus: {
    "zh-CN": "查询当前播放状态（是否在播 isPlaying、当前步进 playStep 等）",
    "zh-TW": "查詢當前播放狀態（是否在播 isPlaying、當前步進 playStep 等）",
    en: "Get current playback status (isPlaying, current playStep, etc.)"
  },
  descSetBpm: {
    "zh-CN": "设置音乐工坊的播放速度 (BPM 60-180)",
    "zh-TW": "設定音樂工坊的播放速度 (BPM 60-180)",
    en: "Set song playback tempo (BPM 60-180)"
  },
  descLoadPreset: {
    "zh-CN": "加载预设经典曲目 (mario 超级马里奥 / donkeyKong 大金刚 / oriental 国风 / lofi 慢摇)",
    "zh-TW": "加載預設經典曲目 (mario 超級瑪利歐 / donkeyKong 大金剛 / oriental 國風 / lofi 慢搖)",
    en: "Load a preset song (mario, donkeyKong, oriental, lofi)"
  },
  descToggleStep: {
    "zh-CN": "点亮或熄灭指定小节、音轨和步进格子的音符",
    "zh-TW": "點亮或熄滅指定小節、音軌和步進格子的音符",
    en: "Toggle one step; prefer setStep for deterministic edits and safe retries"
  },
  descSetNoteDuration: {
    "zh-CN": "调整指定音符的持续时长（持续步数，如 2 格、3 格、4 格）",
    "zh-TW": "調整指定音符的持續時長（持續步數，如 2 格、3 格、4 格）",
    en: "Set duration (steps) for a note in a track"
  },
  descSetNotePitch: {
    "zh-CN": "调整指定音符的音调音高 (频率 Hz)",
    "zh-TW": "調整指定音符的音調音高 (頻率 Hz)",
    en: "Set pitch (frequency Hz) for a note in a track"
  },
  descChangeInstrument: {
    "zh-CN": "更换指定音轨的乐器音色",
    "zh-TW": "更換指定音軌的樂器音色",
    en: "Change instrument sound for a track"
  },
  descAddTrack: {
    "zh-CN": "向编曲矩阵中添加一条新的乐器音轨",
    "zh-TW": "向編曲矩陣中添加一條新的樂器音軌",
    en: "Add a new instrument track to the studio"
  },
  descRemoveTrack: {
    "zh-CN": "删除指定的乐器音轨",
    "zh-TW": "刪除指定的樂器音軌",
    en: "Remove an instrument track from the studio"
  }
};

export function t(key: string): string {
  const item = DICT[key];
  if (!item) return key;
  return item[currentLocale] || item["zh-CN"] || key;
}

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
