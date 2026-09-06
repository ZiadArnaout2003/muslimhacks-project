import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/States'
import { GRADE_LEVELS } from '../../lib/constants'
import type { Subject, TeacherCard } from '../../types/database'
import { useTranslation } from 'react-i18next'

interface TeacherSubjectRow {
  teacher_id: string
  subject_id: string
  grade_levels: string[]
}

export function TeacherSearchPage() {
  const { t } = useTranslation()
  const [subjectId, setSubjectId] = useState('')
  const [grade, setGrade] = useState('')
  const [language, setLanguage] = useState('')
  const [gender, setGender] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const { data: subjects } = useSupabaseQuery<Subject[]>(
    () => supabase.from('subjects').select('*').order('name'),
    []
  )

  const { data: teachers, loading, error } = useSupabaseQuery<TeacherCard[]>(
    () => supabase.rpc('public_teacher_cards'),
    []
  )

  const { data: teacherSubjects } = useSupabaseQuery<TeacherSubjectRow[]>(
    () => supabase.from('teacher_subjects').select('teacher_id, subject_id, grade_levels'),
    []
  )

  const filtered = useMemo(() => {
    let list = teachers ?? []

    if (subjectId) {
      const teacherIds = new Set(
        (teacherSubjects ?? [])
          .filter((ts) => ts.subject_id === subjectId && (!grade || ts.grade_levels?.includes(grade)))
          .map((ts) => ts.teacher_id)
      )
      list = list.filter((t) => teacherIds.has(t.id))
    } else if (grade) {
      const teacherIds = new Set(
        (teacherSubjects ?? []).filter((ts) => ts.grade_levels?.includes(grade)).map((ts) => ts.teacher_id)
      )
      list = list.filter((t) => teacherIds.has(t.id))
    }

    if (language) list = list.filter((t) => t.languages?.includes(language))
    if (gender) list = list.filter((t) => t.gender === gender)
    if (maxPrice) list = list.filter((t) => (t.hourly_price ?? 0) <= Number(maxPrice))

    return list
  }, [teachers, teacherSubjects, subjectId, grade, language, gender, maxPrice])

  const allLanguages = useMemo(
    () => Array.from(new Set((teachers ?? []).flatMap((t) => t.languages ?? []))).sort(),
    [teachers]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('teacherSearch.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('teacherSearch.subtitle')}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label={t('teacherSearch.subject')}>
          <option value="">{t('teacherSearch.allSubjects')}</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label={t('teacherSearch.grade')}>
          <option value="">{t('teacherSearch.allGrades')}</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {t('children.grade', { grade: g })}
            </option>
          ))}
        </Select>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={t('teacherSearch.language')}>
          <option value="">{t('teacherSearch.allLanguages')}</option>
          {allLanguages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={gender} onChange={(e) => setGender(e.target.value)} aria-label={t('teacherSearch.gender')}>
          <option value="">{t('teacherSearch.anyGender')}</option>
          <option value="male">{t('onboarding.male')}</option>
          <option value="female">{t('onboarding.female')}</option>
        </Select>
        <Select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label={t('teacherSearch.maxPrice')}>
          <option value="">{t('teacherSearch.anyPrice')}</option>
          <option value="15">{t('teacherSearch.price15')}</option>
          <option value="25">{t('teacherSearch.price25')}</option>
          <option value="40">{t('teacherSearch.price40')}</option>
        </Select>
      </div>

      <div className="mt-8">
        {loading && <LoadingState label={t('teacherSearch.loading')} />}
        {error && <ErrorState message={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState title={t('teacherSearch.empty')} description={t('teacherSearch.emptyDescription')} />
        )}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((teacher) => (
              <Card key={teacher.id}>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                      {teacher.first_name[0]}
                      {teacher.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> {teacher.country ?? t('teacherSearch.locationNotSet')}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-500">{teacher.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(teacher.languages ?? []).map((l) => (
                      <span key={l} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gold-600">
                      <Star className="h-4 w-4 fill-current" />
                      {teacher.rating_avg?.toFixed(1) ?? '—'}
                      <span className="text-gray-400">({teacher.rating_count ?? 0})</span>
                    </div>
                    <span className="font-semibold text-brand-700">{teacher.currency} {teacher.hourly_price ?? '—'}{t('teacherSearch.perHour')}</span>
                  </div>
                  <Link to={`/teachers/${teacher.id}`} className="mt-4 block">
                    <Button size="sm" className="w-full">
                      {t('common.viewProfile')}
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
