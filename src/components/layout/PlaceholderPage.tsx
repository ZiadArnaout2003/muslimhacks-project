import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <Construction className="mx-auto h-10 w-10 text-gold-500" />
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {note ?? t('common.placeholderNote')}
      </p>
    </div>
  )
}
