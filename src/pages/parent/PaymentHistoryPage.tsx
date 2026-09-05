import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Invoice, InvoiceStatus } from '../../types/database'

const STATUS_TONE: Record<InvoiceStatus, 'brand' | 'success' | 'danger' | 'warning' | 'neutral'> = {
  draft: 'neutral',
  pending: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
  refunded: 'neutral',
}

export function PaymentHistoryPage() {
  const { session } = useAuth()
  const { data: invoices, loading } = useSupabaseQuery<Invoice[]>(
    () => supabase.from('invoices').select('*').eq('parent_id', session?.user.id ?? '').order('created_at', { ascending: false }),
    [session?.user.id]
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Payments & Invoices</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {loading && <LoadingState />}
        {!loading && (invoices ?? []).length === 0 && <EmptyState title="No invoices yet" />}
        {!loading && (invoices ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
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
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs font-medium text-brand-600 hover:underline">Download</button>
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
