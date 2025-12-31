import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import jaCommon from '@/locales/ja/common.json';
import enCommon from '@/locales/en/common.json';

export const resources = {
  ja: {
    common: jaCommon,
  },
  en: {
    common: enCommon,
  },
} as const;

export const supportedLanguages = [
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'en', name: 'English', nativeName: 'English' },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
  });

export default i18n;
