"use client";
import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Condition, Instruction, Program } from "@/domain/program";
import type { Direction } from "@/domain/game";
export default function Blocks({
  onRun,
  disabled = false,
}: {
  onRun: (program: Program) => void;
  disabled?: boolean;
}) {
  const { locale, t } = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const saved = useRef<object | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const statement = { previousStatement: null, nextStatement: null };
    const conditions = [
      ["energyLow", "energyLow"],
      ["energyReady", "energyReady"],
      ["hasKey", "hasKey"],
      ["AND", "AND"],
      ["OR", "OR"],
      ["NOT", "NOT"],
      [locale === "sq" ? "jo te flamuri" : "not at beacon", "notAtGoal"],
    ].map(([label, value]) => [
      label in { energyLow: 1, energyReady: 1, hasKey: 1 }
        ? t(label as "energyLow")
        : label,
      value,
    ]);
    const body = { type: "input_statement", name: "DO" };
    const otherwise = { type: "input_statement", name: "ELSE" };
    const defs = [
      {
        type: "robot_move",
        message0: `${t("move")} %1`,
        args0: [
          {
            type: "field_dropdown",
            name: "DIR",
            options: ["right", "down", "left", "up"].map((d) => [
              t(d as Direction),
              d,
            ]),
          },
        ],
        ...statement,
        colour: 170,
      },
      { type: "robot_charge", message0: t("charge"), ...statement, colour: 45 },
      {
        type: "robot_energy",
        message0: `${t("setEnergy")} %1`,
        args0: [
          {
            type: "field_number",
            name: "VALUE",
            value: 5,
            min: 0,
            max: 20,
            precision: 1,
          },
        ],
        ...statement,
        colour: 45,
      },
      {
        type: "robot_key",
        message0: `${t("setKey")} %1`,
        args0: [
          {
            type: "field_dropdown",
            name: "VALUE",
            options: [
              [t("true"), "true"],
              [t("false"), "false"],
            ],
          },
        ],
        ...statement,
        colour: 45,
      },
      {
        type: "robot_signal",
        message0: `${t("setSignal")} %1`,
        args0: [
          {
            type: "field_dropdown",
            name: "VALUE",
            options: [
              [t("green"), "green"],
              [t("red"), "red"],
            ],
          },
        ],
        ...statement,
        colour: 45,
      },
      {
        type: "robot_repeat",
        message0: `${t("repeat")} %1`,
        args0: [
          {
            type: "field_number",
            name: "COUNT",
            value: 3,
            min: 0,
            max: 20,
            precision: 1,
          },
        ],
        message1: `${t("then")} %1`,
        args1: [body],
        ...statement,
        colour: 265,
      },
      {
        type: "robot_if",
        message0: `${t("if")} %1`,
        args0: [{ type: "field_dropdown", name: "COND", options: conditions }],
        message1: `${t("then")} %1`,
        args1: [body],
        message2: `${t("else")} %1`,
        args2: [otherwise],
        ...statement,
        colour: 215,
      },
      ...[
        ["robot_while", "while"],
        ["robot_do", "doWhile"],
      ].map(([type, label]) => ({
        type,
        message0: `${t(label as "while")} %1`,
        args0: [{ type: "field_dropdown", name: "COND", options: conditions }],
        message1: `${t("then")} %1`,
        args1: [body],
        ...statement,
        colour: 285,
      })),
      {
        type: "robot_switch",
        message0: t("switch"),
        message1: `${t("green")} %1`,
        args1: [body],
        message2: `${t("red")} / ${t("default")} %1`,
        args2: [otherwise],
        ...statement,
        colour: 215,
      },
      {
        type: "robot_tool",
        message0: t("define"),
        message1: `${t("then")} %1`,
        args1: [body],
        colour: 325,
      },
      { type: "robot_call", message0: t("call"), ...statement, colour: 325 },
    ];
    for (const def of defs) delete Blockly.Blocks[def.type];
    Blockly.defineBlocksWithJsonArray(defs);
    const ws = Blockly.inject(host.current, {
      media: "/blockly/",
      toolbox: {
        kind: "categoryToolbox",
        contents: [
          { name: t("move"), colour: 170, types: ["robot_move"] },
          {
            name: t("energy"),
            colour: 45,
            types: [
              "robot_charge",
              "robot_energy",
              "robot_key",
              "robot_signal",
            ],
          },
          {
            name: t("chooseBlocks"),
            colour: 215,
            types: ["robot_if", "robot_switch"],
          },
          {
            name: t("repeat"),
            colour: 285,
            types: ["robot_repeat", "robot_while", "robot_do"],
          },
          {
            name: t("shortcuts"),
            colour: 325,
            types: ["robot_tool", "robot_call"],
          },
        ].map((group) => ({
          kind: "category",
          name: group.name,
          colour: group.colour,
          contents: group.types.map((type) => ({ kind: "block", type })),
        })),
      },
      horizontalLayout: window.innerWidth < 800,
      scrollbars: true,
      trashcan: true,
      renderer: "zelos",
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.85,
        minScale: 0.4,
        maxScale: 1.5,
      },
    });
    workspace.current = ws;
    if (saved.current) Blockly.serialization.workspaces.load(saved.current, ws);
    else {
      const block = ws.newBlock("robot_move");
      block.initSvg();
      block.render();
      block.moveBy(25, 35);
    }
    const observer = new ResizeObserver(() => Blockly.svgResize(ws));
    observer.observe(host.current);
    return () => {
      saved.current = Blockly.serialization.workspaces.save(ws);
      observer.disconnect();
      ws.dispose();
    };
  }, [locale]);
  function compile(): Program {
    let budget = 150;
    function read(block: Blockly.Block | null, depth = 0): Instruction[] {
      const nodes: Instruction[] = [];
      while (block && budget-- > 0 && depth < 8) {
        const body = () => read(block!.getInputTargetBlock("DO"), depth + 1);
        const condition = block.getFieldValue("COND") as Condition;
        switch (block.type) {
          case "robot_energy":
            nodes.push({
              type: "setEnergy",
              value: Number(block.getFieldValue("VALUE")),
            });
            break;
          case "robot_key":
            nodes.push({
              type: "setKey",
              value: block.getFieldValue("VALUE") === "true",
            });
            break;
          case "robot_signal":
            nodes.push({
              type: "setSignal",
              value: block.getFieldValue("VALUE") as "green" | "red",
            });
            break;
          case "robot_move":
            nodes.push({
              type: "move",
              direction: block.getFieldValue("DIR") as Direction,
            });
            break;
          case "robot_charge":
            nodes.push({ type: "charge" });
            break;
          case "robot_repeat":
            nodes.push({
              type: "repeat",
              count: Number(block.getFieldValue("COUNT")),
              body: body(),
            });
            break;
          case "robot_if":
            nodes.push({
              type: "if",
              condition,
              body: body(),
              otherwise: read(block.getInputTargetBlock("ELSE"), depth + 1),
            });
            break;
          case "robot_switch":
            nodes.push({
              type: "switch",
              body: body(),
              otherwise: read(block.getInputTargetBlock("ELSE"), depth + 1),
            });
            break;
          case "robot_while":
          case "robot_do":
            nodes.push({
              type: block.type === "robot_do" ? "doWhile" : "while",
              condition,
              body: body(),
            });
            break;
          case "robot_call":
            nodes.push({ type: "call" });
            break;
        }
        block = block.getNextBlock();
      }
      return nodes;
    }
    const top = workspace.current?.getTopBlocks(true) ?? [];
    return {
      body: top.filter((b) => b.type !== "robot_tool").flatMap((b) => read(b)),
      tool: read(
        top.find((b) => b.type === "robot_tool")?.getInputTargetBlock("DO") ??
          null,
      ),
    };
  }
  return (
    <>
      <div className="block-workspace" ref={host} />
      <button
        className="primary full run-button"
        disabled={disabled}
        onClick={() => onRun(compile())}
      >
        ▶ {t("run")}
      </button>
    </>
  );
}
