-- ============================================================================
-- Online Islamic International School Platform — Core Schema
-- ============================================================================
-- Identity lives in auth.users (Supabase Auth). Everything else references
-- profiles.id = auth.users.id. Role-specific detail tables (parents, students,
-- teachers) key off profiles.id so a single login can carry one primary role
-- while students can optionally also log in directly (profile_id nullable).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('parent', 'student', 'teacher', 'admin', 'scholar');
create type teacher_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type application_status as enum ('submitted', 'under_review', 'info_requested', 'approved', 'rejected');
create type subject_category as enum ('academic', 'islamic');
create type delivery_mode as enum ('live', 'recorded', 'hybrid');
create type course_status as enum ('draft', 'pending_review', 'published', 'unpublished');
create type islamic_review_status as enum ('not_required', 'pending', 'approved', 'rejected', 'corrections_requested');
create type enrollment_status as enum ('active', 'completed', 'dropped');
create type class_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');
create type video_provider as enum ('zoom', 'jitsi', 'mirotalk', 'other');
create type submission_status as enum ('not_started', 'in_progress', 'submitted', 'graded', 'late');
create type question_type as enum ('mcq', 'true_false', 'short_answer', 'matching', 'fill_blank');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type invoice_status as enum ('draft', 'pending', 'paid', 'overdue', 'void', 'refunded');
create type payment_tier as enum ('standard', 'supported', 'sponsored', 'assisted');
create type assistance_status as enum ('submitted', 'under_review', 'interview_scheduled', 'info_required', 'approved', 'partially_approved', 'rejected');
create type thread_context as enum ('parent_teacher', 'student_teacher', 'parent_admin', 'teacher_admin');
create type notification_type as enum ('class_upcoming', 'assignment_due', 'new_grade', 'teacher_message', 'payment_due', 'application_update', 'course_announcement', 'schedule_change');
create type document_type as enum ('resume', 'degree', 'certificate', 'credential', 'id_verification');

-- ----------------------------------------------------------------------------
-- Identity & profiles
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  country text,
  preferred_language text not null default 'en',
  timezone text not null default 'UTC',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table parents (
  profile_id uuid primary key references profiles(id) on delete cascade
);

create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(profile_id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text,
  country text,
  current_grade text,
  preferred_language text default 'en',
  academic_level text,
  islamic_education_level text,
  learning_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table teachers (
  profile_id uuid primary key references profiles(id) on delete cascade,
  status teacher_status not null default 'pending',
  bio text,
  years_experience int default 0,
  hourly_price numeric(10,2),
  currency text default 'USD',
  gender text,
  languages text[] default '{}',
  teaching_methodology text,
  video_intro_url text,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  approved_at timestamptz,
  approved_by uuid references profiles(id)
);

create table teacher_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  country text,
  timezone text,
  subjects text[] default '{}',
  grade_levels text[] default '{}',
  years_experience int,
  languages text[] default '{}',
  teaching_experience text,
  educational_background text,
  consent_given boolean not null default false,
  status application_status not null default 'submitted',
  admin_message text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teacher_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references teacher_applications(id) on delete cascade,
  teacher_id uuid references teachers(profile_id) on delete cascade,
  doc_type document_type not null,
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz not null default now(),
  constraint teacher_documents_owner check (application_id is not null or teacher_id is not null)
);

-- ----------------------------------------------------------------------------
-- Subjects & curriculum
-- ----------------------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category subject_category not null,
  description text
);

create table teacher_subjects (
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  grade_levels text[] default '{}',
  primary key (teacher_id, subject_id)
);

create table curriculum_frameworks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true
);

create table curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references curriculum_frameworks(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  grade text not null,
  learning_objectives text,
  topics text,
  assessment text,
  credits numeric(5,2)
);

-- ----------------------------------------------------------------------------
-- Courses
-- ----------------------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id),
  curriculum_subject_id uuid references curriculum_subjects(id),
  title text not null,
  description text,
  level text,
  language text default 'en',
  delivery_mode delivery_mode not null default 'recorded',
  is_islamic boolean not null default false,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  duration_hours numeric(6,2),
  cover_image_url text,
  status course_status not null default 'draft',
  islamic_review_status islamic_review_status not null default 'not_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  title text not null,
  content_type text not null default 'video',
  content_url text,
  content_text text,
  order_index int not null default 0,
  duration_minutes int,
  is_published boolean not null default true
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status enrollment_status not null default 'active',
  progress_percent numeric(5,2) not null default 0,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (enrollment_id, lesson_id)
);

