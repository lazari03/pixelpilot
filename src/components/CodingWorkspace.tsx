"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  execute,
  meetsChallenge,
  type Challenge,
  type Frame,
  type Program,
} from "@/domain/program";
import { useLocale } from "@/i18n/LocaleProvider";
import type { CourseRepository } from "@/features/course/repository";
import type { TutorAction } from "@pixelpilot/local-tutor";
const Blocks = dynamic(() => import("./Blocks"), { ssr: false });
export default function CodingWorkspace({
  challenge,
  repository,
  onSaved,
  tutorAction,
}: {
  challenge: Challenge;
  repository: CourseRepository;
  onSaved: () => Promise<void>;
  tutorAction: { action: TutorAction; id: number } | null;
}) {
  const { locale, t } = useLocale();
  const [frame, setFrame] = useState<Frame>({
      x: 0,
      y: 0,
      energy: challenge.energy,
    }),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [celebrate, setCelebrate] = useState(false);
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  function reset() {
    version.current++;
    setBusy(false);
    setFrame({ x: 0, y: 0, energy: challenge.energy });
    setStatus("");
    setCelebrate(false);
  }
  async function run(program: Program) {
    const id = ++version.current;
    setBusy(true);
    setCelebrate(false);
    const result = execute(program, challenge);
    for (const next of result.frames) {
      if (id !== version.current) return;
      setFrame(next);
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    if (id !== version.current) return;
    setStatus(t(result.reason === "success" ? "success" : result.reason));
    if (meetsChallenge(result, challenge)) {
      try {
        const verified = await repository.submitProgram(challenge.id, program);
        if (id !== version.current) return;
        setStatus(t(verified ? "saved" : "notSaved"));
        setCelebrate(verified);
        if (verified) await onSaved();
      } catch {
        setStatus(t("saveError"));
      }
    } else if (result.finished) setStatus(t("notSaved"));
    setBusy(false);
  }
  useEffect(() => {
    if (!tutorAction) return;
    const action = tutorAction.action;
    if (action.type === "reset") {
      reset();
      return;
    }
    if (action.type === "move")
      void run({
        body: Array.from({ length: action.steps }, () => ({
          type: "move",
          direction: action.direction,
        })),
        tool: [],
      });
    if (action.type === "gate")
      setStatus(`${t("gate")}: ${action.operator}. ${t("energyReady")}`);
  }, [tutorAction]);
  return (
    <div className="coding-layout">
      <section className="card coding-primary">
        <div className="coding-title">
          <span>⌘</span>
          <div>
            <div className="eyebrow">BLOCKLY · {t("practice")}</div>
            <h2>{t("build")}</h2>
          </div>
        </div>
        <p>{t("codeHelp")}</p>
        <div className="requirements">
          <strong>{t("requirements")}: </strong>
          {challenge.required
            .map((tool) => t(tool === "call" ? "call" : (tool as "move")))
            .join(" + ")}{" "}
          · {locale === "sq" ? "Maksimumi" : "Maximum"} {challenge.maxNodes}{" "}
          {locale === "sq" ? "blloqe" : "blocks"}
        </div>
        <Blocks onRun={run} disabled={busy} />
      </section>
      <section className={`card live-game ${celebrate ? "celebrating" : ""}`}>
        <div className="eyebrow">
          {t("challenge")} {challenge.slot + 1}
        </div>
        <h2>{challenge.title[locale]}</h2>
        <div className="board animated-board" aria-label={t("goal")}>
          {Array.from({ length: 36 }, (_, i) => {
            const x = i % 6,
              y = Math.floor(i / 6);
            return (
              <div
                key={i}
                className={`tile ${challenge.walls.some(([a, b]) => a === x && b === y) ? "tree" : ""}`}
              >
                {challenge.walls.some(([a, b]) => a === x && b === y)
                  ? "🌲"
                  : x === challenge.goal[0] && y === challenge.goal[1]
                    ? "⚑"
                    : ""}
              </div>
            );
          })}
          <div
            className="moving-robot"
            aria-label="robot"
            style={{
              left: `${(frame.x / 6) * 100}%`,
              top: `${(frame.y / 6) * 100}%`,
            }}
          >
            🤖
          </div>
          {celebrate && (
            <div className="confetti" aria-hidden="true">
              ✦ ✧ ★ ✦ ✧
            </div>
          )}
        </div>
        <div className="sensors">
          <strong>
            ϟ {t("energy")}: {frame.energy}
          </strong>
          <span>
            {t("signal")}:{" "}
            {t(
              (frame.signal ?? challenge.signal) === "green" ? "green" : "red",
            )}
          </span>
        </div>
        {challenge.gate && (
          <p className="gate-state">
            {frame.energy >= 8 && frame.key !== false ? "🔓" : "🔒"}{" "}
            {t("energyReady")}
          </p>
        )}
        <button className="secondary full" onClick={reset}>
          ↻ {t("reset")}
        </button>
        <p className="feedback" role="status">
          {status || t("hintText")}
        </p>
        <button onClick={() => setStatus(t("hintText"))}>{t("hint")} 💡</button>
      </section>
    </div>
  );
}
