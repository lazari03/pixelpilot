import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Curriculum,
  LearningEvent,
  LearningRepository,
  Level,
} from "@/domain/models";
import lessons from "./course.json";
import knowledge from "./knowledge.json";
export const demoCurriculum: Curriculum = { lessons, knowledge };
/** Remote adapter: RLS is the authorization boundary; UI state is never trusted. */
export class SupabaseLearningRepository implements LearningRepository {
  constructor(private readonly client: SupabaseClient) {}
  async loadCurriculum(): Promise<Curriculum> {
    const [lessonsResult, knowledgeResult] = await Promise.all([
      this.client
        .from("lessons")
        .select("day,title,topic,icon,lesson,goal,prompt,rule")
        .order("day"),
      this.client
        .from("knowledge_entries")
        .select("id,title,keywords,explanation,example")
        .order("id"),
    ]);
    if (lessonsResult.error) throw lessonsResult.error;
    if (knowledgeResult.error) throw knowledgeResult.error;
    if (lessonsResult.data?.length !== 5 || !knowledgeResult.data?.length)
      throw new Error("Curriculum is not seeded.");
    return { lessons: lessonsResult.data, knowledge: knowledgeResult.data };
  }
  async loadProgress(userId: string) {
    const { data, error } = await this.client
      .from("progress")
      .select("day,level")
      .eq("user_id", userId)
      .eq("completed", true);
    if (error) throw error;
    return (data ?? []).map((row) => `${row.day}-${row.level}`);
  }
  async completeMission(userId: string, day: number, level: Level) {
    const { error } = await this.client.from("progress").upsert({
      user_id: userId,
      day,
      level,
      completed: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
  async recordEvent(userId: string, event: LearningEvent) {
    const { error } = await this.client.from("learning_events").insert({
      user_id: userId,
      lesson_day: event.lessonDay,
      intent: event.intent,
      knowledge_id: event.knowledgeId ?? null,
      action_type: event.actionType ?? null,
      feedback: event.feedback ?? null,
    });
    if (error) throw error;
  }
}
