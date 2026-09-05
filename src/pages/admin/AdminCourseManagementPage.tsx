import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Course } from '../../types/database'

interface CourseRow extends Course {
  teachers: { profiles: { first_name: string; last_name: string } | null } | null
}

export function AdminCourseManagementPage() {
  // courses.teacher_id has no direct FK to profiles — it references teachers(profile_id),
  // which in turn references profiles(id) — so the embed has to go through teachers.
  const { data: courses, loading } = useSupabaseQuery<CourseRow[]>(
    () => supabase.from('courses').select('*, teachers(profiles(first_name, last_name))').order('created_at', { ascending: false }),
    []
  )

  const setStatus = async (id: string, status: Course['status']) => {
    await supabase.from('courses').update({ status }).eq('id', id)
    window.location.reload()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">
        {loading && <LoadingState />}
        {!loading && (courses ?? []).length === 0 && <EmptyState title="No courses yet" />}
        {!loading && (courses ?? []).length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Islamic Review</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(courses ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.teachers?.profiles?.first_name} {c.teachers?.profiles?.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === 'published' ? 'success' : 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.is_islamic ? (
                      <Badge tone={c.islamic_review_status === 'approved' ? 'success' : 'warning'}>{c.islamic_review_status}</Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'published' ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus(c.id, 'unpublished')}>
                        Unpublish
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(c.id, 'published')}>
                        Approve & Publish
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
