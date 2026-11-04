"use client";
import { useEffect, useMemo, useState } from "react";
import { Rocket, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LessonRepository } from "@/features/lessons/repository";
import {
  lessonChallenge,
  type PublishedLesson,
} from "@/features/lessons/types";
import type { CourseRepository } from "@/features/course/repository";
import { useLocale } from "@/i18n/LocaleProvider";
import CodingWorkspace from "./CodingWorkspace";
export default function ClassMissions({
  courseRepository,
  unlocked,
}: {
  courseRepository: CourseRepository;
  unlocked: (day: number) => boolean;
}) {
  const { locale, t } = useLocale();
  const repository = useMemo(
    () => (supabase ? new LessonRepository(supabase) : null),
    [],
  );
  const [lessons, setLessons] = useState<PublishedLesson[]>([]),
    [marks, setMarks] = useState<{ lesson_id: string; revision: number }[]>([]),
    [selected, setSelected] = useState<PublishedLesson | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true),
    [role, setRole] = useState("student");
  async function refresh() {
    if (!repository) return;
    try {
      const [lessons, marks, role] = await Promise.all([
        repository.published(),
        repository.marks(),
        repository.role(),
      ]);
      setLessons(lessons);
      setMarks(marks);
      setRole(role);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [repository]);
  if (loading) return <p>{t("loading")}</p>;
  if (error)
    return (
      <p role="alert" className="feedback">
        {t("customLoadError")}
      </p>
    );
  if (selected && repository) {
    const preview = role === "teacher" || role === "superadmin";
    return (
      <section>
        <button className="secondary" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} />
          {t("myLessons")}
        </button>
        <div className="card custom-brief">
          <div className="eyebrow">{t("customMission")}</div>
          <h2>{selected.content.title[locale]}</h2>
          <p>{selected.content.body[locale]}</p>
          <blockquote>{selected.content.example[locale]}</blockquote>
          <ol>
            {selected.content.activities.map((activity, i) => (
              <li key={i}>{activity[locale]}</li>
            ))}
          </ol>
        </div>
        <CodingWorkspace
          key={`${selected.lesson_id}-${selected.revision}`}
          challenge={lessonChallenge(selected)}
          repository={courseRepository}
          onSaved={refresh}
          tutorAction={null}
          preview={preview}
          theme={selected.content.mission.theme}
          submit={(program) =>
            repository.submit(selected.lesson_id, selected.revision, program)
          }
        />
      </section>
    );
  }
  return (
    <section>
      <h2>{t("myLessons")}</h2>
      {lessons.length === 0 ? (
        <div className="card empty-missions">
          <Rocket size={42} />
          <p>{t("noCustomLessons")}</p>
        </div>
      ) : (
        <div className="mission-cards">
          {lessons.map((lesson) => (
            <article className="card mission-card" key={lesson.lesson_id}>
              <div
                className={`mini-space theme-${lesson.content.mission.theme}`}
              >
                <Rocket size={40} />
              </div>
              <div className="eyebrow">
                {t("day")} {lesson.day + 1}
              </div>
              <h3>{lesson.content.title[locale]}</h3>
              <p>{lesson.content.body[locale].slice(0, 150)}</p>
              {marks.some(
                (mark) =>
                  mark.lesson_id === lesson.lesson_id &&
                  mark.revision === lesson.revision,
              ) && (
                <p className="mission-done">
                  <CheckCircle2 size={16} />
                  {t("customComplete")}
                </p>
              )}
              <button
                className="primary"
                disabled={!unlocked(lesson.day) && role === "student"}
                onClick={() => setSelected(lesson)}
              >
                {unlocked(lesson.day) || role !== "student"
                  ? t("openMission")
                  : t("locked")}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
