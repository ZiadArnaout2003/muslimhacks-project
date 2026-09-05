import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Label, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-800">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-gray-500">Log in to your Al-Noor account</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email or username</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
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
                  Remember me
                </label>
                <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <FieldError>{error}</FieldError>

              <Button type="submit" className="w-full" loading={loading}>
                Log In
              </Button>
            </form>

            <div className="mt-6 space-y-1 text-center text-sm text-gray-500">
              <p>
                New here?{' '}
                <Link to="/register" className="font-medium text-brand-600 hover:underline">
                  Create Parent Account
                </Link>
              </p>
              <p>
                <Link to="/apply-to-teach" className="font-medium text-brand-600 hover:underline">
                  Apply as Teacher
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
