import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { dashboardPathForRole } from '../../lib/roleRouting'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'ع' },
  { code: 'fr', label: 'FR' },
]

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/courses', label: t('nav.courses') },
    { to: '/teachers', label: t('nav.teachers') },
    { to: '/curriculum', label: t('nav.curriculum') },
    { to: '/islamic-studies', label: t('nav.islamicStudies') },
    { to: '/financial-assistance', label: t('nav.financialAssistance') },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-800">
          <GraduationCap className="h-6 w-6 text-brand-600" />
          <span>Al-Noor International School</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-gray-600 hover:text-brand-700">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex overflow-hidden rounded-md border border-gray-200 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`px-2 py-1 ${i18n.language === l.code ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {session && profile ? (
            <>
              <Link to={dashboardPathForRole(profile.role)}>
                <Button size="sm" variant="outline">
                  {t('nav.dashboard')}
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">{t('nav.register')}</Button>
              </Link>
            </>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className={`rounded-md border px-2 py-1 text-xs ${i18n.language === l.code ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {session && profile ? (
              <div className="flex flex-col gap-2 pt-2">
                <Link to={dashboardPathForRole(profile.role)} onClick={() => setOpen(false)}>
                  <Button size="sm" variant="outline" className="w-full">
                    {t('nav.dashboard')}
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={handleLogout} className="w-full">
                  {t('nav.logout')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button size="sm" variant="ghost" className="w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
