import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Input } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'

interface StudentRow {
  id: string
  first_name: string
  last_name: string
  current_grade: string | null
  country: string | null
  parents: { profiles: { first_name: string; last_name: string; email: string } | null } | null
}

export function AdminStudentManagementPage() {
  const [search, setSearch] = useState('')
  const { data: students, loading } = useSupabaseQuery<StudentRow[]>(
    () => supabase.from('students').select('id, first_name, last_name, current_grade, country, parents(profiles(first_name, last_name, email))'),
    []
  )

  const filtered = (students ?? []).filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
      <Input placeholder="Search students…" className="mt-4 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {loading && <LoadingState />}
        {!loading && filtered.length === 0 && <EmptyState title="No students found" />}
        {!loading && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Parent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.current_grade}</td>
                  <td className="px-4 py-3 text-gray-500">{s.country}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.parents?.profiles?.first_name} {s.parents?.profiles?.last_name}
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
