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

-- Authenticated bilingual course, authoritative assessment and classroom-only rankings.
begin;
create table if not exists public.course_chapters(day int primary key check(day between 0 and 4), content jsonb not null);
create table if not exists public.course_challenges(id text primary key,day int not null check(day between 0 and 5),level text not null,slot int not null,content jsonb not null);
create table if not exists public.course_questions(id text primary key,day int not null,text jsonb not null,options jsonb not null,answer int not null,explanation jsonb not null);
create table if not exists public.course_reads(user_id uuid references auth.users on delete cascade,unit_id text not null,primary key(user_id,unit_id));
create table if not exists public.course_marks(user_id uuid references auth.users on delete cascade,challenge_id text references public.course_challenges,primary key(user_id,challenge_id));
create table if not exists public.course_prompts(user_id uuid references auth.users on delete cascade,day int not null,primary key(user_id,day));
create table if not exists public.course_results(user_id uuid references auth.users on delete cascade,day int not null,level text not null,score int not null,passed boolean not null,primary key(user_id,day,level));
create table if not exists public.course_attempts(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete cascade,day int not null,level text not null,locale text not null check(locale in ('en','sq')),questions text[] not null,submitted boolean not null default false,created_at timestamptz default now());
create table if not exists public.classrooms(id uuid primary key default gen_random_uuid(),name text not null);
create table if not exists public.class_members(class_id uuid references public.classrooms on delete cascade,user_id uuid references auth.users on delete cascade,nickname text not null check(length(nickname) between 2 and 30),primary key(class_id,user_id),unique(class_id,nickname));
create index if not exists class_members_user on public.class_members(user_id,class_id);
-- Content is private to signed-in pupils; answers are available only inside grading functions.
alter table public.course_chapters enable row level security;
alter table public.course_challenges enable row level security;
alter table public.course_questions enable row level security;
alter table public.course_reads enable row level security;
alter table public.course_marks enable row level security;
alter table public.course_prompts enable row level security;
alter table public.course_results enable row level security;
alter table public.course_attempts enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_members enable row level security;
drop policy if exists course_chapters_read on public.course_chapters;
create policy course_chapters_read on public.course_chapters for select to authenticated using(true);
drop policy if exists course_challenges_read on public.course_challenges;
create policy course_challenges_read on public.course_challenges for select to authenticated using(true);
drop policy if exists course_reads_read on public.course_reads;
create policy course_reads_read on public.course_reads for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists course_marks_read on public.course_marks;
create policy course_marks_read on public.course_marks for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists course_prompts_read on public.course_prompts;
create policy course_prompts_read on public.course_prompts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists course_results_read on public.course_results;
create policy course_results_read on public.course_results for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists class_members_read on public.class_members;
create policy class_members_read on public.class_members for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.course_chapters,public.course_challenges,public.course_questions,public.course_reads,public.course_marks,public.course_prompts,public.course_results,public.course_attempts,public.classrooms,public.class_members from anon,authenticated;
grant select on public.course_chapters,public.course_challenges,public.course_reads,public.course_marks,public.course_prompts,public.course_results,public.class_members to authenticated;

create or replace function public.course_unlocked(p_day int) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and p_day between 0 and 5 and (p_day=0 or (select count(distinct day) from public.course_results where user_id=auth.uid() and passed and day<p_day)=p_day);
$$;
create or replace function public.course_read(p_unit text) returns void language plpgsql security definer set search_path=public as $$
declare d int;
begin
 if p_unit !~ '^[0-4]-[0-2]$' then raise exception 'invalid unit';end if;
 d:=split_part(p_unit,'-',1)::int;
 if not public.course_unlocked(d) then raise exception 'chapter locked';end if;
 insert into public.course_reads values(auth.uid(),p_unit) on conflict do nothing;
end;$$;

create or replace function public.program_condition(c text,s jsonb,g jsonb) returns boolean language sql immutable as $$
 select case c when 'energyLow' then (s->>'energy')::int<8 when 'energyReady' then (s->>'energy')::int>=8 when 'hasKey' then (s->>'key')::boolean when 'AND' then (s->>'key')::boolean and (s->>'energy')::int>=8 when 'OR' then (s->>'key')::boolean or (s->>'energy')::int>=8 when 'NOT' then not (s->>'key')::boolean when 'notAtGoal' then not ((s->>'x')::int=(g->0)::int and (s->>'y')::int=(g->1)::int) else false end;
$$;
create or replace function public.program_nodes(items jsonb,depth int default 0) returns int language plpgsql immutable as $$
declare n jsonb; total int:=0;
begin
 if depth>8 or items is null or jsonb_typeof(items)<>'array' or jsonb_array_length(items)>150 then raise exception 'invalid program';end if;
 for n in select value from jsonb_array_elements(items) loop
 if jsonb_typeof(n)<>'object' or not n ? 'type' or n->>'type' not in ('move','charge','setKey','setEnergy','setSignal','repeat','if','switch','while','doWhile','call') then raise exception 'invalid block';end if;
 if n->>'type'='move' and coalesce(n->>'direction','') not in ('up','down','left','right') then raise exception 'invalid direction';end if;
 if n->>'type' in ('if','while','doWhile') and coalesce(n->>'condition','') not in ('energyLow','energyReady','hasKey','AND','OR','NOT','notAtGoal') then raise exception 'invalid condition';end if;
 if n->>'type' in ('repeat','if','switch','while','doWhile') and coalesce(jsonb_typeof(n->'body'),'')<>'array' then raise exception 'invalid body';end if;
 if n->>'type' in ('if','switch') and coalesce(jsonb_typeof(n->'otherwise'),'')<>'array' then raise exception 'invalid branch';end if;
 if n->>'type'='repeat' and (coalesce(n->>'count','') !~ '^[0-9]{1,2}$' or (n->>'count')::int>20) then raise exception 'invalid repetition';end if;
 if n->>'type'='setKey' and coalesce(jsonb_typeof(n->'value'),'')<>'boolean' then raise exception 'invalid key';end if;
 if n->>'type'='setSignal' and coalesce(n->>'value','') not in ('red','green') then raise exception 'invalid signal';end if;
 if n->>'type'='setEnergy' and (coalesce(n->>'value','') !~ '^[0-9]{1,2}$' or (n->>'value')::int>20) then raise exception 'invalid energy';end if;
 total:=total+1+public.program_nodes(coalesce(n->'body','[]'),depth+1)+public.program_nodes(coalesce(n->'otherwise','[]'),depth+1);
 if total>150 then raise exception 'program too large';end if;
 end loop;return total;
end;$$;
create or replace function public.program_walk(items jsonb,s jsonb,c jsonb,tool jsonb,depth int default 0) returns jsonb language plpgsql immutable as $$
declare n jsonb; kind text; x int;y int; energy int; i int; times int; first_turn boolean; used jsonb;
begin
 if depth>8 then return s||'{"error":"limit"}';end if;
 for n in select value from jsonb_array_elements(items) loop
 if s ? 'error' then return s;end if;
 s:=s||jsonb_build_object('ticks',(s->>'ticks')::int+1);
 if (s->>'ticks')::int>300 then return s||'{"error":"limit"}';end if;
 kind:=n->>'type';used:=s->'used';if not used ? kind then used:=used||to_jsonb(kind);end if;s:=s||jsonb_build_object('used',used);
 case kind
 when 'setKey' then s:=s||jsonb_build_object('key',(n->>'value')::boolean);
 when 'setEnergy' then s:=s||jsonb_build_object('energy',least(20,greatest(0,(n->>'value')::int)));
 when 'setSignal' then if n->>'value' not in ('green','red') then raise exception 'invalid signal';end if;s:=s||jsonb_build_object('signal',n->>'value');
 when 'move' then
 x:=(s->>'x')::int;y:=(s->>'y')::int;
 case n->>'direction' when 'right' then x:=x+1;when 'left' then x:=x-1;when 'down' then y:=y+1;when 'up' then y:=y-1;else raise exception 'invalid direction';end case;
 if x<0 or y<0 or x>5 or y>5 or (c->'walls') @> jsonb_build_array(jsonb_build_array(x,y)) or ((c->>'gate')::boolean and x=(c->'goal'->0)::int and y=(c->'goal'->1)::int and ((s->>'energy')::int<8 or not (s->>'key')::boolean)) then return s||'{"error":"blocked"}';end if;
 s:=s||jsonb_build_object('x',x,'y',y);
 when 'charge' then s:=s||jsonb_build_object('energy',least(20,(s->>'energy')::int+1));
 when 'repeat' then
 times:=least(20,greatest(0,floor((n->>'count')::numeric)::int));
 for i in 1..times loop
 s:=s||jsonb_build_object('ticks',(s->>'ticks')::int+1);if (s->>'ticks')::int>300 then return s||'{"error":"limit"}';end if;
 s:=public.program_walk(n->'body',s,c,tool,depth+1);if s ? 'error' then return s;end if;
 end loop;
 when 'if' then s:=public.program_walk(case when public.program_condition(n->>'condition',s,c->'goal') then n->'body' else n->'otherwise' end,s,c,tool,depth+1);
 when 'switch' then s:=public.program_walk(case when s->>'signal'='green' then n->'body' else n->'otherwise' end,s,c,tool,depth+1);
 when 'while','doWhile' then
 first_turn:=kind='doWhile';
 while first_turn or public.program_condition(n->>'condition',s,c->'goal') loop
 first_turn:=false;s:=s||jsonb_build_object('ticks',(s->>'ticks')::int+1);if (s->>'ticks')::int>300 then return s||'{"error":"limit"}';end if;
 s:=public.program_walk(n->'body',s,c,tool,depth+1);if s ? 'error' then return s;end if;
 end loop;
 when 'call' then s:=public.program_walk(tool,s,c,tool,depth+1);
 else raise exception 'unsupported block';
 end case;
 end loop;return s;
end;$$;

