import { useParams, Link } from 'react-router-dom'
import { Star, MapPin, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { Subject, TeacherAvailability, TeacherProfileFull } from '../../types/database'
import { browserTimezone } from '../../lib/timezone'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function TeacherProfilePage() {
  const { teacherId = '' } = useParams()

  const { data: rows, loading, error } = useSupabaseQuery<TeacherProfileFull[]>(
    () => supabase.rpc('public_teacher_profile', { p_teacher_id: teacherId }),
    [teacherId]
  )
  const teacher = rows?.[0]

  const { data: subjectLinks } = useSupabaseQuery<{ subject_id: string; grade_levels: string[] }[]>(
    () => supabase.from('teacher_subjects').select('subject_id, grade_levels').eq('teacher_id', teacherId),
    [teacherId]
  )
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*'), [])

  const { data: availability } = useSupabaseQuery<TeacherAvailability[]>(
    () =>
      supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('day_of_week'),
    [teacherId]
  )

  if (loading) return <LoadingState label="Loading teacher profile…" />
  if (error) return <ErrorState message={error} />
  if (!teacher) return <ErrorState message="This teacher could not be found, or is not currently approved." />

  const subjectNames = (subjectLinks ?? [])
    .map((link) => subjects?.find((s) => s.id === link.subject_id)?.name)
    .filter(Boolean)

  const localTz = browserTimezone()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700">
              {teacher.first_name[0]}
              {teacher.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {teacher.first_name} {teacher.last_name}
              </h1>
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4" /> {teacher.country}
              </p>
              <div className="mt-1 flex items-center gap-1 text-sm text-gold-600">
                <Star className="h-4 w-4 fill-current" />
                {teacher.rating_avg?.toFixed(1) ?? '—'}
                <span className="text-gray-400">({teacher.rating_count ?? 0} reviews)</span>
              </div>
            </div>
          </div>

          <Card className="mt-6">
            <CardBody>
              <h2 className="font-semibold text-gray-900">Biography</h2>
              <p className="mt-2 text-sm text-gray-600">{teacher.bio}</p>

              <h2 className="mt-5 font-semibold text-gray-900">Subjects</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjectNames.map((name) => (
                  <Badge key={name} tone="brand">
                    {name}
                  </Badge>
                ))}
              </div>

              <h2 className="mt-5 font-semibold text-gray-900">Teaching Methodology</h2>
              <p className="mt-2 text-sm text-gray-600">{teacher.teaching_methodology}</p>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-gray-500">Experience</p>
                  <p className="font-medium text-gray-900">{teacher.years_experience} years</p>
                </div>
                <div>
                  <p className="text-gray-500">Languages</p>
                  <p className="font-medium text-gray-900">{(teacher.languages ?? []).join(', ')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Price</p>
                  <p className="font-medium text-gray-900">
                    ${teacher.hourly_price} {teacher.currency}/session
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardBody>
              <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                <Clock className="h-4 w-4" /> Weekly Availability
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Shown in your local timezone ({localTz}). Original times are set by the teacher in their own
                timezone.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {(availability ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span>{DAY_NAMES[a.day_of_week]}</span>
                    <span className="text-gray-500">
                      {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)} ({a.timezone})
                    </span>
                  </li>
                ))}
                {(availability ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">No availability published yet.</p>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardBody className="space-y-3">
              <p className="text-2xl font-bold text-brand-700">
                ${teacher.hourly_price}
                <span className="text-sm font-normal text-gray-500"> / session</span>
              </p>
              <Link to={`/book?teacher=${teacher.id}`}>
                <Button className="w-full">Book Class</Button>
              </Link>
              <Link to={`/book?teacher=${teacher.id}`}>
                <Button variant="outline" className="w-full">
                  Select Teacher
                </Button>
              </Link>
              <p className="pt-2 text-xs text-gray-400">
                Personal contact information and identification documents are never shown publicly.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
