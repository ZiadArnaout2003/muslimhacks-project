import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fromZonedTime } from 'date-fns-tz'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import { browserTimezone } from '../../lib/timezone'
import type { Student, Subject, TeacherProfileFull } from '../../types/database'

const DURATIONS = [30, 45, 60, 90]

export function BookingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectedTeacher = params.get('teacher') ?? ''

  const { data: children } = useSupabaseQuery<Student[]>(
    () => supabase.from('students').select('*').eq('parent_id', session?.user.id ?? ''),
    [session?.user.id]
  )
  const { data: teachers } = useSupabaseQuery<TeacherProfileFull[]>(() => supabase.rpc('public_teacher_cards'), [])
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*').order('name'), [])
  const { data: teacherSubjects } = useSupabaseQuery<{ teacher_id: string; subject_id: string }[]>(
    () => supabase.from('teacher_subjects').select('teacher_id, subject_id'),
    []
  )

  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState(preselectedTeacher)
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const localTz = browserTimezone()
  const teacher = teachers?.find((t) => t.id === teacherId)
  const availableSubjects = useMemo(
    () =>
      (teacherSubjects ?? [])
        .filter((ts) => ts.teacher_id === teacherId)
        .map((ts) => subjects?.find((s) => s.id === ts.subject_id))
        .filter(Boolean) as Subject[],
    [teacherSubjects, subjects, teacherId]
  )

  const handleConfirm = async () => {
    if (!session || !studentId || !teacherId || !subjectId || !date || !time) {
      setError('Please complete every field before confirming.')
      return
    }
    setError(null)
    setLoading(true)

    const startUtc = fromZonedTime(`${date}T${time}:00`, localTz)
    const endUtc = new Date(startUtc.getTime() + duration * 60000)
    const subjectName = subjects?.find((s) => s.id === subjectId)?.name ?? 'Class'

    const { data: cls, error: classError } = await supabase
      .from('classes')
      .insert({
        subject_id: subjectId,
        teacher_id: teacherId,
        title: `${subjectName} with ${teacher?.first_name} ${teacher?.last_name}`,
        start_datetime: startUtc.toISOString(),
        end_datetime: endUtc.toISOString(),
        timezone: localTz,
        provider: 'zoom',
        status: 'scheduled',
        cancellation_policy: 'Free cancellation up to 24 hours before the class.',
        created_by: session.user.id,
      })
      .select()
      .single()

    if (classError) {
      setLoading(false)
      if (classError.message.includes('exclude') || classError.code === '23P01') {
        setError('This teacher already has a class scheduled at that time. Please choose another slot.')
      } else {
        setError(classError.message)
      }
      return
    }

    const { error: bookingError } = await supabase.from('class_students').insert({
      class_id: cls.id,
      student_id: studentId,
      booked_by: session.user.id,
      price_charged: teacher?.hourly_price ?? 0,
    })

    if (bookingError) {
      setLoading(false)
      setError(bookingError.message)
      return
    }

    await supabase.from('invoices').insert({
      parent_id: session.user.id,
      student_id: studentId,
      description: `${subjectName} class with ${teacher?.first_name} ${teacher?.last_name}`,
      tier: 'standard',
      amount: teacher?.hourly_price ?? 0,
      discount_amount: 0,
      final_amount: teacher?.hourly_price ?? 0,
      status: 'pending',
    })

    setLoading(false)
    navigate('/parent/bookings', { state: { justBooked: true } })
  }

  if (!children) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Book a Class</h1>
      <p className="mt-1 text-sm text-gray-500">Times are shown in your local timezone ({localTz}).</p>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="student">Student</Label>
            <Select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select a child</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="teacher">Teacher</Label>
            <Select id="teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Select a teacher</option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} — ${t.hourly_price}/hr
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!teacherId}>
              <option value="">Select a subject</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {teacher && (
            <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
              <p>
                Price: <strong>${teacher.hourly_price}</strong> per session
              </p>
              <p className="mt-1 text-xs text-brand-600">Cancellation policy: free cancellation up to 24 hours before the class.</p>
            </div>
          )}

          <FieldError>{error}</FieldError>

          <Button className="w-full" loading={loading} onClick={handleConfirm}>
            Confirm Booking
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
