import { pudding } from "@pudding/widget";
import type { Seat, TerrainType, WeaponId } from "./types";

type LocaleKey = "zh-CN" | "zh-TW" | "en";

let manualLocale: LocaleKey | null = null;

export function setLocale(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("tw") || lower.includes("hk")) {
    manualLocale = "zh-TW";
  } else if (lower.startsWith("en")) {
    manualLocale = "en";
  } else {
    manualLocale = "zh-CN";
  }
}

export function getLang(): LocaleKey {
  if (manualLocale) return manualLocale;
  try {
    const raw = pudding.locale.read() || "zh-CN";
    if (raw === "en") return "en";
    if (raw === "zh-TW") return "zh-TW";
  } catch {
    /* ignore */
  }
  return "zh-CN";
}

export const messages: Record<LocaleKey, Record<string, string>> = {
  "zh-CN": {
    appTitle: "绝地吃鸡",
    godViewOn: "全图透视",
    godViewOff: "迷雾视角",
    toggleSound: "战场音效",
    pause: "暂停",
    resume: "继续",
    configure: "干员编成",
    newRound: "空降新局",
    phaseLobby: "待命集结",
    phaseDropping: "盲降跳伞阶段 · 落点保密",
    phaseCombat: "第 {cycle} 轮交火 · 安全区 R={radius}",
    phaseFinished: "大吉大利，今晚吃鸡！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈 R={radius} ({center})",
    winnerHeader: "胜者：{seat} · {name}",
    playerYou: "我 (特种指挥官)",
    playerBot: "内置特种兵",
    humanSubTag: "人类玩家 · 亲自操控跳伞、距离拉扯与密电结盟",
    botTag: "高阶战术 AI · 距离风筝/弹药精算/私聊合纵",
    statusAlive: "存活作战",
    statusDropping: "待跳伞",
    statusWaitingDrop: "等待盲降指令...",
    statusEliminated: "已淘汰 #{rank}",
    spawnShieldBadge: "空降护盾 -40%伤",
    iqBadge: "智商分 {score}",
    ammoLabel: "弹药 {ammo}/{max}",
    armorBarLabel: "Lv.{level} 甲 {shield}",
    whisperQuoteTitle: "[密电 → {to}] {text}",
    terrain_plain: "开阔平原",
    terrain_base: "军事基地 (高爆物资)",
    terrain_tower: "雷达高塔 (视野/射程+1)",
    terrain_bush: "隐蔽草丛 (潜行隐身)",
    terrain_bunker: "钢筋掩体 (减伤25%)",
    weapon_fists: "战术匕首",
    weapon_fists_short: "匕首",
    weapon_shotgun: "S12K 霰弹枪",
    weapon_smg: "UMP45 冲锋枪",
    weapon_rifle: "M416 突击步枪",
    weapon_sniper: "98K 狙击步枪",
    weapon_awm: "AWM 空投重狙",
    crate_supply: "战术物资箱",
    crate_airdrop: "黄金空投补给",
    crate_deathbox: "淘汰战利品盒",
    crate_airdrop_tip: "黄金空投箱 (高阶武器与护甲)",
    crate_supply_tip: "军备补给箱 (弹药与装备)",
    crate_deathbox_tip: "战术战利品密封箱",
    tagSafeZone: "安全区",
    tipSafeCenter: "安全区中心",
    tipCqbClash: "近身拼枪交火对峙！",
    tipSonarPing: "探测到战场声纹",
    tipGuarding: "架枪警戒防御中",
    radar_balance_rule:
      "盲降跳伞落点全员保密；第1轮战斗按跳伞逆序行动（后跳者先动），后续轮次按蛇形轮转，且第1轮未行动者享有40%减伤空降护盾。",
    radar_sound_airdrop: "黄金空投降落在 {coord} ({dir} {dist} 格)",
    radar_sound_grenade: "{dir}约 {dist} 格处传来手雷剧烈爆炸声",
    radar_sound_sniper: "{dir}约 {dist} 格处传来重型狙击枪声",
    radar_sound_gunfire: "{dir}约 {dist} 格处传来交火声",
    welcomeTitle: "绝地孤岛 · 大模型高阶智力吃鸡",
    welcomeSub:
      "6 名特工盲降 8×8 对称迷雾孤岛。蛇形先后手轮转 + 空降防秒杀护盾规避先手优势；远近枪械距离克制、弹药限制、声纹听声辨位、定向加密私聊（Whisper）合纵连横，全面检验大模型空间推理与心机博弈！",
    startDropBtn: "登上运输机 · 开始盲降",
    dropPrompt: "点击任意网格盲降（全员落地前坐标保密；先跳者优占资源点，后跳者第1轮优先行动）：",
    combatPrompt: "当前剩余：{ap} AP（点击相邻格移动，点击敌人开火；注意狙击/步枪贴脸1格伤害衰减）",
    actLoot: "搜刮补弹 (1 AP)",
    actHeal: "急救包 ({count}) (1 AP)",
    actGuard: "架枪警戒 (结束回合)",
    actGrenade: "手雷 ({count})",
    whisperPublicOpt: "全频公开广播",
    whisperToPrefix: "密电私聊 ",
    radioPlaceholder: "输入公开广播或定向加密私聊（合纵连横/诱敌深入）...",
    sendRadioBtn: "发送",
    winnerBanner: "大吉大利，今晚吃鸡！胜者：{name}（{kills} 淘汰 · 智商分 {score}）",
    killFeedTitle: "战场实时播报 & 电台密电",
    modalTitle: "空降干员编成与战场规模",
    playerCountLabel: "空降人数规模",
    mode4Players: "4 人闪电战 (紧凑高烈度)",
    mode6Players: "6 人标准大逃杀 (全员博弈)",
    confirmStart: "开始空降",
    cancel: "取消",
    seatConflictError: "同一个 AI 会话不能同时操控两名干员",
    alreadyAssignedTo: "(已分配给 {seat})",
    seatConflictWarning: "同一会话或“我”不可重复分配给多个特工席位",
    instructions:
      "绝地吃鸡（Battle Royale）：8×8 对称战争迷雾网格（列 A–H，行 1–8）高阶智力博弈。首先调用 readRadar 获取你的视野雷达、弹药、安全区、轮转顺序（turnOrder）、定向私聊（privateWhispers）与个人战术备忘（tacticalNote）。【公平与反先手优势机制】：1) 跳伞阶段（dropping）为盲降，全员落地前互不可见落点；2) 第 1 轮交火顺序为跳伞顺序的完全逆序（后跳者先动），且每轮按蛇形轮转（Snake Turn Order）；3) 每名干员在第 1 轮完成自身首次行动前享有「空降护盾」（spawnProtected:true，受到攻击减伤 40% 且免疫单次秒杀）。【距离克制与弹药机制】：霰弹枪贴脸（dist=1）爆发最高（45伤）；步枪（M416）最佳射程 dist>=2（贴脸 0.75 倍衰减）；狙击枪（98K/AWM）最佳射程 dist>=2（贴脸 1 格开镜受限仅 0.5 倍伤害！拿狙被贴脸请先 move 拉开再 attack）。枪械开火消耗 1 发弹药（ammo），耗尽需 loot 补充。每回合 2 AP，调用 takeAction 提交 1～2 步动作，并可通过 radio 公开喊话、whisper 向特定席位发送加密私聊结盟/挑拨、note 记录仅自己可见的跨回合推理笔记。",
    descReady: "确认准备就绪",
    descReadRadar:
      "读取你的专属战术雷达：包含自身坐标、HP、护甲、武器、剩余弹药（ammo）、空降护盾状态、智商分（tacticalScore）、视野内可见地形/物资箱/敌人、视野外声纹方向提示、本轮与下轮行动顺序（turnOrder）、仅你可见的加密私聊（privateWhispers）及个人战术笔记（tacticalNote）。",
    descDropIn:
      "在盲降跳伞阶段（dropping）选择空降坐标（A1–H8，如 'D4'），可选附带公开电台广播 radio 与仅自己可见的战术笔记 note。",
    descTakeAction:
      "在你的战斗回合提交 1～2 步战术动作（每回合 2 AP）：move（移动到相邻格 to）、loot（搜刮当前格物资并补充弹药）、attack（攻击射程内目标 target，注意远距枪贴脸 1 格伤害减半）、heal（使用急救包）、guard（架枪减伤并结束回合）。可选附带公开广播 radio、定向加密私聊 whisper({to,message}) 与私人战术推理笔记 note。",
    notifyInviteSummary: "请你作为 {seat} 空降《绝地吃鸡》战场",
    notifyInviteMessage:
      "你已入座 {seat}。请调用 readRadar 查看战场态势。",
    notifyDropSummary: "轮到 {seat} 盲降选择跳伞坐标",
    notifyDropMessage:
      "运输机已抵达战场上空（盲降模式：后跳伞者将在第 1 轮交火优先行动）！请先调用 readRadar 查看高价值资源区，然后调用 dropIn({coord:'D3', radio:'...', note:'...'}) 选择空降坐标。",
    notifyCombatSummary: "第 {cycle} 轮：轮到 {seat} 行动（2 AP）",
    notifyCombatMessage:
      "第 {cycle} 轮战斗阶段，轮到你（{seat}）行动！请先调用 readRadar 扫描周围敌人、弹药余量、声纹方向、安全区、加密私聊（privateWhispers）与你的上次战术笔记（tacticalNote），然后调用 takeAction 提交 1～2 步战术连招（善用距离拉扯、地形隐身、whisper 密电结盟与 note 备忘）。",
    notifyResultSummary: "《绝地吃鸡》对局结束：{winner} 成功吃鸡！",
    notifyResultMessage:
      "大吉大利，今晚吃鸡！本局最终胜者为 {winner}。",
  },
  "zh-TW": {
    appTitle: "絕地吃雞",
    godViewOn: "全圖透視",
    godViewOff: "迷霧視角",
    toggleSound: "戰場音效",
    pause: "暫停",
    resume: "繼續",
    configure: "幹員編成",
    newRound: "空降新局",
    phaseLobby: "待命集結",
    phaseDropping: "盲降跳傘階段 · 落點保密",
    phaseCombat: "第 {cycle} 輪交火 · 安全區 R={radius}",
    phaseFinished: "大吉大利，今晚吃雞！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈 R={radius} ({center})",
    winnerHeader: "勝者：{seat} · {name}",
    playerYou: "我 (特種指揮官)",
    playerBot: "內置特種兵",
    humanSubTag: "人類玩家 · 親自操控跳傘、距離拉扯與密電結盟",
    botTag: "高階戰術 AI · 距離風箏/彈藥精算/私聊合縱",
    statusAlive: "存活作戰",
    statusDropping: "待跳傘",
    statusWaitingDrop: "等待盲降指令...",
    statusEliminated: "已淘汰 #{rank}",
    spawnShieldBadge: "空降護盾 -40%傷",
    iqBadge: "智商分 {score}",
    ammoLabel: "彈藥 {ammo}/{max}",
    armorBarLabel: "Lv.{level} 甲 {shield}",
    whisperQuoteTitle: "[密電 → {to}] {text}",
    terrain_plain: "開闊平原",
    terrain_base: "軍事基地 (高爆物資)",
    terrain_tower: "雷達高塔 (視野/射程+1)",
    terrain_bush: "隱蔽草叢 (潛行隱身)",
    terrain_bunker: "鋼筋掩體 (減傷25%)",
    weapon_fists: "戰術匕首",
    weapon_fists_short: "匕首",
    weapon_shotgun: "S12K 霰彈槍",
    weapon_smg: "UMP45 衝鋒槍",
    weapon_rifle: "M416 突擊步槍",
    weapon_sniper: "98K 狙擊步槍",
    weapon_awm: "AWM 空投重狙",
    crate_supply: "戰術物資箱",
    crate_airdrop: "黃金空投補給",
    crate_deathbox: "淘汰戰利品盒",
    crate_airdrop_tip: "黃金空投箱 (高階武器與護甲)",
    crate_supply_tip: "軍備補給箱 (彈藥與裝備)",
    crate_deathbox_tip: "戰術戰利品密封箱",
    tagSafeZone: "安全區",
    tipSafeCenter: "安全區中心",
    tipCqbClash: "近身拼槍交火對峙！",
    tipSonarPing: "探測到戰場聲紋",
    tipGuarding: "架槍警戒防禦中",
    radar_balance_rule:
      "盲降跳傘落點全員保密；第1輪戰鬥按跳傘逆序行動（後跳者先動），後續輪次按蛇形輪轉，且第1輪未行動者享有40%減傷空降護盾。",
    radar_sound_airdrop: "黃金空投降落在 {coord} ({dir} {dist} 格)",
    radar_sound_grenade: "{dir}約 {dist} 格處傳來手雷劇烈爆炸聲",
    radar_sound_sniper: "{dir}約 {dist} 格處傳來重型狙擊槍聲",
    radar_sound_gunfire: "{dir}約 {dist} 格處傳來交火聲",
    welcomeTitle: "絕地孤島 · 大模型高階智力吃雞",
    welcomeSub:
      "6 名特工盲降 8×8 對稱迷霧孤島。蛇形先後手輪轉 + 空降防秒殺護盾規避先手優勢；遠近槍械距離克制、彈藥限制、聲紋聽聲辨位、定向加密私聊（Whisper）合縱連橫，全面檢驗大模型空間推理與心機博弈！",
    startDropBtn: "登上運輸機 · 開始盲降",
    dropPrompt: "點擊任意網格盲降（全員落地前座標保密；先跳者優佔資源點，後跳者第1輪優先行動）：",
    combatPrompt: "當前剩餘：{ap} AP（點擊相鄰格移動，點擊敵人開火；注意狙擊/步槍貼臉1格傷害衰減）",
    actLoot: "搜刮補彈 (1 AP)",
    actHeal: "急救包 ({count}) (1 AP)",
    actGuard: "架槍警戒 (結束回合)",
    actGrenade: "手雷 ({count})",
    whisperPublicOpt: "全頻公開廣播",
    whisperToPrefix: "密電私聊 ",
    radioPlaceholder: "輸入公開廣播或定向加密私聊（合縱連橫/誘敵深入）...",
    sendRadioBtn: "發送",
    winnerBanner: "大吉大利，今晚吃雞！勝者：{name}（{kills} 淘汰 · 智商分 {score}）",
    killFeedTitle: "戰場即時播報 & 電台密電",
    modalTitle: "空降幹員編成與戰場規模",
    playerCountLabel: "空降人數規模",
    mode4Players: "4 人閃電戰 (緊湊高烈度)",
    mode6Players: "6 人標準大逃殺 (全員博弈)",
    confirmStart: "開始空降",
    cancel: "取消",
    seatConflictError: "同一個 AI 會話不能同時操控兩名幹員",
    alreadyAssignedTo: "(已分配給 {seat})",
    seatConflictWarning: "同一會話或「我」不可重複分配給多個特工席位",
    instructions:
      "絕地吃雞（Battle Royale）：8×8 對稱戰爭迷霧網格（欄 A–H，列 1–8）高階智力博弈。首先呼叫 readRadar 取得你的視野雷達、彈藥、安全區、輪轉順序（turnOrder）、定向私聊（privateWhispers）與個人戰術備忘（tacticalNote）。【公平與反先手優勢機制】：1) 跳傘階段為盲降，全員落地前互不可見落點；2) 第 1 輪交火順序為跳傘順序的完全逆序（後跳者先動），且每輪按蛇形輪轉；3) 每名幹員在第 1 輪完成自身首次行動前享有「空降護盾」（受到攻擊減傷 40% 且免疫單次秒殺）。【距離克制與彈藥機制】：霰彈槍貼臉（dist=1）爆發最高；狙擊槍（98K/AWM）最佳射程 dist>=2（貼臉 1 格僅 0.5 倍傷害！）。每回合 2 AP，呼叫 takeAction 提交 1～2 步動作，並可透過 radio 公開喊話、whisper 發送加密私聊、note 記錄個人跨回合推理筆記。",
    descReady: "確認準備就緒",
    descReadRadar:
      "讀取你的專屬戰術雷達：包含自身座標、HP、護甲、武器、剩餘彈藥、空降護盾狀態、智商分、視野內地形/物資箱/敵人、聲紋方向提示、行動順序、加密私聊（privateWhispers）及個人戰術筆記（tacticalNote）。",
    descDropIn:
      "在盲降跳傘階段（dropping）選擇空降座標（A1–H8，如 'D4'），可選附帶公開廣播 radio 與個人戰術筆記 note。",
    descTakeAction:
      "在你的戰鬥回合提交 1～2 步戰術動作（每回合 2 AP）：move、loot、attack、heal、guard，可選附带公開廣播 radio、定向加密私聊 whisper({to,message}) 與私人戰術推理筆記 note。",
    notifyInviteSummary: "請你作為 {seat} 空降《絕地吃雞》戰場",
    notifyInviteMessage: "你已入座 {seat}。請呼叫 readRadar 查看戰場態勢。",
    notifyDropSummary: "輪到 {seat} 盲降選擇跳傘座標",
    notifyDropMessage:
      "運輸機已抵達戰場上空（盲降模式：後跳傘者將在第 1 輪優先行動）！請先呼叫 readRadar 查看地圖資源區，然後呼叫 dropIn({coord:'D3', radio:'...', note:'...'}) 選擇空降座標。",
    notifyCombatSummary: "第 {cycle} 輪：輪到 {seat} 行動（2 AP）",
    notifyCombatMessage:
      "第 {cycle} 輪戰鬥階段，輪到你（{seat}）行動！請先呼叫 readRadar 掃描敵人、彈藥、聲紋、安全區、加密私聊與戰術筆記，然後呼叫 takeAction 提交 1～2 步戰術連招。",
    notifyResultSummary: "《絕地吃雞》對局結束：{winner} 成功吃雞！",
    notifyResultMessage: "大吉大利，今晚吃雞！本局最終勝者為 {winner}。",
  },
  en: {
    appTitle: "Battle Royale",
    godViewOn: "God View",
    godViewOff: "Fog of War",
    toggleSound: "Audio FX",
    pause: "Pause",
    resume: "Resume",
    configure: "Roster Setup",
    newRound: "New Drop",
    phaseLobby: "Standby Briefing",
    phaseDropping: "Blind Drop Phase · Stealth Coordinates",
    phaseCombat: "Cycle {cycle} Combat · Safe Zone R={radius}",
    phaseFinished: "Winner Winner Chicken Dinner!",
    aliveCount: "Alive {alive}/{total}",
    stormStatus: "Storm Barrier R={radius} ({center})",
    winnerHeader: "Winner: {seat} · {name}",
    playerYou: "Me (Tactical Commander)",
    playerBot: "Built-in SpecOps",
    humanSubTag: "Human Player · Manual drop, tactical spacing & secret diplomacy",
    botTag: "Tactical AI · Range kiting, ammo economy & encrypted whispers",
    statusAlive: "Active",
    statusDropping: "Airborne",
    statusWaitingDrop: "Awaiting blind drop coordinates...",
    statusEliminated: "K.I.A #{rank}",
    spawnShieldBadge: "Drop Shield -40%",
    iqBadge: "IQ {score}",
    ammoLabel: "Ammo {ammo}/{max}",
    armorBarLabel: "Lv.{level} Armor {shield}",
    whisperQuoteTitle: "[Whisper → {to}] {text}",
    terrain_plain: "Open Plains",
    terrain_base: "Military Base (High-Tier Loot)",
    terrain_tower: "Radar Tower (Vision/Range +1)",
    terrain_bush: "Dense Foliage (Stealth Concealed)",
    terrain_bunker: "Fortified Bunker (-25% Dmg)",
    weapon_fists: "Combat Knife",
    weapon_fists_short: "Knife",
    weapon_shotgun: "S12K Shotgun",
    weapon_smg: "UMP45 SMG",
    weapon_rifle: "M416 Assault Rifle",
    weapon_sniper: "Kar98k Sniper Rifle",
    weapon_awm: "AWM Magnum Sniper",
    crate_supply: "Supply Crate",
    crate_airdrop: "Golden Air Drop",
    crate_deathbox: "Deathbox",
    crate_airdrop_tip: "Golden Air Drop (High-Tier Weapons & Armor)",
    crate_supply_tip: "Supply Crate (Ammo & Gear)",
    crate_deathbox_tip: "Deathbox (Eliminated Operative Loot)",
    tagSafeZone: "SAFE ZONE",
    tipSafeCenter: "Safe Zone Center",
    tipCqbClash: "Point-Blank CQB Clash!",
    tipSonarPing: "Acoustic Ping Detected",
    tipGuarding: "Overwatch Guarding (-35% Dmg)",
    radar_balance_rule:
      "Blind drop coordinates stay secret until all land; Cycle 1 combat order reverses drop order (last dropper acts first), subsequent cycles use snake turn order, and unacted operatives retain a 40% damage-reduction spawn shield.",
    radar_sound_airdrop: "Golden Air Drop landed at {coord} ({dir}, {dist} tiles away)",
    radar_sound_grenade: "Heavy grenade explosion heard approx {dist} tiles away to the {dir}",
    radar_sound_sniper: "High-caliber sniper shot heard approx {dist} tiles away to the {dir}",
    radar_sound_gunfire: "Gunfire heard approx {dist} tiles away to the {dir}",
    welcomeTitle: "Cyber Island · Tactical AI Battle Royale",
    welcomeSub:
      "6 operatives blind-drop onto a symmetric 8×8 Fog-of-War island. Snake turn order & drop shields balance tactical initiative; weapon range brackets, ammo limits, acoustic pings, and encrypted whispers test deep spatial reasoning and diplomatic deception!",
    startDropBtn: "Board Aircraft · Launch Blind Drop",
    dropPrompt: "Click any coordinate to blind-drop (coordinates stay secret until all land; last dropper acts first in Cycle 1):",
    combatPrompt: "Remaining: {ap} AP (Click adjacent tile to move, click target in range to attack; CQB penalty applies at dist=1 for long guns):",
    actLoot: "Loot & Reload (1 AP)",
    actHeal: "First Aid Kit ({count}) (1 AP)",
    actGuard: "Overwatch Guard (End Turn)",
    actGrenade: "Frag Grenade ({count})",
    whisperPublicOpt: "Public Broadcast",
    whisperToPrefix: "Encrypted Whisper: ",
    radioPlaceholder: "Broadcast public radio or encrypted tactical whisper...",
    sendRadioBtn: "Send",
    winnerBanner: "WINNER WINNER CHICKEN DINNER! Champion: {name} ({kills} Kills · Tactical Score {score})",
    killFeedTitle: "Combat Log & Tactical Radio",
    modalTitle: "Operative Roster & Squad Size",
    playerCountLabel: "Squad Roster Size",
    mode4Players: "4 Operatives (Blitz Skirmish)",
    mode6Players: "6 Operatives (Full Battle Royale)",
    confirmStart: "Launch Drop",
    cancel: "Cancel",
    seatConflictError: "The same AI session cannot control multiple operatives",
    alreadyAssignedTo: "(Assigned to {seat})",
    seatConflictWarning: "A single session or 'Me' cannot be assigned to multiple operative seats",
    instructions:
      "Battle Royale: Symmetric 8×8 Fog-of-War grid (Columns A–H, Rows 1–8). First call readRadar to inspect your vision, ammo, safe zone, snake turnOrder, privateWhispers, and personal tacticalNote. [Anti-First-Mover Balance]: 1) Parachute phase (dropping) is blind—landing coords are hidden until everyone lands; 2) Round 1 combat order is the exact reverse of dropOrder (last dropper moves first), and subsequent cycles use rotating Snake Turn Order; 3) Every operative starts with a Spawn Shield (spawnProtected:true, -40% incoming damage & anti-one-shot) until completing their first combat turn. [Weapon Range Brackets & Ammo]: Shotguns dominate at dist=1 (45 dmg); Snipers (98K/AWM) deal full damage at dist>=2 (50/66 dmg) but suffer a 50% CQB penalty at dist=1! Firearms consume 1 ammo per shot (refill via loot). Submit 1–2 steps via takeAction, plus optional public radio, encrypted 1-on-1 whisper({to,message}), and private tacticalNote.",
    descReady: "Confirm readiness",
    descReadRadar:
      "Read your private tactical radar: position, HP, shield, weapon, ammo, spawnProtected, tacticalScore, visible tiles/crates/enemies, acoustic pings, current & next cycle snake turnOrder, privateWhispers, and your personal tacticalNote.",
    descDropIn:
      "Blind-drop into a grid coordinate (A1–H8, e.g. 'D4') during the dropping phase, with optional public radio and private tactical note.",
    descTakeAction:
      "Submit 1–2 tactical steps on your combat turn (2 AP total): move, loot, attack, heal, or guard, plus optional public radio, encrypted whisper({to,message}), and private tacticalNote.",
    notifyInviteSummary: "Deploy as {seat} in Battle Royale",
    notifyInviteMessage: "You are assigned to {seat}. Call readRadar to inspect the battlefield.",
    notifyDropSummary: "{seat}'s turn to blind-drop",
    notifyDropMessage:
      "Transport aircraft overhead (Blind Drop: coordinates stay hidden until all land, and last dropper acts first in Round 1)! Call readRadar, then call dropIn({coord:'D3', radio:'...', note:'...'}) to land.",
    notifyCombatSummary: "Round {cycle}: {seat}'s tactical turn (2 AP)",
    notifyCombatMessage:
      "Round {cycle} combat phase: It is your turn ({seat})! Call readRadar to scan enemies, ammo, sound pings, safe zone, privateWhispers, and your tacticalNote, then call takeAction to execute your 1–2 AP combo.",
    notifyResultSummary: "Battle Royale Finished: {winner} wins!",
    notifyResultMessage: "Winner Winner Chicken Dinner! {winner} is the last operative standing.",
  },
};

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getLang();
  const table = messages[lang] || messages["zh-CN"];
  let raw = table[key] || messages["zh-CN"][key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      raw = raw.replaceAll(`{${k}}`, String(v));
    }
  }
  return raw;
}

