import type { Direction, Position } from "./game";
export type Condition =
  "energyLow" | "energyReady" | "hasKey" | "AND" | "OR" | "NOT" | "notAtGoal";
export type Instruction =
  | { type: "move"; direction: Direction }
  | { type: "charge" }
  | { type: "setKey"; value: boolean }
  | { type: "setEnergy"; value: number }
  | { type: "setSignal"; value: "green" | "red" }
  | { type: "repeat"; count: number; body: Instruction[] }
  | {
      type: "if";
      condition: Condition;
      body: Instruction[];
      otherwise: Instruction[];
    }
  | { type: "while" | "doWhile"; condition: Condition; body: Instruction[] }
  | { type: "switch"; body: Instruction[]; otherwise: Instruction[] }
  | { type: "call" };
export interface Program {
  body: Instruction[];
  tool: Instruction[];
}
export interface Challenge {
  id: string;
  day: number;
  level: string;
  slot: number;
  title: { en: string; sq: string };
  goal: number[];
  walls: number[][];
  required: string[];
  maxNodes: number;
  gate: boolean;
  energy: number;
  signal: string;
  exam: boolean;
}
export interface Frame {
  x: number;
  y: number;
  energy: number;
  key?: boolean;
  signal?: string;
}
export interface RunResult {
  frames: Frame[];
  used: string[];
  finished: boolean;
  reason: "success" | "blocked" | "limit" | "unfinished";
  nodes: number;
}
export function countNodes(program: Program): number {
  function count(list: Instruction[]): number {
    return list.reduce(
      (sum, node) =>
        sum +
        1 +
        ("body" in node ? count(node.body) : 0) +
        ("otherwise" in node ? count(node.otherwise) : 0),
      0,
    );
  }
  return count(program.body) + count(program.tool);
}
export function execute(program: Program, challenge: Challenge): RunResult {
  const frames: Frame[] = [
    {
      x: 0,
      y: 0,
      energy: challenge.energy,
      key: true,
      signal: challenge.signal,
    },
  ];
  const used = new Set<string>();
  let ticks = 0,
    halted = false,
    reason: RunResult["reason"] = "unfinished";
  let state = frames[0];
  const atGoal = () =>
    state.x === challenge.goal[0] && state.y === challenge.goal[1];
  function condition(value: Condition) {
    switch (value) {
      case "energyLow":
        return state.energy < 8;
      case "energyReady":
        return state.energy >= 8;
      case "hasKey":
        return state.key ?? true;
      case "AND":
        return (state.key ?? true) && state.energy >= 8;
      case "OR":
        return (state.key ?? true) || state.energy >= 8;
      case "NOT":
        return !(state.key ?? true);
      case "notAtGoal":
        return !atGoal();
    }
  }
  function tick() {
    if (++ticks > 300) {
      reason = "limit";
      halted = true;
      return false;
    }
    return true;
  }
  function walk(list: Instruction[], depth: number) {
    if (depth > 8) {
      reason = "limit";
      halted = true;
      return;
    }
    for (const node of list) {
      if (halted || !tick()) return;
      used.add(node.type);
      switch (node.type) {
        case "setKey":
          state = { ...state, key: node.value };
          frames.push(state);
          break;
        case "setEnergy":
          state = { ...state, energy: Math.min(20, Math.max(0, node.value)) };
          frames.push(state);
          break;
        case "setSignal":
          state = { ...state, signal: node.value };
          frames.push(state);
          break;
        case "move": {
          const offset: Record<Direction, Position> = {
            right: [1, 0],
            left: [-1, 0],
            up: [0, -1],
            down: [0, 1],
          };
          const [dx, dy] = offset[node.direction];
          const x = state.x + dx,
            y = state.y + dy;
          if (
            x < 0 ||
            y < 0 ||
            x > 5 ||
            y > 5 ||
            challenge.walls.some(([a, b]) => a === x && b === y) ||
            (challenge.gate &&
              x === challenge.goal[0] &&
              y === challenge.goal[1] &&
              (state.energy < 8 || state.key === false))
          ) {
            reason = "blocked";
            halted = true;
            return;
          }
          state = { ...state, x, y };
          frames.push(state);
          break;
        }
        case "charge":
          state = { ...state, energy: Math.min(20, state.energy + 1) };
          frames.push(state);
          break;
        case "repeat":
          for (
            let i = 0;
            i < Math.min(20, Math.max(0, Math.floor(node.count)));
            i++
          ) {
            if (halted || !tick()) break;
            walk(node.body, depth + 1);
          }
          break;
        case "if":
          walk(
            condition(node.condition) ? node.body : node.otherwise,
            depth + 1,
          );
          break;
        case "switch":
          walk(
            state.signal === "green" ? node.body : node.otherwise,
            depth + 1,
          );
          break;
        case "while":
        case "doWhile": {
          let first = node.type === "doWhile";
          while (!halted && (first || condition(node.condition))) {
            first = false;
            if (!tick()) break;
            walk(node.body, depth + 1);
          }
          break;
        }
        case "call":
          walk(program.tool, depth + 1);
          break;
      }
    }
  }
  walk(program.body, 0);
  if (!halted && atGoal()) reason = "success";
  return {
    frames,
    used: [...used],
    finished: reason === "success",
    reason,
    nodes: countNodes(program),
  };
}
export function meetsChallenge(result: RunResult, challenge: Challenge) {
  return (
    result.finished &&
    result.nodes <= challenge.maxNodes &&
    challenge.required.every((type) => result.used.includes(type))
  );
}
