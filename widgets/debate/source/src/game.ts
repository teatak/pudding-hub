import { pudding, type InteractionContext, type JSONValue } from "@pudding/widget";
import { z } from "zod";
import {
  type Role,
  type DebatePhase,
  type DebateLobby,
  type DebatePosition,
  type VerdictData,
} from "./types";
import {
  initialLobby,
  initialPosition,
  assignDebateLobby,
  setDebateReady,
  addArgument,
  submitVerdict,
  getActiveRoleForPhase,
  roles,
} from "./tribunal";
import { t } from "./text";

export const position = (): DebatePosition => {
  const saved = pudding.state.read().data.position as unknown as
    | DebatePosition
    | undefined;
  return saved || initialPosition();
};

export const lobby = (): DebateLobby =>
  (pudding.state.read().data.lobby as unknown as DebateLobby) || initialLobby();

let changing = false;
let mutation: Promise<unknown> | null = null;

async function change<T>(fn: () => Promise<T>): Promise<T> {
  if (changing) throw new Error("An operation is in progress");
  changing = true;
  try {
    mutation = fn();
    return (await mutation) as T;
  } finally {
    changing = false;
    mutation = null;
  }
}

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this debate first");
  if (run.status !== "running") throw new Error("Debate is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

async function save(l: DebateLobby, p: DebatePosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: l as unknown as JSONValue,
      position: p as unknown as JSONValue,
    },
  });
}

export class NotificationError extends Error {}

