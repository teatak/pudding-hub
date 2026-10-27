type Candidate = { id: string; kind?: "session" | "external"; connected?: boolean };

// Newly joined agents fill empty seats. Explicitly unchecked agents stay
// unchecked; internal conversations and the human are always chosen manually.
export function fillCandidates(selected: string[], candidates: Candidate[], seenAgents: ReadonlySet<string>) {
  const available = new Set(["@me", ...candidates.filter(c => c.connected !== false).map(c => c.id)]);
  const retained = selected.filter(id => available.has(id));
  const joined = candidates.filter(c => c.kind === "external" && c.connected !== false && !seenAgents.has(c.id));
  return [...new Set([...retained, ...joined.map(c => c.id)])].slice(0, 2);
}
