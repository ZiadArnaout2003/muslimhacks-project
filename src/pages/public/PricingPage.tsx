import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useTranslation } from 'react-i18next'

export function PricingPage() {
  const { t } = useTranslation()
  const tiers = Array.from({ length: 3 }, (_, index) => ({
    name: t(`public.pricing.tiers.${index}.name`),
    price: t(`public.pricing.tiers.${index}.price`),
    desc: t(`public.pricing.tiers.${index}.description`),
    features: [t(`public.pricing.tiers.${index}.features.0`), t(`public.pricing.tiers.${index}.features.1`), ...(index === 0 ? [t('public.pricing.tiers.0.features.2')] : [])],
  }))
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{t('public.pricing.title')}</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        {t('public.pricing.intro')}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.name}>
            <CardBody>
              <h3 className="font-semibold text-gray-900">{tier.name}</h3>
              <p className="mt-1 text-2xl font-bold text-brand-700">{tier.price}</p>
              <p className="mt-2 text-sm text-gray-500">{tier.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-gold-50 p-6 text-center">
        <h2 className="font-semibold text-gray-900">{t('public.pricing.assistanceTitle')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('public.pricing.assistanceDescription')}</p>
        <Link to="/financial-assistance" className="mt-4 inline-block">
          <Button variant="secondary">{t('public.pricing.assistanceAction')}</Button>
        </Link>
      </div>
    </div>
  )
}