create or replace function public.course_submit_program(p_id text,p_program jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare c jsonb; d int; s jsonb; nodes int;
begin
 if auth.uid() is null then raise exception 'login required';end if;
 select content,day into c,d from public.course_challenges where id=p_id;
 if c is null or not public.course_unlocked(d) then raise exception 'challenge locked';end if;
 if p_program is null or length(p_program::text)>20000 then raise exception 'program too large';end if;
 nodes:=public.program_nodes(p_program->'body')+public.program_nodes(p_program->'tool');
 if nodes>(c->>'maxNodes')::int then return false;end if;
 s:=public.program_walk(p_program->'body',jsonb_build_object('x',0,'y',0,'energy',(c->>'energy')::int,'ticks',0,'used','[]'::jsonb,'key',true,'signal',c->>'signal'),c,p_program->'tool');
 if s ? 'error' or (s->>'x')::int<>(c->'goal'->0)::int or (s->>'y')::int<>(c->'goal'->1)::int or not (s->'used') @> (c->'required') then return false;end if;
 insert into public.course_marks values(auth.uid(),p_id) on conflict do nothing;return true;
end;$$;

create or replace function public.course_submit_prompt(p_day int,p_goal text,p_context text,p_rules text,p_format text) returns boolean language plpgsql security definer set search_path=public as $$
declare g text:=lower(trim(p_goal)); f text:=lower(trim(p_format));
begin
 if not public.course_unlocked(p_day) then raise exception 'chapter locked';end if;
 if not exists(select 1 from public.course_reads where user_id=auth.uid() and unit_id='0-2') then return false;end if;
 if p_goal is null or p_context is null or p_rules is null or p_format is null then return false;end if;
 if greatest(length(p_goal),length(p_context),length(p_rules),length(p_format))>600 or length(trim(p_context))<12 or length(trim(p_rules))<12 or f not in ('action plan','plan veprimi') then return false;end if;
 if lower(p_goal||p_context||p_rules) ~ '(@|password|fjalëkalim|my name|my address|adresa ime|emri im|[0-9]{7,})' then return false;end if;
 if lower(p_rules) ~ '(do not move|never move|mos lëviz|mos leviz)' and g ~ '(move|lëviz|leviz)' then return false;end if;
 if not (g ~ '^(move|go|walk)( the robot)? (right|left|up|down) ([1-9]|10)( steps?)?$' or g ~ '^(lëviz|leviz) (djathtas|majtas|lart|poshtë|poshte) ([1-9]|10)( hapa?)?$' or g ~ '^(reset robot|rifillo robotin)$') then return false;end if;
 insert into public.course_prompts values(auth.uid(),p_day) on conflict do nothing;return true;
end;$$;

create or replace function public.course_quiz_start(p_day int,p_level text,p_locale text) returns jsonb language plpgsql security definer set search_path=public as $$
declare ids text[]; attempt uuid; questions jsonb;
begin
 if not public.course_unlocked(p_day) or p_level not in ('Explorer','Builder','Inventor') or p_locale not in ('en','sq') then raise exception 'invalid assessment';end if;
 if (select count(*) from public.course_attempts where user_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'too many attempts';end if;
 if p_day=5 then
 select array_agg(id order by random()) into ids from (select id,row_number() over(partition by day order by random()) n from public.course_questions) t where n<=2;
 else select array_agg(id) into ids from (select id from public.course_questions where day=p_day order by random() limit 5) t;end if;
 if cardinality(ids)<>(case when p_day=5 then 10 else 5 end) then raise exception 'questions not seeded';end if;
 insert into public.course_attempts(user_id,day,level,locale,questions) values(auth.uid(),p_day,p_level,p_locale,ids) returning id into attempt;
 select jsonb_agg(jsonb_build_object('id',q.id,'text',q.text->>p_locale,'options',q.options->p_locale) order by array_position(ids,q.id)) into questions from public.course_questions q where q.id=any(ids);
 return jsonb_build_object('id',attempt,'questions',questions);
end;$$;
create or replace function public.course_quiz_submit(p_attempt uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.course_attempts; correct int; score int; practical int; prompt_ok boolean; read_count int; passed boolean; feedback jsonb;
begin
 select * into a from public.course_attempts where id=p_attempt and user_id=auth.uid() for update;
 if a.id is null or a.submitted then raise exception 'attempt unavailable';end if;
 if not public.course_unlocked(a.day) then raise exception 'chapter locked';end if;
 if jsonb_typeof(p_answers)<>'object' or (select count(*) from jsonb_object_keys(p_answers))<>cardinality(a.questions) then raise exception 'answer every question';end if;
 if exists(select 1 from unnest(a.questions) id where not p_answers ? id or (p_answers->>id) !~ '^[0-2]$') then raise exception 'invalid answers';end if;
 select count(*) into correct from public.course_questions q where q.id=any(a.questions) and q.answer=(p_answers->>q.id)::int;
 select exists(select 1 from public.course_prompts where user_id=auth.uid() and day=a.day) into prompt_ok;
 if a.day=5 then
 select count(*) into practical from public.course_marks where user_id=auth.uid() and challenge_id in ('exam-0','exam-1');
 score:=correct*5+practical*20+case when prompt_ok then 10 else 0 end;passed:=score>=80 and practical=2 and prompt_ok;
 else
 select count(*) into practical from public.course_marks m join public.course_challenges c on c.id=m.challenge_id where m.user_id=auth.uid() and c.day=a.day and c.level=a.level;
 select count(*) into read_count from public.course_reads where user_id=auth.uid() and unit_id like a.day::text||'-%';
 score:=correct*20;passed:=score>=80 and practical=3 and prompt_ok and read_count=3;
 end if;
 update public.course_attempts set submitted=true where id=a.id;
 insert into public.course_results values(auth.uid(),a.day,a.level,score,passed) on conflict(user_id,day,level) do update set score=greatest(course_results.score,excluded.score),passed=course_results.passed or excluded.passed;
 select jsonb_agg(jsonb_build_object('id',q.id,'correct',q.answer=(p_answers->>q.id)::int,'explanation',q.explanation->>a.locale)) into feedback from public.course_questions q where q.id=any(a.questions);
 return jsonb_build_object('score',score,'passed',passed,'feedback',feedback);
end;$$;

create or replace function public.course_leaderboard() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.points desc,r.nickname),'[]'::jsonb) from (
 select c.name as classroom,m.nickname,
 (select count(*)*10 from public.course_marks where user_id=m.user_id)+(select coalesce(sum(best),0) from (select day,max(case when passed then case when day=5 then 100 else 20 end + score/10 else 0 end) best from public.course_results where user_id=m.user_id group by day) scores) as points
 from public.class_members m join public.classrooms c on c.id=m.class_id
 where m.class_id in (select class_id from public.class_members where user_id=auth.uid())
 ) r;
$$;
-- Function execution is explicit: internal interpreter functions are not a public API.
revoke all on function public.program_condition(text,jsonb,jsonb),public.program_nodes(jsonb,int),public.program_walk(jsonb,jsonb,jsonb,jsonb,int) from public,anon,authenticated;
revoke all on function public.course_unlocked(int),public.course_read(text),public.course_submit_program(text,jsonb),public.course_submit_prompt(int,text,text,text,text),public.course_quiz_start(int,text,text),public.course_quiz_submit(uuid,jsonb),public.course_leaderboard() from public,anon;
grant execute on function public.course_unlocked(int),public.course_read(text),public.course_submit_program(text,jsonb),public.course_submit_prompt(int,text,text,text,text),public.course_quiz_start(int,text,text),public.course_quiz_submit(uuid,jsonb),public.course_leaderboard() to authenticated;
commit;

-- Run after setup.sql on an existing installation. No user can self-promote.
begin;
create table if not exists public.app_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('superadmin','teacher','student'))
);
create table if not exists public.class_teachers (
 class_id uuid references public.classrooms(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 primary key(class_id,user_id)
);
alter table public.app_roles enable row level security;
alter table public.class_teachers enable row level security;
revoke all on public.app_roles,public.class_teachers from anon,authenticated;
grant select on public.app_roles,public.class_teachers to authenticated;
drop policy if exists own_app_role on public.app_roles;
create policy own_app_role on public.app_roles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_teaching_classes on public.class_teachers;
create policy own_teaching_classes on public.class_teachers for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.current_app_role() returns text language sql stable security definer set search_path=public as $$
 select case when auth.uid() is null then null else coalesce((select role from public.app_roles where user_id=auth.uid()),'student') end;
$$;
create or replace function public.teacher_classroom_roster(p_class uuid) returns table(nickname text,chapters_passed bigint,exam_passed boolean) language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not (public.current_app_role()='superadmin' or (public.current_app_role()='teacher' and exists(select 1 from public.class_teachers where class_id=p_class and user_id=auth.uid()))) then raise exception 'teacher access required';end if;
 return query select m.nickname,(select count(distinct r.day) from public.course_results r where r.user_id=m.user_id and r.day<5 and r.passed),exists(select 1 from public.course_results r where r.user_id=m.user_id and r.day=5 and r.passed) from public.class_members m where m.class_id=p_class order by m.nickname;
end;$$;
revoke all on function public.current_app_role(),public.teacher_classroom_roster(uuid) from public,anon;
grant execute on function public.current_app_role(),public.teacher_classroom_roster(uuid) to authenticated;
commit;

-- Teacher-owned drafts, published classroom snapshots and verified custom missions.
begin;
create table if not exists public.class_lessons(id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classrooms on delete cascade,day int not null check(day between 0 and 4),content jsonb not null,revision int not null default 1,created_by uuid not null references auth.users,updated_at timestamptz not null default now());
create table if not exists public.class_lesson_publications(lesson_id uuid primary key references public.class_lessons on delete cascade,class_id uuid not null references public.classrooms on delete cascade,day int not null,content jsonb not null,revision int not null,published_at timestamptz not null default now());
create table if not exists public.class_lesson_marks(user_id uuid references auth.users on delete cascade,lesson_id uuid references public.class_lessons on delete cascade,revision int not null,primary key(user_id,lesson_id,revision));
alter table public.class_lessons enable row level security;
alter table public.class_lesson_publications enable row level security;
alter table public.class_lesson_marks enable row level security;
revoke all on public.class_lessons,public.class_lesson_publications,public.class_lesson_marks from anon,authenticated;
grant select on public.class_lesson_publications,public.class_lesson_marks to authenticated;
create or replace function public.can_teach_class(p_class uuid) returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and (public.current_app_role()='superadmin' or (public.current_app_role()='teacher' and exists(select 1 from public.class_teachers where class_id=p_class and user_id=auth.uid())));
$$;
drop policy if exists published_class_lessons on public.class_lesson_publications;
create policy published_class_lessons on public.class_lesson_publications for select to authenticated using(public.can_teach_class(class_id) or exists(select 1 from public.class_members m where m.class_id=class_lesson_publications.class_id and m.user_id=(select auth.uid())));
drop policy if exists own_class_lesson_marks on public.class_lesson_marks;
create policy own_class_lesson_marks on public.class_lesson_marks for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.lesson_mission_valid(c jsonb) returns boolean language plpgsql immutable as $$
declare cell jsonb; item jsonb; n int; reachable boolean;
begin
 if c is null or jsonb_typeof(c)<>'object' then return false;end if;
 if coalesce(jsonb_typeof(c->'goal'),'')<>'array' or jsonb_array_length(c->'goal')<>2 or coalesce(jsonb_typeof(c->'walls'),'')<>'array' or jsonb_array_length(c->'walls')>24 or coalesce(jsonb_typeof(c->'required'),'')<>'array' or jsonb_array_length(c->'required')>8 then return false;end if;
 for cell in select value from jsonb_array_elements(c->'walls') union all select c->'goal' loop
 if jsonb_typeof(cell)<>'array' or jsonb_array_length(cell)<>2 then return false;end if;
 for item in select value from jsonb_array_elements(cell) loop if jsonb_typeof(item)<>'number' or item::text !~ '^[0-5]$' then return false;end if;end loop;
 end loop;
 if c->'goal'='[0,0]'::jsonb or c->'walls' @> '[ [0,0] ]'::jsonb or c->'walls' @> jsonb_build_array(c->'goal') then return false;end if;
 if (select count(*) from jsonb_array_elements(c->'walls'))<>(select count(distinct value) from jsonb_array_elements(c->'walls')) then return false;end if;
 if coalesce(c->>'energy','') !~ '^[0-9]{1,2}$' or (c->>'energy')::int>20 or coalesce(c->>'maxNodes','') !~ '^[0-9]{1,2}$' or (c->>'maxNodes')::int not between 4 and 64 or coalesce(c->>'theme','') not in ('nebula','moon','solar') or coalesce(c->>'signal','') not in ('green','red') or coalesce(jsonb_typeof(c->'gate'),'')<>'boolean' then return false;end if;
 for item in select value from jsonb_array_elements(c->'required') loop if jsonb_typeof(item)<>'string' or item#>>'{}' not in ('move','charge','repeat','if','switch','while','doWhile','call') then return false;end if;end loop;
 with recursive walk(x,y) as (values(0,0) union select w.x+d.x,w.y+d.y from walk w cross join (values(1,0),(-1,0),(0,1),(0,-1)) d(x,y) where w.x+d.x between 0 and 5 and w.y+d.y between 0 and 5 and not (c->'walls') @> jsonb_build_array(jsonb_build_array(w.x+d.x,w.y+d.y))) select exists(select 1 from walk where x=(c->'goal'->0)::int and y=(c->'goal'->1)::int) into reachable;
 return reachable;
exception when others then return false;
end;$$;
create or replace function public.lesson_content_valid(c jsonb,p_publish boolean) returns boolean language plpgsql immutable as $$
declare lang text;field text;activity jsonb;
begin
 if c is null or length(c::text)>18000 or not public.lesson_mission_valid(c->'mission') then return false;end if;
 if coalesce(jsonb_typeof(c->'activities'),'')<>'array' or jsonb_array_length(c->'activities')<>3 then return false;end if;
 foreach lang in array array['en','sq'] loop
 foreach field in array array['title','body','example'] loop
 if coalesce(jsonb_typeof(c->field->lang),'')<>'string' or length(c->field->>lang)>2500 then return false;end if;
 if field='title' and length(trim(c->field->>lang)) not between 1 and 100 then return false;end if;
 if p_publish and field<>'title' and length(trim(c->field->>lang))<8 then return false;end if;
 end loop;
 for activity in select value from jsonb_array_elements(c->'activities') loop if coalesce(jsonb_typeof(activity->lang),'')<>'string' or length(activity->>lang)>500 or (p_publish and length(trim(activity->>lang))<5) then return false;end if;end loop;
 end loop;return true;
exception when others then return false;
end;$$;
create or replace function public.lesson_program_passes(p_program jsonb,c jsonb) returns boolean language plpgsql immutable as $$
declare nodes int;s jsonb;
begin
 if p_program is null or length(p_program::text)>20000 then return false;end if;
 nodes:=public.program_nodes(p_program->'body')+public.program_nodes(p_program->'tool');if nodes>(c->>'maxNodes')::int then return false;end if;
 s:=public.program_walk(p_program->'body',jsonb_build_object('x',0,'y',0,'energy',(c->>'energy')::int,'ticks',0,'used','[]'::jsonb,'key',true,'signal',c->>'signal'),c,p_program->'tool');
 return coalesce(not s ? 'error' and (s->>'x')::int=(c->'goal'->0)::int and (s->>'y')::int=(c->'goal'->1)::int and (s->'used') @> (c->'required'),false);
exception when others then return false;
end;$$;
create or replace function public.teacher_classes() returns jsonb language sql stable security definer set search_path=public as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.classrooms where public.can_teach_class(id);$$;
create or replace function public.teacher_lessons() returns jsonb language sql stable security definer set search_path=public as $$select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]') from (select l.*,p.revision as published_revision from public.class_lessons l left join public.class_lesson_publications p on p.lesson_id=l.id where public.can_teach_class(l.class_id)) t;$$;
create or replace function public.teacher_save_lesson(p_id uuid,p_class uuid,p_day int,p_content jsonb,p_revision int,p_publish boolean,p_proof jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.class_lessons;saved public.class_lessons;published_revision int;
begin
 if not public.can_teach_class(p_class) then raise exception 'teacher access required';end if;
 if p_day is null or p_day not between 0 and 4 or p_publish is null or not public.lesson_content_valid(p_content,p_publish) then raise exception 'invalid lesson';end if;
 if p_publish and not public.lesson_program_passes(p_proof,p_content->'mission') then raise exception 'test the mission before publishing';end if;
 if p_id is null then
 insert into public.class_lessons(class_id,day,content,created_by) values(p_class,p_day,p_content,auth.uid()) returning * into saved;
 else
 select * into existing from public.class_lessons where id=p_id for update;
 if existing.id is null or existing.class_id<>p_class or not public.can_teach_class(existing.class_id) then raise exception 'lesson unavailable';end if;
 if p_revision is null or existing.revision<>p_revision then raise exception 'lesson changed; reload before saving';end if;
 update public.class_lessons set day=p_day,content=p_content,revision=revision+1,updated_at=now() where id=p_id returning * into saved;
 end if;
 if p_publish then insert into public.class_lesson_publications(lesson_id,class_id,day,content,revision) values(saved.id,saved.class_id,saved.day,saved.content,saved.revision) on conflict(lesson_id) do update set day=excluded.day,content=excluded.content,revision=excluded.revision,published_at=now();end if;
 select p.revision into published_revision from public.class_lesson_publications p where p.lesson_id=saved.id;
 return to_jsonb(saved)||jsonb_build_object('published_revision',published_revision);
end;$$;
create or replace function public.teacher_unpublish_lesson(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare c uuid;
begin
 select class_id into c from public.class_lessons where id=p_id for update;if c is null or not public.can_teach_class(c) then raise exception 'teacher access required';end if;
 delete from public.class_lesson_publications where lesson_id=p_id;
end;$$;
create or replace function public.teacher_delete_draft(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare c uuid;
begin
 select class_id into c from public.class_lessons where id=p_id for update;if c is null or not public.can_teach_class(c) then raise exception 'teacher access required';end if;
 if exists(select 1 from public.class_lesson_publications where lesson_id=p_id) then raise exception 'unpublish before deleting';end if;
 delete from public.class_lessons where id=p_id;
end;$$;
create or replace function public.class_submit_program(p_id uuid,p_revision int,p_program jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare lesson public.class_lesson_publications;
begin
 select * into lesson from public.class_lesson_publications where lesson_id=p_id;
 if lesson.lesson_id is null or p_revision is null or lesson.revision<>p_revision or not public.course_unlocked(lesson.day) or not exists(select 1 from public.class_members where class_id=lesson.class_id and user_id=auth.uid()) then raise exception 'lesson unavailable';end if;
 if not public.lesson_program_passes(p_program,lesson.content->'mission') then return false;end if;
 insert into public.class_lesson_marks values(auth.uid(),p_id,p_revision) on conflict do nothing;return true;
end;$$;
create or replace function public.teacher_lesson_progress(p_id uuid) returns table(nickname text,completed boolean) language plpgsql stable security definer set search_path=public as $$
declare lesson public.class_lesson_publications;
begin
 select * into lesson from public.class_lesson_publications where lesson_id=p_id;
 if lesson.lesson_id is null or not public.can_teach_class(lesson.class_id) then raise exception 'teacher access required';end if;
 return query select m.nickname,exists(select 1 from public.class_lesson_marks k where k.lesson_id=p_id and k.user_id=m.user_id and k.revision=lesson.revision) from public.class_members m where m.class_id=lesson.class_id order by m.nickname;
end;$$;
create or replace function public.course_leaderboard() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.points desc,r.nickname),'[]'::jsonb) from (
 select c.name as classroom,m.nickname,
 (select count(*)*10 from public.course_marks where user_id=m.user_id)+(select count(distinct lesson_id)*10 from public.class_lesson_marks where user_id=m.user_id)+(select coalesce(sum(best),0) from (select day,max(case when passed then case when day=5 then 100 else 20 end + score/10 else 0 end) best from public.course_results where user_id=m.user_id group by day) scores) as points
 from public.class_members m join public.classrooms c on c.id=m.class_id
 where m.class_id in (select class_id from public.class_members where user_id=auth.uid())
 ) r;
$$;
revoke all on function public.teacher_lesson_progress(uuid) from public,anon;
grant execute on function public.teacher_lesson_progress(uuid) to authenticated;
revoke all on function public.lesson_mission_valid(jsonb),public.lesson_content_valid(jsonb,boolean),public.lesson_program_passes(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.can_teach_class(uuid),public.teacher_classes(),public.teacher_lessons(),public.teacher_save_lesson(uuid,uuid,int,jsonb,int,boolean,jsonb),public.teacher_unpublish_lesson(uuid),public.teacher_delete_draft(uuid),public.class_submit_program(uuid,int,jsonb) from public,anon;
grant execute on function public.can_teach_class(uuid),public.teacher_classes(),public.teacher_lessons(),public.teacher_save_lesson(uuid,uuid,int,jsonb,int,boolean,jsonb),public.teacher_unpublish_lesson(uuid),public.teacher_delete_draft(uuid),public.class_submit_program(uuid,int,jsonb) to authenticated;
commit;

-- Generated by npm run db:seed:generate. Re-running updates curriculum, not student records.
begin;
insert into public.lessons (day,title,topic,icon,lesson,goal,prompt,rule) values
(0,'Plan & Prompt','Sequences, events & debugging','✦','A sequence is a list of instructions in order. Plan a route, run it, then fix one mistake at a time.','Move the robot to the beacon.','Describe a robot adventure','Give three steps. Do not include personal details.'),
(1,'Power & Logic','Variables, comparisons & 1 / 0','ϟ','A variable stores a value. True can be represented by 1 and false by 0. AND needs both conditions; OR needs at least one; NOT reverses true and false.','Open the gate using energy and a key.','Explain AND and OR','Use a playground example and two short sentences.'),
(2,'Choices & Characters','If / else, switch & decisions','◇','IF chooses an action when a condition is true. ELSE handles the other case. SWITCH chooses among named cases, like red, yellow and green signals.','Choose the right gate rule and test it.','Help me design a tricky gate','Use OR. Give a hint, not the answer.'),
(3,'Loops & Tools','Repeat, while, do / while & functions','↻','REPEAT runs a set number of times. WHILE checks before each turn. DO / WHILE runs once before checking. A function gives reusable steps a name.','Use repeat to reach the beacon with fewer blocks.','Help me debug a loop','Ask one question before suggesting a fix.'),
(4,'Playtest & Share','Build, test & explain','⚑','Combine your rules into an adventure. Test normal cases and tricky cases. Explain what you changed and why. Check AI suggestions rather than assuming they are correct.','Build a route and explain your design to a classmate.','Review my adventure idea','Suggest one improvement and one test. Do not solve it for me.')
on conflict (day) do update set title=excluded.title,topic=excluded.topic,icon=excluded.icon,lesson=excluded.lesson,goal=excluded.goal,prompt=excluded.prompt,rule=excluded.rule;
insert into public.knowledge_entries (id,title,keywords,explanation,example) values
('sequence','Sequences',array['sequence','instructions','order']::text[],'A sequence runs instructions in order. Changing that order can change what happens.','Move right twice, then down once. What changes if you reverse the order?'),
('variable','Variables',array['variable','energy','counter']::text[],'A variable is a named place to store a value. Your robot''s energy is a variable.','Start energy at 5. Add 3. Is energy now at least 8?'),
('and','AND',array['both','and gate']::text[],'AND is true only when both conditions are true.','Test a key with low energy, then a key with energy 8. Which opens an AND gate?'),
('or','OR',array['either','or gate']::text[],'OR is true when at least one condition is true. Both can also be true.','Try a key with no energy, then no key with energy 8.'),
('not','NOT',array['opposite','not gate']::text[],'NOT reverses a Boolean value. True becomes false; false becomes true.','If has key is false, what is NOT has key?'),
('binary','Binary truth values',array['binary','boolean','true','false','1 and 0','bits']::text[],'A bit is 0 or 1. In our logic puzzles, 1 represents true and 0 represents false.','Write 1 for an open gate and 0 for a closed gate.'),
('condition','If / else',array['if','else','condition','conditions']::text[],'IF runs one branch when a condition is true. ELSE runs the alternative when it is false.','If energy is at least 8, open the gate; else show a hint.'),
('switch','Switch / case',array['switch','case','switch case']::text[],'Switch chooses an action by matching a value to a named case. A default handles unmatched values.','For a signal: red means stop, green means go, and default means wait.'),
('loop','Loops',array['loop','repeat','repetition']::text[],'A loop repeats instructions. A counted repeat runs a known number of times.','Repeat move right 3 times. How many movement blocks does that replace?'),
('while','While',array['while loop']::text[],'WHILE checks a condition before each turn. It can run zero times if the condition starts false.','While energy is below 8, collect energy. What must change to make it stop?'),
('do-while','Do / while',array['do while','do while loop']::text[],'DO / WHILE performs its action once before checking the condition, so it always runs at least once.','Take one step, then check whether another step is safe.'),
('function','Functions',array['function','reuse','reusable']::text[],'A function gives a reusable group of instructions a name.','Name a right-then-down sequence cross corner. Where could you use it twice?'),
('debug','Debugging',array['debug','bug','mistake','debugging']::text[],'Debugging means finding why a program behaves unexpectedly and testing a change.','Predict the next square, run one instruction, and compare what happened.'),
('prompt','Prompting',array['prompt','ai','artificial intelligence']::text[],'A clear prompt includes a goal, useful context, constraints and a response format. Check the answer rather than assuming it is right.','Ask for two hints about a gate, without giving the solution or sharing personal details.')
on conflict (id) do update set title=excluded.title,keywords=excluded.keywords,explanation=excluded.explanation,example=excluded.example;
commit;


begin;
insert into public.course_chapters(day,content) values (0,'{"day":0,"title":{"en":"Think Like a Programmer","sq":"Mendo si programues"},"units":[{"id":"0-0","minutes":10,"title":{"en":"Tell the ship what to do","sq":"Tregoji anijes çfarë të bëjë"},"body":{"en":"Your ship needs clear steps. It will do the first step, then the next one. Put the steps in the right order. First, use your finger to trace a safe way to the station. Then build that way with blocks. A list of steps is called a sequence.","sq":"Anijes i duhen hapa të qartë. Ajo bën hapin e parë, pastaj tjetrin. Vendosi hapat me radhë. Së pari, trego me gisht një rrugë të lirë drejt stacionit. Pastaj ndërtoje me blloqe. Hapat me radhë quhen varg udhëzimesh."},"example":{"en":"Go right twice, then down once. Which square will the ship reach? What if you go down first?","sq":"Shko dy herë djathtas, pastaj një herë poshtë. Ku do të arrijë anija? Po nëse shkon së pari poshtë?"},"predict":{"en":"Can you find two safe ways to the station?","sq":"A mund të gjesh dy rrugë të lira drejt stacionit?"},"activities":[{"en":"Draw two different routes to the same flag. Count moves and mark rocks.","sq":"Vizato dy rrugë drejt të njëjtit stacion. Numëro lëvizjet dhe shëno shkëmbinjtë."},{"en":"Write five instructions. Ask a partner to follow them without guessing.","sq":"Shkruaj pesë udhëzime. Kërkoji shokut t’i ndjekë pa hamendësuar."},{"en":"Compare the routes: same destination, different order, different obstacles.","sq":"Krahaso rrugët: e njëjta mbërritje, rend tjetër, pengesa të ndryshme."}]},{"id":"0-1","minutes":10,"title":{"en":"Spot a wrong turn","sq":"Gjej kthesën e gabuar"},"body":{"en":"Press Run to start the ship. Watch what happens. Did it go where you expected? If not, find the first wrong step. Change just that step and try again. It is fine to get it wrong. Finding and fixing a mistake is called debugging.","sq":"Shtyp Ekzekuto për të nisur anijen. Shiko çfarë ndodh. A shkoi atje ku mendoje? Nëse jo, gjej hapin e parë të gabuar. Ndrysho vetëm atë hap dhe provo përsëri. Nuk ka problem të gabosh. Gjetja dhe rregullimi i gabimeve quhet korrigjim."},"example":{"en":"You wanted to go right, but the ship went down. Change the down block to right. Run from the start again.","sq":"Doje të shkoje djathtas, por anija shkoi poshtë. Ndrysho bllokun poshtë në djathtas. Provo sërish nga nisja."},"predict":{"en":"Which step would you change first?","sq":"Cilin hap do të ndryshoje të parin?"},"activities":[{"en":"Create a three-step program with one deliberate mistake.","sq":"Krijo një program me tre hapa dhe një gabim të qëllimshëm."},{"en":"Tell a partner what you expected and what actually happened.","sq":"Thuaji shokut çfarë prisje dhe çfarë ndodhi vërtet."},{"en":"Fix one instruction, rerun from the start, and explain the evidence.","sq":"Korrigjo një udhëzim, rifillo nga nisja dhe shpjego provën."}]},{"id":"0-2","minutes":5,"title":{"en":"A prompt is a plan","sq":"Kërkesa është një plan"},"body":{"en":"When you ask the helper, say what you want and give useful details. Use four boxes: goal, context, rules and answer style. Goal means what to do. Context means where we start. Rules mean what to be careful about. Answer style means how to show the plan. Do not share private information.","sq":"Kur pyet ndihmësin, thuaj çfarë do dhe jep hollësi të dobishme. Përdor katër kuti: qëllimi, gjendja, rregullat dhe forma e përgjigjes. Qëllimi tregon veprimin. Gjendja tregon ku nisim. Rregullat tregojnë kujdesin. Forma tregon si ta shfaqim planin. Mos ndaj të dhëna private."},"example":{"en":"Goal: move right 3 steps. Start: top-left corner. Rule: avoid rocks and show me first. Answer style: action plan.","sq":"Qëllimi: lëviz djathtas 3 hapa. Nisja: këndi lart majtas. Rregulli: shmang shkëmbinjtë dhe ma trego së pari. Forma: plan veprimi."},"predict":{"en":"What is missing from “do it for me”?","sq":"Çfarë mungon te “bëje për mua”?"},"activities":[{"en":"Rewrite “make me win” into four named prompt fields on paper.","sq":"Rishkruaj “më bëj të fitoj” në katër fusha me emër në letër."},{"en":"Add a rule that asks for a preview rather than an immediate action.","sq":"Shto një rregull që kërkon plan paraprak, jo veprim të menjëhershëm."},{"en":"Ask a partner which field could still be misunderstood. Revise it.","sq":"Pyet shokun cila fushë mund të keqkuptohet ende. Përmirësoje."}]}]}'::jsonb),
(1,'{"day":1,"title":{"en":"Power, Numbers & Logic","sq":"Energjia, numrat dhe logjika"},"units":[{"id":"1-0","minutes":10,"title":{"en":"Remember a number","sq":"Ruaj një numër"},"body":{"en":"The ship has an energy number. It starts at 5. Collect energy adds 1. The program remembers the number so it can use it later. A saved number with a name is called a variable. We can ask: is energy smaller than 8, or is it 8 or more?","sq":"Anija ka një numër energjie. Nis në 5. Mblidh energji shton 1. Programi e mban mend numrin për ta përdorur më vonë. Një vlerë e ruajtur me emër quhet ndryshore. Mund të pyesim: energjia është më pak se 8 apo është 8 e më shumë?"},"example":{"en":"Collect three times: 5 becomes 6, then 7, then 8. Now the station has enough energy to open.","sq":"Mblidh tri herë: 5 bëhet 6, pastaj 7, pastaj 8. Tani ka mjaft energji për të hapur stacionin."},"predict":{"en":"How many collections would take energy from 6 to 8?","sq":"Sa mbledhje duhen për ta çuar energjinë nga 6 në 8?"},"activities":[{"en":"Make a table of energy after zero, one, two and three collections.","sq":"Ndërto tabelën e energjisë pas zero, një, dy dhe tri mbledhjeve."},{"en":"For energy 7, 8 and 9, write the result of energy ≥ 8.","sq":"Për energjinë 7, 8 dhe 9, shkruaj rezultatin e energjia ≥ 8."},{"en":"Explain the difference between changing energy and comparing it.","sq":"Shpjego dallimin mes ndryshimit të energjisë dhe krahasimit të saj."}]},{"id":"1-1","minutes":10,"title":{"en":"Yes or no","sq":"Po apo jo"},"body":{"en":"Some questions have only two answers: yes or no. Does the ship have a key? Is the energy ready? In code, we often call yes true and no false. We can write 1 for yes and 0 for no in this game. A single 0 or 1 is called a bit.","sq":"Disa pyetje kanë vetëm dy përgjigje: po ose jo. A ka çelës anija? A ka mjaft energji? Në kod, po quhet e vërtetë dhe jo quhet e gabuar. Në këtë lojë mund të shkruajmë 1 për po dhe 0 për jo. Një 0 ose 1 quhet bit."},"example":{"en":"Has a key: yes, true, 1. Has enough energy: no, false, 0. These are three ways to describe the same answers.","sq":"Ka çelës: po, e vërtetë, 1. Ka mjaft energji: jo, e gabuar, 0. Janë tri mënyra për të thënë të njëjtat përgjigje."},"predict":{"en":"Is 0 always a mistake, or can it tell us something useful?","sq":"A është 0 gjithmonë gabim apo mund të na tregojë diçka të dobishme?"},"activities":[{"en":"Label four imagined sensors with 1 for true and 0 for false.","sq":"Shëno katër sensorë imagjinarë me 1 për të vërtetë dhe 0 për të gabuar."},{"en":"Describe how one bit can represent whether a door is open.","sq":"Përshkruaj si një bit mund të tregojë nëse dera është e hapur."},{"en":"Give an example where 0 is useful information, not a mistake.","sq":"Jep një shembull ku 0 është informacion i dobishëm, jo gabim."}]},{"id":"1-2","minutes":5,"title":{"en":"Both, either, the opposite","sq":"Të dyja, njëra, e kundërta"},"body":{"en":"AND means both things must be true. OR means one or both can be true. NOT means the opposite. Try changing the key and energy blocks. Before you run, say whether the gate should open. Then check if you were right.","sq":"AND do të thotë që të dyja duhet të jenë të vërteta. OR do të thotë se mjafton njëra ose të dyja. NOT do të thotë e kundërta. Ndrysho blloqet e çelësit dhe energjisë. Para provës, thuaj nëse porta duhet të hapet. Pastaj kontrollo."},"example":{"en":"Key yes, energy no: AND says no. OR says yes. NOT key says no. Try swapping yes and no.","sq":"Çelësi po, energjia jo: AND thotë jo. OR thotë po. NOT çelësi thotë jo. Provo të ndërrosh po dhe jo."},"predict":{"en":"What happens when both answers are yes?","sq":"Çfarë ndodh kur të dyja përgjigjet janë po?"},"activities":[{"en":"Build a four-row truth table for key true/false and energy ready/not ready.","sq":"Ndërto tabelën me katër rreshta për çelësin dhe energjinë gati/jo gati."},{"en":"Fill in AND and OR for every row, then compare with a partner.","sq":"Plotëso AND dhe OR për çdo rresht, pastaj krahasoji me shokun."},{"en":"Use the set-key and set-energy blocks to test NOT and one boundary.","sq":"Përdor blloqet e çelësit dhe energjisë për të provuar NOT dhe një kufi."}]}]}'::jsonb),
(2,'{"day":2,"title":{"en":"Decisions & Characters","sq":"Vendimet dhe personazhet"},"units":[{"id":"2-0","minutes":10,"title":{"en":"Choose what happens","sq":"Zgjidh çfarë ndodh"},"body":{"en":"Sometimes the ship needs to choose. IF means “if this is true, do this”. ELSE means “otherwise, do this instead”. Only one choice runs. Try a number that makes each choice happen. One IF makes one choice; it does not keep repeating by itself.","sq":"Ndonjëherë anija duhet të zgjedhë. NËSE do të thotë “nëse kjo është e vërtetë, bëje këtë”. PËRNDRYSHE do të thotë “në rast tjetër, bëje atë”. Ekzekutohet vetëm një zgjedhje. Provo vlera për të dyja. NËSE nuk përsëritet vetë."},"example":{"en":"If energy is below 8, collect once. Otherwise, move right. With energy 5, this makes energy 6—not 8.","sq":"Nëse energjia është nën 8, mblidh një herë. Përndryshe, lëviz djathtas. Me energji 5, energjia bëhet 6—jo 8."},"predict":{"en":"Which number would make the ship move instead of collect?","sq":"Cili numër e bën anijen të lëvizë në vend që të mbledhë?"},"activities":[{"en":"Write two inputs that run different branches of your IF.","sq":"Shkruaj dy hyrje që ekzekutojnë degë të ndryshme të NËSE."},{"en":"Predict the energy after one IF, then after three repeated IFs.","sq":"Parashiko energjinë pas një NËSE dhe pas tre NËSE të përsëritura."},{"en":"Explain why ELSE does not run after a true branch.","sq":"Shpjego pse PËRNDRYSHE nuk ekzekutohet pas degës së vërtetë."}]},{"id":"2-1","minutes":10,"title":{"en":"Choose by colour","sq":"Zgjidh sipas ngjyrës"},"body":{"en":"We can choose what to do by looking at a colour. Green could mean fly. Red could mean wait or collect energy. A switch block picks the matching choice. If nothing matches, it uses the last, backup choice. Try both colours.","sq":"Mund të zgjedhim çfarë të bëjmë duke parë ngjyrën. E gjelbra mund të thotë fluturo. E kuqja mund të thotë prit ose mblidh energji. Blloku SWITCH zgjedh rastin që përputhet. Nëse asgjë nuk përputhet, përdor zgjedhjen rezervë. Provo të dyja ngjyrat."},"example":{"en":"Set the signal to green. Put a move in the green space. Change it to red. Does the same move still run?","sq":"Vendos sinjalin në të gjelbër. Fut një lëvizje te hapësira e gjelbër. Ndryshoje në të kuq. A bëhet ende e njëjta lëvizje?"},"predict":{"en":"What should your ship do when it sees red?","sq":"Çfarë duhet të bëjë anija kur sheh të kuqen?"},"activities":[{"en":"Create green and red behaviors with the switch block.","sq":"Krijo sjellje për sinjalin e gjelbër dhe të kuq me bllokun SWITCH."},{"en":"Change the signal using a block and test both branches.","sq":"Ndrysho sinjalin me bllok dhe provo të dyja degët."},{"en":"Describe a third real-world signal and its default behavior.","sq":"Përshkruaj një sinjal të tretë nga jeta dhe sjelljen parazgjedhje."}]},{"id":"2-2","minutes":5,"title":{"en":"Check the tricky cases","sq":"Provo rastet e veçanta"},"body":{"en":"A program can work once and still have a mistake. Try it with less energy, just enough energy, and extra energy. Try it without a key too. You can put one IF inside another. Read the outside choice first, then the inside choice.","sq":"Programi mund të punojë një herë dhe prapë të ketë gabim. Provoje me pak energji, me aq sa duhet dhe me më shumë. Provoje edhe pa çelës. Mund të vendosësh një NËSE brenda një tjetri. Lexo së pari zgjedhjen jashtë, pastaj atë brenda."},"example":{"en":"Try energy 7, 8 and 9. Write “open” or “closed” before each run. Compare your guess with what happens.","sq":"Provo energjinë 7, 8 dhe 9. Shkruaj “hapur” ose “mbyllur” para çdo prove. Krahaso mendimin me rezultatin."},"predict":{"en":"Which test would you try if a friend said “it always works”?","sq":"Cilën provë do të bëje nëse një shok thotë “punon gjithmonë”?"},"activities":[{"en":"Nest an energy check inside a key check. Trace the outer condition first.","sq":"Vendos kontrollin e energjisë brenda kontrollit të çelësit. Ndiq kushtin e jashtëm së pari."},{"en":"Try no key, energy 7, energy 8 and energy 9.","sq":"Provo pa çelës, energjinë 7, 8 dhe 9."},{"en":"Ask a partner to find an input you forgot to test.","sq":"Kërkoji shokut të gjejë një hyrje që harrove ta provosh."}]}]}'::jsonb),
(3,'{"day":3,"title":{"en":"Loops & Reusable Tools","sq":"Ciklet dhe mjetet e ripërdorshme"},"units":[{"id":"3-0","minutes":10,"title":{"en":"Do it again","sq":"Bëje përsëri"},"body":{"en":"If the same steps happen again and again, use a repeat block. Tell it how many times to repeat. The steps inside it run each time. Count carefully before you run. A repeated set of steps is called a loop.","sq":"Kur të njëjtët hapa bëhen përsëri e përsëri, përdor bllokun Përsërit. Thuaji sa herë. Hapat brenda tij bëhen çdo herë. Numëro me kujdes para provës. Një grup hapash që përsëritet quhet cikël."},"example":{"en":"Repeat 3 times: right, then down. That is 6 moves. Repeat only right 3 times: that is 3 moves.","sq":"Përsërit 3 herë: djathtas, pastaj poshtë. Janë 6 lëvizje. Përsërit vetëm djathtas 3 herë: janë 3 lëvizje."},"predict":{"en":"Can you make the same route with fewer blocks?","sq":"A mund ta bësh të njëjtën rrugë me më pak blloqe?"},"activities":[{"en":"Predict the moves in repeat 2 {repeat 3 {right}} before running.","sq":"Parashiko lëvizjet te përsërit 2 {përsërit 3 {djathtas}} para provës."},{"en":"Replace a repeated section of your route with a counted loop.","sq":"Zëvendëso një pjesë të përsëritur të rrugës me cikël me numër."},{"en":"Compare block count, movement count and readability with a partner.","sq":"Krahaso numrin e blloqeve, lëvizjet dhe qartësinë me shokun."}]},{"id":"3-1","minutes":10,"title":{"en":"When should we stop?","sq":"Kur duhet të ndalojmë?"},"body":{"en":"WHILE means “keep doing this while the answer is yes”. It checks first. DO / WHILE does it once, then checks. Give the loop a way to stop. For example, collecting energy changes the number until there is enough. If it cannot stop, our game stops it safely.","sq":"WHILE do të thotë “vazhdo sa kohë përgjigjja është po”. Kontrollon së pari. DO / WHILE e bën një herë dhe pastaj kontrollon. Jepi ciklit një mënyrë për të ndaluar. Mbledhja e energjisë e ndryshon numrin derisa të mjaftojë. Nëse nuk ndalon, loja e ndal në mënyrë të sigurt."},"example":{"en":"While energy is below 8, collect. Starting at 8 does nothing. Do collect, then check: starting at 8 still collects once.","sq":"Sa kohë energjia është nën 8, mblidh. Duke nisur në 8, nuk bën gjë. Bëj mbledhje, pastaj kontrollo: duke nisur në 8, mbledh një herë."},"predict":{"en":"What changes inside your loop so it can stop?","sq":"Çfarë ndryshon brenda ciklit që ai të mund të ndalet?"},"activities":[{"en":"Run WHILE and DO / WHILE with starting energy 8. Compare results.","sq":"Ekzekuto WHILE dhe DO / WHILE me energji fillestare 8. Krahaso rezultatet."},{"en":"Create a loop whose condition cannot change and observe the safe stop.","sq":"Krijo një cikël ku kushti nuk ndryshon dhe vëzhgo ndalimin e sigurt."},{"en":"Repair the loop by changing energy inside it. Explain why it ends.","sq":"Korrigjo ciklin duke ndryshuar energjinë brenda. Shpjego pse përfundon."}]},{"id":"3-2","minutes":5,"title":{"en":"Make your own shortcut","sq":"Krijo një shkurtore"},"body":{"en":"You can give a group of steps a name. Then use the name instead of building all the steps again. This is called a function. Making the shortcut does not run it. You must use the shortcut block to make it happen.","sq":"Mund t’i japësh emër një grupi hapash. Pastaj përdor emrin në vend që t’i ndërtosh sërish. Kjo quhet funksion. Krijimi i shkurtores nuk e ekzekuton. Duhet të përdorësh bllokun e shkurtores që hapat të bëhen."},"example":{"en":"Make a shortcut with two right moves. Use it twice. The ship moves right four times. Change the shortcut and try again.","sq":"Krijo një shkurtore me dy lëvizje djathtas. Përdore dy herë. Anija shkon djathtas katër herë. Ndrysho shkurtoren dhe provo sërish."},"predict":{"en":"How does a shortcut help you fix the same mistake in two places?","sq":"Si të ndihmon shkurtorja të rregullosh të njëjtin gabim në dy vende?"},"activities":[{"en":"Define a short reusable tool, then call it twice.","sq":"Përcakto një mjet të shkurtër dhe përdore dy herë."},{"en":"Change one instruction in the definition and predict both calls.","sq":"Ndrysho një udhëzim në përcaktim dhe parashiko të dyja thirrjet."},{"en":"Explain what happens if a definition is never called.","sq":"Shpjego çfarë ndodh nëse përcaktimi nuk thirret kurrë."}]}]}'::jsonb),
(4,'{"day":4,"title":{"en":"Build, Test & Graduate","sq":"Ndërto, provo dhe përfundo"},"units":[{"id":"4-0","minutes":10,"title":{"en":"Plan a small adventure","sq":"Planifiko një aventurë të vogël"},"body":{"en":"Before building, draw a start, some rocks and a station. Find the parts that repeat. Find one place where the ship must choose. Turn your drawing into small groups of steps. Explain the plan to a friend before you press Run.","sq":"Para ndërtimit, vizato nisjen, disa shkëmbinj dhe stacionin. Gjej pjesët që përsëriten. Gjej një vend ku anija duhet të zgjedhë. Ktheje vizatimin në grupe të vogla hapash. Shpjegoja planin shokut para provës."},"example":{"en":"Circle the repeated part of your route. Put it in a repeat block or a shortcut. Test that small part first.","sq":"Rretho pjesën e rrugës që përsëritet. Vendose në një bllok Përsërit ose në një shkurtore. Provo së pari atë pjesë të vogël."},"predict":{"en":"Which part can you test before the whole adventure?","sq":"Cilën pjesë mund ta provosh para gjithë aventurës?"},"activities":[{"en":"Sketch a rescue with one decision, one loop and one named tool.","sq":"Vizato një shpëtim me një vendim, një cikël dhe një mjet me emër."},{"en":"Split the project into three parts you can test independently.","sq":"Ndaje projektin në tri pjesë që mund t’i provosh veçmas."},{"en":"Explain your plan to a partner before placing the first block.","sq":"Shpjegoja planin shokut para bllokut të parë."}]},{"id":"4-1","minutes":10,"title":{"en":"Let a friend try","sq":"Lëre një shok ta provojë"},"body":{"en":"Ask a friend to try your program. Let them choose a number you did not think of. Tell them what you expected. Watch together. If something goes wrong, change one thing and try the same test again. A mistake is a chance to make the game better.","sq":"Kërkoji një shoku ta provojë programin. Lëre të zgjedhë një numër që ti nuk e mendove. Thuaji çfarë prisje. Shikojeni bashkë. Nëse diçka shkon gabim, ndrysho një gjë dhe bëj sërish të njëjtën provë. Gabimi është mundësi për ta përmirësuar lojën."},"example":{"en":"Try energy 7, 8 and 9. Did the station open each time you expected? Write down one change you made.","sq":"Provo energjinë 7, 8 dhe 9. A u hap stacioni kur e prisje? Shkruaj një ndryshim që bëre."},"predict":{"en":"What did your friend find that you did not notice?","sq":"Çfarë gjeti shoku që ti nuk e vure re?"},"activities":[{"en":"Ask a partner to test one normal input and one unexpected input.","sq":"Kërkoji shokut të provojë një hyrje normale dhe një të papritur."},{"en":"Write expected and observed behavior for both tests on paper.","sq":"Shkruaj në letër sjelljen e pritur dhe të vëzhguar për të dyja."},{"en":"Improve one thing, rerun the same tests, and compare the evidence.","sq":"Përmirëso një gjë, përsërit të njëjtat prova dhe krahaso dëshmitë."}]},{"id":"4-2","minutes":5,"title":{"en":"Check the helper''s advice","sq":"Kontrollo këshillën e ndihmësit"},"body":{"en":"The helper can suggest a step, but you must check it. Did it follow your rules? Is the route safe? Never share a password or home address. This helper knows only a few classroom actions. Ask your teacher when you are unsure.","sq":"Ndihmësi mund të sugjerojë një hap, por ti duhet ta kontrollosh. A ndoqi rregullat? A është rruga e lirë? Mos ndaj kurrë fjalëkalimin ose adresën e shtëpisë. Ndihmësi njeh vetëm disa veprime të klasës. Pyet mësuesin kur nuk je i sigurt."},"example":{"en":"If you asked for a plan first, do not run it straight away. Read it, check it, then choose whether to apply it.","sq":"Nëse kërkove planin së pari, mos e ekzekuto menjëherë. Lexoje, kontrolloje dhe pastaj vendos nëse do ta zbatosh."},"predict":{"en":"What would you check before trusting a new suggestion?","sq":"Çfarë do të kontrolloje para se t’i besoje një sugjerimi të ri?"},"activities":[{"en":"Compare an unclear prompt with a structured one. Name the missing context.","sq":"Krahaso një kërkesë të paqartë me një të strukturuar. Gjej kontekstin që mungon."},{"en":"Explain one limit of this local helper and why testing is still needed.","sq":"Shpjego një kufi të ndihmësit lokal dhe pse duhen ende prova."},{"en":"Prepare a short demonstration: your best bug fix, prompt and boundary test.","sq":"Përgatit një demonstrim të shkurtër: korrigjimi, kërkesa dhe prova kufitare më e mirë."}]}]}'::jsonb) on conflict(day) do update set content=excluded.content;
insert into public.course_challenges(id,day,level,slot,content) values ('d0-Explorer-0',0,'Explorer',0,'{"id":"d0-Explorer-0","day":0,"level":"Explorer","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[2,1],"walls":[[1,1]],"required":["move"],"maxNodes":64,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Explorer-1',0,'Explorer',1,'{"id":"d0-Explorer-1","day":0,"level":"Explorer","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["move"],"maxNodes":64,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Explorer-2',0,'Explorer',2,'{"id":"d0-Explorer-2","day":0,"level":"Explorer","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":64,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Builder-0',0,'Builder',0,'{"id":"d0-Builder-0","day":0,"level":"Builder","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,1],"walls":[[1,1],[2,2]],"required":["move"],"maxNodes":32,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Builder-1',0,'Builder',1,'{"id":"d0-Builder-1","day":0,"level":"Builder","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,2],"walls":[[1,1],[2,2]],"required":["move"],"maxNodes":32,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Builder-2',0,'Builder',2,'{"id":"d0-Builder-2","day":0,"level":"Builder","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,3],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":32,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Inventor-0',0,'Inventor',0,'{"id":"d0-Inventor-0","day":0,"level":"Inventor","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["move"],"maxNodes":14,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Inventor-1',0,'Inventor',1,'{"id":"d0-Inventor-1","day":0,"level":"Inventor","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["move"],"maxNodes":14,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d0-Inventor-2',0,'Inventor',2,'{"id":"d0-Inventor-2","day":0,"level":"Inventor","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,4],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":14,"gate":false,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Explorer-0',1,'Explorer',0,'{"id":"d1-Explorer-0","day":1,"level":"Explorer","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[2,1],"walls":[[1,1]],"required":["charge"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Explorer-1',1,'Explorer',1,'{"id":"d1-Explorer-1","day":1,"level":"Explorer","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Explorer-2',1,'Explorer',2,'{"id":"d1-Explorer-2","day":1,"level":"Explorer","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Builder-0',1,'Builder',0,'{"id":"d1-Builder-0","day":1,"level":"Builder","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,1],"walls":[[1,1],[2,2]],"required":["charge"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Builder-1',1,'Builder',1,'{"id":"d1-Builder-1","day":1,"level":"Builder","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,2],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Builder-2',1,'Builder',2,'{"id":"d1-Builder-2","day":1,"level":"Builder","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,3],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Inventor-0',1,'Inventor',0,'{"id":"d1-Inventor-0","day":1,"level":"Inventor","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["charge"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Inventor-1',1,'Inventor',1,'{"id":"d1-Inventor-1","day":1,"level":"Inventor","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d1-Inventor-2',1,'Inventor',2,'{"id":"d1-Inventor-2","day":1,"level":"Inventor","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,4],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Explorer-0',2,'Explorer',0,'{"id":"d2-Explorer-0","day":2,"level":"Explorer","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[2,1],"walls":[[1,1]],"required":["if"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Explorer-1',2,'Explorer',1,'{"id":"d2-Explorer-1","day":2,"level":"Explorer","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["switch"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Explorer-2',2,'Explorer',2,'{"id":"d2-Explorer-2","day":2,"level":"Explorer","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Builder-0',2,'Builder',0,'{"id":"d2-Builder-0","day":2,"level":"Builder","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,1],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Builder-1',2,'Builder',1,'{"id":"d2-Builder-1","day":2,"level":"Builder","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,2],"walls":[[1,1],[2,2]],"required":["switch"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Builder-2',2,'Builder',2,'{"id":"d2-Builder-2","day":2,"level":"Builder","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,3],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Inventor-0',2,'Inventor',0,'{"id":"d2-Inventor-0","day":2,"level":"Inventor","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Inventor-1',2,'Inventor',1,'{"id":"d2-Inventor-1","day":2,"level":"Inventor","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["switch"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d2-Inventor-2',2,'Inventor',2,'{"id":"d2-Inventor-2","day":2,"level":"Inventor","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,4],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Explorer-0',3,'Explorer',0,'{"id":"d3-Explorer-0","day":3,"level":"Explorer","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[2,1],"walls":[[1,1]],"required":["repeat"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Explorer-1',3,'Explorer',1,'{"id":"d3-Explorer-1","day":3,"level":"Explorer","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["while"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Explorer-2',3,'Explorer',2,'{"id":"d3-Explorer-2","day":3,"level":"Explorer","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["doWhile"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Builder-0',3,'Builder',0,'{"id":"d3-Builder-0","day":3,"level":"Builder","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,1],"walls":[[1,1],[2,2]],"required":["repeat"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Builder-1',3,'Builder',1,'{"id":"d3-Builder-1","day":3,"level":"Builder","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,2],"walls":[[1,1],[2,2]],"required":["while"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Builder-2',3,'Builder',2,'{"id":"d3-Builder-2","day":3,"level":"Builder","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,3],"walls":[[1,1],[2,2]],"required":["doWhile"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Inventor-0',3,'Inventor',0,'{"id":"d3-Inventor-0","day":3,"level":"Inventor","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["repeat","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Inventor-1',3,'Inventor',1,'{"id":"d3-Inventor-1","day":3,"level":"Inventor","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["while","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d3-Inventor-2',3,'Inventor',2,'{"id":"d3-Inventor-2","day":3,"level":"Inventor","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,4],"walls":[[1,1],[2,2]],"required":["doWhile","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Explorer-0',4,'Explorer',0,'{"id":"d4-Explorer-0","day":4,"level":"Explorer","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[2,1],"walls":[[1,1]],"required":["call"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Explorer-1',4,'Explorer',1,'{"id":"d4-Explorer-1","day":4,"level":"Explorer","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Explorer-2',4,'Explorer',2,'{"id":"d4-Explorer-2","day":4,"level":"Explorer","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["while"],"maxNodes":64,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Builder-0',4,'Builder',0,'{"id":"d4-Builder-0","day":4,"level":"Builder","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,1],"walls":[[1,1],[2,2]],"required":["call"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Builder-1',4,'Builder',1,'{"id":"d4-Builder-1","day":4,"level":"Builder","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,2],"walls":[[1,1],[2,2]],"required":["if"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Builder-2',4,'Builder',2,'{"id":"d4-Builder-2","day":4,"level":"Builder","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,3],"walls":[[1,1],[2,2]],"required":["while"],"maxNodes":32,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Inventor-0',4,'Inventor',0,'{"id":"d4-Inventor-0","day":4,"level":"Inventor","slot":0,"title":{"en":"Rescue route 1","sq":"Rruga e shpëtimit 1"},"goal":[3,2],"walls":[[1,1],[2,2]],"required":["call","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Inventor-1',4,'Inventor',1,'{"id":"d4-Inventor-1","day":4,"level":"Inventor","slot":1,"title":{"en":"Rescue route 2","sq":"Rruga e shpëtimit 2"},"goal":[4,3],"walls":[[1,1],[2,2]],"required":["if","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('d4-Inventor-2',4,'Inventor',2,'{"id":"d4-Inventor-2","day":4,"level":"Inventor","slot":2,"title":{"en":"Rescue route 3","sq":"Rruga e shpëtimit 3"},"goal":[5,4],"walls":[[1,1],[2,2]],"required":["while","call"],"maxNodes":14,"gate":true,"energy":5,"signal":"green","exam":false}'::jsonb),
('exam-0',5,'Builder',0,'{"id":"exam-0","day":5,"level":"Builder","slot":0,"title":{"en":"Final rescue 1","sq":"Shpëtimi përfundimtar 1"},"goal":[5,4],"walls":[[1,1],[2,2],[3,3]],"required":["call","repeat"],"maxNodes":20,"gate":true,"energy":5,"signal":"green","exam":true}'::jsonb),
('exam-1',5,'Builder',1,'{"id":"exam-1","day":5,"level":"Builder","slot":1,"title":{"en":"Final rescue 2","sq":"Shpëtimi përfundimtar 2"},"goal":[5,5],"walls":[[1,1],[2,2],[3,3]],"required":["while","if"],"maxNodes":20,"gate":true,"energy":5,"signal":"green","exam":true}'::jsonb) on conflict(id) do update set content=excluded.content;
insert into public.course_questions(id,day,text,options,answer,explanation) values ('q0-0',0,'{"en":"What does a sequence describe?","sq":"Çfarë përshkruan një varg udhëzimesh?"}'::jsonb,'{"en":["Instructions in order","Only the last instruction","Random actions"],"sq":["Udhëzime me radhë","Vetëm udhëzimin e fundit","Veprime të rastësishme"]}'::jsonb,0,'{"en":"A sequence follows the order written.","sq":"Vargu ndjek rendin e shkruar."}'::jsonb),
('q0-1',0,'{"en":"Right, right, down: how many moves?","sq":"Djathtas, djathtas, poshtë: sa lëvizje?"}'::jsonb,'{"en":["2","3","4"],"sq":["2","3","4"]}'::jsonb,1,'{"en":"Count each executed movement once.","sq":"Numëro çdo lëvizje të ekzekutuar një herë."}'::jsonb),
('q0-2',0,'{"en":"What is a useful first debugging step?","sq":"Cili është hapi i parë i dobishëm për korrigjim?"}'::jsonb,'{"en":["Change everything","Predict and test one step","Delete the program"],"sq":["Ndrysho gjithçka","Parashiko dhe provo një hap","Fshi programin"]}'::jsonb,1,'{"en":"A small test helps locate the problem.","sq":"Një provë e vogël ndihmon të gjesh problemin."}'::jsonb),
('q0-3',0,'{"en":"Which starts the program here?","sq":"Çfarë e nis programin këtu?"}'::jsonb,'{"en":["A tree","The flag","The Run event"],"sq":["Një pemë","Flamuri","Ngjarja Ekzekuto"]}'::jsonb,2,'{"en":"Pressing Run is an event.","sq":"Shtypja e Ekzekuto është ngjarje."}'::jsonb),
('q0-4',0,'{"en":"Which prompt is most useful?","sq":"Cila kërkesë është më e dobishme?"}'::jsonb,'{"en":["Do it","Move right 3 steps; start at the corner; avoid trees; show a plan","Win now"],"sq":["Bëje","Lëviz djathtas 3 hapa; nis nga këndi; shmang pemët; trego planin","Fito tani"]}'::jsonb,1,'{"en":"It gives a goal, context, rules and format.","sq":"Jep qëllim, kontekst, rregulla dhe format."}'::jsonb),
('q0-5',0,'{"en":"What belongs in prompt context?","sq":"Çfarë bën pjesë në kontekst?"}'::jsonb,'{"en":["The ship’s starting position","Your home address","Your password"],"sq":["Vendnisja e anijes","Adresa e shtëpisë","Fjalëkalimi"]}'::jsonb,0,'{"en":"Context describes the task, not private details.","sq":"Konteksti përshkruan detyrën, jo të dhëna private."}'::jsonb),
('q0-6',0,'{"en":"Why change one instruction at a time?","sq":"Pse ndryshojmë një udhëzim çdo herë?"}'::jsonb,'{"en":["To make more mistakes","To see what caused the result","To avoid testing"],"sq":["Për më shumë gabime","Për të parë çfarë shkaktoi rezultatin","Për të shmangur provat"]}'::jsonb,1,'{"en":"One change makes comparison easier.","sq":"Një ndryshim e bën krahasimin më të lehtë."}'::jsonb),
('q0-7',0,'{"en":"Must two routes to one flag always behave the same?","sq":"A sillen gjithmonë njësoj dy rrugë drejt një flamuri?"}'::jsonb,'{"en":["Yes","No, obstacles can differ","Only if they are long"],"sq":["Po","Jo, pengesat mund të ndryshojnë","Vetëm nëse janë të gjata"]}'::jsonb,1,'{"en":"Order matters when obstacles are present.","sq":"Rendi ka rëndësi kur ka pengesa."}'::jsonb),
('q1-0',1,'{"en":"Energy starts at 5. Collect three times. New value?","sq":"Energjia nis në 5. Mblidh tri herë. Vlera e re?"}'::jsonb,'{"en":["8","3","15"],"sq":["8","3","15"]}'::jsonb,0,'{"en":"Each collection adds one.","sq":"Çdo mbledhje shton një."}'::jsonb),
('q1-1',1,'{"en":"At energy 8, is energy ≥ 8 true?","sq":"Në energji 8, a është energjia ≥ 8 e vërtetë?"}'::jsonb,'{"en":["No","Yes","Only with a key"],"sq":["Jo","Po","Vetëm me çelës"]}'::jsonb,1,'{"en":"Greater than or equal includes equality.","sq":"Më e madhe ose e barabartë përfshin barazinë."}'::jsonb),
('q1-2',1,'{"en":"True AND false equals…","sq":"E vërtetë AND e gabuar jep…"}'::jsonb,'{"en":["True","False","Both"],"sq":["E vërtetë","E gabuar","Të dyja"]}'::jsonb,1,'{"en":"AND requires both conditions to be true.","sq":"AND kërkon që të dy kushtet të jenë të vërteta."}'::jsonb),
('q1-3',1,'{"en":"False OR true equals…","sq":"E gabuar OR e vërtetë jep…"}'::jsonb,'{"en":["False","True","No result"],"sq":["E gabuar","E vërtetë","Pa rezultat"]}'::jsonb,1,'{"en":"OR needs at least one true condition.","sq":"OR kërkon të paktën një kusht të vërtetë."}'::jsonb),
('q1-4',1,'{"en":"NOT true equals…","sq":"NOT e vërtetë jep…"}'::jsonb,'{"en":["True","False","1"],"sq":["E vërtetë","E gabuar","1"]}'::jsonb,1,'{"en":"NOT reverses the value.","sq":"NOT përmbys vlerën."}'::jsonb),
('q1-5',1,'{"en":"What can 1 represent in our logic puzzles?","sq":"Çfarë mund të përfaqësojë 1 në lojërat logjike?"}'::jsonb,'{"en":["An error","True","A password"],"sq":["Gabim","E vërtetë","Fjalëkalim"]}'::jsonb,1,'{"en":"We use 1 for true and 0 for false.","sq":"Përdorim 1 për të vërtetë dhe 0 për të gabuar."}'::jsonb),
('q1-6',1,'{"en":"True OR true equals…","sq":"E vërtetë OR e vërtetë jep…"}'::jsonb,'{"en":["False","True","Only one may be true"],"sq":["E gabuar","E vërtetë","Vetëm njëra mund të jetë e vërtetë"]}'::jsonb,1,'{"en":"OR also allows both conditions to be true.","sq":"OR lejon që të dy kushtet të jenë të vërteta."}'::jsonb),
('q1-7',1,'{"en":"What is a variable?","sq":"Çfarë është ndryshorja?"}'::jsonb,'{"en":["A named stored value","An unchangeable tree","A quiz answer"],"sq":["Një vlerë e ruajtur me emër","Një pemë e pandryshueshme","Përgjigje kuizi"]}'::jsonb,0,'{"en":"Variables hold values that a program can use or change.","sq":"Ndryshoret ruajnë vlera që programi përdor ose ndryshon."}'::jsonb),
('q2-0',2,'{"en":"When does ELSE run?","sq":"Kur ekzekutohet PËRNDRYSHE?"}'::jsonb,'{"en":["Always","When the IF condition is false","Before IF"],"sq":["Gjithmonë","Kur kushti NËSE është i gabuar","Para NËSE"]}'::jsonb,1,'{"en":"Only the selected branch runs.","sq":"Ekzekutohet vetëm dega e zgjedhur."}'::jsonb),
('q2-1',2,'{"en":"IF energy < 8 then collect. Starting at 5, final energy?","sq":"NËSE energjia < 8, mblidh. Duke nisur në 5, sa bëhet?"}'::jsonb,'{"en":["8","6","5"],"sq":["8","6","5"]}'::jsonb,1,'{"en":"An IF does not automatically repeat.","sq":"NËSE nuk përsëritet automatikisht."}'::jsonb),
('q2-2',2,'{"en":"What does SWITCH compare?","sq":"Çfarë krahason SWITCH?"}'::jsonb,'{"en":["A value with named cases","Every block at once","Only true and false"],"sq":["Një vlerë me raste të emërtuara","Të gjithë blloqet njëherësh","Vetëm të vërtetë dhe të gabuar"]}'::jsonb,0,'{"en":"A case matches the selected value.","sq":"Rasti përputhet me vlerën e zgjedhur."}'::jsonb),
('q2-3',2,'{"en":"Why include a default case?","sq":"Pse përfshijmë rastin parazgjedhje?"}'::jsonb,'{"en":["To repeat forever","To handle unmatched values","To delete other cases"],"sq":["Për të përsëritur pafund","Për vlera që nuk përputhen","Për të fshirë rastet e tjera"]}'::jsonb,1,'{"en":"Default supplies a fallback behavior.","sq":"Parazgjedhja jep sjellje rezervë."}'::jsonb),
('q2-4',2,'{"en":"Which test checks the exact number that opens the door?","sq":"Cila provë kontrollon numrin e saktë që hap derën?"}'::jsonb,'{"en":["Only energy 100","Energy exactly 8","Never testing"],"sq":["Vetëm energjia 100","Energjia saktësisht 8","Pa prova"]}'::jsonb,1,'{"en":"Try exactly 8, not only 7 or 9.","sq":"Provo saktësisht 8, jo vetëm 7 ose 9."}'::jsonb),
('q2-5',2,'{"en":"One IF is inside another. Which do you check first?","sq":"Një NËSE është brenda një tjetri. Cilin kontrollon së pari?"}'::jsonb,'{"en":["Outside inward","Ignore the outside","Randomly"],"sq":["Nga jashtë brenda","Shpërfill të jashtmin","Rastësisht"]}'::jsonb,0,'{"en":"The outer branch determines whether the inner IF runs.","sq":"Dega e jashtme përcakton nëse ekzekutohet NËSE i brendshëm."}'::jsonb),
('q2-6',2,'{"en":"Signal is green. Which switch branch runs?","sq":"Sinjali është i gjelbër. Cila degë ekzekutohet?"}'::jsonb,'{"en":["Red","Green","All branches"],"sq":["E kuqe","E gjelbër","Të gjitha"]}'::jsonb,1,'{"en":"Only the matching case is selected.","sq":"Zgjidhet vetëm rasti që përputhet."}'::jsonb),
('q2-7',2,'{"en":"Which block chooses one thing instead of doing it again?","sq":"Cili bllok zgjedh një gjë në vend që ta bëjë përsëri?"}'::jsonb,'{"en":["IF / ELSE","REPEAT 5","WHILE"],"sq":["NËSE / PËRNDRYSHE","PËRSËRIT 5","WHILE"]}'::jsonb,0,'{"en":"Conditions choose a branch; loops repeat work.","sq":"Kushtet zgjedhin degë; ciklet përsërisin punën."}'::jsonb),
('q3-0',3,'{"en":"Repeat 3 times {right; down}. Number of moves?","sq":"Përsërit 3 herë {djathtas; poshtë}. Sa lëvizje?"}'::jsonb,'{"en":["3","5","6"],"sq":["3","5","6"]}'::jsonb,2,'{"en":"Two moves repeated three times make six.","sq":"Dy lëvizje tri herë bëjnë gjashtë."}'::jsonb),
('q3-1',3,'{"en":"WHILE checks first. The answer is no. How many times does it run?","sq":"WHILE kontrollon së pari. Përgjigjja është jo. Sa herë ekzekutohet?"}'::jsonb,'{"en":["0","1","Always 3"],"sq":["0","1","Gjithmonë 3"]}'::jsonb,0,'{"en":"WHILE checks before entering.","sq":"WHILE kontrollon para hyrjes."}'::jsonb),
('q3-2',3,'{"en":"DO / WHILE does it once before checking. What is the smallest number of runs?","sq":"DO / WHILE e bën një herë para kontrollit. Cili është numri më i vogël i ekzekutimeve?"}'::jsonb,'{"en":["0","1","Infinite"],"sq":["0","1","Pafund"]}'::jsonb,1,'{"en":"The body runs before the first check.","sq":"Trupi ekzekutohet para kontrollit të parë."}'::jsonb),
('q3-3',3,'{"en":"What helps a WHILE block finish?","sq":"Çfarë e ndihmon një bllok WHILE të përfundojë?"}'::jsonb,'{"en":["Nothing changes","A changing value makes the condition false","More copies of the same loop"],"sq":["Asgjë nuk ndryshon","Një vlerë që ndryshon e bën kushtin të gabuar","Më shumë kopje të ciklit"]}'::jsonb,1,'{"en":"A loop needs a reachable stopping condition.","sq":"Ciklit i duhet kusht ndalimi i arritshëm."}'::jsonb),
('q3-4',3,'{"en":"You make a shortcut (function). Does making it also run it?","sq":"Krijon një shkurtore (funksion). A ekzekutohet vetëm nga krijimi?"}'::jsonb,'{"en":["Yes","No, calling it does","Only on Monday"],"sq":["Po","Jo, e ekzekuton thirrja","Vetëm të hënën"]}'::jsonb,1,'{"en":"Definition stores instructions; a call executes them.","sq":"Përcaktimi ruan udhëzimet; thirrja i ekzekuton."}'::jsonb),
('q3-5',3,'{"en":"Shortcut = {right; right}. Use it twice. How many moves?","sq":"Shkurtorja = {djathtas; djathtas}. Përdore dy herë. Sa lëvizje?"}'::jsonb,'{"en":["2","4","8"],"sq":["2","4","8"]}'::jsonb,1,'{"en":"Two calls each execute two moves.","sq":"Dy thirrje ekzekutojnë nga dy lëvizje."}'::jsonb),
('q3-6',3,'{"en":"Why use a shortcut (function)?","sq":"Pse përdorim një shkurtore (funksion)?"}'::jsonb,'{"en":["To fix shared steps in one place","To avoid naming things","To stop all testing"],"sq":["Për të korrigjuar hapa të përbashkët në një vend","Për të shmangur emërtimin","Për të ndalur provat"]}'::jsonb,0,'{"en":"A shared definition keeps repeated behavior consistent.","sq":"Përcaktimi i përbashkët i mban përsëritjet të njëjta."}'::jsonb),
('q3-7',3,'{"en":"WHILE energy < 8: move right. Energy never changes. Risk?","sq":"WHILE energjia < 8: lëviz djathtas. Energjia nuk ndryshon. Rreziku?"}'::jsonb,'{"en":["The condition may never become false","It always runs once","It collects energy"],"sq":["Kushti mund të mos bëhet kurrë i gabuar","Ekzekutohet gjithmonë një herë","Mbledh energji"]}'::jsonb,0,'{"en":"Movement does not change energy in this playground.","sq":"Lëvizja nuk ndryshon energjinë në këtë lojë."}'::jsonb),
('q4-0',4,'{"en":"What should happen before a big build?","sq":"Çfarë duhet bërë para ndërtimit të madh?"}'::jsonb,'{"en":["Plan smaller parts","Skip testing","Copy without reading"],"sq":["Planifiko pjesët e vogla","Shmang provat","Kopjo pa lexuar"]}'::jsonb,0,'{"en":"Small parts are easier to build and try.","sq":"Pjesët e vogla ndërtohen dhe provohen më lehtë."}'::jsonb),
('q4-1',4,'{"en":"Which comment helps your friend fix the game?","sq":"Cili koment e ndihmon shokun ta rregullojë lojën?"}'::jsonb,'{"en":["Bad game","At energy 8 the gate stayed closed","I refuse to test"],"sq":["Lojë e keqe","Në energji 8 porta mbeti mbyllur","Nuk dua ta provoj"]}'::jsonb,1,'{"en":"Specific observations can be reproduced.","sq":"Vëzhgimet e sakta mund të riprovohen."}'::jsonb),
('q4-2',4,'{"en":"Can you trust a helper’s answer without trying it?","sq":"A mund t’i besosh përgjigjes së ndihmësit pa e provuar?"}'::jsonb,'{"en":["Yes","No, test it","Only when long"],"sq":["Po","Jo, provoje","Vetëm kur është e gjatë"]}'::jsonb,1,'{"en":"Sounding sure does not mean the answer is right. Try it.","sq":"Të folurit me siguri nuk do të thotë se përgjigjja është e saktë. Provoje."}'::jsonb),
('q4-3',4,'{"en":"What should stay out of prompts?","sq":"Çfarë duhet lënë jashtë kërkesave?"}'::jsonb,'{"en":["Imaginary ship names","Coding goals","Passwords and home addresses"],"sq":["Emrat imagjinarë të anijeve","Qëllimet e kodimit","Fjalëkalimet dhe adresat e shtëpisë"]}'::jsonb,2,'{"en":"Keep personal information private.","sq":"Mbaji private të dhënat personale."}'::jsonb),
('q4-4',4,'{"en":"A helper ignores your rules. What next?","sq":"Ndihmësi shpërfill rregullat. Çfarë bën?"}'::jsonb,'{"en":["Apply anyway","Identify the missed rule and revise","Give your password"],"sq":["Zbatoje gjithsesi","Gjej rregullin e humbur dhe përmirësoje","Jep fjalëkalimin"]}'::jsonb,1,'{"en":"Check whether the answer follows your rules.","sq":"Kontrollo nëse përgjigjja ndjek rregullat e tua."}'::jsonb),
('q4-5',4,'{"en":"Which numbers should you test for energy 8 or more?","sq":"Cilët numra duhet të provosh për energjinë 8 e më shumë?"}'::jsonb,'{"en":["Only 9","7, 8 and 9","Only 100"],"sq":["Vetëm 9","7, 8 dhe 9","Vetëm 100"]}'::jsonb,1,'{"en":"Test below, at and above the boundary.","sq":"Provo poshtë, në dhe sipër kufirit."}'::jsonb),
('q4-6',4,'{"en":"What is our local helper?","sq":"Çfarë është ndihmësi ynë lokal?"}'::jsonb,'{"en":["An all-knowing person","A helper that knows a few game commands","A replacement for testing"],"sq":["Një person që di gjithçka","Një ndihmës që njeh disa komanda të lojës","Zëvendësim i provave"]}'::jsonb,1,'{"en":"It supports specific commands and course knowledge.","sq":"Mbështet komanda të caktuara dhe njohuri të kursit."}'::jsonb),
('q4-7',4,'{"en":"How can you show that a fix worked?","sq":"Si tregon se korrigjimi funksionoi?"}'::jsonb,'{"en":["Repeat the same test and compare","Stop running the code","Hide the error"],"sq":["Përsërit të njëjtën provë dhe krahaso","Mos e ekzekuto më kodin","Fshih gabimin"]}'::jsonb,0,'{"en":"A comparable test provides evidence.","sq":"Një provë e krahasueshme jep dëshmi."}'::jsonb) on conflict(id) do update set text=excluded.text,options=excluded.options,answer=excluded.answer,explanation=excluded.explanation;
commit;
