export const roles = ["Black", "White"] as const;
export type Lobby = {
  round: number;
  players: string[];
  phase: "lobby" | "countdown" | "playing";
  seats: Record<string, string>;
  ready: string[];
  startsAt: number | null;
};
export const newLobby = (round: number, players: string[] = []): Lobby => ({
  round,
  players,
  phase: "lobby",
  seats: {},
  ready: [],
  startsAt: null,
});
export function joinSeat(lobby: Lobby, role: string, actor: string): Lobby {
  if (lobby.phase !== "lobby") throw new Error("The game has already started");
  if (!lobby.players.includes(actor))
    throw new Error("You are observing this round");
  if (!roles.includes(role as (typeof roles)[number]))
    throw new Error("Unknown seat");
  if (lobby.seats[role] === actor) return lobby;
  if (lobby.seats[role])
    throw new Error("Seat occupied; choose the other seat");
  if (Object.values(lobby.seats).includes(actor))
    throw new Error("Leave your current seat before switching");
  return { ...lobby, seats: { ...lobby.seats, [role]: actor } };
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
    throw new Error("Choose a seat before getting ready");
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
export function leaveSeat(lobby: Lobby, actor: string): Lobby {
  if (lobby.phase === "playing")
    throw new Error("Start a new round before changing seats");
  return {
    ...lobby,
    phase: "lobby",
    startsAt: null,
    seats: Object.fromEntries(
      Object.entries(lobby.seats).filter(([, id]) => id !== actor),
    ),
    ready: lobby.ready.filter((id) => id !== actor),
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
