import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input, Label, Select, Textarea } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/States'
import type { Course } from '../../types/database'

interface ModuleWithLessons {
  id: string
  title: string
  order_index: number
  lessons: { id: string; title: string; content_type: string; is_published: boolean }[]
}

interface AssignmentRow {
  id: string
  title: string
  due_date: string | null
}

export function TeacherCourseEditorPage() {
  const { courseId = '' } = useParams()

  const { data: course, loading } = useSupabaseQuery<Course>(
    () => supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    [courseId]
  )
  const { data: modules, error: modulesError } = useSupabaseQuery<ModuleWithLessons[]>(
    () =>
      supabase
        .from('course_modules')
        .select('id, title, order_index, lessons(id, title, content_type, is_published)')
        .eq('course_id', courseId)
        .order('order_index'),
    [courseId]
  )
  const { data: assignments } = useSupabaseQuery<AssignmentRow[]>(
    () => supabase.from('assignments').select('id, title, due_date').eq('course_id', courseId),
    [courseId]
  )

  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLesson, setNewLesson] = useState<{ moduleId: string; title: string; type: string; content: string }>({
    moduleId: '', title: '', type: 'video', content: '',
  })
  const [newAssignment, setNewAssignment] = useState({ title: '', instructions: '', dueDate: '' })

  const addModule = async () => {
    if (!newModuleTitle) return
    await supabase.from('course_modules').insert({ course_id: courseId, title: newModuleTitle, order_index: (modules?.length ?? 0) + 1 })
    setNewModuleTitle('')
    window.location.reload()
  }

  const addLesson = async () => {
    if (!newLesson.moduleId || !newLesson.title) return
    await supabase.from('lessons').insert({
      module_id: newLesson.moduleId,
      title: newLesson.title,
      content_type: newLesson.type,
      content_url: newLesson.type === 'video' ? newLesson.content : null,
      content_text: newLesson.type === 'text' ? newLesson.content : null,
      order_index: 0,
    })
    setNewLesson({ moduleId: '', title: '', type: 'video', content: '' })
    window.location.reload()
  }

  const addAssignment = async () => {
    if (!newAssignment.title) return
    await supabase.from('assignments').insert({
      course_id: courseId,
      title: newAssignment.title,
      instructions: newAssignment.instructions,
      due_date: newAssignment.dueDate || null,
    })
    setNewAssignment({ title: '', instructions: '', dueDate: '' })
    window.location.reload()
  }

  const togglePublish = async () => {
    if (!course) return
    await supabase.from('courses').update({ status: course.status === 'published' ? 'unpublished' : 'published' }).eq('id', course.id)
    window.location.reload()
  }

  if (loading || !course) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <Badge tone={course.status === 'published' ? 'success' : 'neutral'}>{course.status}</Badge>
        </div>
        <Button variant={course.status === 'published' ? 'outline' : 'primary'} onClick={togglePublish}>
          {course.status === 'published' ? (
            <>
              <EyeOff className="h-4 w-4" /> Unpublish
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" /> Publish
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">Modules & Lessons</h2>
          {modulesError && <p className="text-sm text-red-600">{modulesError}</p>}
          <div className="mt-3 space-y-3">
            {(modules ?? []).map((m) => (
              <div key={m.id} className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-800">{m.title}</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-600">
                  {(m.lessons ?? []).map((l) => (
                    <li key={l.id}>
                      {l.title} <span className="text-xs text-gray-400">({l.content_type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Input placeholder="New module title" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
            <Button size="sm" onClick={addModule}>
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </div>

          {(modules ?? []).length > 0 && (
            <div className="mt-4 space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-400">Add a lesson</p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={newLesson.moduleId} onChange={(e) => setNewLesson((n) => ({ ...n, moduleId: e.target.value }))}>
                  <option value="">Select module</option>
                  {(modules ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </Select>
                <Select value={newLesson.type} onChange={(e) => setNewLesson((n) => ({ ...n, type: e.target.value }))}>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                  <option value="pdf">PDF</option>
                </Select>
              </div>
              <Input placeholder="Lesson title" value={newLesson.title} onChange={(e) => setNewLesson((n) => ({ ...n, title: e.target.value }))} />
              <Textarea
                placeholder={newLesson.type === 'video' ? 'Video URL' : 'Lesson content'}
                rows={2}
                value={newLesson.content}
                onChange={(e) => setNewLesson((n) => ({ ...n, content: e.target.value }))}
              />
              <Button size="sm" onClick={addLesson}>
                Add Lesson
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900">Assignments</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(assignments ?? []).map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span>{a.title}</span>
                <span className="text-gray-500">{a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date'}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase text-gray-400">New assignment</p>
            <Input placeholder="Title" value={newAssignment.title} onChange={(e) => setNewAssignment((a) => ({ ...a, title: e.target.value }))} />
            <Textarea
              placeholder="Instructions"
              rows={2}
              value={newAssignment.instructions}
              onChange={(e) => setNewAssignment((a) => ({ ...a, instructions: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="due">Due</Label>
              <Input id="due" type="date" value={newAssignment.dueDate} onChange={(e) => setNewAssignment((a) => ({ ...a, dueDate: e.target.value }))} />
              <Button size="sm" onClick={addAssignment}>
                Add
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
