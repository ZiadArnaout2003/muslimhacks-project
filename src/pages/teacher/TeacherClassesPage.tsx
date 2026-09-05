import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { AttendanceStatus, ClassStatus } from '../../types/database'

interface ClassRow {
  id: string
  title: string
  start_datetime: string
  end_datetime: string
  status: ClassStatus
  meeting_url: string | null
}

interface RosterRow {
  student_id: string
  students: { first_name: string; last_name: string } | null
}

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export function TeacherClassesPage() {
  const { session } = useAuth()
  const teacherId = session?.user.id ?? ''
  const localTz = browserTimezone()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: classes, loading } = useSupabaseQuery<ClassRow[]>(
    () => supabase.from('classes').select('id, title, start_datetime, end_datetime, status, meeting_url').eq('teacher_id', teacherId).order('start_datetime', { ascending: false }),
    [teacherId]
  )

  if (loading) return <LoadingState />

  const upcoming = (classes ?? []).filter((c) => new Date(c.start_datetime) > new Date())
  const past = (classes ?? []).filter((c) => new Date(c.start_datetime) <= new Date())

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
      </div>

      <Section title="Upcoming Classes" classes={upcoming} localTz={localTz} expandedId={expandedId} setExpandedId={setExpandedId} />
      <Section title="Past Classes" classes={past} localTz={localTz} expandedId={expandedId} setExpandedId={setExpandedId} showAttendance />
    </div>
  )
}

function Section({
  title,
  classes,
  localTz,
  expandedId,
  setExpandedId,
  showAttendance,
}: {
  title: string
  classes: ClassRow[]
  localTz: string
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  showAttendance?: boolean
}) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3">
        {classes.length === 0 && <EmptyState title="Nothing here yet" />}
        {classes.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <Badge tone={c.status === 'scheduled' ? 'brand' : c.status === 'completed' ? 'success' : 'neutral'}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDateInZone(c.start_datetime, localTz)} · {formatTimeInZone(c.start_datetime, localTz)}–
                    {formatTimeInZone(c.end_datetime, localTz)} ({localTz})
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  {expandedId === c.id ? 'Hide Roster' : 'View Roster'}
                </Button>
              </div>
              {expandedId === c.id && <Roster classId={c.id} showAttendance={showAttendance} />}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Roster({ classId, showAttendance }: { classId: string; showAttendance?: boolean }) {
  const { data: roster, loading } = useSupabaseQuery<RosterRow[]>(
    () => supabase.from('class_students').select('student_id, students(first_name, last_name)').eq('class_id', classId).returns<RosterRow[]>(),
    [classId]
  )
  const { data: attendance } = useSupabaseQuery<{ student_id: string; status: AttendanceStatus }[]>(
    () => supabase.from('attendance').select('student_id, status').eq('class_id', classId),
    [classId]
  )

  const markAttendance = async (studentId: string, status: AttendanceStatus) => {
    await supabase.from('attendance').upsert({ class_id: classId, student_id: studentId, status }, { onConflict: 'class_id,student_id' })
    window.location.reload()
  }

  if (loading) return <LoadingState />

  return (
    <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
      {(roster ?? []).map((r) => {
        const current = attendance?.find((a) => a.student_id === r.student_id)?.status
        return (
          <div key={r.student_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {r.students?.first_name} {r.students?.last_name}
            </span>
            {showAttendance ? (
              <div className="flex gap-1">
                {ATTENDANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => markAttendance(r.student_id, opt)}
                    className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                      current === opt ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              current && <Badge tone="neutral">{current}</Badge>
            )}
          </div>
        )
      })}
      {(roster ?? []).length === 0 && <p className="text-sm text-gray-500">No students booked yet.</p>}
    </div>
  )
}
