import { describe, it, expect } from "vitest";
import {
  execute,
  meetsChallenge,
  type Challenge,
  type Instruction,
  type Program,
} from "../src/domain/program";
import challenges from "../src/data/challenges.json";
import { solution } from "./helpers/solutions";
describe("full course practical engine", () => {
  it("has a valid bounded solution for every difficulty and exam task", () => {
    for (const challenge of challenges) {
      const c = challenge as Challenge;
      const result = execute(solution(c), c);
      expect(meetsChallenge(result, c), c.id).toBe(true);
    }
  });
  it("stops infinite empty loops and recursive tools safely", () => {
    const c = challenges[0] as Challenge;
    expect(
      execute(
        { body: [{ type: "while", condition: "hasKey", body: [] }], tool: [] },
        c,
      ).reason,
    ).toBe("limit");
    expect(
      execute({ body: [{ type: "call" }], tool: [{ type: "call" }] }, c).reason,
    ).toBe("limit");
  });
  it("distinguishes while and do/while when a condition begins false", () => {
    const c = { ...challenges[0], energy: 8 } as Challenge;
    const run = (type: "while" | "doWhile") =>
      execute(
        {
          body: [{ type, condition: "energyLow", body: [{ type: "charge" }] }],
          tool: [],
        },
        c,
      ).frames.at(-1)?.energy;
    expect(run("while")).toBe(8);
    expect(run("doWhile")).toBe(9);
  });
  it("does not grant mastery for merely reaching the goal", () => {
    const c = challenges.find((c) =>
      c.required.includes("switch"),
    ) as Challenge;
    const p = solution({ ...c, required: [] });
    expect(execute(p, c).finished).toBe(true);
    expect(meetsChallenge(execute(p, c), c)).toBe(false);
  });
});
