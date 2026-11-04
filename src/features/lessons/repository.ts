import type { SupabaseClient } from "@supabase/supabase-js";
import type { Program } from "@/domain/program";
import type {
  TeacherLesson,
  TeachingClass,
  LessonContent,
  PublishedLesson,
} from "./types";
export class LessonRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw error;
    return data as T;
  }
  async progress(id: string) {
    const rows = await this.rpc<unknown>("teacher_lesson_progress", {
      p_id: id,
    });
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row) =>
          typeof row.nickname !== "string" ||
          typeof row.completed !== "boolean",
      )
    )
      throw Error("Unexpected progress response");
    return rows as { nickname: string; completed: boolean }[];
  }
  role() {
    return this.rpc<string>("current_app_role");
  }
  classes() {
    return this.rpc<TeachingClass[]>("teacher_classes");
  }
  lessons() {
    return this.rpc<TeacherLesson[]>("teacher_lessons");
  }
  save(
    lesson: {
      id: string | null;
      class_id: string;
      day: number;
      content: LessonContent;
      revision: number | null;
    },
    publish: boolean,
    proof: Program | null,
  ) {
    return this.rpc<TeacherLesson>("teacher_save_lesson", {
      p_id: lesson.id,
      p_class: lesson.class_id,
      p_day: lesson.day,
      p_content: lesson.content,
      p_revision: lesson.revision,
      p_publish: publish,
      p_proof: proof,
    });
  }
  unpublish(id: string) {
    return this.rpc<void>("teacher_unpublish_lesson", { p_id: id });
  }
  delete(id: string) {
    return this.rpc<void>("teacher_delete_draft", { p_id: id });
  }
  async published() {
    const { data, error } = await this.client
      .from("class_lesson_publications")
      .select("*")
      .order("published_at");
    if (error) throw error;
    return data as PublishedLesson[];
  }
  async marks() {
    const { data, error } = await this.client
      .from("class_lesson_marks")
      .select("lesson_id,revision");
    if (error) throw error;
    return data as { lesson_id: string; revision: number }[];
  }
  submit(id: string, revision: number, program: Program) {
    return this.rpc<boolean>("class_submit_program", {
      p_id: id,
      p_revision: revision,
      p_program: program,
    });
  }
}
