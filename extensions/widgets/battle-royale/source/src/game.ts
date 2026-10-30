import {
  pudding,
  type InteractionContext,
  type JSONValue,
} from "@pudding/widget";
import { z } from "zod";
import type {
  Seat,
  ActionStepInput,
  WhisperInput,
  BattleRoyaleLobby,
  BattleRoyalePosition,
} from "./types";
import {
  allSeats,
  seatsForCount,
  initialLobby,
  createInitialPosition,
  isBotParticipant,
  WEAPONS,
  computeWeaponDamage,
  computeCycleTurnOrder,
  visionRadiusFor,
  attackRangeFor,
  canAgentSeeAgent,
  canAgentSeeTile,
  chebyshevDist,
  compassDirection,
  isInStorm,
  applyDropIn,
  applyCombatAction,
  chooseBotDrop,
  chooseBotCombatAction,
} from "./rules";
import { t, seatLabel, seatShortLabel, botNameForSeat } from "./text";

/**
 * Recursively converts any `undefined` values to `null` so objects strictly conform
 * to `@pudding/widget` host's `jsonValue` Zod schema.
 */
export function sanitizeJsonValue<T>(value: T): JSONValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item));
  }
  if (typeof value === "object") {
    const out: Record<string, JSONValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeJsonValue(v);
    }
    return out;
  }
  return null;
}

export const lobby = (): BattleRoyaleLobby =>
  (pudding.state.read().data.lobby as unknown as BattleRoyaleLobby) ||
  initialLobby();

