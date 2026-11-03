import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredPrompt } from "@pixelpilot/local-tutor";
import type { Program } from "@/domain/program";
import type { Locale } from "@/i18n/messages";
import type { Level } from "@/domain/models";
import type { Attempt, CourseState, Grade, Ranking } from "./types";
export class CourseRepository {
  constructor(private readonly client: SupabaseClient) {}
  async load(): Promise<CourseState> {
    const tables = [
      "course_chapters",
      "course_challenges",
      "course_reads",
      "course_marks",
      "course_prompts",
      "course_results",
    ] as const;
    const rows = await Promise.all(
      tables.map((table) => this.client.from(table).select("*")),
    );
    for (const row of rows) if (row.error) throw row.error;
    if (rows[0].data?.length !== 5 || rows[1].data?.length !== 47)
      throw Error("migration");
    return {
      chapters: rows[0]
        .data!.map((r) => r.content)
        .sort((a, b) => a.day - b.day),
      challenges: rows[1].data!.map((r) => r.content),
      reads: rows[2].data!.map((r) => r.unit_id),
      marks: rows[3].data!.map((r) => r.challenge_id),
      prompts: rows[4].data!.map((r) => r.day),
      results: rows[5].data!,
    };
  }
  private async rpc<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw error;
    return data as T;
  }
  read(unit: string) {
    return this.rpc<void>("course_read", { p_unit: unit });
  }
  submitProgram(id: string, program: Program) {
    return this.rpc<boolean>("course_submit_program", {
      p_id: id,
      p_program: program,
    });
  }
  submitPrompt(day: number, prompt: StructuredPrompt) {
    return this.rpc<boolean>("course_submit_prompt", {
      p_day: day,
      p_goal: prompt.goal,
      p_context: prompt.context,
      p_rules: prompt.rules,
      p_format: prompt.format,
    });
  }
  startQuiz(day: number, level: Level, locale: Locale) {
    return this.rpc<Attempt>("course_quiz_start", {
      p_day: day,
      p_level: level,
      p_locale: locale,
    });
  }
  submitQuiz(attempt: string, answers: Record<string, number>) {
    return this.rpc<Grade>("course_quiz_submit", {
      p_attempt: attempt,
      p_answers: answers,
    });
  }
  leaderboard() {
    return this.rpc<Ranking[]>("course_leaderboard");
  }
}
