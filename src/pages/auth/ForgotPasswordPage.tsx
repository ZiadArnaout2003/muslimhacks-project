import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../../components/ui/Button'
import { Input, Label, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-800">
          <GraduationCap className="h-9 w-9" />
          <h1 className="text-xl font-semibold">Reset your password</h1>
        </div>
        <Card>
          <CardBody>
            {sent ? (
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link to it.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <FieldError>{error}</FieldError>
                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Back to login
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
