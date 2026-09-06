-- Course announcements are private to assigned teachers, enrolled students,
-- and administrators. General announcements remain visible to everyone.

create or replace function can_read_course_announcement(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    is_admin()
    or exists (
      select 1
      from course_teachers ct
      join teachers t on t.profile_id = ct.teacher_id
      where ct.course_id = p_course_id
        and ct.teacher_id = auth.uid()
        and t.status = 'approved'
    )
    or exists (
      select 1
      from enrollments e
      join students s on s.id = e.student_id
      where e.course_id = p_course_id
        and e.status = 'active'
        and s.profile_id = auth.uid()
    )
$$;

revoke all on function can_read_course_announcement(uuid) from public;
grant execute on function can_read_course_announcement(uuid) to authenticated;

drop policy if exists announcements_read_all on announcements;
create policy announcements_read_all on announcements for select
  using (
    course_id is null
    or can_read_course_announcement(course_id)
  );