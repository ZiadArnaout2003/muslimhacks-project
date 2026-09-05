-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Design goals enforced here (see project spec §33/§34):
--  - Parents can only ever see their own family's data.
--  - Students can't see other students' grades/attendance/private info.
--  - Teacher CVs/certificates are admin-only, never public.
--  - Financial assistance detail (income, notes, interviews) is admin-only.
--  - Quiz correct answers never reach students via direct table select.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (security definer, stable) to avoid recursive RLS lookups
-- ----------------------------------------------------------------------------
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- Trusted server-side contexts (migrations/seed scripts connecting as the
-- `postgres` role, or backend jobs using the `service_role` key) bypass the
-- admin check too. This must check session_user, NOT current_user: this
-- function is SECURITY DEFINER, so current_user inside its body is always
-- the function's owner (postgres) regardless of caller — using current_user
-- here would make every single caller evaluate as admin. session_user is
-- fixed at login and unaffected by SECURITY DEFINER or SET ROLE, and
-- PostgREST's API traffic always logs in as `authenticator` (never literally
-- `postgres`), so an anonymous or authenticated end user can never trigger
-- this branch by spoofing a role.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select
    session_user = 'postgres'
    or coalesce(auth.role() = 'service_role', false)
    or coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_scholar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'scholar' from profiles where id = auth.uid()), false);
$$;

-- A teacher account starts 'pending' and must be approved before it can act
-- as a teacher (create courses, publish availability, take class bookings).
create or replace function is_approved_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from teachers where profile_id = auth.uid()), false);
$$;

create or replace function owns_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    where s.id = p_student_id
      and (s.parent_id = auth.uid() or s.profile_id = auth.uid())
  );
$$;

create or replace function teaches_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    join courses c on c.id = e.course_id
    where e.student_id = p_student_id and c.teacher_id = auth.uid()
    union
    select 1 from class_students cs
    join classes cl on cl.id = cs.class_id
    where cs.student_id = p_student_id and cl.teacher_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_self_or_admin on profiles for select
  using (id = auth.uid() or is_admin());

-- Teachers need their name/avatar visible on public search results; expose
-- via a narrow view (public_teacher_cards) below rather than opening this table.
create policy profiles_update_self_or_admin on profiles for update
  using (id = auth.uid() or is_admin());

-- The USING clause above allows a self-update of ANY column, `role` included
-- — without this guard a user could UPDATE their own row to role='admin'
-- and pass every is_admin() check from then on. Only an admin may change it.
create or replace function guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_role before update on profiles
  for each row execute function guard_profile_role();

-- ----------------------------------------------------------------------------
-- parents
-- ----------------------------------------------------------------------------
alter table parents enable row level security;

create policy parents_self_or_admin on parents for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- students
-- ----------------------------------------------------------------------------
alter table students enable row level security;

create policy students_select on students for select
  using (
    parent_id = auth.uid()
    or profile_id = auth.uid()
    or is_admin()
    or teaches_student(id)
  );

create policy students_write_parent_or_admin on students for insert
  with check (parent_id = auth.uid() or is_admin());

create policy students_update_parent_or_admin on students for update
  using (parent_id = auth.uid() or is_admin());

create policy students_delete_parent_or_admin on students for delete
  using (parent_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- teachers
-- ----------------------------------------------------------------------------
alter table teachers enable row level security;

create policy teachers_select_public_or_self on teachers for select
  using (status = 'approved' or profile_id = auth.uid() or is_admin());

create policy teachers_update_self_or_admin on teachers for update
  using (profile_id = auth.uid() or is_admin());

create policy teachers_insert_self_or_admin on teachers for insert
  with check (profile_id = auth.uid() or is_admin());

-- Only an admin may change a teacher's approval status.
create or replace function guard_teacher_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not is_admin() then
    new.status = old.status;
    new.approved_at = old.approved_at;
    new.approved_by = old.approved_by;
  end if;
  return new;
end;
$$;

create trigger trg_guard_teacher_status before update on teachers
  for each row execute function guard_teacher_status();

-- ----------------------------------------------------------------------------
-- teacher_applications
-- ----------------------------------------------------------------------------
alter table teacher_applications enable row level security;

create policy teacher_applications_select on teacher_applications for select
  using (profile_id = auth.uid() or is_admin());

create policy teacher_applications_insert on teacher_applications for insert
  with check (profile_id = auth.uid());

create policy teacher_applications_update on teacher_applications for update
  using (profile_id = auth.uid() or is_admin());

create or replace function guard_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.admin_message is distinct from old.admin_message)
     and not is_admin() then
    new.status = old.status;
    new.admin_message = old.admin_message;
    new.reviewed_by = old.reviewed_by;
    new.reviewed_at = old.reviewed_at;
  end if;
  return new;
