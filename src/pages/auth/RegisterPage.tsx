import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { COUNTRIES, LANGUAGES } from '../../lib/constants'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    country: COUNTRIES[0],
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
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    const { error } = await signUp({ ...form, role: 'parent' })
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/parent/onboarding')
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-800">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-xl font-semibold">Create your parent account</h1>
          <p className="text-sm text-gray-500">You'll be able to add your children next.</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" required value={form.firstName} onChange={update('firstName')} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" required value={form.lastName} onChange={update('lastName')} />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={update('email')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={update('phone')} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={form.password} onChange={update('password')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select id="country" value={form.country} onChange={update('country')}>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lang">Preferred language</Label>
                  <Select id="lang" value={form.preferredLanguage} onChange={update('preferredLanguage')}>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <FieldError>{error}</FieldError>

              <Button type="submit" className="w-full" loading={loading}>
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Log in
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