-- ----------------------------------------------------------------------------
-- Scheduling & live classes
-- ----------------------------------------------------------------------------
create table teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null,
  recurring boolean not null default true
);

create table teacher_unavailability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id),
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  timezone text not null,
  provider video_provider not null default 'zoom',
  meeting_id text,
  meeting_url text,
  status class_status not null default 'scheduled',
  cancellation_policy text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  exclude using gist (
    teacher_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  ) where (status <> 'cancelled')
);

create table class_students (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  booked_by uuid references profiles(id),
  price_charged numeric(10,2),
  primary key (class_id, student_id)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attendance_status not null default 'present',
  marked_by uuid references profiles(id),
  marked_at timestamptz not null default now(),
  unique (class_id, student_id)
);

-- ----------------------------------------------------------------------------
-- Assignments & quizzes
-- ----------------------------------------------------------------------------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  title text not null,
  instructions text,
  attachment_url text,
  due_date timestamptz,
  max_score numeric(6,2) not null default 100,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status submission_status not null default 'not_started',
  answer_text text,
  file_url text,
  submitted_at timestamptz,
  grade numeric(6,2),
  feedback text,
  graded_by uuid references profiles(id),
  graded_at timestamptz,
  unique (assignment_id, student_id)
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  title text not null,
  time_limit_minutes int
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  type question_type not null,
  options jsonb,
  correct_answer jsonb,
  points numeric(6,2) not null default 1,
  order_index int not null default 0
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6,2),
  submitted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Payments, invoices, financial assistance
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(profile_id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  description text not null,
  tier payment_tier not null default 'standard',
  amount numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  final_amount numeric(10,2) not null,
  currency text not null default 'USD',
  status invoice_status not null default 'pending',
  due_date date,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  method text,
  provider_ref text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table financial_assistance_applications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(profile_id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  household_size int,
  income_range text,
  dependents int,
  reason text,
  status assistance_status not null default 'submitted',
  approved_percent numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table financial_assistance_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references financial_assistance_applications(id) on delete cascade,
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references financial_assistance_applications(id) on delete cascade,
  scheduled_at timestamptz,
  conducted_by uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table assistance_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references financial_assistance_applications(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  note text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Messaging & notifications
-- ----------------------------------------------------------------------------
create table message_threads (
  id uuid primary key default gen_random_uuid(),
  context thread_context not null,
  course_id uuid references courses(id) on delete set null,
  participant_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Reviews & Islamic content oversight
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(profile_id) on delete cascade,
  parent_id uuid references parents(profile_id) on delete set null,
  course_id uuid references courses(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table islamic_content_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  status islamic_review_status not null default 'pending',
  comments text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint icr_target check (course_id is not null or lesson_id is not null)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index idx_students_parent on students(parent_id);
create index idx_teacher_subjects_subject on teacher_subjects(subject_id);
create index idx_courses_subject on courses(subject_id);
create index idx_enrollments_student on enrollments(student_id);
create index idx_enrollments_course on enrollments(course_id);
create index idx_classes_teacher on classes(teacher_id, start_datetime);
create index idx_class_students_student on class_students(student_id);
create index idx_assignments_course on assignments(course_id);
create index idx_submissions_student on submissions(student_id);
create index idx_invoices_parent on invoices(parent_id);
create index idx_faa_parent on financial_assistance_applications(parent_id);
create index idx_notifications_profile on notifications(profile_id, read_at);
create index idx_messages_thread on messages(thread_id, sent_at);

-- ----------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_teacher_applications_updated before update on teacher_applications for each row execute function set_updated_at();
create trigger trg_courses_updated before update on courses for each row execute function set_updated_at();
create trigger trg_faa_updated before update on financial_assistance_applications for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper: create a profile row automatically when a user signs up.
-- Role/name come from auth metadata supplied at sign-up time.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, role, first_name, last_name, email, phone, country, preferred_language)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'parent'),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en')
  );

  if coalesce((new.raw_user_meta_data->>'role')::user_role, 'parent') = 'parent' then
    insert into parents (profile_id) values (new.id);
  elsif (new.raw_user_meta_data->>'role')::user_role = 'teacher' then
    insert into teachers (profile_id) values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
