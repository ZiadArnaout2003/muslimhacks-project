import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select, FieldError } from '../../components/ui/Input'
import { COUNTRIES, LANGUAGES } from '../../lib/constants'
import { COMMON_TIMEZONES } from '../../lib/timezone'

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const { i18n } = useTranslation()

  const [form, setForm] = useState({
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    phone: profile?.phone ?? '',
    country: profile?.country ?? COUNTRIES[0],
    preferredLanguage: profile?.preferred_language ?? 'en',
    timezone: profile?.timezone ?? COMMON_TIMEZONES[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        country: form.country,
        preferred_language: form.preferredLanguage,
        timezone: form.timezone,
      })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    await refreshProfile()
    i18n.changeLanguage(form.preferredLanguage)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={form.firstName} onChange={update('firstName')} />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={form.lastName} onChange={update('lastName')} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={update('phone')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select id="country" value={form.country} onChange={update('country')}>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lang">Language</Label>
              <Select id="lang" value={form.preferredLanguage} onChange={update('preferredLanguage')}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tz">Timezone</Label>
              <Select id="tz" value={form.timezone} onChange={update('timezone')}>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </Select>
            </div>
          </div>

          <FieldError>{error}</FieldError>
          {saved && <p className="text-sm text-emerald-700">Saved.</p>}
          <Button loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
