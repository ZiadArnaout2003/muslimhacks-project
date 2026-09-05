import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select, FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import type { Course, FinancialAssistanceApplication, Student } from '../../types/database'

export function CheckoutPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const courseId = params.get('courseId') ?? ''

  const { data: children } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', session?.user.id ?? ''),
    [session?.user.id]
  )
  const { data: course, loading } = useSupabaseQuery<Course>(
    () => supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    [courseId]
  )

  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (children && children.length === 1) setStudentId(children[0].id)
  }, [children])

  const { data: assistance } = useSupabaseQuery<FinancialAssistanceApplication[]>(
    () =>
      studentId
        ? supabase
            .from('financial_assistance_applications')
            .select('*')
            .eq('student_id', studentId)
            .in('status', ['approved', 'partially_approved'])
            .order('created_at', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    [studentId]
  )

  if (loading || !children) return <LoadingState />
  if (!course) return <FieldError>Course not found.</FieldError>

  const discountPercent = assistance?.[0]?.approved_percent ?? 0
  const discountAmount = Number(((course.price * discountPercent) / 100).toFixed(2))
  const finalAmount = Number((course.price - discountAmount).toFixed(2))

  const handleConfirm = async () => {
    if (!session || !studentId) {
      setError('Please select a student.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: enrollError } = await supabase.from('enrollments').insert({
      student_id: studentId,
      course_id: course.id,
      status: 'active',
      progress_percent: 0,
    })
    if (enrollError) {
      setSubmitting(false)
      setError(enrollError.message.includes('duplicate') ? 'This student is already enrolled in this course.' : enrollError.message)
      return
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        parent_id: session.user.id,
        student_id: studentId,
        description: `Enrollment — ${course.title}`,
        tier: discountPercent > 0 ? 'assisted' : 'standard',
        amount: course.price,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        currency: course.currency,
        status: 'paid',
      })
      .select()
      .single()

    if (invoiceError) {
      setSubmitting(false)
      setError(invoiceError.message)
      return
    }

    await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount: finalAmount,
      currency: course.currency,
      method: 'demo_card',
      status: 'paid',
      paid_at: new Date().toISOString(),
    })

    setSubmitting(false)
    navigate('/parent/payments', { state: { justEnrolled: course.title } })
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Course</p>
            <p className="font-medium text-gray-900">{course.title}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-400">Student</p>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select a child</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Price</span>
              <span>${course.price.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Financial assistance ({discountPercent}%)
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
              <span>Total due</span>
              <span>${finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            Demo checkout — no real charge is processed. A production deployment would collect payment here
            through a provider such as Stripe rather than storing card details directly.
          </p>

          <FieldError>{error}</FieldError>

          <Button className="w-full" loading={submitting} onClick={handleConfirm}>
            Confirm Enrollment
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
