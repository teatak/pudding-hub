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
    movesCount: "{count} moves",
    freestyleRule: "15 × 15 · freestyle",
    toggleComments: "Toggle player comments",
    continueGame: "Continue",
    pauseGame: "Pause",
    play: "Play",
    newGame: "New game",
    rematch: "Rematch",
    retry: "Retry",
    dismiss: "Dismiss",

    // 棋手卡片与状态
    playersSection: "Players",
    notInvited: "Not invited",
    statusWinner: "Winner",
    statusFinished: "Finished",
    statusPaused: "Paused",
    statusThinking: "Thinking",
    statusWaiting: "Waiting",
    statusReady: "Ready",
    statusNotReady: "Not ready",
    statusChoosing: "Choosing",
    statusUndecided: "Undecided",
    statusOpen: "Open",
    thinkingTime: "Thinking time",
    you: "You",
    loadingModel: "Loading model",
    choosePlayer: "Choose a player",
    conversationOrYou: "Conversation or you",
    playOnBoard: "Play on the board",
    sideBlackFirst: "Black · first",
    sideWhiteSecond: "White · second",
    chooseBlack: "Black",
    chooseWhite: "White",
    actionReady: "Ready",
    actionCancelReady: "Cancel ready",
    actionLeave: "Leave",
    actionResign: "Resign",

    // 弹幕与评论
    commentPrefix: "Move {number} · ",
    commentPlaceholder: "Say something…",
    commentAria: "Comment on your next move",
    commentHint: "Add a comment with your move",

    // 卡片提示语
    hintPaused: "Game paused; continue to act",
    hintBothReady: "Both players ready; starting soon",
    hintWaitingOpponent: "This player is ready; waiting for the opponent",
    hintWaitingReadiness: "This player has a side; waiting for readiness",
    hintWaitingSide: "Waiting for this player to choose a side",
    cardInviteOnStart: "Invite this conversation on start",
    cardCommentsOff: "Comments off",
    cardMatchComplete: "Match complete",
    cardLeaveComment: "One comment with each move",
    cardChooseFallback: "Choose a conversation or yourself",

    // 棋盘与底部
    boardAria: "Gomoku, row 1 at bottom",
    boardSectionAria: "Board",
    stoneBlack: "Black",
    stoneWhite: "White",
    stoneEmpty: "Empty",
    overlayBothReady: "Both players ready",
    overlayBlackFirst: "Black plays first",
    footerInviteDirect: "Current conversations · invite on start",
    footerChooseMissing: "Choose the missing player on start",
    footerMatchRetained: "Match complete · board retained",
    footerYourTurn: "Your turn · click an intersection",
    footerWatching: "Watching · players act in their conversations",

    // 棋手选择弹窗
    pickerTitle: "Choose two players",
    pickerSubtitle: "Selected {count} / 2 · You can join too",
    pickerInviteAndPlay: "Invite and play",
    pickerBack: "Back",

    // 接口描述
    descJoinSeat: "Choose your own available Black or White seat.",
    descReady:
      "Ready your own seat; ready:false cancels readiness before play. Both ready starts a 3-second countdown.",
    descLeaveSeat:
      "Leave your own seat before play, cancelling the countdown.",
    descPlaceStone:
      "Place your stone at a real board coordinate: column A–O (letter), row 1–15 (number, bottom to top), e.g. {column:'H',row:8}. Include an optional comment (max 40 characters). Returns a compact receipt without board or history; wait for your next move notification.",
    descReadBoard:
      "Read board.text, moveCount, turn, seats, readiness, countdown and your identity. History is omitted by default; includeHistory:true returns the complete ordered history with comments. Columns A–O; rows 1–15 bottom to top.",
    descResign:
      'Concede your own side during play, even on the opponent\'s turn. Call widget_invoke with name:"resign", input:{}. Ends the game and notifies both players.',

    // 模型通知
    notifyInviteSummary: "Game invitation: choose a side and get ready",
    notifyInviteMessage:
      'You are invited to Gomoku. Interfaces are called through widget_invoke, not separate tools: widget_invoke({targetID,expectedStateVersion,name:"readBoard",input:{}}). Use this notification\'s targetID and latest stateVersion; it is a concurrency version, not moveCount. Read the board, joinSeat with {role:"Black"} or {role:"White"}, then ready with {}. Choose only your own available seat. Both ready starts a 3-second countdown; wait for your move notification. During play, resign with {} concedes your own side. readBoard omits history unless input is {includeHistory:true}.',
    notifyMatchDrawn: "Match drawn",
    notifyMatchFinished: "Match finished: {name} wins",
    notifyResultSummary:
      "The match finished: {winner}. Briefly acknowledge the result. Do not place more stones.",
    notifyWaitingMoveSummary: "{color} to move",
    notifyMoveMessage:
      '{color} to move. The current board and stateVersion are attached. Call widget_invoke with this targetID, expectedStateVersion, name:"placeStone", input:{column:"H",row:8,comment:"Center opening"} (example). Columns A–O, rows 1–15 bottom to top; comment is optional, max 40 characters. Play only your side, then wait for the next notification. To concede, use name:"resign", input:{}; read history only when needed via name:"readBoard", input:{includeHistory:true}.',
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
    continueGame: "继续对局",
    pauseGame: "暂停对局",
    play: "开一局",
    newGame: "重新开局",
    rematch: "再来一局",
    retry: "重试",
    dismiss: "关闭",

    // 棋手卡片与状态
    playersSection: "两位棋手",
    notInvited: "待邀请",
    statusWinner: "本局获胜",
    statusFinished: "本局结束",
    statusPaused: "已暂停",
    statusThinking: "思考中",
    statusWaiting: "等待对手",
    statusReady: "已准备",
    statusNotReady: "等待准备",
    statusChoosing: "等待选边",
    statusUndecided: "待定",
    statusOpen: "空位",
    thinkingTime: "思考用时",
    you: "我",
    loadingModel: "读取模型信息",
    choosePlayer: "等待棋手",
    conversationOrYou: "可选会话，也可选自己",
    playOnBoard: "在棋盘上落子",
    sideBlackFirst: "黑棋 · 先手",
    sideWhiteSecond: "白棋 · 后手",
    chooseBlack: "执黑",
    chooseWhite: "执白",
    actionReady: "准备",
    actionCancelReady: "取消准备",
    actionLeave: "离座",
    actionResign: "认输",

    // 弹幕与评论
    commentPrefix: "第 {number} 手 · ",
    commentPlaceholder: "这手想说什么？",
    commentAria: "随下一手发言",
    commentHint: "落子时，也可以说一句",

    // 卡片提示语
    hintPaused: "对局已暂停，继续后可操作",
    hintBothReady: "双方已准备，即将开局",
    hintWaitingOpponent: "本方已准备，等待对手就绪",
    hintWaitingReadiness: "本方已选边，等待准备",
    hintWaitingSide: "等待本方选择黑棋或白棋",
    cardInviteOnStart: "开局后，邀请当前会话",
    cardCommentsOff: "弹幕已关闭",
    cardMatchComplete: "对局已结束",
    cardLeaveComment: "落子时可以留一句话",
    cardChooseFallback: "补选会话或“我”",

    // 棋盘与底部
    boardAria: "五子棋棋盘，最下面为第 1 行",
    boardSectionAria: "棋盘",
    stoneBlack: "黑棋",
    stoneWhite: "白棋",
    stoneEmpty: "空位",
    overlayBothReady: "双方就绪",
    overlayBlackFirst: "黑棋先行",
    footerInviteDirect: "当前两个会话 · 开局后直接邀请",
    footerChooseMissing: "开局时补齐两位棋手",
    footerMatchRetained: "本局结束 · 棋盘保留供查看",
    footerYourTurn: "轮到你了，点击交叉点落子",
    footerWatching: "观战中 · 棋手在各自会话中行动",

    // 棋手选择弹窗
    pickerTitle: "补齐两位棋手",
    pickerSubtitle: "已选 {count} / 2 · 也可以自己上场",
    pickerInviteAndPlay: "邀请并开局",
    pickerBack: "返回",

    // 接口描述
    descJoinSeat: "选择自己空闲的 Black 或 White 席位。",
    descReady:
      "准备自己的席位；开局前 ready:false 取消准备。双方准备后读秒 3 秒。",
    descLeaveSeat: "开局前离开自己的席位，同时取消倒计时。",
    descPlaceStone:
      '按棋盘真实坐标落子：column 为 A–O 字母列，row 为 1–15 数字行（由下向上），例如 {column:"H",row:8}。可附最多 40 字弹幕。返回简短结果，无棋盘及历史；等待下次落子通知。',
    descReadBoard:
      "读取棋盘多行文本、moveCount 手数、回合、席位、准备状态、倒计时和你的身份。默认无历史；includeHistory:true 返回完整 history 棋谱及弹幕。字母列 A–O，数字行 1–15 由下向上。",
    descResign:
      '对局中为自己认输，对手回合也可调用。通过 widget_invoke 传 name:"resign"、input:{}，结束本局并通知双方。',

    // 模型通知
    notifyInviteSummary: "棋局邀请：请选边并准备",
    notifyInviteMessage:
      '邀请你参加五子棋。接口统一通过 widget_invoke 调用，不是独立工具：widget_invoke({targetID,expectedStateVersion,name:"readBoard",input:{}})。使用通知中的 targetID 和最新 stateVersion；版本用于并发校验，手数看 moveCount。查看局面后，joinSeat 传 {role:"Black"} 或 {role:"White"} 选择自己的空位，再 ready 传 {}。双方准备后读秒 3 秒，收到落子通知再下棋。对局中可用 resign 传 {} 为自己认输。readBoard 默认不返回历史，需要时传 {includeHistory:true}。',
    notifyMatchDrawn: "本局平局",
    notifyMatchFinished: "本局结束，{name}获胜",
    notifyResultSummary: "本局结束：{winner}。简短回应结果，不要再落子。",
    notifyWaitingMoveSummary: "等待{color}落子",
    notifyMoveMessage:
      '轮到{color}。通知已附当前棋盘和 stateVersion。调用 widget_invoke，传本局 targetID、expectedStateVersion、name:"placeStone"、input:{column:"H",row:8,comment:"天元开局"}（示例）。字母列 A–O，数字行 1–15 由下向上；弹幕可选，最多 40 字。只替自己落子，然后等待下次通知。认输用 name:"resign"、input:{}；需要历史时用 name:"readBoard"、input:{includeHistory:true}。',
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
    continueGame: "繼續對局",
    pauseGame: "暫停對局",
    play: "開一局",
    newGame: "重新開局",
    rematch: "再來一局",
    retry: "重試",
    dismiss: "關閉",

    // 棋手卡片与状态
    playersSection: "兩位棋手",
    notInvited: "待邀請",
    statusWinner: "本局獲勝",
    statusFinished: "本局結束",
    statusPaused: "已暫停",
    statusThinking: "思考中",
    statusWaiting: "等待對手",
    statusReady: "已準備",
    statusNotReady: "等待準備",
    statusChoosing: "等待選邊",
    statusUndecided: "待定",
    statusOpen: "空位",
    thinkingTime: "思考用時",
    you: "我",
    loadingModel: "讀取模型資訊",
    choosePlayer: "等待棋手",
    conversationOrYou: "可選對話，也可選自己",
    playOnBoard: "在棋盤上落子",
    sideBlackFirst: "黑棋 · 先手",
    sideWhiteSecond: "白棋 · 後手",
    chooseBlack: "執黑",
    chooseWhite: "執白",
    actionReady: "準備",
    actionCancelReady: "取消準備",
    actionLeave: "離座",
    actionResign: "認輸",

    // 弹幕与评论
    commentPrefix: "第 {number} 手 · ",
    commentPlaceholder: "這手想說什麼？",
    commentAria: "隨下一手發言",
    commentHint: "落子時，也可以說一句",

    // 卡片提示语
    hintPaused: "對局已暫停，繼續後可操作",
    hintBothReady: "雙方已準備，即將開局",
    hintWaitingOpponent: "本方已準備，等待對手就緒",
    hintWaitingReadiness: "本方已選邊，等待準備",
    hintWaitingSide: "等待本方選擇黑棋或白棋",
    cardInviteOnStart: "開局後，邀請目前對話",
    cardCommentsOff: "彈幕已關閉",
    cardMatchComplete: "對局已結束",
    cardLeaveComment: "落子時可以留一句話",
    cardChooseFallback: "補選對話或「我」",

    // 棋盘与底部
    boardAria: "五子棋棋盤，最下面為第 1 列",
    boardSectionAria: "棋盤",
    stoneBlack: "黑棋",
    stoneWhite: "白棋",
    stoneEmpty: "空位",
    overlayBothReady: "雙方就緒",
    overlayBlackFirst: "黑棋先行",
    footerInviteDirect: "目前兩個對話 · 開局後直接邀請",
    footerChooseMissing: "開局時補齊兩位棋手",
    footerMatchRetained: "本局結束 · 保留棋盤供查看",
    footerYourTurn: "輪到你了，點擊交叉點落子",
    footerWatching: "觀戰中 · 棋手在各自對話中行動",

    // 棋手选择弹窗
    pickerTitle: "補齊兩位棋手",
    pickerSubtitle: "已選 {count} / 2 · 也可以自己上場",
    pickerInviteAndPlay: "邀請並開局",
    pickerBack: "返回",

    // 接口描述
    descJoinSeat: "選擇自己空閒的 Black 或 White 席位。",
    descReady:
      "準備自己的席位；開局前 ready:false 取消準備。雙方準備後倒數 3 秒。",
    descLeaveSeat: "開局前離開自己的席位，同時取消倒數。",
    descPlaceStone:
      '按棋盤實際座標落子：column 為 A–O 字母欄，row 為 1–15 數字列（由下向上），例如 {column:"H",row:8}。可附最多 40 字彈幕。回傳簡短結果，無棋盤及歷史；等待下次落子通知。',
    descReadBoard:
      "讀取棋盤多行文字、moveCount 手數、回合、席位、準備狀態、倒數和你的身分。預設無歷史；includeHistory:true 回傳完整 history 棋譜及彈幕。字母欄 A–O，數字列 1–15 由下向上。",
    descResign:
      '對局中為自己認輸，對手回合也可呼叫。透過 widget_invoke 傳 name:"resign"、input:{}，結束本局並通知雙方。',

    // 模型通知
    notifyInviteSummary: "棋局邀請：請選邊並準備",
    notifyInviteMessage:
      '邀請你參加五子棋。介面統一透過 widget_invoke 呼叫，不是獨立工具：widget_invoke({targetID,expectedStateVersion,name:"readBoard",input:{}})。使用通知中的 targetID 和最新 stateVersion；版本用於並行校驗，手數看 moveCount。查看局面後，joinSeat 傳 {role:"Black"} 或 {role:"White"} 選擇自己的空位，再 ready 傳 {}。雙方準備後倒數 3 秒，收到落子通知再下棋。對局中可用 resign 傳 {} 為自己認輸。readBoard 預設不回傳歷史，需要時傳 {includeHistory:true}。',
    notifyMatchDrawn: "本局和局",
    notifyMatchFinished: "本局結束，{name}獲勝",
    notifyResultSummary: "本局結束：{winner}。簡短回應結果，不要再落子。",
    notifyWaitingMoveSummary: "等待{color}落子",
    notifyMoveMessage:
      '輪到{color}。通知已附目前棋盤和 stateVersion。呼叫 widget_invoke，傳本局 targetID、expectedStateVersion、name:"placeStone"、input:{column:"H",row:8,comment:"天元開局"}（範例）。字母欄 A–O，數字列 1–15 由下向上；彈幕可選，最多 40 字。只替自己落子，然後等待下次通知。認輸用 name:"resign"、input:{}；需要歷史時用 name:"readBoard"、input:{includeHistory:true}。',
  },
} as const;

export type MessageKey = keyof typeof messages["zh-CN"];

export function t<K extends MessageKey>(
  key: K,
  params?: Record<string, string | number>,
): string {
  const locale = pudding.locale.read();
  const lang =
    locale === "en" ? "en" : locale === "zh-TW" ? "zh-TW" : "zh-CN";
  let str: string = messages[lang]?.[key] ?? messages["zh-CN"][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

const errors: Record<string, [string, string]> = {
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
  "Unknown seat": ["未知席位", "未知席位"],
  "Seat occupied; choose the other seat": [
    "席位已被占用，请选择另一边",
    "席位已被佔用，請選擇另一邊",
  ],
  "Leave your current seat before switching": [
    "请先离座再换边",
    "請先離座再換邊",
  ],
  "Choose a seat before getting ready": [
    "请先选边，再准备",
    "請先選邊，再準備",
  ],
  "Start a new round before changing seats": [
    "请重新开局后再换边",
    "請重新開局後再換邊",
  ],
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

// 保留向后兼容性
export const text = (en: string, cn: string, tw?: string) => {
  const locale = pudding.locale.read();
  return locale === "en" ? en : locale === "zh-TW" ? (tw ?? cn) : cn;
};
