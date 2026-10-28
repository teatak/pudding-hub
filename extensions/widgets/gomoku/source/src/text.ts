import { pudding } from "@pudding/widget";

export const messages = {
  en: {
    // 页面与游戏控制
    gamePaused: "Game paused",
    waitingToStart: "Ready for a game",
    draw: "Draw",
    winnerNotice: "{winner} wins",
    startingSoon: "Starting soon",
    waitingForPlayers: "Waiting for players",
    turnToMove: "{color} to move",
    colorBlack: "Black",
    colorWhite: "White",
    roundDetail: "Round {round} · {detail}",
    movesCount: "Moves: {count}",
    freestyleRule: "15 × 15 · freestyle",
    toggleComments: "Toggle player comments",
    showMoveNumbers: "Show move numbers",
    stoneMoveNumber: "Move {number}",
    replay: "Replay",
    replayProgress: "Move {current} / {total}",
    returnToResult: "Back to result",
    previousMove: "Previous move",
    nextMove: "Next move",
    replayNoComment: "No comment at this point",
    continueGame: "Continue",
    pauseGame: "Pause",
    play: "Play",
    newGame: "New game",
    rematch: "Rematch",
    changePlayers: "Change players",
    retry: "Retry",
    dismiss: "Dismiss",

    // 棋手卡片与状态
    playersSection: "Players",
    notInvited: "Not invited",
    statusWinner: "Winner",
    winStamp: "WIN",
    statusFinished: "Finished",
    statusPaused: "Paused",
    statusThinking: "Thinking",
    statusWaiting: "Waiting",
    statusReady: "Ready",
    statusNotReady: "Not ready",
    statusUndecided: "Undecided",
    statusOpen: "Open",
    thinkingTime: "Thinking time",
    totalThinkingTime: "Total time",
    totalTimeUnavailable: "This older score did not record total thinking time",
    you: "You",
    loadingModel: "Loading model",
    connectionOffline: "Offline",
    removeConnection: "Remove",
    removeConnectionNamed: "Remove connection {name}",
    choosePlayer: "Choose a player",
    conversationOrYou: "Conversation or you",
    playOnBoard: "Play on the board",
    sideBlackFirst: "Black · first",
    sideWhiteSecond: "White · second",
    actionReady: "Ready",
    actionCancelReady: "Cancel ready",
    actionResign: "Resign",

    // 弹幕与评论
    playerComments: "Player comments",
    commentPrefix: "Move {number} · ",
    commentPlaceholder: "Say something…",
    commentAria: "Comment on your next move",
    commentHint: "Add an optional comment",

    // 卡片提示语
    hintPaused: "Paused · continue to play",
    hintBothReady: "Both ready · starting soon",
    hintWaitingOpponent: "Ready · waiting for opponent",
    hintWaitingReadiness: "Confirm when ready",
    cardInviteOnStart: "Ready when seated",
    cardCommentsOff: "Comments off",
    cardMatchComplete: "Match complete",
    cardLeaveComment: "Optional comment per move",
    cardChooseFallback: "Select a player or yourself",

    // 棋盘与底部
    boardAria: "Gomoku, row 1 at bottom",
    boardSectionAria: "Board",
    stoneBlack: "Black",
    stoneWhite: "White",
    stoneEmpty: "Empty",
    overlayBothReady: "Both players ready",
    overlayBlackFirst: "Black plays first",
    footerInviteDirect: "Candidates ready · start to assign colors",
    footerChooseMissing: "Agents can join · add a conversation or yourself to fill a seat",
    footerMatchRetained: "Match complete · board retained",
    footerYourTurn: "Your turn · click an intersection",
    footerWatching: "Watching · players act in their conversations",

    // 棋手选择弹窗
    pickerTitle: "Prepare two players",
    pickerSubtitle: "Candidates {count} / 2 · Joined agents fill empty seats",
    pickerInviteAndPlay: "Start game",
    pickerBack: "Back",
    pickerSupplement: "Add a conversation or yourself",
    instructions: "Gomoku: two players on a 15 × 15 freestyle board. Join the candidate pool and wait for the user to start the game; the widget assigns Black and White. Read readBoard for your assigned seat and the current phase. Confirm readiness with ready; both ready starts a countdown. Black moves first. Use placeStone only on your turn; five or more connected stones wins. Pause stops actions; completion is phase finished. Keep awaiting your own activity events between moves; do not start another round or assign participants yourself.",

    // 接口描述
    descReady:
      "Confirm readiness for your assigned color; ready:false cancels readiness before play without changing colors. Both ready starts a 3-second countdown.",
    descPlaceStone:
      "Place your stone at a real board coordinate: column A–O (letter), row 1–15 (number, bottom to top), e.g. {column:'H',row:8}. Optional comment (max 40 characters) is sharp taunts and psychological pressure only (e.g. 'Is that all you got?', 'Careless move'); no casual chit-chat, and never reveal tactics, intent, or game-deciding moves (no 'blocking your four', 'double open three', 'game over', etc.). Returns a compact receipt without board or history; wait for your next move notification.",
    descReadBoard:
      "Read board.text, moveCount, turn, seats, readiness, countdown and your identity. History is omitted by default; includeHistory:true returns the complete ordered history with comments. Columns A–O; rows 1–15 bottom to top.",
    descResign:
      'Concede your own side during play, even on the opponent\'s turn. Call widget_invoke with name:"resign", input:{}. Ends the game and notifies both players.',

    // 模型通知
    notifyInviteSummary: "Game invitation: you are {color}; get ready",
    notifyInviteMessage:
      'You have been assigned {color} for this round; Black plays first. Confirm your own readiness through widget_invoke({targetID,expectedStateVersion,name:"ready",input:{}}). Interfaces are called through widget_invoke, not separate tools. Use this notification\'s targetID and latest stateVersion; it is a concurrency version, not moveCount. Colors are fixed for the round. Both ready starts a 3-second countdown; wait for your move notification. For current state use name:"readBoard",input:{}; on a version conflict, read the current state before trying again. During play, name:"resign",input:{} concedes your own side. History is returned only when readBoard input is {includeHistory:true}.',
    notifyMatchDrawn: "Match drawn",
    notifyMatchFinished: "Match finished: {name} wins",
    notifyResultSummary:
      "{result}. Briefly acknowledge the result. Do not place more stones.",
    notifyWaitingMoveSummary: "{color} to move",
    notifyMoveMessage:
      '{color} to move. The current board and stateVersion are attached. Call widget_invoke with this targetID, expectedStateVersion, name:"placeStone", input:{column:"H",row:8,comment:"Is that all you got?"} (example). Columns A–O, rows 1–15 bottom to top; comment is optional (max 40 chars) for sharp taunts and psychological pressure only—no casual small talk, and never reveal your strategy, planned attacks, or critical board states (no open four, double three, etc.). Play only your side, then wait for the next notification. To concede, use name:"resign", input:{}; read history only when needed via name:"readBoard", input:{includeHistory:true}.',
  },
  "zh-CN": {
    // 页面与游戏控制
    gamePaused: "对局已暂停",
    waitingToStart: "等待开局",
    draw: "本局平局",
    winnerNotice: "{winner}获胜",
    startingSoon: "即将开始",
    waitingForPlayers: "等待就绪",
    turnToMove: "{color}回合",
    colorBlack: "黑方",
    colorWhite: "白方",
    roundDetail: "第 {round} 局 · {detail}",
    movesCount: "{count} 手",
    freestyleRule: "15 × 15 · 自由规则",
    toggleComments: "开关卡片弹幕",
    showMoveNumbers: "显示手数",
    stoneMoveNumber: "第 {number} 手",
    replay: "复盘",
    replayProgress: "第 {current} / {total} 手",
    returnToResult: "返回终局",
    previousMove: "上一步",
    nextMove: "下一步",
    replayNoComment: "该棋手此时没有弹幕",
    continueGame: "继续对局",
    pauseGame: "暂停对局",
    play: "开一局",
    newGame: "重新开局",
    rematch: "再来一局",
    changePlayers: "更换棋手",
    retry: "重试",
    dismiss: "关闭",

    // 棋手卡片与状态
    playersSection: "两位棋手",
    notInvited: "待邀请",
    statusWinner: "本局获胜",
    winStamp: "WIN",
    statusFinished: "本局结束",
    statusPaused: "已暂停",
    statusThinking: "思考中",
    statusWaiting: "等待对手",
    statusReady: "已准备",
    statusNotReady: "等待准备",
    statusUndecided: "待定",
    statusOpen: "空位",
    thinkingTime: "思考用时",
    totalThinkingTime: "累计用时",
    totalTimeUnavailable: "旧棋谱未记录累计用时",
    you: "我",
    loadingModel: "读取模型信息",
    connectionOffline: "离线",
    removeConnection: "移除",
    removeConnectionNamed: "移除连接 {name}",
    choosePlayer: "等待棋手",
    conversationOrYou: "可选会话，也可选自己",
    playOnBoard: "在棋盘上落子",
    sideBlackFirst: "黑棋 · 先手",
    sideWhiteSecond: "白棋 · 后手",
    actionReady: "准备",
    actionCancelReady: "取消准备",
    actionResign: "认输",

    // 弹幕与评论
    playerComments: "棋手弹幕",
    commentPrefix: "第 {number} 手 · ",
    commentPlaceholder: "这手想说什么？",
    commentAria: "随下一手发言",
    commentHint: "落子时可以说一句",

    // 卡片提示语
    hintPaused: "对局暂停 · 继续后可落子",
    hintBothReady: "双方就绪 · 即将开局",
    hintWaitingOpponent: "本方已就绪 · 等待对手",
    hintWaitingReadiness: "就绪后请确认准备",
    cardInviteOnStart: "入座后确认准备",
    cardCommentsOff: "弹幕已关闭",
    cardMatchComplete: "对局已结束",
    cardLeaveComment: "落子时可留一句弹幕",
    cardChooseFallback: "请选择会话或“我”",

    // 棋盘与底部
    boardAria: "五子棋棋盘，最下面为第 1 行",
    boardSectionAria: "棋盘",
    stoneBlack: "黑棋",
    stoneWhite: "白棋",
    stoneEmpty: "空位",
    overlayBothReady: "双方就绪",
    overlayBlackFirst: "黑棋先行",
    footerInviteDirect: "候选已就位 · 开局后分配黑白",
    footerChooseMissing: "Agent 可加入候选 · 也可补充对话或自己",
    footerMatchRetained: "本局结束 · 棋盘保留供查看",
    footerYourTurn: "轮到你了，点击交叉点落子",
    footerWatching: "观战中 · 棋手在各自会话中行动",

    // 棋手选择弹窗
    pickerTitle: "准备两位棋手",
    pickerSubtitle: "候选 {count} / 2 · Agent 加入后自动补位",
    pickerInviteAndPlay: "开始对局",
    pickerBack: "返回",
    pickerSupplement: "补充对话或自己",
    instructions: "这是 15×15 自由规则五子棋，需要两位棋手。加入候选后等待用户开局，小组件负责分配黑白。通过 readBoard 读取自己的席位和阶段，再用 ready 确认准备；双方准备后倒计时开局。黑先白后，仅在自己的回合用 placeStone 落子，连续五子或以上获胜。暂停时停止操作，phase 为 finished 表示结束。行动后等待发给自己的对局事件，不要自行重开或分配参与者。",

    // 接口描述
    descReady:
      "确认已分配颜色的准备状态；开局前 ready:false 取消准备，黑白保持不变。双方准备后倒计时 3 秒。",
    descPlaceStone:
      '按棋盘真实坐标落子：column 为 A–O 字母列，row 为 1–15 数字行（由下向上），例如 {column:"H",row:8}。弹幕可选（最多 40 字），仅限凌厉嘲讽与心理施压（如“你就这点水平？”、“大意了吧”、“这就招架不住了？”）；严禁闲聊废话，严禁透露算路意图（不要出现“准备冲四”、“防你连三”等）或点破关键胜负点（不要出现“已有活四”、“双活机会”、“胜负已分”等剧透内容）。返回简短结果，无棋盘及历史；等待下次落子通知。',
    descReadBoard:
      "读取棋盘多行文本、moveCount 手数、回合、席位、准备状态、倒计时和你的身份。默认无历史；includeHistory:true 返回完整 history 棋谱及弹幕。字母列 A–O，数字行 1–15 由下向上。",
    descResign:
      '对局中为自己认输，对手回合也可调用。通过 widget_invoke 传 name:"resign"、input:{}，结束本局并通知双方。',

    // 模型通知
    notifyInviteSummary: "棋局邀请：你执{color}，请准备",
    notifyInviteMessage:
      '本局已分配你执{color}，黑棋先行。请确认自己的准备状态：widget_invoke({targetID,expectedStateVersion,name:"ready",input:{}})。接口统一通过 widget_invoke 调用，不是独立工具。使用通知中的 targetID 和最新 stateVersion；版本用于并发校验，手数看 moveCount。本局黑白固定。双方准备后读秒 3 秒，收到落子通知再下棋。查询当前状态用 name:"readBoard",input:{}；版本冲突时先读取当前状态再操作。对局中 name:"resign",input:{} 为自己认输。仅在需要棋谱时调用 readBoard，传 {includeHistory:true}。',
    notifyMatchDrawn: "本局平局",
    notifyMatchFinished: "本局结束，{name}获胜",
    notifyResultSummary: "{result}。简短回应结果，不要再落子。",
    notifyWaitingMoveSummary: "等待{color}落子",
    notifyMoveMessage:
      '轮到{color}。通知已附当前棋盘和 stateVersion。调用 widget_invoke，传本局 targetID、expectedStateVersion、name:"placeStone"、input:{column:"H",row:8,comment:"你就这点水平？"}（示例）。字母列 A–O，数字行 1–15 由下向上；弹幕可选（最多 40 字），仅用于凌厉嘲讽与心理压迫，严禁生活化闲聊废话，严禁透露算路意图（如冲四、防守）或剧透胜负关键点（如活四、双活）。只替自己落子，然后等待下次通知。认输用 name:"resign"、input:{}；需要历史时用 name:"readBoard"、input:{includeHistory:true}。',
  },
  "zh-TW": {
    // 页面与游戏控制
    gamePaused: "對局已暫停",
    waitingToStart: "等待開局",
    draw: "本局和局",
    winnerNotice: "{winner}獲勝",
    startingSoon: "即將開始",
    waitingForPlayers: "等待就緒",
    turnToMove: "{color}回合",
    colorBlack: "黑方",
    colorWhite: "白方",
    roundDetail: "第 {round} 局 · {detail}",
    movesCount: "{count} 手",
    freestyleRule: "15 × 15 · 自由規則",
    toggleComments: "開關卡片彈幕",
    showMoveNumbers: "顯示手數",
    stoneMoveNumber: "第 {number} 手",
    replay: "復盤",
    replayProgress: "第 {current} / {total} 手",
    returnToResult: "返回終局",
    previousMove: "上一步",
    nextMove: "下一步",
    replayNoComment: "該棋手此時沒有彈幕",
    continueGame: "繼續對局",
    pauseGame: "暫停對局",
    play: "開一局",
    newGame: "重新開局",
    rematch: "再來一局",
    changePlayers: "更換棋手",
    retry: "重試",
    dismiss: "關閉",

    // 棋手卡片与状态
    playersSection: "兩位棋手",
    notInvited: "待邀請",
    statusWinner: "本局獲勝",
    winStamp: "WIN",
    statusFinished: "本局結束",
    statusPaused: "已暫停",
    statusThinking: "思考中",
    statusWaiting: "等待對手",
    statusReady: "已準備",
    statusNotReady: "等待準備",
    statusUndecided: "待定",
    statusOpen: "空位",
    thinkingTime: "思考用時",
    totalThinkingTime: "累計用時",
    totalTimeUnavailable: "舊棋譜未記錄累計用時",
    you: "我",
    loadingModel: "讀取模型資訊",
    connectionOffline: "離線",
    removeConnection: "移除",
    removeConnectionNamed: "移除連線 {name}",
    choosePlayer: "等待棋手",
    conversationOrYou: "可選對話，也可選自己",
    playOnBoard: "在棋盤上落子",
    sideBlackFirst: "黑棋 · 先手",
    sideWhiteSecond: "白棋 · 後手",
    actionReady: "準備",
    actionCancelReady: "取消準備",
    actionResign: "認輸",

    // 弹幕与评论
    playerComments: "棋手彈幕",
    commentPrefix: "第 {number} 手 · ",
    commentPlaceholder: "這手想說什麼？",
    commentAria: "隨下一手發言",
    commentHint: "落子時可以說一句",

    // 卡片提示语
    hintPaused: "對局暫停 · 繼續後可落子",
    hintBothReady: "雙方就緒 · 即將開局",
    hintWaitingOpponent: "本方已就緒 · 等待對手",
    hintWaitingReadiness: "就緒後請確認準備",
    cardInviteOnStart: "入座後確認準備",
    cardCommentsOff: "彈幕已關閉",
    cardMatchComplete: "對局已結束",
    cardLeaveComment: "落子時可留一句彈幕",
    cardChooseFallback: "請選擇對話或「我」",

    // 棋盘与底部
    boardAria: "五子棋棋盤，最下面為第 1 列",
    boardSectionAria: "棋盤",
    stoneBlack: "黑棋",
    stoneWhite: "白棋",
    stoneEmpty: "空位",
    overlayBothReady: "雙方就緒",
    overlayBlackFirst: "黑棋先行",
    footerInviteDirect: "候選已就位 · 開局後分配黑白",
    footerChooseMissing: "Agent 可加入候選 · 也可補充對話或自己",
    footerMatchRetained: "本局結束 · 保留棋盤供查看",
    footerYourTurn: "輪到你了，點擊交叉點落子",
    footerWatching: "觀戰中 · 棋手在各自對話中行動",

    // 棋手选择弹窗
    pickerTitle: "準備兩位棋手",
    pickerSubtitle: "候選 {count} / 2 · Agent 加入後自動補位",
    pickerInviteAndPlay: "開始對局",
    pickerBack: "返回",
    pickerSupplement: "補充對話或自己",
    instructions: "這是 15×15 自由規則五子棋，需要兩位棋手。加入候選後等待使用者開局，小元件負責分配黑白。透過 readBoard 讀取自己的席位和階段，再用 ready 確認準備；雙方準備後倒數開局。黑先白後，僅在自己的回合用 placeStone 落子，連續五子或以上獲勝。暫停時停止操作，phase 為 finished 表示結束。行動後等待發給自己的對局事件，不要自行重開或分配參與者。",

    // 接口描述
    descReady:
      "確認已分配顏色的準備狀態；開局前 ready:false 取消準備，黑白保持不變。雙方準備後倒數 3 秒。",
    descPlaceStone:
      '按棋盤實際座標落子：column 為 A–O 字母欄，row 為 1–15 數字列（由下向上），例如 {column:"H",row:8}。彈幕可選（最多 40 字），僅限凌厲嘲諷與心理施壓（如「你就這點水準？」、「大意了吧」、「這就招架不住了？」）；嚴禁閒聊廢話，嚴禁透露算路意圖（不要出現「準備沖四」、「防你連三」等）或點破關鍵勝負點（不要出現「已有活四」、「雙活機會」、「勝負已分」等劇透內容）。回傳簡短結果，無棋盤及歷史；等待下次落子通知。',
    descReadBoard:
      "讀取棋盤多行文字、moveCount 手數、回合、席位、準備狀態、倒數和你的身分。預設無歷史；includeHistory:true 回傳完整 history 棋譜及彈幕。字母欄 A–O，數字列 1–15 由下向上。",
    descResign:
      '對局中為自己認輸，對手回合也可呼叫。透過 widget_invoke 傳 name:"resign"、input:{}，結束本局並通知雙方。',

    // 模型通知
    notifyInviteSummary: "棋局邀請：你執{color}，請準備",
    notifyInviteMessage:
      '本局已分配你執{color}，黑棋先行。請確認自己的準備狀態：widget_invoke({targetID,expectedStateVersion,name:"ready",input:{}})。介面統一透過 widget_invoke 呼叫，不是獨立工具。使用通知中的 targetID 和最新 stateVersion；版本用於並行校驗，手數看 moveCount。本局黑白固定。雙方準備後倒數 3 秒，收到落子通知再下棋。查詢目前狀態用 name:"readBoard",input:{}；版本衝突時先讀取目前狀態再操作。對局中 name:"resign",input:{} 為自己認輸。僅在需要棋譜時呼叫 readBoard，傳 {includeHistory:true}。',
    notifyMatchDrawn: "本局和局",
    notifyMatchFinished: "本局結束，{name}獲勝",
    notifyResultSummary: "{result}。簡短回應結果，不要再落子。",
    notifyWaitingMoveSummary: "等待{color}落子",
    notifyMoveMessage:
      '輪到{color}。通知已附目前棋盤和 stateVersion。呼叫 widget_invoke，傳本局 targetID、expectedStateVersion、name:"placeStone"、input:{column:"H",row:8,comment:"你就這點水準？"}（範例）。字母欄 A–O，數字列 1–15 由下向上；彈幕可選（最多 40 字），僅用於凌厲嘲諷與心理壓迫，嚴禁生活化閒聊廢話，嚴禁透露算路意圖（如沖四、防守）或劇透勝負關鍵點（如活四、雙活）。只替自己落子，然後等待下次通知。認輸用 name:"resign"、input:{}；需要歷史時用 name:"readBoard"、input:{includeHistory:true}。',
  },
} as const;

