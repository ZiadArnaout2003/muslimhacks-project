import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { ClassStatus } from '../../types/database'

interface BookingRow {
  class_id: string
  students: { first_name: string; last_name: string } | null
  classes: {
    id: string
    title: string
    start_datetime: string
    end_datetime: string
    status: ClassStatus
    provider: string
  } | null
}

const STATUS_TONE: Record<ClassStatus, 'brand' | 'success' | 'danger' | 'warning'> = {
  scheduled: 'brand',
  completed: 'success',
  cancelled: 'danger',
  rescheduled: 'warning',
}

export function ParentBookingsPage() {
  const { session } = useAuth()

  const { data: children } = useSupabaseQuery<{ id: string }[]>(
    () => supabase.from('students').select('id').eq('parent_id', session?.user.id ?? ''),
    [session?.user.id]
  )
  const childIds = (children ?? []).map((c) => c.id)

  const { data: bookings, loading } = useSupabaseQuery<BookingRow[]>(
    () =>
      childIds.length
        ? supabase
            .from('class_students')
            .select('class_id, students(first_name, last_name), classes(id, title, start_datetime, end_datetime, status, provider)')
            .in('student_id', childIds)
            .returns<BookingRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [childIds.join(',')]
  )

  const localTz = browserTimezone()
  const sorted = [...(bookings ?? [])].sort(
    (a, b) => new Date(a.classes?.start_datetime ?? 0).getTime() - new Date(b.classes?.start_datetime ?? 0).getTime()
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bookings & Schedule</h1>
        <Link to="/book">
          <Button size="sm">
            <CalendarPlus className="h-4 w-4" /> Book a Class
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        {loading && <LoadingState />}
        {!loading && sorted.length === 0 && (
          <EmptyState title="No classes booked yet" description="Find a teacher and book your first class." />
        )}
        {!loading && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((row) => {
              const cls = row.classes!
              const isSoon = new Date(cls.start_datetime).getTime() - Date.now() < 15 * 60 * 1000 && cls.status === 'scheduled'
              return (
                <Card key={`${row.class_id}-${row.students?.first_name}`}>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{cls.title}</p>
                        <Badge tone={STATUS_TONE[cls.status]}>{cls.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        For {row.students?.first_name} · {formatDateInZone(cls.start_datetime, localTz)} ·{' '}
                        {formatTimeInZone(cls.start_datetime, localTz)}–{formatTimeInZone(cls.end_datetime, localTz)} (
                        {localTz}) · via {cls.provider}
                      </p>
                    </div>
                    <Button size="sm" disabled={!isSoon}>
                      Join Class
                    </Button>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
