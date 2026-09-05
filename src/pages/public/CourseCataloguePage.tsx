import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States'
import type { Course, Subject } from '../../types/database'

export function CourseCataloguePage() {
  const [params] = useSearchParams()
  const [subjectId, setSubjectId] = useState('')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [mode, setMode] = useState('')

  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*').order('name'), [])

  const { data: courses, loading, error } = useSupabaseQuery<Course[]>(
    () => supabase.from('courses').select('*').eq('status', 'published').order('created_at', { ascending: false }),
    []
  )

  const filtered = useMemo(() => {
    let list = courses ?? []
    if (subjectId) list = list.filter((c) => c.subject_id === subjectId)
    if (category === 'academic') list = list.filter((c) => !c.is_islamic)
    if (category === 'islamic') list = list.filter((c) => c.is_islamic)
    if (mode) list = list.filter((c) => c.delivery_mode === mode)
    return list
  }, [courses, subjectId, category, mode])

  const subjectName = (id: string) => subjects?.find((s) => s.id === id)?.name

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Course Catalogue</h1>
      <p className="mt-1 text-sm text-gray-500">Academic and Islamic courses, live or recorded.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-4 sm:grid-cols-4">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Academic & Islamic</option>
          <option value="academic">Academic only</option>
          <option value="islamic">Islamic only</option>
        </Select>
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Live & Recorded</option>
          <option value="live">Live</option>
          <option value="recorded">Recorded</option>
          <option value="hybrid">Hybrid</option>
        </Select>
      </div>

      <div className="mt-8">
        {loading && <LoadingState label="Loading courses…" />}
        {error && <ErrorState message={error} />}
        {!loading && filtered.length === 0 && <EmptyState title="No courses match your filters" />}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardBody>
                  <div className="flex items-center gap-2">
                    <Badge tone={c.is_islamic ? 'warning' : 'brand'}>{c.is_islamic ? 'Islamic' : 'Academic'}</Badge>
                    <Badge tone="neutral">{c.delivery_mode}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold text-gray-900">{c.title}</h3>
                  <p className="text-xs text-gray-500">
                    {subjectName(c.subject_id)} · {c.level}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-brand-700">${c.price}</span>
                    <Link to={`/courses/${c.id}`}>
                      <Button size="sm" variant="outline">
                        View Course
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
