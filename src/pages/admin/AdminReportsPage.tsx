import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'

interface EnrollmentRow {
  courses: { title: string } | null
}

interface InvoiceRow {
  id: string
  description: string
  final_amount: number
  status: string
  created_at: string
}

function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]) as (keyof T)[]
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminReportsPage() {
  const { data: enrollments, loading } = useSupabaseQuery<EnrollmentRow[]>(
    () => supabase.from('enrollments').select('courses(title)'),
    []
  )
  const { data: invoices } = useSupabaseQuery<InvoiceRow[]>(
    () => supabase.from('invoices').select('id, description, final_amount, status, created_at'),
    []
  )

  const byCourse = (enrollments ?? []).reduce<Record<string, number>>((acc, e) => {
    const title = e.courses?.title ?? 'Unknown'
    acc[title] = (acc[title] ?? 0) + 1
    return acc
  }, {})
  const chartData = Object.entries(byCourse).map(([name, count]) => ({ name: name.slice(0, 18), count }))

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCsv('invoices.csv', invoices ?? [])}>
          <Download className="h-4 w-4" /> Export Invoices (CSV)
        </Button>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">Enrollment by Course</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1f9a80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">Revenue Summary</h2>
          <p className="mt-2 text-3xl font-bold text-brand-700">
            ${(invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.final_amount), 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Total collected across {(invoices ?? []).filter((i) => i.status === 'paid').length} paid invoices</p>
        </CardBody>
      </Card>
    </div>
  )
}
