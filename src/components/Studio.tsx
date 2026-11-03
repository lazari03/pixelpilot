"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BookOpen,
  Gamepad2,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  Check,
  Flag,
  KeyRound,
  Zap,
} from "lucide-react";
import { useAdventure } from "@/hooks/useAdventure";
import { useLearning } from "@/hooks/useLearning";
import PromptLab from "./PromptLab";
import { gateOpens, OBSTACLES } from "@/domain/game";
import type { Level } from "@/domain/models";

import { supabase } from "@/lib/supabase";

const Blocks = dynamic(() => import("./Blocks"), {
  ssr: false,
  loading: () => <p>Opening your toolbox…</p>,
});
export default function Studio() {
  const {
    curriculum,
    curriculumStatus,
    user,
    complete,
    saveStatus,
    finish,
    record,
  } = useLearning();
  const days = curriculum.lessons;
  const [day, setDay] = useState(0),
    [level, setLevel] = useState<Level>("Builder"),
    [tab, setTab] = useState("studio");
  const {
    position: pos,
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
  } = useAdventure({ day, level, onComplete: finish });
  const lesson = days[day];
  function selectDay(n: number) {
    reset();
    setDay(n);
    setNotice(days[n].goal);
  }
  return (
    <div className="app">
      <header>
        <Link href="/" className="brand">
          <span className="brand-icon">🤖</span>Creator<span>Lab</span>
          <sup>PILOT</sup>
        </Link>
        <nav>
          <button
            onClick={() => setTab("missions")}
            className={tab === "missions" ? "active" : ""}
          >
            <Flag size={18} />
            Missions
          </button>
          <button
            onClick={() => setTab("studio")}
            className={tab === "studio" ? "active" : ""}
          >
            <Gamepad2 size={19} />
            Build Studio
          </button>
          <button
            onClick={() => setTab("notebook")}
            className={tab === "notebook" ? "active" : ""}
          >
            <BookOpen size={18} />
            Prompt Notebook
          </button>
        </nav>
        <Link className="account" href="/login">
          {user ? "Classroom account" : "Teacher / student login"}{" "}
          <ArrowRight size={16} />
        </Link>
        {user && (
          <button
            onClick={async () => {
              await supabase?.auth.signOut();
              window.location.reload();
            }}
          >
            Sign out
          </button>
        )}
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">A LITTLE CODE. A LOT OF POSSIBILITY.</div>
            <h1>
              Big ideas start with <span>“what if?”</span>
            </h1>
            <p>
              Build an adventure. Test your thinking. Become a thoughtful AI
              explorer.
            </p>
          </div>
          <div className="progress-pill">
            <Trophy size={22} />
            <div>
              <strong>{complete.length} missions completed</strong>
              <small>Your next discovery is waiting.</small>
            </div>
          </div>
        </div>
        <div className="workspace">
          <aside>
            <div className="aside-title">YOUR FIVE-DAY ADVENTURE</div>
            {days.map((d, i) => (
              <button
                key={d.title}
                className={`day ${day === i ? "selected" : ""}`}
                onClick={() => selectDay(i)}
              >
                <span className="day-number">
                  {complete.some((c) => c.startsWith(`${i}-`)) ? (
                    <Check size={18} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  <strong>{d.title}</strong>
                  <small>{d.topic}</small>
                </span>
                {day === i && <span className="dot" />}
              </button>
            ))}
            <div className="challenge">
              <Sparkles size={24} />
              <h3>Make it your own.</h3>
              <p>
                {level === "Inventor"
                  ? "Invent a different route. Find two inputs that make your gate behave differently."
                  : level === "Builder"
                    ? "Build your own route using movement and repeat blocks."
                    : "Try five moves right, then five moves down. What could you repeat?"}
              </p>
              <span>CREATE · TEST · IMPROVE</span>
            </div>
            <p className="curriculum-status">{curriculumStatus}</p>
            <p className="small muted">{saveStatus}</p>
            <Link className="teacher-link" href="/teacher">
              Teacher guide ↗
            </Link>
          </aside>
          <section className="main-content">
            <div className="section-heading">
              <div>
                <span className="eyebrow">DAY {day + 1} / 05</span>
                <h2>{lesson.title}</h2>
              </div>
              <label className="level-label">
                Your challenge
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                >
                  <option>Explorer</option>
                  <option>Builder</option>
                  <option>Inventor</option>
                </select>
              </label>
            </div>
            {tab === "missions" ? (
              <div className="card lesson">
                <BookOpen />
                <h2>Learn it. Build it. Explain it.</h2>
                <p>{lesson.lesson}</p>
                <h3>Today’s mission</h3>
                <p>{lesson.goal}</p>
                <h3>60-minute classroom plan</h3>
                <p>
                  10 min discover · 10 min teacher demonstration · 25 min build
                  and test · 10 min prompt practice · 5 min explain your
                  discovery.
                </p>
                <button className="primary" onClick={() => setTab("studio")}>
                  Start building <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="lesson-strip">
                  <span>✦</span>
                  <p>{lesson.lesson}</p>
                </div>
                <div
                  className={`panels ${tab === "notebook" ? "notebook" : ""}`}
                >
                  {tab !== "notebook" && (
                    <>
                      <div className="card adventure">
                        <div className="card-heading">
                          <h3>
                            <Gamepad2 size={20} />
                            Your adventure
                          </h3>
                          <span className="tiny-badge">PLAYGROUND</span>
                        </div>
                        <p className="muted small">{lesson.goal}</p>
                        <div className="board" aria-label="Robot game board">
                          {Array.from({ length: 36 }, (_, i) => {
                            const x = i % 6,
                              y = Math.floor(i / 6),
                              wall = OBSTACLES.some(
                                ([a, b]) => a === x && b === y,
                              );
                            return (
                              <div
                                key={i}
                                className={`tile ${wall ? "tree" : ""} ${x === 5 && y === 5 ? "destination" : ""}`}
                              >
                                {pos[0] === x && pos[1] === y ? (
                                  <span className="bot" aria-label="robot">
                                    🤖
                                  </span>
                                ) : wall ? (
                                  "🌲"
                                ) : x === 5 && y === 5 ? (
                                  "⚑"
                                ) : x === 5 && y === 4 && day > 0 ? (
                                  "🚪"
                                ) : x === 2 && y === 3 ? (
                                  "✦"
                                ) : (
                                  ""
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="sensors">
                          <label>
                            <Zap size={16} /> Energy
                            <input
                              aria-label="Energy"
                              type="number"
                              min={0}
                              max={20}
                              value={energy}
                              onChange={(e) =>
                                setEnergy(Number(e.target.value))
                              }
                            />
                          </label>
                          <label>
                            <KeyRound size={16} /> Key
                            <input
                              aria-label="Has key"
                              type="checkbox"
                              checked={hasKey}
                              onChange={(e) => setHasKey(e.target.checked)}
                            />
                          </label>
                        </div>
                        <button className="secondary full" onClick={reset}>
                          <RotateCcw size={16} />
                          Reset adventure
                        </button>
                        <p className="feedback" role="status">
                          {notice}
                        </p>
                      </div>
                      <div className="card rules">
                        <div className="card-heading">
                          <h3>
                            <span className="code-icon">⌘</span>Code your route
                          </h3>
                          <span className="tiny-badge purple">BLOCKLY</span>
                        </div>
                        <p className="muted small">
                          Drag blocks from the toolbox and connect them.
                        </p>
                        <div className={running ? "running" : ""}>
                          <Blocks onRun={run} />
                        </div>
                        {day > 0 && (
                          <div className="logic">
                            <label>
                              Gate condition
                              <select
                                aria-label="Gate operator"
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                              >
                                <option>OR</option>
                                <option>AND</option>
                                <option>NOT</option>
                              </select>
                            </label>
                            <code>
                              {operator === "NOT"
                                ? "NOT has key"
                                : `has key ${operator} energy ≥ 8`}
                            </code>
                            <p className="small">
                              Current result:{" "}
                              <strong>
                                {gateOpens(hasKey, energy, operator)
                                  ? "TRUE · 1 · open"
                                  : "FALSE · 0 · closed"}
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <PromptLab
                    key={day}
                    knowledge={curriculum.knowledge}
                    day={day}
                    busy={running}
                    onAction={applyAction}
                    onRecord={record}
                  />
                </div>
              </>
            )}
            <div className="bottom-bar">
              <span>💡</span>
              <p>
                <strong>Curiosity is your superpower.</strong> Try something.
                Notice what happens. Change one thing.
              </p>
              <span className="bottom-day">DAY {day + 1} OF 5</span>
            </div>
          </section>
        </div>
      </main>
      <footer>
        PIXELPILOT · CREATOR LAB{" "}
        <span>Made for small classrooms and big imaginations.</span>
      </footer>
    </div>
  );
}
