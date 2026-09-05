import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'
import type { Student } from '../../types/database'

export function ParentChildrenPage() {
  const { session } = useAuth()
  const { data: children, loading } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', session?.user.id ?? '').order('created_at'),
    [session?.user.id]
  )

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
        <Link to="/parent/onboarding">
          <Button size="sm">
            <UserPlus className="h-4 w-4" /> Add a Child
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(children ?? []).map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {c.first_name[0]}
                {c.last_name[0]}
              </div>
              <p className="mt-3 font-semibold text-gray-900">
                {c.first_name} {c.last_name}
              </p>
              <p className="text-sm text-gray-500">Grade {c.current_grade}</p>
              <dl className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <dt>Academic level</dt>
                  <dd className="font-medium text-gray-700">{c.academic_level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Islamic education</dt>
                  <dd className="font-medium text-gray-700">{c.islamic_education_level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Country</dt>
                  <dd className="font-medium text-gray-700">{c.country}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
