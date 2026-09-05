import { Link } from 'react-router-dom'
import { Video, ClipboardList, BookOpen, DollarSign, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { TeacherStatus } from '../../types/database'

interface ClassRow {
  id: string
  title: string
  start_datetime: string
  status: string
}

interface CourseRow {
  id: string
  title: string
}

interface SubmissionToGrade {
  id: string
  status: string
  assignments: { title: string; course_id: string } | null
}

interface EarningsRow {
  price_charged: number | null
}

export function TeacherDashboardPage() {
  const { session, profile } = useAuth()
  const teacherId = session?.user.id ?? ''
  const localTz = browserTimezone()

  const { data: teacherRow, loading: statusLoading } = useSupabaseQuery<{ status: TeacherStatus }>(
    () => supabase.from('teachers').select('status').eq('profile_id', teacherId).maybeSingle(),
    [teacherId]
  )

  const { data: classes } = useSupabaseQuery<ClassRow[]>(
    () => supabase.from('classes').select('id, title, start_datetime, status').eq('teacher_id', teacherId).order('start_datetime'),
    [teacherId]
  )

  const { data: courses } = useSupabaseQuery<CourseRow[]>(
    () => supabase.from('courses').select('id, title').eq('teacher_id', teacherId),
    [teacherId]
  )
  const courseIds = (courses ?? []).map((c) => c.id)

  const { data: assignmentIdRows } = useSupabaseQuery<{ id: string; course_id: string }[]>(
    () =>
      courseIds.length
        ? supabase.from('assignments').select('id, course_id').in('course_id', courseIds)
        : Promise.resolve({ data: [], error: null }),
    [courseIds.join(',')]
  )
  const assignmentIds = (assignmentIdRows ?? []).map((a) => a.id)

  const { data: submissions } = useSupabaseQuery<SubmissionToGrade[]>(
    () =>
      assignmentIds.length
        ? supabase
            .from('submissions')
            .select('id, status, assignments(title, course_id)')
            .in('assignment_id', assignmentIds)
            .eq('status', 'submitted')
            .returns<SubmissionToGrade[]>()
        : Promise.resolve({ data: [], error: null }),
    [assignmentIds.join(',')]
  )

  const { data: teacherClassIds } = useSupabaseQuery<{ id: string }[]>(
    () => supabase.from('classes').select('id').eq('teacher_id', teacherId),
    [teacherId]
  )
  const classIdList = (teacherClassIds ?? []).map((c) => c.id)

  const { data: earnings } = useSupabaseQuery<EarningsRow[]>(
    () =>
      classIdList.length
        ? supabase.from('class_students').select('price_charged').in('class_id', classIdList)
        : Promise.resolve({ data: [], error: null }),
    [classIdList.join(',')]
  )

  if (statusLoading) return <LoadingState />

  const upcoming = (classes ?? []).filter((c) => c.status === 'scheduled' && new Date(c.start_datetime) > new Date())
  const totalEarnings = (earnings ?? []).reduce((s, e) => s + Number(e.price_charged ?? 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.first_name}</h1>

      {teacherRow?.status !== 'approved' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          Your teacher account is <strong className="mx-1">{teacherRow?.status}</strong>. You'll be able to
          create courses and accept bookings once approved.{' '}
          <Link to="/teacher/application-status" className="ml-1 font-medium underline">
            View application status
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Video} label="Upcoming Classes" value={upcoming.length} />
        <StatCard icon={BookOpen} label="Courses" value={(courses ?? []).length} />
        <StatCard icon={ClipboardList} label="To Grade" value={(submissions ?? []).length} />
        <StatCard icon={DollarSign} label="Earnings (demo)" value={totalEarnings} prefix="$" />
      </div>

      <Card>
        <CardBody>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Video className="h-4 w-4" /> Upcoming Classes
          </h2>
          <div className="mt-3 space-y-2">
            {upcoming.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>{c.title}</span>
                <span className="text-gray-500">
                  {formatDateInZone(c.start_datetime, localTz)} · {formatTimeInZone(c.start_datetime, localTz)} ({localTz})
                </span>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-gray-500">No upcoming classes.</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <ClipboardList className="h-4 w-4" /> Submissions to Grade
          </h2>
          <div className="mt-3 space-y-2">
            {(submissions ?? []).slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>{s.assignments?.title}</span>
                <Badge tone="warning">submitted</Badge>
              </div>
            ))}
            {(submissions ?? []).length === 0 && <p className="text-sm text-gray-500">Nothing waiting to be graded.</p>}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, prefix = '' }: { icon: typeof Video; label: string; value: number; prefix?: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">
            {prefix}
            {value}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}
