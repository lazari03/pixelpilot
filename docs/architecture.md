# Creator Lab architecture

The pilot uses small domain modules and adapters rather than a framework of service classes.

- `src/domain`: pure game rules, course types and the `LearningRepository` contract. No React or Supabase imports.
- `src/data`: curriculum JSON for repeatable seeding and explicit offline demo fallback; the Supabase repository implements the learning contract. Row level security enforces authorization in PostgreSQL.
- `src/hooks/useAdventure.ts`: coordinates cancellable game runs and dispatches typed tutor actions.
- `src/hooks/useLearning.ts`: coordinates authentication, curriculum, progress and learning-event persistence. Stale requests from a previous identity cannot replace the active student's progress.
- `src/components`: renders the studio and tutor; delegates rules and persistence. Actions from the tutor require a preview and explicit confirmation.
- `packages/local-tutor`: a local package consumed through an npm file dependency. Uses `fuzzysort` for course knowledge retrieval, with a small adjacent-letter typo correction. A separate exact command grammar returns discriminated action objects. Fuzzy retrieval never executes commands.

The interpreter is deterministic, not an LLM. It supports move, repeat direction, reset and Boolean gate commands; it retrieves explanations for the seeded concepts. It asks for clarification outside its vocabulary and never evaluates arbitrary code. This keeps runtime and network cost small. Basic privacy matching is educational feedback, not a comprehensive PII detector.

## Data

`lessons` holds the five-day course. `knowledge_entries` holds explanations, examples and retrieval keywords. Both are readable by demo and authenticated clients; only SQL/admin tools can write them. `progress` stores student completion per day/level. `learning_events` stores structured topic, intent, action and feedback metadata per student. No raw child prompt or model conversation is stored. Each student's rows are private through RLS.

`schema.sql`, `001_learning.sql`, and `seed.sql` are applied in that order. All are repeatable. Seed updates course content without replacing student records. PostgreSQL tests apply migrations twice and verify anonymous access restrictions, student isolation and cross-student write rejection. Embedded tests exercise PostgreSQL semantics with a minimal auth contract; live Supabase auth still needs project-level validation.

## Patterns used

Repository and adapter: a typed persistence contract isolates database details. Command: typed tutor actions are previewed before execution. Pure functions: game transitions and intent interpretation are testable without UI. Composition: the prompt lab is separate from the studio and the learning hook.

## Adding knowledge or actions

Edit `src/data/knowledge.json`, regenerate `supabase/seed.sql` with `npm run db:seed:generate`, review the SQL and apply it. For new actions, extend the package action union, parser and UI dispatcher, then add rejection and execution tests. Do not use fuzzy similarity to decide a write or introduce `eval`.
