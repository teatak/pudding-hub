export const gestures = ["rock", "paper", "scissors"] as const;
export type Gesture = (typeof gestures)[number];
export function winner(a: Gesture, b: Gesture): "A" | "B" | "draw" {
  return a === b
    ? "draw"
    : { rock: "scissors", paper: "rock", scissors: "paper" }[a] === b
      ? "A"
      : "B";
}
