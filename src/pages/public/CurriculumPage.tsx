import { supabase } from '../../lib/supabaseClient'
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

export function CurriculumPage() {
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Curriculum</h1>
      <p className="mt-3 text-gray-600">
        Our academic programs are structured around recognized international standards, with transparent
        learning objectives, topics and assessment for every subject and grade. This does not mean automatic
        recognition by every university — credential recognition varies by institution and country, and we
        make that transparent rather than overstating it.
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
        The framework architecture supports adding further pathways over time (e.g. IB-aligned, Cambridge-style,
        or local curriculum adaptations) without restructuring the platform.
      </p>

      <div className="mt-8">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {(subjectRows ?? []).map((row) => (
            <Card key={row.id}>
              <CardBody>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {row.subjects?.name} · Grade {row.grade}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <strong>Objectives:</strong> {row.learning_objectives}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  <strong>Assessment:</strong> {row.assessment}
                </p>
                {row.credits && <p className="mt-1 text-xs text-gray-400">{row.credits} credit(s)</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
