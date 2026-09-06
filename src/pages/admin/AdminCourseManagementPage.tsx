import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FieldError, Input, Label, Select, Textarea } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Course } from '../../types/database'
import { useTranslation } from 'react-i18next'

interface Subject { id: string; name: string }
interface Teacher { profile_id: string; profiles: { first_name: string; last_name: string } | null }
interface Assignment { teacher_id: string }

export function AdminCourseManagementPage() {
  const { t } = useTranslation()
  const { data: courses, loading } = useSupabaseQuery<Course[]>(() => supabase.from('courses').select('*').order('created_at', { ascending: false }), [])
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('id, name').order('name'), [])
  const { data: teachers } = useSupabaseQuery<Teacher[]>(async () => {
    const result = await supabase
      .from('teachers')
      .select('profile_id, profiles!teachers_profile_id_fkey(first_name, last_name)')
      .eq('status', 'approved')
    return {
      data: (result.data ?? []).map((teacher) => ({
        profile_id: teacher.profile_id,
        profiles: Array.isArray(teacher.profiles) ? teacher.profiles[0] ?? null : teacher.profiles,
      })) as Teacher[],
      error: result.error,
    }
  }, [])
  const [form, setForm] = useState({ subject_id: '', title: '', description: '', level: '', delivery_mode: 'recorded', price: '', is_islamic: false, color: '#0F766E' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const createCourse = async () => {
    setSaveError(null)
    if (!form.subject_id || !form.title.trim()) {
      setSaveError(t('admin.courseRequiredFields'))
      return
    }
    setSaving(true)
    const { error } = await supabase.from('courses').insert({ subject_id: form.subject_id, title: form.title.trim(), description: form.description || null, level: form.level || null, delivery_mode: form.delivery_mode, price: Number(form.price || 0), is_islamic: form.is_islamic, color: form.color, status: 'draft' })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    window.location.reload()
  }
  const setStatus = async (id: string, status: Course['status']) => {
    const { error } = await supabase.from('courses').update({ status }).eq('id', id)
    if (error) {
      setSaveError(error.message)
      return
    }
    window.location.reload()
  }
  return <div>
    <h1 className="text-2xl font-bold text-gray-900">{t('admin.courseManagement')}</h1>
    <div className="mt-6 rounded-xl border border-black/5 bg-white p-4"><h2 className="font-semibold">{t('admin.createCourse')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>{t('admin.subject')}</Label><Select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}><option value="">{t('admin.selectSubject')}</option>{(subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div><div><Label>{t('admin.title')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><Label>{t('admin.level')}</Label><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div><div><Label>{t('admin.deliveryMode')}</Label><Select value={form.delivery_mode} onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })}><option value="live">{t('catalogue.modes.live')}</option><option value="recorded">{t('catalogue.modes.recorded')}</option><option value="hybrid">{t('catalogue.modes.hybrid')}</option></Select></div><div><Label>{t('admin.price')}</Label><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div><div><Label>{t('admin.courseColor')}</Label><div className="flex items-center gap-3"><Input className="h-10 w-16 cursor-pointer p-1" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} /><span className="text-sm text-gray-500">{form.color}</span></div></div><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={form.is_islamic} onChange={(e) => setForm({ ...form, is_islamic: e.target.checked })} />{t('admin.islamicCourse')}</label></div>
      <div className="mt-3"><Label>{t('admin.description')}</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <FieldError>{saveError}</FieldError>
      <Button className="mt-3" loading={saving} onClick={createCourse}>{t('admin.createCourse')}</Button>
    </div>
    <div className="mt-6 overflow-x-auto rounded-xl border border-black/5 bg-white">{loading && <LoadingState />}{!loading && !(courses ?? []).length && <EmptyState title={t('admin.noCourses')} />}
      <table className="w-full text-sm">{(courses ?? []).length > 0 && <><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">{t('admin.course')}</th><th className="px-4 py-3">{t('admin.status')}</th><th className="px-4 py-3">{t('admin.teachers')}</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-gray-100">{courses!.map((course) => <CourseRow key={course.id} course={course} subjects={subjects ?? []} teachers={teachers ?? []} setStatus={setStatus} />)}</tbody></>}</table>
    </div>
  </div>
}
function CourseRow({ course, subjects, teachers, setStatus }: { course: Course; subjects: Subject[]; teachers: Teacher[]; setStatus: (id: string, status: Course['status']) => void }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    subject_id: course.subject_id,
    title: course.title,
    description: course.description ?? '',
    level: course.level ?? '',
    delivery_mode: course.delivery_mode,
    price: String(course.price),
    is_islamic: course.is_islamic,
    color: course.color,
  })
  const { data: assigned } = useSupabaseQuery<Assignment[]>(() => supabase.from('course_teachers').select('teacher_id').eq('course_id', course.id), [course.id])
  const assignedIds = (assigned ?? []).map((a) => a.teacher_id)
  const toggle = async (teacherId: string) => {
    const result = assignedIds.includes(teacherId)
      ? await supabase.from('course_teachers').delete().eq('course_id', course.id).eq('teacher_id', teacherId)
      : await supabase.from('course_teachers').insert({ course_id: course.id, teacher_id: teacherId })
    if (result.error) return setError(result.error.message)
    window.location.reload()
  }
  const updateColor = async (color: string) => {
    const { error: updateError } = await supabase.from('courses').update({ color: color.toUpperCase() }).eq('id', course.id)
    if (updateError) setError(updateError.message)
  }
  const saveDraft = async () => {
    setError(null)
    if (!draft.subject_id || !draft.title.trim()) return setError(t('admin.courseRequiredFields'))
    setBusy(true)
    const { error: updateError } = await supabase.from('courses').update({
      subject_id: draft.subject_id,
      title: draft.title.trim(),
      description: draft.description || null,
      level: draft.level || null,
      delivery_mode: draft.delivery_mode,
      price: Number(draft.price || 0),
      is_islamic: draft.is_islamic,
      color: draft.color,
    }).eq('id', course.id).eq('status', 'draft')
    setBusy(false)
    if (updateError) return setError(updateError.message)
    window.location.reload()
  }
  const deleteCourse = async () => {
    if (!window.confirm(t('admin.deleteCourseConfirm', { title: course.title }))) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('courses').delete().eq('id', course.id)
    setBusy(false)
    if (deleteError) return setError(deleteError.message)
    window.location.reload()
  }

  return <>
    <tr>
      <td className="px-4 py-3 font-medium"><span className="inline-flex items-center gap-2"><input type="color" defaultValue={course.color} aria-label={`${t('admin.courseColor')}: ${course.title}`} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" onChange={(event) => updateColor(event.target.value)} />{course.title}</span>{error && <FieldError>{error}</FieldError>}</td>
      <td className="px-4 py-3"><Badge tone={course.status === 'published' ? 'success' : 'neutral'}>{t(`admin.courseStatuses.${course.status}`)}</Badge></td>
      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{teachers.map((teacher) => <Button key={teacher.profile_id} size="sm" variant={assignedIds.includes(teacher.profile_id) ? 'primary' : 'outline'} onClick={() => toggle(teacher.profile_id)}>{teacher.profiles?.first_name} {teacher.profiles?.last_name}</Button>)}</div></td>
      <td className="px-4 py-3"><div className="flex justify-end gap-2">
        {course.status === 'draft' && <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? t('common.cancel') : t('common.edit')}</Button>}
        {course.status === 'published' ? <Button size="sm" variant="outline" onClick={() => setStatus(course.id, 'unpublished')}>{t('admin.unpublish')}</Button> : <Button size="sm" onClick={() => setStatus(course.id, 'published')}>{t('admin.approvePublish')}</Button>}
        <Button size="sm" variant="danger" loading={busy} onClick={deleteCourse}>{t('common.delete')}</Button>
      </div></td>
    </tr>
    {editing && <tr><td colSpan={4} className="bg-gray-50 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label>{t('admin.subject')}</Label><Select value={draft.subject_id} onChange={(e) => setDraft({ ...draft, subject_id: e.target.value })}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></div>
        <div><Label>{t('admin.title')}</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label>{t('admin.level')}</Label><Input value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} /></div>
        <div><Label>{t('admin.deliveryMode')}</Label><Select value={draft.delivery_mode} onChange={(e) => setDraft({ ...draft, delivery_mode: e.target.value as Course['delivery_mode'] })}><option value="live">{t('catalogue.modes.live')}</option><option value="recorded">{t('catalogue.modes.recorded')}</option><option value="hybrid">{t('catalogue.modes.hybrid')}</option></Select></div>
        <div><Label>{t('admin.price')}</Label><Input type="number" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
        <div><Label>{t('admin.courseColor')}</Label><Input className="h-10 w-16 cursor-pointer p-1" type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value.toUpperCase() })} /></div>
        <label className="flex items-center gap-2 pt-7"><input type="checkbox" checked={draft.is_islamic} onChange={(e) => setDraft({ ...draft, is_islamic: e.target.checked })} />{t('admin.islamicCourse')}</label>
        <div className="sm:col-span-2 lg:col-span-4"><Label>{t('admin.description')}</Label><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
      </div>
      <Button className="mt-3" size="sm" loading={busy} onClick={saveDraft}>{t('common.save')}</Button>
    </td></tr>}
  </>
}