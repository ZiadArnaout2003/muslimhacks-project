import { useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { getSignedUrl } from '../../lib/storage'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { ApplicationStatus, TeacherApplication, TeacherStatus } from '../../types/database'

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
  const [tab, setTab] = useState<'applications' | 'teachers'>('applications')

  const { data: applications, loading } = useSupabaseQuery<TeacherApplication[]>(
    () => supabase.from('teacher_applications').select('*').order('created_at', { ascending: false }),
    []
  )

  const { data: teachers, loading: teachersLoading } = useSupabaseQuery<TeacherRow[]>(
    () => supabase.from('teachers').select('profile_id, status, profiles(first_name, last_name, email)'),
    []
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>

      <div className="mt-4 flex gap-2 border-b border-gray-200">
        {(['applications', 'teachers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <div className="mt-6 space-y-4">
          {loading && <LoadingState />}
          {!loading && (applications ?? []).length === 0 && <EmptyState title="No applications" />}
          {(applications ?? []).map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {tab === 'teachers' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
          {teachersLoading && <LoadingState />}
          {!teachersLoading && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
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
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: docs } = useSupabaseQuery<DocRow[]>(
    () => supabase.from('teacher_documents').select('id, doc_type, storage_path, file_name').eq('application_id', app.id),
    [app.id]
  )

  const setStatus = async (status: ApplicationStatus, approveTeacher = false) => {
    setBusy(true)
    await supabase
      .from('teacher_applications')
      .update({ status, admin_message: message || null, reviewed_at: new Date().toISOString() })
      .eq('id', app.id)

    if (approveTeacher) {
      await supabase.from('teachers').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('profile_id', app.profile_id)
    }
    if (status === 'rejected') {
      await supabase.from('teachers').update({ status: 'rejected' }).eq('profile_id', app.profile_id)
    }
    setBusy(false)
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
          <Badge tone={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>{app.status}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-gray-400">Subjects</p>
            <p className="text-gray-800">{app.subjects.join(', ')}</p>
          </div>
          <div>
            <p className="text-gray-400">Grades</p>
            <p className="text-gray-800">{app.grade_levels.join(', ')}</p>
          </div>
          <div>
            <p className="text-gray-400">Experience</p>
            <p className="text-gray-800">{app.years_experience} yrs</p>
          </div>
          <div>
            <p className="text-gray-400">Languages</p>
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
            <Textarea placeholder="Message to applicant (optional)" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={busy} onClick={() => setStatus('approved', true)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" loading={busy} onClick={() => setStatus('info_requested')}>
                Request More Info
              </Button>
              <Button size="sm" variant="danger" loading={busy} onClick={() => setStatus('rejected')}>
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function TeacherRowItem({ teacher }: { teacher: TeacherRow }) {
  const [busy, setBusy] = useState(false)
  const toggleSuspend = async () => {
    setBusy(true)
    await supabase
      .from('teachers')
      .update({ status: teacher.status === 'suspended' ? 'approved' : 'suspended' })
      .eq('profile_id', teacher.profile_id)
    setBusy(false)
    window.location.reload()
  }

  return (
    <tr>
      <td className="px-4 py-3">
        {teacher.profiles?.first_name} {teacher.profiles?.last_name}
      </td>
      <td className="px-4 py-3 text-gray-500">{teacher.profiles?.email}</td>
      <td className="px-4 py-3">
        <Badge tone={teacher.status === 'approved' ? 'success' : teacher.status === 'suspended' ? 'danger' : 'neutral'}>{teacher.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {teacher.status !== 'pending' && teacher.status !== 'rejected' && (
          <Button size="sm" variant="outline" loading={busy} onClick={toggleSuspend}>
            {teacher.status === 'suspended' ? 'Reinstate' : 'Suspend'}
          </Button>
        )}
      </td>
    </tr>
  )
}
