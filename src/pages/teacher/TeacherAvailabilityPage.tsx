import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select, Input, FieldError } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import { COMMON_TIMEZONES, browserTimezone } from '../../lib/timezone'
import type { TeacherAvailability } from '../../types/database'
import { useTranslation } from 'react-i18next'

export function TeacherAvailabilityPage() {
  const { t } = useTranslation()
  const dayNames = t('teacherAvailability.days', { returnObjects: true }) as string[]
  const { session } = useAuth()
  const teacherId = session?.user.id ?? ''

  const { data: availability, loading, error: loadError } = useSupabaseQuery<TeacherAvailability[]>(
    () => supabase.from('teacher_availability').select('*').eq('teacher_id', teacherId).order('day_of_week'),
    [teacherId]
  )

  const [form, setForm] = useState({ day: 1, start: '17:00', end: '20:00', timezone: browserTimezone() })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addSlot = async () => {
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('teacher_availability').insert({
      teacher_id: teacherId,
      day_of_week: form.day,
      start_time: form.start,
      end_time: form.end,
      timezone: form.timezone,
      recurring: true,
    })
    setSaving(false)
    if (error) {
      setError(error.message.includes('row-level security') ? t('teacherAvailability.approvalRequired') : error.message)
      return
    }
    window.location.reload()
  }

  const removeSlot = async (id: string) => {
    await supabase.from('teacher_availability').delete().eq('id', id)
    window.location.reload()
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('teacherAvailability.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('teacherAvailability.subtitle')}</p>

      <Card className="mt-6">
        <CardBody>
          <h2 className="font-semibold text-gray-900">{t('teacherAvailability.weeklySlots')}</h2>
          <ul className="mt-3 space-y-2">
            {(availability ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>
                  {dayNames[a.day_of_week]} {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)} ({a.timezone})
                </span>
                <button onClick={() => removeSlot(a.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" aria-label={t('teacherAvailability.removeSlot')} />
                </button>
              </li>
            ))}
            {(availability ?? []).length === 0 && <p className="text-sm text-gray-500">{t('teacherAvailability.empty')}</p>}
          </ul>
          {loadError && <FieldError>{loadError}</FieldError>}

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-dashed border-gray-200 p-4 sm:grid-cols-4">
            <Select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: Number(e.target.value) }))}>
              {dayNames.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <Input type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
            <Input type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
            <Select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </Select>
          </div>
          <FieldError>{error}</FieldError>
          <Button className="mt-3" size="sm" loading={saving} onClick={addSlot}>
            <Plus className="h-4 w-4" /> {t('teacherAvailability.addSlot')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
