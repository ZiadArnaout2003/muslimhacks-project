import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { FieldError } from '../../components/ui/Input'
import { Link } from 'react-router-dom'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Course } from '../../types/database'
import { useTranslation } from 'react-i18next'

export function TeacherCoursesListPage() {
  const { t } = useTranslation()
  const { data: courses, loading, error: loadError } = useSupabaseQuery<Course[]>(
    async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return { data: [], error: null }
      const result = await supabase
        .from('course_teachers')
        .select('courses(*)')
        .eq('teacher_id', auth.user.id)
      const assignedCourses = (result.data ?? [])
        .flatMap((row) => (Array.isArray(row.courses) ? row.courses : row.courses ? [row.courses] : []))
      return { data: assignedCourses as Course[], error: result.error }
    },
    []
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('teacherCourses.title')}</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">{t('teacherCourses.subtitle')}</p>

      <div className="mt-6">
        {loading && <LoadingState />}
        {loadError && <FieldError>{loadError}</FieldError>}
        {!loading && (courses ?? []).length === 0 && <EmptyState title={t('teacherCourses.empty')} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c) => (
            <Link key={c.id} to={`/teacher/courses/${c.id}`}>
            <Card>
              <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: c.color }} />
              <CardBody>
                <div className="flex items-center gap-2">
                  <Badge tone={c.status === 'published' ? 'success' : 'neutral'}>{c.status}</Badge>
                  {c.is_islamic && <Badge tone="warning">{t('courses.islamic')}</Badge>}
                </div>
                <h3 className="mt-2 font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-1 text-xs text-gray-500">{c.level ?? t('teacherCourses.allLevels')}</p>
                <p className="mt-2 text-sm text-gray-700 line-clamp-3">{c.description}</p>
              </CardBody>
            </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