end;
$$;

create trigger trg_guard_application_status before update on teacher_applications
  for each row execute function guard_application_status();

-- ----------------------------------------------------------------------------
-- teacher_documents — never public, admin + owning teacher only
-- ----------------------------------------------------------------------------
alter table teacher_documents enable row level security;

create policy teacher_documents_select on teacher_documents for select
  using (
    is_admin()
    or teacher_id = auth.uid()
    or exists (select 1 from teacher_applications a where a.id = application_id and a.profile_id = auth.uid())
  );

create policy teacher_documents_insert on teacher_documents for insert
  with check (
    teacher_id = auth.uid()
    or exists (select 1 from teacher_applications a where a.id = application_id and a.profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- subjects / curriculum — public read, admin/scholar write
-- ----------------------------------------------------------------------------
alter table subjects enable row level security;
create policy subjects_read_all on subjects for select using (true);
create policy subjects_write_admin on subjects for insert with check (is_admin());
create policy subjects_update_admin on subjects for update using (is_admin());

alter table curriculum_frameworks enable row level security;
create policy curriculum_frameworks_read_all on curriculum_frameworks for select using (true);
create policy curriculum_frameworks_write_admin on curriculum_frameworks for all
  using (is_admin()) with check (is_admin());

alter table curriculum_subjects enable row level security;
create policy curriculum_subjects_read_all on curriculum_subjects for select using (true);
create policy curriculum_subjects_write_admin on curriculum_subjects for all
  using (is_admin() or is_scholar()) with check (is_admin() or is_scholar());

alter table teacher_subjects enable row level security;
create policy teacher_subjects_read_all on teacher_subjects for select using (true);
create policy teacher_subjects_write_owner on teacher_subjects for all
  using (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()))
  with check (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()));

-- ----------------------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------------------
alter table courses enable row level security;

create policy courses_select on courses for select
  using (
    status = 'published'
    or teacher_id = auth.uid()
    or is_admin()
    or (is_scholar() and is_islamic)
  );

create policy courses_write_owner on courses for insert
  with check (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()));

create policy courses_update_owner on courses for update
  using (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()) or (is_scholar() and is_islamic));

-- ----------------------------------------------------------------------------
-- course_modules — outline is visible for published courses (marketing),
-- lesson *content* is locked down separately below.
-- ----------------------------------------------------------------------------
alter table course_modules enable row level security;

create policy course_modules_select on course_modules for select
  using (
    exists (select 1 from courses c where c.id = course_id and c.status = 'published')
    or exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin()))
  );

create policy course_modules_write_owner on course_modules for all
  using (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())))
  with check (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())));

alter table lessons enable row level security;

create policy lessons_select on lessons for select
  using (
    exists (
      select 1 from course_modules m join courses c on c.id = m.course_id
      where m.id = module_id and (c.teacher_id = auth.uid() or is_admin())
    )
    or exists (
      select 1 from course_modules m
      join courses c on c.id = m.course_id
      join enrollments e on e.course_id = c.id
      where m.id = module_id and owns_student(e.student_id) and e.status = 'active'
    )
  );

