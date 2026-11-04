import type { Translated } from "@/features/course/types";
import type { Challenge } from "@/domain/program";
export type Mission = Pick<
  Challenge,
  "goal" | "walls" | "required" | "maxNodes" | "gate" | "energy" | "signal"
> & { theme: "nebula" | "moon" | "solar" };
export interface LessonContent {
  title: Translated;
  body: Translated;
  example: Translated;
  activities: Translated[];
  mission: Mission;
}
export interface TeacherLesson {
  id: string;
  class_id: string;
  day: number;
  content: LessonContent;
  revision: number;
  published_revision: number | null;
}
export interface PublishedLesson {
  lesson_id: string;
  class_id: string;
  day: number;
  content: LessonContent;
  revision: number;
}
export interface TeachingClass {
  id: string;
  name: string;
}
export function lessonChallenge(lesson: {
  day: number;
  content: LessonContent;
  id?: string;
  lesson_id?: string;
}): Challenge {
  return {
    ...lesson.content.mission,
    id: lesson.id ?? lesson.lesson_id ?? "preview",
    day: lesson.day,
    title: lesson.content.title,
    level: "Builder",
    slot: 0,
    exam: false,
  };
}
