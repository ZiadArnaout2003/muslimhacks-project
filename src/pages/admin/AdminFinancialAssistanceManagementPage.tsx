import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { AssistanceStatus, FinancialAssistanceApplication } from '../../types/database'

interface ApplicationRow extends FinancialAssistanceApplication {
  students: { first_name: string; last_name: string } | null
  parents: { profiles: { first_name: string; last_name: string; email: string } | null } | null
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
  const { data: applications, loading } = useSupabaseQuery<ApplicationRow[]>(
    () =>
      supabase
        .from('financial_assistance_applications')
        .select('*, students(first_name, last_name), parents(profiles(first_name, last_name, email))')
        .order('created_at', { ascending: false }),
    []
  )

  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Financial Assistance Management</h1>

      <div className="mt-6 space-y-3">
        {loading && <LoadingState />}
        {!loading && (applications ?? []).length === 0 && <EmptyState title="No applications" />}
        {(applications ?? []).map((app) => (
          <Card key={app.id}>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {app.students?.first_name} {app.students?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Parent: {app.parents?.profiles?.first_name} {app.parents?.profiles?.last_name} ·{' '}
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[app.status]}>
                    {app.status.replace('_', ' ')}
                    {app.approved_percent ? ` · ${app.approved_percent}%` : ''}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === app.id ? null : app.id)}>
                    {openId === app.id ? 'Close' : 'Review'}
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
          <p className="text-gray-400">Household size</p>
          <p className="text-gray-800">{app.household_size}</p>
        </div>
        <div>
          <p className="text-gray-400">Dependents</p>
          <p className="text-gray-800">{app.dependents}</p>
        </div>
        <div>
          <p className="text-gray-400">Income range</p>
          <p className="text-gray-800">{app.income_range}</p>
        </div>
      </div>
      <div>
        <p className="text-gray-400">Reason</p>
        <p className="text-gray-800">{app.reason}</p>
      </div>

      <Textarea placeholder="Internal note (not visible to the family)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" min={1} max={99} className="w-24" value={percent} onChange={(e) => setPercent(e.target.value)} />
        <span className="text-xs text-gray-500">% reduction</span>
        <Button size="sm" loading={busy} onClick={() => decide('partially_approved')}>
          Approve Partial
        </Button>
        <Button size="sm" loading={busy} onClick={() => decide('approved')}>
          Approve Full
        </Button>
        <Button size="sm" variant="outline" loading={busy} onClick={() => decide('interview_scheduled')}>
          Schedule Interview
        </Button>
        <Button size="sm" variant="danger" loading={busy} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
    </div>
  )
}
