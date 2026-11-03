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