export const position = (): BattleRoyalePosition => {
  const saved = pudding.state.read().data.position as unknown as
    | BattleRoyalePosition
    | undefined;
  return saved || createInitialPosition(0, 6);
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

function actor(context: InteractionContext) {
  const run = pudding.interaction.read();
  const participant = run?.participants.find(
    (p) => p.id === context.actor?.participantID,
  );
  if (!run || context.actor?.runID !== run.id || !participant)
    throw new Error("Connect to this Battle Royale game first");
  if (run.status !== "running") throw new Error("Game is paused");
  if (context.signal.aborted) throw new Error("Cancelled");
  return participant;
}

function seatForParticipant(
  l: BattleRoyaleLobby,
  participantID: string | null | undefined,
): Seat | null {
  if (!participantID) return null;
  const active = seatsForCount(l.playerCount);
  return active.find((s) => l.seats[s] === participantID) || null;
}

async function save(l: BattleRoyaleLobby, p: BattleRoyalePosition) {
  await pudding.state.write({
    expectedVersion: pudding.state.read().version,
    data: {
      lobby: sanitizeJsonValue(l),
      position: sanitizeJsonValue(p),
    },
  });
}

/**
 * Strictly Fog-of-War & Privacy isolated view of the battlefield:
 * - During `dropping`: Blind parachute mode — other agents' landing coordinates and crate consumption
 *   are kept hidden so later droppers cannot snipe or counter-pick earlier droppers!
 * - During `combat`: An agent ONLY sees tiles within `visionRadiusFor(p, mySeat)`
 *   and ONLY sees enemies where `canAgentSeeAgent(p, mySeat, enemy)` is true!
 * - `privateWhispers` ONLY includes whispers sent by or to `mySeat` (unless the game is finished).
 * - `myStatus.tacticalNote` is ONLY visible to `mySeat`.
 */
export function describeRadarFor(
  l: BattleRoyaleLobby,
  p: BattleRoyalePosition,
  actorParticipantID: string | null | undefined,
) {
  const run = pudding.interaction.read();
  const mySeat = seatForParticipant(l, actorParticipantID);
  const isFinished = l.phase === "finished" && Boolean(p.winner);
  const myAgent = mySeat ? p.agents[mySeat] : null;

  // During blind dropping, restore crate display on tiles where OTHER players landed so no one can deduce landing spots
  const otherDroppedCoords = new Set(
    l.phase === "dropping"
      ? p.activeSeats
          .filter((s) => s !== mySeat && p.agents[s]?.dropped && p.agents[s]?.coord)
          .map((s) => p.agents[s].coord!)
      : [],
  );

  const visibleTiles =
    l.phase === "dropping" || isFinished
      ? p.tiles.map((tile) => ({
          coord: tile.coord,
          terrain: tile.terrain,
          crate:
            l.phase === "dropping" && otherDroppedCoords.has(tile.coord)
              ? ("supply" as const)
              : tile.crate,
          inStorm: isInStorm(p, tile.x, tile.y),
        }))
      : mySeat && myAgent && myAgent.alive
        ? p.tiles
            .filter((tile) => canAgentSeeTile(p, mySeat, tile.x, tile.y))
            .map((tile) => ({
              coord: tile.coord,
              terrain: tile.terrain,
              crate: tile.crate,
              inStorm: isInStorm(p, tile.x, tile.y),
            }))
        : [];

  const visibleEnemies =
    mySeat && myAgent && myAgent.alive && l.phase === "combat"
      ? p.aliveSeats
          .filter((s) => s !== mySeat && canAgentSeeAgent(p, mySeat, s))
          .map((s) => {
            const e = p.agents[s];
            const dist =
              myAgent.x !== null &&
              myAgent.y !== null &&
              e.x !== null &&
              e.y !== null
                ? chebyshevDist(myAgent.x, myAgent.y, e.x, e.y)
                : 1;
            const estDmg = computeWeaponDamage(
              myAgent.weapon !== "fists" && myAgent.ammo <= 0
                ? "fists"
                : myAgent.weapon,
              dist,
            );
            return {
              seat: s,
              coord: e.coord,
              distance: dist,
              hp: e.hp,
              shield: e.shield,
              weapon: e.weapon,
              guarding: e.guarding,
              spawnProtected: Boolean(e.spawnProtected),
              expectedAttackDamage: estDmg.baseDamage,
              cqbPenaltyIfAttackNow: estDmg.cqbPenaltyApplied,
            };
          })
      : isFinished
        ? p.activeSeats.map((s) => {
            const e = p.agents[s];
            return {
              seat: s,
              coord: e.coord,
              distance: 0,
              hp: e.hp,
              shield: e.shield,
              weapon: e.weapon,
              guarding: e.guarding,
              spawnProtected: false,
              expectedAttackDamage: 0,
              cqbPenaltyIfAttackNow: false,
            };
          })
        : [];

  // Directional acoustic pings for gunfire/explosions/airdrops (hidden during blind dropping)
  const acousticPings =
    l.phase === "combat" &&
    mySeat &&
    myAgent &&
    myAgent.alive &&
    myAgent.x !== null &&
    myAgent.y !== null
      ? p.soundPings
          .filter(
            (ping) =>
              ping.kind !== "drop" &&
              ping.cycle >= p.cycle - 1 &&
              ping.sourceSeat !== mySeat,
          )
          .slice(-6)
          .map((ping) => {
            const dist = chebyshevDist(myAgent.x!, myAgent.y!, ping.x, ping.y);
            const dir = compassDirection(myAgent.x!, myAgent.y!, ping.x, ping.y);
            const soundLabel =
              ping.kind === "airdrop"
                ? `黄金空投降落在 ${ping.coord} (${dir} ${dist} 格)`
                : ping.kind === "explosion"
                  ? `${dir}约 ${dist} 格处传来手雷剧烈爆炸声`
                  : ping.kind === "sniper"
                    ? `${dir}约 ${dist} 格处传来重型狙击枪声`
                    : `${dir}约 ${dist} 格处传来交火声`;
            return {
              cycle: ping.cycle,
              kind: ping.kind,
              direction: dir,
              approxDistance: dist,
              exactCoord: ping.kind === "airdrop" ? ping.coord : null,
              hint: soundLabel,
            };
          })
      : [];

  // Encrypted 1-on-1 whispers: strictly visible ONLY to sender or recipient (or after match finishes)
  const privateWhispers = (p.whisperLogs || [])
    .filter(
      (w) =>
        isFinished ||
        (mySeat && (w.fromSeat === mySeat || w.toSeat === mySeat)),
    )
    .slice(-10);

  const baseDropOrder = p.dropOrder?.length ? p.dropOrder : p.activeSeats;
  const cycle1CombatOrder = computeCycleTurnOrder(
    baseDropOrder,
    p.aliveSeats,
    1,
  );
  const nextCycleCombatOrder = computeCycleTurnOrder(
    baseDropOrder,
    p.aliveSeats,
    l.phase === "dropping" ? 1 : p.cycle + 1,
  );

  const snapshot = {
    round: l.round,
    phase: l.phase,
    cycle: p.cycle,
    turn: p.turn ?? null,
    turnAp: p.turnAp,
    yourSeat: mySeat ?? null,
    yourTurn: Boolean(mySeat && p.turn === mySeat && !p.winner),
    turnOrderInfo: {
      currentPhaseOrder: p.turnOrder,
      cycle1CombatOrder,
      nextCycleCombatOrder,
      balanceRule:
        "盲降跳伞落点全员保密；第1轮战斗按跳伞逆序行动（后跳者先动），后续轮次按蛇形轮转，且第1轮未行动者享有40%减伤空降护盾。",
    },
    grid: {
      columns: "A–H (8 columns)",
      rows: "1–8 (8 rows)",
    },
    storm: {
      centerCoord: p.stormCenter.coord,
      currentSafeRadius: p.stormRadius,
      nextSafeRadius: p.nextStormRadius,
    },
    aliveCount: p.aliveSeats.length,
    aliveSeats: p.aliveSeats,
    winner: p.winner ?? null,
    myStatus:
      mySeat && myAgent
        ? {
            seat: mySeat,
            alive: myAgent.alive,
            dropped: myAgent.dropped,
            coord: myAgent.coord ?? null,
            inStorm:
              myAgent.x !== null && myAgent.y !== null
                ? isInStorm(p, myAgent.x, myAgent.y)
                : false,
            hp: myAgent.hp,
            maxHp: myAgent.maxHp,
            shield: myAgent.shield,
            maxShield: myAgent.maxShield,
            armorLevel: myAgent.armorLevel,
            weapon: myAgent.weapon,
            ammo: myAgent.ammo,
            maxAmmo: myAgent.maxAmmo,
            weaponDamage: WEAPONS[myAgent.weapon].damage,
            optimalMinRange: WEAPONS[myAgent.weapon].optimalMinRange,
            closeRangeMultiplier: WEAPONS[myAgent.weapon].closeRangeMultiplier,
            attackRange: attackRangeFor(p, mySeat, false),
            visionRadius: visionRadiusFor(p, mySeat),
            medkits: myAgent.medkits,
            grenades: myAgent.grenades,
            guarding: myAgent.guarding,
            spawnProtected: Boolean(myAgent.spawnProtected),
            kills: myAgent.kills,
            damageDealt: myAgent.damageDealt,
            tacticalScore: myAgent.tacticalScore,
            tacticalNote: myAgent.tacticalNote ?? null,
            placement: myAgent.placement ?? null,
          }
        : null,
    visibleTiles,
    visibleEnemies,
    acousticPings,
    privateWhispers,
    roster: Object.fromEntries(
      p.activeSeats.map((s) => {
        const pid = l.seats[s];
        const isBot = isBotParticipant(pid);
        const partName = isBot
          ? botNameForSeat(s)
          : run?.participants.find((part) => part.id === pid)?.name ||
            seatShortLabel(s);
        const ag = p.agents[s];
        return [
          s,
          {
            seat: s,
            name: partName,
            isBot,
            alive: ag.alive,
            spawnProtected: Boolean(ag.spawnProtected),
            kills: ag.kills,
            tacticalScore: ag.tacticalScore,
            placement: ag.placement ?? null,
            lastRadio: ag.lastRadio ?? null,
          },
        ];
      }),
    ),
    recentRadio: p.radioLogs.slice(-8),
    killFeed: p.killFeed.slice(-6),
  };

  return sanitizeJsonValue(snapshot);
}

export function readRadar(context: InteractionContext) {
  const run = pudding.interaction.read();
  const actorID =
    run && run.id === context.actor?.runID
      ? context.actor?.participantID
      : null;
  return describeRadarFor(lobby(), position(), actorID);
}

export class NotificationError extends Error {}

export async function publish(retry = false) {
  const run = pudding.interaction.read();
  if (!run) return;
  const l = lobby();
  const p = position();

  const isFinished = l.phase === "finished" && Boolean(p.winner);
  const activeSeat = p.turn;
  const activeParticipantID = activeSeat ? l.seats[activeSeat] : null;

  if (
    !isFinished &&
    l.phase !== "lobby" &&
    isBotParticipant(activeParticipantID)
  ) {
    try {
      await pudding.interaction.setRequests([]);
    } catch {
      /* ignore if no active run requests */
    }
    return;
  }

  const topic = isFinished
    ? "result"
    : l.phase === "lobby"
      ? "invitation"
      : l.phase === "dropping"
        ? "drop"
        : "combat";

  const base = `round-${l.round}-cycle-${p.cycle}-${l.phase}-step-${p.stepCount}`;

  const realParticipants = run.participants.map((part) => part.id);
  const recipients = isFinished
    ? realParticipants
    : l.phase === "lobby"
      ? (Object.values(l.seats).filter(
          (id): id is string =>
            Boolean(id) &&
            !isBotParticipant(id) &&
            !l.ready.includes(id as string),
        ) as string[])
      : activeParticipantID && !isBotParticipant(activeParticipantID)
        ? [activeParticipantID]
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
      const assignedSeat =
        topic === "invitation"
          ? allSeats.find((s) => l.seats[s] === participantIDs[0])
          : activeSeat || undefined;

      const groupBase = assignedSeat ? `${base}-${assignedSeat}` : base;
      const attempts = previous.filter(
        (n) => n.id === groupBase || n.id.startsWith(`${groupBase}-retry-`),
      );
      const id = attempts.length
        ? `${groupBase}-retry-${attempts.length}`
        : groupBase;

      const sName = assignedSeat ? seatLabel(assignedSeat) : "";
      const winnerName = p.winner ? seatLabel(p.winner) : "";

      const summary =
        topic === "invitation"
          ? t("notifyInviteSummary", { seat: sName })
          : topic === "result"
            ? t("notifyResultSummary", { winner: winnerName })
            : topic === "drop"
              ? t("notifyDropSummary", { seat: sName })
              : t("notifyCombatSummary", { seat: sName, cycle: p.cycle });

      const message =
        topic === "invitation"
          ? t("notifyInviteMessage", { seat: sName })
          : topic === "result"
            ? t("notifyResultMessage", { winner: winnerName })
            : topic === "drop"
              ? t("notifyDropMessage", { seat: sName })
              : t("notifyCombatMessage", { seat: sName, cycle: p.cycle });

      const privateOrPublicData = describeRadarFor(
        l,
        p,
        participantIDs.length === 1 ? participantIDs[0] : null,
      );

      await pudding.interaction.notify({
        id,
        audience: isFinished
          ? { kind: "all" }
          : { kind: "selected", participantIDs },
        delivery: "request-action",
        topic,
        summary,
        message,
        data: privateOrPublicData,
      });
    }
  } catch (error) {
    throw new NotificationError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export interface StartBattleOptions {
  playerCount: 4 | 6;
  assignments: Record<Seat, string>;
}

export const start = (options: StartBattleOptions) =>
  change(async () => {
    const previous = lobby();
    const activeSeats = seatsForCount(options.playerCount);

    const activeAssignments = activeSeats.map((s) => options.assignments[s]);
    const nonBots = activeAssignments.filter(
      (id) => id && !id.startsWith("@bot"),
    );
    if (new Set(nonBots).size !== nonBots.length) {
      throw new Error(t("seatConflictError"));
    }

    const sessionCandidates = (await pudding.interaction.candidates()).sessions;
    const sessionIDs = nonBots.filter((id) => id !== "@me");
    const run = await pudding.interaction.connect({ sessionIDs });

    const humanPart = run.participants.find((p) => p.kind === "human");
    const sessionParts = run.participants.filter((p) => p.kind === "session");

    const participantFor = (
      seat: Seat,
      chosenID: string | null | undefined,
    ): string => {
      if (!chosenID || chosenID.startsWith("@bot")) {
        return `@bot:${seat}`;
      }
      if (chosenID === "@me") {
        return humanPart?.id || `@bot:${seat}`;
      }
      const byDirectSessionID = run.participants.find(
        (p) =>
          (p as unknown as { sessionID?: string }).sessionID === chosenID,
      );
      if (byDirectSessionID) return byDirectSessionID.id;

      const byPartID = run.participants.find((p) => p.id === chosenID);
      if (byPartID) return byPartID.id;

      const sessionIndex = sessionIDs.indexOf(chosenID);
      if (sessionIndex >= 0 && sessionIndex < sessionParts.length) {
        return sessionParts[sessionIndex].id;
      }

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
      return `@bot:${seat}`;
    };

    const resolvedSeats: Record<Seat, string | null> = {
      Seat1: participantFor("Seat1", options.assignments.Seat1),
      Seat2: participantFor("Seat2", options.assignments.Seat2),
      Seat3: participantFor("Seat3", options.assignments.Seat3),
      Seat4: participantFor("Seat4", options.assignments.Seat4),
      Seat5:
        options.playerCount === 6
          ? participantFor("Seat5", options.assignments.Seat5)
          : null,
      Seat6:
        options.playerCount === 6
          ? participantFor("Seat6", options.assignments.Seat6)
          : null,
    };

    await pudding.interaction.setRequests([]);
    const nextRound = previous.round + 1;

    const nextLobby: BattleRoyaleLobby = {
      round: nextRound,
      phase: "dropping",
      playerCount: options.playerCount,
      seats: resolvedSeats,
      ready: Object.values(resolvedSeats).filter((v): v is string => Boolean(v)),
      startsAt: Date.now(),
    };

    const nextPos = createInitialPosition(nextRound, options.playerCount);

    await save(nextLobby, nextPos);
    if (pudding.interaction.read()?.status === "paused") {
      await pudding.interaction.resume();
    }
    await publish();
  });

export const changeReadiness = (ready: boolean, context: InteractionContext) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const readyList = ready
      ? Array.from(new Set([...l.ready, who.id]))
      : l.ready.filter((id) => id !== who.id);
    const nextLobby = { ...l, ready: readyList };
    await save(nextLobby, position());
    return describeRadarFor(nextLobby, position(), who.id);
  });

