import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fromZonedTime } from 'date-fns-tz'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { useStudentRecord } from '../../hooks/useStudentRecord'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import { browserTimezone } from '../../lib/timezone'
import type { Subject, TeacherProfileFull } from '../../types/database'
import { useTranslation } from 'react-i18next'

const DURATIONS = [30, 45, 60, 90]

interface TeacherSubjectRow {
  teacher_id: string
  subject_id: string
  grade_levels: string[] | null
}

export function BookingPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectedTeacher = params.get('teacher') ?? ''

  const { student, loading: studentLoading } = useStudentRecord()
  const { data: teachers } = useSupabaseQuery<TeacherProfileFull[]>(() => supabase.rpc('public_teacher_cards'), [])
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*').order('name'), [])
  const { data: teacherSubjects } = useSupabaseQuery<TeacherSubjectRow[]>(
    () => supabase.from('teacher_subjects').select('teacher_id, subject_id, grade_levels'),
    []
  )

  const [teacherId, setTeacherId] = useState(preselectedTeacher)
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const localTz = browserTimezone()
  const studentGrade = student?.current_grade ?? ''
  const teacher = teachers?.find((t) => t.id === teacherId)
  const lessonPrice = ((teacher?.hourly_price ?? 0) * duration) / 60
  const availableSubjects = useMemo(
    () =>
      (subjects ?? []).filter((subject) =>
        (teacherSubjects ?? []).some(
          (teacherSubject) =>
            Boolean(studentGrade) &&
            teacherSubject.subject_id === subject.id &&
            teacherSubject.grade_levels?.includes(studentGrade)
        )
      ),
    [subjects, teacherSubjects, studentGrade]
  )
  const availableTeachers = useMemo(
    () => {
      const teacherIds = new Set(
        (teacherSubjects ?? [])
          .filter(
            (teacherSubject) =>
              teacherSubject.grade_levels?.includes(studentGrade) &&
              (!subjectId || teacherSubject.subject_id === subjectId)
          )
          .map((teacherSubject) => teacherSubject.teacher_id)
      )
      return (teachers ?? []).filter((availableTeacher) => teacherIds.has(availableTeacher.id))
    },
    [teachers, teacherSubjects, studentGrade, subjectId]
  )

  const handleConfirm = async () => {
    if (!session || !student || !teacherId || !subjectId || !date || !time) {
      setError(t('booking.errors.completeFields'))
      return
    }
    const isGradeMatched = (teacherSubjects ?? []).some(
      (teacherSubject) =>
        teacherSubject.teacher_id === teacherId &&
        teacherSubject.subject_id === subjectId &&
        teacherSubject.grade_levels?.includes(studentGrade)
    )
    if (!studentGrade || !isGradeMatched) {
      setError(t('booking.errors.levelMatch'))
      return
    }
    setError(null)
    setLoading(true)

    const startUtc = fromZonedTime(`${date}T${time}:00`, localTz)
    const endUtc = new Date(startUtc.getTime() + duration * 60000)
    const { error: bookingError } = await supabase.rpc('book_private_lesson', {
      p_teacher_id: teacherId,
      p_subject_id: subjectId,
      p_start_datetime: startUtc.toISOString(),
      p_end_datetime: endUtc.toISOString(),
      p_timezone: localTz,
    })

    if (bookingError) {
      setLoading(false)
      if (bookingError.message.includes('exclude') || bookingError.code === '23P01') {
        setError(t('booking.errors.conflict'))
      } else {
        setError(bookingError.message)
      }
      return
    }

    setLoading(false)
    navigate('/student/bookings', { state: { justBooked: true } })
  }

  if (studentLoading) return <LoadingState />
  if (!student) return <FieldError>Unable to load your student profile.</FieldError>

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('booking.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('booking.timezone', { timezone: localTz })}</p>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
            <p className="font-medium">
              {t('booking.levelMatching', { name: student.first_name, grade: studentGrade || t('booking.notSet') })}
              {student.academic_level ? ` · ${student.academic_level}` : ''}
            </p>
            <p className="mt-1 text-xs text-brand-700">{t('booking.levelMatchingDescription')}</p>
          </div>
          {!studentGrade && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {t('booking.noGrade')}
            </div>
          )}

          <div>
            <Label htmlFor="subject">{t('booking.subject')}</Label>
            <Select
              id="subject"
              value={subjectId}
              onChange={(e) => {
                const nextSubjectId = e.target.value
                setSubjectId(nextSubjectId)
                setTeacherId((currentTeacherId) =>
                  (teacherSubjects ?? []).some(
                    (teacherSubject) =>
                      teacherSubject.teacher_id === currentTeacherId &&
                      teacherSubject.subject_id === nextSubjectId &&
                      teacherSubject.grade_levels?.includes(studentGrade)
                  )
                    ? currentTeacherId
                    : ''
                )
                setError(null)
              }}
              disabled={!studentGrade}
            >
              <option value="">{studentGrade ? t('booking.selectSubject') : t('booking.noGrade')}</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {studentGrade && availableSubjects.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {t('booking.noSubjects', { grade: studentGrade })}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="teacher">{t('booking.teacher')}</Label>
            <Select
              id="teacher"
              value={teacherId}
              onChange={(e) => {
                setTeacherId(e.target.value)
                setError(null)
              }}
              disabled={!studentGrade || !subjectId}
            >
              <option value="">
                  {subjectId ? t('booking.selectTeacher') : t('booking.selectSubjectFirst')}
              </option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} — {t.currency} {t.hourly_price}/hr
                </option>
              ))}
            </Select>
            {subjectId && availableTeachers.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {t('booking.noTeachers', { grade: studentGrade })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">{t('booking.date')}</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="time">{t('booking.time')}</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="duration">{t('booking.duration')}</Label>
              <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {t('booking.minutes', { count: d })}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {teacher && (
            <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
              <p>
                {t('booking.price', { price: lessonPrice.toFixed(2) })} {teacher.currency}
              </p>
              <p className="mt-1 text-xs text-brand-600">{t('booking.cancellation')}</p>
            </div>
          )}

          <FieldError>{error}</FieldError>

          <Button className="w-full" loading={loading} onClick={handleConfirm}>
            {t('booking.confirm')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
