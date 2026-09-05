import { Video, BookOpen, ClipboardList, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'

interface EnrollmentWithCourse {
  id: string
  progress_percent: number
  courses: { id: string; title: string; is_islamic: boolean } | null
}

interface ClassRow {
  class_id: string
  classes: { id: string; title: string; start_datetime: string; status: string } | null
}

interface AssignmentRow {
  id: string
  title: string
  due_date: string | null
  courses: { title: string } | null
}

export function StudentDashboardPage() {
  const { student, loading: studentLoading } = useStudentRecord()
  const localTz = browserTimezone()

  const { data: enrollments } = useSupabaseQuery<EnrollmentWithCourse[]>(
    () =>
      student
        ? supabase.from('enrollments').select('id, progress_percent, courses(id, title, is_islamic)').eq('student_id', student.id).returns<EnrollmentWithCourse[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  const { data: classes } = useSupabaseQuery<ClassRow[]>(
    () =>
      student
        ? supabase.from('class_students').select('class_id, classes(id, title, start_datetime, status)').eq('student_id', student.id).returns<ClassRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  const courseIds = (enrollments ?? []).map((e) => e.courses?.id).filter(Boolean) as string[]
  const { data: assignments } = useSupabaseQuery<AssignmentRow[]>(
    () =>
      courseIds.length
        ? supabase.from('assignments').select('id, title, due_date, courses(title)').in('course_id', courseIds).order('due_date').returns<AssignmentRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [courseIds.join(',')]
  )

  if (studentLoading) return <LoadingState />
  if (!student) return <p className="text-sm text-gray-500">Your student profile could not be found.</p>

  const upcoming = (classes ?? [])
    .filter((c) => c.classes && new Date(c.classes.start_datetime) > new Date())
    .sort((a, b) => new Date(a.classes!.start_datetime).getTime() - new Date(b.classes!.start_datetime).getTime())
  const nextClass = upcoming[0]?.classes
  const canJoinNow = nextClass ? new Date(nextClass.start_datetime).getTime() - Date.now() < 15 * 60 * 1000 : false

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back, {student.first_name}!</h1>

      {nextClass && (
        <Card className="border-brand-200 bg-brand-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-brand-600">Next Class</p>
              <p className="text-lg font-semibold text-gray-900">{nextClass.title}</p>
              <p className="text-sm text-gray-600">
                {formatDateInZone(nextClass.start_datetime, localTz)} · {formatTimeInZone(nextClass.start_datetime, localTz)} ({localTz})
              </p>
            </div>
            <Button disabled={!canJoinNow}>Join Class</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Video} label="Upcoming Classes" value={upcoming.length} />
        <StatCard icon={BookOpen} label="Active Courses" value={(enrollments ?? []).length} />
        <StatCard icon={ClipboardList} label="Assignments Due" value={(assignments ?? []).length} />
        <StatCard
          icon={TrendingUp}
          label="Avg. Progress"
          value={
            enrollments?.length
              ? Math.round((enrollments.reduce((s, e) => s + e.progress_percent, 0) / enrollments.length))
              : 0
          }
          suffix="%"
        />
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">My Courses</h2>
          <div className="mt-3 space-y-3">
            {(enrollments ?? []).map((e) => (
              <div key={e.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-gray-800">
                    {e.courses?.title}
                    {e.courses?.is_islamic && <Badge tone="warning">Islamic</Badge>}
                  </span>
                  <span className="text-gray-500">{e.progress_percent}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${e.progress_percent}%` }} />
                </div>
              </div>
            ))}
            {(enrollments ?? []).length === 0 && <p className="text-sm text-gray-500">Not enrolled in any courses yet.</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">Assignment Deadlines</h2>
          <div className="mt-3 space-y-2">
            {(assignments ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>
                  {a.title} <span className="text-gray-400">· {a.courses?.title}</span>
                </span>
                <span className="text-gray-500">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</span>
              </div>
            ))}
            {(assignments ?? []).length === 0 && <p className="text-sm text-gray-500">No pending assignments.</p>}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix = '' }: { icon: typeof Video; label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">
            {value}
            {suffix}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}
