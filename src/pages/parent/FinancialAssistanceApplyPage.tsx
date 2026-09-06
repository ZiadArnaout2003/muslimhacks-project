import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, Textarea, FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import type { FinancialAssistanceApplication } from '../../types/database'
import { useTranslation } from 'react-i18next'
import { useStudentRecord } from '../../hooks/useStudentRecord'

export function FinancialAssistanceApplyPage() {
  const { t } = useTranslation()
  const incomeRanges = t('assistanceApplication.incomeRanges', { returnObjects: true }) as string[]
  const { session } = useAuth()
  const navigate = useNavigate()

  const { student, loading: studentLoading } = useStudentRecord()

  const { data: existing, loading: existingLoading } = useSupabaseQuery<FinancialAssistanceApplication[]>(
    () =>
      supabase
        .from('financial_assistance_applications')
        .select('*')
        .eq('student_id', student?.id ?? '')
        .order('created_at', { ascending: false }),
    [student?.id]
  )

  const [form, setForm] = useState({ householdSize: '', incomeRange: incomeRanges[0], dependents: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!session || !student) {
      setError(t('assistanceApplication.selectStudent'))
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('financial_assistance_applications').insert({
      student_id: student.id,
      household_size: Number(form.householdSize) || null,
      income_range: form.incomeRange,
      dependents: Number(form.dependents) || null,
      reason: form.reason,
      status: 'submitted',
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSubmitted(true)
  }

  if (existingLoading || studentLoading) return <LoadingState />
  if (!student) return <FieldError>Unable to load your student profile.</FieldError>

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('assistanceApplication.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t('assistanceApplication.intro')}
      </p>

      {(existing ?? []).length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <h2 className="font-semibold text-gray-900">{t('assistanceApplication.yourApplications')}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(existing ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span>{t('assistanceApplication.submitted', { date: new Date(a.created_at).toLocaleDateString() })}</span>
                  <span className="flex items-center gap-1 font-medium text-brand-700">
                    <ShieldCheck className="h-4 w-4" />
                    {t(`admin.assistanceStatuses.${a.status}`)}
                    {a.approved_percent ? ` (${t('assistanceApplication.percentApproved', { percent: a.approved_percent })})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card className="mt-6">
        <CardBody className="space-y-4">
          {submitted ? (
            <p className="text-sm text-gray-600">
              {t('assistanceApplication.success')}
            </p>
          ) : (
            <>
              <div>
                <Label>{t('booking.student')}</Label>
                <p className="mt-1 font-medium text-gray-900">{student.first_name} {student.last_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="householdSize">{t('admin.householdSize')}</Label>
                  <Input id="householdSize" type="number" min={1} value={form.householdSize} onChange={update('householdSize')} />
                </div>
                <div>
                  <Label htmlFor="dependents">{t('assistanceApplication.numberDependents')}</Label>
                  <Input id="dependents" type="number" min={0} value={form.dependents} onChange={update('dependents')} />
                </div>
              </div>
              <div>
                <Label htmlFor="income">{t('assistanceApplication.householdIncome')}</Label>
                <Select id="income" value={form.incomeRange} onChange={update('incomeRange')}>
                  {incomeRanges.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">{t('assistanceApplication.situation')}</Label>
                <Textarea id="reason" rows={4} value={form.reason} onChange={update('reason')} placeholder={t('assistanceApplication.reasonPlaceholder')} />
              </div>
              <FieldError>{error}</FieldError>
              <Button className="w-full" loading={loading} onClick={handleSubmit}>
                {t('assistanceApplication.submit')}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className="w-full text-center text-xs text-gray-400 hover:underline"
              >
                {t('common.cancel')}
              </button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
