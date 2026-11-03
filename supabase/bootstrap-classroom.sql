-- Run setup.sql FIRST. Then edit the email addresses below and run this file
-- in the Supabase SQL editor as the project owner. Accounts must already exist
-- in Authentication > Users. This script never sets or changes passwords.
begin;
do $$
declare
 teacher_email text := 'CHANGE_ME_TEACHER_EMAIL';
 student_email text := 'CHANGE_ME_STUDENT_EMAIL';
 -- Optional: your own owner account. Leave empty to create no superadmin.
 owner_email text := '';
 classroom_name text := 'PixelPilot - Class 1';
 student_nickname text := 'Robot One';
 teacher_id uuid; student_id uuid; owner_id uuid; classroom_id uuid;
begin
 if teacher_email like 'CHANGE_ME%' or student_email like 'CHANGE_ME%' then raise exception 'Replace the teacher and student email placeholders first.';end if;
 select id into teacher_id from auth.users where lower(email)=lower(trim(teacher_email));
 select id into student_id from auth.users where lower(email)=lower(trim(student_email));
 if teacher_id is null or student_id is null then raise exception 'An email was not found in Authentication > Users. Create both accounts first.';end if;
 if teacher_id=student_id then raise exception 'Teacher and student must be different accounts.';end if;
 if trim(owner_email)<>'' then
 select id into owner_id from auth.users where lower(email)=lower(trim(owner_email));
 if owner_id is null then raise exception 'Owner email was not found in Authentication > Users.';end if;
 if owner_id=student_id then raise exception 'The student account cannot be the owner account.';end if;
 end if;
 -- Never silently demote an existing owner when re-running the classroom setup.
 insert into public.app_roles values(teacher_id,'teacher') on conflict(user_id) do update set role=case when app_roles.role='superadmin' then 'superadmin' else 'teacher' end;
 insert into public.app_roles values(student_id,'student') on conflict(user_id) do nothing;
 if (select role from public.app_roles where user_id=student_id)<>'student' then raise exception 'The selected student already has a privileged role. Choose a student account.';end if;
 if owner_id is not null then insert into public.app_roles values(owner_id,'superadmin') on conflict(user_id) do update set role='superadmin';end if;
 if (select count(*) from public.classrooms where name=classroom_name)>1 then raise exception 'Duplicate classroom names exist; choose a unique name.';end if;
 select id into classroom_id from public.classrooms where name=classroom_name;
 if classroom_id is null then insert into public.classrooms(name) values(classroom_name) returning id into classroom_id;end if;
 insert into public.class_teachers values(classroom_id,teacher_id) on conflict do nothing;
 insert into public.class_members values(classroom_id,student_id,student_nickname) on conflict(class_id,user_id) do update set nickname=excluded.nickname;
end;$$;
commit;
-- Verify the assignment (run only in the project owner's SQL editor).
select u.email,r.role from public.app_roles r join auth.users u on u.id=r.user_id order by r.role,u.email;
