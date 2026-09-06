-- ============================================================================
-- Student-only accounts
-- ============================================================================
-- This is an intentionally destructive, approved cutover.  The old family
-- account model and all existing student/family test data are removed before
-- the parent table and role are retired.

-- Every row in these tables belongs to the old student/family model.  Deleting
-- the parent-facing roots first also removes their document/note children.
delete from reviews;
delete from financial_assistance_applications;
delete from invoices;
delete from student_login_invites;
delete from students;

-- Deleting auth users cascades through profiles and parents.  Do this only
-- after non-cascading profile references above have been cleared.
delete from auth.users
where id in (select id from profiles where role = 'parent')
   or (
     raw_user_meta_data->>'role' = 'parent'
     and not exists (select 1 from profiles where profiles.id = auth.users.id)
   );

-- The invitation flow was only needed while a parent could create a child
-- account.  Its table must disappear before parents can be dropped.
drop function if exists create_student_login_invite(uuid);
drop table if exists student_login_invites;

-- Replace policies whose expressions contain the retired parent role/columns
-- before changing either the tables or the enum.
drop policy if exists students_select on students;
drop policy if exists students_write_parent_or_admin on students;
drop policy if exists students_update_parent_or_admin on students;
drop policy if exists students_delete_parent_or_admin on students;
drop policy if exists invoices_select on invoices;
drop policy if exists invoices_write_admin on invoices;
drop policy if exists payments_select on payments;
drop policy if exists payments_write_admin on payments;
drop policy if exists faa_select on financial_assistance_applications;
drop policy if exists faa_insert on financial_assistance_applications;
drop policy if exists faa_update on financial_assistance_applications;
drop policy if exists faa_documents_select on financial_assistance_documents;
drop policy if exists faa_documents_insert on financial_assistance_documents;
drop policy if exists reviews_insert_parent on reviews;
drop policy if exists classes_write on classes;

drop index if exists idx_students_parent;
drop index if exists idx_invoices_parent;
drop index if exists idx_faa_parent;

alter table students
  drop column parent_id,
  alter column profile_id set not null;
alter table students
  add constraint students_profile_id_key unique (profile_id);
alter table students
  add column emergency_guardian_phone text;

alter table invoices
  drop column parent_id,
  alter column student_id set not null;

alter table financial_assistance_applications
  drop column parent_id,
  alter column student_id set not null;

alter table reviews
  drop column parent_id,
  add column student_id uuid not null references students(id) on delete cascade;

-- No foreign keys to parents remain at this point.
drop table parents;

-- Direct account ownership replaces the parent-or-student lookup used by all
-- student-scoped policies and storage policies.
create or replace function owns_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from students s
    where s.id = p_student_id
      and s.profile_id = auth.uid()
  );
$$;

create policy students_select on students for select
  using (profile_id = auth.uid() or is_admin() or teaches_student(id));
create policy students_insert_self_or_admin on students for insert
  with check (profile_id = auth.uid() or is_admin());
create policy students_update_self_or_admin on students for update
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());
create policy students_delete_self_or_admin on students for delete
  using (profile_id = auth.uid() or is_admin());

create policy invoices_select on invoices for select
  using (owns_student(student_id) or is_admin());
create policy invoices_write_admin on invoices for all
  using (is_admin()) with check (is_admin());
create policy invoices_insert_student on invoices for insert
  with check (owns_student(student_id) or is_admin());

create policy payments_select on payments for select
  using (
    is_admin()
    or exists (
      select 1 from invoices i
      where i.id = invoice_id and owns_student(i.student_id)
    )
  );
create policy payments_write_admin on payments for all
  using (is_admin()) with check (is_admin());
create policy payments_insert_student on payments for insert
  with check (
    is_admin()
    or exists (
      select 1 from invoices i
      where i.id = invoice_id and owns_student(i.student_id)
    )
  );

create policy faa_select on financial_assistance_applications for select
  using (owns_student(student_id) or is_admin());
create policy faa_insert on financial_assistance_applications for insert
  with check (owns_student(student_id) or is_admin());
create policy faa_update on financial_assistance_applications for update
  using (owns_student(student_id) or is_admin())
  with check (owns_student(student_id) or is_admin());

create policy faa_documents_select on financial_assistance_documents for select
  using (
    is_admin()
    or exists (
      select 1
      from financial_assistance_applications a
      where a.id = application_id and owns_student(a.student_id)
    )
  );
create policy faa_documents_insert on financial_assistance_documents for insert
  with check (
    is_admin()
    or exists (
      select 1
      from financial_assistance_applications a
      where a.id = application_id and owns_student(a.student_id)
    )
  );

create policy reviews_insert_student on reviews for insert
  with check (owns_student(student_id) or is_admin());

-- A direct student retains the former family's private-class booking path.
create policy classes_write on classes for insert
  with check (
    is_admin()
    or (teacher_id = auth.uid() and is_approved_teacher())
    or (
      auth_role() = 'student'
      and exists (
        select 1 from teachers t
        where t.profile_id = teacher_id and t.status = 'approved'
      )
    )
  );

-- The existing after-insert enrollment trigger remains the enrollment entry
-- point, now asserting the direct account relationship it relies on.
create or replace function enroll_student_in_published_courses()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is null then
    raise exception 'student profile is required';
  end if;

  insert into enrollments (student_id, course_id, status)
  select new.id, c.id, 'active'
  from courses c
  where c.status = 'published'
  on conflict (student_id, course_id) do nothing;

  return new;
end;
$$;

-- Public signup metadata can no longer choose a privileged role.  Normal
-- signup always creates the profile and exactly one directly-owned student;
-- the sole exception is the existing teacher application flow.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := case
    when new.raw_user_meta_data->>'signup_kind' = 'teacher_application'
      then 'teacher'::user_role
    else 'student'::user_role
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

  if v_role = 'teacher' then
    insert into teachers (profile_id, status) values (new.id, 'pending');
  else
    insert into students (
      profile_id,
      first_name,
      last_name,
      country,
      current_grade,
      preferred_language,
      academic_level,
      islamic_education_level,
      emergency_guardian_phone
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      new.raw_user_meta_data->>'country',
      new.raw_user_meta_data->>'current_grade',
      coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
      new.raw_user_meta_data->>'academic_level',
      new.raw_user_meta_data->>'islamic_education_level',
      new.raw_user_meta_data->>'emergency_guardian_phone'
    );
  end if;

  return new;
end;
$$;

-- PostgreSQL cannot safely remove one enum value in place while functions and
-- policies depend on the type. Keep the retired label inert and prevent any
-- future parent profile from being stored.
alter table profiles
  add constraint profiles_parent_role_retired check (role <> 'parent');