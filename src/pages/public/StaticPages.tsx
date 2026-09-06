import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <div className="prose prose-sm mt-6 max-w-none text-gray-600">{children}</div>
    </div>
  )
}

export function AboutPage() {
  const { t } = useTranslation()
  return (
    <StaticPage title={t('public.static.about.title')}>
      <p>{t('public.static.about.first')}</p>
      <p>{t('public.static.about.second')}</p>
    </StaticPage>
  )
}

export function ContactPage() {
  const { t } = useTranslation()
  return (
    <StaticPage title={t('public.static.contact.title')}>
      <p>{t('public.static.contact.body')}</p>
      <p>{t('public.static.contact.email')}</p>
    </StaticPage>
  )
}

export function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <StaticPage title={t('public.static.privacy.title')}>
      <p>{t('public.static.privacy.first')}</p>
      <p>{t('public.static.privacy.second')}</p>
    </StaticPage>
  )
}

export function TermsPage() {
  const { t } = useTranslation()
  return (
    <StaticPage title={t('public.static.terms.title')}>
      <p>{t('public.static.terms.body')}</p>
    </StaticPage>
  )
}
