import type { Challenge, Instruction, Program } from "../../src/domain/program";
const move = (direction: "right" | "down"): Instruction => ({
  type: "move",
  direction,
});
function solution(c: Challenge): Program {
  const required = new Set(c.required);
  const body: Instruction[] = [];
  if (c.gate) {
    if (required.has("while"))
      body.push({
        type: "while",
        condition: "energyLow",
        body: [{ type: "charge" }],
      });
    else if (required.has("doWhile"))
      body.push({
        type: "doWhile",
        condition: "energyLow",
        body: [{ type: "charge" }],
      });
    else body.push({ type: "repeat", count: 3, body: [{ type: "charge" }] });
  }
  const route: Instruction[] = [
    {
      type: "repeat",
      count: c.goal[0] - (required.has("call") ? 1 : 0),
      body: [move("right")],
    },
    { type: "repeat", count: c.goal[1], body: [move("down")] },
  ];
  if (required.has("call")) body.push({ type: "call" });
  if (required.has("if"))
    body.push({ type: "if", condition: "hasKey", body: route, otherwise: [] });
  else if (required.has("switch"))
    body.push({ type: "switch", body: route, otherwise: [] });
  else body.push(...route);
  return {
    body,
    tool: required.has("call") ? [move("right")] : [],
  };
}
export { solution };
