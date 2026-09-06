import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/States'
import type { Student } from '../../types/database'
import { useTranslation } from 'react-i18next'

export function ParentChildrenPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { data: children, loading } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', session?.user.id ?? '').order('created_at'),
    [session?.user.id]
  )
  const [invite, setInvite] = useState<{ studentId: string; code: string } | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [creatingInviteFor, setCreatingInviteFor] = useState<string | null>(null)

  const createStudentInvite = async (studentId: string) => {
    setInviteError(null)
    setCreatingInviteFor(studentId)
    const { data, error } = await supabase.rpc('create_student_login_invite', { p_student_id: studentId })
    setCreatingInviteFor(null)
    if (error) {
      setInviteError(error.message)
      return
    }
    setInvite({ studentId, code: String(data) })
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.children')}</h1>
        <Link to="/parent/onboarding">
          <Button size="sm">
            <UserPlus className="h-4 w-4" /> {t('children.add')}
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
              <p className="text-sm text-gray-500">{t('children.grade', { grade: c.current_grade })}</p>
              <dl className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <dt>{t('children.academicLevel')}</dt>
                  <dd className="font-medium text-gray-700">{c.academic_level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('children.islamicEducation')}</dt>
                  <dd className="font-medium text-gray-700">{c.islamic_education_level}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('auth.fields.country')}</dt>
                  <dd className="font-medium text-gray-700">{c.country}</dd>
                </div>
              </dl>
              {c.profile_id ? (
                <p className="mt-4 text-xs font-medium text-green-700">{t('studentInvite.linked')}</p>
              ) : invite?.studentId === c.id ? (
                <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-900">
                  <p className="font-semibold">{t('studentInvite.codeLabel')}</p>
                  <code className="mt-1 block select-all text-base font-bold tracking-wider">{invite.code}</code>
                  <Link className="mt-2 inline-block font-medium text-brand-700 underline" to="/student/register">
                    {t('studentInvite.openRegistration')}
                  </Link>
                  <p className="mt-2 text-gray-600">{t('studentInvite.expires')}</p>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full"
                  loading={creatingInviteFor === c.id}
                  onClick={() => createStudentInvite(c.id)}
                >
                  {t('studentInvite.create')}
                </Button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
      {inviteError && <p className="mt-4 text-sm text-red-600">{inviteError}</p>}
    </div>
  )
}
