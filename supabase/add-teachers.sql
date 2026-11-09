-- Run in Supabase SQL Editor as the project owner after setup.sql and
-- bootstrap-classroom.sql. Both accounts must exist in Authentication > Users.
-- Assigns roles and classroom access; does not create users or change passwords.
begin;
do $$
declare
 teacher_emails text[] := array['esterlelci@yahoo.com','suisashehi08@gmail.com'];
 classroom_name text := 'PixelPilot - Class 1';
 classroom_id uuid;
 teacher_email text;
 teacher_id uuid;
begin
 if (select count(*) from public.classrooms where name=classroom_name)<>1 then
 raise exception 'Expected one classroom named %. Run bootstrap-classroom.sql or set a unique classroom_name.',classroom_name;
 end if;
 select id into classroom_id from public.classrooms where name=classroom_name;
 -- Validate every account first. Missing accounts leave no partial assignments.
 foreach teacher_email in array teacher_emails loop
 if not exists(select 1 from auth.users where lower(email)=lower(trim(teacher_email))) then
 raise exception 'Create the account % in Authentication > Users first.',teacher_email;
 end if;
 end loop;
 foreach teacher_email in array teacher_emails loop
 select id into teacher_id from auth.users where lower(email)=lower(trim(teacher_email));
 insert into public.app_roles(user_id,role) values(teacher_id,'teacher')
 on conflict(user_id) do update set role=case when app_roles.role='superadmin' then 'superadmin' else 'teacher' end;
 insert into public.class_teachers(class_id,user_id) values(classroom_id,teacher_id) on conflict do nothing;
 end loop;
end;$$;
commit;
select u.email,r.role,c.name as classroom
from public.app_roles r
join auth.users u on u.id=r.user_id
join public.class_teachers t on t.user_id=r.user_id
join public.classrooms c on c.id=t.class_id
where lower(u.email) in ('esterlelci@yahoo.com','suisashehi08@gmail.com');
