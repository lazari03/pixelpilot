export type Direction = "right" | "down" | "left" | "up";
export type Position = readonly [number, number];
export const OBSTACLES: Position[] = [
  [1, 1],
  [2, 1],
  [4, 3],
  [1, 4],
];
export function gateOpens(key: boolean, energy: number, operator: string) {
  if (!Number.isFinite(energy)) return false;
  switch (operator) {
    case "AND":
      return key && energy >= 8;
    case "OR":
      return key || energy >= 8;
    case "NOT":
      return !key;
    default:
      return false;
  }
}
export function nextStep(
  position: Position,
  direction: Direction,
  gateEnabled: boolean,
  gateOpen: boolean,
): { position: Position; blocked?: "obstacle" | "gate"; finished: boolean } {
  const offsets: Record<Direction, Position> = {
    right: [1, 0],
    left: [-1, 0],
    up: [0, -1],
    down: [0, 1],
  };
  const [dx, dy] = offsets[direction];
  const [x, y] = [position[0] + dx, position[1] + dy];
  if (
    x < 0 ||
    y < 0 ||
    x > 5 ||
    y > 5 ||
    OBSTACLES.some(([a, b]) => a === x && b === y)
  )
    return { position, blocked: "obstacle", finished: false };
  // The beacon also requires an open gate, so an alternate route cannot bypass the lesson.
  if (gateEnabled && x === 5 && (y === 4 || y === 5) && !gateOpen)
    return { position, blocked: "gate", finished: false };
  return { position: [x, y], finished: x === 5 && y === 5 };
}
