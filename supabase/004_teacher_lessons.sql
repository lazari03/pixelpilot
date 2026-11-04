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
