import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState, ErrorState } from '../../components/ui/States'

interface QuestionRow {
  id: string
  question_text: string
  type: 'mcq' | 'true_false' | 'short_answer' | 'matching' | 'fill_blank'
  options: string[] | null
  points: number
}

export function QuizPage() {
  const { quizId = '' } = useParams()
  const { student } = useStudentRecord()

  const { data: quiz } = useSupabaseQuery<{ id: string; title: string; time_limit_minutes: number | null }>(
    () => supabase.from('quizzes').select('id, title, time_limit_minutes').eq('id', quizId).maybeSingle(),
    [quizId]
  )

  const { data: questions, loading, error } = useSupabaseQuery<QuestionRow[]>(
    () => supabase.rpc('quiz_questions_for_student', { p_quiz_id: quizId }),
    [quizId]
  )

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalPoints = (questions ?? []).reduce((s, q) => s + q.points, 0)

  const handleSubmit = async () => {
    if (!student) return
    setSubmitting(true)
    setSubmitError(null)
    const payload = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v]))
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_student_id: student.id,
      p_answers: payload,
    })
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    setResult({ score: data.score })
  }

  if (loading) return <LoadingState label="Loading quiz…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{quiz?.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {(questions ?? []).length} question(s)
        {quiz?.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min time limit` : ''}
      </p>

      {result ? (
        <Card className="mt-6">
          <CardBody className="text-center">
            <p className="text-sm text-gray-500">Your score</p>
            <p className="mt-1 text-4xl font-bold text-brand-700">
              {result.score}/{totalPoints}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {(questions ?? []).map((q, i) => (
            <Card key={q.id}>
              <CardBody>
                <p className="font-medium text-gray-900">
                  {i + 1}. {q.question_text}
                </p>
                <div className="mt-3 space-y-2">
                  {(q.type === 'mcq' || q.type === 'true_false') &&
                    (q.options ?? []).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        />
                        {opt}
                      </label>
                    ))}
                  {(q.type === 'short_answer' || q.type === 'fill_blank' || q.type === 'matching') && (
                    <input
                      className="focus-ring w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          ))}

          {submitError && <ErrorState message={submitError} />}
          <Button className="w-full" loading={submitting} onClick={handleSubmit}>
            Submit Quiz
          </Button>
        </div>
      )}
    </div>
  )
}
