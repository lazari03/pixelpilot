# Architecture

The app separates content, domain rules, persistence and presentation.

- `src/domain/program.ts`: typed instruction tree and bounded interpreter. Conditions, comparisons, assignments, counted and conditional loops, switch cases and one reusable function. No eval or arbitrary generated JavaScript.
- `src/features/course`: typed repository adapter and course-loading hook. It reads curriculum and own progress; writes use grading RPCs.
- `src/features/assessment`: question/attempt UI. The database owns question selection, answer keys, grades and chapter unlocking.
- `src/components/Blocks.tsx`: Blockly adapter compiles visual blocks into the instruction tree. `CodingWorkspace` animates execution and requests authoritative verification. The coding panel is the largest workspace.
- `src/i18n`: one locale provider and shared message catalog. Lesson/question translations are data keyed by stable concept IDs, not duplicate React pages.
- `packages/local-tutor`: deterministic intent interpreter with explicit structured-prompt validation and a lightweight knowledge-retrieval dependency. A command object is previewed before dispatch; fuzzy retrieval cannot execute actions.
- `src/lib/auth` and `src/proxy.ts`: cookie-based Supabase sessions, refresh and server-side verification. The browser cannot unlock protected pages merely by writing local storage.

## Assessment boundary

Database functions independently run submitted programs with bounded recursion and ticks, validate required tools and block counts, grade private question answers, and check previous chapter completion. Students have read-only access to their own marks/results. Direct score and membership writes are denied. Every RPC checks the authenticated identity and chapter prerequisites. Repeated submissions do not duplicate points or downgrade an existing pass.

The SQL interpreter mirrors the browser interpreter. Tests solve every challenge through both and verify complete progression without administrator-awarded marks. Embedded PostgreSQL uses a minimal Supabase auth contract. Browser tests use a local test-only HTTP adapter backed by PostgreSQL; neither is a production authentication shortcut.

## Data and privacy

`course_chapters` and `course_challenges` hold bilingual runtime content. `course_questions` is inaccessible to student roles; assessment RPCs return translated question text/options and post-submission explanations. `course_reads`, `course_marks`, `course_prompts`, `course_attempts` and `course_results` store private progress. Raw child prompt text is neither retained nor sent to an AI service. Class memberships are teacher-managed; the ranking RPC returns only nicknames, class names and derived scores for the current pupil's classrooms.

`supabase/setup.sql` combines repeatable schema and seed scripts. `npm run db:seed:generate` rebuilds it. Knowledge, quiz keys and rubric definitions are not self-editable by students. Seed keys remain visible to anyone with source-repository access, so these are classroom learning assessments rather than a proctored examination system.

## Teaching design

Each of five chapters has three lessons and nine guided activities, plus practical tasks, a structured-prompt exercise and a checkpoint. The hour is a teaching plan, not a delay mechanism. Three difficulty levels change destinations, requirements and code budgets. Quizzes use an 80% threshold; final assessment combines ten questions, two programs and a prompt. The locale is recorded per attempt to keep question and feedback language consistent.

Animations use position transitions and CSS effects; `prefers-reduced-motion` disables them. Language changes rebuild Blockly labels while retaining the current workspace serialization. Switching challenge or leaving the coding screen starts a fresh workspace; programs are currently assessed rather than saved as editable projects.

## Teacher authoring and the flight scene

`features/lessons` contains typed lesson content and a repository for role-scoped RPCs. `class_lessons` stores teacher-only drafts; `class_lesson_publications` stores student-visible snapshots; `class_lesson_marks` stores verified completion per published revision. Save operations use optimistic revisions and class authorization. Publishing validates the lesson format and map, then independently executes the teacher's test program. A teacher cannot publish an unsolved mission simply by setting a client-side flag. The class-specific content never overwrites the default curriculum or exam.

`RocketScene` renders local vector artwork, the map and state-driven effects. `CodingWorkspace` owns cancellable playback, pause/step controls and fullscreen layout. Visual playback and verified assessment use the same typed program result. Teacher preview plays locally without awarding points. The scene remains responsive and honours reduced motion. Class mission scores count a lesson once rather than allowing point farming through repeated publication.
