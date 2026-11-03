"use client";
import { useState } from "react";
import Link from "next/link";
import { LanguagePicker, useLocale } from "@/i18n/LocaleProvider";
import { useCourse } from "@/features/course/useCourse";
import type { Level } from "@/domain/models";
import { supabase } from "@/lib/supabase";
import CodingWorkspace from "./CodingWorkspace";
import PromptLab from "./PromptLab";
import Assessment from "@/features/assessment/Assessment";
import type { Ranking } from "@/features/course/types";
import type { TutorAction } from "@pixelpilot/local-tutor";
type Tab = "learn" | "build" | "prompt" | "quiz" | "leaderboard";
export default function Studio() {
  const { locale, t } = useLocale();
  const { state, error, repository, refresh } = useCourse();
  const [activityChecks, setActivityChecks] = useState<Record<string, boolean>>(
    {},
  );
  const [day, setDay] = useState(0),
    [level, setLevel] = useState<Level>("Explorer"),
    [tab, setTab] = useState<Tab>("learn"),
    [unit, setUnit] = useState(0),
    [slot, setSlot] = useState(0),
    [message, setMessage] = useState(""),
    [ranks, setRanks] = useState<Ranking[]>([]),
    [rankLoaded, setRankLoaded] = useState(false),
    [action, setAction] = useState<{ action: TutorAction; id: number } | null>(
      null,
    );
  if (!state || !repository)
    return (
      <main className="login-wrap">
        <section className="card login">
          <h1>🤖 {t("brand")}</h1>
          <p role="status">{t(error ? "migration" : "loading")}</p>
          <button className="primary" onClick={refresh}>
            {t("continue")}
          </button>
          <button
            onClick={async () => {
              await supabase?.auth.signOut();
              window.location.assign("/login");
            }}
          >
            {t("signout")}
          </button>
          <LanguagePicker />
        </section>
      </main>
    );
  const passed = (d: number) =>
    state.results.some((result) => result.day === d && result.passed);
  const unlocked = (d: number) =>
    Array.from({ length: d }, (_, i) => i).every(passed);
  const chapter = state.chapters[day];
  const challenges = state.challenges
    .filter((c) => c.day === day && (day === 5 || c.level === level))
    .sort((a, b) => a.slot - b.slot);
  const selected = challenges[slot] ?? challenges[0];
  const ready =
    challenges.every((c) => state.marks.includes(c.id)) &&
    state.prompts.includes(day) &&
    (day === 5 || chapter.units.every((u) => state.reads.includes(u.id)));
  async function showLeaderboard() {
    setTab("leaderboard");
    setRankLoaded(false);
    try {
      setRanks(await repository!.leaderboard());
      setRankLoaded(true);
    } catch {
      setMessage(t("saveError"));
    }
  }
  function chooseDay(next: number) {
    setDay(next);
    setUnit(0);
    setSlot(0);
    setTab(next === 5 ? "build" : "learn");
    setAction(null);
    setMessage("");
  }
  async function markRead(id: string) {
    try {
      await repository!.read(id);
      await refresh();
      setMessage("");
    } catch {
      setMessage(t("saveError"));
    }
  }
  return (
    <div className="app">
      <header>
        <Link className="brand" href="/">
          🤖 <span>{t("brand")}</span>
        </Link>
        <LanguagePicker />
        <button
          className="secondary"
          onClick={async () => {
            await supabase?.auth.signOut();
            window.location.assign("/login");
          }}
        >
          {t("signout")}
        </button>
      </header>
      <main className="course-shell">
        <div className="intro">
          <div>
            <div className="eyebrow">PIXELPILOT · {t("course")}</div>
            <h1>{t("welcome")}</h1>
            <p>{t("tagline")}</p>
          </div>
          <div className="progress-pill">
            🏆{" "}
            {
              state.results
                .filter((r) => r.passed && r.day < 5)
                .map((r) => r.day)
                .filter((v, i, a) => a.indexOf(v) === i).length
            }
            /5 {t("complete")}
          </div>
        </div>
        <div className="workspace">
          <aside>
            <div className="aside-title">{t("course")}</div>
            {state.chapters.map((c) => (
              <button
                key={c.day}
                className={`day ${day === c.day ? "selected" : ""}`}
                disabled={!unlocked(c.day)}
                title={!unlocked(c.day) ? t("locked") : ""}
                onClick={() => chooseDay(c.day)}
              >
                <span className="day-number">
                  {passed(c.day) ? "✓" : unlocked(c.day) ? c.day + 1 : "🔒"}
                </span>
                <span>
                  <strong>{c.title[locale]}</strong>
                  <small>{t("minutes")}</small>
                </span>
              </button>
            ))}
            <button
              className={`day ${day === 5 ? "selected" : ""}`}
              disabled={!unlocked(5)}
              onClick={() => chooseDay(5)}
            >
              <span>🎓</span>
              <strong>{t("exam")}</strong>
            </button>
            <button className="day" onClick={showLeaderboard}>
              🏆 {t("leaderboard")}
            </button>
            <Link className="teacher-link" href="/teacher">
              {locale === "sq" ? "Udhëzuesi i mësuesit" : "Teacher guide"} ↗
            </Link>
          </aside>
          <section className="main-content">
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  {day === 5 ? t("exam") : `${t("day")} ${day + 1} / 5`}
                </div>
                <h2>{day === 5 ? t("exam") : chapter.title[locale]}</h2>
              </div>
              {day < 5 && (
                <label className="level-label">
                  {t("level")}
                  <select
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value as Level);
                      setSlot(0);
                      setAction(null);
                    }}
                  >
                    {(["Explorer", "Builder", "Inventor"] as Level[]).map(
                      (l) => (
                        <option value={l} key={l}>
                          {t(l)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}
            </div>
            <nav className="course-tabs">
              {(day === 5
                ? ["build", "prompt", "quiz"]
                : ["learn", "build", "prompt", "quiz"]
              ).map((key) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                  onClick={() => setTab(key as Tab)}
                >
                  {t(key as "build")}
                </button>
              ))}
            </nav>
            {tab === "learn" && day < 5 && (
              <section className="card lesson lesson-expanded">
                <div className="unit-tabs">
                  {chapter.units.map((u, i) => (
                    <button
                      key={u.id}
                      className={unit === i ? "active" : ""}
                      onClick={() => setUnit(i)}
                    >
                      {state.reads.includes(u.id) ? "✓ " : ""}
                      {i + 1}. {u.title[locale]} <small>{u.minutes} min</small>
                    </button>
                  ))}
                </div>
                <div className="lesson-hero">
                  {["🧭", "⚡", "🚦", "🔁", "🚀"][day]}
                </div>
                <div className="eyebrow">
                  {t("study")} · {chapter.units[unit].minutes} min
                </div>
                <h2>{chapter.units[unit].title[locale]}</h2>
                <p>{chapter.units[unit].body[locale]}</p>
                <blockquote>{chapter.units[unit].example[locale]}</blockquote>
                <h3>{t("predict")}</h3>
                <p>{chapter.units[unit].predict[locale]}</p>
                <p className="muted">{t("compare")}</p>
                <div className="lesson-activities">
                  <h3>{t("practice")}</h3>
                  {chapter.units[unit].activities.map((activity, index) => (
                    <label className="check-label" key={index}>
                      <input
                        type="checkbox"
                        checked={
                          state.reads.includes(chapter.units[unit].id) ||
                          !!activityChecks[`${chapter.units[unit].id}-${index}`]
                        }
                        onChange={(e) =>
                          setActivityChecks({
                            ...activityChecks,
                            [`${chapter.units[unit].id}-${index}`]:
                              e.target.checked,
                          })
                        }
                      />
                      {activity[locale]}
                    </label>
                  ))}
                </div>
                <button
                  className="primary"
                  disabled={
                    !state.reads.includes(chapter.units[unit].id) &&
                    !chapter.units[unit].activities.every(
                      (_, i) =>
                        activityChecks[`${chapter.units[unit].id}-${i}`],
                    )
                  }
                  onClick={async () => {
                    await markRead(chapter.units[unit].id);
                  }}
                >
                  {state.reads.includes(chapter.units[unit].id)
                    ? `✓ ${t("complete")}`
                    : t("read")}
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    unit < 2 ? setUnit(unit + 1) : setTab("build")
                  }
                >
                  {unit < 2 ? t("next") : t("build")} →
                </button>
                <div className="lesson-plan">
                  <strong>60 min</strong> · 25{" "}
                  {locale === "sq"
                    ? "mësim dhe ushtrime"
                    : "learn and guided practice"}{" "}
                  · 20 {t("build")} · 10 {t("quiz")} · 5{" "}
                  {locale === "sq" ? "reflektim" : "reflection"}
                </div>
              </section>
            )}
            {tab === "build" && (
              <>
                <div className="challenge-selector">
                  {challenges.map((c, i) => (
                    <button
                      key={c.id}
                      className={slot === i ? "active" : ""}
                      onClick={() => {
                        setSlot(i);
                        setAction(null);
                      }}
                    >
                      {state.marks.includes(c.id) ? "✓ " : ""}
                      {day === 5 ? t("examTask") : t("challenge")} {i + 1}
                    </button>
                  ))}
                </div>
                <CodingWorkspace
                  key={selected.id}
                  challenge={selected}
                  repository={repository}
                  onSaved={refresh}
                  tutorAction={action}
                />
                <div className="card extension">
                  <strong>+60 min · {t("optional")}</strong>
                  <p>{t("extensions")}</p>
                  <p>{t("reflection")}</p>
                </div>
              </>
            )}
            {tab === "prompt" && (
              <PromptLab
                key={`${day}-${locale}`}
                day={day}
                learned={state.reads.includes("0-2")}
                repository={repository}
                onSaved={refresh}
                onAction={(next) => {
                  setAction({ action: next, id: Date.now() });
                  setTab("build");
                }}
              />
            )}
            {tab === "quiz" && (
              <Assessment
                key={`${day}-${level}-${locale}`}
                day={day}
                level={day === 5 ? "Builder" : level}
                ready={ready}
                repository={repository}
                onSaved={refresh}
                onAdvance={() =>
                  day === 5 ? void showLeaderboard() : chooseDay(day + 1)
                }
              />
            )}
            {tab === "leaderboard" && (
              <section className="card leaderboard">
                <h2>🏆 {t("leaderboard")}</h2>
                <p>{t("leaderboardHelp")}</p>
                {!rankLoaded ? (
                  <p>{t("loading")}</p>
                ) : !ranks.length ? (
                  <p>{t("noClass")}</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>{t("classroom")}</th>
                        <th>{t("rank")}</th>
                        <th>{t("nickname")}</th>
                        <th>{t("points")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranks.map((r, i) => (
                        <tr key={`${r.classroom}-${r.nickname}`}>
                          <td>{r.classroom}</td>
                          <td>
                            {ranks.filter(
                              (other, j) =>
                                j < i && other.classroom === r.classroom,
                            ).length + 1}
                          </td>
                          <td>{r.nickname}</td>
                          <td>{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {passed(5) && (
                  <h2 className="graduate">🎓 {t("certificate")}</h2>
                )}
              </section>
            )}
            <p role="alert">{message}</p>
          </section>
        </div>
      </main>
      <footer>
        PIXELPILOT · {t("brand")}
        <span>Shqip / English</span>
      </footer>
    </div>
  );
}
