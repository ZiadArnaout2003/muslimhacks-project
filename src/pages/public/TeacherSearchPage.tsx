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

interface TeacherSubjectRow {
  teacher_id: string
  subject_id: string
  grade_levels: string[]
}

export function TeacherSearchPage() {
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
      <h1 className="text-2xl font-bold text-gray-900">Find a Teacher</h1>
      <p className="mt-1 text-sm text-gray-500">Filter by subject, grade, language and more.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Subject">
          <option value="">All subjects</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade">
          <option value="">All grades</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </Select>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
          <option value="">All languages</option>
          {allLanguages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Teacher gender">
          <option value="">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </Select>
        <Select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Max price">
          <option value="">Any price</option>
          <option value="15">Up to $15/hr</option>
          <option value="25">Up to $25/hr</option>
          <option value="40">Up to $40/hr</option>
        </Select>
      </div>

      <div className="mt-8">
        {loading && <LoadingState label="Searching teachers…" />}
        {error && <ErrorState message={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState title="No teachers match your filters" description="Try widening your search criteria." />
        )}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Card key={t.id}>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                      {t.first_name[0]}
                      {t.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t.first_name} {t.last_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> {t.country ?? 'Location not set'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-500">{t.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(t.languages ?? []).map((l) => (
                      <span key={l} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gold-600">
                      <Star className="h-4 w-4 fill-current" />
                      {t.rating_avg?.toFixed(1) ?? '—'}
                      <span className="text-gray-400">({t.rating_count ?? 0})</span>
                    </div>
                    <span className="font-semibold text-brand-700">${t.hourly_price ?? '—'}/hr</span>
                  </div>
                  <Link to={`/teachers/${t.id}`} className="mt-4 block">
                    <Button size="sm" className="w-full">
                      View Profile
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
