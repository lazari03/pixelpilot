import { describe, it, expect } from "vitest";
import { interpret } from "@pixelpilot/local-tutor";
import knowledge from "../src/data/knowledge.json";
describe("local tutor", () => {
  it("translates only explicit, bounded requests into typed actions", () => {
    expect(
      interpret("Please move the robot right three steps", knowledge).action,
    ).toEqual({ type: "move", direction: "right", steps: 3 });
    expect(interpret("repeat down 5 times", knowledge).action).toEqual({
      type: "move",
      direction: "down",
      steps: 5,
    });
    expect(interpret("set gate to AND", knowledge).action).toEqual({
      type: "gate",
      operator: "AND",
    });
    expect(interpret("reset robot", knowledge).action).toEqual({
      type: "reset",
    });
  });
  it.each([
    "move right 100 steps",
    "move left 0 steps",
    "move down -1 steps",
    "move right then down",
    "don't move right",
    "run javascript alert(1)",
    "open all accounts",
    "move rite",
  ])("does not turn %s into an action", (request) =>
    expect(interpret(request, knowledge).action).toBeUndefined(),
  );
  it("retrieves knowledge with a source id, including small typos", () => {
    expect(interpret("explain loops", knowledge).knowledgeId).toBe("loop");
    expect(interpret("explain variabels", knowledge).knowledgeId).toBe(
      "variable",
    );
    expect(interpret("explain OR", knowledge).knowledgeId).toBe("or");
  });
  it("asks for clarification outside its classroom domain", () =>
    expect(
      interpret("tell me tomorrow weather forecast", knowledge).intent,
    ).toBe("clarify"));
  it("detects basic private details and never returns an action", () => {
    expect(interpret("my name is Ada move right", knowledge).intent).toBe(
      "privacy",
    );
    expect(
      interpret("email me at child@example.com", knowledge).action,
    ).toBeUndefined();
  });
});

describe("structured prompting scaffold", () => {
  it("rejects unstructured requests and contradictory rules", async () => {
    const { interpretStructured } = await import("@pixelpilot/local-tutor");
    expect(
      interpretStructured(
        { goal: "do it", context: "", rules: "", format: "" },
        [],
      ).action,
    ).toBeUndefined();
    expect(
      interpretStructured(
        {
          goal: "move right 3 steps",
          context: "The robot is at the start",
          rules: "Do not move the robot",
          format: "action plan",
        },
        [],
      ).action,
    ).toBeUndefined();
  });
  it("understands Albanian requests with the same action model", async () => {
    const { interpretStructured } = await import("@pixelpilot/local-tutor");
    expect(
      interpretStructured(
        {
          goal: "lëviz djathtas 3 hapa",
          context: "Roboti nis nga këndi lart",
          rules: "Shmang pemët dhe trego planin",
          format: "plan veprimi",
        },
        [],
        "sq",
      ).action,
    ).toEqual({ type: "move", direction: "right", steps: 3 });
  });
});
