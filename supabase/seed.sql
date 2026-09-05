-- ============================================================================
-- Demo seed data — run with `supabase db reset` (applies migrations, then this).
-- Every login below uses the password: Demo1234!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper to create an auth.users row the same way Supabase Auth would, so the
-- on_auth_user_created trigger fires and populates profiles/parents/teachers.
-- ----------------------------------------------------------------------------
create or replace function seed_user(
  p_email text, p_role user_role, p_first text, p_last text,
  p_phone text default null, p_country text default null, p_lang text default 'en'
) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('Demo1234!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    json_build_object('role', p_role, 'first_name', p_first, 'last_name', p_last,
      'phone', p_phone, 'country', p_country, 'preferred_language', p_lang)::jsonb,
    now(), now(), '', '', '', ''
  );
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Subjects
-- ----------------------------------------------------------------------------
insert into subjects (id, name, category, description) values
  (gen_random_uuid(), 'Mathematics', 'academic', 'Algebra, geometry, calculus and applied mathematics.'),
  (gen_random_uuid(), 'Physics', 'academic', 'Mechanics, energy, waves and modern physics.'),
  (gen_random_uuid(), 'Chemistry', 'academic', 'General, organic and physical chemistry.'),
  (gen_random_uuid(), 'Biology', 'academic', 'Life sciences from cell biology to ecology.'),
  (gen_random_uuid(), 'English', 'academic', 'Reading, writing, grammar and literature.'),
  (gen_random_uuid(), 'Computer Science', 'academic', 'Programming fundamentals and computational thinking.'),
  (gen_random_uuid(), 'Quran', 'islamic', 'Memorization (Hifz) and recitation.'),
  (gen_random_uuid(), 'Tajweed', 'islamic', 'Rules of correct Quranic recitation.'),
  (gen_random_uuid(), 'Arabic', 'islamic', 'Classical and modern standard Arabic.'),
  (gen_random_uuid(), 'Islamic Studies', 'islamic', 'General Islamic education for all ages.'),
  (gen_random_uuid(), 'Aqeedah', 'islamic', 'Islamic creed and theology.'),
  (gen_random_uuid(), 'Fiqh', 'islamic', 'Islamic jurisprudence.'),
  (gen_random_uuid(), 'Seerah', 'islamic', 'Life of Prophet Muhammad (peace be upon him).'),
  (gen_random_uuid(), 'Hadith', 'islamic', 'Prophetic traditions and their sciences.');

-- ----------------------------------------------------------------------------
-- Curriculum framework
-- ----------------------------------------------------------------------------
insert into curriculum_frameworks (id, name, description, is_active)
values (gen_random_uuid(), 'International Standard Pathway',
  'A curriculum framework aligned with recognized international secondary-education standards. Structured for credential transparency, not a claim of automatic university recognition.',
  true);

insert into curriculum_subjects (framework_id, subject_id, grade, learning_objectives, topics, assessment, credits)
select f.id, s.id, '10',
  'Build fluency in core ' || s.name || ' concepts appropriate for grade 10.',
  'See course outline for the full topic list.',
  'Homework, quizzes, a midterm and a final assessment.',
  1.0
from curriculum_frameworks f, subjects s
where f.name = 'International Standard Pathway' and s.name in ('Mathematics', 'Physics', 'Islamic Studies');

-- ----------------------------------------------------------------------------
-- People
-- ----------------------------------------------------------------------------
do $$
declare
  v_admin uuid;
  v_scholar uuid;
  v_teacher_math uuid;
  v_teacher_physics uuid;
  v_teacher_islamic uuid;
  v_ahmed uuid;
  v_maryam_profile uuid;
  v_maryam_student uuid;
  v_subj_math uuid;
  v_subj_physics uuid;
  v_subj_islamic uuid;
  v_course_math uuid;
  v_course_physics uuid;
  v_course_islamic uuid;
  v_module uuid;
  v_lesson uuid;
  v_class uuid;
  v_faa uuid;
  v_invoice uuid;
