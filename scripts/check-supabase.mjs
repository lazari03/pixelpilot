import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "Missing Supabase URL or publishable key. Add them to environment settings or .env.local.",
  );
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const [table, expected] of [
  ["lessons", 5],
  ["knowledge_entries", 14],
]) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(
      `${table}: connection or schema check failed (code ${error.code || "network"}).`,
    );
    process.exitCode = 1;
  } else if (count !== expected) {
    console.error(
      `${table}: expected ${expected} seeded rows, received ${count}.`,
    );
    process.exitCode = 1;
  } else console.log(`${table}: ${count} seeded rows accessible.`);
}
// Anonymous student-record access must be rejected or return no visible records.
for (const table of ["progress", "learning_events"]) {
  const { data, error } = await client.from(table).select("*").limit(1);
  if (error && error.code !== "42501") {
    console.error(
      `${table}: access check failed (code ${error.code || "network"}).`,
    );
    process.exitCode = 1;
  } else if (!error && data?.length) {
    console.error(
      `${table}: anonymous records exposed. Review RLS before classroom use.`,
    );
    process.exitCode = 1;
  } else
    console.log(`${table}: no student records exposed to the anonymous check.`);
}
console.log(
  "This read-only check does not verify sign-in or two-account isolation.",
);
