import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import {
  type HatColor,
  type MatrixLobby,
  type MatrixPosition,
  type PerspectiveItem,
  type RecommendationLevel,
  type ActionItem,
} from "./types";
import {
  initialLobby,
  initialPosition,
  addPerspective,
  setSynthesis,
  toggleActionItem,
  createDemoData,
  getHatMeta,
} from "./matrix";
import { t } from "./text";

export const position = (): MatrixPosition => {
  const saved = pudding.state.read().data.position as unknown as
    | MatrixPosition
    | undefined;
  return saved || initialPosition();
};

export const lobby = (): MatrixLobby => {
  const saved = pudding.state.read().data.lobby as unknown as
    | MatrixLobby
    | undefined;
  return saved || initialLobby();
};

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

async function save(l: MatrixLobby, p: MatrixPosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: l as unknown as JSONValue,
      position: p as unknown as JSONValue,
    },
  });
}

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant) {
    throw new Error("Connect to this decision session first");
  }
  if (run.status !== "running") throw new Error("Session is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

export async function publish() {
  const run = pudding.interaction.read();
  if (!run || run.status !== "running") return;
  const l = lobby();
  const p = position();

  try {
    if (l.phase === "completed") {
      // 决策已完成，发送总结通告 (inform 模式，不索要进一步行动)
      await pudding.interaction.notify({
        id: `summary-${Date.now()}`,
        audience: { kind: "all" },
        delivery: "inform",
        topic: "decision_verdict",
        summary: t("verdictSummary"),
        message: `${l.topic} -> [${p.synthesis?.recommendation}] ${p.synthesis?.summary}`,
        data: {
          topic: l.topic,
          recommendation: p.synthesis?.recommendation,
          score: p.synthesis?.score,
          summary: p.synthesis?.summary,
        } as unknown as JSONValue,
      });
      return;
    }

    if (l.phase === "deliberating") {
      const activeHat = p.activeHat;
      const targetParticipantId = l.seats[activeHat];
      const hatMeta = getHatMeta(activeHat);

      // 如果有明确分配席位且属于当前特工，定向通知；否则通知全部参会特工
      const audience = targetParticipantId
        ? { kind: "selected" as const, participantIDs: [targetParticipantId] }
        : { kind: "all" as const };

      await pudding.interaction.notify({
        id: `turn-${activeHat}-${Date.now()}`,
        audience,
        delivery: "request-action",
        topic: "deliberation_turn",
        summary: `${hatMeta.label}: ${t("notifyYourTurn")}`,
        message: `议题：${l.topic}\n当前视角：${hatMeta.label}（${hatMeta.desc}）。请调用 contribute 接口提出你的深度研判。`,
        data: {
          topic: l.topic,
          context: l.contextDesc,
          activeHat,
          perspectivesCount: p.perspectives.length,
          perspectives: p.perspectives,
        } as unknown as JSONValue,
      });
    }
  } catch {
    // 忽略会话关闭或通知临时不可达异常
  }
}

// =================== 接口实现 ===================

export async function setTopic(
  topic: string,
  contextDesc?: string,
) {
  return change(async () => {
    const l = lobby();
    if (l.phase !== "setup") {
      throw new Error("Cannot change topic while deliberation is in progress");
    }
    const nextLobby: MatrixLobby = {
      ...l,
      topic: topic.trim(),
      contextDesc: (contextDesc || "").trim(),
    };
    await save(nextLobby, position());
  });
}

export async function startDeliberation(
  seats?: Partial<Record<HatColor, string | null>>,
) {
  return change(async () => {
    const l = lobby();
    if (!l.topic.trim()) throw new Error("Topic cannot be empty");
    const nextLobby: MatrixLobby = {
      ...l,
      phase: "deliberating",
      startsAt: Date.now(),
      seats: {
        ...l.seats,
        ...(seats || {}),
      },
    };
    const nextPos: MatrixPosition = {
      ...position(),
      activeHat: "white",
      updatedAt: Date.now(),
    };
    await save(nextLobby, nextPos);
    await publish();
  });
}

export async function resetSession() {
  return change(async () => {
    await save(initialLobby(), initialPosition());
  });
}

export async function loadDemo() {
  return change(async () => {
    const demo = createDemoData();
    await save(demo.lobby, demo.pos);
  });
}

export async function submitPerspective(
  hat: HatColor,
  headline: string,
  content: string,
  keyPoints?: string[],
  speakerName?: string,
  context?: InteractionContext,
) {
  return change(async () => {
    const l = lobby();
    const p = position();
    if (l.phase === "setup") throw new Error("Deliberation has not started yet");

    let speaker = speakerName;
    if (context) {
      const pActor = actor(context);
      speaker = speaker || pActor.name;
    }

    const { pos: nextPos, lobby: nextLobby } = addPerspective(p, l, {
      hat,
      headline: headline.trim(),
      content: content.trim(),
      keyPoints: keyPoints?.map((k) => k.trim()).filter(Boolean),
      speakerName: speaker || getHatMeta(hat).short,
    });

    await save(nextLobby, nextPos);
    await publish();
    return { success: true, activeHat: nextPos.activeHat };
  });
}

export async function submitSynthesis(
  recommendation: RecommendationLevel,
  score: number,
  summary: string,
  actions: string[],
  context?: InteractionContext,
) {
  return change(async () => {
    const l = lobby();
    const p = position();
    if (l.phase === "setup") throw new Error("Deliberation has not started yet");
    if (context) actor(context);

    const actionItems: ActionItem[] = actions.map((act, index) => ({
      id: `act-${Date.now()}-${index}`,
      title: act.trim(),
      completed: false,
    }));

    const { pos: nextPos, lobby: nextLobby } = setSynthesis(p, l, {
      recommendation,
      score: Math.max(0, Math.min(100, Math.round(score))),
      summary: summary.trim(),
      actions: actionItems,
    });

    await save(nextLobby, nextPos);
    await publish();
    return { success: true };
  });
}

export async function toggleAction(actionId: string) {
  return change(async () => {
    const p = position();
    const nextPos = toggleActionItem(p, actionId);
    await save(lobby(), nextPos);
  });
}

export async function pause() {
  await pudding.interaction.pause();
  await mutation?.catch(() => {});
}

export async function resume() {
  await pudding.interaction.resume();
}

// 注册供 LLM 特工调用的 Tool 接口
function registerInterfaces() {
  return [
    pudding.defineInterface({
      name: "setDilemma",
      description: "Set or update the dilemma topic and context to deliberate",
      input: z
        .object({
          topic: z.string().min(2).max(200),
          context: z.string().max(1000).optional(),
        })
        .strict(),
      run: (input) => setTopic(input.topic, input.context),
    }),
    pudding.defineInterface({
      name: "contribute",
      description:
        "Contribute a perspective from a specific thinking hat (white=facts, yellow=benefits, black=risks, red=intuition, green=solutions, blue=synthesis)",
      input: z
        .object({
          hat: z.enum(["white", "yellow", "black", "red", "green", "blue"]),
          headline: z.string().min(2).max(100),
          content: z.string().min(5).max(1000),
          keyPoints: z.array(z.string().min(1).max(100)).max(6).optional(),
          speakerName: z.string().max(50).optional(),
        })
        .strict(),
      run: (input, context) =>
        submitPerspective(
          input.hat,
          input.headline,
          input.content,
          input.keyPoints,
          input.speakerName,
          context,
        ),
    }),
    pudding.defineInterface({
      name: "synthesize",
      description:
        "Blue hat final verdict to synthesize all perspectives into an actionable matrix",
      input: z
        .object({
          recommendation: z.enum([
            "strongly_recommend",
            "recommend_with_caution",
            "neutral",
            "not_recommended",
          ]),
          score: z.number().min(0).max(100),
          summary: z.string().min(5).max(800),
          actions: z.array(z.string().min(2).max(200)).min(1).max(10),
        })
        .strict(),
      run: (input, context) =>
        submitSynthesis(
          input.recommendation,
          input.score,
          input.summary,
          input.actions,
          context,
        ),
    }),
    pudding.defineInterface({
      name: "readMatrix",
      description: "Read full decision matrix state, perspectives and verdict",
      input: z.object({}).strict(),
      run: () => {
        const l = lobby();
        const p = position();
        return {
          topic: l.topic,
          context: l.contextDesc,
          phase: l.phase,
          activeHat: p.activeHat,
          perspectives: p.perspectives,
          synthesis: p.synthesis,
        };
      },
    }),
  ];
}

registerInterfaces();

pudding.interaction.onResume(async () => {
  if (changing || lobby().phase !== "deliberating") return;
  await change(async () => {
    await publish();
  });
});
