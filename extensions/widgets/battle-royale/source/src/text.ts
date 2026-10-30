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
    phaseDropping: "航线跳伞阶段 · 请选择降落点",
    phaseCombat: "第 {cycle} 轮交火 · 安全区半径 {radius}",
    phaseFinished: "大吉大利，今晚吃鸡！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈半径 R={radius} (中心 {center})",
    playerYou: "我 (特种指挥官)",
    playerBot: "内置特种兵",
    humanSubTag: "人类玩家 · 亲自操控跳伞与战术连招",
    botTag: "内置战术 AI · 自动搜刮与猎杀",
    statusAlive: "存活作战",
    statusDropping: "待跳伞",
    statusEliminated: "已淘汰 #{rank}",
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
    welcomeTitle: "绝地孤岛 · 大模型战术吃鸡",
    welcomeSub:
      "6 名特工空降 8×6 战争迷雾网格岛屿。搜刮高阶枪械与三级护甲、根据声纹雷达听声辨位、躲避电磁毒圈，在公共电台合纵连横，活到最后！",
    startDropBtn: "登上运输机 · 开始空降",
    dropPrompt: "点击地图上的任意网格空降落地（推荐优先降落「军事基地」或「物资箱」格）：",
    combatPrompt: "当前回合剩余行动点：{ap} AP（点击相邻格移动，点击敌人开火，或执行下方战术动作）",
    actLoot: "搜刮物资 (1 AP)",
    actHeal: "使用急救包 ({count}) (1 AP)",
    actGuard: "架枪警戒 (结束回合)",
    actGrenade: "投掷手雷 ({count})",
    radioPlaceholder: "发送全频段电台广播（结盟/诱敌/嘲讽，可选）...",
    sendRadioBtn: "广播",
    winnerBanner: "🏆 大吉大利，今晚吃鸡！胜者：{name}（{kills} 淘汰）",
    killFeedTitle: "战场实时播报 & 全频段电台",
    modalTitle: "空降干员编成与战场规模",
    playerCountLabel: "空降人数规模",
    mode4Players: "4 人闪电战 (紧凑高烈度)",
    mode6Players: "6 人标准大逃杀 (全员混战)",
    confirmStart: "开始空降",
    cancel: "取消",
    seatConflictError: "同一个 AI 会话不能同时操控两名干员",
    instructions:
      "绝地吃鸡（Battle Royale）：8×6 战术网格（列 A–H，行 1–6）与战争迷雾大逃杀。首先调用 readRadar 获取你的视野雷达、自身装备与安全区坐标。在 dropping 阶段调用 dropIn 选择初始降落坐标（如 {coord:'D3'}）。在 combat 阶段每回合你有 2 点行动点（AP），调用 takeAction 一次性提交 1～2 个动作步骤（move 移动到相邻格、loot 搜刮当前格物资箱、attack 攻击射程内敌人坐标或席位、heal 打药回血、guard 架枪减伤），并可通过 radio 字段发表全频段电台广播。",
    descReady: "确认准备就绪",
    descReadRadar:
      "读取你的专属战术雷达：包含自身坐标、生命值、护甲、武器、急救包、视野半径内可见的地形/物资箱/敌人，以及视野外的声纹方向提示与安全区毒圈状态。",
    descDropIn:
      "在跳伞阶段（dropping）选择你的空降坐标（列 A–H + 行 1–6，如 'D3'），可选附带一句全场电台广播 radio。",
    descTakeAction:
      "在你的战斗回合提交 1～2 步战术动作（每回合共 2 AP）：move（移动到相邻坐标 to）、loot（搜刮当前格物资）、attack（攻击射程内目标坐标或席位 target，可选 useGrenade:true）、heal（使用急救包回血修甲）、guard（架枪警戒减伤并结束回合）。",
    notifyInviteSummary: "请你作为 {seat} 空降《绝地吃鸡》战场",
    notifyInviteMessage:
      "你已入座 {seat}。请调用 readRadar 查看战场态势。",
    notifyDropSummary: "轮到 {seat} 选择跳伞降落点",
    notifyDropMessage:
      "运输机已抵达战场上空！请先调用 readRadar 查看地图高价值资源区（如军事基地、物资箱），然后调用 dropIn({coord:'D3', radio:'...'}) 选择你的空降坐标。",
    notifyCombatSummary: "第 {cycle} 轮：轮到 {seat} 行动（2 AP）",
    notifyCombatMessage:
      "第 {cycle} 轮战斗阶段，轮到你（{seat}）行动！请先调用 readRadar 扫描周围视野内的敌人、物资箱、声纹提示与安全区范围，然后调用 takeAction 提交本回合的 1～2 步战术连招（move / loot / attack / heal / guard）及电台喊话。",
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
    phaseDropping: "航線跳傘階段 · 請選擇降落點",
    phaseCombat: "第 {cycle} 輪交火 · 安全區半徑 {radius}",
    phaseFinished: "大吉大利，今晚吃雞！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈半徑 R={radius} (中心 {center})",
    playerYou: "我 (特種指揮官)",
    playerBot: "內置特種兵",
    humanSubTag: "人類玩家 · 親自操控跳傘與戰術連招",
    botTag: "內置戰術 AI · 自動搜刮與獵殺",
    statusAlive: "存活作戰",
    statusDropping: "待跳傘",
    statusEliminated: "已淘汰 #{rank}",
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
    welcomeTitle: "絕地孤島 · 大模型戰術吃雞",
    welcomeSub:
      "6 名特工空降 8×6 戰爭迷霧網格島嶼。搜刮高階槍械與三級護甲、根據聲紋雷達聽聲辨位、躲避電磁毒圈，在公共電台合縱連橫，活到最後！",
    startDropBtn: "登上運輸機 · 開始空降",
    dropPrompt: "點擊地圖上的任意網格空降落地（推薦優先降落「軍事基地」或「物資箱」格）：",
    combatPrompt: "當前回合剩餘行動點：{ap} AP（點擊相鄰格移動，點擊敵人開火，或執行下方戰術動作）",
    actLoot: "搜刮物資 (1 AP)",
    actHeal: "使用急救包 ({count}) (1 AP)",
    actGuard: "架槍警戒 (結束回合)",
    actGrenade: "投擲手雷 ({count})",
    radioPlaceholder: "發送全頻段電台廣播（結盟/誘敵/嘲諷，可選）...",
    sendRadioBtn: "廣播",
    winnerBanner: "🏆 大吉大利，今晚吃雞！勝者：{name}（{kills} 淘汰）",
    killFeedTitle: "戰場即時播報 & 全頻段電台",
    modalTitle: "空降幹員編成與戰場規模",
    playerCountLabel: "空降人數規模",
    mode4Players: "4 人閃電戰 (緊湊高烈度)",
    mode6Players: "6 人標準大逃殺 (全員混戰)",
    confirmStart: "開始空降",
    cancel: "取消",
    seatConflictError: "同一個 AI 會話不能同時操控兩名幹員",
    instructions:
      "絕地吃雞（Battle Royale）：8×6 戰術網格（欄 A–H，列 1–6）與戰爭迷霧大逃殺。首先呼叫 readRadar 取得你的視野雷達、自身裝備與安全區座標。在 dropping 階段呼叫 dropIn 選擇初始降落座標（如 {coord:'D3'}）。在 combat 階段每回合你有 2 點行動點（AP），呼叫 takeAction 一次性提交 1～2 個動作步驟（move、loot、attack、heal、guard），並可透過 radio 欄位發表全頻段電台廣播。",
    descReady: "確認準備就緒",
    descReadRadar:
      "讀取你的專屬戰術雷達：包含自身座標、生命值、護甲、武器、急救包、視野半徑內可見的地形/物資箱/敵人，以及視野外的聲紋方向提示與安全區毒圈狀態。",
    descDropIn:
      "在跳傘階段（dropping）選擇你的空降座標（欄 A–H + 列 1–6，如 'D3'），可選附帶一句全場電台廣播 radio。",
    descTakeAction:
      "在你的戰鬥回合提交 1～2 步戰術動作（每回合共 2 AP）：move（移動到相鄰座標 to）、loot（搜刮當前格物資）、attack（攻擊射程內目標座標或席位 target，可選 useGrenade:true）、heal（使用急救包回血修甲）、guard（架槍警戒減傷並結束回合）。",
    notifyInviteSummary: "請你作為 {seat} 空降《絕地吃雞》戰場",
    notifyInviteMessage: "你已入座 {seat}。請呼叫 readRadar 查看戰場態勢。",
    notifyDropSummary: "輪到 {seat} 選擇跳傘降落點",
    notifyDropMessage:
      "運輸機已抵達戰場上空！請先呼叫 readRadar 查看地圖高價值資源區，然後呼叫 dropIn({coord:'D3', radio:'...'}) 選擇你的空降座標。",
    notifyCombatSummary: "第 {cycle} 輪：輪到 {seat} 行動（2 AP）",
    notifyCombatMessage:
      "第 {cycle} 輪戰鬥階段，輪到你（{seat}）行動！請先呼叫 readRadar 掃描周圍視野內的敵人、物資箱、聲紋提示與安全區範圍，然後呼叫 takeAction 提交本回合的 1～2 步戰術連招。",
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
    phaseDropping: "Parachute Phase · Select Drop Zone",
    phaseCombat: "Round {cycle} · Safe Zone R={radius}",
    phaseFinished: "Winner Winner Chicken Dinner!",
    aliveCount: "Alive {alive}/{total}",
    stormStatus: "Safe Zone R={radius} (Center {center})",
    playerYou: "Me (Commander)",
    playerBot: "SpecOps Bot",
    humanSubTag: "Human Player · Direct Tactical Control",
    botTag: "Built-in SpecOps AI · Auto Loot & Hunt",
    statusAlive: "Active",
    statusDropping: "Airborne",
    statusEliminated: "K.I.A #{rank}",
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
    welcomeTitle: "Cyber Island · LLM Battle Royale",
    welcomeSub:
      "6 agents parachute onto an 8×6 Fog-of-War tactical grid. Scavenge tier-3 armor & AWM snipers, track enemies by acoustic radar pings, outrun the shrinking storm, and outsmart rivals over public radio!",
    startDropBtn: "Board Transport · Launch Drop",
    dropPrompt: "Click any grid coordinate on the map to parachute in (Military Bases & Crates recommended):",
    combatPrompt: "Action Points remaining: {ap} AP (Click adjacent tile to move, click enemy to fire, or use tactical buttons)",
    actLoot: "Loot Crate (1 AP)",
    actHeal: "Use Medkit ({count}) (1 AP)",
    actGuard: "Overwatch Guard (End Turn)",
    actGrenade: "Throw Grenade ({count})",
    radioPlaceholder: "Broadcast public radio taunt or truce offer (optional)...",
    sendRadioBtn: "Broadcast",
    winnerBanner: "🏆 WINNER WINNER CHICKEN DINNER! Champion: {name} ({kills} Kills)",
    killFeedTitle: "Live Kill Feed & Public Radio",
    modalTitle: "Operative Roster & Arena Size",
    playerCountLabel: "Arena Squad Size",
    mode4Players: "4 Operatives (Fast Blitz)",
    mode6Players: "6 Operatives (Full Battle Royale)",
    confirmStart: "Launch Drop",
    cancel: "Cancel",
    seatConflictError: "The same AI session cannot control multiple operatives",
    instructions:
      "Battle Royale: 8×6 tactical grid (Columns A–H, Rows 1–6) with Fog of War. First call readRadar to inspect your vision, gear, and safe zone. In the dropping phase, call dropIn({coord:'D3'}) to land. In the combat phase, you have 2 Action Points (AP) per turn—call takeAction with 1–2 steps (move, loot, attack, heal, guard) and an optional radio broadcast.",
    descReady: "Confirm readiness",
    descReadRadar:
      "Read your private tactical radar: your position, HP, shield, weapon, medkits, visible tiles/crates/enemies within your vision radius, acoustic sound pings outside vision, and storm status.",
    descDropIn:
      "Parachute into a grid coordinate (A1–H6, e.g. 'D3') during the dropping phase, with an optional radio broadcast.",
    descTakeAction:
      "Submit 1–2 tactical steps on your combat turn (2 AP total): move (to adjacent coord), loot (current tile crate), attack (target coord or Seat, optional useGrenade:true), heal (use medkit), or guard (overwatch defense).",
    notifyInviteSummary: "Deploy as {seat} in Battle Royale",
    notifyInviteMessage: "You are assigned to {seat}. Call readRadar to inspect the battlefield.",
    notifyDropSummary: "{seat}'s turn to parachute drop",
    notifyDropMessage:
      "Transport aircraft overhead! Call readRadar to inspect high-tier zones and crates, then call dropIn({coord:'D3', radio:'...'}) to land.",
    notifyCombatSummary: "Round {cycle}: {seat}'s tactical turn (2 AP)",
    notifyCombatMessage:
      "Round {cycle} combat phase: It is your turn ({seat})! Call readRadar to scan visible enemies, crates, sound pings, and safe zone boundaries, then call takeAction to execute your 1–2 AP tactical combo.",
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
