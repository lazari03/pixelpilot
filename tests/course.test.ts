import { describe, it, expect } from "vitest";
import { gateOpens, nextStep } from "../src/domain/game";
import lessons from "../src/data/course.json";
describe("Boolean gate", () => {
  it("evaluates all sensor combinations and rejects invalid operators", () => {
    for (const key of [true, false])
      for (const energy of [0, 8, 9]) {
        expect(gateOpens(key, energy, "AND")).toBe(key && energy >= 8);
        expect(gateOpens(key, energy, "OR")).toBe(key || energy >= 8);
      }
    expect(gateOpens(true, 9, "NOT")).toBe(false);
    expect(gateOpens(false, 0, "NOT")).toBe(true);
    expect(gateOpens(true, 10, "invalid")).toBe(false);
  });
  it("does not allow an alternate route to bypass a closed gate", () => {
    expect(nextStep([4, 5], "right", true, false).blocked).toBe("gate");
    expect(nextStep([4, 5], "right", true, true).finished).toBe(true);
  });
  it("stops movement at trees and boundaries", () => {
    expect(nextStep([0, 0], "left", false, true).position).toEqual([0, 0]);
    expect(nextStep([1, 0], "down", false, true).blocked).toBe("obstacle");
    expect(lessons).toHaveLength(5);
  });
});