export const dropIn = (
  input: { coord: string; radio?: string; note?: string },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy an active seat in this round");
    const res = applyDropIn(
      l,
      p,
      mySeat,
      input.coord,
      input.radio,
      input.note,
    );
    await save(res.lobby, res.position);
    await publish();
    return describeRadarFor(res.lobby, res.position, who.id);
  });

export const takeAction = (
  input: {
    steps: ActionStepInput[];
    radio?: string;
    whisper?: WhisperInput;
    note?: string;
    finishTurn?: boolean;
  },
  context: InteractionContext,
) =>
  change(async () => {
    const who = actor(context);
    const l = lobby();
    const p = position();
    const mySeat = seatForParticipant(l, who.id);
    if (!mySeat) throw new Error("You do not occupy an active seat in this round");
    const res = applyCombatAction(
      l,
      p,
      mySeat,
      input.steps,
      input.radio,
      input.finishTurn !== false,
      input.whisper,
      input.note,
    );
    await save(res.lobby, res.position);
    await publish();
    return describeRadarFor(res.lobby, res.position, who.id);
  });

export const stepBotTurn = () =>
  change(async () => {
    const run = pudding.interaction.read();
    if (run && run.status === "paused") return false;
    const l = lobby();
    const p = position();
    if (l.phase !== "dropping" && l.phase !== "combat") return false;
    if (!p.turn || p.winner) return false;

    const pid = l.seats[p.turn];
    if (!isBotParticipant(pid)) return false;

    let res: { lobby: BattleRoyaleLobby; position: BattleRoyalePosition };
    if (l.phase === "dropping") {
      const { coord, radio, note } = chooseBotDrop(p, p.turn);
      res = applyDropIn(l, p, p.turn, coord, radio, note);
    } else {
      try {
        const { steps, radio, whisper, note } = chooseBotCombatAction(
          p,
          p.turn,
        );
        res = applyCombatAction(
          l,
          p,
          p.turn,
          steps,
          radio,
          true,
          whisper,
          note,
        );
      } catch {
        res = applyCombatAction(l, p, p.turn, [{ kind: "guard" }], null, true);
      }
    }

    await save(res.lobby, res.position);
    await publish();
    return true;
  });

