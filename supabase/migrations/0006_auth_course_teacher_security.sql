-- ============================================================================
-- Auth hardening and assigned course-teacher access
-- ============================================================================

-- Public Auth metadata is not a trusted source of privileged roles. The only
-- non-parent path is the explicit teacher application signup flow.
create or replace function handle_new_user() returns trigger as $$
declare
  v_role user_role := case
    when new.raw_user_meta_data->>'signup_kind' = 'teacher_application' then 'teacher'::user_role
    else 'parent'::user_role
  end;
begin
  insert into profiles (id, role, first_name, last_name, email, phone, country, preferred_language)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  );

  if v_role = 'parent' then
    insert into parents (profile_id) values (new.id);
  else
    insert into teachers (profile_id) values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create table course_teachers (
  course_id uuid not null references courses(id) on delete cascade,
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  assigned_by uuid not null default auth.uid() references profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);

create index idx_course_teachers_teacher on course_teachers(teacher_id);

alter table courses add column meeting_url text;
alter table announcements add column course_id uuid references courses(id) on delete cascade;
create index idx_announcements_course on announcements(course_id);

-- Security-definer helper avoids recursive policy checks while ensuring that a
-- pending, rejected, or suspended teacher cannot act on an assignment.
create or replace function is_assigned_course_teacher(p_course_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_approved_teacher()
    and exists (
      select 1
      from course_teachers ct
      where ct.course_id = p_course_id
        and ct.teacher_id = auth.uid()
    );
$$;

alter table course_teachers enable row level security;
drop policy if exists course_teachers_select on course_teachers;
drop policy if exists course_teachers_admin_manage on course_teachers;
create policy course_teachers_select on course_teachers for select
  using (teacher_id = auth.uid() or is_admin());
create policy course_teachers_admin_manage on course_teachers for all
  using (is_admin()) with check (is_admin());

-- Courses remain administered centrally. Assigned approved teachers may read
-- their assignments but never insert, publish, or generally update courses.
drop policy if exists courses_select on courses;
drop policy if exists courses_write_owner on courses;
drop policy if exists courses_update_owner on courses;
create policy courses_select on courses for select
  using (
    status = 'published'
    or is_admin()
    or (is_scholar() and is_islamic)
    or is_assigned_course_teacher(id)
  );
create policy courses_write_owner on courses for insert
  with check (is_admin());
create policy courses_update_owner on courses for update
  using (is_admin()) with check (is_admin());

drop policy if exists course_modules_select on course_modules;
drop policy if exists course_modules_write_owner on course_modules;
create policy course_modules_select on course_modules for select
  using (
    exists (select 1 from courses c where c.id = course_id and c.status = 'published')
    or is_admin()
    or is_assigned_course_teacher(course_id)
  );
create policy course_modules_write_owner on course_modules for all
  using (is_admin() or is_assigned_course_teacher(course_id))
  with check (is_admin() or is_assigned_course_teacher(course_id));

drop policy if exists lessons_select on lessons;
drop policy if exists lessons_write_owner on lessons;
create policy lessons_select on lessons for select
  using (
    is_admin()
    or exists (
      select 1 from course_modules m
      join enrollments e on e.course_id = m.course_id
      where m.id = module_id and owns_student(e.student_id) and e.status = 'active'
    )
    or exists (
      select 1 from course_modules m
      where m.id = module_id and is_assigned_course_teacher(m.course_id)
    )
  );
create policy lessons_write_owner on lessons for all
  using (
    is_admin()
    or exists (
      select 1 from course_modules m
      where m.id = module_id and is_assigned_course_teacher(m.course_id)
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from course_modules m
      where m.id = module_id and is_assigned_course_teacher(m.course_id)
    )
  );

drop policy if exists assignments_select on assignments;
drop policy if exists assignments_write_owner on assignments;
create policy assignments_select on assignments for select
  using (
    is_admin()
    or is_assigned_course_teacher(course_id)
    or exists (
      select 1 from enrollments e where e.course_id = course_id and owns_student(e.student_id) and e.status = 'active'
    )
  );
create policy assignments_write_owner on assignments for all
  using (is_admin() or is_assigned_course_teacher(course_id))
  with check (is_admin() or is_assigned_course_teacher(course_id));

-- General announcements preserve their existing public visibility. Course
-- announcements are visible only to users allowed to select that course.
drop policy if exists announcements_read_all on announcements;
drop policy if exists announcements_write_admin on announcements;
drop policy if exists announcements_write_admin_or_assigned_teacher on announcements;
create policy announcements_read_all on announcements for select
  using (
    course_id is null
    or exists (select 1 from courses c where c.id = course_id)
  );
create policy announcements_write_admin_or_assigned_teacher on announcements for all
  using (
    is_admin()
    or (
      course_id is not null
      and created_by = auth.uid()
      and is_assigned_course_teacher(course_id)
    )
  )
  with check (
    is_admin()
    or (
      course_id is not null
      and created_by = auth.uid()
      and is_assigned_course_teacher(course_id)
    )
  );

-- This RPC updates related application and teacher records in one transaction.
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

  update teachers
  set status = p_teacher_status,
      approved_at = case when p_teacher_status = 'approved' then now() else null end,
      approved_by = case when p_teacher_status = 'approved' then auth.uid() else null end
  where profile_id = v_application.profile_id;

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

-- Teachers cannot directly update courses. This narrow operation is the sole
-- teacher write path for a course meeting URL.
create or replace function set_course_meeting_url(
  p_course_id uuid,
  p_meeting_url text
) returns courses
language plpgsql security definer set search_path = public as $$
declare
  v_course courses;
begin
  if not is_assigned_course_teacher(p_course_id) then
    raise exception 'not authorized for this course';
  end if;

  update courses
  set meeting_url = p_meeting_url
  where id = p_course_id
  returning * into v_course;

  if not found then
    raise exception 'course not found';
  end if;

  return v_course;
end;
$$;

revoke all on function review_teacher_application(uuid, application_status, teacher_status, text) from public;
revoke all on function review_teacher_application(uuid, application_status, teacher_status, text) from anon;
grant execute on function review_teacher_application(uuid, application_status, teacher_status, text) to authenticated;
revoke all on function set_course_meeting_url(uuid, text) from public;
revoke all on function set_course_meeting_url(uuid, text) from anon;
grant execute on function set_course_meeting_url(uuid, text) to authenticated;