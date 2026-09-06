-- Break the classes <-> class_students RLS recursion. Cross-table membership
-- checks run as table owner and expose only booleans to policies.

create or replace function is_class_student_participant(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from class_students cs
    join students s on s.id = cs.student_id
    where cs.class_id = p_class_id
      and s.profile_id = auth.uid()
  )
$$;

create or replace function is_class_teacher(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from classes c
    where c.id = p_class_id
      and c.teacher_id = auth.uid()
  )
$$;

revoke all on function is_class_student_participant(uuid) from public;
revoke all on function is_class_teacher(uuid) from public;
grant execute on function is_class_student_participant(uuid) to authenticated;
grant execute on function is_class_teacher(uuid) to authenticated;

drop policy if exists classes_select on classes;
create policy classes_select on classes for select
  using (
    teacher_id = auth.uid()
    or is_admin()
    or is_class_student_participant(id)
  );

drop policy if exists class_students_select on class_students;
create policy class_students_select on class_students for select
  using (
    owns_student(student_id)
    or is_admin()
    or is_class_teacher(class_id)
  );

drop policy if exists class_students_delete on class_students;
create policy class_students_delete on class_students for delete
  using (
    owns_student(student_id)
    or is_admin()
    or is_class_teacher(class_id)
  );

drop policy if exists attendance_select on attendance;
create policy attendance_select on attendance for select
  using (
    owns_student(student_id)
    or is_admin()
    or is_class_teacher(class_id)
  );

drop policy if exists attendance_write on attendance;
create policy attendance_write on attendance for all
  using (is_admin() or is_class_teacher(class_id))
  with check (is_admin() or is_class_teacher(class_id));