export const pause = async () => {
  const l = lobby();
  const p = position();
  if (l.phase === "lobby" || p.winner) throw new Error("No ongoing game");
  await pudding.interaction.pause();
  await mutation?.catch(() => {});
};

export const resume = async () => {
  await pudding.interaction.resume();
};

const stepSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("move"),
      to: z.string().trim().min(2).max(4),
    })
    .strict(),
  z
    .object({
      kind: z.literal("loot"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("attack"),
      target: z.string().trim().min(2).max(10),
      useGrenade: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("heal"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("guard"),
    })
    .strict(),
]);

const whisperSchema = z
  .object({
    to: z.enum(["Seat1", "Seat2", "Seat3", "Seat4", "Seat5", "Seat6"]),
    message: z.string().trim().min(1).max(100),
  })
  .strict();

function registerInterfaces() {
  (
    pudding as typeof pudding & { setInstructions?: (text: string) => void }
  ).setInstructions?.(t("instructions"));

  return [
    pudding.defineInterface({
      name: "ready",
      description: t("descReady"),
      input: z.object({ ready: z.boolean().optional() }).strict(),
      run: (i, c) => changeReadiness(i.ready !== false, c),
    }),
    pudding.defineInterface({
      name: "readRadar",
      description: t("descReadRadar"),
      input: z.object({}).strict(),
      run: (_, c) => readRadar(c),
    }),
    pudding.defineInterface({
      name: "dropIn",
      description: t("descDropIn"),
      input: z
        .object({
          coord: z.string().trim().min(2).max(4),
          radio: z.string().trim().max(80).optional(),
          note: z.string().trim().max(200).optional(),
        })
        .strict(),
      run: dropIn,
    }),
    pudding.defineInterface({
      name: "takeAction",
      description: t("descTakeAction"),
      input: z
        .object({
          steps: z.array(stepSchema).min(1).max(2),
          radio: z.string().trim().max(80).optional(),
          whisper: whisperSchema.optional(),
          note: z.string().trim().max(200).optional(),
        })
        .strict(),
      run: (i, c) =>
        takeAction(
          {
            steps: i.steps,
            radio: i.radio,
            whisper: i.whisper,
            note: i.note,
            finishTurn: true,
          },
          c,
        ),
    }),
  ];
}

let interfaces = registerInterfaces();
pudding.locale.subscribe(() => {
  interfaces.forEach((remove) => remove());
  interfaces = registerInterfaces();
});

pudding.interaction.onResume(async () => {
  if (changing || lobby().phase === "lobby" || position().winner) return;
  await change(async () => {
    await publish(true);
  });
});
