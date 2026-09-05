import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import ar from './locales/ar.json'
import fr from './locales/fr.json'

export const RTL_LANGUAGES = ['ar']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

function applyDirection(lng: string) {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lng
}

applyDirection(i18n.language)
i18n.on('languageChanged', applyDirection)

export default i18n
