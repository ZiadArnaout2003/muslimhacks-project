import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import type { Course, FinancialAssistanceApplication } from '../../types/database'
import { useTranslation } from 'react-i18next'
import { useStudentRecord } from '../../hooks/useStudentRecord'

export function CheckoutPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const courseId = params.get('courseId') ?? ''

  const { student, loading: studentLoading } = useStudentRecord()
  const { data: course, loading } = useSupabaseQuery<Course>(
    () => supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    [courseId]
  )

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: assistance } = useSupabaseQuery<FinancialAssistanceApplication[]>(
    () =>
      student
        ? supabase
            .from('financial_assistance_applications')
            .select('*')
            .eq('student_id', student.id)
            .in('status', ['approved', 'partially_approved'])
            .order('created_at', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    [student?.id]
  )

  if (loading || studentLoading) return <LoadingState />
  if (!course) return <FieldError>{t('checkout.courseNotFound')}</FieldError>
  if (!student) return <FieldError>Unable to load your student profile.</FieldError>

  const discountPercent = assistance?.[0]?.approved_percent ?? 0
  const discountAmount = Number(((course.price * discountPercent) / 100).toFixed(2))
  const finalAmount = Number((course.price - discountAmount).toFixed(2))

  const handleConfirm = async () => {
    if (!session) {
      setError(t('checkout.selectStudentError'))
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: invoiceError } = await supabase.rpc('student_checkout_course', {
      p_course_id: course.id,
    })

    if (invoiceError) {
      setSubmitting(false)
      setError(invoiceError.message)
      return
    }

    setSubmitting(false)
    navigate('/student/payments', { state: { justEnrolled: course.title } })
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('checkout.title')}</h1>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">{t('checkout.course')}</p>
            <p className="font-medium text-gray-900">{course.title}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-400">{t('booking.student')}</p>
            <p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p>
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('checkout.price')}</span>
              <span>${course.price.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> {t('checkout.assistance', { percent: discountPercent })}
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
              <span>{t('checkout.totalDue')}</span>
              <span>${finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            {t('checkout.demoNote')}
          </p>

          <FieldError>{error}</FieldError>

          <Button className="w-full" loading={submitting} onClick={handleConfirm}>
            {t('checkout.confirmEnrollment')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
