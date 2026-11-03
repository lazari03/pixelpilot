"use client";
import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
export type { Direction as Action } from "@/domain/game";
import type { Direction as Action } from "@/domain/game";
export default function Blocks({
  onRun,
}: {
  onRun: (actions: Action[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const callback = useRef(onRun);
  callback.current = onRun;
  useEffect(() => {
    if (!host.current) return;
    if (!Blockly.Blocks.robot_move)
      Blockly.defineBlocksWithJsonArray([
        {
          type: "robot_move",
          message0: "move %1",
          args0: [
            {
              type: "field_dropdown",
              name: "DIR",
              options: [
                ["right →", "right"],
                ["down ↓", "down"],
                ["left ←", "left"],
                ["up ↑", "up"],
              ],
            },
          ],
          previousStatement: null,
          nextStatement: null,
          colour: 174,
        },
      ]);
    const ws = Blockly.inject(host.current, {
      toolbox: {
        kind: "flyoutToolbox",
        contents: [
          { kind: "block", type: "robot_move" },
          {
            kind: "block",
            type: "controls_repeat_ext",
            inputs: {
              TIMES: { shadow: { type: "math_number", fields: { NUM: 2 } } },
            },
          },
        ],
      },
      scrollbars: true,
      trashcan: true,
      renderer: "zelos",
    });
    workspace.current = ws;
    const first = ws.newBlock("robot_move");
    first.initSvg();
    first.render();
    first.moveBy(20, 30);
    const resize = new ResizeObserver(() => Blockly.svgResize(ws));
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      ws.dispose();
    };
  }, []);
  function run() {
    const actions: Action[] = [];
    let budget = 100;
    function walk(block: Blockly.Block | null) {
      while (block && budget-- > 0) {
        if (block.type === "robot_move")
          actions.push(block.getFieldValue("DIR"));
        if (block.type === "controls_repeat_ext") {
          const n = Number(
            block.getInputTargetBlock("TIMES")?.getFieldValue("NUM") ?? 0,
          );
          for (let i = 0; i < Math.min(20, Math.max(0, n)); i++)
            walk(block.getInputTargetBlock("DO"));
        }
        block = block.getNextBlock();
      }
    }
    workspace.current?.getTopBlocks(true).forEach(walk);
    callback.current(actions.slice(0, 60));
  }
  return (
    <>
      <div ref={host} className="block-workspace" />
      <button className="primary full" onClick={run}>
        ▶ Run my blocks
      </button>
      <p className="muted small">
        Connect movement blocks. Repeat runs its inner blocks up to 20 times. No
        arbitrary code is executed.
      </p>
    </>
  );
}
