import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { ACADEMIC_LEVELS, COUNTRIES, GRADE_LEVELS, ISLAMIC_LEVELS, LANGUAGES } from '../../lib/constants'

export function ParentOnboardingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'female', country: COUNTRIES[0],
    currentGrade: GRADE_LEVELS[3], preferredLanguage: 'en', academicLevel: ACADEMIC_LEVELS[0],
    islamicLevel: ISLAMIC_LEVELS[0],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const submitChild = async (andAddAnother: boolean) => {
    if (!session) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.from('students').insert({
      parent_id: session.user.id,
      first_name: form.firstName,
      last_name: form.lastName,
      date_of_birth: form.dateOfBirth || null,
      gender: form.gender,
      country: form.country,
      current_grade: form.currentGrade,
      preferred_language: form.preferredLanguage,
      academic_level: form.academicLevel,
      islamic_education_level: form.islamicLevel,
      learning_preferences: {},
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    if (andAddAnother) {
      setForm((f) => ({ ...f, firstName: '', lastName: '', dateOfBirth: '' }))
    } else {
      navigate('/parent/dashboard')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center text-brand-800">
        <GraduationCap className="h-9 w-9" />
        <h1 className="text-xl font-semibold">Add your child</h1>
        <p className="text-sm text-gray-500">You can add more children anytime from your dashboard.</p>
      </div>

      <Card>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitChild(false)
            }}
            className="space-y-4"
          >
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select id="gender" value={form.gender} onChange={update('gender')}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </Select>
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
                <Label htmlFor="grade">Current grade/year</Label>
                <Select id="grade" value={form.currentGrade} onChange={update('currentGrade')}>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <Label htmlFor="academicLevel">Academic level</Label>
                <Select id="academicLevel" value={form.academicLevel} onChange={update('academicLevel')}>
                  {ACADEMIC_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="islamicLevel">Islamic education level</Label>
                <Select id="islamicLevel" value={form.islamicLevel} onChange={update('islamicLevel')}>
                  {ISLAMIC_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </div>
            </div>

            <FieldError>{error}</FieldError>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" loading={loading} onClick={() => submitChild(true)}>
                Save & Add Another
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                Save & Go to Dashboard
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
