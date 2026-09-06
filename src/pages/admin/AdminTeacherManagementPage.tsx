import { useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { getSignedUrl } from '../../lib/storage'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Input'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States'
import type { ApplicationStatus, TeacherApplication, TeacherStatus } from '../../types/database'
import { useTranslation } from 'react-i18next'

interface DocRow {
  id: string
  doc_type: string
  storage_path: string
  file_name: string | null
}

interface TeacherRow {
  profile_id: string
  status: TeacherStatus
  profiles: { first_name: string; last_name: string; email: string } | null
}

export function AdminTeacherManagementPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'applications' | 'teachers'>('applications')

  const { data: applications, loading, error: applicationsError } = useSupabaseQuery<TeacherApplication[]>(
    () => supabase.from('teacher_applications').select('*').order('created_at', { ascending: false }),
    []
  )

  const { data: teachers, loading: teachersLoading, error: teachersError } = useSupabaseQuery<TeacherRow[]>(
    () =>
      supabase
        .from('teachers')
        .select('profile_id, status, profiles!teachers_profile_id_fkey(first_name, last_name, email)'),
    []
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.teacherManagement')}</h1>

      <div className="mt-4 flex gap-2 border-b border-gray-200">
        {(['applications', 'teachers'] as const).map((tabName) => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === tabName ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'
            }`}
          >
            {t(`admin.tabs.${tabName}`)}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <div className="mt-6 space-y-4">
          {loading && <LoadingState />}
          {applicationsError && <ErrorState message={applicationsError} />}
          {!loading && (applications ?? []).length === 0 && <EmptyState title={t('admin.noApplications')} />}
          {(applications ?? []).map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {tab === 'teachers' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
          {teachersLoading && <LoadingState />}
          {teachersError && <ErrorState message={teachersError} />}
          {!teachersLoading && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t('admin.name')}</th>
                  <th className="px-4 py-3">{t('admin.email')}</th>
                  <th className="px-4 py-3">{t('admin.status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(teachers ?? []).map((t) => (
                  <TeacherRowItem key={t.profile_id} teacher={t} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app }: { app: TeacherApplication }) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: docs } = useSupabaseQuery<DocRow[]>(
    () => supabase.from('teacher_documents').select('id, doc_type, storage_path, file_name').eq('application_id', app.id),
    [app.id]
  )

  const setStatus = async (status: ApplicationStatus) => {
    setBusy(true)
    const teacherStatus: TeacherStatus =
      status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'
    const { error } = await supabase.rpc('review_teacher_application', {
      p_application_id: app.id,
      p_application_status: status,
      p_teacher_status: teacherStatus,
      p_admin_message: message || null,
    })
    setBusy(false)
    if (error) {
      window.alert(error.message)
      return
    }
    window.location.reload()
  }

  const openDocument = async (doc: DocRow) => {
    const url = await getSignedUrl('teacher-documents', doc.storage_path)
    window.open(url, '_blank')
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">
              {app.first_name} {app.last_name}
            </p>
            <p className="text-xs text-gray-500">
              {app.email} · {app.country}
            </p>
          </div>
          <Badge tone={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>{t(`admin.applicationStatuses.${app.status}`)}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-gray-400">{t('admin.subjects')}</p>
            <p className="text-gray-800">{app.subjects.join(', ')}</p>
          </div>
          <div>
            <p className="text-gray-400">{t('admin.grades')}</p>
            <p className="text-gray-800">{app.grade_levels.join(', ')}</p>
          </div>
          <div>
            <p className="text-gray-400">{t('admin.experience')}</p>
            <p className="text-gray-800">{t('admin.years', { count: app.years_experience })}</p>
          </div>
          <div>
            <p className="text-gray-400">{t('admin.languages')}</p>
            <p className="text-gray-800">{app.languages.join(', ')}</p>
          </div>
        </div>

        {(docs ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {docs!.map((d) => (
              <button
                key={d.id}
                onClick={() => openDocument(d)}
                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                <FileText className="h-3 w-3" /> {d.doc_type}
              </button>
            ))}
          </div>
        )}

        {app.status !== 'approved' && app.status !== 'rejected' && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
            <Textarea placeholder={t('admin.messageApplicant')} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={busy} onClick={() => setStatus('approved')}>
                {t('admin.approve')}
              </Button>
              <Button size="sm" variant="outline" loading={busy} onClick={() => setStatus('info_requested')}>
                {t('admin.requestInfo')}
              </Button>
              <Button size="sm" variant="danger" loading={busy} onClick={() => setStatus('rejected')}>
                {t('admin.reject')}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function TeacherRowItem({ teacher }: { teacher: TeacherRow }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const setTeacherStatus = async (status: TeacherStatus) => {
    setBusy(true)
    const { error } = await supabase
      .from('teachers')
      .update({ status })
      .eq('profile_id', teacher.profile_id)
    setBusy(false)
    if (error) {
      window.alert(error.message)
      return
    }
    window.location.reload()
  }

  return (
    <tr>
      <td className="px-4 py-3">
        {teacher.profiles?.first_name} {teacher.profiles?.last_name}
      </td>
      <td className="px-4 py-3 text-gray-500">{teacher.profiles?.email}</td>
      <td className="px-4 py-3">
        <Badge tone={teacher.status === 'approved' ? 'success' : teacher.status === 'suspended' ? 'danger' : 'neutral'}>{t(`admin.teacherStatuses.${teacher.status}`)}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {teacher.status === 'pending' && (
          <Button size="sm" loading={busy} onClick={() => setTeacherStatus('approved')}>
            {t('admin.approve')}
          </Button>
        )}
        {(teacher.status === 'approved' || teacher.status === 'suspended') && (
          <Button
            size="sm"
            variant="outline"
            loading={busy}
            onClick={() => setTeacherStatus(teacher.status === 'suspended' ? 'approved' : 'suspended')}
          >
            {teacher.status === 'suspended' ? t('admin.reinstate') : t('admin.suspend')}
          </Button>
        )}
      </td>
    </tr>
  )
}
