import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GraduationCap } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation()

  const columns = [
    {
      heading: t('footer.about'),
      links: [
        { to: '/about', label: t('footer.about') },
        { to: '/faq', label: t('footer.faq') },
        { to: '/contact', label: t('footer.contact') },
      ],
    },
    {
      heading: t('footer.courses'),
      links: [
        { to: '/courses', label: t('footer.courses') },
        { to: '/teachers', label: t('footer.teachers') },
        { to: '/curriculum', label: t('footer.curriculum') },
      ],
    },
    {
      heading: t('footer.financialAssistance'),
      links: [
        { to: '/financial-assistance', label: t('footer.financialAssistance') },
        { to: '/apply-to-teach', label: t('footer.teacherApplication') },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/terms', label: t('footer.terms') },
      ],
    },
  ]

  return (
    <footer className="mt-24 border-t border-black/5 bg-brand-900 text-brand-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <GraduationCap className="h-6 w-6 text-gold-300" />
              <span>Al-Noor International School</span>
            </div>
            <p className="max-w-md text-sm text-brand-200">
              Accessible academic and Islamic education through qualified teachers, flexible online learning,
              and financial assistance for students who need it.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 text-sm font-semibold text-gold-300">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-brand-200">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-brand-300">
          © {new Date().getFullYear()} Al-Noor International School. {t('footer.rights')}
        </div>
      </div>
    </footer>
  )
}
