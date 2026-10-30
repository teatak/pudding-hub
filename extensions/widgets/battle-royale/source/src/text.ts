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
    phaseDropping: "盲降跳伞 · 落点保密",
    phaseCombat: "第 {cycle} 轮 · 安全区 R={radius}",
    phaseFinished: "大吉大利，今晚吃鸡！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈 R={radius} ({center})",
    winnerHeader: "胜者：{seat} · {name}",
    playerYou: "我 (指挥官)",
    playerBot: "内置特种兵",
    humanSubTag: "人类玩家 · 亲自操控移动与开火",
    botTag: "战术 AI · 搜刮走位与精准打击",
    statusAlive: "存活作战",
    statusDropping: "待跳伞",
    statusWaitingDrop: "等待盲降指令...",
    statusEliminated: "已淘汰 #{rank}",
    terrain_plain: "开阔平原",
    terrain_bush: "隐蔽草丛 (潜行隐身)",
    weapon_fists: "战术匕首 (1格/25伤)",
    weapon_fists_short: "匕首",
    weapon_fists_stat: "1格·25伤",
    weapon_rifle: "M416 突击步枪 (2格/35伤)",
    weapon_rifle_stat: "2格·35伤",
    weapon_sniper: "98K 狙击步枪 (3格/50伤)",
    weapon_sniper_stat: "3格·50伤",
    crate_supply: "物资箱 (步枪)",
    crate_airdrop: "黄金空投 (重狙)",
    crate_supply_tip: "物资箱：走上去自动拾取【M416 突击步枪】",
    crate_airdrop_tip: "黄金空投：走上去自动拾取【98K 狙击步枪】并回满生命",
    tagSafeZone: "安全区",
    tipSafeCenter: "安全区中心",
    tipBushConcealed: "【草丛潜行】敌人无法远程锁定",
    tipTargetLocked: "【射程内】点击直接开火",
    actDropPlain: "空降落点 {coord}",
    actDropRifle: "空降 {coord} · 拾取 M416",
    actDropSniper: "空降 {coord} · 拾取 98K",
    actMovePlain: "机动 {from} → {to}",
    actMoveRifle: "机动 {from} → {to} · 获 M416",
    actMoveSniper: "机动 {from} → {to} · 获 98K",
    actAttackHit: "攻击 {target} (-{dmg} HP)",
    actAttackKill: "淘汰 {target} (-{dmg} HP)",
    tickerStart: "运输机进入孤岛航线！全员盲降跳伞，避开毒圈，活到最后吃鸡！",
    tickerDrop: "{actor} 空降落点 {coord}{loot}",
    tickerMove: "{actor} 机动转移至 {to}{loot}",
    tickerLootRifle: "，拾取物资箱装备【M416 步枪】",
    tickerLootSniper: "，开启黄金空投装备【98K 重狙】",
    tickerAttack: "{actor} 使用 [{weapon}] 命中 {target}，造成 {dmg} 点伤害",
    tickerKill: "【淘汰】{actor} 使用 [{weapon}] 击杀淘汰了 {target}！",
    welcomeTitle: "绝地孤岛 · 极简大逃杀",
    welcomeSub:
      "8×8 迷雾孤岛极简吃鸡！全员 100 生命，每回合轮流移动 1 格或开火射击；踩中箱子自动捡枪，躲进草丛潜行隐身，避开毒圈，存活至最后吃鸡！",
    startDropBtn: "登上运输机 · 开始盲降",
    dropPrompt: "点击任意网格跳伞降落（全员落地前落点保密，踩箱自动捡枪）：",
    combatPrompt: "【你的回合】点击相邻格移动（踩箱自动捡枪），或点击射程内敌人开火：",
    winnerBanner: "大吉大利，今晚吃鸡！胜者：{name}（{kills} 淘汰）",
    modalTitle: "空降干员编成与对局规模",
    playerCountLabel: "空降人数规模",
    mode4Players: "4 人闪电战",
    mode6Players: "6 人标准战",
    confirmStart: "开始空降",
    cancel: "取消",
    seatConflictError: "同一个 AI 会话不能同时操控两名干员",
    alreadyAssignedTo: "(已分配给 {seat})",
    seatConflictWarning: "同一会话或“我”不可重复分配给多个特工席位",
    instructions:
      "极简绝地吃鸡：8×8 网格大逃杀。全员 100 HP，每回合轮流行动 1 次（move 移动 1 格或 attack 攻击射程内敌人）。踩中物资箱自动拾取突击步枪（射程2格/35伤）或黄金空投狙击枪（射程3格/50伤）。草丛提供潜行隐身。每轮结束毒圈收缩，圈外扣血 20，最后幸存者获胜！",
    descReady: "确认准备就绪",
    descReadRadar: "读取你的视野雷达、当前坐标、生命、武器、可见格子、敌人与安全区。",
    descDropIn: "选择空降坐标（如 'D4'）。",
    descTakeAction: "提交行动：移动 {kind:'move', to:'D4'} 或开火 {kind:'attack', target:'Seat2'}。",
    notifyInviteSummary: "请你作为 {seat} 空降《绝地吃鸡》战场",
    notifyInviteMessage: "你已入座 {seat}。请调用 readRadar 查看战场态势。",
    notifyDropSummary: "轮到 {seat} 盲降选择跳伞坐标",
    notifyDropMessage: "运输机已抵达战场上空！请调用 dropIn 选择空降坐标。",
    notifyCombatSummary: "第 {cycle} 轮：轮到 {seat} 行动",
    notifyCombatMessage: "轮到你（{seat}）行动！请调用 takeAction 选择移动（踩箱自动捡枪）或开火淘汰敌人。",
    notifyResultSummary: "《绝地吃鸡》对局结束：{winner} 成功吃鸡！",
    notifyResultMessage: "大吉大利，今晚吃鸡！本局最终胜者为 {winner}。",
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
    phaseDropping: "盲降跳傘 · 落點保密",
    phaseCombat: "第 {cycle} 輪 · 安全區 R={radius}",
    phaseFinished: "大吉大利，今晚吃雞！",
    aliveCount: "存活 {alive}/{total}",
    stormStatus: "毒圈 R={radius} ({center})",
    winnerHeader: "勝者：{seat} · {name}",
    playerYou: "我 (指揮官)",
    playerBot: "內置特種兵",
    humanSubTag: "人類玩家 · 親自操控移動與開火",
    botTag: "戰術 AI · 搜刮走位與精準打擊",
    statusAlive: "存活作戰",
    statusDropping: "待跳傘",
    statusWaitingDrop: "等待盲降指令...",
    statusEliminated: "已淘汰 #{rank}",
    terrain_plain: "開闊平原",
    terrain_bush: "隱蔽草叢 (潛行隱身)",
    weapon_fists: "戰術匕首 (1格/25傷)",
    weapon_fists_short: "匕首",
    weapon_fists_stat: "1格·25傷",
    weapon_rifle: "M416 突擊步槍 (2格/35傷)",
    weapon_rifle_stat: "2格·35傷",
    weapon_sniper: "98K 狙擊步槍 (3格/50傷)",
    weapon_sniper_stat: "3格·50傷",
    crate_supply: "物資箱 (步槍)",
    crate_airdrop: "黃金空投 (重狙)",
    crate_supply_tip: "物資箱：走上去自動拾取【M416 突擊步槍】",
    crate_airdrop_tip: "黃金空投：走上去自動拾取【98K 狙擊步槍】並回滿生命",
    tagSafeZone: "安全區",
    tipSafeCenter: "安全區中心",
    tipBushConcealed: "【草叢潛行】敵人無法遠程鎖定",
    tipTargetLocked: "【射程內】點擊直接開火",
    actDropPlain: "空降落點 {coord}",
    actDropRifle: "空降 {coord} · 拾取 M416",
    actDropSniper: "空降 {coord} · 拾取 98K",
    actMovePlain: "機動 {from} → {to}",
    actMoveRifle: "機動 {from} → {to} · 獲 M416",
    actMoveSniper: "機動 {from} → {to} · 獲 98K",
    actAttackHit: "攻擊 {target} (-{dmg} HP)",
    actAttackKill: "淘汰 {target} (-{dmg} HP)",
    tickerStart: "運輸機進入孤島航線！全員盲降跳傘，避開毒圈，活到最後吃雞！",
    tickerDrop: "{actor} 空降落點 {coord}{loot}",
    tickerMove: "{actor} 機動轉移至 {to}{loot}",
    tickerLootRifle: "，拾取物資箱裝備【M416 步槍】",
    tickerLootSniper: "，開啟黃金空投裝備【98K 重狙】",
    tickerAttack: "{actor} 使用 [{weapon}] 命中 {target}，造成 {dmg} 點傷害",
    tickerKill: "【淘汰】{actor} 使用 [{weapon}] 擊殺淘汰了 {target}！",
    welcomeTitle: "絕地孤島 · 極簡大逃殺",
    welcomeSub:
      "8×8 迷霧孤島極簡吃雞！全員 100 生命，每回合輪流移動 1 格或開火射擊；踩中箱子自動撿槍，躲進草叢潛行隱身，避開毒圈，存活至最後吃雞！",
    startDropBtn: "登上運輸機 · 開始盲降",
    dropPrompt: "點擊任意網格跳傘降落（全員落地前落點保密，踩箱自動撿槍）：",
    combatPrompt: "【你的回合】點擊相鄰格移動（踩箱自動撿槍），或點擊射程內敵人開火：",
    winnerBanner: "大吉大利，今晚吃雞！勝者：{name}（{kills} 淘汰）",
    modalTitle: "空降幹員編成與對局規模",
    playerCountLabel: "空降人數規模",
    mode4Players: "4 人閃電戰",
    mode6Players: "6 人標準戰",
    confirmStart: "開始空降",
    cancel: "取消",
    seatConflictError: "同一個 AI 會話不能同時操控兩名幹員",
    alreadyAssignedTo: "(已分配給 {seat})",
    seatConflictWarning: "同一會話或「我」不可重複分配給多個特工席位",
    instructions:
      "極簡絕地吃雞：8×8 網格大逃殺。全員 100 HP，每回合輪流行動 1 次（move 移動 1 格或 attack 攻擊射程內敵人）。踩中物資箱自動拾取突擊步槍（射程2格/35傷）或黃金空投狙擊槍（射程3格/50傷）。草叢提供潛行隱身。每輪結束毒圈收縮，圈外扣血 20，最後倖存者獲勝！",
    descReady: "確認準備就緒",
    descReadRadar: "讀取你的視野雷達、當前座標、生命、武器、可見格子、敵人與安全區。",
    descDropIn: "選擇空降座標（如 'D4'）。",
    descTakeAction: "提交行動：移動 {kind:'move', to:'D4'} 或開火 {kind:'attack', target:'Seat2'}。",
    notifyInviteSummary: "請你作為 {seat} 空降《絕地吃雞》戰場",
    notifyInviteMessage: "你已入座 {seat}。請呼叫 readRadar 查看戰場態勢。",
    notifyDropSummary: "輪到 {seat} 盲降選擇跳傘座標",
    notifyDropMessage: "運輸機已抵達戰場上空！請呼叫 dropIn 選擇空降座標。",
    notifyCombatSummary: "第 {cycle} 輪：輪到 {seat} 行動",
    notifyCombatMessage: "輪到你（{seat}）行動！請呼叫 takeAction 選擇移動（踩箱自動撿槍）或開火淘汰敵人。",
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
    phaseDropping: "Blind Drop · Stealth Coords",
    phaseCombat: "Cycle {cycle} · Safe Zone R={radius}",
    phaseFinished: "Winner Winner Chicken Dinner!",
    aliveCount: "Alive {alive}/{total}",
    stormStatus: "Storm R={radius} ({center})",
    winnerHeader: "Winner: {seat} · {name}",
    playerYou: "Me (Commander)",
    playerBot: "SpecOps Bot",
    humanSubTag: "Human Player · Direct Move & Fire",
    botTag: "Tactical AI · Positioning & Combat",
    statusAlive: "Active",
    statusDropping: "Airborne",
    statusWaitingDrop: "Awaiting blind drop...",
    statusEliminated: "K.I.A #{rank}",
    terrain_plain: "Open Plains",
    terrain_bush: "Stealth Bush (Concealed)",
    weapon_fists: "Combat Knife (Range 1 / 25 Dmg)",
    weapon_fists_short: "Knife",
    weapon_fists_stat: "R1·25",
    weapon_rifle: "M416 Assault Rifle (Range 2 / 35 Dmg)",
    weapon_rifle_stat: "R2·35",
    weapon_sniper: "98K Sniper Rifle (Range 3 / 50 Dmg)",
    weapon_sniper_stat: "R3·50",
    crate_supply: "Supply Crate (Rifle)",
    crate_airdrop: "Golden Airdrop (Sniper)",
    crate_supply_tip: "Supply Crate: Step on it to auto-equip [M416 Assault Rifle]",
    crate_airdrop_tip: "Golden Airdrop: Step on it to auto-equip [98K Sniper] & heal to 100 HP",
    tagSafeZone: "SAFE ZONE",
    tipSafeCenter: "Safe Zone Center",
    tipBushConcealed: "[Concealed] Enemies cannot target you from range",
    tipTargetLocked: "[In Range] Click to attack",
    actDropPlain: "Dropped at {coord}",
    actDropRifle: "Dropped {coord} · +M416",
    actDropSniper: "Dropped {coord} · +98K",
    actMovePlain: "Moved {from} → {to}",
    actMoveRifle: "Moved {from} → {to} · +M416",
    actMoveSniper: "Moved {from} → {to} · +98K",
    actAttackHit: "Hit {target} (-{dmg} HP)",
    actAttackKill: "Eliminated {target} (-{dmg} HP)",
    tickerStart: "Aircraft on approach! Blind-drop onto the island, evade the storm, and survive!",
    tickerDrop: "{actor} parachuted into {coord}{loot}",
    tickerMove: "{actor} repositioned to {to}{loot}",
    tickerLootRifle: " & equipped [M416 Rifle]",
    tickerLootSniper: " & equipped [98K Sniper]",
    tickerAttack: "{actor} hit {target} with [{weapon}] for {dmg} DMG",
    tickerKill: "[K.I.A] {actor} eliminated {target} with [{weapon}]!",
    welcomeTitle: "Cyber Island · Streamlined Battle Royale",
    welcomeSub:
      "Fast 8x8 Fog-of-War Battle Royale! 100 HP each. Take turns taking 1 action: step to move (auto-loot crates) or fire at enemies in range. Hide in bushes, evade the storm, and survive to win!",
    startDropBtn: "Board Aircraft · Launch Blind Drop",
    dropPrompt: "Click any coordinate to drop (coords stay secret until all land, landing on crate auto-equips):",
    combatPrompt: "[Your Turn] Click adjacent tile to move (auto-loot crates), or click enemy in range to attack:",
    winnerBanner: "WINNER WINNER CHICKEN DINNER! Champion: {name} ({kills} Kills)",
    modalTitle: "Operative Roster & Squad Size",
    playerCountLabel: "Squad Roster Size",
    mode4Players: "4 Operatives (Blitz)",
    mode6Players: "6 Operatives (Standard)",
    confirmStart: "Launch Drop",
    cancel: "Cancel",
    seatConflictError: "The same AI session cannot control multiple operatives",
    alreadyAssignedTo: "(Assigned to {seat})",
    seatConflictWarning: "A single session or 'Me' cannot be assigned to multiple operative seats",
    instructions:
      "Streamlined Battle Royale: 8x8 grid. All operatives have 100 HP. Take turns taking 1 action: move 1 tile or attack an enemy in range. Stepping on crates automatically equips an Assault Rifle (Range 2 / 35 Dmg) or Mythic Sniper (Range 3 / 50 Dmg). Bushes grant stealth concealment. Storm shrinks each cycle dealing 20 damage. Last operative standing wins!",
    descReady: "Confirm readiness",
    descReadRadar: "Read your tactical radar: position, HP, weapon, visible tiles/enemies, and safe zone.",
    descDropIn: "Blind-drop into a grid coordinate (e.g. 'D4').",
    descTakeAction: "Execute 1 tactical action: move {kind:'move', to:'D4'} or fire {kind:'attack', target:'Seat2'}.",
    notifyInviteSummary: "Deploy as {seat} in Battle Royale",
    notifyInviteMessage: "You are assigned to {seat}. Call readRadar to inspect the battlefield.",
    notifyDropSummary: "{seat}'s turn to blind-drop",
    notifyDropMessage: "Transport aircraft overhead! Call dropIn to choose your drop coordinate.",
    notifyCombatSummary: "Cycle {cycle}: {seat}'s tactical turn",
    notifyCombatMessage: "It is your turn ({seat})! Call takeAction to move (auto-loot crates) or attack an enemy.",
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