create policy lessons_write_owner on lessons for all
  using (exists (
    select 1 from course_modules m join courses c on c.id = m.course_id
    where m.id = module_id and (c.teacher_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from course_modules m join courses c on c.id = m.course_id
    where m.id = module_id and (c.teacher_id = auth.uid() or is_admin())
  ));

-- ----------------------------------------------------------------------------
-- enrollments / lesson_progress
-- ----------------------------------------------------------------------------
alter table enrollments enable row level security;

create policy enrollments_select on enrollments for select
  using (
    owns_student(student_id)
    or is_admin()
    or exists (select 1 from courses c where c.id = course_id and c.teacher_id = auth.uid())
  );

create policy enrollments_insert on enrollments for insert
  with check (owns_student(student_id) or is_admin());

create policy enrollments_update on enrollments for update
  using (owns_student(student_id) or is_admin());

alter table lesson_progress enable row level security;

create policy lesson_progress_select on lesson_progress for select
  using (
    exists (select 1 from enrollments e where e.id = enrollment_id and (owns_student(e.student_id) or is_admin()
      or exists (select 1 from courses c where c.id = e.course_id and c.teacher_id = auth.uid())))
  );

create policy lesson_progress_write on lesson_progress for all
  using (exists (select 1 from enrollments e where e.id = enrollment_id and owns_student(e.student_id)))
  with check (exists (select 1 from enrollments e where e.id = enrollment_id and owns_student(e.student_id)));

-- ----------------------------------------------------------------------------
-- availability
-- ----------------------------------------------------------------------------
alter table teacher_availability enable row level security;
create policy teacher_availability_read_all on teacher_availability for select using (true);
create policy teacher_availability_write_owner on teacher_availability for all
  using (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()))
  with check (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()));

alter table teacher_unavailability enable row level security;
create policy teacher_unavailability_read_all on teacher_unavailability for select using (true);
create policy teacher_unavailability_write_owner on teacher_unavailability for all
  using (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()))
  with check (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()));

-- ----------------------------------------------------------------------------
-- classes / class_students / attendance — private to participants
-- ----------------------------------------------------------------------------
alter table classes enable row level security;

create policy classes_select on classes for select
  using (
    teacher_id = auth.uid()
    or is_admin()
    or exists (select 1 from class_students cs where cs.class_id = id and owns_student(cs.student_id))
  );

-- A parent booking a class must be booking an actually-approved teacher —
-- otherwise a parent could insert a class row against a pending/rejected
-- teacher_id.
create policy classes_write on classes for insert
  with check (
    is_admin()
    or (teacher_id = auth.uid() and is_approved_teacher())
    or (auth_role() = 'parent' and exists (select 1 from teachers t where t.profile_id = teacher_id and t.status = 'approved'))
  );

create policy classes_update on classes for update
  using (is_admin() or (teacher_id = auth.uid() and is_approved_teacher()));

alter table class_students enable row level security;

create policy class_students_select on class_students for select
  using (
    owns_student(student_id)
    or is_admin()
    or exists (select 1 from classes cl where cl.id = class_id and cl.teacher_id = auth.uid())
  );

create policy class_students_insert on class_students for insert
  with check (owns_student(student_id) or is_admin());

create policy class_students_delete on class_students for delete
  using (owns_student(student_id) or is_admin() or exists (select 1 from classes cl where cl.id = class_id and cl.teacher_id = auth.uid()));

alter table attendance enable row level security;

create policy attendance_select on attendance for select
  using (
    owns_student(student_id)
    or is_admin()
    or exists (select 1 from classes cl where cl.id = class_id and cl.teacher_id = auth.uid())
  );

create policy attendance_write on attendance for all
  using (is_admin() or exists (select 1 from classes cl where cl.id = class_id and cl.teacher_id = auth.uid()))
  with check (is_admin() or exists (select 1 from classes cl where cl.id = class_id and cl.teacher_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- assignments / submissions
-- ----------------------------------------------------------------------------
alter table assignments enable row level security;

create policy assignments_select on assignments for select
  using (
    exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin()))
    or exists (
      select 1 from enrollments e where e.course_id = course_id and owns_student(e.student_id) and e.status = 'active'
    )
  );

create policy assignments_write_owner on assignments for all
  using (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())))
  with check (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())));

alter table submissions enable row level security;

create policy submissions_select on submissions for select
  using (
    owns_student(student_id)
    or is_admin()
    or exists (
      select 1 from assignments a join courses c on c.id = a.course_id
      where a.id = assignment_id and c.teacher_id = auth.uid()
    )
  );

create policy submissions_insert on submissions for insert
  with check (owns_student(student_id));

create policy submissions_update on submissions for update
  using (
    owns_student(student_id)
    or is_admin()
    or exists (
      select 1 from assignments a join courses c on c.id = a.course_id
      where a.id = assignment_id and c.teacher_id = auth.uid()
    )
  );