begin
  v_admin := seed_user('admin@school.test', 'admin', 'Yusuf', 'Karim');
  v_scholar := seed_user('scholar@school.test', 'scholar', 'Dr. Amina', 'Siddiqui');

  v_teacher_math := seed_user('teacher.math@school.test', 'teacher', 'Bilal', 'Rahman', null, 'Canada', 'en');
  v_teacher_physics := seed_user('teacher.physics@school.test', 'teacher', 'Farah', 'Noor', null, 'United Kingdom', 'en');
  v_teacher_islamic := seed_user('teacher.islamic@school.test', 'teacher', 'Omar', 'Haddad', null, 'Egypt', 'en');

  v_ahmed := seed_user('ahmed@school.test', 'parent', 'Ahmed', 'Farouk', null, 'Canada', 'en');

  -- Approve the three teachers and flesh out their profiles.
  update teachers set
    status = 'approved', approved_at = now(), approved_by = v_admin,
    bio = 'Experienced online mathematics teacher with a focus on building confidence through fundamentals.',
    years_experience = 8, hourly_price = 25.00, currency = 'USD', gender = 'male',
    languages = array['English','Urdu'], teaching_methodology = 'Concept-first teaching with worked examples and frequent low-stakes quizzes.',
    rating_avg = 4.8, rating_count = 34
  where profile_id = v_teacher_math;

  update teachers set
    status = 'approved', approved_at = now(), approved_by = v_admin,
    bio = 'Physics teacher specializing in making mechanics and energy intuitive for grade 9-12 students.',
    years_experience = 6, hourly_price = 28.00, currency = 'USD', gender = 'female',
    languages = array['English','French'], teaching_methodology = 'Visual demonstrations and real-world problem sets.',
    rating_avg = 4.9, rating_count = 21
  where profile_id = v_teacher_physics;

  update teachers set
    status = 'approved', approved_at = now(), approved_by = v_admin,
    bio = 'Certified Islamic Studies teacher (Al-Azhar), teaches Aqeedah, Fiqh and Islamic Studies for all ages.',
    years_experience = 10, hourly_price = 20.00, currency = 'USD', gender = 'male',
    languages = array['English','Arabic'], teaching_methodology = 'Source-based teaching referencing Quran, authentic Hadith and classical scholarship.',
    rating_avg = 5.0, rating_count = 52
  where profile_id = v_teacher_islamic;

  insert into teacher_documents (teacher_id, doc_type, storage_path, file_name) values
    (v_teacher_math, 'degree', 'teacher-docs/' || v_teacher_math || '/bsc-mathematics.pdf', 'BSc Mathematics.pdf'),
    (v_teacher_math, 'resume', 'teacher-docs/' || v_teacher_math || '/resume.pdf', 'Resume.pdf'),
    (v_teacher_physics, 'degree', 'teacher-docs/' || v_teacher_physics || '/msc-physics.pdf', 'MSc Physics.pdf'),
    (v_teacher_islamic, 'credential', 'teacher-docs/' || v_teacher_islamic || '/al-azhar-ijazah.pdf', 'Al-Azhar Ijazah.pdf');

  select id into v_subj_math from subjects where name = 'Mathematics';
  select id into v_subj_physics from subjects where name = 'Physics';
  select id into v_subj_islamic from subjects where name = 'Islamic Studies';

  insert into teacher_subjects (teacher_id, subject_id, grade_levels) values
    (v_teacher_math, v_subj_math, array['9','10','11']),
    (v_teacher_physics, v_subj_physics, array['9','10','11','12']),
    (v_teacher_islamic, v_subj_islamic, array['1','2','3','4','5','6','7','8','9','10','11','12']);

  -- Availability: evenings, each in the teacher's own timezone.
  insert into teacher_availability (teacher_id, day_of_week, start_time, end_time, timezone, recurring) values
    (v_teacher_math, 1, '17:00', '20:00', 'America/Montreal', true),
    (v_teacher_math, 3, '17:00', '20:00', 'America/Montreal', true),
    (v_teacher_physics, 2, '16:00', '19:00', 'Europe/London', true),
    (v_teacher_physics, 4, '16:00', '19:00', 'Europe/London', true),
    (v_teacher_islamic, 0, '18:00', '21:00', 'Africa/Cairo', true),
    (v_teacher_islamic, 2, '18:00', '21:00', 'Africa/Cairo', true);

  -- Ahmed's daughter Maryam — has her own login per the demo scenario.
  v_maryam_profile := seed_user('maryam@school.test', 'student', 'Maryam', 'Farouk', null, 'Canada', 'en');

  insert into students (id, parent_id, profile_id, first_name, last_name, date_of_birth, gender, country,
    current_grade, preferred_language, academic_level, islamic_education_level, learning_preferences)
  values (gen_random_uuid(), v_ahmed, v_maryam_profile, 'Maryam', 'Farouk', '2011-03-14', 'female', 'Canada',
    '10', 'en', 'Grade 10', 'Intermediate', '{"pace":"steady","style":"visual"}'::jsonb)
  returning id into v_maryam_student;

  -- Courses.
  insert into courses (id, teacher_id, subject_id, title, description, level, language, delivery_mode,
    is_islamic, price, currency, duration_hours, status, islamic_review_status)
  values (gen_random_uuid(), v_teacher_math, v_subj_math, 'Grade 10 Mathematics — Algebra Foundations',
    'A structured course covering linear equations, functions and introductory algebra for grade 10 students.',
    'Grade 10', 'en', 'hybrid', false, 120.00, 'USD', 20, 'published', 'not_required')
  returning id into v_course_math;

  insert into courses (id, teacher_id, subject_id, title, description, level, language, delivery_mode,
    is_islamic, price, currency, duration_hours, status, islamic_review_status)
  values (gen_random_uuid(), v_teacher_physics, v_subj_physics, 'Grade 10 Physics — Forces & Motion',
    'Covers kinematics, Newton''s laws and energy with live problem-solving sessions.',
    'Grade 10', 'en', 'hybrid', false, 130.00, 'USD', 20, 'published', 'not_required')
  returning id into v_course_physics;

  insert into courses (id, teacher_id, subject_id, title, description, level, language, delivery_mode,
    is_islamic, price, currency, duration_hours, status, islamic_review_status)
  values (gen_random_uuid(), v_teacher_islamic, v_subj_islamic, 'Islamic Studies — Foundations of Belief and Practice',
    'An introductory course covering core Aqeedah, basic Fiqh and Seerah, grounded in Quran and authentic Hadith.',
    'All levels', 'en', 'recorded', true, 80.00, 'USD', 15, 'published', 'approved')
  returning id into v_course_islamic;

  insert into islamic_content_reviews (course_id, reviewer_id, status, comments, reviewed_at)
  values (v_course_islamic, v_scholar, 'approved', 'Sources verified against authentic references. Approved for publication.', now());

  -- A module + a couple of lessons for the Islamic Studies course (recorded).
  insert into course_modules (id, course_id, title, order_index)
  values (gen_random_uuid(), v_course_islamic, 'Module 1 — The Six Pillars of Iman', 1)
  returning id into v_module;

  insert into lessons (id, module_id, title, content_type, content_url, order_index, duration_minutes)
  values (gen_random_uuid(), v_module, 'Lesson 1 — Belief in Allah', 'video', 'https://example.com/video/lesson1', 1, 25)
  returning id into v_lesson;

  insert into lessons (module_id, title, content_type, content_text, order_index, duration_minutes)
  values (v_module, 'Lesson 2 — Belief in the Angels', 'text', 'Reading material on the nature and role of angels in Islamic belief.', 2, 15);

  insert into quizzes (id, course_id, lesson_id, title, time_limit_minutes)
  values (gen_random_uuid(), v_course_islamic, v_lesson, 'Module 1 Check', 10)
  returning id into v_faa; -- reuse var slot temporarily for quiz id

  insert into quiz_questions (quiz_id, question_text, type, options, correct_answer, points, order_index) values
    (v_faa, 'How many pillars of Iman (belief) are there?', 'mcq',
     '["4","5","6","7"]'::jsonb, '"6"'::jsonb, 1, 1),
    (v_faa, 'Belief in the Angels is one of the pillars of Iman.', 'true_false',
     '["True","False"]'::jsonb, '"True"'::jsonb, 1, 2);

  -- Enroll Maryam in Islamic Studies (recorded) and book a live Physics class.
  insert into enrollments (student_id, course_id, status, progress_percent)
  values (v_maryam_student, v_course_islamic, 'active', 20);

  insert into assignments (course_id, title, instructions, due_date, max_score)
  values (v_course_islamic, 'Reflection: The Six Pillars', 'Write a half-page reflection on why belief in the Angels matters in daily life.',
    now() + interval '5 days', 100);

  -- Weekly Physics live class booking (matches "Grade 10 + evenings" demo path).
  insert into classes (id, subject_id, teacher_id, course_id, title, start_datetime, end_datetime, timezone,
    provider, meeting_id, meeting_url, status, cancellation_policy, created_by)
  values (gen_random_uuid(), v_subj_physics, v_teacher_physics, v_course_physics, 'Physics — Forces & Motion (Weekly)',
    (date_trunc('week', now()) + interval '1 day' + interval '16 hours' + interval '7 days'),
    (date_trunc('week', now()) + interval '1 day' + interval '17 hours' + interval '7 days'),
    'Europe/London', 'zoom', 'ZOOM-DEMO-001', 'https://zoom.us/j/0000000000', 'scheduled',
    'Free cancellation up to 24 hours before the class.', v_ahmed)
  returning id into v_class;

  insert into class_students (class_id, student_id, booked_by, price_charged)
  values (v_class, v_maryam_student, v_ahmed, 28.00);

  insert into enrollments (student_id, course_id, status, progress_percent)
  values (v_maryam_student, v_course_physics, 'active', 5);

  -- Financial assistance: Ahmed applies, admin partially approves (demo scenario §42).
  insert into financial_assistance_applications (id, parent_id, student_id, household_size, income_range,
    dependents, reason, status, approved_percent)
  values (gen_random_uuid(), v_ahmed, v_maryam_student, 5, 'Under $40,000/year', 3,
    'Single income household; requesting help affording weekly Physics tuition.',
    'partially_approved', 50)
  returning id into v_faa;

  insert into interviews (application_id, scheduled_at, conducted_by, notes)
  values (v_faa, now() - interval '3 days', v_admin, 'Verified household situation via phone interview. Recommending 50% reduction.');

  insert into assistance_notes (application_id, admin_id, note)
  values (v_faa, v_admin, 'Approved 50% reduction on tuition for the current term.');

  -- Invoice reflecting the approved discount, ready for the checkout/payment-history demo.
  insert into invoices (id, parent_id, student_id, description, tier, amount, discount_amount, final_amount,
    currency, status, due_date)
  values (gen_random_uuid(), v_ahmed, v_maryam_student, 'Physics — Forces & Motion (Weekly) — 4 sessions',
    'assisted', 112.00, 56.00, 56.00, 'USD', 'paid', current_date + interval '7 days')
  returning id into v_invoice;

  insert into payments (invoice_id, amount, currency, method, provider_ref, status, paid_at)
  values (v_invoice, 56.00, 'USD', 'card', 'demo_seed_payment_001', 'paid', now());

  -- A pending teacher application, to demonstrate the approval workflow.
  perform seed_user('applicant@school.test', 'teacher', 'Layla', 'Hassan', null, 'Jordan', 'en');

  insert into teacher_applications (profile_id, first_name, last_name, email, phone, country, timezone,
    subjects, grade_levels, years_experience, languages, teaching_experience, educational_background,
    consent_given, status)
  select id, 'Layla', 'Hassan', 'applicant@school.test', null, 'Jordan', 'Asia/Amman',
    array['Arabic','Quran'], array['1','2','3','4','5','6'], 4, array['Arabic','English'],
    'Four years teaching Quran memorization online to children ages 6-12.',
    'BA in Arabic Language, Ijazah in Quran recitation.', true, 'submitted'
  from profiles where email = 'applicant@school.test';

  insert into announcements (title, body, audience, created_by)
  values ('Welcome to the new term', 'We are excited to welcome returning and new students to this term. Check your dashboard for your class schedule.', 'all', v_admin);

end $$;

drop function seed_user(text, user_role, text, text, text, text, text);
