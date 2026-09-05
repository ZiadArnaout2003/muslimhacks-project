import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { browserTimezone, formatDateInZone, formatTimeInZone } from '../../lib/timezone'
import type { ClassStatus } from '../../types/database'

interface ClassRow {
  id: string
  title: string
  start_datetime: string
  end_datetime: string
  status: ClassStatus
  teachers: { profiles: { first_name: string; last_name: string } | null } | null
}

export function AdminScheduleManagementPage() {
  const localTz = browserTimezone()
  const { data: classes, loading } = useSupabaseQuery<ClassRow[]>(
    () =>
      supabase
        .from('classes')
        .select('id, title, start_datetime, end_datetime, status, teachers(profiles(first_name, last_name))')
        .order('start_datetime', { ascending: false })
        .returns<ClassRow[]>(),
    []
  )

  const cancelClass = async (id: string) => {
    await supabase.from('classes').update({ status: 'cancelled' }).eq('id', id)
    window.location.reload()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
      <p className="mt-1 text-sm text-gray-500">All times shown in your local timezone ({localTz}).</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {loading && <LoadingState />}
        {!loading && (classes ?? []).length === 0 && <EmptyState title="No classes scheduled" />}
        {!loading && (classes ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(classes ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.teachers?.profiles?.first_name} {c.teachers?.profiles?.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDateInZone(c.start_datetime, localTz)} · {formatTimeInZone(c.start_datetime, localTz)}–
                    {formatTimeInZone(c.end_datetime, localTz)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === 'scheduled' ? 'brand' : c.status === 'cancelled' ? 'danger' : 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'scheduled' && (
                      <Button size="sm" variant="danger" onClick={() => cancelClass(c.id)}>
                        Cancel
                      </Button>
                    )}
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
