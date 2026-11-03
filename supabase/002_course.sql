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
