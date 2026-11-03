import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it, expect } from "vitest";
const studentA = "11111111-1111-1111-1111-111111111111";
const studentB = "22222222-2222-2222-2222-222222222222";
let db: PGlite;
async function asStudent(id: string, sql: string) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}';`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role;");
  }
}
beforeAll(async () => {
  db = new PGlite();
  // Minimal Supabase auth contract for PostgreSQL RLS tests; no network project needed.
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values ('${studentA}'),('${studentB}');`,
  );
  for (const file of ["setup.sql", "setup.sql"]) {
    try {
      await db.exec(readFileSync(`supabase/${file}`, "utf8"));
    } catch (error) {
      console.error(file, (error as { message: string }).message);
      throw error;
    }
  }
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("database migrations and RLS", () => {
  it("seeds lessons and knowledge repeatably", async () => {
    const result = await db.query(
      "select count(*)::int as count from public.lessons",
    );
    expect(result.rows).toEqual([{ count: 5 }]);
    const knowledge = await db.query(
      "select count(*)::int as count from public.knowledge_entries",
    );
    expect(knowledge.rows).toEqual([{ count: 14 }]);
  });
  it("allows public curriculum reads but rejects curriculum writes", async () => {
    await db.exec("set role anon");
    try {
      expect(
        (await db.query("select * from public.lessons")).rows,
      ).toHaveLength(5);
      await expect(
        db.exec("update public.lessons set title='Changed' where day=0"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
  it("isolates progress between students and rejects impersonation", async () => {
    await asStudent(
      studentA,
      `insert into public.progress(user_id,day,level,completed) values ('${studentA}',0,'Builder',true)`,
    );
    expect(
      (await asStudent(studentB, "select * from public.progress")).rows,
    ).toHaveLength(0);
    await expect(
      asStudent(
        studentB,
        `insert into public.progress(user_id,day,level) values ('${studentA}',1,'Builder')`,
      ),
    ).rejects.toThrow();
    expect(
      (await asStudent(studentA, "select * from public.progress")).rows,
    ).toHaveLength(1);
  });
  it("isolates learning events and prevents cross-student writes", async () => {
    await asStudent(
      studentA,
      `insert into public.learning_events(user_id,lesson_day,intent,knowledge_id) values ('${studentA}',0,'explain','loop')`,
    );
    expect(
      (await asStudent(studentB, "select * from public.learning_events")).rows,
    ).toHaveLength(0);
    await expect(
      asStudent(
        studentB,
        `insert into public.learning_events(user_id,lesson_day,intent) values ('${studentA}',0,'hint')`,
      ),
    ).rejects.toThrow();
    expect(
      (await asStudent(studentA, "select * from public.learning_events")).rows,
    ).toHaveLength(1);
  });
  it("denies anonymous student data access", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.progress")).rejects.toThrow();
      await expect(
        db.query("select * from public.learning_events"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("course assessment security", () => {
  it("denies anonymous chapter reads and direct answer access", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from course_chapters")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
    await expect(
      asStudent(studentA, "select * from course_questions"),
    ).rejects.toThrow();
    await expect(
      asStudent(
        studentA,
        `insert into course_results values ('${studentA}',4,'Explorer',100,true)`,
      ),
    ).rejects.toThrow();
  });
  it("blocks locked chapters and prompt shortcuts", async () => {
    await expect(
      asStudent(studentA, "select course_read('1-0')"),
    ).rejects.toThrow();
    await expect(
      asStudent(studentA, "select course_quiz_start(5,'Builder','en')"),
    ).rejects.toThrow();
    const result = await asStudent(
      studentA,
      "select course_submit_prompt(0,'do it','','','') as accepted",
    );
    expect(result.rows).toEqual([{ accepted: false }]);
  });
  it("provides translated questions without answer keys", async () => {
    const result = await asStudent(
      studentA,
      "select course_quiz_start(0,'Explorer','sq') as attempt",
    );
    const attempt = (
      result.rows[0] as {
        attempt: {
          id: string;
          questions: { id: string; text: string; options: string[] }[];
        };
      }
    ).attempt;
    expect(attempt.questions).toHaveLength(5);
    expect(
      attempt.questions.every(
        (q) =>
          typeof q.text === "string" &&
          q.options.length === 3 &&
          !("answer" in q),
      ),
    ).toBe(true);
  });
  it("verifies all 47 challenge programs in PostgreSQL and matches the browser engine", async () => {
    const { default: challenges } = await import("../src/data/challenges.json");
    // Unlock later chapters as the admin fixture, not through a student write.
    for (let day = 0; day < 5; day++)
      await db.exec(
        `insert into course_results values ('${studentA}',${day},'Builder',100,true) on conflict do nothing`,
      );
    const { solution } = await import("./helpers/solutions");
    for (const challenge of challenges) {
      const program = solution(challenge);
      const result = await asStudent(
        studentA,
        `select course_submit_program('${challenge.id}','${JSON.stringify(program)}'::jsonb) as accepted`,
      );
      expect(result.rows, challenge.id).toEqual([{ accepted: true }]);
    }
  }, 30000);
  it("requires practical work, a structured prompt and lessons before passing a quiz", async () => {
    const result = await asStudent(
      studentB,
      "select course_quiz_start(0,'Explorer','en') as attempt",
    );
    const a = (
      result.rows[0] as { attempt: { id: string; questions: { id: string }[] } }
    ).attempt;
    const keys = await db.query<{ id: string; answer: number }>(
      `select id,answer from course_questions where day=0`,
    );
    const answers = Object.fromEntries(
      a.questions.map((q) => [
        q.id,
        keys.rows.find((k) => k.id === q.id)!.answer,
      ]),
    );
    const grade = await asStudent(
      studentB,
      `select course_quiz_submit('${a.id}','${JSON.stringify(answers)}'::jsonb) as grade`,
    );
    expect(
      (grade.rows[0] as { grade: { score: number; passed: boolean } }).grade,
    ).toMatchObject({ score: 100, passed: false });
    await expect(
      asStudent(
        studentB,
        `select course_quiz_submit('${a.id}','${JSON.stringify(answers)}'::jsonb)`,
      ),
    ).rejects.toThrow();
  });
  it("stores structured-prompt success without retaining raw text", async () => {
    await asStudent(studentA, "select course_read('0-2')");
    const good = await asStudent(
      studentA,
      "select course_submit_prompt(0,'lëviz djathtas 3 hapa','Roboti nis nga këndi lart','Shmang pemët dhe trego planin','plan veprimi') as accepted",
    );
    expect(good.rows).toEqual([{ accepted: true }]);
    expect(
      (await asStudent(studentB, "select * from course_prompts")).rows,
    ).toHaveLength(0);
  });
  it("only shares rankings within enrolled classrooms", async () => {
    const classA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      classB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await db.exec(
      `insert into classrooms values ('${classA}','Class A'),('${classB}','Class B');insert into class_members values ('${classA}','${studentA}','Robot A'),('${classB}','${studentB}','Robot B');`,
    );
    const rows = await asStudent(
      studentA,
      "select course_leaderboard() as ranks",
    );
    const ranks = (rows.rows[0] as { ranks: { nickname: string }[] }).ranks;
    expect(ranks.map((r) => r.nickname)).toEqual(["Robot A"]);
    await expect(
      asStudent(studentB, `update class_members set class_id='${classA}'`),
    ).rejects.toThrow();
  });
});

describe("complete one-week progression", () => {
  it("grades all five chapters, then a bilingual final exam with required practicals", async () => {
    const { default: challenges } = await import("../src/data/challenges.json");
    const { solution } = await import("./helpers/solutions");
    async function perfectQuiz(day: number, locale = "en") {
      const started = await asStudent(
        studentB,
        `select course_quiz_start(${day},'Explorer','${locale}') as attempt`,
      );
      const attempt = (
        started.rows[0] as {
          attempt: { id: string; questions: { id: string }[] };
        }
      ).attempt;
      const keys = await db.query<{ id: string; answer: number }>(
        "select id,answer from course_questions",
      );
      const answers = Object.fromEntries(
        attempt.questions.map((q) => [
          q.id,
          keys.rows.find((k) => k.id === q.id)!.answer,
        ]),
      );
      const graded = await asStudent(
        studentB,
        `select course_quiz_submit('${attempt.id}','${JSON.stringify(answers)}') as grade`,
      );
      return (graded.rows[0] as { grade: { passed: boolean; score: number } })
        .grade;
    }
    for (let day = 0; day < 5; day++) {
      for (let unit = 0; unit < 3; unit++)
        await asStudent(studentB, `select course_read('${day}-${unit}')`);
      for (const c of challenges.filter(
        (c) => c.day === day && c.level === "Explorer",
      ))
        expect(
          (
            await asStudent(
              studentB,
              `select course_submit_program('${c.id}','${JSON.stringify(solution(c))}') as ok`,
            )
          ).rows,
        ).toEqual([{ ok: true }]);
      expect(
        (
          await asStudent(
            studentB,
            `select course_submit_prompt(${day},'move right 3 steps','The robot is at the start','Avoid trees and preview first','action plan') as ok`,
          )
        ).rows,
      ).toEqual([{ ok: true }]);
      expect(await perfectQuiz(day, day % 2 ? "sq" : "en")).toMatchObject({
        score: 100,
        passed: true,
      });
    }
    expect((await perfectQuiz(5, "sq")).passed).toBe(false);
    for (const c of challenges.filter((c) => c.exam))
      expect(
        (
          await asStudent(
            studentB,
            `select course_submit_program('${c.id}','${JSON.stringify(solution(c))}') as ok`,
          )
        ).rows,
      ).toEqual([{ ok: true }]);
    await asStudent(
      studentB,
      "select course_submit_prompt(5,'lëviz djathtas 3 hapa','Roboti nis nga këndi lart','Shmang pemët dhe trego planin','plan veprimi')",
    );
    expect(await perfectQuiz(5, "sq")).toMatchObject({
      score: 100,
      passed: true,
    });
  });
  it("rejects null prompts, malformed blocks, and non-terminating programs", async () => {
    expect(
      (
        await asStudent(
          studentB,
          "select course_submit_prompt(5,null,'context with detail','rules with detail','action plan') as ok",
        )
      ).rows,
    ).toEqual([{ ok: false }]);
    await expect(
      asStudent(
        studentB,
        `select course_submit_program('exam-0','{"body":[{"type":"move"}],"tool":[]}')`,
      ),
    ).rejects.toThrow();
    expect(
      (
        await asStudent(
          studentB,
          `select course_submit_program('exam-0','{"body":[{"type":"while","condition":"hasKey","body":[]}],"tool":[]}') as ok`,
        )
      ).rows,
    ).toEqual([{ ok: false }]);
  });
});

describe("teacher and student bootstrap", () => {
  it("assigns existing accounts repeatably and limits teacher access to assigned classes", async () => {
    await db.exec(
      `alter table auth.users add column email text;update auth.users set email='teacher@class.test' where id='${studentA}';update auth.users set email='student@class.test' where id='${studentB}';`,
    );
    const script = readFileSync("supabase/bootstrap-classroom.sql", "utf8")
      .replace(
        /teacher_email text := '[^']*'/,
        "teacher_email text := 'teacher@class.test'",
      )
      .replace(
        /student_email text := '[^']*'/,
        "student_email text := 'student@class.test'",
      )
      .replace(
        /owner_email text := '[^']*'/,
        "owner_email text := 'owner@class.test'",
      );
    const ownerId = "33333333-3333-3333-3333-333333333333";
    await db.exec(
      `insert into auth.users(id,email) values ('${ownerId}','owner@class.test')`,
    );
    await db.exec(script);
    await db.exec(script);
    expect(
      (await asStudent(studentA, "select current_app_role() as role")).rows,
    ).toEqual([{ role: "teacher" }]);
    expect(
      (await asStudent(studentB, "select current_app_role() as role")).rows,
    ).toEqual([{ role: "student" }]);
    expect(
      (await asStudent(ownerId, "select current_app_role() as role")).rows,
    ).toEqual([{ role: "superadmin" }]);
    const classroom = await db.query<{ id: string }>(
      "select id from classrooms where name='PixelPilot - Class 1'",
    );
    const classId = classroom.rows[0].id;
    expect(
      (
        await asStudent(
          studentA,
          `select * from teacher_classroom_roster('${classId}')`,
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      asStudent(
        studentB,
        `select * from teacher_classroom_roster('${classId}')`,
      ),
    ).rejects.toThrow();
    await expect(
      asStudent(
        studentA,
        "select * from teacher_classroom_roster('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')",
      ),
    ).rejects.toThrow();
    await expect(
      asStudent(
        studentB,
        `update app_roles set role='superadmin' where user_id='${studentB}'`,
      ),
    ).rejects.toThrow();
    await expect(
      asStudent(
        studentB,
        `insert into class_teachers values ('${classId}','${studentB}')`,
      ),
    ).rejects.toThrow();
  });
});
