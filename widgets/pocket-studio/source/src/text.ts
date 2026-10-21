export type Locale = "zh-CN" | "zh-TW" | "en";

let currentLocale: Locale = "zh-CN";

export function setLocale(locale: string) {
  if (locale === "zh-TW" || locale === "en") {
    currentLocale = locale;
  } else {
    currentLocale = "zh-CN";
  }
}

const DICT: Record<string, Record<Locale, string>> = {
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
    "zh-CN": "读取音乐工坊的完整状态：包含速度 BPM、小节总数、所有音轨列表以及音符步进矩阵",
    "zh-TW": "讀取音樂工坊的完整狀態：包含速度 BPM、小節總數、所有音軌列表以及音符步進矩陣",
    en: "Get full studio state: BPM, bar count, track list, and note matrix"
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
    en: "Toggle a step on/off for a track in a bar"
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