export type MessageKey = keyof (typeof messages)["zh-CN"];

export function t<K extends MessageKey>(
  key: K,
  params?: Record<string, string | number>,
): string {
  const locale = pudding.locale.read();
  const lang = locale === "en" ? "en" : locale === "zh-TW" ? "zh-TW" : "zh-CN";
  return messages[lang][key].replace(/\{(\w+)\}/g, (token, name) =>
    params && Object.hasOwn(params, name) ? String(params[name]) : token,
  );
}

const errors: Record<string, [string, string]> = {
  "Only the user can assign participants and start an activity": ["请由用户确认棋手并开始对局", "請由使用者確認棋手並開始對局"],
  "Only the user can remove candidates; MCP agents can use widget_disconnect to leave": ["请由用户移除候选；Agent 可主动退出", "請由使用者移除候選；Agent 可主動退出"],
  "Connect to this game first": ["请先连接棋局", "請先連接棋局"],
  Cancelled: ["操作已取消", "操作已取消"],
  "Game is paused": ["对局已暂停，请先继续对局", "對局已暫停，請先繼續對局"],
  "You are observing this round": ["你是本局观战者", "你是本局觀戰者"],
  "Choose exactly two players": ["请选择两位棋手", "請選擇兩位棋手"],
  "Wait until both players are ready and the countdown finishes": [
    "请等待双方准备并完成倒计时",
    "請等待雙方準備並完成倒數",
  ],
  "Not your turn": ["还没轮到你", "還沒輪到你"],
  "No ongoing match": ["当前没有进行中的对局", "目前沒有進行中的對局"],
  "You have no seat": ["你还没有入座", "你還沒有入座"],
  "Match is finished": ["本局已结束", "本局已結束"],
  "Use columns A–O and rows 1–15": [
    "列请使用 A–O 字母，行请使用 1–15 数字",
    "欄請使用 A–O 字母，列請使用 1–15 數字",
  ],
  "Cell is occupied": ["此处已经有棋子", "此處已經有棋子"],
  "Keep your comment within 40 characters": [
    "弹幕不能超过 40 字",
    "彈幕不能超過 40 字",
  ],
  "The game has already started": ["对局已经开始", "對局已經開始"],
  "Wait for the countdown": ["请等待倒计时结束", "請等待倒數結束"],
  "An operation is in progress": ["当前操作尚未完成", "目前操作尚未完成"],
};

export function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const pair = errors[message];
  if (!pair) return message;
  const locale = pudding.locale.read();
  return locale === "en" ? message : locale === "zh-TW" ? pair[1] : pair[0];
}
