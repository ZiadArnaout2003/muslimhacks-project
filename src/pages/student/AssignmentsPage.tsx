import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { SubmissionStatus } from '../../types/database'

interface EnrollmentRow {
  course_id: string
  courses: { title: string } | null
}

interface AssignmentRow {
  id: string
  title: string
  due_date: string | null
  max_score: number
  course_id: string
  courses: { title: string } | null
}

interface SubmissionRow {
  assignment_id: string
  status: SubmissionStatus
  grade: number | null
}

const STATUS_TONE: Record<SubmissionStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  not_started: 'neutral',
  in_progress: 'brand',
  submitted: 'warning',
  graded: 'success',
  late: 'danger',
}

export function AssignmentsPage() {
  const { t } = useTranslation()
  const { student, loading: studentLoading } = useStudentRecord()

  const { data: enrollments } = useSupabaseQuery<EnrollmentRow[]>(
    () =>
      student
        ? supabase.from('enrollments').select('course_id, courses(title)').eq('student_id', student.id).returns<EnrollmentRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )
  const courseIds = (enrollments ?? []).map((e) => e.course_id)

  const { data: assignments, loading } = useSupabaseQuery<AssignmentRow[]>(
    () =>
      courseIds.length
        ? supabase
            .from('assignments')
            .select('id, title, due_date, max_score, course_id, courses(title)')
            .in('course_id', courseIds)
            .returns<AssignmentRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [courseIds.join(',')]
  )

  const { data: submissions } = useSupabaseQuery<SubmissionRow[]>(
    () => (student ? supabase.from('submissions').select('assignment_id, status, grade').eq('student_id', student.id) : Promise.resolve({ data: [], error: null })),
    [student?.id]
  )

  const statusFor = (assignmentId: string): SubmissionStatus => submissions?.find((s) => s.assignment_id === assignmentId)?.status ?? 'not_started'
  const gradeFor = (assignmentId: string) => submissions?.find((s) => s.assignment_id === assignmentId)?.grade

  if (studentLoading || loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('studentAssignments.title')}</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {(assignments ?? []).length === 0 && <EmptyState title={t('studentAssignments.empty')} />}
        {(assignments ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('studentAssignments.assignment')}</th>
                <th className="px-4 py-3">{t('studentAssignments.course')}</th>
                <th className="px-4 py-3">{t('studentAssignments.dueDate')}</th>
                <th className="px-4 py-3">{t('studentAssignments.status')}</th>
                <th className="px-4 py-3">{t('studentAssignments.grade')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(assignments ?? []).map((a) => {
                const grade = gradeFor(a.id)
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <Link to={`/student/assignments/${a.id}`} className="font-medium text-brand-700 hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.courses?.title}</td>
                    <td className="px-4 py-3 text-gray-500">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[statusFor(a.id)]}>{t(`studentAssignments.statuses.${statusFor(a.id)}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{grade != null ? `${grade}/${a.max_score}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
