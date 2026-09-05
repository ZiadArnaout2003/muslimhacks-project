import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { uploadAssignmentFile } from '../../lib/storage'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Textarea, Input, Label, FieldError } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/States'
import type { Assignment, Submission } from '../../types/database'

export function AssignmentSubmissionPage() {
  const { assignmentId = '' } = useParams()
  const { student } = useStudentRecord()

  const { data: assignment, loading, error } = useSupabaseQuery<Assignment>(
    () => supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle(),
    [assignmentId]
  )

  const { data: submission, loading: subLoading } = useSupabaseQuery<Submission | null>(
    () =>
      student
        ? supabase.from('submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', student.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    [assignmentId, student?.id]
  )

  const [answerText, setAnswerText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  if (loading || subLoading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!assignment) return <ErrorState message="Assignment not found." />

  const isGraded = submission?.status === 'graded'
  const isPastDue = assignment.due_date ? new Date(assignment.due_date) < new Date() : false

  const handleSubmit = async () => {
    if (!student) return
    setSubmitting(true)
    setSubmitError(null)

    let fileUrl: string | null = submission?.file_url ?? null
    if (file) {
      try {
        fileUrl = await uploadAssignmentFile(student.id, file)
      } catch (err) {
        setSubmitting(false)
        setSubmitError(err instanceof Error ? err.message : 'File upload failed.')
        return
      }
    }

    const status = isPastDue ? 'late' : 'submitted'
    const { error } = await supabase.from('submissions').upsert(
      {
        assignment_id: assignmentId,
        student_id: student.id,
        answer_text: answerText || submission?.answer_text || null,
        file_url: fileUrl,
        status,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )

    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    setJustSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
      <p className="mt-1 text-sm text-gray-500">Due {assignment.due_date ? new Date(assignment.due_date).toLocaleString() : 'No due date'}</p>

      <Card className="mt-6">
        <CardBody>
          <h2 className="font-semibold text-gray-900">Instructions</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{assignment.instructions}</p>
          {assignment.attachment_url && (
            <a href={assignment.attachment_url} className="mt-2 inline-block text-sm text-brand-600 hover:underline">
              Download attachment
            </a>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          {isGraded ? (
            <div>
              <Badge tone="success">Graded</Badge>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {submission?.grade}/{assignment.max_score}
              </p>
              {submission?.feedback && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="font-medium">Teacher feedback:</p>
                  <p>{submission.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {submission?.status === 'submitted' && !justSubmitted && (
                <Badge tone="warning">Already submitted — resubmitting will replace your answer</Badge>
              )}
              <div>
                <Label htmlFor="answer">Your answer</Label>
                <Textarea id="answer" rows={6} defaultValue={submission?.answer_text ?? ''} onChange={(e) => setAnswerText(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="file">Attach a file (optional)</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <FieldError>{submitError}</FieldError>
              <Button loading={submitting} onClick={handleSubmit}>
                {submission ? 'Resubmit' : 'Submit'}
              </Button>
              {justSubmitted && <p className="text-sm text-emerald-700">Submitted successfully.</p>}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
