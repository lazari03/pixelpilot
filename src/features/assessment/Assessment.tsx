"use client";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Level } from "@/domain/models";
import type { CourseRepository } from "@/features/course/repository";
import type { Attempt, Grade } from "@/features/course/types";
export default function Assessment({
  day,
  level,
  ready,
  repository,
  onSaved,
  onAdvance,
}: {
  day: number;
  level: Level;
  ready: boolean;
  repository: CourseRepository;
  onSaved: () => Promise<void>;
  onAdvance: () => void;
}) {
  const { locale, t } = useLocale();
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [grade, setGrade] = useState<Grade | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      setAttempt(await repository.startQuiz(day, level, locale));
      setAnswers({});
      setGrade(null);
    } catch {
      setError(t("saveError"));
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!attempt) return;
    if (attempt.questions.some((q) => answers[q.id] === undefined)) {
      setError(t("empty"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      setGrade(await repository.submitQuiz(attempt.id, answers));
      await onSaved();
    } catch {
      setError(t("saveError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card assessment">
      <h2>{day === 5 ? t("exam") : t("checkpoint")}</h2>
      <p>{day === 5 ? t("examIntro") : t("quizIntro")}</p>
      {!ready && <p className="feedback">{t("needPractice")}</p>}
      {!attempt ? (
        <button className="primary" onClick={start} disabled={!ready || busy}>
          {t("start")}
        </button>
      ) : (
        <>
          {attempt.questions.map((q, i) => (
            <fieldset key={q.id} disabled={!!grade || busy}>
              <legend>
                {i + 1}. {q.text}
              </legend>
              {q.options.map((option, index) => (
                <label className="answer" key={index}>
                  <input
                    name={q.id}
                    type="radio"
                    checked={answers[q.id] === index}
                    onChange={() => setAnswers({ ...answers, [q.id]: index })}
                  />
                  {option}
                </label>
              ))}
              {grade && (
                <p
                  className={`feedback ${grade.feedback.find((f) => f.id === q.id)?.correct ? "correct" : "incorrect"}`}
                >
                  {grade.feedback.find((f) => f.id === q.id)?.correct
                    ? "✓"
                    : "↻"}{" "}
                  {grade.feedback.find((f) => f.id === q.id)?.explanation}
                </p>
              )}
            </fieldset>
          ))}
          {!grade ? (
            <button className="primary" disabled={busy} onClick={submit}>
              {t("submit")}
            </button>
          ) : (
            <div className="grade" role="status">
              <h2>{grade.passed ? `🎉 ${t("passed")}` : t("notPassed")}</h2>
              <p>
                {t("score")}: {grade.score}%
              </p>
              <p>{t("review")}</p>
              {grade.passed && (
                <button className="primary" onClick={onAdvance}>
                  {t(day === 5 ? "leaderboard" : "nextChapter")} →
                </button>
              )}
              <button className="secondary" onClick={start} disabled={busy}>
                {t("retry")}
              </button>
            </div>
          )}
        </>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
