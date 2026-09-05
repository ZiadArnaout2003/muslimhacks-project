// Hand-written types mirroring supabase/migrations/0001_init_schema.sql.
// Keep in sync manually, or generate with `supabase gen types typescript`.

export type UserRole = 'parent' | 'student' | 'teacher' | 'admin' | 'scholar'
export type TeacherStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ApplicationStatus = 'submitted' | 'under_review' | 'info_requested' | 'approved' | 'rejected'
export type SubjectCategory = 'academic' | 'islamic'
export type DeliveryMode = 'live' | 'recorded' | 'hybrid'
export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'unpublished'
export type IslamicReviewStatus = 'not_required' | 'pending' | 'approved' | 'rejected' | 'corrections_requested'
export type EnrollmentStatus = 'active' | 'completed' | 'dropped'
export type ClassStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
export type VideoProvider = 'zoom' | 'jitsi' | 'mirotalk' | 'other'
export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'late'
export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'matching' | 'fill_blank'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'void' | 'refunded'
export type PaymentTier = 'standard' | 'supported' | 'sponsored' | 'assisted'
export type AssistanceStatus =
  | 'submitted'
  | 'under_review'
  | 'interview_scheduled'
  | 'info_required'
  | 'approved'
  | 'partially_approved'
  | 'rejected'

export interface Profile {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  email: string
  phone: string | null
  country: string | null
  preferred_language: string
  timezone: string
  avatar_url: string | null
  created_at: string
}

export interface Student {
  id: string
  parent_id: string
  profile_id: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  country: string | null
  current_grade: string | null
  preferred_language: string | null
  academic_level: string | null
  islamic_education_level: string | null
  learning_preferences: Record<string, unknown>
  created_at: string
}

export interface TeacherCard {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  country: string | null
  bio: string | null
  years_experience: number | null
  hourly_price: number | null
  currency: string | null
  gender: string | null
  languages: string[] | null
  teaching_methodology: string | null
  rating_avg: number | null
  rating_count: number | null
}

export interface TeacherProfileFull extends TeacherCard {
  video_intro_url: string | null
}

export interface Subject {
  id: string
  name: string
  category: SubjectCategory
  description: string | null
}

export interface Course {
  id: string
  teacher_id: string
  subject_id: string
  title: string
  description: string | null
  level: string | null
  language: string | null
  delivery_mode: DeliveryMode
  is_islamic: boolean
  price: number
  currency: string
  duration_hours: number | null
  cover_image_url: string | null
  status: CourseStatus
  islamic_review_status: IslamicReviewStatus
  created_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  status: EnrollmentStatus
  progress_percent: number
  enrolled_at: string
}

export interface ClassRow {
  id: string
  subject_id: string
  teacher_id: string
  course_id: string | null
  title: string
  start_datetime: string
  end_datetime: string
  timezone: string
  provider: VideoProvider
  meeting_id: string | null
  meeting_url: string | null
  status: ClassStatus
  cancellation_policy: string | null
}

export interface Assignment {
  id: string
  course_id: string
  lesson_id: string | null
  title: string
  instructions: string | null
  attachment_url: string | null
  due_date: string | null
  max_score: number
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  status: SubmissionStatus
  answer_text: string | null
  file_url: string | null
  submitted_at: string | null
  grade: number | null
  feedback: string | null
}

export interface TeacherAvailability {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
  recurring: boolean
}

export interface FinancialAssistanceApplication {
  id: string
  parent_id: string
  student_id: string | null
  household_size: number | null
  income_range: string | null
  dependents: number | null
  reason: string | null
  status: AssistanceStatus
  approved_percent: number | null
  created_at: string
}

export interface Invoice {
  id: string
  parent_id: string
  student_id: string | null
  description: string
  tier: PaymentTier
  amount: number
  discount_amount: number
  final_amount: number
  currency: string
  status: InvoiceStatus
  due_date: string | null
  created_at: string
}

export interface TeacherApplication {
  id: string
  profile_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  country: string | null
  timezone: string | null
  subjects: string[]
  grade_levels: string[]
  years_experience: number | null
  languages: string[]
  teaching_experience: string | null
  educational_background: string | null
  consent_given: boolean
  status: ApplicationStatus
  admin_message: string | null
  created_at: string
}
