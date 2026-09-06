import { supabase } from '../../lib/supabaseClient'
import { useTranslation } from 'react-i18next'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/States'

interface CurriculumSubjectRow {
  id: string
  grade: string
  learning_objectives: string | null
  topics: string | null
  assessment: string | null
  credits: number | null
  subjects: { name: string; category: string } | null
}

interface FrameworkRow {
  id: string
  name: string
  description: string | null
}
interface PublishedCourse { id: string; title: string; description: string | null; level: string | null }

export function CurriculumPage() {
  const { t } = useTranslation()
  const { data: frameworks, loading: fLoading } = useSupabaseQuery<FrameworkRow[]>(
    () => supabase.from('curriculum_frameworks').select('id, name, description').eq('is_active', true),
    []
  )

  const { data: subjectRows, loading, error } = useSupabaseQuery<CurriculumSubjectRow[]>(
    () =>
      supabase
        .from('curriculum_subjects')
        .select('id, grade, learning_objectives, topics, assessment, credits, subjects(name, category)'),
    []
  )
  const { data: courses } = useSupabaseQuery<PublishedCourse[]>(
    () => supabase.from('courses').select('id, title, description, level').eq('status', 'published').order('title'),
    []
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{t('curriculum.title')}</h1>
      <p className="mt-3 text-gray-600">
        {t('curriculum.intro')}
      </p>

      {!fLoading && (frameworks ?? []).length > 0 && (
        <div className="mt-6 space-y-2">
          {(frameworks ?? []).map((f) => (
            <div key={f.id} className="rounded-lg bg-brand-50 p-4">
              <p className="font-semibold text-brand-800">{f.name}</p>
              <p className="text-sm text-brand-700">{f.description}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-gray-500">
        {t('curriculum.frameworkNote')}
      </p>

      <div className="mt-8">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {(subjectRows ?? []).map((row) => (
            <Card key={row.id}>
              <CardBody>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {row.subjects?.name} · {t('curriculum.grade', { grade: row.grade })}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <strong>{t('curriculum.objectives')}</strong> {row.learning_objectives}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  <strong>{t('curriculum.assessment')}</strong> {row.assessment}
                </p>
                {row.credits && <p className="mt-1 text-xs text-gray-400">{t('curriculum.credits', { count: row.credits })}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900">{t('curriculum.systemCourses')}</h2>
        <p className="mt-2 text-sm text-gray-600">{t('curriculum.systemCoursesDescription')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{(courses ?? []).map((course) => <Card key={course.id}><CardBody><p className="font-semibold text-gray-900">{course.title}</p><p className="mt-1 text-sm text-gray-500">{course.level}</p><p className="mt-2 text-sm text-gray-700">{course.description}</p></CardBody></Card>)}</div>
      </section>
    </div>
  )
}