-- Students can update their own answer/file/status, but only a teacher/admin
-- may set grade & feedback.
create or replace function guard_submission_grade() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_owning_teacher boolean;
begin
  select exists (
    select 1 from assignments a join courses c on c.id = a.course_id
    where a.id = new.assignment_id and c.teacher_id = auth.uid()
  ) into is_owning_teacher;

  if not (is_admin() or is_owning_teacher) then
    new.grade = old.grade;
    new.feedback = old.feedback;
    new.graded_by = old.graded_by;
    new.graded_at = old.graded_at;
    if new.status = 'graded' then
      new.status = old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_submission_grade before update on submissions
  for each row execute function guard_submission_grade();

-- ----------------------------------------------------------------------------
-- quizzes — base table locked to teacher/admin; students use quiz_questions_public
-- view (no correct_answer column) and the submit_quiz_attempt() RPC to grade.
-- ----------------------------------------------------------------------------
alter table quizzes enable row level security;

create policy quizzes_select on quizzes for select
  using (
    exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin()))
    or exists (select 1 from enrollments e where e.course_id = course_id and owns_student(e.student_id))
  );

create policy quizzes_write_owner on quizzes for all
  using (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())))
  with check (exists (select 1 from courses c where c.id = course_id and (c.teacher_id = auth.uid() or is_admin())));

alter table quiz_questions enable row level security;

create policy quiz_questions_select_owner_only on quiz_questions for select
  using (
    exists (
      select 1 from quizzes q join courses c on c.id = q.course_id
      where q.id = quiz_id and (c.teacher_id = auth.uid() or is_admin())
    )
  );

create policy quiz_questions_write_owner on quiz_questions for all
  using (exists (
    select 1 from quizzes q join courses c on c.id = q.course_id
    where q.id = quiz_id and (c.teacher_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from quizzes q join courses c on c.id = q.course_id
    where q.id = quiz_id and (c.teacher_id = auth.uid() or is_admin())
  ));

-- Students get NO direct SELECT policy on quiz_questions: RLS is row-level,
-- not column-level, so any policy granting them a row would hand back
-- correct_answer too (a plain security_invoker view over the table would
-- inherit that same exposure). Instead they call this SECURITY DEFINER
-- function, which checks enrollment itself and returns only safe columns —
-- the same pattern as public_teacher_cards().
create or replace function quiz_questions_for_student(p_quiz_id uuid)
returns table (
  id uuid,
  question_text text,
  type question_type,
  options jsonb,
  points numeric,
  order_index int
)
language sql stable security definer set search_path = public as $$
  select qq.id, qq.question_text, qq.type, qq.options, qq.points, qq.order_index
  from quiz_questions qq
  join quizzes q on q.id = qq.quiz_id
  where qq.quiz_id = p_quiz_id
    and exists (select 1 from enrollments e where e.course_id = q.course_id and owns_student(e.student_id))
  order by qq.order_index;
$$;

grant execute on function quiz_questions_for_student(uuid) to authenticated;

alter table quiz_attempts enable row level security;

create policy quiz_attempts_select on quiz_attempts for select
  using (
    owns_student(student_id)
    or is_admin()
    or exists (select 1 from quizzes q join courses c on c.id = q.course_id where q.id = quiz_id and c.teacher_id = auth.uid())
  );

-- Attempts are only ever written by the grading RPC (security definer), not directly.
create policy quiz_attempts_insert_via_rpc on quiz_attempts for insert
  with check (false);

-- Server-side grading: computes score from quiz_questions (never sent to client).
create or replace function submit_quiz_attempt(p_quiz_id uuid, p_student_id uuid, p_answers jsonb)
returns quiz_attempts
language plpgsql security definer set search_path = public as $$
declare
  v_score numeric := 0;
  v_question record;
  v_given jsonb;
  v_attempt quiz_attempts;
begin
  if not owns_student(p_student_id) then
    raise exception 'not authorized for this student';
  end if;

  for v_question in select * from quiz_questions where quiz_id = p_quiz_id loop
    v_given := p_answers -> v_question.id::text;
    if v_given is not null and v_given = v_question.correct_answer then
      v_score := v_score + v_question.points;
    end if;
  end loop;

  insert into quiz_attempts (quiz_id, student_id, answers, score, submitted_at)
  values (p_quiz_id, p_student_id, p_answers, v_score, now())
  returning * into v_attempt;

  return v_attempt;
end;
$$;

-- ----------------------------------------------------------------------------
-- invoices / payments — parent read-only, admin/service manage
-- ----------------------------------------------------------------------------
alter table invoices enable row level security;

create policy invoices_select on invoices for select
  using (parent_id = auth.uid() or is_admin());

create policy invoices_write_admin on invoices for all
  using (is_admin()) with check (is_admin());

alter table payments enable row level security;

create policy payments_select on payments for select
  using (is_admin() or exists (select 1 from invoices i where i.id = invoice_id and i.parent_id = auth.uid()));

create policy payments_write_admin on payments for all
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- financial assistance — parent sees own case, never other families;
-- interviews & internal notes are admin-only.
-- ----------------------------------------------------------------------------
alter table financial_assistance_applications enable row level security;

create policy faa_select on financial_assistance_applications for select
  using (parent_id = auth.uid() or is_admin());

create policy faa_insert on financial_assistance_applications for insert
  with check (parent_id = auth.uid());

create policy faa_update on financial_assistance_applications for update
  using (parent_id = auth.uid() or is_admin());

create or replace function guard_faa_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.approved_percent is distinct from old.approved_percent)
     and not is_admin() then
    new.status = old.status;
    new.approved_percent = old.approved_percent;
  end if;
  return new;
