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

function getLang(): LocaleKey {
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
    playerYou: "我 (特种指挥官)",
    playerBot: "内置特种兵",
    humanSubTag: "人类玩家 · 亲自操控跳伞、距离拉扯与密电结盟",
    botTag: "高阶战术 AI · 距离风筝/弹药精算/私聊合纵",
    statusAlive: "存活作战",
    statusDropping: "待跳伞",
    statusEliminated: "已淘汰 #{rank}",
    spawnShieldBadge: "空降护盾 -40%伤",
    iqBadge: "智商分 {score}",
    ammoLabel: "弹药 {ammo}/{max}",
    terrain_plain: "开阔平原",
    terrain_base: "军事基地 (高爆物资)",
    terrain_tower: "雷达高塔 (视野/射程+1)",
    terrain_bush: "隐蔽草丛 (潜行隐身)",
    terrain_bunker: "钢筋掩体 (减伤25%)",
    weapon_fists: "战术匕首",
    weapon_shotgun: "S12K 霰弹枪",
    weapon_smg: "UMP45 冲锋枪",
    weapon_rifle: "M416 突击步枪",
    weapon_sniper: "98K 狙击步枪",
    weapon_awm: "AWM 空投重狙",
    crate_supply: "战术物资箱",
    crate_airdrop: "黄金空投补给",
    crate_deathbox: "淘汰战利品盒",
    welcomeTitle: "绝地孤岛 · 大模型高阶智力吃鸡",
    welcomeSub:
      "6 名特工盲降 8×6 对称迷雾孤岛。蛇形先后手轮转 + 空降防秒杀护盾规避先手优势；远近枪械距离克制、弹药限制、声纹听声辨位、定向加密私聊（Whisper）合纵连横，全面检验大模型空间推理与心机博弈！",
    startDropBtn: "登上运输机 · 开始盲降",
    dropPrompt: "点击任意网格盲降（全员落地前坐标保密；先跳者优占资源点，后跳者第1轮优先行动）：",
    combatPrompt: "当前剩余：{ap} AP（点击相邻格移动，点击敌人开火；注意狙击/步枪贴脸1格伤害衰减）",
    actLoot: "搜刮补弹 (1 AP)",
    actHeal: "急救包 ({count}) (1 AP)",
    actGuard: "架枪警戒 (结束回合)",
    actGrenade: "手雷 ({count})",
    whisperPublicOpt: "📢 全频公开广播",
    whisperToPrefix: "🔒 密电私聊 ",
    radioPlaceholder: "输入公开广播或定向加密私聊（合纵连横/诱敌深入）...",
    sendRadioBtn: "广播",
    winnerBanner: "🏆 大吉大利，今晚吃鸡！胜者：{name}（{kills} 淘汰 · 智商分 {score}）",
    killFeedTitle: "战场实时播报 & 电台密电",
    modalTitle: "空降干员编成与战场规模",
    playerCountLabel: "空降人数规模",
    mode4Players: "4 人闪电战 (紧凑高烈度)",
    mode6Players: "6 人标准大逃杀 (全员博弈)",
    confirmStart: "开始空降",
    cancel: "取消",
    seatConflictError: "同一个 AI 会话不能同时操控两名干员",
    instructions:
      "绝地吃鸡（Battle Royale）：8×6 对称战争迷雾网格（列 A–H，行 1–6）高阶智力博弈。首先调用 readRadar 获取你的视野雷达、弹药、安全区、轮转顺序（turnOrder）、定向私聊（privateWhispers）与个人战术备忘（tacticalNote）。【公平与反先手优势机制】：1) 跳伞阶段（dropping）为盲降，全员落地前互不可见落点；2) 第 1 轮交火顺序为跳伞顺序的完全逆序（后跳者先动），且每轮按蛇形轮转（Snake Turn Order）；3) 每名干员在第 1 轮完成自身首次行动前享有「空降护盾」（spawnProtected:true，受到攻击减伤 40% 且免疫单次秒杀）。【距离克制与弹药机制】：霰弹枪贴脸（dist=1）爆发最高（45伤）；步枪（M416）最佳射程 dist>=2（贴脸 0.75 倍衰减）；狙击枪（98K/AWM）最佳射程 dist>=2（贴脸 1 格开镜受限仅 0.5 倍伤害！拿狙被贴脸请先 move 拉开再 attack）。枪械开火消耗 1 发弹药（ammo），耗尽需 loot 补充。每回合 2 AP，调用 takeAction 提交 1～2 步动作，并可通过 radio 公开喊话、whisper 向特定席位发送加密私聊结盟/挑拨、note 记录仅自己可见的跨回合推理笔记。",
    descReady: "确认准备就绪",
    descReadRadar:
      "读取你的专属战术雷达：包含自身坐标、HP、护甲、武器、剩余弹药（ammo）、空降护盾状态、智商分（tacticalScore）、视野内可见地形/物资箱/敌人、视野外声纹方向提示、本轮与下轮行动顺序（turnOrder）、仅你可见的加密私聊（privateWhispers）及个人战术笔记（tacticalNote）。",
    descDropIn:
      "在盲降跳伞阶段（dropping）选择空降坐标（A1–H6，如 'D3'），可选附带公开电台广播 radio 与仅自己可见的战术笔记 note。",
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
    playerYou: "我 (特種指揮官)",
    playerBot: "內置特種兵",
    humanSubTag: "人類玩家 · 親自操控跳傘、距離拉扯與密電結盟",
    botTag: "高階戰術 AI · 距離風箏/彈藥精算/私聊合縱",
    statusAlive: "存活作戰",
    statusDropping: "待跳傘",
    statusEliminated: "已淘汰 #{rank}",
    spawnShieldBadge: "空降護盾 -40%傷",
    iqBadge: "智商分 {score}",
    ammoLabel: "彈藥 {ammo}/{max}",
    terrain_plain: "開闊平原",
    terrain_base: "軍事基地 (高爆物資)",
    terrain_tower: "雷達高塔 (視野/射程+1)",
    terrain_bush: "隱蔽草叢 (潛行隱身)",
    terrain_bunker: "鋼筋掩體 (減傷25%)",
    weapon_fists: "戰術匕首",
    weapon_shotgun: "S12K 霰彈槍",
    weapon_smg: "UMP45 衝鋒槍",
    weapon_rifle: "M416 突擊步槍",
    weapon_sniper: "98K 狙擊步槍",
    weapon_awm: "AWM 空投重狙",
    crate_supply: "戰術物資箱",
    crate_airdrop: "黃金空投補給",
    crate_deathbox: "淘汰戰利品盒",
    welcomeTitle: "絕地孤島 · 大模型高階智力吃雞",
    welcomeSub:
      "6 名特工盲降 8×6 對稱迷霧孤島。蛇形先後手輪轉 + 空降防秒殺護盾規避先手優勢；遠近槍械距離克制、彈藥限制、聲紋聽聲辨位、定向加密私聊（Whisper）合縱連橫，全面檢驗大模型空間推理與心機博弈！",
    startDropBtn: "登上運輸機 · 開始盲降",
    dropPrompt: "點擊任意網格盲降（全員落地前座標保密；先跳者優佔資源點，後跳者第1輪優先行動）：",
    combatPrompt: "當前剩餘：{ap} AP（點擊相鄰格移動，點擊敵人開火；注意狙擊/步槍貼臉1格傷害衰減）",
    actLoot: "搜刮補彈 (1 AP)",
    actHeal: "急救包 ({count}) (1 AP)",
    actGuard: "架槍警戒 (結束回合)",
    actGrenade: "手雷 ({count})",
    whisperPublicOpt: "📢 全頻公開廣播",
    whisperToPrefix: "🔒 密電私聊 ",
    radioPlaceholder: "輸入公開廣播或定向加密私聊（合縱連橫/誘敵深入）...",
    sendRadioBtn: "廣播",
    winnerBanner: "🏆 大吉大利，今晚吃雞！勝者：{name}（{kills} 淘汰 · 智商分 {score}）",
    killFeedTitle: "戰場即時播報 & 電台密電",
    modalTitle: "空降幹員編成與戰場規模",
    playerCountLabel: "空降人數規模",
    mode4Players: "4 人閃電戰 (緊湊高烈度)",
    mode6Players: "6 人標準大逃殺 (全員博弈)",
    confirmStart: "開始空降",
    cancel: "取消",
    seatConflictError: "同一個 AI 會話不能同時操控兩名幹員",
    instructions:
      "絕地吃雞（Battle Royale）：8×6 對稱戰爭迷霧網格（欄 A–H，列 1–6）高階智力博弈。首先呼叫 readRadar 取得你的視野雷達、彈藥、安全區、輪轉順序（turnOrder）、定向私聊（privateWhispers）與個人戰術備忘（tacticalNote）。【公平與反先手優勢機制】：1) 跳傘階段為盲降，全員落地前互不可見落點；2) 第 1 輪交火順序為跳傘順序的完全逆序（後跳者先動），且每輪按蛇形輪轉；3) 每名幹員在第 1 輪完成自身首次行動前享有「空降護盾」（受到攻擊減傷 40% 且免疫單次秒殺）。【距離克制與彈藥機制】：霰彈槍貼臉（dist=1）爆發最高；狙擊槍（98K/AWM）最佳射程 dist>=2（貼臉 1 格僅 0.5 倍傷害！）。每回合 2 AP，呼叫 takeAction 提交 1～2 步動作，並可透過 radio 公開喊話、whisper 發送加密私聊、note 記錄個人跨回合推理筆記。",
    descReady: "確認準備就緒",
    descReadRadar:
      "讀取你的專屬戰術雷達：包含自身座標、HP、護甲、武器、剩餘彈藥、空降護盾狀態、智商分、視野內地形/物資箱/敵人、聲紋方向提示、行動順序、加密私聊（privateWhispers）及個人戰術筆記（tacticalNote）。",
    descDropIn:
      "在盲降跳傘階段（dropping）選擇空降座標（A1–H6，如 'D3'），可選附帶公開廣播 radio 與個人戰術筆記 note。",
    descTakeAction:
      "在你的戰鬥回合提交 1～2 步戰術動作（每回合 2 AP）：move、loot、attack、heal、guard，可選附帶公開廣播 radio、定向加密私聊 whisper({to,message}) 與私人戰術推理筆記 note。",
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
    toggleSound: "Toggle Audio",
    pause: "Pause",
    resume: "Resume",
    configure: "Squad Setup",
    newRound: "New Drop",
    phaseLobby: "Standby",
    phaseDropping: "Blind Drop · Stealth Coordinates",
    phaseCombat: "Round {cycle} · Safe Zone R={radius}",
    phaseFinished: "Winner Winner Chicken Dinner!",
    aliveCount: "Alive {alive}/{total}",
    stormStatus: "Safe Zone R={radius} ({center})",
    playerYou: "Me (Commander)",
    playerBot: "SpecOps Bot",
    humanSubTag: "Human Player · Direct Tactical & Whisper Control",
    botTag: "High-IQ Tactical AI · Kiting, Ammo & Whisper Diplomacy",
    statusAlive: "Active",
    statusDropping: "Airborne",
    statusEliminated: "K.I.A #{rank}",
    spawnShieldBadge: "Spawn Shield -40%",
    iqBadge: "IQ {score}",
    ammoLabel: "Ammo {ammo}/{max}",
    terrain_plain: "Open Ground",
    terrain_base: "Military Base (High Loot)",
    terrain_tower: "Radar Tower (Vision/Range +1)",
    terrain_bush: "Stealth Bush (Concealed)",
    terrain_bunker: "Concrete Bunker (-25% Dmg)",
    weapon_fists: "Tactical Knife",
    weapon_shotgun: "S12K Shotgun",
    weapon_smg: "UMP45 SMG",
    weapon_rifle: "M416 Assault Rifle",
    weapon_sniper: "Kar98k Sniper",
    weapon_awm: "AWM Mythic Sniper",
    crate_supply: "Supply Crate",
    crate_airdrop: "Golden Airdrop",
    crate_deathbox: "Loot Box",
    welcomeTitle: "Cyber Island · High-IQ LLM Battle Royale",
    welcomeSub:
      "6 operatives blind-drop onto a symmetric 8×6 Fog-of-War island. Snake turn order & Spawn Shields eliminate first-mover advantage; weapon range brackets, ammo limits, acoustic pings, encrypted Whispers, and private Tactical Notes test deep LLM reasoning!",
    startDropBtn: "Board Transport · Launch Blind Drop",
    dropPrompt: "Click any grid coordinate to blind-drop (coords stay hidden until all land; last dropper acts first in Round 1):",
    combatPrompt: "Remaining: {ap} AP (Click adjacent tile to move, click enemy to fire; Snipers/Rifles suffer CQB penalty at dist=1)",
    actLoot: "Loot & Ammo (1 AP)",
    actHeal: "Medkit ({count}) (1 AP)",
    actGuard: "Overwatch Guard (End Turn)",
    actGrenade: "Grenade ({count})",
    whisperPublicOpt: "📢 Public Radio",
    whisperToPrefix: "🔒 Whisper ",
    radioPlaceholder: "Broadcast public radio or encrypted whisper...",
    sendRadioBtn: "Send",
    winnerBanner: "🏆 WINNER WINNER CHICKEN DINNER! Champion: {name} ({kills} Kills · IQ {score})",
    killFeedTitle: "Live Kill Feed & Encrypted Radio",
    modalTitle: "Operative Roster & Arena Size",
    playerCountLabel: "Arena Squad Size",
    mode4Players: "4 Operatives (Fast Blitz)",
    mode6Players: "6 Operatives (Full Battle Royale)",
    confirmStart: "Launch Drop",
    cancel: "Cancel",
    seatConflictError: "The same AI session cannot control multiple operatives",
    instructions:
      "Battle Royale: Symmetric 8×6 Fog-of-War grid (Columns A–H, Rows 1–6). First call readRadar to inspect your vision, ammo, safe zone, snake turnOrder, privateWhispers, and personal tacticalNote. [Anti-First-Mover Balance]: 1) Parachute phase (dropping) is blind—landing coords are hidden until everyone lands; 2) Round 1 combat order is the exact reverse of dropOrder (last dropper moves first), and subsequent cycles use rotating Snake Turn Order; 3) Every operative starts with a Spawn Shield (spawnProtected:true, -40% incoming damage & anti-one-shot) until completing their first combat turn. [Weapon Range Brackets & Ammo]: Shotguns dominate at dist=1 (45 dmg); Snipers (98K/AWM) deal full damage at dist>=2 (50/66 dmg) but suffer a 50% CQB penalty at dist=1! Firearms consume 1 ammo per shot (refill via loot). Submit 1–2 steps via takeAction, plus optional public radio, encrypted 1-on-1 whisper({to,message}), and private tacticalNote.",
    descReady: "Confirm readiness",
    descReadRadar:
      "Read your private tactical radar: position, HP, shield, weapon, ammo, spawnProtected, tacticalScore, visible tiles/crates/enemies, acoustic pings, current & next cycle snake turnOrder, privateWhispers, and your personal tacticalNote.",
    descDropIn:
      "Blind-drop into a grid coordinate (A1–H6, e.g. 'D3') during the dropping phase, with optional public radio and private tactical note.",
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
  if (getLang() === "en") return `Unit #${num}`;
  return `${num}号特工`;
}

export function seatShortLabel(seat: Seat): string {
  const num = seat.replace("Seat", "");
  if (getLang() === "en") return `#${num}`;
  return `${num}号`;
}

export function botNameForSeat(seat: Seat): string {
  const map: Record<Seat, string> = {
    Seat1: "幽灵·Ghost",
    Seat2: "猎鹰·Falcon",
    Seat3: "毒蛇·Viper",
    Seat4: "雷霆·Titan",
    Seat5: "暗影·Shadow",
    Seat6: "零号·Zero",
  };
  return map[seat] || seatLabel(seat);
}

export function weaponLabel(w: WeaponId): string {
  return t(`weapon_${w}`);
}

export function terrainLabel(ter: TerrainType): string {
  return t(`terrain_${ter}`);
}
