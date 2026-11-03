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
  for (const file of [
    "schema.sql",
    "001_learning.sql",
    "seed.sql",
    "schema.sql",
    "001_learning.sql",
    "seed.sql",
  ])
    await db.exec(readFileSync(`supabase/${file}`, "utf8"));
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
