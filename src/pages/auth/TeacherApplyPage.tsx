import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { uploadTeacherDocument } from '../../lib/storage'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, Textarea, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { COUNTRIES, GRADE_LEVELS, LANGUAGES } from '../../lib/constants'
import { COMMON_TIMEZONES } from '../../lib/timezone'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import type { Subject } from '../../types/database'
import { getAuthErrorMessage } from '../../lib/authErrors'

export function TeacherApplyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: subjects } = useSupabaseQuery<Subject[]>(() => supabase.from('subjects').select('*').order('name'), [])

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', country: COUNTRIES[0], timezone: COMMON_TIMEZONES[0],
    password: '', yearsExperience: '', teachingExperience: '', educationalBackground: '',
  })
  const [subjectSelections, setSubjectSelections] = useState<string[]>([])
  const [gradeSelections, setGradeSelections] = useState<string[]>([])
  const [languageSelections, setLanguageSelections] = useState<string[]>([])
  const [resume, setResume] = useState<File | null>(null)
  const [degree, setDegree] = useState<File | null>(null)
  const [credential, setCredential] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!consent) return setError(t('teacherApply.consentRequired'))
    if (subjectSelections.length === 0) return setError(t('teacherApply.subjectRequired'))
    if (form.password.length < 8) return setError(t('auth.errors.passwordLength'))

    setLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            signup_kind: 'teacher_application',
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            country: form.country,
          },
        },
      })
      if (signUpError) throw new Error(getAuthErrorMessage(signUpError))

      // Establish a session so the RLS-protected inserts/uploads below can run.
      // (Requires "Confirm email" disabled in Supabase Auth settings for demo use.)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInError || !signInData.session) {
        navigate('/teacher/application-status', {
          state: { pendingConfirmation: true },
        })
        return
      }

      const userId = signInData.session.user.id
      const subjectNames = subjectSelections.map((id) => subjects?.find((s) => s.id === id)?.name ?? id)

      const { data: application, error: appError } = await supabase
        .from('teacher_applications')
        .insert({
          profile_id: userId,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          timezone: form.timezone,
          subjects: subjectNames,
          grade_levels: gradeSelections,
          years_experience: Number(form.yearsExperience) || 0,
          languages: languageSelections,
          teaching_experience: form.teachingExperience,
          educational_background: form.educationalBackground,
          consent_given: true,
          status: 'submitted',
        })
        .select()
        .single()
      if (appError) throw new Error(appError.message)

      const uploads: Array<[File | null, 'resume' | 'degree' | 'credential']> = [
        [resume, 'resume'],
        [degree, 'degree'],
        [credential, 'credential'],
      ]
      for (const [file, docType] of uploads) {
        if (!file) continue
        const path = await uploadTeacherDocument(userId, file)
        await supabase.from('teacher_documents').insert({
          application_id: application.id,
          doc_type: docType,
          storage_path: path,
          file_name: file.name,
        })
      }

      navigate('/teacher/application-status')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacherApply.submitError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('teacherApply.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t('teacherApply.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('teacherApply.personal')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t('auth.fields.firstName')}</Label>
                <Input id="firstName" required value={form.firstName} onChange={update('firstName')} />
              </div>
              <div>
                <Label htmlFor="lastName">{t('auth.fields.lastName')}</Label>
                <Input id="lastName" required value={form.lastName} onChange={update('lastName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{t('auth.fields.email')}</Label>
                <Input id="email" type="email" required value={form.email} onChange={update('email')} />
              </div>
              <div>
                <Label htmlFor="password">{t('teacherApply.createPassword')}</Label>
                <Input id="password" type="password" required value={form.password} onChange={update('password')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phone">{t('auth.fields.phone')}</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={update('phone')} />
              </div>
              <div>
                <Label htmlFor="country">{t('auth.fields.country')}</Label>
                <Select id="country" value={form.country} onChange={update('country')}>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                <Select id="timezone" value={form.timezone} onChange={update('timezone')}>
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('teacherApply.professional')}</h2>
            <div>
              <Label>{t('teacherApply.subjects')}</Label>
              <div className="flex flex-wrap gap-2">
                {(subjects ?? []).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggle(subjectSelections, setSubjectSelections, s.id)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      subjectSelections.includes(s.id)
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t('teacherApply.gradeLevels')}</Label>
              <div className="flex flex-wrap gap-2">
                {GRADE_LEVELS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggle(gradeSelections, setGradeSelections, g)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      gradeSelections.includes(g) ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t('teacherApply.languages')}</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    type="button"
                    key={l.code}
                    onClick={() => toggle(languageSelections, setLanguageSelections, l.label)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      languageSelections.includes(l.label) ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="years">{t('teacherApply.yearsExperience')}</Label>
              <Input id="years" type="number" min={0} value={form.yearsExperience} onChange={update('yearsExperience')} />
            </div>
            <div>
              <Label htmlFor="teachingExperience">{t('teacherApply.teachingExperience')}</Label>
              <Textarea id="teachingExperience" rows={3} value={form.teachingExperience} onChange={update('teachingExperience')} />
            </div>
            <div>
              <Label htmlFor="educationalBackground">{t('teacherApply.educationalBackground')}</Label>
              <Textarea id="educationalBackground" rows={3} value={form.educationalBackground} onChange={update('educationalBackground')} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('teacherApply.documents')}</h2>
            <p className="text-xs text-gray-500">
              {t('teacherApply.documentsNote')}
            </p>
            <div>
              <Label htmlFor="resume">{t('teacherApply.resume')}</Label>
              <Input id="resume" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label htmlFor="degree">{t('teacherApply.degree')}</Label>
              <Input id="degree" type="file" accept=".pdf,.jpg,.png" onChange={(e) => setDegree(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label htmlFor="credential">{t('teacherApply.credential')}</Label>
              <Input id="credential" type="file" accept=".pdf,.jpg,.png" onChange={(e) => setCredential(e.target.files?.[0] ?? null)} />
            </div>
          </CardBody>
        </Card>

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" className="mt-1 rounded border-gray-300" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t('teacherApply.consent')}
        </label>

        <FieldError>{error}</FieldError>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {t('teacherApply.submit')}
        </Button>
      </form>
    </div>
  )
}
