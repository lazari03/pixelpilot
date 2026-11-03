-- Apply after schema.sql, before seed.sql. Safe to re-run.
begin;
create table if not exists public.lessons (
 day integer primary key check (day between 0 and 4),
 title text not null, topic text not null, icon text not null,
 lesson text not null, goal text not null, prompt text not null, rule text not null
);
create table if not exists public.knowledge_entries (
 id text primary key, title text not null, keywords text[] not null default '{}',
 explanation text not null, example text not null
);
create table if not exists public.learning_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_day integer not null references public.lessons(day),
 intent text not null check (intent in ('action','explain','hint','clarify','applied','reflection')),
 knowledge_id text references public.knowledge_entries(id),
 action_type text check (action_type in ('move','reset','gate')),
 feedback text check (feedback in ('fits','improve')),
 created_at timestamptz not null default now()
);
create index if not exists learning_events_user_created on public.learning_events(user_id,created_at desc);
alter table public.lessons enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.learning_events enable row level security;
drop policy if exists "Public course lessons" on public.lessons;
create policy "Public course lessons" on public.lessons for select to anon,authenticated using (true);
drop policy if exists "Public course knowledge" on public.knowledge_entries;
create policy "Public course knowledge" on public.knowledge_entries for select to anon,authenticated using (true);
drop policy if exists "Students read own learning events" on public.learning_events;
create policy "Students read own learning events" on public.learning_events for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Students record own learning events" on public.learning_events;
create policy "Students record own learning events" on public.learning_events for insert to authenticated with check ((select auth.uid())=user_id);
grant select on public.lessons,public.knowledge_entries to anon,authenticated;
revoke all on public.learning_events from anon;
grant select,insert on public.learning_events to authenticated;
-- No client write policies on knowledge: edit course content through SQL/admin tools.
commit;
