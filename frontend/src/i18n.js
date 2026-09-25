import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en/translation.json';
import hiTranslation from './locales/hi/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.MODE !== 'production') {
        console.warn(`[i18n] Missing translation key "${key}" for language "${lng}" (ns=${ns})`);
      }
    },
  });

export default i18n;