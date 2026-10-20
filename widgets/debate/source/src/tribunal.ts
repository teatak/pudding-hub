import {
  ArgumentItem,
  DebateLobby,
  DebatePhase,
  DebatePosition,
  Role,
  VerdictData,
} from "./types";
import { t, getDefaultTopic, getPresetTopics } from "./text";

export const roles: Role[] = ["Pro", "Con", "Judge"];

export const PRESET_TOPICS = getPresetTopics();
export const DEFAULT_TOPIC = getDefaultTopic();

export const PHASE_SEQUENCE: DebatePhase[] = [
  "round1_pro",
  "round1_con",
  "round2_pro",
  "round2_con",
  "round3_pro",
  "round3_con",
  "verdict",
];

export function getActiveRoleForPhase(phase: DebatePhase, hasJudge: boolean): Role | null {
  switch (phase) {
    case "round1_pro":
    case "round2_pro":
    case "round3_pro":
      return "Pro";
    case "round1_con":
    case "round2_con":
    case "round3_con":
      return "Con";
    case "verdict":
      return hasJudge ? "Judge" : null;
    default:
      return null;
  }
}

export function getRoundForPhase(phase: DebatePhase): number {
  if (phase.startsWith("round1")) return 1;
  if (phase.startsWith("round2")) return 2;
  if (phase.startsWith("round3")) return 3;
  return 3;
}

export function initialLobby(topic = getDefaultTopic()): DebateLobby {
  return {
    round: 0,
    phase: "lobby",
    topic,
    seats: { Pro: null, Con: null, Judge: null },
    ready: [],
    startsAt: null,
  };
}

export function initialPosition(): DebatePosition {
  return {
    arguments: [],
    verdict: null,
    proAdvantage: 50,
    turnStartedAt: null,
    turnElapsedMS: 0,
  };
}

export function assignDebateLobby(
  previous: DebateLobby,
  players: string[],
  topic = previous.topic,
): DebateLobby {
  const seats: Record<Role, string | null> = {
    Pro: players[0] || null,
    Con: players[1] || null,
    Judge: players[2] || null,
  };
  return {
    round: previous.round + 1,
    phase: "lobby",
    topic,
    seats,
    ready: [],
    startsAt: null,
  };
}

export function setDebateReady(
  lobby: DebateLobby,
  playerID: string,
  ready: boolean,
  now = Date.now(),
): DebateLobby {
  const currentReady = new Set(lobby.ready);
  if (ready) currentReady.add(playerID);
  else currentReady.delete(playerID);

  const neededPlayers = Object.values(lobby.seats).filter(
    (id): id is string => Boolean(id),
  );
  const allReady =
    neededPlayers.length >= 2 &&
    neededPlayers.every((id) => currentReady.has(id));

  return {
    ...lobby,
    ready: [...currentReady],
    phase: allReady ? "round1_pro" : "lobby",
    startsAt: allReady ? now : null,
  };
}

export function nextPhase(current: DebatePhase): DebatePhase {
  const idx = PHASE_SEQUENCE.indexOf(current);
  if (idx >= 0 && idx < PHASE_SEQUENCE.length - 1) {
    return PHASE_SEQUENCE[idx + 1];
  }
  return "verdict";
}

export function addArgument(
  pos: DebatePosition,
  lobby: DebateLobby,
  role: Role,
  headline: string,
  content: string,
  speakerName = "",
  now = Date.now(),
): { position: DebatePosition; lobby: DebateLobby } {
  const round = getRoundForPhase(lobby.phase);
  const newArg: ArgumentItem = {
    id: `arg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    round,
    headline: headline.trim(),
    content: content.trim(),
    timestamp: now,
    speakerName,
  };

  const nextP = nextPhase(lobby.phase);

  // 论证力度动态天平调整 (基于内容深度及交锋轮次微调)
  let delta = role === "Pro" ? 2 : -2;
  if (headline.length > 10 && content.length > 50) {
    delta += role === "Pro" ? 1 : -1;
  }
  const newAdvantage = Math.min(85, Math.max(15, pos.proAdvantage + delta));

  if (nextP === "verdict" && !lobby.seats.Judge) {
    const winner = newAdvantage > 50 ? "Pro" : newAdvantage < 50 ? "Con" : "Draw";
    const verdict: VerdictData = {
      winner,
      proScore: newAdvantage,
      conScore: 100 - newAdvantage,
      summary:
        winner === "Pro"
          ? t("autoVerdictPro")
          : winner === "Con"
            ? t("autoVerdictCon")
            : t("autoVerdictDraw"),
    };

    return {
      position: {
        ...pos,
        arguments: [...pos.arguments, newArg],
        verdict,
        proAdvantage: newAdvantage,
        turnStartedAt: null,
        turnElapsedMS: 0,
      },
      lobby: {
        ...lobby,
        phase: "verdict",
        startsAt: null,
      },
    };
  }

  return {
    position: {
      ...pos,
      arguments: [...pos.arguments, newArg],
      proAdvantage: newAdvantage,
      turnStartedAt: now,
      turnElapsedMS: 0,
    },
    lobby: {
      ...lobby,
      phase: nextP,
      startsAt: null,
    },
  };
}

export function submitVerdict(
  pos: DebatePosition,
  lobby: DebateLobby,
  verdict: VerdictData,
): { position: DebatePosition; lobby: DebateLobby } {
  return {
    position: {
      ...pos,
      verdict,
      proAdvantage: verdict.proScore,
      turnStartedAt: null,
    },
    lobby: {
      ...lobby,
      phase: "verdict",
      startsAt: null,
    },
  };
}
