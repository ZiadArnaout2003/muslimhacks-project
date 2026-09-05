-- ============================================================================
-- Storage buckets
-- ============================================================================
-- Files are stored under a path prefixed with the owning user's auth uid,
-- e.g. teacher-documents/<uid>/resume.pdf — policies check that prefix.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('teacher-documents', 'teacher-documents', false),
  ('financial-assistance-documents', 'financial-assistance-documents', false),
  ('course-materials', 'course-materials', false),
  ('assignment-submissions', 'assignment-submissions', false)
on conflict (id) do nothing;

-- avatars: public read, owner-only write
create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_owner_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- teacher-documents: never public. Owner (applicant/teacher) + admin only.
create policy teacher_documents_bucket_select on storage.objects for select
  using (
    bucket_id = 'teacher-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy teacher_documents_bucket_insert on storage.objects for insert
  with check (bucket_id = 'teacher-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- financial-assistance-documents: owner (parent who applied) + admin only.
create policy faa_documents_bucket_select on storage.objects for select
  using (
    bucket_id = 'financial-assistance-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy faa_documents_bucket_insert on storage.objects for insert
  with check (bucket_id = 'financial-assistance-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- course-materials: owning teacher can upload; readable by that teacher, admin,
-- and any student enrolled in the course the file's folder is named after
-- (path convention: course-materials/<course_id>/...).
create policy course_materials_select on storage.objects for select
  using (
    bucket_id = 'course-materials'
    and (
      is_admin()
      or exists (
        select 1 from courses c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
      )
      or exists (
        select 1 from enrollments e
        where e.course_id::text = (storage.foldername(name))[1] and owns_student(e.student_id) and e.status = 'active'
      )
    )
  );

create policy course_materials_insert on storage.objects for insert
  with check (
    bucket_id = 'course-materials'
    and exists (
      select 1 from courses c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
    )
  );

-- assignment-submissions: path convention assignment-submissions/<student_id>/...
-- Student (via their family) can upload/read their own; the teacher who owns
-- the assignment's course, and admin, can also read.
create policy assignment_submissions_select on storage.objects for select
  using (
    bucket_id = 'assignment-submissions'
    and (
      is_admin()
      or owns_student((storage.foldername(name))[1]::uuid)
      or exists (
        select 1 from submissions s
        join assignments a on a.id = s.assignment_id
        join courses c on c.id = a.course_id
        where s.student_id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
      )
    )
  );

create policy assignment_submissions_insert on storage.objects for insert
  with check (bucket_id = 'assignment-submissions' and owns_student((storage.foldername(name))[1]::uuid));
