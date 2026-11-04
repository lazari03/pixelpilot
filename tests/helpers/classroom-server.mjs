// Test-only Supabase-compatible service. Never imported by production code.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const accounts = [
  ["11111111-1111-1111-1111-111111111111", "student@class.test"],
  ["22222222-2222-2222-2222-222222222222", "teacher@class.test"],
  ["33333333-3333-3333-3333-333333333333", "owner@class.test"],
].map(([id, email]) => {
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: id,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "test-fixture",
  ].join(".");
  return { user, token };
});
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values ${accounts.map((a) => `('${a.user.id}')`).join(",")};`,
);
await db.exec(readFileSync("supabase/setup.sql", "utf8"));
const classId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
await db.exec(
  `insert into classrooms(id,name) values ('${classId}','Test classroom');insert into class_members values ('${classId}','${accounts[0].user.id}','Pilot One');insert into app_roles values ('${accounts[1].user.id}','teacher'),('${accounts[2].user.id}','superadmin');insert into class_teachers values ('${classId}','${accounts[1].user.id}');`,
);
let queue = Promise.resolve();
createServer((req, res) => {
  queue = queue
    .then(async () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Content-Type", "application/json");
      if (req.method === "OPTIONS") {
        res.end();
        return;
      }
      const url = new URL(req.url, "http://localhost");
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : {};
      if (url.pathname === "/auth/v1/token") {
        const account = accounts.find((a) => a.user.email === body.email);
        if (!account || body.password !== "classroom-passphrase") {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Invalid login",
            }),
          );
          return;
        }
        res.end(
          JSON.stringify({
            access_token: account.token,
            refresh_token: "test-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user: account.user,
          }),
        );
        return;
      }
      const actor = accounts.find(
        (a) => req.headers.authorization === `Bearer ${a.token}`,
      );
      if (url.pathname === "/auth/v1/user") {
        if (!actor) {
          res.statusCode = 401;
          res.end(JSON.stringify({ message: "Invalid token" }));
          return;
        }
        res.end(JSON.stringify(actor.user));
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        res.end("{}");
        return;
      }
      if (!actor) {
        res.statusCode = 401;
        res.end("{}");
        return;
      }
      try {
        await db.exec(
          `set role authenticated;set request.jwt.claim.sub='${actor.user.id}';`,
        );
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const name = url.pathname.split("/").at(-1),
            args = Object.keys(body);
          if (
            !/^(course_|teacher_|class_|current_app_)[a-z_]+$/.test(name) ||
            args.some((k) => !/^p_[a-z_]+$/.test(k))
          )
            throw Error("invalid RPC");
          const tableRpc = [
            "teacher_lesson_progress",
            "teacher_classroom_roster",
          ].includes(name);
          const result = await db.query(
            `select ${tableRpc ? "* from " : ""}public.${name}(${args.map((key, i) => `${key} => $${i + 1}`).join(",")}) ${tableRpc ? "" : "as result"}`,
            args.map((key) =>
              body[key] === null
                ? null
                : typeof body[key] === "object"
                  ? JSON.stringify(body[key])
                  : body[key],
            ),
          );
          res.end(
            JSON.stringify(tableRpc ? result.rows : result.rows[0].result),
          );
        } else {
          const table = url.pathname.split("/").at(-1);
          if (
            ![
              "course_chapters",
              "course_challenges",
              "course_reads",
              "course_marks",
              "course_prompts",
              "course_results",
              "class_lesson_publications",
              "class_lesson_marks",
            ].includes(table)
          )
            throw Error("unknown table");
          const result = await db.query(`select * from public.${table}`);
          res.end(JSON.stringify(result.rows));
        }
      } catch (error) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            message: error.message,
            code: error.code ?? "fixture",
          }),
        );
      } finally {
        await db.exec("reset role");
      }
    })
    .catch((error) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: String(error) }));
    });
}).listen(54321, "127.0.0.1", () => console.log("Classroom fixture ready"));
