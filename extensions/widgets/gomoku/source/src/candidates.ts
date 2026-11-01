import type { PlayerIdentity } from "./lobby";
type Candidate = { id: string; kind?: "session" | "external"; connected?: boolean };
type Participant = { id: string; name: string; kind: "session" | "external" | "human" };
type ProfileCandidate = Candidate & { participantID?: string; name: string; model: PlayerIdentity["model"] };

// A rematch keeps its actual players. Newly joined agents may fill the initial
// picker, but must never silently replace an offline player in a later round.
export function roundCandidates(players: string[], candidates: (Candidate & { participantID?: string })[], humanID?: string) {
  return players.flatMap(id => id === humanID ? ["@me"] : candidates
    .filter(candidate => candidate.participantID === id && candidate.connected !== false)
    .map(candidate => candidate.id));
}

// Display metadata belongs to the saved round, independently of its live
// activity lease. Presence and permission to play always come from the host.
export function retainedPlayer(id: string, participant: Participant | undefined,
  candidate: ProfileCandidate | undefined, saved: PlayerIdentity | undefined): PlayerIdentity | undefined {
  if (!participant && !candidate && !saved) return undefined;
  const model = candidate?.model || saved?.model;
  return {
    id, name: participant?.name || saved?.name || candidate!.name,
    human: participant ? participant.kind === "human" : saved?.human || false,
    external: participant ? participant.kind === "external" : saved?.external || candidate?.kind === "external",
    ...(model ? { model: { ...model } } : {}),
  };
}

export function playerIdentities(participants: Participant[], candidates: ProfileCandidate[]) {
  return Object.fromEntries(participants.map(participant => [participant.id,
    retainedPlayer(participant.id, participant, candidates.find(c => c.participantID === participant.id), undefined)!,
  ]));
}

// Newly joined agents fill empty seats. Explicitly unchecked agents stay
// unchecked; internal conversations and the human are always chosen manually.
export function fillCandidates(selected: string[], candidates: Candidate[], seenAgents: ReadonlySet<string>) {
  const available = new Set(["@me", ...candidates.filter(c => c.connected !== false).map(c => c.id)]);
  const retained = selected.filter(id => available.has(id));
  const joined = candidates.filter(c => c.kind === "external" && c.connected !== false && !seenAgents.has(c.id));
  return [...new Set([...retained, ...joined.map(c => c.id)])].slice(0, 2);
}
