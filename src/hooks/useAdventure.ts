"use client";
import { useEffect, useRef, useState } from "react";
import type { TutorAction } from "@pixelpilot/local-tutor";
import {
  gateOpens,
  nextStep,
  type Direction,
  type Position,
} from "@/domain/game";
import type { Level } from "@/domain/models";
interface Options {
  day: number;
  level: Level;
  onComplete: (day: number, level: Level) => Promise<void>;
}
export function useAdventure({ day, level, onComplete }: Options) {
  const [position, setPosition] = useState<Position>([0, 0]);
  const [energy, setEnergy] = useState(5);
  const [hasKey, setHasKey] = useState(true);
  const [operator, setOperator] = useState("OR");
  const [notice, setNotice] = useState(
    "Build a route to the flag. Every test teaches you something.",
  );
  const [running, setRunning] = useState(false);
  const runId = useRef(0);
  useEffect(
    () => () => {
      runId.current++;
    },
    [],
  );
  function reset() {
    runId.current++;
    setRunning(false);
    setPosition([0, 0]);
    setNotice("Fresh start. Try a new route.");
  }
  async function run(actions: Direction[], from: Position = [0, 0]) {
    const id = ++runId.current;
    setRunning(true);
    let current = from;
    setPosition(current);
    let success = false;
    for (const action of actions.slice(0, 60)) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      if (id !== runId.current) return;
      const step = nextStep(
        current,
        action,
        day > 0,
        gateOpens(hasKey, energy, operator),
      );
      if (step.blocked) {
        setNotice(
          step.blocked === "gate"
            ? "The gate stayed closed. Check your logic and sensor values."
            : "An obstacle! Reset your plan and try another route.",
        );
        setRunning(false);
        return;
      }
      current = step.position;
      setPosition(current);
      if (step.finished) {
        success = true;
        break;
      }
    }
    if (id !== runId.current) return;
    setRunning(false);
    setNotice(
      success
        ? "You reached the beacon! Explain your solution to a classmate."
        : actions.length
          ? "Not at the flag yet. Add a step or change your route."
          : "Add movement blocks, then run again.",
    );
    if (success) await onComplete(day, level);
  }
  function applyAction(action: TutorAction) {
    if (running) return;
    switch (action.type) {
      case "reset":
        reset();
        break;
      case "gate":
        setOperator(action.operator);
        setNotice(`Gate rule changed to ${action.operator}. Test its inputs.`);
        break;
      case "move":
        void run(
          Array.from({ length: action.steps }, () => action.direction),
          position,
        );
        break;
    }
  }
  return {
    position,
    energy,
    setEnergy,
    hasKey,
    setHasKey,
    operator,
    setOperator,
    notice,
    setNotice,
    running,
    reset,
    run,
    applyAction,
  };
}
