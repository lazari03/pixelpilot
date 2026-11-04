"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Save, Send, Rocket, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLocale, LanguagePicker } from "@/i18n/LocaleProvider";
import { LessonRepository } from "@/features/lessons/repository";
import {
  lessonChallenge,
  type LessonContent,
  type TeacherLesson,
  type TeachingClass,
} from "@/features/lessons/types";
import { CourseRepository } from "@/features/course/repository";
import type { Program } from "@/domain/program";
import chapters from "@/data/chapters.json";
import challenges from "@/data/challenges.json";
import CodingWorkspace from "./CodingWorkspace";
const blank = (): LessonContent => ({
  title: { en: "My space mission", sq: "Misioni im në hapësirë" },
  body: {
    en: "Help the ship reach the station. Give it one small instruction at a time.",
    sq: "Ndihmo anijen të arrijë te stacioni. Jepi nga një udhëzim të vogël.",
  },
  example: {
    en: "Move right two spaces. Then move down once.",
    sq: "Lëviz dy vende djathtas. Pastaj një herë poshtë.",
  },
  activities: [
    { en: "Find the ship and the station.", sq: "Gjej anijen dhe stacionin." },
    { en: "Draw the route with your finger.", sq: "Trego rrugën me gisht." },
    {
      en: "Build your instructions and try them.",
      sq: "Ndërto udhëzimet dhe provoji.",
    },
  ],
  mission: {
    goal: [2, 1],
    walls: [[1, 1]],
    required: ["move"],
    maxNodes: 24,
    gate: false,
    energy: 5,
    signal: "green",
    theme: "nebula",
  },
});
export default function TeacherStudio() {
  const { locale, t } = useLocale();
  const repository = useMemo(
      () => (supabase ? new LessonRepository(supabase) : null),
      [],
    ),
    courseRepo = useMemo(
      () => (supabase ? new CourseRepository(supabase) : null),
      [],
    );
  const [classProgress, setClassProgress] = useState<
    { nickname: string; completed: boolean }[]
  >([]);
  const [role, setRole] = useState<string | null>(null),
    [classes, setClasses] = useState<TeachingClass[]>([]),
    [lessons, setLessons] = useState<TeacherLesson[]>([]),
    [content, setContent] = useState<LessonContent>(blank),
    [classId, setClassId] = useState(""),
    [day, setDay] = useState(0),
    [id, setId] = useState<string | null>(null),
    [revision, setRevision] = useState<number | null>(null),
    [publishedRevision, setPublishedRevision] = useState<number | null>(null),
    [proof, setProof] = useState<Program | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [preview, setPreview] = useState(false),
    [mapTool, setMapTool] = useState<"wall" | "goal">("wall");
  async function load() {
    if (!repository) return;
    try {
      const role = await repository.role();
      setRole(role);
      if (!["teacher", "superadmin"].includes(role)) return;
      const [classes, lessons] = await Promise.all([
        repository.classes(),
        repository.lessons(),
      ]);
      setClasses(classes);
      setLessons(lessons);
      setClassId((old) => old || classes[0]?.id || "");
    } catch {
      setStatus(t("customLoadError"));
    }
  }
  useEffect(() => {
    void load();
  }, [repository]);
  async function loadProgress() {
    if (!id || publishedRevision === null || !repository) {
      setClassProgress([]);
      return;
    }
    try {
      setClassProgress(await repository.progress(id));
    } catch {
      setClassProgress([]);
    }
  }
  useEffect(() => {
    void loadProgress();
  }, [id, publishedRevision, repository]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function change(next: LessonContent) {
    setContent(next);
    setDirty(true);
    setProof(null);
  }
  function mayLeave() {
    return !dirty || window.confirm(t("unsavedChanges"));
  }
  function fresh() {
    if (!mayLeave()) return;
    setId(null);
    setRevision(null);
    setPublishedRevision(null);
    setContent(blank());
    setDay(0);
    setProof(null);
    setDirty(false);
    setPreview(false);
    setStatus("");
  }
  function edit(lesson: TeacherLesson) {
    if (!mayLeave()) return;
    setId(lesson.id);
    setRevision(lesson.revision);
    setPublishedRevision(lesson.published_revision);
    setContent(structuredClone(lesson.content));
    setDay(lesson.day);
    setClassId(lesson.class_id);
    setProof(null);
    setDirty(false);
    setPreview(false);
    setStatus("");
  }
  function starter(value: string) {
    if (!value) return;
    const [d, u] = value.split("-").map(Number);
    const unit = chapters[d].units[u];
    const challenge = challenges.find(
      (c) => c.day === d && c.level === "Explorer" && c.slot === u,
    )!;
    change({
      title: { ...unit.title },
      body: { ...unit.body },
      example: { ...unit.example },
      activities: structuredClone(unit.activities),
      mission: {
        goal: challenge.goal,
        walls: challenge.walls,
        required: challenge.required,
        maxNodes: challenge.maxNodes,
        gate: challenge.gate,
        energy: challenge.energy,
        signal: challenge.signal,
        theme: "nebula",
      },
    });
    setDay(d);
  }
  function mapClick(x: number, y: number) {
    if (x === 0 && y === 0) return;
    if (mapTool === "goal") {
      change({
        ...content,
        mission: {
          ...content.mission,
          goal: [x, y],
          walls: content.mission.walls.filter(([a, b]) => a !== x || b !== y),
        },
      });
    } else {
      if (content.mission.goal[0] === x && content.mission.goal[1] === y)
        return;
      const exists = content.mission.walls.some(([a, b]) => a === x && b === y);
      change({
        ...content,
        mission: {
          ...content.mission,
          walls: exists
            ? content.mission.walls.filter(([a, b]) => a !== x || b !== y)
            : [...content.mission.walls, [x, y]],
        },
      });
    }
  }
  async function save(publish: boolean) {
    if (!repository || !classId) return;
    setBusy(true);
    try {
      const saved = await repository.save(
        { id, class_id: classId, day, content, revision },
        publish,
        proof,
      );
      setId(saved.id);
      setRevision(saved.revision);
      setPublishedRevision(saved.published_revision);
      setDirty(false);
      setStatus(t(publish ? "lessonPublished" : "lessonSaved"));
      await load();
    } catch (error) {
      const message = (error as { message?: string }).message ?? "";
      setStatus(
        t(
          message.includes("lesson changed")
            ? "editorConflict"
            : message.includes("test the mission")
              ? "testBeforePublish"
              : "lessonValidation",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function unpublish() {
    if (!repository || !id) return;
    setBusy(true);
    try {
      await repository.unpublish(id);
      setPublishedRevision(null);
      setStatus(t("lessonSaved"));
      await load();
    } catch {
      setStatus(t("saveError"));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!id || !repository || !window.confirm(t("deleteConfirm"))) return;
    try {
      await repository.delete(id);
      setDirty(false);
      setId(null);
      setRevision(null);
      setContent(blank());
      setPublishedRevision(null);
      setPreview(false);
      await load();
    } catch {
      setStatus(t("saveError"));
    }
  }
  if (role === null)
    return (
      <main className="login-wrap">
        <section className="card login">
          <LanguagePicker />
          <p role="status">{status || t("loading")}</p>
          <Link href="/">{t("viewCourse")}</Link>
        </section>
      </main>
    );
  if (role && role !== "teacher" && role !== "superadmin")
    return (
      <main>
        <Link href="/">← {t("viewCourse")}</Link>
        <section className="card lesson">
          <h1>{t("teacherOnly")}</h1>
        </section>
      </main>
    );
  return (
    <div className="teacher-app">
      <header>
        <Link className="brand" href="/">
          <Rocket size={25} /> PixelPilot
        </Link>
        <LanguagePicker />
        <Link href="/">{t("viewCourse")} →</Link>
      </header>
      <main className="teacher-shell">
        <div className="teacher-heading">
          <div>
            <div className="eyebrow">{t("lessonFormat")}</div>
            <h1>{t("teacherStudio")}</h1>
            <p>{t("editorIntro")}</p>
          </div>
          <button className="primary" onClick={fresh}>
            <Plus size={17} />
            {t("newLesson")}
          </button>
        </div>
        {!role && <p>{t("loading")}</p>}
        {role && classes.length === 0 && (
          <p className="feedback">{t("noTeacherClasses")}</p>
        )}
        <div className="teacher-layout">
          <aside className="teacher-library">
            <h3>
              <BookOpen size={17} />
              {t("myLessons")}
            </h3>
            {lessons.map((lesson) => (
              <button
                className={id === lesson.id ? "selected" : ""}
                key={lesson.id}
                onClick={() => edit(lesson)}
              >
                <strong>{lesson.content.title[locale]}</strong>
                <small>
                  {classes.find((c) => c.id === lesson.class_id)?.name} ·{" "}
                  {lesson.published_revision === lesson.revision
                    ? t("published")
                    : t("draft")}
                </small>
              </button>
            ))}
            <p className="small muted">{t("ownerClassHelp")}</p>
          </aside>
          <section>
            <div className="card teacher-editor">
              <div className="editor-meta">
                <label>
                  {t("classChoice")}
                  <select
                    value={classId}
                    disabled={!!id}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("day")}
                  <select
                    value={day}
                    onChange={(e) => {
                      setDay(Number(e.target.value));
                      setDirty(true);
                      setProof(null);
                    }}
                  >
                    {chapters.map((c) => (
                      <option key={c.day} value={c.day}>
                        {c.day + 1}. {c.title[locale]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("starterLesson")}
                  <select value="" onChange={(e) => starter(e.target.value)}>
                    <option value="">—</option>
                    {chapters.flatMap((c) =>
                      c.units.map((u, i) => (
                        <option key={u.id} value={`${c.day}-${i}`}>
                          {c.day + 1}.{i + 1} {u.title[locale]}
                        </option>
                      )),
                    )}
                  </select>
                </label>
              </div>
              <p className="editor-language">
                {locale === "sq"
                  ? "Po ndryshon tekstin shqip. Ndërro gjuhën lart për anglishten."
                  : "Editing English text. Switch the language above to edit Albanian."}
              </p>
              {(["title", "body", "example"] as const).map((field) => (
                <label key={field}>
                  {t(
                    field === "title"
                      ? "lessonTitle"
                      : field === "body"
                        ? "shortExplanation"
                        : "workedExample",
                  )}
                  {field === "title" ? (
                    <input
                      maxLength={100}
                      value={content[field][locale]}
                      onChange={(e) =>
                        change({
                          ...content,
                          [field]: {
                            ...content[field],
                            [locale]: e.target.value,
                          },
                        })
                      }
                    />
                  ) : (
                    <textarea
                      rows={field === "body" ? 4 : 2}
                      maxLength={2000}
                      value={content[field][locale]}
                      onChange={(e) =>
                        change({
                          ...content,
                          [field]: {
                            ...content[field],
                            [locale]: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </label>
              ))}
              <h3>{t("lessonTasks")}</h3>
              {content.activities.map((activity, i) => (
                <label key={i}>
                  {i + 1}
                  <input
                    maxLength={500}
                    value={activity[locale]}
                    onChange={(e) =>
                      change({
                        ...content,
                        activities: content.activities.map((old, n) =>
                          n === i ? { ...old, [locale]: e.target.value } : old,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <div className="mission-editor">
                <div>
                  <h3>{t("missionBuilder")}</h3>
                  <p className="small muted">{t("mapHelp")}</p>
                  <div className="map-tools">
                    <button
                      className={mapTool === "wall" ? "active" : ""}
                      onClick={() => setMapTool("wall")}
                    >
                      {t("wallTool")}
                    </button>
                    <button
                      className={mapTool === "goal" ? "active" : ""}
                      onClick={() => setMapTool("goal")}
                    >
                      {t("goalTool")}
                    </button>
                    <button
                      onClick={() =>
                        change({
                          ...content,
                          mission: { ...content.mission, walls: [] },
                        })
                      }
                    >
                      {t("clearMap")}
                    </button>
                  </div>
                  <div className="map-editor">
                    {Array.from({ length: 36 }, (_, i) => {
                      const x = i % 6,
                        y = Math.floor(i / 6);
                      return (
                        <button
                          key={i}
                          aria-label={`${String.fromCharCode(65 + x)}${y + 1}`}
                          className={
                            content.mission.walls.some(
                              ([a, b]) => a === x && b === y,
                            )
                              ? "rock"
                              : content.mission.goal[0] === x &&
                                  content.mission.goal[1] === y
                                ? "station"
                                : ""
                          }
                          disabled={x === 0 && y === 0}
                          onClick={() => mapClick(x, y)}
                        >
                          {x === 0 && y === 0
                            ? "S"
                            : content.mission.goal[0] === x &&
                                content.mission.goal[1] === y
                              ? "◎"
                              : content.mission.walls.some(
                                    ([a, b]) => a === x && b === y,
                                  )
                                ? "●"
                                : "·"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label>
                    {t("theme")}
                    <select
                      value={content.mission.theme}
                      onChange={(e) =>
                        change({
                          ...content,
                          mission: {
                            ...content.mission,
                            theme: e.target.value as "nebula",
                          },
                        })
                      }
                    >
                      {(["nebula", "moon", "solar"] as const).map((theme) => (
                        <option key={theme} value={theme}>
                          {t(theme)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("startEnergy")}
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={content.mission.energy}
                      onChange={(e) =>
                        change({
                          ...content,
                          mission: {
                            ...content.mission,
                            energy: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    {t("blockBudget")}
                    <input
                      type="number"
                      min={4}
                      max={64}
                      value={content.mission.maxNodes}
                      onChange={(e) =>
                        change({
                          ...content,
                          mission: {
                            ...content.mission,
                            maxNodes: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={content.mission.gate}
                      onChange={(e) =>
                        change({
                          ...content,
                          mission: {
                            ...content.mission,
                            gate: e.target.checked,
                          },
                        })
                      }
                    />
                    {t("stationGateInfo")}
                  </label>
                  <fieldset>
                    <legend>{t("requirements")}</legend>
                    {[
                      "move",
                      "charge",
                      "repeat",
                      "if",
                      "switch",
                      "while",
                      "doWhile",
                      "call",
                    ].map((tool) => (
                      <label className="check-label" key={tool}>
                        <input
                          type="checkbox"
                          checked={content.mission.required.includes(tool)}
                          onChange={(e) =>
                            change({
                              ...content,
                              mission: {
                                ...content.mission,
                                required: e.target.checked
                                  ? [...content.mission.required, tool]
                                  : content.mission.required.filter(
                                      (old) => old !== tool,
                                    ),
                              },
                            })
                          }
                        />
                        {t(tool as "move")}
                      </label>
                    ))}
                  </fieldset>
                </div>
              </div>
              <div className="editor-actions">
                <button
                  className="secondary"
                  disabled={busy || !classId}
                  onClick={() => void save(false)}
                >
                  <Save size={16} />
                  {t("saveDraft")}
                </button>
                <button
                  className="secondary"
                  onClick={() => setPreview(!preview)}
                >
                  <Rocket size={16} />
                  {t("lessonPreview")}
                </button>
                <button
                  className="primary"
                  disabled={busy || !classId || !proof}
                  onClick={() => void save(true)}
                >
                  <Send size={16} />
                  {t("publishLesson")}
                </button>
                {publishedRevision !== null && (
                  <button disabled={busy} onClick={unpublish}>
                    {t("unpublishLesson")}
                  </button>
                )}
                {id && publishedRevision === null && (
                  <button onClick={remove}>{t("deleteDraft")}</button>
                )}
              </div>
              <p role="status">{status}</p>
              {publishedRevision !== null &&
                (dirty || publishedRevision !== revision) && (
                  <p className="feedback">{t("draftNotice")}</p>
                )}
              {!proof && (
                <p className="small muted">
                  {locale === "sq"
                    ? "Provoje misionin dhe arrij te stacioni për të hapur publikimin."
                    : "Test your mission and reach the station to unlock publishing."}
                </p>
              )}
            </div>
            {publishedRevision !== null && (
              <section className="card teacher-class-progress">
                <h3>{t("classProgress")}</h3>
                <button className="secondary" onClick={loadProgress}>
                  {t("refreshProgress")}
                </button>
                <table>
                  <thead>
                    <tr>
                      <th>{t("nickname")}</th>
                      <th>{t("complete")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classProgress.map((row) => (
                      <tr key={row.nickname}>
                        <td>{row.nickname}</td>
                        <td>{row.completed ? "✓" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {preview && courseRepo && (
              <div className="teacher-preview">
                <p>{t("previewNotSaved")}</p>
                <CodingWorkspace
                  key={JSON.stringify(content.mission)}
                  challenge={lessonChallenge({ day, content })}
                  repository={courseRepo}
                  onSaved={async () => {}}
                  tutorAction={null}
                  preview
                  theme={content.mission.theme}
                  onPreviewSuccess={setProof}
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
