import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input, Label, Select, Textarea, FieldError } from '../../components/ui/Input'
import { LoadingState, EmptyState } from '../../components/ui/States'
import type { Course, Subject } from '../../types/database'

export function TeacherCoursesListPage() {
  const { session } = useAuth()
  const teacherId = session?.user.id ?? ''
  const [showForm, setShowForm] = useState(false)

  const { data: courses, loading, error: loadError } = useSupabaseQuery<Course[]>(
    () => supabase.from('courses').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
    [teacherId]
  )
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*').order('name'), [])

  const [form, setForm] = useState({
    title: '', description: '', subjectId: '', level: '', deliveryMode: 'recorded', isIslamic: false, price: '',
    durationHours: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleCreate = async () => {
    if (!form.title || !form.subjectId) {
      setError('Title and subject are required.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('courses').insert({
      teacher_id: teacherId,
      subject_id: form.subjectId,
      title: form.title,
      description: form.description,
      level: form.level,
      delivery_mode: form.deliveryMode,
      is_islamic: form.isIslamic,
      price: Number(form.price) || 0,
      duration_hours: Number(form.durationHours) || null,
      status: 'draft',
      islamic_review_status: form.isIslamic ? 'pending' : 'not_required',
    })
    setSaving(false)
    if (error) {
      setError(error.message.includes('row-level security') ? 'Your teacher account must be approved before you can create courses.' : error.message)
      return
    }
    setShowForm(false)
    setForm({ title: '', description: '', subjectId: '', level: '', deliveryMode: 'recorded', isIslamic: false, price: '', durationHours: '' })
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </div>

      {showForm && (
        <Card className="mt-4">
          <CardBody className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={update('title')} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={update('description')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select
                  id="subject"
                  value={form.subjectId}
                  onChange={(e) => {
                    const subj = subjects?.find((s) => s.id === e.target.value)
                    setForm((f) => ({ ...f, subjectId: e.target.value, isIslamic: subj?.category === 'islamic' }))
                  }}
                >
                  <option value="">Select</option>
                  {(subjects ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Input id="level" placeholder="e.g. Grade 10" value={form.level} onChange={update('level')} />
              </div>
              <div>
                <Label htmlFor="mode">Delivery</Label>
                <Select id="mode" value={form.deliveryMode} onChange={update('deliveryMode')}>
                  <option value="recorded">Recorded</option>
                  <option value="live">Live</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" type="number" min={0} value={form.price} onChange={update('price')} />
              </div>
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input id="duration" type="number" min={0} value={form.durationHours} onChange={update('durationHours')} />
              </div>
            </div>
            <FieldError>{error}</FieldError>
            <Button loading={saving} onClick={handleCreate}>
              Create Course (Draft)
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="mt-6">
        {loading && <LoadingState />}
        {loadError && <FieldError>{loadError}</FieldError>}
        {!loading && (courses ?? []).length === 0 && <EmptyState title="No courses yet" description="Create your first course to get started." />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-center gap-2">
                  <Badge tone={c.status === 'published' ? 'success' : 'neutral'}>{c.status}</Badge>
                  {c.is_islamic && <Badge tone="warning">{c.islamic_review_status}</Badge>}
                </div>
                <h3 className="mt-2 font-semibold text-gray-900">{c.title}</h3>
                <p className="text-xs text-gray-500">{c.delivery_mode} · ${c.price}</p>
                <Link to={`/teacher/courses/${c.id}`} className="mt-3 block">
                  <Button size="sm" variant="outline" className="w-full">
                    Manage
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
