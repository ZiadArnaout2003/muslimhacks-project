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
import { useTranslation } from 'react-i18next'

export function CourseCataloguePage() {
  const { t } = useTranslation()
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
      <h1 className="text-2xl font-bold text-gray-900">{t('catalogue.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('catalogue.subtitle')}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-4 sm:grid-cols-4">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">{t('catalogue.allSubjects')}</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('catalogue.allCategories')}</option>
          <option value="academic">{t('catalogue.academicOnly')}</option>
          <option value="islamic">{t('catalogue.islamicOnly')}</option>
        </Select>
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">{t('catalogue.allModes')}</option>
          <option value="live">{t('catalogue.modes.live')}</option>
          <option value="recorded">{t('catalogue.modes.recorded')}</option>
          <option value="hybrid">{t('catalogue.modes.hybrid')}</option>
        </Select>
      </div>

      <div className="mt-8">
        {loading && <LoadingState label={t('catalogue.loading')} />}
        {error && <ErrorState message={error} />}
        {!loading && filtered.length === 0 && <EmptyState title={t('catalogue.empty')} />}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: c.color }} />
                <CardBody>
                  <div className="flex items-center gap-2">
                    <Badge tone={c.is_islamic ? 'warning' : 'brand'}>{c.is_islamic ? t('courses.islamic') : t('courses.academic')}</Badge>
                    <Badge tone="neutral">{t(`catalogue.modes.${c.delivery_mode}`)}</Badge>
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
                        {t('home.featured.viewCourse')}
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
