import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Input } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import { useTranslation } from 'react-i18next'

interface StudentRow {
  id: string
  first_name: string
  last_name: string
  current_grade: string | null
  country: string | null
}

export function AdminStudentManagementPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const { data: students, loading } = useSupabaseQuery<StudentRow[]>(
    () => supabase.from('students').select('id, first_name, last_name, current_grade, country'),
    []
  )

  const filtered = (students ?? []).filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('adminStudents.title')}</h1>
      <Input placeholder={t('adminStudents.search')} className="mt-4 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {loading && <LoadingState />}
        {!loading && filtered.length === 0 && <EmptyState title={t('adminStudents.empty')} />}
        {!loading && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('adminStudents.student')}</th>
                <th className="px-4 py-3">{t('adminStudents.grade')}</th>
                <th className="px-4 py-3">{t('auth.fields.country')}</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
