import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { AssistanceStatus, FinancialAssistanceApplication } from '../../types/database'
import { useTranslation } from 'react-i18next'

interface ApplicationRow extends FinancialAssistanceApplication {
  students: { first_name: string; last_name: string } | null
}

const STATUS_TONE: Record<AssistanceStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  submitted: 'neutral',
  under_review: 'brand',
  interview_scheduled: 'brand',
  info_required: 'warning',
  approved: 'success',
  partially_approved: 'success',
  rejected: 'danger',
}

export function AdminFinancialAssistanceManagementPage() {
  const { t } = useTranslation()
  const { data: applications, loading } = useSupabaseQuery<ApplicationRow[]>(
    () =>
      supabase
        .from('financial_assistance_applications')
        .select('*, students(first_name, last_name)')
        .order('created_at', { ascending: false }),
    []
  )

  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.assistanceManagement')}</h1>

      <div className="mt-6 space-y-3">
        {loading && <LoadingState />}
        {!loading && (applications ?? []).length === 0 && <EmptyState title={t('admin.noApplications')} />}
        {(applications ?? []).map((app) => (
          <Card key={app.id}>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {app.students?.first_name} {app.students?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[app.status]}>
                    {t(`admin.assistanceStatuses.${app.status}`)}
                    {app.approved_percent ? ` · ${app.approved_percent}%` : ''}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === app.id ? null : app.id)}>
                    {openId === app.id ? t('admin.close') : t('admin.review')}
                  </Button>
                </div>
              </div>

              {openId === app.id && <ReviewPanel app={app} />}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ReviewPanel({ app }: { app: ApplicationRow }) {
  const { t } = useTranslation()
  const [percent, setPercent] = useState(app.approved_percent?.toString() ?? '50')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const decide = async (status: AssistanceStatus) => {
    setBusy(true)
    await supabase
      .from('financial_assistance_applications')
      .update({
        status,
        approved_percent: status === 'approved' ? 100 : status === 'partially_approved' ? Number(percent) : null,
      })
      .eq('id', app.id)

    if (note) {
      await supabase.from('assistance_notes').insert({ application_id: app.id, admin_id: (await supabase.auth.getUser()).data.user?.id, note })
    }
    setBusy(false)
    window.location.reload()
  }

  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-gray-400">{t('admin.householdSize')}</p>
          <p className="text-gray-800">{app.household_size}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('admin.dependents')}</p>
          <p className="text-gray-800">{app.dependents}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('admin.incomeRange')}</p>
          <p className="text-gray-800">{app.income_range}</p>
        </div>
      </div>
      <div>
        <p className="text-gray-400">{t('admin.reason')}</p>
        <p className="text-gray-800">{app.reason}</p>
      </div>

      <Textarea placeholder={t('admin.internalNote')} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" min={1} max={99} className="w-24" value={percent} onChange={(e) => setPercent(e.target.value)} />
        <span className="text-xs text-gray-500">{t('admin.percentReduction')}</span>
        <Button size="sm" loading={busy} onClick={() => decide('partially_approved')}>
          {t('admin.approvePartial')}
        </Button>
        <Button size="sm" loading={busy} onClick={() => decide('approved')}>
          {t('admin.approveFull')}
        </Button>
        <Button size="sm" variant="outline" loading={busy} onClick={() => decide('interview_scheduled')}>
          {t('admin.scheduleInterview')}
        </Button>
        <Button size="sm" variant="danger" loading={busy} onClick={() => decide('rejected')}>
          {t('admin.reject')}
        </Button>
      </div>
    </div>
  )
}
