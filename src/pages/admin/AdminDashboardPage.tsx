import { Users, GraduationCap, ClipboardList, BookOpen, Video, DollarSign, HandHeart } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { useTranslation } from 'react-i18next'

interface Stats {
  total_students: number
  active_teachers: number
  pending_applications: number
  active_courses: number
  upcoming_classes: number
  revenue_total: number
  financial_assistance_cases: number
  total_enrollments: number
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const { data: stats, loading, error } = useSupabaseQuery<Stats>(() => supabase.rpc('admin_dashboard_stats'), [])

  if (loading) return <LoadingState label={t('admin.loadingStatistics')} />
  if (error) return <ErrorState message={error} />
  if (!stats) return null

  const cards = [
    { icon: Users, label: t('admin.totalStudents'), value: stats.total_students },
    { icon: GraduationCap, label: t('admin.activeTeachers'), value: stats.active_teachers },
    { icon: ClipboardList, label: t('admin.pendingApplications'), value: stats.pending_applications },
    { icon: BookOpen, label: t('admin.activeCourses'), value: stats.active_courses },
    { icon: Video, label: t('admin.upcomingClasses'), value: stats.upcoming_classes },
    { icon: DollarSign, label: t('admin.revenuePaid'), value: `$${stats.revenue_total}` },
    { icon: HandHeart, label: t('admin.assistanceCasesOpen'), value: stats.financial_assistance_cases },
    { icon: BookOpen, label: t('admin.totalEnrollments'), value: stats.total_enrollments },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBody className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
