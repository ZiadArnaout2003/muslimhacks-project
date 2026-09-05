import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { useAuth } from '../../contexts/AuthContext'
import type { Course, Subject } from '../../types/database'

interface CourseModule2 {
  id: string
  title: string
  order_index: number
}

export function CourseDetailsPage() {
  const { courseId = '' } = useParams()
  const { profile } = useAuth()

  const { data: course, loading, error } = useSupabaseQuery<Course>(
    () => supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    [courseId]
  )

  const { data: subject } = useSupabaseQuery<Subject>(
    () => supabase.from('subjects').select('*').eq('id', course?.subject_id ?? '').maybeSingle(),
    [course?.subject_id]
  )

  const { data: modules } = useSupabaseQuery<CourseModule2[]>(
    () => supabase.from('course_modules').select('id, title, order_index').eq('course_id', courseId).order('order_index'),
    [courseId]
  )

  const { data: teacherRows } = useSupabaseQuery<{ first_name: string; last_name: string }[]>(
    () => supabase.rpc('public_teacher_profile', { p_teacher_id: course?.teacher_id ?? '' }),
    [course?.teacher_id]
  )

  if (loading) return <LoadingState label="Loading course…" />
  if (error) return <ErrorState message={error} />
  if (!course) return <ErrorState message="This course could not be found or is not published." />

  const teacher = teacherRows?.[0]
  const enrollHref = profile?.role === 'parent' ? `/checkout?type=course&courseId=${course.id}` : '/register'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Badge tone={course.is_islamic ? 'warning' : 'brand'}>{course.is_islamic ? 'Islamic' : 'Academic'}</Badge>
            <Badge tone="neutral">{course.delivery_mode}</Badge>
            {course.is_islamic && course.islamic_review_status === 'approved' && (
              <Badge tone="success">Scholar Reviewed</Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subject?.name} · {course.level} · Taught by {teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}
          </p>
          <p className="mt-4 text-gray-600">{course.description}</p>

          <Card className="mt-6">
            <CardBody>
              <h2 className="font-semibold text-gray-900">Course Outline</h2>
              <ol className="mt-3 space-y-2">
                {(modules ?? []).map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    {m.title}
                  </li>
                ))}
                {(modules ?? []).length === 0 && <p className="text-sm text-gray-500">Outline coming soon.</p>}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardBody className="space-y-3">
              <p className="text-2xl font-bold text-brand-700">
                ${course.price} <span className="text-sm font-normal text-gray-500">{course.currency}</span>
              </p>
              <p className="text-sm text-gray-500">{course.duration_hours} hours total</p>
              <Link to={enrollHref}>
                <Button className="w-full">Enroll</Button>
              </Link>
              <Button variant="outline" className="w-full">
                Add to Wishlist
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
