import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState, EmptyState } from '../../components/ui/States'

interface EnrollmentWithCourse {
  id: string
  progress_percent: number
  courses: { title: string } | null
}

interface GradedSubmission {
  id: string
  grade: number | null
  assignments: { title: string; max_score: number } | null
}

interface AttendanceRow {
  status: string
}

export function ProgressPage() {
  const { t } = useTranslation()
  const { student, loading: studentLoading } = useStudentRecord()

  const { data: enrollments } = useSupabaseQuery<EnrollmentWithCourse[]>(
    () =>
      student
        ? supabase.from('enrollments').select('id, progress_percent, courses(title)').eq('student_id', student.id).returns<EnrollmentWithCourse[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  const { data: submissions } = useSupabaseQuery<GradedSubmission[]>(
    () =>
      student
        ? supabase
            .from('submissions')
            .select('id, grade, assignments(title, max_score)')
            .eq('student_id', student.id)
            .not('grade', 'is', null)
            .returns<GradedSubmission[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  const { data: attendance } = useSupabaseQuery<AttendanceRow[]>(
    () => (student ? supabase.from('attendance').select('status').eq('student_id', student.id) : Promise.resolve({ data: [], error: null })),
    [student?.id]
  )

  if (studentLoading) return <LoadingState />

  const gradeChartData = (submissions ?? []).map((s) => ({
    name: s.assignments?.title.slice(0, 14) ?? t('progress.assignment'),
    grade: s.grade,
    max: s.assignments?.max_score ?? 100,
  }))

  const attendanceCounts = (attendance ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const totalAttendance = Object.values(attendanceCounts).reduce((a, b) => a + b, 0)
  const presentRate = totalAttendance ? Math.round(((attendanceCounts.present ?? 0) / totalAttendance) * 100) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('progress.title')}</h1>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">{t('progress.courseCompletion')}</h2>
          <div className="mt-4 space-y-3">
            {(enrollments ?? []).map((e) => (
              <div key={e.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{e.courses?.title}</span>
                  <span className="text-gray-500">{e.progress_percent}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${e.progress_percent}%` }} />
                </div>
              </div>
            ))}
            {(enrollments ?? []).length === 0 && <EmptyState title={t('progress.noEnrollments')} />}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">{t('progress.gradedAssignments')}</h2>
          {gradeChartData.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">{t('progress.noGradedAssignments')}</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="grade" fill="#1f9a80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">{t('progress.attendance')}</h2>
          <p className="mt-2 text-3xl font-bold text-brand-700">{presentRate != null ? `${presentRate}%` : '—'}</p>
          <p className="text-xs text-gray-500">{t('progress.presentRate', { count: totalAttendance })}</p>
        </CardBody>
      </Card>
    </div>
  )
}
