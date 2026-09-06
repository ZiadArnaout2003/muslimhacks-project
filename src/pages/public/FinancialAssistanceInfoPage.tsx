import { Link } from 'react-router-dom'
import { HandHeart, ShieldCheck, ClipboardList } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useTranslation } from 'react-i18next'

export function FinancialAssistanceInfoPage() {
  const { t } = useTranslation()
  const cards = [
    { icon: ClipboardList, key: 'apply' },
    { icon: ShieldCheck, key: 'private' },
    { icon: HandHeart, key: 'reduced' },
  ]
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <HandHeart className="h-10 w-10 text-gold-600" />
      <h1 className="mt-4 text-3xl font-bold text-gray-900">{t('public.assistance.title')}</h1>
      <p className="mt-3 text-gray-600">
        {t('public.assistance.intro')}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {cards.map(({ icon: Icon, key }) => <Card key={key}><CardBody>
          <Icon className="h-6 w-6 text-brand-600" />
          <h3 className="mt-2 font-semibold text-gray-900">{t(`public.assistance.cards.${key}.title`)}</h3>
          <p className="mt-1 text-sm text-gray-500">{t(`public.assistance.cards.${key}.description`)}</p>
        </CardBody></Card>)}
      </div>

      <div className="mt-10 rounded-xl bg-brand-50 p-6">
        <h2 className="font-semibold text-gray-900">{t('public.assistance.readyTitle')}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('public.assistance.readyDescription')}
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/student/financial-assistance">
            <Button>{t('public.assistance.applyAction')}</Button>
          </Link>
          <Link to="/register">
            <Button variant="outline">{t('public.assistance.accountAction')}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
