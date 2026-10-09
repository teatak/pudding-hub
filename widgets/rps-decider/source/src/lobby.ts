export type Lobby = {
  round: number;
  phase: "lobby" | "playing";
  seats: Record<string, string>;
  ready: string[];
};
export const newLobby = (round: number): Lobby => ({
  round,
  phase: "lobby",
  seats: {},
  ready: [],
});
export function joinSeat(
  lobby: Lobby,
  roles: readonly string[],
  role: string,
  actor: string,
  human: boolean,
): Lobby {
  if (lobby.phase !== "lobby") throw new Error("The game has already started");
  if (!roles.includes(role)) throw new Error("Unknown seat");
  if (lobby.seats[role] && lobby.seats[role] !== actor)
    throw new Error("Seat occupied; choose another seat or observe");
  if (
    !human &&
    Object.entries(lobby.seats).some(([r, id]) => r !== role && id === actor)
  )
    throw new Error("Leave your current seat before switching");
  return {
    ...lobby,
    seats: { ...lobby.seats, [role]: actor },
    ready: lobby.ready.filter((id) => id !== actor),
  };
}
export function setReady(
  lobby: Lobby,
  roles: readonly string[],
  actor: string,
): Lobby {
  if (lobby.phase !== "lobby") throw new Error("The game has already started");
  if (!Object.values(lobby.seats).includes(actor))
    throw new Error("Choose a seat before getting ready");
  const ready = [...new Set([...lobby.ready, actor])];
  return {
    ...lobby,
    ready,
    phase: roles.every(
      (role) => lobby.seats[role] && ready.includes(lobby.seats[role]),
    )
      ? "playing"
      : "lobby",
  };
}
export function leaveSeat(lobby: Lobby, actor: string): Lobby {
  if (lobby.phase !== "lobby")
    throw new Error("Start a new round before changing seats");
  return {
    ...lobby,
    seats: Object.fromEntries(
      Object.entries(lobby.seats).filter(([, id]) => id !== actor),
    ),
    ready: lobby.ready.filter((id) => id !== actor),
  };
}
