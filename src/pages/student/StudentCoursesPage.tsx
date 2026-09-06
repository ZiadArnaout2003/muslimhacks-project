import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { useTranslation } from 'react-i18next'

interface EnrollmentWithCourse {
  id: string
  progress_percent: number
  courses: { id: string; title: string; is_islamic: boolean; delivery_mode: string; color: string } | null
}

export function StudentCoursesPage() {
  const { t } = useTranslation()
  const { student, loading: studentLoading } = useStudentRecord()

  const { data: enrollments, loading } = useSupabaseQuery<EnrollmentWithCourse[]>(
    () =>
      student
        ? supabase
            .from('enrollments')
            .select('id, progress_percent, courses(id, title, is_islamic, delivery_mode, color)')
            .eq('student_id', student.id)
            .returns<EnrollmentWithCourse[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  if (studentLoading || loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.courses')}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(enrollments ?? []).map((e) => (
          <Card key={e.id}>
            <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: e.courses?.color ?? '#0F766E' }} />
            <CardBody>
              <div className="flex items-center gap-2">
                <Badge tone={e.courses?.is_islamic ? 'warning' : 'brand'}>{e.courses?.is_islamic ? t('courses.islamic') : t('courses.academic')}</Badge>
                <Badge tone="neutral">{e.courses?.delivery_mode}</Badge>
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{e.courses?.title}</h3>
              <div className="mt-3 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full" style={{ width: `${e.progress_percent}%`, backgroundColor: e.courses?.color ?? '#0F766E' }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('courses.complete', { percent: e.progress_percent })}</p>
              <Link to={`/student/courses/${e.courses?.id}`} className="mt-3 block">
                <Button size="sm" className="w-full">
                  {t('courses.continueLearning')}
                </Button>
              </Link>
            </CardBody>
          </Card>
        ))}
        {(enrollments ?? []).length === 0 && <EmptyState title={t('courses.empty')} description={t('courses.emptyDescription')} />}
      </div>
    </div>
  )
}