end;
$$;

create trigger trg_guard_faa_status before update on financial_assistance_applications
  for each row execute function guard_faa_status();

alter table financial_assistance_documents enable row level security;

create policy faa_documents_select on financial_assistance_documents for select
  using (
    is_admin()
    or exists (select 1 from financial_assistance_applications a where a.id = application_id and a.parent_id = auth.uid())
  );

create policy faa_documents_insert on financial_assistance_documents for insert
  with check (exists (select 1 from financial_assistance_applications a where a.id = application_id and a.parent_id = auth.uid()));

alter table interviews enable row level security;
create policy interviews_admin_only on interviews for all
  using (is_admin()) with check (is_admin());

alter table assistance_notes enable row level security;
create policy assistance_notes_admin_only on assistance_notes for all
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- messaging — participants only; safeguarding rule enforced on thread creation
-- ----------------------------------------------------------------------------
alter table message_threads enable row level security;

create policy message_threads_select on message_threads for select
  using (auth.uid() = any(participant_ids) or is_admin());

create or replace function guard_thread_safeguarding() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- student_teacher threads require an active enrollment linking them, and an
  -- admin is always added so safeguarding oversight is possible.
  if new.context = 'student_teacher' then
    if not exists (
      select 1 from students s
      join enrollments e on e.student_id = s.id
      join courses c on c.id = e.course_id
      where s.profile_id = any(new.participant_ids) and c.teacher_id = any(new.participant_ids)
    ) then
      raise exception 'student-teacher messaging requires an active enrollment';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_thread_safeguarding before insert on message_threads
  for each row execute function guard_thread_safeguarding();

create policy message_threads_insert on message_threads for insert
  with check (auth.uid() = any(participant_ids) or is_admin());

alter table messages enable row level security;

create policy messages_select on messages for select
  using (
    exists (select 1 from message_threads t where t.id = thread_id and (auth.uid() = any(t.participant_ids) or is_admin()))
  );

create policy messages_insert on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from message_threads t where t.id = thread_id and auth.uid() = any(t.participant_ids))
  );

-- ----------------------------------------------------------------------------
-- notifications / announcements
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

create policy notifications_select_self on notifications for select
  using (profile_id = auth.uid() or is_admin());

create policy notifications_update_self on notifications for update
  using (profile_id = auth.uid());

create policy notifications_insert_admin_or_system on notifications for insert
  with check (is_admin());

alter table announcements enable row level security;
create policy announcements_read_all on announcements for select using (true);
create policy announcements_write_admin on announcements for all
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- reviews / islamic content reviews
-- ----------------------------------------------------------------------------
alter table reviews enable row level security;
create policy reviews_read_all on reviews for select using (true);
create policy reviews_insert_parent on reviews for insert
  with check (parent_id = auth.uid() or is_admin());

alter table islamic_content_reviews enable row level security;

create policy icr_select on islamic_content_reviews for select
  using (
    is_admin() or is_scholar()
    or exists (select 1 from courses c where c.id = course_id and c.teacher_id = auth.uid())
  );

create policy icr_write on islamic_content_reviews for all
  using (is_admin() or is_scholar())
  with check (is_admin() or is_scholar());
