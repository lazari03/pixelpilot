-- Run in the Supabase SQL editor. Create accounts via Authentication > Users.
-- Student accounts need no personal email: use teacher-managed account aliases.
create table if not exists public.progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 day integer not null check (day between 0 and 4),
 level text not null check (level in ('Explorer','Builder','Inventor')),
 completed boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(user_id,day,level)
);
alter table public.progress enable row level security;
drop policy if exists "Students read own progress" on public.progress;
create policy "Students read own progress" on public.progress for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Students insert own progress" on public.progress;
create policy "Students insert own progress" on public.progress for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Students update own progress" on public.progress;
create policy "Students update own progress" on public.progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- No anonymous access, public signup UI, or client-accessible admin credentials.

grant select,insert,update on public.progress to authenticated;
revoke all on public.progress from anon;
