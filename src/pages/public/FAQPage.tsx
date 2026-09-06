import { useTranslation } from 'react-i18next'

export function FAQPage() {
  const { t } = useTranslation()
  const faqs = Array.from({ length: 6 }, (_, index) => ({
    q: t(`public.faq.items.${index}.question`),
    a: t(`public.faq.items.${index}.answer`),
  }))
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{t('public.faq.title')}</h1>
      <div className="mt-8 divide-y divide-gray-200 rounded-xl border border-black/5 bg-white">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none font-medium text-gray-900 group-open:text-brand-700">
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-gray-600">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
