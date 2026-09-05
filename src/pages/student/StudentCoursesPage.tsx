import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState } from '../../components/ui/States'

interface EnrollmentWithCourse {
  id: string
  progress_percent: number
  courses: { id: string; title: string; is_islamic: boolean; delivery_mode: string } | null
}

export function StudentCoursesPage() {
  const { student, loading: studentLoading } = useStudentRecord()

  const { data: enrollments, loading } = useSupabaseQuery<EnrollmentWithCourse[]>(
    () =>
      student
        ? supabase
            .from('enrollments')
            .select('id, progress_percent, courses(id, title, is_islamic, delivery_mode)')
            .eq('student_id', student.id)
            .returns<EnrollmentWithCourse[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  if (studentLoading || loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(enrollments ?? []).map((e) => (
          <Card key={e.id}>
            <CardBody>
              <div className="flex items-center gap-2">
                <Badge tone={e.courses?.is_islamic ? 'warning' : 'brand'}>{e.courses?.is_islamic ? 'Islamic' : 'Academic'}</Badge>
                <Badge tone="neutral">{e.courses?.delivery_mode}</Badge>
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{e.courses?.title}</h3>
              <div className="mt-3 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-brand-600" style={{ width: `${e.progress_percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{e.progress_percent}% complete</p>
              <Link to={`/student/courses/${e.courses?.id}`} className="mt-3 block">
                <Button size="sm" className="w-full">
                  Continue Learning
                </Button>
              </Link>
            </CardBody>
          </Card>
        ))}
        {(enrollments ?? []).length === 0 && <EmptyState title="No courses yet" description="Browse the catalogue to enroll." />}
      </div>
    </div>
  )
}
