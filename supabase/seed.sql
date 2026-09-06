-- Student-only demo data for `supabase db reset`.
-- Demo password for every account below: Demo1234!

create or replace function seed_user(
  p_email text,
  p_role user_role,
  p_first text,
  p_last text,
  p_country text default 'Canada'
) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
  v_metadata jsonb;
begin
  v_metadata := jsonb_build_object(
    'role', p_role,
    'signup_kind', case when p_role = 'teacher' then 'teacher_application' else 'student' end,
    'first_name', p_first,
    'last_name', p_last,
    'country', p_country,
    'preferred_language', 'en',
    'current_grade', '10',
    'academic_level', 'Grade 10',
    'islamic_education_level', 'Intermediate',
    'emergency_guardian_phone', '+1 555 010 1000'
  );

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id,
    'authenticated', 'authenticated', p_email,
    crypt('Demo1234!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', v_metadata,
    now(), now(), '', '', '', ''
  );

  if p_role in ('admin', 'scholar') then
    update profiles set role = p_role where id = v_id;
    delete from students where profile_id = v_id;
  end if;

  return v_id;
end;
$$;

insert into subjects (name, category, description) values
  ('Mathematics', 'academic', 'Algebra, geometry, calculus and applied mathematics.'),
  ('Physics', 'academic', 'Mechanics, energy, waves and modern physics.'),
  ('Computer Science', 'academic', 'Programming fundamentals and computational thinking.'),
  ('Quran', 'islamic', 'Memorization and recitation.'),
  ('Arabic', 'islamic', 'Classical and modern standard Arabic.'),
  ('Islamic Studies', 'islamic', 'General Islamic education for all ages.');

do $$
declare
  v_admin uuid;
  v_teacher uuid;
  v_student uuid;
  v_math uuid;
begin
  v_admin := seed_user('admin@school.test', 'admin', 'Yusuf', 'Karim');
  v_teacher := seed_user('teacher.math@school.test', 'teacher', 'Bilal', 'Rahman');
  v_student := seed_user('student@school.test', 'student', 'Maryam', 'Farouk');

  update teachers set
    status = 'approved',
    approved_at = now(),
    approved_by = v_admin,
    bio = 'Experienced online mathematics teacher focused on clear fundamentals.',
    years_experience = 8,
    hourly_price = 25,
    currency = 'USD',
    gender = 'male',
    languages = array['English', 'Arabic']
  where profile_id = v_teacher;

  select id into v_math from subjects where name = 'Mathematics';

  insert into teacher_subjects (teacher_id, subject_id, grade_levels)
  values (v_teacher, v_math, array['9', '10', '11']);

  insert into teacher_availability (
    teacher_id, day_of_week, start_time, end_time, timezone, recurring
  ) values
    (v_teacher, 1, '17:00', '20:00', 'America/Toronto', true),
    (v_teacher, 3, '17:00', '20:00', 'America/Toronto', true);

  insert into courses (
    subject_id, title, description, level, language, delivery_mode,
    is_islamic, price, currency, duration_hours, status, islamic_review_status
  ) values (
    v_math,
    'Grade 10 Mathematics — Algebra Foundations',
    'A structured course covering equations, functions, and introductory algebra.',
    'Grade 10',
    'en',
    'hybrid',
    false,
    120,
    'USD',
    20,
    'published',
    'not_required'
  );

  insert into announcements (title, body, audience, created_by)
  values (
    'Welcome to the new term',
    'Check your student dashboard for courses, classes, payments, and assistance.',
    'all',
    v_admin
  );
end;
$$;

drop function seed_user(text, user_role, text, text, text);