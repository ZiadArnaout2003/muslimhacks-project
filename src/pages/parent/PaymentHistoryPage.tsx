import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Invoice, InvoiceStatus } from '../../types/database'
import { useTranslation } from 'react-i18next'

const STATUS_TONE: Record<InvoiceStatus, 'brand' | 'success' | 'danger' | 'warning' | 'neutral'> = {
  draft: 'neutral',
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
  refunded: 'neutral',
}

export function PaymentHistoryPage() {
  const { t } = useTranslation()
  const { student, loading: studentLoading } = useStudentRecord()
  const { data: invoices, loading } = useSupabaseQuery<Invoice[]>(
    () => supabase.from('invoices').select('*').eq('student_id', student?.id ?? '').order('created_at', { ascending: false }),
    [student?.id]
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {(loading || studentLoading) && <LoadingState />}
        {!loading && !studentLoading && (invoices ?? []).length === 0 && <EmptyState title={t('payments.empty')} />}
        {!loading && !studentLoading && (invoices ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('payments.description')}</th>
                <th className="px-4 py-3">{t('payments.date')}</th>
                <th className="px-4 py-3">{t('payments.amount')}</th>
                <th className="px-4 py-3">{t('payments.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoices ?? []).map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">{inv.description}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {inv.discount_amount > 0 && (
                      <span className="mr-1 text-xs text-gray-400 line-through">${inv.amount.toFixed(2)}</span>
                    )}
                    <span className="font-medium">${inv.final_amount.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[inv.status]}>{t(`payments.statuses.${inv.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs font-medium text-brand-600 hover:underline">{t('payments.download')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
