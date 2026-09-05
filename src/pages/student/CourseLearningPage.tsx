import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, Video as VideoIcon, CheckCircle2, Circle, ClipboardList, HelpCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'

interface ModuleWithLessons {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  content_type: string
  content_url: string | null
  content_text: string | null
  order_index: number
  duration_minutes: number | null
}

interface AssignmentLite {
  id: string
  title: string
}

interface QuizLite {
  id: string
  title: string
}

export function CourseLearningPage() {
  const { courseId = '' } = useParams()
  const { student } = useStudentRecord()

  const { data: course } = useSupabaseQuery<{ id: string; title: string }>(
    () => supabase.from('courses').select('id, title').eq('id', courseId).maybeSingle(),
    [courseId]
  )

  const { data: modules, loading, error } = useSupabaseQuery<ModuleWithLessons[]>(
    () =>
      supabase
        .from('course_modules')
        .select('id, title, order_index, lessons(id, title, content_type, content_url, content_text, order_index, duration_minutes)')
        .eq('course_id', courseId)
        .order('order_index'),
    [courseId]
  )

  const { data: enrollment } = useSupabaseQuery<{ id: string; progress_percent: number }>(
    () =>
      student
        ? supabase.from('enrollments').select('id, progress_percent').eq('course_id', courseId).eq('student_id', student.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    [courseId, student?.id]
  )

  const { data: progressRows, error: progressError } = useSupabaseQuery<{ lesson_id: string; completed: boolean }[]>(
    () =>
      enrollment
        ? supabase.from('lesson_progress').select('lesson_id, completed').eq('enrollment_id', enrollment.id)
        : Promise.resolve({ data: [], error: null }),
    [enrollment?.id]
  )

  const { data: assignments } = useSupabaseQuery<AssignmentLite[]>(
    () => supabase.from('assignments').select('id, title').eq('course_id', courseId),
    [courseId]
  )
  const { data: quizzes } = useSupabaseQuery<QuizLite[]>(
    () => supabase.from('quizzes').select('id, title').eq('course_id', courseId),
    [courseId]
  )

  const allLessons = useMemo(
    () => (modules ?? []).flatMap((m) => m.lessons ?? []).sort((a, b) => a.order_index - b.order_index),
    [modules]
  )
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  useEffect(() => {
    if (!activeLessonId && allLessons.length > 0) setActiveLessonId(allLessons[0].id)
  }, [allLessons, activeLessonId])

  const completedSet = new Set((progressRows ?? []).filter((p) => p.completed).map((p) => p.lesson_id))
  const activeLesson = allLessons.find((l) => l.id === activeLessonId)
  const progressPercent = allLessons.length ? Math.round((completedSet.size / allLessons.length) * 100) : 0

  const markComplete = async () => {
    if (!enrollment || !activeLesson) return
    await supabase
      .from('lesson_progress')
      .upsert({ enrollment_id: enrollment.id, lesson_id: activeLesson.id, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'enrollment_id,lesson_id' })

    const newCompletedCount = completedSet.has(activeLesson.id) ? completedSet.size : completedSet.size + 1
    const newPercent = allLessons.length ? Math.round((newCompletedCount / allLessons.length) * 100) : 0
    await supabase.from('enrollments').update({ progress_percent: newPercent }).eq('id', enrollment.id)
    window.location.reload()
  }

  if (loading) return <LoadingState label="Loading course…" />
  if (error || progressError) return <ErrorState message={error ?? progressError ?? 'Failed to load'} />

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <aside className="lg:col-span-1">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-gray-900">{course?.title}</h2>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-brand-600" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{progressPercent}% completed</p>

            <nav className="mt-4 space-y-3">
              {(modules ?? []).map((m) => (
                <div key={m.id}>
                  <p className="text-xs font-semibold uppercase text-gray-400">{m.title}</p>
                  <ul className="mt-1 space-y-1">
                    {(m.lessons ?? [])
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((l) => (
                        <li key={l.id}>
                          <button
                            onClick={() => setActiveLessonId(l.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                              activeLessonId === l.id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {completedSet.has(l.id) ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                            )}
                            {l.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}

              {(assignments ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Assignments</p>
                  <ul className="mt-1 space-y-1">
                    {assignments!.map((a) => (
                      <li key={a.id}>
                        <Link to="/student/assignments" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                          <ClipboardList className="h-4 w-4" /> {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(quizzes ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Quizzes</p>
                  <ul className="mt-1 space-y-1">
                    {quizzes!.map((q) => (
                      <li key={q.id}>
                        <Link to={`/student/quiz/${q.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                          <HelpCircle className="h-4 w-4" /> {q.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </nav>
          </CardBody>
        </Card>
      </aside>

      <main className="lg:col-span-3">
        <Card>
          <CardBody>
            {!activeLesson && <p className="text-sm text-gray-500">Select a lesson to begin.</p>}
            {activeLesson && (
              <>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-brand-600">
                  {activeLesson.content_type === 'video' ? <VideoIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {activeLesson.content_type}
                </div>
                <h1 className="mt-1 text-xl font-bold text-gray-900">{activeLesson.title}</h1>

                {activeLesson.content_type === 'video' && activeLesson.content_url && (
                  <div className="mt-4 flex aspect-video items-center justify-center rounded-lg bg-gray-900 text-sm text-gray-400">
                    Video player placeholder — {activeLesson.content_url}
                  </div>
                )}
                {activeLesson.content_text && <p className="mt-4 whitespace-pre-line text-gray-700">{activeLesson.content_text}</p>}

                <Button className="mt-6" onClick={markComplete} disabled={completedSet.has(activeLesson.id)}>
                  {completedSet.has(activeLesson.id) ? 'Completed' : 'Mark as Complete'}
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
