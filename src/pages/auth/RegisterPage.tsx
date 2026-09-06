import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { ACADEMIC_LEVELS, COUNTRIES, GRADE_LEVELS, ISLAMIC_LEVELS, LANGUAGES } from '../../lib/constants'
import { useTranslation } from 'react-i18next'

export function RegisterPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyGuardianPhone: '',
    password: '',
    country: COUNTRIES[0],
    currentGrade: GRADE_LEVELS[0],
    academicLevel: ACADEMIC_LEVELS[0],
    islamicEducationLevel: ISLAMIC_LEVELS[0],
    preferredLanguage: 'en',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError(t('auth.errors.passwordLength'))
      return
    }
    setLoading(true)
    const { error, sessionCreated } = await signUp(form)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    if (sessionCreated) {
      navigate('/student/dashboard')
    } else {
      navigate('/login', { state: { registrationPending: true } })
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-800">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-xl font-semibold">{t('auth.register.title')}</h1>
          <p className="text-sm text-gray-500">{t('auth.register.subtitle')}</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                  <Label htmlFor="email">{t('auth.fields.email')}</Label>
                <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">{t('auth.fields.phone')}</Label>
                  <Input id="phone" type="tel" required value={form.phone} onChange={update('phone')} />
                </div>
                <div>
                  <Label htmlFor="emergencyGuardianPhone">{t('auth.fields.emergencyGuardianPhone')}</Label>
                  <Input id="emergencyGuardianPhone" type="tel" required value={form.emergencyGuardianPhone} onChange={update('emergencyGuardianPhone')} />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t('auth.fields.password')}</Label>
                <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={update('password')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">{t('auth.fields.country')}</Label>
                  <Select id="country" value={form.country} onChange={update('country')}>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lang">{t('auth.fields.preferredLanguage')}</Label>
                  <Select id="lang" value={form.preferredLanguage} onChange={update('preferredLanguage')}>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="grade">{t('auth.fields.grade')}</Label>
                  <Select id="grade" value={form.currentGrade} onChange={update('currentGrade')}>
                    {GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="academicLevel">{t('auth.fields.academicLevel')}</Label>
                  <Select id="academicLevel" value={form.academicLevel} onChange={update('academicLevel')}>
                    {ACADEMIC_LEVELS.map((level) => <option key={level}>{level}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="islamicEducationLevel">{t('auth.fields.islamicEducationLevel')}</Label>
                  <Select id="islamicEducationLevel" value={form.islamicEducationLevel} onChange={update('islamicEducationLevel')}>
                    {ISLAMIC_LEVELS.map((level) => <option key={level}>{level}</option>)}
                  </Select>
                </div>
              </div>

              <FieldError>{error}</FieldError>

              <Button type="submit" className="w-full" loading={loading}>
                {t('nav.register')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t('auth.register.existing')}{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                {t('nav.login')}
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