export function seatLabel(seat: Seat): string {
  const num = seat.replace("Seat", "");
  const lang = getLang();
  if (lang === "en") return `Operative #${num}`;
  if (lang === "zh-TW") return `${num}號特工`;
  return `${num}号特工`;
}

export function seatShortLabel(seat: Seat): string {
  const num = seat.replace("Seat", "");
  const lang = getLang();
  if (lang === "en") return `#${num}`;
  if (lang === "zh-TW") return `${num}號`;
  return `${num}号`;
}

export function botNameForSeat(seat: Seat): string {
  const lang = getLang();
  if (lang === "en") {
    const mapEn: Record<Seat, string> = {
      Seat1: "Ghost",
      Seat2: "Falcon",
      Seat3: "Viper",
      Seat4: "Titan",
      Seat5: "Shadow",
      Seat6: "Zero",
    };
    return mapEn[seat] || seatLabel(seat);
  }
  if (lang === "zh-TW") {
    const mapTw: Record<Seat, string> = {
      Seat1: "幽靈·Ghost",
      Seat2: "獵鷹·Falcon",
      Seat3: "毒蛇·Viper",
      Seat4: "雷霆·Titan",
      Seat5: "暗影·Shadow",
      Seat6: "零號·Zero",
    };
    return mapTw[seat] || seatLabel(seat);
  }
  const mapCn: Record<Seat, string> = {
    Seat1: "幽灵·Ghost",
    Seat2: "猎鹰·Falcon",
    Seat3: "毒蛇·Viper",
    Seat4: "雷霆·Titan",
    Seat5: "暗影·Shadow",
    Seat6: "零号·Zero",
  };
  return mapCn[seat] || seatLabel(seat);
}

export function weaponLabel(w: WeaponId): string {
  return t(`weapon_${w}`);
}

export function terrainLabel(ter: TerrainType): string {
  return t(`terrain_${ter}`);
}
