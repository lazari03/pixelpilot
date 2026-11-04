import { afterEach, describe, expect, it, vi } from "vitest";
import { Playback } from "../src/domain/playback";
afterEach(() => vi.useRealTimers());
describe("flight playback controls", () => {
  it("pauses, steps and resumes without losing the next action", async () => {
    vi.useFakeTimers();
    const frames: number[] = [];
    const player = new Playback<number>((frame) => frames.push(frame));
    const result = player.play([0, 1, 2, 3]);
    player.pause();
    vi.advanceTimersByTime(2000);
    expect(frames).toEqual([0]);
    player.step();
    expect(frames).toEqual([0, 1]);
    expect(player.paused).toBe(true);
    player.resume();
    await vi.runAllTimersAsync();
    expect(frames).toEqual([0, 1, 2, 3]);
    expect(await result).toBe(true);
  });
  it("finishes a final single-step and cancels pending runs when stopped or replayed", async () => {
    vi.useFakeTimers();
    const player = new Playback<number>(() => {});
    const first = player.play([0, 1]);
    player.pause();
    player.step();
    expect(await first).toBe(true);
    expect(player.active).toBe(false);
    const interrupted = player.play([0, 1, 2]);
    const replay = player.play([0, 1]);
    expect(await interrupted).toBe(false);
    player.stop();
    expect(await replay).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
