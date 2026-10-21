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
    "zh-CN": "超级马里奥",
    "zh-TW": "超級瑪利歐",
    en: "Super Mario"
  },
  presetDonkeyKong: {
    "zh-CN": "大金刚 1981",
    "zh-TW": "大金剛 1981",
    en: "Donkey Kong"
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
  // Tool 接口描述
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