export async function publish(retry = false) {
  const run = pudding.interaction.read();
  if (!run) throw new Error("Connect to this debate first");
  const l = lobby();
  const p = position();

  const isFinished = l.phase === "verdict" && !!p.verdict;
  const activeRole = getActiveRoleForPhase(l.phase, Boolean(l.seats.Judge));

  const topic = isFinished
    ? "result"
    : l.phase === "lobby"
      ? "invitation"
      : "argument";

  const base = `round-${l.round}-${l.phase}-${p.arguments.length}`;
  const recipients = isFinished
    ? run.participants.map((player) => player.id)
    : l.phase === "lobby"
      ? (Object.values(l.seats).filter(
          (id): id is string => Boolean(id) && !l.ready.includes(id as string),
        ) as string[])
      : activeRole && l.seats[activeRole]
        ? [l.seats[activeRole]!]
        : [];

  const previous = run.receipts.filter(
    (n) => n.id === base || n.id.startsWith(base + "-"),
  );

  const latest = (id: string) =>
    previous
      .flatMap((n) =>
        n.deliveries
          .filter((d) => d.participantID === id)
          .map((d) => ({ n, d })),
      )
      .at(-1);

  const needed = recipients.filter((id) => {
    const old = latest(id);
    return (
      !old ||
      (retry &&
        (!old.d.active ||
          !["pending", "queued", "running"].includes(old.d.status)))
    );
  });

  try {
    await pudding.interaction.setRequests(
      recipients.flatMap((id) => {
        const old = latest(id);
        return old?.d.active && !needed.includes(id)
          ? [{ notificationID: old.n.id, participantID: id }]
          : [];
      }),
    );

    if (!needed.length) return;

    const groups = topic === "invitation" ? needed.map((id) => [id]) : [needed];
    for (const participantIDs of groups) {
      const assignedRole =
        topic === "invitation"
          ? roles.find((role) => l.seats[role] === participantIDs[0])
          : undefined;

      const groupBase = assignedRole ? `${base}-${assignedRole}` : base;
      const attempts = previous.filter(
        (n) => n.id === groupBase || n.id.startsWith(`${groupBase}-retry-`),
      );
      const id = attempts.length
        ? `${groupBase}-retry-${attempts.length}`
        : groupBase;

      const roleName = assignedRole
        ? assignedRole === "Pro"
          ? t("roleProShort")
          : assignedRole === "Con"
            ? t("roleConShort")
            : t("roleJudgeShort")
        : activeRole
          ? activeRole === "Pro"
            ? t("roleProShort")
            : activeRole === "Con"
              ? t("roleConShort")
              : t("roleJudgeShort")
          : "";

      const summary =
        topic === "invitation"
          ? t("notifyInviteSummary", { role: roleName })
          : topic === "result"
            ? t("verdictTitle")
            : activeRole === "Judge"
              ? t("notifyVerdictSummary")
              : t("notifyArgueSummary", { role: roleName });

      const message =
        topic === "invitation"
          ? t("notifyInviteMessage", { role: roleName, topic: l.topic })
          : topic === "result"
            ? `${t("winnerNotice", { winner: p.verdict?.winner || "" })}: ${p.verdict?.summary}`
            : activeRole === "Judge"
              ? t("notifyVerdictMessage")
              : t("notifyArgueMessage", {
                  role: roleName,
                  topic: l.topic,
                  phaseName: summary,
                });

      await pudding.interaction.notify({
        id,
        audience: isFinished
          ? { kind: "all" }
          : { kind: "selected", participantIDs },
        delivery: "request-action",
        topic,
        summary,
        message,
        data: {
          topic: l.topic,
          phase: l.phase,
          activeRole,
          round: l.round,
          proAdvantage: p.proAdvantage,
          arguments: p.arguments,
          verdict: p.verdict,
        } as unknown as JSONValue,
      });
    }
  } catch (error) {
    throw new NotificationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const start = (
  assignments:
    | { Pro: string; Con: string; Judge?: string | null }
    | string[],
  includeMeOrTopic?: boolean | string,
  customTopic?: string,
) =>
  change(async () => {
    const previous = lobby();
    let seats: Record<Role, string | null>;
    let topicToUse: string;

    if (Array.isArray(assignments)) {
      // 兼容旧签名
      const sessionIDs = assignments;
      const includeMe = Boolean(includeMeOrTopic);
      const totalPlayers = sessionIDs.length + Number(includeMe);
      if (totalPlayers < 2 || totalPlayers > 3) {
        throw new Error("Choose 2 or 3 players for the debate");
      }
      const run = await pudding.interaction.connect({ sessionIDs });
      const players = run.participants
        .filter((p) => p.kind === "session" || includeMe)
        .map((p) => p.id);
      seats = {
        Pro: players[0] || null,
        Con: players[1] || null,
        Judge: players[2] || null,
      };
      topicToUse = customTopic || previous.topic;
    } else {
      // 席位明确指定
      if (!assignments.Pro || !assignments.Con) {
        throw new Error("Pro and Con seats must be assigned");
      }
      const chosenList = [assignments.Pro, assignments.Con];
      if (assignments.Judge) chosenList.push(assignments.Judge);

      if (new Set(chosenList).size !== chosenList.length) {
        throw new Error("Each participant can only occupy one seat");
      }

      const sessionCandidates = (await pudding.interaction.candidates()).sessions;

      const sessionIDs = chosenList.filter((id) => id !== "@me");
      const run = await pudding.interaction.connect({ sessionIDs });

      const humanPart = run.participants.find((p) => p.kind === "human");
      const sessionParts = run.participants.filter((p) => p.kind === "session");

      const participantFor = (chosenID: string | null | undefined): string | null => {
        if (!chosenID) return null;
        if (chosenID === "@me") {
          return humanPart?.id || null;
        }

        // 1. 尝试直接从运行时对象的 sessionID 属性匹配
        const byDirectSessionID = run.participants.find(
          (p) => (p as unknown as { sessionID?: string }).sessionID === chosenID,
        );
        if (byDirectSessionID) return byDirectSessionID.id;

        // 2. 如果 chosenID 本身已是 participantID
        const byPartID = run.participants.find((p) => p.id === chosenID);
        if (byPartID) return byPartID.id;

        // 3. 按照 connect 传入的 sessionIDs 列表位置精确映射
        const sessionIndex = sessionIDs.indexOf(chosenID);
        if (sessionIndex >= 0 && sessionIndex < sessionParts.length) {
          return sessionParts[sessionIndex].id;
        }

        // 4. 兜底候选集匹配
        const match = sessionCandidates.find(
          (s) => s.id === chosenID || s.participantID === chosenID,
        );
        if (match) {
          const fromRun = run.participants.find(
            (p) =>
              (match.participantID && p.id === match.participantID) ||
              p.name === match.name,
          );
          if (fromRun) return fromRun.id;
        }
        return null;
      };

      seats = {
        Pro: participantFor(assignments.Pro),
        Con: participantFor(assignments.Con),
        Judge: participantFor(assignments.Judge),
      };

      if (!seats.Pro || !seats.Con) {
        throw new Error("Failed to assign debater seats to participants");
      }
      topicToUse = (typeof includeMeOrTopic === "string" ? includeMeOrTopic : customTopic) || previous.topic;
    }

    await pudding.interaction.setRequests([]);
    await save(
      {
        round: previous.round + 1,
        phase: "lobby",
        topic: topicToUse,
        seats,
        ready: [],
        startsAt: null,
      },
      initialPosition(),
    );
    const runStatus = pudding.interaction.read()?.status;
    if (runStatus === "paused") await pudding.interaction.resume();
    await publish();
  });

export const forceStart = () =>
  change(async () => {
    const l = lobby();
    if (l.phase !== "lobby") return;
    const now = Date.now();
    const needed = Object.values(l.seats).filter((id): id is string => Boolean(id));
    await save({ ...l, ready: needed, phase: "round1_pro", startsAt: now }, position());
    await publish();
  });

export const changeReadiness = (ready: boolean, context: InteractionContext) =>
  change(async () => {
    const who = actor(context);
    const old = lobby();
    const next = setDebateReady(old, who.id, ready);
    if (next !== old) {
      await save(next, position());
      if (next.phase !== "lobby") {
        await publish();
      }
    }
    return describeDebate();
  });

export const argue = (
  input: { headline: string; content: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    if (l.phase === "lobby" || l.phase === "verdict") {
      throw new Error("Not in an active argument phase");
    }
    const activeRole = getActiveRoleForPhase(l.phase, Boolean(l.seats.Judge));
    if (!activeRole || l.seats[activeRole] !== who.id) {
      throw new Error("Not your turn to argue");
    }

    const res = addArgument(
      p,
      l,
      activeRole,
      input.headline,
      input.content,
      who.name,
    );
    await save(res.lobby, res.position);
    await publish();
    return describeDebate();
  });

export const giveVerdict = (
  input: {
    winner: "Pro" | "Con" | "Draw";
    proScore: number;
    conScore: number;
    summary: string;
  },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    if (l.phase !== "verdict") {
      throw new Error("Debate is not ready for verdict");
    }
    if (l.seats.Judge && l.seats.Judge !== who.id) {
      throw new Error("Only the Judge can deliver the verdict");
    }

    const verdictData: VerdictData = {
      winner: input.winner,
      proScore: Math.max(0, Math.min(100, input.proScore)),
      conScore: Math.max(0, Math.min(100, input.conScore)),
      summary: input.summary.trim(),
    };

    const res = submitVerdict(p, l, verdictData);
    await save(res.lobby, res.position);
    await publish();
    return describeDebate();
  });

export const setTopic = (newTopic: string) =>
  change(async () => {
    const l = lobby();
    if (l.phase !== "lobby") throw new Error("Cannot change topic during an active debate");
    const next = { ...l, topic: newTopic.trim() };
    await save(next, position());
  });

export const pause = async () => {
  if (lobby().phase === "lobby" || position().verdict) throw new Error("No ongoing debate");
  await pudding.interaction.pause();
  await mutation?.catch(() => {});
};

export const resume = async () => {
  await pudding.interaction.resume();
};

export function describeDebate() {
  const l = lobby();
  const p = position();
  return {
    topic: l.topic,
    round: l.round,
    phase: l.phase,
    activeRole: getActiveRoleForPhase(l.phase, Boolean(l.seats.Judge)),
    proAdvantage: p.proAdvantage,
    argumentsCount: p.arguments.length,
    arguments: p.arguments,
    verdict: p.verdict,
  };
}

function registerInterfaces() {
  return [
    pudding.defineInterface({
      name: "ready",
      description: t("descReady"),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) => changeReadiness(i.ready !== false, c),
    }),
    pudding.defineInterface({
      name: "argue",
      description: t("descArgue"),
      input: z
        .object({
          headline: z.string().min(1).max(60),
          content: z.string().min(1).max(400),
        })
        .strict(),
      run: argue,
    }),
    pudding.defineInterface({
      name: "giveVerdict",
      description: t("descVerdict"),
      input: z
        .object({
          winner: z.enum(["Pro", "Con", "Draw"]),
          proScore: z.number().min(0).max(100),
          conScore: z.number().min(0).max(100),
          summary: z.string().min(1).max(300),
        })
        .strict(),
      run: giveVerdict,
    }),
    pudding.defineInterface({
      name: "readDebate",
      description: "Read debate state, topic, arguments, scale score and active phase",
      input: z.object({}).strict(),
      run: () => describeDebate(),
    }),
  ];
}

registerInterfaces();
