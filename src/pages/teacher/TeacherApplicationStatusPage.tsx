import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, AlertTriangle, XCircle, MailWarning } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import type { TeacherApplication } from '../../types/database'

const STEPS: TeacherApplication['status'][] = ['submitted', 'under_review', 'info_requested', 'approved']

export function TeacherApplicationStatusPage() {
  const { t } = useTranslation()
  const location = useLocation() as { state?: { pendingConfirmation?: boolean } }
  const { session, profile } = useAuth()

  const { data: application, loading, error } = useSupabaseQuery<TeacherApplication>(
    () =>
      supabase
        .from('teacher_applications')
        .select('*')
        .eq('profile_id', profile?.id ?? session?.user.id ?? '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    [profile?.id, session?.user.id]
  )

  if (location.state?.pendingConfirmation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <MailWarning className="mx-auto h-10 w-10 text-gold-600" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">{t('teacherApplicationStatus.confirmEmail')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t('teacherApplicationStatus.confirmEmailDescription')}
        </p>
      </div>
    )
  }

  if (loading) return <LoadingState label={t('teacherApplicationStatus.loading')} />
  if (error) return <ErrorState message={error} />
  if (!application)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState title={t('teacherApplicationStatus.empty')} description={t('teacherApplicationStatus.emptyDescription')} />
      </div>
    )

  const isRejected = application.status === 'rejected'
  const currentIndex = STEPS.findIndex((status) => status === application.status)

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('teacherApplicationStatus.title')}</h1>

      <Card className="mt-6">
        <CardBody>
          {isRejected ? (
            <div className="flex items-center gap-3 text-red-700">
              <XCircle className="h-6 w-6" />
              <p className="font-medium">{t('teacherApplicationStatus.rejected')}</p>
            </div>
          ) : (
            <ol className="flex flex-wrap items-center gap-2">
              {STEPS.map((step, i) => {
                const done = i <= currentIndex
                return (
                  <li key={step} className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                        done ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step === 'info_requested' && done ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      {t(`teacherApplicationStatus.statuses.${step}`)}
                    </div>
                    {i < STEPS.length - 1 && <span className="h-px w-4 bg-gray-300" />}
                  </li>
                )
              })}
            </ol>
          )}

          {application.admin_message && (
            <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">{t('teacherApplicationStatus.adminMessage')}</p>
              <p className="mt-1">{application.admin_message}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t('teacherApplicationStatus.subjects')}</p>
              <p className="font-medium text-gray-900">{application.subjects.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('teacherApplicationStatus.gradeLevels')}</p>
              <p className="font-medium text-gray-900">{application.grade_levels.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('teacherApplicationStatus.submitted')}</p>
              <p className="font-medium text-gray-900">{new Date(application.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
