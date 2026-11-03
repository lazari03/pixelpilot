import type { KnowledgeEntry } from "@pixelpilot/local-tutor";
export type Level = "Explorer" | "Builder" | "Inventor";
export interface Lesson {
  day: number;
  title: string;
  topic: string;
  icon: string;
  lesson: string;
  goal: string;
  prompt: string;
  rule: string;
}
export interface Curriculum {
  lessons: Lesson[];
  knowledge: KnowledgeEntry[];
}
export interface LearningEvent {
  lessonDay: number;
  intent: string;
  knowledgeId?: string;
  actionType?: string;
  feedback?: "fits" | "improve";
}
export interface LearningRepository {
  loadCurriculum(): Promise<Curriculum>;
  loadProgress(userId: string): Promise<string[]>;
  completeMission(userId: string, day: number, level: Level): Promise<void>;
  recordEvent(userId: string, event: LearningEvent): Promise<void>;
}
