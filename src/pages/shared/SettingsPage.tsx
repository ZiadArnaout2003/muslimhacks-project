import { useEffect, useState } from 'react'
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
  const { i18n, t } = useTranslation()

  const [form, setForm] = useState({
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    phone: profile?.phone ?? '',
    country: profile?.country ?? COUNTRIES[0],
    preferredLanguage: profile?.preferred_language ?? 'en',
    timezone: profile?.timezone ?? COMMON_TIMEZONES[0],
  })
  const [saving, setSaving] = useState(false)
  const [lessonRate, setLessonRate] = useState('')
  const [lessonCurrency, setLessonCurrency] = useState('USD')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    if (profile?.role !== 'teacher') return
    supabase
      .from('teachers')
      .select('hourly_price, currency')
      .eq('profile_id', profile.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
          return
        }
        setLessonRate(String(data.hourly_price ?? 0))
        setLessonCurrency(data.currency ?? 'USD')
      })
  }, [profile?.id, profile?.role])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setError(null)
    const rate = Number(lessonRate)
    if (profile.role === 'teacher' && (!Number.isFinite(rate) || rate < 0)) {
      setSaving(false)
      setError('Enter a valid private lesson rate.')
      return
    }
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
    if (error) {
      setSaving(false)
      setError(error.message)
      return
    }
    if (profile.role === 'teacher') {
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({ hourly_price: rate, currency: lessonCurrency })
        .eq('profile_id', profile.id)
      if (teacherError) {
        setSaving(false)
        setError(teacherError.message)
        return
      }
    }
    setSaving(false)
    await refreshProfile()
    i18n.changeLanguage(form.preferredLanguage)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      <Card className="mt-6">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t('auth.fields.firstName')}</Label>
              <Input id="firstName" value={form.firstName} onChange={update('firstName')} />
            </div>
            <div>
              <Label htmlFor="lastName">{t('auth.fields.lastName')}</Label>
              <Input id="lastName" value={form.lastName} onChange={update('lastName')} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">{t('auth.fields.email')}</Label>
            <Input id="email" value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <Label htmlFor="phone">{t('settings.phone')}</Label>
            <Input id="phone" value={form.phone} onChange={update('phone')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="country">{t('auth.fields.country')}</Label>
              <Select id="country" value={form.country} onChange={update('country')}>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lang">{t('settings.language')}</Label>
              <Select id="lang" value={form.preferredLanguage} onChange={update('preferredLanguage')}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tz">{t('settings.timezone')}</Label>
              <Select id="tz" value={form.timezone} onChange={update('timezone')}>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </Select>
            </div>
          </div>

          {profile?.role === 'teacher' && (
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
              <p className="mb-3 text-sm font-medium text-brand-900">Private lesson rate</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lessonRate">Price per hour</Label>
                  <Input
                    id="lessonRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lessonRate}
                    onChange={(e) => setLessonRate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lessonCurrency">Currency</Label>
                  <Select
                    id="lessonCurrency"
                    value={lessonCurrency}
                    onChange={(e) => setLessonCurrency(e.target.value)}
                  >
                    {['USD', 'CAD', 'EUR', 'GBP'].map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <p className="mt-2 text-xs text-brand-700">
                Students see this rate before booking. Shorter lessons are priced proportionally.
              </p>
            </div>
          )}

          <FieldError>{error}</FieldError>
          {saved && <p className="text-sm text-emerald-700">{t('settings.saved')}</p>}
          <Button loading={saving} onClick={handleSave}>
            {t('settings.saveChanges')}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
