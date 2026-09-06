-- Keep teacher approval, subject authorization, course assignment, and student
-- enrollment consistent at the database boundary.

create or replace function review_teacher_application(
  p_application_id uuid,
  p_application_status application_status,
  p_teacher_status teacher_status,
  p_admin_message text default null
) returns teacher_applications
language plpgsql security definer set search_path = public as $$
declare
  v_application teacher_applications;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_application
  from teacher_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'teacher application not found';
  end if;

  insert into teachers (
    profile_id,
    status,
    years_experience,
    languages,
    approved_at,
    approved_by
  )
  values (
    v_application.profile_id,
    p_teacher_status,
    coalesce(v_application.years_experience, 0),
    coalesce(v_application.languages, '{}'::text[]),
    case when p_teacher_status = 'approved' then now() else null end,
    case when p_teacher_status = 'approved' then auth.uid() else null end
  )
  on conflict (profile_id) do update
  set status = excluded.status,
      years_experience = excluded.years_experience,
      languages = excluded.languages,
      approved_at = excluded.approved_at,
      approved_by = excluded.approved_by;

  if p_teacher_status = 'approved' then
    insert into teacher_subjects (teacher_id, subject_id, grade_levels)
    select
      v_application.profile_id,
      s.id,
      coalesce(v_application.grade_levels, '{}'::text[])
    from subjects s
    where exists (
      select 1
      from unnest(coalesce(v_application.subjects, '{}'::text[])) requested_subject(name)
      where lower(trim(requested_subject.name)) = lower(trim(s.name))
    )
    on conflict (teacher_id, subject_id) do update
    set grade_levels = excluded.grade_levels;

    insert into course_teachers (course_id, teacher_id, assigned_by)
    select c.id, v_application.profile_id, auth.uid()
    from courses c
    join teacher_subjects ts
      on ts.subject_id = c.subject_id
     and ts.teacher_id = v_application.profile_id
    on conflict (course_id, teacher_id) do nothing;
  end if;

  update teacher_applications
  set status = p_application_status,
      admin_message = p_admin_message,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

create or replace function assign_approved_teachers_to_course()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into course_teachers (course_id, teacher_id, assigned_by)
  select new.id, t.profile_id, coalesce(t.approved_by, auth.uid())
  from teachers t
  join teacher_subjects ts on ts.teacher_id = t.profile_id
  where t.status = 'approved'
    and ts.subject_id = new.subject_id
    and coalesce(t.approved_by, auth.uid()) is not null
  on conflict (course_id, teacher_id) do nothing;

  return new;
end;
$$;

drop trigger if exists courses_assign_approved_teachers on courses;
create trigger courses_assign_approved_teachers
after insert or update of subject_id on courses
for each row execute function assign_approved_teachers_to_course();

create or replace function enroll_student_in_published_courses()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into enrollments (student_id, course_id, status)
  select new.id, c.id, 'active'
  from courses c
  where c.status = 'published'
  on conflict (student_id, course_id) do nothing;

  return new;
end;
$$;

drop trigger if exists students_enroll_in_published_courses on students;
create trigger students_enroll_in_published_courses
after insert on students
for each row execute function enroll_student_in_published_courses();

create or replace function enroll_all_students_when_course_published()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into enrollments (student_id, course_id, status)
    select s.id, new.id, 'active'
    from students s
    on conflict (student_id, course_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists courses_enroll_students_on_publish on courses;
create trigger courses_enroll_students_on_publish
after insert or update of status on courses
for each row execute function enroll_all_students_when_course_published();

revoke all on function assign_approved_teachers_to_course() from public;
revoke all on function enroll_student_in_published_courses() from public;
revoke all on function enroll_all_students_when_course_published() from public;

-- Repair previously approved applications and their matching assignments.
insert into teachers (
  profile_id,
  status,
  years_experience,
  languages,
  approved_at,
  approved_by
)
select
  ta.profile_id,
  'approved',
  coalesce(ta.years_experience, 0),
  coalesce(ta.languages, '{}'::text[]),
  coalesce(ta.reviewed_at, now()),
  ta.reviewed_by
from teacher_applications ta
where ta.status = 'approved'
on conflict (profile_id) do update
set status = 'approved',
    years_experience = excluded.years_experience,
    languages = excluded.languages,
    approved_at = excluded.approved_at,
    approved_by = excluded.approved_by;

insert into teacher_subjects (teacher_id, subject_id, grade_levels)
select
  ta.profile_id,
  s.id,
  coalesce(ta.grade_levels, '{}'::text[])
from teacher_applications ta
join subjects s on exists (
  select 1
  from unnest(coalesce(ta.subjects, '{}'::text[])) requested_subject(name)
  where lower(trim(requested_subject.name)) = lower(trim(s.name))
)
where ta.status = 'approved'
on conflict (teacher_id, subject_id) do update
set grade_levels = excluded.grade_levels;

insert into course_teachers (course_id, teacher_id, assigned_by)
select c.id, t.profile_id, coalesce(t.approved_by, ta.reviewed_by)
from teachers t
join teacher_subjects ts on ts.teacher_id = t.profile_id
join courses c on c.subject_id = ts.subject_id
join teacher_applications ta on ta.profile_id = t.profile_id and ta.status = 'approved'
where t.status = 'approved'
  and coalesce(t.approved_by, ta.reviewed_by) is not null
on conflict (course_id, teacher_id) do nothing;

-- Existing children should immediately see all courses already published.
insert into enrollments (student_id, course_id, status)
select s.id, c.id, 'active'
from students s
cross join courses c
where c.status = 'published'
on conflict (student_id, course_id) do nothing;