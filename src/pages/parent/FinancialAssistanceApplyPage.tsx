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
import type { FinancialAssistanceApplication, Student } from '../../types/database'

const INCOME_RANGES = ['Under $20,000/year', '$20,000–$40,000/year', '$40,000–$60,000/year', 'Over $60,000/year', 'Prefer not to say']

export function FinancialAssistanceApplyPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const { data: children } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', session?.user.id ?? ''),
    [session?.user.id]
  )

  const { data: existing, loading: existingLoading } = useSupabaseQuery<FinancialAssistanceApplication[]>(
    () =>
      supabase
        .from('financial_assistance_applications')
        .select('*')
        .eq('parent_id', session?.user.id ?? '')
        .order('created_at', { ascending: false }),
    [session?.user.id]
  )

  const [form, setForm] = useState({ studentId: '', householdSize: '', incomeRange: INCOME_RANGES[0], dependents: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!session || !form.studentId) {
      setError('Please select a student.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('financial_assistance_applications').insert({
      parent_id: session.user.id,
      student_id: form.studentId,
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

  if (existingLoading || !children) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Assistance Application</h1>
      <p className="mt-1 text-sm text-gray-500">
        We only ask for what's needed to evaluate your request. Your application is reviewed privately and never
        shared publicly.
      </p>

      {(existing ?? []).length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <h2 className="font-semibold text-gray-900">Your Applications</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(existing ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span>Submitted {new Date(a.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 font-medium text-brand-700">
                    <ShieldCheck className="h-4 w-4" />
                    {a.status.replace('_', ' ')}
                    {a.approved_percent ? ` (${a.approved_percent}% approved)` : ''}
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
              Your application has been submitted. An administrator will review it and may reach out to schedule
              a brief interview.
            </p>
          ) : (
            <>
              <div>
                <Label htmlFor="student">Student</Label>
                <Select id="student" value={form.studentId} onChange={update('studentId')}>
                  <option value="">Select a child</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="householdSize">Household size</Label>
                  <Input id="householdSize" type="number" min={1} value={form.householdSize} onChange={update('householdSize')} />
                </div>
                <div>
                  <Label htmlFor="dependents">Number of dependents</Label>
                  <Input id="dependents" type="number" min={0} value={form.dependents} onChange={update('dependents')} />
                </div>
              </div>
              <div>
                <Label htmlFor="income">Household income range</Label>
                <Select id="income" value={form.incomeRange} onChange={update('incomeRange')}>
                  {INCOME_RANGES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Tell us about your situation</Label>
                <Textarea id="reason" rows={4} value={form.reason} onChange={update('reason')} placeholder="Briefly explain why you're requesting assistance." />
              </div>
              <FieldError>{error}</FieldError>
              <Button className="w-full" loading={loading} onClick={handleSubmit}>
                Submit Application
              </Button>
              <button
                type="button"
                onClick={() => navigate('/parent/dashboard')}
                className="w-full text-center text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
