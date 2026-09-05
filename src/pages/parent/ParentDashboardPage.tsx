import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Video, BookOpen, ClipboardList, CreditCard, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { Student, Invoice } from '../../types/database'

interface EnrollmentWithCourse {
  id: string
  progress_percent: number
  status: string
  courses: { id: string; title: string; is_islamic: boolean } | null
}

interface UpcomingClass {
  class_id: string
  classes: {
    id: string
    title: string
    start_datetime: string
    end_datetime: string
    timezone: string
    status: string
    teacher_id: string
  } | null
}

interface AssignmentDue {
  id: string
  title: string
  due_date: string | null
  courses: { title: string } | null
}

export function ParentDashboardPage() {
  const { session } = useAuth()
  const parentId = session?.user.id ?? ''

  const { data: children, loading: childrenLoading } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', parentId).order('created_at'),
    [parentId]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeStudent = children?.find((c) => c.id === selectedId) ?? children?.[0] ?? null

  const { data: enrollments } = useSupabaseQuery<EnrollmentWithCourse[]>(
    () =>
      activeStudent
        ? supabase
            .from('enrollments')
            .select('id, progress_percent, status, courses(id, title, is_islamic)')
            .eq('student_id', activeStudent.id)
            .returns<EnrollmentWithCourse[]>()
        : Promise.resolve({ data: [], error: null }),
    [activeStudent?.id]
  )

  const { data: upcomingClasses } = useSupabaseQuery<UpcomingClass[]>(
    () =>
      activeStudent
        ? supabase
            .from('class_students')
            .select('class_id, classes(id, title, start_datetime, end_datetime, timezone, status, teacher_id)')
            .eq('student_id', activeStudent.id)
            .returns<UpcomingClass[]>()
        : Promise.resolve({ data: [], error: null }),
    [activeStudent?.id]
  )

  const { data: invoices } = useSupabaseQuery<Invoice[]>(
    () => supabase.from('invoices').select('*').eq('parent_id', parentId).order('created_at', { ascending: false }),
    [parentId]
  )

  const courseIds = (enrollments ?? []).map((e) => e.courses?.id).filter(Boolean) as string[]
  const { data: assignments } = useSupabaseQuery<AssignmentDue[]>(
    () =>
      courseIds.length
        ? supabase
            .from('assignments')
            .select('id, title, due_date, courses(title)')
            .in('course_id', courseIds)
            .order('due_date')
            .returns<AssignmentDue[]>()
        : Promise.resolve({ data: [], error: null }),
    [courseIds.join(',')]
  )

  const localTz = browserTimezone()
  const upcoming = (upcomingClasses ?? [])
    .filter((c) => c.classes && new Date(c.classes.start_datetime) > new Date())
    .sort((a, b) => new Date(a.classes!.start_datetime).getTime() - new Date(b.classes!.start_datetime).getTime())

  const pendingPayments = (invoices ?? []).filter((i) => i.status === 'pending' || i.status === 'overdue')

  if (childrenLoading) return <LoadingState label="Loading your family…" />

  if (!children || children.length === 0) {
    return (
      <EmptyState
        title="No children added yet"
        description="Add your child's profile to start booking classes and enrolling in courses."
        action={
          <Link to="/parent/onboarding">
            <Button>Add a Child</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Select Student:</span>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    activeStudent?.id === c.id ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.first_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Children" value={children.length} />
        <StatCard icon={Video} label="Upcoming Classes" value={upcoming.length} />
        <StatCard icon={BookOpen} label="Active Courses" value={(enrollments ?? []).filter((e) => e.status === 'active').length} />
        <StatCard icon={CreditCard} label="Payments Due" value={pendingPayments.length} />
      </div>

      {pendingPayments.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          You have {pendingPayments.length} payment(s) pending.{' '}
          <Link to="/parent/payments" className="font-medium underline">
            View payments
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Video className="h-4 w-4" /> Upcoming Classes
            </h2>
            <div className="mt-3 space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-gray-500">No upcoming classes scheduled.</p>}
              {upcoming.map((row) => {
                const cls = row.classes!
                const isSoon = new Date(cls.start_datetime).getTime() - Date.now() < 15 * 60 * 1000
                return (
                  <div key={cls.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{cls.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateInZone(cls.start_datetime, localTz)} · {formatTimeInZone(cls.start_datetime, localTz)}{' '}
                        ({localTz})
                      </p>
                    </div>
                    <Button size="sm" disabled={!isSoon}>
                      Join Class
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ClipboardList className="h-4 w-4" /> Assignment Alerts
            </h2>
            <div className="mt-3 space-y-2">
              {(assignments ?? []).slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500">
                    {a.courses?.title} · Due {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                  </p>
                </div>
              ))}
              {(assignments ?? []).length === 0 && <p className="text-sm text-gray-500">No upcoming deadlines.</p>}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <BookOpen className="h-4 w-4" /> {activeStudent?.first_name}'s Progress
          </h2>
          <div className="mt-3 space-y-3">
            {(enrollments ?? []).map((e) => (
              <div key={e.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">
                    {e.courses?.title} {e.courses?.is_islamic && <Badge tone="warning">Islamic</Badge>}
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
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  )
}
