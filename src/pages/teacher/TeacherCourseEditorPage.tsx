import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

interface ModuleWithLessons { id: string; title: string; order_index: number; lessons: { id: string; title: string; content_type: string }[] }
interface Announcement { id: string; title: string; body: string; created_at: string }

export function TeacherCourseEditorPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { courseId = '' } = useParams()
  const { data: course, loading, error } = useSupabaseQuery<{ id: string; title: string; meeting_url: string | null }>(
    () => supabase.from('courses').select('id, title, meeting_url').eq('id', courseId).maybeSingle(), [courseId]
  )
  const { data: modules } = useSupabaseQuery<ModuleWithLessons[]>(
    () => supabase.from('course_modules').select('id, title, order_index, lessons(id, title, content_type)').eq('course_id', courseId).order('order_index'), [courseId]
  )
  const { data: announcements } = useSupabaseQuery<Announcement[]>(
    () => supabase.from('announcements').select('id, title, body, created_at').eq('course_id', courseId).order('created_at', { ascending: false }), [courseId]
  )
  const [moduleTitle, setModuleTitle] = useState('')
  const [lesson, setLesson] = useState({ moduleId: '', title: '', type: 'text', content: '' })
  const [meetingUrl, setMeetingUrl] = useState('')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementError, setAnnouncementError] = useState<string | null>(null)
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)

  const reload = () => window.location.reload()
  const addModule = async () => {
    if (!moduleTitle.trim()) return
    await supabase.from('course_modules').insert({ course_id: courseId, title: moduleTitle.trim(), order_index: (modules?.length ?? 0) + 1 })
    reload()
  }
  const addLesson = async () => {
    if (!lesson.moduleId || !lesson.title.trim() || !lesson.content.trim()) return
    await supabase.from('lessons').insert({
      module_id: lesson.moduleId, title: lesson.title.trim(), content_type: lesson.type,
      content_text: lesson.type === 'text' ? lesson.content.trim() : null,
      content_url: lesson.type === 'text' ? null : lesson.content.trim(), order_index: 0,
    })
    reload()
  }
  const saveMeetingUrl = async () => {
    if (!meetingUrl.trim()) return
    await supabase.rpc('set_course_meeting_url', { p_course_id: courseId, p_meeting_url: meetingUrl.trim() })
    reload()
  }
  const postAnnouncement = async () => {
    if (!session || !announcementTitle.trim() || !announcementBody.trim()) return
    setPostingAnnouncement(true)
    setAnnouncementError(null)
    const { error: postError } = await supabase.from('announcements').insert({
      course_id: courseId,
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
      audience: 'students',
      created_by: session.user.id,
    })
    setPostingAnnouncement(false)
    if (postError) {
      setAnnouncementError(postError.message)
      return
    }
    reload()
  }

  if (loading) return <LoadingState />
  if (error || !course) return <ErrorState message={error ?? t('teacherCourseEditor.notAssigned')} />
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">{course.title}</h1><p className="mt-1 text-sm text-gray-500">{t('teacherCourseEditor.subtitle')}</p></div>
    <Card><CardBody><h2 className="font-semibold text-gray-900">{t('teacherCourseEditor.meeting')}</h2>
      {course.meeting_url && <a className="mt-2 block text-sm text-brand-700 underline" href={course.meeting_url} target="_blank" rel="noreferrer">{t('teacherCourseEditor.currentMeeting')}</a>}
      <div className="mt-3 flex gap-2"><Input placeholder={t('teacherCourseEditor.meetingPlaceholder')} value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} /><Button size="sm" onClick={saveMeetingUrl}>{t('common.save')}</Button></div>
    </CardBody></Card>
    <Card><CardBody><h2 className="font-semibold text-gray-900">{t('teacherCourseEditor.modules')}</h2>
      <div className="mt-3 space-y-3">{(modules ?? []).map((m) => <div key={m.id} className="rounded-lg bg-gray-50 p-3"><p className="font-medium">{m.title}</p>{m.lessons.map((l) => <p key={l.id} className="mt-1 text-sm text-gray-600">{l.title} <span className="text-xs">({l.content_type})</span></p>)}</div>)}</div>
      <div className="mt-4 flex gap-2"><Input placeholder={t('teacherCourseEditor.moduleTitle')} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} /><Button size="sm" onClick={addModule}><Plus className="h-4 w-4" />{t('teacherCourseEditor.addModule')}</Button></div>
      {(modules ?? []).length > 0 && <div className="mt-4 space-y-2 rounded-lg border border-dashed border-gray-200 p-3"><p className="text-xs font-semibold uppercase text-gray-400">{t('teacherCourseEditor.addLesson')}</p>
        <Select value={lesson.moduleId} onChange={(e) => setLesson({ ...lesson, moduleId: e.target.value })}><option value="">{t('teacherCourseEditor.selectModule')}</option>{modules!.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select>
        <Select value={lesson.type} onChange={(e) => setLesson({ ...lesson, type: e.target.value })}><option value="text">{t('teacherCourseEditor.text')}</option><option value="video">{t('teacherCourseEditor.video')}</option><option value="link">{t('teacherCourseEditor.link')}</option></Select>
        <Input placeholder={t('teacherCourseEditor.lessonTitle')} value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /><Textarea rows={2} placeholder={lesson.type === 'text' ? t('teacherCourseEditor.lessonContent') : t('teacherCourseEditor.url')} value={lesson.content} onChange={(e) => setLesson({ ...lesson, content: e.target.value })} /><Button size="sm" onClick={addLesson}>{t('teacherCourseEditor.addLesson')}</Button>
      </div>}
    </CardBody></Card>
    <Card><CardBody><h2 className="font-semibold text-gray-900">{t('teacherCourseEditor.announcements')}</h2>
      <div className="mt-3 space-y-2">{(announcements ?? []).map((item) => <div key={item.id} className="rounded-lg bg-gray-50 p-3"><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{item.body}</p></div>)}</div>
      <div className="mt-3 space-y-2"><Input placeholder="Announcement title" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /><Textarea rows={3} placeholder={t('teacherCourseEditor.announcementPlaceholder')} value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} />{announcementError && <p className="text-sm text-red-600">{announcementError}</p>}<Button size="sm" loading={postingAnnouncement} onClick={postAnnouncement}>{t('teacherCourseEditor.postAnnouncement')}</Button></div>
    </CardBody></Card>
  </div>
}