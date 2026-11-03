# PixelPilot · Creator Lab

A five-day elementary coding and AI literacy pilot. Next.js, TypeScript, Tailwind, Blockly and optional Supabase. No AI API key or paid AI service is required.

## Develop

Use Node.js 24 and npm. Run `npm ci`, then `npm run dev` from this directory. `npm test`, `npm run typecheck`, and `npm run build` validate the project. The demo works without credentials and stores completion locally on the current browser. Each day is available immediately for teacher-led navigation.

## Connect Supabase

Copy `.env.example` to `.env.local` and populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with your project URL and publishable key. These are intended browser configuration, not administrative secrets. Never supply a service-role key to client code. Restart the dev server after editing environment variables.

Run `supabase/setup.sql` in the project SQL editor to create and seed the complete database. This generated file combines the three scripts described below. The progress table uses row level security so students can access only their own rows. Create accounts through Supabase Authentication > Users using teacher-managed email aliases and unique generated passphrases. Disable public signup in Supabase settings. Configure provider rate limits, password policy, and CAPTCHA as required before a public classroom launch. The app does not expose an account creation or admin endpoint. Teachers reset passwords via the Supabase dashboard. The teacher page is a public lesson guide, not a student management dashboard.

Verify login, progress persistence, logout and isolation between two real accounts before classroom use. Auth and live database integration cannot be verified without a configured Supabase project. Demo progress is separate and is not imported into accounts. Do not use shared browser demo storage for confidential information.

## Deploy on Vercel

Import this repository as a Next.js project. Set the two public Supabase variables in Vercel environment settings and redeploy. Configure the Supabase site URL for the deployed HTTPS origin. Apply the SQL schema in your Supabase project. No local database or writable Vercel disk is required. Review hosting plan terms and your school's student data requirements before use.

## Pilot scope

Movement and repeat blocks execute in a bounded interpreter, never eval. Boolean gates support AND, OR and NOT with editable sensor values. Days include sequences, variables, binary truth values, conditions, loops, functions, testing and prompt literacy. Switch/case, while, do/while and functions currently have lesson explanations, not dedicated executable blocks. The three levels change scaffolding and challenge suggestions; they are not separate puzzle sets yet.

The prompt lab uses the local interpreter described below. Its personal-information warning is educational feedback, not a comprehensive privacy filter. Raw prompts are not sent to a third party or stored in the database.

Before expanding the pilot: add executable blocks for remaining constructs, differentiated puzzle sets, accessible game descriptions, classroom administration and end-to-end auth tests against your configured project.

## Local tutor and database knowledge

The app now consumes `@pixelpilot/local-tutor`, a small local dependency in `packages/local-tutor`. It uses `fuzzysort` to retrieve curriculum explanations and a bounded command grammar to translate requests into game actions. Examples: `move right 3 steps`, `repeat down 5 times`, `set gate to AND`, `reset robot`, `explain loops`. Every action is previewed and requires confirmation. Unknown requests ask for clarification. There is no downloaded language model and no AI API call.

Apply `supabase/schema.sql`, `supabase/001_learning.sql`, then `supabase/seed.sql` in that order. They can be re-run. These store five lessons, fourteen knowledge entries, progress, and structured learning events. Update JSON content under `src/data`, then run `npm run db:seed:generate` to regenerate seed SQL. The live app reads curriculum through the Supabase repository; missing configuration or failed reads show an explicit offline demo status. Anonymous users can read course content, but cannot read or write student records. Raw child questions are not stored. Signed-in learning metadata is private to the student through RLS.

Run `npm test` for tutor, game and embedded PostgreSQL tests. The latter verify repeated migration/seed application and data isolation using a minimal Supabase-compatible auth contract; they do not establish live project readiness. Run `npm start -- --port 3001`, then `npm run test:browser` for Chromium checks. Chromium is expected at `/usr/bin/chromium` in this sandbox.

See [architecture](docs/architecture.md) for module boundaries, design patterns and extension points. Live database provisioning and authentication require the publishable key and SQL access; a project URL alone cannot apply migrations.

Run `npm run db:check` after configuring credentials and applying SQL for read-only live curriculum and anonymous-access checks. It never prints keys.
