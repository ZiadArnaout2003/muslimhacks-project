import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { ClassStatus } from '../../types/database'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const { student, loading: studentLoading } = useStudentRecord()

  const { data: bookings, loading } = useSupabaseQuery<BookingRow[]>(
    () =>
      student
        ? supabase
            .from('class_students')
            .select('class_id, students(first_name, last_name), classes(id, title, start_datetime, end_datetime, status, provider)')
            .eq('student_id', student.id)
            .returns<BookingRow[]>()
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  const localTz = browserTimezone()
  const sorted = [...(bookings ?? [])].sort(
    (a, b) => new Date(a.classes?.start_datetime ?? 0).getTime() - new Date(b.classes?.start_datetime ?? 0).getTime()
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.bookings')}</h1>
        <Link to="/student/book">
          <Button size="sm">
            <CalendarPlus className="h-4 w-4" /> {t('common.bookClass')}
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        {(loading || studentLoading) && <LoadingState />}
        {!loading && !studentLoading && sorted.length === 0 && (
          <EmptyState title={t('parentBookings.empty')} description={t('parentBookings.emptyDescription')} />
        )}
        {!loading && !studentLoading && sorted.length > 0 && (
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
                        <Badge tone={STATUS_TONE[cls.status]}>{t(`admin.classStatuses.${cls.status}`)}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {t('parentBookings.forStudent', { name: row.students?.first_name })} · {formatDateInZone(cls.start_datetime, localTz)} ·{' '}
                        {formatTimeInZone(cls.start_datetime, localTz)}–{formatTimeInZone(cls.end_datetime, localTz)} (
                        {localTz}) · {t('parentBookings.via', { provider: cls.provider })}
                      </p>
                    </div>
                    <Button size="sm" disabled={!isSoon}>
                      {t('parentBookings.joinClass')}
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
