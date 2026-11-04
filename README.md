# PixelPilot · Creator Lab

A classroom coding and AI-literacy course in Albanian and English. Next.js, TypeScript, Blockly, Supabase and a small local prompt interpreter. Login is required; there is no public demo route or paid AI service.

## Run locally

Use Node.js 24. Run `npm ci`. Copy `.env.example` to `.env.local` and provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use only the project publishable key, never a service-role key in browser configuration. Run `npm run dev`.

In Supabase's SQL editor, apply **`supabase/setup.sql`**. It is a repeatable combined migration and seed: it preserves student records, installs the new course schema and grading functions, and updates course content. Existing installations can apply `002_course.sql` and `seed-course.sql` after their original migrations. Restart/redeploy after changing public environment variables.

Create student accounts in Supabase Authentication with teacher-managed email aliases and unique passphrases. Disable public signup and configure authentication rate limits and password policy. Teacher resets stay in the Supabase dashboard. Cookie sessions are refreshed in `src/proxy.ts`; protected pages independently verify the user on the server. Database RLS and grading functions enforce access even when browser requests are modified.

## One-week course

Five 60-minute chapters, each with three bilingual lessons, nine guided activities, three practical tasks at the selected difficulty, a structured-prompt task and a checkpoint quiz. Timing: 10-minute introduction, 15-minute guided practice, 20-minute build, 10-minute quiz and five-minute reflection. Optional partner design and testing activities extend each day by up to an hour. These are teaching estimates, not enforced wait timers.

| Chapter                 | Concepts                                       |
| ----------------------- | ---------------------------------------------- |
| Think Like a Programmer | Sequences, events, debugging, prompt structure |
| Power, Numbers & Logic  | Variables, comparisons, bits, AND / OR / NOT   |
| Decisions & Characters  | If / else, nesting, switch / case, edge cases  |
| Loops & Reusable Tools  | Repeat, while, do / while, functions           |
| Build, Test & Graduate  | Design, peer testing, evaluating AI assistance |

There are **45 differentiated challenge variants**, plus **two final practicals**, **15 lessons**, **45 guided activities**, and **40 question-bank items**. Explorer, Builder and Inventor change targets, block budgets and required tools. A checkpoint passes at 80% plus all three practical tasks, lesson completion and a valid structured prompt. Later chapters unlock in order. Retakes draw a randomized subset/order from the chapter question bank.

The final exam draws ten questions (two per chapter), requires two practical programs and a structured prompt, and passes at 80% with all practical requirements met. Weighting: questions 50 points, programs 40, prompt 10. Answers, explanations and attempts follow the language selected at the start of an attempt.

## Classroom leaderboard

Teachers manage memberships through Supabase SQL/dashboard; students cannot add themselves or edit points. Example (replace UUIDs and nickname):

```sql
insert into public.classrooms (id, name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Class 1');
insert into public.class_members (class_id, user_id, nickname)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<student-auth-user-id>', 'Robot One');
```

The ranking RPC returns only classmates' nicknames and points in classrooms the signed-in student belongs to. Scores reward verified tasks and mastery, not speed. No public student roster or email is returned. With no membership, the UI asks the pupil to contact the teacher.

## Prompting and local tutor

`@pixelpilot/local-tutor` is a local npm dependency. Students must first complete the prompting lesson, then supply goal, context, rules and response format. Vague or contradictory requests do not produce actions. Supported structured goals include `move right 3 steps`, `reset robot`, `lëviz djathtas 3 hapa` and `rifillo robotin`; format is `action plan` or `plan veprimi`. The interpreter is bounded and deterministic, not an LLM. Every action requires a preview and confirmation. Raw child prompts are not stored; the database stores completion only.

## Content and translations

UI messages live in `src/i18n/messages.ts`. Lessons and activities are in `src/data/chapters.json`; challenge definitions are in `src/data/challenges.json`. Both locales use the same components and stable IDs. Questions and answer keys are in `scripts/content/questions.private.json`, used only to generate SQL, never imported by client code. Here “private” means excluded from client bundles, not encrypted in the source repository.

Run `npm run db:seed:generate` after changing content; review and apply the generated SQL. The database is the runtime course source. There is no silent demo fallback when the schema is missing.

## Validation and deployment

- `npm test`: domain, local-tutor and embedded PostgreSQL tests, including all 47 solutions, full progression, final exam and RLS.
- `npm run typecheck`, `npm run format:check`, `npm run build`.
- `npm run test:browser`: launches an isolated local Supabase-compatible PostgreSQL fixture and dev server. Tests auth, locales, prompting, workspace size, mobile layout and reduced motion. Uses `/usr/bin/chromium` or `CHROMIUM_PATH`. The fixture is test-only and is never imported by production code.

Import the repository into Vercel, set both public variables, and deploy as Next.js. Apply `supabase/setup.sql`, create student accounts and classroom memberships, and test the live project before classroom use. Local database/HTTP-fixture tests do not establish live Supabase configuration. No AI API key is needed.

## Teacher, student and owner roles

After running `setup.sql`, edit and run `supabase/bootstrap-classroom.sql` in the project owner's SQL editor. Supply the emails of existing teacher/student Auth accounts; optionally supply your own owner email for `superadmin`. Leave owner email empty to create no superadmin. The script creates a classroom, assigns its teacher and enrolls the student with a nickname; it can be rerun without duplicating membership. It never changes passwords or grants PostgreSQL superuser access. Existing projects can apply `003_roles.sql` separately before the bootstrap.

Roles are stored in `app_roles`, never in user-editable metadata. Students cannot self-promote. `teacher_classroom_roster(class_id)` provides an authorized roster/progress read for assigned teachers; superadmins can read any classroom. These roles establish database permissions. The teacher studio supports lesson authoring and class mission progress; account creation and role assignment remain owner-managed in Supabase.

## Rocket game and teacher lesson studio

The play area now uses a local SVG rocket scene: turning, engine thrust, power effects, rock impacts and station docking. It has a larger flight screen, pause/resume, single-step, replay, stop, speed and fullscreen controls. Reduced-motion preferences are respected; no external game assets or paid engine are required.

Teachers can create bilingual class lessons at `/teacher`: explain, show an example, three activities and an editable flight map. Copy any starter lesson or create a new one. Drafts are private; publishing requires a verified solution. Published snapshots remain unchanged while a teacher edits the next draft. Students find assigned, published lessons under Class missions. Custom work uses the same bounded interpreter and database grading as the default game.

Apply `004_teacher_lessons.sql` (included in the updated `setup.sql`) and reapply `seed-course.sql` for the simpler starter text. Teacher roles and classroom assignments still come from `bootstrap-classroom.sql`. See [the teacher guide](docs/teacher-guide.md) for the classroom workflow and rollout steps.
