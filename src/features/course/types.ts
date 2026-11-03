import type { Locale } from "@/i18n/messages";
import type { Challenge } from "@/domain/program";
export type Translated = Record<Locale, string>;
export interface Unit {
  activities: Translated[];
  id: string;
  minutes: number;
  title: Translated;
  body: Translated;
  example: Translated;
  predict: Translated;
}
export interface Chapter {
  day: number;
  title: Translated;
  units: Unit[];
}
export interface CourseResult {
  day: number;
  level: string;
  score: number;
  passed: boolean;
}
export interface CourseState {
  chapters: Chapter[];
  challenges: Challenge[];
  reads: string[];
  marks: string[];
  prompts: number[];
  results: CourseResult[];
}
export interface Question {
  id: string;
  text: string;
  options: string[];
}
export interface Attempt {
  id: string;
  questions: Question[];
}
export interface Grade {
  score: number;
  passed: boolean;
  feedback: { id: string; correct: boolean; explanation: string }[];
}
export interface Ranking {
  classroom: string;
  nickname: string;
  points: number;
}
