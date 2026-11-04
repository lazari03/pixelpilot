"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import {
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Square,
  StepForward,
  Rocket,
} from "lucide-react";
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
import RocketScene from "./RocketScene";
import { Playback } from "@/domain/playback";
const Blocks = dynamic(() => import("./Blocks"), { ssr: false });
export default function CodingWorkspace({
  challenge,
  repository,
  onSaved,
  tutorAction,
  preview = false,
  theme = "nebula",
  submit,
  onPreviewSuccess,
}: {
  challenge: Challenge;
  repository: CourseRepository;
  onSaved: () => Promise<void>;
  tutorAction: { action: TutorAction; id: number } | null;
  preview?: boolean;
  theme?: string;
  submit?: (program: Program) => Promise<boolean>;
  onPreviewSuccess?: (program: Program) => void;
}) {
  const { locale, t } = useLocale();
  const initial = () => ({
    x: 0,
    y: 0,
    energy: challenge.energy,
    key: true,
    signal: challenge.signal,
  });
  const [frame, setFrame] = useState<Frame>(initial),
    [busy, setBusy] = useState(false),
    [paused, setPaused] = useState(false),
    [status, setStatus] = useState(""),
    [arrived, setArrived] = useState(false),
    [blocked, setBlocked] = useState(false),
    [speed, setSpeed] = useState(400),
    [progress, setProgress] = useState([0, 0]),
    [expanded, setExpanded] = useState(false);
  const version = useRef(0),
    lastProgram = useRef<Program | null>(null),
    panel = useRef<HTMLDivElement>(null);
  const player = useRef<Playback<Frame> | null>(null);
  if (!player.current)
    player.current = new Playback((next, index, total) => {
      setFrame(next);
      setProgress([index, total]);
    });
  useEffect(
    () => () => {
      version.current++;
      player.current?.stop();
    },
    [],
  );
  useEffect(() => {
    player.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    function changed() {
      if (!document.fullscreenElement) setExpanded(false);
    }
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  function stop() {
    version.current++;
    player.current?.stop();
    setPaused(false);
    setBusy(false);
    setStatus(t("flightStopped"));
  }
  function reset() {
    stop();
    setFrame(initial());
    setStatus("");
    setArrived(false);
    setBlocked(false);
    setProgress([0, 0]);
  }
  function togglePause() {
    const playback = player.current!;
    if (playback.paused) playback.resume();
    else playback.pause();
    setPaused(playback.paused);
  }
  async function run(program: Program) {
    const id = ++version.current;
    lastProgram.current = program;
    setBusy(true);
    setArrived(false);
    setBlocked(false);
    player.current?.stop();
    setPaused(false);
    setStatus(t("inFlight"));
    const result = execute(program, challenge);
    setProgress([0, result.frames.length - 1]);
    const completed = await player.current!.play(result.frames);
    if (!completed || id !== version.current) return;
    setBlocked(result.reason === "blocked");
    setArrived(result.finished);
    setStatus(t(result.reason === "success" ? "success" : result.reason));
    if (meetsChallenge(result, challenge)) {
      if (preview) {
        setStatus(t("previewPassed"));
        onPreviewSuccess?.(program);
      } else
        try {
          const accepted = await (submit
            ? submit(program)
            : repository.submitProgram(challenge.id, program));
          if (id !== version.current) return;
          setStatus(t(accepted ? "saved" : "notSaved"));
          if (accepted) await onSaved();
        } catch {
          if (id === version.current) setStatus(t("saveError"));
        }
    } else if (result.finished) setStatus(t("notSaved"));
    if (id === version.current) {
      setBusy(false);
      setPaused(false);
      player.current?.stop();
    }
  }
  useEffect(() => {
    if (!tutorAction) return;
    const action = tutorAction.action;
    if (action.type === "reset") reset();
    if (action.type === "move")
      void run({
        body: Array.from({ length: action.steps }, () => ({
          type: "move",
          direction: action.direction,
        })),
        tool: [],
      });
  }, [tutorAction]);
  async function fullscreen() {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setExpanded(false);
    } else {
      setExpanded(true);
      try {
        await panel.current?.requestFullscreen();
      } catch {
        /* Expanded layout remains available when fullscreen is unsupported. */
      }
    }
  }
  return (
    <div
      className={`flight-workspace ${expanded ? "flight-expanded" : ""}`}
      ref={panel}
      style={{ "--flight-speed": `${speed}ms` } as CSSProperties}
    >
      <section className="mission-stage">
        <div className="stage-toolbar">
          <div>
            <div className="eyebrow">
              {preview ? t("teacherPreview") : t("flightDeck")}
            </div>
            <h2>{challenge.title[locale]}</h2>
          </div>
          <button
            className="stage-icon"
            onClick={fullscreen}
            aria-label={t(expanded ? "exitFullScreen" : "fullScreen")}
          >
            <Maximize2 size={19} />
          </button>
        </div>
        <RocketScene
          challenge={challenge}
          frame={frame}
          running={busy}
          paused={paused}
          arrived={arrived}
          blocked={blocked}
          theme={theme}
        />
        <div className="flight-hud">
          <div>
            <span>{t("energy")}</span>
            <strong>
              {frame.energy}
              <small>/20</small>
            </strong>
            <meter min={0} max={20} value={frame.energy} />
          </div>
          <div>
            <span>{t("key")}</span>
            <strong>{t(frame.key === false ? "false" : "true")}</strong>
          </div>
          <div>
            <span>{t("actions")}</span>
            <strong>
              {progress[0]}
              <small>/{progress[1]}</small>
            </strong>
          </div>
          <div>
            <span>{t("destination")}</span>
            <strong>
              {String.fromCharCode(65 + challenge.goal[0])}
              {challenge.goal[1] + 1}
            </strong>
          </div>
        </div>
        <div className="flight-controls">
          <button disabled={!busy} onClick={togglePause}>
            {paused ? <Play size={17} /> : <Pause size={17} />}{" "}
            {t(paused ? "resumeFlight" : "pauseFlight")}
          </button>
          <button
            disabled={!busy || !paused}
            onClick={() => {
              player.current?.step();
              setPaused(player.current?.paused ?? false);
            }}
            aria-label={t("oneStep")}
          >
            <StepForward size={18} />
          </button>
          <button disabled={!busy} onClick={stop} aria-label={t("stop")}>
            <Square size={16} />
          </button>
          <button
            disabled={busy || !lastProgram.current}
            onClick={() => lastProgram.current && void run(lastProgram.current)}
          >
            {t("replay")}
          </button>
          <button onClick={reset} aria-label={t("reset")}>
            <RotateCcw size={18} />
          </button>
          <label>
            {t("flightSpeed")}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={700}>{t("slow")}</option>
              <option value={400}>{t("normal")}</option>
              <option value={180}>{t("fast")}</option>
            </select>
          </label>
        </div>
        <p
          className={`flight-status ${blocked ? "warning" : ""}`}
          role="status"
        >
          {status || t("rocketHelp")}
        </p>
        {challenge.gate && <p className="flight-tip">{t("stationGateInfo")}</p>}
      </section>
      <section className="card coding-primary">
        <div className="coding-title">
          <Rocket size={30} />
          <div>
            <div className="eyebrow">{t("commandCentre")}</div>
            <h2>{t("build")}</h2>
          </div>
        </div>
        <p>{t("codeHelp")}</p>
        <div className="requirements">
          <strong>{t("requirements")}: </strong>
          {challenge.required
            .map((tool) => t(tool as "move"))
            .join(" + ")} · {locale === "sq" ? "Deri në" : "Up to"}{" "}
          {challenge.maxNodes} {t("blocksLabel")}
        </div>
        <Blocks onRun={run} disabled={busy} />
        <button
          className="flight-hint"
          onClick={() => setStatus(t("hintText"))}
        >
          {t("hint")}
        </button>
      </section>
    </div>
  );
}
