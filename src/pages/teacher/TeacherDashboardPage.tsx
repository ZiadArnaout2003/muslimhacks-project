import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Video, DollarSign, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { TeacherStatus } from '../../types/database'
import {
  DashboardAnnouncements,
  type DashboardAnnouncement,
} from '../../components/dashboard/DashboardAnnouncements'

interface ClassRow {
  id: string
  title: string
  start_datetime: string
  status: string
}

interface EarningsRow {
  price_charged: number | null
}

export function TeacherDashboardPage() {
  const { t } = useTranslation()
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

  const { data: announcements } = useSupabaseQuery<DashboardAnnouncement[]>(
    () =>
      supabase
        .from('announcements')
        .select('id, title, body, created_at, courses(title)')
        .order('created_at', { ascending: false })
        .limit(5)
        .returns<DashboardAnnouncement[]>(),
    [teacherId]
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
      <h1 className="text-2xl font-bold text-gray-900">{t('teacherDashboard.welcome', { name: profile?.first_name })}</h1>

      {teacherRow?.status !== 'approved' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {t('teacherDashboard.accountStatus')} <strong className="mx-1">{t(`admin.teacherStatuses.${teacherRow?.status}`)}</strong>. {t('teacherDashboard.approvalNote')}{' '}
          <Link to="/teacher/application-status" className="ml-1 font-medium underline">
            {t('teacherDashboard.viewApplicationStatus')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Video} label={t('teacherDashboard.upcomingClasses')} value={upcoming.length} />
        <StatCard icon={DollarSign} label={t('teacherDashboard.earnings')} value={totalEarnings} prefix="$" />
      </div>

      <Card>
        <CardBody>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Video className="h-4 w-4" /> {t('teacherDashboard.upcomingClasses')}
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
            {upcoming.length === 0 && <p className="text-sm text-gray-500">{t('teacherDashboard.noUpcomingClasses')}</p>}
          </div>
        </CardBody>
      </Card>

      <DashboardAnnouncements
        heading={t('teacherCourseEditor.announcements')}
        announcements={announcements ?? []}
      />
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
