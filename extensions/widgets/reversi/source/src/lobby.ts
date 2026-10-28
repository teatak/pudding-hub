export const roles = ["Black", "White"] as const;

export type Lobby = {
  round: number;
  players: string[];
  phase: "lobby" | "countdown" | "playing";
  seats: Record<string, string>;
  ready: string[];
  startsAt: number | null;
};

export const emptyLobby = (): Lobby => ({
  round: 0,
  players: [],
  phase: "lobby",
  seats: {},
  ready: [],
  startsAt: null,
});

export function newLobby(
  previous: Lobby,
  players: string[],
  random = Math.random,
): Lobby {
  if (players.length !== 2 || new Set(players).size !== 2)
    throw new Error("Choose exactly two players");
  const samePair =
    previous.players.length === 2 &&
    players.every((id) => previous.players.includes(id));
  const black = samePair
    ? previous.seats.White
    : players[random() < 0.5 ? 0 : 1];
  return {
    round: previous.round + 1,
    players: [...players],
    phase: "lobby",
    seats: { Black: black, White: players.find((id) => id !== black)! },
    ready: [],
    startsAt: null,
  };
}

export function setReady(
  lobby: Lobby,
  actor: string,
  ready = true,
  now = Date.now(),
): Lobby {
  if (lobby.phase === "playing")
    throw new Error("The game has already started");
  if (!Object.values(lobby.seats).includes(actor))
    throw new Error("You are observing this round");
  if (lobby.ready.includes(actor) === ready) return lobby;
  const next = ready
    ? [...lobby.ready, actor]
    : lobby.ready.filter((id) => id !== actor);
  const complete = roles.every(
    (role) => lobby.seats[role] && next.includes(lobby.seats[role]),
  );
  return {
    ...lobby,
    ready: next,
    phase: complete ? "countdown" : "lobby",
    startsAt: complete ? now + 3000 : null,
  };
}

export function beginPlay(lobby: Lobby, now = Date.now()): Lobby {
  if (
    lobby.phase !== "countdown" ||
    lobby.startsAt === null ||
    now < lobby.startsAt
  )
    throw new Error("Wait for the countdown");
  return { ...lobby, phase: "playing", startsAt: null };
}
