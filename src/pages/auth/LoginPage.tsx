import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Label, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { useTranslation } from 'react-i18next'
import { dashboardPathForRole } from '../../lib/roleRouting'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error, role } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    if (!role) {
      setError('Unable to determine account role.')
      return
    }
    navigate(dashboardPathForRole(role))
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-800">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-xl font-semibold">{t('auth.login.welcome')}</h1>
          <p className="text-sm text-gray-500">{t('auth.login.subtitle')}</p>
          {location.state?.registrationPending && (
            <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">
              {t('auth.register.checkEmail')}
            </p>
          )}
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t('auth.fields.emailOrUsername')}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">{t('auth.fields.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  {t('auth.login.remember')}
                </label>
                <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
                  {t('auth.login.forgot')}
                </Link>
              </div>

              <FieldError>{error}</FieldError>

              <Button type="submit" className="w-full" loading={loading}>
                {t('nav.login')}
              </Button>
            </form>

            <div className="mt-6 space-y-1 text-center text-sm text-gray-500">
              <p>
                {t('auth.login.newHere')}{' '}
                <Link to="/register" className="font-medium text-brand-600 hover:underline">
                  {t('auth.login.createStudent')}
                </Link>
              </p>
              <p>
                <Link to="/apply-to-teach" className="font-medium text-brand-600 hover:underline">
                  {t('hero.applyTeacher')}
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
