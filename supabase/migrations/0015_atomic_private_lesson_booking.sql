-- Book private lessons atomically instead of permitting students to insert
-- directly into classes, class_students, and invoices in separate requests.

create or replace function book_private_lesson(
  p_teacher_id uuid,
  p_subject_id uuid,
  p_start_datetime timestamptz,
  p_end_datetime timestamptz,
  p_timezone text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student students;
  v_teacher teachers;
  v_subject_name text;
  v_teacher_name text;
  v_class_id uuid;
  v_duration_minutes numeric;
begin
  if auth_role() <> 'student' then
    raise exception 'student account required';
  end if;

  select * into v_student
  from students
  where profile_id = auth.uid();
  if not found then raise exception 'student profile not found'; end if;

  if p_start_datetime <= now() then
    raise exception 'lesson must be booked in the future';
  end if;

  v_duration_minutes := extract(epoch from (p_end_datetime - p_start_datetime)) / 60;
  if v_duration_minutes not in (30, 45, 60, 90) then
    raise exception 'invalid lesson duration';
  end if;

  select t.* into v_teacher
  from teachers t
  join teacher_subjects ts
    on ts.teacher_id = t.profile_id
   and ts.subject_id = p_subject_id
  where t.profile_id = p_teacher_id
    and t.status = 'approved'
    and v_student.current_grade = any(ts.grade_levels);
  if not found then
    raise exception 'teacher is not approved for this subject and grade';
  end if;

  select name into v_subject_name from subjects where id = p_subject_id;
  if not found then raise exception 'subject not found'; end if;

  select trim(first_name || ' ' || last_name) into v_teacher_name
  from profiles where id = p_teacher_id;

  insert into classes (
    subject_id,
    teacher_id,
    title,
    start_datetime,
    end_datetime,
    timezone,
    provider,
    status,
    cancellation_policy,
    created_by
  ) values (
    p_subject_id,
    p_teacher_id,
    v_subject_name || ' with ' || v_teacher_name,
    p_start_datetime,
    p_end_datetime,
    p_timezone,
    'zoom',
    'scheduled',
    'Free cancellation up to 24 hours before the class.',
    auth.uid()
  )
  returning id into v_class_id;

  insert into class_students (
    class_id,
    student_id,
    booked_by,
    price_charged
  ) values (
    v_class_id,
    v_student.id,
    auth.uid(),
    round(coalesce(v_teacher.hourly_price, 0) * v_duration_minutes / 60, 2)
  );

  perform create_private_lesson_invoice(v_class_id);
  return v_class_id;
end;
$$;

revoke all on function book_private_lesson(uuid, uuid, timestamptz, timestamptz, text) from public;
grant execute on function book_private_lesson(uuid, uuid, timestamptz, timestamptz, text) to authenticated;

-- Students book through the validated function above. Keep direct class
-- inserts limited to administrators and approved teachers.
drop policy if exists classes_write on classes;
create policy classes_write on classes for insert
  with check (
    is_admin()
    or (teacher_id = auth.uid() and is_approved_teacher())
  );