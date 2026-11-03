// Test-only Supabase-compatible HTTP fixture. Never imported by application code.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const id = "11111111-1111-1111-1111-111111111111";
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "student@class.test",
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
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values ('${id}');`,
);
for (const name of [
  "schema.sql",
  "001_learning.sql",
  "002_course.sql",
  "seed.sql",
  "seed-course.sql",
])
  await db.exec(readFileSync(`supabase/${name}`, "utf8"));
await db.exec(
  `insert into classrooms(id,name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Test classroom');insert into class_members values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','${id}','Robot One');`,
);
let queue = Promise.resolve();
const server = createServer((req, res) => {
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
        if (
          body.email !== "student@class.test" ||
          body.password !== "classroom-passphrase"
        ) {
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
            access_token: token,
            refresh_token: "test-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user,
          }),
        );
        return;
      }
      if (url.pathname === "/auth/v1/user") {
        if (req.headers.authorization !== `Bearer ${token}`) {
          res.statusCode = 401;
          res.end(JSON.stringify({ message: "Invalid token" }));
          return;
        }
        res.end(JSON.stringify(user));
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        res.end("{}");
        return;
      }
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.statusCode = 401;
        res.end("{}");
        return;
      }
      try {
        await db.exec(
          `set role authenticated;set request.jwt.claim.sub='${id}';`,
        );
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const name = url.pathname.split("/").at(-1);
          const args = Object.keys(body);
          if (
            !/^course_[a-z_]+$/.test(name) ||
            args.some((k) => !/^p_[a-z_]+$/.test(k))
          )
            throw Error("invalid RPC");
          const result = await db.query(
            `select public.${name}(${args.map((key, i) => `${key} => $${i + 1}`).join(",")}) as result`,
            args.map((key) =>
              typeof body[key] === "object"
                ? JSON.stringify(body[key])
                : body[key],
            ),
          );
          res.end(JSON.stringify(result.rows[0].result));
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
});
server.listen(54321, "127.0.0.1", () => console.log("Classroom fixture ready"));
